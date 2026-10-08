// Where the data lives when things go wrong: no IndexedDB at all, a database that won't open,
// a write that fails or is aborted, and a burst of saves. Each test loads its own copy of
// db.js, since the module keeps its state for the life of the page.
import {test,describe} from "node:test";
import assert from "node:assert/strict";

const KEY="workout_days_v2";
const memory=new Map();
let lsBroken=false;
Object.defineProperty(globalThis,"localStorage",{configurable:true,writable:true,value:{
  getItem:k=>{if(lsBroken)throw new Error("SecurityError");return memory.has(k)?memory.get(k):null;},
  setItem:(k,v)=>{if(lsBroken)throw new Error("QuotaExceededError");memory.set(k,String(v));},
  removeItem:k=>{memory.delete(k);},
}});
// db.js tells the app's other windows when it saves. Leave that out, so the copies of it this
// file loads never hear each other.
Object.defineProperty(globalThis,"BroadcastChannel",{configurable:true,writable:true,value:undefined});

let copies=0;
const freshDb=()=>import("../js/db.js?copy="+(++copies));
const settle=()=>new Promise(r=>setImmediate(r));

// A small IndexedDB whose opening and writing can be told to fail. Writes land only when a
// transaction completes; "error" fails it, "abort" aborts it the way a full disk does.
function fakeIDB({open="ok",write="ok"}={}){
  const data=new Map(),f={data,open,write,commits:0};
  const conn={createObjectStore(){},transaction:(name,mode)=>{
    const staged=[],t={error:null,objectStore:()=>({
      getAllKeys:()=>({result:[...data.keys()]}),getAll:()=>({result:[...data.values()]}),
      put:(v,k)=>{staged.push(()=>data.set(k,v));return {};},delete:k=>{staged.push(()=>data.delete(k));return {};}})};
    queueMicrotask(()=>{const how=mode==="readwrite"?f.write:"ok";
      if(how==="ok"){staged.forEach(s=>s());if(mode==="readwrite")f.commits++;t.oncomplete&&t.oncomplete();}
      else if(how==="error"){t.error=new Error("write failed");t.onerror&&t.onerror();}
      else{t.error=new Error("QuotaExceededError");t.onabort&&t.onabort();}});
    return t;}};
  f.open=()=>{const r={};queueMicrotask(()=>{
    if(f.openMode==="error"){r.error=new Error("open failed");r.onerror&&r.onerror();}
    else if(f.openMode==="blocked"){r.onblocked&&r.onblocked();}
    else{r.result=conn;r.onupgradeneeded&&r.onupgradeneeded();r.onsuccess&&r.onsuccess();}});return r;};
  f.openMode=open;
  return f;
}
// A clean device with this database: nothing left in localStorage to move across.
const useIDB=(f,keepLs)=>{if(!keepLs)memory.clear();globalThis.indexedDB=f;};
const noIDB=()=>{delete globalThis.indexedDB;};

describe("without IndexedDB",()=>{
  test("the document is read from localStorage, and each save is written straight back",async()=>{
    noIDB();memory.clear();memory.set(KEY,'{"sessions":[1]}');
    const db=await freshDb();await db.init();
    assert.equal(db.backend,"localstorage");
    assert.equal(db.getItem(KEY),'{"sessions":[1]}');
    db.setItem(KEY,'{"sessions":[2]}');assert.equal(memory.get(KEY),'{"sessions":[2]}');
    db.setItem("kk_other","x");db.removeItem("kk_other");assert.equal(memory.has("kk_other"),false);
    await db.flush();
    const u=await db.usage();
    assert.deepEqual([u.used,u.backend,u.ready],[16,"localstorage",true]);
  });

  test("before it is ready, reads and writes already go to localStorage",async()=>{
    noIDB();memory.clear();memory.set(KEY,"early");
    const db=await freshDb();
    assert.equal(db.getItem(KEY),"early");db.setItem(KEY,"later");assert.equal(memory.get(KEY),"later");
  });

  test("storage the browser refuses to read (a locked-down private window) reads as nothing rather than failing",async()=>{
    noIDB();lsBroken=true;
    try{const db=await freshDb();await db.init();assert.equal(db.getItem(KEY),null);}
    finally{lsBroken=false;}
  });

  test("a save that doesn't fit throws, so the app can say storage is full",async()=>{
    noIDB();
    const db=await freshDb();await db.init();
    lsBroken=true;
    try{assert.throws(()=>db.setItem(KEY,"too big"),/Quota/);}finally{lsBroken=false;}
  });
});

describe("with IndexedDB",()=>{
  test("a database that won't open, or is blocked by another tab, falls back to localStorage",async()=>{
    for(const open of ["error","blocked"]){
      memory.clear();memory.set(KEY,"from ls");useIDB(fakeIDB({open}),true);
      const db=await freshDb();await db.init();
      assert.equal(db.backend,"localstorage",open);assert.equal(db.getItem(KEY),"from ls",open);
    }
    noIDB();
  });

  test("a database that already holds the document ignores the older localStorage copy",async()=>{
    memory.clear();memory.set(KEY,"old");const f=fakeIDB();f.data.set(KEY,"newer");useIDB(f,true);
    const db=await freshDb();await db.init();
    assert.equal(db.getItem(KEY),"newer");assert.equal(memory.get(KEY),"old");
    noIDB();
  });

  test("a burst of saves becomes one write of the latest, a moment later",async t=>{
    t.mock.timers.enable({apis:["setTimeout"]});
    const f=fakeIDB();useIDB(f);
    const db=await freshDb();await db.init();const before=f.commits;
    db.setItem(KEY,"a");db.setItem(KEY,"b");db.setItem(KEY,"c");
    assert.equal(f.data.get(KEY),undefined,"nothing is written straight away");
    t.mock.timers.tick(150);await settle();
    assert.deepEqual([f.data.get(KEY),f.commits-before],["c",1]);
    noIDB();
  });

  test("a failed write is tried again, and a newer save made meanwhile is not overwritten by the older one",async t=>{
    t.mock.timers.enable({apis:["setTimeout"]});
    const f=fakeIDB();useIDB(f);
    const db=await freshDb();await db.init();
    f.write="error";db.setItem(KEY,"first");db.setItem("kk_x","x");
    await db.flush();assert.equal(f.data.has(KEY),false);
    db.setItem(KEY,"second");f.write="ok";
    t.mock.timers.tick(2000);await settle();await settle();
    assert.deepEqual([f.data.get(KEY),f.data.get("kk_x")],["second","x"]);
    noIDB();
  });

  test("a write the browser aborts, as it does when the disk is full, is tried again rather than dropped",async t=>{
    t.mock.timers.enable({apis:["setTimeout"]});
    const f=fakeIDB();useIDB(f);
    const db=await freshDb();await db.init();
    f.write="abort";db.setItem(KEY,"the last set");
    await Promise.race([db.flush(),settle()]);
    f.write="ok";t.mock.timers.tick(2000);await db.flush();await settle();
    assert.equal(f.data.get(KEY),"the last set");
    noIDB();
  });

  test("removing a key deletes it from the database on the next write",async()=>{
    const f=fakeIDB();f.data.set("kk_cardio","run");useIDB(f);
    const db=await freshDb();await db.init();
    assert.equal(db.getItem("kk_cardio"),"run");
    db.removeItem("kk_cardio");assert.equal(db.getItem("kk_cardio"),null);
    await db.flush();await settle();
    assert.equal(f.data.has("kk_cardio"),false);
    noIDB();
  });
});
