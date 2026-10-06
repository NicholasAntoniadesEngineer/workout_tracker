import {test} from "node:test";
import assert from "node:assert/strict";
import {acwr,banister,baselineOf,dailyLoads,readiness,sessionLoad,sleepHours,sleepSummary,suggestion} from "../js/ready.js";

const now=Date.parse("2026-10-06T12:00:00.000Z");
const at=d=>new Date(now-d*86400000).toISOString();

test("sleep hours cross midnight and sleep debt adds up over 14 nights", () => {
  assert.equal(sleepHours("23:30","07:00"),7.5);assert.equal(sleepHours("01:00","06:30"),5.5);assert.equal(sleepHours("22:00","06:00"),8);
  const c=[{at:at(1),hours:6,bed:"23:00"},{at:at(2),hours:7,bed:"23:30"},{at:at(3),hours:8.5,bed:"23:00"},{at:at(20),hours:4,bed:"02:00"}];
  const s=sleepSummary(c,8,now);
  assert.equal(s.nights,3);assert.equal(s.debt,3);assert.equal(s.avg,7.2);assert.ok(s.regularMin<20);
});

test("load: cardio by minutes × RPE, strength by working reps × RPE, rolled into ACWR and Banister", () => {
  assert.equal(sessionLoad({cardio:{secs:1800,rpe:7},ex:[]}),210);
  assert.equal(sessionLoad({ex:[{sets:[{r:10,w:60,wu:true},{r:5,w:100,rpe:8},{r:5,w:100,rpe:8}]}]}),24);
  assert.equal(sessionLoad({ex:[{sets:[{r:10,w:60}]}]}),21);
  const sessions=[{created:at(0),cardio:{secs:3600,rpe:8},ex:[]},{created:at(2),cardio:{secs:1800,rpe:6},ex:[]},{created:at(10),cardio:{secs:1800,rpe:6},ex:[]}];
  const loads=dailyLoads(sessions,28,now);
  assert.equal(loads.length,28);assert.equal(loads[27],480);assert.equal(loads[25],180);
  const a=acwr(loads);
  assert.equal(a.acute,660);assert.equal(a.chronic,210);assert.equal(a.ratio,3.14);
  const b=banister(loads);
  assert.ok(b.fatigue>0&&b.fitness>b.fatigue*0.5);
});

test("the band follows the check-in, a heavy week and HRV, and waits a week first", () => {
  const good={sleep:1,soreness:1,fatigue:1,stress:1,hours:8};
  assert.equal(readiness({checkin:null}).band,null);
  assert.equal(readiness({checkin:good,count:3}).warming,true);
  const r=readiness({checkin:good,count:10});
  assert.equal(r.band,"push");assert.equal(r.score,100);
  const bad={sleep:5,soreness:5,fatigue:4,stress:4,hours:5};
  const rb=readiness({checkin:bad,count:10});
  assert.equal(rb.band,"recover");assert.match(rb.why,/Slept 5 h, sore, tired, stressed/);
  const spike=Array.from({length:28},(_,i)=>i>=21?300:50);
  const rs=readiness({checkin:good,count:10,loads28:spike});
  assert.ok(rs.score<100);assert.match(rs.why,/heavy week/);
  const rh=readiness({checkin:good,count:10,hrv:40,rhr:62,baseline:{hrv:55,rhr:54}});
  assert.match(rh.why,/HRV low/);assert.match(rh.why,/pulse up 8/);assert.equal(rh.band,"ready");
});

test("suggestions respect the plan and never guilt", () => {
  assert.match(suggestion("recover","Press day"),/Press day is planned\. Make it an easy session/);
  assert.match(suggestion("push",""),/good day/);
  assert.equal(suggestion(null,"x"),"");
  const b=baselineOf([{at:at(1),hrv:50,rhr:55},{at:at(2),hrv:60,rhr:57},{at:at(3),hrv:55,rhr:56},{at:at(4),hrv:52,rhr:55},{at:at(5),hrv:58,rhr:54},{at:at(40),hrv:90,rhr:40}],now);
  assert.equal(b.hrv,55);assert.equal(b.rhr,55);assert.equal(b.n,5);
});
