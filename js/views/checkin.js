// The morning check-in and the readiness card. Thirty seconds: four ratings and when you slept.
// The card says one word, why, and what to do about today's plan. Shown only once the check-in
// is on in Settings; the band appears after a week of check-ins, never sooner.
import {state,todayCheckin} from "../store.js";
import {dateKey,nowISO} from "../model.js";
import {BAND_LABEL,acwr,dailyLoads,readiness,sleepHours,sleepSummary,suggestion,baselineOf} from "../ready.js";
import {position} from "../programme.js";
import {icon} from "../icons.js";
import {esc} from "./common.js";

const Q=[["sleep","Sleep",["Great","Good","OK","Poor","Bad"]],["soreness","Soreness",["None","Slight","Some","Sore","Very"]],
  ["fatigue","Energy",["Fresh","Good","OK","Tired","Flat"]],["stress","Stress",["Calm","Fine","Some","High","Very"]]];

export function readinessNow(){
  const c=todayCheckin(),now=Date.now();
  const loads=dailyLoads(state.sessions,28,now);
  const v=state.vitals[state.vitals.length-1],fresh=v&&dateKey(v.at)===dateKey(nowISO())?v:null;
  const r=readiness({checkin:c,loads28:loads,count:state.checkins.length,hrv:fresh&&fresh.hrv,rhr:fresh&&fresh.rhr,baseline:baselineOf(state.vitals,now)});
  const p=state.programme,planned=p&&!p.paused?position(p,state.sessions).dayName:"";
  return Object.assign(r,{planned,loads,sleep:sleepSummary(state.checkins,state.settings.sleepNeed||8,now)});
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
    "<button class='btn primary pbig' id='cisave'"+(Q.every(([k])=>d[k])?"":" disabled")+">Done</button>"+
    "<p class='pnote'>Four ratings after Hooper and Mackinnon's athlete questionnaire. Your readiness comes from these, your training load and your sleep.</p>"+
    "</div></div></div>";
}

// Home: today's band, or the invitation to check in. Small on purpose.
export function readinessCard(){
  if(!state.settings.checkin)return "";
  const r=readinessNow(),c=todayCheckin();
  if(!c)return "<button class='card rcard ask' id='cistart'><span class='rband'>"+icon("target","sm")+"</span><span class='rbody'><b>Morning check-in</b><span>30 seconds: sleep, soreness, energy, stress</span></span><span class='lchev'>&rsaquo;</span></button>";
  if(!r.band)return "<div class='card rcard'><span class='rband'>"+icon("target","sm")+"</span><span class='rbody'><b>Checked in</b><span>"+esc(r.why)+" &middot; "+state.checkins.length+" of 7</span></span>"+
    "<button class='hmore' id='cistart'>Edit</button></div>";
  return "<div class='card rcard "+r.band+"'><span class='rband'><b>"+BAND_LABEL[r.band]+"</b></span><span class='rbody'><b>"+esc(r.why)+"</b>"+
    "<span>"+esc(suggestion(r.band,r.planned))+"</span></span><button class='hmore' id='cistart'>Edit</button></div>";
}

// Progress: sleep and load, in two small cards with plain labels.
export function recoverSection(){
  if(!state.settings.checkin||!state.checkins.length)return "";
  const r=readinessNow(),a=acwr(r.loads),s=r.sleep;
  const ratioWord=a.ratio>1.5?"spike: ease off":a.ratio>1.3?"high: watch it":a.ratio<0.8&&a.chronic?"light week":"steady";
  return "<div class='setgroup'>Recovery</div><div class='card chartcard recov'>"+
    "<div class='recrow'><span class='recl'>This week's load</span><span class='recv mono'>"+a.acute+"</span><span class='recs'>vs "+a.chronic+" a week lately &middot; "+ratioWord+"</span></div>"+
    (s.nights?"<div class='recrow'><span class='recl'>Sleep, 14 nights</span><span class='recv mono'>"+s.avg+" h</span><span class='recs'>"+(s.debt?s.debt+" h short of "+(state.settings.sleepNeed||8)+" h":"no debt")+
      (s.regularMin!=null?" &middot; bedtime varies "+(s.regularMin<30?"little":s.regularMin<60?"by about an hour":"a lot"):"")+"</span></div>":"")+
    "<div class='recrow'><span class='recl'>Check-ins</span><span class='recv mono'>"+state.checkins.length+"</span><span class='recs'>"+(state.checkins.length<7?"readiness shows after 7":"readiness on")+"</span></div>"+
    "<p class='pnote'>Load is session RPE × minutes (reps × RPE for lifting), compared week to month. The formulas are in Learn.</p></div>";
}
