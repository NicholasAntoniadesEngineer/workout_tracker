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

export function paint(){
  document.getElementById("app").innerHTML=(VIEWS[state.view]||logView)()+undoToast();
}
