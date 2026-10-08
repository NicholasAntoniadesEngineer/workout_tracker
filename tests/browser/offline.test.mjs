// Offline first: once the app has opened, it must open again with no connection at all, every
// screen and the lazily loaded reading library working, and a set logged offline kept.
import {test,describe,before,after} from "node:test";
import assert from "node:assert/strict";
import {launch,serve,chromePath} from "./chrome.mjs";

const has=!!chromePath();
let srv,page;
const ready="for(let i=0;i<200&&!document.getElementById('sheetscan');i++)await new Promise(r=>setTimeout(r,25));return !!document.getElementById('sheetscan');";

describe("with no connection",{skip:!has&&"Chrome not found"},()=>{
  before(async()=>{srv=await serve();page=await launch({w:390,h:844,mobile:true});});
  after(()=>{if(page)page.close();if(srv)srv.close();});

  test("opens again offline, every screen and the library work, and a set logged offline is kept",async()=>{
    await page.nav(srv.url+"/__blank",200);
    await page.eval("localStorage.clear();localStorage.setItem('workout_days_v2',JSON.stringify({version:3,welcomed:true,sessionId:'t',settings:{unit:'kg',checkin:false},sessions:[{id:'t',title:'Today',created:new Date().toISOString(),ex:[{id:'a',name:'Back squat',sets:[]}]}]}));return 1;");
    await page.nav(srv.url+"/index.html",300);
    assert.ok(await page.eval(ready),"first open");
    // The service worker installs and fills its cache with every listed file.
    const cached=await page.eval(`const reg=await navigator.serviceWorker.ready;for(let i=0;i<100;i++){const ks=await caches.keys();if(ks.length){const c=await caches.open(ks[0]);const n=(await c.keys()).length;if(n>100)return {n,active:!!reg.active};}await new Promise(r=>setTimeout(r,100));}return {n:0};`);
    assert.ok(cached.n>100,"cached "+cached.n+" files");
    await page.send("Network.enable");
    await page.send("Network.emulateNetworkConditions",{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    srv.close();                                   // and the server is gone too
    await page.nav(srv.url+"/index.html",300);
    assert.ok(await page.eval(ready),"offline open");
    const seen=await page.eval(`const S=await import('/js/store.js'),out={};
      for(const [h,v] of [["#/home","home"],["#/history","history"],["#/progress","progress"],["#/calendar","calendar"],["#/cardio","cardio"],["#/settings","settings"],["#/plan","planner"],["#/review","review"],["#/learn","learn"],["#/log","log"]]){
        location.hash=h;for(let i=0;i<200&&S.state.view!==v;i++)await new Promise(r=>setTimeout(r,10));await new Promise(r=>setTimeout(r,150));out[v]=S.state.view===v&&document.getElementById('app').innerHTML.length>300;}
      const L=await import('/js/lazy.js');let lib=false;
      try{await L.loadLearn();const l=L.learnLib(),ids=l&&l.TOPICS?l.TOPICS.map(t=>t.id):[];lib=!!l&&(!ids.length||!!L.topicById(ids[0]));if(!l)lib="no library";}catch(e){lib=String(e);}
      const s=S.getSession(),M=await import('/js/model.js');s.ex[0].sets.push(M.normSet({r:5,w:100,at:new Date().toISOString()}));S.save();
      const db=await import('/js/db.js');await db.flush();return {out,lib};`);
    assert.deepEqual(Object.entries(seen.out).filter(([,v])=>!v).map(([k])=>k),[],"screens that didn't draw offline");
    assert.equal(seen.lib,true,"the reading library: "+seen.lib);
    await page.nav(srv.url+"/index.html",300);
    assert.ok(await page.eval(ready));
    const kept=await page.eval("const S=await import('/js/store.js');return S.state.sessions.find(x=>x.id==='t').ex[0].sets.length;");
    assert.equal(kept,1,"the set logged offline");
    assert.deepEqual(page.errors,[],page.errors.join("\n"));
  });
});
