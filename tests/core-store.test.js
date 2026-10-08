// Saved data is never lost or bent out of shape: loading saves from older versions and damaged
// ones, saving and loading again, the exercise list, routines, a backup out and back in, and
// changing the weight unit.
import {test,describe,beforeEach} from "node:test";
import assert from "node:assert/strict";

// store.js reads and writes localStorage and sets the theme on <html>: an in-memory
// localStorage and a bare documentElement are enough. db.js tells the app's other windows
// when it saves; a test has none, so that channel is left out.
const memory=new Map();
Object.defineProperty(globalThis,"localStorage",{configurable:true,writable:true,value:{
  getItem:k=>(memory.has(k)?memory.get(k):null),
  setItem:(k,v)=>{memory.set(k,String(v));},
  removeItem:k=>{memory.delete(k);},
  clear:()=>{memory.clear();}
}});
Object.defineProperty(globalThis,"BroadcastChannel",{configurable:true,writable:true,value:undefined});
globalThis.document={documentElement:{dataset:{}}};

const KEY="workout_days_v2";
const model=await import("../js/model.js");
const db=await import("../js/db.js");
const store=await import("../js/store.js");
const data=await import("../js/actions/data.js");
const S=store.state;

const set=(r,w=0,x={})=>Object.assign({r,side:false,w,t:0,rest:0,at:"",wu:false,band:""},x);
const day=(id,created,ex=[],x={})=>Object.assign({id,title:id,created,started:"",ended:"",running:false,timerFrom:"",ex},x);
const ex=(name,sets=[set(10)],x={})=>Object.assign({id:"e-"+name,name,sets},x);
// A fixed "now", so a fresh install's first day never depends on the real clock.
const NOW=new Date(2026,9,8,12,0).getTime();
const freeze=(t,now=NOW)=>t.mock.timers.enable({apis:["Date","setTimeout"],now});

// Loads the app as if this had been saved on the device. Written through db.js, which keeps a
// cache in front of the storage once anything has been saved.
function loadWith(saved){
  db.setItem(KEY,typeof saved==="string"?saved:JSON.stringify(saved));
  store.load();
}
function fresh(){db.removeItem(KEY);store.load();}
const near=(a,b,eps=0.11)=>Math.abs(a-b)<=eps;

// A tapped element for the action handlers: an id, attributes, and closest() for the simple
// selectors they use ("#id", "[data-x]", ".a.b[data-x]", lists split by commas).
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
const ctx=()=>({render(){},snapshot(){},markRefit(){},recallLast(){},showBest(){}});

// What "Back up now" hands over: the file it builds, read back as JSON. The caller freezes
// the clock first, which also holds back the download's clean-up timer.
async function backupNow(){
  let blob=null;const was={c:URL.createObjectURL,r:URL.revokeObjectURL,d:globalThis.document};
  URL.createObjectURL=b=>{blob=b;return "blob:test";};URL.revokeObjectURL=()=>{};
  globalThis.document=Object.assign({},was.d,{createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}});
  try{data.handle(el({id:"backupnow"}),ctx());}
  finally{URL.createObjectURL=was.c;URL.revokeObjectURL=was.r;globalThis.document=was.d;}
  assert.ok(blob,"a backup file was made");
  return JSON.parse(await blob.text());
}

// Everything a lifter keeps on the device, filled in.
function fillDevice(){
  S.sessions=[day("d1","2026-09-01T09:00:00.000Z",[ex("Squats",[set(5,100,{at:"2026-09-01T09:10:00.000Z"})],{timed:false,dist:false})],{routine:"r-legs"})];
  S.sessionId="d1";
  S.body=[{at:"2026-09-01T07:00:00.000Z",w:80,waist:85}];
  S.routines=[{id:"r-legs",name:"Legs",ex:["Squats"],plan:[{name:"Squats",sets:[{r:5,w:100,rest:180}]}]}];
  S.hiddenRoutines=["Travel bands"];S.restTargets={squats:180};S.exNotes={squats:"belt on"};
  S.exProg={squats:{range:"3-5",step:5}};S.gyms=[{id:"g1",name:"Home",barKg:15}];S.gymId="g1";
  S.supplements=[{id:"s1",name:"Creatine"}];S.stacks=[{id:"k1",name:"Morning",items:["s1"]}];
  S.favs=["Squats"];S.programme={id:"531",days:[{name:"A"}]};S.learnSaved=["kot"];
  S.checkins=[{at:"2026-09-01T06:30:00.000Z",sleep:3,energy:4}];
  S.vitals=[{at:"2026-09-01T06:35:00.000Z",rhr:52}];
  S.fuel=[{id:"f1",at:"2026-09-01T12:00:00.000Z",name:"Eggs",p:18}];
  S.markers=[{id:"vitd",at:"2026-08-20T09:00:00.000Z",v:110}];
  S.habits=["Pray","Walk"];S.habitDone={"2026-09-01":["Pray"]};S.journal={"2026-09-01":"Good day"};
  S.photos=[{id:"p1",at:"2026-09-01T07:00:00.000Z",data:"data:image/jpeg;base64,AAAA"}];
  S.settings=Object.assign({},store.DEFAULTS,{restTarget:90});
}

describe("loading saves from older versions",()=>{
  test("the first version's sets, saved as bare rep counts, keep their reps",()=>{
    // The single-file app pushed the rep count itself: sets:[10,8].
    loadWith({sessionId:"a",sessions:[{id:"a",title:"Monday",created:"2026-08-03T09:00:00.000Z",
      ex:[{id:"x",name:"Push ups",sets:[10,8]}]}]});
    assert.deepEqual(S.sessions[0].ex[0].sets.map(x=>x.r),[10,8]);
  });

  test("a save from before timers gains empty clocks and keeps reps and sides",()=>{
    loadWith({version:3,sessionId:"a",sessions:[{id:"a",title:"Monday",created:"2026-08-03T09:00:00.000Z",
      ex:[{id:"x",name:"Step ups",sets:[{r:10,side:true},{r:8}]}]}]});
    const s=S.sessions[0];
    assert.deepEqual([s.started,s.ended,s.timerFrom,s.running],["","","",false]);
    assert.deepEqual(s.ex[0].sets[0],{r:10,side:true,w:0,t:0,rest:0,at:"",wu:false,band:""});
    assert.equal(s.ex[0].sets[1].side,false);
  });

  test("a save with nothing but days starts everything else at its defaults",()=>{
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z",[ex("Zercher carry")])]});
    assert.deepEqual(S.settings,store.DEFAULTS);
    assert.deepEqual([S.routines,S.body,S.hiddenRoutines,S.removed,S.gyms],[[],[],[],[],[]]);
    assert.ok(S.catalog.includes("Zercher carry")&&S.catalog.includes("Squats"));
    assert.equal(S.reps,store.DEFAULTS.startReps);
  });

  test("settings saved before newer ones existed are filled in, and unknown ones are kept",()=>{
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z")],settings:{unit:"lb",retiredSetting:7,startReps:12}});
    assert.equal(S.settings.unit,"lb");assert.equal(model.options.unit,"lb");
    assert.equal(S.settings.autoTarget,true);assert.equal(S.settings.barLb,45);
    assert.equal(S.settings.retiredSetting,7);assert.equal(S.reps,12);
  });

  test("the day that was open comes back open, with its first exercise selected",()=>{
    loadWith({sessionId:"b",sessions:[day("a","2026-08-03T09:00:00.000Z"),day("b","2026-08-04T09:00:00.000Z",[ex("Dips"),ex("Rows")])]});
    assert.equal(store.getSession().id,"b");assert.equal(store.activeEx().name,"Dips");
  });

  test("an open day that no longer exists falls back to the first day",()=>{
    loadWith({sessionId:"gone",sessions:[day("a","2026-08-03T09:00:00.000Z")]});
    assert.equal(store.getSession().id,"a");
  });

  test("a timed exercise saved as both timed and distance comes back timed only",()=>{
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z",[ex("Plank",[set(60)],{timed:true,dist:true})])]});
    assert.deepEqual([S.sessions[0].ex[0].timed,S.sessions[0].ex[0].dist],[true,false]);
  });

  test("a save that is not JSON starts fresh rather than failing",t=>{
    freeze(t);
    loadWith("{\"sessions\":[{\"id\":");
    assert.equal(S.sessions.length,1);assert.deepEqual(S.sessions[0].ex,[]);
  });

  test("a damaged entry (a null day, a day with no exercise list, a null set) is skipped and the rest loads",()=>{
    const good=day("good","2026-08-05T09:00:00.000Z",[ex("Squats",[set(5,100)])]);
    for(const bad of [null,{id:"noex",created:"2026-08-04T09:00:00.000Z"},
      day("nullset","2026-08-04T09:00:00.000Z",[ex("Dips",[null,set(8)])])]){
      assert.doesNotThrow(()=>loadWith({sessionId:"good",sessions:[bad,good]}),JSON.stringify(bad));
      assert.equal(store.getSession().id,"good");
      assert.equal(store.getSession().ex[0].sets[0].w,100);
    }
  });
});

describe("saving and loading again",()=>{
  test("everything kept on the device comes back after a save and a reload",t=>{
    freeze(t);fresh();fillDevice();
    Object.assign(S,{setStart:"2026-09-01T09:09:00.000Z",monthSeen:"2026-09",pickOpen:{Push:true},learnRecent:["kot"],
      backupAt:"2026-09-01T10:00:00.000Z",backupSnooze:"2026-09-08T10:00:00.000Z",welcomed:true,catalog:["Squats","Zercher carry"],removed:["Deadlift"]});
    const kept=JSON.parse(JSON.stringify(S));
    store.save();
    for(const k of Object.keys(kept))if(Array.isArray(kept[k])||typeof kept[k]==="object")S[k]=Array.isArray(kept[k])?[]:{};
    store.load();
    for(const k of ["sessions","sessionId","catalog","removed","settings","setStart","body","routines","hiddenRoutines","restTargets",
      "exNotes","exProg","gyms","gymId","monthSeen","favs","pickOpen","programme","learnSaved","learnRecent","backupAt","backupSnooze",
      "welcomed","checkins","vitals","photos","fuel","markers","habits","habitDone","journal","supplements","stacks"])
      assert.deepEqual(S[k],kept[k],k);
  });

  test("a save that runs out of room says so, and the next one that fits clears it",t=>{
    freeze(t);fresh();
    const real=localStorage.setItem;
    localStorage.setItem=()=>{throw new Error("QuotaExceededError");};
    try{store.save();}finally{localStorage.setItem=real;}
    assert.equal(S.storageFull,true);
    store.save();assert.equal(S.storageFull,false);
  });

  test("a set normalised twice is the same as normalised once",()=>{
    const once=model.normSet({r:"8",w:"62.5",side:1,t:"40",rest:"90",at:"2026-09-01T09:00:00.000Z",kind:"drop",rpe:"8.4",note:"  grindy  ",hand:true,u:"lb",band:""});
    assert.deepEqual(model.normSet(once),once);
    assert.deepEqual(once,{r:8,side:true,w:62.5,t:40,rest:90,at:"2026-09-01T09:00:00.000Z",wu:false,band:"",kind:"drop",rpe:8.5,note:"grindy",hand:true,u:"lb"});
  });

  test("normalising drops what a set can't hold: a stray unit, an empty note, a zero RPE, an overlong note",()=>{
    const x=model.normSet({r:5,u:"stone",note:"   ",rpe:0});
    assert.equal("u" in x,false);assert.equal("note" in x,false);assert.equal("rpe" in x,false);
    assert.equal(model.normSet({r:5,note:"x".repeat(500)}).note.length,200);
    assert.deepEqual([model.normSet({r:"lots"}).r,model.normSet({w:null}).w],[0,0]);
  });
});

describe("the exercise list",()=>{
  beforeEach(()=>{loadWith({catalog:["Squats"],seeded:model.SEED_EXERCISES,sessions:[day("a","2026-08-03T09:00:00.000Z")]});});

  test("a name already listed, in another case or with spaces, is not listed twice",()=>{
    store.addToCatalog("  squats ");store.addToCatalog("SQUATS");
    assert.deepEqual(S.catalog,["Squats"]);
  });

  test("a removed exercise stays gone across a reload, and comes back once added again",()=>{
    store.addToCatalog("Zercher carry");store.removeFromCatalog("zercher CARRY");
    store.save();store.load();
    assert.ok(!S.catalog.includes("Zercher carry"));
    store.addToCatalog("Zercher carry");
    assert.ok(S.catalog.includes("Zercher carry"));assert.deepEqual(S.removed,[]);
  });

  test("removing a name twice remembers it once, and an empty name is never added or removed",()=>{
    store.removeFromCatalog("Squats");store.removeFromCatalog("squats");store.removeFromCatalog("  ");store.addToCatalog("");
    assert.deepEqual(S.removed,["Squats"]);assert.deepEqual(S.catalog,[]);
  });

  test("adding to the day trims the name, reuses the one already there, and selects it",()=>{
    const a=store.addExerciseToDay("  Zercher squat ");
    const b=store.addExerciseToDay("zercher SQUAT");
    assert.equal(a,b);assert.equal(a.name,"Zercher squat");assert.equal(S.exId,a.id);
    assert.equal(store.getSession().ex.length,1);assert.ok(S.catalog.includes("Zercher squat"));
    assert.equal(store.addExerciseToDay("   "),null);
  });

  test("a plank added to the day counts seconds and a sled push counts metres",()=>{
    assert.equal(model.unitOf(store.addExerciseToDay("Plank")),"secs");
    assert.equal(model.unitOf(store.addExerciseToDay("Forward sled push")),"m");
    assert.equal(model.unitOf(store.addExerciseToDay("Squats")),"reps");
  });
});

describe("routines with and without a plan",()=>{
  beforeEach(()=>{loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z")]});});

  test("a plan keeps only reps, weight and rest, as numbers",()=>{
    const r=store.saveRoutine("Legs",["Squats"],[{name:"Squats",sets:[{r:"5",w:"100",rest:"90",note:"x"},{r:null}]}]);
    assert.deepEqual(store.planFor(r,"SQUATS"),[{r:5,w:100,rest:90},{r:0,w:0,rest:0}]);
  });

  test("an exercise with no planned sets, or not in the plan, has no targets",()=>{
    const r=store.saveRoutine("Legs",["Squats","Dips"],[{name:"Squats",sets:[]}]);
    assert.equal(store.planFor(r,"Squats"),null);assert.equal(store.planFor(r,"Dips"),null);
    assert.equal(store.planFor(null,"Squats"),null);
    assert.equal(store.saveRoutine("Plain",["Dips"],[]).plan,undefined);
  });

  test("a plan read from a day leaves out warm-ups and keeps each working set's rest",()=>{
    const d=day("p","2026-08-03T09:00:00.000Z",[ex("Squats",[set(8,60,{wu:true}),set(5,100,{rest:180}),set(5,"102.5")]),ex("Dips",[])]);
    assert.deepEqual(store.planOf(d),[{name:"Squats",sets:[{r:5,w:100,rest:180},{r:5,w:102.5,rest:0}]},{name:"Dips",sets:[]}]);
  });

  test("the plan line names each weight when they differ",()=>{
    assert.equal(store.planLine([{r:5,w:100},{r:5,w:110}],"kg"),"5, 5 @ 100/110 kg");
    assert.equal(store.planLine([{r:12,w:0},{r:12,w:0}],"kg"),"2 × 12");
    assert.equal(store.planLine([],"kg"),"");assert.equal(store.planLine(null,"kg"),"");
  });

  test("your routines and hidden built-ins come back after a reload",()=>{
    store.saveRoutine("Legs",["Squats"],[{name:"Squats",sets:[{r:5,w:100}]}]);
    store.dropRoutine(store.allRoutines().find(r=>r.builtin));
    store.save();store.load();
    assert.deepEqual(S.routines.map(r=>r.name),["Legs"]);
    assert.equal(S.hiddenRoutines.length,1);
    assert.ok(!store.allRoutines().some(r=>r.name===S.hiddenRoutines[0]));
  });
});

describe("a backup out and back in",()=>{
  test("a backup restores the days, routines, settings, body log and every per-exercise choice",async t=>{
    freeze(t);fresh();fillDevice();
    const file=await backupNow();
    assert.equal(file.app,"kingskiln");
    fresh();
    assert.equal(store.importBackup(file),1);
    const d=S.sessions.find(s=>s.id==="d1");
    assert.deepEqual(d.ex[0].sets.map(x=>[x.r,x.w]),[[5,100]]);
    assert.deepEqual(S.routines.map(r=>[r.name,r.ex,r.plan]),[["Legs",["Squats"],[{name:"Squats",sets:[{r:5,w:100,rest:180}]}]]]);
    assert.equal(S.settings.restTarget,90);
    assert.deepEqual(S.body,[{at:"2026-09-01T07:00:00.000Z",w:80,waist:85}]);
    for(const k of ["restTargets","exNotes","exProg","gyms","supplements","stacks","favs","programme","learnSaved","hiddenRoutines"])
      assert.ok(JSON.stringify(S[k]).length>2&&JSON.stringify(S[k])===JSON.stringify(file[k]),k);
  });

  test("Back up now carries the check-ins, vitals, fuel, markers, habits and journal, so a restore brings them back",async t=>{
    freeze(t);fresh();fillDevice();
    const kept=JSON.parse(JSON.stringify({checkins:S.checkins,vitals:S.vitals,fuel:S.fuel,markers:S.markers,habits:S.habits,habitDone:S.habitDone,journal:S.journal}));
    const file=await backupNow();
    fresh();store.importBackup(file);
    const lost=Object.keys(kept).filter(k=>JSON.stringify(S[k])!==JSON.stringify(kept[k]));
    assert.deepEqual(lost,[],"lost on the way through a backup");
  });

  test("progress photos go into the backup, as the Body page says they do",async t=>{
    freeze(t);fresh();fillDevice();
    const file=await backupNow();
    fresh();store.importBackup(file);
    assert.deepEqual(S.photos.map(p=>p.id),["p1"]);
  });

  test("routines keep their ids through a restore, so days planned from them still find their targets",async t=>{
    freeze(t);fresh();
    const file={routines:[{id:"r-legs",name:"Legs",ex:["Squats"],plan:[{name:"Squats",sets:[{r:5,w:100,rest:180}]}]}],
      sessions:[day("plan1","2026-10-12T11:00:00.000Z",[ex("Squats",[])],{routine:"r-legs",title:"Legs"})]};
    for(let pass=1;pass<=2;pass++){
      store.importBackup(JSON.parse(JSON.stringify(file)));
      const s=S.sessions.find(x=>x.id==="plan1"),r=store.findRoutine(s.routine);
      assert.ok(r,"pass "+pass+": the planned day's routine is found");
      assert.deepEqual(store.planFor(r,"Squats"),[{r:5,w:100,rest:180}]);
    }
  });

  test("loading the same backup twice adds nothing twice",t=>{
    freeze(t);fresh();
    const file={sessions:[day("d1","2026-09-01T09:00:00.000Z",[ex("Squats",[set(5,100)])])],
      body:[{at:"2026-09-01T07:00:00.000Z",w:80}],supplements:[{id:"s1",name:"Creatine"}],stacks:[{id:"k1",name:"AM"}],
      routines:[{name:"Legs",ex:["Squats"]}],favs:["Squats"],learnSaved:["kot"],checkins:[{at:"2026-09-01T06:00:00.000Z"}],
      vitals:[{at:"2026-09-01T06:00:00.000Z"}],markers:[{id:"vitd",at:"2026-08-01T09:00:00.000Z"}],fuel:[{id:"f1"}],
      gyms:[{id:"g1",name:"Home"}],hiddenRoutines:["Travel bands"],habits:["Pray"]};
    store.importBackup(JSON.parse(JSON.stringify(file)));store.importBackup(JSON.parse(JSON.stringify(file)));
    assert.equal(S.sessions.filter(s=>s.id==="d1").length,1);
    for(const k of ["body","supplements","stacks","routines","favs","learnSaved","checkins","vitals","markers","fuel","gyms","hiddenRoutines","habits"])
      assert.equal(S[k].length,1,k);
  });

  test("a day in the backup replaces the day here that began at the same moment",t=>{
    freeze(t);
    loadWith({sessions:[day("here","2026-09-01T09:00:00.000Z",[ex("Squats",[set(5,100),set(5,100)])])]});
    store.importBackup({sessions:[day("there","2026-09-01T09:00:00.000Z",[ex("Squats",[set(5,90)])])]});
    assert.deepEqual(S.sessions.map(s=>s.id),["there"]);
    assert.equal(store.getSession().id,"there","the newest day is opened");
  });

  test("a backup in pounds merged into a device in kilograms keeps every load meaning the same weight",t=>{
    freeze(t);
    loadWith({sessions:[day("here","2026-09-01T09:00:00.000Z",[ex("Squats",[set(5,100)])])],body:[{at:"2026-09-01T07:00:00.000Z",w:80}]});
    store.importBackup({settings:{unit:"lb"},sessions:[day("there","2026-09-03T09:00:00.000Z",[ex("Squats",[set(5,225)])])],
      body:[{at:"2026-09-03T07:00:00.000Z",w:176}]});
    const u=S.settings.unit,kg=w=>u==="lb"?w*0.45359237:w;
    const w=id=>S.sessions.find(s=>s.id===id).ex[0].sets[0].w;
    assert.ok(near(kg(w("here")),100,0.2),"this device's 100 kg now reads "+w("here")+" "+u);
    assert.ok(near(kg(w("there")),102.06,0.2),"the file's 225 lb now reads "+w("there")+" "+u);
    assert.ok(near(kg(S.body[0].w),80,0.2),"this device's 80 kg weigh-in now reads "+S.body[0].w+" "+u);
  });

  test("malformed entries in a backup are skipped and the rest is loaded",t=>{
    freeze(t);fresh();
    const n=store.importBackup({sessions:[null,{id:"x"},{id:"y",created:"2026-09-01T09:00:00.000Z"},
      day("ok","2026-09-02T09:00:00.000Z",[null,{id:"nameless",sets:[]},ex("Dips",[{r:"8"}])])],
      body:[null,{w:80}],supplements:[{name:"no id"},{id:"s1"}],routines:[null,{name:"Ok",ex:["Dips"]}],
      catalog:"not a list",removed:{},favs:[null,""],gyms:[{name:"no id"}]});
    assert.equal(n,1);
    const d=S.sessions.find(s=>s.id==="ok");
    assert.deepEqual(d.ex.map(e=>e.name),["Dips"]);assert.equal(d.ex[0].sets[0].r,8);
    assert.deepEqual([S.body.length,S.supplements.length,S.gyms.length,S.favs.length],[0,0,0,0]);
    assert.deepEqual(S.routines.map(r=>r.name),["Ok"]);
  });

  test("notes and progression already here win over the file; rest targets and settings from the file win",t=>{
    freeze(t);
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z")],exNotes:{squats:"mine"},exProg:{squats:{step:5}},
      restTargets:{squats:120},settings:{restTarget:60,theme:"dark"}});
    store.importBackup({exNotes:{squats:"file",dips:"file"},exProg:{squats:{step:1},dips:{off:true}},
      restTargets:{squats:180},settings:{restTarget:90}});
    assert.deepEqual(S.exNotes,{squats:"mine",dips:"file"});
    assert.deepEqual(S.exProg,{squats:{step:5},dips:{off:true}});
    assert.equal(S.restTargets.squats,180);
    assert.deepEqual([S.settings.restTarget,S.settings.theme],[90,"dark"]);
  });

  test("a programme in the file is taken only when none is running here, and habits stop at eight",t=>{
    freeze(t);fresh();
    store.importBackup({programme:{id:"531",days:[]}});assert.equal(S.programme.id,"531");
    store.importBackup({programme:{id:"gzclp",days:[]}});assert.equal(S.programme.id,"531");
    store.importBackup({habits:["a","b","c","d","e","f","g","h","i","j"]});assert.equal(S.habits.length,8);
  });

  test("a backup's removed exercises leave the picker even when they came in with its days",t=>{
    freeze(t);fresh();
    store.importBackup({sessions:[day("a","2026-09-01T09:00:00.000Z",[ex("Zercher carry")])],removed:["zercher carry"]});
    assert.ok(!store.inCatalog("Zercher carry"));
    assert.equal(S.sessions.find(s=>s.id==="a").ex[0].name,"Zercher carry","the day itself keeps it");
  });
});

describe("changing the weight unit",()=>{
  test("every girth on the body log follows the unit; blood pressure and pulse do not",()=>{
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z")]});
    S.body=[{at:"2026-09-01T07:00:00.000Z",w:80,waist:90,chest:100,arm:35,neck:38,hip:95,thigh:55,sys:120,dia:80,pulse:60}];
    store.convertAllWeights("kg","lb");
    const b=S.body[0];
    assert.equal(b.w,model.convertWeight(80,"kg","lb"));
    for(const k of ["waist","chest","arm","neck","hip","thigh"])
      assert.equal(b[k],model.convertLength({waist:90,chest:100,arm:35,neck:38,hip:95,thigh:55}[k],"kg","lb"),k+" in inches");
    assert.deepEqual([b.sys,b.dia,b.pulse],[120,80,60]);
  });

  test("an exercise's own bar follows the unit, unless the exercise keeps a unit of its own",()=>{
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z")]});
    S.exProg={"front squat":{bar:15},"ez curl":{bar:25,unit:"lb"}};
    store.convertAllWeights("kg","lb");
    assert.ok(near(S.exProg["front squat"].bar,33.1),"a 15 kg bar reads "+S.exProg["front squat"].bar+" lb");
    assert.equal(S.exProg["ez curl"].bar,25);
  });

  test("switching units there and back gives every load back as it was",()=>{
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z",[ex("Bench press",[135,185,225,315].map(w=>set(5,w)))])],settings:{unit:"lb"}});
    store.convertAllWeights("lb","kg");store.convertAllWeights("kg","lb");
    assert.deepEqual(S.sessions[0].ex[0].sets.map(x=>x.w),[135,185,225,315]);
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z",[ex("Bench press",[61.25,101.25,1.25].map(w=>set(5,w)))])]});
    store.convertAllWeights("kg","lb");store.convertAllWeights("lb","kg");
    assert.deepEqual(S.sessions[0].ex[0].sets.map(x=>x.w),[61.25,101.25,1.25]);
  });

  test("the weight on the panel, the last weight and bodyweight sets follow along; the same unit changes nothing",()=>{
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z",[ex("Dips",[set(10,0)])])]});
    S.weight=100;S.lastWeight=20;
    store.convertAllWeights("kg","kg");assert.equal(S.weight,100);
    store.convertAllWeights("kg","lb");
    assert.deepEqual([S.weight,S.lastWeight,S.sessions[0].ex[0].sets[0].w],[220.5,44.1,0]);
  });

  test("an exercise's own jump moves to the nearest sensible jump in the other unit",()=>{
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z")]});
    S.exProg={a:{step:1},b:{step:2.5},c:{step:5},d:{step:10}};
    store.convertAllWeights("kg","lb");
    assert.deepEqual(["a","b","c","d"].map(k=>S.exProg[k].step),[2.5,5,10,10]);
    S.exProg={a:{step:2.5},b:{step:5},c:{step:10}};
    store.convertAllWeights("lb","kg");
    assert.deepEqual(["a","b","c"].map(k=>S.exProg[k].step),[1,2.5,5]);
  });

  test("choosing pounds in Settings converts the history, and restoring defaults converts it back",()=>{
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z",[ex("Squats",[set(5,100)])])]});
    data.handle(el({attrs:{"data-set":"unit","data-val":"lb"}}),ctx());
    assert.equal(S.settings.unit,"lb");assert.equal(S.sessions[0].ex[0].sets[0].w,220.5);
    data.handle(el({attrs:{"data-set":"unit","data-val":"lb"}}),ctx());
    assert.equal(S.sessions[0].ex[0].sets[0].w,220.5,"choosing the unit already set does nothing");
    data.handle(el({id:"resetsettings"}),ctx());
    assert.equal(S.settings.unit,"kg");assert.equal(S.sessions[0].ex[0].sets[0].w,100);
  });

  test("a setting arrives as the type its default has",()=>{
    loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z")]});
    data.handle(el({attrs:{"data-set":"voice","data-val":"0"}}),ctx());
    data.handle(el({attrs:{"data-set":"startReps","data-val":"8"}}),ctx());
    data.handle(el({attrs:{"data-set":"theme","data-val":"dark"}}),ctx());
    assert.deepEqual([S.settings.voice,S.settings.startReps,S.reps,S.settings.theme],[false,8,8,"dark"]);
    assert.equal(document.documentElement.dataset.theme,"dark");
  });
});

describe("the body log, check-ins and vitals",()=>{
  beforeEach(()=>{loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z")]});});
  const at=(d,h,m=0)=>new Date(2026,8,d,h,m).toISOString();

  test("logging the body twice on one day keeps the later entry, and the log stays in date order",()=>{
    store.upsertBodyEntry({at:at(3,7),w:81});store.upsertBodyEntry({at:at(1,7),w:80});store.upsertBodyEntry({at:at(3,20),w:82});
    assert.deepEqual(S.body.map(b=>b.w),[80,82]);
  });

  test("a check-in or vitals entry replaces one from the same local day, not one from just past midnight",()=>{
    store.upsertCheckin({at:at(3,23,30),sleep:2});store.upsertCheckin({at:at(4,0,30),sleep:3});store.upsertCheckin({at:at(4,7),sleep:4});
    assert.deepEqual(S.checkins.map(c=>c.sleep),[2,4]);
    store.upsertVital({at:at(4,7),rhr:55});store.upsertVital({at:at(4,8),rhr:50});
    assert.deepEqual(S.vitals.map(v=>v.rhr),[50]);
  });

  test("today's check-in is found by the local day",t=>{
    t.mock.timers.enable({apis:["Date"],now:new Date(2026,8,4,9).getTime()});
    store.upsertCheckin({at:at(3,23),sleep:2});
    assert.equal(store.todayCheckin(),null);
    store.upsertCheckin({at:at(4,6),sleep:5});
    assert.equal(store.todayCheckin().sleep,5);
  });

  test("saving a weigh-in for a past day lands it on that day and keeps that day's other numbers",t=>{
    t.mock.timers.enable({apis:["Date"],now:new Date(2026,8,10,9).getTime()});
    S.body=[{at:new Date(2026,8,4,12).toISOString(),w:80,waist:86,neck:38}];
    S.bodyDate="2026-09-04";
    const inputs={bodyw:"80.46",body_waist:"86",body_chest:"",body_arm:"-3"};
    const was=globalThis.document;
    globalThis.document=Object.assign({},was,{getElementById:id=>id in inputs?{value:inputs[id]}:null});
    try{data.handle(el({id:"bodysave"}),ctx());}finally{globalThis.document=was;S.bodyDate=null;}
    assert.equal(S.body.length,1);
    assert.equal(model.dateKey(S.body[0].at),"2026-09-04");
    assert.deepEqual([S.body[0].w,S.body[0].waist,S.body[0].chest,S.body[0].arm,S.body[0].neck],[80.5,86,0,0,38]);
  });
});

describe("other choices kept on the device",()=>{
  beforeEach(()=>{loadWith({sessions:[day("a","2026-08-03T09:00:00.000Z",[],{gym:"g1"})],sessionId:"a"});});

  test("reminder days toggle on and off and stay in weekday order",()=>{
    store.setSetting("remindDays","0,2");
    for(const d of ["4","1","2"])data.handle(el({attrs:{"data-remday":d}}),ctx());
    assert.equal(S.settings.remindDays,"0,1,4");
    store.setSetting("remindDays","");data.handle(el({attrs:{"data-remday":"6"}}),ctx());
    assert.equal(S.settings.remindDays,"6");
  });

  test("deleting the chosen gym clears the choice; deleting another leaves it",()=>{
    S.gyms=[{id:"g1",name:"Home"},{id:"g2",name:"Club"}];S.gymId="g1";
    data.handle(el({attrs:{"data-delgym":"g2"}}),ctx());assert.deepEqual([S.gyms.map(g=>g.id),S.gymId],[["g1"],"g1"]);
    data.handle(el({attrs:{"data-delgym":"g1"}}),ctx());assert.deepEqual([S.gyms,S.gymId],[[],""]);
  });

  test("photos chosen to compare are at most the last two, and a deleted photo leaves the comparison",()=>{
    S.photos=["p1","p2","p3"].map(id=>({id,at:"2026-09-01T07:00:00.000Z",data:""}));S.photoCompare=[];
    for(const id of ["p1","p2","p3"])data.handle(el({attrs:{"data-photo":id}}),ctx());
    assert.deepEqual(S.photoCompare,["p2","p3"]);
    data.handle(el({attrs:{"data-photo":"p3"}}),ctx());assert.deepEqual(S.photoCompare,["p2"]);
    data.handle(el({attrs:{"data-delphoto":"p2"}}),ctx());
    assert.deepEqual([S.photos.map(p=>p.id),S.photoCompare],[["p1","p3"],[]]);
  });

  test("an open section of the recovery list is remembered and closes on a second tap",()=>{
    data.handle(el({attrs:{"data-recgroup":"Legs"}}),ctx());data.handle(el({attrs:{"data-recgroup":"Push"}}),ctx());
    data.handle(el({attrs:{"data-recgroup":"Legs"}}),ctx());
    assert.equal(S.settings.recOpen,"Push");
  });
});

describe("the backup nudge",()=>{
  test("days with exercises but no sets are not counted as workouts to protect",()=>{
    loadWith({sessions:["a","b","c"].map((id,i)=>day(id,"2026-09-0"+(i+1)+"T10:00:00.000Z",[ex("Squats",[])]))});
    assert.equal(store.backupDue(Date.parse("2026-10-01T12:00:00.000Z")),false);
  });
  test("Not now quiets it for a week, and backing up clears the snooze",async t=>{
    freeze(t);
    loadWith({sessions:["a","b","c"].map((id,i)=>day(id,"2026-09-0"+(i+1)+"T10:00:00.000Z",[ex("Squats",[set(5,100)])]))});
    data.handle(el({id:"backupsnooze"}),ctx());
    assert.equal(Date.parse(S.backupSnooze)-NOW,7*86400000);
    assert.equal(store.backupDue(NOW+6*86400000),false);
    await backupNow();
    assert.deepEqual([S.backupSnooze,S.backupAt],["",new Date(NOW).toISOString()]);
  });
});
