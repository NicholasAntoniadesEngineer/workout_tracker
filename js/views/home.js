// The landing page: the app opens here, not mid-workout. Says the date, offers to start or
// continue today, and points at the calendar, history, progress and body — no filler.
import {dateKey,nowISO} from "../model.js";
import {newestFirst,state} from "../store.js";
import {VERSES} from "../verses.js";
import {esc} from "./common.js";

const MS_PER_DAY=86400000;

// One verse a day, the same for everyone on that date, rotating through the whole set.
// Its reference links to the passage on Bible Gateway (WEB) — the source, not my wording.
function verseOfDay(){
  if(!VERSES.length)return "";
  const v=VERSES[Math.floor(Date.now()/MS_PER_DAY)%VERSES.length];
  return "<div class='homeverse'>"+esc(v.text)+
    "<a class='homeref' href='"+v.source+"' target='_blank' rel='noopener'>"+esc(v.ref)+"</a></div>";
}

// The hero's one big button, chosen from today's state: resume a live workout, or — once
// today's has ended — start the next one, with a quiet link back to the finished one.
function homeCta(running,finished,emptyOpen,doneToday){
  if(running)
    return "<button class='homecta' data-resume='"+running.id+"'>Continue &rarr; "+esc(running.title)+"</button>";
  if(finished)
    return "<button class='homecta' id='homestart'>Start another workout</button>"+
      "<button class='homelink' data-resume='"+finished.id+"'>Resume "+esc(finished.title)+
      (doneToday>1?" &middot; "+doneToday+" today":"")+"</button>";
  if(emptyOpen)
    return "<button class='homecta' data-resume='"+emptyOpen.id+"'>Continue &rarr; "+esc(emptyOpen.title)+"</button>";
  // Nothing today yet: most workouts repeat a recent day, so offer that in one tap too.
  let h="<button class='homecta' id='homestart'>Start today&rsquo;s workout</button>";
  const last=newestFirst(state.sessions).find(s=>s.ex.some(e=>e.sets.length));
  if(last)h+="<button class='homelink' data-copyday='"+last.id+"'>Repeat "+esc(last.title)+
    " &middot; "+last.ex.length+" exercises</button>";
  return h;
}

export function homeView(){
  const todayK=dateKey(nowISO());
  const todaysList=state.sessions.filter(s=>dateKey(s.created)===todayK)
    .sort((a,b)=>(a.created||"").localeCompare(b.created||""));
  const hasSets=s=>s.ex.some(e=>e.sets.length);
  // A workout you're mid-way through gets Continue; once it has ended, the offer flips to
  // starting the next one — a second (or third) workout on the same day is first-class.
  const running=todaysList.find(s=>s.running);
  const finished=todaysList.filter(s=>hasSets(s)&&!s.running).slice(-1)[0]||null;
  const emptyOpen=todaysList.find(s=>!hasSets(s)&&!s.running)||null;
  const doneToday=todaysList.filter(s=>hasSets(s)).length;
  const dateStr=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});

  // A quiet, honest stat line — trained days over the last week — shown only once there's data.
  const weekKeys={};
  for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);weekKeys[dateKey(d.toISOString())]=false;}
  state.sessions.forEach(s=>{const k=dateKey(s.created);
    if(k in weekKeys&&s.ex.some(e=>e.sets.length))weekKeys[k]=true;});
  const weekDone=Object.values(weekKeys).filter(Boolean).length;
  const totalDone=state.sessions.filter(s=>s.ex.some(e=>e.sets.length)).length;

  let h="<div class='wrap scroll home'>"+
    "<button class='daysbtn iconbtn homegear' id='settingsbtn' title='Settings'>&#9881;</button>"+
    "<div class='homeinner'>"+
      "<div class='brand'>"+
        "<svg class='brandshield' viewBox='0 0 100 100' aria-hidden='true'>"+
        "<path d='M50 14 L78 25 V50 C78 69 65 81 50 88 C35 81 22 69 22 50 V25 Z'"+
        " fill='none' stroke='currentColor' stroke-width='9' stroke-linejoin='round'/>"+
        "<line x1='50' y1='33' x2='50' y2='64' stroke='var(--accent)' stroke-width='8' stroke-linecap='round'/>"+
        "<line x1='37' y1='45' x2='63' y2='45' stroke='var(--accent)' stroke-width='8' stroke-linecap='round'/>"+
        "</svg><span>Kings<span class='bk'>Kiln</span></span></div>"+
      "<div class='homehero'>"+
        "<div class='homeday'>"+esc(dateStr)+"</div>"+
        verseOfDay()+
        homeCta(running,finished,emptyOpen,doneToday)+
      "</div>"+
      "<div class='homerow'>"+
        "<button class='hometile' id='homecal'><span class='hticon'>&#128197;</span>Calendar</button>"+
        "<button class='hometile' id='homedays'><span class='hticon'>&#9776;</span>History</button>"+
        "<button class='hometile' id='homeprog'><span class='hticon'>&#128200;</span>Progress</button>"+
        "<button class='hometile' id='homebody'><span class='hticon'>&#9878;</span>Body</button>"+
      "</div>";
  if(totalDone)
    h+="<div class='homestat'>"+weekDone+" of the last 7 days trained &middot; "+
       totalDone+" workout"+(totalDone>1?"s":"")+" logged</div>";
  h+="</div>";
  return h+"</div>";
}
