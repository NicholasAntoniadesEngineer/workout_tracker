import {test,describe,afterEach} from "node:test";
import assert from "node:assert/strict";
import {
  setReps,totals,exerciseTotal,fmtClock,dateKey,exerciseGroup,OTHER_GROUP,RETIRED,
  SEED_EXERCISES,BUILTIN_ROUTINES,options,workoutSeconds,startWorkout,endWorkout,canResume,
  autoEndIfStale,workoutOffset,convertWeight
} from "../js/model.js";

// Local wall-clock moments on a fixed day, so "today" checks behave the same in any timezone.
const at=(h,m=0,s=0,day=15)=>new Date(2026,0,day,h,m,s);
const iso=(...a)=>at(...a).toISOString();

// Freezes Date (both Date.now() and new Date()) at a local moment for the rest of the test.
function freeze(t,when){t.mock.timers.enable({apis:["Date"],now:when.getTime()});}

const set=(r,extra={})=>Object.assign({r,side:false,w:0,t:0,rest:0,at:"",wu:false,band:""},extra);
const session=(ex,extra={})=>Object.assign({started:"",ended:"",running:false,timerFrom:"",ex},extra);

const DEFAULT_OPTIONS={...options};
afterEach(()=>{Object.assign(options,DEFAULT_OPTIONS);});

describe("setReps",()=>{
  test("returns the reps of a two-sided set unchanged",()=>{
    assert.equal(setReps(set(8)),8);
  });

  test("doubles a per-side set when perSideDouble is on",()=>{
    options.perSideDouble=true;
    assert.equal(setReps(set(8,{side:true})),16);
  });

  test("leaves a per-side set as logged when perSideDouble is off",()=>{
    options.perSideDouble=false;
    assert.equal(setReps(set(8,{side:true})),8);
  });
});

describe("totals",()=>{
  test("sums reps and counts sets across exercises",()=>{
    const s=session([{name:"Squats",sets:[set(10),set(8)]},{name:"Dips",sets:[set(12)]}]);
    assert.deepEqual(totals(s),{reps:30,sets:3});
  });

  test("counts a timed exercise's sets but not its seconds as reps",()=>{
    const s=session([{name:"Squats",sets:[set(10)]},{name:"Plank",timed:true,sets:[set(60),set(45)]}]);
    assert.deepEqual(totals(s),{reps:10,sets:3});
  });

  test("keeps warm-up reps out of the rep total",()=>{
    const s=session([{name:"Squats",sets:[set(5,{wu:true}),set(10)]}]);
    assert.equal(totals(s).reps,10);
  });

  test("still counts warm-up sets toward the set count",()=>{
    const s=session([{name:"Squats",sets:[set(5,{wu:true}),set(10)]}]);
    assert.equal(totals(s).sets,2);
  });

  test("doubles per-side sets in the rep total",()=>{
    options.perSideDouble=true;
    const s=session([{name:"Step ups",sets:[set(10,{side:true})]}]);
    assert.equal(totals(s).reps,20);
  });

  test("is zero for an empty session",()=>{
    assert.deepEqual(totals(session([])),{reps:0,sets:0});
  });
});

describe("exerciseTotal",()=>{
  test("sums reps of working sets, skipping warm-ups",()=>{
    assert.equal(exerciseTotal({sets:[set(5,{wu:true}),set(10),set(8)]}),18);
  });

  test("doubles per-side sets",()=>{
    options.perSideDouble=true;
    assert.equal(exerciseTotal({sets:[set(10,{side:true}),set(5)]}),25);
  });
});

describe("fmtClock",()=>{
  test("formats under an hour as m:ss",()=>{
    assert.equal(fmtClock(0),"0:00");
    assert.equal(fmtClock(59),"0:59");
    assert.equal(fmtClock(61),"1:01");
    assert.equal(fmtClock(3599),"59:59");
  });

  test("formats an hour or more as h:mm:ss",()=>{
    assert.equal(fmtClock(3600),"1:00:00");
    assert.equal(fmtClock(3725),"1:02:05");
  });

  test("rounds fractional seconds",()=>{
    assert.equal(fmtClock(59.6),"1:00");
  });

  test("clamps negatives and treats missing values as zero",()=>{
    assert.equal(fmtClock(-30),"0:00");
    assert.equal(fmtClock(null),"0:00");
    assert.equal(fmtClock(undefined),"0:00");
  });
});

describe("dateKey",()=>{
  test("uses the local calendar date, not the UTC slice of the ISO stamp",()=>{
    assert.equal(dateKey(new Date(2026,0,15,0,5).toISOString()),"2026-01-15");
    assert.equal(dateKey(new Date(2026,0,15,23,55).toISOString()),"2026-01-15");
  });

  test("zero-pads month and day",()=>{
    assert.equal(dateKey(new Date(2026,2,4,12).toISOString()),"2026-03-04");
  });

  test("returns an empty string for an invalid date",()=>{
    assert.equal(dateKey("not a date"),"");
  });
});

describe("exerciseGroup",()=>{
  test("finds the group of a seed exercise",()=>{
    assert.equal(exerciseGroup("Squats"),"Squat & lunge");
    assert.equal(exerciseGroup("Band row"),"Bands");
  });

  test("ignores case and surrounding whitespace",()=>{
    assert.equal(exerciseGroup("  bench PRESS "),"Push");
  });

  test("keeps a retired exercise in its old group",()=>{
    assert.equal(exerciseGroup("Lunges"),RETIRED["lunges"]);
    assert.equal(exerciseGroup("Cable woodchop"),"Core");
  });

  test("falls back to User added for anything unknown or empty",()=>{
    assert.equal(OTHER_GROUP,"User added");
    assert.equal(exerciseGroup("My made-up move"),"User added");
    assert.equal(exerciseGroup(""),"User added");
    assert.equal(exerciseGroup(null),"User added");
  });
});

describe("seed data",()=>{
  test("SEED_EXERCISES has no case-insensitive duplicates",()=>{
    const seen=new Map();
    const dups=[];
    SEED_EXERCISES.forEach(n=>{
      const k=n.trim().toLowerCase();
      if(seen.has(k))dups.push(seen.get(k)+" / "+n);
      else seen.set(k,n);
    });
    assert.deepEqual(dups,[]);
  });

  test("no retired name is still a seed",()=>{
    const seeds=SEED_EXERCISES.map(n=>n.toLowerCase());
    assert.deepEqual(Object.keys(RETIRED).filter(k=>seeds.includes(k)),[]);
  });

  test("every built-in routine exercise is a seed exercise",()=>{
    const seeds=new Set(SEED_EXERCISES);
    BUILTIN_ROUTINES.forEach(r=>{
      assert.deepEqual(r.ex.filter(n=>!seeds.has(n)),[],"routine "+r.name);
    });
  });
});

describe("workoutSeconds",()=>{
  test("is null before the workout has started",()=>{
    assert.equal(workoutSeconds(session([])),null);
  });

  test("counts live from the start while running today",t=>{
    freeze(t,at(10,30));
    const s=session([],{started:iso(10,0),running:true});
    assert.equal(workoutSeconds(s),1800);
  });

  test("measures to the end stamp once ended",t=>{
    freeze(t,at(15,0));
    const s=session([],{started:iso(10,0),ended:iso(10,45),running:false});
    assert.equal(workoutSeconds(s),2700);
  });

  test("freezes at the last set when left running past midnight",t=>{
    freeze(t,at(9,0,0,16));
    const s=session([{name:"Squats",sets:[set(10,{at:iso(10,20)}),set(10,{at:iso(10,40)})]}],
      {started:iso(10,0),running:true});
    assert.equal(workoutSeconds(s),2400);
  });
});

describe("startWorkout / endWorkout / canResume",()=>{
  test("starting a fresh workout stamps now and runs",t=>{
    freeze(t,at(10,0));
    const s=session([]);
    startWorkout(s);
    assert.equal(s.started,iso(10,0));
    assert.equal(s.running,true);
    assert.equal(s.ended,"");
  });

  test("ending stamps now and stops the clock",t=>{
    freeze(t,at(10,0));
    const s=session([]);
    startWorkout(s);
    t.mock.timers.setTime(at(10,50).getTime());
    endWorkout(s);
    assert.equal(s.ended,iso(10,50));
    assert.equal(s.running,false);
  });

  test("ending a workout that never started does nothing",t=>{
    freeze(t,at(10,0));
    const s=session([]);
    endWorkout(s);
    assert.equal(s.ended,"");
    assert.equal(s.running,false);
  });

  test("can resume within 30 minutes of ending",t=>{
    freeze(t,at(11,0));
    assert.equal(canResume(session([],{started:iso(10,0),ended:iso(10,30)})),true);
  });

  test("cannot resume more than 30 minutes after ending",t=>{
    freeze(t,at(11,1));
    assert.equal(canResume(session([],{started:iso(10,0),ended:iso(10,30)})),false);
  });

  test("cannot resume a running or never-ended workout",t=>{
    freeze(t,at(10,5));
    assert.equal(canResume(session([],{started:iso(10,0),running:true})),false);
    assert.equal(canResume(session([],{started:iso(10,0)})),false);
    assert.equal(canResume(session([])),false);
  });

  test("starting again soon after an end keeps the original start",t=>{
    freeze(t,at(10,0));
    const s=session([]);
    startWorkout(s);
    t.mock.timers.setTime(at(10,40).getTime());
    endWorkout(s);
    t.mock.timers.setTime(at(10,50).getTime());
    startWorkout(s);
    assert.equal(s.started,iso(10,0));
    assert.equal(s.running,true);
    assert.equal(s.ended,"");
  });

  test("starting again long after an end begins a fresh clock",t=>{
    freeze(t,at(10,0));
    const s=session([]);
    startWorkout(s);
    t.mock.timers.setTime(at(10,40).getTime());
    endWorkout(s);
    t.mock.timers.setTime(at(17,0).getTime());
    startWorkout(s);
    assert.equal(s.started,iso(17,0));
  });
});

describe("autoEndIfStale",()=>{
  test("ignores a workout that is not running",t=>{
    freeze(t,at(20,0));
    const s=session([],{started:iso(10,0),ended:iso(11,0)});
    assert.equal(autoEndIfStale(s),false);
    assert.equal(s.ended,iso(11,0));
  });

  test("leaves a workout running while the idle limit has not passed",t=>{
    options.idleEndSeconds=3600;
    freeze(t,at(10,59));
    const s=session([{name:"Squats",sets:[set(10,{at:iso(10,0)})]}],{started:iso(9,30),running:true});
    assert.equal(autoEndIfStale(s),false);
    assert.equal(s.running,true);
  });

  test("ends an idle workout at its last set",t=>{
    options.idleEndSeconds=3600;
    freeze(t,at(12,0));
    const s=session([{name:"Squats",sets:[set(10,{at:iso(10,0)}),set(10,{at:iso(10,20)})]}],
      {started:iso(9,30),running:true});
    assert.equal(autoEndIfStale(s),true);
    assert.equal(s.ended,iso(10,20));
    assert.equal(s.running,false);
  });

  test("ends a workout with no sets at its start",t=>{
    options.idleEndSeconds=3600;
    freeze(t,at(12,0));
    const s=session([],{started:iso(9,30),running:true});
    assert.equal(autoEndIfStale(s),true);
    assert.equal(s.ended,iso(9,30));
  });

  test("never auto-ends when the idle limit is switched off",t=>{
    options.idleEndSeconds=0;
    freeze(t,at(23,0));
    const s=session([],{started:iso(9,30),running:true});
    assert.equal(autoEndIfStale(s),false);
    assert.equal(s.running,true);
  });

  test("returns false for a missing session",()=>{
    assert.equal(autoEndIfStale(null),false);
  });
});

describe("workoutOffset",()=>{
  test("is the seconds since the workout started",()=>{
    const s=session([],{started:iso(10,0)});
    assert.equal(workoutOffset(s,iso(10,5,30)),330);
  });

  test("is null for an unstamped moment",()=>{
    assert.equal(workoutOffset(session([],{started:iso(10,0)}),""),null);
  });

  test("counts a set from before a restart from the day's first set",()=>{
    const s=session([{name:"Squats",sets:[set(10,{at:iso(8,0)}),set(10,{at:iso(8,10)})]}],
      {started:iso(17,0)});
    assert.equal(workoutOffset(s,iso(8,10)),600);
  });

  test("counts from the first set when the clock was never started",()=>{
    const s=session([{name:"Squats",sets:[set(10,{at:iso(8,0)}),set(10,{at:iso(8,3)})]}]);
    assert.equal(workoutOffset(s,iso(8,3)),180);
  });

  test("is null with no start and no stamped sets",()=>{
    assert.equal(workoutOffset(session([]),iso(8,0)),null);
  });
});

describe("convertWeight",()=>{
  test("converts kilograms to pounds to one decimal",()=>{
    assert.equal(convertWeight(24,"kg","lb"),52.9);
  });

  test("converts pounds to kilograms to one decimal",()=>{
    assert.equal(convertWeight(100,"lb","kg"),45.4);
  });

  test("leaves the value alone when the unit does not change",()=>{
    assert.equal(convertWeight(24.37,"kg","kg"),24.37);
  });

  test("leaves bodyweight (zero) as zero",()=>{
    assert.equal(convertWeight(0,"kg","lb"),0);
  });
});

test("sets carry a kind, an RPE and a note, and warm-ups still read as warm-ups", async () => {
  const {normSet,setKind,addManualSets,makeSession,makeExercise}=await import("../js/model.js");
  assert.deepEqual(normSet({r:5,w:100}),{r:5,side:false,w:100,t:0,rest:0,at:"",wu:false,band:""});
  const d=normSet({r:8,w:80,kind:"drop",rpe:9.4,note:"  last one hurt  "});
  assert.equal(d.kind,"drop");assert.equal(d.rpe,9.5);assert.equal(d.note,"last one hurt");assert.equal(d.wu,false);
  const w=normSet({r:8,w:40,kind:"wu"});assert.equal(w.wu,true);assert.equal(w.kind,undefined);assert.equal(setKind(w),"wu");
  const old=normSet({r:8,w:40,wu:true});assert.equal(setKind(old),"wu");
  assert.equal(normSet({r:5,rpe:3}).rpe,5);assert.equal(normSet({r:5,rpe:12}).rpe,10);
  const s=makeSession(),e=makeExercise("Squats");
  addManualSets(s,e,5,false,100,2,{kind:"fail",rpe:10},"");
  assert.equal(e.sets.length,2);assert.equal(e.sets[1].kind,"fail");assert.equal(e.sets[1].rpe,10);
  addManualSets(s,e,10,false,60,1,true,"");
  assert.equal(e.sets[2].wu,true);
});
