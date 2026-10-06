// Other apps' exports, read into KingsKiln's own shapes. Strength apps (Strong, Hevy, Fitbod)
// become logged days with every set; Strava's activities.csv and Apple Health's export.xml
// become cardio summaries; Apple's weigh-ins become Body entries. Pure functions, no DOM, so
// each format is tested on its own; js/actions/importer.js does the reading and saving.
import {parseCSV} from "./csv.js";
import {normSet,uid} from "./model.js";
import {EXINFO} from "./exinfo-data.js";

// ── Activity types ────────────────────────────────────────────────────────────────────
// Whatever a source calls the sport, KingsKiln files it as run, ride, walk, swim, row or other.
export function actOf(sport){
  const s=String(sport||"").toLowerCase();
  if(/run|jog|treadmill/.test(s))return "run";
  if(/ride|cycl|bik|spin|velo/.test(s))return "ride";
  if(/walk|hik/.test(s))return "walk";
  if(/swim/.test(s))return "swim";
  if(/row|canoe|kayak|paddl/.test(s))return "row";
  return "other";
}
// "HKWorkoutActivityTypeTraditionalStrengthTraining" → "Traditional strength training"
export function appleName(t){
  const w=String(t||"").replace(/^HKWorkoutActivityType/,"").replace(/([a-z])([A-Z])/g,"$1 $2").toLowerCase();
  return w?w[0].toUpperCase()+w.slice(1):"Workout";
}

// ── Strength apps ─────────────────────────────────────────────────────────────────────
const sq=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]/g,"").replace(/es$|s$/,"");
// Their exercise names, matched to the list where the movement is clearly the same: "Squat
// (Barbell)" is Squats, "Pull Up" is Pull ups, "Overhead Press (Barbell)" finds Shoulder press
// through its other names. A dumbbell or cable version never falls back to the barbell lift;
// anything without a clear match keeps its own name.
const PLAIN_KIT=/^(barbell|bodyweight|body weight|weighted|olympic)$/i;
export function exerciseMatcher(catalog){
  const idx={};
  const put=(k,n)=>{const q=sq(k);if(q&&!idx[q])idx[q]=n;};
  catalog.forEach(n=>put(n,n));
  catalog.forEach(n=>((EXINFO[n]&&EXINFO[n].aka)||[]).forEach(a=>put(a,n)));
  return name=>{
    const raw=String(name||"").trim(),m=/^(.*?)\s*\(([^)]*)\)\s*$/.exec(raw);
    const base=m?m[1]:raw,kit=m?m[2]:"";
    const tries=kit?[kit+" "+base,base+" "+kit].concat(PLAIN_KIT.test(kit)?[base]:[]):[raw];
    for(const t of tries){const hit=idx[sq(t)];if(hit)return hit;}
    return idx[sq(raw)]||raw;
  };
}

// CSV with whichever separator the header uses: Strong's newer exports use semicolons.
function rowsOf(text){
  const src=String(text||"").replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n");
  const nl=src.indexOf("\n"),first=nl>0?src.slice(0,nl):src;
  const sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?";":",";
  if(sep===",")return parseCSV(src).filter(r=>r.some(c=>c.trim()!==""));
  const rows=[];let row=[],cur="",q=false;
  for(let i=0;i<src.length;i++){
    const ch=src[i];
    if(q){if(ch==='"'){if(src[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=ch;}
    else if(ch==='"')q=true;
    else if(ch===sep){row.push(cur);cur="";}
    else if(ch==="\n"){row.push(cur);rows.push(row);row=[];cur="";}
    else cur+=ch;
  }
  if(cur!==""||row.length){row.push(cur);rows.push(row);}
  return rows.filter(r=>r.some(c=>c.trim()!==""));
}
const findCol=(head,...names)=>{for(const n of names){const i=head.findIndex(h=>h===n);if(i>=0)return i;}
  for(const n of names){const i=head.findIndex(h=>h.indexOf(n)===0);if(i>=0)return i;}return -1;};

// Which strength app wrote this CSV, from its header row.
export function detectCsv(text){
  const rows=rowsOf(String(text||"").slice(0,4000));
  const h=(rows[0]||[]).map(x=>x.trim().toLowerCase());
  if(h.indexOf("exercise_title")>=0&&h.indexOf("start_time")>=0)return "hevy";
  if(h.indexOf("exercise name")>=0&&h.indexOf("set order")>=0)return "strong";
  if(h.indexOf("exercise")>=0&&h.some(x=>/^weight\s*\(/.test(x))&&h.indexOf("iswarmup")>=0)return "fitbod";
  if(h.indexOf("activity id")>=0&&h.indexOf("activity type")>=0)return "strava";
  return null;
}

const LB=0.45359237;
function localDate(y,mo,d,h,mi,s){return new Date(+y,+mo-1,+d,+h||0,+mi||0,+s||0).toISOString();}
const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
// "2023-01-15 08:30:00", "2023-01-15T08:30:00Z", "5 Jan 2026, 17:00", "Jan 15, 2023, 8:30:00 AM".
export function parseWhen(s,utc){
  const v=String(s||"").trim();let m;
  if((m=/^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?\s*(Z|[+-]\d\d:?\d\d)?$/.exec(v))){
    if(m[7]){const z=m[7]==="Z"?"Z":m[7].replace(/^([+-]\d\d)(\d\d)$/,"$1:$2");return new Date(m[1]+"-"+m[2]+"-"+m[3]+"T"+m[4]+":"+m[5]+":"+(m[6]||"00")+z).toISOString();}
    return utc?new Date(Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0))).toISOString():localDate(m[1],m[2],m[3],m[4],m[5],m[6]);
  }
  if((m=/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? (\d{1,2}):(\d\d)(?::(\d\d))?$/.exec(v))&&MON[m[2].toLowerCase()])
    return localDate(m[3],MON[m[2].toLowerCase()],m[1],m[4],m[5],m[6]);
  if((m=/^([A-Za-z]{3})[a-z]* (\d{1,2}),? (\d{4}),? (\d{1,2}):(\d\d)(?::(\d\d))? ?(AM|PM)?$/i.exec(v))&&MON[m[1].toLowerCase()]){
    let h=+m[4];const pm=m[7]&&m[7].toUpperCase()==="PM";if(m[7]){if(h===12)h=0;if(pm)h+=12;}
    const mo=MON[m[1].toLowerCase()];
    return utc?new Date(Date.UTC(+m[3],mo-1,+m[2],h,+m[5],+(m[6]||0))).toISOString():localDate(m[3],mo,m[2],h,m[5],m[6]);
  }
  const t=Date.parse(v);
  return isNaN(t)?null:new Date(t).toISOString();
}
// "1h 5m", "45m", "30s", or plain seconds.
function seconds(v){
  const s=String(v||"").trim();if(!s)return 0;
  if(/^\d+(\.\d+)?$/.test(s))return Math.round(+s);
  let t=0;const h=/(\d+)\s*h/.exec(s),m=/(\d+)\s*m(?!s)/.exec(s),x=/(\d+)\s*s/.exec(s);
  if(h)t+=h[1]*3600;if(m)t+=m[1]*60;if(x)t+=+x[1];return t;
}
const num=v=>{const n=parseFloat(String(v||"").replace(",","."));return isNaN(n)?0:n;};

// Rows grouped into days: one KingsKiln day per workout, exercises in the order first done,
// sets in their order. kgFactor converts the file's weights into the app's unit.
function buildDays(sets,toUnit){
  const days={},order=[];
  sets.forEach(x=>{
    if(!x.when||!x.name)return;
    const k=x.when+"|"+x.title;
    if(!days[k]){days[k]={id:uid(),title:x.title||"Workout",created:x.when,started:x.when,
      ended:x.secs?new Date(Date.parse(x.when)+x.secs*1000).toISOString():"",running:false,ex:[],by:{}};order.push(k);}
    const d=days[k];
    if(!d.by[x.name]){d.by[x.name]={id:uid(),name:x.name,timed:false,dist:false,sets:[]};d.ex.push(d.by[x.name]);}
    const e=d.by[x.name];
    let r=x.reps,w=x.w;
    if(!r&&x.dist){r=Math.round(x.dist);e.dist=true;}
    else if(!r&&x.time){r=Math.round(x.time);e.timed=true;}
    if(!r)return;
    if(w&&toUnit)w=Math.round(toUnit(w)*10)/10;
    e.sets.push(normSet({r,side:false,w:w||0,band:"",t:x.time&&x.reps?Math.round(x.time):0,rest:0,at:"",kind:x.kind||(x.wu?"wu":""),rpe:x.rpe||0}));
  });
  return order.map(k=>{const d=days[k];delete d.by;d.ex=d.ex.filter(e=>e.sets.length);return d;}).filter(d=>d.ex.length);
}
const converter=(from,to)=>!from||from===to?null:from==="lb"?(w=>w*LB):(w=>w/LB);

// Strong: "Date","Workout Name","Duration","Exercise Name","Set Order","Weight","Reps",
// "Distance","Seconds" — semicolons in newer versions, units named in the header there.
// Set Order is the set number, or W for a warm-up; rest-timer and note rows are skipped.
export function parseStrong(text,appUnit,assumeUnit){
  const rows=rowsOf(text),h=rows[0].map(x=>x.trim().toLowerCase());
  const c={date:findCol(h,"date"),title:findCol(h,"workout name"),dur:findCol(h,"duration (sec)","duration"),
    ex:findCol(h,"exercise name"),set:findCol(h,"set order"),w:findCol(h,"weight (kg)","weight (lbs)","weight"),
    reps:findCol(h,"reps"),dist:findCol(h,"distance (meters)","distance (m)","distance (km)","distance"),secs:findCol(h,"seconds"),rpe:findCol(h,"rpe")};
  const wh=c.w>=0?h[c.w]:"",fileUnit=/kg/.test(wh)?"kg":/lb/.test(wh)?"lb":(assumeUnit||null);
  const distK=c.dist>=0&&/km/.test(h[c.dist])?1000:c.dist>=0&&/mi/.test(h[c.dist])?1609.344:1;
  const sets=[];
  rows.slice(1).forEach(r=>{
    const so=String(r[c.set]||"").trim();
    if(!/^(\d+|W|D|F)$/i.test(so))return;
    sets.push({when:parseWhen(r[c.date]),title:(r[c.title]||"").trim(),secs:seconds(r[c.dur]),name:(r[c.ex]||"").trim(),
      reps:Math.round(num(r[c.reps])),w:num(r[c.w]),dist:num(r[c.dist])*distK,time:num(r[c.secs]),
      kind:/^W$/i.test(so)?"wu":/^D$/i.test(so)?"drop":/^F$/i.test(so)?"fail":"",rpe:c.rpe>=0?num(r[c.rpe]):0});
  });
  return {days:buildDays(sets,converter(fileUnit,appUnit)),unit:fileUnit,source:"Strong"};
}

// Hevy: one row per set; weight_kg or weight_lbs and distance_km or distance_miles follow the
// user's Hevy units; set_type marks warm-ups.
export function parseHevy(text,appUnit){
  const rows=rowsOf(text),h=rows[0].map(x=>x.trim().toLowerCase());
  const c={title:findCol(h,"title"),start:findCol(h,"start_time"),end:findCol(h,"end_time"),ex:findCol(h,"exercise_title"),
    type:findCol(h,"set_type"),w:findCol(h,"weight_kg","weight_lbs"),reps:findCol(h,"reps"),
    dist:findCol(h,"distance_km","distance_miles","distance_meters"),time:findCol(h,"duration_seconds"),rpe:findCol(h,"rpe")};
  const fileUnit=c.w>=0&&/lbs/.test(h[c.w])?"lb":"kg";
  const distK=c.dist>=0?(/miles/.test(h[c.dist])?1609.344:/km/.test(h[c.dist])?1000:1):1;
  const sets=rows.slice(1).map(r=>{
    const when=parseWhen(r[c.start]),end=parseWhen(r[c.end]);
    return {when,title:(r[c.title]||"").trim(),secs:when&&end?Math.max(0,(Date.parse(end)-Date.parse(when))/1000):0,
      name:(r[c.ex]||"").trim(),reps:Math.round(num(r[c.reps])),w:num(r[c.w]),dist:num(r[c.dist])*distK,time:num(r[c.time]),
      kind:{warmup:"wu",dropset:"drop",failure:"fail"}[String(r[c.type]||"").trim().toLowerCase()]||"",rpe:c.rpe>=0?num(r[c.rpe]):0};
  });
  return {days:buildDays(sets,converter(fileUnit,appUnit)),unit:fileUnit,source:"Hevy"};
}

// Fitbod: Date, Exercise, Reps, Weight(kg), Duration(s), Distance(m), …, isWarmup.
export function parseFitbod(text,appUnit){
  const rows=rowsOf(text),h=rows[0].map(x=>x.trim().toLowerCase());
  const c={date:findCol(h,"date"),ex:findCol(h,"exercise"),reps:findCol(h,"reps"),w:h.findIndex(x=>/^weight\s*\(/.test(x)),
    time:h.findIndex(x=>/^duration/.test(x)),dist:h.findIndex(x=>/^distance/.test(x)),wu:findCol(h,"iswarmup")};
  const fileUnit=c.w>=0&&/lb/.test(h[c.w])?"lb":"kg";
  const sets=rows.slice(1).map(r=>({when:parseWhen(r[c.date]),title:"Fitbod workout",secs:0,name:(r[c.ex]||"").trim(),
    reps:Math.round(num(r[c.reps])),w:num(r[c.w]),dist:num(r[c.dist]),time:num(r[c.time]),wu:/^(true|1|yes)$/i.test(String(r[c.wu]||"").trim())}));
  return {days:buildDays(sets,converter(fileUnit,appUnit)),unit:fileUnit,source:"Fitbod"};
}

// ── Strava ────────────────────────────────────────────────────────────────────────────
// activities.csv repeats some headers: the first block is in display units, the second in SI,
// so the last "Distance" is metres. Filename points at the activity's file in the archive.
export function parseStravaCsv(text){
  const rows=rowsOf(text),h=rows[0].map(x=>x.trim().toLowerCase());
  const first=n=>h.indexOf(n),last=n=>h.lastIndexOf(n);
  const c={id:first("activity id"),date:first("activity date"),name:first("activity name"),type:first("activity type"),
    secs:first("elapsed time"),dist:last("distance"),hrMax:first("max heart rate"),hrAvg:first("average heart rate"),
    climb:first("elevation gain"),file:first("filename")};
  return rows.slice(1).map(r=>({id:(r[c.id]||"").trim(),when:parseWhen(r[c.date],true),name:(r[c.name]||"").trim(),
    type:(r[c.type]||"").trim(),secs:Math.round(num(r[c.secs])),dist:Math.round(num(r[c.dist])),
    hr:num(r[c.hrAvg])?{avg:Math.round(num(r[c.hrAvg])),max:Math.round(num(r[c.hrMax]))}:null,
    climb:Math.round(num(r[c.climb])),file:(r[c.file]||"").trim()})).filter(a=>a.id||a.when);
}

// ── Nights from sleep spans (any source): grouped by the morning each ends on, asleep time
// summed, bed the earliest start and wake the latest end. Phone-only "asleep" spans with no
// stages count the same. Returns [{at, bed, wake, hours, stages}] oldest first.
export function nightsFrom(spans){
  const by={};
  spans.forEach(s=>{
    if(!s.at||!s.end)return;
    const end=new Date(s.end),key=new Date(end.getTime()-12*3600000);     // noon-to-noon day
    const k=key.getFullYear()+"-"+String(key.getMonth()+1).padStart(2,"0")+"-"+String(key.getDate()).padStart(2,"0");
    const n=by[k]=by[k]||{key:k,first:s.at,last:s.end,mins:0,stages:{}};
    if(s.at<n.first)n.first=s.at;if(s.end>n.last)n.last=s.end;
    const m=(Date.parse(s.end)-Date.parse(s.at))/60000;n.mins+=m;n.stages[s.stage||"asleep"]=(n.stages[s.stage||"asleep"]||0)+m;
  });
  const hm=iso=>{const d=new Date(iso);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");};
  return Object.values(by).filter(n=>n.mins>=60).sort((a,b)=>a.key.localeCompare(b.key))
    .map(n=>({at:n.last,bed:hm(n.first),wake:hm(n.last),hours:Math.round(n.mins/6)/10,stages:n.stages}));
}

// ── Apple Health ──────────────────────────────────────────────────────────────────────
const attrs=tag=>{const o={};tag.replace(/([\w:]+)="([^"]*)"/g,(_,k,v)=>{o[k]=v;return "";});return o;};
const toM={km:1000,mi:1609.344,m:1,yd:0.9144,ft:0.3048};
function appleWorkout(block){
  const a=attrs(block.slice(0,block.indexOf(">")));
  const start=parseWhen(a.startDate),end=parseWhen(a.endDate);
  let secs=a.duration?num(a.duration)*(a.durationUnit==="s"?1:a.durationUnit==="hr"?3600:60):0;
  if(!secs&&start&&end)secs=(Date.parse(end)-Date.parse(start))/1000;
  let dist=a.totalDistance?num(a.totalDistance)*(toM[a.totalDistanceUnit]||1):0,hr=null,climb=0;
  block.replace(/<WorkoutStatistics\b[^>]*>/g,t=>{
    const s=attrs(t);
    if(/HeartRate$/.test(s.type)&&s.average)hr={avg:Math.round(num(s.average)),max:Math.round(num(s.maximum||s.average))};
    else if(/Distance/.test(s.type)&&s.sum&&!dist)dist=num(s.sum)*(toM[s.unit]||1);
    return "";
  });
  block.replace(/<MetadataEntry key="HKElevationAscended" value="([\d.]+) ?(\w*)"/,(_,v,u)=>{climb=num(v)*(u==="ft"?0.3048:u==="cm"?0.01:1);return "";});
  const route=/<FileReference path="([^"]+)"/.exec(block);
  return {type:a.workoutActivityType||"",when:start,secs:Math.round(secs),dist:Math.round(dist),hr,climb:Math.round(climb),
    route:route?route[1]:"",source:a.sourceName||""};
}
// Reads export.xml as it streams in: each <Workout> as it closes, and every body-mass record.
// Everything else (millions of step and heart-rate samples) is passed over without being kept.
// onHealth(kind, {at, …}) gets each sleep span (kind "sleep": {at, end, stage}), overnight HRV
// ("hrv": {at, ms}) and resting heart rate ("rhr": {at, bpm}); everything else is passed over.
export async function scanAppleXml(stream,onWorkout,onWeight,onChars,onHealth){
  const reader=stream.pipeThrough(new TextDecoderStream()).getReader();
  let buf="",inW=-1,seen=0;
  const W="<Workout ",R='<Record type="HKQuantityTypeIdentifierBodyMass"';
  const KINDS=onHealth?[['<Record type="HKCategoryTypeIdentifierSleepAnalysis"',"sleep"],['<Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN"',"hrv"],
    ['<Record type="HKQuantityTypeIdentifierRestingHeartRate"',"rhr"]]:[];
  const firstOf=()=>{let best=-1,kind="";KINDS.forEach(([tag,k])=>{const i=buf.indexOf(tag);if(i>=0&&(best<0||i<best)){best=i;kind=k;}});return [best,kind];};
  for(;;){
    const {value,done}=await reader.read();
    if(value){buf+=value;seen+=value.length;}
    for(;;){
      if(inW>=0){
        const e=buf.indexOf("</Workout>",inW);
        if(e<0)break;
        onWorkout(appleWorkout(buf.slice(inW,e)));buf=buf.slice(e+10);inW=-1;continue;
      }
      const wi=buf.indexOf(W),ri=buf.indexOf(R),[hi,hk]=firstOf();
      if(wi<0&&ri<0&&hi<0){buf=buf.slice(-120);break;}
      if(hi>=0&&(wi<0||hi<wi)&&(ri<0||hi<ri)){
        const e=buf.indexOf(">",hi);
        if(e<0){buf=buf.slice(hi);break;}
        const a=attrs(buf.slice(hi,e));
        if(hk==="sleep"){const st=String(a.value||"").replace("HKCategoryValueSleepAnalysis","");
          if(/^Asleep/.test(st))onHealth("sleep",{at:parseWhen(a.startDate),end:parseWhen(a.endDate),stage:st.replace("Asleep","").toLowerCase()||"asleep",src:a.sourceName||""});}
        else if(hk==="hrv"&&a.value)onHealth("hrv",{at:parseWhen(a.startDate),ms:num(a.value)});
        else if(hk==="rhr"&&a.value)onHealth("rhr",{at:parseWhen(a.startDate),bpm:num(a.value)});
        buf=buf.slice(e+1);continue;
      }
      if(ri>=0&&(wi<0||ri<wi)){
        // Only the record's own tag: a weigh-in can carry metadata children with values of their own.
        const e=buf.indexOf(">",ri);
        if(e<0){buf=buf.slice(ri);break;}
        const a=attrs(buf.slice(ri,e));
        if(a.value)onWeight({at:parseWhen(a.startDate),w:num(a.value),unit:/lb/.test(a.unit)?"lb":"kg"});
        buf=buf.slice(e+1);continue;
      }
      const close=buf.indexOf(">",wi);
      if(close<0){buf=buf.slice(wi);break;}
      if(buf[close-1]==="/"){onWorkout(appleWorkout(buf.slice(wi,close+1)));buf=buf.slice(close+1);continue;}
      inW=0;buf=buf.slice(wi);
    }
    if(onChars)onChars(seen);
    if(done)break;
  }
}
