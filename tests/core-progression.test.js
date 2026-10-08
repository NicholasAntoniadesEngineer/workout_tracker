// Progression with real saved state: an exercise's own range, jump, unit, bar and off switch,
// gyms, which past days count as history, deload days, breaks, stalls and the miss rule.
import {test,describe} from "node:test";
import assert from "node:assert/strict";

const memory=new Map();
Object.defineProperty(globalThis,"localStorage",{configurable:true,writable:true,value:{
  getItem:k=>(memory.has(k)?memory.get(k):null),
  setItem:(k,v)=>{memory.set(k,String(v));},
  removeItem:k=>{memory.delete(k);},
  clear:()=>{memory.clear();}
}});
// db.js tells the app's other windows when it saves; a test has none.
Object.defineProperty(globalThis,"BroadcastChannel",{configurable:true,writable:true,value:undefined});
globalThis.document={documentElement:{dataset:{}}};

const store=await import("../js/store.js");
const P=await import("../js/progression.js");
const S=store.state;

const set=(r,w=0,x={})=>Object.assign({r,side:false,w,t:0,rest:0,at:"",wu:false,band:""},x);
const on=d=>"2026-"+d+"T09:00:00.000Z";
const day=(id,date,ex=[],x={})=>Object.assign({id,title:id,created:on(date),started:"",ended:"",running:false,timerFrom:"",ex},x);
const ex=(name,sets=[],x={})=>Object.assign({id:"e-"+name,name,sets},x);
const atTime=date=>Date.parse(on(date));
// The device's state for one test: its days (the last one open), settings and choices.
function begin(sessions,{open,settings,exProg,gyms,gymId}={}){
  S.sessions=sessions;S.sessionId=open||sessions[sessions.length-1].id;
  S.settings=Object.assign({},store.DEFAULTS,settings||{});store.applySettings();
  S.exProg=exProg||{};S.gyms=gyms||[];S.gymId=gymId||"";
}
const cur=()=>store.getSession();
const squats=(id,date,sets,x)=>day(id,date,[ex("Squats",sets)],x);

describe("an exercise's own settings, and what it falls back to",()=>{
  test("with nothing set, an exercise follows the app's unit and bar, and is not per hand",()=>{
    begin([day("d","10-08")]);
    assert.deepEqual([P.unitFor("Squats"),P.perHand("Squats"),P.barFor("Squats")],["kg",false,20]);
    begin([day("d","10-08")],{settings:{unit:"lb",barLb:35}});
    assert.deepEqual([P.unitFor("Squats"),P.barFor("Squats")],["lb",35]);
  });

  test("an exercise's settings are found however its name is typed",()=>{
    begin([day("d","10-08")],{exProg:{"front squat":{unit:"lb",hand:true}}});
    assert.deepEqual([P.unitFor("  Front SQUAT "),P.perHand("front squat"),P.exProg("Back squat")],["lb",true,{}]);
  });

  test("the bar is the exercise's own, else the open day's gym, else the chosen gym, else Settings",()=>{
    const gyms=[{id:"a",barKg:15,barLb:35},{id:"b",barKg:0}];
    begin([day("d","10-08",[],{gym:"a"})],{gyms,gymId:"b",exProg:{"ez curl":{bar:10}}});
    assert.deepEqual([P.barFor("Squats"),P.barFor("EZ curl")],[15,10]);
    begin([day("d","10-08")],{gyms,gymId:"a",exProg:{"front squat":{unit:"lb"}}});
    assert.deepEqual([P.barFor("Squats"),P.barFor("Front squat")],[15,35]);
    begin([day("d","10-08")],{gyms,gymId:"b",settings:{barKg:18}});
    assert.equal(P.barFor("Squats"),18,"a gym with no bar for this unit falls back to Settings");
  });

  test("the rep range is the exercise's own when it is a whole range, else Settings'",()=>{
    begin([day("d","10-08")],{settings:{progressRange:"8-12"},exProg:{a:{range:"6-10"},b:{range:"6"},c:{range:"heavy"}}});
    assert.deepEqual(["a","b","c","d"].map(P.rangeFor),[{low:6,top:10},{low:8,top:12},{low:8,top:12},{low:8,top:12}]);
  });

  test("the jump is the exercise's own, else small, big, or big for legs only, in the exercise's unit",()=>{
    const steps=(mode,unit)=>{begin([day("d","10-08")],{settings:{stepMode:mode,unit}});return ["Squats","Bench press","Calf raises"].map(P.stepFor);};
    assert.deepEqual(steps("small","kg"),[2.5,2.5,2.5]);assert.deepEqual(steps("big","lb"),[10,10,10]);
    assert.deepEqual(steps("split","kg"),[5,2.5,5]);assert.deepEqual(steps("split","lb"),[10,5,10]);
    begin([day("d","10-08")],{exProg:{"bench press":{unit:"lb"},squats:{step:1.25},dips:{step:0}}});
    assert.deepEqual(["Bench press","Squats","Dips"].map(P.stepFor),[5,1.25,2.5]);
  });
});

describe("which past days count as history",()=>{
  test("days before the open one, newest first, skipping days the exercise had no sets",()=>{
    begin([squats("d1","09-01",[set(5,100)]),squats("d2","09-03",[]),squats("d3","09-05",[set(5,105)]),
      squats("later","09-10",[set(5,110)]),squats("cur","09-08",[])],{open:"cur"});
    assert.deepEqual(P.historyOf("squats").map(h=>h.at),[on("09-05"),on("09-01")]);
    assert.equal(P.historyOf("Squats",1).length,1);
  });

  test("at most eight past days are kept, and each says how it was counted",()=>{
    const old=Array.from({length:10},(_,i)=>day("p"+i,"09-0"+i,[ex("Plank",[set(30+i)],{timed:true})]));
    begin(old.concat([day("cur","09-20",[ex("Plank",[],{timed:true})])]));
    const h=P.historyOf("Plank");
    assert.equal(h.length,8);assert.ok(h.every(x=>x.unit==="secs"));
  });

  test("at a gym, that gym's days come first; with none there, every day counts",()=>{
    const days=[squats("a1","09-01",[set(5,100)],{gym:"a"}),squats("b1","09-05",[set(5,140)],{gym:"b"})];
    begin(days.concat([squats("cur","09-08",[],{gym:"a"})]));
    assert.deepEqual(P.historyOf("Squats").map(h=>h.gym),["a"]);
    begin(days.concat([squats("cur","09-08",[],{gym:"c"})]));
    assert.deepEqual(P.historyOf("Squats").map(h=>h.gym),["b","a"]);
  });

  test("a new workout at the chosen gym, before its first set, takes its history from that gym",()=>{
    begin([squats("a1","09-01",[set(5,100)],{gym:"a"}),squats("b1","09-05",[set(5,140)],{gym:"b"}),squats("cur","09-08",[])],{gymId:"a"});
    assert.equal(P.historyOf("Squats")[0].gym,"a");
  });
});

describe("the next target",()=>{
  const sq=x=>Object.assign(ex("Squats"),x||{});

  test("no exercise, no history, or progression switched off for it gives no target",()=>{
    begin([squats("d1","09-01",[set(5,100)]),squats("cur","09-08",[])]);
    assert.equal(P.targetFor(null),null);
    assert.equal(P.targetFor(ex("Dips"),atTime("09-08")),null);
    S.exProg={squats:{off:true}};assert.equal(P.targetFor(sq(),atTime("09-08")),null);
  });

  test("the exercise's own range and jump shape the next target",()=>{
    begin([squats("d1","09-01",[set(5,100),set(5,100)]),squats("cur","09-08",[])],{exProg:{squats:{range:"3-5",step:5}}});
    assert.deepEqual(P.targetFor(sq(),atTime("09-08")).apply,{w:105,r:3});
  });

  test("Settings' range and jump apply when the exercise has none",()=>{
    begin([squats("d1","09-01",[set(12,60),set(13,60)]),squats("cur","09-08",[])],{settings:{progressRange:"8-12",stepMode:"big"}});
    assert.deepEqual(P.targetFor(sq(),atTime("09-08")).apply,{w:65,r:8});
  });

  test("an exercise kept in pounds goes up in pounds",()=>{
    begin([squats("d1","09-01",[set(15,135,{u:"lb"}),set(15,135,{u:"lb"})]),squats("cur","09-08",[])],{exProg:{squats:{unit:"lb"}}});
    const h=P.targetFor(sq(),atTime("09-08"));
    assert.deepEqual(h.apply,{w:140,r:10});assert.match(h.text,/140lb/);
  });

  test("three weeks away starts 10% lighter by default, and not at all with the break rule off",()=>{
    const days=[squats("d1","09-17",[set(10,100),set(10,100)]),squats("cur","10-08",[])];
    begin(days);
    const h=P.targetFor(sq(),atTime("10-08"));
    assert.deepEqual([h.rule,h.apply],["break",{w:90,r:10}]);
    begin(days,{settings:{breakRule:"off"}});
    assert.notEqual(P.targetFor(sq(),atTime("10-08")).rule,"break");
  });

  test("stuck at one weight for the chosen number of sessions deloads by the chosen share",()=>{
    const stuck=[set(9,100),set(9,100)];
    const days=[squats("d1","09-01",stuck),squats("d2","09-04",stuck),squats("d3","09-07",stuck),squats("cur","09-09",[])];
    begin(days);
    assert.deepEqual(P.targetFor(sq(),atTime("09-09")).apply,{w:90,r:10});
    begin(days,{settings:{deloadPct:20}});assert.equal(P.targetFor(sq(),atTime("09-09")).apply.w,80);
    begin(days,{settings:{stallAfter:4}});assert.notEqual(P.targetFor(sq(),atTime("09-09")).rule,"deload");
  });

  test("with the miss rule set to drop, a set below the range takes a jump off",()=>{
    const days=[squats("d1","09-01",[set(10,100),set(7,100)]),squats("cur","09-08",[])];
    begin(days);assert.equal(P.targetFor(sq(),atTime("09-08")).apply.w,100);
    begin(days,{settings:{missRule:"drop"}});assert.deepEqual(P.targetFor(sq(),atTime("09-08")).apply,{w:97.5,r:10});
  });

  test("a planned deload day goes lighter whatever the rules say; holds and bands keep their own",()=>{
    begin([day("d1","09-01",[ex("Squats",[set(5,100),set(5,102.5)]),ex("Plank",[set(60)],{timed:true}),ex("Band row",[set(15,0,{band:"30–60"})])]),
      day("cur","09-08",[],{deload:true})],{settings:{breakRule:"off"}});
    const h=P.targetFor(sq(),atTime("09-08"));
    assert.deepEqual([h.rule,h.apply],["deload",{w:92.5,r:5}]);
    assert.deepEqual(P.targetFor(ex("Plank",[],{timed:true}),atTime("09-08")).apply,{r:65});
    assert.equal(P.targetFor(ex("Band row"),atTime("09-08")).rule,undefined);
  });

  test("a deload day for an exercise kept in pounds rounds to pounds",()=>{
    begin([squats("d1","09-01",[set(5,225,{u:"lb"})]),day("cur","09-08",[],{deload:true})],{exProg:{squats:{unit:"lb"}}});
    assert.deepEqual(P.targetFor(sq(),atTime("09-08")).apply,{w:205,r:5});
  });

  test("only the same exercise counts, never one with a similar name",()=>{
    begin([day("d1","09-01",[ex("Front squat",[set(15,80)])]),squats("cur","09-08",[])]);
    assert.equal(P.targetFor(sq(),atTime("09-08")),null);
  });

  test("switching auto-fill off leaves the hint itself in place",()=>{
    begin([squats("d1","09-01",[set(15,100)]),squats("cur","09-08",[])],{settings:{autoTarget:false}});
    assert.ok(P.targetFor(sq(),atTime("09-08")).apply);
  });

  test("a day of only warm-ups for a lift does not wipe out its next target",()=>{
    begin([squats("d1","09-01",[set(12,100),set(12,100)]),squats("d2","09-05",[set(5,60,{wu:true}),set(3,80,{wu:true})]),squats("cur","09-08",[])],
      {settings:{progressRange:"8-12"}});
    const h=P.targetFor(sq(),atTime("09-08"));
    assert.ok(h,"a target from the last working day");
    assert.deepEqual(h.apply,{w:102.5,r:8});
  });

  test("an exercise switched to pounds is progressed from its kilogram days converted, not read as pounds",()=>{
    const days=[day("d1","09-01",[ex("Dumbbell bench press",[set(12,30),set(12,30)])]),day("cur","09-08",[ex("Dumbbell bench press")])];
    begin(days,{settings:{progressRange:"8-12"},exProg:{"dumbbell bench press":{unit:"lb"}}});
    const w=P.targetFor(ex("Dumbbell bench press"),atTime("09-08")).apply.w;
    assert.ok(w>60&&w<80,"30 kg is about 66 lb, so the next target is about 71 lb, not "+w+" lb");
  });

  test("a day backfilled a week after the last is not treated as a comeback",t=>{
    t.mock.timers.enable({apis:["Date"],now:atTime("10-08")});
    begin([squats("d1","08-03",[set(10,100),set(10,100)]),squats("cur","08-10",[])]);
    const h=P.targetFor(sq());
    assert.notEqual(h.rule,"break","trained a week before this day: "+h.text);
    assert.deepEqual(h.apply,{w:100,r:11});
  });
});
