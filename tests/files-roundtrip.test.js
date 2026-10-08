import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {installDOMParser} from "./helpers/xmldom.js";

// Out and back in: everything the app writes for other apps (Strong CSV, its own CSV, GPX, TCX,
// the everything zip, the strength FIT) is read back by the app's own readers, and what went
// out must come back the same wherever the format can carry it.

process.env.TZ="Europe/London";
const memory=new Map();
Object.defineProperty(globalThis,"localStorage",{configurable:true,writable:true,value:{
  getItem:k=>(memory.has(k)?memory.get(k):null),setItem:(k,v)=>{memory.set(k,String(v));},
  removeItem:k=>{memory.delete(k);},clear:()=>{memory.clear();}}});
globalThis.document={documentElement:{dataset:{}}};
installDOMParser();

const {strongCSV,gpx,tcx,workoutText,everythingZip}=await import("../js/exporters.js");
const {parseStrong}=await import("../js/importers.js");
const {buildCSV,parseImport}=await import("../js/csv.js");
const {parseWorkoutFile,trackStats}=await import("../js/cardio.js");
const {openZip}=await import("../js/archive.js");
const {normSet}=await import("../js/model.js");
const {parseFit}=await import("../js/fit.js");
const {strengthFit}=await import("../js/fitwrite.js");
const store=await import("../js/store.js");
const importer=await import("../js/actions/importer.js");
const {cardioSession}=await import("../js/actions/cardio.js");

const S=(r,w,x={})=>normSet(Object.assign({r,w},x));
const lift=(title,startIso,mins,ex)=>({id:"d"+startIso,title,created:startIso,started:startIso,
  ended:new Date(Date.parse(startIso)+mins*60000).toISOString(),running:false,ex});
const DAYS=[
  lift('Legs; "heavy", then light',"2026-07-05T06:30:00.000Z",65,[
    {name:"Squats",sets:[S(8,60,{kind:"wu"}),S(5,100,{rpe:8}),S(5,102.5,{rpe:8.5,note:'paused; "deep", 2 s'}),S(8,80,{kind:"drop"}),S(3,100,{kind:"fail"})]},
    {name:"Plank",timed:true,sets:[S(75,0)]},
    {name:"Sled push",dist:true,sets:[S(40,0)]},
    {name:"Pull ups",sets:[S(12,0)]},
    {name:"Never done",sets:[]}]),
  lift("Push","2026-07-07T17:00:00.000Z",45,[{name:"Bench press",sets:[S(5,82.5)]}])];
const view=d=>({title:d.title,start:Date.parse(d.started),secs:(Date.parse(d.ended)-Date.parse(d.started))/1000,
  ex:d.ex.filter(e=>e.sets.length).map(e=>({name:e.name,timed:!!e.timed,dist:!!e.dist,sets:e.sets.map(x=>[x.r,x.w,x.kind||(x.wu?"wu":""),x.rpe||0])}))});

describe("Strong's CSV, out and back",()=>{
  for(const unit of ["kg","lb"])test("titles, sets, set kinds, RPE, timed and distance sets and the day's length survive in "+unit,()=>{
    const back=parseStrong(strongCSV(DAYS,unit),unit);
    assert.equal(back.unit,unit);
    assert.deepEqual(back.days.map(view),DAYS.map(view));
  });
  test("cardio days and days with nothing logged are left out",()=>{
    const run={id:"r",title:"Run",created:"2026-07-06T06:00:00.000Z",ex:[{name:"Running",dist:true,sets:[S(5000,0)]}],cardio:{activity:"run",secs:1500,dist:5000}};
    const empty=lift("Rest","2026-07-08T06:00:00.000Z",0,[{name:"Squats",sets:[]}]);
    const back=parseStrong(strongCSV([run,empty].concat(DAYS),"kg"),"kg");
    assert.deepEqual(back.days.map(d=>d.title),DAYS.map(d=>d.title));
  });
  test("set notes survive the trip",()=>{
    // BUG: strongCSV writes each set's note in Strong's Notes column, but parseStrong never reads
    // it, so notes from Strong (and from this app's own Strong export) are dropped on import.
    const back=parseStrong(strongCSV(DAYS,"kg"),"kg");
    assert.equal(back.days[0].ex[0].sets[2].note,'paused; "deep", 2 s');
  });
  test("a set logged in pounds in a kilogram app goes out in kilograms",()=>{
    // BUG: strongCSV writes the number as logged under a "Weight (kg)" header, ignoring the
    // set's own unit, so a 135 lb bench is exported (and re-imported anywhere) as 135 kg.
    const day=lift("Push","2026-07-07T17:00:00.000Z",45,[{name:"Bench press",sets:[S(5,135,{u:"lb"})]}]);
    const w=parseStrong(strongCSV([day],"kg"),"kg").days[0].ex[0].sets[0].w;
    assert.ok(Math.abs(w-61.2)<0.1,"exported as "+w+" kg");
  });
  test("the weight carried on a distance or timed set survives",()=>{
    // BUG: strongCSV writes 0 for the weight of any timed or distance set, so a 40 kg farmer
    // carry or a 20 kg weighted plank loses its load.
    const day=lift("Carry","2026-07-07T17:00:00.000Z",20,[{name:"Farmer carry",dist:true,sets:[S(30,40)]},{name:"Weighted plank",timed:true,sets:[S(60,20)]}]);
    const ex=parseStrong(strongCSV([day],"kg"),"kg").days[0].ex;
    assert.deepEqual(ex.map(e=>[e.sets[0].r,e.sets[0].w]),[[30,40],[60,20]]);
  });
});

describe("the app's own CSV, out and back",()=>{
  test("a file re-saved by a spreadsheet with semicolons is refused with a clear message",()=>{
    assert.throws(()=>parseImport("Date;Day;Exercise;Set;Reps\n2026-01-15T10:00:00.000Z;Legs;Squats;1;5\n"),/expected columns/);
  });
  test("a date the importer can't read is refused, not saved as a day with no date",()=>{
    // BUG: parseImport keeps the Date cell as the day's start without reading it, so a sheet
    // re-saved with "15/01/2026 10:00" makes a day whose date can't be parsed (no calendar day).
    let out;
    try{out=parseImport("Date,Day,Exercise,Set,Reps\n15/01/2026 10:00,Legs,Squats,1,5\n");}catch(e){return;}
    assert.ok(!Number.isNaN(Date.parse(out[0].created)),"kept as "+out[0].created);
  });
  test("a weight with a decimal comma keeps its decimals",()=>{
    // BUG: parseImport reads weights with parseFloat, so "82,5" becomes 82 (the other apps'
    // importers read decimal commas).
    const [back]=parseImport('Date,Day,Exercise,Set,Reps,Weight\n2026-01-15T10:00:00.000Z,Legs,Squats,1,5,"82,5"\n');
    assert.equal(back.ex[0].sets[0].w,82.5);
  });
  test("awkward names, notes and every field the CSV carries come back the same",()=>{
    const d=lift('Day, with "quotes"\nand a line',"2026-07-05T06:30:00.000Z",30,[
      {name:'Curl, "21s"',sets:[S(21,10,{side:true,t:40,rest:90,at:"2026-07-05T06:40:00.000Z",note:"a, b\nc"})]},
      {name:"Band row",sets:[S(15,0,{band:"30–60"})]}]);
    const [back]=parseImport(buildCSV([d]));
    assert.equal(back.title,d.title);assert.equal(back.started,d.started);assert.equal(back.ended,d.ended);
    assert.deepEqual(back.ex.map(e=>[e.name,e.sets]),d.ex.map(e=>[e.name,e.sets]));
  });
  test("a set logged in pounds in a kilogram app keeps its weight",()=>{
    // BUG: the CSV has no unit per set, so the set comes back as 135 kg.
    const d=lift("Push","2026-07-07T17:00:00.000Z",45,[{name:"Bench press",sets:[S(5,135,{u:"lb"})]}]);
    const x=parseImport(buildCSV([d]))[0].ex[0].sets[0];
    const kg=x.u==="lb"?x.w*0.45359237:x.w;
    assert.ok(Math.abs(kg-61.2)<0.1,"came back as "+x.w+(x.u||" (app unit)"));
  });
});

// A recorded run as it is saved: 1500 fixes over 5 km, thinned to 400 for storage.
function savedRun(activity="run",title="River loop"){
  const t0=Date.parse("2026-07-05T06:00:00.000Z"),track=[];
  for(let i=0;i<1500;i++)track.push({t:t0+i*1000,lat:51.5+i*3.3/111194.9,lon:-0.1+Math.sin(i/150)*0.002,alt:null});
  const s=cardioSession({activity,title,created:new Date(t0).toISOString(),secs:1499,track,hr:[{t:t0,bpm:140},{t:t0+1499000,bpm:160}]});
  return {s,fullDist:trackStats(track).dist};
}

describe("GPX and TCX, out and back",()=>{
  test("a run's GPX comes back with its start, length, name, sport and nearly all its distance",()=>{
    const {s,fullDist}=savedRun();
    const w=parseWorkoutFile(gpx(s));
    assert.equal(w.track.length,400);
    assert.equal(w.start,Date.parse(s.started));assert.equal(w.secs,1499);
    assert.equal(w.name,"River loop");assert.equal(w.sport,"running");
    const d=trackStats(w.track).dist;
    assert.ok(Math.abs(d-fullDist)/fullDist<0.01,d+" vs "+fullDist);
    assert.ok(Math.abs(d-s.cardio.dist)/s.cardio.dist<0.01);
  });
  test("titles with XML's special characters come back as written",()=>{
    const {s}=savedRun("ride",'Hills <8%> & "wind"');
    assert.equal(parseWorkoutFile(gpx(s)).name,'Hills <8%> & "wind"');
    assert.match(tcx(s),/<Notes>Hills &lt;8%&gt; &amp; &quot;wind&quot;<\/Notes>/);
  });
  test("a run's TCX comes back with its start, length, sport and route",()=>{
    const {s}=savedRun();
    const w=parseWorkoutFile(tcx(s));
    assert.equal(w.sport,"Running");assert.equal(w.track.length,400);
    assert.equal(w.start,Date.parse(s.started));assert.equal(w.secs,1499);
  });
  test("a session without a route, exported as TCX, comes back with its distance and time",()=>{
    // BUG: the TCX reader ignores the lap's DistanceMeters and TotalTimeSeconds, so a treadmill
    // run (or any imported session without a route) exported as TCX can't be read back at all.
    const s=cardioSession({activity:"run",title:"Treadmill",created:"2026-07-05T06:00:00.000Z",secs:1800,track:[],distM:5000,hrSum:{avg:150,max:170}});
    const w=parseWorkoutFile(tcx(s));
    assert.equal(w.distM,5000);
    assert.equal(w.secs,1800);
  });
  test("text for a chat reads the run's distance, time and heart rate",()=>{
    const {s}=savedRun();
    assert.match(workoutText(s,"kg"),/^River loop · .+ · 25 min\n5\.\d\d km · 25 min · 150 bpm avg\n$/);
  });
});

describe("the everything zip, out and back",()=>{
  const runA=savedRun().s,runB=savedRun("run","Evening jog").s;
  runB.created=runB.started="2026-07-05T18:00:00.000Z";runB.ended="2026-07-05T18:25:00.000Z";
  const ride=savedRun("ride","Commute").s;ride.created=ride.started="2026-07-06T07:00:00.000Z";
  test("every file named in the README is in it, and opens",async()=>{
    const z=await openZip(everythingZip(DAYS.concat([runA]),"kg","own,csv\n","{}",[["checkins.csv","date\n"]]));
    const names=z.entries.map(e=>e.name);
    for(const n of ["README.txt","strong-format.csv","kingskiln.csv","kingskiln_backup.json","checkins.csv"])assert.ok(names.includes(n),n);
    assert.equal(names.filter(n=>/^runs\/2026-07-05.*run\.gpx$/.test(n)).length,1);
    assert.equal(names.filter(n=>/^runs\/2026-07-05.*run\.tcx$/.test(n)).length,1);
    const strong=new TextDecoder().decode(await z.bytes(z.entries[names.indexOf("strong-format.csv")]));
    assert.deepEqual(parseStrong(strong,"kg").days.map(view),DAYS.map(view));
  });
  test("two runs on the same day get a file each",async()=>{
    // BUG: run files are named by day and activity only, so a morning and an evening run on
    // one day are written under the same name and unzipping keeps only one of them.
    const z=await openZip(everythingZip([runA,runB],"kg","","{}"));
    const names=z.entries.map(e=>e.name).filter(n=>n.startsWith("runs/"));
    assert.equal(new Set(names).size,names.length,names.join(", "));
  });
  test("importing the zip back brings each run and ride in once",async()=>{
    memory.clear();store.load();
    await importer.importFile(new File([everythingZip([runA,ride],"kg","","{}")],"kingskiln_export.zip"),()=>{});
    const job=store.state.importJob;
    assert.equal(job.stage,"review",job.error);
    const fresh=job.acts.filter(a=>!a.dup);
    assert.deepEqual(fresh.map(a=>[a.activity,a.when,a.secs]),[["run",runA.created,1499],["ride",ride.created,1499]]);
  });
});

describe("the strength FIT, out and back",()=>{
  test("the app's own reader opens it as an activity spanning the day",()=>{
    const w=parseFit(strengthFit(DAYS[0],"kg"));
    assert.equal(w.fileType,4);assert.equal(w.secs,65*60);
    assert.deepEqual([w.track,w.hr,w.distM],[[],[],0]);
  });
});
