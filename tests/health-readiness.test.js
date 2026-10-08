// Readiness at its edges: sleep across midnight and with gaps, session load from odd sessions,
// the 7:28 day load ratio and the fitness-fatigue pair, the four bands at their exact cut-offs,
// HRV and resting pulse against their baseline, and check-ins that are missing or half filled.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {BANDS,BAND_LABEL,acwr,banister,baselineOf,checkinKey,dailyLoads,readiness,sessionLoad,sleepHours,sleepSummary,suggestion} from "../js/ready.js";

const DAY=86400000,now=Date.parse("2026-10-08T09:00:00.000Z");
const at=d=>new Date(now-d*DAY).toISOString();
const ci=(sleep,soreness,fatigue,stress,x)=>Object.assign({sleep,soreness,fatigue,stress},x||{});
// 28 days of load: 21 at x, then 7 at y, so the ratio is 4y / (3x + y).
const loads=(x,y)=>Array.from({length:28},(_,i)=>i<21?x:y);
const run=(mins,rpe,ago)=>({created:at(ago||0),cardio:{secs:mins*60,rpe},ex:[]});
function inZone(tz,fn){const was=process.env.TZ;process.env.TZ=tz;try{fn();}finally{if(was===undefined)delete process.env.TZ;else process.env.TZ=was;}}

describe("sleep",()=>{
  test("hours between bed and wake, across midnight, to a tenth",()=>{
    assert.equal(sleepHours("22:15","06:05"),7.8);assert.equal(sleepHours("13:00","15:30"),2.5);
    assert.equal(sleepHours("06:00","05:59"),24);assert.equal(sleepHours("23:00","07:00:00"),8);
  });
  test("no time, or the same time twice, is no sleep rather than a number",()=>{
    assert.equal(sleepHours("","07:00"),0);assert.equal(sleepHours("23:00",""),0);assert.equal(sleepHours(null,undefined),0);
    assert.equal(sleepHours("07:00","07:00"),0);
  });
  test("an empty history summarises to zeros and no regularity",()=>{
    assert.deepEqual(sleepSummary([],8,now),{nights:0,avg:0,debt:0,regularMin:null});
  });
  test("one night gives an average and a debt but no regularity, which needs three",()=>{
    assert.deepEqual(sleepSummary([{at:at(1),hours:6.5,bed:"23:30"}],8,now),{nights:1,avg:6.5,debt:1.5,regularMin:null});
    const two=sleepSummary([{at:at(1),hours:7,bed:"23:00"},{at:at(2),hours:7,bed:"23:00"}],8,now);
    assert.equal(two.regularMin,null);
  });
  test("only the last 14 days count, gaps are fine, and a night with no hours is skipped",()=>{
    const c=[{at:at(20),hours:3},{at:at(14),hours:3},{at:at(13.9),hours:7},{at:at(5),hours:0},{at:at(5),hours:9},{at:at(1),hours:6}];
    const s=sleepSummary(c,8,now);
    assert.equal(s.nights,3);assert.equal(s.debt,3);assert.equal(s.avg,7.3);
  });
  test("a long night pays nothing back, and the need defaults to eight hours",()=>{
    const c=[{at:at(1),hours:10},{at:at(2),hours:6}];
    assert.equal(sleepSummary(c,8,now).debt,2);assert.equal(sleepSummary(c,0,now).debt,2);assert.equal(sleepSummary(c,undefined,now).debt,2);
    assert.equal(sleepSummary(c,7,now).debt,1);
  });
  test("bedtimes either side of midnight read as close together, not a day apart",()=>{
    const c=[{at:at(3),hours:7,bed:"23:30"},{at:at(2),hours:7,bed:"00:30"},{at:at(1),hours:7,bed:"23:30"}];
    assert.equal(sleepSummary(c,8,now).regularMin,28);
    const same=[1,2,3].map(d=>({at:at(d),hours:8,bed:"22:45"}));assert.equal(sleepSummary(same,8,now).regularMin,0);
  });
});

describe("session load",()=>{
  test("cardio is minutes × RPE, with RPE 6 when none was rated, and nothing for no time",()=>{
    assert.equal(sessionLoad({cardio:{secs:2700},ex:[]}),270);
    assert.equal(sessionLoad({cardio:{secs:0,rpe:9},ex:[]}),0);assert.equal(sessionLoad({cardio:{},ex:[]}),0);
  });
  test("strength averages RPE over the rated sets only, and warm-ups or empty days carry nothing",()=>{
    assert.equal(sessionLoad({ex:[{sets:[{r:5,rpe:9},{r:5}]}]}),27);
    assert.equal(sessionLoad({ex:[{sets:[{r:10,wu:true}]}]}),0);
    assert.equal(sessionLoad({ex:[]}),0);assert.equal(sessionLoad({ex:[{sets:[]}]}),0);
  });
  // Exposes a bug: timed and distance sets keep seconds or metres in r, and the load counts
  // them as reps, so three one-minute planks weigh as much as 180 reps.
  test("a plank's seconds and a sled's metres are not counted as reps",()=>{
    const reps=sessionLoad({ex:[{name:"Back squat",sets:[{r:10},{r:10},{r:10}]}]});
    const plank=sessionLoad({ex:[{name:"Plank",timed:true,sets:[{r:60},{r:60},{r:60}]}]});
    const sled=sessionLoad({ex:[{name:"Forward sled push",dist:true,sets:[{r:40},{r:40},{r:40}]}]});
    assert.ok(plank<=reps,"3 × 60 s plank = "+plank+", 3 × 10 squats = "+reps);
    assert.ok(sled<=reps,"3 × 40 m sled = "+sled+", 3 × 10 squats = "+reps);
  });
});

describe("daily loads, ACWR and Banister",()=>{
  test("days outside the window, and sessions with no or a broken date, are left out",()=>{
    const l=dailyLoads([run(30,6,40),run(30,6,28.5),{cardio:{secs:600,rpe:6},ex:[]},{created:"not a date",cardio:{secs:600},ex:[]}],28,now);
    assert.equal(l.length,28);assert.ok(l.every(x=>x===0));
    assert.deepEqual(dailyLoads([],7,now),[0,0,0,0,0,0,0]);
  });
  test("two sessions on one day add up",()=>{
    const l=dailyLoads([run(30,6,3),run(20,6,3)],28,now);
    assert.equal(l.reduce((a,b)=>a+b,0),300);assert.equal(l.filter(Boolean).length,1);
  });
  // Exposes a bug: the slots are measured from 27 days before this very moment, so anything
  // logged earlier today falls in yesterday's slot, today's is always empty, and the "week" is
  // six days. A steady week then reads 0.89 instead of 1.
  test("a session from an hour ago counts as today, and a steady month reads a steady ratio",()=>{
    const l=dailyLoads([{created:new Date(now-3600000).toISOString(),cardio:{secs:3600,rpe:6},ex:[]}],28,now);
    assert.equal(l[27],360,"today's slot");
    const daily=Array.from({length:40},(_,i)=>({created:new Date(now-i*DAY-1800000).toISOString(),cardio:{secs:3600,rpe:6},ex:[]}));
    assert.equal(acwr(dailyLoads(daily,28,now)).ratio,1);
  });
  test("ACWR: nothing logged is zero, never a division by zero",()=>{
    assert.deepEqual(acwr(new Array(28).fill(0)),{acute:0,chronic:0,ratio:0});
  });
  test("ACWR: a steady month is 1, a first week of training is the ceiling of 4",()=>{
    assert.equal(acwr(new Array(28).fill(50)).ratio,1);
    assert.equal(acwr(loads(0,100)).ratio,4);
    assert.deepEqual(acwr(loads(10,18)),{acute:126,chronic:84,ratio:1.5});
  });
  test("Banister: no load is no fitness and no fatigue; one session shows as fatigue first",()=>{
    assert.deepEqual(banister([]),{fitness:0,fatigue:0,form:0});
    assert.deepEqual(banister([100]),{fitness:100,fatigue:100,form:-20});
  });
  test("Banister: fatigue fades in days, fitness in weeks",()=>{
    const b=banister([500].concat(new Array(21).fill(0)));
    assert.ok(b.fatigue<b.fitness/5,JSON.stringify(b));assert.ok(b.fitness>300&&b.fitness<500);assert.ok(b.form>0);
    const steady=banister(new Array(120).fill(100));assert.ok(Number.isFinite(steady.fitness)&&steady.fitness>steady.fatigue);
  });
});

describe("the band",()=>{
  test("no check-in: no band, and it says why",()=>{
    assert.deepEqual(readiness({checkin:null}),{band:null,why:"No check-in today",score:null});
    assert.equal(readiness({}).band,null);
  });
  test("six check-ins is still warming up; the seventh shows the band",()=>{
    assert.equal(readiness({checkin:ci(1,1,1,1),count:6}).warming,true);
    assert.equal(readiness({checkin:ci(1,1,1,1)}).warming,true);
    assert.equal(readiness({checkin:ci(1,1,1,1),count:7}).band,"push");
  });
  test("run down is recover on the first day, whatever the ratings and the week",()=>{
    const r=readiness({checkin:ci(1,1,1,1,{rundown:true,hours:9}),count:0,loads28:loads(100,10),hrv:90,baseline:{hrv:50}});
    assert.equal(r.band,"recover");assert.equal(r.score,30);assert.equal(r.why,"Feeling run down");
  });
  test("the cut-offs: 85 is push, 65 is ready, 45 is easy, and the score is rounded first",()=>{
    const band=(c,o)=>{const r=readiness(Object.assign({checkin:c,count:10},o));return r.band+" "+r.score;};
    assert.equal(band(ci(2,2,2,2)),"push 85");
    assert.equal(band(ci(3,2,2,2)),"ready 81");
    assert.equal(band(ci(3,3,3,3,{hours:5}),{loads28:loads(17,8)}),"ready 65");
    assert.equal(band(ci(3,3,3,3,{hours:5})),"easy 60");
    assert.equal(band(ci(4,4,4,4,{hours:5})),"easy 45");
    assert.equal(band(ci(4,5,5,4)),"easy 48");
    assert.equal(band(ci(5,5,5,4)),"recover 44");
    assert.equal(band(ci(2,1,1,2,{}),{rhr:55,baseline:{rhr:50}}),"push 85");
  });
  test("short sleep costs ten points only under six hours",()=>{
    assert.equal(readiness({checkin:ci(3,3,3,3,{hours:6}),count:10}).score,70);
    assert.equal(readiness({checkin:ci(3,3,3,3,{hours:5.9}),count:10}).score,60);
    assert.equal(readiness({checkin:ci(3,3,3,3,{hours:0}),count:10}).score,70);
  });
  test("the load ratio: above 1.5 is a spike, 1.3 to 1.5 heavy, under 0.6 light, each at its exact edge",()=>{
    const s=l=>readiness({checkin:ci(1,1,1,1),count:10,loads28:l});
    assert.equal(s(loads(10,19)).score,85);assert.match(s(loads(10,19)).why,/a heavy week/);
    assert.equal(s(loads(10,18)).score,92);
    assert.equal(s(loads(10,15)).score,92);
    assert.equal(s(loads(9,13)).score,100);assert.doesNotMatch(s(loads(9,13)).why,/heavy/);
    const light=l=>readiness({checkin:ci(3,3,3,3),count:10,loads28:l});
    assert.equal(light(loads(17,9)).score,70);
    assert.equal(light(loads(17,8)).score,75);assert.match(light(loads(17,8)).why,/a light week/i);
    assert.equal(light(new Array(28).fill(0)).score,70,"no load at all is not a light week");
  });
  test("HRV: more than 15% under baseline costs ten, more than 10% over adds five; 15% and 10% exactly do nothing",()=>{
    const h=hrv=>readiness({checkin:ci(3,3,3,3),count:10,hrv,baseline:{hrv:100}});
    assert.equal(h(85).score,70);assert.equal(h(84).score,60);assert.match(h(84).why,/HRV low/);
    assert.equal(h(110).score,70);assert.equal(h(111).score,75);assert.match(h(111).why,/HRV high/);
    assert.equal(readiness({checkin:ci(3,3,3,3),count:10,hrv:40,baseline:{hrv:0}}).score,70,"no baseline yet");
    assert.equal(readiness({checkin:ci(3,3,3,3),count:10,hrv:40}).score,70);
  });
  test("resting pulse: five beats over baseline costs eight, four does nothing",()=>{
    const p=rhr=>readiness({checkin:ci(3,3,3,3),count:10,rhr,baseline:{rhr:50}});
    assert.equal(p(54).score,70);assert.equal(p(55).score,62);assert.match(p(55).why,/pulse up 5/i);assert.equal(p(45).score,70);
  });
  test("the score stays between 0 and 100 however the numbers stack",()=>{
    const worst=readiness({checkin:ci(5,5,5,5,{hours:3}),count:10,loads28:loads(0,100),hrv:40,rhr:70,baseline:{hrv:100,rhr:50}});
    assert.equal(worst.score,0);assert.equal(worst.band,"recover");
    const best=readiness({checkin:ci(1,1,1,1,{hours:9}),count:10,loads28:loads(100,10),hrv:150,baseline:{hrv:100}});
    assert.equal(best.score,100);assert.equal(best.band,"push");
  });
  test("why reads as one sentence, capitalised, and says so when there is nothing to say",()=>{
    assert.equal(readiness({checkin:ci(3,3,3,3),count:10}).why,"All four ratings fine");
    assert.equal(readiness({checkin:ci(3,4,4,4,{hours:7.5}),count:10}).why,"Slept 7.5 h, sore, tired, stressed");
    assert.equal(readiness({checkin:ci(3,1,3,3),count:10}).why,"Fresh legs");
  });
  // Exposes a bug: a night imported from a watch becomes a check-in with all four ratings at 0
  // (actions/importer.js), and a Hooper total of 0 scores above 100 — so a morning nobody
  // checked in on reads "Push", and a half-filled check-in scores NaN, which also lands on push.
  test("a night imported from a watch, with no ratings given, is not a readiness reading",()=>{
    const imported={at:at(0),sleep:0,soreness:0,fatigue:0,stress:0,bed:"23:00",wake:"07:00",hours:8,imported:true};
    const r=readiness({checkin:imported,count:30});
    assert.equal(r.band,null,"band "+r.band+", score "+r.score);
    const half=readiness({checkin:{sleep:3,hours:7},count:30});
    assert.ok(half.band===null||Number.isFinite(half.score),"band "+half.band+", score "+half.score);
  });
});

describe("what to do about it",()=>{
  test("each band, with a plan and without",()=>{
    assert.equal(suggestion("easy","Legs"),"Legs is planned. Keep it, but leave a rep or two in the tank.");
    assert.equal(suggestion("easy",""),"A lighter session or a steady walk suits today.");
    assert.equal(suggestion("ready","Legs"),"Legs is planned. Go as written.");
    assert.equal(suggestion("ready"),"Train as planned.");
    assert.equal(suggestion("push","Legs"),"Legs is planned. A good day to go for the top set.");
    assert.equal(suggestion("recover"),"Walk, stretch, sleep. The week still counts the day.");
  });
  test("run down says rest even with a plan, and no band says nothing",()=>{
    assert.match(suggestion("rundown","Legs"),/^Rest today/);assert.equal(suggestion("",""),"");assert.equal(suggestion(undefined,"Legs"),"");
  });
  test("every band has a label",()=>{BANDS.forEach(b=>assert.ok(BAND_LABEL[b],b));assert.deepEqual(BANDS,["recover","easy","ready","push"]);});
});

describe("the HRV and pulse baseline",()=>{
  const v=(d,hrv,rhr)=>({at:at(d),hrv,rhr});
  test("needs five readings; today's and anything 30 days old are left out",()=>{
    assert.deepEqual(baselineOf([v(1,50,55),v(2,50,55),v(3,50,55),v(4,50,55)],now),{hrv:0,rhr:0,n:4});
    const b=baselineOf([v(0,99,99),v(1,50,50),v(2,52,52),v(3,54,54),v(4,56,56),v(29,58,58),v(30,10,10)],now);
    assert.deepEqual(b,{hrv:54,rhr:54,n:5});
  });
  test("a reading with only a pulse counts for the pulse, and zeros don't drag the mean down",()=>{
    const b=baselineOf([v(1,0,50),v(2,0,50),v(3,0,50),v(4,0,50),v(5,0,50),v(6,60,0)],now);
    assert.deepEqual(b,{hrv:0,rhr:50,n:6});
    assert.deepEqual(baselineOf([],now),{hrv:0,rhr:0,n:0});
  });
});

test("a check-in belongs to the local calendar day it was made on",()=>{
  inZone("Pacific/Auckland",()=>assert.equal(checkinKey("2026-10-07T20:30:00.000Z"),"2026-10-08"));
  inZone("America/Los_Angeles",()=>assert.equal(checkinKey("2026-10-08T05:30:00.000Z"),"2026-10-07"));
  inZone("Europe/London",()=>{assert.equal(checkinKey("2026-03-29T00:30:00.000Z"),"2026-03-29");assert.equal(checkinKey("2026-10-24T23:30:00.000Z"),"2026-10-25");});
});
