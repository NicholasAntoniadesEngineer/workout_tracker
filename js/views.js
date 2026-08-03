import {QUICK_REPS,exerciseTotal,fmtClock,fmtTime,lastSet,setAnchor,setSeconds,shortDate,totals,
  workoutEnd,workoutSeconds} from "./model.js";
import {activeEx,getSession,newestFirst,state} from "./store.js";

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
  if(!session.ex.length)
    return "<div class='card tblwrap empty-card'><div class='empty-note'>"+
      "No exercises yet.<br>Pick some below to start logging.</div></div>";
  const cols=setColumns(session);
  let h="<div class='card tblwrap'><table><thead><tr>"+
    "<th class='exh'><button class='exhbtn' id='managebtn'>Exercise <span class='pen'>&#9998;</span></button></th>";
  for(let i=0;i<cols;i++)h+="<th>S"+(i+1)+"</th>";
  h+="<th>&Sigma;</th></tr></thead><tbody>";
  session.ex.forEach(e=>{
    h+="<tr><td><button class='exbtn"+(e.id===state.exId?" active":"")+"' data-ex='"+e.id+"'>"+esc(e.name)+"</button></td>";
    for(let i=0;i<cols;i++){
      const x=e.sets[i];
      if(x===undefined){h+="<td class='cell empty mono'>&middot;</td>";continue;}
      const editing=state.editing&&state.editing.ex===e.id&&state.editing.i===i;
      h+="<td class='cell has mono"+(editing?" editing":"")+"' data-ex='"+e.id+"' data-i='"+i+"'>"+
         "<span class='cr'>"+x.r+(x.side?"<span class='sd'>/s</span>":"")+"</span>"+
         (x.at?"<span class='ct'>"+esc(fmtTime(x.at))+"</span>":"")+"</td>";
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
    h+="<button class='btn log' id='logbtn'>Log set"+(a?" &rarr; "+esc(a.name):"")+
       (state.mark?" <span class='at'>@ "+esc(fmtTime(state.mark))+"</span>":"")+"</button>";
  }
  return h+"</div>";
}

// Always on screen under the table: whatever is not in today, one tap away. Scrolls
// sideways rather than growing, so it costs the same height however long the list gets.
function addStrip(session){
  const picked={};
  session.ex.forEach(e=>{picked[e.name.trim().toLowerCase()]=true;});
  let h="<div class='addstrip'><span class='striplbl'>Add</span><div class='striprow'>";
  state.catalog.filter(n=>!picked[n.trim().toLowerCase()]).forEach(n=>{
    h+="<button class='chip spick' data-add=\""+esc(n)+"\">"+esc(n)+"</button>";
  });
  if(state.adding){
    h+="<span class='addrow'><input class='name' id='newname' placeholder='New exercise' autocomplete='off'>"+
       "<button class='btn primary' id='addok'>Add</button></span>";
  }else{
    h+="<button class='addbtn' id='addbtn'>+ New</button>";
  }
  return h+"</div></div>";
}

// Days start empty: you pick what you are training from your list. Tapping a name in
// Your list adds it to the day; the × beside it drops it from the list for good.
function pickerPanel(session){
  const picked={};
  session.ex.forEach(e=>{picked[e.name.trim().toLowerCase()]=true;});
  const rest=state.catalog.filter(n=>!picked[n.trim().toLowerCase()]);
  let h="<div class='card panel'><div class='prow'>"+
    "<div class='plabel'>"+(session.ex.length?"Today's exercises":"Pick today's exercises")+"</div>"+
    (session.ex.length?"<button class='btn ghost tiny' id='managedone'>Done</button>":"")+
    "</div>";

  h+="<div class='chips'>";
  if(!session.ex.length)h+="<span class='pickmsg'>Nothing picked yet.</span>";
  session.ex.forEach(e=>{
    h+="<span class='chip on'>"+esc(e.name)+
       "<button class='x' data-rm='"+e.id+"'>&times;</button></span>";
  });
  h+="</div>";

  h+="<div class='picklbl'>Your list</div><div class='chips'>";
  rest.forEach(n=>{
    h+="<span class='chip'><button class='pick' data-add=\""+esc(n)+"\">"+esc(n)+"</button>"+
       "<button class='x' data-delcat=\""+esc(n)+"\">&times;</button></span>";
  });
  if(state.adding){
    h+="<span class='addrow'><input class='name' id='newname' placeholder='New exercise' autocomplete='off'>"+
       "<button class='btn primary' id='addok'>Add</button></span>";
  }else{
    h+="<button class='addbtn' id='addbtn'>+ New</button>";
  }
  h+="</div>";

  if(session.ex.length)h+="<div class='reset'><button id='reset'>Clear this day's sets</button></div>";
  return h+"</div>";
}

export function workoutLabel(session){
  const secs=workoutSeconds(session);
  return secs===null?"&mdash;":fmtClock(secs);
}

export function workoutSub(session){
  if(!session.started)return "not started";
  if(session.running)return "from "+fmtTime(session.started);
  return fmtTime(session.started)+"&ndash;"+fmtTime(workoutEnd(session));
}

// Mid-workout the set clock runs; once the workout stops it reports the last set's gap.
export function setClockSeconds(session){
  if(session.running)return setSeconds(session,state.mark);
  const last=lastSet(session);
  return last?last.t:0;
}

export function setSub(session){
  if(!session.started)return "start the workout";
  if(!session.running)return lastSet(session)?"last set":"paused";
  if(state.mark)return "held at "+fmtTime(state.mark);
  return "since "+fmtTime(setAnchor(session));
}

function timerBar(session){
  const on=!!session.running,marked=!!state.mark;
  return "<div class='timerbar'><div class='tinner'>"+
    "<div class='tcell'>"+
      "<div class='tl'>Workout</div>"+
      "<div class='tv mono' id='worktime'>"+workoutLabel(session)+"</div>"+
      "<div class='tsub' id='worksub'>"+workoutSub(session)+"</div>"+
      "<button class='tbtn "+(on?"stop":"go")+"' id='wtoggle'>"+(on?"End workout":"Start workout")+"</button>"+
    "</div>"+
    "<div class='tcell'>"+
      "<div class='tl'>Since last set</div>"+
      "<div class='tv mono"+(marked?" held":"")+"' id='settime'>"+fmtClock(setClockSeconds(session))+"</div>"+
      "<div class='tsub' id='setsub'>"+setSub(session)+"</div>"+
      "<button class='tbtn"+(marked?" on":"")+"' id='markbtn'>"+
        (marked?"Clear "+esc(fmtTime(state.mark)):"Mark now")+"</button>"+
    "</div></div></div>";
}

function logView(){
  const s=getSession();
  return "<div class='wrap'>"+
    "<div class='head'><div>"+
    "<div class='eyebrow'>Session</div>"+
    "<div class='h1' id='daytitle'>"+esc(s.title)+" <span class='pen'>&#9998;</span></div>"+
    "</div><button class='daysbtn' id='daysbtn'>&#9776; Days ("+state.sessions.length+")</button></div>"+
    statsBar(s,totals(s))+setsTable(s)+
    ((state.manage||!s.ex.length)?pickerPanel(s):addStrip(s)+logPanel())+
    "</div>"+timerBar(s);
}

function historyView(){
  let h="<div class='wrap scroll'>"+
    "<div class='hhead'><button class='backbtn' id='backbtn'>&lsaquo; Back</button>"+
    "<button class='newday' id='newday'>+ New day</button></div>"+
    "<div class='hhead csvrow'>"+
    "<button class='backbtn' id='exportcsv'>&#8681; Export CSV</button>"+
    "<button class='backbtn' id='importcsv'>&#8679; Import CSV</button></div>"+
    "<input type='file' id='csvfile' accept='.csv,text/csv' style='display:none'>";
  const list=newestFirst(state.sessions);
  if(!list.length)h+="<div class='empty-note'>No days yet.</div>";
  list.forEach(s=>{
    const t=totals(s),cur=s.id===state.sessionId,secs=workoutSeconds(s);
    h+="<div class='day"+(cur?" cur":"")+"' data-load='"+s.id+"'>"+
      "<div class='info'>"+(cur?"<div class='cur-tag'>Current</div>":"")+
      "<div class='t'>"+esc(s.title)+"</div>"+
      "<div class='sub'>"+shortDate(s.created)+" &middot; "+s.ex.length+" exercises"+
      (secs===null?"":" &middot; "+fmtClock(secs))+
      (s.running?" <span class='live'>live</span>":"")+"</div></div>"+
      "<div class='nums'><div class='r mono'>"+t.reps+"</div><div class='rl'>reps</div></div>"+
      "<button class='del' data-delday='"+s.id+"'>&times;</button></div>";
  });
  return h+"</div>";
}

export function paint(){
  document.getElementById("app").innerHTML=state.view==="history"?historyView():logView();
}
