// Cardio screens: choose an activity and a timer, then the live session — a countdown ring for
// the phase, round marks, and GPS and heart-rate tiles — and a summary with splits, zones and
// the route, ready to save to History. Watch files (GPX, TCX) open straight into the summary.
import {MODES,PRESETS,ZONES,fmtPace,hrStats,phaseAt,phases,recentPace,routePath,totalSecs,trackStats,zoneOf} from "../cardio.js";
import {gpsSupported,hrSupported} from "../sensors.js";
import {fmtClock} from "../model.js";
import {state} from "../store.js";
import {icon} from "../icons.js";
import {esc} from "./common.js";

export const ACTIVITIES=[["run","Run","Running"],["ride","Ride","Cycling"],["walk","Walk","Walking"],["row","Row","Rowing"],
  ["swim","Swim","Swimming"],["other","Other","Conditioning"]];
const actName=a=>(ACTIVITIES.find(x=>x[0]===a)||ACTIVITIES[0])[1];
const miles=()=>state.settings.unit==="lb";
const distStr=m=>miles()?(m/1609.344).toFixed(2)+" mi":(m/1000).toFixed(2)+" km";
const perM=()=>miles()?1609.344:1000;
const clock=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;
  return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0");};
export function elapsedOf(c,now){
  if(!c||!c.startedAt)return 0;
  const end=c.pauseAt||now||Date.now();
  return Math.max(0,(end-c.startedAt-(c.pausedMs||0))/1000);
}

function setupView(){
  if(!state.cardioSetup)state.cardioSetup={activity:"run",preset:"open",o:{},gps:true};
  const c=state.cardioSetup;
  const preset=PRESETS.find(p=>p.id===c.preset)||PRESETS[0];
  let h="<div class='wrap scroll lcatpage'><button class='backbtn' id='cardioback'>"+icon("back","sm")+"Back</button>"+
    "<div class='lcatn' style='margin-top:14px'>Cardio</div>"+
    "<div class='lcatstats'>Time it, track it with GPS and heart rate, or bring in a watch workout</div>"+
    "<div class='llabel'>Activity</div><div class='pdays'>"+ACTIVITIES.map(([k,l])=>"<button class='pday"+(c.activity===k?" on":"")+"' data-cardioact='"+k+"'>"+l+"</button>").join("")+"</div>"+
    "<div class='llabel'>Timer</div><div class='cpresets'>"+PRESETS.map(p=>"<button class='cpreset"+(p.id===c.preset?" on":"")+"' data-cardiopreset='"+p.id+"'>"+
      "<span class='cpn'>"+esc(p.name)+"</span><span class='cps'>"+esc(p.note)+"</span></button>").join("")+"</div>";
  // Adjust the chosen timer's numbers.
  const f=MODES[preset.mode].fields;
  if(f.length){
    h+="<div class='cfields'>"+f.map(k=>{
      const v=c.o[k],lab={work:"Work",rest:"Rest",rounds:"Rounds",minutes:"Minutes"}[k];
      const shown=k==="work"||k==="rest"?fmtClock(v):v;
      return "<div class='cfield'><span class='cfl'>"+lab+"</span><span class='cfv'><button data-cardiostep='"+k+":-1' aria-label='Less'>&minus;</button>"+
        "<b class='mono'>"+shown+"</b><button data-cardiostep='"+k+":1' aria-label='More'>+</button></span></div>";}).join("")+"</div>";
    const total=totalSecs(phases(preset.mode,c.o));
    if(total)h+="<p class='pnote'>"+clock(total)+" in total.</p>";
  }
  // Sensors: GPS outdoors, a heart-rate strap or watch over Bluetooth.
  h+="<div class='llabel'>Track</div>"+
    "<button class='ctoggle"+(c.gps?" on":"")+"' data-cardiogps='1'"+(gpsSupported()?"":" disabled")+"><span><b>GPS distance &amp; pace</b><span>Outdoors, with the app open and the screen on</span></span><span class='cdot'></span></button>"+
    (hrSupported()?"<button class='ctoggle"+(state.hrName?" on":"")+"' data-cardiohr='1'><span><b>"+(state.hrName?esc(state.hrName):"Heart-rate monitor")+"</b><span>"+(state.hrName?"Connected":"Chest strap or a watch broadcasting heart rate")+"</span></span><span class='cdot'></span></button>":
      "<div class='cnote'><b>Heart rate</b> &middot; Bluetooth straps connect in Chrome on Android and computers. On iPhone, record on your watch and import the file below.</div>")+
    "<div class='cfield'><span class='cfl'>Max heart rate</span><span class='cfv'><button data-cardiomax='-1' aria-label='Lower'>&minus;</button><b class='mono'>"+(state.settings.maxHR||190)+"</b><button data-cardiomax='1' aria-label='Higher'>+</button></span></div>"+
    "<button class='btn primary pbig' data-cardiostart='1'>Start "+esc(actName(c.activity).toLowerCase())+"</button>"+
    "<label class='btn ghost pbig cimport'>Import a watch workout (GPX, TCX)<input type='file' id='cardiofile' accept='.gpx,.tcx,application/gpx+xml,application/xml,text/xml' hidden></label>";
  return h+"</div>";
}

function liveView(){
  const c=state.cardio,el=elapsedOf(c),list=c.phases||[],at=phaseAt(list,el);
  const st=trackStats(c.track||[],perM()),pace=recentPace(c.track||[],30,perM()),bpm=c.hr&&c.hr.length?c.hr[c.hr.length-1].bpm:0;
  const max=state.settings.maxHR||190,z=zoneOf(bpm,max);
  const ph=at.phase,frac=ph?Math.min(1,at.into/ph.secs):1;
  const R=104,L=2*Math.PI*R;
  let h="<div class='wrap scroll lcatpage clive'>"+
    "<div class='cliveTop'><span class='leyebrow'>"+esc(actName(c.activity))+(c.presetName?" &middot; "+esc(c.presetName):"")+"</span>"+
    (c.pauseAt?"<span class='pcardtag'>Paused</span>":"")+"</div>";
  if(list.length&&!at.done){
    h+="<div class='cring"+(ph.kind==="rest"?" rest":"")+"'><svg viewBox='0 0 240 240' aria-hidden='true'><circle cx='120' cy='120' r='"+R+"' class='cringbg'/>"+
      "<circle cx='120' cy='120' r='"+R+"' class='cringfg' stroke-dasharray='"+L.toFixed(1)+"' stroke-dashoffset='"+(L*(1-frac)).toFixed(1)+"'/></svg>"+
      "<div class='cringin'><span class='cringk'>"+esc(ph.label)+"</span><span class='cringt mono'>"+clock(at.left)+"</span>"+
      "<span class='cringn'>"+(list[at.i+1]?"then "+esc(list[at.i+1].label.toLowerCase())+" "+clock(list[at.i+1].secs):"last one")+"</span></div></div>"+
      "<div class='cmarks'>"+list.filter(p=>p.kind==="work").map((p,i)=>{const wi=list.slice(0,at.i+1).filter(x=>x.kind==="work").length-1;
        return "<span class='"+(i<wi||(i===wi&&ph.kind==="rest")?"on":i===wi?"cur":"")+"'></span>";}).join("")+"</div>";
  }else{
    h+="<div class='cbig'><span class='cringk'>"+(at.done?"Timer done":"Time")+"</span><span class='cringt mono'>"+clock(el)+"</span></div>";
  }
  h+="<div class='ctiles'>"+
    "<div class='ctile'><span class='ctv mono'>"+clock(el)+"</span><span class='ctl'>time</span></div>"+
    (c.gps?"<div class='ctile'><span class='ctv mono'>"+distStr(st.dist)+"</span><span class='ctl'>distance</span></div>"+
      "<div class='ctile'><span class='ctv mono'>"+fmtPace(pace)+"</span><span class='ctl'>pace /"+(miles()?"mi":"km")+"</span></div>":"")+
    (c.hrOn||bpm?"<div class='ctile hr z"+z+"'><span class='ctv mono'>"+(bpm||"–")+"</span><span class='ctl'>bpm"+(z?" &middot; zone "+z:"")+"</span></div>":"")+
    "</div>";
  if(c.gpsMsg)h+="<div class='cnote'>"+esc(c.gpsMsg)+"</div>";
  if(c.gps&&(c.track||[]).length>1)h+="<svg class='croute' viewBox='0 0 320 140' aria-label='Route so far'><path d='"+routePath(c.track,320,140)+"'/></svg>";
  h+="<div class='pacts'><button class='btn ghost' data-cardiopause='1'>"+(c.pauseAt?"Resume":"Pause")+"</button>"+
    (list.length&&!at.done?"<button class='btn ghost' data-cardioskip='1'>Skip</button>":"")+"</div>"+
    "<button class='btn primary pbig' data-cardiofinish='1'>Finish</button></div>";
  return h;
}

function summaryView(){
  const s=state.cardioDone,max=state.settings.maxHR||190;
  const st=trackStats(s.track||[],perM()),hs=hrStats(s.hr||[],max);
  const secs=s.secs||st.secs,pace=st.dist>50?secs/(st.dist/perM()):0;
  let h="<div class='wrap scroll lcatpage'><button class='backbtn' id='cardioback'>"+icon("back","sm")+"Back</button>"+
    "<div class='leyebrow' style='margin-top:14px'>"+(s.imported?"Imported workout":"Session done")+"</div>"+
    "<div class='lcatn'>"+esc(s.title)+"</div>"+
    "<div class='lstats' style='margin-top:10px'>"+
      "<div class='lstat'><span class='lstatv'>"+clock(secs)+"</span><span class='lstatl'>time</span></div>"+
      (st.dist?"<div class='lstat'><span class='lstatv'>"+distStr(st.dist)+"</span><span class='lstatl'>distance</span></div>"+
        "<div class='lstat'><span class='lstatv'>"+fmtPace(pace)+"</span><span class='lstatl'>pace /"+(miles()?"mi":"km")+"</span></div>":
        (s.rounds?"<div class='lstat'><span class='lstatv'>"+s.rounds+"</span><span class='lstatl'>rounds</span></div>":""))+
    "</div>";
  if(hs.avg)h+="<div class='lstats' style='margin-top:8px'><div class='lstat'><span class='lstatv'>"+hs.avg+"</span><span class='lstatl'>avg bpm</span></div>"+
    "<div class='lstat'><span class='lstatv'>"+hs.max+"</span><span class='lstatl'>max bpm</span></div>"+
    (st.climb?"<div class='lstat'><span class='lstatv'>"+st.climb+" m</span><span class='lstatl'>climb</span></div>":"")+"</div>";
  if((s.track||[]).length>1)h+="<div class='llabel' style='margin-top:14px'>Route</div><svg class='croute big' viewBox='0 0 320 200' aria-label='Route'><path d='"+routePath(s.track,320,200)+"'/></svg>";
  if(st.splits.length){
    const best=Math.min(...st.splits.map(x=>x.secs));
    h+="<div class='llabel'>Splits</div><div class='csplits'>"+st.splits.map(x=>"<div class='csplit'><span class='mono'>"+x.n+"</span>"+
      "<span class='csbar'><span style='width:"+Math.round(best/x.secs*100)+"%'></span></span><span class='mono'>"+fmtPace(x.secs)+"</span></div>").join("")+"</div>";
  }
  if(hs.avg){
    const tot=hs.zones.reduce((a,b)=>a+b,0)||1;
    h+="<div class='llabel'>Time in zones &middot; max "+max+"</div><div class='czones'>"+ZONES.map(([lo,l],i)=>"<div class='czone z"+(i+1)+"'><span>"+l+"</span>"+
      "<span class='csbar'><span style='width:"+Math.round(hs.zones[i]/tot*100)+"%'></span></span><span class='mono'>"+clock(hs.zones[i])+"</span></div>").join("")+"</div>";
  }
  h+="<button class='btn primary pbig' data-cardiosave='1'>Save to History</button>"+
    "<button class='btn ghost pbig' data-cardiodiscard='1'>Discard</button>";
  return h+"</div>";
}

export function cardioView(){
  if(state.cardioDone)return summaryView();
  if(state.cardio)return liveView();
  return setupView();
}
