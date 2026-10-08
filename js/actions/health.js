// Fuel, Markers and Mind: adding and removing entries, the breath timer, habits and the journal.
import {state} from "../store.js";
import {dateKey,nowISO} from "../model.js";
import {newId} from "../stack.js";
import {primeAudio} from "../sensors.js";

const val=id=>{const el=document.getElementById(id);return el?el.value:"";};
// Kept to the decimals typed (a TSH of 0.38 stays 0.38); a decimal comma reads as a point.
const num=id=>{const v=parseFloat(val(id).replace(",","."));return isNaN(v)||v<0?0:Math.round(v*1000)/1000;};

export function handle(t,ctx){
  const hp=t.closest&&t.closest("[data-health]");
  if(hp){state.healthPart=hp.getAttribute("data-health");state.scrollTo=0;ctx.render();return true;}
  if(t.closest&&t.closest("[data-openhealth]")){state.healthPart=t.closest("[data-openhealth]").getAttribute("data-openhealth");state.view="health";state.scrollTo=0;ctx.render();return true;}
  // ── Fuel
  const add=t.closest&&t.closest("[data-fueladd]");
  if(add){state.fuel=(state.fuel||[]).concat([{id:newId("f"),at:nowISO(),name:add.getAttribute("data-fueladd"),p:+add.getAttribute("data-p")||0,kcal:+add.getAttribute("data-kcal")||0,c:+add.getAttribute("data-c")||0,f:+add.getAttribute("data-f")||0}]);ctx.render();return true;}
  if(t.id==="fuelown"){state.fuelDraft={name:""};state.focusId="fuelname";ctx.render();return true;}
  if(t.id==="fuelcancel"){state.fuelDraft=null;ctx.render();return true;}
  if(t.id==="fuelsave"){
    const name=val("fuelname").trim();
    if(name)state.fuel=(state.fuel||[]).concat([{id:newId("f"),at:nowISO(),name,p:num("fuelp"),kcal:num("fuelkcal"),c:num("fuelc"),f:num("fuelf")}]);
    state.fuelDraft=null;ctx.render();return true;
  }
  const w=t.closest&&t.closest("[data-water]");
  if(w){
    const d=+w.getAttribute("data-water"),today=dateKey(nowISO());
    if(d>0)state.fuel=(state.fuel||[]).concat([{id:newId("f"),at:nowISO(),water:1}]);
    else{const i=(state.fuel||[]).map((e,k)=>e.water&&dateKey(e.at)===today?k:-1).filter(k=>k>=0).pop();if(i!=null&&i>=0)state.fuel.splice(i,1);}
    ctx.render();return true;
  }
  const df=t.closest&&t.closest("[data-delfuel]");
  if(df){state.fuel=(state.fuel||[]).filter(e=>e.id!==df.getAttribute("data-delfuel"));ctx.render();return true;}
  // ── Markers
  if(t.id==="markeradd"){state.markerDraft={id:"ferritin",at:dateKey(nowISO())};state.focusId="markerv";ctx.render();return true;}
  if(t.id==="markercancel"){state.markerDraft=null;ctx.render();return true;}
  if(t.id==="markersave"){
    const id=val("markerid"),at=val("markerdate")||dateKey(nowISO()),v=num("markerv");
    if(id&&v){state.markers=(state.markers||[]).filter(x=>!(x.id===id&&x.at===at)).concat([{key:newId("m"),id,at,v}]);}
    state.markerDraft=null;ctx.render();return true;
  }
  const dm=t.closest&&t.closest("[data-delmarker]");
  if(dm){ctx.snapshot("Reading removed");state.markers=(state.markers||[]).filter(x=>x.key!==dm.getAttribute("data-delmarker"));ctx.render();return true;}
  // ── Mind
  const bk=t.closest&&t.closest("[data-breath]");
  if(bk){state.breathKind=bk.getAttribute("data-breath");ctx.render();return true;}
  const bm=t.closest&&t.closest("[data-breathmins]");
  if(bm){state.breathMins=+bm.getAttribute("data-breathmins");ctx.render();return true;}
  if(t.id==="breathstart"){primeAudio();state.breath={kind:state.breathKind||"box",secs:(state.breathMins||5)*60,startedAt:Date.now(),running:true};ctx.render();return true;}
  if(t.id==="breathstop"){state.breath=null;ctx.render();return true;}
  if(t.id==="habitadd"){state.habitDraft=true;state.focusId="habitname";ctx.render();return true;}
  if(t.id==="habitcancel"){state.habitDraft=null;ctx.render();return true;}
  if(t.id==="habitsave"){const n=val("habitname").trim();if(n&&(state.habits||[]).indexOf(n)<0)state.habits=(state.habits||[]).concat([n]).slice(0,8);state.habitDraft=null;ctx.render();return true;}
  const dh=t.closest&&t.closest("[data-delhabit]");
  if(dh){const n=dh.getAttribute("data-delhabit");state.habits=(state.habits||[]).filter(x=>x!==n);ctx.render();return true;}
  const hb=t.closest&&t.closest("[data-habit]");
  if(hb){
    const n=hb.getAttribute("data-habit"),k=dateKey(nowISO()),done=Object.assign({},state.habitDone||{}),list=(done[k]||[]).slice();
    const i=list.indexOf(n);if(i>=0)list.splice(i,1);else list.push(n);done[k]=list;state.habitDone=done;ctx.render();return true;
  }
  return false;
}
