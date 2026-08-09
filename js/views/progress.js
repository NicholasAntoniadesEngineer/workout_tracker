// Progress: honest numbers over gamification — how often, how much, and which way each
// lift is moving. Everything derives from the logged sets; nothing extra is stored.
import {shortDate,totals} from "../model.js";
import {state} from "../store.js";
import {barChart,exerciseRecords,exerciseTrend,lineChart,topExercises,
  weeklyVolume} from "../charts.js";
import {esc} from "./common.js";

export function progressView(){
  const weeks=weeklyVolume(state.sessions);
  const thisWeek=weeks[weeks.length-1];
  const last4=weeks.slice(-4).reduce((n,w)=>n+w.trained,0);
  const workouts=state.sessions.filter(s=>s.ex.some(e=>e.sets.length)).length;
  const totalReps=state.sessions.reduce((n,s)=>n+totals(s).reps,0);
  const unit=esc(state.settings.unit||"kg");

  let h="<div class='wrap scroll'>"+
    "<div class='hhead'><button class='backbtn' id='backbtn'>&lsaquo; Back</button>"+
    "<div class='h1 plain'>Progress</div></div>";

  h+="<div class='prgrid'>"+
    "<div class='stat'><div class='v mono'>"+thisWeek.trained+"</div><div class='l'>Days this week</div></div>"+
    "<div class='stat'><div class='v mono'>"+last4+"</div><div class='l'>Days, last 4 weeks</div></div>"+
    "<div class='stat'><div class='v mono'>"+workouts+"</div><div class='l'>Workouts logged</div></div>"+
    "<div class='stat'><div class='v mono'>"+totalReps+"</div><div class='l'>Total reps</div></div></div>";

  // Weekly volume: tonnage once any weight has been logged, plain reps until then.
  const useTon=weeks.some(w=>w.ton);
  const vals=weeks.map(w=>useTon?w.ton:w.reps);
  h+="<div class='setgroup'>Weekly "+(useTon?"volume ("+unit+"&middot;reps)":"reps")+"</div>"+
    "<div class='card chartcard'>"+barChart(vals)+
    "<div class='chartlbls'><span>"+esc(weeks[0].label)+"</span>"+
    "<span>"+(useTon?thisWeek.ton:thisWeek.reps)+" this week</span>"+
    "<span>"+esc(thisWeek.label)+"</span></div></div>";

  // One exercise's line: top-set weight per day, or top reps for unweighted movements.
  const names=topExercises(state.sessions);
  if(names.length){
    const cur=names.indexOf(state.progressEx)>=0?state.progressEx:names[0];
    const trend=exerciseTrend(state.sessions,cur);
    h+="<div class='setgroup'>Exercise trend</div><div class='card chartcard'>"+
      "<div class='trendchips'>";
    names.forEach(n=>{h+="<button class='q"+(n===cur?" on":"")+"' data-trend=\""+esc(n)+"\">"+
      esc(n)+"</button>";});
    h+="</div>";
    if(trend.points.length>1){
      const latest=trend.points[trend.points.length-1],first=trend.points[0];
      const delta=Math.round((latest.v-first.v)*10)/10;
      h+=lineChart(trend.points.map(p=>p.v))+
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
          :r.bestR+(r.timed?"s best":" reps"))+"</span></div>";
    });
    h+="</div>";
  }
  if(!workouts)h+="<div class='empty-note'>Nothing logged yet — progress shows up here.</div>";
  return h+"</div>";
}
