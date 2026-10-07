// The next target for an exercise, from its history and the lifter's own rules: the rep range
// and jump set on the exercise (or in Settings), what to do after a missed set, when to deload
// and how to come back after time away. Shared by the phone, the laptop and the auto-fill.
import {state,repRange,newestFirst,getSession} from "./store.js";
import {progressionHint} from "./coach.js";
import {deloadTarget} from "./planner.js";
import {exerciseGroup,isBandExercise,unitOf} from "./model.js";

const key=n=>String(n||"").trim().toLowerCase();
const LOWER=["Squat & lunge","Hinge & glutes","Lower leg"];

// The exercise's own settings, if it has any: {range:"6-10", step:5, off:true, hand:true,
// unit:"lb", bar:15}.
export const exProg=name=>(state.exProg||{})[key(name)]||{};

// The unit this exercise is logged in, whether its weight is per hand, and its bar.
export const unitFor=name=>exProg(name).unit||(state.settings.unit==="lb"?"lb":"kg");
export const perHand=name=>!!exProg(name).hand;
export function barFor(name){
  const u=unitFor(name),own=+exProg(name).bar;if(own>0)return own;
  const g=(state.gyms||[]).find(x=>x.id===((getSession()||{}).gym||state.gymId));
  if(g&&+g[u==="lb"?"barLb":"barKg"]>0)return +g[u==="lb"?"barLb":"barKg"];
  return u==="lb"?(+state.settings.barLb||45):(+state.settings.barKg||20);
}
// The rep range for this exercise: its own, else the one in Settings.
export function rangeFor(name){
  const own=exProg(name).range;
  if(own){const p=String(own).split("-").map(Number);if(p[0]&&p[1])return {low:p[0],top:p[1]};}
  return repRange();
}
// The jump to add: the exercise's own, else Settings — small, bigger, or bigger for legs.
export function stepFor(name){
  const own=+exProg(name).step;if(own>0)return own;
  const lb=unitFor(name)==="lb",small=lb?5:2.5,big=lb?10:5,m=state.settings.stepMode||"small";
  if(m==="big")return big;
  if(m==="split")return LOWER.indexOf(exerciseGroup(name))>=0?big:small;
  return small;
}
// Past performances of an exercise before the open session, newest first. At a gym, its own
// history comes first, since machines and bars differ from gym to gym.
export function historyOf(name,limit){
  const k=key(name),cur=getSession(),gym=(cur&&cur.gym)||"",all=[];
  for(const s of newestFirst(state.sessions)){
    if(cur&&(s.id===cur.id||(s.created||"")>(cur.created||"")))continue;
    const e=s.ex.find(x=>key(x.name)===k&&x.sets.length);
    if(e)all.push({at:s.created,sets:e.sets,unit:unitOf(e),gym:s.gym||""});
  }
  const here=gym?all.filter(h=>h.gym===gym):[];
  return (here.length?here:all).slice(0,limit||8);
}
// What to aim for today, or null: no history, or progression switched off for this exercise.
export function targetFor(e,now){
  if(!e||exProg(e.name).off)return null;
  const h=historyOf(e.name,8);
  if(!h.length)return null;
  const st=state.settings,r=rangeFor(e.name);
  // A planned deload week: lighter and fewer sets, whatever the usual rules say.
  const cur=getSession();
  if(cur&&cur.deload&&unitOf(e)==="reps"&&!isBandExercise(e.name))return deloadTarget(h[0].sets,unitFor(e.name));
  return progressionHint(h[0].sets,{unit:unitOf(e),weightUnit:unitFor(e.name),low:r.low,top:r.top,isBand:isBandExercise(e.name),
    step:stepFor(e.name),miss:st.missRule||"hold",stallAfter:+st.stallAfter||0,deloadPct:+st.deloadPct||10,
    breakRule:st.breakRule||"off",history:h.slice(1),prevAt:h[0].at,now:now||Date.now()});
}
