import {addSet,autoEndIfStale,endWorkout,fmtClock,makeSession,nowISO,resetRestTimer,
  setWorkoutMinutes,startWorkout,workoutSeconds} from "./model.js";
import {DEFAULTS,activeEx,addExerciseToDay,getSession,load,mergeSessions,removeFromCatalog,
  save,selectSession,setSetting,state} from "./store.js";
import {exportCSV,parseImport} from "./csv.js";
import {paint,setClockSeconds,setSub,workoutLabel,workoutSub} from "./views.js";

const MIN_REPS=0;
const TICK_MS=1000;
const FIT_MIN=0.58;
const FIT_STEP=0.04;
const SEC_PER_MIN=60;

// Width is the table's problem — extra sets scroll sideways. Only height has to be made to fit.
function overflows(el){
  return !!el&&el.scrollHeight>el.clientHeight+1;
}

// A chosen text size is honoured exactly — if the day no longer fits, the table scrolls
// rather than the type being quietly overruled. Auto (0) is the fit-to-window default,
// which shrinks the scale until the whole day is on screen.
function fit(){
  const root=document.documentElement;
  const chosen=state.settings.textScale||0;
  if(chosen){root.style.setProperty("--k",String(chosen));return;}
  let k=1;
  root.style.setProperty("--k","1");
  if(state.view!=="log")return;
  const wrap=document.querySelector(".wrap"),tbl=document.querySelector(".tblwrap");
  while(k>FIT_MIN&&(overflows(wrap)||overflows(tbl))){
    k=Math.round((k-FIT_STEP)*100)/100;
    root.style.setProperty("--k",String(k));
  }
}

// Repainting throws the DOM away, which would jump the table back to set 1 every time
// a set is logged. Carry the sideways scroll across, after fit() has settled the widths.
function grabScroll(){
  const keep={};
  document.querySelectorAll("[data-keepx]").forEach(el=>{keep[el.dataset.keepx]=el.scrollLeft;});
  return keep;
}

function putScroll(keep){
  document.querySelectorAll("[data-keepx]").forEach(el=>{
    const x=keep[el.dataset.keepx];
    if(x)el.scrollLeft=x;
  });
}

function render(){
  const keep=grabScroll();
  paint();
  fit();
  putScroll(keep);
  if(state.adding){
    const el=document.getElementById("newname");
    if(el){
      el.focus();
      el.addEventListener("keydown",ev=>{
        if(ev.key==="Enter")addExercise();
        else if(ev.key==="Escape"){state.adding=false;render();}
      });
    }
  }
  save();
}

function addExercise(){
  const el=document.getElementById("newname");
  const name=el?el.value.trim():"";
  if(name)addExerciseToDay(name);
  state.adding=false;
  render();
}

function importText(text){
  let imported;
  try{imported=parseImport(text);}
  catch(err){alert(err.message);return;}
  mergeSessions(imported);
  state.view="history";
  render();
  alert("Imported "+imported.length+" day"+(imported.length>1?"s":"")+".");
}

// Dropping an exercise that has already been logged destroys those sets, so it asks.
function removeExercise(id){
  const s=getSession();
  const e=s.ex.find(x=>x.id===id);
  if(!e)return;
  if(e.sets.length&&!confirm("Drop "+e.name+" from today? Its "+e.sets.length+
    " logged set"+(e.sets.length>1?"s":"")+" will be deleted."))return;
  s.ex=s.ex.filter(x=>x.id!==id);
  if(state.exId===id)state.exId=s.ex[0]?s.ex[0].id:null;
}

function deleteDay(id){
  state.sessions=state.sessions.filter(s=>s.id!==id);
  if(!state.sessions.length)state.sessions=[makeSession()];
  if(state.sessionId===id)selectSession(state.sessions[0].id);
}

document.body.addEventListener("change",ev=>{
  if(ev.target&&ev.target.id==="csvfile"){
    const f=ev.target.files&&ev.target.files[0];
    if(!f)return;
    const rd=new FileReader();
    rd.onload=()=>importText(String(rd.result));
    rd.readAsText(f);
    ev.target.value="";
  }
});

document.body.addEventListener("click",ev=>{
  const t=ev.target;

  const delDay=t.closest&&t.closest("[data-delday]");
  if(delDay){
    if(confirm("Delete this day permanently?"))deleteDay(delDay.getAttribute("data-delday"));
    render();return;
  }
  const loadDay=t.closest&&t.closest("[data-load]");
  if(loadDay){selectSession(loadDay.getAttribute("data-load"));state.view="log";render();return;}
  if(t.id==="backbtn"){state.view="log";render();return;}
  if(t.id==="newday"){
    const ns=makeSession();
    state.sessions.push(ns);
    selectSession(ns.id);
    state.view="log";render();return;
  }
  if(t.id==="daysbtn"){state.view="history";state.manage=false;state.adding=false;render();return;}
  if(t.id==="settingsbtn"){state.view="settings";state.manage=false;state.adding=false;render();return;}

  const setBtn=t.closest&&t.closest("[data-set]");
  if(setBtn){
    const key=setBtn.getAttribute("data-set"),raw=setBtn.getAttribute("data-val");
    const was=DEFAULTS[key];
    setSetting(key,typeof was==="boolean"?raw==="1":(typeof was==="number"?Number(raw):raw));
    if(key==="startReps")state.reps=Number(raw);
    render();return;
  }
  if(t.id==="resetsettings"){
    Object.keys(DEFAULTS).forEach(k=>setSetting(k,DEFAULTS[k]));
    state.reps=DEFAULTS.startReps;
    render();return;
  }
  if(t.id==="exportcsv"){exportCSV(state.sessions);return;}
  if(t.id==="importcsv"){const cf=document.getElementById("csvfile");if(cf)cf.click();return;}

  if(t.closest&&t.closest("#daytitle")){
    const s=getSession();
    const name=prompt("Name this day",s.title);
    if(name!==null&&name.trim())s.title=name.trim();
    render();return;
  }
  if(t.closest&&t.closest("#managebtn")){
    state.manage=true;state.editing=null;render();return;
  }
  if(t.id==="managedone"){state.manage=false;state.adding=false;render();return;}
  if(t.id==="minus"){state.reps=Math.max(MIN_REPS,state.reps-1);render();return;}
  if(t.id==="plus"){state.reps=state.reps+1;render();return;}
  if(t.dataset&&t.dataset.q){state.reps=parseInt(t.dataset.q,10);render();return;}
  if(t.id==="sidebtn"){state.perSide=!state.perSide;render();return;}

  if(t.dataset&&t.dataset.ex&&t.classList.contains("exbtn")){
    state.exId=t.dataset.ex;state.editing=null;
    const e=activeEx();
    if(e&&e.sets.length)state.perSide=e.sets[e.sets.length-1].side;
    render();return;
  }
  const cell=t.closest&&t.closest(".cell.has");
  if(cell){
    const e=getSession().ex.find(x=>x.id===cell.dataset.ex);
    const i=parseInt(cell.dataset.i,10);
    state.exId=cell.dataset.ex;
    state.reps=e.sets[i].r;
    state.perSide=e.sets[i].side;
    state.editing={ex:cell.dataset.ex,i};
    render();return;
  }
  if(t.id==="wtoggle"){
    const s=getSession();
    if(s.running){
      if(!confirm("End the workout? The clock stops at "+fmtClock(workoutSeconds(s))+"."))return;
      endWorkout(s);
    }else startWorkout(s);
    state.setStart=null;
    render();return;
  }
  // Starting a set stamps its beginning: the gap before it is rest, the gap after is work.
  if(t.id==="setstart"){
    const s=getSession();
    if(state.setStart){state.setStart=null;}
    else{if(!s.running)startWorkout(s);state.setStart=nowISO();}
    render();return;
  }
  if(t.id==="timerreset"){
    if(!confirm("Reset the rest clock to zero? Logged sets are not affected."))return;
    resetRestTimer(getSession());
    state.setStart=null;
    render();return;
  }
  if(t.closest&&t.closest("#worktime")){
    const s=getSession();
    const cur=Math.round((workoutSeconds(s)||0)/SEC_PER_MIN);
    const answer=prompt("Minutes the workout has been going:",String(cur));
    if(answer!==null&&answer.trim()!=="")setWorkoutMinutes(s,parseFloat(answer));
    render();return;
  }
  if(t.id==="logbtn"){
    const e=activeEx();
    if(e)addSet(getSession(),e,state.reps,state.perSide,state.setStart);
    state.setStart=null;
    render();return;
  }
  if(t.id==="upd"){
    const e=getSession().ex.find(x=>x.id===state.editing.ex);
    if(e){
      const old=e.sets[state.editing.i];
      e.sets[state.editing.i]={r:state.reps,side:state.perSide,t:old.t||0,at:old.at||""};
    }
    state.editing=null;render();return;
  }
  if(t.id==="del"){
    const e=getSession().ex.find(x=>x.id===state.editing.ex);
    if(e)e.sets.splice(state.editing.i,1);
    state.editing=null;render();return;
  }
  if(t.id==="cxl"){state.editing=null;render();return;}
  const add=t.closest&&t.closest("[data-add]");
  if(add){addExerciseToDay(add.getAttribute("data-add"));render();return;}

  const sel=t.closest&&t.closest("[data-sel]");
  if(sel){
    state.exId=sel.getAttribute("data-sel");state.editing=null;
    const e=activeEx();
    if(e&&e.sets.length)state.perSide=e.sets[e.sets.length-1].side;
    render();return;
  }

  const delCat=t.closest&&t.closest("[data-delcat]");
  if(delCat){
    const name=delCat.getAttribute("data-delcat");
    if(confirm("Remove \""+name+"\" from your list? Days you already logged keep it."))
      removeFromCatalog(name);
    render();return;
  }
  if(t.id==="removesel"){const e=activeEx();if(e)removeExercise(e.id);render();return;}
  if(t.dataset&&t.dataset.rm){removeExercise(t.dataset.rm);render();return;}
  if(t.id==="addbtn"){state.adding=true;render();return;}
  if(t.id==="addok"){addExercise();return;}
  if(t.id==="reset"){
    if(confirm("Clear all sets for this day?")){
      getSession().ex.forEach(x=>{x.sets=[];});
      state.editing=null;render();
    }
    return;
  }
});

// Both clocks derive from stored stamps, so ticking only refreshes text — never the DOM.
function tick(){
  if(state.view!=="log")return;
  const s=getSession();
  if(autoEndIfStale(s)){render();return;}
  const set=document.getElementById("settime");
  if(set)set.textContent=fmtClock(setClockSeconds(s));
  const setl=document.getElementById("setsub");
  if(setl)setl.innerHTML=setSub(s);
  const work=document.getElementById("worktime");
  if(work)work.innerHTML=workoutLabel(s);
  const sub=document.getElementById("worksub");
  if(sub)sub.innerHTML=workoutSub(s);
}

window.addEventListener("resize",fit);
window.addEventListener("orientationchange",fit);

load();
state.sessions.forEach(autoEndIfStale);
render();
setInterval(tick,TICK_MS);
