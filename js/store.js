import {makeSession,normSet,todayLabel} from "./model.js";

const KEY="workout_days_v2";
const LEGACY_KEY="workout_current_v1";
const STORE_VERSION=4;
const DEFAULT_REPS=10;

export const state={sessions:[],sessionId:null,exId:null,
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

function readLegacy(){
  try{
    const raw=localStorage.getItem(LEGACY_KEY);
    if(raw){
      const d=JSON.parse(raw);
      if(d.ex&&d.ex.length){
        const s=makeSession(null);
        s.ex=d.ex;s.title=d.date||todayLabel();
        return [s];
      }
    }
  }catch(e){}
  return null;
}

// Days saved before the workout button existed have no running flag; they read as finished.
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
  else{state.sessions=readLegacy()||[makeSession(null)];}
  state.sessions.forEach(normSession);
  state.mark=(saved&&saved.mark)||null;
  if(!getSession())state.sessionId=state.sessions[0].id;
  const s=getSession();
  state.exId=s.ex.length?s.ex[0].id:null;
}

export function save(){
  try{
    localStorage.setItem(KEY,JSON.stringify(
      {version:STORE_VERSION,sessionId:state.sessionId,sessions:state.sessions,mark:state.mark}));
  }catch(e){}
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
  selectSession(newestFirst(state.sessions)[0].id);
}
