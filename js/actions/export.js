// Getting data out to other apps. These buttons sit inside tappable History rows, so this
// area runs before the day handlers: a tap on GPX saves the file rather than opening the day.
import {state} from "../store.js";
import {BOM_CSV,backupJSON,buildCSV,deliver} from "../csv.js";
import {everythingZip,gpx,strongCSV,tcx,workoutText} from "../exporters.js";
import {notice} from "../dialog.js";

export function handle(t,ctx){
  // Strong's layout for strength, GPX/TCX for cardio, text for anywhere, or the lot as a zip. Strong's layout for strength, GPX/TCX for cardio.
  const backup=()=>({sessions:state.sessions,catalog:state.catalog,removed:state.removed,settings:state.settings,body:state.body,routines:state.routines,
    hiddenRoutines:state.hiddenRoutines,restTargets:state.restTargets,exNotes:state.exNotes,exProg:state.exProg,supplements:state.supplements,stacks:state.stacks,favs:state.favs,programme:state.programme,learnSaved:state.learnSaved});
  const day=()=>new Date().toISOString().slice(0,10);
  if(t.closest&&t.closest("#exportstrong")){deliver(strongCSV(state.sessions,state.settings.unit||"kg"),"kingskiln_strong_"+day()+".csv","text/csv;charset=utf-8");return true;}
  if(t.closest&&t.closest("#exportall")){
    const z=everythingZip(state.sessions,state.settings.unit||"kg",BOM_CSV+buildCSV(state.sessions),backupJSON(backup()));
    deliver(z,"kingskiln_export_"+day()+".zip","application/zip");return true;
  }
  const gx=t.closest&&t.closest("[data-gpx]");
  if(gx){const s=state.sessions.find(x=>x.id===gx.getAttribute("data-gpx"));if(s)deliver(gpx(s),"kingskiln_"+s.created.slice(0,10)+".gpx","application/gpx+xml");return true;}
  const tx=t.closest&&t.closest("[data-tcx]");
  if(tx){const s=state.sessions.find(x=>x.id===tx.getAttribute("data-tcx"));if(s)deliver(tcx(s),"kingskiln_"+s.created.slice(0,10)+".tcx","application/vnd.garmin.tcx+xml");return true;}
  const ct=t.closest&&t.closest("[data-copytext]");
  if(ct){const s=state.sessions.find(x=>x.id===ct.getAttribute("data-copytext"));
    if(s){const txt=workoutText(s,state.settings.unit||"kg");
      const done=()=>{notice("Copied","The workout is on your clipboard as text.");ctx.render();};
      try{navigator.clipboard.writeText(txt).then(done,()=>{state.dialog={kind:"notice",title:"Copy this workout",copy:txt,ok:"Done"};ctx.render();});}
      catch(e){state.dialog={kind:"notice",title:"Copy this workout",copy:txt,ok:"Done"};ctx.render();}}
    return true;}
  return false;
}
