// Progress: honest numbers over gamification — how often, how much, and which way each
// lift is moving. Everything derives from the logged sets; nothing extra is stored.
import {shortDate,totals,EXERCISE_GROUPS,exerciseGroup} from "../model.js";
import {state} from "../store.js";
import {ACTIVITIES} from "./cardio.js";
import {BEST_KM,cardioBests,fmtPace} from "../cardio.js";
import {SET_TARGET,SPANS,barChart,cardioWeekly,exerciseRecords,exerciseTrend,lineChart,topExercises,
  weeklySetsByGroup,weeklyVolume,withAxis} from "../charts.js";
import {esc,pageHead,wide} from "./common.js";
import {recoverSection} from "./checkin.js";

const fmtNum=v=>Math.round(v).toLocaleString();
const clk=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;
  return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0");};

// This week's hard sets per movement group against the 10–20 target, as bars.
export function setBars(){
  const groups=weeklySetsByGroup(state.sessions);
  const CAP=25;
  let h="<div class='card chartcard setbars'>";
  groups.forEach(g=>{
    const pct=Math.min(100,g.sets/CAP*100);
    const state2=!g.target?"":(g.sets>=SET_TARGET.low?(g.sets>SET_TARGET.high?" over":" in"):" under");
    h+="<div class='sbrow"+state2+"'><span class='sbname'>"+esc(g.group)+"</span>"+
      "<span class='sbtrack'>"+(g.target?"<span class='sbzone' style='left:"+(SET_TARGET.low/CAP*100)+
        "%;width:"+((SET_TARGET.high-SET_TARGET.low)/CAP*100)+"%'></span>":"")+
      "<span class='sbfill' style='width:"+pct+"%'></span></span>"+
      "<span class='sbn mono'>"+g.sets+"</span></div>";
  });
  return h+"</div>";
}

// Cardio: distance (or time) by week, then each activity's bests — longest, fastest pace, and
// the quickest 1, 5, 10 and 21 km found inside any session.
function cardioSection(){
  const ses=state.sessions.filter(s=>s.cardio);
  if(!ses.length)return "";
  const mi=state.settings.unit==="lb",per=mi?1609.344:1000,u=mi?"mi":"km";
  const weeks=cardioWeekly(ses,undefined,state.progressSpan||"8w"),byDist=weeks.some(w=>w.dist),now=weeks[weeks.length-1];
  const vals=weeks.map(w=>byDist?w.dist/per:w.secs/60);
  const fmtV=v=>byDist?(Math.round(v*10)/10)+" "+u:Math.round(v)+" min";
  let h="<div class='setgroup'>Cardio &middot; weekly "+(byDist?"distance":"time")+"</div>"+
    "<div class='card chartcard'>"+withAxis(barChart(vals,wide()?{w:960,h:150,labels:weeks.map((w,i)=>w.label+": "+fmtV(vals[i]))}:undefined),fmtV(Math.max(0,...vals)),0)+
    "<div class='chartlbls'><span>"+esc(weeks[0].label)+"</span>"+
    "<span>"+fmtV(byDist?now.dist/per:now.secs/60)+" &middot; "+now.n+" this week</span>"+
    "<span>"+esc(now.label)+"</span></div></div>";
  const row=(l,v,at)=>"<div class='histrow'><span class='histdate'>"+l+"</span><span class='histsets mono'>"+v+
    (at?" <span class='cbdate'>"+esc(shortDate(at))+"</span>":"")+"</span></div>";
  h+="<div class='setgroup'>Cardio bests</div>";
  cardioBests(ses).forEach(b=>{
    const name=(ACTIVITIES.find(a=>a[0]===b.activity)||["","",b.activity])[2];
    h+="<div class='card cbest'><div class='cbhead'><b>"+esc(name)+"</b><span>"+b.n+" session"+(b.n===1?"":"s")+
      (b.dist?" &middot; "+(Math.round(b.dist/per*10)/10)+" "+u:"")+" &middot; "+clk(b.secs)+"</span></div>"+
      (b.longest?row("Longest",(Math.round(b.longest.v/per*100)/100)+" "+u,b.longest.at):"")+
      (b.longestTime?row("Longest time",clk(b.longestTime.v),b.longestTime.at):"")+
      // Riders think in speed, everyone else in pace.
      (b.pace?(b.activity==="ride"?row("Fastest average",(Math.round(3600/(b.pace.v*per/1000)*10)/10)+" "+(mi?"mph":"km/h"),b.pace.at):
        row("Fastest pace",fmtPace(b.pace.v*per/1000)+" /"+u,b.pace.at)):"")+
      BEST_KM.filter(k=>b.best[k]).map(k=>row("Fastest "+k+" km",clk(b.best[k].v),b.best[k].at)).join("")+
      "</div>";
  });
  return h;
}

export function progressView(){
  const span=state.progressSpan||"8w";
  const weeks=weeklyVolume(state.sessions,span);
  const thisWeek=weeks[weeks.length-1];
  const last4=weeks.slice(-4).reduce((n,w)=>n+w.trained,0);
  const workouts=state.sessions.filter(s=>s.ex.some(e=>e.sets.length)).length;
  const totalReps=state.sessions.reduce((n,s)=>n+totals(s).reps,0);
  const unit=esc(state.settings.unit||"kg");

  const big=wide();
  const kpi="<div class='prgrid'>"+
    "<div class='stat'><div class='v mono'>"+thisWeek.trained+"</div><div class='l'>Days this week</div></div>"+
    "<div class='stat'><div class='v mono'>"+last4+"</div><div class='l'>Days, last 4 weeks</div></div>"+
    "<div class='stat'><div class='v mono'>"+workouts+"</div><div class='l'>Workouts logged</div></div>"+
    "<div class='stat'><div class='v mono'>"+totalReps+"</div><div class='l'>Total reps</div></div></div>";

  // Weekly volume: tonnage once any weight has been logged, plain reps until then.
  const useTon=weeks.some(w=>w.ton);
  const vals=weeks.map(w=>useTon?w.ton:w.reps);
  // This week's hard sets per movement against the 10–20 that drives growth: a bar per group,
  // the target band shaded, so an under-trained pattern shows before the week is out.
  const sets="<div class='setgroup'>Hard sets this week &middot; aim "+SET_TARGET.low+"&ndash;"+SET_TARGET.high+"</div>"+setBars();

  // Volume is weight × reps added up: the total load moved, in plain words.
  const vol="<div class='setgroup'>Weekly "+(useTon?"volume &middot; total "+unit+" lifted":"reps")+"</div>"+
    "<div class='card chartcard'>"+withAxis(barChart(vals,big?{w:640,h:190,labels:weeks.map(w=>w.label+": "+fmtNum(useTon?w.ton:w.reps))}:undefined),fmtNum(Math.max(0,...vals)),0)+
    "<div class='chartlbls'><span>"+esc(weeks[0].label)+"</span>"+
    "<span>"+fmtNum(useTon?thisWeek.ton:thisWeek.reps)+" this week</span>"+
    "<span>"+esc(thisWeek.label)+"</span></div></div>";

  // One exercise's line: top-set weight per day, or top reps for unweighted movements.
  // A workout still running is left out — half a session would read as a drop.
  const done=state.sessions.filter(s=>!s.running);
  const names=topExercises(done);
  let trendH="";
  if(names.length){
    const cur=names.indexOf(state.progressEx)>=0?state.progressEx:names[0];
    const measure=state.progressMeasure||"";
    const trend=exerciseTrend(done,cur,{span,measure:measure||undefined});
    const MEAS=[["e1rm","Est. 1RM"],["top","Top set"],["volume","Volume"],["reps","Reps"]];
    // A dropdown, not a wall of buttons: the chart stays in view however many lifts there are.
    // A big screen has room for the lifts as chips.
    trendH+="<div class='setgroup'>Exercise trend</div><div class='card chartcard'>"+
      (big?"<div class='lchips pgchips'>"+names.map(n=>"<button class='lchip"+(n===cur?" on":"")+"' data-trend=\""+esc(n)+"\">"+esc(n)+"</button>").join("")+"</div>":
      "<select class='trendsel' id='trendsel'>");
    if(!big){names.forEach(n=>{trendH+="<option"+(n===cur?" selected":"")+" value=\""+esc(n)+"\">"+esc(n)+"</option>";});
      trendH+="</select>";}
    if(trend.weighted)trendH+="<div class='lchips pgmeas'>"+MEAS.map(([k,l])=>"<button class='lchip"+((measure||"e1rm")===k?" on":"")+"' data-measure='"+k+"'>"+l+"</button>").join("")+"</div>";
    if(trend.points.length>1){
      const latest=trend.points[trend.points.length-1],first=trend.points[0];
      const delta=Math.round((latest.v-first.v)*10)/10;
      const vs=trend.points.map(p=>p.v);
      const what={e1rm:"est. 1RM, "+unit,top:"top set, "+unit,volume:"volume, "+unit,reps:"best reps"}[trend.measure];
      trendH+=withAxis(lineChart(vs,big?{w:640,h:190,labels:trend.points.map(p=>shortDate(p.at)+": "+p.v)}:undefined),Math.max(...vs),Math.min(...vs))+
        "<div class='chartlbls'><span>"+esc(shortDate(first.at))+"</span>"+
        "<span>"+what+" &middot; now "+latest.v+
        (delta?" ("+(delta>0?"+":"")+delta+")":"")+"</span>"+
        "<span>"+esc(shortDate(latest.at))+"</span></div>";
    }else{
      trendH+="<div class='empty-note'>Log "+esc(cur)+" on a second day to see its trend.</div>";
    }
    trendH+="</div>";
  }

  const cardio=cardioSection()+recoverSection();
  const recs=exerciseRecords(state.sessions);
  let recsH="";
  if(recs.length){
    // Grouped the way the exercise list is (squat, hinge, push, pull…), A–Z inside each group.
    recsH+="<div class='setgroup'>Records</div><div class='card recs'>";
    const order=EXERCISE_GROUPS.map(g=>g[0]),by={};
    recs.forEach(r=>{const g=exerciseGroup(r.name);(by[g]=by[g]||[]).push(r);});
    Object.keys(by).sort((a,b)=>{const i=order.indexOf(a),j=order.indexOf(b);return (i<0?99:i)-(j<0?99:j)||a.localeCompare(b);}).forEach(g=>{
      recsH+="<div class='recgroup'>"+esc(g)+"</div>";
      by[g].sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"})).forEach(r=>{
        recsH+="<div class='histrow'><span class='histdate'>"+esc(r.name)+"</span>"+
          "<span class='histsets mono'>"+
          (r.bestW?r.bestW+unit+" &times;"+r.bestWReps+(r.best1RM>r.bestW?" &middot; e1RM "+r.best1RM+unit:"")
            :r.bestR+(r.timed?"s best":(r.dist?" m best":" reps")))+"</span></div>";
      });
    });
    recsH+="</div>";
  }
  const spanRow="<div class='lchips pgspan'>"+SPANS.map(([k,l])=>"<button class='lchip"+(span===k?" on":"")+"' data-span='"+k+"'>"+l+"</button>").join("")+"</div>";
  let h="<div class='wrap scroll"+(big?" pgwide":"")+"'>"+(big?pageHead("Progress",spanRow):
    "<div class='hhead'><div></div><div class='h1 plain htitle'>Progress</div><div class='hact'></div></div>"+
    "<div class='pgchiprow'><button class='lchip' id='homedays'>History</button><button class='lchip' id='homecal'>Calendar</button><button class='lchip' id='homebody'>Body</button>"+
      (state.settings.modFuel?"<button class='lchip' data-openhealth='fuel'>Fuel</button>":"")+(state.settings.modMarkers?"<button class='lchip' data-openhealth='markers'>Markers</button>":"")+(state.settings.modMind?"<button class='lchip' data-openhealth='mind'>Mind</button>":"")+"</div>"+spanRow);
  // A big screen arranges the same sections as a dashboard; the phone reads them in a column.
  if(big)h+="<div class='pggrid'><section class='pg12'>"+kpi+"</section><section class='pg8'>"+vol+"</section><section class='pg4'>"+sets+"</section>"+
    (trendH?"<section class='pg8'>"+trendH+"</section>":"")+(recsH?"<section class='pg4 pgrecs'>"+recsH+"</section>":"")+
    (cardio?"<section class='pg12 pgcardio'>"+cardio+"</section>":"")+"</div>";
  else h+=kpi+sets+vol+trendH+cardio+recsH;
  if(!workouts&&!state.sessions.some(s=>s.cardio))h+="<div class='empty-note'>Nothing logged yet — progress shows up here.</div>";
  return h+"</div>";
}
