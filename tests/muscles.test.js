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
  test("every strength exercise in the catalogue has at least one muscle or is a stretch",()=>{
    const skip=/stretch|pose|breathing|vacuum|rolling|roller|pancake|toe touch|neck|tibialis/i;
    const none=[];EXERCISE_GROUPS.forEach(g=>{if(["Conditioning","Combat & skill"].includes(g[0]))return;
      g[1].forEach(n=>{if(!skip.test(n)&&!musclesOf(n).primary.length)none.push(n);});});
    assert.deepEqual(none,[]);
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
