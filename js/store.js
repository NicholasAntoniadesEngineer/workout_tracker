import {BUILTIN_ROUTINES,RETIRED,SEED_EXERCISES,lastSetExercise,convertLength,convertWeight,dateKey,makeExercise,makeSession,normSet,nowISO,
  options} from "./model.js";

import * as db from "./db.js";
const KEY="workout_days_v2";
const STORE_VERSION=6;
const DEFAULT_REPS=10;
const SEC_PER_MIN=60;

export const DEFAULTS={theme:"system",textScale:0,perSideDouble:true,
  startReps:DEFAULT_REPS,idleEndMinutes:60,showSetTimes:true,unit:"kg",restTarget:0,
  bibleVersion:"web",feastSet:"western",restDay:0,progressRange:"10-15",remindDays:"0,1,2,3,4,5",
  remindTime:"07:00",maxHR:190,voice:true,restSound:true,restDown:false,checkin:true,sleepNeed:8,heightCm:0,sex:""};

// History lives only on this device, so after a few workouts — and every few weeks after —
// home suggests saving a backup file. "Not now" quiets it for a week.
const BACKUP_AFTER_WORKOUTS=3;
const BACKUP_EVERY_DAYS=21;
const DAY_MS=86400000;
export function backupDue(now){
  const t=now||Date.now();
  if(state.backupSnooze&&Date.parse(state.backupSnooze)>t)return false;
  const done=state.sessions.filter(s=>s.ex.some(e=>e.sets.length));
  if(done.length<BACKUP_AFTER_WORKOUTS)return false;
  if(!state.backupAt)return true;
  const newer=done.some(s=>(s.created||"")>state.backupAt);
  return newer&&(t-Date.parse(state.backupAt))/DAY_MS>=BACKUP_EVERY_DAYS;
}

// Rest after a set follows that exercise's own target if it has one, else the default.
export function restTargetFor(session){
  const e=lastSetExercise(session);
  const own=e&&state.restTargets&&state.restTargets[key(e.name)];
  return own||+state.settings.restTarget||0;
}

// The rep range progression works within, e.g. "10-15" → {low:10, top:15}: every set at 15
// means go heavier next time.
export function repRange(){
  const p=String(state.settings.progressRange||DEFAULTS.progressRange).split("-").map(Number);
  return {low:p[0]||10,top:p[1]||15};
}

export const state={sessions:[],sessionId:null,exId:null,catalog:[],removed:[],body:[],routines:[],hiddenRoutines:[],
  settings:Object.assign({},DEFAULTS),
  reps:DEFAULT_REPS,perSide:false,weight:0,lastWeight:10,band:"",warmup:false,setKind:"",setRpe:0,setNote:"",setStart:null,editing:null,
  adding:false,focusAdd:false,sheet:false,exHist:false,dragId:null,logCount:1,editWork:0,editRest:0,
  supplements:[],stacks:[],favs:[],learnSaved:[],learnRecent:[],learnIndex:null,programme:null,progSetup:null,cardio:null,cardioSetup:null,cardioDone:null,hrName:"",pickOpen:{},exInfo:null,exSearch:"",pickTab:"ex",editList:false,bodyMetric:"w",restTargets:{},best:null,summary:null,
  backupAt:"",backupSnooze:"",focusSearch:false,origin:"home",view:"home",undo:null,progressEx:"",verseIdx:null,
  shareMenu:null,numEdit:null,feedback:null,
  calYear:new Date().getFullYear(),calMonth:new Date().getMonth(),calDay:null};

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
    const raw=db.getItem(KEY);
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
  ((saved&&saved.catalog)||SEED_EXERCISES).filter(n=>!RETIRED[key(n)]).forEach(add);
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
  s.ex.forEach(e=>{e.timed=!!e.timed;e.dist=!!e.dist&&!e.timed;e.sets=(e.sets||[]).map(normSet);});
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
  state.body=(saved&&saved.body)||[];
  state.routines=(saved&&saved.routines)||[];
  state.supplements=(saved&&saved.supplements)||[];
  state.stacks=(saved&&saved.stacks)||[];
  state.hiddenRoutines=(saved&&saved.hiddenRoutines)||[];
  state.restTargets=(saved&&saved.restTargets)||{};
  state.favs=(saved&&saved.favs)||[];
  state.learnSaved=(saved&&saved.learnSaved)||[];
  state.learnRecent=(saved&&saved.learnRecent)||[];
  state.pickOpen=(saved&&saved.pickOpen)||{};
  state.programme=(saved&&saved.programme)||null;
  state.backupAt=(saved&&saved.backupAt)||"";
  state.welcomed=!!(saved&&saved.welcomed);
  state.checkins=(saved&&saved.checkins)||[];
  state.photos=(saved&&saved.photos)||[];
  state.vitals=(saved&&saved.vitals)||[];
  state.backupSnooze=(saved&&saved.backupSnooze)||"";
  state.catalog=buildCatalog(saved);
  state.settings=Object.assign({},DEFAULTS,(saved&&saved.settings)||{});
  applySettings();
  state.reps=state.settings.startReps;
  const s=getSession();
  state.exId=s.ex.length?s.ex[0].id:null;
}

export function save(){
  try{
    db.setItem(KEY,JSON.stringify(
      {version:STORE_VERSION,sessionId:state.sessionId,sessions:state.sessions,
        catalog:state.catalog,removed:state.removed,seeded:SEED_EXERCISES,settings:state.settings,
        setStart:state.setStart,body:state.body,routines:state.routines,
        hiddenRoutines:state.hiddenRoutines,restTargets:state.restTargets,favs:state.favs,pickOpen:state.pickOpen,programme:state.programme,
        learnSaved:state.learnSaved,learnRecent:state.learnRecent,backupAt:state.backupAt,backupSnooze:state.backupSnooze,welcomed:state.welcomed,checkins:state.checkins,vitals:state.vitals,photos:state.photos,
        supplements:state.supplements,stacks:state.stacks}));
    state.storageFull=false;
  }catch(e){
    // Out of room (photos are the likely cause): say so rather than silently not saving.
    state.storageFull=true;
  }
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

// Changing the weight unit converts every stored number — sets, the live selection, and
// the body log — so history keeps meaning the same load it always did.
export function convertAllWeights(from,to){
  if(from===to)return;
  state.sessions.forEach(s=>s.ex.forEach(e=>e.sets.forEach(x=>{
    x.w=convertWeight(x.w,from,to);
  })));
  state.weight=convertWeight(state.weight,from,to);
  state.lastWeight=convertWeight(state.lastWeight,from,to);
  state.body.forEach(b=>{
    b.w=convertWeight(b.w,from,to);
    ["waist","chest","arm"].forEach(k=>{if(b[k])b[k]=convertLength(b[k],from,to);});
  });
}

// The routines on offer: the built-ins you haven't dropped, then your own. One of yours
// with a built-in's name takes its place — re-saving a built-in is how you adjust it.
export function allRoutines(){
  const mine={};
  state.routines.forEach(r=>{mine[key(r.name)]=true;});
  const hidden=state.hiddenRoutines.map(key);
  return BUILTIN_ROUTINES.filter(r=>!mine[key(r.name)]&&hidden.indexOf(key(r.name))<0)
    .map(r=>({id:"b-"+key(r.name).replace(/[^a-z0-9]+/g,"-"),name:r.name,ex:r.ex.slice(),builtin:true}))
    .concat(state.routines);
}

export function findRoutine(id){return allRoutines().find(r=>r.id===id)||null;}

// A built-in is only hidden, and remembered so it stays gone; your own is deleted.
export function dropRoutine(r){
  if(!r.builtin){state.routines=state.routines.filter(x=>x.id!==r.id);return;}
  if(state.hiddenRoutines.map(key).indexOf(key(r.name))<0)state.hiddenRoutines.push(r.name);
}

// One routine per name: saving again under the same name replaces its exercise list.
// plan, optional: one entry per exercise, in the same order as the names, each with the
// target sets [{r, w, rest}] so a routine can hold a workout rather than only a list.
export function saveRoutine(name,exNames,plan){
  const n=String(name||"").trim();
  if(!n||!exNames.length)return null;
  state.routines=state.routines.filter(r=>key(r.name)!==key(n));
  // Time plus a random tail: two routines saved in the same millisecond (a backup being
  // loaded) still get different ids.
  const r={id:"r"+Date.now().toString(36)+Math.random().toString(36).slice(2,8),name:n,ex:exNames.slice()};
  if(plan&&plan.length)r.plan=plan.map(p=>({name:p.name,sets:(p.sets||[]).map(x=>({r:+x.r||0,w:+x.w||0,rest:+x.rest||0}))}));
  state.routines.push(r);
  return r;
}
// A day's working sets as a plan: what a routine saved from it should ask for next time.
export function planOf(session){
  return session.ex.map(e=>({name:e.name,sets:e.sets.filter(x=>!x.wu).map(x=>({r:x.r,w:+x.w||0,rest:+x.rest||0}))}));
}
// The targets a routine holds for an exercise, if any.
export function planFor(routine,name){
  const p=routine&&routine.plan&&routine.plan.find(x=>key(x.name)===key(name));
  return p&&p.sets.length?p.sets:null;
}
// A short line of targets: "3 × 5 @ 100", or "8, 8, 6 @ 60" when they differ.
export function planLine(sets,unit){
  if(!sets||!sets.length)return "";
  const same=sets.every(x=>x.r===sets[0].r&&x.w===sets[0].w);
  const reps=same?sets.length+" × "+sets[0].r:sets.map(x=>x.r).join(", ");
  const w=sets[0].w?" @ "+(same?sets[0].w:[...new Set(sets.map(x=>x.w))].join("/"))+" "+unit:"";
  return reps+w;
}

// One check-in and one vitals entry per calendar day, newest last.
export function upsertCheckin(c){
  const day=dateKey(c.at);
  state.checkins=state.checkins.filter(x=>dateKey(x.at)!==day).concat([c]).sort((a,b)=>(a.at||"").localeCompare(b.at||""));
}
export function upsertVital(v){
  const day=dateKey(v.at);
  state.vitals=state.vitals.filter(x=>dateKey(x.at)!==day).concat([v]).sort((a,b)=>(a.at||"").localeCompare(b.at||""));
}
export const todayCheckin=()=>state.checkins.find(c=>dateKey(c.at)===dateKey(nowISO()))||null;
// One body entry per calendar day: logging again the same day corrects it, not doubles it.
export function upsertBodyEntry(entry){
  const day=dateKey(entry.at);
  state.body=state.body.filter(b=>dateKey(b.at)!==day);
  state.body.push(entry);
  state.body.sort((a,b)=>(a.at||"").localeCompare(b.at||""));
}

// The last day this exercise was done before the open session — what "beat last time"
// is measured against while logging.
export function lastPerformance(name){
  const k=key(name);
  if(!k)return null;
  const cur=getSession();
  const list=newestFirst(state.sessions);
  for(let i=0;i<list.length;i++){
    const s=list[i];
    if(cur&&(s.id===cur.id||(s.created||"")>(cur.created||"")))continue;
    const e=s.ex.find(x=>key(x.name)===k&&x.sets.length);
    if(e)return {session:s,ex:e};
  }
  return null;
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

// Restore a JSON backup: days merge by created stamp like the CSV path, and the exercise
// list, removals, body log and settings come back with them.
export function importBackup(d){
  const sessions=(Array.isArray(d.sessions)?d.sessions:[])
    .filter(s=>s&&s.id&&s.created&&Array.isArray(s.ex));
  sessions.forEach(s=>{s.ex=s.ex.filter(e=>e&&e.name);normSession(s);});
  if(sessions.length)mergeSessions(sessions);
  (Array.isArray(d.catalog)?d.catalog:[]).forEach(addToCatalog);
  (Array.isArray(d.removed)?d.removed:[]).forEach(removeFromCatalog);
  (Array.isArray(d.body)?d.body:[]).forEach(b=>{if(b&&b.at)upsertBodyEntry(b);});
  // Supplements and stacks merge by id, so loading a backup twice doesn't duplicate them.
  ["supplements","stacks"].forEach(k=>{
    (Array.isArray(d[k])?d[k]:[]).forEach(x=>{
      if(x&&x.id&&x.name&&!state[k].some(y=>y.id===x.id))state[k].push(x);
    });
  });
  (Array.isArray(d.routines)?d.routines:[]).forEach(r=>{
    if(r&&r.name&&Array.isArray(r.ex))saveRoutine(r.name,r.ex,r.plan);
  });
  if(d.programme&&d.programme.id&&Array.isArray(d.programme.days)&&!state.programme)state.programme=d.programme;
  (Array.isArray(d.favs)?d.favs:[]).forEach(n=>{if(n&&state.favs.indexOf(n)<0)state.favs.push(String(n));});
  (Array.isArray(d.learnSaved)?d.learnSaved:[]).forEach(n=>{if(n&&state.learnSaved.indexOf(n)<0)state.learnSaved.push(String(n));});
  (Array.isArray(d.checkins)?d.checkins:[]).forEach(c=>{if(c&&c.at)upsertCheckin(c);});
  (Array.isArray(d.vitals)?d.vitals:[]).forEach(v=>{if(v&&v.at)upsertVital(v);});
  if(d.restTargets&&typeof d.restTargets==="object")
    state.restTargets=Object.assign({},state.restTargets,d.restTargets);
  (Array.isArray(d.hiddenRoutines)?d.hiddenRoutines:[]).forEach(n=>{
    if(n&&state.hiddenRoutines.map(key).indexOf(key(n))<0)state.hiddenRoutines.push(String(n));
  });
  if(d.settings&&typeof d.settings==="object")
    state.settings=Object.assign({},DEFAULTS,state.settings,d.settings);
  applySettings();
  return sessions.length;
}

// Days sharing a created stamp are replaced, not duplicated.
export function mergeSessions(imported){
  const seen={};
  imported.forEach(s=>{seen[s.created]=true;});
  state.sessions=state.sessions.filter(s=>!seen[s.created]).concat(imported);
  imported.forEach(s=>s.ex.forEach(e=>addToCatalog(e.name)));
  selectSession(newestFirst(state.sessions)[0].id);
}
