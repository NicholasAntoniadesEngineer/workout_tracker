import {SEED_EXERCISES,makeExercise,makeSession,normSet,options} from "./model.js";

const KEY="workout_days_v2";
const STORE_VERSION=6;
const DEFAULT_REPS=10;
const SEC_PER_MIN=60;

export const DEFAULTS={theme:"system",textScale:0,perSideDouble:true,
  startReps:DEFAULT_REPS,idleEndMinutes:60,showSetTimes:true,unit:"kg"};

export const state={sessions:[],sessionId:null,exId:null,catalog:[],removed:[],
  settings:Object.assign({},DEFAULTS),
  reps:DEFAULT_REPS,perSide:false,weight:0,lastWeight:10,setStart:null,editing:null,
  adding:false,focusAdd:false,manage:false,view:"log"};

// Settings that change how numbers are counted live in the model, so it can stay pure.
export function applySettings(){
  const s=state.settings;
  document.documentElement.dataset.theme=s.theme==="system"?"":s.theme;
  options.perSideDouble=!!s.perSideDouble;
  options.idleEndSeconds=Math.max(0,(+s.idleEndMinutes||0))*SEC_PER_MIN;
}

export function setSetting(key,value){
  state.settings[key]=value;
  applySettings();
}

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
// name survives being dropped from a day. A built-in added after this device first ran
// is offered once — `seeded` records which have been, so deleting one makes it stay gone.
function buildCatalog(saved){
  const seen={},out=[];
  const gone=state.removed.map(key);
  const add=n=>{
    const k=key(n);
    if(k&&!seen[k]&&gone.indexOf(k)<0){seen[k]=true;out.push(String(n).trim());}
  };
  const offered=(saved&&saved.seeded)||[];
  ((saved&&saved.catalog)||SEED_EXERCISES).forEach(add);
  SEED_EXERCISES.filter(n=>!offered.some(o=>key(o)===key(n))).forEach(add);
  state.sessions.forEach(s=>s.ex.forEach(e=>add(e.name)));
  return out;
}

export function inCatalog(name){
  return state.catalog.some(n=>key(n)===key(name));
}

export function addToCatalog(name){
  state.removed=state.removed.filter(n=>key(n)!==key(name));
  if(key(name)&&!inCatalog(name))state.catalog.push(String(name).trim());
}

// Remembered, because the picker gathers names from history too — without this, deleting
// one you have already trained would put it straight back on the next load.
export function removeFromCatalog(name){
  state.catalog=state.catalog.filter(n=>key(n)!==key(name));
  if(key(name)&&!state.removed.some(n=>key(n)===key(name)))
    state.removed.push(String(name).trim());
}

function normSession(s){
  s.started=s.started||"";
  s.ended=s.ended||"";
  s.timerFrom=s.timerFrom||"";
  s.running=!!s.running;
  s.ex.forEach(e=>{e.sets=(e.sets||[]).map(normSet);});
  return s;
}

export function load(){
  const saved=readSaved();
  if(saved){state.sessions=saved.sessions;state.sessionId=saved.sessionId||saved.sessions[0].id;}
  else{state.sessions=[makeSession()];}
  state.sessions.forEach(normSession);
  state.setStart=(saved&&saved.setStart)||null;
  if(!getSession())state.sessionId=state.sessions[0].id;
  state.removed=(saved&&saved.removed)||[];
  state.catalog=buildCatalog(saved);
  state.settings=Object.assign({},DEFAULTS,(saved&&saved.settings)||{});
  applySettings();
  state.reps=state.settings.startReps;
  const s=getSession();
  state.exId=s.ex.length?s.ex[0].id:null;
}

export function save(){
  try{
    localStorage.setItem(KEY,JSON.stringify(
      {version:STORE_VERSION,sessionId:state.sessionId,sessions:state.sessions,
        catalog:state.catalog,removed:state.removed,seeded:SEED_EXERCISES,settings:state.settings,
        setStart:state.setStart}));
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
  state.setStart=null;
}

// Days sharing a created stamp are replaced, not duplicated.
export function mergeSessions(imported){
  const seen={};
  imported.forEach(s=>{seen[s.created]=true;});
  state.sessions=state.sessions.filter(s=>!seen[s.created]).concat(imported);
  imported.forEach(s=>s.ex.forEach(e=>addToCatalog(e.name)));
  selectSession(newestFirst(state.sessions)[0].id);
}
