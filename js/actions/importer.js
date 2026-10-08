// Bringing history in from other apps. One file input takes whatever they export — Strava's
// or Garmin's account archive, Apple Health's export.zip, a strength app's CSV, a single watch
// file — works out what it is, reads it on the device, and shows what it found before
// anything is saved. Every source becomes the same activity shape, so a later server sync
// (Strava, Garmin) can feed the same review and save.
import {state,addToCatalog,mergeSessions,upsertBodyEntry,upsertCheckin,upsertVital} from "../store.js";
import {dateKey} from "../model.js";
import {hrStats,parseWorkoutFile,thin,trackStats} from "../cardio.js";
import {isFit,parseFit} from "../fit.js";
import {gunzip,isGzip,isZip,walkZip} from "../archive.js";
import {actOf,appleName,detectCsv,exerciseMatcher,nightsFrom,parseFitbod,parseHevy,parseStravaCsv,parseStrong,scanAppleXml} from "../importers.js";
import {cardioSession} from "./cardio.js";
import {ACTIVITIES} from "../views/cardio.js";

let paint=()=>{},last=0;
// Repaint the progress at most a few times a second while a big archive is read.
const tick=force=>{const now=Date.now();if(force||now-last>250){last=now;paint();}};
const LABEL=a=>(ACTIVITIES.find(x=>x[0]===a)||ACTIVITIES[ACTIVITIES.length-1])[1];
const text=b=>new TextDecoder().decode(b);

// A watch file (FIT, GPX, TCX), already unpacked, as an activity: the route thinned to what is
// stored, splits and climb worked out, heart rate summarised. Null for anything that isn't a
// recorded activity (Garmin's archive also holds settings and all-day wellness files).
function fromWatchFile(bytes,name,meta){
  let w;
  try{w=isFit(bytes)?parseFit(bytes):(/\.(gpx|tcx)$/i.test(name)||/<(gpx|TrainingCenterDatabase)/.test(text(bytes.subarray(0,600)))?parseWorkoutFile(text(bytes)):null);}
  catch(e){return null;}
  if(!w||(w.fileType!=null&&w.fileType!==4))return null;
  if(!w.track.length&&!w.hr.length&&!w.distM)return null;
  const st=trackStats(w.track),hs=w.hr.length?hrStats(w.hr,state.settings.maxHR||190):null;
  const act=meta&&meta.type?actOf(meta.type):actOf(w.sport);
  const when=meta&&meta.when||(w.start?new Date(w.start).toISOString():null);
  if(!when)return null;
  return {when,activity:act,title:(meta&&meta.name)||w.name||"",secs:w.secs||(meta&&meta.secs)||st.secs,
    dist:st.dist||w.distM||(meta&&meta.dist)||0,climb:st.climb||w.climbM||(meta&&meta.climb)||0,splits:st.splits,
    hr:hs&&hs.avg?{avg:hs.avg,max:hs.max,zones:hs.zones}:(meta&&meta.hr)||null,
    track:thin(w.track,400).map(p=>({lat:p.lat,lon:p.lon}))};
}

// ── Reading ───────────────────────────────────────────────────────────────────────────
async function readZip(file,job){
  const names=[];
  await walkZip(file,en=>{names.push(en.name);});
  const has=re=>names.some(n=>re.test(n));
  if(has(/(^|\/)export\.xml$/))return readApple(file,job);
  if(has(/(^|\/)activities\.csv$/))return readStrava(file,job);
  job.source=has(/DI[-_]Connect/i)?"Garmin":"watch files";
  // Garmin (and any zip of FIT, GPX or TCX files): every activity file, nested zips included.
  const files=names.filter(n=>/\.(fit|gpx|tcx)(\.gz)?$/i.test(n));
  job.total=files.length;let k=0;
  await walkZip(file,async en=>{
    if(!/\.(fit|gpx|tcx)(\.gz)?$/i.test(en.name))return;
    // One damaged file is skipped; the rest still come in.
    let a=null;try{a=fromWatchFile(await en.read(),en.name.replace(/\.gz$/i,""));}catch(e){}
    if(a)job.acts.push(a);
    job.done=++k;tick();
  });
}

async function readStrava(file,job){
  job.source="Strava";
  let rows=[];const byFile={};
  await walkZip(file,async en=>{if(/(^|\/)activities\.csv$/.test(en.name))rows=parseStravaCsv(text(await en.read()));});
  rows.forEach(r=>{if(r.file)byFile[r.file.replace(/^\.?\//,"")]=r;});
  job.total=rows.length;let k=0;
  const used={};
  await walkZip(file,async en=>{
    const key=Object.keys(byFile).find(f=>en.name===f||en.name.endsWith("/"+f));
    if(!key)return;
    // A file that can't be read leaves its row to come in from its totals below.
    const r=byFile[key];let a=null;
    try{a=fromWatchFile(await en.read(),en.name.replace(/\.gz$/i,""),r);}catch(e){}
    if(a){used[r.id]=true;a.title=r.name||a.title;job.acts.push(a);}
    job.done=++k;tick();
  });
  // Manual entries and activities without a file still come in, from their row's totals.
  rows.filter(r=>!used[r.id]&&r.when&&r.secs).forEach(r=>{
    job.acts.push({when:r.when,activity:actOf(r.type),title:r.name,secs:r.secs,dist:r.dist,climb:r.climb,splits:[],hr:r.hr,track:[]});
    job.done=++k;
  });
}

async function readApple(file,job,xmlOnly){
  job.source="Apple Health";
  const workouts=[],routes={},spans=[],hrv=[],rhr=[];
  const scan=async(stream,size)=>scanAppleXml(stream,w=>{if(w.when)workouts.push(w);},x=>{if(x.at&&x.w)job.weights.push(x);},
    n=>{job.pct=size?Math.min(99,Math.round(n/size*100)):0;job.found=workouts.length;tick();},
    (k,v)=>{if(k==="sleep")spans.push(v);else if(k==="hrv")hrv.push(v);else rhr.push(v);});
  if(xmlOnly)await scan(file.stream(),file.size);
  else await walkZip(file,async en=>{
    if(/(^|\/)export\.xml$/.test(en.name))await scan(await en.stream(),en.size);
    else if(/workout-routes\/.+\.gpx$/i.test(en.name))routes[en.name.replace(/^.*workout-routes\//,"")]=en;
  });
  // Nights and vitals, one per day: the median HRV and the lowest resting pulse of the day.
  job.nights=nightsFrom(spans);
  const byDay={};
  hrv.forEach(x=>{const d=dateKey(x.at);(byDay[d]=byDay[d]||{at:x.at,hrvs:[],rhrs:[]}).hrvs.push(x.ms);});
  rhr.forEach(x=>{const d=dateKey(x.at);(byDay[d]=byDay[d]||{at:x.at,hrvs:[],rhrs:[]}).rhrs.push(x.bpm);});
  job.vitals=Object.values(byDay).map(v=>{const h=v.hrvs.sort((a,b)=>a-b);return {at:v.at,hrv:h.length?Math.round(h[Math.floor(h.length/2)]):0,rhr:v.rhrs.length?Math.round(Math.min(...v.rhrs)):0};})
    .filter(v=>v.hrv||v.rhr).sort((a,b)=>a.at.localeCompare(b.at));
  job.total=workouts.length;let k=0;
  for(const w of workouts){
    const meta={when:w.when,type:appleName(w.type),name:appleName(w.type),secs:w.secs,dist:w.dist,climb:w.climb,hr:w.hr};
    const en=w.route&&routes[w.route.replace(/^.*workout-routes\//,"")];
    let a=null;if(en)try{a=fromWatchFile(await en.read(),en.name,meta);}catch(e){}
    if(a){a.secs=w.secs||a.secs;a.dist=w.dist||a.dist;}
    else a={when:w.when,activity:actOf(meta.type),title:meta.name,secs:w.secs,dist:w.dist,climb:w.climb,splits:[],hr:w.hr,track:[]};
    a.kind=meta.type;
    job.acts.push(a);job.done=++k;tick();
  }
}

function readStrength(t,kind,job){
  const unit=state.settings.unit==="lb"?"lb":"kg";
  const res=kind==="hevy"?parseHevy(t,unit):kind==="fitbod"?parseFitbod(t,unit):parseStrong(t,unit,unit);
  job.source=res.source;
  const match=exerciseMatcher(state.catalog);
  res.days.forEach(d=>d.ex.forEach(e=>{e.name=match(e.name);}));
  job.days=res.days;
}

// ── Review ───────────────────────────────────────────────────────────────────────────
// What a source calls each activity, for the review's toggles: Apple's own types, else ours.
const groupOf=a=>a.kind||LABEL(a.activity);
const minuteOf=iso=>Math.round(Date.parse(iso)/60000);
function finishReview(job){
  // Already in KingsKiln (same start, give or take two minutes), or twice in the file: skipped.
  const have=new Set();
  state.sessions.forEach(s=>{if(s.cardio){const m=minuteOf(s.created);for(let d=-2;d<=2;d++)have.add(m+d);}});
  const seen=new Set();
  job.acts.sort((a,b)=>a.when.localeCompare(b.when));
  // Twice in the file (a watch's and Strava's copy) gets the same two minutes either way.
  job.acts.forEach(a=>{const m=minuteOf(a.when);a.dup=have.has(m)||seen.has(m);if(!a.dup)for(let d=-2;d<=2;d++)seen.add(m+d);});
  job.groups={};
  job.acts.forEach(a=>{if(a.dup)return;const g=groupOf(a);job.groups[g]=(job.groups[g]||0)+1;});
  // Everything is ticked, except all-day walking from a phone, which would swamp History.
  job.pick={};Object.keys(job.groups).forEach(g=>{job.pick[g]=!(job.source==="Apple Health"&&/^walking$/i.test(g)&&job.groups[g]>60);});
  const have2=new Set(state.sessions.map(s=>s.created));
  if(job.days)job.days.forEach(d=>{d.dup=have2.has(d.created);});
  const byDay={};job.weights.forEach(x=>{byDay[dateKey(x.at)]=x;});job.weights=Object.values(byDay);
  job.pickDays=true;job.pickWeights=true;job.pickNights=true;job.pickVitals=true;
  job.stage="review";
}

export async function importFile(file,render){
  if(!file)return;
  paint=render;
  const job={stage:"reading",name:file.name||"",source:"",acts:[],days:null,weights:[],nights:[],vitals:[],done:0,total:0,pct:0,found:0};
  state.importJob=job;state.view="import";state.scrollTo=0;tick(true);
  try{
    const head=new Uint8Array(await file.slice(0,4096).arrayBuffer());
    if(isZip(head))await readZip(file,job);
    else{
      let bytes=new Uint8Array(await file.arrayBuffer()),name=(file.name||"").replace(/\.gz$/i,"");
      if(isGzip(bytes))bytes=await gunzip(bytes);
      const start=text(bytes.subarray(0,4096));
      if(/<HealthData\b/.test(start))await readApple(file,job,true);
      else if(isFit(bytes)||/<(gpx|TrainingCenterDatabase)\b/.test(start)){
        job.source="a watch file";const a=fromWatchFile(bytes,name);if(a)job.acts.push(a);
      }else{
        const t=text(bytes),kind=detectCsv(t);
        if(kind==="strava"){job.source="Strava";parseStravaCsv(t).filter(r=>r.when&&r.secs).forEach(r=>job.acts.push(
          {when:r.when,activity:actOf(r.type),title:r.name,secs:r.secs,dist:r.dist,climb:r.climb,splits:[],hr:r.hr,track:[]}));}
        else if(kind)readStrength(t,kind,job);
        else throw new Error("KingsKiln doesn't recognise this file. It reads Strava and Garmin archives, Apple Health's export, "+
          "Strong, Hevy and Fitbod CSVs, and FIT, GPX and TCX files.");
      }
    }
    if(!job.acts.length&&!(job.days&&job.days.length)&&!job.weights.length&&!job.nights.length&&!job.vitals.length)throw new Error("No workouts were found in that file.");
    finishReview(job);
  }catch(e){job.stage="error";job.error=e&&e.message||"That file couldn't be read.";}
  tick(true);
}

// Route points per activity, shrinking as the import grows, so a decade of runs still fits
// in the browser's storage beside everything else.
const pointsFor=n=>Math.max(40,Math.min(400,Math.floor(1500000/(Math.max(1,n)*26))));

function save(job){
  const acts=job.acts.filter(a=>!a.dup&&job.pick[groupOf(a)]);
  const pts=pointsFor(acts.length+state.sessions.filter(s=>s.cardio&&s.cardio.track&&s.cardio.track.length).length/2);
  acts.forEach(a=>{
    const ses=cardioSession({activity:a.activity,title:a.title||LABEL(a.activity)+(a.dist>50?" · "+(a.dist/1000).toFixed(1)+" km":""),
      created:a.when,secs:a.secs,track:a.track,distM:a.dist,climbM:a.climb,hrSum:a.hr,imported:true,source:job.source},{points:pts});
    // Splits come from the full route when it was read; keep them rather than the thinned copy's.
    if(a.splits&&a.splits.length)ses.cardio.splits=a.splits;
    if(a.hr&&a.hr.zones&&ses.cardio.hr)ses.cardio.hr.zones=a.hr.zones;
    state.sessions.push(ses);
  });
  let nd=0;
  if(job.days&&job.pickDays){const fresh=job.days.filter(d=>!d.dup);nd=fresh.length;if(nd){mergeSessions(fresh);fresh.forEach(d=>d.ex.forEach(e=>addToCatalog(e.name)));}}
  let nw=0;
  if(job.pickWeights){
    const unit=state.settings.unit==="lb"?"lb":"kg";
    job.weights.forEach(x=>{const w=x.unit===unit?x.w:unit==="kg"?x.w*0.45359237:x.w/0.45359237;
      const prev=state.body.find(b=>dateKey(b.at)===dateKey(x.at));
      upsertBodyEntry(Object.assign({},prev||{},{at:x.at,w:Math.round(w*10)/10}));nw++;});
  }
  // Nights fill the sleep side of the check-in without touching ratings already given.
  let nn=0,nv=0;
  if(job.pickNights)job.nights.forEach(n=>{const prev=state.checkins.find(c=>dateKey(c.at)===dateKey(n.at));
    upsertCheckin(Object.assign({sleep:0,soreness:0,fatigue:0,stress:0},prev||{},{at:prev?prev.at:n.at,bed:n.bed,wake:n.wake,hours:n.hours,imported:true}));nn++;});
  if(job.pickVitals)job.vitals.forEach(v=>{upsertVital(v);nv++;});
  job.saved={acts:acts.length,days:nd,weights:nw,nights:nn,vitals:nv};
  job.stage="done";
}

export function handle(t,ctx){
  if(t.closest&&t.closest("#openimport")){state.importFrom=state.view;state.importJob=null;state.view="import";state.scrollTo=0;ctx.render();return true;}
  const job=state.importJob;
  if(t.closest&&t.closest("#importback")){
    if(job&&job.stage==="reading")return true;     // let a read finish rather than abandon it half-way
    state.importJob=null;state.view=state.importFrom&&state.importFrom!=="import"?state.importFrom:"settings";ctx.render();return true;
  }
  if(!job)return false;
  const g=t.closest&&t.closest("[data-importgroup]");
  if(g){const k=g.getAttribute("data-importgroup");job.pick[k]=!job.pick[k];ctx.render();return true;}
  if(t.closest&&t.closest("[data-importdays]")){job.pickDays=!job.pickDays;ctx.render();return true;}
  if(t.closest&&t.closest("[data-importweights]")){job.pickWeights=!job.pickWeights;ctx.render();return true;}
  if(t.closest&&t.closest("[data-importnights]")){job.pickNights=!job.pickNights;ctx.render();return true;}
  if(t.closest&&t.closest("[data-importvitals]")){job.pickVitals=!job.pickVitals;ctx.render();return true;}
  if(t.closest&&t.closest("[data-importgo]")){save(job);ctx.render();return true;}
  if(t.closest&&t.closest("[data-importview]")){const v=t.closest("[data-importview]").getAttribute("data-importview");
    state.importJob=null;state.view=v;state.scrollTo=0;ctx.render();return true;}
  return false;
}
