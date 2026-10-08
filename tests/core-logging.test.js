// Logging: adding, editing and removing sets, rest and workout clocks, warm-ups and set kinds,
// per-side and per-hand counting, volume, bests, history order, midnight and the clocks
// changing, and the taps on the Log, Days and Routines screens that drive them.
// Runs in its own process, so pinning the timezone here touches no other test.
process.env.TZ="Europe/London";

import {test,describe,beforeEach,afterEach} from "node:test";
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

const M=await import("../js/model.js");
const store=await import("../js/store.js");
const coach=await import("../js/coach.js");
const logA=await import("../js/actions/log.js");
const daysA=await import("../js/actions/days.js");
const routinesA=await import("../js/actions/routines.js");
const S=store.state;

// Local wall-clock moments in October 2026 (British Summer Time until the 25th).
const at=(h,m=0,day=8,mon=9)=>new Date(2026,mon,day,h,m);
const iso=(...a)=>at(...a).toISOString();
const freeze=(t,when)=>t.mock.timers.enable({apis:["Date"],now:+when});
const to=(t,when)=>t.mock.timers.setTime(+when);
const set=(r,w=0,x={})=>Object.assign({r,side:false,w,t:0,rest:0,at:"",wu:false,band:""},x);
const day=(id,created,ex=[],x={})=>Object.assign({id,title:id,created,started:"",ended:"",running:false,timerFrom:"",ex},x);
const ex=(name,sets=[],x={})=>Object.assign({id:"e-"+name,name,sets},x);
const OPTIONS={...M.options};
afterEach(()=>{Object.assign(M.options,OPTIONS);});

// A tapped element: an id, attributes, classes, and closest() for the simple selectors the
// handlers use ("#id", "[data-x]", ".a.b[data-x]", lists split by commas).
function el({id="",attrs={},cls=""}={}){
  const classes=cls.split(/\s+/).filter(Boolean),dataset={};
  for(const [k,v] of Object.entries(attrs))if(k.startsWith("data-"))dataset[k.slice(5)]=v;
  const one=s=>{const re=/#([\w-]+)|\.([\w-]+)|\[([\w-]+)\]/g;let m,any=false;
    while((m=re.exec(s))){any=true;
      if(m[1]&&m[1]!==id)return false;if(m[2]&&!classes.includes(m[2]))return false;if(m[3]&&!(m[3] in attrs))return false;}
    return any;};
  const e={id,dataset,classList:{contains:c=>classes.includes(c)},getAttribute:k=>k in attrs?attrs[k]:null,
    closest:sel=>sel.split(",").some(s=>one(s.trim()))?e:null};
  return e;
}
// What the app hands the action modules, recording what they asked of it.
function makeCtx(){
  const c={snaps:[],bests:[],recalled:[],deleted:[],removed:[],
    render(){},markRefit(){},dismissSheet(){c.dismissed=true;},addExercise(){},
    snapshot(l){c.snaps.push(l);},showBest(n,l){c.bests.push([n,l]);},recallLast(e){c.recalled.push(e&&e.name);},
    deleteDay(id){c.deleted.push(id);},removeExercise(id){c.removed.push(id);}};
  return c;
}
let ctx;
// The open day and app state for one test.
function begin(sessions,{open,settings,exProg}={}){
  S.sessions=sessions;S.sessionId=open||sessions[0].id;
  S.settings=Object.assign({},store.DEFAULTS,settings||{});store.applySettings();
  Object.assign(S,{exProg:exProg||{},restTargets:{},gymId:"",gyms:[],favs:[],catalog:M.SEED_EXERCISES.slice(),removed:[],
    routines:[],hiddenRoutines:[],dialog:null,editing:null,numEdit:null,setStart:null,setKind:"",setRpe:0,setNote:"",warmup:false,
    reps:10,weight:0,perSide:false,band:"",exInfo:null,sheet:false,view:"log",calDay:null,planDay:null,planned:null});
  S.exId=(store.getSession().ex[0]||{}).id||null;
  ctx=makeCtx();
}
const tapLog=a=>logA.handle(el(a),ctx);
// A new day, made now, with one exercise on it.
function today(name){const s=M.makeSession(),e=M.makeExercise(name);s.ex.push(e);return {s,e};}

describe("logging a set",()=>{
  test("the first set with no workout running starts one, with no rest before it",t=>{
    freeze(t,at(10));
    const {s,e}=today("Squats");
    M.addSet(s,e,5,false,null,100);
    assert.deepEqual([s.running,s.started],[true,iso(10)]);
    assert.deepEqual([e.sets[0].rest,e.sets[0].t,e.sets[0].at,e.sets[0].w],[0,0,iso(10),100]);
  });

  test("rest is the gap since the last set; a timed set splits its gap into rest, then work",t=>{
    freeze(t,at(10));
    const {s,e}=today("Squats");
    M.addSet(s,e,5,false,null,100);
    to(t,at(10,3));M.addSet(s,e,5,false,null,100);
    to(t,at(10,5));M.addSet(s,e,5,false,iso(10,4),100);
    assert.deepEqual(e.sets.map(x=>[x.rest,x.t]),[[0,0],[180,0],[60,60]]);
  });

  test("a rest-clock reset counts the next rest from the reset, and logging clears it",t=>{
    freeze(t,at(10));
    const {s,e}=today("Squats");
    M.addSet(s,e,5,false,null,100);
    to(t,at(10,2));M.resetRestTimer(s);
    to(t,at(10,3));M.addSet(s,e,5,false,null,100);
    assert.equal(e.sets[1].rest,60);assert.equal(s.timerFrom,"");
  });

  test("rest never runs backwards: a set begun before the last one ended has none",t=>{
    freeze(t,at(10,5));
    const {s,e}=today("Squats");
    M.addSet(s,e,5,false,null,100);
    to(t,at(10,6));M.addSet(s,e,5,false,iso(10,4),100);
    assert.deepEqual([e.sets[1].rest,e.sets[1].t],[0,120]);
  });

  test("a weight below zero is stored as zero, and kind, RPE, note, hand and unit ride along",t=>{
    freeze(t,at(10));
    const {s,e}=today("Hammer curl");
    M.addSet(s,e,8,false,null,-5,{kind:"fail",rpe:9,note:" grind ",hand:true,u:"lb"});
    M.addSet(s,e,8,false,null,10,true);
    const [a,b]=e.sets;
    assert.deepEqual([a.w,a.kind,a.rpe,a.note,a.hand,a.u,a.wu],[0,"fail",9,"grind",true,"lb",false]);
    assert.deepEqual([b.wu,M.setKind(b)],[true,"wu"]);
  });

  test("sets on a past day are stamped to that day with no timing, one or several at once",t=>{
    freeze(t,at(10));
    const s=M.makeSessionOn(2026,8,1),e=M.makeExercise("Squats");s.ex=[e];
    M.addManualSets(s,e,5,false,100,3);M.addManualSets(s,e,5,false,100,0);M.addManualSets(s,e,5,false,100,"1.6");
    assert.equal(e.sets.length,6);
    assert.ok(e.sets.every(x=>x.at===s.created&&x.t===0&&x.rest===0));
    assert.equal(M.dateKey(s.created),"2026-09-01");assert.equal(s.running,false);
  });
});

describe("the rest and workout clocks",()=>{
  test("rest counts live while running, stops at the end once ended, and is zero before anything",t=>{
    freeze(t,at(10,5));
    const s=day("d",iso(9),[ex("Squats",[set(5,100,{at:iso(10)})])],{started:iso(9,50),running:true});
    assert.equal(M.restSeconds(s),300);
    Object.assign(s,{running:false,ended:iso(10,2)});assert.equal(M.restSeconds(s),120);
    assert.equal(M.restSeconds(day("e",iso(9))),0);
  });

  test("a workout resumed within half an hour keeps its start, and the next rest runs from the last set",t=>{
    freeze(t,at(10));
    const {s,e}=today("Squats");
    M.startWorkout(s);
    to(t,at(10,10));M.addSet(s,e,5,false,null,100);
    to(t,at(10,20));M.endWorkout(s);
    to(t,at(10,40));M.startWorkout(s);
    to(t,at(10,45));M.addSet(s,e,5,false,null,100);
    assert.equal(s.started,iso(10));assert.equal(e.sets[1].rest,35*60);
  });

  test("the resume window is half an hour to the second",t=>{
    const s=day("d",iso(9),[],{started:iso(9),ended:iso(10)});
    freeze(t,at(10,30));assert.equal(M.canResume(s),true);
    to(t,+at(10,30)+1000);assert.equal(M.canResume(s),false);
  });

  test("a workout that ended itself after an hour idle starts a fresh clock when started again",t=>{
    freeze(t,at(10));
    const {s,e}=today("Squats");
    M.startWorkout(s);to(t,at(10,10));M.addSet(s,e,5,false,null,100);
    to(t,at(11,15));
    assert.equal(M.autoEndIfStale(s),true);assert.equal(s.ended,iso(10,10));
    M.startWorkout(s);assert.equal(s.started,iso(11,15));
  });

  test("telling a workout it began 20 minutes ago moves its start, and starts it if stopped",t=>{
    freeze(t,at(10,30));
    const s=day("d",iso(9),[],{started:iso(10,25),ended:iso(10,28)});
    M.setWorkoutMinutes(s,"20");
    assert.deepEqual([s.started,s.ended,s.running],[iso(10,10),"",true]);
    M.setWorkoutMinutes(s,-5);assert.equal(s.started,iso(10,30));
  });

  test("a backfilled workout gets a fixed span on its own day, and a reset clock keeps the sets",()=>{
    const s=M.makeSessionOn(2026,8,1);s.ex=[ex("Squats",[set(5,100)])];
    M.setWorkoutSpanOn(s,45);
    assert.deepEqual([s.started,Date.parse(s.ended)-Date.parse(s.started),s.running],[s.created,45*60000,false]);
    M.setWorkoutSpanOn(s,30,new Date(2026,8,1,18).toISOString());
    assert.equal(s.started,new Date(2026,8,1,18).toISOString());
    M.resetWorkout(s);
    assert.deepEqual([s.started,s.ended,s.running,s.ex[0].sets.length],["","",false,1]);
  });

  test("a workout left running overnight freezes at its last set",t=>{
    freeze(t,at(7,0,9));
    const s=day("d",iso(21),[ex("Squats",[set(5,100,{at:iso(21,40)})])],{started:iso(21),running:true});
    assert.equal(M.workoutSeconds(s),40*60);
  });

  test("a workout still going just after midnight keeps counting",t=>{
    freeze(t,at(0,5,9));
    const s=day("d",iso(23,30),[ex("Squats",[set(5,100,{at:iso(23,50)})])],{started:iso(23,30),running:true});
    assert.equal(M.workoutSeconds(s),35*60);
  });

  test("rest and workout time count real minutes when the clocks go back",t=>{
    // 25 October 2026: 02:00 BST becomes 01:00 GMT.
    freeze(t,Date.parse("2026-10-24T23:55:00Z"));
    const {s,e}=today("Squats");
    s.started="2026-10-24T23:50:00Z";s.running=true;
    M.addSet(s,e,5,false,null,100);
    to(t,Date.parse("2026-10-25T01:05:00Z"));M.addSet(s,e,5,false,null,100);
    assert.equal(e.sets[1].rest,70*60);
    to(t,Date.parse("2026-10-25T01:20:00Z"));assert.equal(M.workoutSeconds(s),90*60);
  });

  test("a day backfilled onto a date the clocks change keeps that date",()=>{
    for(const [y,m,d] of [[2026,2,29],[2026,9,25]])
      assert.equal(M.dateKey(M.makeSessionOn(y,m,d).created),M.keyOf(y,m,d));
  });

  test("typed durations read minutes and seconds or plain seconds",()=>{
    assert.deepEqual(["1:30","90"," 45 ","1:5","2.6","","abc","-5",null].map(M.parseClock),[90,90,45,65,3,0,0,0,0]);
    assert.deepEqual([M.fmtClock(-75),M.fmtClock(7322)],["-1:15","2:02:02"]);
  });
});

describe("counting reps, sets and volume",()=>{
  test("per-side reps double unless that is switched off, a per-hand load counts both hands, and another unit converts",()=>{
    const s=day("d",iso(9),[ex("Step ups",[set(10,12,{side:true,hand:true})]),ex("Bench press",[set(5,100,{u:"lb"})])]);
    M.options.unit="kg";
    assert.equal(coach.sessionVolume(s),Math.round(20*24+5*100*0.45359237));
    M.options.perSideDouble=false;
    assert.equal(coach.sessionVolume(s),Math.round(10*24+5*100*0.45359237));
  });

  test("warm-ups, holds and distances add no volume and no reps, but each still counts as a set",()=>{
    const s=day("d",iso(9),[ex("Squats",[set(5,60,{wu:true}),set(5,100)]),ex("Plank",[set(60)],{timed:true}),ex("Sled drag",[set(40,80)],{dist:true})]);
    assert.deepEqual(M.totals(s),{reps:5,sets:4});
    assert.equal(coach.sessionVolume(s),500);
  });

  test("the newest set is found by its stamp, or the last one pushed when none are stamped",()=>{
    const s=day("d",iso(9),[ex("A",[set(1,0,{at:iso(10,5)})]),ex("B",[set(2,0,{at:iso(10,1)}),set(3,0,{at:iso(10,9)})])]);
    assert.deepEqual([M.lastSet(s).r,M.lastSetExercise(s).name,M.lastSetAt(s)],[3,"B",iso(10,9)]);
    const u=day("u",iso(9),[ex("A",[set(1)]),ex("B",[set(2)])]);
    assert.deepEqual([M.lastSet(u).r,M.lastSetExercise(u).name,M.lastSetAt(u)],[2,"B",""]);
  });

  test("days are listed newest first by when they began, without reordering the saved list",()=>{
    const list=[day("b",iso(9,0,2)),day("none",""),day("c",iso(9,0,3)),day("a",iso(9,0,1))];
    assert.deepEqual(store.newestFirst(list).map(s=>s.id),["c","b","a","none"]);
    assert.deepEqual(list.map(s=>s.id),["b","none","c","a"]);
  });

  test("plates per side come off largest first, and say when a load can't be made exactly",()=>{
    assert.deepEqual(M.platesPerSide(102.5,"kg"),{plates:[25,15,1.25],exact:true,bar:20});
    assert.deepEqual(M.platesPerSide(225,"lb"),{plates:[45,45],exact:true,bar:45});
    assert.equal(M.platesPerSide(101,"kg").exact,false);
    assert.equal(M.platesPerSide(20,"kg"),null);assert.equal(M.platesPerSide("35","kg","15").plates[0],10);
  });
});

describe("the Log screen",()=>{
  test("Log set today records a timed set, notes the gym, and starts the next set clean",t=>{
    freeze(t,at(10));
    begin([day("d",iso(9),[ex("Squats",[set(5,100,{at:iso(9,58)})])],{started:iso(9,30),running:true})]);
    Object.assign(S,{reps:6,weight:102.5,setKind:"drop",setRpe:8,setNote:"fast",gymId:"g1",setStart:iso(9,59)});
    tapLog({id:"logbtn"});
    const x=store.getSession().ex[0].sets[1];
    assert.deepEqual([x.r,x.w,x.kind,x.rpe,x.note,x.rest,x.t,x.at],[6,102.5,"drop",8,"fast",60,60,iso(10)]);
    assert.equal(store.getSession().gym,"g1");
    assert.deepEqual([S.setKind,S.setRpe,S.setNote,S.setStart,S.warmup],["",0,"",null,false]);
  });

  test("Log set on a past day transcribes the set onto that day without starting a clock",t=>{
    freeze(t,at(10));
    const s=M.makeSessionOn(2026,8,1);s.ex=[ex("Squats")];
    begin([s]);S.reps=5;S.weight=100;
    tapLog({id:"logbtn"});
    assert.deepEqual([s.ex[0].sets[0].at,s.ex[0].sets[0].rest,s.running],[s.created,0,false]);
  });

  test("a set logged just after midnight, in a workout begun before it, is timed like any other",t=>{
    freeze(t,at(23,30));
    const s=M.makeSession();s.ex=[ex("Squats")];
    begin([s]);S.reps=5;S.weight=100;
    tapLog({id:"wtoggle"});
    to(t,at(23,40));tapLog({id:"logbtn"});
    to(t,at(0,5,9));tapLog({id:"logbtn"});
    const x=s.ex[0].sets[1];
    assert.equal(x.at,iso(0,5,9),"stamped when it was logged");
    assert.equal(x.rest,25*60,"rest since the set before midnight");
  });

  test("a band exercise records the band and no weight",t=>{
    freeze(t,at(10));
    begin([day("d",iso(9),[ex("Band row")])]);Object.assign(S,{weight:20,band:"30–60"});
    tapLog({id:"logbtn"});
    assert.deepEqual([S.sessions[0].ex[0].sets[0].w,S.sessions[0].ex[0].sets[0].band],[0,"30–60"]);
  });

  test("an exercise logged per hand or in its own unit says so on each set",t=>{
    freeze(t,at(10));
    begin([day("d",iso(9),[ex("Hammer curl"),ex("Squats")])],{exProg:{"hammer curl":{hand:true,unit:"lb"},squats:{unit:"kg"}}});
    S.weight=25;tapLog({id:"logbtn"});
    S.exId="e-Squats";tapLog({id:"logbtn"});
    const [c,q]=S.sessions[0].ex.map(e=>e.sets[0]);
    assert.deepEqual([c.hand,c.u],[true,"lb"]);assert.deepEqual([q.hand,q.u],[undefined,undefined]);
  });

  test("a set heavier than ever is called out as it is logged",t=>{
    freeze(t,at(10));
    begin([day("old",iso(9,0,1),[ex("Squats",[set(5,100)])]),day("d",iso(9),[ex("Squats")])],{open:"d"});
    S.reps=5;S.weight=105;tapLog({id:"logbtn"});
    assert.deepEqual(ctx.bests,[["Squats","Heaviest · 105kg × 5"]]);
  });

  test("a new best on an exercise kept in pounds is labelled in pounds",t=>{
    freeze(t,at(10));
    begin([day("old",iso(9,0,1),[ex("Dumbbell bench press",[set(8,50,{u:"lb"})])]),day("d",iso(9),[ex("Dumbbell bench press")])],
      {open:"d",exProg:{"dumbbell bench press":{unit:"lb"}}});
    S.reps=8;S.weight=55;tapLog({id:"logbtn"});
    assert.equal(ctx.bests.length,1);
    assert.match(ctx.bests[0][1],/55 ?lb/);
  });

  test("editing a set changes its numbers and kind but keeps when it was done, its hand and its unit",()=>{
    begin([day("d",iso(9),[ex("Hammer curl",[set(8,20,{at:iso(10),hand:true,u:"lb",rest:90,t:30}),set(8,20,{at:iso(10,3)})])])]);
    tapLog({cls:"cell has",attrs:{"data-ex":"e-Hammer curl","data-i":"0"}});
    assert.deepEqual([S.editing.i,S.reps,S.weight,S.editRest,S.editWork],[0,8,20,90,30]);
    Object.assign(S,{reps:10,weight:22.5,setKind:"fail",setRpe:9.5});
    tapLog({id:"upd"});
    const x=S.sessions[0].ex[0].sets[0];
    assert.deepEqual([x.r,x.w,x.kind,x.rpe,x.at,x.hand,x.u,x.rest,x.t],[10,22.5,"fail",9.5,iso(10),true,"lb",90,30]);
    assert.equal(S.editing,null);
  });

  test("deleting a set, or clearing the day, snapshots first so it can be undone",()=>{
    begin([day("d",iso(9),[ex("Squats",[set(5,100),set(5,105)]),ex("Dips",[set(10)])])]);
    S.editing={ex:"e-Squats",i:0};tapLog({id:"del"});
    assert.deepEqual(S.sessions[0].ex[0].sets.map(x=>x.w),[105]);
    tapLog({id:"reset"});
    assert.deepEqual(S.sessions[0].ex.map(e=>[e.name,e.sets.length]),[["Squats",0],["Dips",0]]);
    assert.deepEqual(ctx.snaps,["Set deleted","Day's sets cleared"]);
  });

  test("the ± buttons never go below zero and keep weights to one decimal",()=>{
    begin([day("d",iso(9),[ex("Squats")])]);
    Object.assign(S,{reps:0,weight:0.2});
    tapLog({attrs:{"data-step":"reps:-1"}});tapLog({attrs:{"data-step":"weight:1"}});
    assert.deepEqual([S.reps,S.weight],[0,1.2]);
    S.weight=0.4;tapLog({attrs:{"data-step":"weight:-1"}});assert.equal(S.weight,0);
  });

  test("the band stepper cycles through no band and each band, both ways",()=>{
    begin([day("d",iso(9),[ex("Band row")])]);
    tapLog({attrs:{"data-step":"band:-1"}});assert.equal(S.band,M.BANDS[M.BANDS.length-1]);
    tapLog({attrs:{"data-step":"band:1"}});assert.equal(S.band,"");
    S.band="not a band";tapLog({attrs:{"data-step":"band:1"}});assert.equal(S.band,M.BANDS[0]);
  });

  test("the keypad takes one decimal point for weight only, two decimals at most, six characters",()=>{
    begin([day("d",iso(9),[ex("Squats")])]);
    const keys=(field,list)=>{tapLog({attrs:{"data-edit":field}});list.forEach(k=>tapLog({attrs:{"data-key":k}}));};
    keys("weight",["6","7",".","5",".","5","5","done"]);assert.equal(S.weight,67.55);
    keys("weight",[".","5","done"]);assert.equal(S.weight,0.5);
    keys("reps",["1",".","2","done"]);assert.equal(S.reps,12);
    keys("reps",["1","2","3","4","5","6","7","back","done"]);assert.equal(S.reps,12345);
    keys("reps",["done"]);assert.equal(S.reps,12345,"nothing typed leaves the value alone");
    assert.equal(S.numEdit,null);
  });

  test("an exercise's own range, jump, bar, per-hand and off switch are set and cleared from its page",()=>{
    begin([day("d",iso(9),[ex("Squats")])]);S.exInfo=" Front Squat ";
    for(const v of ["range:6-10","step:5","bar:15","hand:1","unit:lb","off:1"])tapLog({attrs:{"data-exprog":v}});
    assert.deepEqual(S.exProg["front squat"],{range:"6-10",step:5,bar:15,hand:true,unit:"lb",off:true});
    for(const v of ["range:","step:","bar:","hand:","unit:","off:0"])tapLog({attrs:{"data-exprog":v}});
    assert.equal("front squat" in S.exProg,false);
  });

  test("a per-exercise rest target is set, and 0 falls back to the default",()=>{
    begin([day("d",iso(9),[ex("Squats",[set(5,100,{at:iso(10)})])])],{settings:{restTarget:90}});
    tapLog({attrs:{"data-resttarget":"180"}});
    assert.equal(store.restTargetFor(S.sessions[0]),180);
    tapLog({attrs:{"data-resttarget":"0"}});
    assert.deepEqual([S.restTargets,store.restTargetFor(S.sessions[0])],[{},90]);
  });

  test("the unit button steps reps, seconds, metres and back",()=>{
    begin([day("d",iso(9),[ex("Farmer carry")])]);
    const seen=[];for(let i=0;i<3;i++){tapLog({id:"timedbtn"});seen.push(M.unitOf(store.activeEx()));}
    assert.deepEqual(seen,["secs","m","reps"]);
  });

  test("a set kind toggles off when tapped again, the warm-up flag follows it, and so does RPE",()=>{
    begin([day("d",iso(9),[ex("Squats")])]);
    tapLog({attrs:{"data-setkind":"wu"}});assert.deepEqual([S.setKind,S.warmup],["wu",true]);
    tapLog({attrs:{"data-setkind":"drop"}});assert.deepEqual([S.setKind,S.warmup],["drop",false]);
    tapLog({attrs:{"data-setkind":"drop"}});assert.equal(S.setKind,"");
    tapLog({attrs:{"data-rpe":"8"}});tapLog({attrs:{"data-rpe":"8"}});assert.equal(S.setRpe,0);
  });

  test("applying a hint loads its reps and weight; a blank weight leaves the weight alone",()=>{
    begin([day("d",iso(9),[ex("Push ups")])]);S.weight=10;
    tapLog({id:"hintbtn",attrs:{"data-hw":"","data-hr":"12"}});assert.deepEqual([S.reps,S.weight],[12,10]);
    tapLog({id:"rxbtn",attrs:{"data-hw":"62.5","data-hr":"5"}});assert.deepEqual([S.reps,S.weight],[5,62.5]);
  });

  test("the workout button asks before ending a running workout, and starts a stopped one",t=>{
    freeze(t,at(10));
    begin([day("d",iso(9),[ex("Squats")])]);
    tapLog({id:"wtoggle"});assert.equal(S.sessions[0].running,true);assert.equal(S.dialog,null);
    tapLog({id:"wtoggle"});assert.equal(S.dialog.act,"endworkout");assert.equal(S.sessions[0].running,true);
  });

  test("starting a set starts the workout, and tapping again cancels the set",t=>{
    freeze(t,at(10));
    begin([day("d",iso(9),[ex("Squats")])]);
    tapLog({id:"setstart"});assert.deepEqual([S.setStart,S.sessions[0].running],[iso(10),true]);
    tapLog({id:"setstart"});assert.equal(S.setStart,null);
  });

  test("adding from the picker keeps it open and selects the exercise; favourites toggle",()=>{
    begin([day("d",iso(9),[ex("Squats")])]);
    tapLog({attrs:{"data-add":"Dips"}});
    assert.deepEqual([store.activeEx().name,S.sheet,ctx.recalled],["Dips",true,["Dips"]]);
    tapLog({attrs:{"data-fav":"Dips"}});tapLog({attrs:{"data-fav":"Rows"}});tapLog({attrs:{"data-fav":"Dips"}});
    assert.deepEqual(S.favs,["Rows"]);
  });

  test("removing a name from the picker's list snapshots first and keeps it out",()=>{
    begin([day("d",iso(9),[ex("Squats")])]);
    tapLog({attrs:{"data-delcat":"Squats"}});
    assert.deepEqual([ctx.snaps,store.inCatalog("Squats"),S.removed],[["Removed Squats from the list"],false,["Squats"]]);
  });
});

describe("days: start, repeat, open and the calendar",()=>{
  const tapDay=a=>daysA.handle(el(a),ctx);

  test("Start today numbers a second workout on the same day",t=>{
    freeze(t,at(18));
    begin([day("am",iso(7),[ex("Squats",[set(5,100)])])]);
    tapDay({id:"homestart"});
    const s=store.getSession();
    assert.match(s.title,/ · 2$/);assert.deepEqual([S.view,S.sheet,S.sessions.length],["log",true,2]);
  });

  test("Repeat copies the exercises and their units, never the sets",t=>{
    freeze(t,at(18));
    begin([day("old",iso(7,0,1),[ex("Plank",[set(60)],{timed:true}),ex("Sled drag",[set(40)],{dist:true}),ex("Squats",[set(5,100)])])]);
    tapDay({attrs:{"data-copyday":"old"}});
    const s=store.getSession();
    assert.notEqual(s.id,"old");
    assert.deepEqual(s.ex.map(e=>[e.name,M.unitOf(e),e.sets.length]),[["Plank","secs",0],["Sled drag","m",0],["Squats","reps",0]]);
    assert.equal(S.sessions.find(x=>x.id==="old").ex[2].sets.length,1);
  });

  test("opening a day with nothing in it opens the picker; one with exercises does not",()=>{
    begin([day("a",iso(7)),day("b",iso(8),[ex("Dips")])]);
    tapDay({attrs:{"data-load":"a"}});assert.equal(S.sheet,true);
    tapDay({attrs:{"data-load":"b"}});assert.deepEqual([S.sheet,store.activeEx().name],[false,"Dips"]);
  });

  test("the calendar steps across the year's end both ways",()=>{
    begin([day("a",iso(7))]);
    Object.assign(S,{calYear:2026,calMonth:0});tapDay({id:"calprev"});assert.deepEqual([S.calYear,S.calMonth],[2025,11]);
    tapDay({id:"calnext"});tapDay({id:"calnext"});assert.deepEqual([S.calYear,S.calMonth],[2026,1]);
  });

  test("a date with one workout opens it, a planned one opens its sheet, and several open a list",()=>{
    const planned=day("p",new Date(2026,9,12,12).toISOString(),[ex("Squats")]);
    const a=day("a",iso(7,0,1),[ex("Squats",[set(5)])]),b=day("b",iso(18,0,1),[ex("Dips",[set(5)])]);
    begin([day("x",iso(9,0,5),[ex("Rows",[set(5)])]),planned,a,b]);
    tapDay({attrs:{"data-calday":"2026-10-05"}});assert.deepEqual([store.getSession().id,S.view],["x","log"]);
    tapDay({attrs:{"data-calday":"2026-10-12"}});assert.deepEqual(S.planned,{id:"p"});
    tapDay({attrs:{"data-calday":"2026-10-01"}});assert.equal(S.calDay,"2026-10-01");
  });

  test("an empty date asks what to plan in the calendar, and elsewhere starts a day dated to it",()=>{
    begin([day("a",iso(7))]);S.view="calendar";
    tapDay({attrs:{"data-newday":"2026-09-15"}});assert.equal(S.planDay,"2026-09-15");assert.equal(S.sessions.length,1);
    S.view="history";tapDay({attrs:{"data-newday":"2026-09-15"}});
    assert.equal(M.dateKey(store.getSession().created),"2026-09-15");assert.deepEqual([S.view,S.sheet],["log",true]);
  });

  test("deleting a day snapshots first",()=>{
    begin([day("a",iso(7))]);
    tapDay({attrs:{"data-delday":"a"}});
    assert.deepEqual([ctx.snaps,ctx.deleted],[["Day deleted"],["a"]]);
  });
});

describe("routines: start, add into a day, drop and save",()=>{
  const tapR=a=>routinesA.handle(el(a),ctx);
  beforeEach(()=>{});

  test("starting a routine fills today's blank day rather than adding another",t=>{
    freeze(t,at(18));
    begin([day("blank",iso(7))]);
    const r=store.saveRoutine("Push",["Bench press","Dips"]);
    tapR({attrs:{"data-routine":r.id}});
    const s=store.getSession();
    assert.deepEqual([s.id,s.title,s.routine,s.ex.map(e=>e.name),store.activeEx().name,S.view],["blank","Push",r.id,["Bench press","Dips"],"Bench press","log"]);
  });

  test("a day that is running, or already has exercises, is left alone and a new day is made",t=>{
    freeze(t,at(18));
    begin([day("run",iso(7),[],{running:true,started:iso(7)}),day("full",iso(8),[ex("Rows")])]);
    tapR({attrs:{"data-routine":"b-travel-bands"}});
    assert.equal(S.sessions.length,3);assert.equal(store.getSession().title,"Travel bands");
  });

  test("adding a routine into the open day keeps what is there and adds the rest once",()=>{
    begin([day("d",iso(7),[ex("Bench press",[set(5,80)])])]);
    const r=store.saveRoutine("Push",["bench press","Dips"]);
    tapR({attrs:{"data-applyroutine":r.id}});
    const s=store.getSession();
    assert.deepEqual([s.ex.map(e=>e.name),s.ex[0].sets.length,s.routine],[["Bench press","Dips"],1,r.id]);
  });

  test("dropping a built-in hides it, dropping your own deletes it, and both can be undone",()=>{
    begin([day("d",iso(7))]);
    const r=store.saveRoutine("Push",["Dips"]);
    tapR({attrs:{"data-delroutine":"b-travel-bands"}});tapR({attrs:{"data-delroutine":r.id}});
    assert.deepEqual([S.hiddenRoutines,S.routines,ctx.snaps],[["Travel bands"],[],["Dropped routine Travel bands","Dropped routine Push"]]);
  });

  test("a workout from a Learn page starts today, and can be kept as a routine",async t=>{
    const {loadLearn,topicById}=await import("../js/lazy.js");
    await loadLearn();
    freeze(t,at(18));
    begin([day("blank",iso(7))]);
    const d=topicById("kot").days[0];
    tapR({attrs:{"data-learnday":"nope:0"}});assert.equal(S.view,"log");assert.deepEqual(store.getSession().ex,[]);
    tapR({attrs:{"data-learnday":"kot:0"}});
    const s=store.getSession();
    assert.deepEqual([s.id,s.title,s.ex.map(e=>e.name),S.origin],["blank",d.name,d.ex,"learn"]);
    tapR({attrs:{"data-learnsave":"kot:0"}});
    assert.deepEqual([S.routines.map(r=>[r.name,r.ex]),ctx.snaps],[[[d.name,d.ex]],["Saved routine "+d.name]]);
  });

  test("saving a day as a routine asks for a name only when the day has exercises",()=>{
    begin([day("empty",iso(7)),day("full",iso(8),[ex("Dips")],{title:"Chest day"})]);
    tapR({attrs:{"data-saveroutine":"empty"}});assert.equal(S.dialog,null);
    tapR({attrs:{"data-saveroutine":"full"}});
    assert.deepEqual([S.dialog.act,S.dialog.value,S.dialog.ref],["nameroutine","Chest day","full"]);
  });
});
