import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {installDOMParser} from "./helpers/xmldom.js";

// Other apps' exports as they really arrive: byte-order marks, Windows line ends, quoted commas,
// semicolons and decimal commas, every date style, pounds and kilograms, metres, kilometres
// and miles, blank and note rows, Apple's streaming XML, and watch files. Imported history must
// come in with the right dates, units, sets, reps, weights, durations and distances, or not at all.

// A zone an hour off UTC in summer, so local and UTC readings can't be confused.
process.env.TZ="Europe/London";
installDOMParser();
const {actOf,detectCsv,exerciseMatcher,nightsFrom,parseFitbod,parseHevy,parseStravaCsv,parseStrong,parseWhen,scanAppleXml}=await import("../js/importers.js");
const {parseWorkoutFile}=await import("../js/cardio.js");
const {SEED_EXERCISES}=await import("../js/model.js");

const local=(y,mo,d,h=0,mi=0,s=0)=>new Date(y,mo-1,d,h,mi,s).toISOString();
const sets=day=>day.ex.flatMap(e=>e.sets.map(x=>[e.name,x.r,x.w,x.kind||(x.wu?"wu":"")]));
function stream(text,size=29){const b=new TextEncoder().encode(text);
  return new ReadableStream({start(c){for(let i=0;i<b.length;i+=size)c.enqueue(b.slice(i,i+size));c.close();}});}

describe("dates",()=>{
  test("every style the apps write reads to the right instant",()=>{
    assert.equal(parseWhen("2024-07-05 07:30:00"),local(2024,7,5,7,30));
    assert.equal(parseWhen("2024-07-05T07:30:00Z"),"2024-07-05T07:30:00.000Z");
    assert.equal(parseWhen("2024-07-05 07:30:00 +0200"),"2024-07-05T05:30:00.000Z");
    assert.equal(parseWhen("2024-07-05T07:30:00+05:30"),"2024-07-05T02:00:00.000Z");
    assert.equal(parseWhen("2024-07-05 07:30"),local(2024,7,5,7,30));
    assert.equal(parseWhen("5 Jul 2024, 17:00"),local(2024,7,5,17));
    assert.equal(parseWhen("05 July 2024 17:00:30"),local(2024,7,5,17,0,30));
    assert.equal(parseWhen("Jul 5, 2024, 12:05:00 AM",true),"2024-07-05T00:05:00.000Z");
    assert.equal(parseWhen("Jul 5, 2024, 12:05:00 PM",true),"2024-07-05T12:05:00.000Z");
    assert.equal(parseWhen("July 5, 2024 8:30 PM"),local(2024,7,5,20,30));
    assert.equal(parseWhen("2024-07-05 07:30:00",true),"2024-07-05T07:30:00.000Z");
  });
  test("nothing readable is null, never an Invalid Date",()=>{
    for(const v of ["","   ",null,undefined,"yesterday","32 Foo 2024, 10:00","Foo 5, 2024, 7:00 AM"])
      assert.equal(parseWhen(v),null,String(v));
  });
  test("a UTC date written day first is read as UTC, as the month-first one is",()=>{
    // BUG: the utc flag (used for Strava's activity dates) is honoured for "Jul 5, 2024, 7:30:00 AM"
    // but ignored for "5 Jul 2024, 07:30:00", so a date in that style lands an hour (or a zone) off.
    assert.equal(parseWhen("5 Jul 2024, 07:30:00",true),"2024-07-05T07:30:00.000Z");
  });
});

describe("which app wrote this CSV",()=>{
  test("each export is recognised from its header, with or without a byte-order mark",()=>{
    assert.equal(detectCsv("\uFEFFDate,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps\r\n"),"strong");
    assert.equal(detectCsv('"Workout #";"Date";"Workout Name";"Exercise Name";"Set Order";"Weight (kg)";"Reps"\n'),"strong");
    assert.equal(detectCsv('"title","start_time","end_time","exercise_title","set_type","weight_kg","reps"\n'),"hevy");
    assert.equal(detectCsv("Date,Exercise,Reps,Weight(lbs),Duration(s),Distance(m),isWarmup\n"),"fitbod");
    assert.equal(detectCsv("Activity ID,Activity Date,Activity Name,Activity Type\n"),"strava");
  });
  test("KingsKiln's own CSV, an empty file and anything else are not taken for another app",()=>{
    assert.equal(detectCsv("Date,Day,Started,Ended,Exercise,Set,Reps,Side,Weight\n"),null);
    assert.equal(detectCsv(""),null);assert.equal(detectCsv("hello"),null);assert.equal(detectCsv(null),null);
  });
});

describe("Strong",()=>{
  const OLD="\uFEFFDate,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE\r\n"+
    '2024-07-05 07:30:00,"Legs, heavy",1h 5m,Squat (Barbell),1,100,5,0,0,"paused, 2 s",,8\r\n'+
    "2024-07-05 07:30:00,\"Legs, heavy\",1h 5m,Squat (Barbell),Rest Timer,,,,90,,,\r\n"+
    "\r\n"+
    "2024-07-05 07:30:00,\"Legs, heavy\",1h 5m,Squat (Barbell),2,102.5,5,0,0,,,\r\n"+
    "2024-07-05 07:30:00,\"Legs, heavy\",1h 5m,Squat (Barbell),Note,,,,,Felt good,,\r\n"+
    ",,,,,,,,,,,\r\n"+
    "2024-07-07 18:00:00,Push,45m,Bench Press (Barbell),W,40,10,0,0,,,\r\n";
  test("the older comma export: quoted titles, durations in words, rest-timer and note rows skipped",()=>{
    const r=parseStrong(OLD,"kg","kg");
    assert.equal(r.days.length,2);
    const [legs,push]=r.days;
    assert.equal(legs.title,"Legs, heavy");
    assert.equal(legs.created,local(2024,7,5,7,30));
    assert.equal(Date.parse(legs.ended)-Date.parse(legs.started),65*60000);
    assert.deepEqual(sets(legs),[["Squat (Barbell)",5,100,""],["Squat (Barbell)",5,102.5,""]]);
    assert.equal(legs.ex[0].sets[0].rpe,8);
    assert.equal(Date.parse(push.ended)-Date.parse(push.started),45*60000);
    assert.deepEqual(sets(push),[["Bench Press (Barbell)",10,40,"wu"]]);
  });
  test("a unit-less weight column is taken in the unit asked for, and converted to the app's",()=>{
    const r=parseStrong(OLD,"kg","lb");
    assert.equal(r.unit,"lb");
    assert.deepEqual(r.days[0].ex[0].sets.map(x=>x.w),[45.4,46.5]);
  });
  const NEW=(unit,rows)=>'"Workout #";"Date";"Workout Name";"Duration (sec)";"Exercise Name";"Set Order";"Weight ('+unit+')";"Reps";"RPE";"Distance (meters)";"Seconds";"Notes";"Workout Notes"\n'+rows.join("\n")+"\n";
  test("the newer semicolon export reads decimal commas and quoted semicolons",()=>{
    const csv=NEW("kg",['"1";"2024-07-05 07:30:00";"Pull; then push";"3600";"Overhead Press (Barbell)";"1";"42,5";"8";"7,5";"0";"0";"";""']);
    const d=parseStrong(csv,"kg").days[0];
    assert.equal(d.title,"Pull; then push");
    assert.equal(d.ex[0].sets[0].w,42.5);assert.equal(d.ex[0].sets[0].rpe,7.5);
  });
  test("pounds come into a kilogram app, and kilograms into a pound app, to a tenth",()=>{
    const lb=NEW("lbs",['"1";"2024-07-05 07:30:00";"A";"60";"Bench Press (Barbell)";"1";"135";"5";"";"0";"0";"";""']);
    assert.equal(parseStrong(lb,"kg").days[0].ex[0].sets[0].w,61.2);
    assert.equal(parseStrong(lb,"lb").days[0].ex[0].sets[0].w,135);
    const kg=NEW("kg",['"1";"2024-07-05 07:30:00";"A";"60";"Bench Press (Barbell)";"1";"100";"5";"";"0";"0";"";""']);
    assert.equal(parseStrong(kg,"lb").days[0].ex[0].sets[0].w,220.5);
  });
  test("timed and bodyweight sets keep their seconds and reps",()=>{
    const csv=NEW("kg",['"1";"2024-07-05 07:30:00";"A";"60";"Plank";"1";"0";"0";"";"0";"75";"";""',
      '"1";"2024-07-05 07:30:00";"A";"60";"Pull Up";"1";"0";"12";"";"0";"0";"";""',
      '"1";"2024-07-05 07:30:00";"A";"60";"Weighted Plank";"1";"20";"1";"";"0";"60";"";""']);
    const [plank,pull,wp]=parseStrong(csv,"kg").days[0].ex;
    assert.equal(plank.timed,true);assert.equal(plank.sets[0].r,75);
    assert.equal(pull.timed,false);assert.equal(pull.sets[0].r,12);assert.equal(pull.sets[0].w,0);
    assert.equal(wp.sets[0].t,60,"reps with seconds keep the seconds as work time");
  });
  test("a distance set with a time keeps both the distance and the time",()=>{
    // BUG: buildDays keeps a set's seconds only when it has reps, so a 2 km row in 8 minutes
    // (Strong and Hevy cardio sets) comes in as 2 km with no time.
    const csv=NEW("kg",['"1";"2024-07-05 07:30:00";"Row";"600";"Rowing (Machine)";"1";"0";"0";"";"2000";"480";"";""']);
    const e=parseStrong(csv,"kg").days[0].ex[0];
    assert.equal(e.dist,true);assert.equal(e.sets[0].r,2000);
    assert.equal(e.sets[0].t,480);
  });
  test("a distance column in kilometres is turned into metres",()=>{
    const csv='"Date";"Workout Name";"Exercise Name";"Set Order";"Weight (kg)";"Reps";"Distance (km)";"Seconds"\n"2024-07-05 07:30:00";"Run";"Running";"1";"0";"0";"5,2";"1500"\n';
    assert.equal(parseStrong(csv,"kg").days[0].ex[0].sets[0].r,5200);
  });
  test("rows with an unreadable date or no exercise are dropped, and a file of only those is empty",()=>{
    const csv=NEW("kg",['"1";"someday";"A";"60";"Squat";"1";"100";"5";"";"0";"0";"";""','"1";"2024-07-05 07:30:00";"A";"60";"";"1";"100";"5";"";"0";"0";"";""']);
    assert.deepEqual(parseStrong(csv,"kg").days,[]);
  });
  test("two workouts on one morning stay apart, and rows of one workout spread out still join",()=>{
    const csv=NEW("kg",['"1";"2024-07-05 07:30:00";"A";"60";"Squat";"1";"100";"5";"";"0";"0";"";""',
      '"2";"2024-07-05 07:30:00";"B";"60";"Squat";"1";"60";"5";"";"0";"0";"";""',
      '"1";"2024-07-05 07:30:00";"A";"60";"Squat";"2";"100";"4";"";"0";"0";"";""']);
    const days=parseStrong(csv,"kg").days;
    assert.deepEqual(days.map(d=>[d.title,d.ex[0].sets.map(x=>x.r)]),[["A",[5,4]],["B",[5]]]);
  });
});

describe("Hevy",()=>{
  const H='\uFEFF"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"\r\n';
  test("kilograms into a pound app, ISO or written-out dates, set types and RPE",()=>{
    const csv=H+'"Lower","2026-07-05 17:00:00","2026-07-05 18:00:00","","Deadlift (Barbell)","","","0","warmup","60","5","","",""\r\n'+
      '"Lower","2026-07-05 17:00:00","2026-07-05 18:00:00","","Deadlift (Barbell)","","","1","normal","180","3","","","8.5"\r\n'+
      '"Lower","2026-07-05 17:00:00","2026-07-05 18:00:00","","Deadlift (Barbell)","","","2","failure","180","2","","","10"\r\n';
    const d=parseHevy(csv,"lb").days[0];
    assert.equal(d.created,local(2026,7,5,17));
    assert.deepEqual(d.ex[0].sets.map(x=>[x.r,x.w,x.kind||(x.wu?"wu":""),x.rpe||0]),[[5,132.3,"wu",0],[3,396.8,"",8.5],[2,396.8,"fail",10]]);
  });
  test("a timed set comes in as seconds, a distance in metres",()=>{
    const csv=H+'"Core","5 Jul 2026, 17:00","5 Jul 2026, 17:20","","Plank","","","0","normal","","","","90",""\r\n'+
      '"Core","5 Jul 2026, 17:00","5 Jul 2026, 17:20","","Running","","","0","normal","","","2.5","",""\r\n';
    const [plank,runEx]=parseHevy(csv,"kg").days[0].ex;
    assert.equal(plank.timed,true);assert.equal(plank.sets[0].r,90);
    assert.equal(runEx.dist,true);assert.equal(runEx.sets[0].r,2500);
  });
  test("an end before the start gives no negative workout length",()=>{
    const csv=H+'"X","5 Jul 2026, 17:00","5 Jul 2026, 16:00","","Squat","","","0","normal","100","5","","",""\r\n';
    const d=parseHevy(csv,"kg").days[0];
    assert.equal(d.ended,"");
  });
});

describe("Fitbod",()=>{
  test("every set of a workout joins one day, warm-ups marked, pounds converted",()=>{
    const csv="Date,Exercise,Reps,Weight(lbs),Duration(s),Distance(m),Incline,Resistance,isWarmup,Note,multiplier\n"+
      "2024-07-05 06:00:00 +0000,Goblet Squat,10,45,0,0,0,0,true,,1\n2024-07-05 06:00:00 +0000,Goblet Squat,8,70,0,0,0,0,False,,1\n"+
      "2024-07-05 06:00:00 +0000,Plank,0,0,60,0,0,0,false,,1\n";
    const r=parseFitbod(csv,"kg");
    assert.equal(r.unit,"lb");assert.equal(r.days.length,1);
    const [gs,pl]=r.days[0].ex;
    assert.deepEqual(gs.sets.map(x=>[x.r,x.w,x.wu]),[[10,20.4,true],[8,31.8,false]]);
    assert.equal(pl.timed,true);assert.equal(pl.sets[0].r,60);
    assert.equal(r.days[0].created,"2024-07-05T06:00:00.000Z");
  });
});

describe("Strava's activities.csv",()=>{
  const HEAD="\uFEFFActivity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Max Heart Rate,Relative Effort,Commute,Elapsed Time,Moving Time,Distance,Average Heart Rate,Elevation Gain,Filename\r\n";
  test("names with commas and quotes, metres from the SI block, no heart rate when there is none",()=>{
    const csv=HEAD+'111,"Jul 5, 2024, 7:30:00 AM","Hills, ""ouch""",Run,,3600,10.03,,,false,3600,3500,10030.4,,120.5,activities/111.gpx.gz\r\n'+
      '222,"Jul 6, 2024, 6:00:00 PM",Commute,Ride,"to work, then home",1800,8.1,160,12,true,1800,1700,8100,141,30,\r\n';
    const [a,b]=parseStravaCsv(csv);
    assert.deepEqual([a.id,a.name,a.dist,a.secs,a.climb,a.hr,a.file,a.when],["111",'Hills, "ouch"',10030,3600,121,null,"activities/111.gpx.gz","2024-07-05T07:30:00.000Z"]);
    assert.deepEqual([b.type,b.dist,b.hr,b.file,b.when],["Ride",8100,{avg:141,max:160},"","2024-07-06T18:00:00.000Z"]);
  });
  test("blank lines and trailing blank rows add no activities",()=>{
    const csv=HEAD+"\r\n333,\"Jul 7, 2024, 7:00:00 AM\",Walk,Walk,,600,1,,,false,600,600,1000,,0,\r\n,,,,,,,,,,,,,,,\r\n\r\n";
    assert.equal(parseStravaCsv(csv).length,1);
  });
  test("activity types become run, ride, walk, swim, row or other",()=>{
    const t={Run:"run",TrailRun:"run",VirtualRun:"run",Ride:"ride",EBikeRide:"ride",MountainBikeRide:"ride",GravelRide:"ride",Velomobile:"ride",
      Walk:"walk",Hike:"walk",Swim:"swim",Rowing:"row",Kayaking:"row",Canoeing:"row",StandUpPaddling:"row",WeightTraining:"other",Yoga:"other","":"other"};
    for(const [k,v] of Object.entries(t))assert.equal(actOf(k),v,k);
  });
});

describe("Apple Health's export.xml",()=>{
  const XML='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE HealthData [\n<!ELEMENT HealthData (Record)*>\n]>\n<HealthData locale="en_US">\n'+
    '<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Scale" unit="lb" creationDate="2024-07-05 06:01:00 -0400" startDate="2024-07-05 06:00:00 -0400" endDate="2024-07-05 06:00:00 -0400" value="181.5"/>\n'+
    '<Record type="HKQuantityTypeIdentifierStepCount" sourceName="Phone" unit="count" startDate="2024-07-05 06:00:00 -0400" endDate="2024-07-05 06:10:00 -0400" value="300"/>\n'+
    '<Workout workoutActivityType="HKWorkoutActivityTypeCycling" duration="1.25" durationUnit="hr" totalDistance="20.5" totalDistanceUnit="mi" sourceName="Watch" startDate="2024-07-05 07:00:00 -0400" endDate="2024-07-05 08:15:00 -0400">\n'+
    ' <MetadataEntry key="HKElevationAscended" value="1000 ft"/>\n <WorkoutEvent type="HKWorkoutEventTypePause" date="2024-07-05 07:30:00 -0400"/>\n</Workout>\n'+
    '<Workout workoutActivityType="HKWorkoutActivityTypeSwimming" duration="1800" durationUnit="s" startDate="2024-07-06 07:00:00 -0400" endDate="2024-07-06 07:30:00 -0400">\n'+
    ' <WorkoutStatistics type="HKQuantityTypeIdentifierDistanceSwimming" startDate="x" endDate="y" sum="1500" unit="yd"/>\n</Workout>\n'+
    '<Workout workoutActivityType="HKWorkoutActivityTypeYoga" startDate="2024-07-07 07:00:00 -0400" endDate="2024-07-07 07:45:00 -0400"/>\n'+
    '</HealthData>\n';
  for(const size of [1,7,4096])test("workouts and weigh-ins come out the same however the file is chunked ("+size+" bytes)",async()=>{
    const ws=[],wt=[],seen=[];
    await scanAppleXml(stream(XML,size),w=>ws.push(w),x=>wt.push(x),n=>seen.push(n));
    assert.equal(ws.length,3);
    const [ride,swim,yoga]=ws;
    assert.deepEqual([ride.when,ride.secs,ride.dist,ride.climb],["2024-07-05T11:00:00.000Z",4500,32992,305]);
    assert.deepEqual([swim.secs,swim.dist],[1800,1372]);
    assert.equal(yoga.secs,2700,"no duration: start to end");
    assert.deepEqual(wt,[{at:"2024-07-05T10:00:00.000Z",w:181.5,unit:"lb"}]);
    assert.ok(seen.every((n,i)=>!i||n>=seen[i-1]),"progress only goes forward");
  });
  test("a hundred thousand samples it doesn't keep stream past quickly",async()=>{
    const row='<Record type="HKQuantityTypeIdentifierHeartRate" sourceName="Watch" unit="count/min" startDate="2024-07-05 06:00:00 -0400" endDate="2024-07-05 06:00:00 -0400" value="61"/>\n';
    const xml="<HealthData>\n"+row.repeat(100000)+'<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30" durationUnit="min" startDate="2024-07-05 07:00:00 -0400" endDate="2024-07-05 07:30:00 -0400"/>\n</HealthData>';
    const ws=[],t=performance.now();
    await scanAppleXml(stream(xml,65536),w=>ws.push(w),()=>{});
    assert.equal(ws.length,1);
    assert.ok(performance.now()-t<3000);
  });
  test("sleep from two apps covering the same night counts the night once",()=>{
    // BUG: nightsFrom adds up every asleep span, so a Watch and a second sleep app (AutoSleep,
    // Oura, a phone) both recording 23:00 to 07:00 make a 16-hour night.
    const spans=[
      {at:"2024-07-04T22:00:00.000Z",end:"2024-07-05T06:00:00.000Z",stage:"core",src:"Watch"},
      {at:"2024-07-04T22:05:00.000Z",end:"2024-07-05T05:55:00.000Z",stage:"asleep",src:"AutoSleep"}];
    const [n]=nightsFrom(spans);
    assert.equal(n.hours,8);
  });
  test("nights group by the morning they end, short naps and spans with no end are left out",()=>{
    const n=nightsFrom([
      {at:"2024-07-04T22:00:00.000Z",end:"2024-07-05T01:00:00.000Z",stage:"core"},
      {at:"2024-07-05T01:30:00.000Z",end:"2024-07-05T05:30:00.000Z",stage:"rem"},
      {at:"2024-07-05T13:00:00.000Z",end:"2024-07-05T13:40:00.000Z",stage:"asleep"},
      {at:"2024-07-05T22:00:00.000Z",end:null}]);
    assert.equal(n.length,1);
    assert.deepEqual([n[0].bed,n[0].wake,n[0].hours],["23:00","06:30",7]);
  });
});

describe("watch files: GPX and TCX",()=>{
  test("Garmin's GPX with heart rate in its extension, elevation and the track's name",()=>{
    const gpx='<?xml version="1.0"?><gpx creator="Garmin Connect" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><metadata><link href="connect.garmin.com"><text>Garmin Connect</text></link><time>2024-07-05T06:00:00.000Z</time></metadata>'+
      '<trk><name>Park &amp; river</name><type>running</type><trkseg>'+
      '<trkpt lat="51.5" lon="-0.12"><ele>10.4</ele><time>2024-07-05T06:00:00.000Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>131</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>'+
      '<trkpt lat="51.501" lon="-0.12"><ele>12.0</ele><time>2024-07-05T06:00:30.000Z</time><extensions><ns3:TrackPointExtension><ns3:hr>139</ns3:hr></ns3:TrackPointExtension></extensions></trkpt>'+
      '<trkpt lat="51.502" lon="-0.12"><time>2024-07-05T06:01:00.000Z</time></trkpt></trkseg></trk></gpx>';
    const w=parseWorkoutFile(gpx);
    assert.equal(w.name,"Park & river");assert.equal(w.sport,"running");
    assert.equal(w.track.length,3);assert.deepEqual(w.track.map(p=>p.alt),[10.4,12,null]);
    assert.deepEqual(w.hr.map(h=>h.bpm),[131,139]);
    assert.equal(w.secs,60);assert.equal(w.start,Date.parse("2024-07-05T06:00:00Z"));
  });
  test("a GPX route with no times has no track to import, rather than one at 1970",()=>{
    const w=parseWorkoutFile('<gpx><rte><name>Plan</name></rte><trk><trkseg><trkpt lat="51" lon="0"/><trkpt lat="51.1" lon="0"/></trkseg></trk></gpx>');
    assert.deepEqual(w.track,[]);assert.equal(w.start,null);assert.equal(w.secs,0);
  });
  test("TCX laps join into one track, with heart rate and the sport",()=>{
    const tp=(t,lat,hr)=>"<Trackpoint><Time>"+t+"</Time><Position><LatitudeDegrees>"+lat+"</LatitudeDegrees><LongitudeDegrees>-0.1</LongitudeDegrees></Position><AltitudeMeters>5</AltitudeMeters><HeartRateBpm><Value>"+hr+"</Value></HeartRateBpm></Trackpoint>";
    const tcx='<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Biking"><Id>2024-07-05T06:00:00Z</Id>'+
      '<Lap StartTime="2024-07-05T06:00:00Z"><Track>'+tp("2024-07-05T06:00:00Z",51,120)+tp("2024-07-05T06:05:00Z",51.01,130)+'</Track></Lap>'+
      '<Lap StartTime="2024-07-05T06:05:00Z"><Track>'+tp("2024-07-05T06:10:00Z",51.02,140)+'</Track></Lap></Activity></Activities></TrainingCenterDatabase>';
    const w=parseWorkoutFile(tcx);
    assert.equal(w.sport,"Biking");assert.equal(w.track.length,3);assert.deepEqual(w.hr.map(h=>h.bpm),[120,130,140]);assert.equal(w.secs,600);
  });
  test("a treadmill TCX, with distance but no positions, keeps its distance",()=>{
    // BUG: TCX distance (DistanceMeters on the lap and on each Trackpoint) is never read, so an
    // indoor run from Garmin or any treadmill imports as a timed session with no distance.
    const tcx='<TrainingCenterDatabase><Activities><Activity Sport="Running"><Id>2024-07-05T06:00:00Z</Id><Lap StartTime="2024-07-05T06:00:00Z"><TotalTimeSeconds>1800</TotalTimeSeconds><DistanceMeters>5000</DistanceMeters>'+
      '<Track><Trackpoint><Time>2024-07-05T06:00:00Z</Time><DistanceMeters>0</DistanceMeters><HeartRateBpm><Value>120</Value></HeartRateBpm></Trackpoint>'+
      '<Trackpoint><Time>2024-07-05T06:30:00Z</Time><DistanceMeters>5000</DistanceMeters><HeartRateBpm><Value>150</Value></HeartRateBpm></Trackpoint></Track></Lap></Activity></Activities></TrainingCenterDatabase>';
    const w=parseWorkoutFile(tcx);
    assert.equal(w.secs,1800);assert.equal(w.hr.length,2);
    assert.equal(w.distM,5000);
  });
  test("broken or empty XML gives an empty workout rather than throwing",()=>{
    for(const t of ["","<gpx><trk><trkseg><trkpt lat=","not xml at all","\u0000\u0001binary"]){
      const w=parseWorkoutFile(t);
      assert.deepEqual([w.track,w.hr,w.secs],[[],[],0]);
    }
  });
});

describe("their exercise names into KingsKiln's list",()=>{
  const m=exerciseMatcher(SEED_EXERCISES);
  test("common Strong and Hevy names find the same lift in the list",()=>{
    const want={"Squat (Barbell)":"Squats","Bench Press (Barbell)":"Bench press","Deadlift (Barbell)":"Deadlift",
      "Overhead Press (Barbell)":"Shoulder press","Pull Up":"Pull ups","Chin Up":"Chin ups","Romanian Deadlift (Barbell)":"Romanian deadlift",
      "Hip Thrust (Barbell)":"Hip thrust","Calf Raise":"Calf raises","Burpee":"Burpees","Walking Lunge":"Walking lunges",
      "Lateral Raise (Dumbbell)":"Dumbbell lateral raise","Face Pull (Cable)":"Cable face pull","Incline Bench Press (Barbell)":"Inclined Bench Press",
      "Dip":"Dips","Push Up":"Push ups","Sit Up":"Sit-ups","  Plank  ":"Plank","SQUAT (BARBELL)":"Squats"};
    for(const [k,v] of Object.entries(want))assert.equal(m(k),v,k);
  });
  test("a different piece of kit is never folded into the barbell lift, and unknown names keep their own",()=>{
    assert.equal(m("Squat (Smith Machine)"),"Smith machine squat");
    assert.equal(m("Squat (Band)"),"Band squat");
    assert.notEqual(m("Bench Press (Dumbbell)"),"Bench press");
    assert.equal(m("Zercher Carry (Sandbag)"),"Zercher Carry (Sandbag)");
    assert.equal(m(""),"");
  });
  test("a machine or cable version, or a dumbbell curl, finds the plain lift",()=>{
    const want={"Lat Pulldown (Cable)":"Lat pulldown","Leg Extension (Machine)":"Leg extension","Seated Row (Cable)":"Seated cable row",
      "Triceps Pushdown (Cable - Straight Bar)":"Cable tricep pushdown","Calf Raise (Machine)":"Calf raises","Bicep Curl (Dumbbell)":"Bicep curls",
      "Hammer Curl (Dumbbell)":"Hammer curl","Goblet Squat (Kettlebell)":"Goblet squat","Triceps Extension (Cable)":"Cable Tricep Extension"};
    for(const [k,v] of Object.entries(want))assert.equal(m(k),v,k);
    assert.notEqual(m("Squat (Dumbbell)"),"Squats","a dumbbell squat isn't the barbell squat");
  });
});
