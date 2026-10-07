import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {aiSummary,checkinsCSV} from "../js/aiexport.js";

const now=Date.UTC(2026,9,8,12);
const iso=d=>new Date(now-d*86400000).toISOString();
const set=(r,w,x={})=>Object.assign({r,w,side:false,t:0,rest:0,at:"",wu:false,band:""},x);
const data={settings:{unit:"kg",progressRange:"6-10",stepMode:"split",missRule:"drop",stallAfter:3,deloadPct:10,breakRule:"standard"},
  sessions:[{id:"a",title:"Legs",created:iso(2),ex:[{name:"Squats",sets:[set(5,100),set(5,100,{rpe:8,note:"hip pinched"})]}]},
    {id:"b",title:"Old",created:iso(200),ex:[{name:"Bench press",sets:[set(5,80)]}]}],
  body:[{at:iso(30),w:84},{at:iso(1),w:83}],checkins:[{at:iso(1),hours:7.5,sleep:2,soreness:3,fatigue:2,stress:1}],
  exNotes:{"squats":"Seat 4"},exProg:{"bicep curls":{hand:true}},routines:[{name:"Legs",ex:["Squats"]}]};

describe("aiSummary",()=>{
  const t=aiSummary(data,{weeks:12,now});
  test("includes recent days set by set, with notes and RPE",()=>{
    assert.match(t,/### .*Legs/);
    assert.match(t,/- Squats: 5 @100, 5 @100/);
    assert.match(t,/@RPE8/);
    assert.match(t,/set 2: hip pinched/);
  });
  test("leaves out days before the window but keeps all-time records",()=>{
    assert.doesNotMatch(t,/### .*Old/);
    assert.match(t,/Bench press: 80 × 5/);
  });
  test("states the progression rules, notes, body weight and check-ins",()=>{
    assert.match(t,/Rep range 6-10/);
    assert.match(t,/drop one jump/);
    assert.match(t,/bicep curls: weight per hand/);
    assert.match(t,/squats: Seat 4/);
    assert.match(t,/body weight 83 kg/);
    assert.match(t,/\| 7.5 \| 2 \| 3 \| 2 \| 1 \|/);
  });
});
describe("checkinsCSV",()=>{
  test("one row per check-in, oldest first",()=>{
    const c=checkinsCSV([{at:"2026-10-07T07:00:00Z",hours:7,sleep:2},{at:"2026-10-01T07:00:00Z",hours:8,sleep:1,rundown:true}]).trim().split("\n");
    assert.equal(c.length,3);
    assert.match(c[1],/^2026-10-01,.*yes$/);
  });
});
