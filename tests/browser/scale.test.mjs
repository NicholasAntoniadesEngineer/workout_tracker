// Five years of hard training on one phone: about a thousand lifting days, a run a week, weigh-ins
// every other day and a check-in every morning. The app must open, draw its busiest screens,
// log a set and save it quickly, with no errors, and the saved document must survive a reload.
import {test,describe,before,after} from "node:test";
import assert from "node:assert/strict";
import {launch,serve,chromePath} from "./chrome.mjs";

const has=!!chromePath();
let srv,page;
// Generous for a laptop's headless Chrome; a phone is a few times slower, so these keep it usable there.
const OPEN_MS=4000,SCREEN_MS=1500,SAVE_MS=400;

describe("five years of data",{skip:!has&&"Chrome not found"},()=>{
  before(async()=>{srv=await serve();page=await launch({w:390,h:844,mobile:true});});
  after(()=>{if(page)page.close();if(srv)srv.close();});

  test("opens, draws every busy screen, logs and saves a set, and keeps it all after a reload",async()=>{
    await page.nav(srv.url+"/__blank",200);
    const seeded=await page.eval(`
      localStorage.clear();await new Promise(r=>{const q=indexedDB.deleteDatabase('kingskiln');q.onsuccess=q.onerror=q.onblocked=()=>r();});
      const db=await import('/js/db.js');await db.init();
      const DAY=86400000,end=new Date();end.setHours(7,0,0,0);const start=end.getTime()-5*365*DAY;
      const LIFTS=[["Back squat",100],["Bench press",80],["Deadlift",140],["Overhead press",50],["Barbell row",70],["Pull ups",0],["Romanian deadlift",90],["Bicep curls",14],["Leg press",180],["Lateral raise",10]];
      const sessions=[],body=[],checkins=[];let n=0;
      for(let t=start;t<=end.getTime();t+=DAY){
        const d=new Date(t),dow=d.getDay(),prog=(t-start)/(5*365*DAY);
        if(dow===1||dow===2||dow===4||dow===5){
          const pick=[0,1,2,3,4,5,6,7,8,9].filter(i=>(i+dow)%2===0).slice(0,5);
          sessions.push({id:"s"+(n++),title:"Day "+dow,created:new Date(t).toISOString(),started:new Date(t).toISOString(),ended:new Date(t+3600000).toISOString(),running:false,timerFrom:"",
            ex:pick.map((i,k)=>({id:"e"+n+"_"+k,name:LIFTS[i][0],sets:Array.from({length:4},(_,j)=>({r:5+((j+k)%4),w:Math.round(LIFTS[i][1]*(0.8+0.4*prog)/2.5)*2.5,side:false,t:40,rest:120,
              at:new Date(t+(k*4+j+1)*180000).toISOString(),wu:j===0,band:""}))}))});
        }
        if(dow===6)sessions.push({id:"c"+(n++),title:"Run",created:new Date(t).toISOString(),started:new Date(t).toISOString(),ended:new Date(t+2400000).toISOString(),running:false,timerFrom:"",ex:[],
          cardio:{activity:"run",secs:2400-Math.round(prog*300),dist:8000,climb:40,splits:[],rounds:0,laps:[],preset:""}});
        if(dow%2===0)body.push({at:new Date(t).toISOString(),w:Math.round((86-prog*4)*10)/10});
        checkins.push({at:new Date(t).toISOString(),bed:"22:45",wake:"06:30",hours:7.75,sleep:2,soreness:2,fatigue:2,stress:2});
      }
      sessions.reverse();
      const today={id:"today",title:"Today",created:new Date().toISOString(),started:"",ended:"",running:false,timerFrom:"",ex:[{id:"t1",name:"Back squat",sets:[]}]};
      sessions.unshift(today);
      const doc=JSON.stringify({version:3,welcomed:true,sessionId:"today",settings:{unit:"kg",checkin:false},sessions,body,checkins});
      db.setItem('workout_days_v2',doc);await db.flush();
      return {sessions:sessions.length,sets:sessions.reduce((a,s)=>a+s.ex.reduce((b,e)=>b+e.sets.length,0),0),mb:+(doc.length/1048576).toFixed(2)};`);
    assert.ok(seeded.sessions>1000&&seeded.sets>18000,JSON.stringify(seeded));

    const t0=Date.now();await page.nav(srv.url+"/index.html",50);
    const opened=await page.eval("const t=performance.now();for(let i=0;i<200&&!document.getElementById('sheetscan');i++)await new Promise(r=>setTimeout(r,25));return document.getElementById('sheetscan')?Math.round(performance.timing.domContentLoadedEventEnd-performance.timing.navigationStart+performance.now()-t):-1;");
    const openMs=Date.now()-t0;
    assert.ok(opened>0,"the app didn't open");assert.ok(openMs<OPEN_MS,"opened in "+openMs+" ms");

    const times={};
    const VIEW={"#/home":"home","#/history":"history","#/calendar":"calendar","#/progress":"progress","#/body":"body","#/cardio":"cardio","#/review":"review","#/plan":"planner","#/log":"log"};
    for(const [hash,view] of Object.entries(VIEW)){
      // From the tap to the new screen drawn: the app has switched view and painted once since.
      times[hash]=await page.eval("const S=await import('/js/store.js'),t=performance.now();location.hash="+JSON.stringify(hash)+";for(let i=0;i<400&&S.state.view!=="+JSON.stringify(view)+";i++)await new Promise(r=>setTimeout(r,5));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return S.state.view==="+JSON.stringify(view)+"?Math.round(performance.now()-t):-1;");
      assert.ok(times[hash]>=0,hash+" never showed");assert.ok(times[hash]<SCREEN_MS,hash+" took "+times[hash]+" ms");
    }
    // Log a set the way the app does and time the save.
    const saved=await page.eval(`const S=await import('/js/store.js'),M=await import('/js/model.js');const s=S.getSession();
      const t=performance.now();s.ex[0].sets.push(M.normSet({r:5,w:120,at:new Date().toISOString()}));S.save();const ms=performance.now()-t;
      const db=await import('/js/db.js');await db.flush();return {ms:Math.round(ms),sets:s.ex[0].sets.length};`);
    assert.ok(saved.ms<SAVE_MS,"saving took "+saved.ms+" ms");
    await page.nav(srv.url+"/index.html",50);
    const back=await page.eval("for(let i=0;i<200&&!document.getElementById('sheetscan');i++)await new Promise(r=>setTimeout(r,25));const S=await import('/js/store.js');const s=S.state.sessions.find(x=>x.id==='today');return {n:S.state.sessions.length,sets:s?s.ex[0].sets.length:-1,w:s&&s.ex[0].sets[0]?s.ex[0].sets[0].w:0};");
    assert.deepEqual([back.n,back.sets,back.w],[seeded.sessions,1,120],"after a reload");
    assert.deepEqual(page.errors,[],page.errors.join("\n"));
    console.log("  five years:",JSON.stringify({seeded,openMs,screens:times,saveMs:saved.ms}));
  });
});
