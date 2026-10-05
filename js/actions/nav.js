// Moving around: home, back, the screens off the home hub, undo, and the verse arrows.
// Each handler returns true once it has dealt with the tap.
import {activeEx,getSession,selectSession,state} from "../store.js";
import {stepVerse} from "../views.js";
import {checkGps,openCardio} from "./cardio.js";

// The sidebar (and the number keys) go straight to a section, entering it the way its home
// tile does: Log picks up a running workout, Calendar opens on the day's month, Learn at its top.
function goSection(k,ctx){
  state.sheet=false;state.adding=false;state.exHist=false;state.exInfo=null;state.calDay=null;state.keysOpen=false;state.scrollTo=0;
  if(k==="log"){
    const live=state.sessions.find(s=>s.running);
    if(live)selectSession(live.id);
    ctx.recallLast(activeEx());
    state.origin="home";state.sheet=!getSession().ex.length;ctx.markRefit();
  }else if(k==="calendar"){
    // The calendar always opens on this month; the arrows reach any other.
    const d=new Date();
    state.calYear=d.getFullYear();state.calMonth=d.getMonth();
  }else if(k==="learn"){
    state.learnOpen=null;state.learnCat=null;state.learnIndex=null;state.learnQuery="";state.learnSearchOpen=false;
  }else if(k==="cardio"&&!state.cardio&&!state.cardioDone){
    openCardio();checkGps(ctx.render);
  }
  state.view=k;
}

export function handle(t,ctx){
  if(t.id==="updatebtn"){location.reload();return true;}
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
  if(t.closest&&t.closest("#homedays")){state.view="history";ctx.render();return true;}
  if(t.closest&&t.closest("#homeprog")){state.view="progress";ctx.render();return true;}
  if(t.closest&&t.closest("#homebody")){state.view="body";ctx.render();return true;}
  if(t.closest&&t.closest("#homelearn")){state.view="learn";state.learnOpen=null;state.learnCat=null;state.learnIndex=null;state.learnQuery="";state.learnSearching=false;state.scrollTo=0;ctx.render();return true;}
  // From an exercise's sheet straight to the Learn topic behind it, opened.
  const jump=t.closest&&t.closest("[data-learnjump]");
  if(jump){
    state.learnOpen=jump.getAttribute("data-learnjump");state.learnTab="overview";state.learnListY=0;state.scrollTo=0;

    state.exHist=false;state.exInfo=null;state.sheet=false;state.view="learn";ctx.render();return true;
  }

  if(t.closest&&(t.closest("#homecal")||t.closest("#calbtn"))){
    // Always this month, whichever day was last open.
    const d=new Date();
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
  if(t.closest&&t.closest("#backbtn")){
    state.view=state.view==="calendar"?"history":"home";
    state.sheet=false;state.adding=false;ctx.render();return true;
  }

  if(t.id==="daysbtn"){state.view="history";state.sheet=false;state.adding=false;ctx.render();return true;}
  if(t.id==="settingsbtn"){state.view="settings";state.sheet=false;state.adding=false;ctx.render();return true;}
  return false;
}
