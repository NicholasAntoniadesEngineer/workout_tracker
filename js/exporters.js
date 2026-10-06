// Getting data out in the formats other apps read, so nobody is locked in. Strength days go
// out as a Strong-format CSV, which Hevy, Strong and most loggers import. Runs and rides go
// out as GPX or TCX, which Strava, Garmin Connect, Runna and Apple Health (via Shortcuts)
// take. A workout can also be copied as plain text. Everything together goes in one zip.
import {setKind} from "./model.js";
import {setsSummary} from "./views/log.js";

const pad=n=>String(n).padStart(2,"0");
const local=iso=>{const d=new Date(iso);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());};
const q=v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"';
const xml=s=>String(s||"").replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
const secsOf=s=>s.ended&&s.started?Math.max(0,Math.round((Date.parse(s.ended)-Date.parse(s.started))/1000)):0;
const ORDER={wu:"W",drop:"D",fail:"F"};

// Strong's layout: one row per set, semicolon-separated, weights in the app's unit.
export function strongCSV(sessions,unit){
  const u=unit==="lb"?"lbs":"kg";
  const head=["Workout #","Date","Workout Name","Duration (sec)","Exercise Name","Set Order","Weight ("+u+")","Reps","RPE","Distance (meters)","Seconds","Notes","Workout Notes"];
  const rows=[head.map(q).join(";")];
  const days=sessions.filter(s=>!s.cardio&&s.ex.some(e=>e.sets.length)).sort((a,b)=>(a.created||"").localeCompare(b.created||""));
  days.forEach((s,n)=>{
    s.ex.forEach(e=>{
      let k=0;
      e.sets.forEach(x=>{
        const kind=setKind(x),order=ORDER[kind]||String(++k);
        rows.push([n+1,local(s.started||s.created),s.title,secsOf(s),e.name,order,e.timed||e.dist?0:(x.w||0),e.timed||e.dist?0:x.r,x.rpe||"",
          e.dist?x.r:0,e.timed?x.r:0,x.note||"",""].map(q).join(";"));
      });
    });
  });
  return rows.join("\n")+"\n";
}

// A saved route has no times of its own, so points are spread evenly over the session.
function points(s){
  const c=s.cardio,track=c.track||[];
  if(track.length<2)return [];
  const start=Date.parse(s.started||s.created),span=(c.secs||0)*1000;
  return track.map((p,i)=>({lat:p[0],lon:p[1],t:new Date(start+span*i/(track.length-1)).toISOString()}));
}
const GPX_TYPE={run:"running",ride:"cycling",walk:"walking",swim:"swimming",row:"rowing",other:"other"};
export function gpx(s){
  const c=s.cardio,pts=points(s);
  return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="KingsKiln" xmlns="http://www.topografix.com/GPX/1/1">\n'+
    '<metadata><time>'+xml(s.started||s.created)+'</time></metadata>\n<trk><name>'+xml(s.title)+'</name><type>'+GPX_TYPE[c.activity]+'</type><trkseg>\n'+
    pts.map(p=>'<trkpt lat="'+p.lat+'" lon="'+p.lon+'"><time>'+p.t+'</time></trkpt>').join("\n")+'\n</trkseg></trk></gpx>\n';
}
const TCX_SPORT={run:"Running",ride:"Biking",walk:"Other",swim:"Other",row:"Other",other:"Other"};
export function tcx(s){
  const c=s.cardio,pts=points(s),start=s.started||s.created;
  const hr=c.hr&&c.hr.avg?'<AverageHeartRateBpm><Value>'+c.hr.avg+'</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>'+(c.hr.max||c.hr.avg)+'</Value></MaximumHeartRateBpm>':"";
  return '<?xml version="1.0" encoding="UTF-8"?>\n<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">\n<Activities><Activity Sport="'+TCX_SPORT[c.activity]+'"><Id>'+xml(start)+'</Id>\n'+
    '<Lap StartTime="'+xml(start)+'"><TotalTimeSeconds>'+(c.secs||0)+'</TotalTimeSeconds><DistanceMeters>'+(c.dist||0)+'</DistanceMeters>'+hr+'<Intensity>Active</Intensity><TriggerMethod>Manual</TriggerMethod>'+
    (pts.length?'<Track>'+pts.map(p=>'<Trackpoint><Time>'+p.t+'</Time><Position><LatitudeDegrees>'+p.lat+'</LatitudeDegrees><LongitudeDegrees>'+p.lon+'</LongitudeDegrees></Position></Trackpoint>').join("")+'</Track>':"")+
    '</Lap><Notes>'+xml(s.title)+'</Notes></Activity></Activities></TrainingCenterDatabase>\n';
}

// A day as text to paste anywhere: a messaging app, a coach, an AI assistant.
export function workoutText(s,unit){
  const d=new Date(s.started||s.created);
  let t=s.title+" · "+d.toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"})+(secsOf(s)?" · "+Math.round(secsOf(s)/60)+" min":"")+"\n";
  if(s.cardio){const c=s.cardio;t+=(c.dist?(c.dist/1000).toFixed(2)+" km · ":"")+Math.round(c.secs/60)+" min"+(c.hr&&c.hr.avg?" · "+c.hr.avg+" bpm avg":"")+"\n";return t;}
  s.ex.forEach(e=>{if(!e.sets.length)return;
    const u=e.timed?"secs":e.dist?"m":"reps";
    t+=e.name+": "+setsSummary(e.sets,u).replace(/&hellip;/g,"…")+(u==="reps"&&e.sets.some(x=>x.w)?" "+unit:"")+"\n";
    e.sets.forEach((x,i)=>{if(x.note)t+="  set "+(i+1)+": "+x.note+"\n";});});
  return t;
}

// ── A zip of everything, stored uncompressed (every reader opens it, no compressor needed).
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcTable[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
export function zipFiles(files){
  const enc=new TextEncoder(),parts=[],cds=[];let off=0;
  const d=new Date(),dosT=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),dosD=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  files.forEach(([name,text])=>{
    const n=enc.encode(name),b=typeof text==="string"?enc.encode(text):text,crc=crc32(b);
    const h=new Uint8Array(30+n.length),dv=new DataView(h.buffer);
    dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(10,dosT,true);dv.setUint16(12,dosD,true);dv.setUint32(14,crc,true);
    dv.setUint32(18,b.length,true);dv.setUint32(22,b.length,true);dv.setUint16(26,n.length,true);h.set(n,30);
    const c=new Uint8Array(46+n.length),cv=new DataView(c.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(12,dosT,true);cv.setUint16(14,dosD,true);cv.setUint32(16,crc,true);
    cv.setUint32(20,b.length,true);cv.setUint32(24,b.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,off,true);c.set(n,46);
    parts.push(h,b);cds.push(c);off+=h.length+b.length;
  });
  const cdLen=cds.reduce((a,c)=>a+c.length,0),e=new Uint8Array(22),ev=new DataView(e.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,cdLen,true);ev.setUint32(16,off,true);
  return new Blob([...parts,...cds,e],{type:"application/zip"});
}
const stamp=iso=>String(iso||"").slice(0,10);
// Everything, for moving to another app: the Strong CSV, one GPX and TCX per run or ride,
// the app's own CSV and backup, and a note on what is what.
export function everythingZip(sessions,unit,ownCSV,backupJSON){
  const files=[["README.txt","KingsKiln export\n\nstrong-format.csv: every strength set, in the layout Strong, Hevy and most trackers import.\n"+
    "runs/: each run, ride or walk as GPX and TCX, for Strava, Garmin Connect or any training app.\nkingskiln.csv: the app's own spreadsheet of sets.\n"+
    "kingskiln_backup.json: the full backup, for loading back into KingsKiln.\n"],
    ["strong-format.csv",strongCSV(sessions,unit)],["kingskiln.csv",ownCSV],["kingskiln_backup.json",backupJSON]];
  sessions.filter(s=>s.cardio).forEach(s=>{const base="runs/"+stamp(s.created)+"_"+(s.cardio.activity||"other");
    if((s.cardio.track||[]).length>1)files.push([base+".gpx",gpx(s)]);files.push([base+".tcx",tcx(s)]);});
  return zipFiles(files);
}
