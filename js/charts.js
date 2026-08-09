// Progress analytics: pure computations over sessions plus tiny inline-SVG charts.
// No libraries — the charts inherit the theme through currentColor and CSS variables.
import {dateKey,setReps} from "./model.js";

const MS_PER_DAY=86400000;
const WEEKS_SHOWN=8;
const TREND_POINTS=12;

export function est1RM(w,r){return Math.round(w*(1+r/30)*10)/10;}

function hasSets(s){return s.ex.some(e=>e.sets.length);}

// Tonnage of a session: reps × weight, so bodyweight sets contribute volume only to reps.
function tonnage(s){
  let t=0;
  s.ex.forEach(e=>e.sets.forEach(x=>{if(!x.wu)t+=setReps(x)*(+x.w||0);}));
  return Math.round(t);
}

function repCount(s){
  let r=0;
  s.ex.forEach(e=>e.sets.forEach(x=>{if(!x.wu)r+=setReps(x);}));
  return r;
}

// Monday of the week a date falls in — the x-axis bucket for the volume chart.
function weekStart(d){
  const day=(d.getDay()+6)%7;
  const w=new Date(d.getFullYear(),d.getMonth(),d.getDate()-day);
  return w;
}

// The last N calendar weeks, oldest first, each with the reps and tonnage trained in it.
export function weeklyVolume(sessions){
  const weeks=[];
  const thisWeek=weekStart(new Date());
  for(let i=WEEKS_SHOWN-1;i>=0;i--){
    const start=new Date(thisWeek.getTime()-i*7*MS_PER_DAY);
    weeks.push({key:dateKey(start.toISOString()),
      label:start.toLocaleDateString(undefined,{day:"numeric",month:"short"}),
      reps:0,ton:0,days:{}});
  }
  const byKey={};
  weeks.forEach(w=>{byKey[w.key]=w;});
  sessions.forEach(s=>{
    if(!hasSets(s))return;
    const d=new Date(s.created);
    if(isNaN(d))return;
    const w=byKey[dateKey(weekStart(d).toISOString())];
    if(!w)return;
    w.reps+=repCount(s);
    w.ton+=tonnage(s);
    w.days[dateKey(s.created)]=true;
  });
  weeks.forEach(w=>{w.trained=Object.keys(w.days).length;delete w.days;});
  return weeks;
}

// Every exercise's records, heaviest first, weight-free movements ranked by reps after.
// All of them — the whole history is what "records" means, not a top few.
export function exerciseRecords(sessions){
  const by={};
  sessions.forEach(s=>s.ex.forEach(e=>{
    if(!e.sets.length)return;
    const k=e.name.trim().toLowerCase();
    const rec=by[k]=by[k]||{name:e.name,days:0,bestW:0,bestWReps:0,best1RM:0,bestR:0,last:"",
      timed:false};
    rec.timed=rec.timed||!!e.timed;
    rec.days++;
    if((s.created||"")>rec.last)rec.last=s.created||"";
    e.sets.forEach(x=>{
      if(x.wu)return;   // warm-ups never set records
      if(x.w&&(x.w>rec.bestW||(x.w===rec.bestW&&x.r>rec.bestWReps))){rec.bestW=x.w;rec.bestWReps=x.r;}
      if(x.w)rec.best1RM=Math.max(rec.best1RM,est1RM(x.w,x.r));
      rec.bestR=Math.max(rec.bestR,x.r);
    });
  }));
  return Object.values(by)
    .sort((a,b)=>(b.best1RM-a.best1RM)||(b.bestR-a.bestR)||(b.days-a.days));
}

// One point per day the exercise was trained: its top-set weight, or top reps when the
// movement is mostly unweighted. Every training day counts — the line is decided by which
// unit most days used, not by discarding the days that used the other, so an exercise you
// once added weight to still shows all the days you did it plain.
export function exerciseTrend(sessions,name){
  const k=String(name).trim().toLowerCase();
  const days=[];
  sessions.slice().sort((a,b)=>(a.created||"").localeCompare(b.created||"")).forEach(s=>{
    const e=s.ex.find(x=>x.name.trim().toLowerCase()===k&&x.sets.length);
    if(!e)return;
    let w=0,r=0;
    e.sets.forEach(x=>{if(x.wu)return;if(+x.w>w)w=+x.w;if(x.r>r)r=x.r;});
    days.push({at:s.created,w:w,r:r});
  });
  const weightedDays=days.filter(d=>d.w>0).length;
  // Weighted only when most days carried a weight — a lone weighted day never hides the rest.
  const weighted=weightedDays>0&&weightedDays*2>=days.length;
  const points=(weighted?days.filter(d=>d.w>0).map(d=>({at:d.at,v:d.w}))
                        :days.map(d=>({at:d.at,v:d.r}))).slice(-TREND_POINTS);
  return {weighted,points};
}

// The exercises worth a trend line, most-trained first. Every one by default; pass n to cap.
export function topExercises(sessions,n){
  const days={};
  sessions.forEach(s=>s.ex.forEach(e=>{
    if(!e.sets.length)return;
    const k=e.name.trim().toLowerCase();
    (days[k]=days[k]||{name:e.name,n:0}).n++;
  }));
  const ranked=Object.values(days).sort((a,b)=>b.n-a.n).map(x=>x.name);
  return n?ranked.slice(0,n):ranked;
}

const CHART_W=300,CHART_H=84,PAD=2;

export function barChart(values){
  const max=Math.max(1,...values);
  const n=values.length;
  const bw=(CHART_W-PAD*2)/n;
  let h="<svg class='chart' viewBox='0 0 "+CHART_W+" "+CHART_H+"' preserveAspectRatio='none'>";
  values.forEach((v,i)=>{
    const bh=Math.max(v>0?3:0,(v/max)*(CHART_H-6));
    h+="<rect x='"+(PAD+i*bw+bw*0.16).toFixed(1)+"' y='"+(CHART_H-bh).toFixed(1)+
       "' width='"+(bw*0.68).toFixed(1)+"' height='"+bh.toFixed(1)+"' rx='2'"+
       (i===n-1?" class='now'":"")+"/>";
  });
  return h+"</svg>";
}

export function lineChart(values){
  const max=Math.max(1,...values),min=Math.min(...values);
  const span=Math.max(1,max-min);
  const n=values.length;
  const x=i=>n>1?PAD+i*(CHART_W-PAD*2)/(n-1):CHART_W/2;
  const y=v=>CHART_H-6-((v-min)/span)*(CHART_H-16);
  const pts=values.map((v,i)=>x(i).toFixed(1)+","+y(v).toFixed(1)).join(" ");
  let h="<svg class='chart line' viewBox='0 0 "+CHART_W+" "+CHART_H+"' preserveAspectRatio='none'>";
  if(n>1)h+="<polyline points='"+pts+"'/>";
  values.forEach((v,i)=>{h+="<circle cx='"+x(i).toFixed(1)+"' cy='"+y(v).toFixed(1)+"' r='3'"+
    (i===n-1?" class='now'":"")+"/>";});
  return h+"</svg>";
}
