// Days: open, repeat or delete one from History, start or resume today from home, and the
// calendar — move between months, open a day, or create one on an empty date.
// Each handler returns true once it has dealt with the tap.
import {activeEx,getSession,selectSession,state} from "../store.js";
import {dateKey,makeExercise,makeSession,makeSessionOn,nowISO} from "../model.js";
import {wide} from "../views/common.js";

export function handle(t,ctx){
  const delDay=t.closest&&t.closest("[data-delday]");
  if(delDay){
    ctx.snapshot("Day deleted");
    ctx.deleteDay(delDay.getAttribute("data-delday"));
    ctx.render();return true;
  }
  // Repeat a day: a fresh session today with the same exercises, ready to log against.
  const copyDay=t.closest&&t.closest("[data-copyday]");
  if(copyDay){
    const src=state.sessions.find(s=>s.id===copyDay.getAttribute("data-copyday"));
    if(src){
      const ns=makeSession();
      ns.ex=src.ex.map(e=>Object.assign(makeExercise(e.name),{timed:!!e.timed,dist:!!e.dist}));
      state.sessions.push(ns);
      selectSession(ns.id);
      ctx.recallLast(activeEx());
      state.origin=state.view;state.sheet=false;
      state.view="log";ctx.markRefit();
    }
    ctx.render();return true;
  }

  const loadDay=t.closest&&t.closest("[data-load]");
  if(loadDay){
    state.origin=state.view;                 // return here if the picker is dismissed empty
    selectSession(loadDay.getAttribute("data-load"));
    ctx.recallLast(activeEx());
    state.calDay=null;
    state.sheet=!getSession().ex.length;
    state.view="log";ctx.markRefit();ctx.render();return true;
  }


  const homeResume=t.closest&&t.closest("[data-resume]");
  if(homeResume){
    selectSession(homeResume.getAttribute("data-resume"));
    ctx.recallLast(activeEx());
    state.origin="home";state.sheet=!getSession().ex.length;
    state.view="log";ctx.markRefit();ctx.render();return true;
  }
  if(t.id==="homestart"){
    const todayK=dateKey(nowISO());
    const done=state.sessions.filter(s=>dateKey(s.created)===todayK&&s.ex.some(e=>e.sets.length)).length;
    const ns=makeSession();
    if(done)ns.title=ns.title+" · "+(done+1);
    state.sessions.push(ns);selectSession(ns.id);
    state.origin="home";state.sheet=true;
    state.view="log";ctx.markRefit();ctx.render();return true;
  }

  if(t.id==="calprev"||t.id==="calnext"){
    state.calMonth+=(t.id==="calnext"?1:-1);
    if(state.calMonth<0){state.calMonth=11;state.calYear--;}
    else if(state.calMonth>11){state.calMonth=0;state.calYear++;}
    state.calDay=null;ctx.render();return true;
  }
  if(t.id==="caldone"||t.id==="calback"){state.calDay=null;ctx.render();return true;}
  const hsel=t.closest&&t.closest("[data-histsel]");
  if(hsel){state.histSel=hsel.getAttribute("data-histsel");ctx.render();return true;}
  const hf=t.closest&&t.closest("[data-histfilter]");
  if(hf){state.histFilter=hf.getAttribute("data-histfilter");state.histSel=null;ctx.render();return true;}
  const calDay=t.closest&&t.closest("[data-calday]");
  if(calDay){
    const key=calDay.getAttribute("data-calday");
    const onDay=state.sessions.filter(s=>dateKey(s.created)===key);
    // One workout opens straight away; several open a picker for that day. A big screen
    // shows the day beside the month instead.
    if(onDay.length===1&&!wide()){
      state.origin="calendar";
      selectSession(onDay[0].id);
      ctx.recallLast(activeEx());
      state.calDay=null;state.sheet=!getSession().ex.length;
      state.view="log";ctx.markRefit();ctx.render();return true;
    }
    state.calDay=key;ctx.render();return true;
  }
  // Tapping an empty day starts a workout dated to it — backfill a past day or plan a future one.
  const newDay=t.closest&&t.closest("[data-newday]");
  if(newDay){
    const parts=newDay.getAttribute("data-newday").split("-").map(Number);
    const ns=makeSessionOn(parts[0],parts[1]-1,parts[2]);
    state.sessions.push(ns);
    selectSession(ns.id);
    state.origin="calendar";state.calDay=null;state.sheet=true;
    state.view="log";ctx.markRefit();ctx.render();return true;
  }

  if(t.id==="newday"){
    const ns=makeSession();
    state.sessions.push(ns);
    selectSession(ns.id);
    state.origin=state.view;state.sheet=true;
    state.view="log";ctx.markRefit();ctx.render();return true;
  }
  return false;
}
