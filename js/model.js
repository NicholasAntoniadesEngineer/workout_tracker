// The exercises a fresh install starts with in the picker, grouped by the movement they
// train. A day begins empty; these are what you can choose from, not what you get.
export const EXERCISE_GROUPS=[
  ["Squat & lunge",["Squats","Slant board squats","Forward lunges","Backward lunges",
    "Slant board steps","ATG split squat","Bulgarian split squat","Wall sit"]],
  ["Hinge & glutes",["Kettlebell swings","Kettlebell deadlift","Single-leg RDL",
    "Good mornings","Nordic curls","Glute bridge","Hip thrust"]],
  ["Push",["Push ups","Pike push ups","Shoulder press","Dips"]],
  ["Pull",["Pull ups","Chin ups","Gorilla rows","Standing kettlebell rows",
    "Shoulder shrugs","Bicep curls"]],
  ["Core",["Plank","Side plank","Dead bug","Hollow hold","Hanging knee raises",
    "Pallof press","Ab wheel rollout","Mountain climbers"]],
  ["Carry & full body",["Farmer carry","Suitcase carry","Turkish get-up",
    "Kettlebell squat press clean","Burpees"]],
  ["Lower leg",["Tibialis raises","Calf raises"]],
  // A band and a door anchor cover every pattern — the travel kit, in one section.
  ["Bands",["Band squat","Band deadlift","Band Romanian deadlift","Band good morning",
    "Band lateral walk","Band glute kickback","Band chest press","Band overhead press",
    "Band row","Band lat pulldown","Band pull-aparts","Band face pull","Band bicep curl",
    "Band tricep pushdown","Band Pallof press","Band woodchop"]]
];

export const SEED_EXERCISES=EXERCISE_GROUPS.reduce((all,g)=>all.concat(g[1]),[]);

const GROUP_OF={};
EXERCISE_GROUPS.forEach(g=>g[1].forEach(n=>{GROUP_OF[n.toLowerCase()]=g[0];}));

// Anything you add yourself falls under Other rather than being forced into a group.
export const OTHER_GROUP="Other";

export function exerciseGroup(name){
  return GROUP_OF[String(name||"").trim().toLowerCase()]||OTHER_GROUP;
}
export const QUICK_REPS=[5,8,10,12,15,20];
// Quick picks for timed movements — planks, carries, wall sits — counted in seconds.
export const QUICK_SECS=[15,20,30,45,60,90];

const SIDES_PER_SET=2;
const UID_RADIX=36;
// Set from the settings screen; kept here so counting and staleness stay in one place.
export const options={perSideDouble:true,idleEndSeconds:3600};
const UID_SPREAD=1e6;
const MS_PER_SEC=1000;
const SEC_PER_MIN=60;
const SEC_PER_HOUR=3600;
const RESUME_SECONDS=1800;

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

// A workout belongs to a calendar day in local time, so the key is derived from the
// local date rather than the UTC slice of the ISO stamp.
export function dateKey(iso){
  const d=new Date(iso);
  if(isNaN(d))return "";
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+
    "-"+String(d.getDate()).padStart(2,"0");
}

export function keyOf(y,m,day){
  return y+"-"+String(m+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
}

export function timeLabel(iso){
  try{return new Date(iso).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});}
  catch(e){return "";}
}

export function monthLabel(y,m){
  return new Date(y,m,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});
}

// t is time spent working the set, rest is the gap that preceded it, at is when it ended.
// w is the weight carried — 0 is bodyweight, so no separate weighted flag is needed.
// wu marks a warm-up: logged and shown, but kept out of totals, records and trends.
export function normSet(v){
  return {r:+v.r||0,side:!!v.side,w:+v.w||0,t:+v.t||0,rest:+v.rest||0,at:v.at||"",wu:!!v.wu};
}

export function setReps(x){return (x.side&&options.perSideDouble)?x.r*SIDES_PER_SET:x.r;}

export function exerciseTotal(e){return e.sets.reduce((sum,x)=>sum+(x.wu?0:setReps(x)),0);}

// Timed exercises hold seconds in r, so they count toward sets but never the rep total.
export function totals(session){
  let reps=0,sets=0;
  session.ex.forEach(e=>e.sets.forEach(x=>{if(!x.wu&&!e.timed)reps+=setReps(x);sets++;}));
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

// Rest is measured from the last set, the workout start, or wherever the timer was last
// reset to — whichever is most recent. It can never predate the workout itself.
export function setAnchor(session){
  return [lastSetAt(session),session.started||"",session.timerFrom||""]
    .reduce((a,b)=>b>a?b:a,"");
}

export function restSeconds(session){
  const anchor=setAnchor(session);
  if(!anchor)return 0;
  const end=session.running?Date.now():Date.parse(session.ended||lastSetAt(session)||anchor);
  return Math.max(0,(end-Date.parse(anchor))/MS_PER_SEC);
}

export function secondsSince(iso){
  return iso?Math.max(0,(Date.now()-Date.parse(iso))/MS_PER_SEC):0;
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
  if(!options.idleEndSeconds)return false;
  const last=lastSetAt(session)||session.started;
  if((Date.now()-Date.parse(last))/MS_PER_SEC<options.idleEndSeconds)return false;
  session.ended=last;
  session.running=false;
  return true;
}

// A set always lands inside a running workout, so forgetting to press Start costs nothing.
// startedAt is when the set began, if it was timed: the gap before it is rest, the gap
// after it is work. Untimed sets record the whole gap as rest and no work.
const QUICK_WEIGHTS_KG=[4,6,8,10,12,16,20,24];
const QUICK_WEIGHTS_LB=[10,15,20,25,35,45,55,65];
export function quickWeights(unit){return unit==="lb"?QUICK_WEIGHTS_LB:QUICK_WEIGHTS_KG;}

// Weights are stored in whichever unit is chosen; switching converts every stored number,
// so 24 kg becomes 52.9 lb rather than silently relabelling itself.
const KG_PER_LB=0.45359237;
const CM_PER_IN=2.54;

function convert(v,from,to,perImperial){
  if(!v||from===to)return v;
  const metric=from==="lb"?v*perImperial:v;
  return Math.round((to==="lb"?metric/perImperial:metric)*10)/10;
}
export function convertWeight(v,from,to){return convert(v,from,to,KG_PER_LB);}
// Girths ride along with the weight unit: centimetres beside kg, inches beside lb.
export function convertLength(v,from,to){return convert(v,from,to,CM_PER_IN);}

export function addSet(session,ex,reps,perSide,startedAt,weight,warm){
  if(!session.running)startWorkout(session);
  const anchor=setAnchor(session);
  const end=nowISO();
  const begun=startedAt||end;
  const work=(Date.parse(end)-Date.parse(begun))/MS_PER_SEC;
  const rest=anchor?(Date.parse(begun)-Date.parse(anchor))/MS_PER_SEC:0;
  ex.sets.push({r:reps,side:perSide,w:Math.max(0,+weight||0),
    t:Math.max(0,Math.round(work)),rest:Math.max(0,Math.round(rest)),at:end,wu:!!warm});
  session.timerFrom="";
}

export function makeSession(){
  return {id:uid(),title:todayLabel(),created:new Date().toISOString(),
    started:"",ended:"",running:false,timerFrom:"",ex:[]};
}

// Backfill a workout onto a past calendar day you trained but didn't log. Dated to local
// noon so it lands squarely on that day regardless of timezone; the title names the date.
export function makeSessionOn(y,m,day){
  const at=new Date(y,m,day,12,0,0);
  const title=at.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
  return {id:uid(),title:title,created:at.toISOString(),
    started:"",ended:"",running:false,timerFrom:"",ex:[]};
}

// Lets a workout be told it really began earlier — you trained for ten minutes before
// remembering to press Start.
export function setWorkoutMinutes(session,minutes){
  const mins=Math.max(0,+minutes||0);
  session.started=new Date(Date.now()-mins*SEC_PER_MIN*MS_PER_SEC).toISOString();
  if(!session.running){session.ended="";session.running=true;}
}

// Parse a duration a person typed: "1:30" or "90" both mean ninety seconds.
export function parseClock(str){
  const s=String(str==null?"":str).trim();
  if(!s)return 0;
  if(s.indexOf(":")>=0){
    const p=s.split(":");
    return Math.max(0,(parseInt(p[0],10)||0)*SEC_PER_MIN+(parseInt(p[1],10)||0));
  }
  return Math.max(0,Math.round(parseFloat(s)||0));
}

// Transcribing a workout done off-app: add one or more identical sets without starting a
// live timer, stamped to the session's own day and with unknown (0) work/rest until edited.
export function addManualSets(session,ex,reps,perSide,weight,count,warm){
  const n=Math.max(1,Math.round(+count||1));
  for(let i=0;i<n;i++){
    ex.sets.push({r:reps,side:perSide,w:Math.max(0,+weight||0),t:0,rest:0,at:session.created,
      wu:!!warm});
  }
}

// A workout recorded after the fact — backfilled or planned — gets a fixed span on its own
// day rather than counting live from now. Start defaults to the session's created time.
export function setWorkoutSpanOn(session,minutes,startISO){
  const mins=Math.max(0,+minutes||0);
  const start=new Date(startISO||session.created);
  session.started=start.toISOString();
  session.ended=new Date(start.getTime()+mins*SEC_PER_MIN*MS_PER_SEC).toISOString();
  session.running=false;
}

// Restarts the rest clock from now, without touching anything already logged.
export function resetRestTimer(session){
  session.timerFrom=nowISO();
}

// Clears the workout clock back to "not started" — the logged sets are left untouched.
export function resetWorkout(session){
  session.started="";session.ended="";session.running=false;session.timerFrom="";
}

export function makeExercise(name){
  return {id:uid(),name,sets:[]};
}
