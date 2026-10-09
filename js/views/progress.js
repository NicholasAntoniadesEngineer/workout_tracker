// Progress: honest numbers over gamification — how often, how much, and which way each
// lift is moving. Everything derives from the logged sets; nothing extra is stored.
import {dateKey,shortDate,totals,exerciseGroup} from "../model.js";
import {state} from "../store.js";
import {ACTIVITIES} from "./cardio.js";
import {BEST_KM,cardioBests,fmtPace} from "../cardio.js";
import {SET_TARGET,SPANS,barChart,cardioWeekly,exerciseRecords,exerciseTrend,lineChart,topExercises,
  weeklySetsByGroup,weeklyVolume,withAxis} from "../charts.js";
import {esc,pageHead,wide} from "./common.js";
import {recoverMini} from "./checkin.js";
import {bodyMapCard} from "./bodymap.js";

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
  let h="<div class='card hcard'><div class='hcardh'><span class='llabel'>Cardio &middot; weekly "+(byDist?"distance":"time")+"</span></div>"+withAxis(barChart(vals,wide()?{w:960,h:150,labels:weeks.map((w,i)=>w.label+": "+fmtV(vals[i]))}:undefined),fmtV(Math.max(0,...vals)),0)+
    "<div class='chartlbls'><span>"+esc(weeks[0].label)+"</span>"+
    "<span>"+fmtV(byDist?now.dist/per:now.secs/60)+" &middot; "+now.n+" this week</span>"+
    "<span>"+esc(now.label)+"</span></div></div>";
  const row=(l,v,at)=>"<div class='histrow'><span class='histdate'>"+l+"</span><span class='histsets mono'>"+v+
    (at?" <span class='cbdate'>"+esc(shortDate(at))+"</span>":"")+"</span></div>";
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

// The week as seven small marks: trained, today, kept for rest.
function weekDots(){
  const restDay=state.settings.restDay===6?6:0;
  const today=new Date();today.setHours(12,0,0,0);
  const sinceStart=restDay===0?(today.getDay()+6)%7:today.getDay();
  const trained={};
  state.sessions.forEach(s=>{if(s.ex.some(e=>e.sets.length)||s.cardio)trained[dateKey(s.created)]=true;});
  let h="";
  for(let i=0;i<7;i++){
    const d=new Date(today);d.setDate(d.getDate()-sinceStart+i);
    const did=!!trained[dateKey(d.toISOString())],isRest=d.getDay()===restDay;
    h+="<i class='"+(i===sinceStart?"now":did?"on":isRest?"rest":"")+"' title='"+esc(d.toLocaleDateString(undefined,{weekday:"short"}))+"'></i>";
  }
  return "<div class='pgwk'>"+h+"</div>";
}
// One card for the week: days trained, hard sets against the aim, the load moved.
function thisWeekCard(thisWeek,useTon,unit){
  const groups=weeklySetsByGroup(state.sessions).filter(g=>g.target);
  const hard=groups.reduce((n,g)=>n+g.sets,0),inRange=groups.filter(g=>g.sets>=SET_TARGET.low&&g.sets<=SET_TARGET.high).length;
  return "<div class='card hcard pgweek'><div class='hcardh'><span class='llabel'>This week</span><button class='hmore' id='homecal'>Calendar &rsaquo;</button></div>"+
    "<div class='pgk3'><div><b class='mono'>"+thisWeek.trained+"<small>"+(thisWeek.trained===1?"day":"days")+"</small></b><span>trained</span></div>"+
    "<div><b class='mono'>"+hard+"<small>hard</small></b><span>sets &middot; "+inRange+"/"+groups.length+" on aim</span></div>"+
    "<div><b class='mono'>"+(useTon?fmtNum(thisWeek.ton)+"<small>"+unit+"</small>":thisWeek.reps+"<small>reps</small>")+"</b><span>"+(useTon?"lifted":"this week")+"</span></div></div>"+
    weekDots()+"</div>";
}
const segc=(items,attr,cur)=>"<div class='segc'>"+items.map(([k,l])=>"<button class='"+(String(cur)===String(k)?"on":"")+"' "+attr+"=\""+esc(k)+"\">"+l+"</button>").join("")+"</div>";

export function progressView(){
  const span=state.progressSpan||"8w";
  const weeks=weeklyVolume(state.sessions,span);
  const thisWeek=weeks[weeks.length-1];
  const workouts=state.sessions.filter(s=>s.ex.some(e=>e.sets.length)).length;
  const totalReps=state.sessions.reduce((n,s)=>n+totals(s).reps,0);
  const unit=esc(state.settings.unit||"kg");
  const big=wide();

  // This week's load: tonnage once any weight has been logged, plain reps until then.
  const useTon=weeks.some(w=>w.ton);
  // This week's hard sets per movement against the 10–20 that drives growth: a bar per group,
  // the target band shaded, so an under-trained pattern shows before the week is out.
  // Hard sets by muscle on a figure, with recovery: the four movement groups are on Today.
  const sets=bodyMapCard();
  const week=thisWeekCard(thisWeek,useTon,unit);

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
    // The lift as a dropdown in the card's corner, so the chart stays put however many there are.
    trendH="<div class='card hcard'><div class='hcardh'><span class='llabel'>Exercise</span><select class='pickchip' id='trendsel' aria-label='Exercise'>"+
      names.map(n=>"<option"+(n===cur?" selected":"")+" value=\""+esc(n)+"\">"+esc(n)+"</option>").join("")+"</select></div>";
    if(trend.weighted)trendH+=segc(MEAS,"data-measure",measure||"e1rm");
    if(trend.points.length>1){
      const latest=trend.points[trend.points.length-1],first=trend.points[0];
      const delta=Math.round((latest.v-first.v)*10)/10;
      const vs=trend.points.map(p=>p.v);
      const what={e1rm:"est. 1RM, "+unit,top:"top set, "+unit,volume:"volume, "+unit,reps:"best reps"}[trend.measure];
      trendH+=withAxis(lineChart(vs,big?{w:640,h:170,labels:trend.points.map(p=>shortDate(p.at)+": "+p.v)}:undefined),Math.max(...vs),Math.min(...vs))+
        "<div class='chartlbls'><span>"+esc(shortDate(first.at))+"</span>"+
        "<span><b>now "+latest.v+(delta?" ("+(delta>0?"+":"")+delta+")":"")+"</b> &middot; "+what+"</span>"+
        "<span>"+esc(shortDate(latest.at))+"</span></div>";
    }else{
      trendH+="<div class='empty-note'>Log "+esc(cur)+" on a second day to see its trend.</div>";
    }
    trendH+="</div>";
  }

  const cardio=cardioSection(),mini=recoverMini();
  // Records at one gym, or everywhere: machines and bars differ from place to place.
  const gyms=(state.gyms||[]).filter(g=>state.sessions.some(s=>s.gym===g.id));
  const rg=gyms.some(g=>g.id===state.recGym)?state.recGym:"";
  const recs=exerciseRecords(rg?state.sessions.filter(s=>s.gym===rg):state.sessions);
  const gymSel=gyms.length?"<select class='pickchip' id='recgym' aria-label='Records at'><option value=''>All gyms</option>"+
    gyms.map(g=>"<option value='"+esc(g.id)+"'"+(g.id===rg?" selected":"")+">"+esc(g.name)+"</option>").join("")+"</select>":"";
  let recsH="";
  if(recs.length){
    // Grouped by movement; the groups and the exercises inside each run A–Z. Each group folds;
    // the ones left open are remembered.
    const open=String(state.settings.recOpen||"").split("|").filter(Boolean);
    recsH="<div class='card hcard recs'><div class='hcardh'><span class='llabel'>Records</span>"+(gymSel||"<span class='pgall'>"+workouts+" workout"+(workouts===1?"":"s")+" &middot; "+fmtNum(totalReps)+" reps all time</span>")+"</div>";
    const by={};
    recs.forEach(r=>{const g=exerciseGroup(r.name);(by[g]=by[g]||[]).push(r);});
    Object.keys(by).sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:"base"})).forEach(g=>{
      const isOpen=open.indexOf(g)>=0;
      recsH+="<button class='recgroup"+(isOpen?" open":"")+"' data-recgroup='"+esc(g)+"' aria-expanded='"+isOpen+"'><span>"+esc(g)+"</span><span class='reccount'>"+by[g].length+"</span><span class='recchev'>&rsaquo;</span></button>";
      if(!isOpen)return;
      by[g].sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"})).forEach(r=>{
        recsH+="<div class='histrow'><span class='histdate'>"+esc(r.name)+"</span>"+
          "<span class='histsets mono'>"+
          (r.bestW?r.bestW+unit+" &times;"+r.bestWReps+(r.best1RM>r.bestW?" &middot; e1RM "+r.best1RM+unit:"")
            :r.bestR+(r.timed?"s best":(r.dist?" m best":" reps")))+"</span></div>";
      });
    });
    recsH+="</div>";
  }
  const SHORT={"8w":"8 wk","3m":"3 mo","6m":"6 mo","1y":"1 yr",all:"All"};
  const spanRow=segc(SPANS.map(([k,l])=>[k,SHORT[k]||l]),"data-span",span);
  const tabs=big?"":"<div class='segc pgtabs'><button class='on'>Charts</button><button id='homedays'>History</button><button id='homecal'>Calendar</button><button id='homebody'>Body</button>"+
    (state.settings.modFuel?"<button data-openhealth='fuel'>Fuel</button>":"")+(state.settings.modMarkers?"<button data-openhealth='markers'>Markers</button>":"")+(state.settings.modMind?"<button data-openhealth='mind'>Mind</button>":"")+"</div>";
  // The year so far, one tap away beside the title, whatever is scrolled to.
  const yr=new Date().getFullYear(),yearBtn=workouts?"<button class='btn ghost tiny revbtn' data-review='year:"+yr+"'>"+yr+" in review &rsaquo;</button>":"";
  let h="<div class='wrap scroll"+(big?" pgwide":"")+"'>"+(big?pageHead("Progress",yearBtn+spanRow):
    "<div class='hhead pghead'><div></div><div class='h1 plain htitle'>Progress</div><div class='hact'>"+yearBtn+"</div></div>"+tabs+spanRow);
  // A big screen arranges the same cards as a dashboard; the phone reads them in a column.
  // A big screen: the charts down the left, the week, muscles and recovery down the right; each
  // column stacks on its own, so a tall card never leaves a gap beside a short one.
  // In sections: the week (its numbers and its muscles), then strength, recovery and cardio,
  // each under a small heading.
  const sec=t=>"<h2 class='pgsec'>"+t+"</h2>";
  const strength=trendH||recsH?sec("Strength")+trendH+recsH:"",recovery=mini?sec("Recovery")+mini:"",cardioH=cardio?sec("Cardio")+cardio:"";
  if(big)h+="<div class='pggrid'><section class='pg8'>"+week+strength+"</section><section class='pg4'>"+sets+recovery+"</section>"+
    (cardio?"<section class='pg12 pgcardio'>"+cardioH+"</section>":"")+"</div>";
  else h+="<div class='pgstack'>"+week+sets+strength+recovery+cardioH+"</div>";
  if(!workouts&&!state.sessions.some(s=>s.cardio))h+="<div class='empty-note'>Nothing logged yet — progress shows up here.</div>";
  return h+"</div>";
}
