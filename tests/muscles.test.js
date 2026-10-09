import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {musclesOf,setsByMuscle,fatigueByMuscle} from "../js/muscles.js";
import {readiness,suggestion} from "../js/ready.js";
import {EXERCISE_GROUPS} from "../js/model.js";

describe("musclesOf",()=>{
  test("maps common lifts to their muscles and joints",()=>{
    assert.deepEqual(musclesOf("Squats").primary,["quads","glutes"]);
    assert.ok(musclesOf("Bench press").joints.includes("shoulder"));
    assert.deepEqual(musclesOf("Wrist curl").primary,["forearms"]);
    assert.deepEqual(musclesOf("Reverse Nordic").primary,["quads"]);
    assert.deepEqual(musclesOf("Lying leg curl").primary,["hamstrings"]);
  });
  test("every exercise in the catalogue, conditioning and fighting drills included, trains or stretches a muscle",()=>{
    const none=[];EXERCISE_GROUPS.forEach(g=>g[1].forEach(n=>{const m=musclesOf(n);if(!m.primary.length&&!m.stretch.length)none.push(n);}));
    assert.deepEqual(none,[]);
  });
  test("runs, rounds and breathing train muscles but aren't hard sets; lifting is",()=>{
    for(const n of ["Running","Swimming","Wrestling practice","Heavy bag","Deep breathing","Jump rope","Rowing"])assert.equal(musclesOf(n).sets,false,n);
    for(const n of ["Squats","Bench press","Farmer carry","Plank","Short foot"])assert.equal(musclesOf(n).sets,true,n);
    const day={created:new Date().toISOString(),ex:[{name:"Running",sets:[{r:5000,at:new Date().toISOString()}]}]};
    assert.equal(setsByMuscle([day],0,Date.now()+1).calves,0,"a run is no hard set");
    assert.ok(fatigueByMuscle([day],Date.now()+1).calves>0,"but the legs feel it");
  });
  test("a stretch names what it lengthens and trains nothing",()=>{
    const m=musclesOf("Couch stretch");assert.deepEqual(m.primary,[]);assert.deepEqual(m.stretch,["hipflexors","quads"]);
  });
});
describe("setsByMuscle and fatigue",()=>{
  const now=Date.UTC(2026,9,8,12);
  const at=h=>new Date(now-h*3600000).toISOString();
  const s=[{created:at(20),ex:[{name:"Squats",sets:[{r:5,w:100,at:at(20)},{r:5,w:100,at:at(20)},{r:5,w:100,at:at(20)},{r:5,w:100,at:at(20)},{r:5,w:100,at:at(20)},{r:5,w:100,at:at(20)},{r:5,w:100,at:at(20),wu:true}]}]}];
  test("counts primary sets fully and secondary as half, skipping warm-ups",()=>{
    const by=setsByMuscle(s,now-7*86400000,now);
    assert.equal(by.quads,6);assert.equal(by.hamstrings,3);assert.equal(by.chest,0);
  });
  test("legs trained yesterday read as recovering; upper body is fresh",()=>{
    const f=fatigueByMuscle(s,now);
    assert.ok(f.quads>=0.4);assert.equal(f.chest,0);
    const later=fatigueByMuscle(s,now+4*86400000);assert.ok(later.quads<0.2);
  });
});
describe("run down",()=>{
  const ci={sleep:1,soreness:1,fatigue:1,stress:1,hours:8,rundown:true};
  test("outranks good ratings and works before a week of check-ins",()=>{
    const r=readiness({checkin:ci,count:1});
    assert.equal(r.band,"recover");assert.equal(r.rundown,true);
    assert.match(suggestion("rundown"),/Rest today/);
  });
});
