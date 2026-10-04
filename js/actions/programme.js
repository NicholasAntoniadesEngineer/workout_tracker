// Programmes: set one up from Learn, start its next workout, pause, stop, and open its page.
import {addExerciseToDay,getSession,selectSession,state} from "../store.js";
import {dateKey,makeSession,nowISO} from "../model.js";
import {topicById} from "../lazy.js";
import {defaultWeekdays,makeProgramme,position,prescription,ruleFor,trainingMax} from "../programme.js";

function nextMonday(){
  const d=new Date();d.setHours(12,0,0,0);
  do{d.setDate(d.getDate()+1);}while(d.getDay()!==1);
  return dateKey(d.toISOString());
}

export function handle(t,ctx){
  const setup=t.closest&&t.closest("[data-progsetup]");
  if(setup){
    const tp=topicById(setup.getAttribute("data-progsetup"));
    if(!tp)return true;
    const rule=ruleFor(tp),unit=state.settings.unit||"kg",maxes={};
    if(rule==="531")tp.days.forEach(d=>{maxes[d.ex[0]]=trainingMax(state.sessions,d.ex[0],unit)||"";});
    state.progSetup={topic:tp.id,rule,weekdays:defaultWeekdays(tp.days.length),start:"today",maxes};
    state.view="prog";state.scrollTo=0;ctx.render();return true;
  }
  const pday=t.closest&&t.closest("[data-progday]");
  if(pday&&state.progSetup){
    const d=+pday.getAttribute("data-progday"),w=state.progSetup.weekdays.slice(),i=w.indexOf(d);
    if(i>=0)w.splice(i,1);else w.push(d);
    state.progSetup.weekdays=w;readMaxes();ctx.render();return true;
  }
  const popt=t.closest&&t.closest("[data-progstartopt]");
  if(popt&&state.progSetup){state.progSetup.start=popt.getAttribute("data-progstartopt");readMaxes();ctx.render();return true;}
  if(t.closest&&t.closest("[data-progbegin]")&&state.progSetup){
    readMaxes();
    const s=state.progSetup,tp=topicById(s.topic),maxes={};
    Object.keys(s.maxes).forEach(k=>{if(+s.maxes[k]>0)maxes[k]=+s.maxes[k];});
    state.programme=makeProgramme(tp,{weekdays:s.weekdays,rule:s.rule,maxes,unit:state.settings.unit||"kg",
      start:s.start==="monday"?nextMonday():dateKey(nowISO())});
    state.progSetup=null;state.view="prog";state.scrollTo=0;ctx.render();return true;
  }
  if(t.closest&&t.closest("[data-progrun]")&&state.programme){
    const p=state.programme,pos=position(p,state.sessions),day=p.days[pos.day];
    const today=dateKey(nowISO());
    let ns=state.sessions.find(s=>dateKey(s.created)===today&&!s.ex.length&&!s.running);
    if(!ns){ns=makeSession();state.sessions.push(ns);}
    ns.title=day.name;ns.prog={pid:p.id,day:pos.day,round:pos.round};
    selectSession(ns.id);
    day.ex.forEach(addExerciseToDay);
    state.exId=getSession().ex[0]?getSession().ex[0].id:null;
    ctx.recallLast(state.exId&&getSession().ex[0]);
    // 5/3/1: the main lift starts at its first prescribed set.
    const rx=prescription(p,pos);
    if(rx&&rx.sets){state.weight=rx.sets[0].w;state.reps=parseInt(rx.sets[0].r,10)||state.reps;}
    state.origin="home";state.sheet=false;state.view="log";ctx.markRefit();ctx.render();return true;
  }
  if(t.closest&&t.closest("[data-progopen]")){state.progSetup=null;state.view="prog";state.scrollTo=0;ctx.render();return true;}
  if(t.closest&&t.closest("[data-progpause]")&&state.programme){state.programme.paused=!state.programme.paused;ctx.render();return true;}
  if(t.closest&&t.closest("[data-progstop]")&&state.programme){
    if(confirm("Stop following "+state.programme.name+"? Your logged workouts stay in History.")){state.programme=null;state.view="home";}
    ctx.render();return true;
  }
  if(t.closest&&t.closest("#progback")){
    const back=state.progSetup?"learn":"home";state.progSetup=null;state.view=back;ctx.render();return true;
  }
  return false;
}
// Typed training maxes survive a repaint: read them before any re-render on the setup page.
function readMaxes(){
  if(!state.progSetup)return;
  document.querySelectorAll("[data-progmax]").forEach(i=>{state.progSetup.maxes[i.getAttribute("data-progmax")]=i.value;});
}
