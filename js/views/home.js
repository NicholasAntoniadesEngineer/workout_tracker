// The landing page: the app opens here, not mid-workout. Says the date, offers to start or
// continue today, and points at the calendar, history, progress and body — no filler.
import {dateKey,fmtClock,nowISO,shortDate,totals,workoutSeconds} from "../model.js";
import {allRoutines,backupDue,newestFirst,state,todayCheckin} from "../store.js";
import {VERSES} from "../verses.js";
import {icon} from "../icons.js";
import {esc,wide} from "./common.js";
import {nextCard} from "./programme.js";
import {setBars} from "./progress.js";
import {barChart,lineChart,weeklyVolume,withAxis} from "../charts.js";
import {setClockSeconds,workoutLabel} from "./log.js";
import {learnLib} from "../lazy.js";
import {bodyLine,readinessCard,readinessNow} from "./checkin.js";
import {monthCard} from "./review.js";
import {BAND_LABEL,isRated,suggestion} from "../ready.js";
import {proteinTarget,totalsOf} from "../fuel.js";

// One chip per module that is on: protein so far, habits done. A tap opens the page.
function moduleChips(){
  const k=dateKey(nowISO()),chips=[];
  if(state.settings.modFuel){const t=totalsOf((state.fuel||[]).filter(e=>dateKey(e.at)===k));const b=state.body.filter(x=>x.w);const w=b.length?b[b.length-1].w:0;
    const target=proteinTarget(state.settings.unit==="lb"?w*0.45359237:w,state.settings.goal||"lift");
    chips.push("<button class='mchip' data-openhealth='fuel'><b class='mono'>"+t.p+(target?"<small>/"+target+"</small>":"")+"</b><span>g protein</span></button>");}
  if(state.settings.modMind&&(state.habits||[]).length){const d=((state.habitDone||{})[k]||[]).length;
    chips.push("<button class='mchip' data-openhealth='mind'><b class='mono'>"+d+"<small>/"+state.habits.length+"</small></b><span>habits</span></button>");}
  if(state.settings.modMarkers&&(state.markers||[]).length)chips.push("<button class='mchip' data-openhealth='markers'><b class='mono'>"+new Set(state.markers.map(m=>m.id)).size+"</b><span>markers</span></button>");
  return chips.length?"<div class='mchips'>"+chips.join("")+"</div>":"";
}

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
    return "<button class='homecta' data-resume='"+emptyOpen.id+"'>"+(emptyOpen.started?"Continue":"Start")+" &rarr; "+esc(emptyOpen.title)+"</button>";
  // Nothing today yet: most workouts repeat a recent day, so offer that in one tap too.
  let h="<button class='homecta' id='homestart'>Start today&rsquo;s workout</button>";
  const last=newestFirst(state.sessions).find(s=>s.ex.some(e=>e.sets.length));
  if(last)h+="<button class='homelink' data-copyday='"+last.id+"'>Repeat "+esc(last.title)+
    " &middot; "+last.ex.length+" exercises</button>";
  return h;
}

// ── Tablet and laptop: Home as a dashboard ─────────────────────────────────────────────
// The sidebar replaces the tiles, so the page can show the week, today's workout, what's
// next in the programme, this week's sets and volume, body weight, recent days and routines.
function weekCards(){
  const restDay=state.settings.restDay===6?6:0;
  const today=new Date();today.setHours(12,0,0,0);
  const sinceStart=restDay===0?(today.getDay()+6)%7:today.getDay();
  let h="",n=0;
  for(let i=0;i<7;i++){
    const d=new Date(today);d.setDate(d.getDate()-sinceStart+i);
    const k=dateKey(d.toISOString()),isRest=d.getDay()===restDay,future=i>sinceStart;
    const day=state.sessions.filter(s=>dateKey(s.created)===k&&(s.ex.length||s.cardio));
    const did=day.filter(s=>s.ex.some(e=>e.sets.length));
    if(did.length&&!isRest)n++;
    const s=did[0]||day[0];
    const what=s?esc(s.title):isRest?"&#10013; Rest":future?"":"&mdash;";
    const sub=s?(s.running?"live &middot; "+totals(s).reps+" reps":did.length?(s.cardio?fmtClock(s.cardio.secs):totals(s).reps+" reps"):"planned"):isRest?"kept for rest":"";
    h+="<button class='hwday"+(i===sinceStart?" now":"")+(future?" future":"")+(isRest?" rest":"")+(did.length?" did":"")+"'"+(s?" data-resume='"+s.id+"'":"")+">"+
      "<span class='hwdh'><span>"+esc(d.toLocaleDateString(undefined,{weekday:"short"}))+"</span><span>"+d.getDate()+"</span></span>"+
      "<span class='hwdot'></span><span class='hwdt'>"+what+"</span><span class='hwds'>"+sub+"</span></button>";
  }
  return {html:"<div class='hweek'>"+h+"</div>",trained:n};
}
function heroCard(running,finished,emptyOpen,doneToday){
  if(running){
    const done=running.ex.filter(e=>e.sets.length).length,t=totals(running);
    return "<div class='hhero'><div class='hheroe'><span class='lgdot'></span>In progress"+(running.started?" &middot; started "+
      esc(new Date(running.started).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})):"")+"</div>"+
      "<div class='hherot'>"+esc(running.title)+"</div>"+
      "<div class='hherostats'><span><b class='mono' id='hhero-work'>"+workoutLabel(running)+"</b>elapsed</span>"+
        "<span><b class='mono' id='hhero-rest'>"+fmtClock(setClockSeconds(running))+"</b>rest</span>"+
        "<span><b class='mono'>"+t.sets+"</b>sets &middot; "+done+" of "+running.ex.length+" lifts</span></div>"+
      "<button class='homecta' data-resume='"+running.id+"'>Continue logging <kbd>2</kbd></button></div>";
  }
  return "<div class='hhero'><div class='hheroe'>"+(finished?"Done today":"Today")+"</div>"+
    "<div class='hherot'>"+(finished?esc(finished.title)+(doneToday>1?" &middot; "+doneToday+" workouts":""):"Ready when you are")+"</div>"+
    homeCta(null,finished,emptyOpen,doneToday)+"</div>";
}
function bodyCard(){
  const pts=state.body.filter(b=>b.w).slice(-12);
  if(!pts.length)return "<div class='card hcard'><div class='hcardh'><span class='llabel'>Body weight</span><button class='hmore' data-nav='body'>Body &rsaquo;</button></div>"+
    "<div class='empty-note'>Log a weigh-in on Body to see the line here.</div></div>";
  const last=pts[pts.length-1],first=pts[0],d=Math.round((last.w-first.w)*10)/10,u=esc(state.settings.unit||"kg");
  return "<div class='card hcard'><div class='hcardh'><span class='llabel'>Body weight</span><button class='hmore' data-nav='body'>Body &rsaquo;</button></div>"+
    "<div class='hbig'><b class='mono'>"+last.w+"</b> "+u+(pts.length>1&&d?" <span class='hdelta'>"+(d>0?"+":"&minus;")+Math.abs(d)+" "+u+" since "+esc(shortDate(first.at))+"</span>":"")+"</div>"+
    (pts.length>1?lineChart(pts.map(p=>p.w),{w:400,h:110,labels:pts.map(p=>shortDate(p.at)+": "+p.w)}):"")+"</div>";
}
function volumeCard(){
  const weeks=weeklyVolume(state.sessions),useTon=weeks.some(w=>w.ton),vals=weeks.map(w=>useTon?w.ton:w.reps),now=weeks[weeks.length-1];
  const f=v=>v>=10000?Math.round(v/100)/10+"k":Math.round(v).toLocaleString();
  return "<div class='card hcard'><div class='hcardh'><span class='llabel'>Weekly "+(useTon?"volume &middot; "+esc(state.settings.unit||"kg")+" lifted":"reps")+"</span>"+
    "<button class='hmore' data-nav='progress'>Progress &rsaquo;</button></div>"+
    withAxis(barChart(vals,{w:400,h:130,labels:weeks.map((w,i)=>w.label+": "+f(vals[i]))}),f(Math.max(0,...vals)),0)+
    "<div class='chartlbls'><span>"+esc(weeks[0].label)+"</span><span>"+f(useTon?now.ton:now.reps)+" this week</span><span>Now</span></div></div>";
}
function recentCard(){
  const list=newestFirst(state.sessions).filter(s=>s.ex.some(e=>e.sets.length)&&!s.running).slice(0,3);
  if(!list.length)return "";
  return "<div class='card hcard'><div class='hcardh'><span class='llabel'>Recent days</span><button class='hmore' data-nav='history'>History &rsaquo;</button></div>"+
    "<div class='hrecent'>"+list.map(s=>{
      const t=totals(s),secs=workoutSeconds(s),c=s.cardio;
      return "<button class='hrec' data-resume='"+s.id+"'><span class='hrect'><b>"+esc(s.title)+"</b><span class='mono'>"+
        (c&&c.dist>50?(c.dist/1000).toFixed(1)+" km":t.reps+" reps")+"</span></span>"+
        "<span class='hrecs'>"+esc(shortDate(s.created))+(secs==null?"":" &middot; "+fmtClock(secs))+"</span>"+
        "<span class='hrecx'>"+esc(s.ex.map(e=>e.name).slice(0,3).join(" · "))+"</span></button>";}).join("")+"</div></div>";
}
function routinesCard(){
  const r=allRoutines();
  if(!r.length)return "";
  return "<div class='card hcard'><div class='hcardh'><span class='llabel'>Start from a routine</span></div>"+
    "<div class='hroutines'>"+r.slice(0,8).map(x=>"<button class='lchip' data-routine='"+x.id+"'>"+esc(x.name)+"</button>").join("")+"</div></div>";
}
function learnLine(){
  const L=learnLib();if(!L)return "";
  const all=L.AREAS.flatMap(a=>a[2].flatMap(c=>c.topics.filter(t=>t.days&&t.days.length)));
  if(!all.length)return "";
  const day=Math.floor(Date.now()/86400000),tp=all[(day+(state.featureShift||0))%all.length],c=L.catOfTopic(tp.id);
  return "<button class='card hlearn' data-learnjump='"+esc(tp.id)+"'><span class='lring'>"+icon("book","sm")+"</span>"+
    "<span class='hlearnb'><span class='leyebrow'>From Learn"+(c?" &middot; "+esc(c.cat):"")+"</span><span class='hlearnt'>"+esc(tp.title)+"</span></span>"+
    "<span class='hmore'>Read and train &rsaquo;</span></button>";
}
// The one hero: readiness (the ring, the reason, the day's advice) with the workout's button
// beside it. Without a check-in yet it asks for one; with the check-ins off it is just today.
function ringSvg(score){
  const r=56,c=2*Math.PI*r,off=c*(1-(score==null?0:score)/100);
  return "<svg class='hring' viewBox='0 0 128 128' aria-hidden='true'><circle cx='64' cy='64' r='"+r+"' class='hringt'/>"+
    (score==null?"":"<circle cx='64' cy='64' r='"+r+"' class='hringv' stroke-dasharray='"+c.toFixed(1)+"' stroke-dashoffset='"+off.toFixed(1)+"'/>")+"</svg>";
}
function workoutCta(running,finished,emptyOpen){
  if(running)return "<button class='btn primary' data-resume='"+running.id+"'>Continue &rarr; "+esc(running.title)+"</button>";
  if(finished)return "<button class='btn primary' id='homestart'>Start another workout</button>";
  if(emptyOpen)return "<button class='btn primary' data-resume='"+emptyOpen.id+"'>"+(emptyOpen.started?"Continue":"Start")+" &rarr; "+esc(emptyOpen.title)+(emptyOpen.deload?" &middot; deload":"")+"</button>";
  return "<button class='btn primary' id='homestart'>Start today&rsquo;s workout</button>";
}
function heroWide(running,finished,emptyOpen,doneToday){
  const ci=!!state.settings.checkin,c=ci?todayCheckin():null,r=ci?readinessNow():null;
  let word,sub,score=null,ringWord="",second="";
  if(!ci){
    word=running?esc(running.title):finished?esc(finished.title)+(doneToday>1?" &middot; "+doneToday+" workouts":""):"Ready when you are";
    sub=running?"In progress":finished?"Done today":"Nothing logged yet today";
  }else if(!c){
    word="Morning check-in";sub="30 seconds: sleep, soreness, energy, stress.";
    second="<button class='btn ghost' id='cistart'>Check in</button>";
  }else if(!r.band){
    word="Checked in";sub="Your readiness word shows after "+Math.max(1,7-state.checkins.filter(isRated).length)+" more mornings.";
    second="<button class='btn ghost' id='cistart'>Edit check-in</button>";
  }else{
    word=esc(r.why);sub=esc(suggestion(r.rundown?"rundown":r.band,r.planned));score=r.score;ringWord=r.rundown?"Rest":BAND_LABEL[r.band];
    second="<button class='btn ghost' id='cistart'>Edit check-in</button>";
  }
  // Run down before the readiness word exists still gets its advice.
  if(r&&r.rundown&&!ringWord){word="Feeling run down";sub=esc(suggestion("rundown"));}
  const live=running?"<div class='hlive'><span class='lgdot'></span><b class='mono' id='hhero-work'>"+workoutLabel(running)+"</b> elapsed &middot; rest <b class='mono' id='hhero-rest'>"+
    fmtClock(setClockSeconds(running))+"</b> &middot; "+running.ex.filter(e=>e.sets.length).length+" of "+running.ex.length+" lifts</div>":"";
  const ringInner=ringWord?"<b>"+ringWord+"</b><span>readiness</span>":"";
  const finishedLink=finished&&!running?"<button class='hmore' data-resume='"+finished.id+"'>Open "+esc(finished.title)+" &rsaquo;</button>":"";
  // The ring only once there is a score to fill it; before that, a quiet disc with an icon.
  const left=score!=null?"<div class='hringwrap "+r.band+"'>"+ringSvg(score)+"<div class='hringv2'>"+ringInner+"</div></div>":
    "<div class='hdisc'>"+icon(ci?"target":"dumbbell","sm")+"</div>";
  return "<div class='card hhero2'>"+left+
    "<div class='hherob'><div class='llabel'>Today</div><div class='hheroh'>"+word+"</div><div class='hheros'>"+sub+"</div>"+
    (bodyLine()?"<div class='hbody'>"+bodyLine()+"</div>":"")+live+
    "<div class='hherobtns'>"+workoutCta(running,finished,emptyOpen)+second+finishedLink+"</div></div></div>";
}
function backupLine(){
  if(!backupDue())return "";
  return "<div class='hwnote'>"+icon("save","sm")+"<span><b>Back up your history.</b> It lives only on this device.</span>"+
    "<button class='btn ghost tiny' id='backupnow'>Save backup</button><button class='hmore' id='backupsnooze'>Not now</button></div>";
}
function verseLine(){
  if(!VERSES.length)return "";
  const v=VERSES[state.verseIdx||0],ver=state.settings.bibleVersion==="kjv"?"kjv":"web";
  const link="https://www.biblegateway.com/passage/?search="+encodeURIComponent(v.ref.split(":")[0])+"&version="+GATEWAY[ver];
  return "<div class='hwverse'><span class='hwvt'>"+esc(v[ver])+"</span> <a class='homeref' href='"+link+"' target='_blank' rel='noopener'>"+esc(v.ref)+"</a>"+
    "<button class='verstep' id='verprev' aria-label='Previous verse'>&lsaquo;</button><button class='verstep' id='vernext' aria-label='Next verse'>&rsaquo;</button></div>";
}
function homeWide(running,finished,emptyOpen,doneToday){
  const wk=weekCards();
  const dateStr=new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"});
  return "<div class='wrap scroll homewide'><div class='hwtop'><div><div class='hwdate'>"+esc(dateStr)+"</div>"+verseLine()+"</div>"+
    "<div class='hwsub'>"+wk.trained+" trained this week</div></div>"+
    backupLine()+
    "<div class='hstack'>"+
    heroWide(running,finished,emptyOpen,doneToday)+moduleChips()+monthCard()+
    "<div class='card hcard'><div class='hcardh'><span class='llabel'>This week</span><button class='hmore' data-nav='calendar'>Calendar &rsaquo;</button></div>"+wk.html+"</div>"+
    nextCard()+
    "<div class='hg2'><div class='card hcard'><div class='hcardh'><span class='llabel'>Hard sets this week &middot; aim 10&ndash;20</span>"+
      "<button class='hmore' data-nav='progress'>Progress &rsaquo;</button></div>"+setBars().replace("<div class='card chartcard setbars'>","<div class='setbars'>")+"</div>"+
      volumeCard()+"</div>"+
    routinesCard()+recentCard()+
    "</div></div>";
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
  if(wide())return homeWide(running,finished,emptyOpen,doneToday);

  let h="<div class='wrap scroll home'>"+
    "<div class='homeinner'>"+
      "<div class='brand'>"+
        "<svg class='brandshield' viewBox='0 0 100 100' aria-hidden='true'>"+
        "<path d='M50 14 L78 25 V50 C78 69 65 81 50 88 C35 81 22 69 22 50 V25 Z'"+
        " fill='none' stroke='currentColor' stroke-width='9' stroke-linejoin='round'/>"+
        "<line x1='50' y1='33' x2='50' y2='64' stroke='var(--accent)' stroke-width='8' stroke-linecap='round'/>"+
        "<line x1='37' y1='45' x2='63' y2='45' stroke='var(--accent)' stroke-width='8' stroke-linecap='round'/>"+
        "</svg><span>Kings<span class='bk'>Kiln</span><sup class='tm' aria-label='trademark'>&trade;</sup></span></div>"+
      "<div class='homehero'>"+
        "<div class='homeday'>"+esc(dateStr)+"</div>"+
        readinessCard()+(bodyLine()?"<div class='hbody phone'>"+bodyLine()+"</div>":"")+moduleChips()+monthCard()+
        verseCard()+
        (running?"":nextCard())+
        homeCta(running,finished,emptyOpen,doneToday)+
      "</div>"+
      // Progress and Learn have tabs now; the tiles keep what doesn't.
      "<div class='homerow four'>"+
        "<button class='hometile' id='homecardio'>"+icon("bolt","ht")+(state.cardio?"Cardio &middot; live":"Cardio")+"</button>"+
        "<button class='hometile' id='homedays'>"+icon("days","ht")+"History</button>"+
        "<button class='hometile' id='homecal'>"+icon("calendar","ht")+"Calendar</button>"+
        "<button class='hometile' id='homebody'>"+icon("body","ht")+"Body</button>"+
      "</div>";
  if(backupDue()){
    h+="<div class='backupcard'><div class='bc-t'>"+icon("save","sm")+"Back up your history</div>"+
      "<div class='bc-p'>It lives only on this phone. Save a copy to Files or iCloud Drive.</div>"+
      "<div class='bc-a'><button class='btn primary tiny' id='backupnow'>Save backup</button>"+
      "<button class='btn ghost tiny' id='backupsnooze'>Not now</button></div></div>";
  }
  if(totalDone)h+=sabbathWeek();
  h+="</div>";
  return h+"</div>";
}
