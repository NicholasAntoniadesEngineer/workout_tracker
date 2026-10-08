// Where the data lives. The app keeps everything in one JSON document. It used to sit in
// localStorage, which holds about 5 MB: five years of lifting and running is more than that, and
// one progress photo is a tenth of it. Now the document lives in IndexedDB, which an installed
// app can grow to a large share of the disk, and which Safari does not wipe after a week away.
//
// load() is synchronous, so the document is read here first, before the app starts, and handed
// over through a small in-memory cache that reads like the old storage. Writes go to IndexedDB
// a moment after each save (one write per burst of edits). The old localStorage copy is left
// in place after the one-time move, as a safety net for anyone on an older version.
const DB="kingskiln",STORE="kv",KEY="workout_days_v2";
const cache=new Map();
let db=null,timer=null,pending=new Map(),ready=false;
export let backend="memory";
// Whether writes are failing (the phone out of space, most often), and who to tell when that
// changes: the app says so rather than quietly not saving, and the warning goes once a retry lands.
export let writeFailed=false;
const watchers=[];
export function onWriteState(fn){watchers.push(fn);}
function tell(v){if(v===writeFailed)return;writeFailed=v;watchers.forEach(f=>{try{f(v);}catch(e){}});}

// Two windows of the app (a laptop's tabs, say): each says when it has saved, and one with no
// edits of its own waiting reads the document again, so it can never later write older data
// over what the other saved. One with edits waiting keeps them: its save is the newer.
const chan=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("kingskiln"):null;
if(chan&&chan.unref)chan.unref();          // (in Node, where the tests run, don't keep it alive)
const me=Math.random().toString(36).slice(2);
const outside=[];
export function onOutsideChange(fn){outside.push(fn);}
function changed(v){if(typeof v!=="string"||v===cache.get(KEY))return;cache.set(KEY,v);outside.forEach(f=>{try{f();}catch(e){}});}
if(chan)chan.onmessage=async ev=>{
  const m=ev.data||{};if(m.type!=="saved"||m.from===me||backend!=="indexeddb"||pending.size)return;
  try{changed(await tx("readonly",s=>s.get(KEY)));}catch(e){}
};
if(typeof window!=="undefined"&&window.addEventListener)window.addEventListener("storage",e=>{if(backend==="localstorage"&&e.key===KEY)changed(e.newValue);});

const open=()=>new Promise((res,rej)=>{
  if(typeof indexedDB==="undefined"){rej(new Error("no indexedDB"));return;}
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{r.result.createObjectStore(STORE);};
  r.onsuccess=()=>res(r.result);
  r.onerror=()=>rej(r.error);
  r.onblocked=()=>rej(new Error("blocked"));
});
const tx=(mode,fn)=>new Promise((res,rej)=>{
  const t=db.transaction(STORE,mode),s=t.objectStore(STORE),out=fn(s);
  t.oncomplete=()=>res(out&&out.result);
  t.onerror=()=>rej(t.error);
  // A full disk aborts the transaction rather than erroring it; that's a failed write too.
  t.onabort=()=>rej(t.error||new Error("aborted"));
});

// Read everything once, moving the old localStorage document across the first time.
export async function init(){
  try{
    db=await open();
    const keys=await tx("readonly",s=>s.getAllKeys());
    const vals=await tx("readonly",s=>s.getAll());
    keys.forEach((k,i)=>cache.set(k,vals[i]));
    backend="indexeddb";
    if(!cache.has(KEY)){
      let old=null;
      try{old=localStorage.getItem(KEY);}catch(e){}
      if(old){cache.set(KEY,old);await tx("readwrite",s=>s.put(old,KEY));}
    }
  }catch(e){
    // No IndexedDB (a private window on an old browser): fall back to localStorage as before.
    backend="localstorage";
    try{const old=localStorage.getItem(KEY);if(old)cache.set(KEY,old);}catch(e2){}
  }
  ready=true;
}

export function getItem(k){
  if(cache.has(k))return cache.get(k);
  if(backend!=="indexeddb"){try{return localStorage.getItem(k);}catch(e){return null;}}
  return null;
}
export function setItem(k,v){
  cache.set(k,v);
  if(backend==="indexeddb"){pending.set(k,v);if(!timer)timer=setTimeout(flush,150);}
  else{try{localStorage.setItem(k,v);}catch(e){throw e;}}
}
export function removeItem(k){
  cache.delete(k);
  if(backend==="indexeddb"){pending.set(k,null);if(!timer)timer=setTimeout(flush,150);}
  else{try{localStorage.removeItem(k);}catch(e){}}
}
// Write what has changed since the last flush. Failures leave the keys pending for the next one.
export async function flush(){
  timer=null;
  if(backend!=="indexeddb"||!pending.size)return;
  const batch=pending;pending=new Map();
  try{await tx("readwrite",s=>{batch.forEach((v,k)=>{if(v==null)s.delete(k);else s.put(v,k);});});tell(false);if(chan)chan.postMessage({type:"saved",from:me});}
  catch(e){batch.forEach((v,k)=>{if(!pending.has(k))pending.set(k,v);});tell(true);if(!timer)timer=setTimeout(flush,2000);}
}
// Flush before the page goes away, so a quick close never loses the last set.
if(typeof document!=="undefined"&&document.addEventListener)document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flush();});
if(typeof window!=="undefined"&&window.addEventListener)window.addEventListener("pagehide",()=>{flush();});

// How much is stored and how much room there is, for the You screen.
export async function usage(){
  const doc=cache.get(KEY)||"";
  const used=new Blob([doc]).size;
  let quota=0,total=used;
  try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();quota=e.quota||0;total=e.usage||used;}}catch(e){}
  return {used,total,quota,backend,ready};
}
