// Settings, files and the body log: choices, restore defaults, CSV and backup, the backup
// nudge, the calendar reminder, weigh-ins, and the chart pickers.
// Each handler returns true once it has dealt with the tap.
import {DEFAULTS,backupDoc,convertAllWeights,setSetting,state,upsertBodyEntry} from "../store.js";
import {dateKey,nowISO} from "../model.js";
import {deliver,exportCSV,exportJSON} from "../csv.js";
import {checkinICS,reminderICS} from "../reminder.js";
import {bookPos,saveBookPos} from "../reader.js";
import {shareTopic} from "../share.js";
import {topicById} from "../lazy.js";
import {checkForUpdate,freshReload} from "../update.js";
import {periodTitle,reviewOf,reviewPeriod} from "../views/review.js";
import {buildReviewCanvas,shareCanvas} from "../share.js";
import {ask,notice} from "../dialog.js";

export function handle(t,ctx){
  if(t.id==="bodysave"){
    const num=id=>{const el=document.getElementById(id);
      const v=el?parseFloat(el.value.replace(",",".")):NaN;return isNaN(v)||v<=0?0:Math.round(v*10)/10;};
    // The chosen day, at noon, so the entry sits on that date in every time zone it is read in.
    const day=state.bodyDate||dateKey(nowISO()),at=day===dateKey(nowISO())?nowISO():new Date(day+"T12:00:00").toISOString();
    const prev=state.body.find(b=>dateKey(b.at)===day)||{};
    const entry=Object.assign({},prev,{at,w:num("bodyw"),waist:num("body_waist"),chest:num("body_chest"),arm:num("body_arm")});
    ["neck","hip","thigh","sys","dia","pulse"].forEach(k=>{const el=document.getElementById("body_"+k);if(el)entry[k]=num("body_"+k);});
    if(Object.keys(entry).some(k=>k!=="at"&&entry[k]))upsertBodyEntry(entry);
    ctx.render();return true;
  }
  if(t.id==="bodymore"){state.bodyMore=!state.bodyMore;ctx.render();return true;}
  const ph=t.closest&&t.closest("[data-photo]");
  if(ph&&!(t.closest&&t.closest("[data-delphoto]"))){
    const id=ph.getAttribute("data-photo"),c=(state.photoCompare||[]).filter(x=>x!==id);
    state.photoCompare=c.length===(state.photoCompare||[]).length?c.concat([id]).slice(-2):c;ctx.render();return true;
  }
  const dp=t.closest&&t.closest("[data-delphoto]");
  if(dp){ctx.snapshot("Photo deleted");const id=dp.getAttribute("data-delphoto");state.photos=state.photos.filter(p=>p.id!==id);state.photoCompare=(state.photoCompare||[]).filter(x=>x!==id);ctx.render();return true;}
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
    state.learnOpen=learn.getAttribute("data-learn");state.learnTab="overview";state.scrollTo=0;
    ctx.render();return true;
  }
  // Learn's ways in: Start here, Saved, Recent, People A–Z.
  const lidx=t.closest&&t.closest("[data-learnindex]");
  if(lidx){state.learnIndex=lidx.getAttribute("data-learnindex");state.learnCat=null;state.learnQuery="";state.learnSearchOpen=false;state.scrollTo=0;ctx.render();return true;}
  const bmk=t.closest&&t.closest("[data-learnbookmark]");
  if(bmk){
    const id=bmk.getAttribute("data-learnbookmark"),l=(state.learnSaved||[]).filter(x=>x!==id);
    if(l.length===(state.learnSaved||[]).length)l.push(id);
    state.learnSaved=l;ctx.render();return true;
  }
  const lsh=t.closest&&t.closest("[data-learnshare]");
  if(lsh){const tp=topicById(lsh.getAttribute("data-learnshare"));if(tp)shareTopic(tp.id,tp.title);return true;}
  const letter=t.closest&&t.closest("[data-learnletter]");
  if(letter){const el=document.getElementById("ll-"+letter.getAttribute("data-learnletter"));if(el)el.scrollIntoView({block:"start",behavior:"smooth"});return true;}
  if(t.closest&&t.closest("[data-learnclearrecent]")){state.learnRecent=[];ctx.render();return true;}
  // Featured: Next steps to another story for now; tomorrow brings a new one anyway.
  if(t.closest&&t.closest("[data-featurenext]")){state.featureShift=(state.featureShift||0)+1;ctx.render();return true;}
  const ltab=t.closest&&t.closest("[data-learntab]");
  if(ltab){state.learnTab=ltab.getAttribute("data-learntab");state.bookCh=null;state.scrollTo=0;ctx.render();return true;}
  // Books: open a chapter, carry on where you were, back to the contents.
  const bookCh=t.closest&&t.closest("[data-bookch]");
  if(bookCh){
    const v=bookCh.getAttribute("data-bookch"),i=v.lastIndexOf(":"),id=v.slice(0,i),n=+v.slice(i+1);
    state.bookFor=id;state.bookCh=n;state.learnTab="read";state.scrollTo=0;saveBookPos(id,n);
    ctx.render();return true;
  }
  const bookGo=t.closest&&t.closest("[data-bookgo]");
  if(bookGo){
    const id=bookGo.getAttribute("data-bookgo"),pos=bookPos(id);
    state.bookFor=id;state.bookCh=pos?pos.chapter:0;state.learnTab="read";state.scrollTo=0;saveBookPos(id,state.bookCh);
    ctx.render();return true;
  }
  if(t.closest&&t.closest("#bookback")){state.bookCh=null;state.scrollTo=0;ctx.render();return true;}
  // Learn's search opens from the magnifier and stays open while something is typed.
  if(t.closest&&t.closest("#learnsearchbtn")){
    state.learnSearchOpen=!(state.learnSearchOpen||state.learnQuery);
    if(!state.learnSearchOpen)state.learnQuery="";else state.focusSearch="learnsearch";
    ctx.render();return true;
  }
  // A topic's film plays in place when tapped.
  const film=t.closest&&t.closest("[data-film]");
  if(film){state.filmOpen=film.getAttribute("data-film");ctx.render();return true;}
  // A culture's chips narrow it to one part — athletes, methods, food or history.
  const lpart=t.closest&&t.closest("[data-learnpart]");
  if(lpart){state.learnPart=lpart.getAttribute("data-learnpart")||null;state.learnPartCat=state.learnCat;state.scrollTo=0;ctx.render();return true;}
  if(t.id==="learnsearchx"){state.learnQuery="";state.focusSearch="learnsearch";ctx.render();return true;}
  const learnArea=t.closest&&t.closest("[data-learnarea]");
  if(learnArea){state.learnArea=learnArea.getAttribute("data-learnarea");state.learnCat=null;state.learnIndex=null;state.learnQuery="";state.scrollTo=0;ctx.render();return true;}
  const learnCat=t.closest&&t.closest("[data-learncat]");
  if(learnCat){state.learnCat=learnCat.getAttribute("data-learncat")||null;state.scrollTo=0;ctx.render();return true;}
  const bodyMet=t.closest&&t.closest("[data-bodymet]");
  if(bodyMet){state.bodyMetric=bodyMet.getAttribute("data-bodymet");ctx.render();return true;}
  if(t.id==="checkupdate"){
    state.updating=true;ctx.render();
    checkForUpdate().then(r=>{
      if(r==="found")return;   // the new version takes over and the page reloads itself
      state.updating=false;
      notice(r==="offline"?"Couldn't check":"You're up to date",r==="offline"?"No connection. Try again when you're online.":"This is the newest version. If something still looks old, use Reload app.");
      ctx.render();
    });
    return true;
  }
  if(t.id==="freshreload"){state.updating=true;ctx.render();freshReload();return true;}
  // Year and month in review: open a period, hide the monthly card, share the picture.
  // The body map: Sets or Recovery, and a muscle tapped for its detail (tap again to close).
  const bmm=t.closest&&t.closest("[data-bmmode]");
  if(bmm){state.bmMode=bmm.getAttribute("data-bmmode");ctx.render();return true;}
  const mu=t.closest&&t.closest("[data-muscle]");
  if(mu){const k=mu.getAttribute("data-muscle");state.bmSel=state.bmSel===k?"":k;ctx.render();return true;}
  const rv=t.closest&&t.closest("[data-review]");
  if(rv){const p=rv.getAttribute("data-review").split(":");state.reviewPeriod=p[0]==="month"?{kind:"month",y:+p[1],m:+p[2]}:{kind:"year",y:+p[1]};state.view="review";state.scrollTo=0;ctx.render();return true;}
  const ms=t.closest&&t.closest("[data-monthseen]");
  if(ms){state.monthSeen=ms.getAttribute("data-monthseen");ctx.render();return true;}
  if(t.closest&&t.closest("#reviewshare")){
    const p=reviewPeriod(),r=reviewOf(p),u=state.settings.unit||"kg";
    const c=buildReviewCanvas((p.kind==="year"?"Your ":"")+periodTitle(p),"Year in review · KingsKiln",
      [[String(r.days),"days trained"],[String(r.workouts),"workouts"],[r.volume>=10000?Math.round(r.volume/1000)+"k":String(r.volume),u+" lifted"],r.hours?[String(r.hours),"hours"]:[String(r.sets),"sets"]],
      r.records.slice(0,5).map(x=>[x.name,x.from+" → "+x.to+" "+u]).concat(r.topMonth&&p.kind==="year"?[["Most days in",r.topMonth]]:[]));
    shareCanvas(c,"kingskiln_"+periodTitle(p).replace(/\s+/g,"_")+".png",periodTitle(p)+" in review");
    return true;
  }
  if(t.id==="addgym"){ask({title:"Name this gym",value:"",placeholder:"Home, work, the club…",ok:"Add",act:"addgym"});ctx.render();return true;}
  const dg=t.closest&&t.closest("[data-delgym]");
  if(dg){const id=dg.getAttribute("data-delgym");state.gyms=(state.gyms||[]).filter(g=>g.id!==id);if(state.gymId===id)state.gymId="";ctx.render();return true;}
  const rg=t.closest&&t.closest("[data-recgroup]");
  if(rg){const g=rg.getAttribute("data-recgroup"),open=String(state.settings.recOpen||"").split("|").filter(Boolean);
    const i=open.indexOf(g);if(i>=0)open.splice(i,1);else open.push(g);setSetting("recOpen",open.join("|"));ctx.render();return true;}
  const spanB=t.closest&&t.closest("[data-span]");
  if(spanB){state.progressSpan=spanB.getAttribute("data-span");ctx.render();return true;}
  const measB=t.closest&&t.closest("[data-measure]");
  if(measB){state.progressMeasure=measB.getAttribute("data-measure");ctx.render();return true;}
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
    exportJSON(backupDoc());
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
  if(t.closest&&t.closest("#addcheckinrem")){deliver(checkinICS(state.settings.remindTime),"kingskiln_checkin.ics","text/calendar");return true;}
  if(t.closest&&t.closest("#addreminder")){
    const days=String(state.settings.remindDays||"").split(",").filter(x=>x!=="").map(Number);
    const ics=reminderICS(days,state.settings.remindTime);
    if(ics)deliver(ics,"kingskiln_reminder.ics","text/calendar");
    return true;
  }
  if(t.closest&&t.closest("#importcsv")){const cf=document.getElementById("csvfile");if(cf)cf.click();return true;}
  return false;
}
