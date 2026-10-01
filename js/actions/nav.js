// Moving around: home, back, the screens off the home hub, undo, and the verse arrows.
// Each handler returns true once it has dealt with the tap.
import {getSession,state} from "../store.js";
import {stepVerse} from "../views.js";

export function handle(t,ctx){
  if(t.id==="updatebtn"){location.reload();return true;}
  if(t.id==="undobtn"){ctx.restoreUndo();ctx.render();return true;}

  // Home is the hub the app opens to.
  if(t.id==="homebtn"){state.view="home";state.sheet=false;state.adding=false;ctx.render();return true;}

  if(t.id==="verprev"){stepVerse(-1);ctx.render();return true;}
  if(t.id==="vernext"){stepVerse(1);ctx.render();return true;}

  // Home tiles hold an icon span, so a tap can land inside the button — match by ancestor.
  if(t.closest&&t.closest("#homedays")){state.view="history";ctx.render();return true;}
  if(t.closest&&t.closest("#homeprog")){state.view="progress";ctx.render();return true;}
  if(t.closest&&t.closest("#homebody")){state.view="body";ctx.render();return true;}
  if(t.closest&&t.closest("#homelearn")){state.view="learn";state.learnOpen=null;state.learnCat=null;state.learnQuery="";state.scrollTo=0;ctx.render();return true;}
  // From an exercise's sheet straight to the Learn topic behind it, opened.
  const jump=t.closest&&t.closest("[data-learnjump]");
  if(jump){
    state.learnOpen=jump.getAttribute("data-learnjump");state.learnListY=0;state.scrollTo=0;

    state.exHist=false;state.sheet=false;state.view="learn";ctx.render();return true;
  }

  if(t.closest&&(t.closest("#homecal")||t.closest("#calbtn"))){
    const c=getSession();
    const d=c?new Date(c.created):new Date();
    state.calYear=d.getFullYear();state.calMonth=d.getMonth();state.calDay=null;
    state.view="calendar";ctx.render();return true;
  }

  // Back walks toward the home hub: calendar to the days list, everything else home.
  // In Learn, Back steps up a level: topic → its list (where you left it) → Learn home.
  if(t.closest&&t.closest("#backbtn")&&state.view==="learn"&&state.learnOpen){
    state.learnOpen=null;state.scrollTo=state.learnListY||0;ctx.render();return true;
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
