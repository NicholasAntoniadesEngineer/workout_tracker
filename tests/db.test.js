import {test} from "node:test";
import assert from "node:assert/strict";

// A small in-memory IndexedDB: enough of open/transaction/objectStore for db.js.
function fakeIndexedDB(){
  const data=new Map();
  const req=(fn)=>{const r={};setTimeout(()=>{try{r.result=fn();r.onsuccess&&r.onsuccess();}catch(e){r.error=e;r.onerror&&r.onerror();}},0);return r;};
  const store={getAllKeys:()=>({result:[...data.keys()]}),getAll:()=>({result:[...data.values()]}),
    put:(v,k)=>{data.set(k,v);return {};},delete:k=>{data.delete(k);return {};}};
  const dbObj={transaction:()=>{const t={objectStore:()=>store};setTimeout(()=>t.oncomplete&&t.oncomplete(),0);return t;},
    createObjectStore:()=>{}};
  return {open:()=>{const r=req(()=>dbObj);setTimeout(()=>r.onupgradeneeded&&r.onupgradeneeded(),0);return r;},data};
}
const memory=new Map();
globalThis.localStorage={getItem:k=>(memory.has(k)?memory.get(k):null),setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
globalThis.document={};
const idb=fakeIndexedDB();
globalThis.indexedDB=idb;

test("the old localStorage document moves into the database once, and later saves go to the database", async () => {
  memory.set("workout_days_v2",'{"sessions":[{"id":"old"}]}');
  const db=await import("../js/db.js");
  await db.init();
  assert.equal(db.backend,"indexeddb");
  assert.equal(db.getItem("workout_days_v2"),'{"sessions":[{"id":"old"}]}');
  assert.equal(idb.data.get("workout_days_v2"),'{"sessions":[{"id":"old"}]}');
  db.setItem("workout_days_v2",'{"sessions":[{"id":"new"}]}');
  assert.equal(db.getItem("workout_days_v2"),'{"sessions":[{"id":"new"}]}');
  await db.flush();await new Promise(r=>setTimeout(r,5));
  assert.equal(idb.data.get("workout_days_v2"),'{"sessions":[{"id":"new"}]}');
  assert.equal(memory.get("workout_days_v2"),'{"sessions":[{"id":"old"}]}',"the old copy is left as a safety net");
  db.removeItem("kk_cardio");await db.flush();await new Promise(r=>setTimeout(r,5));
  assert.equal(idb.data.has("kk_cardio"),false);
  const u=await db.usage();
  assert.ok(u.used>20);assert.equal(u.backend,"indexeddb");
});
