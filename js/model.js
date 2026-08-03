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

export function fmtTime(iso){
  if(!iso)return "";
  const d=new Date(iso);
  return isNaN(d)?"":d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
}

export function nowISO(){return new Date().toISOString();}

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

// Sets were bare rep counts before per-side logging, and untimestamped before the mark button.
export function normSet(v){
  return (v&&typeof v==="object")
    ?{r:+v.r||0,side:!!v.side,t:+v.t||0,at:v.at||""}
    :{r:+v||0,side:false,t:0,at:""};
}

export function setReps(x){return x.side?x.r*SIDES_PER_SET:x.r;}

export function exerciseTotal(e){return e.sets.reduce((sum,x)=>sum+setReps(x),0);}

export function totals(session){
  let reps=0,sets=0;
  session.ex.forEach(e=>e.sets.forEach(x=>{reps+=setReps(x);sets++;}));
  return {reps,sets};
}

// Sets append per exercise, so the newest stamp has to be found across all of them.
export function lastSetAt(session){
  let last="";
  session.ex.forEach(e=>e.sets.forEach(x=>{if(x.at&&x.at>last)last=x.at;}));
  return last;
}

// The most recently logged set: newest stamp, or the last one pushed if none are stamped.
export function lastSet(session){
  let newest=null;
  session.ex.forEach(e=>e.sets.forEach(x=>{
    if(!newest||(x.at||"")>=(newest.at||""))newest=x;
  }));
  return newest;
}

// The set clock counts from the previous set, falling back to the workout start.
export function setAnchor(session){
  return lastSetAt(session)||session.started||"";
}

export function setSeconds(session,mark){
  const anchor=setAnchor(session);
  if(!anchor)return 0;
  const end=mark?Date.parse(mark)
    :(session.running?Date.now():Date.parse(session.ended||lastSetAt(session)||anchor));
  return Math.max(0,(end-Date.parse(anchor))/MS_PER_SEC);
}

function isToday(iso){
  return new Date(iso).toDateString()===new Date().toDateString();
}

// A workout left running overnight freezes at its last set instead of counting forever.
export function workoutSeconds(session){
  if(!session.started)return null;
  const live=session.running&&isToday(session.started);
  const end=live?Date.now():Date.parse(session.ended||lastSetAt(session)||session.started);
  return Math.max(0,(end-Date.parse(session.started))/MS_PER_SEC);
}

// The stamp a finished workout ended on, for display and export.
export function workoutEnd(session){
  return session.ended||lastSetAt(session)||"";
}

export function startWorkout(session){
  if(!session.started)session.started=nowISO();
  session.ended="";
  session.running=true;
}

export function endWorkout(session){
  if(!session.started)return;
  session.ended=nowISO();
  session.running=false;
}

// A set always lands inside a running workout, so forgetting to press Start costs nothing.
export function addSet(session,ex,reps,perSide,at){
  if(!session.running)startWorkout(session);
  const stamp=at||nowISO();
  const gap=Math.round(setSeconds(session,stamp));
  ex.sets.push({r:reps,side:perSide,t:gap,at:stamp});
}

export function makeSession(fromEx){
  const names=(fromEx&&fromEx.length)?fromEx.map(e=>e.name):SEED_EXERCISES.slice();
  return {id:uid(),title:todayLabel(),created:new Date().toISOString(),
    started:"",ended:"",running:false,
    ex:names.map(n=>({id:uid(),name:n,sets:[]}))};
}
