import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {progressionHint,bestsBefore,newBestLabel,sessionBests,sessionVolume,workoutSummary} from "../js/coach.js";
import {makeExercise,unitOf,lastSetExercise,totals,SEED_EXERCISES} from "../js/model.js";
import {CUES,cuesFor} from "../js/cues.js";
import {reminderICS} from "../js/reminder.js";

const set=(r,w=0,extra={})=>Object.assign({r,side:false,w,t:0,rest:0,at:"",wu:false,band:""},extra);
const day=(id,created,ex,title="Legs")=>({id,title,created,started:"",ended:"",running:false,timerFrom:"",ex});
const ex=(name,sets,extra={})=>Object.assign({id:"e-"+name+Math.random(),name,sets},extra);
const opts={unit:"reps",weightUnit:"kg",low:10,top:14};

describe("progressionHint — double progression",()=>{
  test("suggests the next weight and the bottom of the range once every set reaches the top",()=>{
    const h=progressionHint([set(14,110),set(14,110),set(15,110)],opts);
    assert.equal(h.text,"Every set reached 14 — try 112.5kg × 10");
    assert.deepEqual(h.apply,{w:112.5,r:10});
  });
  test("holds the weight and aims one rep higher while any set falls short",()=>{
    const h=progressionHint([set(14,110),set(12,110),set(13,110)],opts);
    assert.equal(h.text,"Stay at 110kg — aim for 13+ on every set");
    assert.deepEqual(h.apply,{w:110,r:13});
  });
  test("ignores warm-up sets",()=>{
    const h=progressionHint([set(5,60,{wu:true}),set(14,100),set(14,100)],opts);
    assert.deepEqual(h.apply,{w:102.5,r:10});
  });
  test("uses a 5lb jump in pounds",()=>{
    const h=progressionHint([set(14,135),set(14,135)],Object.assign({},opts,{weightUnit:"lb"}));
    assert.deepEqual(h.apply,{w:140,r:10});
  });
  test("suggests a stronger band rather than a weight for band work",()=>{
    const h=progressionHint([set(14,0,{band:"15–35"}),set(14,0,{band:"15–35"})],Object.assign({},opts,{isBand:true}));
    assert.match(h.text,/next band up/);
    assert.equal(h.apply,null);
  });
  test("bodyweight work at the top of the range is told to add load, with nothing to apply",()=>{
    const h=progressionHint([set(14),set(15)],opts);
    assert.match(h.text,/add weight or slow the reps/);
    assert.equal(h.apply,null);
  });
  test("holds suggest five seconds more than the best",()=>{
    const h=progressionHint([set(40),set(45)],Object.assign({},opts,{unit:"secs"}));
    assert.deepEqual(h.apply,{r:50});
  });
  test("returns null with no working sets",()=>{
    assert.equal(progressionHint([set(5,60,{wu:true})],opts),null);
    assert.equal(progressionHint([],opts),null);
  });
});

describe("new bests",()=>{
  const old=day("a","2026-09-01T09:00:00.000Z",[ex("Deadlift",[set(12,100),set(10,105)])]);
  const today=day("b","2026-09-08T09:00:00.000Z",[ex("Deadlift",[set(8,110),set(14,100),set(5,90)])]);
  const sessions=[old,today];

  test("a heavier weight than ever is the heaviest",()=>{
    const p=bestsBefore(sessions,today,"Deadlift",0);
    assert.equal(newBestLabel(p,today.ex[0].sets[0],"reps","kg"),"Heaviest · 110kg × 8");
  });
  test("a lighter set with a better estimated max is a best set",()=>{
    const p=bestsBefore(sessions,today,"Deadlift",1);
    assert.equal(newBestLabel(p,today.ex[0].sets[1],"reps","kg"),"Best set · 100kg × 14");
  });
  test("an ordinary set beats nothing",()=>{
    const p=bestsBefore(sessions,today,"deadlift",2);
    assert.equal(newBestLabel(p,today.ex[0].sets[2],"reps","kg"),"");
  });
  test("a first-ever set is never a record",()=>{
    const first=day("c","2026-09-01T09:00:00.000Z",[ex("Hip thrust",[set(10,60)])]);
    const p=bestsBefore([first],first,"Hip thrust",0);
    assert.equal(newBestLabel(p,first.ex[0].sets[0],"reps","kg"),"");
  });
  test("warm-ups never count, before or as the set",()=>{
    const s=day("d","2026-09-09T09:00:00.000Z",[ex("Deadlift",[set(5,200,{wu:true})])]);
    const p=bestsBefore([old,s],s,"Deadlift",0);
    assert.equal(newBestLabel(p,s.ex[0].sets[0],"reps","kg"),"");
  });
  test("later days are not part of what came before",()=>{
    const p=bestsBefore(sessions,old,"Deadlift",0);
    assert.equal(p.n,0);
  });
  test("holds and distances compare the number logged",()=>{
    assert.equal(newBestLabel({n:1,maxR:40},set(45),"secs","kg"),"Longest hold · 45s");
    assert.equal(newBestLabel({n:1,maxR:20},set(25),"m","kg"),"Farthest · 25m");
  });
  test("sessionBests keeps the best moment per exercise",()=>{
    assert.deepEqual(sessionBests(sessions,today,"kg"),[{name:"Deadlift",label:"Best set · 100kg × 14"}]);
  });
});

describe("workoutSummary",()=>{
  test("counts volume from working weighted sets only",()=>{
    const s=day("x","2026-09-08T09:00:00.000Z",[
      ex("Squats",[set(10,100),set(10,100,{wu:true})]),
      ex("Plank",[set(60)],{timed:true})]);
    assert.equal(sessionVolume(s),1000);
  });
  test("compares with the last workout of the same name",()=>{
    const a=day("a","2026-09-01T09:00:00.000Z",[ex("Squats",[set(10,100)])],"Legs");
    const other=day("o","2026-09-05T09:00:00.000Z",[ex("Bench press",[set(10,60)])],"Push");
    const b=day("b","2026-09-08T09:00:00.000Z",[ex("Squats",[set(10,110)])],"legs");
    const sm=workoutSummary([a,other,b],b,"kg");
    assert.equal(sm.volume,1100);
    assert.equal(sm.prev.volume,1000);
    assert.equal(sm.sets,1);
    assert.deepEqual(sm.bests,[{name:"Squats",label:"Heaviest · 110kg × 10"}]);
  });
  test("has no comparison the first time",()=>{
    const b=day("b","2026-09-08T09:00:00.000Z",[ex("Squats",[set(10,110)])]);
    assert.equal(workoutSummary([b],b,"kg").prev,null);
  });
});

describe("units",()=>{
  test("holds start in seconds and sled work in metres; everything else in reps",()=>{
    assert.equal(unitOf(makeExercise("Plank")),"secs");
    assert.equal(unitOf(makeExercise("L-sit")),"secs");
    assert.equal(unitOf(makeExercise("Backward sled drag")),"m");
    assert.equal(unitOf(makeExercise("Deadlift")),"reps");
  });
  test("distance never counts toward the rep total",()=>{
    const s=day("s","2026-09-08T09:00:00.000Z",[ex("Backward sled drag",[set(20)],{dist:true}),ex("Squats",[set(10)])]);
    assert.deepEqual(totals(s),{reps:10,sets:2});
  });
  test("lastSetExercise finds the exercise of the newest set",()=>{
    const a=ex("Squats",[set(10,0,{at:"2026-09-08T09:00:00.000Z"})]);
    const b=ex("Curl",[set(10,0,{at:"2026-09-08T09:05:00.000Z"})]);
    assert.equal(lastSetExercise(day("s","2026-09-08T09:00:00.000Z",[b,a])).name,"Curl");
  });
});

describe("cues",()=>{
  test("every cue belongs to a built-in exercise and has two or three short lines",()=>{
    const seeds=new Set(SEED_EXERCISES.map(n=>n.toLowerCase()));
    Object.keys(CUES).forEach(k=>{
      assert.ok(seeds.has(k),k+" is not a built-in exercise");
      assert.ok(CUES[k].length>=2&&CUES[k].length<=3,k);
    });
  });
  test("lookup ignores case and spacing",()=>{
    assert.ok(cuesFor("  DEADLIFT "));
    assert.equal(cuesFor("Not an exercise"),null);
  });
});

describe("reminderICS",()=>{
  // Wednesday 30 Sept 2026, 08:00 local.
  const now=new Date(2026,8,30,8,0);
  const ics=reminderICS([0,2,4],"07:00",now);
  test("repeats weekly on the chosen days",()=>{
    assert.match(ics,/RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR/);
  });
  test("starts at the next chosen day still ahead — Friday, as Wednesday 7:00 has passed",()=>{
    assert.match(ics,/DTSTART:20261002T070000/);
  });
  test("carries an alarm and uses calendar line endings",()=>{
    assert.match(ics,/BEGIN:VALARM/);
    assert.ok(ics.includes("\r\n"));
  });
  test("no days, no event",()=>{
    assert.equal(reminderICS([],"07:00",now),"");
  });
});
