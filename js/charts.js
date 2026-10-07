// Progress analytics: pure computations over sessions plus tiny inline-SVG charts.
// No libraries — the charts inherit the theme through currentColor and CSS variables.
import {EXERCISE_GROUPS,OTHER_GROUP,dateKey,exerciseGroup,setReps,setLoad} from "./model.js";

const WEEKS_SHOWN=8;
const TREND_POINTS=12;
// How far back a chart looks. Weeks of volume are capped so the bars stay readable; a trend
// just takes every day in the span.
export const SPANS=[["8w","8 weeks",8],["3m","3 months",13],["6m","6 months",26],["1y","A year",52],["all","All time",0]];
const spanWeeks=span=>(SPANS.find(x=>x[0]===span)||SPANS[0])[2];
const spanStart=(span,now)=>{const w=spanWeeks(span);if(!w)return 0;const d=new Date(now||Date.now());d.setDate(d.getDate()-w*7);return d.getTime();};

export function est1RM(w,r){return Math.round(w*(1+r/30)*10)/10;}

function hasSets(s){return s.ex.some(e=>e.sets.length);}

// Tonnage of a session: reps × weight, so bodyweight sets contribute volume only to reps.
function tonnage(s){
  let t=0;
  s.ex.forEach(e=>e.sets.forEach(x=>{if(!x.wu)t+=setReps(x)*setLoad(x);}));
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

// Hard sets this week (Monday on) by movement group — warm-ups never count. The main
// lifts' groups carry the 10–20 sets a week that drives real growth; the rest just show their count.
export const SET_TARGET={low:10,high:20};
export const TARGET_GROUPS=["Squat & lunge","Hinge & glutes","Push","Pull"];
export function weeklySetsByGroup(sessions,now){
  const start=weekStart(now?new Date(now):new Date()).getTime();
  const by={};
  sessions.forEach(s=>{
    const t=Date.parse(s.created);
    if(isNaN(t)||t<start)return;
    s.ex.forEach(e=>{
      const n=e.sets.filter(x=>!x.wu).length;
      if(n){const g=exerciseGroup(e.name);by[g]=(by[g]||0)+n;}
    });
  });
  return EXERCISE_GROUPS.map(g=>g[0]).concat(OTHER_GROUP).filter(g=>by[g]||TARGET_GROUPS.indexOf(g)>=0)
    .map(g=>({group:g,sets:by[g]||0,target:TARGET_GROUPS.indexOf(g)>=0}));
}

// The last N calendar weeks, oldest first, each with the reps and tonnage trained in it.
export function weeklyVolume(sessions,span){
  const weeks=[];
  const thisWeek=weekStart(new Date());
  let n=spanWeeks(span||"8w");
  if(!n){const first=sessions.map(s=>Date.parse(s.created)).filter(t=>t>0);n=first.length?Math.min(520,Math.ceil((thisWeek.getTime()-Math.min(...first))/(7*86400000))+1):WEEKS_SHOWN;}
  for(let i=n-1;i>=0;i--){
    // Step back by calendar days, not 24-hour blocks, so a daylight-saving change never
    // lands a week on Sunday 23:00 and loses the sessions in it.
    const start=new Date(thisWeek.getFullYear(),thisWeek.getMonth(),thisWeek.getDate()-i*7);
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

// Cardio by calendar week, oldest first: distance (metres), time (seconds) and sessions.
export function cardioWeekly(sessions,now,span){
  const weeks=[],thisWeek=weekStart(now?new Date(now):new Date());
  let n=spanWeeks(span||"8w");
  if(!n){const first=sessions.map(s=>Date.parse(s.created)).filter(t=>t>0);n=first.length?Math.min(520,Math.ceil((thisWeek.getTime()-Math.min(...first))/(7*86400000))+1):WEEKS_SHOWN;}
  for(let i=n-1;i>=0;i--){
    const start=new Date(thisWeek.getFullYear(),thisWeek.getMonth(),thisWeek.getDate()-i*7);
    weeks.push({key:dateKey(start.toISOString()),label:start.toLocaleDateString(undefined,{day:"numeric",month:"short"}),dist:0,secs:0,n:0});
  }
  const byKey={};weeks.forEach(w=>{byKey[w.key]=w;});
  sessions.forEach(s=>{
    if(!s.cardio)return;
    const d=new Date(s.created);if(isNaN(d))return;
    const w=byKey[dateKey(weekStart(d).toISOString())];if(!w)return;
    w.dist+=+s.cardio.dist||0;w.secs+=+s.cardio.secs||0;w.n++;
  });
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
      timed:false,dist:false};
    rec.timed=rec.timed||!!e.timed;
    rec.dist=rec.dist||!!e.dist;
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
// A lift's line over time. measure: "e1rm" (default for weighted lifts: the best estimated
// one-rep max that day, so adding reps at the same weight shows as a rise), "top" (heaviest
// set), "volume" (weight × reps, warm-ups out), or "reps" (best reps, the default for
// bodyweight work). span limits how far back; no span means the last 12 days, as before.
export function exerciseTrend(sessions,name,opts){
  const o=opts||{},k=String(name).trim().toLowerCase(),from=o.span?spanStart(o.span):0;
  const days=[];
  sessions.slice().sort((a,b)=>(a.created||"").localeCompare(b.created||"")).forEach(s=>{
    if(from&&Date.parse(s.created)<from)return;
    const e=s.ex.find(x=>x.name.trim().toLowerCase()===k&&x.sets.length);
    if(!e)return;
    let w=0,r=0,rm=0,vol=0;
    e.sets.forEach(x=>{if(x.wu)return;if(+x.w>w)w=+x.w;if(x.r>r)r=x.r;if(+x.w)rm=Math.max(rm,est1RM(+x.w,x.r));vol+=(+x.w||0)*x.r;});
    days.push({at:s.created,w,r,rm,vol});
  });
  const weightedDays=days.filter(d=>d.w>0).length;
  // Weighted only when most days carried a weight — a lone weighted day never hides the rest.
  const weighted=weightedDays>0&&weightedDays*2>=days.length;
  const measure=o.measure||(weighted?"e1rm":"reps");
  const pick=d=>measure==="e1rm"?d.rm:measure==="top"?d.w:measure==="volume"?d.vol:d.r;
  let points=(weighted&&measure!=="reps"?days.filter(d=>d.w>0):days).map(d=>({at:d.at,v:Math.round(pick(d)*10)/10}));
  if(!o.span)points=points.slice(-TREND_POINTS);
  return {weighted,measure,points};
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

// Given a size, a chart is drawn at that real shape, so bars and dots keep their proportions on
// a wide screen; without one it stretches to its box, as on the phone.
export function barChart(values,size){
  const W=size?size.w:CHART_W,Hh=size?size.h:CHART_H;
  const max=Math.max(1,...values);
  const n=values.length;
  const bw=(W-PAD*2)/n,barW=size?Math.min(bw*0.68,24):bw*0.68;
  let h="<svg class='chart"+(size?" sized":"")+"' viewBox='0 0 "+W+" "+Hh+"'"+(size?"":" preserveAspectRatio='none'")+">";
  values.forEach((v,i)=>{
    const bh=Math.max(v>0?3:0,(v/max)*(Hh-6));
    h+="<rect x='"+(PAD+i*bw+(bw-barW)/2).toFixed(1)+"' y='"+(Hh-bh).toFixed(1)+
       "' width='"+barW.toFixed(1)+"' height='"+bh.toFixed(1)+"' rx='"+(size?4:2)+"'"+
       (i===n-1?" class='now'":"")+">"+(size&&size.labels?"<title>"+size.labels[i]+"</title>":"")+"</rect>";
  });
  return h+"</svg>";
}

// A chart's scale, printed down its left edge: the top value and the bottom one, so a bar
// or a line reads as a number rather than just a shape.
export function withAxis(svg,hi,lo){
  return "<div class='chartbox'><div class='yax mono'><span>"+hi+"</span><span>"+lo+"</span></div>"+
    svg+"</div>";
}

export function lineChart(values,size){
  const W=size?size.w:CHART_W,Hh=size?size.h:CHART_H;
  const max=Math.max(1,...values),min=Math.min(...values);
  const span=Math.max(1,max-min);
  const n=values.length;
  const x=i=>n>1?PAD+6+i*(W-PAD*2-12)/(n-1):W/2;
  const y=v=>Hh-6-((v-min)/span)*(Hh-16);
  const pts=values.map((v,i)=>x(i).toFixed(1)+","+y(v).toFixed(1)).join(" ");
  let h="<svg class='chart line"+(size?" sized":"")+"' viewBox='0 0 "+W+" "+Hh+"'"+(size?"":" preserveAspectRatio='none'")+">";
  if(n>1&&size)h+="<polygon class='area' points='"+x(0).toFixed(1)+","+Hh+" "+pts+" "+x(n-1).toFixed(1)+","+Hh+"'/>";
  if(n>1)h+="<polyline points='"+pts+"'/>";
  values.forEach((v,i)=>{h+="<circle cx='"+x(i).toFixed(1)+"' cy='"+y(v).toFixed(1)+"' r='"+(size?4:3)+"'"+
    (i===n-1?" class='now'":"")+">"+(size&&size.labels?"<title>"+size.labels[i]+"</title>":"")+"</circle>";});
  return h+"</svg>";
}
