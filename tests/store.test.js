import {test,describe,beforeEach} from "node:test";
import assert from "node:assert/strict";

// store.js reads and writes localStorage and sets the theme on <html>. Give it just enough of
// a browser before it loads: an in-memory localStorage and a bare documentElement.
const memory=new Map();
Object.defineProperty(globalThis,"localStorage",{configurable:true,writable:true,value:{
  getItem:k=>(memory.has(k)?memory.get(k):null),
  setItem:(k,v)=>{memory.set(k,String(v));},
  removeItem:k=>{memory.delete(k);},
  clear:()=>{memory.clear();}
}});
globalThis.document={documentElement:{dataset:{}}};

const STORE_KEY="workout_days_v2";
const model=await import("../js/model.js");
const store=await import("../js/store.js");

const set=(r,w=0)=>({r,side:false,w,t:0,rest:0,at:"",wu:false,band:""});
const day=(id,created,ex=[])=>({id,title:id,created,started:"",ended:"",running:false,timerFrom:"",ex});
const ex=(name,sets=[set(10)])=>({id:"e-"+name,name,sets});

// Loads the app as if this had been saved on the device.
function loadWith(saved){
  memory.clear();
  memory.set(STORE_KEY,JSON.stringify(Object.assign({sessions:[day("d1","2026-01-01T10:00:00.000Z")]},saved)));
  store.load();
}
const lower=list=>list.map(n=>n.toLowerCase());

describe("load: the exercise catalog",()=>{
  test("starts a fresh install with exactly the seed exercises",()=>{
    memory.clear();
    store.load();
    assert.deepEqual(store.state.catalog,model.SEED_EXERCISES);
  });

  test("drops a retired name that was never trained",()=>{
    loadWith({catalog:["Lunges","Squats"],seeded:model.SEED_EXERCISES});
    assert.ok(!lower(store.state.catalog).includes("lunges"));
    assert.ok(store.state.catalog.includes("Squats"));
  });

  test("keeps a retired name that appears in history",()=>{
    loadWith({catalog:["Lunges","Squats"],seeded:model.SEED_EXERCISES,
      sessions:[day("d1","2026-01-01T10:00:00.000Z",[ex("Lunges")])]});
    assert.ok(store.state.catalog.includes("Lunges"));
  });

  test("offers a seed added since the device last saved",()=>{
    const newer="Tibialis raises";
    loadWith({catalog:["Squats"],seeded:model.SEED_EXERCISES.filter(n=>n!==newer)});
    assert.ok(store.state.catalog.includes(newer));
  });

  test("does not bring back a seed already offered and since deleted",()=>{
    loadWith({catalog:["Squats"],seeded:model.SEED_EXERCISES});
    assert.ok(!store.state.catalog.includes("Deadlift"));
  });

  test("adds names from history that are not in the saved list",()=>{
    loadWith({catalog:["Squats"],seeded:model.SEED_EXERCISES,
      sessions:[day("d1","2026-01-01T10:00:00.000Z",[ex("Zercher carry")])]});
    assert.deepEqual(store.state.catalog,["Squats","Zercher carry"]);
  });

  test("keeps a removed name out even when it is in history",()=>{
    loadWith({catalog:["Squats"],seeded:model.SEED_EXERCISES,removed:["zercher carry"],
      sessions:[day("d1","2026-01-01T10:00:00.000Z",[ex("Zercher carry")])]});
    assert.deepEqual(store.state.catalog,["Squats"]);
  });

  test("lists each name once regardless of case",()=>{
    loadWith({catalog:["Squats","squats "],seeded:model.SEED_EXERCISES,
      sessions:[day("d1","2026-01-01T10:00:00.000Z",[ex("SQUATS")])]});
    assert.deepEqual(store.state.catalog,["Squats"]);
  });
});

describe("routines",()=>{
  const BUILTINS=model.BUILTIN_ROUTINES;
const BUILTIN=model.BUILTIN_ROUTINES[0];
  beforeEach(()=>{loadWith({});});

  test("saveRoutine stores a trimmed name and a copy of the list",()=>{
    const list=["Dips"];
    const r=store.saveRoutine("  Push  ",list);
    list.push("Bench press");
    assert.equal(r.name,"Push");
    assert.deepEqual(store.state.routines.map(x=>x.ex),[["Dips"]]);
  });

  test("saveRoutine replaces a routine with the same name, ignoring case",()=>{
    store.saveRoutine("Push",["Dips"]);
    store.saveRoutine("push",["Bench press","Dips"]);
    assert.equal(store.state.routines.length,1);
    assert.deepEqual(store.state.routines[0].ex,["Bench press","Dips"]);
  });

  test("saveRoutine refuses an empty name or an empty list",()=>{
    assert.equal(store.saveRoutine("  ",["Dips"]),null);
    assert.equal(store.saveRoutine("Push",[]),null);
    assert.equal(store.state.routines.length,0);
  });

  test("allRoutines lists the built-ins first, marked as built-in",()=>{
    store.saveRoutine("Push",["Dips"]);
    const all=store.allRoutines();
    assert.deepEqual(all.map(r=>r.name),BUILTINS.map(b=>b.name).concat(["Push"]));
    assert.equal(all[0].builtin,true);
    assert.equal(all[0].id,"b-legs-back-biceps");
    assert.deepEqual(all[0].ex,BUILTIN.ex);
  });

  test("allRoutines hands out a copy of a built-in's list",()=>{
    store.allRoutines()[0].ex.push("Dips");
    assert.ok(!BUILTIN.ex.includes("Dips"));
  });

  test("a saved routine with a built-in's name takes its place",()=>{
    store.saveRoutine(BUILTIN.name.toUpperCase(),["Squats"]);
    const all=store.allRoutines();
    assert.equal(all.length,BUILTINS.length);
    const mine=all.find(r=>r.name.toLowerCase()===BUILTIN.name.toLowerCase());
    assert.equal(mine.builtin,undefined);
    assert.deepEqual(mine.ex,["Squats"]);
  });

  test("allRoutines leaves out hidden built-ins",()=>{
    loadWith({hiddenRoutines:BUILTINS.map(b=>b.name.toLowerCase())});
    assert.deepEqual(store.allRoutines(),[]);
  });

  test("dropping a built-in hides it rather than deleting anything",()=>{
    store.saveRoutine("Push",["Dips"]);
    store.dropRoutine(store.allRoutines()[0]);
    assert.deepEqual(store.state.hiddenRoutines,[BUILTIN.name]);
    assert.deepEqual(store.allRoutines().map(r=>r.name),BUILTINS.slice(1).map(b=>b.name).concat(["Push"]));
  });

  test("dropping a built-in twice hides it once",()=>{
    const b=store.allRoutines()[0];
    store.dropRoutine(b);
    store.dropRoutine(b);
    assert.equal(store.state.hiddenRoutines.length,1);
  });

  test("dropping your own routine deletes it",()=>{
    const r=store.saveRoutine("Push",["Dips"]);
    store.dropRoutine(r);
    assert.deepEqual(store.state.routines,[]);
    assert.deepEqual(store.state.hiddenRoutines,[]);
  });

  test("findRoutine finds built-ins and saved routines by id",()=>{
    const r=store.saveRoutine("Push",["Dips"]);
    assert.equal(store.findRoutine(r.id).name,"Push");
    assert.equal(store.findRoutine("b-legs-back-biceps").builtin,true);
    assert.equal(store.findRoutine("nope"),null);
  });
});

describe("importBackup",()=>{
  beforeEach(()=>{
    loadWith({sessions:[day("d1","2026-01-01T10:00:00.000Z",[ex("Squats")])],
      routines:[{id:"r1",name:"Push",ex:["Dips"]}],hiddenRoutines:["Old plan"]});
  });

  test("merges routines, replacing one with the same name",()=>{
    store.importBackup({routines:[{name:"push",ex:["Bench press"]},{name:"Pull",ex:["Pull ups"]}]});
    assert.deepEqual(store.state.routines.map(r=>[r.name,r.ex]),
      [["push",["Bench press"]],["Pull",["Pull ups"]]]);
  });

  test("merges hidden routines without duplicating, ignoring case",()=>{
    store.importBackup({hiddenRoutines:["old PLAN","Legs, Back & Biceps"]});
    assert.deepEqual(store.state.hiddenRoutines,["Old plan","Legs, Back & Biceps"]);
  });

  test("leaves sessions untouched when the backup has none",()=>{
    const before=store.state.sessions;
    const count=store.importBackup({routines:[{name:"Pull",ex:["Pull ups"]}]});
    assert.equal(count,0);
    assert.equal(store.state.sessions,before);
    assert.deepEqual(store.state.sessions.map(s=>s.id),["d1"]);
  });

  test("skips malformed routines",()=>{
    store.importBackup({routines:[null,{name:"No list"},{ex:["Dips"]},{name:"Ok",ex:["Dips"]}]});
    assert.deepEqual(store.state.routines.map(r=>r.name),["Push","Ok"]);
  });

  test("re-importing routines that already exist keeps their ids distinct",
    t=>{
      t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-01-01T10:00:00.000Z")});
      store.saveRoutine("Pull",["Pull ups"]);
      store.importBackup({routines:[{name:"Push",ex:["Dips"]},{name:"Pull",ex:["Pull ups"]}]});
      const ids=store.state.routines.map(r=>r.id);
      assert.equal(new Set(ids).size,ids.length,"ids: "+ids.join(", "));
    });
});

describe("lastPerformance",()=>{
  const older=day("old","2026-01-05T10:00:00.000Z",[ex("Squats",[set(5,100)])]);
  const oldest=day("oldest","2026-01-01T10:00:00.000Z",[ex("Squats",[set(5,90)])]);
  const current=day("cur","2026-01-10T10:00:00.000Z",[ex("Squats",[set(5,110)])]);
  const later=day("later","2026-01-12T10:00:00.000Z",[ex("Squats",[set(5,120)])]);

  test("returns the most recent earlier day, skipping the open one",()=>{
    loadWith({sessions:[oldest,older,current],sessionId:"cur"});
    const hit=store.lastPerformance("Squats");
    assert.equal(hit.session.id,"old");
    assert.equal(hit.ex.sets[0].w,100);
  });

  test("ignores days logged after the open one",()=>{
    loadWith({sessions:[older,current,later],sessionId:"cur"});
    assert.equal(store.lastPerformance("Squats").session.id,"old");
  });

  test("matches names regardless of case and whitespace",()=>{
    loadWith({sessions:[older,current],sessionId:"cur"});
    assert.equal(store.lastPerformance("  squats ").session.id,"old");
  });

  test("skips a day where the exercise was added but never logged",()=>{
    const empty=day("empty","2026-01-08T10:00:00.000Z",[ex("Squats",[])]);
    loadWith({sessions:[older,empty,current],sessionId:"cur"});
    assert.equal(store.lastPerformance("Squats").session.id,"old");
  });

  test("returns null when there is no earlier day or no name",()=>{
    loadWith({sessions:[current],sessionId:"cur"});
    assert.equal(store.lastPerformance("Squats"),null);
    assert.equal(store.lastPerformance(""),null);
  });
});

describe("backupDue",()=>{
  const done=(id,created)=>day(id,created,[ex("Squats",[set(10,60)])]);
  const now=Date.parse("2026-10-01T12:00:00.000Z");
  test("waits until there are a few workouts worth protecting",()=>{
    loadWith({sessions:[done("a","2026-09-01T10:00:00.000Z"),done("b","2026-09-02T10:00:00.000Z")]});
    assert.equal(store.backupDue(now),false);
  });
  test("asks once three workouts exist and nothing has been saved",()=>{
    loadWith({sessions:["a","b","c"].map((id,i)=>done(id,"2026-09-0"+(i+1)+"T10:00:00.000Z"))});
    assert.equal(store.backupDue(now),true);
  });
  test("stays quiet for three weeks after a backup, and while nothing new was logged",()=>{
    const sessions=["a","b","c"].map((id,i)=>done(id,"2026-09-0"+(i+1)+"T10:00:00.000Z"));
    loadWith({sessions,backupAt:"2026-09-25T10:00:00.000Z"});
    assert.equal(store.backupDue(now),false);
    loadWith({sessions,backupAt:"2026-09-05T10:00:00.000Z"});
    assert.equal(store.backupDue(now),false,"no workout since the backup");
    loadWith({sessions:sessions.concat([done("d","2026-09-20T10:00:00.000Z")]),backupAt:"2026-09-05T10:00:00.000Z"});
    assert.equal(store.backupDue(now),true);
  });
  test("Not now quiets it until the snooze passes",()=>{
    loadWith({sessions:["a","b","c"].map((id,i)=>done(id,"2026-09-0"+(i+1)+"T10:00:00.000Z")),
      backupSnooze:"2026-10-05T00:00:00.000Z"});
    assert.equal(store.backupDue(now),false);
    assert.equal(store.backupDue(Date.parse("2026-10-06T00:00:00.000Z")),true);
  });
});

describe("restTargetFor and repRange",()=>{
  test("rest follows the last exercise's own target, else the default",()=>{
    const s=day("d1","2026-09-01T10:00:00.000Z",[
      ex("Deadlift",[Object.assign(set(5,140),{at:"2026-09-01T10:05:00.000Z"})]),
      ex("Curl",[Object.assign(set(12,15),{at:"2026-09-01T10:10:00.000Z"})])]);
    loadWith({sessions:[s],sessionId:"d1",restTargets:{deadlift:180},settings:{restTarget:60}});
    assert.equal(store.restTargetFor(s),60,"curl was last and has no target of its own");
    s.ex[0].sets[0].at="2026-09-01T10:20:00.000Z";
    assert.equal(store.restTargetFor(s),180);
  });
  test("repRange reads the setting, defaulting to 10–15",()=>{
    loadWith({});
    assert.deepEqual(store.repRange(),{low:10,top:15});
    loadWith({settings:{progressRange:"10-14"}});
    assert.deepEqual(store.repRange(),{low:10,top:14});
  });
});

describe("routines with a plan",()=>{
  test("saving a day keeps its working sets as targets, and a routine without a plan still works",()=>{
    loadWith({});
    const d=day("p","2026-02-01T10:00:00.000Z",[ex("Squats",[set(8,60),set(5,100),set(5,100)])]);
    d.ex[0].sets[0].wu=true;
    const r=store.saveRoutine("Legs",["Squats"],store.planOf(d));
    assert.deepEqual(store.planFor(r,"squats"),[{r:5,w:100,rest:0},{r:5,w:100,rest:0}]);
    assert.equal(store.planLine(store.planFor(r,"Squats"),"kg"),"2 × 5 @ 100 kg");
    assert.equal(store.planLine([{r:8,w:60},{r:8,w:60},{r:6,w:60}],"kg"),"8, 8, 6 @ 60 kg");
    assert.equal(store.planFor(store.saveRoutine("Plain",["Dips"]),"Dips"),null);
  });
});
