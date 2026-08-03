// The exercises a fresh install starts with in the picker. A day begins empty;
// these are what you can choose from, not what you get.
export const SEED_EXERCISES=["Lunges","Kettlebell swings","Pull ups","Push ups",
  "Standing kettlebell rows","Shoulder press","Burpees"];
export const QUICK_REPS=[5,8,10,12,15,20];

const SIDES_PER_SET=2;
const UID_RADIX=36;
const UID_SPREAD=1e6;
const MS_PER_SEC=1000;
const SEC_PER_MIN=60;
const SEC_PER_HOUR=3600;
const RESUME_SECONDS=1800;
const STALE_SECONDS=3600;

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

export function normSet(v){
  return {r:+v.r||0,side:!!v.side,t:+v.t||0,at:v.at||""};
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

// The set clock counts from the previous set, never from before the workout began —
// otherwise resuming a day measures the gap back to yesterday's last set.
export function setAnchor(session){
  const last=lastSetAt(session),start=session.started||"";
  return (last>start?last:start)||"";
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

// Start means "a new workout begins now" — except right after an accidental End,
// where picking straight back up should keep the clock you were already running.
export function startWorkout(session){
  const now=nowISO();
  const resuming=session.started&&session.ended&&
    (Date.parse(now)-Date.parse(session.ended))/MS_PER_SEC<=RESUME_SECONDS;
  if(!resuming)session.started=now;
  session.ended="";
  session.running=true;
}

export function endWorkout(session){
  if(!session.started)return;
  session.ended=nowISO();
  session.running=false;
}

// A workout nobody ended stops itself at its last set rather than running all night.
export function autoEndIfStale(session){
  if(!session||!session.running||!session.started)return false;
  const last=lastSetAt(session)||session.started;
  if((Date.now()-Date.parse(last))/MS_PER_SEC<STALE_SECONDS)return false;
  session.ended=last;
  session.running=false;
  return true;
}

// A set always lands inside a running workout, so forgetting to press Start costs nothing.
export function addSet(session,ex,reps,perSide,at){
  if(!session.running)startWorkout(session);
  const stamp=at||nowISO();
  const gap=Math.round(setSeconds(session,stamp));
  ex.sets.push({r:reps,side:perSide,t:gap,at:stamp});
}

export function makeSession(){
  return {id:uid(),title:todayLabel(),created:new Date().toISOString(),
    started:"",ended:"",running:false,ex:[]};
}

export function makeExercise(name){
  return {id:uid(),name,sets:[]};
}
