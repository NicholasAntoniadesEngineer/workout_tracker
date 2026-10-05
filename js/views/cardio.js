// Cardio screens: choose an activity and a timer, then the live session — a countdown ring for
// the phase, round marks, and GPS and heart-rate tiles — and a summary with splits, zones and
// the route, ready to save to History. Watch files (GPX, TCX) open straight into the summary.
import {MODES,PRESETS,ZONES,fmtPace,hrStats,phaseAt,phases,recentPace,routePath,totalSecs,trackStats,zoneOf} from "../cardio.js";
import {gpsSupported,hrSupported,voiceSupported} from "../sensors.js";
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

const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const isAndroid=()=>/Android/.test(navigator.userAgent);
const GOOD_ACC=20;
// The GPS switch's second line: what location is doing right now.
export function gpsLine(on){
  const g=state.gpsLive||{};
  if(!gpsSupported())return "Not on this device";
  if(!on)return g.st==="denied"?"Blocked":g.st==="off"?"Location is off":"Off: tap and allow location";
  if(g.acc)return (g.acc<=GOOD_ACC?"Ready":"Weak")+" &middot; &plusmn;"+Math.round(g.acc)+" m";
  return "Finding signal&hellip;";
}
// When location won't come, the way to switch it on for this phone.
// When location won't come: one short line, Try again, and the path to switch it on for this
// phone behind How. (A web page can't open the phone's Settings itself.)
function gpsHelp(st){
  if(st==="nofix")return {t:"No signal yet",path:"Step outside with a clear view of the sky"};
  const ios=isIOS(),and=isAndroid(),standalone=typeof matchMedia==="function"&&matchMedia("(display-mode: standalone)").matches;
  if(st==="off")return {t:"Location is off on this "+(ios||and?"phone":"device"),
    path:ios?"Settings › Privacy & Security › Location Services":and?"Swipe down from the top › Location":"Turn location on in the device's settings"};
  if(st==="denied")return {t:"Location is blocked",
    path:ios?"Settings › Privacy & Security › Location Services › Safari Websites › While Using the App":
      and?(standalone?"Hold the KingsKiln icon › App info › Permissions › Location › Allow":"Tap the icon left of the address › Permissions › Location › Allow"):
      "Click the icon left of the address › Location › Allow"};
  return null;
}
const stepper=(attr,v,lab)=>"<span class='cstepv'><button data-"+attr+"=':-1' aria-label='Less "+lab+"'>&minus;</button>"+
  "<b class='mono'>"+v+"</b><button data-"+attr+"=':1' aria-label='More "+lab+"'>+</button></span>";

function setupView(){
  if(!state.cardioSetup)state.cardioSetup={activity:"run",preset:"open",o:{},gps:false};
  const c=state.cardioSetup;
  const preset=PRESETS.find(p=>p.id===c.preset)||PRESETS[0];
  const f=MODES[preset.mode].fields,total=totalSecs(phases(preset.mode,c.o));
  const LAB={work:"Work",rest:"Rest",rounds:"Rounds",minutes:"Minutes"};
  let h="<div class='wrap scroll cscreen'>"+
    "<div class='chead'><button class='backbtn iconbtn' id='cardioback' aria-label='Back'>"+icon("back","sm")+"</button>"+
    "<span class='cheadt'>Cardio</span>"+
    "<label class='btn ghost tiny cimport'>Import file<input type='file' id='cardiofile' accept='.fit,.gpx,.tcx,.zip,.gz,.csv,.xml,application/gpx+xml,application/xml,text/xml,application/zip,text/csv,application/octet-stream' hidden></label></div>"+
    "<div class='cseg'>"+ACTIVITIES.map(([k,l])=>"<button class='"+(c.activity===k?"on":"")+"' data-cardioact='"+k+"'>"+l+"</button>").join("")+"</div>"+
    "<div class='cpresets'>"+PRESETS.map(p=>"<button class='cpreset"+(p.id===c.preset?" on":"")+"' data-cardiopreset='"+p.id+"'>"+esc(p.short)+"</button>").join("")+"</div>"+
    "<div class='cplan'><div class='cplann'><b>"+esc(preset.name)+"</b>"+(total?"<span class='mono'>"+clock(total)+"</span>":"")+"</div>"+
    "<div class='cplans'>"+esc(preset.note)+"</div>";
  // The chosen timer's numbers, side by side.
  if(f.length)h+="<div class='csteps' style='grid-template-columns:repeat("+f.length+",minmax(0,1fr))'>"+f.map(k=>{
    const v=k==="work"||k==="rest"?fmtClock(c.o[k]):c.o[k];
    return "<div class='cstep'><span class='cstepl'>"+LAB[k]+"</span><b class='mono cstepn'>"+v+"</b><span class='cstepb'>"+
      "<button data-cardiostep='"+k+":-1' aria-label='Less "+LAB[k].toLowerCase()+"'>&minus;</button>"+
      "<button data-cardiostep='"+k+":1' aria-label='More "+LAB[k].toLowerCase()+"'>+</button></span></div>";}).join("")+"</div>";
  h+="</div>";
  // Sensors: GPS outdoors, a heart-rate strap or watch over Bluetooth.
  const g=state.gpsLive||{},help=g.st&&g.st!=="ok"?gpsHelp(g.st):"";
  h+="<div class='ctrack'>"+
    "<button class='ctoggle"+(c.gps?" on":"")+(c.gps&&g.acc>GOOD_ACC?" weak":"")+"' data-cardiogps='1'"+(gpsSupported()?"":" disabled")+" aria-pressed='"+!!c.gps+"'>"+
      "<span><b>GPS</b><span id='gpsline'>"+gpsLine(c.gps)+"</span></span><span class='cdot'></span></button>"+
    (hrSupported()?"<button class='ctoggle"+(state.hrName?" on":"")+"' data-cardiohr='1' aria-pressed='"+!!state.hrName+"'><span><b>Heart rate</b><span>"+(state.hrName?esc(state.hrName):"Pair a strap or watch")+"</span></span><span class='cdot'></span></button>":
      "<div class='ctoggle dim'><span><b>Heart rate</b><span>Record on your watch, then Import file</span></span></div>")+
    "</div>"+
    (help?"<div class='cnote cwarn cgps'><span class='cgpst'><b>"+esc(help.t)+"</b>"+
      "<button class='cgpsb' data-gpshow='1' aria-expanded='"+!!state.gpsHowOpen+"'>How</button>"+
      "<button class='cgpsb' data-cardiogps='1'>Try again</button></span>"+
      (state.gpsHowOpen?"<span class='cgpsp'>"+esc(help.path)+"</span>":"")+"</div>":"")+
    (voiceSupported()?"<button class='cmaxhr cvoice' data-cardiovoice='1' aria-pressed='"+!!state.settings.voice+"'><span>Voice cues <span class='cmaxs'>"+
      (state.settings.voice?"Splits and interval changes, spoken":"Off")+"</span></span><span class='cswitch"+(state.settings.voice?" on":"")+"'></span></button>":"")+
    "<div class='cmaxhr'><span>Max heart rate <span class='cmaxs'>sets your zones</span></span>"+stepper("cardiomax",state.settings.maxHR||190,"maximum heart rate").replace(/data-cardiomax=':/g,"data-cardiomax='")+"</div>"+
    "<div class='cgrow'></div>"+
    "<button class='btn primary pbig cstart' data-cardiostart='1'>Start "+esc(actName(c.activity).toLowerCase())+"</button>";
  return h+"</div>";
}

// GPS signal for the live screen's corner: ready, weak, or still looking.
function gpsPill(c){
  if(!c.gps)return "";
  const acc=(state.gpsLive||{}).acc;
  return "<span class='cpill"+(acc&&acc<=GOOD_ACC?" ok":"")+"' id='gpspill'>GPS "+(acc?"&plusmn;"+Math.round(acc)+" m":"&hellip;")+"</span>";
}
function tile(v,unit,label,extra,cls){
  return "<div class='ctile"+(cls?" "+cls:"")+"'><span class='ctv mono'>"+v+(unit?"<small>"+unit+"</small>":"")+"</span><span class='ctl'>"+label+"</span>"+(extra||"")+"</div>";
}

function liveView(){
  const c=state.cardio,el=elapsedOf(c),list=c.phases||[],at=phaseAt(list,el);
  const st=trackStats(c.track||[],perM()),pace=recentPace(c.track||[],30,perM()),bpm=c.hr&&c.hr.length?c.hr[c.hr.length-1].bpm:0;
  const max=state.settings.maxHR||190,z=zoneOf(bpm,max),u=miles()?"mi":"km";
  const ph=at.phase,frac=ph?Math.min(1,at.into/ph.secs):1,timed=list.length&&!at.done;
  const R=104,L=2*Math.PI*R;
  let h="<div class='wrap scroll cscreen clive'>"+
    "<div class='chead'><span class='leyebrow'>"+esc(actName(c.activity))+(c.presetName?" &middot; "+esc(c.presetName):"")+"</span>"+
    "<span class='cpills'>"+(c.pauseAt?"<span class='cpill paused'>Paused</span>":"")+gpsPill(c)+"</span></div>";
  if(timed){
    h+="<div class='cring"+(ph.kind==="rest"?" rest":"")+"'><svg viewBox='0 0 240 240' aria-hidden='true'><circle cx='120' cy='120' r='"+R+"' class='cringbg'/>"+
      "<circle cx='120' cy='120' r='"+R+"' class='cringfg' stroke-dasharray='"+L.toFixed(1)+"' stroke-dashoffset='"+(L*(1-frac)).toFixed(1)+"'/></svg>"+
      "<div class='cringin'><span class='cringk'>"+esc(ph.label)+"</span><span class='cringt mono'>"+clock(at.left)+"</span>"+
      "<span class='cringn'>"+(list[at.i+1]?"then "+esc(list[at.i+1].label.toLowerCase())+" "+clock(list[at.i+1].secs):"last one")+"</span></div></div>";
    const works=list.filter(p=>p.kind==="work");
    if(works.length>1&&works.length<=24){
      const wi=list.slice(0,at.i+1).filter(x=>x.kind==="work").length-1;
      h+="<div class='cmarks'>"+works.map((p,i)=>"<span class='"+(i<wi||(i===wi&&ph.kind==="rest")?"on":i===wi?"cur":"")+"'></span>").join("")+"</div>";
    }
  }else{
    // An open clock, with the lap running under it once one has been marked.
    const laps=c.laps||[],last=laps.length?laps[laps.length-1]:0;
    h+="<div class='cbig"+(!c.gps&&!(c.hrOn||bpm)?" solo":"")+"'><span class='cringk'>"+(at.done?"Timer done":"Time")+"</span><span class='cringt mono'>"+clock(el)+"</span>"+
      (laps.length?"<span class='clap'>Lap "+(laps.length+1)+" <b class='mono'>"+clock(el-last)+"</b> &middot; last <b class='mono'>"+clock(last-(laps[laps.length-2]||0))+"</b></span>":"")+"</div>";
  }
  // The numbers that matter while moving; time joins them when the ring is counting a phase.
  const tiles=[];
  if(timed)tiles.push(tile(clock(el),"","total time"));
  if(c.gps){
    tiles.push(tile((st.dist/perM()).toFixed(2),u,"distance"));
    tiles.push(tile(fmtPace(pace),"/"+u,"pace"));
    if(!timed)tiles.push(tile(st.dist>50?fmtPace(el/(st.dist/perM())):"–","/"+u,"average"));
  }
  if(c.hrOn||bpm)tiles.push(tile(bpm||"–","",z?"bpm &middot; zone "+z:"bpm",
    "<span class='czbar'>"+[1,2,3,4,5].map(i=>"<span class='"+(i<=z?"on":"")+"'></span>").join("")+"</span>","hr z"+z));
  if(tiles.length)h+="<div class='ctiles c"+(tiles.length===4?2:tiles.length)+"'>"+tiles.join("")+"</div>";
  // The route fills whatever height is left; until GPS has a line, it says what it is waiting on.
  if(c.gps)h+="<div class='croutebox'>"+((c.track||[]).length>1?"<svg viewBox='0 0 320 200' aria-label='Route so far'><path d='"+routePath(c.track,320,200)+"'/></svg>":
    "<span>"+esc(c.gpsMsg||"Finding GPS…")+"</span>")+"</div>";
  else if(timed||c.hrOn||bpm)h+="<div class='cgrow'></div>";
  // Running: pause (and skip a phase). Paused or done: resume or finish, so a stray tap never ends a run.
  h+="<div class='cctl'>"+(c.pauseAt||at.done&&list.length?
      (c.pauseAt?"<button class='btn ghost' data-cardiopause='1'>Resume</button>":"")+"<button class='btn primary' data-cardiofinish='1'>Finish</button>":
      "<button class='btn primary' data-cardiopause='1'>Pause</button>"+(timed?"<button class='btn ghost' data-cardioskip='1'>Skip</button>":
        "<button class='btn ghost' data-cardiolap='1'>Lap</button>"))+
    "</div></div>";
  return h;
}

function summaryView(){
  const s=state.cardioDone,max=state.settings.maxHR||190;
  const st=trackStats(s.track||[],perM()),hs=hrStats(s.hr||[],max);
  if(!st.dist&&s.distM)st.dist=s.distM;   // a treadmill or pool file: distance without a route
  const secs=s.secs||st.secs,pace=st.dist>50?secs/(st.dist/perM()):0,u=miles()?"mi":"km";
  const stat=(v,l)=>"<div class='cstat'><span class='cstatv mono'>"+v+"</span><span class='cstatl'>"+l+"</span></div>";
  const stats=[stat(clock(secs),"time")];
  if(st.dist){stats.push(stat(distStr(st.dist),"distance"));stats.push(stat(fmtPace(pace),"pace /"+u));}
  else if(s.rounds)stats.push(stat(s.rounds,"rounds"));
  if(hs.avg){stats.push(stat(hs.avg,"avg bpm"));stats.push(stat(hs.max,"max bpm"));}
  if(st.climb)stats.push(stat(st.climb+" m","climb"));
  // Route, splits and zones share one panel, so the whole summary fits a screen.
  const tabs=[];
  if((s.track||[]).length>1)tabs.push(["route","Route"]);
  if(st.splits.length)tabs.push(["splits","Splits"]);
  const laps=(s.laps||[]).map((t,i,a)=>t-(a[i-1]||0));
  if(laps.length){laps.push(secs-(s.laps[s.laps.length-1]||0));tabs.push(["laps","Laps"]);}
  if(hs.avg)tabs.push(["zones","Zones"]);
  const tab=tabs.find(x=>x[0]===state.cardioTab)?state.cardioTab:(tabs[0]||[])[0];
  let h="<div class='wrap scroll cscreen'>"+
    "<div class='chead'><button class='backbtn iconbtn' id='cardioback' aria-label='Back'>"+icon("back","sm")+"</button>"+
    "<span class='cheadtt'><span class='leyebrow'>"+(s.imported?"Imported workout":"Session done")+"</span><span class='cheadt'>"+esc(s.title)+"</span></span></div>"+
    "<div class='cstats'>"+stats.join("")+"</div>";
  if(tabs.length>1)h+="<div class='cseg'>"+tabs.map(([k,l])=>"<button class='"+(k===tab?"on":"")+"' data-cardiotab='"+k+"'>"+l+"</button>").join("")+"</div>";
  if(tab==="route")h+="<div class='croutebox'><svg viewBox='0 0 320 220' aria-label='Route'><path d='"+routePath(s.track,320,220)+"'/></svg></div>";
  else if(tab==="splits"){
    const best=Math.min(...st.splits.map(x=>x.secs));
    h+="<div class='cpanel'><div class='csplits'>"+st.splits.map(x=>"<div class='csplit'><span class='mono'>"+x.n+"</span>"+
      "<span class='csbar'><span style='width:"+Math.round(best/x.secs*100)+"%'></span></span><span class='mono'>"+fmtPace(x.secs)+"</span></div>").join("")+"</div></div>";
  }else if(tab==="laps"){
    const pos=laps.filter(x=>x>0),best=pos.length?Math.min(...pos):1;
    h+="<div class='cpanel'><div class='csplits'>"+laps.map((x,i)=>"<div class='csplit'><span class='mono'>"+(i+1)+"</span>"+
      "<span class='csbar'><span style='width:"+Math.round(best/Math.max(1,x)*100)+"%'></span></span><span class='mono'>"+clock(x)+"</span></div>").join("")+"</div></div>";
  }else if(tab==="zones"){
    const tot=hs.zones.reduce((a,b)=>a+b,0)||1;
    h+="<div class='cpanel'><div class='cpanelk'>Max heart rate "+max+"</div><div class='czones'>"+ZONES.map(([lo,l],i)=>"<div class='czone z"+(i+1)+"'><span>"+l+"</span>"+
      "<span class='csbar'><span style='width:"+Math.round(hs.zones[i]/tot*100)+"%'></span></span><span class='mono'>"+clock(hs.zones[i])+"</span></div>").join("")+"</div></div>";
  }else h+="<div class='cgrow'></div>";
  h+="<div class='cctl'><button class='btn ghost' data-cardiodiscard='1'>Discard</button>"+
    "<button class='btn primary wide' data-cardiosave='1'>Save to History</button></div>";
  return h+"</div>";
}

export function cardioView(){
  if(state.cardioDone)return summaryView();
  if(state.cardio)return liveView();
  return setupView();
}
