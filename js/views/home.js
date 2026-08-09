// The landing page: the app opens here, not mid-workout. Says the date, offers to start or
// continue today, and points at the calendar, history, progress and body — no filler.
import {dateKey,nowISO} from "../model.js";
import {newestFirst,state} from "../store.js";
import {VERSES} from "../verses.js";
import {esc} from "./common.js";

// A fresh verse each time the app opens — random once at load, so incidental repaints
// (the timer ticking) never reshuffle it. The corner arrows then step through the pool.
if(VERSES.length&&state.verseIdx==null)state.verseIdx=Math.floor(Math.random()*VERSES.length);

// Move to the previous/next verse, wrapping around the ends.
export function stepVerse(dir){
  if(!VERSES.length)return;
  const n=VERSES.length;
  state.verseIdx=(((state.verseIdx||0)+dir)%n+n)%n;
}

// Bible Gateway codes for the versions we offer. The card shows the chosen translation's
// text; the reference links to that translation's full chapter — the source, not my wording.
const GATEWAY={web:"WEB",kjv:"KJV"};

// The week as a rhythm of work and rest, not a streak: the rest day is the crown of the
// week, never a hole in it, and nothing "breaks" — a quiet count, then a fresh week.
function sabbathWeek(){
  const restDay=state.settings.restDay===6?6:0;        // 0 Sunday, 6 Saturday
  const today=new Date();today.setHours(12,0,0,0);
  // Orient the week so the rest day lands last.
  const sinceStart=restDay===0?(today.getDay()+6)%7:today.getDay();
  const trained={};
  state.sessions.forEach(s=>{if(s.ex.some(e=>e.sets.length))trained[dateKey(s.created)]=true;});
  let dots="",n=0,restPassed=false,restTrained=false;
  for(let i=0;i<7;i++){
    const d=new Date(today);d.setDate(d.getDate()-sinceStart+i);
    const did=!!trained[dateKey(d.toISOString())];
    const isRest=d.getDay()===restDay;
    const future=i>sinceStart;
    if(did&&!isRest)n++;
    if(isRest&&!future){restPassed=true;restTrained=did;}
    const init=d.toLocaleDateString(undefined,{weekday:"narrow"});
    let cls="wkday",mark="&#9675;";                    // hollow: open
    if(isRest){cls+=" rest";mark="&#10013;";}          // the cross marks the rest day
    else if(did){cls+=" did";mark="&#9679;";}
    if(future)cls+=" future";
    if(i===sinceStart)cls+=" now";
    dots+="<div class='"+cls+"'><span class='wkinit'>"+esc(init)+"</span>"+
      "<span class='wkdot'>"+mark+"</span></div>";
  }
  let label=n+" trained";
  if(restPassed)label+=" &middot; "+(restTrained?"rest day trained":"rest kept");
  return "<div class='homeweek'><div class='wkrow'>"+dots+"</div>"+
    "<div class='homestat'>"+label+"</div></div>";
}

// Saved routines as one quiet row of chips — tap to start today from one.
function routineRow(){
  if(!state.routines.length)return "";
  let h="<div class='routinerow'>";
  state.routines.forEach(r=>{
    h+="<button class='chip rchip' data-routine='"+r.id+"'>"+esc(r.name)+
       " <span class='rn'>"+r.ex.length+"</span></button>";
  });
  return h+"</div>";
}

function verseCard(){
  if(!VERSES.length)return "";
  const v=VERSES[state.verseIdx||0];
  const ver=state.settings.bibleVersion==="kjv"?"kjv":"web";
  const chapter=v.ref.split(":")[0];
  const link="https://www.biblegateway.com/passage/?search="+
    encodeURIComponent(chapter)+"&version="+GATEWAY[ver];
  return "<div class='homeverse'>"+esc(v[ver])+
    "<div class='verfoot'>"+
      "<button class='verstep' id='verprev' aria-label='Previous verse'>&lsaquo;</button>"+
      "<a class='homeref' href='"+link+"' target='_blank' rel='noopener'>"+esc(v.ref)+"</a>"+
      "<button class='verstep' id='vernext' aria-label='Next verse'>&rsaquo;</button>"+
    "</div></div>";
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
        verseCard()+
        homeCta(running,finished,emptyOpen,doneToday)+
        ((!running&&!emptyOpen)?routineRow():"")+
      "</div>"+
      "<div class='homerow'>"+
        "<button class='hometile' id='homecal'><span class='hticon'>&#128197;</span>Calendar</button>"+
        "<button class='hometile' id='homedays'><span class='hticon'>&#9776;</span>History</button>"+
        "<button class='hometile' id='homeprog'><span class='hticon'>&#128200;</span>Progress</button>"+
        "<button class='hometile' id='homebody'><span class='hticon'>&#9878;</span>Body</button>"+
      "</div>";
  if(totalDone)h+=sabbathWeek();
  h+="</div>";
  return h+"</div>";
}
