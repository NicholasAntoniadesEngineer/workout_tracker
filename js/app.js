import {addSet,endWorkout,fmtClock,makeSession,nowISO,startWorkout,uid} from "./model.js";
import {activeEx,getSession,load,mergeSessions,save,selectSession,state} from "./store.js";
import {exportCSV,parseImport} from "./csv.js";
import {paint,setClockSeconds,setSub,workoutLabel,workoutSub} from "./views.js";

const MIN_REPS=0;
const TICK_MS=1000;
const FIT_MIN=0.62;
const FIT_STEP=0.04;

// Width is the table's problem — extra sets scroll sideways. Only height has to be made to fit.
function overflows(el){
  return !!el&&el.scrollHeight>el.clientHeight+1;
}

// The log screen never scrolls: shrink the type scale until the whole day fits the window.
function fit(){
  const root=document.documentElement;
  root.style.setProperty("--k","1");
  if(state.view!=="log")return;
  const wrap=document.querySelector(".wrap"),tbl=document.querySelector(".tblwrap");
  let k=1;
  while(k>FIT_MIN&&(overflows(wrap)||overflows(tbl))){
    k=Math.round((k-FIT_STEP)*100)/100;
    root.style.setProperty("--k",String(k));
  }
}

function render(){
  paint();
  fit();
  if(state.adding){
    const el=document.getElementById("newname");
    if(el){el.focus();el.addEventListener("keydown",ev=>{if(ev.key==="Enter")addExercise();});}
  }
  save();
}

function addExercise(){
  const el=document.getElementById("newname");
  const name=el?el.value.trim():"";
  if(name){
    const e={id:uid(),name,sets:[]};
    getSession().ex.push(e);
    state.exId=e.id;
  }
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

function deleteDay(id){
  state.sessions=state.sessions.filter(s=>s.id!==id);
  if(!state.sessions.length)state.sessions=[makeSession(null)];
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
    const cur=getSession();
    const ns=makeSession(cur?cur.ex:null);
    state.sessions.push(ns);
    selectSession(ns.id);
    state.view="log";render();return;
  }
  if(t.id==="daysbtn"){state.view="history";state.manage=false;state.adding=false;render();return;}
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
    s.running?endWorkout(s):startWorkout(s);
    state.mark=null;
    render();return;
  }
  // Marking freezes the set clock at this instant; the next logged set is stamped there.
  if(t.id==="markbtn"){
    const s=getSession();
    if(state.mark){state.mark=null;}
    else{if(!s.running)startWorkout(s);state.mark=nowISO();}
    render();return;
  }
  if(t.id==="logbtn"){
    const e=activeEx();
    if(e)addSet(getSession(),e,state.reps,state.perSide,state.mark);
    state.mark=null;
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
  if(t.dataset&&t.dataset.rm){
    const s=getSession();
    s.ex=s.ex.filter(x=>x.id!==t.dataset.rm);
    if(state.exId===t.dataset.rm)state.exId=s.ex[0]?s.ex[0].id:null;
    render();return;
  }
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
render();
setInterval(tick,TICK_MS);
