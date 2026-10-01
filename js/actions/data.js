// Settings, files and the body log: choices, restore defaults, CSV and backup, the backup
// nudge, the calendar reminder, weigh-ins, and the chart pickers.
// Each handler returns true once it has dealt with the tap.
import {DEFAULTS,convertAllWeights,setSetting,state,upsertBodyEntry} from "../store.js";
import {dateKey,nowISO} from "../model.js";
import {deliver,exportCSV,exportJSON} from "../csv.js";
import {reminderICS} from "../reminder.js";

export function handle(t,ctx){
  if(t.id==="bodysave"){
    const num=id=>{const el=document.getElementById(id);
      const v=el?parseFloat(el.value):NaN;return isNaN(v)||v<=0?0:Math.round(v*10)/10;};
    const entry={at:nowISO(),w:num("bodyw"),waist:num("body_waist"),
      chest:num("body_chest"),arm:num("body_arm")};
    if(entry.w||entry.waist||entry.chest||entry.arm)upsertBodyEntry(entry);
    ctx.render();return true;
  }
  const delBody=t.closest&&t.closest("[data-delbody]");
  if(delBody){
    ctx.snapshot("Entry deleted");
    const day=delBody.getAttribute("data-delbody");
    state.body=state.body.filter(b=>dateKey(b.at)!==day);
    ctx.render();return true;
  }
  // Learn: a topic opens as its own page, from the top; the list's place is remembered for Back.
  const learn=t.closest&&t.closest("[data-learn]");
  if(learn){
    const wrap=document.querySelector(".wrap.scroll");
    state.learnListY=wrap?wrap.scrollTop:0;
    state.learnOpen=learn.getAttribute("data-learn");state.scrollTo=0;
    ctx.render();return true;
  }
  const learnCat=t.closest&&t.closest("[data-learncat]");
  if(learnCat){state.learnCat=learnCat.getAttribute("data-learncat");state.scrollTo=0;ctx.render();return true;}
  const bodyMet=t.closest&&t.closest("[data-bodymet]");
  if(bodyMet){state.bodyMetric=bodyMet.getAttribute("data-bodymet");ctx.render();return true;}
  const trend=t.closest&&t.closest("[data-trend]");
  if(trend){state.progressEx=trend.getAttribute("data-trend");ctx.render();return true;}

  const setBtn=t.closest&&t.closest("[data-set]");
  if(setBtn){
    const key=setBtn.getAttribute("data-set"),raw=setBtn.getAttribute("data-val");
    const was=DEFAULTS[key];
    const oldUnit=state.settings.unit;
    setSetting(key,typeof was==="boolean"?raw==="1":(typeof was==="number"?Number(raw):raw));
    if(key==="startReps")state.reps=Number(raw);
    if(key==="unit")convertAllWeights(oldUnit,state.settings.unit);
    ctx.markRefit();
    ctx.render();return true;
  }
  if(t.id==="resetsettings"){
    const oldUnit=state.settings.unit;
    Object.keys(DEFAULTS).forEach(k=>setSetting(k,DEFAULTS[k]));
    state.reps=DEFAULTS.startReps;
    convertAllWeights(oldUnit,state.settings.unit);
    ctx.markRefit();
    ctx.render();return true;
  }
  if(t.closest&&t.closest("#exportcsv")){exportCSV(state.sessions);return true;}
  if(t.closest&&(t.closest("#exportjson")||t.closest("#backupnow"))){
    state.backupAt=nowISO();state.backupSnooze="";
    exportJSON({sessions:state.sessions,catalog:state.catalog,removed:state.removed,
      settings:state.settings,body:state.body,routines:state.routines,
      hiddenRoutines:state.hiddenRoutines,restTargets:state.restTargets});
    ctx.render();return true;
  }
  if(t.id==="backupsnooze"){
    state.backupSnooze=new Date(Date.now()+7*86400000).toISOString();ctx.render();return true;
  }
  const remDay=t.closest&&t.closest("[data-remday]");
  if(remDay){
    const i=+remDay.getAttribute("data-remday");
    let days=String(state.settings.remindDays||"").split(",").filter(x=>x!=="").map(Number);
    days=days.indexOf(i)>=0?days.filter(d=>d!==i):days.concat([i]).sort((a,b)=>a-b);
    setSetting("remindDays",days.join(","));ctx.render();return true;
  }
  if(t.closest&&t.closest("#addreminder")){
    const days=String(state.settings.remindDays||"").split(",").filter(x=>x!=="").map(Number);
    const ics=reminderICS(days,state.settings.remindTime);
    if(ics)deliver(ics,"kingskiln_reminder.ics","text/calendar");
    return true;
  }
  if(t.closest&&t.closest("#importcsv")){const cf=document.getElementById("csvfile");if(cf)cf.click();return true;}
  return false;
}
