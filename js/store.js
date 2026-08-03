import {SEED_EXERCISES,makeExercise,makeSession,normSet} from "./model.js";

const KEY="workout_days_v2";
const STORE_VERSION=5;
const DEFAULT_REPS=10;

export const state={sessions:[],sessionId:null,exId:null,catalog:[],
  reps:DEFAULT_REPS,perSide:false,mark:null,editing:null,adding:false,manage:false,view:"log"};

export function getSession(){
  return state.sessions.find(s=>s.id===state.sessionId)||null;
}

export function activeEx(){
  const s=getSession();
  if(!s)return null;
  return s.ex.find(e=>e.id===state.exId)||s.ex[0]||null;
}

function readSaved(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){const d=JSON.parse(raw);if(d.sessions&&d.sessions.length)return d;}
  }catch(e){}
  return null;
}

const key=n=>String(n||"").trim().toLowerCase();

// The picker offers the seeds plus every exercise name that has ever been used, so a
// name survives being dropped from a day.
function buildCatalog(saved){
  const seen={},out=[];
  const add=n=>{const k=key(n);if(k&&!seen[k]){seen[k]=true;out.push(String(n).trim());}};
  ((saved&&saved.catalog)||SEED_EXERCISES).forEach(add);
  state.sessions.forEach(s=>s.ex.forEach(e=>add(e.name)));
  return out;
}

export function inCatalog(name){
  return state.catalog.some(n=>key(n)===key(name));
}

export function addToCatalog(name){
  if(key(name)&&!inCatalog(name))state.catalog.push(String(name).trim());
}

export function removeFromCatalog(name){
  state.catalog=state.catalog.filter(n=>key(n)!==key(name));
}

function normSession(s){
  s.started=s.started||"";
  s.ended=s.ended||"";
  s.running=!!s.running;
  s.ex.forEach(e=>{e.sets=(e.sets||[]).map(normSet);});
  return s;
}

export function load(){
  const saved=readSaved();
  if(saved){state.sessions=saved.sessions;state.sessionId=saved.sessionId||saved.sessions[0].id;}
  else{state.sessions=[makeSession()];}
  state.sessions.forEach(normSession);
  state.mark=(saved&&saved.mark)||null;
  if(!getSession())state.sessionId=state.sessions[0].id;
  state.catalog=buildCatalog(saved);
  const s=getSession();
  state.exId=s.ex.length?s.ex[0].id:null;
}

export function save(){
  try{
    localStorage.setItem(KEY,JSON.stringify(
      {version:STORE_VERSION,sessionId:state.sessionId,sessions:state.sessions,
        catalog:state.catalog,mark:state.mark}));
  }catch(e){}
}

// Adds a name to the day (and to the picker if it is new), and selects it.
export function addExerciseToDay(name){
  const s=getSession();
  if(!s||!key(name))return null;
  addToCatalog(name);
  let e=s.ex.find(x=>key(x.name)===key(name));
  if(!e){e=makeExercise(String(name).trim());s.ex.push(e);}
  state.exId=e.id;
  return e;
}

export function newestFirst(sessions){
  return sessions.slice().sort((a,b)=>(b.created||"").localeCompare(a.created||""));
}

export function selectSession(id){
  state.sessionId=id;
  const s=getSession();
  state.exId=s.ex[0]?s.ex[0].id:null;
  state.editing=null;
  state.mark=null;
}

// Days sharing a created stamp are replaced, not duplicated.
export function mergeSessions(imported){
  const seen={};
  imported.forEach(s=>{seen[s.created]=true;});
  state.sessions=state.sessions.filter(s=>!seen[s.created]).concat(imported);
  imported.forEach(s=>s.ex.forEach(e=>addToCatalog(e.name)));
  selectSession(newestFirst(state.sessions)[0].id);
}
