// The logging screen: the day's table of sets, the panel that logs them, the exercise
// strip and picker sheet, and the two-clock timer bar.
import {BANDS,EXERCISE_GROUPS,OTHER_GROUP,exerciseGroup,
  exerciseTotal,fmtClock,fmtTime,isBandExercise,lastSet,restSeconds,secondsSince,setAnchor,
  shortDate,totals,workoutEnd,workoutSeconds} from "../model.js";
import {activeEx,getSession,lastPerformance,newestFirst,state} from "../store.js";
import {est1RM} from "../charts.js";
import {icon} from "../icons.js";
import {esc} from "./common.js";

const MIN_SET_COLUMNS=1;

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
      "No exercises yet.<br>Tap + Add to start logging.</div></div>";
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
      h+="<td class='cell has mono"+(editing?" editing":"")+(x.wu?" wu":"")+
         "' data-ex='"+e.id+"' data-i='"+i+"'>"+
         "<span class='cr'>"+x.r+(e.timed?"<span class='sd'>s</span>":"")+
         (x.side?"<span class='sd'>/s</span>":"")+
         (x.band?"<span class='wt band'>"+esc(x.band)+"</span>":(x.w?"<span class='wt'>"+x.w+"</span>":""))+
         (x.wu?"<span class='wt wumk'>w</span>":"")+"</span>"+
         ((x.at&&state.settings.showSetTimes)?"<span class='ct'>"+esc(fmtTime(x.at))+"</span>":"")+"</td>";
    }
    // A timed exercise's total is time under tension, so it reads as a clock, not a count.
    h+="<td class='sum mono'>"+(e.timed?fmtClock(exerciseTotal(e)):exerciseTotal(e))+"</td></tr>";
  });
  return h+"</tbody></table></div>";
}

// A day's sets in one line — "10, 10/s, 8 @12" — for the previous-performance strip
// and the history sheet. Timed exercises read in seconds: "30s, 45s".
export function setsSummary(sets,timed){
  const parts=sets.slice(0,8).map(x=>x.r+(timed?"s":"")+(x.side?"/s":"")+
    (x.band?" "+x.band:(x.w?" @"+x.w:""))+(x.wu?"w":""));
  return parts.join(", ")+(sets.length>8?" &hellip;":"");
}

// One control for reps, weight and band: a label, a ± stepper, and a tappable value that
// opens the editor. Band values (a range string) don't get a unit suffix in the number.
function numTile(label,field,value,cap,isBand){
  const shown=isBand?esc(String(value)):value;
  return "<div class='numctl'><div class='nl'>"+label+"</div>"+
    "<div class='numstep'>"+
      "<button class='rnd' data-step='"+field+":-1'>&minus;</button>"+
      "<button class='numval"+(isBand?" bandval":"")+"' data-edit='"+field+"'>"+shown+"</button>"+
      "<button class='rnd' data-step='"+field+":1'>+</button></div>"+
    "<div class='numcap'>"+cap+"</div></div>";
}

// The tap-to-edit window: a keypad for reps/weight/seconds, the three bands for a band tile.
function numEditor(a){
  const f=state.numEdit,unit=state.settings.unit||"kg";
  let h="<div class='overlay' id='numedback'><div class='sheet actionsheet numed'>";
  if(f.field==="band"){
    h+="<div class='sheethead'><div class='plabel'>Band &middot; lb</div>"+
       "<button class='btn ghost tiny' id='numedclose'>Close</button></div><div class='sheetbody'>"+
       "<div class='bandopts'>"+
       "<button class='bandopt"+(!state.band?" sel":"")+"' data-band=''>None &mdash; bodyweight</button>";
    BANDS.forEach(bd=>{
      h+="<button class='bandopt"+(state.band===bd?" sel":"")+"' data-band=\""+esc(bd)+"\">"+esc(bd)+"</button>";
    });
    return h+"</div></div></div></div>";
  }
  const timed=!!(a&&a.timed);
  const title=f.field==="weight"?"Weight &middot; "+esc(unit):(timed?"Seconds":"Reps");
  const cur=f.field==="weight"?(state.weight||0):state.reps;
  h+="<div class='sheethead'><div class='plabel'>"+title+"</div>"+
     "<button class='btn ghost tiny' id='numedcancel'>Cancel</button></div><div class='sheetbody'>";
  h+="<div class='numfield mono'>"+(f.buf===""?"<span class='ph'>"+cur+"</span>":esc(f.buf))+
     "<span class='caret'></span></div>";
  h+="<div class='keypad'>";
  ["1","2","3","4","5","6","7","8","9"].forEach(k=>h+="<button class='key' data-key='"+k+"'>"+k+"</button>");
  h+="<button class='key' data-key='back'>&larr;</button>"+
     "<button class='key' data-key='0'>0</button>"+
     "<button class='key done' data-key='done'>&#10003;</button>";
  h+="</div></div></div></div>";
  return h;
}

function logPanel(){
  const a=activeEx();
  // No header while logging: the Log set button already names the exercise, and the space
  // is better given to the table. Editing keeps one, since its buttons name nothing.
  let h="<div class='card panel'>";
  // What this exercise looked like last time it was trained — the number to beat.
  // Tapping it opens the exercise's full history and records.
  const prev=(a&&!state.editing)?lastPerformance(a.name):null;
  if(prev){
    h+="<button class='prevline' id='exhistbtn'><span class='prevlbl'>Last</span> "+
       esc(shortDate(prev.session.created))+" &middot; <span class='mono'>"+
       setsSummary(prev.ex.sets,prev.ex.timed)+"</span> <span class='prevmore'>&rsaquo;</span></button>";
  }
  if(state.editing){
    h+="<div class='prow'><div class='plabel'>Editing set</div>"+
       "<div class='pactive'>"+(a?esc(a.name):"&mdash;")+"</div></div>";
  }
  // Reps and load share one control: a labelled tile with a ± stepper and a tappable number
  // that opens the keypad. A timed exercise counts seconds; a band one carries a range, not lbs.
  const timed=!!(a&&a.timed);
  const unit=state.settings.unit||"kg";
  const isBand=!!(a&&isBandExercise(a.name));
  h+="<div class='dualrow'>"+
     numTile(timed?"Secs":"Reps","reps",state.reps,"tap to type")+
     (isBand?
       numTile("Band","band",state.band||"None","lb &middot; &plusmn; cycles",true):
       numTile("Weight","weight",state.weight,esc(unit)+" &middot; 0 = bodyweight"))+
     "</div>";
  // Per-side doubling and warm-up are per set; Secs mode belongs to the exercise itself.
  h+="<div class='togrow'>"+
     "<button class='q"+(state.perSide?" on":"")+"' id='sidebtn'>Per side</button>"+
     "<button class='q"+(state.warmup?" on":"")+"' id='warmbtn' "+
       "title='Warm-up sets stay out of totals and records'>Warm-up</button>"+
     (a?"<button class='q"+(timed?" on":"")+"' id='timedbtn' "+
       "title='Count this exercise in seconds instead of reps'>Secs</button>":"")+
     "</div>";
  if(state.editing){
    // Every set is fully editable — reps and weight above, its recorded times here — so a
    // workout done off-app can be typed in completely.
    const secs=v=>{const s=Math.max(0,Math.round(v||0)),m=Math.floor(s/60);
      return m+":"+String(s%60).padStart(2,"0");};
    h+="<div class='timerow'>"+
       "<label class='timefield'><span>Rest</span>"+
         "<input class='timein mono' id='editrest' inputmode='numeric' value='"+
         secs(state.editRest)+"'></label>"+
       "<label class='timefield'><span>Work</span>"+
         "<input class='timein mono' id='editwork' inputmode='numeric' value='"+
         secs(state.editWork)+"'></label></div>";
    h+="<div class='editrow'><button class='btn primary' id='upd'>Update set</button>"+
       "<button class='btn dang' id='del'>Delete</button>"+
       "<button class='btn ghost' id='cxl'>Cancel</button></div>";
  }else{
    h+="<div class='logrow'>"+
       "<button class='btn log' id='logbtn'"+(a?"":" disabled")+">Log set"+
       (a?" &rarr; "+esc(a.name):"")+
       (state.setStart?" <span class='at'>@ "+esc(fmtTime(state.setStart))+"</span>":"")+
       "</button></div>";
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
  // Always closable, whether or not anything has been picked — looking is allowed.
  let h="<div class='overlay' id='sheetback'><div class='sheet'>"+
    "<div class='sheethead'><div class='plabel'>"+
      (session.ex.length?"Today's exercises":"Pick today's exercises")+"</div>"+
    "<button class='btn "+(session.ex.length?"primary":"ghost")+" tiny' id='sheetdone'>"+
      (session.ex.length?"Done":"Close")+"</button>"+
    "</div><div class='sheetbody'>";

  h+="<div class='chips'>";
  if(!session.ex.length)h+="<span class='pickmsg'>Nothing picked yet.</span>";
  session.ex.forEach(e=>{
    h+="<span class='chip on'>"+esc(e.name)+
       "<button class='x' data-rm='"+e.id+"'>&times;</button></span>";
  });
  h+="</div>";

  // Search filters the list as you type — the list is long enough now to warrant it.
  const q=(state.exSearch||"").trim().toLowerCase();
  h+="<div class='searchrow'><input class='searchin' id='exsearch' type='search' "+
     "placeholder='Search exercises' autocomplete='off' value='"+esc(state.exSearch||"")+"'>"+
     (q?"<button class='searchx' id='exsearchx'>&times;</button>":"")+"</div>";
  const shown=q?rest.filter(n=>n.toLowerCase().indexOf(q)>=0):rest;

  // Grouped by movement, so a long list stays readable. Empty groups are left out.
  const byGroup={};
  shown.forEach(n=>{
    const g=exerciseGroup(n);
    (byGroup[g]=byGroup[g]||[]).push(n);
  });
  EXERCISE_GROUPS.map(g=>g[0]).concat(OTHER_GROUP).forEach(g=>{
    const names=byGroup[g];
    if(!names)return;
    h+="<div class='picklbl'>"+esc(g)+"</div><div class='sheetgrid'>";
    names.forEach(n=>{
      h+="<span class='chip sheetitem'><button class='pick' data-add=\""+esc(n)+"\">"+
         esc(n)+"</button><button class='x' data-delcat=\""+esc(n)+"\">&times;</button></span>";
    });
    h+="</div>";
  });
  if(q&&!shown.length)
    h+="<div class='empty-note'>No match for &ldquo;"+esc(state.exSearch)+"&rdquo;.<br>"+
       "Use + New exercise below to add it.</div>";
  h+="<div class='sheetadd'>";
  if(state.adding){
    h+="<input class='name' id='newname' placeholder='New exercise' autocomplete='off'>"+
       "<button class='btn primary' id='addok'>Add</button>";
  }else{
    h+="<button class='addbtn' id='addbtn'>+ New exercise</button>";
  }
  h+="</div>";

  // Routines: today's list saved under a name, and saved ones applied or dropped here.
  if(state.routines.length||session.ex.length){
    h+="<div class='picklbl'>Routines</div><div class='chips'>";
    state.routines.forEach(r=>{
      h+="<span class='chip rchip'><button class='pick' data-applyroutine='"+r.id+"'>"+
         esc(r.name)+" <span class='rn'>"+r.ex.length+"</span></button>"+
         "<button class='x share' data-shareroutine='"+r.id+"' title='Share this routine'>"+icon("share","sm")+"</button>"+
         "<button class='x' data-delroutine='"+r.id+"'>&times;</button></span>";
    });
    if(session.ex.length)
      h+="<button class='addbtn' id='saveroutine'>+ Save day as routine</button>";
    h+="</div>";
  }
  if(session.ex.length)
    h+="<div class='reset'><button id='reset'>Clear this day's sets</button></div>";
  return h+"</div></div></div>";
}

// Everything this exercise has ever done, newest day first, with its records on top.
function exerciseHistorySheet(name){
  const k=String(name).trim().toLowerCase();
  const days=[];
  let bestW=null,bestRM=null,bestR=null,setCount=0;
  newestFirst(state.sessions).forEach(s=>{
    const e=s.ex.find(x=>x.name.trim().toLowerCase()===k&&x.sets.length);
    if(!e)return;
    days.push({s,e});
    e.sets.forEach(x=>{
      setCount++;
      if(x.wu)return;   // warm-ups are logged but never records
      if(x.w&&(!bestW||x.w>bestW.w||(x.w===bestW.w&&x.r>bestW.r)))bestW={w:x.w,r:x.r,at:s.created};
      if(x.w&&(!bestRM||est1RM(x.w,x.r)>bestRM.v))bestRM={v:est1RM(x.w,x.r),at:s.created};
      if(!bestR||x.r>bestR.r)bestR={r:x.r,w:x.w,at:s.created};
    });
  });
  const unit=esc(state.settings.unit||"kg");
  let h="<div class='overlay' id='histback'><div class='sheet'>"+
    "<div class='sheethead'><div class='plabel'>"+esc(name)+"</div>"+
    "<button class='btn ghost tiny' id='histdone'>Close</button></div>"+
    "<div class='sheetbody'>";
  h+="<div class='prgrid'>"+
    "<div class='stat'><div class='v mono'>"+(bestW?bestW.w+"<span class='pru'>"+unit+"</span>":"&mdash;")+
      "</div><div class='l'>Best weight"+(bestW?" &times;"+bestW.r:"")+"</div></div>"+
    "<div class='stat'><div class='v mono'>"+(bestRM?bestRM.v+"<span class='pru'>"+unit+"</span>":"&mdash;")+
      "</div><div class='l'>Est 1RM</div></div>"+
    "<div class='stat'><div class='v mono'>"+(bestR?bestR.r:"&mdash;")+"</div><div class='l'>Best "+
      (days.length&&days[0].e.timed?"secs":"reps")+"</div></div>"+
    "<div class='stat'><div class='v mono'>"+setCount+"</div><div class='l'>Sets logged</div></div></div>";
  days.forEach(d=>{
    h+="<div class='histrow'><span class='histdate'>"+esc(shortDate(d.s.created))+"</span>"+
       "<span class='histsets mono'>"+setsSummary(d.e.sets,d.e.timed)+"</span></div>";
  });
  if(!days.length)h+="<div class='empty-note'>No sets logged yet.</div>";
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
        "<button class='tbtn narrow' id='timerreset' title='Reset the rest clock'>"+icon("reset")+"</button>"+
      "</div></div>"+
    "<div class='tcell'>"+
      "<div class='tl'>Workout</div>"+
      "<div class='tv mono edit' id='worktime' title='Tap to set the elapsed time'>"+
        workoutLabel(session)+"</div>"+
      "<div class='tsub' id='worksub'>"+workoutSub(session)+"</div>"+
      "<div class='tbtnrow'>"+
        "<button class='tbtn "+(on?"stop":"go")+"' id='wtoggle'>"+
          (on?"End workout":"Start workout")+"</button>"+
        "<button class='tbtn narrow' id='workreset' title='Reset the workout time'>"+icon("reset")+"</button>"+
      "</div></div></div></div>";
}

export function logView(){
  const s=getSession();
  return "<div class='wrap'>"+
    "<div class='head'><div>"+
    "<div class='eyebrow'>Session</div>"+
    "<div class='h1' id='daytitle'>"+esc(s.title)+" <span class='pen'>&#9998;</span></div>"+
    "</div><div class='headbtns'>"+
    (s.ex.length?
      "<button class='daysbtn iconbtn' id='sharebtn' title='"+
      (s.ex.some(e=>e.sets.length)?"Share this day":"Share this workout plan")+
      "'>"+icon("share")+"</button>":"")+
    "<button class='daysbtn iconbtn' id='homebtn' title='Home'>"+icon("home")+"</button>"+
    "<button class='daysbtn' id='daysbtn' title='Days'>"+icon("days")+
      "<span class='cnt'>"+state.sessions.length+"</span></button>"+
    "<button class='daysbtn iconbtn' id='settingsbtn' title='Settings'>"+icon("settings")+"</button>"+
    "</div></div>"+
    statsBar(s,totals(s))+setsTable(s)+
    exerciseStrip(s)+logPanel()+
    "</div>"+timerBar(s)+
    (state.sheet?exerciseSheet(s):"")+
    (state.numEdit?numEditor(activeEx()):"")+
    (state.exHist&&activeEx()?exerciseHistorySheet(activeEx().name):"");
}
