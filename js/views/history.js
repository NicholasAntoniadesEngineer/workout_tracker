// Every day ever logged, newest first and grouped by week, with the way into the calendar.
// Saving and loading files lives in Settings, under Your data.
import {fmtClock,shortDate,totals,workoutSeconds} from "../model.js";
import {newestFirst,state} from "../store.js";
import {icon} from "../icons.js";
import {esc,pageHead} from "./common.js";

const MS_PER_DAY=86400000;

// Monday of the week a stamp falls in, as a local-midnight time — the grouping key.
function weekOf(iso){
  const d=new Date(iso);
  const m=new Date(d.getFullYear(),d.getMonth(),d.getDate()-(d.getDay()+6)%7);
  return m.getTime();
}

function weekLabel(start){
  const thisWeek=weekOf(new Date().toISOString());
  if(start===thisWeek)return "This week";
  if(start===thisWeek-7*MS_PER_DAY)return "Last week";
  return "Week of "+new Date(start).toLocaleDateString(undefined,{day:"numeric",month:"short"});
}

export function historyView(){
  let h="<div class='wrap scroll'>"+
    pageHead("History",
      "<button class='backbtn iconbtn' id='calbtn' title='Calendar'>"+icon("calendar")+"</button>"+
      "<button class='newday' id='newday'>+ New</button>");
  const list=newestFirst(state.sessions);
  if(!list.length)h+="<div class='empty-note'>No days yet.</div>";
  let week=null;
  list.forEach(s=>{
    const wk=weekOf(s.created);
    if(wk!==week){week=wk;h+="<div class='setgroup'>"+esc(weekLabel(wk))+"</div>";}
    const t=totals(s),cur=s.id===state.sessionId,secs=workoutSeconds(s);
    // Two lines: what the day was and its reps, then its exercises beside its actions.
    h+="<div class='day hday"+(cur?" cur":"")+"' data-load='"+s.id+"'>"+
      "<div class='info'>"+(cur?"<div class='cur-tag'>Current</div>":"")+
      "<div class='t'>"+esc(s.title)+"</div>"+
      "<div class='sub'>"+shortDate(s.created)+" &middot; "+s.ex.length+" exercises"+
      (secs===null?"":" &middot; "+fmtClock(secs))+
      (s.running?" <span class='live'>live</span>":"")+"</div></div>"+
      "<div class='nums'><div class='r mono'>"+t.reps+"</div><div class='rl'>reps</div></div>"+
      "<div class='exl'>"+(s.ex.length?esc(s.ex.map(e=>e.name).join(" · ")):"No exercises")+"</div>"+
      "<div class='dayacts'>"+
      (s.ex.length?"<button class='dact' data-saveroutine='"+s.id+"' title='Save as a routine'>"+
        icon("bookmark")+"</button>":"")+
      "<button class='dact' data-copyday='"+s.id+"' title='Repeat this day&rsquo;s exercises today'>"+
        icon("reset")+"</button>"+
      "<button class='dact del' data-delday='"+s.id+"' title='Delete this day'>&times;</button></div></div>";
  });
  return h+"</div>";
}
