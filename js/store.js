import {SEED_EXERCISES,makeSession,normSet,uid} from "./model.js";

const KEY="workout_days_v2";
const STORE_VERSION=5;
const DEFAULT_REPS=10;
// Bump to push newly added default exercises into the current day, once.
const SEED_STAMP=1;

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

// New days copy the previous day's exercises, so a new default would otherwise never
// reach a device that already has history. Add the missing ones once, to today only.
function topUpSeeds(session,stamp){
  if(!session||stamp>=SEED_STAMP)return;
  const have={};
  session.ex.forEach(e=>{have[e.name.trim().toLowerCase()]=true;});
  SEED_EXERCISES.forEach(n=>{
    if(!have[n.toLowerCase()])session.ex.push({id:uid(),name:n,sets:[]});
  });
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
  else{state.sessions=[makeSession(null)];}
  state.sessions.forEach(normSession);
  state.mark=(saved&&saved.mark)||null;
  if(!getSession())state.sessionId=state.sessions[0].id;
  topUpSeeds(getSession(),(saved&&saved.seed)||0);
  const s=getSession();
  state.exId=s.ex.length?s.ex[0].id:null;
}

export function save(){
  try{
    localStorage.setItem(KEY,JSON.stringify(
      {version:STORE_VERSION,seed:SEED_STAMP,sessionId:state.sessionId,
        sessions:state.sessions,mark:state.mark}));
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
