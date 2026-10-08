import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {MODES,PRESETS,phases,phaseAt,totalSecs,haversine,acceptFix,trackStats,recentPace,fmtPace,zoneOf,hrStats,
  parseHeartRate,thin,routePath,cardioBests,BEST_KM} from "../js/cardio.js";

// The sums behind every run and ride: timer phases, distance, splits, pace, heart-rate zones
// and the GPS filter, pushed to their edges (no movement, jitter, pauses, a marathon, miles).

// A straight line north from a start, one point every `every` ms, `step` metres apart.
const M_PER_DEG=111194.9;
function line(n,step,every,from={lat:51,lon:0,t:Date.UTC(2026,2,1,7)},alt){
  return Array.from({length:n},(_,i)=>({t:from.t+i*every,lat:from.lat+i*step/M_PER_DEG,lon:from.lon,alt:alt?alt(i):null}));
}

describe("timer phases",()=>{
  test("every preset builds phases that add up to a positive total",()=>{
    for(const p of PRESETS){
      const list=phases(p.mode,p.o);
      if(p.mode==="free"){assert.deepEqual(list,[]);continue;}
      assert.ok(list.length>0,p.id);
      assert.ok(list.every(x=>x.secs>0&&(x.kind==="work"||x.kind==="rest")&&x.label),p.id);
      assert.ok(totalSecs(list)>0,p.id);
    }
  });
  test("rounds with no rest are back to back, and the last round never has rest after it",()=>{
    const p=phases("rounds",{work:60,rest:0,rounds:3});
    assert.deepEqual(p.map(x=>x.kind),["work","work","work"]);
    const q=phases("intervals",{work:30,rest:15,rounds:2});
    assert.deepEqual(q.map(x=>x.kind),["work","rest","work"]);
    assert.equal(q[2].label,"Hard 2 of 2");
  });
  test("an unknown mode is an open session",()=>{
    assert.deepEqual(phases("nope",{}),[]);
    assert.deepEqual(phases(undefined),[]);
  });
  test("phase boundaries belong to the next phase",()=>{
    const p=phases("tabata");
    assert.equal(phaseAt(p,0).i,0);
    assert.equal(phaseAt(p,19.999).i,0);
    assert.equal(phaseAt(p,20).i,1);
    assert.equal(phaseAt(p,20).left,10);
    assert.equal(phaseAt(p,30).phase.label,"Work 2 of 8");
    assert.equal(totalSecs(p),8*20+7*10);
    assert.equal(phaseAt(p,230).done,true);
    assert.equal(phaseAt(p,229.5).done,undefined);
  });
  test("an open session is never done, at any time",()=>{
    const at=phaseAt([],3600);
    assert.equal(at.done,false);assert.equal(at.phase,null);assert.equal(at.left,0);
  });
  test("EMOM and steady follow their minutes",()=>{
    assert.equal(totalSecs(phases("emom",{minutes:12})),720);
    assert.equal(phases("emom",{minutes:3})[2].label,"Minute 3");
    assert.equal(totalSecs(phases("steady",{minutes:45})),2700);
    assert.ok(MODES.steady.fields.includes("minutes"));
  });
});

describe("distance",()=>{
  test("haversine is symmetric, zero for the same point, and right across the date line",()=>{
    const a={lat:-33.9,lon:18.4},b={lat:51.5,lon:-0.12};
    assert.equal(haversine(a,a),0);
    assert.equal(haversine(a,b),haversine(b,a));
    assert.ok(Math.abs(haversine(a,b)-9667000)<20000);                     // Cape Town to London
    assert.ok(Math.abs(haversine({lat:0,lon:179.999},{lat:0,lon:-179.999})-222.4)<1);
    assert.ok(Math.abs(haversine({lat:0,lon:0},{lat:0,lon:180})-Math.PI*6371008.8)<1);
  });
  test("an empty, single-point or motionless track is zero distance, zero splits, never NaN",()=>{
    for(const tr of [[],[{t:0,lat:51,lon:0}],line(50,0,1000)]){
      const s=trackStats(tr);
      assert.equal(s.dist,0);assert.deepEqual(s.splits,[]);assert.equal(s.climb,0);
      assert.ok(Number.isFinite(s.secs));
    }
    assert.equal(trackStats(line(50,0,1000)).secs,49);
  });
  test("splits fall exactly on each kilometre, or each mile",()=>{
    // 10 m every 3 s: 3:20 per kilometre, 5:21.9 per mile.
    const tr=line(1001,10,3000);
    const km=trackStats(tr),mi=trackStats(tr,1609.344);
    assert.ok(Math.abs(km.dist-10000)<10);
    assert.equal(km.splits.length,10);
    assert.ok(km.splits.every(x=>Math.abs(x.secs-300)<=1),JSON.stringify(km.splits));
    assert.deepEqual(km.splits.map(x=>x.n),[1,2,3,4,5,6,7,8,9,10]);
    assert.equal(mi.splits.length,6);
    assert.ok(mi.splits.every(x=>Math.abs(x.secs-483)<=1),JSON.stringify(mi.splits));
  });
  test("a single long jump across several kilometres gives each one its share of the time",()=>{
    // Two fixes 3.5 km and 700 s apart (a tunnel): three splits of 200 s each.
    const tr=[{t:0,lat:51,lon:0},{t:700000,lat:51+3500/M_PER_DEG,lon:0}];
    const s=trackStats(tr);
    assert.deepEqual(s.splits.map(x=>x.secs),[200,200,200]);
  });
  test("climb counts only the ups",()=>{
    const tr=line(9,100,30000,undefined,i=>[10,20,15,25,25,5,30,30,40][i]);
    assert.equal(trackStats(tr).climb,10+10+25+10);
    // A missing altitude neither adds nor breaks the sum.
    tr[3].alt=null;
    assert.equal(trackStats(tr).climb,10+25+10);
  });
  test("a marathon of one-second fixes adds up to the distance in good time",()=>{
    const n=4*3600,step=42195/(n-1),tr=line(n,step,1000);
    const t0=performance.now(),s=trackStats(tr);
    assert.ok(performance.now()-t0<500);
    assert.ok(Math.abs(s.dist-42195)<20,s.dist);
    assert.equal(s.splits.length,42);
    assert.equal(s.secs,n-1);
  });
});

describe("the GPS filter",()=>{
  const at=(t,m,acc)=>({t,lat:51+m/M_PER_DEG,lon:0,acc});
  test("the first fix is taken unless its accuracy is worse than the limit",()=>{
    assert.equal(acceptFix(null,at(0,0,50)),true);
    assert.equal(acceptFix(null,at(0,0,51)),false);
    assert.equal(acceptFix(null,at(0,0,90),100),true);
    assert.equal(acceptFix(null,{t:0,lat:51,lon:0}),true,"no accuracy reported");
  });
  test("standing still with jitter under the noise floor adds nothing",()=>{
    const a=at(0,0,5);
    assert.equal(acceptFix(a,at(1000,2.9,5)),false);
    assert.equal(acceptFix(a,at(1000,3.1,5)),true);
    // Poorer accuracy raises the floor to half the reported error.
    assert.equal(acceptFix(a,at(5000,9,20)),false);
    assert.equal(acceptFix(a,at(5000,11,20)),true);
  });
  test("a fix with the same or an earlier time is refused",()=>{
    const a=at(5000,0,5);
    assert.equal(acceptFix(a,at(5000,20,5)),false);
    assert.equal(acceptFix(a,at(4000,20,5)),false);
  });
  test("a jump faster than 60 m/s is refused, a fast cyclist is not",()=>{
    const a=at(0,0,5);
    assert.equal(acceptFix(a,at(1000,59,5)),true);
    assert.equal(acceptFix(a,at(1000,61,5)),false);
    // After a gap, the same jump is plausible again.
    assert.equal(acceptFix(a,at(60000,500,5)),true);
  });
  test("jitter under the noise floor while standing for ten minutes adds no distance",()=>{
    // Feed the filter the way the live session does: compare with the last kept fix. Fixes
    // scatter within a metre either way of where the runner stands.
    let seed=7;const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647-0.5);
    const kept=[];let prev=null;
    for(let i=0;i<600;i++){
      const f={t:i*1000,lat:51+rnd()*2/M_PER_DEG,lon:rnd()*2/(M_PER_DEG*0.63),acc:6};
      if(acceptFix(prev,f)){kept.push(f);prev=f;}
    }
    assert.equal(kept.length,1);
    assert.equal(trackStats(kept).dist,0);
  });
});

describe("pace",()=>{
  test("fmtPace shows minutes and seconds, and a dash for nothing",()=>{
    assert.equal(fmtPace(300),"5:00");
    assert.equal(fmtPace(305.4),"5:05");
    assert.equal(fmtPace(59),"0:59");
    assert.equal(fmtPace(3725),"62:05");
    for(const v of [0,null,undefined,NaN,Infinity])assert.equal(fmtPace(v),"–");
  });
  test("fmtPace rounds 4:59.5 up to 5:00, not down to 4:00",()=>{
    // BUG: seconds that round to 60 are shown as :00 of the same minute, a whole minute fast.
    assert.equal(fmtPace(299.5),"5:00");
    assert.equal(fmtPace(359.7),"6:00");
  });
  test("recent pace is taken over the last window only",()=>{
    // 1 km at 10:00/km, then 300 m at 6:40/km.
    const slow=line(101,10,6000),last=slow[slow.length-1];
    const fast=line(31,10,4000,{lat:last.lat,lon:0,t:last.t}).slice(1);
    const tr=slow.concat(fast);
    assert.ok(Math.abs(recentPace(tr,30)-400)<1,recentPace(tr,30));
    assert.ok(Math.abs(recentPace(tr,30,1609.344)-643.7)<1);
    assert.ok(Math.abs(recentPace(tr,3600)-(600+120)/1.3)<2,"a window longer than the run is the whole run");
  });
  test("recent pace is zero when standing, with one fix, or with none",()=>{
    assert.equal(recentPace([],30),0);
    assert.equal(recentPace(line(1,0,1000),30),0);
    assert.equal(recentPace(line(30,0,1000),30),0);
    assert.equal(recentPace(line(30,0.1,1000),30),0,"under 5 m moved");
  });
});

describe("heart rate",()=>{
  test("zones are shares of maximum, with zero for no reading or no maximum",()=>{
    assert.equal(zoneOf(94,190),0);assert.equal(zoneOf(95,190),1);
    assert.equal(zoneOf(114,190),2);assert.equal(zoneOf(133,190),3);
    assert.equal(zoneOf(152,190),4);assert.equal(zoneOf(171,190),5);
    assert.equal(zoneOf(230,190),5);
    assert.equal(zoneOf(0,190),0);assert.equal(zoneOf(150,0),0);
  });
  test("time in zones caps a dropout at 10 s, so a lost strap doesn't paint an hour",()=>{
    const s=hrStats([{t:0,bpm:160},{t:3600000,bpm:160},{t:3601000,bpm:160}],190);
    assert.deepEqual(s.zones,[0,0,0,12,0]);
  });
  test("an empty list is all zeros, never NaN",()=>{
    assert.deepEqual(hrStats([],190),{avg:0,max:0,zones:[0,0,0,0,0]});
  });
  test("the Bluetooth measurement reads 8- and 16-bit rates and ignores the flags it doesn't use",()=>{
    const dv=b=>new DataView(Uint8Array.from(b).buffer);
    assert.equal(parseHeartRate(dv([0x16,64,0x20,0x03])),64);      // contact bits and RR intervals set
    assert.equal(parseHeartRate(dv([0x17,0x2c,0x01])),300);
    assert.equal(parseHeartRate(dv([0x00,255])),255);
  });
});

describe("thin and routePath",()=>{
  test("thin keeps both ends and never more than asked",()=>{
    const tr=line(1000,5,1000);
    const t=thin(tr,400);
    assert.equal(t.length,400);assert.equal(t[0],tr[0]);assert.equal(t[399],tr[999]);
    const short=thin(tr.slice(0,10),400);
    assert.equal(short.length,10);assert.notEqual(short,tr,"a copy, not the same array");
    const two=thin(tr,2);
    assert.deepEqual(two,[tr[0],tr[999]]);
  });
  test("thinning a long route keeps its distance within half a percent",()=>{
    // A gently winding 10 km route of 5000 points thinned to 400.
    const tr=Array.from({length:5000},(_,i)=>({t:i*1000,lat:51+i*2/M_PER_DEG,lon:Math.sin(i/400)*0.003}));
    const full=trackStats(tr).dist,thinned=trackStats(thin(tr,400)).dist;
    assert.ok(Math.abs(full-thinned)/full<0.005,full+" vs "+thinned);
  });
  test("a route path stays inside its box, even a straight north line or one point",()=>{
    assert.equal(routePath([{lat:1,lon:1}],100,50),"");
    const p=routePath(line(20,50,1000),200,100);
    const nums=p.match(/-?\d+(\.\d+)?/g).map(Number);
    assert.ok(nums.every(n=>Number.isFinite(n)&&n>=0&&n<=200),p);
    assert.doesNotMatch(p,/NaN|Infinity/);
  });
});

describe("cardio bests",()=>{
  const sp=a=>a.map((secs,i)=>({n:i+1,secs}));
  test("sessions without distance, splits or time don't make records",()=>{
    const out=cardioBests([{created:"2026-03-01T07:00:00Z",cardio:{activity:"row",dist:0,secs:0,splits:[]}}]);
    assert.equal(out.length,1);
    assert.equal(out[0].longest,null);assert.equal(out[0].pace,null);assert.deepEqual(out[0].best,{});
  });
  test("under a kilometre never sets the fastest pace",()=>{
    const [b]=cardioBests([{created:"2026-03-01T07:00:00Z",cardio:{activity:"run",dist:900,secs:120,splits:[]}},
      {created:"2026-03-02T07:00:00Z",cardio:{activity:"run",dist:5000,secs:1500,splits:sp([300,300,300,300,300])}}]);
    assert.equal(b.pace.v,300);assert.equal(b.pace.at,"2026-03-02T07:00:00Z");
  });
  test("the fastest 5 km is the best window of five splits, not the first five",()=>{
    const [b]=cardioBests([{created:"2026-03-01T07:00:00Z",cardio:{activity:"run",dist:8000,secs:2400,
      splits:sp([330,320,310,300,290,280,270,260])}}]);
    assert.equal(b.best[5].v,290+280+270+260+300);
    assert.equal(b.best[1].v,260);
    assert.equal(b.best[10],undefined);
    assert.deepEqual(BEST_KM,[1,5,10,21]);
  });
  test("a session without an activity is filed as other, and the most-done comes first",()=>{
    const out=cardioBests([{created:"a",cardio:{dist:1000,secs:300}},{created:"b",cardio:{activity:"ride",dist:1,secs:1}},
      {created:"c",cardio:{activity:"ride",dist:1,secs:1}}]);
    assert.deepEqual(out.map(b=>b.activity),["ride","other"]);
  });
});
