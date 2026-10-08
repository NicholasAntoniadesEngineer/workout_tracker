// The view router: each page lives in js/views/, this file only picks one and paints it.
// app.js keeps importing everything it needs from here.
import {state} from "./store.js";
import {esc} from "./views/common.js";
import {icon} from "./icons.js";
import {logView} from "./views/log.js";
import {homeView} from "./views/home.js";
import {historyView} from "./views/history.js";
import {calendarView} from "./views/calendar.js";
import {progressView} from "./views/progress.js";
import {bodyView} from "./views/body.js";
import {settingsView} from "./views/settings.js";
import {cardioView} from "./views/cardio.js";
import {programmeView} from "./views/programme.js";
import {learnLib} from "./lazy.js";
import {stackView} from "./views/stack.js";
import {keysSheet,shell,tabBar,wide} from "./views/shell.js";
import {importView} from "./views/importer.js";
import {paletteView} from "./palette.js";
import {dialogView} from "./dialog.js";
import {welcomeNeeded,welcomeView} from "./views/welcome.js";
import {checkinSheet} from "./views/checkin.js";
import {healthView} from "./views/health.js";
import {reviewView} from "./views/review.js";
import {plannerView,planDaySheet,plannedSheet} from "./views/planner.js";
import {scanSheet} from "./views/scan.js";
import {fmtClock,shortDate} from "./model.js";
import {workoutSummary} from "./coach.js";
import {VERSES} from "./verses.js";

export {esc} from "./views/common.js";
export {stepVerse} from "./views/home.js";
export const learnHomeBody=()=>{const L=learnLib();return L?L.learnHomeBody():"";};
export {setClockSeconds,setLabel,setSub,setsSummary,workoutLabel,
  workoutSub} from "./views/log.js";

const VIEWS={cardio:cardioView,prog:programmeView,home:homeView,history:historyView,calendar:calendarView,settings:settingsView,
  progress:progressView,body:bodyView,learn:learnPage,stack:stackView,import:importView,health:healthView,review:reviewView,planner:plannerView};
// Learn, once its library is in; a quiet holding page for the moment before.
function learnPage(){
  const L=learnLib();
  return L?L.learnView():"<div class='wrap scroll'><div class='empty-note'>Opening Learn&hellip;</div></div>";
}

// Destructive actions act at once and offer a few seconds of Undo, instead of a blocking
// confirm dialog before and no way back after.
function undoToast(){
  if(!state.undo)return "";
  return "<div class='toast'><span>"+esc(state.undo.label)+"</span>"+
    "<button id='undobtn'>Undo</button></div>";
}

// One share button everywhere; what it offers depends on where it was pressed. The menu
// lists only what makes sense: a day with results can travel as a picture or a plan, a
// bare plan or routine as a link — and the app itself rides along in every menu.
function shareMenu(){
  const m=state.shareMenu;
  if(!m)return "";
  const opts=[];
  if(m.type==="day"){
    const s=state.sessions.find(x=>x.id===state.sessionId);
    if(s&&s.ex.some(e=>e.sets.length))
      opts.push(["image",icon("photo","sm")+"Share as image","the day&rsquo;s numbers as a picture"]);
    if(s&&s.ex.length)
      opts.push(["link",icon("link","sm")+"Share workout","a link that saves this plan"]);
    if(s&&s.ex.some(e=>e.sets.length))
      opts.push(["text",icon("chat","sm")+"Copy as text","paste it anywhere"]);
    if(s&&s.ex.length)
      opts.push(["print",icon("days","sm")+"Print as a sheet","tick and fill it in the gym, then scan it back"]);
    opts.push(["printweek",icon("calendar","sm")+"Print this week&rsquo;s plans","one sheet for each planned day"]);
    opts.push(["scan",icon("photo","sm")+"Scan a filled sheet","a photo of the sheet adds what you did"]);
  }else if(m.type==="routine"){
    opts.push(["link",icon("link","sm")+"Share routine","a link that saves this routine"]);
  }
  opts.push(["app",icon("shield","sm")+"Share KingsKiln","the app itself"]);
  let h="<div class='overlay' id='sharemenuback'><div class='sheet actionsheet'>"+
    "<div class='sheethead'><div class='plabel'>Share</div>"+
    "<button class='btn ghost tiny' id='sharemenuclose'>Close</button></div>"+
    "<div class='sheetbody'>";
  opts.forEach(o=>{
    h+="<button class='shareopt' data-shareopt='"+o[0]+"'><span class='so-l'>"+o[1]+
       "</span><span class='so-s'>"+o[2]+"</span></button>";
  });
  return h+"</div></div></div>";
}

// Storage is full (photos are the usual cause): nothing new saves until room is made, and the
// app keeps trying, so the warning goes by itself once there's space.
function storageToast(){
  if(!state.storageFull)return "";
  return "<div class='toast' role='alert'><span>Can't save: storage full. Free some space and it saves.</span></div>";
}

// A newer version has arrived while the app was open.
function updateToast(){
  if(!state.updateReady||state.undo)return "";
  return "<div class='toast'><span>KingsKiln has been updated</span>"+
    "<button id='updatebtn'>Reload</button></div>";
}

// A set that beat everything before it: a short, warm banner — then it gets out of the way.
function bestToast(){
  const b=state.best;
  // The summary lists today's bests itself, so the banner steps aside while it's open.
  if(!b||state.summary)return "";
  return "<div class='besttoast' role='status'><span class='bt-k'>New best</span>"+
    "<span class='bt-n'>"+esc(b.name)+"</span><span class='bt-l'>"+esc(b.label)+"</span></div>";
}

// The end of a workout gets a moment of its own: how long, how much, how it compares with
// the last time this workout was done, and any new bests — with the share card one tap away.
function summaryModal(){
  const s=state.summary&&state.sessions.find(x=>x.id===state.summary);
  if(!s)return "";
  const unit=state.settings.unit||"kg";
  const sm=workoutSummary(state.sessions,s,unit);
  const vol=v=>v>=10000?Math.round(v/100)/10+"k":String(v);
  let cmp="";
  if(sm.prev&&sm.prev.volume&&sm.volume){
    const d=Math.round((sm.volume-sm.prev.volume)/sm.prev.volume*100);
    cmp=(d>0?"+"+d+"% volume":(d<0?d+"% volume":"Same volume"))+" vs "+esc(shortDate(sm.prev.created));
  }else if(sm.prev&&sm.prev.reps){
    const d=sm.reps-sm.prev.reps;
    cmp=(d>0?"+"+d:(d<0?String(d):"Same"))+" reps vs "+esc(shortDate(sm.prev.created));
  }
  let h="<div class='overlay' id='summaryback'><div class='sheet actionsheet sumsheet'>"+
    "<div class='sheethead'><div class='plabel'>Workout done</div>"+
    "<button class='btn ghost tiny' id='summaryclose'>Close</button></div><div class='sheetbody'>"+
    "<div class='sumtitle'>"+esc(s.title)+"</div>"+
    "<div class='prgrid sumgrid'>"+
      "<div class='stat'><div class='v mono'>"+(sm.secs===null?"&mdash;":fmtClock(sm.secs))+"</div><div class='l'>Time</div></div>"+
      "<div class='stat'><div class='v mono'>"+sm.sets+"</div><div class='l'>Sets</div></div>"+
      "<div class='stat'><div class='v mono'>"+sm.reps+"</div><div class='l'>Reps</div></div>"+
      "<div class='stat'><div class='v mono'>"+(sm.volume?vol(sm.volume)+"<span class='pru'>"+esc(unit)+"</span>":"&mdash;")+
        "</div><div class='l'>Lifted</div></div></div>"+
    (cmp?"<div class='sumcmp'>"+cmp+"</div>":"");
  if(sm.bests.length){
    h+="<div class='picklbl'>New bests</div>";
    sm.bests.forEach(b=>{h+="<div class='histrow'><span class='histdate'>"+esc(b.name)+"</span>"+
      "<span class='histsets mono wrapvals'>"+esc(b.label)+"</span></div>";});
  }
  // A verse to close on, chosen by the workout so it stays the same each time it's opened.
  if(VERSES.length){
    let n=0;for(const c of String(s.id))n=(n*31+c.charCodeAt(0))>>>0;
    const v=VERSES[n%VERSES.length],txt=state.settings.bibleVersion==="kjv"?v.kjv:v.web;
    h+="<div class='sumverse'>"+esc(txt)+" <span class='sv-ref'>"+esc(v.ref)+"</span></div>";
  }
  h+="<button class='btn primary sumshare' id='summaryshare'>"+icon("photo","sm")+"Share as image</button>";
  return h+"</div></div></div>";
}

const FB_KINDS=[["idea","Idea"],["problem","Problem"],["praise","Praise"]];

// Feedback window: a bottom sheet to type a note; typing never re-renders (values are read
// from the DOM on send), only open/sending/sent/error do — so the caret is never lost.
function feedbackModal(){
  const f=state.feedback;if(!f)return "";
  let body;
  if(f.sending){
    body="<div class='fbstate'><div class='fbspin'></div><div>Sending&hellip;</div></div>";
  }else if(f.sent){
    body="<div class='fbstate'><div class='fbtick'>"+
      "<svg viewBox='0 0 24 24' class='icn'><path class='acc' d='M5 12.5 10 17.5 19 7'/></svg></div>"+
      "<div class='fbh'>Thank you</div>"+
      "<div class='fbp'>Your note reached the developer &mdash; it shapes what gets built next.</div>"+
      "<button class='btn primary' id='feedbackclose'>Close</button></div>";
  }else if(f.error){
    body="<div class='fbstate'><div class='fbh'>Couldn&rsquo;t send</div>"+
      "<div class='fbp'>No connection, maybe. Try again, or send it as an email instead.</div>"+
      (f.errMsg?"<div class='fbwhy'>"+esc(f.errMsg)+"</div>":"")+
      "<button class='btn primary' id='fbretry'>Try again</button>"+
      "<a class='fbmail' id='fbmailto' href='#'>Email it instead</a></div>";
  }else{
    let chips="";
    FB_KINDS.forEach(k=>{chips+="<button class='q"+(f.kind===k[0]?" on":"")+
      "' data-fbkind='"+k[0]+"'>"+k[1]+"</button>";});
    body="<p class='popnote'>Goes straight to the developer. Nothing else is sent.</p>"+
      "<div class='seg'>"+chips+"</div>"+
      "<textarea id='fbmsg' placeholder='What&rsquo;s on your mind?'>"+esc(f.msg||"")+"</textarea>"+
      "<input class='fbin' id='fbemail' type='email' autocomplete='email' "+
        "placeholder='Your email (optional — only if you&rsquo;d like a reply)' value='"+esc(f.email||"")+"'>"+
      "<button class='btn primary fbsend' id='fbsend'>Send feedback</button>"+
      "<div class='fbctx'>Attaches app version &amp; screen &mdash; not your workout data.</div>";
  }
  return "<div class='overlay' id='feedbackback'><div class='sheet actionsheet fbsheet'>"+
    "<div class='sheethead'><div class='plabel'>Send feedback</div>"+
    (f.sending?"":"<button class='btn ghost tiny' id='feedbackclose'>Close</button>")+
    "</div><div class='sheetbody'>"+body+"</div></div></div>";
}

export function paint(){
  // A fresh install sees the welcome screens first, on their own, with no tab bar or sidebar.
  if(welcomeNeeded()&&!state.importJob&&state.view!=="import"){document.getElementById("app").innerHTML=welcomeView()+dialogView();return;}
  const view=(VIEWS[state.view]||logView)();
  document.getElementById("app").innerHTML=
    (wide()?shell(view):view+tabBar())+keysSheet()+paletteView()+checkinSheet()+planDaySheet()+plannedSheet()+scanSheet()+"<input type='file' id='sheetscan' accept='image/*' capture='environment' hidden>"+dialogView()+undoToast()+storageToast()+updateToast()+bestToast()+shareMenu()+feedbackModal()+summaryModal();
}
