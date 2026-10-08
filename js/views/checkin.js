// The morning check-in and the readiness card. Thirty seconds: four ratings and when you slept.
// The card says one word, why, and what to do about today's plan. Shown only once the check-in
// is on in Settings; the band appears after a week of check-ins, never sooner.
import {state,todayCheckin} from "../store.js";
import {dateKey,nowISO} from "../model.js";
import {BAND_LABEL,acwr,dailyLoads,isRated,readiness,sleepHours,sleepSummary,suggestion,baselineOf} from "../ready.js";
import {position} from "../programme.js";
import {icon} from "../icons.js";
import {JOINTS,JOINT_NAME,MUSCLE_NAME,fatigueByMuscle,MUSCLES} from "../muscles.js";
import {esc} from "./common.js";

const Q=[["sleep","Sleep",["Great","Good","OK","Poor","Bad"]],["soreness","Soreness",["None","Slight","Some","Sore","Very"]],
  ["fatigue","Energy",["Fresh","Good","OK","Tired","Flat"]],["stress","Stress",["Calm","Fine","Some","High","Very"]]];

export function readinessNow(){
  const c=todayCheckin(),now=Date.now();
  const loads=dailyLoads(state.sessions,28,now);
  const v=state.vitals[state.vitals.length-1],fresh=v&&dateKey(v.at)===dateKey(nowISO())?v:null;
  const r=readiness({checkin:c,loads28:loads,count:state.checkins.filter(isRated).length,hrv:fresh&&fresh.hrv,rhr:fresh&&fresh.rhr,baseline:baselineOf(state.vitals,now)});
  const p=state.programme,planned=p&&!p.paused?position(p,state.sessions).dayName:"";
  return Object.assign(r,{planned,loads,sleep:sleepSummary(state.checkins,state.settings.sleepNeed||8,now)});
}

// Joints marked sore in today's check-in.
export const soreToday=()=>{const c=todayCheckin();return c&&Array.isArray(c.sore)?c.sore:[];};
// Muscles still recovering, most worked first: [{key, name, f}].
export function recovering(now){
  const f=fatigueByMuscle(state.sessions,now||Date.now());
  return MUSCLES.map(m=>({key:m[0],name:m[1],f:f[m[0]]})).filter(x=>x.f>=0.6).sort((a,b)=>b.f-a.f);
}
// One line for the hero: what is still recovering, and what is sore.
export function bodyLine(){
  const r=recovering(),s=soreToday(),bits=[];
  if(r.length)bits.push("Still recovering: "+r.slice(0,3).map(x=>x.name.toLowerCase()).join(", "));
  if(s.length)bits.push("Sore: "+s.map(k=>JOINT_NAME[k].toLowerCase()).join(", "));
  return bits.join(" &middot; ");
}

// The check-in form, as a sheet. Defaults come from yesterday so a usual night is two taps.
export function checkinSheet(){
  const d=state.checkinDraft;if(!d)return "";
  const hrs=sleepHours(d.bed,d.wake);
  return "<div class='overlay' id='ciback'><div class='sheet actionsheet cisheet'>"+
    "<div class='sheethead'><div class='plabel'>How are you this morning?</div><button class='btn ghost tiny' id='ciclose'>Close</button></div>"+
    "<div class='sheetbody'>"+
    Q.map(([k,l,words])=>"<div class='cirow'><span class='cilbl'>"+l+"</span><div class='ciopts'>"+words.map((w,i)=>
      "<button class='ciopt"+(d[k]===i+1?" on":"")+"' data-ci='"+k+":"+(i+1)+"'>"+w+"</button>").join("")+"</div></div>").join("")+
    "<div class='cirow cisleep'><span class='cilbl'>Slept</span><label>Bed <input type='time' id='cibed' value='"+esc(d.bed||"")+"'></label>"+
      "<label>Up <input type='time' id='ciwake' value='"+esc(d.wake||"")+"'></label><span class='cihrs mono' id='cihrs'>"+(hrs?hrs+" h":"")+"</span></div>"+
    "<div class='cirow'><span class='cilbl'>Run down</span><div class='ciopts two'>"+[[0,"No"],[1,"Yes, feeling ill or run down"]].map(([v,l])=>
      "<button class='ciopt"+((d.rundown?1:0)===v?" on":"")+"' data-ci='rundown:"+v+"'>"+l+"</button>").join("")+"</div></div>"+
    "<div class='cirow'><span class='cilbl'>Sore</span><div class='ciopts wrap'>"+JOINTS.map(([k,l])=>
      "<button class='ciopt"+((d.sore||[]).indexOf(k)>=0?" on":"")+"' data-cisore='"+k+"'>"+l+"</button>").join("")+"</div></div>"+
    "<button class='btn primary pbig' id='cisave'"+(Q.every(([k])=>d[k])?"":" disabled")+">Done</button>"+
    "<p class='pnote'>Four ratings after Hooper and Mackinnon's athlete questionnaire. Your readiness comes from these, your training load and your sleep.</p>"+
    "</div></div></div>";
}

// Home: today's band, or the invitation to check in. Small on purpose.
export function readinessCard(){
  if(!state.settings.checkin)return "";
  const r=readinessNow(),c=todayCheckin();
  if(!c)return "<button class='card rcard ask' id='cistart'><span class='rband'>"+icon("target","sm")+"</span><span class='rbody'><b>Morning check-in</b><span>30 seconds: sleep, soreness, energy, stress</span></span><span class='lchev'>&rsaquo;</span></button>";
  // Once today's is in, it shrinks to one line; a tap opens it again to change.
  if(!r.band)return "<button class='rslim' id='cistart'><span class='rtick'>&#10003;</span><span class='rslimt'><b>Checked in</b> &middot; your readiness shows after "+Math.max(1,7-state.checkins.filter(isRated).length)+" more</span><span class='rslime'>Edit</span></button>";
  const adv=suggestion(r.rundown?"rundown":r.band,r.planned);
  return "<button class='rslim "+r.band+"' id='cistart' title='"+esc(r.why+". "+adv)+"'><span class='rdot'></span><span class='rslimt'><b>"+(r.rundown?"Run down":BAND_LABEL[r.band])+"</b> &middot; "+esc(adv)+"</span><span class='rslime'>Edit</span></button>";
}

// The last 14 mornings: each a mark coloured by how that check-in read, run down marked apart.
export function readinessStrip(){
  const now=new Date();now.setHours(12,0,0,0);
  let h="";
  for(let i=13;i>=0;i--){
    const d=new Date(now);d.setDate(d.getDate()-i);
    const c=state.checkins.find(x=>dateKey(x.at)===dateKey(d.toISOString()));
    let cls="",tip=d.toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});
    if(c&&isRated(c)){const hooper=c.sleep+c.soreness+c.fatigue+c.stress,s=100-((hooper-4)/16)*60-(c.hours&&c.hours<6?10:0);
      cls=c.rundown?"rd":s<45?"rc":s<65?"ez":s<85?"rdy":"ps";
      tip+=": "+(c.rundown?"run down":({rc:"recover",ez:"easy",rdy:"ready",ps:"push"})[cls])+(c.hours?", slept "+c.hours+" h":"")+(c.sore&&c.sore.length?", sore "+c.sore.join(", "):"");}
    h+="<i class='"+cls+"' title='"+esc(tip)+"'></i>";
  }
  return "<div class='card hcard'><div class='hcardh'><span class='llabel'>Last 14 mornings</span><button class='hmore' id='checkinscsv'>CSV &rsaquo;</button></div>"+
    "<div class='rstrip'>"+h+"</div><div class='rkey'><span><i class='ps'></i>push</span><span><i class='rdy'></i>ready</span><span><i class='ez'></i>easy</span><span><i class='rc'></i>recover</span><span><i class='rd'></i>run down</span></div></div>";
}
// Progress: load and sleep as two small cards side by side.
export function recoverMini(){
  if(!state.settings.checkin||!state.checkins.length)return "";
  const r=readinessNow(),a=acwr(r.loads),s=r.sleep;
  const word=a.ratio>1.5?"Spike":a.ratio>1.3?"High":a.ratio<0.8&&a.chronic?"Light":"Steady";
  const need=state.settings.sleepNeed||8;
  return "<div class='pgmini'>"+
    "<div class='card hcard'><div class='hcardh'><span class='llabel'>Load</span></div><b class='pgbig'>"+word+(a.ratio?"<small> &middot; "+a.ratio.toFixed(2)+"</small>":"")+"</b><span class='pgsub'>"+a.acute+" this week vs "+a.chronic+" lately</span></div>"+
    "<div class='card hcard'><div class='hcardh'><span class='llabel'>Sleep</span></div>"+(s.nights?"<b class='pgbig'>"+s.avg+"<small> h</small></b><span class='pgsub'>"+s.nights+" nights &middot; "+(s.debt?s.debt+" h sleep debt":"no sleep debt")+"</span>":
      "<b class='pgbig'>&mdash;</b><span class='pgsub'>No nights logged</span>")+"</div></div>"+readinessStrip();
}
export function recoverSection(){
  if(!state.settings.checkin||!state.checkins.length)return "";
  const r=readinessNow(),a=acwr(r.loads),s=r.sleep;
  const ratioWord=a.ratio>1.5?"spike: ease off":a.ratio>1.3?"high: watch it":a.ratio<0.8&&a.chronic?"light week":"steady";
  return "<div class='setgroup'>Recovery</div><div class='card chartcard recov'>"+
    "<div class='recrow'><span class='recl'>This week's load</span><span class='recv mono'>"+a.acute+"</span><span class='recs'>vs "+a.chronic+" a week lately &middot; "+ratioWord+"</span></div>"+
    (s.nights?"<div class='recrow'><span class='recl'>Sleep, 14 nights</span><span class='recv mono'>"+s.avg+" h</span><span class='recs'>"+(s.debt?s.debt+" h short of "+(state.settings.sleepNeed||8)+" h":"no debt")+
      (s.regularMin!=null?" &middot; bedtime varies "+(s.regularMin<30?"little":s.regularMin<60?"by about an hour":"a lot"):"")+"</span></div>":"")+
    "<div class='recrow'><span class='recl'>Check-ins</span><span class='recv mono'>"+state.checkins.filter(isRated).length+"</span><span class='recs'>"+(state.checkins.filter(isRated).length<7?"readiness shows after "+(7-state.checkins.filter(isRated).length)+" more":"readiness on")+"</span></div>"+
    "<p class='pnote'>Load is session RPE × minutes (reps × RPE for lifting), compared week to month. The formulas are in Learn.</p></div>";
}
