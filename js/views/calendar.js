// A month of training at a glance: done days, planned days, and empty ones ready to take
// a backfill or a plan. A day holding several workouts opens a picker sheet.
import {dateKey,fmtClock,keyOf,monthLabel,setReps,shortDate,timeLabel,totals,
  workoutSeconds} from "../model.js";
import {state} from "../store.js";
import {feastsForMonth} from "../feasts.js";
import {esc,pageHead,wide} from "./common.js";
import {asProgressTab,progressTop} from "./progress.js";
import {dayDetailPane} from "./daydetail.js";

// Sessions grouped by the local calendar day they were created on. A day can hold more
// than one, which is what makes two-a-days first-class rather than a merge conflict.
function sessionsByDay(){
  const byDay={};
  state.sessions.forEach(s=>{
    const k=dateKey(s.created);
    if(!k)return;
    (byDay[k]=byDay[k]||[]).push(s);
  });
  return byDay;
}

// Monday first, matching the week strip on the home screen.
const WEEKDAYS=["M","T","W","T","F","S","S"];

// Each kind of workout gets its own dot colour, keyed on the day's name, so a month shows
// its pattern — push, pull, legs — at a glance. The legend under the grid names them.
const KIND_COLOURS=["#e8a317","#2a9d8f","#4c78dd","#d1495b","#8e6cd8","#5a9e3a","#c46f2b","#3b8fb5"];
function kindKey(s){return String(s.title||"").trim().toLowerCase();}

function monthStats(list){
  let sets=0,reps=0,ton=0;
  list.forEach(s=>s.ex.forEach(e=>e.sets.forEach(x=>{
    if(x.wu)return;
    sets++;
    if(!e.timed&&!e.dist){reps+=setReps(x);ton+=setReps(x)*(+x.w||0);}
  })));
  return {sets,reps,ton:Math.round(ton)};
}

export function calendarView(){
  const now=new Date();
  const y=state.calYear,m=state.calMonth;
  const byDay=sessionsByDay();
  const todayKey=keyOf(now.getFullYear(),now.getMonth(),now.getDate());
  const first=(new Date(y,m,1).getDay()+6)%7;    // 0=Mon leading blanks
  const days=new Date(y,m+1,0).getDate();        // days in this month

  // Colours go to this month's kinds of workout in order of first appearance.
  const kinds=[];
  const monthList=[];
  for(let day=1;day<=days;day++){
    (byDay[keyOf(y,m,day)]||[]).forEach(s=>{
      monthList.push(s);
      if(s.ex.some(e=>e.sets.length)&&kinds.indexOf(kindKey(s))<0)kinds.push(kindKey(s));
    });
  }
  // A big screen always shows a day beside the month: the one picked, else today if it was
  // trained, else the month's latest workout.
  const big=wide();
  let selKey=state.calDay;
  if(big&&!selKey){
    const worked=Object.keys(byDay).filter(k=>k.slice(0,7)===keyOf(y,m,1).slice(0,7)&&byDay[k].length).sort();
    selKey=byDay[todayKey]&&byDay[todayKey].length&&todayKey.slice(0,7)===keyOf(y,m,1).slice(0,7)?todayKey:worked[worked.length-1]||null;
  }
  const colourOf=s=>KIND_COLOURS[Math.max(0,kinds.indexOf(kindKey(s)))%KIND_COLOURS.length];

  let h="<div class='wrap scroll'>"+
    (asProgressTab()?progressTop("calendar","<button class='btn ghost tiny' data-nav='planner'>Plan weeks</button><button class='newday' id='newday'>+ New</button>"):
      pageHead("Calendar","<button class='btn ghost tiny' data-nav='planner'>Plan weeks</button><button class='newday' id='newday'>+ New</button>"))+
    "<div class='calnav'>"+
      "<button class='calarrow' id='calprev'>&lsaquo;</button>"+
      "<div class='calmonth'>"+esc(monthLabel(y,m))+"</div>"+
      "<button class='calarrow' id='calnext'>&rsaquo;</button></div>"+
    "<div class='calgrid calhead'>"+
      WEEKDAYS.map(d=>"<div class='calwd'>"+d+"</div>").join("")+"</div>"+
    "<div class='calgrid'>";

  const feasts=feastsForMonth(y,m,state.settings.feastSet);
  let doneDays=0,plannedDays=0;
  for(let i=0;i<first;i++)h+="<div class='calcell blank'></div>";
  for(let day=1;day<=days;day++){
    const k=keyOf(y,m,day);
    const list=byDay[k]||[];
    const worked=list.length>0;
    // "Done" once any session that day has a logged set; otherwise it's a plan.
    const done=list.some(s=>s.ex.some(e=>e.sets.length));
    const planned=worked&&!done;
    const isToday=k===todayKey;
    const future=k>todayKey;
    const hasCurrent=list.some(s=>s.id===state.sessionId);
    if(done)doneDays++;else if(planned)plannedDays++;
    let cls="calcell";
    if(done)cls+=" worked";
    else if(planned)cls+=" planned";
    else{cls+=" addable"+(future?" future":"");}   // any empty day: tap to add or plan
    if(isToday)cls+=" today";
    if(hasCurrent)cls+=" cur";
    if(k===selKey)cls+=" sel";
    // Worked/planned days open (pick a session); empty days create one on that date.
    const attr=worked?" data-calday='"+k+"'":" data-newday='"+k+"'";
    h+="<button class='"+cls+"'"+attr+" "+(feasts[day]?"title=\""+esc(feasts[day])+"\"":"")+">"+
       (feasts[day]?"<span class='calfeast'>&#10013;</span>":"")+
       "<span class='caldate'>"+day+"</span>"+
       (worked&&wide()?"<span class='calname'>"+esc(list[0].title)+(list.length>1?" +"+(list.length-1):"")+"</span>":"")+
       (worked?"<span class='caldots'>"+
         list.slice(0,3).map(s=>"<span class='caldot'"+
           (s.ex.some(e=>e.sets.length)?" style='background:"+colourOf(s)+"'":"")+"></span>").join("")+
         (list.length>3?"<span class='calmore'>+"+(list.length-3)+"</span>":"")+
         "</span>":"<span class='caladd'>+</span>")+
       "</button>";
  }
  h+="</div>";

  // Footer separates what was trained from what's only scheduled.
  const parts=[];
  if(doneDays)parts.push(doneDays+" day"+(doneDays>1?"s":"")+" trained");
  if(plannedDays)parts.push(plannedDays+" planned");
  h+="<div class='calfoot'>"+(parts.length?parts.join(" &middot; ")+" this month"
    :"Nothing logged this month yet.")+"</div>";

  // What the month added up to, and which colour is which workout.
  if(doneDays){
    const st=monthStats(monthList);
    const unit=esc(state.settings.unit||"kg");
    h+="<div class='prgrid calstats'>"+
      "<div class='stat'><div class='v mono'>"+doneDays+"</div><div class='l'>Days trained</div></div>"+
      "<div class='stat'><div class='v mono'>"+st.sets+"</div><div class='l'>Sets</div></div>"+
      "<div class='stat'><div class='v mono'>"+st.reps+"</div><div class='l'>Reps</div></div>"+
      "<div class='stat'><div class='v mono'>"+(st.ton?(st.ton>=10000?Math.round(st.ton/100)/10+"k":st.ton):"&mdash;")+
        (st.ton?"<span class='pru'>"+unit+"</span>":"")+"</div><div class='l'>Lifted</div></div></div>";
    const names={};
    monthList.forEach(s=>{if(!names[kindKey(s)])names[kindKey(s)]=s.title;});
    h+="<div class='callegend'>"+kinds.map(k=>
      "<span class='legitem'><span class='caldot' style='background:"+
      KIND_COLOURS[kinds.indexOf(k)%KIND_COLOURS.length]+"'></span>"+esc(names[k])+"</span>").join("")+
      "</div>";
  }

  // The month's feasts, named under the grid — the marks above just point here.
  const fdays=Object.keys(feasts).map(Number).sort((a,b)=>a-b);
  if(fdays.length){
    h+="<div class='feastlist'>"+fdays.map(d=>
      "<span class='feastitem'><span class='fd'>"+d+"</span> "+esc(feasts[d])+"</span>")
      .join(" &middot; ")+"</div>";
  }

  // A big screen shows the chosen day beside the month instead of over it.
  if(big){
    const list=selKey?(byDay[selKey]||[]).slice().sort((a,b)=>(a.created||"").localeCompare(b.created||"")):[];
    return "<div class='wrap calsplit'><section class='calmain' data-keepx='calm'>"+h.replace(/^<div class='wrap scroll'>/,"")+"</section>"+
      "<section class='hdetail' data-keepx='cald-"+esc(selKey||"")+"'>"+(list.length?list.map(dayDetailPane).join("<div class='ddsep'></div>"):
        "<div class='empty-note'>Click a day to see what was trained.<br>Click an empty day to log or plan one.</div>")+"</section></div>";
  }
  if(state.calDay){
    const list=(byDay[state.calDay]||[]).slice()
      .sort((a,b)=>(a.created||"").localeCompare(b.created||""));
    if(list.length)h+=dayDetail(state.calDay,list);
  }
  return h+"</div>";
}

// Opened when a calendar day holds more than one workout: pick which to open.
function dayDetail(key,list){
  let h="<div class='overlay' id='calback'><div class='sheet'>"+
    "<div class='sheethead'><div class='plabel'>"+esc(shortDate(list[0].created))+"</div>"+
    "<button class='btn ghost tiny' id='caldone'>Close</button></div>"+
    "<div class='sheetbody'>";
  list.forEach(s=>{
    const t=totals(s),secs=workoutSeconds(s),cur=s.id===state.sessionId;
    h+="<div class='day"+(cur?" cur":"")+"' data-load='"+s.id+"'>"+
      "<div class='info'>"+(cur?"<div class='cur-tag'>Current</div>":"")+
      "<div class='t'>"+esc(s.title)+"</div>"+
      "<div class='sub'>"+timeLabel(s.started||s.created)+" &middot; "+s.ex.length+" exercises"+
      (secs===null?"":" &middot; "+fmtClock(secs))+
      (s.running?" <span class='live'>live</span>":"")+"</div></div>"+
      "<div class='nums'><div class='r mono'>"+t.reps+"</div><div class='rl'>reps</div></div></div>";
  });
  return h+"</div></div></div>";
}
