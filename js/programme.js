// Following a programme: a Learn topic's workout days, run in order on the weekdays you choose.
// Pure functions over the programme and the logged sessions — progress is never stored apart
// from the workouts themselves, so it can't drift. A session started from a programme carries
// {pid, day, round}; it counts as done once it has a set in it.
import {dateKey,nowISO} from "./model.js";
import {est1RM} from "./charts.js";

const key=n=>String(n||"").trim().toLowerCase();
const DAY_MS=86400000;

// Rules a programme can follow. "cycle": the days in order, round after round. "531": Jim
// Wendler's waves — the main lift's sets as percentages of a training max, four weeks to a
// cycle, the max rising after each cycle (2.5 kg upper body, 5 kg lower; 5 and 10 lb).
export const RULES={
  cycle:{name:"Days in order"},
  "531":{name:"5/3/1 waves",weekLabels:["5s","3s","5/3/1","Deload"],
    weeks:[[[0.65,"5"],[0.75,"5"],[0.85,"5+"]],[[0.70,"3"],[0.80,"3"],[0.90,"3+"]],
      [[0.75,"5"],[0.85,"3"],[0.95,"1+"]],[[0.40,"5"],[0.50,"5"],[0.60,"5"]]]},
};
export function ruleFor(topic){return topic&&topic.id==="wendler"?"531":"cycle";}

// Sensible training days for a programme of n days a week.
export function defaultWeekdays(n){
  return ({1:[1],2:[1,4],3:[1,3,5],4:[1,2,4,5],5:[1,2,3,4,5],6:[1,2,3,4,5,6]})[Math.min(6,Math.max(1,n))];
}

// Best estimated one-rep max for a lift across the log, and 90% of it as Wendler's training max.
export function bestE1RM(sessions,name){
  let best=0;
  sessions.forEach(s=>s.ex.forEach(e=>{
    if(key(e.name)!==key(name))return;
    e.sets.forEach(x=>{if(!x.wu&&+x.w>0&&+x.r>0)best=Math.max(best,est1RM(+x.w,+x.r));});
  }));
  return best;
}
const step=u=>u==="lb"?5:2.5;
const roundTo=(v,u)=>Math.round(v/step(u))*step(u);
export function trainingMax(sessions,name,unit){
  const b=bestE1RM(sessions,name);
  return b?roundTo(b*0.9,unit):0;
}

export function makeProgramme(topic,opts){
  const days=(topic.days||[]).map(d=>({name:d.name,note:d.note||"",ex:d.ex.slice()}));
  return {id:"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),topic:topic.id,name:topic.title,
    days,weekdays:(opts.weekdays||defaultWeekdays(days.length)).slice().sort(),start:opts.start||dateKey(nowISO()),
    rule:opts.rule||ruleFor(topic),maxes:Object.assign({},opts.maxes||{}),unit:opts.unit||"kg",created:nowISO(),paused:false};
}

export function doneSessions(p,sessions){
  return sessions.filter(s=>s.prog&&s.prog.pid===p.id&&s.ex.some(e=>e.sets.length))
    .sort((a,b)=>String(a.created).localeCompare(String(b.created)));
}

// Where the programme stands: which day is next, which round, and for 5/3/1 the week and cycle.
export function position(p,sessions){
  const n=doneSessions(p,sessions).length,len=Math.max(1,p.days.length);
  const round=Math.floor(n/len),day=n%len;
  const pos={done:n,day,round,dayName:p.days[day]?p.days[day].name:""};
  if(p.rule==="531"){pos.week=round%4;pos.cycle=Math.floor(round/4)+1;pos.weekLabel=RULES["531"].weekLabels[pos.week];}
  return pos;
}

// The next training date on or after today, never before the start; today counts only if no
// programme workout has been done today.
export function nextDate(p,sessions,now){
  const t=new Date(now||Date.now());t.setHours(12,0,0,0);
  const today=dateKey(t.toISOString());
  const doneToday=doneSessions(p,sessions).some(s=>dateKey(s.created)===today);
  let d=new Date(t);if(doneToday)d=new Date(+d+DAY_MS);
  const start=new Date(p.start+"T12:00:00");if(d<start)d=start;
  for(let i=0;i<14;i++){if(p.weekdays.indexOf(d.getDay())>=0)return dateKey(d.toISOString());d=new Date(+d+DAY_MS);}
  return dateKey(d.toISOString());
}

const UPPER=/press|bench|row|chin|pull/i;
// For 5/3/1: the main lift (the day's first exercise) and its three sets, weights rounded to the
// smallest plate jump.
export function prescription(p,pos){
  if(p.rule!=="531")return null;
  const day=p.days[pos.day];if(!day)return null;
  const lift=day.ex[0],base=+p.maxes[lift]||0;
  if(!base)return {lift,sets:null,week:pos.week,label:pos.weekLabel};
  const inc=(UPPER.test(lift)?1:2)*step(p.unit);
  const tm=base+inc*(pos.cycle-1);
  return {lift,tm,week:pos.week,label:pos.weekLabel,
    sets:RULES["531"].weeks[pos.week].map(([pct,r])=>({w:roundTo(tm*pct,p.unit),r}))};
}
