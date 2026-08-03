import {fmtClock,makeSession,markActivity,uid,workSeconds} from "./model.js";
import {activeEx,getSession,load,mergeSessions,save,selectSession,state} from "./store.js";
import {exportCSV,parseImport} from "./csv.js";
import {paint,workoutLabel} from "./views.js";
import {elapsedSeconds,reset as resetTimer,takeSeconds,timer,toggle as toggleTimer} from "./timer.js";

const MIN_REPS=0;
const TICK_MS=1000;

function render(){
  paint();
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
  if(t.id==="daysbtn"){state.view="history";render();return;}
  if(t.id==="exportcsv"){exportCSV(state.sessions);return;}
  if(t.id==="importcsv"){const cf=document.getElementById("csvfile");if(cf)cf.click();return;}

  if(t.closest&&t.closest("#daytitle")){
    const s=getSession();
    const name=prompt("Name this day",s.title);
    if(name!==null&&name.trim())s.title=name.trim();
    render();return;
  }
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
  if(t.id==="tstart"){toggleTimer();render();return;}
  if(t.id==="treset"){resetTimer();render();return;}
  if(t.id==="logbtn"){
    const e=activeEx();
    if(e){
      e.sets.push({r:state.reps,side:state.perSide,t:takeSeconds()});
      markActivity(getSession());
    }
    render();return;
  }
  if(t.id==="upd"){
    const e=getSession().ex.find(x=>x.id===state.editing.ex);
    if(e)e.sets[state.editing.i]={r:state.reps,side:state.perSide,t:e.sets[state.editing.i].t||0};
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

// Ticking touches only the clock nodes, so it never disturbs the live view.
function tick(){
  if(state.view!=="log")return;
  const set=document.getElementById("settime");
  if(set)set.textContent=fmtClock(elapsedSeconds());
  const work=document.getElementById("worktime");
  if(work)work.innerHTML=workoutLabel(getSession());
  const sub=document.getElementById("worksub");
  if(sub)sub.textContent=fmtClock(workSeconds(getSession()))+" logged";
  if(timer.running)save();
}

load();
render();
setInterval(tick,TICK_MS);
