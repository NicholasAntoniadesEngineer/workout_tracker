// Progress: honest numbers over gamification — how often, how much, and which way each
// lift is moving. Everything derives from the logged sets; nothing extra is stored.
import {shortDate,totals} from "../model.js";
import {state} from "../store.js";
import {SET_TARGET,barChart,exerciseRecords,exerciseTrend,lineChart,topExercises,
  weeklySetsByGroup,weeklyVolume,withAxis} from "../charts.js";
import {esc,pageHead} from "./common.js";

const fmtNum=v=>Math.round(v).toLocaleString();

export function progressView(){
  const weeks=weeklyVolume(state.sessions);
  const thisWeek=weeks[weeks.length-1];
  const last4=weeks.slice(-4).reduce((n,w)=>n+w.trained,0);
  const workouts=state.sessions.filter(s=>s.ex.some(e=>e.sets.length)).length;
  const totalReps=state.sessions.reduce((n,s)=>n+totals(s).reps,0);
  const unit=esc(state.settings.unit||"kg");

  let h="<div class='wrap scroll'>"+pageHead("Progress");

  h+="<div class='prgrid'>"+
    "<div class='stat'><div class='v mono'>"+thisWeek.trained+"</div><div class='l'>Days this week</div></div>"+
    "<div class='stat'><div class='v mono'>"+last4+"</div><div class='l'>Days, last 4 weeks</div></div>"+
    "<div class='stat'><div class='v mono'>"+workouts+"</div><div class='l'>Workouts logged</div></div>"+
    "<div class='stat'><div class='v mono'>"+totalReps+"</div><div class='l'>Total reps</div></div></div>";

  // Weekly volume: tonnage once any weight has been logged, plain reps until then.
  const useTon=weeks.some(w=>w.ton);
  const vals=weeks.map(w=>useTon?w.ton:w.reps);
  // This week's hard sets per movement against the 10–20 that drives growth: a bar per group,
  // the target band shaded, so an under-trained pattern shows before the week is out.
  const groups=weeklySetsByGroup(state.sessions);
  const CAP=25;
  h+="<div class='setgroup'>Hard sets this week &middot; aim "+SET_TARGET.low+"&ndash;"+SET_TARGET.high+"</div>"+
    "<div class='card chartcard setbars'>";
  groups.forEach(g=>{
    const pct=Math.min(100,g.sets/CAP*100);
    const state2=!g.target?"":(g.sets>=SET_TARGET.low?(g.sets>SET_TARGET.high?" over":" in"):" under");
    h+="<div class='sbrow"+state2+"'><span class='sbname'>"+esc(g.group)+"</span>"+
      "<span class='sbtrack'>"+(g.target?"<span class='sbzone' style='left:"+(SET_TARGET.low/CAP*100)+
        "%;width:"+((SET_TARGET.high-SET_TARGET.low)/CAP*100)+"%'></span>":"")+
      "<span class='sbfill' style='width:"+pct+"%'></span></span>"+
      "<span class='sbn mono'>"+g.sets+"</span></div>";
  });
  h+="</div>";

  // Volume is weight × reps added up: the total load moved, in plain words.
  h+="<div class='setgroup'>Weekly "+(useTon?"volume &middot; total "+unit+" lifted":"reps")+"</div>"+
    "<div class='card chartcard'>"+withAxis(barChart(vals),fmtNum(Math.max(0,...vals)),0)+
    "<div class='chartlbls'><span>"+esc(weeks[0].label)+"</span>"+
    "<span>"+fmtNum(useTon?thisWeek.ton:thisWeek.reps)+" this week</span>"+
    "<span>"+esc(thisWeek.label)+"</span></div></div>";

  // One exercise's line: top-set weight per day, or top reps for unweighted movements.
  // A workout still running is left out — half a session would read as a drop.
  const done=state.sessions.filter(s=>!s.running);
  const names=topExercises(done);
  if(names.length){
    const cur=names.indexOf(state.progressEx)>=0?state.progressEx:names[0];
    const trend=exerciseTrend(done,cur);
    // A dropdown, not a wall of buttons: the chart stays in view however many lifts there are.
    h+="<div class='setgroup'>Exercise trend</div><div class='card chartcard'>"+
      "<select class='trendsel' id='trendsel'>";
    names.forEach(n=>{h+="<option"+(n===cur?" selected":"")+" value=\""+esc(n)+"\">"+esc(n)+"</option>";});
    h+="</select>";
    if(trend.points.length>1){
      const latest=trend.points[trend.points.length-1],first=trend.points[0];
      const delta=Math.round((latest.v-first.v)*10)/10;
      const vs=trend.points.map(p=>p.v);
      h+=withAxis(lineChart(vs),Math.max(...vs),Math.min(...vs))+
        "<div class='chartlbls'><span>"+esc(shortDate(first.at))+"</span>"+
        "<span>"+(trend.weighted?"top set, "+unit:"best reps")+" &middot; now "+latest.v+
        (delta?" ("+(delta>0?"+":"")+delta+")":"")+"</span>"+
        "<span>"+esc(shortDate(latest.at))+"</span></div>";
    }else{
      h+="<div class='empty-note'>Log "+esc(cur)+" on a second day to see its trend.</div>";
    }
    h+="</div>";
  }

  const recs=exerciseRecords(state.sessions);
  if(recs.length){
    h+="<div class='setgroup'>Records</div><div class='card'>";
    recs.forEach(r=>{
      h+="<div class='histrow'><span class='histdate'>"+esc(r.name)+"</span>"+
        "<span class='histsets mono'>"+
        (r.bestW?r.bestW+unit+" &times;"+r.bestWReps+" &middot; e1RM "+r.best1RM+unit
          :r.bestR+(r.timed?"s best":(r.dist?" m best":" reps")))+"</span></div>";
    });
    h+="</div>";
  }
  if(!workouts)h+="<div class='empty-note'>Nothing logged yet — progress shows up here.</div>";
  return h+"</div>";
}
