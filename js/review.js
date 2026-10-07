// A year, or a month, in numbers: days and workouts, what was lifted, the records set, the
// strongest month, the rest kept. Free, never a streak, nothing to lose by missing a week.
// Pure: it takes the sessions and the period and returns plain numbers.
import {est1RM} from "./charts.js";
import {dateKey,setLoad,setReps,workoutSeconds} from "./model.js";

const key=n=>String(n||"").trim().toLowerCase();
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];

// The sessions inside [from, to), and everything before `from` for comparing records.
function split(sessions,from,to){
  const inside=[],before=[];
  sessions.forEach(s=>{const t=Date.parse(s.created);if(isNaN(t))return;if(t>=from&&t<to)inside.push(s);else if(t<from)before.push(s);});
  return {inside,before};
}
function bestByLift(sessions){
  const by={};
  sessions.forEach(s=>s.ex.forEach(e=>e.sets.forEach(x=>{
    if(x.wu||!(+x.w>0))return;const k=key(e.name),v=est1RM(setLoad(x)/(x.hand?2:1),x.r);
    if(!by[k]||v>by[k].v)by[k]={name:e.name,v,w:+x.w,r:x.r,at:s.created};})));
  return by;
}

// opts: {from, to (ms), restDay (0 Sunday / 6 Saturday)}
export function periodReview(sessions,opts){
  const {inside,before}=split(sessions,opts.from,opts.to);
  const lifting=inside.filter(s=>!s.cardio&&s.ex.some(e=>e.sets.length));
  const cardio=inside.filter(s=>s.cardio);
  const days=new Set(inside.filter(s=>s.cardio||s.ex.some(e=>e.sets.length)).map(s=>dateKey(s.created)));
  let reps=0,volume=0,sets=0,secs=0;
  const exCount={};
  lifting.forEach(s=>{
    const w=workoutSeconds(s);if(w)secs+=w;
    s.ex.forEach(e=>{const n=e.sets.filter(x=>!x.wu);if(!n.length)return;exCount[e.name]=(exCount[e.name]||0)+n.length;
      n.forEach(x=>{sets++;reps+=setReps(x);if(!e.timed&&!e.dist)volume+=setReps(x)*setLoad(x);});});
  });
  let km=0;cardio.forEach(s=>{km+=(s.cardio.dist||0)/1000;secs+=s.cardio.secs||0;});
  // Records: lifts whose best estimated max in the period beat everything before it.
  const prior=bestByLift(before),now=bestByLift(inside);
  const records=Object.keys(now).filter(k=>prior[k]&&now[k].v>prior[k].v+0.01)
    .map(k=>({name:now[k].name,from:Math.round(prior[k].v*10)/10,to:Math.round(now[k].v*10)/10,w:now[k].w,r:now[k].r,gain:now[k].v/prior[k].v-1}))
    .sort((a,b)=>b.gain-a.gain);
  const firsts=Object.keys(now).filter(k=>!prior[k]).length;
  // The busiest month (for a year) and weeks trained.
  const byMonth=new Array(12).fill(0);
  days.forEach(d=>{byMonth[+d.slice(5,7)-1]++;});
  const topMonth=byMonth.indexOf(Math.max(...byMonth));
  const weeks=new Set([...days].map(d=>{const t=new Date(d+"T12:00:00");t.setDate(t.getDate()-((t.getDay()+6)%7));return dateKey(t.toISOString());}));
  // Rest days kept: the chosen rest day with nothing logged, up to today.
  const restDay=opts.restDay===6?6:0;let restKept=0,restAll=0;
  for(let t=opts.from;t<Math.min(opts.to,opts.now||Date.now());t+=86400000){
    const d=new Date(t);if(d.getDay()!==restDay)continue;restAll++;if(!days.has(dateKey(d.toISOString())))restKept++;}
  const favourite=Object.entries(exCount).sort((a,b)=>b[1]-a[1])[0]||null;
  return {days:days.size,workouts:lifting.length,cardio:cardio.length,sets,reps,volume:Math.round(volume),hours:Math.round(secs/360)/10,
    km:Math.round(km*10)/10,records,firsts,favourite:favourite?{name:favourite[0],sets:favourite[1]}:null,
    byMonth,topMonth:Math.max(...byMonth)?MONTHS[topMonth]:"",weeks:weeks.size,
    weeksSoFar:Math.max(1,Math.ceil((Math.min(opts.to,opts.now||Date.now())-opts.from)/(7*86400000))),restKept,restAll};
}
export const yearRange=y=>({from:new Date(y,0,1).getTime(),to:new Date(y+1,0,1).getTime()});
export const monthRange=(y,m)=>({from:new Date(y,m,1).getTime(),to:new Date(y,m+1,1).getTime()});
export const monthName=m=>MONTHS[m];
