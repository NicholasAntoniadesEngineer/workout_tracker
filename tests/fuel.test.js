import {test} from "node:test";
import assert from "node:assert/strict";
import {fastingHours,frequent,proteinTarget,totalsOf} from "../js/fuel.js";
import {MARKERS,flagOf,markerById,series} from "../js/markers.js";

test("protein target follows body weight and goal, rounded to 5 g", () => {
  assert.equal(proteinTarget(82,"lift"),165);assert.equal(proteinTarget(82,"cut"),180);assert.equal(proteinTarget(82,"endure"),130);assert.equal(proteinTarget(0,"lift"),0);
});
test("totals, frequent items and the fasting clock", () => {
  const now=Date.parse("2026-10-06T20:00:00.000Z");
  const e=[{at:"2026-10-06T08:00:00.000Z",name:"Eggs, 3 large",p:19,kcal:215},{at:"2026-10-06T12:00:00.000Z",name:"Chicken breast, 200 g",p:62,kcal:330},
    {at:"2026-10-06T13:00:00.000Z",water:1},{at:"2026-10-05T08:00:00.000Z",name:"Eggs, 3 large",p:19,kcal:215}];
  const t=totalsOf(e.filter(x=>x.at.startsWith("2026-10-06")));
  assert.equal(t.p,81);assert.equal(t.kcal,545);assert.equal(t.water,1);assert.equal(t.n,2);
  assert.equal(frequent(e,3)[0].name,"Eggs, 3 large");
  assert.equal(fastingHours(e,now),8);assert.equal(fastingHours([],now),0);
});
test("markers flag against their range and series carry the change", () => {
  const f=markerById("ferritin");
  assert.equal(flagOf(f,20),"low");assert.equal(flagOf(f,80),"ok");assert.equal(flagOf(f,400),"high");assert.equal(flagOf(f,""),"");
  assert.ok(MARKERS.every(m=>m.learn));
  const s=series([{id:"ferritin",at:"2026-06-01",v:40},{id:"ferritin",at:"2026-01-01",v:25},{id:"vitd",at:"2026-01-01",v:50}],"ferritin");
  assert.deepEqual(s.map(x=>[x.v,x.delta]),[[25,null],[40,15]]);
});
