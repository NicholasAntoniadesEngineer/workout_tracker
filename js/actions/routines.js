// Routines: save a day as one, start today from one, add one into the open day, drop one,
// and the picker's Exercises / Routines switch.
// Each handler returns true once it has dealt with the tap.
import {activeEx,addExerciseToDay,dropRoutine,findRoutine,getSession,saveRoutine,selectSession,
  state} from "../store.js";
import {dateKey,makeSession,nowISO} from "../model.js";
import {topicById} from "../lazy.js";

// A documented workout from Learn, by "topicId:index".
function learnDay(ref){
  const i=ref.lastIndexOf(":"),tp=topicById(ref.slice(0,i));
  return tp&&tp.days?tp.days[+ref.slice(i+1)]||null:null;
}

export function handle(t,ctx){
  // From a lifter's page: start their workout today, or keep it as a routine.
  const lday=t.closest&&t.closest("[data-learnday]");
  if(lday){
    const d=learnDay(lday.getAttribute("data-learnday"));
    if(d){
      const today=dateKey(nowISO());
      let ns=state.sessions.find(s=>dateKey(s.created)===today&&!s.ex.length&&!s.running);
      if(!ns){ns=makeSession();state.sessions.push(ns);}
      ns.title=d.name;selectSession(ns.id);
      d.ex.forEach(addExerciseToDay);
      state.exId=getSession().ex[0]?getSession().ex[0].id:null;
      ctx.recallLast(activeEx());
      state.origin="learn";state.sheet=false;state.view="log";ctx.markRefit();
    }
    ctx.render();return true;
  }
  const lsave=t.closest&&t.closest("[data-learnsave]");
  if(lsave){
    const d=learnDay(lsave.getAttribute("data-learnsave"));
    if(d){ctx.snapshot("Saved routine "+d.name);saveRoutine(d.name,d.ex);}
    ctx.render();return true;
  }
  // Keep any day's exercises — today's or a past one's — as a named routine.
  const saveDay=t.closest&&t.closest("[data-saveroutine]");
  if(saveDay){
    const src=state.sessions.find(s=>s.id===saveDay.getAttribute("data-saveroutine"));
    const name=src&&src.ex.length?prompt("Name this routine",src.title):null;
    if(name!==null&&name.trim()){
      ctx.snapshot("Saved routine "+name.trim());
      saveRoutine(name,src.ex.map(e=>e.name));
      state.pickTab="routines";
    }
    ctx.render();return true;
  }
  const pickTab=t.closest&&t.closest("[data-picktab]");
  if(pickTab){state.pickTab=pickTab.getAttribute("data-picktab");state.adding=false;ctx.render();return true;}

  // Routines: start today from one (home), apply into the open day, save today's list, drop one.
  const startRoutine=t.closest&&t.closest("[data-routine]");
  if(startRoutine){
    const r=findRoutine(startRoutine.getAttribute("data-routine"));
    if(r){
      // Today's blank day takes the routine, rather than leaving it behind as a second day.
      const today=dateKey(nowISO());
      let ns=state.sessions.find(s=>dateKey(s.created)===today&&!s.ex.length&&!s.running);
      if(!ns){ns=makeSession();state.sessions.push(ns);}
      ns.title=r.name;selectSession(ns.id);
      r.ex.forEach(addExerciseToDay);
      state.exId=getSession().ex[0]?getSession().ex[0].id:null;
      ctx.recallLast(activeEx());
      state.origin="home";state.sheet=false;
      state.view="log";ctx.markRefit();
    }
    ctx.render();return true;
  }
  const applyRoutine=t.closest&&t.closest("[data-applyroutine]");
  if(applyRoutine){
    const r=findRoutine(applyRoutine.getAttribute("data-applyroutine"));
    if(r){r.ex.forEach(addExerciseToDay);ctx.recallLast(activeEx());}
    ctx.render();return true;
  }
  const delRoutine=t.closest&&t.closest("[data-delroutine]");
  if(delRoutine){
    const r=findRoutine(delRoutine.getAttribute("data-delroutine"));
    if(r){
      ctx.snapshot("Dropped routine "+r.name);
      dropRoutine(r);
    }
    ctx.render();return true;
  }
  return false;
}
