// Your training, written out for an AI chat (ChatGPT, Claude or any other): plain Markdown
// with the settings that shape it, the recent days set by set, records, weekly totals,
// check-ins and the plan. Nothing leaves the device: the lifter copies it or saves the file.
// Pure: everything it needs comes in as arguments, so it can be tested and kept honest.
import {exerciseRecords,weeklySetsByGroup,weeklyVolume} from "./charts.js";
import {setsSummary} from "./views/log.js";

const DAY_MS=86400000;
const day=iso=>new Date(iso).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
const key=n=>String(n||"").trim().toLowerCase();

export function aiSummary(d,opts){
  const o=Object.assign({weeks:12,now:Date.now()},opts||{});
  const st=d.settings||{},u=st.unit==="lb"?"lb":"kg",since=o.now-o.weeks*7*DAY_MS;
  const notes=d.exNotes||{},prog=d.exProg||{},gyms=d.gyms||[];
  const gymName=id=>(gyms.find(g=>g.id===id)||{}).name||"";
  const days=(d.sessions||[]).filter(s=>Date.parse(s.created)>=since&&(s.cardio||s.ex.some(e=>e.sets.length)))
    .sort((a,b)=>(a.created||"").localeCompare(b.created||""));
  let t="# Training log from KingsKiln\n\n"+
    "Exported "+day(new Date(o.now).toISOString())+". The last "+o.weeks+" weeks, "+days.length+" training days. "+
    "Weights in "+u+" unless marked. A set is written reps @ weight; w = warm-up, d = drop set, f = to failure, @RPE after a set where given.\n\n";
  // How the lifter has asked to progress, so advice can respect it.
  t+="## How I progress\n\n- Rep range "+(st.progressRange||"10-15")+"; add weight once every set reaches the top.\n"+
    "- Jump: "+(st.stepMode==="big"?"bigger":st.stepMode==="split"?"bigger for legs, smaller for the rest":"small")+
    "; if a set falls short: "+(st.missRule==="drop"?"drop one jump":"keep the weight")+
    "; deload "+(+st.stallAfter?"after "+st.stallAfter+" stuck sessions, by "+(st.deloadPct||10)+"%":"never")+
    "; after a break: "+(st.breakRule&&st.breakRule!=="off"?st.breakRule:"carry on")+".\n";
  Object.keys(prog).forEach(k=>{const p=prog[k],bits=[];
    if(p.off)bits.push("no targets");if(p.range)bits.push("rep range "+p.range);if(p.step)bits.push("jump "+p.step);
    if(p.hand)bits.push("weight per hand");if(p.unit)bits.push("in "+p.unit);if(p.bar)bits.push("bar "+p.bar);
    if(bits.length)t+="- "+k+": "+bits.join(", ")+"\n";});
  // About me: only what the lifter has entered.
  const body=(d.body||[]).filter(b=>b.w),last=body[body.length-1];
  const me=[];
  if(last)me.push("body weight "+last.w+" "+u+" ("+day(last.at)+")");
  if(body.length>1){const first=body.find(b=>Date.parse(b.at)>=since)||body[0];if(first!==last)me.push("was "+first.w+" "+u+" on "+day(first.at));}
  if(st.heightCm)me.push("height "+st.heightCm+" cm");
  if(st.sex)me.push(st.sex==="m"?"male":"female");
  if(me.length)t+="\n## About me\n\n"+me.join("; ")+".\n";
  // Day by day.
  t+="\n## Training days\n";
  days.forEach(s=>{
    t+="\n### "+day(s.created)+(s.title?" · "+s.title:"")+(s.gym&&gymName(s.gym)?" · at "+gymName(s.gym):"")+"\n";
    if(s.cardio){const c=s.cardio;t+="- "+(c.activity||"cardio")+": "+(c.dist?(c.dist/1000).toFixed(2)+" km, ":"")+Math.round((c.secs||0)/60)+" min"+(c.hr&&c.hr.avg?", "+c.hr.avg+" bpm average":"")+"\n";return;}
    s.ex.forEach(e=>{if(!e.sets.length)return;
      const unit=e.timed?"secs":e.dist?"m":"reps";
      const marks=e.sets.map(x=>(x.kind==="drop"?"d":x.kind==="fail"?"f":"")+(x.rpe?" @RPE"+x.rpe:"")).filter(Boolean);
      const w=e.sets.find(x=>x.u)?e.sets.find(x=>x.u).u:"";
      t+="- "+e.name+": "+setsSummary(e.sets,unit).replace(/&hellip;/g,"…")+(w?" ("+w+")":"")+(e.sets.some(x=>x.hand)?" per hand":"")+
        (marks.length?" ["+marks.join(", ")+"]":"")+"\n";
      e.sets.forEach((x,i)=>{if(x.note)t+="  - set "+(i+1)+": "+x.note+"\n";});
    });
  });
  // Records, all time.
  const recs=exerciseRecords(d.sessions||[]);
  if(recs.length){t+="\n## Best sets, all time\n\n";
    recs.sort((a,b)=>a.name.localeCompare(b.name)).forEach(r=>{
      t+="- "+r.name+": "+(r.bestW?r.bestW+" × "+r.bestWReps+" (estimated 1RM "+r.best1RM+")":r.bestR+(r.timed?" s":r.dist?" m":" reps"))+"\n";});}
  // Weekly totals.
  const span=o.weeks<=8?"8w":o.weeks<=13?"3m":o.weeks<=26?"6m":"1y";
  const weeks=weeklyVolume(d.sessions||[],span);
  if(weeks.length){t+="\n## Weekly totals\n\n| Week of | Days | Reps | Volume ("+u+") |\n|---|---|---|---|\n";
    weeks.forEach(w=>{t+="| "+w.label+" | "+w.trained+" | "+w.reps+" | "+Math.round(w.ton)+" |\n";});}
  const sets=weeklySetsByGroup(d.sessions||[],o.now);
  if(sets.some(g=>g.sets))t+="\nHard sets this week by movement (aim 10–20): "+sets.map(g=>g.group+" "+g.sets).join(", ")+".\n";
  // Check-ins: how I've been feeling.
  const ci=(d.checkins||[]).filter(c=>Date.parse(c.at)>=o.now-28*DAY_MS).sort((a,b)=>(a.at||"").localeCompare(b.at||""));
  if(ci.length){t+="\n## Morning check-ins, last 4 weeks\n\nRatings 1 (best) to 5 (worst).\n\n| Date | Sleep h | Sleep | Soreness | Energy | Stress |\n|---|---|---|---|---|---|\n";
    ci.forEach(c=>{t+="| "+day(c.at)+" | "+(c.hours||"")+" | "+(c.sleep||"")+" | "+(c.soreness||"")+" | "+(c.fatigue||"")+" | "+(c.stress||"")+" |"+(c.rundown?" run down":"")+"\n";});}
  // Notes pinned to exercises.
  const nk=Object.keys(notes).filter(k=>String(notes[k]).trim());
  if(nk.length){t+="\n## Notes on exercises\n\n";nk.forEach(k=>{t+="- "+k+": "+notes[k]+"\n";});}
  // Routines and the programme.
  const routines=(d.routines||[]).filter(r=>r&&r.name);
  if(routines.length){t+="\n## My routines\n\n";routines.forEach(r=>{t+="- "+r.name+": "+(r.ex||[]).join(", ")+"\n";});}
  if(d.programme&&d.programme.name)t+="\nCurrently following: "+d.programme.name+".\n";
  return t;
}

// Check-ins as a spreadsheet, for any app or chart.
export function checkinsCSV(checkins){
  const rows=[["date","bed","wake","sleep_hours","sleep","soreness","energy","stress","run_down"]];
  (checkins||[]).slice().sort((a,b)=>(a.at||"").localeCompare(b.at||"")).forEach(c=>{
    rows.push([String(c.at||"").slice(0,10),c.bed||"",c.wake||"",c.hours||"",c.sleep||"",c.soreness||"",c.fatigue||"",c.stress||"",c.rundown?"yes":""]);});
  return rows.map(r=>r.map(v=>/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(",")).join("\n")+"\n";
}
