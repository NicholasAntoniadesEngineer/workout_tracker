import {QUICK_REPS,exerciseTotal,fmtClock,shortDate,totals,workSeconds,workoutSeconds} from "./model.js";
import {activeEx,getSession,newestFirst,state} from "./store.js";
import {elapsedSeconds,timer} from "./timer.js";

const MIN_SET_COLUMNS=1;
const SIDES_PER_SET=2;
const ESCAPES={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"};

export function esc(s){return String(s).replace(/[&<>"]/g,c=>ESCAPES[c]);}

function setColumns(session){
  return session.ex.reduce((most,e)=>Math.max(most,e.sets.length),MIN_SET_COLUMNS);
}

function statsBar(session,t){
  return "<div class='stats'>"+
    "<div class='stat big'><div class='v mono'>"+t.reps+"</div><div class='l'>Total reps</div></div>"+
    "<div class='stat'><div class='v mono'>"+t.sets+"</div><div class='l'>Sets</div></div>"+
    "<div class='stat'><div class='v mono'>"+session.ex.length+"</div><div class='l'>Exercises</div></div></div>";
}

function setsTable(session){
  const cols=setColumns(session);
  let h="<div class='card tblwrap'><table><thead><tr><th class='exh'>Exercise</th>";
  for(let i=0;i<cols;i++)h+="<th>S"+(i+1)+"</th>";
  h+="<th>&Sigma;</th></tr></thead><tbody>";
  session.ex.forEach(e=>{
    h+="<tr><td><button class='exbtn"+(e.id===state.exId?" active":"")+"' data-ex='"+e.id+"'>"+esc(e.name)+"</button></td>";
    for(let i=0;i<cols;i++){
      const x=e.sets[i];
      if(x===undefined){h+="<td class='cell empty mono'>&middot;</td>";continue;}
      const editing=state.editing&&state.editing.ex===e.id&&state.editing.i===i;
      h+="<td class='cell has mono"+(editing?" editing":"")+"' data-ex='"+e.id+"' data-i='"+i+"'>"+
         x.r+(x.side?"<span class='sd'>/s</span>":"")+
         (x.t?"<span class='ct'>"+fmtClock(x.t)+"</span>":"")+"</td>";
    }
    h+="<td class='sum mono'>"+exerciseTotal(e)+"</td></tr>";
  });
  return h+"</tbody></table></div>";
}

function logPanel(){
  const a=activeEx();
  let h="<div class='card panel'><div class='prow'>"+
    "<div class='plabel'>"+(state.editing?"Editing set":"Logging")+"</div>"+
    "<div class='pactive'>"+(a?esc(a.name):"&mdash;")+"</div></div>";
  h+="<div class='stepper'><button class='round' id='minus'>&minus;</button>"+
     "<div class='repbox'><div class='repnum mono'>"+state.reps+"</div><div class='replbl'>reps</div></div>"+
     "<button class='round' id='plus'>+</button></div>";
  h+="<div class='quick'>";
  QUICK_REPS.forEach(n=>{h+="<button class='q"+(state.reps===n?" on":"")+"' data-q='"+n+"'>"+n+"</button>";});
  h+="</div>";
  h+="<div class='togrow'><button class='q"+(state.perSide?" on":"")+"' id='sidebtn'>Per side</button>"+
     "<span class='hint'>"+(state.perSide?(state.reps*SIDES_PER_SET)+" reps total":"counted once")+"</span></div>";
  if(state.editing){
    h+="<div class='editrow'><button class='btn primary' id='upd'>Update set</button>"+
       "<button class='btn dang' id='del'>Delete</button>"+
       "<button class='btn ghost' id='cxl'>Cancel</button></div>";
  }else{
    h+="<button class='btn log' id='logbtn'>Log set"+(a?" &rarr; "+esc(a.name):"")+"</button>";
  }
  return h+"</div>";
}

function exerciseChips(session){
  let h="<div class='chips'>";
  session.ex.forEach(e=>{
    h+="<span class='chip'>"+esc(e.name)+"<button class='x' data-rm='"+e.id+"'>&times;</button></span>";
  });
  if(state.adding){
    h+="<span><input class='name' id='newname' placeholder='Exercise name' autocomplete='off'> "+
       "<button class='btn primary' id='addok' style='flex:none'>Add</button></span>";
  }else{
    h+="<button class='addbtn' id='addbtn'>+ Exercise</button>";
  }
  return h+"</div>";
}

export function workoutLabel(session){
  const secs=workoutSeconds(session);
  return secs===null?"&mdash;":fmtClock(secs);
}

function timerBar(session){
  return "<div class='timerbar'><div class='tinner'>"+
    "<div class='tstat'><div class='tl'>Set</div><div class='tv mono' id='settime'>"+fmtClock(elapsedSeconds())+"</div></div>"+
    "<div class='tbtns'>"+
    "<button class='btn tmain"+(timer.running?" on":"")+"' id='tstart'>"+(timer.running?"Stop":"Start")+"</button>"+
    "<button class='btn ghost tsmall' id='treset'>Reset</button></div>"+
    "<div class='tstat right'><div class='tl'>Workout</div>"+
    "<div class='tv mono' id='worktime'>"+workoutLabel(session)+"</div>"+
    "<div class='tsub mono' id='worksub'>"+fmtClock(workSeconds(session))+" logged</div></div>"+
    "</div></div>";
}

function logView(){
  const s=getSession();
  return "<div class='head'><div>"+
    "<div class='eyebrow'>Session</div>"+
    "<div class='h1' id='daytitle'>"+esc(s.title)+" <span class='pen'>&#9998;</span></div>"+
    "</div><button class='daysbtn' id='daysbtn'>&#9776; Days ("+state.sessions.length+")</button></div>"+
    statsBar(s,totals(s))+setsTable(s)+logPanel()+exerciseChips(s)+
    "<div class='reset'><button id='reset'>Clear this day's sets</button></div>"+
    timerBar(s);
}

function historyView(){
  let h="<div class='hhead'><button class='backbtn' id='backbtn'>&lsaquo; Back</button>"+
    "<button class='newday' id='newday'>+ New day</button></div>"+
    "<div class='hhead' style='margin-top:-4px;margin-bottom:16px'>"+
    "<button class='backbtn' id='exportcsv'>&#8681; Export CSV</button>"+
    "<button class='backbtn' id='importcsv'>&#8679; Import CSV</button></div>"+
    "<input type='file' id='csvfile' accept='.csv,text/csv' style='display:none'>";
  const list=newestFirst(state.sessions);
  if(!list.length)h+="<div class='empty-note'>No days yet.</div>";
  list.forEach(s=>{
    const t=totals(s),cur=s.id===state.sessionId;
    h+="<div class='day"+(cur?" cur":"")+"' data-load='"+s.id+"'>"+
      "<div class='info'>"+(cur?"<div class='cur-tag'>Current</div>":"")+
      "<div class='t'>"+esc(s.title)+"</div>"+
      "<div class='sub'>"+shortDate(s.created)+" &middot; "+s.ex.length+" exercises</div></div>"+
      "<div class='nums'><div class='r mono'>"+t.reps+"</div><div class='rl'>reps</div></div>"+
      "<button class='del' data-delday='"+s.id+"'>&times;</button></div>";
  });
  return h;
}

export function paint(){
  document.getElementById("app").innerHTML=state.view==="history"?historyView():logView();
}
