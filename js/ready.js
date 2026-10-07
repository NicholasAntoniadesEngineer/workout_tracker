// Readiness without a wearable. Three inputs, all optional, each a published idea:
//  - the morning check-in: four 1–5 ratings (sleep quality, soreness, fatigue, stress) after
//    Hooper and Mackinnon's 1995 wellness questionnaire, plus bedtime and wake time;
//  - training load from the log: session RPE × minutes (Foster's method) for cardio, and
//    sets × reps × RPE scaled to minutes for strength, rolled into a 7-day:28-day ratio
//    (the acute:chronic workload ratio) and a Banister fitness/fatigue pair;
//  - imported overnight HRV and resting heart rate against a trailing 30-day baseline, as the
//    wearable makers do.
// The output is a band (recover / easy / ready / push), one plain sentence on why, and a few
// numbers for Progress. Nothing here is a black box: every rule is stated in Learn.

export const BANDS=["recover","easy","ready","push"];
export const BAND_LABEL={recover:"Recover",easy:"Easy day",ready:"Ready",push:"Push"};
const DAY=86400000;
const dayKey=iso=>{const d=new Date(iso);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const daysAgo=(iso,now)=>Math.floor((now-Date.parse(iso))/DAY);

// ── Sleep: hours between bedtime and wake, across midnight.
export function sleepHours(bed,wake){
  if(!bed||!wake)return 0;
  const [bh,bm]=bed.split(":").map(Number),[wh,wm]=wake.split(":").map(Number);
  let h=(wh+wm/60)-(bh+bm/60);if(h<0)h+=24;
  return Math.round(h*10)/10;
}
// Sleep debt over the last 14 nights against a need (default 8 h), and bedtime regularity.
export function sleepSummary(checkins,need,now){
  const n=need||8,recent=checkins.filter(c=>c.hours>0&&daysAgo(c.at,now)<14).slice(-14);
  const debt=recent.reduce((a,c)=>a+Math.max(0,n-c.hours),0);
  const beds=recent.filter(c=>c.bed).map(c=>{const [h,m]=c.bed.split(":").map(Number);let x=h+m/60;if(x<12)x+=24;return x;});
  let regular=null;
  if(beds.length>=3){const mean=beds.reduce((a,b)=>a+b,0)/beds.length;regular=Math.round(Math.sqrt(beds.reduce((a,b)=>a+(b-mean)**2,0)/beds.length)*60);}
  const avg=recent.length?Math.round(recent.reduce((a,c)=>a+c.hours,0)/recent.length*10)/10:0;
  return {nights:recent.length,avg,debt:Math.round(debt*10)/10,regularMin:regular};
}

// ── Load: one number per session. Cardio: minutes × RPE (RPE 6 when none rated). Strength:
// working sets × reps × RPE, scaled so a typical session lands near a 45-minute moderate run.
export function sessionLoad(s){
  if(s.cardio){const mins=(s.cardio.secs||0)/60,rpe=s.cardio.rpe||6;return Math.round(mins*rpe);}
  let units=0,rpeSum=0,rpeN=0;
  s.ex.forEach(e=>e.sets.forEach(x=>{if(x.wu)return;units+=x.r||0;if(x.rpe){rpeSum+=x.rpe;rpeN++;}}));
  if(!units)return 0;
  const rpe=rpeN?rpeSum/rpeN:7;
  return Math.round(units*rpe*0.3);
}
// Daily totals for the last n days, oldest first, ending today.
export function dailyLoads(sessions,n,now){
  const out=Array.from({length:n},()=>0),base=now-(n-1)*DAY;
  sessions.forEach(s=>{if(!s.created)return;const i=Math.floor((Date.parse(s.created)-base)/DAY);if(i>=0&&i<n)out[i]+=sessionLoad(s);});
  return out;
}
// ACWR: this week's load against the average week of the last four. 0.8–1.3 is the usual
// comfortable band; above 1.5 is a spike.
export function acwr(loads28){
  const acute=loads28.slice(-7).reduce((a,b)=>a+b,0),chronic=loads28.reduce((a,b)=>a+b,0)/4;
  return {acute,chronic:Math.round(chronic),ratio:chronic?Math.round(acute/chronic*100)/100:0};
}
// Banister: fitness decays over ~42 days, fatigue over ~7; form is the gap.
export function banister(loads){
  let fit=0,fat=0;
  loads.forEach(l=>{fit=fit*Math.exp(-1/42)+l;fat=fat*Math.exp(-1/7)+l;});
  return {fitness:Math.round(fit),fatigue:Math.round(fat),form:Math.round(fit*0.3-fat*0.5)};
}

// ── The band. Hooper total runs 4 (best) to 20 (worst); each slider is 1 best, 5 worst.
// HRV and RHR, when present, move it by at most one band each way.
export function readiness(opts){
  const {checkin,loads28,hrv,rhr,baseline,count}=opts;
  if(!checkin)return {band:null,why:"No check-in today",score:null};
  // Feeling run down or ill outranks every number: rest, whatever the week looks like.
  if(checkin.rundown)return {band:"recover",score:Math.min(30,100-((checkin.sleep+checkin.soreness+checkin.fatigue+checkin.stress-4)/16)*60),why:"Feeling run down",ratio:0,rundown:true};
  if((count||0)<7)return {band:null,why:"Check in for a week to see your readiness",score:null,warming:true};
  const hooper=checkin.sleep+checkin.soreness+checkin.fatigue+checkin.stress;     // 4..20
  let score=100-((hooper-4)/16)*60;                                                   // 100 at best, 40 at worst
  if(checkin.hours&&checkin.hours<6)score-=10;
  const ratio=loads28?acwr(loads28).ratio:0;
  if(ratio>1.5)score-=15;else if(ratio>1.3)score-=8;else if(ratio&&ratio<0.6)score+=5;
  const reasons=[];
  if(checkin.hours)reasons.push("slept "+checkin.hours+" h");
  if(checkin.soreness>=4)reasons.push("sore");else if(checkin.soreness<=2)reasons.push("fresh legs");
  if(checkin.fatigue>=4)reasons.push("tired");
  if(checkin.stress>=4)reasons.push("stressed");
  if(ratio>1.3)reasons.push("a heavy week");else if(ratio&&ratio<0.6)reasons.push("a light week");
  if(hrv&&baseline&&baseline.hrv){const d=(hrv-baseline.hrv)/baseline.hrv;if(d<-0.15){score-=10;reasons.push("HRV low");}else if(d>0.1){score+=5;reasons.push("HRV high");}}
  if(rhr&&baseline&&baseline.rhr){const d=rhr-baseline.rhr;if(d>=5){score-=8;reasons.push("pulse up "+Math.round(d));}}
  score=Math.max(0,Math.min(100,Math.round(score)));
  const band=score<45?"recover":score<65?"easy":score<85?"ready":"push";
  const why=reasons.length?reasons.join(", ").replace(/^./,c=>c.toUpperCase()):"All four ratings fine";
  return {band,score,why,ratio};
}

// What to do with it, given what the programme has planned today.
export function suggestion(band,planned){
  if(!band)return "";
  const p=planned?planned:"";
  if(band==="recover")return p?p+" is planned. Make it an easy session, or walk and keep the day.":"Walk, stretch, sleep. The week still counts the day.";
  if(band==="rundown")return "Rest today. Training through being run down tends to make it last longer.";
  if(band==="easy")return p?p+" is planned. Keep it, but leave a rep or two in the tank.":"A lighter session or a steady walk suits today.";
  if(band==="push")return p?p+" is planned. A good day to go for the top set.":"A good day for the hard one.";
  return p?p+" is planned. Go as written.":"Train as planned.";
}

// A 30-day baseline for imported HRV and resting heart rate.
export function baselineOf(samples,now){
  const recent=samples.filter(x=>daysAgo(x.at,now)<30&&daysAgo(x.at,now)>=1);
  const mean=k=>{const v=recent.map(x=>x[k]).filter(Boolean);return v.length>=5?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0;};
  return {hrv:mean("hrv"),rhr:mean("rhr"),n:recent.length};
}
export {dayKey as checkinKey};
