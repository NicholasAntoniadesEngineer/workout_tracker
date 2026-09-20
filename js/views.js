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

export {esc} from "./views/common.js";
export {stepVerse} from "./views/home.js";
export {setClockSeconds,setLabel,setSub,setsSummary,workoutLabel,
  workoutSub} from "./views/log.js";

const VIEWS={home:homeView,history:historyView,calendar:calendarView,settings:settingsView,
  progress:progressView,body:bodyView};

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
  document.getElementById("app").innerHTML=
    (VIEWS[state.view]||logView)()+undoToast()+shareMenu()+feedbackModal();
}
