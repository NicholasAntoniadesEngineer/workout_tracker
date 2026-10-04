import {test} from "node:test";
import assert from "node:assert/strict";
import {phases,phaseAt,totalSecs,haversine,trackStats,zoneOf,hrStats,parseHeartRate,acceptFix,routePath,fmtPace} from "../js/cardio.js";

test("4×4 intervals run hard and easy with no rest after the last round",()=>{
  const p=phases("intervals",{work:240,rest:240,rounds:4});
  assert.equal(p.length,7);assert.equal(totalSecs(p),240*7);
  assert.equal(phaseAt(p,250).phase.kind,"rest");assert.equal(phaseAt(p,250).left,230);
  assert.ok(phaseAt(p,240*7+1).done);
  assert.equal(phases("tabata").length,15);assert.equal(phases("emom",{minutes:10}).length,10);
});

test("distance, splits and pace come from the GPS track",()=>{
  // Points 100 m apart going north, one every 30 s: 1 km in 5 minutes.
  const track=[];for(let i=0;i<=20;i++)track.push({t:i*30000,lat:51+i*100/111195,lon:0,alt:10+i});
  const s=trackStats(track);
  assert.ok(Math.abs(s.dist-2000)<5,s.dist);assert.equal(s.splits.length,2);
  assert.ok(Math.abs(s.splits[0].secs-300)<3);assert.equal(s.climb,20);
  assert.ok(Math.abs(haversine({lat:0,lon:0},{lat:0,lon:1})-111195)<10);
  assert.equal(fmtPace(300),"5:00");
  assert.ok(routePath(track,200,100).startsWith("M"));
});

test("bad GPS fixes and standing-still jitter are dropped",()=>{
  const a={t:0,lat:51,lon:0,acc:5};
  assert.equal(acceptFix(a,{t:1000,lat:51.0000102,lon:0,acc:5}),false);       // ~1 m
  assert.equal(acceptFix(a,{t:5000,lat:51.0001,lon:0,acc:5}),true);          // ~11 m in 5 s
  assert.equal(acceptFix(a,{t:5000,lat:51.01,lon:0,acc:5}),false);           // 1.1 km in 5 s
  assert.equal(acceptFix(null,{t:0,lat:0,lon:0,acc:80}),false);
});

test("heart-rate zones, averages and the Bluetooth measurement format",()=>{
  assert.equal(zoneOf(130,190),2);assert.equal(zoneOf(180,190),5);
  const s=hrStats([{t:0,bpm:120},{t:1000,bpm:140},{t:2000,bpm:160}],190);
  assert.equal(s.avg,140);assert.equal(s.max,160);
  const dv=new DataView(new Uint8Array([0,72]).buffer);assert.equal(parseHeartRate(dv),72);
  const dv16=new DataView(new Uint8Array([1,44,1]).buffer);assert.equal(parseHeartRate(dv16),300);
});
