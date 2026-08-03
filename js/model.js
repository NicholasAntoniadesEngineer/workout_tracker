export const SEED_EXERCISES=["Lunges","Kettlebell swings","Pull ups","Standing kettlebell rows","Shoulder press"];
export const QUICK_REPS=[5,8,10,12,15,20];

const SIDES_PER_SET=2;
const UID_RADIX=36;
const UID_SPREAD=1e6;
const MS_PER_SEC=1000;
const SEC_PER_MIN=60;
const SEC_PER_HOUR=3600;

export function fmtClock(totalSec){
  const s=Math.max(0,Math.round(totalSec||0));
  const h=Math.floor(s/SEC_PER_HOUR);
  const m=Math.floor((s%SEC_PER_HOUR)/SEC_PER_MIN);
  const pad=n=>String(n).padStart(2,"0");
  return h?h+":"+pad(m)+":"+pad(s%SEC_PER_MIN):m+":"+pad(s%SEC_PER_MIN);
}

export function uid(){
  return "i"+Date.now().toString(UID_RADIX)+Math.floor(Math.random()*UID_SPREAD).toString(UID_RADIX);
}

export function todayLabel(){
  return new Date().toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
}

export function shortDate(iso){
  try{return new Date(iso).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}
  catch(e){return "";}
}

// Sets were bare rep counts before per-side logging existed.
export function normSet(v){
  return (v&&typeof v==="object")?{r:+v.r||0,side:!!v.side,t:+v.t||0}:{r:+v||0,side:false,t:0};
}

export function setReps(x){return x.side?x.r*SIDES_PER_SET:x.r;}

export function exerciseTotal(e){return e.sets.reduce((sum,x)=>sum+setReps(x),0);}

export function totals(session){
  let reps=0,sets=0;
  session.ex.forEach(e=>e.sets.forEach(x=>{reps+=setReps(x);sets++;}));
  return {reps,sets};
}

export function workSeconds(session){
  return session.ex.reduce((sum,e)=>sum+e.sets.reduce((a,x)=>a+(x.t||0),0),0);
}

function isToday(iso){
  return new Date(iso).toDateString()===new Date().toDateString();
}

// Today's clock keeps running; a past day is frozen at its last logged set.
export function workoutSeconds(session){
  if(!session.started)return null;
  const end=isToday(session.started)?Date.now():Date.parse(session.ended||session.started);
  return Math.max(0,(end-Date.parse(session.started))/MS_PER_SEC);
}

export function markActivity(session){
  const now=new Date().toISOString();
  if(!session.started)session.started=now;
  session.ended=now;
}

export function makeSession(fromEx){
  const names=(fromEx&&fromEx.length)?fromEx.map(e=>e.name):SEED_EXERCISES.slice();
  return {id:uid(),title:todayLabel(),created:new Date().toISOString(),
    ex:names.map(n=>({id:uid(),name:n,sets:[]}))};
}
