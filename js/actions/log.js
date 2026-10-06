// The logging screen: the day's name, the picker sheet, the panel (reps, weight, unit,
// keypad, hint), editing a set, both clocks, logging, and adding or removing exercises.
// Each handler returns true once it has dealt with the tap.
import {BANDS,addManualSets,addSet,dateKey,endWorkout,fmtClock,isBandExercise,normSet,nowISO,
  resetRestTimer,resetWorkout,setWorkoutMinutes,setWorkoutSpanOn,startWorkout,unitOf,
  workoutSeconds} from "../model.js";
import {activeEx,addExerciseToDay,getSession,removeFromCatalog,state} from "../store.js";
import {bestsBefore,newBestLabel} from "../coach.js";
import {ask,confirmAct} from "../dialog.js";

const MIN_REPS=0;
const SEC_PER_MIN=60;

export function handle(t,ctx){
  if(t.closest&&t.closest("#daytitle")){
    ask({title:"Name this day",value:getSession().title,act:"nameday"});
    ctx.render();return true;
  }
  if(t.closest&&t.closest("#managebtn")){
    state.sheet=true;state.editing=null;ctx.render();return true;
  }
  if(t.id==="opensheet"){state.sheet=true;state.editing=null;ctx.render();return true;}
  if(t.closest&&t.closest("#exhistbtn")){state.exHist=true;ctx.render();return true;}
  if(t.id==="histdone"||t.id==="histback"){state.exHist=false;state.exInfo=null;ctx.render();return true;}
  // From the picker: an exercise's sheet, a star for favourites, and folding groups.
  const info=t.closest&&t.closest("[data-exinfo]");
  if(info){state.exInfo=info.getAttribute("data-exinfo");ctx.render();return true;}
  const fav=t.closest&&t.closest("[data-fav]");
  if(fav){
    const n=fav.getAttribute("data-fav"),f=(state.favs||[]).slice(),i=f.indexOf(n);
    if(i>=0)f.splice(i,1);else f.push(n);
    state.favs=f;ctx.render();return true;
  }
  const grp=t.closest&&t.closest("[data-pickgroup]");
  if(grp){
    const g=grp.getAttribute("data-pickgroup");
    state.pickOpen=Object.assign({},state.pickOpen);state.pickOpen[g]=!state.pickOpen[g];
    if(state.pickOpen[g])state.pickFocus=g;
    ctx.render();return true;
  }
  // Per-exercise rest: 0 falls back to the default from Settings.
  const restPick=t.closest&&t.closest("[data-resttarget]");
  if(restPick){
    const e=state.exInfo?{name:state.exInfo}:activeEx(),v=+restPick.getAttribute("data-resttarget");
    if(e){
      const k=e.name.trim().toLowerCase();
      state.restTargets=Object.assign({},state.restTargets);
      if(v)state.restTargets[k]=v;else delete state.restTargets[k];
    }
    ctx.render();return true;
  }
  if(t.id==="sheetdone"||t.id==="sheetback"){ctx.dismissSheet();ctx.render();return true;}
  // The progression hint, applied: its suggested reps and weight go straight into the panel.
  const hintB=t.closest&&t.closest("#hintbtn,#rxbtn");
  if(hintB){
    const hw=hintB.getAttribute("data-hw"),hr=hintB.getAttribute("data-hr");
    if(hw!==null&&hw!=="")state.weight=+hw;
    if(hr!==null&&hr!=="")state.reps=+hr;
    ctx.render();return true;
  }
  if(t.id==="sidebtn"){state.perSide=!state.perSide;ctx.render();return true;}
  // One kind per set: tapping the chip that is on returns to a working set.
  const kindB=t.closest&&t.closest("[data-setkind]");
  if(kindB){const k=kindB.getAttribute("data-setkind");state.setKind=state.setKind===k?"":k;state.warmup=state.setKind==="wu";ctx.render();return true;}
  const rpeB=t.closest&&t.closest("[data-rpe]");
  if(rpeB){const v=+rpeB.getAttribute("data-rpe");state.setRpe=state.setRpe===v?0:v;ctx.render();return true;}
  if(t.id==="notebtn"){state.noteOpen=!state.noteOpen;state.focusNote=state.noteOpen;ctx.render();return true;}
  // The unit belongs to the exercise, not the set — a plank is timed every day. One button
  // steps through reps, seconds and metres.
  if(t.id==="timedbtn"){
    const e=activeEx();
    if(e){
      if(e.timed){e.timed=false;e.dist=true;}
      else if(e.dist){e.dist=false;}
      else e.timed=true;
    }
    ctx.render();return true;
  }
  // The ± nudges beside each value: reps and weight by one, band cycles the range list.
  const step=t.closest&&t.closest("[data-step]");
  if(step){
    const parts=step.getAttribute("data-step").split(":"),field=parts[0],d=parseInt(parts[1],10);
    if(field==="reps")state.reps=Math.max(MIN_REPS,state.reps+d);
    else if(field==="weight")state.weight=Math.max(0,Math.round((state.weight+d)*10)/10);
    else if(field==="band"){
      const opts=[""].concat(BANDS);let i=opts.indexOf(state.band);if(i<0)i=0;
      state.band=opts[(i+d+opts.length)%opts.length];
    }
    ctx.render();return true;
  }
  // Tapping a value opens the editor: a keypad for numbers, the band list for a band tile.
  const editField=t.closest&&t.closest("[data-edit]");
  if(editField){state.numEdit={field:editField.getAttribute("data-edit"),buf:""};ctx.render();return true;}
  if(state.numEdit&&t.dataset&&t.dataset.key!==undefined){
    const k=t.dataset.key,f=state.numEdit;
    if(k==="back")f.buf=f.buf.slice(0,-1);
    // One decimal point, weight only — 67.5 and 2.5kg plates — never on reps or seconds.
    else if(k==="."){if(f.field==="weight"&&f.buf.indexOf(".")<0)f.buf=(f.buf||"0")+".";}
    else if(k==="done"){
      if(f.buf!==""){const v=parseFloat(f.buf)||0;
        if(f.field==="weight")state.weight=Math.max(0,v);
        else state.reps=Math.max(MIN_REPS,Math.round(v));}
      state.numEdit=null;
    }else if(f.buf.length<6&&!/\.\d\d$/.test(f.buf))f.buf+=k;
    ctx.render();return true;
  }
  const bandPick=t.closest&&t.closest("[data-band]");
  if(bandPick){state.band=bandPick.getAttribute("data-band");state.numEdit=null;ctx.render();return true;}
  if(t.id==="numedcancel"||t.id==="numedclose"||t.id==="numedback"){state.numEdit=null;ctx.render();return true;}

  if(t.dataset&&t.dataset.ex&&t.classList.contains("exbtn")){
    state.exId=t.dataset.ex;state.editing=null;
    ctx.recallLast(activeEx());
    ctx.render();return true;
  }
  const cell=t.closest&&t.closest(".cell.has");
  if(cell){
    const e=getSession().ex.find(x=>x.id===cell.dataset.ex);
    const i=parseInt(cell.dataset.i,10);
    state.exId=cell.dataset.ex;
    state.reps=e.sets[i].r;
    state.perSide=e.sets[i].side;
    state.weight=+e.sets[i].w||0;
    state.band=e.sets[i].band||"";
    state.warmup=!!e.sets[i].wu;
    state.setKind=e.sets[i].wu?"wu":(e.sets[i].kind||"");
    state.setRpe=+e.sets[i].rpe||0;state.setNote=e.sets[i].note||"";state.noteOpen=!!e.sets[i].note;
    state.editWork=+e.sets[i].t||0;
    state.editRest=+e.sets[i].rest||0;
    state.editing={ex:cell.dataset.ex,i};
    ctx.render();return true;
  }
  if(t.id==="wtoggle"){
    const s=getSession();
    if(s.running){
      confirmAct({title:"End the workout?",text:"The clock stops at "+fmtClock(workoutSeconds(s))+".",ok:"End workout",act:"endworkout"});
      ctx.render();return true;
    }else startWorkout(s);
    state.setStart=null;
    ctx.render();return true;
  }
  // Starting a set stamps its beginning: the gap before it is rest, the gap after is work.
  if(t.id==="setstart"){
    const s=getSession();
    if(state.setStart){state.setStart=null;}
    else{if(!s.running)startWorkout(s);state.setStart=nowISO();}
    ctx.render();return true;
  }
  if(t.id==="timerreset"){
    confirmAct({title:"Reset the rest clock?",text:"Logged sets are not affected.",ok:"Reset",act:"resetrest"});
    ctx.render();return true;
  }
  if(t.id==="workreset"){
    confirmAct({title:"Reset the workout time?",text:"Logged sets are not affected.",ok:"Reset",act:"resetwork"});
    ctx.render();return true;
  }
  if(t.closest&&t.closest("#worktime")){
    const s=getSession();
    const cur=Math.round((workoutSeconds(s)||0)/SEC_PER_MIN);
    // Today's workout counts live from now; another day's is a fixed span on that date.
    const onToday=dateKey(s.created)===dateKey(nowISO());
    ask({title:onToday?"Minutes the workout has been going":"Minutes the workout lasted",value:String(cur),type:"number",inputmode:"decimal",mono:true,ok:"Set",act:"workmins"});
    ctx.render();return true;
  }
  if(t.id==="logbtn"){
    const s=getSession(),e=activeEx();
    if(e){
      // Bands record a resistance range and no weight; everything else records the weight.
      const isB=isBandExercise(e.name),w=isB?0:state.weight,bd=isB?state.band:"";
      // A live set on today counts with the timer; a past day is manual transcription.
      const live=dateKey(s.created)===dateKey(nowISO());
      const extra={kind:state.setKind,rpe:state.setRpe,note:state.setNote};
      if(live)addSet(s,e,state.reps,state.perSide,state.setStart,w,extra,bd);
      else addManualSets(s,e,state.reps,state.perSide,w,1,extra,bd);
      // Beat everything before it? Say so, briefly, right as it happens.
      const i=e.sets.length-1;
      const label=newBestLabel(bestsBefore(state.sessions,s,e.name,i),e.sets[i],unitOf(e),
        state.settings.unit||"kg");
      if(label)ctx.showBest(e.name,label);
    }
    // Kind, RPE and note are per set, not sticky: the next set starts clean.
    state.setStart=null;state.warmup=false;state.setKind="";state.setRpe=0;state.setNote="";state.noteOpen=false;
    ctx.render();return true;
  }
  if(t.id==="upd"){
    const e=getSession().ex.find(x=>x.id===state.editing.ex);
    if(e){
      const old=e.sets[state.editing.i];
      const isB=isBandExercise(e.name);
      e.sets[state.editing.i]=normSet({r:state.reps,side:state.perSide,w:isB?0:state.weight,
        t:state.editWork||0,rest:state.editRest||0,at:old.at||"",kind:state.setKind,rpe:state.setRpe,note:state.setNote,
        band:isB?state.band:""});
    }
    state.editing=null;state.warmup=false;state.setKind="";state.setRpe=0;state.setNote="";state.noteOpen=false;ctx.render();return true;
  }
  if(t.id==="del"){
    const e=getSession().ex.find(x=>x.id===state.editing.ex);
    if(e){ctx.snapshot("Set deleted");e.sets.splice(state.editing.i,1);}
    state.editing=null;ctx.render();return true;
  }
  if(t.id==="cxl"){state.editing=null;state.warmup=false;state.setKind="";state.setRpe=0;state.setNote="";state.noteOpen=false;ctx.render();return true;}
  // Picking a listed name closes the new-exercise box, rather than leaving it open to
  // grab focus — and the keyboard with it — on every later repaint.
  // Adding only happens from the sheet, and picking one name should not close it —
  // the day stops being empty on the first pick, which is what used to shut it.
  if(t.id==="exsearchx"){state.exSearch="";state.focusSearch=true;ctx.render();return true;}
  const add=t.closest&&t.closest("[data-add]");
  if(add){
    addExerciseToDay(add.getAttribute("data-add"));
    ctx.recallLast(activeEx());
    state.adding=false;state.exInfo=null;
    state.sheet=true;
    ctx.render();return true;
  }


  const delCat=t.closest&&t.closest("[data-delcat]");
  if(delCat){
    const name=delCat.getAttribute("data-delcat");
    ctx.snapshot("Removed "+name+" from the list");
    removeFromCatalog(name);
    ctx.render();return true;
  }
  if(t.id==="removesel"){const e=activeEx();if(e)ctx.removeExercise(e.id);ctx.render();return true;}
  if(t.dataset&&t.dataset.rm){ctx.removeExercise(t.dataset.rm);ctx.render();return true;}
  if(t.id==="addbtn"){state.adding=true;state.focusAdd=true;ctx.render();return true;}
  if(t.id==="editlist"){state.editList=!state.editList;ctx.render();return true;}
  if(t.id==="addok"){ctx.addExercise();return true;}
  if(t.id==="reset"){
    ctx.snapshot("Day's sets cleared");
    getSession().ex.forEach(x=>{x.sets=[];});
    state.editing=null;ctx.render();return true;
  }
  return false;
}
