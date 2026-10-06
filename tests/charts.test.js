import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {est1RM,exerciseRecords,exerciseTrend,weeklyVolume} from "../js/charts.js";

const set=(r,w=0,extra={})=>Object.assign({r,side:false,w,t:0,rest:0,at:"",wu:false,band:""},extra);
// A session created at local noon on the given day, holding the given exercises.
const day=(y,m,d,ex)=>({id:"s"+y+m+d,created:new Date(y,m,d,12).toISOString(),ex});
const ex=(name,sets,extra={})=>Object.assign({name,sets},extra);

describe("est1RM",()=>{
  test("applies the Epley formula, rounded to one decimal",()=>{
    assert.equal(est1RM(100,10),133.3);
    assert.equal(est1RM(60,5),70);
  });

  test("is the weight itself for zero reps",()=>{
    assert.equal(est1RM(100,0),100);
  });
});

describe("exerciseRecords",()=>{
  test("ignores warm-up sets entirely",()=>{
    const recs=exerciseRecords([day(2026,0,5,[ex("Squats",[set(5,140,{wu:true}),set(5,100)])])]);
    assert.equal(recs[0].bestW,100);
    assert.equal(recs[0].best1RM,est1RM(100,5));
  });

  test("breaks a tie on best weight by the most reps",()=>{
    const recs=exerciseRecords([day(2026,0,5,[ex("Squats",[set(3,100),set(5,100),set(4,100)])])]);
    assert.equal(recs[0].bestW,100);
    assert.equal(recs[0].bestWReps,5);
  });

  test("a lighter set with more reps does not replace the best weight",()=>{
    const recs=exerciseRecords([day(2026,0,5,[ex("Squats",[set(3,100),set(12,80)])])]);
    assert.equal(recs[0].bestW,100);
    assert.equal(recs[0].bestWReps,3);
    assert.equal(recs[0].bestR,12);
  });

  test("merges days by name regardless of case and counts them",()=>{
    const recs=exerciseRecords([
      day(2026,0,5,[ex("Squats",[set(5,100)])]),
      day(2026,0,8,[ex("squats",[set(5,105)])])
    ]);
    assert.equal(recs.length,1);
    assert.equal(recs[0].days,2);
    assert.equal(recs[0].bestW,105);
    assert.equal(recs[0].last,new Date(2026,0,8,12).toISOString());
  });

  test("skips exercises with no sets",()=>{
    assert.deepEqual(exerciseRecords([day(2026,0,5,[ex("Squats",[])])]),[]);
  });

  test("ranks by estimated 1RM, then bodyweight movements by reps",()=>{
    const recs=exerciseRecords([day(2026,0,5,[
      ex("Push ups",[set(30)]),
      ex("Bench press",[set(5,80)]),
      ex("Pull ups",[set(12)]),
      ex("Deadlift",[set(5,140)])
    ])]);
    assert.deepEqual(recs.map(r=>r.name),["Deadlift","Bench press","Push ups","Pull ups"]);
  });
});

describe("exerciseTrend",()=>{
  test("plots top weight when most days were weighted",()=>{
    const trend=exerciseTrend([
      day(2026,0,5,[ex("Squats",[set(5,100),set(5,110)])]),
      day(2026,0,8,[ex("Squats",[set(5,115)])]),
      day(2026,0,12,[ex("Squats",[set(20)])])
    ],"Squats",{measure:"top"});
    assert.equal(trend.weighted,true);
    assert.deepEqual(trend.points.map(p=>p.v),[110,115]);
  });

  test("plots top reps for every day when most days were unweighted",()=>{
    const trend=exerciseTrend([
      day(2026,0,5,[ex("Pull ups",[set(8),set(10)])]),
      day(2026,0,8,[ex("Pull ups",[set(5,10)])]),
      day(2026,0,12,[ex("Pull ups",[set(12)])])
    ],"Pull ups");
    assert.equal(trend.weighted,false);
    assert.deepEqual(trend.points.map(p=>p.v),[10,5,12]);
  });

  test("counts an even split as weighted",()=>{
    const trend=exerciseTrend([
      day(2026,0,5,[ex("Dips",[set(10)])]),
      day(2026,0,8,[ex("Dips",[set(8,10)])])
    ],"Dips");
    assert.equal(trend.weighted,true);
  });

  test("orders points oldest first whatever order sessions come in",()=>{
    const trend=exerciseTrend([
      day(2026,0,12,[ex("Squats",[set(5,120)])]),
      day(2026,0,5,[ex("Squats",[set(5,100)])])
    ],"squats",{measure:"top"});
    assert.deepEqual(trend.points.map(p=>p.v),[100,120]);
  });

  test("ignores warm-ups when picking the day's top set",()=>{
    const trend=exerciseTrend([day(2026,0,5,[ex("Squats",[set(5,140,{wu:true}),set(5,100)])])],"Squats",{measure:"top"});
    assert.deepEqual(trend.points.map(p=>p.v),[100]);
  });

  test("keeps only the latest 12 points",()=>{
    const sessions=[];
    for(let i=1;i<=15;i++)sessions.push(day(2026,0,i,[ex("Squats",[set(5,100+i)])]));
    const trend=exerciseTrend(sessions,"Squats",{measure:"top"});
    assert.equal(trend.points.length,12);
    assert.equal(trend.points[0].v,104);
    assert.equal(trend.points[11].v,115);
  });

  test("is an empty unweighted trend for an exercise never trained",()=>{
    assert.deepEqual(exerciseTrend([],"Squats",{measure:"top"}),{weighted:false,measure:"top",points:[]});
  });
});

describe("weeklyVolume",()=>{
  // Wednesday 17 June 2026, local noon — away from any DST change in the last eight weeks.
  const NOW=new Date(2026,5,17,12);
  const freeze=t=>t.mock.timers.enable({apis:["Date"],now:NOW.getTime()});

  test("returns eight weeks, oldest first, each keyed by its Monday",t=>{
    freeze(t);
    const weeks=weeklyVolume([]);
    assert.equal(weeks.length,8);
    assert.equal(weeks[0].key,"2026-04-27");
    assert.equal(weeks[7].key,"2026-06-15");
    weeks.forEach(w=>{
      assert.deepEqual(Object.keys(w).sort(),["key","label","reps","ton","trained"]);
    });
  });

  test("totals reps, tonnage and training days for the week a session falls in",t=>{
    freeze(t);
    const weeks=weeklyVolume([
      day(2026,5,15,[ex("Squats",[set(5,20,{wu:true}),set(10,50)])]),
      day(2026,5,17,[ex("Push ups",[set(20)])])
    ]);
    assert.deepEqual({reps:weeks[7].reps,ton:weeks[7].ton,trained:weeks[7].trained},
      {reps:30,ton:500,trained:2});
  });

  test("puts a Sunday session in the week that began the Monday before",t=>{
    freeze(t);
    const weeks=weeklyVolume([day(2026,5,14,[ex("Squats",[set(10)])])]);
    assert.equal(weeks[6].reps,10);
    assert.equal(weeks[7].reps,0);
  });

  test("ignores sessions older than eight weeks",t=>{
    freeze(t);
    const weeks=weeklyVolume([day(2026,3,20,[ex("Squats",[set(10)])])]);
    assert.equal(weeks.reduce((n,w)=>n+w.reps,0),0);
  });

  test("ignores sessions with no sets logged",t=>{
    freeze(t);
    const weeks=weeklyVolume([day(2026,5,16,[ex("Squats",[])])]);
    assert.equal(weeks[7].trained,0);
  });
});

import {weeklySetsByGroup} from "../js/charts.js";
test("weeklySetsByGroup counts this week's working sets by movement, always listing the main four",()=>{
  // Thursday 1 Oct 2026; the week starts Monday 28 Sept.
  const now=new Date(2026,9,1,12);
  const mk=(created,name,sets)=>({id:created,title:"x",created:new Date(...created).toISOString(),ex:[{name,sets}]});
  const set=(wu=false)=>({r:10,w:50,side:false,wu});
  const sessions=[mk([2026,8,29,9],"Bench press",[set(),set(),set(true)]),
    mk([2026,8,30,9],"Deadlift",[set(),set()]),
    mk([2026,8,25,9],"Bench press",[set(),set()])];
  const g=weeklySetsByGroup(sessions,now);
  const by=Object.fromEntries(g.map(x=>[x.group,x.sets]));
  assert.equal(by["Push"],2,"warm-up and last week's sets excluded");
  assert.equal(by["Hinge & glutes"],2);
  assert.equal(by["Squat & lunge"],0);
  assert.equal(by["Pull"],0);
  assert.ok(g.find(x=>x.group==="Push").target);
});

describe("exerciseTrend measures",()=>{
  test("the default for a weighted lift is estimated 1RM, so more reps at the same weight shows as a rise",()=>{
    const t=exerciseTrend([day(2026,0,5,[ex("Bench",[set(10,60)])]),day(2026,0,8,[ex("Bench",[set(15,60)])])],"Bench");
    assert.equal(t.measure,"e1rm");
    assert.ok(t.points[1].v>t.points[0].v);
    const v=exerciseTrend([day(2026,0,5,[ex("Bench",[set(10,60),set(10,60)])])],"Bench",{measure:"volume"});
    assert.deepEqual(v.points.map(p=>p.v),[1200]);
  });
  test("a span widens the window past 12 points",()=>{
    const many=Array.from({length:20},(_,i)=>day(2026,0,1+i,[ex("Bench",[set(5,100+i)])]));
    assert.equal(exerciseTrend(many,"Bench",{measure:"top"}).points.length,12);
    assert.equal(exerciseTrend(many,"Bench",{measure:"top",span:"all"}).points.length,20);
  });
});

test("the check-in reminder is a daily event with an alarm",async()=>{
  const {checkinICS}=await import("../js/reminder.js");
  const ics=checkinICS("07:00",new Date(2026,9,6,9,0));
  assert.match(ics,/RRULE:FREQ=DAILY/);assert.match(ics,/DTSTART:20261007T070000/);assert.match(ics,/VALARM/);
});
