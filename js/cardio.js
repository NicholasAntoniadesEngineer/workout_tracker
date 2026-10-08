// Cardio: timed sessions (intervals, EMOM, rounds, Tabata, steady) and outdoor tracking — GPS
// distance, pace and splits, heart rate and time in zones — plus reading workouts recorded on a
// watch (GPX and TCX files). Pure functions; the sensors live in sensors.js.

// Timer presets. Each builds a list of phases {kind:"work"|"rest", secs, label}.
export const MODES={
  intervals:{name:"Intervals",fields:["work","rest","rounds"],build:o=>rounds(o.rounds,o.work,o.rest,"Hard","Easy")},
  emom:{name:"EMOM",fields:["minutes"],build:o=>Array.from({length:o.minutes},(_,i)=>({kind:"work",secs:60,label:"Minute "+(i+1)}))},
  rounds:{name:"Rounds",fields:["work","rest","rounds"],build:o=>rounds(o.rounds,o.work,o.rest,"Round","Rest")},
  tabata:{name:"Tabata",fields:[],build:()=>rounds(8,20,10,"Work","Rest")},
  steady:{name:"Steady",fields:["minutes"],build:o=>[{kind:"work",secs:o.minutes*60,label:"Steady"}]},
  free:{name:"Open",fields:[],build:()=>[]},
};
function rounds(n,work,rest,wl,rl){
  const out=[];
  for(let i=0;i<n;i++){out.push({kind:"work",secs:work,label:wl+" "+(i+1)+" of "+n,round:i});
    if(rest&&i<n-1)out.push({kind:"rest",secs:rest,label:rl,round:i});}
  return out;
}
export const PRESETS=[
  {id:"open",name:"Open session",short:"Open",mode:"free",o:{},note:"No timer: run, ride or walk as long as you like"},
  {id:"z2",name:"Zone 2, 45 min",short:"Zone 2",mode:"steady",o:{minutes:45},note:"Easy, conversational pace"},
  {id:"4x4",name:"4 × 4 intervals",short:"4 × 4",mode:"intervals",o:{work:240,rest:240,rounds:4},note:"Attia's zone 5: four minutes hard, four easy"},
  {id:"tabata",name:"Tabata",short:"Tabata",mode:"tabata",o:{},note:"8 × 20 s on, 10 s off"},
  {id:"emom10",name:"EMOM 10",short:"EMOM",mode:"emom",o:{minutes:10},note:"A task at the top of every minute"},
  {id:"rounds3x3",name:"3 rounds of 3 min",short:"Rounds",mode:"rounds",o:{work:180,rest:60,rounds:3},note:"Fight rounds, one minute between"},
];
export function phases(mode,o){return (MODES[mode]||MODES.free).build(o||{});}
// Where an elapsed time (seconds, pauses excluded) falls in the phases.
export function phaseAt(list,elapsed){
  let t=0;
  for(let i=0;i<list.length;i++){
    if(elapsed<t+list[i].secs)return {i,phase:list[i],left:t+list[i].secs-elapsed,into:elapsed-t};
    t+=list[i].secs;
  }
  return {i:list.length,phase:null,left:0,into:elapsed-t,done:list.length>0};
}
export const totalSecs=list=>list.reduce((a,p)=>a+p.secs,0);

// Great-circle distance in metres.
export function haversine(a,b){
  const R=6371008.8,rad=x=>x*Math.PI/180;
  const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
// Should a GPS fix join the track? Poor fixes and jitter while standing still are dropped.
// limit: the worst accuracy (metres) taken. Phones often report 40–65 m for the first minute or
// under trees, so 50 m is the norm and the caller relaxes it while no fix has been kept yet.
export function acceptFix(prev,fix,limit){
  if(fix.acc!=null&&fix.acc>(limit||50))return false;
  if(!prev)return true;
  const d=haversine(prev,fix),dt=(fix.t-prev.t)/1000;
  if(dt<=0)return false;
  if(d<Math.max(3,(fix.acc||5)*0.5))return false;          // jitter
  return d/dt<60;                                           // faster than 216 km/h: a bad fix
}
// Distance, climb and kilometre (or mile) splits from a track [{t,lat,lon,alt}].
export function trackStats(track,splitM){
  const sm=splitM||1000;let dist=0,climb=0,splits=[],nextSplit=sm,lastSplitT=track.length?track[0].t:0,paused=0;
  for(let i=1;i<track.length;i++){
    // A pause (gap) adds no distance, and its time comes off the split and the total.
    if(track[i].gap){lastSplitT+=track[i].gap;paused+=track[i].gap;continue;}
    const d=haversine(track[i-1],track[i]);dist+=d;
    if(track[i].alt!=null&&track[i-1].alt!=null&&track[i].alt>track[i-1].alt)climb+=track[i].alt-track[i-1].alt;
    while(dist>=nextSplit){
      const over=dist-nextSplit,frac=d?1-over/d:1,tAt=track[i-1].t+(track[i].t-track[i-1].t)*frac;
      splits.push({n:splits.length+1,secs:Math.round((tAt-lastSplitT)/1000)});
      lastSplitT=tAt;nextSplit+=sm;
    }
  }
  const secs=track.length>1?Math.max(0,Math.round((track[track.length-1].t-track[0].t-paused)/1000)):0;
  return {dist:Math.round(dist),climb:Math.round(climb),secs,splits};
}
// What the voice says: a split as it is crossed, and each phase as it starts.
const spokenTime=s=>{s=Math.round(s);const m=Math.floor(s/60),x=s%60;
  return (m?m+(m===1?" minute":" minutes"):"")+(x?(m?" ":"")+x+(x===1?" second":" seconds"):"")||"0 seconds";};
export function splitSpeech(n,splitSecs,miles){
  return (miles?"Mile ":"Kilometre ")+n+". "+spokenTime(splitSecs)+".";
}
export function lapSpeech(n,secs){return "Lap "+n+". "+spokenTime(secs)+".";}
export function phaseSpeech(ph,done){
  if(done)return "Timer done.";
  if(!ph)return "";
  return ph.label.replace(/ of /," of ")+". "+spokenTime(ph.secs)+".";
}

// Bests per activity from saved sessions: longest distance and time, fastest average pace over
// a kilometre or more, and the fastest 1, 5, 10 and 21 km run inside any session, from its
// kilometre splits. Most-done activity first.
export const BEST_KM=[1,5,10,21];
export function cardioBests(sessions){
  const by={};
  sessions.forEach(s=>{
    const c=s.cardio;if(!c)return;
    const a=c.activity||"other",b=by[a]||(by[a]={activity:a,n:0,dist:0,secs:0,longest:null,longestTime:null,pace:null,best:{}});
    const dist=+c.dist||0,secs=+c.secs||0;
    b.n++;b.dist+=dist;b.secs+=secs;
    if(dist&&(!b.longest||dist>b.longest.v))b.longest={v:dist,at:s.created};
    if(secs&&(!b.longestTime||secs>b.longestTime.v))b.longestTime={v:secs,at:s.created};
    if(dist>=1000&&secs){const p=secs/(dist/1000);if(!b.pace||p<b.pace.v)b.pace={v:p,at:s.created};}
    const sp=(c.splits||[]).map(x=>+x.secs||0);
    BEST_KM.forEach(k=>{
      if(sp.length<k)return;
      let sum=0,min=Infinity;
      for(let i=0;i<sp.length;i++){sum+=sp[i];if(i>=k)sum-=sp[i-k];if(i>=k-1&&sum<min)min=sum;}
      if(!b.best[k]||min<b.best[k].v)b.best[k]={v:min,at:s.created};
    });
  });
  return Object.values(by).sort((x,y)=>y.n-x.n);
}
// Pace (seconds per km or mile) over the last stretch of the track, for the live display.
export function recentPace(track,windowS,perM){
  const w=(windowS||30)*1000,end=track[track.length-1];
  if(!end)return 0;
  // The window stops at a pause, so the pace just after Resume isn't dragged down by it.
  let i=track.length-1;while(i>0&&!track[i].gap&&end.t-track[i-1].t<=w)i--;
  let d=0;for(let j=i+1;j<track.length;j++)d+=haversine(track[j-1],track[j]);
  const dt=(end.t-track[i].t)/1000;
  return d>5&&dt>0?dt/(d/(perM||1000)):0;
}
export function fmtPace(spm){
  if(!spm||!isFinite(spm))return "–";
  // Rounded to the second first, so 4:59.5 shows 5:00, not 4:00.
  const t=Math.round(spm),m=Math.floor(t/60),s=t%60;
  return m+":"+String(s).padStart(2,"0");
}

// Heart-rate zones as shares of maximum heart rate (the five-zone model most watches use).
export const ZONES=[[0.5,"Zone 1"],[0.6,"Zone 2"],[0.7,"Zone 3"],[0.8,"Zone 4"],[0.9,"Zone 5"]];
export function zoneOf(bpm,max){
  if(!bpm||!max)return 0;
  const f=bpm/max;let z=0;
  ZONES.forEach(([lo],i)=>{if(f>=lo)z=i+1;});
  return z;
}
// Time in each zone, average and peak, from samples [{t,bpm}].
export function hrStats(samples,max){
  const zones=[0,0,0,0,0];let sum=0,n=0,peak=0;
  for(let i=0;i<samples.length;i++){
    const s=samples[i];sum+=s.bpm;n++;peak=Math.max(peak,s.bpm);
    const next=samples[i+1],dt=next?Math.min(10,(next.t-s.t)/1000):1;
    const z=zoneOf(s.bpm,max);if(z)zones[z-1]+=dt;
  }
  return {avg:n?Math.round(sum/n):0,max:peak,zones:zones.map(Math.round)};
}

// The standard Bluetooth heart-rate measurement: a flags byte, then the rate as 8 or 16 bits.
export function parseHeartRate(view){
  const flags=view.getUint8(0);
  return flags&1?view.getUint16(1,true):view.getUint8(1);
}

// Workouts recorded on a watch: GPX (with heart rate in Garmin's extension) and TCX.
export function parseWorkoutFile(text){
  const pick=(el,names)=>{for(const n of names){const x=el.getElementsByTagName(n)[0];if(x)return x.textContent;}return null;};
  const doc=new DOMParser().parseFromString(text,"application/xml");
  const track=[],hr=[];
  const pts=[...doc.getElementsByTagName("trkpt")];
  if(pts.length){
    pts.forEach(p=>{
      const t=Date.parse(pick(p,["time"])||"");if(isNaN(t))return;
      const lat=+p.getAttribute("lat"),lon=+p.getAttribute("lon"),ele=pick(p,["ele"]);
      track.push({t,lat,lon,alt:ele==null?null:+ele});
      const b=pick(p,["gpxtpx:hr","ns3:hr","hr"]);if(b)hr.push({t,bpm:+b});
    });
  }else{
    [...doc.getElementsByTagName("Trackpoint")].forEach(p=>{
      const t=Date.parse(pick(p,["Time"])||"");if(isNaN(t))return;
      const lat=pick(p,["LatitudeDegrees"]),lon=pick(p,["LongitudeDegrees"]),alt=pick(p,["AltitudeMeters"]);
      if(lat!=null&&lon!=null)track.push({t,lat:+lat,lon:+lon,alt:alt==null?null:+alt});
      const hb=p.getElementsByTagName("HeartRateBpm")[0];
      if(hb){const v=pick(hb,["Value"]);if(v)hr.push({t,bpm:+v});}
    });
  }
  const sport=(doc.getElementsByTagName("Activity")[0]||{getAttribute:()=>null}).getAttribute("Sport")||pick(doc,["type"])||"";
  const name=pick(doc,["name"])||"";
  // TCX laps carry distance and time of their own: a treadmill run has them and no positions.
  // The lap's own DistanceMeters comes before its Track; the last trackpoint's is the running total.
  let lapDist=0,lapTime=0,lapStart=null,tpDist=0;
  [...doc.getElementsByTagName("Lap")].forEach(l=>{lapDist+=+pick(l,["DistanceMeters"])||0;lapTime+=+pick(l,["TotalTimeSeconds"])||0;
    const st=Date.parse(l.getAttribute("StartTime")||"");if(!isNaN(st)&&(lapStart==null||st<lapStart))lapStart=st;});
  [...doc.getElementsByTagName("Trackpoint")].forEach(p=>{tpDist=Math.max(tpDist,+pick(p,["DistanceMeters"])||0);});
  const start=track.length?track[0].t:(hr.length?hr[0].t:lapStart);
  const end=track.length?track[track.length-1].t:(hr.length?hr[hr.length-1].t:null);
  const secs=start&&end&&end>start?Math.round((end-start)/1000):Math.round(lapTime);
  return {track,hr,sport,name,start,secs,distM:Math.round(Math.max(lapDist,tpDist))||0};
}

// Downsample a track for storage: at most n points, always keeping the ends.
export function thin(track,n){
  if(track.length<=n)return track.slice();
  const out=[],step=(track.length-1)/(n-1);
  for(let i=0;i<n;i++)out.push(track[Math.round(i*step)]);
  return out;
}
// SVG path for a route, scaled into a w×h box.
export function routePath(track,w,h,pad){
  if(track.length<2)return "";
  const p=pad||8;let minLat=Infinity,maxLat=-Infinity,minLon=Infinity,maxLon=-Infinity;
  track.forEach(x=>{minLat=Math.min(minLat,x.lat);maxLat=Math.max(maxLat,x.lat);minLon=Math.min(minLon,x.lon);maxLon=Math.max(maxLon,x.lon);});
  const k=Math.cos((minLat+maxLat)/2*Math.PI/180),sx=(maxLon-minLon)*k||1e-9,sy=(maxLat-minLat)||1e-9;
  const s=Math.min((w-2*p)/sx,(h-2*p)/sy),ox=(w-sx*s)/2,oy=(h-sy*s)/2;
  return track.map((x,i)=>(i?"L":"M")+(ox+(x.lon-minLon)*k*s).toFixed(1)+" "+(h-oy-(x.lat-minLat)*s).toFixed(1)).join("");
}
