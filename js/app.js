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
const LONG_PRESS_MS=450;
const MOVE_SLOP=8;

// Width is the table's problem — extra sets scroll sideways. Only height has to be made to fit.
function overflows(el){
  return !!el&&el.scrollHeight>el.clientHeight+1;
}

// A chosen text size is honoured exactly — if the day no longer fits, the table scrolls
// rather than the type being quietly overruled. Auto (0) is the fit-to-window default,
// which shrinks the scale until the whole day is on screen.
let autoScale=1;
let refit=true;

// Re-measure from full size on the next paint: the window changed, or the day did.
function markRefit(){refit=true;}

function fit(){
  const root=document.documentElement;
  const set=v=>root.style.setProperty("--k",String(v));
  const chosen=state.settings.textScale||0;
  if(chosen){set(chosen);return;}
  // Auto settles on a scale and keeps it. Adding an exercise or opening the editor
  // must not resize the type under you, so those paints reuse what was settled on.
  if(state.view!=="log"||state.sheet||state.adding||state.dragId){set(autoScale);return;}
  let k=refit?1:autoScale;
  refit=false;
  set(k);
  const wrap=document.querySelector(".wrap"),tbl=document.querySelector(".tblwrap");
  while(k>FIT_MIN&&(overflows(wrap)||overflows(tbl))){
    k=Math.round((k-FIT_STEP)*100)/100;
    set(k);
  }
  autoScale=k;
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
      // Focus only on the repaint that opened the box. Focusing on every repaint
      // reopens the keyboard each time anything else is tapped.
      if(state.focusAdd){el.focus();state.focusAdd=false;}
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
  if(name){addExerciseToDay(name);state.sheet=true;}
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

// Each exercise remembers how it was last done, so coming back to it picks up where you
// left off. An exercise with no sets yet keeps the reps on screen for convenience but
// never inherits a weight — logging 12kg onto push ups because curls were selected
// before would be silently wrong.
function recallLast(e){
  const last=e&&e.sets.length?e.sets[e.sets.length-1]:null;
  if(last){
    state.reps=last.r;
    state.perSide=last.side;
    state.weight=+last.w||0;
  }else{
    state.perSide=false;
    state.weight=0;
  }
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

// Hold an exercise, then drag it up or down the table to reorder the day. The hold is
// what separates it from a tap, which selects the exercise for logging.
let drag=null;
let swallowClick=false;

function exerciseUnder(x,y){
  const el=document.elementFromPoint(x,y);
  const btn=el&&el.closest&&el.closest("[data-ex]");
  return btn?btn.getAttribute("data-ex"):null;
}

function watchDrag(){
  let timer=null,downY=0;
  const stopTimer=()=>{if(timer){clearTimeout(timer);timer=null;}};

  document.body.addEventListener("pointerdown",ev=>{
    const btn=ev.target.closest&&ev.target.closest(".exbtn");
    if(!btn||state.sheet)return;
    downY=ev.clientY;
    const id=btn.getAttribute("data-ex");
    timer=setTimeout(()=>{
      timer=null;
      drag={id,moved:false};
      state.dragId=id;
      state.editing=null;
      if(navigator.vibrate)navigator.vibrate(15);
      render();
    },LONG_PRESS_MS);
  });

  document.body.addEventListener("pointermove",ev=>{
    if(timer&&Math.abs(ev.clientY-downY)>MOVE_SLOP)stopTimer();
    if(!drag)return;
    ev.preventDefault();
    const overId=exerciseUnder(ev.clientX,ev.clientY);
    if(!overId||overId===drag.id)return;
    const list=getSession().ex;
    const from=list.findIndex(e=>e.id===drag.id),to=list.findIndex(e=>e.id===overId);
    if(from<0||to<0)return;
    list.splice(to,0,list.splice(from,1)[0]);
    drag.moved=true;
    render();
  },{passive:false});

  const end=()=>{
    stopTimer();
    if(!drag)return;
    swallowClick=true;          // the release would otherwise select what was dragged
    drag=null;
    state.dragId=null;
    render();
  };
  document.body.addEventListener("pointerup",end);
  document.body.addEventListener("pointercancel",end);
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
  if(swallowClick){swallowClick=false;return;}
  const t=ev.target;

  const delDay=t.closest&&t.closest("[data-delday]");
  if(delDay){
    if(confirm("Delete this day permanently?"))deleteDay(delDay.getAttribute("data-delday"));
    render();return;
  }
  const loadDay=t.closest&&t.closest("[data-load]");
  if(loadDay){
    selectSession(loadDay.getAttribute("data-load"));
    state.sheet=!getSession().ex.length;
    state.view="log";markRefit();render();return;
  }
  if(t.id==="backbtn"){state.view="log";render();return;}
  if(t.id==="newday"){
    const ns=makeSession();
    state.sessions.push(ns);
    selectSession(ns.id);
    state.sheet=true;
    state.view="log";markRefit();render();return;
  }
  if(t.id==="daysbtn"){state.view="history";state.sheet=false;state.adding=false;render();return;}
  if(t.id==="settingsbtn"){state.view="settings";state.sheet=false;state.adding=false;render();return;}

  const setBtn=t.closest&&t.closest("[data-set]");
  if(setBtn){
    const key=setBtn.getAttribute("data-set"),raw=setBtn.getAttribute("data-val");
    const was=DEFAULTS[key];
    setSetting(key,typeof was==="boolean"?raw==="1":(typeof was==="number"?Number(raw):raw));
    if(key==="startReps")state.reps=Number(raw);
    markRefit();
    render();return;
  }
  if(t.id==="resetsettings"){
    Object.keys(DEFAULTS).forEach(k=>setSetting(k,DEFAULTS[k]));
    state.reps=DEFAULTS.startReps;
    markRefit();
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
    state.sheet=true;state.editing=null;render();return;
  }
  if(t.id==="opensheet"){state.sheet=true;state.editing=null;render();return;}
  if(t.id==="sheetdone"||t.id==="sheetback"){
    state.sheet=false;state.adding=false;render();return;
  }
  if(t.id==="minus"){state.reps=Math.max(MIN_REPS,state.reps-1);render();return;}
  if(t.id==="plus"){state.reps=state.reps+1;render();return;}
  if(t.dataset&&t.dataset.q){state.reps=parseInt(t.dataset.q,10);render();return;}
  if(t.id==="sidebtn"){state.perSide=!state.perSide;render();return;}
  if(t.id==="weightbtn"){
    if(state.weight){state.lastWeight=state.weight;state.weight=0;}
    else state.weight=state.lastWeight||10;
    render();return;
  }
  if(t.dataset&&t.dataset.w){state.weight=parseFloat(t.dataset.w);render();return;}
  if(t.id==="weightother"){
    const a=prompt("Weight in "+(state.settings.unit||"kg"),String(state.weight));
    if(a!==null&&a.trim()!=="")state.weight=Math.max(0,parseFloat(a)||0);
    render();return;
  }

  if(t.dataset&&t.dataset.ex&&t.classList.contains("exbtn")){
    state.exId=t.dataset.ex;state.editing=null;
    recallLast(activeEx());
    render();return;
  }
  const cell=t.closest&&t.closest(".cell.has");
  if(cell){
    const e=getSession().ex.find(x=>x.id===cell.dataset.ex);
    const i=parseInt(cell.dataset.i,10);
    state.exId=cell.dataset.ex;
    state.reps=e.sets[i].r;
    state.perSide=e.sets[i].side;
    state.weight=+e.sets[i].w||0;
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
    if(e)addSet(getSession(),e,state.reps,state.perSide,state.setStart,state.weight);
    state.setStart=null;
    render();return;
  }
  if(t.id==="upd"){
    const e=getSession().ex.find(x=>x.id===state.editing.ex);
    if(e){
      const old=e.sets[state.editing.i];
      e.sets[state.editing.i]={r:state.reps,side:state.perSide,w:state.weight,
        t:old.t||0,rest:old.rest||0,at:old.at||""};
    }
    state.editing=null;render();return;
  }
  if(t.id==="del"){
    const e=getSession().ex.find(x=>x.id===state.editing.ex);
    if(e)e.sets.splice(state.editing.i,1);
    state.editing=null;render();return;
  }
  if(t.id==="cxl"){state.editing=null;render();return;}
  // Picking a listed name closes the new-exercise box, rather than leaving it open to
  // grab focus — and the keyboard with it — on every later repaint.
  // Adding only happens from the sheet, and picking one name should not close it —
  // the day stops being empty on the first pick, which is what used to shut it.
  const add=t.closest&&t.closest("[data-add]");
  if(add){
    addExerciseToDay(add.getAttribute("data-add"));
    state.adding=false;
    state.sheet=true;
    render();return;
  }

  const sel=t.closest&&t.closest("[data-sel]");
  if(sel){
    state.exId=sel.getAttribute("data-sel");state.editing=null;
    recallLast(activeEx());
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
  if(t.id==="addbtn"){state.adding=true;state.focusAdd=true;render();return;}
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

watchDrag();
window.addEventListener("resize",()=>{markRefit();fit();});
window.addEventListener("orientationchange",()=>{markRefit();fit();});

load();
state.sessions.forEach(autoEndIfStale);
// A day with nothing picked opens the list for you — but it can be closed again.
state.sheet=!getSession().ex.length;
render();
setInterval(tick,TICK_MS);
