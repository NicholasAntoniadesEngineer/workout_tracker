// Planning: put a routine on a day, move, copy or remove a planned day, plan a block, start
// from a programme, and turn pasted text into routines.
import {state,allRoutines,findRoutine,saveRoutine,selectSession,getSession,addExerciseToDay,activeEx} from "../store.js";
import {dateKey,makeSessionOn,nowISO} from "../model.js";
import {PROGRAMMES,blockDates,parseProgramme,programmeRoutines} from "../planner.js";
import {notice} from "../dialog.js";

const parts=k=>k.split("-").map(Number);
// A dated session from a routine: its exercises, the routine's id (for its targets), deload.
function placeRoutine(k,r,deload){
  const [y,m,d]=parts(k),s=makeSessionOn(y,m-1,d);
  s.title=r.name;s.routine=r.id;if(deload)s.deload=true;
  state.sessions.push(s);
  const was=state.sessionId;state.sessionId=s.id;
  r.ex.forEach(addExerciseToDay);
  state.sessionId=was;
  return s;
}
function copyTo(s,k,keep){
  const [y,m,d]=parts(k),n=makeSessionOn(y,m-1,d);
  n.title=s.title;if(s.routine)n.routine=s.routine;if(s.deload)n.deload=true;
  n.ex=s.ex.map(e=>Object.assign({},e,{id:"e"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),sets:[]}));
  state.sessions.push(n);
  if(!keep)state.sessions=state.sessions.filter(x=>x.id!==s.id);
  return n;
}

export function handle(t,ctx){
  // ── An empty calendar day
  if(t.id==="planclose"||t.id==="planback"){state.planDay=null;ctx.render();return true;}
  const pick=t.closest&&t.closest("[data-planpick]");
  if(pick){const [y,m,d]=parts(pick.getAttribute("data-planpick")),ns=makeSessionOn(y,m-1,d);
    state.sessions.push(ns);selectSession(ns.id);state.planDay=null;state.origin="calendar";state.calDay=null;state.sheet=true;state.view="log";ctx.markRefit();ctx.render();return true;}
  const pr=t.closest&&t.closest("[data-planroutine]");
  if(pr&&state.planDay){const r=findRoutine(pr.getAttribute("data-planroutine"));
    if(r){const s=placeRoutine(state.planDay,r,false);state.calDay=wide()?dateKey(s.created):null;}
    state.planDay=null;ctx.render();return true;}
  const pb=t.closest&&t.closest("[data-planblock]");
  if(pb){state.block=Object.assign(state.block||{weeks:4,deloadEvery:4,pattern:{}},{start:pb.getAttribute("data-planblock")});state.planDay=null;state.view="planner";state.scrollTo=0;ctx.render();return true;}
  // ── A planned day
  if(t.id==="plannedclose"||t.id==="plannedback"){state.planned=null;ctx.render();return true;}
  const po=t.closest&&t.closest("[data-planopen]");
  if(po){state.planned={id:po.getAttribute("data-planopen"),mode:po.getAttribute("data-mode")};ctx.render();return true;}
  const pm=t.closest&&t.closest("[data-planmode]");
  if(pm&&state.planned){state.planned.mode=pm.getAttribute("data-planmode");ctx.render();return true;}
  const pd=t.closest&&t.closest("[data-plando]");
  if(pd&&state.planned){
    const s=state.sessions.find(x=>x.id===state.planned.id),k=(document.getElementById("plandate")||{}).value;
    if(s&&k){ctx.snapshot(pd.getAttribute("data-plando")==="move"?"Moved "+s.title:"Copied "+s.title);
      const n=copyTo(s,k,pd.getAttribute("data-plando")==="copy");
      const [y,m]=parts(k);state.calYear=y;state.calMonth=m-1;state.calDay=wide()?k:null;}
    state.planned=null;ctx.render();return true;
  }
  // ── The Plan page
  const wd=t.closest&&t.closest("[data-planweeks]");
  if(wd){state.block.weeks=+wd.getAttribute("data-planweeks");ctx.render();return true;}
  const dl=t.closest&&t.closest("[data-plandeload]");
  if(dl){state.block.deloadEvery=+dl.getAttribute("data-plandeload");ctx.render();return true;}
  const pg=t.closest&&t.closest("[data-planprog]");
  if(pg){
    const p=PROGRAMMES.find(x=>x.id===pg.getAttribute("data-planprog"));
    if(p){
      ctx.snapshot("Added "+p.name);
      const saved=programmeRoutines(p).map(r=>saveRoutine(r.name,r.ex,r.plan)).filter(Boolean);
      // Its days across its usual weekdays, in order; a four-day rotation on three days fills the
      // first three and the fourth comes round in the next block.
      const pat={};p.pattern.forEach((d,i)=>{pat[d]=saved[i%saved.length].id;});
      state.block.pattern=pat;
      notice(p.name+" added","Its "+saved.length+" days are now routines. Check the weekly pattern below, then add the block to the calendar.");
    }
    ctx.render();return true;
  }
  if(t.id==="planpaste"){state.paste={text:""};state.focusId="pastetext";ctx.render();return true;}
  if(t.id==="pasteclose"){state.paste=null;ctx.render();return true;}
  if(t.id==="pasteread"){const el=document.getElementById("pastetext");state.paste={text:el?el.value:"",result:parseProgramme(el?el.value:"",state.catalog,state.settings.unit==="lb"?"lb":"kg")};ctx.render();return true;}
  if(t.id==="pastesave"&&state.paste&&state.paste.result){
    ctx.snapshot("Saved pasted routines");
    const saved=state.paste.result.days.map(d=>saveRoutine(d.name,d.ex,d.plan)).filter(Boolean);
    const days=[1,3,5,2,4,6,0],pat={};saved.slice(0,7).forEach((r,i)=>{pat[days[i]]=r.id;});
    state.block.pattern=pat;state.paste=null;
    notice("Saved "+saved.length+" routine"+(saved.length===1?"":"s"),"They're in your routines and set on the week below. Change any day, then add the block.");
    ctx.render();return true;
  }
  if(t.id==="planmake"){
    const b=state.block,taken=new Set(state.sessions.filter(s=>s.ex.length||s.cardio).map(s=>dateKey(s.created)));
    const add=blockDates(b).filter(d=>!taken.has(d.date));
    if(add.length){
      ctx.snapshot("Planned "+add.length+" workouts");
      add.forEach(d=>{const r=findRoutine(d.routine);if(r)placeRoutine(d.date,r,d.deload);});
      const [y,m]=parts(add[0].date);state.calYear=y;state.calMonth=m-1;state.calDay=null;state.view="calendar";state.scrollTo=0;
    }
    ctx.render();return true;
  }
  return false;
}
const wide=()=>typeof matchMedia==="function"&&matchMedia("(min-width:900px)").matches;
