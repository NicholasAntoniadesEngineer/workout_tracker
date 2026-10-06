import {test} from "node:test";
import assert from "node:assert/strict";
import {actOf,appleName,detectCsv,exerciseMatcher,parseFitbod,parseHevy,parseStravaCsv,parseStrong,parseWhen,scanAppleXml} from "../js/importers.js";
import {openZip,walkZip} from "../js/archive.js";

test("dates from each app read correctly", () => {
  assert.equal(parseWhen("2024-03-05 07:30:00 +0000"),"2024-03-05T07:30:00.000Z");
  assert.equal(parseWhen("2024-03-05 07:30:00 -0500"),"2024-03-05T12:30:00.000Z");
  assert.equal(parseWhen("Mar 5, 2024, 7:30:00 AM",true),"2024-03-05T07:30:00.000Z");
  assert.equal(parseWhen("Mar 5, 2024, 12:15:00 PM",true),"2024-03-05T12:15:00.000Z");
  assert.equal(parseWhen("5 Mar 2024, 17:00"),new Date(2024,2,5,17,0).toISOString());
  assert.equal(parseWhen("2024-03-05 07:30:00"),new Date(2024,2,5,7,30).toISOString());
  assert.equal(parseWhen("nonsense"),null);
});

test("sports and Apple workout types map to KingsKiln's activities", () => {
  assert.equal(actOf("Run"),"run");assert.equal(actOf("VirtualRide"),"ride");assert.equal(actOf("Hike"),"walk");
  assert.equal(actOf("Swim"),"swim");assert.equal(actOf("Rowing"),"row");assert.equal(actOf("WeightTraining"),"other");
  assert.equal(appleName("HKWorkoutActivityTypeTraditionalStrengthTraining"),"Traditional strength training");
  assert.equal(actOf(appleName("HKWorkoutActivityTypeRunning")),"run");
});

test("their exercise names find KingsKiln's, without mixing kit", () => {
  const m=exerciseMatcher(["Squats","Bench press","Dumbbell bench press","Pull ups","Deadlift"]);
  assert.equal(m("Squat (Barbell)"),"Squats");
  assert.equal(m("Bench Press (Barbell)"),"Bench press");
  assert.equal(m("Bench Press (Dumbbell)"),"Dumbbell bench press");
  assert.equal(m("Pull Up"),"Pull ups");
  assert.equal(m("Deadlift (Barbell)"),"Deadlift");
  assert.equal(m("Lateral Raise (Cable)"),"Lateral Raise (Cable)");
  assert.equal(m("Squat (Smith Machine)"),"Squat (Smith Machine)");
});

const STRONG='"Workout #";"Date";"Workout Name";"Duration (sec)";"Exercise Name";"Set Order";"Weight (kg)";"Reps";"RPE";"Distance (meters)";"Seconds";"Notes";"Workout Notes"\n'+
  '"1";"2024-03-05 07:30:00";"Legs";"3600";"Squat (Barbell)";"W";"60";"8";"";"0";"0";"";""\n'+
  '"1";"2024-03-05 07:30:00";"Legs";"3600";"Squat (Barbell)";"1";"100";"5";"";"0";"0";"";""\n'+
  '"1";"2024-03-05 07:30:00";"Legs";"3600";"Squat (Barbell)";"Rest Timer";"";"";"";"";"90";"";""\n'+
  '"1";"2024-03-05 07:30:00";"Legs";"3600";"Plank";"1";"0";"0";"";"0";"60";"";""\n'+
  '"2";"2024-03-07 18:00:00";"Push";"2700";"Bench Press (Barbell)";"1";"80";"6";"";"0";"0";"";""\n';
test("Strong's export becomes days with warm-ups, timed sets and its unit", () => {
  assert.equal(detectCsv(STRONG),"strong");
  const r=parseStrong(STRONG,"kg");
  assert.equal(r.unit,"kg");assert.equal(r.days.length,2);
  const legs=r.days[0];
  assert.equal(legs.title,"Legs");
  assert.equal(legs.ex[0].sets.length,2);
  assert.equal(legs.ex[0].sets[0].wu,true);assert.equal(legs.ex[0].sets[1].w,100);
  assert.equal(legs.ex[1].timed,true);assert.equal(legs.ex[1].sets[0].r,60);
  assert.equal(Date.parse(legs.ended)-Date.parse(legs.created),3600000);
  const lb=parseStrong(STRONG,"lb");
  assert.equal(lb.days[0].ex[0].sets[1].w,220.5);
});

const HEVY='"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_lbs","reps","distance_miles","duration_seconds","rpe"\n'+
  '"Upper","5 Jan 2026, 17:00","5 Jan 2026, 18:05","","Pull Up","","","0","warmup","","5","","",""\n'+
  '"Upper","5 Jan 2026, 17:00","5 Jan 2026, 18:05","","Bench Press (Barbell)","","","0","normal","225","5","","",""\n'+
  '"Upper","5 Jan 2026, 17:00","5 Jan 2026, 18:05","","Treadmill","","","0","normal","","","1","600",""\n';
test("Hevy's export reads lbs, warm-ups and distance", () => {
  assert.equal(detectCsv(HEVY),"hevy");
  const r=parseHevy(HEVY,"kg");
  assert.equal(r.unit,"lb");
  const d=r.days[0];
  assert.equal(d.ex[0].sets[0].wu,true);
  assert.equal(d.ex[1].sets[0].w,102.1);
  assert.equal(d.ex[2].dist,true);assert.equal(d.ex[2].sets[0].r,1609);
  assert.equal(Date.parse(d.ended)-Date.parse(d.created),65*60000);
});

const FITBOD="Date,Exercise,Reps,Weight(kg),Duration(s),Distance(m),Incline,Resistance,isWarmup,Note,multiplier\n"+
  "2024-02-01 06:00:00 +0000,Deadlift,5,140,0,0,0,0,false,,1\n2024-02-01 06:00:00 +0000,Deadlift,8,60,0,0,0,0,true,,1\n";
test("Fitbod's export reads", () => {
  assert.equal(detectCsv(FITBOD),"fitbod");
  const r=parseFitbod(FITBOD,"kg");
  assert.equal(r.days.length,1);assert.equal(r.days[0].ex[0].sets.length,2);assert.equal(r.days[0].ex[0].sets[1].wu,true);
});

test("Strava's activities.csv gives names, types, metres and the file", () => {
  const csv="Activity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Max Heart Rate,Relative Effort,Commute,Elapsed Time,Moving Time,Distance,Average Heart Rate,Elevation Gain,Filename\n"+
    '123,"Mar 5, 2024, 7:30:00 AM",Morning Run,Run,,1800,5.2,171,40,false,1800,1750,5210.5,152,41,activities/123.fit.gz\n';
  assert.equal(detectCsv(csv),"strava");
  const [a]=parseStravaCsv(csv);
  assert.equal(a.name,"Morning Run");assert.equal(a.type,"Run");assert.equal(a.dist,5211);assert.equal(a.secs,1800);
  assert.deepEqual(a.hr,{avg:152,max:171});assert.equal(a.file,"activities/123.fit.gz");assert.equal(a.when,"2024-03-05T07:30:00.000Z");
});

test("Apple Health's export.xml streams out workouts and weigh-ins, nothing else", async () => {
  const xml='<?xml version="1.0"?>\n<HealthData locale="en_GB">\n'+
    '<Record type="HKQuantityTypeIdentifierHeartRate" unit="count/min" startDate="2024-03-05 07:31:00 +0000" value="140"/>\n'+
    '<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Scale" unit="kg" startDate="2024-03-05 06:00:00 +0000" endDate="2024-03-05 06:00:00 +0000" value="82.4">\n <MetadataEntry key="x" value="999"/>\n</Record>\n'+
    '<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30.5" durationUnit="min" sourceName="Watch" startDate="2024-03-05 07:30:00 +0000" endDate="2024-03-05 08:00:30 +0000">\n'+
    ' <MetadataEntry key="HKElevationAscended" value="4200 cm"/>\n'+
    ' <WorkoutStatistics type="HKQuantityTypeIdentifierDistanceWalkingRunning" startDate="x" endDate="y" sum="5.25" unit="km"/>\n'+
    ' <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" startDate="x" endDate="y" average="151.6" minimum="90" maximum="176" unit="count/min"/>\n'+
    ' <WorkoutRoute sourceName="Watch"><FileReference path="/workout-routes/route_2024-03-05_7.30am.gpx"/></WorkoutRoute>\n</Workout>\n'+
    '<Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="45" durationUnit="min" startDate="2024-03-06 18:00:00 +0000" endDate="2024-03-06 18:45:00 +0000"/>\n'+
    '</HealthData>\n';
  // Fed in small pieces, so tags split across chunks are handled.
  const enc=new TextEncoder().encode(xml);
  const stream=new ReadableStream({start(c){for(let i=0;i<enc.length;i+=37)c.enqueue(enc.slice(i,i+37));c.close();}});
  const ws=[],wt=[];
  await scanAppleXml(stream,w=>ws.push(w),x=>wt.push(x));
  assert.equal(ws.length,2);assert.equal(wt.length,1);
  assert.equal(wt[0].w,82.4);
  const r=ws[0];
  assert.equal(r.secs,1830);assert.equal(r.dist,5250);assert.deepEqual(r.hr,{avg:152,max:176});assert.equal(r.climb,42);
  assert.equal(r.route,"/workout-routes/route_2024-03-05_7.30am.gpx");assert.equal(r.when,"2024-03-05T07:30:00.000Z");
  assert.equal(ws[1].type,"HKWorkoutActivityTypeTraditionalStrengthTraining");assert.equal(ws[1].secs,2700);
});

// A tiny zip writer for the tests: stored or deflated entries, optionally a zip inside a zip.
async function deflate(b){return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());}
async function makeZip(files){
  const parts=[],cds=[];let off=0;
  for(const [name,data,method] of files){
    const n=new TextEncoder().encode(name),body=method===8?await deflate(data):data;
    const h=new Uint8Array(30+n.length),dv=new DataView(h.buffer);
    dv.setUint32(0,0x04034b50,true);dv.setUint16(8,method,true);dv.setUint32(18,body.length,true);dv.setUint32(22,data.length,true);dv.setUint16(26,n.length,true);h.set(n,30);
    const c=new Uint8Array(46+n.length),cv=new DataView(c.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(10,method,true);cv.setUint32(20,body.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,off,true);c.set(n,46);
    parts.push(h,body);cds.push(c);off+=h.length+body.length;
  }
  const cdLen=cds.reduce((a,c)=>a+c.length,0),e=new Uint8Array(22),ev=new DataView(e.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,cdLen,true);ev.setUint32(16,off,true);
  return new Blob([...parts,...cds,e]);
}
test("archives open entry by entry, nested zips and .gz files included", async () => {
  const inner=await makeZip([["a.fit",new Uint8Array([1,2,3]),0]]);
  const gz=new Uint8Array(await new Response(new Blob([new TextEncoder().encode("hello")]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
  const outer=await makeZip([["dir/activities.csv",new TextEncoder().encode("x,y\n1,2\n"),8],["DI_CONNECT/part.zip",new Uint8Array(await inner.arrayBuffer()),0],["activities/9.gpx.gz",gz,0]]);
  const z=await openZip(outer);
  assert.deepEqual(z.entries.map(e=>e.name),["dir/activities.csv","DI_CONNECT/part.zip","activities/9.gpx.gz"]);
  assert.equal(new TextDecoder().decode(await z.bytes(z.entries[0])),"x,y\n1,2\n");
  const seen={};
  await walkZip(outer,async en=>{seen[en.name]=await en.read();});
  assert.deepEqual([...seen["a.fit"]],[1,2,3]);
  assert.equal(new TextDecoder().decode(seen["activities/9.gpx.gz"]),"hello");
});

test("Strong's W/D/F set order and Hevy's set types and RPE come through", () => {
  const strong='"Workout #";"Date";"Workout Name";"Duration (sec)";"Exercise Name";"Set Order";"Weight (kg)";"Reps";"RPE";"Distance (meters)";"Seconds";"Notes";"Workout Notes"\n'+
    '"1";"2024-03-05 07:30:00";"Legs";"3600";"Squat (Barbell)";"1";"100";"5";"8";"0";"0";"";""\n'+
    '"1";"2024-03-05 07:30:00";"Legs";"3600";"Squat (Barbell)";"D";"80";"8";"";"0";"0";"";""\n'+
    '"1";"2024-03-05 07:30:00";"Legs";"3600";"Squat (Barbell)";"F";"90";"6";"10";"0";"0";"";""\n';
  const r=parseStrong(strong,"kg").days[0].ex[0].sets;
  assert.equal(r[0].rpe,8);assert.equal(r[1].kind,"drop");assert.equal(r[2].kind,"fail");assert.equal(r[2].rpe,10);
  const hevy='"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"\n'+
    '"Upper","5 Jan 2026, 17:00","5 Jan 2026, 18:05","","Bench Press (Barbell)","","","0","dropset","60","12","","","7"\n';
  const h=parseHevy(hevy,"kg").days[0].ex[0].sets[0];
  assert.equal(h.kind,"drop");assert.equal(h.rpe,7);
});
