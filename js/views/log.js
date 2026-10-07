// The logging screen: the day's table of sets, the panel that logs them, the exercise
// strip and picker sheet, and the two-clock timer bar.
import {BANDS,EXERCISE_GROUPS,OTHER_GROUP,SET_KINDS,canResume,exerciseGroup,isBarbellLift,platesPerSide,
  exerciseTotal,fmtClock,isBandExercise,lastSet,restSeconds,secondsSince,
  shortDate,totals,unitOf,workoutOffset,workoutSeconds} from "../model.js";
import {activeEx,allRoutines,findRoutine,getSession,lastPerformance,newestFirst,planFor,planLine,repRange,restTargetFor,
  state} from "../store.js";
import {warmupRamp} from "../coach.js";
import {barFor,exProg,perHand,rangeFor,stepFor,targetFor,unitFor} from "../progression.js";
import {JOINT_NAME,musclesOf} from "../muscles.js";
import {recovering,soreToday} from "./checkin.js";
import {cuesFor} from "../cues.js";
import {exAka,exMatches,exWhat,learnTopicsFor} from "../exinfo.js";
import {position,prescription} from "../programme.js";
import {est1RM,exerciseRecords,exerciseTrend,lineChart,withAxis} from "../charts.js";
import {icon} from "../icons.js";
import {esc,wide} from "./common.js";

const MIN_SET_COLUMNS=1;
const UNIT_LABEL={reps:"Reps",secs:"Secs",m:"Metres"};
// Past days offered for saving as a routine — the recent ones; History reaches the rest.
const PAST_DAYS_SHOWN=8;

const kindLabel=k=>(SET_KINDS.find(x=>x[0]===k)||[k,k])[1];

function setColumns(session){
  return session.ex.reduce((most,e)=>Math.max(most,e.sets.length),MIN_SET_COLUMNS);
}

function statsBar(session,t){
  return "<div class='stats'>"+
    "<div class='stat big'><div class='v mono'>"+t.reps+"</div><div class='l'>Total reps</div></div>"+
    "<div class='stat'><div class='v mono'>"+t.sets+"</div><div class='l'>Sets</div></div>"+
    "<div class='stat'><div class='v mono'>"+session.ex.length+"</div><div class='l'>Exercises</div></div></div>";
}
// Which gym this workout is at, when you have more than one place you train. Records and
// suggestions then come from that gym's own history.
function gymPick(session){
  const gs=state.gyms||[];if(!gs.length)return "";
  const cur=session.gym||state.gymId||"";
  return "<select class='pickchip gympick' id='gympick' aria-label='Gym'><option value=''"+(cur?"":" selected")+">No gym</option>"+
    gs.map(g=>"<option value='"+esc(g.id)+"'"+(g.id===cur?" selected":"")+">"+esc(g.name)+"</option>").join("")+"</select>";
}
// A word of caution on the chosen exercise: a joint marked sore today, or its main muscle still
// recovering from the last session.
function bodyCaution(e){
  if(!e)return "";
  const m=musclesOf(e.name),sore=soreToday().filter(j=>m.joints.indexOf(j)>=0);
  if(sore.length)return "Your "+sore.map(j=>JOINT_NAME[j].toLowerCase()).join(" and ")+(sore.length>1?" are":" is")+" sore today: go lighter, or swap for something easier on it.";
  const rec=recovering().filter(x=>m.primary.indexOf(x.key)>=0);
  if(rec.length&&!e.sets.length)return rec.map(x=>x.name).join(" and ")+" still recovering: fewer sets, or another muscle today.";
  return "";
}
// The phone's version: the same three numbers as one quiet line under the title.
function statsLine(session,t){
  if(!session.ex.length&&!(state.gyms||[]).length)return "";
  const n=(v,one,many)=>v+" "+(v===1?one:many);
  return "<div class='daysum'><span><b class='mono'>"+t.reps+"</b> reps &middot; <b class='mono'>"+t.sets+"</b> "+(t.sets===1?"set":"sets")+" &middot; "+n(session.ex.length,"exercise","exercises")+"</span>"+gymPick(session)+"</div>";
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
       "' data-ex='"+e.id+"'"+(e.id===state.exId?" title='Tap again for its history'":"")+">"+esc(e.name)+"</button></td>";
    for(let i=0;i<cols;i++){
      const x=e.sets[i];
      if(x===undefined){h+="<td class='cell empty mono'>&middot;</td>";continue;}
      const editing=state.editing&&state.editing.ex===e.id&&state.editing.i===i;
      const kind=x.wu?"wu":(x.kind||"");
      h+="<td class='cell has mono"+(editing?" editing":"")+(x.wu?" wu":"")+(kind==="drop"?" drop":"")+(kind==="fail"?" fail":"")+
         "' data-ex='"+e.id+"' data-i='"+i+"'"+(x.note?" title='"+esc(x.note)+"'":"")+">"+
         "<span class='cr'>"+x.r+(e.timed?"<span class='sd'>s</span>":(e.dist?"<span class='sd'>m</span>":""))+
         (x.side?"<span class='sd'>/s</span>":"")+
         (x.band?"<span class='wt band'>"+esc(x.band)+"</span>":(x.w?"<span class='wt'>"+x.w+"</span>":""))+
         (x.wu?"<span class='wt wumk'>w</span>":kind==="drop"?"<span class='wt wumk'>d</span>":kind==="fail"?"<span class='wt wumk'>f</span>":"")+
         (x.rpe?"<span class='wt rpemk'>@"+x.rpe+"</span>":"")+(x.note?"<span class='notemk'>&#9679;</span>":"")+"</span>"+
         // When in the workout the set was logged — its own clock, not the time of day.
         ((x.at&&state.settings.showSetTimes)?"<span class='ct'>"+
           fmtClock(workoutOffset(session,x.at))+"</span>":"")+"</td>";
    }
    // A timed exercise's total is time under tension, so it reads as a clock, not a count.
    h+="<td class='sum mono'>"+(e.timed?fmtClock(exerciseTotal(e)):exerciseTotal(e)+(e.dist?"m":""))+"</td></tr>";
  });
  return h+"</tbody></table></div>";
}

// A day's sets in one line — "10, 10/s, 8 @12" — for the previous-performance strip
// and the history sheet. Timed exercises read in seconds ("30s, 45s"), distance in metres.
export function setsSummary(sets,unit){
  const parts=sets.slice(0,8).map(x=>x.r+(unit==="secs"?"s":(unit==="m"?"m":""))+(x.side?"/s":"")+
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
  const title=f.field==="weight"?"Weight &middot; "+esc(unit):({reps:"Reps",secs:"Seconds",m:"Metres"})[unitOf(a)];
  const cur=f.field==="weight"?(state.weight||0):state.reps;
  h+="<div class='sheethead'><div class='plabel'>"+title+"</div>"+
     "<button class='btn ghost tiny' id='numedcancel'>Cancel</button></div><div class='sheetbody'>";
  h+="<div class='numfield mono'>"+(f.buf===""?"<span class='ph'>"+cur+"</span>":esc(f.buf))+
     "<span class='caret'></span></div>";
  h+="<div class='keypad'>";
  ["1","2","3","4","5","6","7","8","9"].forEach(k=>h+="<button class='key' data-key='"+k+"'>"+k+"</button>");
  // Weight takes a decimal point (67.5, 2.5kg plates), so its keypad gives Done a row of
  // its own; reps and seconds are whole numbers and keep the compact layout.
  if(f.field==="weight"){
    h+="<button class='key' data-key='.'>.</button>"+
       "<button class='key' data-key='0'>0</button>"+
       "<button class='key' data-key='back'>&larr;</button>"+
       "<button class='key done wide' data-key='done'>&#10003; Done</button>";
  }else{
    h+="<button class='key' data-key='back'>&larr;</button>"+
       "<button class='key' data-key='0'>0</button>"+
       "<button class='key done' data-key='done'>&#10003;</button>";
  }
  h+="</div></div></div></div>";
  return h;
}

// Under the weight on a barbell lift: what goes on each side of a standard bar.
function plateCaption(a,unit){
  if(a){unit=unitFor(a.name);if(perHand(a.name))return esc(unit)+" per hand";}
  const p=a&&isBarbellLift(a.name)?platesPerSide(state.weight,unit,barFor(a.name)):null;
  if(!p)return esc(unit)+" &middot; 0 = bodyweight";
  return (p.exact?"":"&asymp; ")+"per side "+p.plates.join(" + ");
}

// Per side and the unit belong to the exercise; kind, RPE and a note belong to this set.
function setOptions(a,u){
  return "<div class='togrow'>"+
     "<button class='q"+(state.perSide?" on":"")+"' id='sidebtn'>Per side</button>"+
     (a?"<button class='q"+(u!=="reps"?" on":"")+"' id='timedbtn' "+
       "title='Count this exercise in reps, seconds or metres'>"+UNIT_LABEL[u]+"</button>":"")+
     "<button class='q"+(state.setRpe?" on":"")+"' id='rpebtn' data-rpe='"+(state.setRpe||8)+"' title='Rate the effort'>"+(state.setRpe?"RPE "+state.setRpe:"RPE")+"</button>"+
     "<button class='q"+(state.noteOpen||state.setNote?" on":"")+"' id='notebtn' title='A note on this set'>"+(state.setNote?"Note &#10003;":"Note")+"</button>"+
     "<button class='q"+(state.kindOpen||state.setKind?" on":"")+"' id='kindbtn' title='Warm-up, drop set or to failure'>"+(state.setKind?esc(kindLabel(state.setKind)):"Type")+"</button>"+
     "</div>"+
     (state.kindOpen||state.setRpe?"<div class='kindrow'>"+
       (state.kindOpen?SET_KINDS.map(([k,l])=>"<button class='kind"+((state.setKind||"")===k?" on":"")+"' data-setkind='"+k+"'>"+l+"</button>").join(""):"")+
       (state.setRpe?"<div class='rperow'>"+[6,7,8,9,10].map(v=>"<button class='kind rpe"+(state.setRpe===v?" on":"")+"' data-rpe='"+v+"'>"+v+"</button>").join("")+"</div>":"")+"</div>":"")+
     (state.noteOpen?"<input class='setnote' id='setnote' placeholder='Note on this set (felt heavy, new grip…)' maxlength='200' value='"+esc(state.setNote)+"'>":"");
}
// A programme's or routine's prescribed sets for this lift, the next one ready to load.
function planHints(a,sess){
  let h="";
  const p=state.programme;
  if(a&&!state.editing&&sess&&sess.prog&&p&&sess.prog.pid===p.id){
    const pos=Object.assign(position(p,state.sessions.filter(x=>x.id!==sess.id)),{});
    const rx=prescription(p,pos);
    if(rx&&rx.sets&&rx.lift.trim().toLowerCase()===a.name.trim().toLowerCase()){
      const doneW=a.sets.filter(x=>!x.wu).length,nx=rx.sets[Math.min(doneW,rx.sets.length-1)];
      h+="<button class='hintline rxline' id='rxbtn' data-hw='"+nx.w+"' data-hr='"+(parseInt(nx.r,10)||"")+"'>"+
        "<b>5/3/1 &middot; "+esc(rx.label)+"</b> "+rx.sets.map((s,i)=>"<span class='"+(i<doneW?"rxdone":i===doneW?"rxnext":"")+"'>"+esc(s.r)+" @ "+s.w+"</span>").join(" &middot; ")+
        (doneW>=3?" &middot; last set: as many reps as you can":"")+"</button>";
    }
  }
  const rt=a&&!state.editing&&sess&&sess.routine?findRoutine(sess.routine):null,plan=rt?planFor(rt,a.name):null;
  if(plan){
    const done=a.sets.filter(x=>!x.wu).length,nx=plan[Math.min(done,plan.length-1)];
    h+="<button class='hintline rxline' id='rxbtn' data-hw='"+(nx.w||"")+"' data-hr='"+nx.r+"'><b>Plan</b> "+
      plan.map((x,i)=>"<span class='"+(i<done?"rxdone":i===done?"rxnext":"")+"'>"+x.r+(x.w?" @ "+x.w:"")+"</span>").join(" &middot; ")+"</button>";
  }
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
  const sess=getSession();
  h+=planHints(a,sess);
  // The exercise's pinned note, one line; a tap opens the exercise for the whole note.
  const note=a&&(state.exNotes||{})[a.name.trim().toLowerCase()];
  if(note&&!state.editing)h+="<button class='pinline' id='exhistbtn' title='"+esc(note)+"'>"+icon("bookmark","sm")+"<span>"+esc(note)+"</span></button>";
  // When a rule changes the usual (a deload, a drop, a return after a break), say why in a line,
  // so a lighter weight never looks like a mistake.
  const tg=a&&!state.editing&&!a.sets.length?targetFor(a):null;
  if(tg&&tg.rule&&!wide())h+="<div class='ruleline'>"+esc(tg.text)+"</div>";
  const caution=!state.editing&&!wide()?bodyCaution(a):"";
  if(caution)h+="<div class='ruleline caution'>"+esc(caution)+"</div>";
  // The phone leaves these out for room: last time's numbers are already loaded into reps and
  // weight, and tapping the selected exercise again opens its history.
  if(wide()&&prev){
    h+="<button class='prevline' id='exhistbtn'><span class='prevlbl'>Last</span> "+
       esc(shortDate(prev.session.created))+" &middot; <span class='mono'>"+
       setsSummary(prev.ex.sets,unitOf(prev.ex))+"</span> <span class='prevmore'>&rsaquo;</span></button>";
    // The next step, by a plain rule: stay at a weight until every set reaches the top of
    // your rep range, then go up. Tapping it loads the suggestion into reps and weight.
    const hint=targetFor(a);
    if(hint)h+="<button class='hintline' id='hintbtn'"+(hint.apply?" data-hw='"+(hint.apply.w===undefined?"":hint.apply.w)+
       "' data-hr='"+(hint.apply.r===undefined?"":hint.apply.r)+"'":" disabled")+">&rarr; "+esc(hint.text)+"</button>";
  }else if(wide()&&a&&!state.editing){
    // Never done before: the same line opens the exercise's tips and a demo instead.
    h+="<button class='prevline' id='exhistbtn'><span class='prevlbl'>New</span> First time &middot; tips and demo "+
       "<span class='prevmore'>&rsaquo;</span></button>";
  }
  if(state.editing){
    h+="<div class='prow'><div class='plabel'>Editing set</div>"+
       "<div class='pactive'>"+(a?esc(a.name):"&mdash;")+"</div></div>";
  }
  // Reps and load share one control: a labelled tile with a ± stepper and a tappable number
  // that opens the keypad. A timed exercise counts seconds; a band one carries a range, not lbs.
  const u=unitOf(a);
  const unit=state.settings.unit||"kg";
  const isBand=!!(a&&isBandExercise(a.name));
  h+="<div class='dualrow'>"+
     numTile(UNIT_LABEL[u],"reps",state.reps,"tap to type")+
     (isBand?
       numTile("Band","band",state.band||"None","lb &middot; &plusmn; cycles",true):
       numTile("Weight","weight",state.weight,plateCaption(a,unit)))+
     "</div>";
  // Per-side doubling and warm-up are per set; the unit belongs to the exercise itself, and
  // its button steps reps → seconds → metres, naming whichever is in use.
  // Per side and the unit belong to the exercise; kind, RPE and a note belong to this set.
  h+=setOptions(a,u);
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
       (state.setStart?" <span class='at'>@ "+fmtClock(workoutOffset(getSession(),state.setStart))+"</span>":"")+
       "</button></div>";
  }
  return h+"</div>";
}

// Under the table: add from the full list, or drop the selected exercise. Switching
// exercise is a tap on its row in the table, so nothing here repeats the day's names.
function exerciseStrip(){
  const a=activeEx();
  return "<div class='addstrip'>"+
    "<button class='addbtn' id='opensheet'>+ Add exercise</button>"+
    (a?"<button class='rmbtn' id='removesel'>&minus; Remove</button>":"")+"</div>";
}

// The whole list, as a sheet over the app: pick several, drop several, then close.
function exerciseSheet(session){
  const picked={};
  session.ex.forEach(e=>{picked[e.name.trim().toLowerCase()]=true;});
  const rest=state.catalog.filter(n=>!picked[n.trim().toLowerCase()]);
  // Always closable, whether or not anything has been picked — looking is allowed. On a tablet
  // it slides in from the right as a drawer, so the day stays in view while you pick.
  return "<div class='overlay"+(wide()?" drawer":"")+"' id='sheetback'><div class='sheet'>"+
    "<div class='sheethead'><div class='plabel'>"+
      (session.ex.length?"Today's exercises":"Pick today's exercises")+"</div>"+
    "<button class='btn "+(session.ex.length?"primary":"ghost")+" tiny' id='sheetdone'>"+
      (session.ex.length?"Done":"Close")+"</button>"+
    "</div><div class='sheetbody'>"+pickerBody(session,rest)+"</div></div></div>";
}
function pickerBody(session,rest){
  let h="<div class='chips'>";
  if(!session.ex.length)h+="<span class='pickmsg'>Nothing picked yet.</span>";
  session.ex.forEach(e=>{
    h+="<span class='chip on'>"+esc(e.name)+
       "<button class='x' data-rm='"+e.id+"'>&times;</button></span>";
  });
  h+="</div>";

  // One sheet, two ways in: single exercises, or a whole routine at once.
  const tab=state.pickTab==="routines"?"routines":"ex";
  const nRoutines=allRoutines().length;
  h+="<div class='seg picktabs'>"+
    "<button class='q"+(tab==="ex"?" on":"")+"' data-picktab='ex'>Exercises</button>"+
    "<button class='q"+(tab==="routines"?" on":"")+"' data-picktab='routines'>Routines"+
      (nRoutines?" <span class='rn'>"+nRoutines+"</span>":"")+"</button></div>";
  h+=tab==="routines"?routinePane(session):exercisePane(rest,session);

  if(session.ex.length)
    h+="<div class='reset'><button id='reset'>Clear this day's sets</button></div>";
  return h;
}

// What you've trained lately, newest first — the lifts you reach for most, one tap away.
const RECENT_SHOWN=10;
function recentNames(rest,session){
  const offered={},seen={},out=[];
  rest.forEach(n=>{offered[n.trim().toLowerCase()]=n;});
  newestFirst(state.sessions).forEach(s=>{
    if(s.id===session.id)return;
    s.ex.forEach(e=>{
      const k=e.name.trim().toLowerCase();
      if(e.sets.length&&offered[k]&&!seen[k]&&out.length<RECENT_SHOWN){seen[k]=true;out.push(offered[k]);}
    });
  });
  return out;
}

// One exercise in the list. Deleting from the list lives behind Edit list, so a stray tap
// while picking can't drop an exercise.
function pickChip(n){
  const fav=(state.favs||[]).indexOf(n)>=0;
  return "<span class='chip sheetitem"+(fav?" fav":"")+"'><button class='pick' data-add=\""+esc(n)+"\">"+esc(n)+"</button>"+
    (state.editList?"<button class='x' data-delcat=\""+esc(n)+"\" title='Remove from the list'>&times;</button>":
      "<button class='x info' data-exinfo=\""+esc(n)+"\" aria-label='About "+esc(n)+"'>i</button>")+
    "</span>";
}

// The catalog, searchable and grouped by movement.
function exercisePane(rest,session){
  let h="";
  // Search filters the list as you type — the list is long enough now to warrant it.
  const q=(state.exSearch||"").trim().toLowerCase();
  h+="<div class='searchrow'><input class='searchin' id='exsearch' type='search' "+
     "placeholder='Search exercises' autocomplete='off' value='"+esc(state.exSearch||"")+"'>"+
     (q?"<button class='searchx' id='exsearchx'>&times;</button>":"")+"</div>";
  const shown=q?rest.filter(n=>exMatches(n,q)):rest;
  const recent=(q||state.editList)?[]:recentNames(rest,session);
  // Recent and starred exercises fold like the groups below, opened with a tap.
  const fold=(key,label,names)=>{
    if(!names.length)return "";
    const open=state.pickOpen&&state.pickOpen[key];
    return "<button class='pickgrp"+(open?" open":"")+"' data-pickgroup=\""+esc(key)+"\"><span>"+label+"</span>"+
      "<span class='pickgrpn'>"+names.length+" <span class='pickgrpc'>"+(open?"&#9662;":"&#9656;")+"</span></span></button>"+
      (open?"<div class='sheetgrid'>"+names.map(pickChip).join("")+"</div>":"");
  };
  h+=fold("Recent","Recent",recent);
  // Starred from an exercise's sheet.
  const favs=(q||state.editList)?[]:rest.filter(n=>(state.favs||[]).indexOf(n)>=0);
  h+=fold("Favourites","&#9733; Favourites",favs);
  if(q)h+="<div class='picklbl'>"+shown.length+" match"+(shown.length===1?"":"es")+"</div>";

  // Grouped by movement and alphabetical within each, so a long list stays readable.
  // Empty groups are left out.
  const byGroup={};
  shown.forEach(n=>{
    const g=exerciseGroup(n);
    (byGroup[g]=byGroup[g]||[]).push(n);
  });
  Object.values(byGroup).forEach(names=>names.sort((a,b)=>
    a.localeCompare(b,undefined,{sensitivity:"base",numeric:true})));
  // Groups stay folded until opened — 380-odd exercises is a lot to scroll — but a search
  // opens every group it matches.
  EXERCISE_GROUPS.map(g=>g[0]).concat(OTHER_GROUP).forEach(g=>{
    const names=byGroup[g];
    if(!names)return;
    const open=q||state.editList||(state.pickOpen&&state.pickOpen[g]);
    h+="<button class='pickgrp"+(open?" open":"")+"' data-pickgroup=\""+esc(g)+"\"><span>"+esc(g)+"</span>"+
      "<span class='pickgrpn'>"+names.length+" <span class='pickgrpc'>"+(open?"&#9662;":"&#9656;")+"</span></span></button>";
    if(open){h+="<div class='sheetgrid'>";names.forEach(n=>{h+=pickChip(n);});h+="</div>";}
  });
  if(q&&!shown.length)
    h+="<div class='empty-note'>No match for &ldquo;"+esc(state.exSearch)+"&rdquo;.<br>"+
       "Use + New exercise below to add it.</div>";
  h+="<div class='sheetadd'>";
  if(state.adding){
    h+="<input class='name' id='newname' placeholder='New exercise' autocomplete='off'>"+
       "<button class='btn primary' id='addok'>Add</button>";
  }else{
    h+="<button class='addbtn' id='addbtn'>+ New exercise</button>"+
       "<button class='addbtn quiet' id='editlist'>"+(state.editList?"Done editing":"Edit list")+"</button>";
  }
  h+="</div>";
  return h;
}

// Saved routines to drop in whole, and any day — this one or a past one — to keep as one.
function routinePane(session){
  let h="";
  const routines=allRoutines();
  if(routines.length){
    routines.forEach(r=>{
      h+="<div class='rrow'><button class='rpick' data-applyroutine='"+r.id+"'>"+
         "<span class='rt'>"+esc(r.name)+" <span class='rn'>"+r.ex.length+"</span></span>"+
         "<span class='rs'>"+esc(r.plan&&r.plan.length?r.plan.map(p=>p.name+(planFor(r,p.name)?" "+planLine(planFor(r,p.name),""):"")).join(" · "):r.ex.join(" · "))+"</span></button>"+
         "<button class='x share' data-shareroutine='"+r.id+"' title='Share this routine'>"+icon("share","sm")+"</button>"+
         "<button class='x' data-delroutine='"+r.id+"'>&times;</button></div>";
    });
  }else{
    h+="<div class='empty-note'>No routines yet. Save a day&rsquo;s exercises as one below.</div>";
  }
  const past=newestFirst(state.sessions).filter(s=>s.id!==session.id&&s.ex.length).slice(0,PAST_DAYS_SHOWN);
  if(!session.ex.length&&!past.length)return h;
  h+="<div class='picklbl'>Save a day as a routine</div>";
  if(session.ex.length)
    h+="<button class='addbtn' data-saveroutine='"+session.id+"'>+ This day&rsquo;s "+
       session.ex.length+" exercises</button>";
  past.forEach(s=>{
    h+="<div class='rrow past'><div class='rpick'>"+
       "<span class='rt'>"+esc(s.title)+"</span>"+
       "<span class='rs'>"+shortDate(s.created)+" &middot; "+esc(s.ex.map(e=>e.name).join(" · "))+"</span></div>"+
       "<button class='btn ghost tiny' data-saveroutine='"+s.id+"'>Save</button></div>";
  });
  return h;
}

// A demo is a search, not a copy: it opens a YouTube search for the movement, so the app
// carries no one else's videos or text and the link never goes stale.
const ATG_GROUP="ATG / Knees over toes";
export function demoUrl(name){
  const q=name+(exerciseGroup(name)===ATG_GROUP?" knees over toes":" exercise")+" form";
  return "https://www.youtube.com/results?search_query="+encodeURIComponent(q);
}

// The Learn topic behind an exercise's style of training, where there is a clear one.
function learnFor(name){
  const n=String(name).toLowerCase(),g=exerciseGroup(name);
  if(n.indexOf("nordic")>=0)return ["nordic","Nordic curls & hamstring health"];
  if(g===ATG_GROUP)return ["kot","Knees over toes & knee resilience"];
  if(g==="Bands")return ["bands","Resistance bands"];
  if(n.indexOf("kettlebell")>=0)return ["kettlebell","Kettlebell training"];
  return null;
}

// Up to five minutes: heavy compound lifts earn long rests, and longer rests let you do more.
const REST_CHOICES=[["1:30",90],["2:00",120],["3:00",180],["4:00",240],["5:00",300]];

// How to do it, then everything it has ever done — records on top, newest day first —
// and how long to rest after it.
function exerciseHistorySheet(name,fromPicker){
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
  const fav=(state.favs||[]).indexOf(name)>=0,what=exWhat(name),aka=exAka(name);
  let h="<div class='overlay' id='histback'><div class='sheet'>"+
    "<div class='sheethead'><div class='plabel'>"+esc(name)+"</div>"+
    "<button class='favbtn"+(fav?" on":"")+"' data-fav=\""+esc(name)+"\" aria-label='"+(fav?"Unstar":"Star")+" "+esc(name)+"'>"+(fav?"&#9733;":"&#9734;")+"</button>"+
    "<button class='btn ghost tiny' id='histdone'>Close</button></div>"+
    "<div class='sheetbody'>";
  if(what)h+="<p class='exwhat'>"+esc(what)+"</p>";
  if(aka.length)h+="<div class='exaka'>Also called "+aka.map(esc).join(", ")+"</div>";
  if(fromPicker)h+="<button class='btn primary exaddbtn' data-add=\""+esc(name)+"\">Add to today</button>";
  // A note that stays with the exercise: machine settings, grip, what to watch for.
  h+="<label class='picklbl' for='exnote'>Pinned note</label>"+
    "<textarea class='exnote' id='exnote' data-exnote=\""+esc(name)+"\" rows='2' maxlength='300' placeholder='Seat 4, narrow grip, go light on the left shoulder'>"+
    esc((state.exNotes||{})[k]||"")+"</textarea>"+
    "<div class='cuenote'>Shows on this exercise every time you train it.</div>";
  h+="<div class='prgrid'>"+
    "<div class='stat'><div class='v mono'>"+(bestW?bestW.w+"<span class='pru'>"+unit+"</span>":"&mdash;")+
      "</div><div class='l'>Best weight"+(bestW?" &times;"+bestW.r:"")+"</div></div>"+
    "<div class='stat'><div class='v mono'>"+(bestRM?bestRM.v+"<span class='pru'>"+unit+"</span>":"&mdash;")+
      "</div><div class='l'>Est 1RM</div></div>"+
    "<div class='stat'><div class='v mono'>"+(bestR?bestR.r:"&mdash;")+"</div><div class='l'>Best "+
      (days.length?({secs:"secs",m:"metres",reps:"reps"})[unitOf(days[0].e)]:"reps")+"</div></div>"+
    "<div class='stat'><div class='v mono'>"+setCount+"</div><div class='l'>Sets logged</div></div></div>";
  const cues=cuesFor(name);
  h+="<div class='picklbl'>How to</div>"+
    (cues?"<ul class='cues'>"+cues.map(c=>"<li>"+esc(c)+"</li>").join("")+"</ul>":"")+
    "<a class='demolink' href='"+esc(demoUrl(name))+"' target='_blank' rel='noopener'>"+
      "Watch a demo &#8599;</a>"+
    "<div class='cuenote'>General form cues, not medical advice. Stop if anything hurts.</div>";
  // On a barbell lift, a ramp up to the weight on screen — log the sets as warm-ups.
  const ramp=isBarbellLift(name)?warmupRamp(state.weight,unitFor(name),barFor(name)):[];
  if(ramp.length)h+="<div class='picklbl'>Warm-up to "+state.weight+esc(state.settings.unit||"kg")+"</div>"+
    "<div class='ramp mono'>"+ramp.map(x=>x.w+" &times; "+x.r).join(" &middot; ")+"</div>";
  // Every Learn topic that uses it, the ones that programme it first.
  const inLearn=learnTopicsFor(name);
  if(inLearn.length){
    h+="<div class='picklbl'>In Learn</div><div class='lwrows'>"+inLearn.slice(0,6).map(x=>
      "<button class='lwrow' data-learnjump='"+esc(x.t.id)+"'><span class='lalso'><span class='lwrt'>"+esc(x.t.title)+"</span>"+
      "<span class='lalsow'>"+esc(x.where)+(x.days?" &middot; "+x.days+" workout"+(x.days===1?"":"s"):"")+"</span></span>"+
      "<span class='lchev'>&rsaquo;</span></button>").join("")+"</div>";
  }else{
    const topic=learnFor(name);
    if(topic)h+="<button class='demolink learnjump' data-learnjump='"+topic[0]+"'>Learn: "+esc(topic[1])+" &rsaquo;</button>";
  }
  // Rest after this exercise: its own target, or the default from Settings.
  const own=state.restTargets&&state.restTargets[k];
  const def=+state.settings.restTarget||0;
  h+="<div class='picklbl'>Rest after this exercise</div><div class='seg restseg wrapseg'>"+
    "<button class='q"+(own?"":" on")+"' data-resttarget='0'>Default"+
      (def?" "+fmtClock(def):"")+"</button>"+
    REST_CHOICES.map(c=>"<button class='q"+(own===c[1]?" on":"")+"' data-resttarget='"+c[1]+"'>"+c[0]+"</button>").join("")+
    "</div>";
  // Progression for this exercise only: its own rep range and jump, or none at all for rehab
  // and skill work. Default follows Settings.
  const ep=exProg(name),wu=esc(unitFor(name)),defRange=state.settings.progressRange||"10-15";
  const steps=unitFor(name)==="lb"?[2.5,5,10]:[1,2.5,5];
  h+="<div class='picklbl'>Progression for this exercise</div>"+
    "<div class='seg restseg wrapseg pair'><button class='q"+(ep.off?"":" on")+"' data-exprog='off:0'>Suggest targets</button><button class='q"+(ep.off?" on":"")+"' data-exprog='off:1'>Don't</button></div>"+
    (ep.off?"":"<div class='seglbl'>Rep range</div><div class='seg restseg wrapseg'><button class='q"+(ep.range?"":" on")+"' data-exprog='range:'>Default "+defRange.replace("-","&ndash;")+"</button>"+
      ["3-5","5-8","6-10","8-12","12-15","15-20"].map(r=>"<button class='q"+(ep.range===r?" on":"")+"' data-exprog='range:"+r+"'>"+r.replace("-","&ndash;")+"</button>").join("")+"</div>"+
      "<div class='seglbl'>Jump when every set reaches the top</div><div class='seg restseg wrapseg'><button class='q"+(ep.step?"":" on")+"' data-exprog='step:'>Default +"+stepFor(name)+" "+wu+"</button>"+
      steps.map(v=>"<button class='q"+(+ep.step===v?" on":"")+"' data-exprog='step:"+v+"'>+"+v+"</button>").join("")+"</div>");
  // How this exercise's weight is written down: per hand for a pair, its own unit, its own bar.
  if(!isBandExercise(name)){
    const gu=state.settings.unit==="lb"?"lb":"kg",bars=unitFor(name)==="lb"?[15,25,35,45,55]:[7,10,15,20,25];
    h+="<div class='picklbl'>Weight for this exercise</div>"+
      "<div class='seg restseg wrapseg pair'><button class='q"+(ep.hand?"":" on")+"' data-exprog='hand:'>Total</button><button class='q"+(ep.hand?" on":"")+"' data-exprog='hand:1'>Per hand</button></div>"+
      "<div class='seglbl'>Unit</div><div class='seg restseg wrapseg'><button class='q"+(ep.unit?"":" on")+"' data-exprog='unit:'>Default "+gu+"</button>"+
        ["kg","lb"].map(v=>"<button class='q"+(ep.unit===v?" on":"")+"' data-exprog='unit:"+v+"'>"+v+"</button>").join("")+"</div>"+
      (isBarbellLift(name)||/bar|ez|trap|smith/i.test(name)?"<div class='seglbl'>Bar</div><div class='seg restseg wrapseg'><button class='q"+(ep.bar?"":" on")+"' data-exprog='bar:'>Default "+barFor(name)+"</button>"+
        bars.map(v=>"<button class='q"+(+ep.bar===v?" on":"")+"' data-exprog='bar:"+v+"'>"+v+"</button>").join("")+"</div>":"");
  }
  if(days.length)h+="<div class='picklbl'>History</div>";
  days.forEach(d=>{
    h+="<div class='histrow'><span class='histdate'>"+esc(shortDate(d.s.created))+"</span>"+
       "<span class='histsets mono'>"+setsSummary(d.e.sets,unitOf(d.e))+"</span></div>";
  });
  if(!days.length)h+="<div class='empty-note'>No sets logged yet.</div>";
  return h+"</div></div></div>";
}

export function workoutLabel(session){
  const secs=workoutSeconds(session);
  return secs===null?"&mdash;":fmtClock(secs);
}

// The clocks speak in workout time — how long, how far in — never the time of day.
export function workoutSub(session){
  if(!session.started)return "not started";
  return session.running?"elapsed":"total time";
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
  if(state.setStart)return "started at "+fmtClock(workoutOffset(session,state.setStart));
  if(!session.started)return "start the workout";
  if(!session.running)return lastSet(session)?"work time":"paused";
  const target=restTargetFor(session);
  return (lastSet(session)?"since last set":"since start")+(target?" &middot; target "+fmtClock(target):"");
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
      "<div class='tl'>Workout"+(session.started&&!on?" &middot; ended":"")+"</div>"+
      "<div class='tv mono edit' id='worktime' title='Tap to set the elapsed time'>"+
        workoutLabel(session)+"</div>"+
      "<div class='tsub' id='worksub'>"+workoutSub(session)+"</div>"+
      "<div class='tbtnrow'>"+
        "<button class='tbtn "+(on?"stop":"go")+"' id='wtoggle'>"+
          (on?"End workout":(canResume(session)?"Resume workout":
            (session.started?"Start again":"Start workout")))+"</button>"+
        "<button class='tbtn narrow' id='workreset' title='Reset the workout time'>"+icon("reset")+"</button>"+
      "</div></div></div></div>";
}

// ── Laptop and tablet ─────────────────────────────────────────────────────────────────
// The day as one sheet: each exercise a block of set rows (set, previous, weight, reps, ✓),
// the chosen exercise's next set typed straight into its row. On the right, the clocks,
// the exercise's last few times and what comes next. The exercise list is a drawer.
const nameKey=n=>String(n||"").trim().toLowerCase();
function prevText(x,u){
  if(!x)return "&mdash;";
  return x.r+(u==="secs"?"s":u==="m"?"m":"")+(x.side?"/s":"")+(x.band?" "+esc(x.band):(x.w?" &times; "+x.w:""))+(x.wu?" w":"");
}
const markText=(kind,rpe,note,side)=>(side?"/s ":"")+(kind==="wu"?"w":kind==="drop"?"d":kind==="fail"?"f":"")+(rpe?" @"+rpe:"")+(note?" &#9679;":"");
function loggedRow(e,i,x,u,prev){
  const kind=x.wu?"wu":(x.kind||"");
  return "<div class='lgset cell has"+(x.wu?" wu":"")+(kind==="drop"?" drop":"")+(kind==="fail"?" fail":"")+"' data-ex='"+e.id+"' data-i='"+i+"'"+
    (x.note?" title='"+esc(x.note)+"'":" title='Click to edit this set'")+">"+
    "<span class='lgsn'>"+(i+1)+"</span><span class='lgsp'>"+prevText(prev[i],u)+"</span>"+
    "<span class='lgsv mono'>"+(x.band?esc(x.band):(x.w?x.w:"&mdash;"))+"</span><span class='lgsv mono'>"+x.r+"</span>"+
    "<span class='lgsmk'>"+markText(kind,x.rpe,x.note,x.side)+"</span><span class='lgchk on'>&#10003;</span></div>";
}
// The row being typed into (or edited): real inputs for weight and reps, the options under it.
function entryRow(a,u,n,prev,editing){
  const isBand=isBandExercise(a.name),unit=state.settings.unit||"kg";
  const secs=v=>{const s=Math.max(0,Math.round(v||0)),m=Math.floor(s/60);return m+":"+String(s%60).padStart(2,"0");};
  return "<div class='lgset cur"+(editing?" editing":"")+"'><span class='lgsn'>"+(n+1)+"</span><span class='lgsp'>"+prevText(prev[n],u)+"</span>"+
    (isBand?"<button class='lgin band' data-edit='band' title='Band'>"+esc(state.band||"None")+"</button>":
      "<input class='lgin mono' id='rowweight' type='number' inputmode='decimal' step='any' min='0' value='"+(state.weight||0)+"' aria-label='Weight, "+esc(unit)+"'>")+
    "<input class='lgin mono' id='rowreps' type='number' inputmode='numeric' step='1' min='0' value='"+state.reps+"' aria-label='"+UNIT_LABEL[u]+"'>"+
    "<span class='lgsmk'>"+markText(state.setKind,state.setRpe,state.setNote,state.perSide)+"</span>"+
    (editing?"<button class='lgchk go' id='upd' title='Update this set'>&#10003;</button>":
      "<button class='lgchk go' id='logbtn' title='Log the set (Enter or L)'>&#10003;</button>")+"</div>"+
    "<div class='lgopts'>"+(isBand?"":"<span class='lgcap'>"+plateCaption(a,unit)+"</span>")+setOptions(a,u)+
    (editing?"<div class='timerow'><label class='timefield'><span>Rest</span><input class='timein mono' id='editrest' inputmode='numeric' value='"+secs(state.editRest)+"'></label>"+
      "<label class='timefield'><span>Work</span><input class='timein mono' id='editwork' inputmode='numeric' value='"+secs(state.editWork)+"'></label>"+
      "<button class='btn dang tiny' id='del'>Delete</button><button class='btn ghost tiny' id='cxl'>Cancel</button></div>":"")+"</div>";
}
function exerciseBlock(e,session){
  const a=activeEx(),on=!!(a&&a.id===e.id),u=unitOf(e);
  const last=lastPerformance(e.name),prev=last?last.ex.sets:[];
  const ed=on&&state.editing&&state.editing.ex===e.id?state.editing.i:-1;
  let h="<div class='lgex"+(on?" on":"")+"' data-exblock='"+e.id+"'><div class='lgexh'>"+
    "<button class='exbtn lgexn"+(on?" active":"")+"' data-ex='"+e.id+"'"+(on?" title='Click again for its history'":"")+">"+esc(e.name)+"</button>"+
    (last?"<span class='lgexm'>Last "+esc(shortDate(last.session.created))+" &middot; <span class='mono'>"+setsSummary(last.ex.sets,unitOf(last.ex))+"</span></span>":
      "<span class='lgexm'>First time</span>")+"<span class='lgsp0'></span>";
  if(on&&!state.editing){
    if(last){
      const hint=targetFor(e);
      if(hint)h+="<button class='lghint' id='hintbtn'"+(hint.apply?" data-hw='"+(hint.apply.w===undefined?"":hint.apply.w)+"' data-hr='"+(hint.apply.r===undefined?"":hint.apply.r)+"'":" disabled")+">"+esc(hint.text)+"</button>";
    }else h+="<button class='lghint' id='exhistbtn'>Tips and demo &rsaquo;</button>";
    h+="<button class='lgrm' id='removesel' title='Remove from today'>&times;</button>";
  }
  h+="</div>";
  const pin=(state.exNotes||{})[e.name.trim().toLowerCase()];
  if(pin)h+="<button class='lgpin' data-exinfo=\""+esc(e.name)+"\" title='Edit the pinned note'>"+icon("bookmark","sm")+"<span>"+esc(pin)+"</span></button>";
  else if(on&&!state.editing)h+="<button class='lgpin add' id='exhistbtn'>"+icon("bookmark","sm")+"<span>Pin a note: seat, grip, what to watch</span></button>";
  if(on&&!state.editing){const c=bodyCaution(e);if(c)h+="<div class='ruleline caution lgcaution'>"+esc(c)+"</div>";}
  if(on)h+=planHints(e,session);
  h+="<div class='lgset lghd'><span class='lgsn'>Set</span><span class='lgsp'>Previous</span><span>"+(isBandExercise(e.name)?"Band":esc(unitFor(e.name))+(perHand(e.name)?" each":""))+"</span><span>"+UNIT_LABEL[u]+"</span><span></span><span></span></div>";
  e.sets.forEach((x,i)=>{h+=ed===i?entryRow(e,u,i,prev,true):loggedRow(e,i,x,u,prev);});
  const n=e.sets.length;
  if(on&&ed<0)h+=entryRow(e,u,n,prev,false);
  else if(!on)h+="<button class='lgset ghost exbtn' data-ex='"+e.id+"' title='Log the next set of "+esc(e.name)+"'><span class='lgsn'>"+(n+1)+"</span><span class='lgsp'>"+prevText(prev[n],u)+"</span>"+
    "<span class='lgsv'>"+(prev[n]&&prev[n].w?prev[n].w:"&mdash;")+"</span><span class='lgsv'>"+(prev[n]?prev[n].r:"&mdash;")+"</span><span></span><span class='lgchk'></span></button>";
  return h+"</div>";
}
// The rail's card for the chosen exercise: its last few times, a small trend, its record.
function railFocus(a,session){
  if(!a)return "";
  const k=nameKey(a.name),u=unitOf(a),unit=esc(state.settings.unit||"kg");
  const past=newestFirst(state.sessions).filter(s=>s.id!==session.id)
    .map(s=>({s,e:s.ex.find(x=>nameKey(x.name)===k&&x.sets.length)})).filter(x=>x.e).slice(0,4);
  const rec=exerciseRecords(state.sessions).find(r=>nameKey(r.name)===k);
  let h="<div class='card lgfocus'><div class='lgfh'><span class='llabel'>"+esc(a.name)+" &middot; last "+(past.length===1?"time":past.length+" times")+"</span>"+
    "<button class='lgfall' id='exhistbtn'>All &rsaquo;</button></div>";
  h+=past.length?past.map(x=>"<div class='lgfrow'><span>"+esc(shortDate(x.s.created))+"</span><span class='mono'>"+setsSummary(x.e.sets,unitOf(x.e))+"</span></div>").join(""):
    "<div class='empty-note'>First time logging "+esc(a.name)+". Its history builds here.</div>";
  const tr=exerciseTrend(newestFirst(state.sessions).filter(s=>!s.running).reverse(),a.name);
  if(tr.points.length>1){
    const pts=tr.points.slice(-8),vs=pts.map(p=>p.v);
    h+="<div class='lgspark'>"+lineChart(vs,{w:300,h:64,labels:pts.map(p=>shortDate(p.at)+": "+p.v)})+"</div>"+
      "<div class='chartlbls'><span>"+esc(shortDate(pts[0].at))+"</span><span>"+(tr.weighted?"top set":"best")+" &middot; now "+vs[vs.length-1]+(tr.weighted?" "+unit:"")+"</span></div>";
  }
  if(rec)h+="<div class='lgfrec'>"+(rec.bestW?"Best "+rec.bestW+" &times; "+rec.bestWReps+" &middot; e1RM "+rec.best1RM+" "+unit:
      "Best "+rec.bestR+(rec.timed?" s":rec.dist?" m":" reps"))+"</div>";
  return h+"</div>";
}
// Both clocks as one card, with the same ids as the phone's bar so the ticking and the
// buttons work unchanged.
function timerCard(session){
  const on=!!session.running,timing=!!state.setStart;
  return "<div class='card lgtimer'>"+
    "<div class='tl' id='setlbl'>"+setLabel(session)+"</div>"+
    "<div class='tv mono lgbig"+(timing?" held":"")+"' id='settime'>"+fmtClock(setClockSeconds(session))+"</div>"+
    "<div class='tsub' id='setsub'>"+setSub(session)+"</div>"+
    "<div class='tbtnrow'><button class='tbtn"+(timing?" on":" go")+"' id='setstart'>"+(timing?"Cancel":"Start set")+" <kbd>Space</kbd></button>"+
      "<button class='tbtn narrow' id='timerreset' title='Reset the rest clock'>"+icon("reset")+"</button></div>"+
    "<div class='lgtsep'></div>"+
    "<div class='lgtrow'><div><div class='tl'>Workout"+(session.started&&!on?" &middot; ended":"")+"</div>"+
      "<div class='tv mono edit' id='worktime' title='Click to set the elapsed time'>"+workoutLabel(session)+"</div>"+
      "<div class='tsub' id='worksub'>"+workoutSub(session)+"</div></div>"+
      "<div class='tbtnrow'><button class='tbtn "+(on?"stop":"go")+"' id='wtoggle'>"+
        (on?"End workout":(canResume(session)?"Resume workout":(session.started?"Start again":"Start workout")))+"</button>"+
        "<button class='tbtn narrow' id='workreset' title='Reset the workout time'>"+icon("reset")+"</button></div></div></div>";
}
function upNext(session){
  const a=activeEx();if(!a)return "";
  const k=session.ex.indexOf(a),rest=session.ex.slice(k+1).concat(session.ex.slice(0,k)).filter(e=>!e.sets.length);
  const ramp=isBarbellLift(a.name)&&state.weight?warmupRamp(state.weight,unitFor(a.name),barFor(a.name)):[];
  if(!rest.length&&!ramp.length)return "";
  return "<div class='card lgnext'>"+
    (ramp.length?"<div class='llabel'>Warm-up to "+state.weight+" "+esc(state.settings.unit||"kg")+"</div><div class='ramp mono'>"+ramp.map(x=>x.w+" &times; "+x.r).join(" &middot; ")+"</div>":"")+
    (rest.length?"<div class='llabel'>Up next</div><button class='lgnextb exbtn' data-ex='"+rest[0].id+"'>"+esc(rest[0].name)+"</button>"+
      (rest.length>1?"<span class='lgnexts'> then "+rest.slice(1,3).map(e=>esc(e.name)).join(", ")+"</span>":""):"")+"</div>";
}
function logWide(s){
  const t=totals(s);
  const started=s.started?new Date(s.started).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}):"";
  return "<div class='wrap logwide'>"+
    "<section class='lgc' data-keepx='lgc'>"+
      "<div class='lghead'><div class='lght'><div class='eyebrow'>"+(s.running?"Live":"Session")+" &middot; "+esc(shortDate(s.created))+(started?" &middot; started "+esc(started):"")+"</div>"+
        "<div class='h1' id='daytitle'><span class='httl'>"+esc(s.title)+"</span> <span class='pen'>&#9998;</span></div>"+
        "<div class='lgstats'><span><b class='mono'>"+t.reps+"</b> reps</span><span><b class='mono'>"+t.sets+"</b> sets</span><span><b class='mono'>"+s.ex.length+"</b> exercises</span>"+gymPick(s)+"</div></div>"+
        "<div class='headbtns'>"+(s.ex.length?"<button class='btn ghost tiny' data-saveroutine='"+s.id+"'>Save as routine</button>"+
          "<button class='daysbtn iconbtn' id='sharebtn' title='Share'>"+icon("share")+"</button>":"")+"</div></div>"+
      "<div class='card lgsheet' data-keepx='lgsheet'>"+
        (s.ex.length?s.ex.map(e=>exerciseBlock(e,s)).join(""):"<div class='empty-note'>No exercises yet. Add the first to start logging.</div>")+
        "<div class='lgadd'><button class='addbtn' id='opensheet'>+ Add exercise <kbd>A</kbd></button></div>"+
      "</div>"+
    "</section>"+
    "<section class='lgr' data-keepx='lgr'>"+timerCard(s)+railFocus(activeEx(),s)+upNext(s)+"</section>"+
    "</div>"+
    (state.sheet?exerciseSheet(s):"")+
    (state.numEdit?numEditor(activeEx()):"")+
    (state.exInfo?exerciseHistorySheet(state.exInfo,true):state.exHist&&activeEx()?exerciseHistorySheet(activeEx().name):"");
}

export function logView(){
  const s=getSession();
  if(wide())return logWide(s);
  return "<div class='wrap'>"+
    "<div class='head'><div>"+
    "<div class='eyebrow'>Session</div>"+
    "<div class='h1' id='daytitle'><span class='httl'>"+esc(s.title)+"</span> <span class='pen'>&#9998;</span></div>"+
    statsLine(s,totals(s))+
    "</div><div class='headbtns'>"+
    (s.ex.length?
      "<button class='daysbtn iconbtn' id='sharebtn' title='"+
      (s.ex.some(e=>e.sets.length)?"Share this day":"Share this workout plan")+
      "'>"+icon("share")+"</button>":"")+
    "</div></div>"+
    setsTable(s)+
    exerciseStrip()+logPanel()+
    "</div>"+timerBar(s)+
    (state.sheet?exerciseSheet(s):"")+
    (state.numEdit?numEditor(activeEx()):"")+
    (state.exInfo?exerciseHistorySheet(state.exInfo,true):state.exHist&&activeEx()?exerciseHistorySheet(activeEx().name):"");
}
