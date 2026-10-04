import {autoEndIfStale,fmtClock,isBandExercise,makeSession,parseClock,restSeconds,
  setAnchor} from "./model.js";
import {activeEx,addExerciseToDay,getSession,importBackup,lastPerformance,load,mergeSessions,
  restTargetFor,save,saveRoutine,selectSession,state} from "./store.js";
import {parseImport} from "./csv.js";
import {AREAS as LEARN_AREAS} from "./library.js";
import {decodeRoutineHash} from "./share.js";
import {learnHomeBody,paint,setClockSeconds,setSub,workoutLabel,workoutSub} from "./views.js";
import * as nav from "./actions/nav.js";
import * as routines from "./actions/routines.js";
import * as days from "./actions/days.js";
import * as sharing from "./actions/share.js";
import * as data from "./actions/data.js";
import * as programmes from "./actions/programme.js";
import * as cardio from "./actions/cardio.js";
import * as logging from "./actions/log.js";
import * as stacking from "./actions/stack.js";

const TICK_MS=1000;
// Auto never shrinks type below this — past it the table scrolls instead, so a long day
// stays readable rather than shrinking to fit.
const FIT_MIN=0.84;
const FIT_STEP=0.04;
const LONG_PRESS_MS=450;
const MOVE_SLOP=8;

// Width is the table's problem — extra sets scroll sideways. Only height has to be made to fit.
function overflows(el){
  return !!el&&el.scrollHeight>el.clientHeight+1;
}

// A chosen text size is honoured exactly — if the day no longer fits, the table scrolls
// rather than the type being quietly overruled. Auto (0) is the fit-to-window default,
// which shrinks the scale until the whole day is on screen.
let autoScale=1;
let refit=true;

// Re-measure from full size on the next paint: the window changed, or the day did.
function markRefit(){refit=true;}

function fit(){
  const root=document.documentElement;
  const set=v=>root.style.setProperty("--k",String(v));
  const chosen=state.settings.textScale||0;
  if(chosen){set(chosen);return;}
  // Auto settles on a scale and keeps it. Adding an exercise or opening the editor
  // must not resize the type under you, so those paints reuse what was settled on.
  if(state.view!=="log"||state.sheet||state.adding||state.dragId){set(autoScale);return;}
  let k=refit?1:autoScale;
  refit=false;
  set(k);
  const wrap=document.querySelector(".wrap"),tbl=document.querySelector(".tblwrap");
  while(k>FIT_MIN&&(overflows(wrap)||overflows(tbl))){
    k=Math.round((k-FIT_STEP)*100)/100;
    set(k);
  }
  autoScale=k;
}

// Repainting throws the DOM away, which would jump the table back to set 1 and the first
// exercise every time anything is tapped. Carry its scroll across both ways, after fit() has
// settled the sizes.
// The page's own vertical scroll is kept too while the screen stays the same, so opening
// something part-way down a long page doesn't jump back to the top.
function grabScroll(){
  const keep={};
  document.querySelectorAll("[data-keepx]").forEach(el=>{keep[el.dataset.keepx]={x:el.scrollLeft,y:el.scrollTop};});
  const wrap=document.querySelector(".wrap.scroll");
  if(wrap)keep.__top={view:state.view,y:wrap.scrollTop};
  return keep;
}

function putScroll(keep){
  document.querySelectorAll("[data-keepx]").forEach(el=>{
    const at=keep[el.dataset.keepx];
    if(!at)return;
    if(at.x)el.scrollLeft=at.x;
    if(at.y)el.scrollTop=at.y;
  });
  const wrap=document.querySelector(".wrap.scroll");
  if(wrap&&keep.__top&&keep.__top.view===state.view)wrap.scrollTop=keep.__top.y;
  // A page asked to land somewhere specific — a topic opens at its top, Back returns the
  // list to where you were.
  if(wrap&&state.scrollTo!=null){wrap.scrollTop=state.scrollTo;state.scrollTo=null;}
  // Keep the chosen Learn filter in view in its strip, however it was reached.
  const tab=document.querySelector(".ltab.on"),strip=tab&&tab.parentElement;
  if(tab&&strip)strip.scrollLeft=tab.offsetLeft-(strip.clientWidth-tab.offsetWidth)/2;
}

function render(){
  const keep=grabScroll();
  paint();
  // Icon-only buttons carry a title; screen readers get it as their name too.
  document.querySelectorAll("button[title]:not([aria-label])").forEach(b=>{
    if(!b.textContent.trim())b.setAttribute("aria-label",b.title);
  });
  fit();
  putScroll(keep);
  if(state.adding){
    const el=document.getElementById("newname");
    if(el){
      // Focus only on the repaint that opened the box. Focusing on every repaint
      // reopens the keyboard each time anything else is tapped.
      if(state.focusAdd){el.focus();state.focusAdd=false;}
      el.addEventListener("keydown",ev=>{
        if(ev.key==="Enter")addExercise();
        else if(ev.key==="Escape"){state.adding=false;render();}
      });
    }
  }
  // Filtering the list rebuilds the sheet each keystroke — keep the caret in the search box.
  if(state.focusSearch){
    const el=document.getElementById(state.focusSearch==="learnsearch"?"learnsearch":"exsearch");
    if(el){el.focus();const v=el.value;try{el.setSelectionRange(v.length,v.length);}catch(e){}}
    state.focusSearch=false;
  }
  save();
}

function addExercise(){
  const el=document.getElementById("newname");
  const name=el?el.value.trim():"";
  if(name){addExerciseToDay(name);state.sheet=true;}
  state.adding=false;
  render();
}

// One Load button takes either format: a JSON backup restores everything, a CSV merges days.
function importText(text){
  const trimmed=text.replace(/^\ufeff/,"").trim();
  if(trimmed[0]==="{"){
    let n;
    try{n=importBackup(JSON.parse(trimmed));}
    catch(err){alert("That backup couldn't be read.");return;}
    state.view="history";
    render();
    alert("Backup loaded"+(n?" — "+n+" day"+(n>1?"s":"")+" merged":"")+".");
    return;
  }
  let imported;
  try{imported=parseImport(text);}
  catch(err){alert(err.message);return;}
  mergeSessions(imported);
  state.view="history";
  render();
  alert("Loaded "+imported.length+" day"+(imported.length>1?"s":"")+".");
}

// Each exercise remembers how it was last done, so coming back to it picks up where you
// left off: today's last set if there is one, otherwise the last working set from the
// previous day it was trained. Only ever the same exercise — logging 12kg onto push ups
// because curls were selected before would be silently wrong — and with no history at
// all the weight starts at zero.
function recallLast(e){
  let last=e&&e.sets.length?e.sets[e.sets.length-1]:null;
  if(!last&&e){
    const prev=lastPerformance(e.name);
    const sets=prev?prev.ex.sets.filter(x=>!x.wu):[];
    last=sets.length?sets[sets.length-1]:null;
  }
  // Bands carry a resistance range instead of a weight; the picker only appears for them.
  state.band=e&&isBandExercise(e.name)?(last?last.band||"":"") : "";
  if(last){
    state.reps=last.r;
    state.perSide=last.side;
    state.weight=+last.w||0;
  }else{
    state.perSide=false;
    state.weight=0;
  }
}

// Destructive actions snapshot everything they might touch first, act at once, and leave
// a short-lived Undo toast — kinder than a confirm before and no way back after.
const UNDO_MS=6000;
let undoTimer=null;
function snapshot(label){
  state.undo={label,data:JSON.parse(JSON.stringify({sessions:state.sessions,
    sessionId:state.sessionId,exId:state.exId,catalog:state.catalog,removed:state.removed,
    body:state.body,routines:state.routines,hiddenRoutines:state.hiddenRoutines,
    supplements:state.supplements,stacks:state.stacks}))};
  if(undoTimer)clearTimeout(undoTimer);
  undoTimer=setTimeout(()=>{state.undo=null;render();},UNDO_MS);
}

function restoreUndo(){
  const d=state.undo&&state.undo.data;
  if(!d)return;
  Object.assign(state,d);
  state.undo=null;
  if(undoTimer){clearTimeout(undoTimer);undoTimer=null;}
  if(!getSession())state.sessionId=state.sessions[0].id;
}

// A new best shows for a few seconds over the panel, then gets out of the way.
const BEST_MS=4500;
let bestTimer=null;
function showBest(name,label){
  state.best={name,label};
  if(navigator.vibrate)navigator.vibrate([30,60,30]);
  if(bestTimer)clearTimeout(bestTimer);
  bestTimer=setTimeout(()=>{state.best=null;render();},BEST_MS);
}

// Dropping an exercise that has already been logged destroys those sets — undoable.
function removeExercise(id){
  const s=getSession();
  const e=s.ex.find(x=>x.id===id);
  if(!e)return;
  if(e.sets.length)snapshot("Dropped "+e.name);
  s.ex=s.ex.filter(x=>x.id!==id);
  if(state.exId===id)state.exId=s.ex[0]?s.ex[0].id:null;
}

// Hold an exercise, then drag it up or down the table to reorder the day. The hold is
// what separates it from a tap, which selects the exercise for logging.
let drag=null;
let swallowClick=false;

function exerciseUnder(x,y){
  const el=document.elementFromPoint(x,y);
  const btn=el&&el.closest&&el.closest("[data-ex]");
  return btn?btn.getAttribute("data-ex"):null;
}

function watchDrag(){
  let timer=null,downY=0;
  const stopTimer=()=>{if(timer){clearTimeout(timer);timer=null;}};

  document.body.addEventListener("pointerdown",ev=>{
    const btn=ev.target.closest&&ev.target.closest(".exbtn");
    if(!btn||state.sheet)return;
    downY=ev.clientY;
    const id=btn.getAttribute("data-ex");
    timer=setTimeout(()=>{
      timer=null;
      drag={id,moved:false};
      state.dragId=id;
      state.editing=null;
      if(navigator.vibrate)navigator.vibrate(15);
      render();
    },LONG_PRESS_MS);
  });

  document.body.addEventListener("pointermove",ev=>{
    if(timer&&Math.abs(ev.clientY-downY)>MOVE_SLOP)stopTimer();
    if(!drag)return;
    ev.preventDefault();
    const overId=exerciseUnder(ev.clientX,ev.clientY);
    if(!overId||overId===drag.id)return;
    const list=getSession().ex;
    const from=list.findIndex(e=>e.id===drag.id),to=list.findIndex(e=>e.id===overId);
    if(from<0||to<0)return;
    list.splice(to,0,list.splice(from,1)[0]);
    drag.moved=true;
    render();
  },{passive:false});

  const end=()=>{
    stopTimer();
    if(!drag)return;
    swallowClick=true;          // the release would otherwise select what was dragged
    drag=null;
    state.dragId=null;
    render();
  };
  document.body.addEventListener("pointerup",end);
  document.body.addEventListener("pointercancel",end);
}

// In Learn, on its home a sideways swipe moves between the areas (Training, Health, World,
// Books); a right swipe on the first one leaves Learn. Deeper in, a swipe either way steps out
// one level: a book's chapter → its contents, a topic → its list, a list → Learn home. Tabs and
// sections are tapped. Mostly-vertical drags are left to scrolling.
const reading=()=>state.view==="learn"&&state.learnOpen&&state.learnTab==="read"&&state.bookCh!=null;
function learnBack(){
  if(reading()){state.bookCh=null;state.scrollTo=0;}
  else if(state.learnOpen){state.learnOpen=null;state.scrollTo=state.learnListY||0;}
  else if(state.learnCat){state.learnCat=null;state.scrollTo=0;}
  else{state.view="home";state.learnQuery="";}
  render();
}
const SWIPE_MIN=60;
function watchLearnSwipe(){
  let sx=0,sy=0,on=false;
  document.body.addEventListener("touchstart",ev=>{
    on=state.view==="learn"&&ev.touches.length===1&&
      !(ev.target.closest&&ev.target.closest(".lchips,.lshelf,input"));
    if(on){sx=ev.touches[0].clientX;sy=ev.touches[0].clientY;}
  },{passive:true});
  document.body.addEventListener("touchend",ev=>{
    if(!on)return;
    on=false;
    const t=ev.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    if(Math.abs(dx)<SWIPE_MIN||Math.abs(dx)<Math.abs(dy)*1.5)return;
    if(!state.learnOpen&&!state.learnCat){
      const order=LEARN_AREAS.map(a=>a[0]),next=order.indexOf(state.learnArea||"training")+(dx<0?1:-1);
      if(next<0){learnBack();return;}
      if(next>=order.length)return;
      state.learnArea=order[next];state.learnQuery="";state.learnSearchOpen=false;state.scrollTo=0;render();return;
    }
    learnBack();
  },{passive:true});
}

function deleteDay(id){
  state.sessions=state.sessions.filter(s=>s.id!==id);
  if(!state.sessions.length)state.sessions=[makeSession()];
  if(state.sessionId===id)selectSession(state.sessions[0].id);
}

document.body.addEventListener("change",ev=>{
  if(ev.target&&ev.target.id==="supphoto"){
    stacking.pickPhoto(ev.target.files&&ev.target.files[0],render);ev.target.value="";return;
  }
  if(ev.target&&ev.target.id==="cardiofile"){cardio.importWorkoutFile(ev.target.files&&ev.target.files[0],render);ev.target.value="";return;}
  if(ev.target&&ev.target.id==="trendsel"){state.progressEx=ev.target.value;render();return;}
  if(ev.target&&ev.target.id==="remtime"){setSetting("remindTime",ev.target.value);render();return;}
  if(ev.target&&ev.target.id==="csvfile"){
    const f=ev.target.files&&ev.target.files[0];
    if(!f)return;
    const rd=new FileReader();
    rd.onload=()=>importText(String(rd.result));
    rd.readAsText(f);
    ev.target.value="";
  }
});

// Set-editor time fields persist into state as typed, so a mid-edit repaint won't lose them.
document.body.addEventListener("input",ev=>{
  const id=ev.target&&ev.target.id;
  if(id==="editwork")state.editWork=parseClock(ev.target.value);
  else if(id==="editrest")state.editRest=parseClock(ev.target.value);
  else if(id==="exsearch"){state.exSearch=ev.target.value;state.focusSearch=true;render();}
  // Learn's searches never rebuild the page while you type — only the results change — so
  // the box keeps focus and the phone keeps its keyboard.
  else if(id==="learnsearch"){
    state.learnQuery=ev.target.value;
    const body=document.getElementById("learnbody");
    if(body)body.innerHTML=learnHomeBody();
  }
  else if(id==="learncatsearch"){
    const q=ev.target.value.trim().toLowerCase();
    let shown=0;
    document.querySelectorAll("[data-find]").forEach(el=>{
      const hit=!q||el.getAttribute("data-find").indexOf(q)>=0;
      el.hidden=!hit;if(hit)shown++;
    });
    const none=document.getElementById("learncatnone");
    if(none)none.hidden=shown>0;
  }
});

// Closing the picker follows the same rules whether by Done, a tap on the scrim, or Esc:
// a day opened from elsewhere but left empty is dropped, returning you to where you came from.
function dismissSheet(){
  state.sheet=false;state.adding=false;state.exSearch="";state.editList=false;
  const s=getSession();
  if(s&&!s.ex.length&&state.origin&&state.origin!=="log"){
    const back=state.origin;state.origin="home";
    deleteDay(s.id);
    state.view=back;
  }
}

// Every tap goes to the area it belongs to, in an order that lets a button inside a tappable
// row act on its own before the row does (delete a day before opening it).
const ctx={render,snapshot,restoreUndo,recallLast,markRefit,dismissSheet,deleteDay,removeExercise,
  addExercise,showBest};
const AREAS=[cardio,programmes,stacking,nav,routines,days,sharing,data,logging];
document.body.addEventListener("click",ev=>{
  if(swallowClick){swallowClick=false;return;}
  const t=ev.target;
  for(const area of AREAS)if(area.handle(t,ctx))return;
});

// Rest target: once the gap since the last set passes it, the clock turns amber and the
// phone buzzes — once per rest, keyed on the anchor so a new set re-arms it.
let restAlerted="";
function restAlert(s){
  const el=document.getElementById("settime");
  const target=restTargetFor(s);
  const armed=target&&s.running&&!state.setStart;
  const over=armed&&restSeconds(s)>=target;
  if(el)el.classList.toggle("over",!!over);
  if(!over)return;
  const anchor=setAnchor(s);
  if(restAlerted===anchor)return;
  restAlerted=anchor;
  if(navigator.vibrate)navigator.vibrate([200,90,200]);
}

// Both clocks derive from stored stamps, so ticking only refreshes text — never the DOM.
function tick(){
  if(state.view!=="log")return;
  const s=getSession();
  if(autoEndIfStale(s)){render();return;}
  restAlert(s);
  const set=document.getElementById("settime");
  if(set)set.textContent=fmtClock(setClockSeconds(s));
  const setl=document.getElementById("setsub");
  if(setl)setl.innerHTML=setSub(s);
  const work=document.getElementById("worktime");
  if(work)work.innerHTML=workoutLabel(s);
  const sub=document.getElementById("worksub");
  if(sub)sub.innerHTML=workoutSub(s);
}

watchDrag();
watchLearnSwipe();
cardio.resumeCardio(render);
document.addEventListener("visibilitychange",()=>{if(state.cardio)import("./sensors.js").then(m=>m.rewake(true));});

window.addEventListener("resize",()=>{markRefit();fit();});
window.addEventListener("orientationchange",()=>{markRefit();fit();});

// Esc closes whatever is open, top-most first — the picker, then a calendar day, then an
// inline add field — so a keyboard is a first-class way to back out on a laptop.
window.addEventListener("keydown",ev=>{
  if(ev.key!=="Escape")return;
  if(state.exHist){state.exHist=false;render();}
  else if(state.sheet){dismissSheet();render();}
  else if(state.calDay){state.calDay=null;render();}
  else if(state.adding){state.adding=false;render();}
});

// The whole app is precached, so it opens with no network at all; persistent storage
// asks the browser never to evict months of history under storage pressure.
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
  // A new version took over while the app was open: offer a reload rather than leaving the
  // old code running until the next cold start. Not on first install — nothing to update.
  const hadController=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(hadController){state.updateReady=true;render();}
  });
}
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});

load();
state.sessions.forEach(autoEndIfStale);
recallLast(activeEx());
// A day with nothing picked opens the list for you — but it can be closed again.
state.sheet=!getSession().ex.length;
// Opened from a shared workout link: keep the routine at once — the toast offers Undo —
// then clean the URL so a reload doesn't re-import it.
const sharedRoutine=decodeRoutineHash(location.hash);
if(sharedRoutine){
  history.replaceState(null,"",location.pathname+location.search);
  snapshot("Saved routine "+sharedRoutine.name);
  saveRoutine(sharedRoutine.name,sharedRoutine.ex);
  state.view="home";state.sheet=false;
}
render();
setInterval(tick,TICK_MS);
