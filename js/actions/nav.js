// Moving around: home, back, the screens off the home hub, undo, and the verse arrows.
// Each handler returns true once it has dealt with the tap.
import {activeEx,getSession,selectSession,state} from "../store.js";
import {stepVerse} from "../views.js";
import {wide} from "../views/common.js";
import {checkGps,openCardio} from "./cardio.js";

// The sidebar (and the number keys) go straight to a section, entering it the way its home
// tile does: Log picks up a running workout, Calendar opens on the day's month, Learn at its top.
function goSection(k,ctx){
  state.sheet=false;state.adding=false;state.exHist=false;state.exInfo=null;state.calDay=null;state.keysOpen=false;state.scrollTo=0;
  if(k==="log"){
    const live=state.sessions.find(s=>s.running);
    if(live)selectSession(live.id);
    ctx.recallLast(activeEx());
    state.origin="log";state.sheet=!getSession().ex.length;ctx.markRefit();
  }else if(k==="calendar"){
    // The calendar always opens on this month; the arrows reach any other.
    const d=new Date();
    state.calYear=d.getFullYear();state.calMonth=d.getMonth();
  }else if(k==="learn"){
    state.learnOpen=null;state.learnCat=null;state.learnIndex=null;state.learnQuery="";state.learnSearchOpen=false;
  }else if(k==="settings"){
    state.settingsPart=null;
  }else if(k==="cardio"&&!state.cardio&&!state.cardioDone){
    openCardio();checkGps(ctx.render);
  }
  state.view=k;
}

// Where Back goes from History, Calendar, Body and the health pages: Progress when they were
// opened from it (or from one another after it), home otherwise.
const FROM_PROGRESS=["history","calendar","body","health"];
export function markBack(){
  state.backTo=state.view==="progress"?"progress":FROM_PROGRESS.indexOf(state.view)>=0?(state.backTo||""):"";
}
export function handle(t,ctx){
  if(t.id==="updatebtn"){location.reload();return true;}
  // The welcome screens: Next, Skip, Start logging, or straight to Import.
  const w=t.closest&&t.closest("[data-welcome]");
  if(w){
    const k=w.getAttribute("data-welcome");
    if(k==="next"){state.welcomeStep=(state.welcomeStep||0)+1;}
    else if(k==="import"){state.welcomed=true;state.importFrom="home";state.importJob=null;state.view="import";}
    else{state.welcomed=true;state.welcomeStep=0;goSection("log",ctx);}
    state.scrollTo=0;ctx.render();return true;
  }
  const nav=t.closest&&t.closest("[data-nav]");
  if(nav){goSection(nav.getAttribute("data-nav"),ctx);ctx.render();return true;}
  if(t.closest&&t.closest("#keyshelp")){state.keysOpen=true;ctx.render();return true;}
  if(t.id==="keysback"||(t.closest&&t.closest("#keysclose"))){state.keysOpen=false;ctx.render();return true;}
  if(t.id==="undobtn"){ctx.restoreUndo();ctx.render();return true;}

  // Home is the hub the app opens to.
  if(t.id==="homebtn"){state.view="home";state.sheet=false;state.adding=false;ctx.render();return true;}

  if(t.id==="verprev"){stepVerse(-1);ctx.render();return true;}
  if(t.id==="vernext"){stepVerse(1);ctx.render();return true;}

  // Home tiles hold an icon span, so a tap can land inside the button — match by ancestor.
  // Opened from Progress (or from a page Progress opened), Back returns to Progress.
  if(t.closest&&t.closest("#homedays")){markBack();state.view="history";state.scrollTo=0;ctx.render();return true;}
  if(t.closest&&t.closest("#homeprog")){state.view="progress";ctx.render();return true;}
  if(t.closest&&t.closest("#pgcharts")){state.view="progress";state.backTo="";state.scrollTo=0;ctx.render();return true;}
  if(t.closest&&t.closest("#homebody")){markBack();state.view="body";state.scrollTo=0;ctx.render();return true;}
  if(t.closest&&t.closest("#homelearn")){state.view="learn";state.learnOpen=null;state.learnCat=null;state.learnIndex=null;state.learnQuery="";state.learnSearching=false;state.scrollTo=0;ctx.render();return true;}
  // From an exercise's sheet straight to the Learn topic behind it, opened.
  const jump=t.closest&&t.closest("[data-learnjump]");
  if(jump){
    state.learnOpen=jump.getAttribute("data-learnjump");state.learnTab="overview";state.learnListY=0;state.scrollTo=0;

    state.exHist=false;state.exInfo=null;state.sheet=false;state.view="learn";ctx.render();return true;
  }

  if(t.closest&&(t.closest("#homecal")||t.closest("#calbtn"))){
    // Always this month, whichever day was last open.
    const d=new Date();markBack();
    state.calYear=d.getFullYear();state.calMonth=d.getMonth();state.calDay=null;
    state.view="calendar";ctx.render();return true;
  }

  // Back walks toward the home hub: calendar to the days list, everything else home.
  // In Learn, Back steps up a level: topic → its list (where you left it) → Learn home.
  if(t.closest&&t.closest("#backbtn")&&state.view==="learn"&&state.learnOpen){
    state.learnOpen=null;state.scrollTo=state.learnListY||0;ctx.render();return true;
  }
  if(t.closest&&t.closest("#backbtn")&&state.view==="learn"&&state.learnIndex){
    state.learnIndex=null;state.scrollTo=0;ctx.render();return true;
  }
  if(t.closest&&t.closest("#backbtn")&&state.view==="learn"&&state.learnCat){
    state.learnCat=null;state.scrollTo=0;ctx.render();return true;
  }
  // A settings group goes back to the list of groups.
  if(t.closest&&t.closest("#backbtn")&&state.view==="settings"&&state.settingsPart){state.settingsPart=null;state.scrollTo=0;ctx.render();return true;}
  const os=t.closest&&t.closest("[data-opensettings]");
  if(os){state.settingsPart=os.getAttribute("data-opensettings");state.view="settings";state.sheet=false;state.scrollTo=0;ctx.render();return true;}
  const sp=t.closest&&t.closest("[data-setpart]");
  if(sp){state.settingsPart=sp.getAttribute("data-setpart");state.scrollTo=0;ctx.render();return true;}
  if(t.closest&&t.closest("#backbtn")){
    // On a laptop the health pages sit under Progress (their crumb says so).
    state.view=state.backTo==="progress"||(state.view==="health"&&wide())?"progress":state.view==="calendar"?"history":"home";state.backTo="";
    state.sheet=false;state.adding=false;ctx.render();return true;
  }

  if(t.id==="daysbtn"){state.view="history";state.sheet=false;state.adding=false;ctx.render();return true;}
  if(t.id==="settingsbtn"){state.view="settings";state.sheet=false;state.adding=false;ctx.render();return true;}
  return false;
}
