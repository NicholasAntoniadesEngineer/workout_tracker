// Fuel, Markers and Mind: three small pages behind one view, each switched on from You and
// each one layer deep. Fuel is protein first; Markers is a short list with ranges; Mind is a
// breath or prayer timer, a few habits and a line on the day.
import {state} from "../store.js";
import {dateKey,nowISO,shortDate} from "../model.js";
import {STARTERS,fastingHours,frequent,proteinTarget,totalsOf} from "../fuel.js";
import {MARKERS,flagOf,series} from "../markers.js";
import {icon} from "../icons.js";
import {esc,pageHead,wide} from "./common.js";
import {asProgressTab,progressTop} from "./progress.js";

const todayK=()=>dateKey(nowISO());
const todays=()=>(state.fuel||[]).filter(e=>dateKey(e.at)===todayK());
const lastWeight=()=>{const b=state.body.filter(x=>x.w);return b.length?b[b.length-1].w:0;};
const kg=w=>state.settings.unit==="lb"?w*0.45359237:w;

// ── Fuel ──────────────────────────────────────────────────────────────────────────────
export function fuelSection(){
  const t=totalsOf(todays()),target=proteinTarget(kg(lastWeight()),state.settings.goal||"lift");
  const pct=target?Math.min(100,Math.round(t.p/target*100)):0;
  const fast=fastingHours(state.fuel||[],Date.now()),win=+state.settings.fastHours||0;
  const quick=frequent(state.fuel||[],8),starters=quick.length>=6?[]:STARTERS.filter(s=>!quick.some(q=>q.name===s.name)).slice(0,8-quick.length);
  let h="<div class='card hcard'><div class='hcardh'><span class='llabel'>Protein today</span><button class='hmore' data-learnjump='h-protein'>Why &rsaquo;</button></div>"+
    "<div class='fuelbig'><b class='mono'>"+t.p+"</b> g"+(target?" of "+target+"<span class='fuelsub'> &middot; from "+Math.round(lastWeight())+" "+esc(state.settings.unit||"kg")+", "+({lift:"building",cut:"cutting",endure:"endurance",general:"general"}[state.settings.goal||"lift"])+"</span>":"<span class='fuelsub'> &middot; log a weigh-in for a target</span>")+"</div>"+
    (target?"<div class='csbar fuelbar'><span style='width:"+pct+"%'></span></div>":"")+
    (state.settings.fuelMacros?"<div class='fuelmac'><span><b class='mono'>"+t.kcal+"</b> kcal</span><span><b class='mono'>"+t.c+"</b> g carbs</span><span><b class='mono'>"+t.f+"</b> g fat</span></div>":"")+
    "<div class='llabel'>Add</div><div class='fuelquick'>"+quick.concat(starters).map(q=>"<button class='lchip' data-fueladd=\""+esc(q.name)+"\" data-p='"+(q.p||0)+"' data-kcal='"+(q.kcal||0)+"' data-c='"+(q.c||0)+"' data-f='"+(q.f||0)+"'>"+esc(q.name)+" <small>"+(q.p||0)+" g</small></button>").join("")+
    "<button class='lchip' id='fuelown'>+ Own item</button></div>"+
    (state.fuelDraft?"<div class='fuelform'><input class='timein' id='fuelname' placeholder='What' value='"+esc(state.fuelDraft.name||"")+"'><input class='timein mono' id='fuelp' inputmode='decimal' placeholder='Protein g'>"+
      (state.settings.fuelMacros?"<input class='timein mono' id='fuelkcal' inputmode='numeric' placeholder='kcal'><input class='timein mono' id='fuelc' inputmode='decimal' placeholder='Carbs g'><input class='timein mono' id='fuelf' inputmode='decimal' placeholder='Fat g'>":"")+
      "<button class='btn primary tiny' id='fuelsave'>Add</button><button class='btn ghost tiny' id='fuelcancel'>Cancel</button></div>":"")+
    "</div>";
  h+="<div class='card hcard'><div class='hcardh'><span class='llabel'>Water</span><span class='fuelsub'>"+t.water+" glasses</span></div>"+
    "<div class='fuelwater'>"+Array.from({length:8},(_,i)=>"<button class='drop"+(i<t.water?" on":"")+"' data-water='1' aria-label='A glass'>"+icon("drop","sm")+"</button>").join("")+
    "<button class='hmore' data-water='-1'>Undo</button></div><p class='pnote'>Drink to thirst; this is a count, not a target. <button class='hmore' data-learnjump='h-hydration'>Why &rsaquo;</button></p></div>";
  h+="<div class='card hcard'><div class='hcardh'><span class='llabel'>Fasting</span><button class='hmore' data-learnjump='h-fasting'>Why &rsaquo;</button></div>"+
    "<div class='fuelbig'><b class='mono'>"+(fast?fast+" h":"&mdash;")+"</b> since you last ate"+(win?"<span class='fuelsub'> &middot; "+(fast>=win?"window of "+win+" h done":(win-fast).toFixed(1)+" h to a "+win+" h window")+"</span>":"")+"</div>"+
    "<div class='lchips pgmeas'>"+[[0,"No window"],[12,"12 h"],[14,"14 h"],[16,"16 h"],[18,"18 h"]].map(([v,l])=>"<button class='lchip"+(win===v?" on":"")+"' data-set='fastHours' data-val='"+v+"'>"+l+"</button>").join("")+"</div></div>";
  const list=todays().filter(e=>!e.water).slice().reverse();
  if(list.length)h+="<div class='card hcard'><div class='llabel'>Today</div>"+list.map(e=>"<div class='fuelrow'><span>"+esc(e.name)+"</span><span class='mono'>"+(e.p||0)+" g"+(state.settings.fuelMacros&&e.kcal?" &middot; "+e.kcal+" kcal":"")+"</span>"+
    "<button class='dact del' data-delfuel='"+esc(e.id)+"' title='Remove'>&times;</button></div>").join("")+"</div>";
  return h;
}

// ── Markers ───────────────────────────────────────────────────────────────────────────
export function markersSection(){
  const r=state.markers||[],ed=state.markerDraft;
  let h="<div class='card hcard'><div class='hcardh'><span class='llabel'>Blood markers</span><button class='hmore' id='markeradd'>+ Reading</button></div>";
  if(ed)h+="<div class='fuelform markerform'><select class='trendsel' id='markerid'>"+MARKERS.map(m=>"<option value='"+m.id+"'"+(ed.id===m.id?" selected":"")+">"+esc(m.name)+" ("+esc(m.unit)+")</option>").join("")+"</select>"+
    "<input type='date' class='timein' id='markerdate' value='"+esc(ed.at||todayK())+"' max='"+todayK()+"'><input class='timein mono' id='markerv' inputmode='decimal' placeholder='Value'>"+
    "<button class='btn primary tiny' id='markersave'>Save</button><button class='btn ghost tiny' id='markercancel'>Cancel</button></div>";
  const have=MARKERS.filter(m=>r.some(x=>x.id===m.id));
  if(!have.length)h+="<div class='empty-note'>Type in a few numbers from a blood test and watch your own lines over the years. Nothing here is a diagnosis.</div>";
  have.forEach(m=>{
    const s=series(r,m.id),last=s[s.length-1],flag=flagOf(m,last.v);
    const lo=Math.min.apply(null,s.map(x=>x.v)),hi=Math.max.apply(null,s.map(x=>x.v));
    h+="<div class='mrow"+(flag&&flag!=="ok"?" off":"")+"'><div class='mhead'><span class='mname'>"+esc(m.name)+"</span>"+
      "<span class='mval mono'>"+last.v+" <small>"+esc(m.unit)+"</small></span><span class='mflag "+flag+"'>"+(flag==="ok"?"in range":flag)+"</span></div>"+
      "<div class='msub'>Usual "+m.lo+"–"+m.hi+" &middot; "+esc(shortDate(last.at))+(last.delta!=null?" &middot; "+(last.delta>0?"+":"")+last.delta+" since last":"")+(s.length>1?" &middot; "+s.length+" readings":"")+
      (m.note?" &middot; "+esc(m.note):"")+" <button class='hmore' data-learnjump='"+m.learn+"'>Read &rsaquo;</button></div>"+
      (s.length>1?"<div class='mspark'>"+s.map(x=>"<span title='"+esc(shortDate(x.at))+": "+x.v+"' style='height:"+(30+Math.round(70*(x.v-lo)/((hi-lo)||1)))+"%' class='"+flagOf(m,x.v)+"'></span>").join("")+"</div>":"")+
      "<button class='dact del mdel' data-delmarker='"+esc(last.key)+"' title='Remove this reading'>&times;</button></div>";
  });
  return h+"</div>";
}

// ── Mind ──────────────────────────────────────────────────────────────────────────────
const BREATHS=[["box","Box breathing","4 in · 4 hold · 4 out · 4 hold",[4,4,4,4]],["sigh","Physiological sigh","Two in through the nose, long out",[2,0,6,0]],
  ["478","4-7-8","4 in · 7 hold · 8 out",[4,7,8,0]],["prayer","Prayer","A quiet count, nothing else",[0,0,0,0]]];
export function mindSection(){
  const t=state.breath,habits=state.habits||[],done=state.habitDone||{},k=todayK(),todayDone=done[k]||[];
  let h="<div class='card hcard'><div class='hcardh'><span class='llabel'>Breathe or pray</span><button class='hmore' data-learnjump='h-breathing'>Why &rsaquo;</button></div>";
  if(t&&t.running){
    const el=Math.max(0,Math.round((Date.now()-t.startedAt)/1000)),left=Math.max(0,t.secs-el);
    h+="<div class='breathlive'><span class='breathword' id='breathword'>"+esc(breathWord(t,el))+"</span><span class='mono breathleft' id='breathleft'>"+fmt(left)+"</span>"+
      "<button class='btn ghost' id='breathstop'>"+(left?"Stop":"Done")+"</button></div>";
  }else{
    h+="<div class='lchips pgmeas'>"+BREATHS.map(([id,n])=>"<button class='lchip"+((state.breathKind||"box")===id?" on":"")+"' data-breath='"+id+"'>"+n+"</button>").join("")+"</div>"+
      "<div class='fuelsub'>"+esc((BREATHS.find(b=>b[0]===(state.breathKind||"box"))||BREATHS[0])[2])+"</div>"+
      "<div class='lchips pgmeas'>"+[2,5,10].map(m=>"<button class='lchip"+((state.breathMins||5)===m?" on":"")+"' data-breathmins='"+m+"'>"+m+" min</button>").join("")+
      "<button class='btn primary tiny' id='breathstart'>Start</button></div>";
  }
  h+="</div>";
  h+="<div class='card hcard'><div class='hcardh'><span class='llabel'>Habits</span>"+(habits.length<8?"<button class='hmore' id='habitadd'>+ Habit</button>":"")+"</div>";
  if(state.habitDraft)h+="<div class='fuelform'><input class='timein' id='habitname' placeholder='Read, walk, pray, no phone in bed…'><button class='btn primary tiny' id='habitsave'>Add</button><button class='btn ghost tiny' id='habitcancel'>Cancel</button></div>";
  if(!habits.length)h+="<div class='empty-note'>Up to eight. A tap marks today; there are no streaks to lose.</div>";
  h+="<div class='habits'>"+habits.map(x=>"<button class='habit"+(todayDone.indexOf(x)>=0?" on":"")+"' data-habit=\""+esc(x)+"\"><span class='hdot'></span>"+esc(x)+
    "<i class='x' data-delhabit=\""+esc(x)+"\" title='Remove'>&times;</i></button>").join("")+"</div></div>";
  const j=(state.journal||{})[k]||"";
  h+="<div class='card hcard'><div class='llabel'>A line on the day</div><input class='timein journal' id='journal' maxlength='240' placeholder='One line, if you like' value='"+esc(j)+"'></div>";
  return h;
}
const fmt=s=>Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
function breathWord(t,el){
  const b=BREATHS.find(x=>x[0]===t.kind)||BREATHS[0],ph=b[3],total=ph.reduce((a,x)=>a+x,0);
  if(!total)return "Breathe";
  let p=el%total,i=0;while(p>=ph[i]){p-=ph[i];i++;}
  return [ "In","Hold","Out","Hold"][i]+(ph[i]?" "+(ph[i]-p):"");
}
export function breathTick(){
  const t=state.breath;if(!t||!t.running)return;
  const el=Math.round((Date.now()-t.startedAt)/1000),left=Math.max(0,t.secs-el);
  const w=document.getElementById("breathword"),l=document.getElementById("breathleft");
  if(w)w.textContent=breathWord(t,el);if(l)l.textContent=fmt(left);
  if(!left){t.running=false;import("../sensors.js").then(m=>m.cue("done"));}
}

export function healthView(){
  const part=state.healthPart||"fuel";
  const parts=[["fuel","Fuel",!!state.settings.modFuel],["markers","Markers",!!state.settings.modMarkers],["mind","Mind",!!state.settings.modMind]].filter(p=>p[2]);
  const cur=parts.some(p=>p[0]===part)?part:(parts[0]||["fuel"])[0];
  const tabbed=asProgressTab();
  let h="<div class='wrap scroll healthwrap'>"+(tabbed?progressTop(cur):pageHead({fuel:"Fuel",markers:"Markers",mind:"Mind"}[cur],"",wide()?"Progress":""));
  // As a Progress tab, the tabs above already switch between Fuel, Markers and Mind.
  if(parts.length>1&&!tabbed)h+="<div class='cseg'>"+parts.map(([k,l])=>"<button class='"+(k===cur?"on":"")+"' data-health='"+k+"'>"+l+"</button>").join("")+"</div>";
  if(!parts.length)return h+"<div class='empty-note'>Switch Fuel, Markers or Mind on in Settings to use them here.</div></div>";
  h+=cur==="fuel"?fuelSection():cur==="markers"?markersSection():mindSection();
  return h+"</div>";
}
