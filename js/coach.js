// The session loop: what to aim for next time, when a set beats everything before it, and
// what a finished workout added up to. Pure functions over the logged sets — simple rules
// anyone can check, never a black box.
import {setReps,totals,unitOf,workoutSeconds} from "./model.js";
import {est1RM} from "./charts.js";

const key=n=>String(n||"").trim().toLowerCase();
// Smallest sensible jump in load: a pair of the lightest common plates.
const WEIGHT_STEP={kg:2.5,lb:5};
const HOLD_STEP=5;

function roundTo(v,step){return Math.round(v/step)*step;}

// Double progression: stay at a weight until every working set reaches the top of your rep
// range, then add the smallest jump and start again from the bottom of the range.
// prevSets are the sets from the last time this exercise was trained.
//
// Rules the lifter chooses (all optional; without them this is plain double progression):
//   step       the jump to add, in the weight unit (else 2.5 kg / 5 lb)
//   miss       "hold" keeps the weight when a set falls below the range; "drop" takes a step off
//   stallAfter sessions at one weight with no extra reps before a deload (0 = never)
//   deloadPct  how much a deload takes off, in percent
//   breakRule  "off", or "gentle" / "standard" / "careful": how much lighter to come back after
//              two weeks and after four weeks away
//   history    earlier performances, newest first: [{at, sets}] (prevSets is the newest)
//   prevAt     when prevSets were done; now — the time to measure a break from
export const BREAK_RULES={gentle:[95,90],standard:[90,80],careful:[85,70]};
const DAY_MS=86400000;
const workOf=sets=>(sets||[]).filter(x=>!x.wu);
const topW=sets=>Math.max(0,...workOf(sets).map(x=>+x.w||0));
const repsAt=(sets,w)=>workOf(sets).filter(x=>(+x.w||0)===w).reduce((n,x)=>n+x.r,0);
// How many sessions in a row ended at the same weight without adding a rep.
function stalledRun(prevSets,history){
  const list=[prevSets].concat((history||[]).map(h=>h.sets));
  const w=topW(list[0]);
  if(!w)return 0;
  let n=0;
  for(let i=0;i<list.length-1;i++){
    if(topW(list[i])!==w||topW(list[i+1])!==w)break;
    if(repsAt(list[i],w)>repsAt(list[i+1],w))break;
    n++;
  }
  return n?n+1:0;
}
export function progressionHint(prevSets,opts){
  const work=workOf(prevSets);
  if(!work.length)return null;
  const unit=opts.unit||"reps",wu=opts.weightUnit||"kg";
  const low=opts.low||10,top=opts.top||15;
  const best=Math.max(...work.map(x=>x.r));
  if(unit==="secs")return {text:"Last best "+best+"s — try "+(best+HOLD_STEP)+"s",apply:{r:best+HOLD_STEP}};
  if(unit==="m")return {text:"Last best "+best+"m — go a little farther",apply:{r:best}};
  const minR=Math.min(...work.map(x=>x.r));
  const w=Math.max(...work.map(x=>+x.w||0));
  const allTop=minR>=top;
  if(opts.isBand){
    return allTop?{text:"Every set reached "+top+" — try the next band up",apply:null}
      :{text:"Same band — aim for "+Math.min(top,minR+1)+"+ on every set",apply:{r:Math.min(top,minR+1)}};
  }
  const step=+opts.step>0?+opts.step:(WEIGHT_STEP[wu]||2.5);
  const fine=wu==="lb"?1:0.5,round=v=>Math.max(0,roundTo(v,Math.min(fine,step)));
  // Back after a break: start lighter, by how long it has been.
  const br=BREAK_RULES[opts.breakRule];
  if(w&&br&&opts.prevAt&&opts.now){
    const days=Math.floor((opts.now-Date.parse(opts.prevAt))/DAY_MS);
    if(days>=14){
      const pct=days>=28?br[1]:br[0],next=round(w*pct/100);
      const wk=Math.round(days/7);
      return {text:"Back after "+wk+" weeks — start at "+pct+"%: "+next+wu+" × "+low,apply:{w:next,r:low},rule:"break"};
    }
  }
  // Stuck: the same weight for several sessions with no extra reps — deload and build back.
  if(w&&+opts.stallAfter>0&&!allTop){
    const run=stalledRun(prevSets,opts.history);
    if(run>=+opts.stallAfter){
      const pct=+opts.deloadPct||10,next=round(w*(100-pct)/100);
      return {text:"Stuck at "+w+wu+" for "+run+" sessions — drop "+pct+"% to "+next+wu+" × "+low,apply:{w:next,r:low},rule:"deload"};
    }
  }
  if(allTop){
    if(!w)return {text:"Every set reached "+top+" — add weight or slow the reps",apply:null};
    const next=round(w+step);
    return {text:"Every set reached "+top+" — try "+next+wu+" × "+low,apply:{w:next,r:low}};
  }
  // A set fell below the range: hold the weight, or take a step off.
  if(w&&minR<low&&opts.miss==="drop"){
    const next=round(w-step);
    return {text:"A set fell below "+low+" — drop to "+next+wu+" × "+low,apply:{w:next,r:low},rule:"drop"};
  }
  const aim=Math.min(top,minR+1);
  return w?{text:"Stay at "+w+wu+" — aim for "+aim+"+ on every set",apply:{w,r:aim}}
    :{text:"Aim for "+aim+"+ reps on every set",apply:{r:aim}};
}

// Warm-up ramp toward a working weight on a barbell: the empty bar for 10, then roughly
// 50%, 70% and 85% for fewer reps each — enough to groove the lift without tiring it.
const RAMP=[[0.5,5],[0.7,3],[0.85,1]];
export function warmupRamp(target,unit){
  const u=unit==="lb"?"lb":"kg",bar=u==="lb"?45:20,step=u==="lb"?5:2.5;
  if(!(+target>bar))return [];
  const out=[{w:bar,r:10}];
  RAMP.forEach(([f,r])=>{
    const w=Math.round(target*f/step)*step;
    if(w>out[out.length-1].w&&w<target)out.push({w,r});
  });
  return out;
}

// Everything an exercise had achieved before set i of this session: earlier days, plus the
// sets already logged today. Warm-ups never count.
export function bestsBefore(sessions,session,name,i){
  const k=key(name),b={n:0,maxW:0,maxE:0,maxR:0,maxBodyR:0};
  sessions.forEach(s=>{
    const same=s.id===session.id;
    if(!same&&(s.created||"")>=(session.created||""))return;
    s.ex.forEach(e=>{
      if(key(e.name)!==k)return;
      e.sets.forEach((x,idx)=>{
        if(x.wu||(same&&idx>=i))return;
        b.n++;
        b.maxR=Math.max(b.maxR,x.r);
        if(+x.w>0){b.maxW=Math.max(b.maxW,+x.w);b.maxE=Math.max(b.maxE,est1RM(+x.w,x.r));}
        else b.maxBodyR=Math.max(b.maxBodyR,x.r);
      });
    });
  });
  return b;
}

// What a set beat, in a few words — or "" if nothing. A first-ever set is a start, not a
// record, so it never counts.
export function newBestLabel(prior,x,unit,wu){
  if(!x||x.wu||!prior.n)return "";
  if(unit==="secs")return x.r>prior.maxR?"Longest hold · "+x.r+"s":"";
  if(unit==="m")return x.r>prior.maxR?"Farthest · "+x.r+"m":"";
  const w=+x.w||0;
  if(w>0){
    if(w>prior.maxW)return "Heaviest · "+w+wu+" × "+x.r;
    if(est1RM(w,x.r)>prior.maxE)return "Best set · "+w+wu+" × "+x.r;
    return "";
  }
  return (!x.band&&x.r>prior.maxBodyR&&prior.maxBodyR>0)?"Most reps · "+x.r:"";
}

// The best thing each exercise did today, for the end-of-workout summary.
export function sessionBests(sessions,session,wu){
  const out=[];
  session.ex.forEach(e=>{
    let label="";
    e.sets.forEach((x,i)=>{
      const l=newBestLabel(bestsBefore(sessions,session,e.name,i),x,unitOf(e),wu);
      if(l)label=l;
    });
    if(label)out.push({name:e.name,label});
  });
  return out;
}

// Weight moved: reps × load, counted sets only.
export function sessionVolume(session){
  let v=0;
  session.ex.forEach(e=>{
    if(e.timed||e.dist)return;
    e.sets.forEach(x=>{if(!x.wu)v+=setReps(x)*(+x.w||0);});
  });
  return Math.round(v);
}

// A finished workout in numbers, set against the last workout of the same name.
export function workoutSummary(sessions,session,wu){
  const t=totals(session);
  const prev=sessions.filter(s=>s.id!==session.id&&key(s.title)===key(session.title)&&
    (s.created||"")<(session.created||"")&&s.ex.some(e=>e.sets.length))
    .sort((a,b)=>(b.created||"").localeCompare(a.created||""))[0]||null;
  return {secs:workoutSeconds(session),sets:t.sets,reps:t.reps,volume:sessionVolume(session),
    prev:prev?{created:prev.created,volume:sessionVolume(prev),reps:totals(prev).reps}:null,
    bests:sessionBests(sessions,session,wu)};
}
