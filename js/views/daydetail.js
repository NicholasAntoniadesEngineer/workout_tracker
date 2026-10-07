// One day in full, for the right-hand pane of History and Calendar on a big screen: what it
// was, how it compared with the last time the same workout was done, every set (warm-ups
// dimmed, the day's best ringed), and any new bests. Cardio days show the route and splits.
import {fmtPace,routePath} from "../cardio.js";
import {fmtClock,shortDate,totals,unitOf,workoutSeconds} from "../model.js";
import {state} from "../store.js";
import {bestsBefore,newBestLabel} from "../coach.js";
import {est1RM} from "../charts.js";
import {icon} from "../icons.js";
import {esc} from "./common.js";

const key=s=>String(s||"").trim().toLowerCase();
const tonnage=s=>s.ex.reduce((n,e)=>n+e.sets.reduce((m,x)=>m+(x.wu?0:(+x.w||0)*x.r),0),0);
const fmtK=v=>v>=10000?Math.round(v/100)/10+"k":Math.round(v).toLocaleString();

// The last earlier day with the same name, to compare against.
function lastSame(s){
  return state.sessions.filter(x=>x.id!==s.id&&key(x.title)===key(s.title)&&(x.created||"")<(s.created||"")&&x.ex.some(e=>e.sets.length))
    .sort((a,b)=>(b.created||"").localeCompare(a.created||""))[0]||null;
}
function delta(now,then,fmt){
  if(then==null||now===then)return "";
  const d=now-then;
  return "<span class='dddelta "+(d>0?"up":"down")+"'>"+(d>0?"+":"&minus;")+(fmt?fmt(Math.abs(d)):Math.abs(Math.round(d*10)/10))+"</span>";
}
function kpi(v,l,extra){return "<div class='ddkpi'><span class='ddkv mono'>"+v+"</span><span class='ddkl'>"+l+(extra||"")+"</span></div>";}

function actions(s){
  // A planned day: open it, move or copy it to another day, or remove it.
  if(!s.cardio&&s.ex.length&&!s.ex.some(e=>e.sets.length)&&!s.running)
    return "<div class='ddacts'><button class='btn primary tiny' data-load='"+s.id+"'>Open</button>"+
      "<button class='btn ghost tiny' data-planopen='"+s.id+"' data-mode='move'>Move</button><button class='btn ghost tiny' data-planopen='"+s.id+"' data-mode='copy'>Copy</button>"+
      "<button class='btn ghost tiny dang' data-delday='"+s.id+"'>Remove</button></div>"+(s.deload?"<div class='revsub'>Deload week</div>":"");
  return "<div class='ddacts'><button class='btn primary tiny' data-load='"+s.id+"'>Open in Log</button>"+
    (s.ex.length&&!s.cardio?"<button class='btn ghost tiny' data-copyday='"+s.id+"'>"+icon("reset","sm")+"Repeat today</button>"+
      "<button class='btn ghost tiny' data-saveroutine='"+s.id+"'>"+icon("bookmark","sm")+"Save as routine</button>":"")+
    (s.cardio?((s.cardio.track||[]).length>1?"<button class='btn ghost tiny' data-gpx='"+s.id+"'>GPX</button>":"")+"<button class='btn ghost tiny' data-tcx='"+s.id+"'>TCX</button>":
      "<button class='btn ghost tiny' data-copytext='"+s.id+"'>Copy as text</button><button class='btn ghost tiny' data-printday='"+s.id+"'>Print sheet</button>"+
      (s.ex.some(e=>e.sets.length)?"<button class='btn ghost tiny' data-fit='"+s.id+"' title='For Garmin Connect or Intervals.icu, sets and reps included'>FIT for Garmin</button>":""))+
    "<button class='btn ghost tiny dang' data-delday='"+s.id+"'>Delete</button></div>";
}

function cardioPane(s){
  const c=s.cardio,mi=state.settings.unit==="lb",per=mi?1609.344:1000,u=mi?"mi":"km";
  const track=(c.track||[]).map(p=>({lat:p[0],lon:p[1]}));
  let h="<div class='ddkpis'>"+kpi(fmtClock(c.secs),"time")+
    (c.dist>50?kpi((c.dist/per).toFixed(2)+" "+u,"distance")+kpi(fmtPace(c.secs/(c.dist/per)),"pace /"+u):"")+
    (c.hr?kpi(c.hr.avg,"avg bpm")+kpi(c.hr.max,"max bpm"):"")+(c.climb?kpi(c.climb+" m","climb"):"")+(c.rounds?kpi(c.rounds,"rounds"):"")+"</div>";
  if(track.length>1)h+="<div class='card ddroute'><svg viewBox='0 0 520 260' aria-label='Route'><path d='"+routePath(track,520,260)+"'/></svg></div>";
  if((c.splits||[]).length){
    const best=Math.min(...c.splits.map(x=>x.secs));
    h+="<div class='llabel'>Splits</div><div class='csplits'>"+c.splits.map(x=>"<div class='csplit'><span class='mono'>"+x.n+"</span>"+
      "<span class='csbar'><span style='width:"+Math.round(best/x.secs*100)+"%'></span></span><span class='mono'>"+fmtPace(x.secs)+"</span></div>").join("")+"</div>";
  }
  return h;
}

export function dayDetailPane(s){
  if(!s)return "<div class='empty-note'>Pick a day to see it here.</div>";
  const t=totals(s),secs=workoutSeconds(s),unit=state.settings.unit||"kg";
  const when=new Date(s.started||s.created);
  let h="<div class='ddhead'><div class='eyebrow'>"+esc(when.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"}))+
    (s.started?" &middot; "+esc(when.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})):"")+
    (s.running?" &middot; <span class='live'>live</span>":"")+"</div>"+
    "<div class='ddtitle'>"+esc(s.title)+"</div>"+actions(s)+"</div>";
  if(s.cardio)return h+cardioPane(s);
  if(s.notePhoto)h+="<div class='ddnote'><div class='llabel'>Notes from the sheet</div><img alt='Handwritten notes' src='"+s.notePhoto+"'></div>";
  const prev=lastSame(s),pt=prev?totals(prev):null,ton=tonnage(s),pton=prev?tonnage(prev):null;
  h+="<div class='ddkpis'>"+kpi(t.reps,"reps",prev?delta(t.reps,pt.reps):"")+kpi(t.sets,"sets",prev?delta(t.sets,pt.sets):"")+
    (ton?kpi(fmtK(ton),unit+" lifted",prev?delta(ton,pton,fmtK):""):"")+
    kpi(secs==null?"&mdash;":fmtClock(secs),"time")+"</div>"+
    (prev?"<div class='ddvs'>Compared with "+esc(prev.title)+" on "+esc(shortDate(prev.created))+"</div>":"");
  if(!s.ex.length)return h+"<div class='empty-note'>No exercises on this day.</div>";
  // Every set, read-only; the day's best working set per exercise ringed; new bests named.
  const bests=[];
  const cols=Math.max(1,...s.ex.map(e=>e.sets.length));
  h+="<div class='card ddtable'><table><thead><tr><th>Exercise</th>"+Array.from({length:cols},(_,i)=>"<th>S"+(i+1)+"</th>").join("")+
    "<th>vs last</th></tr></thead><tbody>";
  s.ex.forEach(e=>{
    const u=unitOf(e);
    let top=-1,topV=-1;
    e.sets.forEach((x,i)=>{if(x.wu)return;const v=+x.w?est1RM(+x.w,x.r):x.r;if(v>topV){topV=v;top=i;}});
    e.sets.forEach((x,i)=>{const lab=newBestLabel(bestsBefore(state.sessions,s,e.name,i),x,u,unit);if(lab)bests.push([e.name,lab]);});
    const pe=prev&&prev.ex.find(x=>key(x.name)===key(e.name));
    let vs="";
    if(pe&&pe.sets.length){
      const best=list=>Math.max(0,...list.filter(x=>!x.wu).map(x=>+x.w||0));
      const a=best(e.sets),b=best(pe.sets);
      vs=a||b?delta(a,b)||"<span class='dddelta'>same</span>":delta(e.sets.reduce((n,x)=>n+x.r,0),pe.sets.reduce((n,x)=>n+x.r,0))||"<span class='dddelta'>same</span>";
    }
    h+="<tr><td class='ddex'>"+esc(e.name)+"</td>"+Array.from({length:cols},(_,i)=>{
      const x=e.sets[i];
      if(!x)return "<td class='ddc empty'>&middot;</td>";
      return "<td class='ddc mono"+(x.wu?" wu":"")+(i===top?" top":"")+"'>"+x.r+(u==="secs"?"s":u==="m"?"m":"")+(x.side?"/s":"")+
        (x.band?"<small>"+esc(x.band)+"</small>":+x.w?"<small>&times; "+x.w+"</small>":"")+"</td>";}).join("")+
      "<td class='ddc vs'>"+vs+"</td></tr>";
  });
  h+="</tbody></table></div>";
  if(bests.length)h+="<div class='card ddbest'><div class='llabel'>New bests this day</div>"+
    bests.slice(0,8).map(([n,l])=>"<div class='ddbrow'><b>"+esc(n)+"</b><span>"+esc(l)+"</span></div>").join("")+"</div>";
  return h;
}
