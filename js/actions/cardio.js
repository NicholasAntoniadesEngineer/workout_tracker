// Cardio: set up a session, run it (timer, GPS, heart rate), finish, save to History or discard,
// and open a workout recorded on a watch. A live session is kept on the device as it runs, so
// a reload or a dropped app picks it up where it was.
import {state,addToCatalog} from "../store.js";
import {makeExercise,makeSession,nowISO,normSet} from "../model.js";
import {PRESETS,haversine,hrStats,parseWorkoutFile,lapSpeech,phaseAt,phaseSpeech,phases,splitSpeech,thin,trackStats} from "../cardio.js";
import {isFit,parseFit,unzipWorkout} from "../fit.js";
import {connectHeartRate,cue,gpsPermission,keepAwake,primeAudio,say,startGps,stopGps,stopWarm,warmGps} from "../sensors.js";
import {ACTIVITIES,elapsedOf,gpsLine} from "../views/cardio.js";

const LIVE_KEY="kk_cardio";
let ticker=null,repaint=()=>{};
const save=()=>{try{localStorage.setItem(LIVE_KEY,JSON.stringify(state.cardio));}catch(e){}};
const clear=()=>{try{localStorage.removeItem(LIVE_KEY);}catch(e){}};
const exName=a=>(ACTIVITIES.find(x=>x[0]===a)||ACTIVITIES[0])[2];
const STEP={work:15,rest:15,rounds:1,minutes:5};

export function openCardio(opts){
  const pre=PRESETS.find(p=>p.id===(opts&&opts.preset))||PRESETS.find(p=>p.id==="open");
  state.cardioSetup={activity:(opts&&opts.activity)||"run",preset:pre.id,o:Object.assign({},pre.o),gps:false,
    wantGps:(!opts||opts.gps!==false)&&OUTDOOR.indexOf((opts&&opts.activity)||"run")>=0};
  state.cardioDone=null;state.cardioTab=null;state.view="cardio";state.scrollTo=0;
}
const OUTDOOR=["run","ride","walk"];
// Said on Start (which also unlocks speech on iPhone): the first phase, or just "Go".
function p0Speech(s){
  const p=PRESETS.find(x=>x.id===s.preset)||PRESETS[0],list=phases(p.mode,s.o);
  return list.length?phaseSpeech(list[0]):"Go.";
}

// GPS on the setup screen. Already allowed: switch it on and let the signal settle. Not yet
// asked: leave it off, so the phone's prompt comes from a tap on the switch. Blocked: say so.
export function checkGps(render){
  const s=state.cardioSetup;if(!s)return;
  gpsPermission().then(p=>{
    if(state.cardioSetup!==s)return;
    if(p==="granted"&&s.wantGps){s.gps=true;warm(render);}
    else if(p==="denied")state.gpsLive={st:"denied"};
    else state.gpsLive=null;
    render();
  });
}
// Ask for location and watch the signal until Start. Accuracy updates go straight to the
// switch's line, so a tap on the screen is never lost to a repaint.
function warm(render){
  const s=state.cardioSetup;
  state.gpsLive={st:"asking"};
  warmGps(acc=>{
    if(state.cardioSetup!==s)return;
    const was=state.gpsLive||{},good=a=>a<=20;
    state.gpsLive={st:"ok",acc};
    const line=document.getElementById("gpsline");
    if(line&&was.st==="ok"&&good(was.acc)===good(acc)){line.innerHTML=gpsLine(true);return;}
    render();
  },(why,code,msg)=>{
    if(state.cardioSetup!==s)return;
    // No fix yet keeps GPS on and waiting; blocked or switched off turns it back off.
    if(why==="nofix"&&(state.gpsLive||{}).acc)return;
    state.gpsLive={st:why,code,msg};
    if(why!=="nofix"){s.gps=false;stopWarm();}
    render();
  });
}

function tick(){
  const c=state.cardio;if(!c)return;
  const list=c.phases||[];
  if(list.length&&!c.pauseAt){
    const at=phaseAt(list,elapsedOf(c));
    if(at.i!==c.lastPhase){
      if(c.lastPhase>=0||at.i>0){cue(at.done?"done":at.phase.kind);if(state.settings.voice)say(phaseSpeech(at.phase,at.done));}
      c.lastPhase=at.i;save();
    }
  }
  if(state.view==="cardio")repaint();
}
function begin(render){
  repaint=render;clearInterval(ticker);ticker=setInterval(tick,1000);
  const c=state.cardio;
  if(c.gps)startGps(fix=>{if(state.cardio&&!state.cardio.pauseAt){onFix(state.cardio,fix);save();}},
    (msg,code,raw)=>{if(state.cardio){state.cardio.gpsMsg=msg+(code&&code!==3&&raw?" ("+raw+")":"");repaint();}},
    acc=>{state.gpsLive={st:"ok",acc};});
  keepAwake(true);
}
// Each kept fix: add the distance, and say the split when a kilometre (or mile) is crossed.
function onFix(c,fix){
  const prev=c.track[c.track.length-1];
  c.track.push(fix);c.gpsMsg="";
  if(!prev)return;
  c.dist=(c.dist||0)+haversine(prev,fix);
  const miles=state.settings.unit==="lb",per=miles?1609.344:1000,n=Math.floor(c.dist/per);
  if(n>(c.splitN||0)){
    const now=elapsedOf(c),secs=now-(c.splitAt||0);
    c.splitN=n;c.splitAt=now;
    if(state.settings.voice)say(splitSpeech(n,secs,miles));
  }
}
function halt(){clearInterval(ticker);ticker=null;stopGps();keepAwake(false);}

// After a reload: carry on with a session that was running.
export function resumeCardio(render){
  try{
    const c=JSON.parse(localStorage.getItem(LIVE_KEY)||"null");
    if(c&&c.startedAt&&Date.now()-c.startedAt<12*3600*1000){state.cardio=c;begin(render);}
    else clear();
  }catch(e){}
}
function onBpm(bpm){
  state.lastBpm=bpm;
  const c=state.cardio;
  if(c&&!c.pauseAt&&bpm>0){c.hr.push({t:Date.now(),bpm});if(c.hr.length%10===0)save();}
}

export function handle(t,ctx){
  if(t.closest&&t.closest("#homecardio,[data-cardioopen]")){
    const o=t.closest("[data-cardioopen]");
    openCardio(o?JSON.parse(o.getAttribute("data-cardioopen")||"{}"):null);checkGps(ctx.render);ctx.render();return true;
  }
  const s=state.cardioSetup;
  const act=t.closest&&t.closest("[data-cardioact]");
  if(act&&s){s.activity=act.getAttribute("data-cardioact");if(s.activity==="swim"&&s.gps){s.gps=false;stopWarm();state.gpsLive=null;}ctx.render();return true;}
  const pre=t.closest&&t.closest("[data-cardiopreset]");
  if(pre&&s){const p=PRESETS.find(x=>x.id===pre.getAttribute("data-cardiopreset"));s.preset=p.id;s.o=Object.assign({},p.o);ctx.render();return true;}
  const stp=t.closest&&t.closest("[data-cardiostep]");
  if(stp&&s){
    const [k,d]=stp.getAttribute("data-cardiostep").split(":");
    s.o[k]=Math.max(k==="rest"?0:1,(+s.o[k]||0)+STEP[k]*+d);ctx.render();return true;
  }
  if(t.closest&&t.closest("[data-cardiogps]")&&s){
    if(s.gps){s.gps=false;stopWarm();state.gpsLive=null;}
    else{s.gps=true;warm(ctx.render);}
    ctx.render();return true;
  }
  if(t.closest&&t.closest("[data-hrhow]")){state.hrHowOpen=!state.hrHowOpen;ctx.render();return true;}
  if(t.closest&&t.closest("[data-gpshow]")){state.gpsHowOpen=!state.gpsHowOpen;ctx.render();return true;}
  const tab=t.closest&&t.closest("[data-cardiotab]");
  if(tab){state.cardioTab=tab.getAttribute("data-cardiotab");ctx.render();return true;}
  if(t.closest&&t.closest("[data-cardiovoice]")){state.settings.voice=!state.settings.voice;ctx.render();return true;}
  const mx=t.closest&&t.closest("[data-cardiomax]");
  if(mx){state.settings.maxHR=Math.max(120,Math.min(230,(+state.settings.maxHR||190)+ +mx.getAttribute("data-cardiomax")));ctx.render();return true;}
  if(t.closest&&t.closest("[data-cardiohr]")){
    connectHeartRate(onBpm,(st,name)=>{state.hrName=st==="connected"?name:"";ctx.render();})
      .then(name=>{state.hrName=name;ctx.render();})
      .catch(()=>{state.hrName="";ctx.render();});
    return true;
  }
  if(t.closest&&t.closest("[data-cardiostart]")&&s){
    primeAudio();
    if(state.settings.voice)say(p0Speech(s));
    const p=PRESETS.find(x=>x.id===s.preset)||PRESETS[0];
    state.cardio={activity:s.activity,preset:p.id,presetName:p.id==="open"?"":p.name,mode:p.mode,o:s.o,
      phases:phases(p.mode,s.o),startedAt:Date.now(),pausedMs:0,pauseAt:null,track:[],hr:[],gps:!!s.gps,
      hrOn:!!state.hrName,lastPhase:-1,gpsMsg:s.gps?"Finding GPS…":""};
    if(!s.gps){stopWarm();state.gpsLive=null;}
    state.cardioSetup=null;save();begin(ctx.render);cue("work");ctx.render();return true;
  }
  const c=state.cardio;
  if(t.closest&&t.closest("[data-cardiopause]")&&c){
    if(c.pauseAt){c.pausedMs+=Date.now()-c.pauseAt;c.pauseAt=null;}else c.pauseAt=Date.now();
    save();ctx.render();return true;
  }
  if(t.closest&&t.closest("[data-cardiolap]")&&c&&!c.pauseAt){
    const now=Math.round(elapsedOf(c)),prev=(c.laps||[]).slice(-1)[0]||0;
    c.laps=(c.laps||[]).concat([now]);cue("rest");if(state.settings.voice)say(lapSpeech(c.laps.length,now-prev));
    save();ctx.render();return true;
  }
  if(t.closest&&t.closest("[data-cardioskip]")&&c){
    const at=phaseAt(c.phases,elapsedOf(c));
    if(!at.done){c.startedAt-=Math.ceil(at.left)*1000;}
    save();tick();ctx.render();return true;
  }
  if(t.closest&&t.closest("[data-cardiofinish]")&&c){
    halt();
    const secs=Math.round(elapsedOf(c)),done=c.phases.length?phaseAt(c.phases,secs):null;
    const rounds=done?c.phases.slice(0,done.i).filter(p=>p.kind==="work").length:0;
    const st=trackStats(c.track);
    const label=(ACTIVITIES.find(x=>x[0]===c.activity)||ACTIVITIES[0])[1];
    state.cardioDone={activity:c.activity,title:label+(st.dist>50?" · "+(st.dist/1000).toFixed(1)+" km":c.presetName?" · "+c.presetName:""),
      secs,track:c.track,hr:c.hr,rounds,laps:c.laps||[],preset:c.presetName,created:new Date(c.startedAt).toISOString()};
    state.cardio=null;state.gpsLive=null;state.cardioTab=null;clear();ctx.render();return true;
  }
  const d=state.cardioDone;
  if(t.closest&&t.closest("[data-cardiosave]")&&d){
    state.sessions.push(cardioSession(d));state.cardioDone=null;state.view="history";state.scrollTo=0;ctx.render();return true;
  }
  if(t.closest&&t.closest("[data-cardiodiscard]")&&d){
    if(confirm("Discard this session? It won't be saved.")){state.cardioDone=null;openCardio();checkGps(ctx.render);}
    ctx.render();return true;
  }
  if(t.closest&&t.closest("#cardioback")){
    if(state.cardioDone&&!confirm("Leave without saving this session?")){return true;}
    stopWarm();state.gpsLive=null;
    state.cardioDone=null;state.cardioSetup=null;state.view="home";ctx.render();return true;
  }
  return false;
}

// A finished (or imported) cardio session as a History day: one exercise carrying the distance
// or time, and the summary — splits, climb, heart rate, a thinned route — for History and
// Progress. A bulk import passes fewer route points to keep storage small. A source that only
// gives totals (Apple Health, a Strava row without a file) passes dist and hr instead of samples.
export function cardioSession(d,opt){
  const o=opt||{},max=state.settings.maxHR||190;
  const ses=makeSession(),st=trackStats(d.track||[]),hs=d.hr&&d.hr.length?hrStats(d.hr,max):(d.hrSum||{avg:0,max:0});
  if(!st.dist&&d.distM)st.dist=d.distM;
  if(!st.climb&&d.climbM)st.climb=d.climbM;
  ses.created=d.created||nowISO();ses.started=ses.created;ses.ended=new Date(Date.parse(ses.created)+d.secs*1000).toISOString();
  ses.running=false;
  ses.title=d.title;
  const name=exName(d.activity);addToCatalog(name);
  const e=makeExercise(name);
  const set=normSet({r:st.dist>50?st.dist:d.secs,t:d.secs,at:ses.ended});
  if(st.dist>50){e.dist=true;e.timed=false;}else{e.timed=true;e.dist=false;}
  if(hs.avg)set.hr=hs.avg;
  e.sets.push(set);ses.ex.push(e);
  ses.cardio={activity:d.activity,secs:d.secs,dist:st.dist,climb:st.climb,splits:st.splits,rounds:d.rounds||0,laps:d.laps&&d.laps.length?d.laps.map((x,i,a)=>x-(a[i-1]||0)).concat([d.secs-d.laps[d.laps.length-1]]):[],preset:d.preset||"",
    hr:hs.avg?Object.assign({avg:hs.avg,max:hs.max,maxHR:max},hs.zones?{zones:hs.zones}:{}):null,
    track:thin(d.track||[],o.points||400).map(p=>[+p.lat.toFixed(5),+p.lon.toFixed(5)]),imported:!!d.imported};
  if(d.source)ses.cardio.source=d.source;
  return ses;
}

// A watch file opens in the summary, ready to save: GPX or TCX (text), FIT (binary, from Garmin,
// Wahoo, Coros, Suunto), or the .zip Garmin Connect's "Export original" hands over.
async function readWorkout(file){
  const buf=await file.arrayBuffer();
  let bytes=new Uint8Array(buf),name=file.name||"";
  if(/\.zip$/i.test(name)||(bytes[0]===0x50&&bytes[1]===0x4B)){const z=await unzipWorkout(buf);bytes=z.bytes;name=z.name;}
  if(isFit(bytes))return parseFit(bytes);
  return parseWorkoutFile(new TextDecoder().decode(bytes));
}
export function importWorkoutFile(file,render){
  if(!file)return;
  readWorkout(file).then(w=>{
    if(!w.track.length&&!w.hr.length&&!w.distM){alert("That file has no route, distance or heart rate in it.");return;}
    const sport=(w.sport||"").toLowerCase(),act=/bik|cycl|ride/.test(sport)?"ride":/walk|hik/.test(sport)?"walk":/swim/.test(sport)?"swim":/row/.test(sport)?"row":"run";
    const st=trackStats(w.track),label=(ACTIVITIES.find(x=>x[0]===act)||ACTIVITIES[0])[1];
    const dist=st.dist||w.distM||0;
    state.cardioDone={imported:true,activity:act,title:w.name||label+(dist>50?" · "+(dist/1000).toFixed(1)+" km":""),
      secs:w.secs,track:w.track,hr:w.hr,distM:w.distM||0,created:w.start?new Date(w.start).toISOString():nowISO()};
    state.cardioSetup=null;state.cardioTab=null;state.view="cardio";state.scrollTo=0;render();
  }).catch(()=>alert("KingsKiln couldn't read that file. FIT, GPX, TCX and Garmin's zipped exports work."));
}
