// The app open in two windows at once (two tabs on a laptop): what one saves the other takes up,
// so the second window can never write its older copy over the first's sets.
import {test,describe,before,after} from "node:test";
import assert from "node:assert/strict";
import {launch,serve,chromePath} from "./chrome.mjs";

const has=!!chromePath();
let srv,a,b;
const ready="for(let i=0;i<200&&!document.getElementById('sheetscan');i++)await new Promise(r=>setTimeout(r,25));return !!document.getElementById('sheetscan');";
const log=w=>"const S=await import('/js/store.js'),M=await import('/js/model.js');S.getSession().ex[0].sets.push(M.normSet({r:5,w:"+w+",at:new Date().toISOString()}));S.save();const db=await import('/js/db.js');await db.flush();return 1;";
const weights="const S=await import('/js/store.js');return S.state.sessions.find(x=>x.id==='t').ex[0].sets.map(x=>x.w);";

describe("two windows",{skip:!has&&"Chrome not found"},()=>{
  before(async()=>{srv=await serve();a=await launch({w:1200,h:900});});
  after(()=>{if(b)b.close();if(a)a.close();if(srv)srv.close();});

  test("a set logged in one window is in the other, and the other's next save keeps it",async()=>{
    await a.nav(srv.url+"/__blank",200);
    await a.eval("localStorage.clear();localStorage.setItem('workout_days_v2',JSON.stringify({version:3,welcomed:true,sessionId:'t',settings:{unit:'kg',checkin:false},sessions:[{id:'t',title:'Today',created:new Date().toISOString(),ex:[{id:'a',name:'Back squat',sets:[]}]}]}));return 1;");
    await a.nav(srv.url+"/index.html",300);assert.ok(await a.eval(ready));
    b=await a.tab();await b.nav(srv.url+"/index.html",300);assert.ok(await b.eval(ready));
    await a.eval(log(100));
    // The other window takes it up without being touched.
    let seen=[];for(let i=0;i<40;i++){seen=await b.eval(weights);if(seen.length===1)break;await new Promise(r=>setTimeout(r,100));}
    assert.deepEqual(seen,[100],"window two after window one saved");
    await b.eval(log(105));
    for(let i=0;i<40;i++){seen=await a.eval(weights);if(seen.length===2)break;await new Promise(r=>setTimeout(r,100));}
    assert.deepEqual(seen,[100,105],"window one after window two saved");
    await a.nav(srv.url+"/index.html",300);assert.ok(await a.eval(ready));
    assert.deepEqual(await a.eval(weights),[100,105],"both sets after a reload");
    assert.deepEqual(a.errors.concat(b.errors),[]);
  });
});
