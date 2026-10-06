import {test} from "node:test";
import assert from "node:assert/strict";
globalThis.document=globalThis.document||{documentElement:{dataset:{}}};
const {strongCSV,gpx,tcx,workoutText,zipFiles}=await import("../js/exporters.js");
const {parseStrong}=await import("../js/importers.js");
const {normSet}=await import("../js/model.js");

const day={id:"d1",title:"Push day",created:"2026-03-01T09:00:00.000Z",started:"2026-03-01T09:00:00.000Z",ended:"2026-03-01T09:48:00.000Z",running:false,
  ex:[{id:"e1",name:"Bench press",sets:[normSet({r:10,w:60,kind:"wu"}),normSet({r:5,w:100,rpe:8}),normSet({r:8,w:80,kind:"drop",note:"burn"})]},
      {id:"e2",name:"Plank",timed:true,sets:[normSet({r:60})]}]};
const run={id:"r1",title:"Morning run",created:"2026-03-02T07:00:00.000Z",started:"2026-03-02T07:00:00.000Z",ended:"2026-03-02T07:30:00.000Z",running:false,ex:[],
  cardio:{activity:"run",secs:1800,dist:5400,climb:20,splits:[],hr:{avg:150,max:171},track:[[51.5,-0.12],[51.501,-0.121],[51.502,-0.122]]}};

test("the Strong-format CSV round-trips through the Strong importer", () => {
  const csv=strongCSV([day,run],"kg");
  assert.ok(csv.startsWith('"Workout #";"Date";"Workout Name"'));
  const lines=csv.trim().split("\n");
  assert.equal(lines.length,5,"header + 4 sets; the run is not a strength day");
  assert.match(lines[1],/;"W";"60";"10";/);assert.match(lines[2],/;"1";"100";"5";"8";/);assert.match(lines[3],/;"D";"80";"8";"";"0";"0";"burn"/);
  assert.match(lines[4],/"Plank";"1";"0";"0";"";"0";"60"/);
  const back=parseStrong(csv,"kg").days[0];
  assert.equal(back.title,"Push day");assert.equal(back.ex[0].sets[0].wu,true);assert.equal(back.ex[0].sets[2].kind,"drop");assert.equal(back.ex[1].timed,true);
});

test("GPX and TCX carry the route, spread over the session, and the heart rate", () => {
  const g=gpx(run);
  assert.match(g,/<gpx version="1.1"/);assert.equal((g.match(/<trkpt /g)||[]).length,3);
  assert.match(g,/<time>2026-03-02T07:00:00.000Z<\/time><\/trkpt>/);assert.match(g,/<time>2026-03-02T07:30:00.000Z<\/time><\/trkpt>/);
  const t=tcx(run);
  assert.match(t,/Sport="Running"/);assert.match(t,/<DistanceMeters>5400</);assert.match(t,/<AverageHeartRateBpm><Value>150</);assert.equal((t.match(/<Trackpoint>/g)||[]).length,3);
});

test("a workout reads well as text", () => {
  const t=workoutText(day,"kg");
  assert.match(t,/^Push day · /);assert.match(t,/48 min/);assert.match(t,/Bench press: 10 @60w, 5 @100, 8 @80 kg/);assert.match(t,/set 3: burn/);assert.match(t,/Plank: 60s/);
});

test("the zip is a valid stored archive", () => {
  const z=zipFiles([["a.txt","hello"],["dir/b.csv","x;y\n"]]);
  assert.equal(z.type,"application/zip");
  return z.arrayBuffer().then(buf=>{const b=new Uint8Array(buf),dv=new DataView(buf);
    assert.equal(dv.getUint32(0,true),0x04034b50);assert.equal(dv.getUint32(b.length-22,true),0x06054b50);assert.equal(dv.getUint16(b.length-22+10,true),2);});
});
