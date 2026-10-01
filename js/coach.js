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
export function progressionHint(prevSets,opts){
  const work=(prevSets||[]).filter(x=>!x.wu);
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
  if(allTop){
    if(!w)return {text:"Every set reached "+top+" — add weight or slow the reps",apply:null};
    const next=roundTo(w+(WEIGHT_STEP[wu]||2.5),WEIGHT_STEP[wu]===5?1:0.5);
    return {text:"Every set reached "+top+" — try "+next+wu+" × "+low,apply:{w:next,r:low}};
  }
  const aim=Math.min(top,minR+1);
  return w?{text:"Stay at "+w+wu+" — aim for "+aim+"+ on every set",apply:{w,r:aim}}
    :{text:"Aim for "+aim+"+ reps on every set",apply:{r:aim}};
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
