// What a dialog's OK does, by the act its opener named. Cancel, the backdrop and Esc close it.
import {getSession,planOf,saveRoutine,state} from "../store.js";
import {dateKey,endWorkout,nowISO,resetRestTimer,resetWorkout,setWorkoutMinutes,setWorkoutSpanOn} from "../model.js";
import {openCardio,checkGps} from "./cardio.js";
import {keepAlive,stopWarm} from "../sensors.js";

export function handle(t,ctx){
  const d=state.dialog;
  if(!d)return false;
  if(t.id==="dlgback"||t.id==="dlgcancel"){state.dialog=null;ctx.render();return true;}
  if(!(t.closest&&t.closest("#dlgok")))return true;   // a tap elsewhere while a dialog is up does nothing
  const el=document.getElementById("dlgin"),val=el?el.value:"";
  state.dialog=null;
  const s=getSession();
  switch(d.act){
    case "nameday":if(val.trim())s.title=val.trim();break;
    case "nameroutine":{const src=state.sessions.find(x=>x.id===d.ref);
      if(src&&val.trim()){ctx.snapshot("Saved routine "+val.trim());saveRoutine(val,src.ex.map(e=>e.name),planOf(src));state.pickTab="routines";}break;}
    case "endworkout":endWorkout(s);keepAlive(false);if(s.ex.some(e=>e.sets.length))state.summary=s.id;state.setStart=null;break;
    case "resetrest":resetRestTimer(s);state.setStart=null;break;
    case "resetwork":resetWorkout(s);state.setStart=null;break;
    case "workmins":if(val.trim()!==""){const mins=parseFloat(val);if(s.running||dateKey(s.created)===dateKey(nowISO()))setWorkoutMinutes(s,mins);else setWorkoutSpanOn(s,mins);}break;
    case "progstop":state.programme=null;state.view="home";break;
    case "addgym":if(val.trim()){const g={id:"g"+Date.now().toString(36),name:val.trim().slice(0,40)};state.gyms=(state.gyms||[]).concat([g]);state.gymId=g.id;}break;
    case "cardiodiscard":state.cardioDone=null;openCardio();checkGps(ctx.render);break;
    case "cardioleave":stopWarm();state.gpsLive=null;state.cardioDone=null;state.cardioSetup=null;state.view="home";break;
  }
  ctx.render();return true;
}
