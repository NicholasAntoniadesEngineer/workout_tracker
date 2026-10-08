import {test,describe,mock,before,after} from "node:test";
import assert from "node:assert/strict";

// The training summary written for an AI chat, at its edges: no data at all, cardio days, the
// lifter's unit, sets marked as drop, failure, per hand or in the other unit, old check-ins
// and notes left out, and the check-ins spreadsheet with awkward values. Never "undefined" or
// "NaN" in the text, and the numbers in it must be right.

process.env.TZ="Europe/London";
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){},clear(){}};
globalThis.document={documentElement:{dataset:{}}};
const {aiSummary,checkinsCSV}=await import("../js/aiexport.js");

const NOW=Date.UTC(2026,9,8,12);
const ago=d=>new Date(NOW-d*86400000).toISOString();
const set=(r,w,x={})=>Object.assign({r,w,side:false,t:0,rest:0,at:"",wu:false,band:""},x);
before(()=>mock.timers.enable({apis:["Date"],now:NOW}));
after(()=>mock.timers.reset());
const clean=t=>assert.doesNotMatch(t,/undefined|NaN|null|\[object/);

describe("aiSummary",()=>{
  test("no data at all still reads, with zero days and the default rules",()=>{
    for(const d of [{},{sessions:[],settings:{}}]){
      const t=aiSummary(d,{now:NOW});
      clean(t);
      assert.match(t,/0 training days\. Weights in kg/);
      assert.match(t,/Rep range 10-15/);
      assert.doesNotMatch(t,/## About me|## Best sets|## Morning check-ins|## My routines/);
    }
  });
  test("cardio days give distance, minutes and heart rate, or just what they have",()=>{
    const t=aiSummary({sessions:[
      {id:"a",title:"River",created:ago(1),ex:[],cardio:{activity:"run",dist:10050,secs:2735,hr:{avg:151,max:172}}},
      {id:"b",title:"Erg",created:ago(2),ex:[],cardio:{activity:"row",secs:1200}},
      {id:"c",title:"Odd",created:ago(3),ex:[],cardio:{}}]},{now:NOW});
    clean(t);
    assert.match(t,/- run: 10\.05 km, 46 min, 151 bpm average\n/);
    assert.match(t,/- row: 20 min\n/);
    assert.match(t,/- cardio: 0 min\n/);
  });
  test("set marks, per-hand weights, the gym and set notes are all written",()=>{
    const t=aiSummary({gyms:[{id:"g",name:"Garage"}],sessions:[{id:"a",title:"Push",created:ago(1),gym:"g",ex:[
      {name:"Bench press",sets:[set(10,40,{wu:true}),set(5,80,{rpe:8}),set(8,60,{kind:"drop"}),set(3,80,{kind:"fail",note:"bar stalled"})]},
      {name:"Dumbbell press",sets:[set(10,30,{hand:true})]},{name:"Dips",sets:[]}]}]},{now:NOW});
    clean(t);
    assert.match(t,/### Wed, 7 Oct 2026 · Push · at Garage\n/);
    assert.match(t,/- Bench press: 10 @40w, 5 @80, 8 @60, 3 @80 \[ @RPE8, d, f\]\n  - set 4: bar stalled\n/);
    assert.match(t,/- Dumbbell press: 10 @30 per hand\n/);
    assert.doesNotMatch(t,/- Dips/);
  });
  test("the window keeps recent days only, and body weight shows then and now",()=>{
    const t=aiSummary({settings:{unit:"lb",heightCm:180,sex:"m"},sessions:[{id:"a",title:"New",created:ago(3),ex:[{name:"Squats",sets:[set(5,225)]}]},
      {id:"b",title:"Old",created:ago(40),ex:[{name:"Squats",sets:[set(5,185)]}]}],
      body:[{at:ago(100),w:200},{at:ago(20),w:195},{at:ago(2),w:190},{at:ago(1)}]},{now:NOW,weeks:4});
    clean(t);
    assert.match(t,/The last 4 weeks, 1 training days\. Weights in lb/);
    assert.doesNotMatch(t,/· Old/);
    assert.match(t,/body weight 190 lb \(Tue, 6 Oct 2026\); was 195 lb on .*; height 180 cm; male\./);
  });
  test("check-ins older than four weeks, blank exercise notes and nameless routines are left out",()=>{
    const t=aiSummary({checkins:[{at:ago(40),sleep:1},{at:ago(2),hours:6.5,sleep:3,soreness:2,fatigue:4,stress:2,rundown:true},{at:ago(5),sleep:2}],
      exNotes:{squats:"  ",deadlift:"Mixed grip"},routines:[{name:"Upper",ex:["Bench press","Rows"]},{name:"",ex:["x"]},null,{name:"Empty"}],
      programme:{name:"5 × 5"}},{now:NOW});
    clean(t);
    const rows=t.split("\n").filter(l=>/^\| \w{3}, /.test(l));
    assert.deepEqual(rows,["| Sat, 3 Oct 2026 |  | 2 |  |  |  |","| Tue, 6 Oct 2026 | 6.5 | 3 | 2 | 4 | 2 | run down"]);
    assert.match(t,/## Notes on exercises\n\n- deadlift: Mixed grip\n/);
    assert.match(t,/## My routines\n\n- Upper: Bench press, Rows\n- Empty: \n/);
    assert.match(t,/Currently following: 5 × 5\./);
  });
  test("a week's reps count lifted reps, not a run's metres or a plank's seconds",()=>{
    // BUG: the weekly totals add every set's number as reps, so one 5 km run adds 5,000 reps
    // and a minute's plank adds 60 (charts.js repCount counts timed and distance sets).
    const t=aiSummary({sessions:[
      {id:"r",title:"Run",created:ago(1),ex:[{name:"Running",dist:true,sets:[set(5000,0)]}],cardio:{activity:"run",dist:5000,secs:1500}},
      {id:"l",title:"Legs",created:ago(2),ex:[{name:"Squats",sets:[set(5,100),set(5,100)]},{name:"Plank",timed:true,sets:[set(60,0)]}]}]},{now:NOW,weeks:4});
    const week=t.split("\n").find(l=>/^\| Oct 5 \|/.test(l));
    assert.equal(week,"| Oct 5 | 2 | 10 | 1000 |");
  });
  test("a best set logged in pounds in a kilogram app is marked as pounds",()=>{
    // BUG: training days mark such an exercise "(lb)", but Best sets prints the raw number
    // under "Weights in kg unless marked", so 135 lb reads as a 135 kg bench.
    const t=aiSummary({settings:{unit:"kg"},sessions:[{id:"a",title:"Push",created:ago(1),ex:[{name:"Bench press",sets:[set(5,135,{u:"lb"})]}]}]},{now:NOW});
    assert.match(t,/- Bench press: 5 @135 \(lb\)\n/);
    assert.match(t,/- Bench press: (135 × 5 .*lb|61\.\d × 5 )/);
  });
});

describe("checkinsCSV",()=>{
  test("awkward values are quoted, and the oldest comes first",()=>{
    const c=checkinsCSV([{at:"2026-10-07T07:00:00Z",bed:"23:30",wake:"06:45",hours:7.25,sleep:2,soreness:1,fatigue:3,stress:4},
      {at:"2026-10-01T07:00:00Z",hours:"7,5",bed:'"late"',rundown:true},{at:"2026-10-03T07:00:00Z",wake:"06:00\n"}]);
    assert.equal(c,"date,bed,wake,sleep_hours,sleep,soreness,energy,stress,run_down\n"+
      '2026-10-01,"""late""",,"7,5",,,,,yes\n2026-10-03,,"06:00\n",,,,,,\n2026-10-07,23:30,06:45,7.25,2,1,3,4,\n');
  });
  test("no check-ins is just the header, and a check-in with no date sorts first without breaking",()=>{
    assert.equal(checkinsCSV([]),"date,bed,wake,sleep_hours,sleep,soreness,energy,stress,run_down\n");
    assert.equal(checkinsCSV(null),"date,bed,wake,sleep_hours,sleep,soreness,energy,stress,run_down\n");
    const c=checkinsCSV([{at:"2026-10-02T07:00:00Z",sleep:1},{sleep:5}]).split("\n");
    assert.equal(c[1],",,,,5,,,,");
  });
});
