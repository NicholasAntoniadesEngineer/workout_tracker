// The check-in: open with yesterday's answers as a start, tap the ratings, save once a day.
import {state,todayCheckin,upsertCheckin} from "../store.js";
import {nowISO} from "../model.js";
import {sleepHours} from "../ready.js";

export function handle(t,ctx){
  if(t.closest&&t.closest("#cistart")){
    const last=todayCheckin()||state.checkins[state.checkins.length-1]||{};
    state.checkinDraft={sleep:last.sleep||0,soreness:last.soreness||0,fatigue:last.fatigue||0,stress:last.stress||0,bed:last.bed||"23:00",wake:last.wake||"07:00"};
    if(todayCheckin())Object.assign(state.checkinDraft,todayCheckin());
    ctx.render();return true;
  }
  const d=state.checkinDraft;
  if(!d)return false;
  if(t.id==="ciback"||t.id==="ciclose"){state.checkinDraft=null;ctx.render();return true;}
  const opt=t.closest&&t.closest("[data-ci]");
  if(opt){const [k,v]=opt.getAttribute("data-ci").split(":");d[k]=+v;ctx.render();return true;}
  if(t.id==="cisave"){
    const bed=(document.getElementById("cibed")||{}).value||d.bed,wake=(document.getElementById("ciwake")||{}).value||d.wake;
    const at=todayCheckin()?todayCheckin().at:nowISO();
    upsertCheckin({at,sleep:d.sleep,soreness:d.soreness,fatigue:d.fatigue,stress:d.stress,bed,wake,hours:sleepHours(bed,wake)});
    state.checkinDraft=null;ctx.render();return true;
  }
  return false;
}
