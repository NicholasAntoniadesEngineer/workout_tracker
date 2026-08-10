// The view router: each page lives in js/views/, this file only picks one and paints it.
// app.js keeps importing everything it needs from here.
import {state} from "./store.js";
import {esc} from "./views/common.js";
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
      opts.push(["image","&#128247; Share as image","the day&rsquo;s numbers as a picture"]);
    if(s&&s.ex.length)
      opts.push(["link","&#128279; Share workout","a link that saves this plan"]);
  }else if(m.type==="routine"){
    opts.push(["link","&#128279; Share routine","a link that saves this routine"]);
  }
  opts.push(["app","&#128737; Share KingsKiln","the app itself"]);
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

export function paint(){
  document.getElementById("app").innerHTML=(VIEWS[state.view]||logView)()+undoToast()+shareMenu();
}
