import {QUICK_REPS,QUICK_WEIGHTS,exerciseTotal,fmtClock,fmtTime,lastSet,restSeconds,secondsSince,setAnchor,
  shortDate,totals,workoutEnd,workoutSeconds} from "./model.js";
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
  let h="<div class='card tblwrap"+(state.dragId?" dragging":"")+"' data-keepx='tbl'>"+
    "<table><thead><tr><th class='exh'>"+
    "<button class='exhbtn' id='managebtn'>Exercise <span class='pen'>&#9998;</span></button></th>";
  for(let i=0;i<cols;i++)h+="<th>S"+(i+1)+"</th>";
  h+="<th>&Sigma;</th></tr></thead><tbody>";
  session.ex.forEach(e=>{
    const held=state.dragId===e.id;
    h+="<tr"+(held?" class='held'":"")+"><td>"+
       "<button class='exbtn"+(e.id===state.exId?" active":"")+(held?" held":"")+
       "' data-ex='"+e.id+"'>"+esc(e.name)+"</button></td>";
    for(let i=0;i<cols;i++){
      const x=e.sets[i];
      if(x===undefined){h+="<td class='cell empty mono'>&middot;</td>";continue;}
      const editing=state.editing&&state.editing.ex===e.id&&state.editing.i===i;
      h+="<td class='cell has mono"+(editing?" editing":"")+"' data-ex='"+e.id+"' data-i='"+i+"'>"+
         "<span class='cr'>"+x.r+(x.side?"<span class='sd'>/s</span>":"")+
         (x.w?"<span class='wt'>"+x.w+"</span>":"")+"</span>"+
         ((x.at&&state.settings.showSetTimes)?"<span class='ct'>"+esc(fmtTime(x.at))+"</span>":"")+"</td>";
    }
    h+="<td class='sum mono'>"+exerciseTotal(e)+"</td></tr>";
  });
  return h+"</tbody></table></div>";
}

function logPanel(){
  const a=activeEx();
  // No header while logging: the Log set button already names the exercise, and the space
  // is better given to the table. Editing keeps one, since its buttons name nothing.
  let h="<div class='card panel'>";
  if(state.editing){
    h+="<div class='prow'><div class='plabel'>Editing set</div>"+
       "<div class='pactive'>"+(a?esc(a.name):"&mdash;")+"</div></div>";
  }
  h+="<div class='stepper'><button class='round' id='minus'>&minus;</button>"+
     "<div class='repbox'><div class='repnum mono'>"+state.reps+"</div><div class='replbl'>reps</div></div>"+
     "<button class='round' id='plus'>+</button></div>";
  h+="<div class='quick'>";
  QUICK_REPS.forEach(n=>{h+="<button class='q"+(state.reps===n?" on":"")+"' data-q='"+n+"'>"+n+"</button>";});
  h+="</div>";
  // Weight sits behind its own chip: off means bodyweight, on opens the quick weights.
  const unit=state.settings.unit||"kg";
  h+="<div class='togrow'>"+
     "<button class='q"+(state.perSide?" on":"")+"' id='sidebtn'>Per side</button>"+
     "<button class='q"+(state.weight?" on":"")+"' id='weightbtn'>"+
       (state.weight?state.weight+" "+esc(unit):"Bodyweight")+"</button>"+
     "<span class='hint'>"+(state.perSide?(state.reps*SIDES_PER_SET)+" reps":"counted once")+
     "</span></div>";
  if(state.weight){
    h+="<div class='quick weights'>";
    QUICK_WEIGHTS.forEach(n=>{
      h+="<button class='q"+(state.weight===n?" on":"")+"' data-w='"+n+"'>"+n+"</button>";
    });
    h+="<button class='q' id='weightother'>&hellip;</button></div>";
  }
  if(state.editing){
    h+="<div class='editrow'><button class='btn primary' id='upd'>Update set</button>"+
       "<button class='btn dang' id='del'>Delete</button>"+
       "<button class='btn ghost' id='cxl'>Cancel</button></div>";
  }else{
    h+="<button class='btn log' id='logbtn'>Log set"+(a?" &rarr; "+esc(a.name):"")+
       (state.setStart?" <span class='at'>@ "+esc(fmtTime(state.setStart))+"</span>":"")+"</button>";
  }
  return h+"</div>";
}

// Always on screen under the table, and the only place exercises are added or dropped
// mid-workout: today's first with an ×, then the rest with a + to add. Scrolls sideways
// rather than growing, so it costs the same height however long the list gets.
// Only today's exercises live here — a handful, so switching between them stays one tap.
// The full list is too long to scroll past, so it opens as a sheet instead.
function exerciseStrip(session){
  let h="<div class='addstrip'><div class='striprow' data-keepx='strip'>";
  session.ex.forEach(e=>{
    h+="<button class='chip on"+(e.id===state.exId?" sel":"")+"' data-sel='"+e.id+"'>"+
       esc(e.name)+"</button>";
  });
  h+="</div><div class='stripact'>"+
     "<button class='addbtn' id='opensheet'>+ Add</button>";
  const a=activeEx();
  if(a)h+="<button class='rmbtn' id='removesel'>&minus; Remove</button>";
  return h+"</div></div>";
}

// The whole list, as a sheet over the app: pick several, drop several, then close.
function exerciseSheet(session){
  const picked={};
  session.ex.forEach(e=>{picked[e.name.trim().toLowerCase()]=true;});
  const rest=state.catalog.filter(n=>!picked[n.trim().toLowerCase()]);
  let h="<div class='overlay' id='sheetback'><div class='sheet'>"+
    "<div class='sheethead'><div class='plabel'>"+
      (session.ex.length?"Today's exercises":"Pick today's exercises")+"</div>"+
    (session.ex.length?"<button class='btn primary tiny' id='sheetdone'>Done</button>":"")+
    "</div><div class='sheetbody'>";

  h+="<div class='chips'>";
  if(!session.ex.length)h+="<span class='pickmsg'>Nothing picked yet.</span>";
  session.ex.forEach(e=>{
    h+="<span class='chip on'>"+esc(e.name)+
       "<button class='x' data-rm='"+e.id+"'>&times;</button></span>";
  });
  h+="</div>";

  h+="<div class='picklbl'>Your list</div><div class='sheetgrid'>";
  rest.forEach(n=>{
    h+="<span class='chip sheetitem'><button class='pick' data-add=\""+esc(n)+"\">"+
       esc(n)+"</button><button class='x' data-delcat=\""+esc(n)+"\">&times;</button></span>";
  });
  h+="</div><div class='sheetadd'>";
  if(state.adding){
    h+="<input class='name' id='newname' placeholder='New exercise' autocomplete='off'>"+
       "<button class='btn primary' id='addok'>Add</button>";
  }else{
    h+="<button class='addbtn' id='addbtn'>+ New exercise</button>";
  }
  h+="</div>";
  if(session.ex.length)
    h+="<div class='reset'><button id='reset'>Clear this day's sets</button></div>";
  return h+"</div></div></div>";
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

// One clock, three things to say: the set you are in, the rest since the last one, or —
// once the workout has stopped — how long the last set took.
export function setClockSeconds(session){
  if(state.setStart)return secondsSince(state.setStart);
  if(session.running)return restSeconds(session);
  const last=lastSet(session);
  return last?last.t:0;
}

export function setLabel(session){
  if(state.setStart)return "This set";
  return session.running?"Rest":"Last set";
}

export function setSub(session){
  if(state.setStart)return "started "+fmtTime(state.setStart);
  if(!session.started)return "start the workout";
  if(!session.running)return lastSet(session)?"work time":"paused";
  return "since "+fmtTime(setAnchor(session));
}

function timerBar(session){
  const on=!!session.running,timing=!!state.setStart;
  return "<div class='timerbar'><div class='tinner'>"+
    "<div class='tcell'>"+
      "<div class='tl' id='setlbl'>"+setLabel(session)+"</div>"+
      "<div class='tv mono"+(timing?" held":"")+"' id='settime'>"+fmtClock(setClockSeconds(session))+"</div>"+
      "<div class='tsub' id='setsub'>"+setSub(session)+"</div>"+
      "<div class='tbtnrow'>"+
        "<button class='tbtn"+(timing?" on":" go")+"' id='setstart'>"+
          (timing?"Cancel":"Start set")+"</button>"+
        "<button class='tbtn narrow' id='timerreset' title='Reset the rest clock'>&#8635;</button>"+
      "</div></div>"+
    "<div class='tcell'>"+
      "<div class='tl'>Workout</div>"+
      "<div class='tv mono edit' id='worktime' title='Tap to set the elapsed time'>"+
        workoutLabel(session)+"</div>"+
      "<div class='tsub' id='worksub'>"+workoutSub(session)+"</div>"+
      "<div class='tbtnrow'>"+
        "<button class='tbtn "+(on?"stop":"go")+"' id='wtoggle'>"+
          (on?"End workout":"Start workout")+"</button>"+
      "</div></div></div></div>";
}

function logView(){
  const s=getSession();
  return "<div class='wrap'>"+
    "<div class='head'><div>"+
    "<div class='eyebrow'>Session</div>"+
    "<div class='h1' id='daytitle'>"+esc(s.title)+" <span class='pen'>&#9998;</span></div>"+
    "</div><div class='headbtns'>"+
    "<button class='daysbtn' id='daysbtn'>&#9776; Days ("+state.sessions.length+")</button>"+
    "<button class='daysbtn iconbtn' id='settingsbtn' title='Settings'>&#9881;</button>"+
    "</div></div>"+
    statsBar(s,totals(s))+setsTable(s)+
    exerciseStrip(s)+logPanel()+
    "</div>"+timerBar(s)+
    ((state.sheet||!s.ex.length)?exerciseSheet(s):"");
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

const TEXT_SIZES=[["Auto",0],["XS",.7],["Small",.85],["Medium",1],
  ["Large",1.25],["XL",1.55],["XXL",1.9]];
const THEMES=[["System","system"],["Light","light"],["Dark","dark"]];
const START_REPS=[5,8,10,12,15,20];
const IDLE_ENDS=[["30 min",30],["1 hour",60],["2 hours",120],["Never",0]];

function choiceRow(label,hint,key,pairs){
  const cur=state.settings[key];
  let h="<div class='setrow'><div class='setlbl'>"+label+"</div>"+
    (hint?"<div class='sethint'>"+hint+"</div>":"")+"<div class='setopts'>";
  pairs.forEach(p=>{
    const text=p[0],val=p[1];
    h+="<button class='q"+(cur===val?" on":"")+"' data-set='"+key+"' data-val='"+val+"'>"+text+"</button>";
  });
  return h+"</div></div>";
}

function toggleRow(label,hint,key){
  const on=!!state.settings[key];
  return "<div class='setrow'><div class='setlbl'>"+label+"</div>"+
    (hint?"<div class='sethint'>"+hint+"</div>":"")+"<div class='setopts'>"+
    "<button class='q"+(on?" on":"")+"' data-set='"+key+"' data-val='1'>On</button>"+
    "<button class='q"+(on?"":" on")+"' data-set='"+key+"' data-val='0'>Off</button>"+
    "</div></div>";
}

function settingsView(){
  return "<div class='wrap scroll'>"+
    "<div class='hhead'><button class='backbtn' id='backbtn'>&lsaquo; Back</button>"+
    "<div class='h1 plain'>Settings</div></div>"+

    "<div class='setgroup'>Display</div>"+
    choiceRow("Text size","Auto shrinks text so the whole day fits the window. "+
      "A fixed size is kept exactly, and the table scrolls if the day outgrows it.",
      "textScale",TEXT_SIZES)+
    choiceRow("Theme","",
      "theme",THEMES)+
    toggleRow("Time of each set","Shown under the reps in the grid.","showSetTimes")+

    "<div class='setgroup'>Logging</div>"+
    choiceRow("Starting reps","What the counter opens on.","startReps",
      START_REPS.map(n=>[String(n),n]))+
    toggleRow("Per side counts double","10 per side totals 20 rather than 10.","perSideDouble")+
    choiceRow("Weight unit","","unit",[["kg","kg"],["lb","lb"]])+

    "<div class='setgroup'>Workout</div>"+
    choiceRow("End an idle workout after",
      "Backdated to the last set, so a session left running does not count all night.",
      "idleEndMinutes",IDLE_ENDS)+

    "<div class='reset'><button id='resetsettings'>Restore defaults</button></div>"+
    "</div>";
}

const VIEWS={history:historyView,settings:settingsView};

export function paint(){
  document.getElementById("app").innerHTML=(VIEWS[state.view]||logView)();
}
