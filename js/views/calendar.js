// A month of training at a glance: done days, planned days, and empty ones ready to take
// a backfill or a plan. A day holding several workouts opens a picker sheet.
import {dateKey,fmtClock,keyOf,monthLabel,shortDate,timeLabel,totals,
  workoutSeconds} from "../model.js";
import {state} from "../store.js";
import {esc} from "./common.js";

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

const WEEKDAYS=["S","M","T","W","T","F","S"];

export function calendarView(){
  const now=new Date();
  const y=state.calYear,m=state.calMonth;
  const byDay=sessionsByDay();
  const todayKey=keyOf(now.getFullYear(),now.getMonth(),now.getDate());
  const first=new Date(y,m,1).getDay();          // 0=Sun leading blanks
  const days=new Date(y,m+1,0).getDate();        // days in this month

  let h="<div class='wrap scroll'>"+
    "<div class='hhead'><button class='backbtn' id='backbtn'>&lsaquo; Back</button>"+
    "<button class='newday' id='newday'>+ New workout</button></div>"+
    "<div class='calnav'>"+
      "<button class='calarrow' id='calprev'>&lsaquo;</button>"+
      "<div class='calmonth'>"+esc(monthLabel(y,m))+"</div>"+
      "<button class='calarrow' id='calnext'>&rsaquo;</button></div>"+
    "<div class='calgrid calhead'>"+
      WEEKDAYS.map(d=>"<div class='calwd'>"+d+"</div>").join("")+"</div>"+
    "<div class='calgrid'>";

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
    // Worked/planned days open (pick a session); empty days create one on that date.
    const attr=worked?" data-calday='"+k+"'":" data-newday='"+k+"'";
    h+="<button class='"+cls+"'"+attr+">"+
       "<span class='caldate'>"+day+"</span>"+
       (worked?"<span class='caldots'>"+
         list.slice(0,3).map(()=>"<span class='caldot'></span>").join("")+
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
