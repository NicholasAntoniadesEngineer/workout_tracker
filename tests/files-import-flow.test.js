import {test,describe,beforeEach} from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import {installDOMParser} from "./helpers/xmldom.js";
import {zip} from "./helpers/zipfile.js";
import {fit,semi} from "./helpers/fitfile.js";

// The whole import, as the file picker hands it over: a Strava, Garmin or Apple Health archive,
// a strength app's CSV or a single watch file goes in; the review shows what was found and what
// is already there; Save puts it in History, Body and the check-ins. Nothing found must be lost,
// nothing must come in twice, and a file it can't read must say so.

process.env.TZ="Europe/London";
const memory=new Map();
Object.defineProperty(globalThis,"localStorage",{configurable:true,writable:true,value:{
  getItem:k=>(memory.has(k)?memory.get(k):null),setItem:(k,v)=>{memory.set(k,String(v));},
  removeItem:k=>{memory.delete(k);},clear:()=>{memory.clear();}}});
globalThis.document={documentElement:{dataset:{}}};
installDOMParser();

const store=await import("../js/store.js");
const {state}=store;
const importer=await import("../js/actions/importer.js");
const cardioActions=await import("../js/actions/cardio.js");

const ctx={render(){}};
const tap=sel=>{const el={getAttribute:()=>null,closest:s=>s===sel?el:null};return importer.handle(el,ctx);};
async function read(name,data){await importer.importFile(new File([data],name),()=>{});return state.importJob;}
const B=s=>Buffer.from(s);
const cardio=()=>state.sessions.filter(s=>s.cardio).sort((a,b)=>a.created.localeCompare(b.created));

beforeEach(()=>{memory.clear();store.load();state.settings.unit="kg";state.settings.maxHR=190;});

// A run north from the river: n points, `step` metres and `every` seconds apart.
function gpx(startIso,{n=21,step=50,every=15,hr=150,name="Run"}={}){
  let pts="";const t0=Date.parse(startIso);
  for(let i=0;i<n;i++)pts+='<trkpt lat="'+(51.5+i*step/111194.9)+'" lon="-0.1"><ele>'+(10+i)+'</ele><time>'+new Date(t0+i*every*1000).toISOString()+
    '</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>'+hr+'</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>';
  return '<?xml version="1.0"?><gpx creator="test"><trk><name>'+name+'</name><type>running</type><trkseg>'+pts+'</trkseg></trk></gpx>';
}
// A FIT activity (or another kind of file): records every 10 s and a session.
const FIT_EPOCH=631065600000;
function fitActivity(startIso,{sport=2,points=11,step=100,type=4}={}){
  const ts=Math.round((Date.parse(startIso)-FIT_EPOCH)/1000);
  const f=fit().def(0,0,[[0,1,0x00]]).msg(0,[type]).def(1,20,[[253,4,0x86],[0,4,0x85],[1,4,0x85],[3,1,0x02],[5,4,0x86]]);
  for(let i=0;i<points;i++)f.msg(1,[ts+i*10,semi(51.5+i*step/111194.9),semi(-0.1),120+i,i*step*100]);
  return f.def(2,18,[[5,1,0x00],[7,4,0x86],[9,4,0x86]]).msg(2,[sport,(points-1)*10000,(points-1)*step*100]).bytes();
}
const STRAVA_HEAD="Activity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Max Heart Rate,Relative Effort,Commute,Elapsed Time,Moving Time,Distance,Average Heart Rate,Elevation Gain,Filename\n";
const stravaRow=(id,date,name,type,secs,metres,file,hr="")=>[id,'"'+date+'"','"'+name+'"',type,"",secs,(metres/1000).toFixed(2),hr,"","false",secs,secs,metres,hr,0,file].join(",")+"\n";

describe("a Strava archive",()=>{
  const archive=(extra="")=>zip([
    {name:"activities.csv",method:8,data:B(STRAVA_HEAD+
      stravaRow(101,"Jul 5, 2024, 6:00:00 AM","Morning, by the river","Run",300,1000,"activities/101.gpx.gz")+
      stravaRow(102,"Jul 6, 2024, 7:00:00 AM","Commute","Ride",100,1000,"activities/102.fit")+
      stravaRow(103,"Jul 7, 2024, 5:00:00 PM","Gym","WeightTraining",3600,0,"")+extra)},
    {name:"activities/101.gpx.gz",data:zlib.gzipSync(B(gpx("2024-07-05T06:00:00Z")))},
    {name:"activities/102.fit",method:8,data:fitActivity("2024-07-06T07:00:00Z")},
    {name:"profile.csv",data:B("x\n")}]);
  test("every activity comes in with its own name, start, type, distance and heart rate",async()=>{
    const job=await read("export_12345.zip",archive());
    assert.equal(job.stage,"review",job.error);assert.equal(job.source,"Strava");
    const by=Object.fromEntries(job.acts.map(a=>[a.title,a]));
    const run=by["Morning, by the river"],ride=by["Commute"],gym=by["Gym"];
    assert.deepEqual([run.when,run.activity,run.secs],["2024-07-05T06:00:00.000Z","run",300]);
    assert.ok(Math.abs(run.dist-1000)<3,run.dist);
    assert.equal(run.splits.length,1);assert.equal(run.hr.avg,150);assert.equal(run.climb,20);
    assert.ok(run.track.length>1&&run.track.length<=400);
    assert.deepEqual([ride.activity,ride.secs,ride.when],["ride",100,"2024-07-06T07:00:00.000Z"]);
    assert.ok(Math.abs(ride.dist-1000)<3);
    assert.deepEqual([gym.activity,gym.secs,gym.dist,gym.track],["other",3600,0,[]]);
  });
  test("the same run listed twice, starting at the same second, is offered once",async()=>{
    const job=await read("export.zip",archive(stravaRow(105,"Jul 5, 2024, 6:00:00 AM","Copy","Run",300,1000,"")));
    assert.deepEqual(job.acts.filter(a=>a.dup).map(a=>a.title),["Copy"]);
  });
  test("the same run recorded twice, starting forty seconds apart, is offered once",async()=>{
    // BUG: against History the match allows two minutes either way, but within the file the
    // starts must round to the same minute, so a watch and a phone copy of one run (or Apple
    // Health's Watch and Strava copies of one workout) both come in, doubling the week's distance.
    const job=await read("export.zip",archive(stravaRow(105,"Jul 5, 2024, 6:00:40 AM","Phone copy","Run",300,1000,"")));
    assert.deepEqual(job.acts.filter(a=>a.dup).map(a=>a.title),["Phone copy"]);
    assert.equal(Object.values(job.groups).reduce((a,b)=>a+b,0),3);
  });
  test("saved, they are imported cardio days; the same archive again finds nothing new",async()=>{
    await read("export.zip",archive());tap("[data-importgo]");
    assert.deepEqual(state.importJob.saved,{acts:3,days:0,weights:0,nights:0,vitals:0});
    const ses=cardio();
    assert.equal(ses.length,3);
    assert.ok(ses.every(s=>s.cardio.imported&&s.cardio.source==="Strava"));
    assert.equal(ses[0].title,"Morning, by the river");assert.equal(ses[0].ex[0].name,"Running");
    assert.equal(ses[0].cardio.splits.length,1);assert.equal(ses[0].cardio.hr.avg,150);
    assert.equal(Date.parse(ses[0].ended)-Date.parse(ses[0].created),300000);
    const again=await read("export.zip",archive());
    assert.ok(again.acts.every(a=>a.dup));
    tap("[data-importgo]");
    assert.equal(cardio().length,3);
  });
  test("an activity whose file can't be read still comes in from its row's totals",async()=>{
    // BUG: the row is marked as used before its file is read, so when the file turns out to be
    // unreadable the activity is dropped instead of falling back to the CSV's time and distance.
    const z=zip([{name:"activities.csv",data:B(STRAVA_HEAD+stravaRow(104,"Jul 8, 2024, 6:00:00 AM","Treadmill","Run",1800,5000,"activities/104.fit"))},
      {name:"activities/104.fit",data:B("this file was damaged in transit")}]);
    const job=await read("export.zip",z);
    assert.equal(job.stage,"review",job.error);
    assert.equal(job.acts.length,1);
    assert.deepEqual([job.acts[0].secs,job.acts[0].dist],[1800,5000]);
  });
});

describe("a Garmin archive",()=>{
  const part=extra=>zip([{name:"1001_ACTIVITY.fit",data:fitActivity("2024-07-05T06:00:00Z",{sport:1})},
    {name:"1002_WELLNESS.fit",data:fitActivity("2024-07-05T00:00:00Z",{type:32})},
    {name:"1003_ACTIVITY.fit",method:8,data:fitActivity("2024-07-07T06:00:00Z",{sport:2,step:200})}].concat(extra||[]));
  const archive=async extra=>zip([{name:"DI_CONNECT/DI-Connect-Fitness/user_summary.json",data:B("{}")},
    {name:"DI_CONNECT/DI-Connect-Uploaded-Files/UploadedFiles_0-_Part1.zip",data:new Uint8Array(await part(extra).arrayBuffer())}]);
  test("activities inside the zip inside the zip come in; settings and wellness files don't",async()=>{
    const job=await read("garmin.zip",await archive());
    assert.equal(job.stage,"review",job.error);assert.equal(job.source,"Garmin");
    assert.deepEqual(job.acts.map(a=>[a.activity,a.when]),[["run","2024-07-05T06:00:00.000Z"],["ride","2024-07-07T06:00:00.000Z"]]);
    assert.ok(Math.abs(job.acts[1].dist-2000)<5);
    assert.equal(job.total,3);
  });
  test("one damaged activity in the archive doesn't stop the rest coming in",async()=>{
    // BUG: an entry that fails to unpack throws out of the whole walk, so one bad .fit.gz among
    // thousands loses the entire import.
    const bad=Buffer.from(zlib.gzipSync(fitActivity("2024-07-08T06:00:00Z")));bad.fill(9,20,60);
    const job=await read("garmin.zip",await archive([{name:"1004_ACTIVITY.fit.gz",data:bad}]));
    assert.equal(job.stage,"review",job.error);
    assert.equal(job.acts.length,2);
  });
});

describe("an Apple Health export",()=>{
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n<HealthData locale="en_GB">\n'+
    '<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Scale" unit="lb" startDate="2024-07-05 06:00:00 +0100" endDate="2024-07-05 06:00:00 +0100" value="181.5"/>\n'+
    '<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Scale" unit="kg" startDate="2024-07-05 21:00:00 +0100" endDate="2024-07-05 21:00:00 +0100" value="82.9"/>\n'+
    '<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-07-04 23:00:00 +0100" endDate="2024-07-05 03:00:00 +0100" value="HKCategoryValueSleepAnalysisAsleepCore"/>\n'+
    '<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-07-05 03:00:00 +0100" endDate="2024-07-05 06:30:00 +0100" value="HKCategoryValueSleepAnalysisAsleepDeep"/>\n'+
    '<Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" unit="ms" startDate="2024-07-05 02:00:00 +0100" value="40"/>\n'+
    '<Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" unit="ms" startDate="2024-07-05 04:00:00 +0100" value="70"/>\n'+
    '<Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" unit="ms" startDate="2024-07-05 05:00:00 +0100" value="50"/>\n'+
    '<Record type="HKQuantityTypeIdentifierRestingHeartRate" unit="count/min" startDate="2024-07-05 08:00:00 +0100" value="56"/>\n'+
    '<Record type="HKQuantityTypeIdentifierRestingHeartRate" unit="count/min" startDate="2024-07-05 20:00:00 +0100" value="52"/>\n'+
    '<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="5.5" durationUnit="min" totalDistance="1.05" totalDistanceUnit="km" sourceName="Watch" startDate="2024-07-05 07:00:00 +0100" endDate="2024-07-05 07:05:30 +0100">\n'+
    ' <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" average="148" maximum="171" unit="count/min"/>\n'+
    ' <WorkoutRoute sourceName="Watch"><FileReference path="/workout-routes/route_2024-07-05_7.00am.gpx"/></WorkoutRoute>\n</Workout>\n'+
    '<Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="50" durationUnit="min" startDate="2024-07-06 18:00:00 +0100" endDate="2024-07-06 18:50:00 +0100"/>\n'+
    '</HealthData>\n';
  const archive=()=>zip([{name:"apple_health_export/export.xml",method:8,data:B(xml)},{name:"apple_health_export/export_cda.xml",data:B("<x/>")},
    {name:"apple_health_export/workout-routes/route_2024-07-05_7.00am.gpx",method:8,data:B(gpx("2024-07-05T06:00:00Z",{n:23}))}]);
  test("workouts come with their own totals, the run with its route and splits",async()=>{
    const job=await read("export.zip",archive());
    assert.equal(job.stage,"review",job.error);assert.equal(job.source,"Apple Health");
    const [run,lift]=job.acts;
    assert.deepEqual([run.when,run.activity,run.secs,run.dist,run.kind],["2024-07-05T06:00:00.000Z","run",330,1050,"Running"]);
    assert.equal(run.splits.length,1);assert.ok(run.track.length>10);
    assert.equal(run.hr.avg,150,"the route's own samples");
    assert.deepEqual([lift.activity,lift.secs,lift.kind,lift.track],["other",3000,"Traditional strength training",[]]);
  });
  test("weigh-ins, nights and vitals are found, one of each per day",async()=>{
    const job=await read("export.zip",archive());
    assert.equal(job.weights.length,1,"the day's last weigh-in");
    assert.equal(job.nights.length,1);assert.equal(job.nights[0].hours,7.5);
    assert.deepEqual(job.vitals.map(v=>[v.hrv,v.rhr]),[[50,52]]);
  });
  test("saved, weights are in the app's unit and nights fill the check-in's sleep",async()=>{
    await read("export.zip",archive());
    state.settings.unit="lb";
    tap("[data-importgo]");
    assert.deepEqual(state.importJob.saved,{acts:2,days:0,weights:1,nights:1,vitals:1});
    assert.deepEqual(state.body.map(b=>b.w),[182.8]);
    const ci=state.checkins[0];
    assert.deepEqual([ci.bed,ci.wake,ci.hours,ci.imported],["23:00","06:30",7.5,true]);
  });
  test("a bare export.xml, without its zip, is read too",async()=>{
    const job=await read("export.xml",B(xml));
    assert.equal(job.stage,"review",job.error);
    assert.deepEqual(job.acts.map(a=>[a.secs,a.dist]),[[330,1050],[3000,0]]);
  });
});

describe("a strength app's CSV",()=>{
  const csv='\uFEFF"Workout #";"Date";"Workout Name";"Duration (sec)";"Exercise Name";"Set Order";"Weight (lbs)";"Reps";"RPE";"Distance (meters)";"Seconds";"Notes";"Workout Notes"\r\n'+
    '"1";"2024-07-05 07:30:00";"Legs";"3600";"Squat (Barbell)";"W";"135";"5";"";"0";"0";"";""\r\n'+
    '"1";"2024-07-05 07:30:00";"Legs";"3600";"Squat (Barbell)";"1";"225";"5";"8";"0";"0";"";""\r\n'+
    '"1";"2024-07-05 07:30:00";"Legs";"3600";"Zercher Squat";"1";"185";"5";"";"0";"0";"";""\r\n';
  test("Strong's days come in with names from the list and weights in the app's unit",async()=>{
    const job=await read("strong.csv",B(csv));
    assert.equal(job.stage,"review",job.error);assert.equal(job.source,"Strong");
    const d=job.days[0];
    assert.deepEqual(d.ex.map(e=>e.name),["Squats","Zercher Squat"]);
    assert.deepEqual(d.ex[0].sets.map(x=>[x.r,x.w,x.wu]),[[5,61.2,true],[5,102.1,false]]);
    tap("[data-importgo]");
    assert.equal(state.importJob.saved.days,1);
    assert.ok(state.catalog.includes("Zercher Squat"));
    assert.ok(state.sessions.some(s=>s.title==="Legs"));
  });
  test("the same file again is marked as already there",async()=>{
    await read("strong.csv",B(csv));tap("[data-importgo]");
    const job=await read("strong.csv",B(csv));
    assert.ok(job.days.every(d=>d.dup));
    tap("[data-importgo]");
    assert.equal(state.importJob.saved.days,0);
    assert.equal(state.sessions.filter(s=>s.title==="Legs").length,1);
  });
});

describe("single files and files it can't use",()=>{
  test("a GPX, a gzipped GPX and a FIT each come in as one activity",async()=>{
    for(const [name,data] of [["run.gpx",B(gpx("2024-07-05T06:00:00Z"))],["run.gpx.gz",zlib.gzipSync(B(gpx("2024-07-05T06:00:00Z")))],
      ["ride.fit",fitActivity("2024-07-06T07:00:00Z")]]){
      const job=await read(name,data);
      assert.equal(job.stage,"review",name+": "+job.error);
      assert.equal(job.source,"a watch file");assert.equal(job.acts.length,1,name);
    }
  });
  test("an unknown file, an empty file and a CSV with no rows each say why",async()=>{
    let job=await read("notes.txt",B("Shopping: eggs, milk"));
    assert.equal(job.stage,"error");assert.match(job.error,/doesn't recognise this file/);
    job=await read("empty.csv",new Uint8Array(0));
    assert.equal(job.stage,"error");
    job=await read("strong.csv",B('"Date";"Workout Name";"Exercise Name";"Set Order";"Weight (kg)";"Reps"\n'));
    assert.equal(job.stage,"error");assert.match(job.error,/No workouts were found/);
    job=await read("bad.zip",B("PK\u0003\u0004 and then nothing"));
    assert.equal(job.stage,"error");assert.match(job.error,/not a zip/);
  });
  test("a watch file with no route, distance or heart rate is not offered as a workout",async()=>{
    const job=await read("blank.gpx",B('<?xml version="1.0"?><gpx><trk><trkseg></trkseg></trk></gpx>'));
    assert.equal(job.stage,"error");assert.match(job.error,/No workouts/);
  });
});

describe("a watch file opened from the cardio screen",()=>{
  const open=(name,data)=>new Promise(res=>{state.dialog=null;state.cardioDone=null;cardioActions.importWorkoutFile(new File([data],name),res);});
  test("a GPX lands in the summary, ready to save, with its route, time and start",async()=>{
    await open("run.gpx",B(gpx("2024-07-05T06:00:00Z",{n:41})));
    const d=state.cardioDone;
    assert.deepEqual([d.imported,d.activity,d.secs,d.created,d.track.length,d.hr.length],[true,"run",600,"2024-07-05T06:00:00.000Z",41,41]);
    assert.equal(d.title,"Run","the file's own name");
    const ses=cardioActions.cardioSession(d);
    assert.ok(Math.abs(ses.cardio.dist-2000)<5);assert.equal(ses.cardio.splits.length,2);
  });
  test("Garmin's zipped FIT opens to the ride inside",async()=>{
    await open("activity_1003.zip",await zip([{name:"1003_ACTIVITY.fit",method:8,data:fitActivity("2024-07-06T07:00:00Z",{sport:2})}]).arrayBuffer());
    const d=state.cardioDone;
    assert.deepEqual([d.activity,d.secs,d.created],["ride",100,"2024-07-06T07:00:00.000Z"]);
    assert.match(d.title,/^Ride · 1\.0 km$/);
  });
  test("a file with nothing in it, or one it can't read, says so and opens nothing",async()=>{
    await open("blank.gpx",B("<gpx><trk><trkseg></trkseg></trk></gpx>"));
    assert.equal(state.cardioDone,null);assert.equal(state.dialog.title,"Nothing to import");
    await open("photo.fit",B("\u00ff\u00d8 not a watch file"));
    assert.equal(state.cardioDone,null);assert.equal(state.dialog.title,"Nothing to import");
    await open("broken.zip",B("PK\u0003\u0004 cut off"));
    assert.equal(state.cardioDone,null);assert.equal(state.dialog.title,"Couldn't read that file");
  });
});
