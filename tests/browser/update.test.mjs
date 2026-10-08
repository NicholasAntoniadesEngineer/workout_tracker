// Getting a new release onto a phone: a new version of the app is found, installs, takes over
// and clears the old files, with the data untouched; and the "load everything fresh" fallback
// in Settings always works.
import {test,describe,before,after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {launch,serve,chromePath,ROOT} from "./chrome.mjs";

const has=!!chromePath(),SW=fs.readFileSync(path.join(ROOT,"sw.js"),"utf8"),NOW=(SW.match(/const VERSION="(v\d+)"/)||[])[1];
let srv,page,version=NOW;
const ready="for(let i=0;i<200&&!document.getElementById('sheetscan');i++)await new Promise(r=>setTimeout(r,25));return !!document.getElementById('sheetscan');";
const caches_="return (await caches.keys()).filter(k=>k.startsWith('kingskiln-')).sort();";

describe("a new release",{skip:!has&&"Chrome not found"},()=>{
  before(async()=>{srv=await serve({override:u=>u==="/sw.js"?SW.replace(/const VERSION="v\d+"/,'const VERSION="'+version+'"'):null});page=await launch({w:390,h:844,mobile:true});});
  after(()=>{if(page)page.close();if(srv)srv.close();});

  test("is found, takes over, clears the old files and keeps the data",async()=>{
    await page.nav(srv.url+"/__blank",200);
    await page.eval("localStorage.clear();localStorage.setItem('workout_days_v2',JSON.stringify({version:3,welcomed:true,sessionId:'t',settings:{unit:'kg',checkin:false},sessions:[{id:'t',title:'Today',created:new Date().toISOString(),ex:[{id:'a',name:'Back squat',sets:[{r:5,w:100,at:new Date().toISOString()}]}]}]}));return 1;");
    await page.nav(srv.url+"/index.html",300);
    assert.ok(await page.eval(ready));
    await page.eval("await navigator.serviceWorker.ready;for(let i=0;i<100&&!(await caches.keys()).length;i++)await new Promise(r=>setTimeout(r,100));return 1;");
    assert.deepEqual(await page.eval(caches_),["kingskiln-"+NOW]);
    assert.equal(await page.eval("const U=await import('/js/update.js');return await U.currentVersion();"),NOW);
    // Release the next version and ask, as Settings › Check for updates does.
    version="v"+(parseInt(NOW.slice(1),10)+1);
    const found=await page.eval("const U=await import('/js/update.js');return await U.checkForUpdate();");
    assert.ok(found==="found"||found==="latest",found);
    // It installs, takes over (the page reloads itself) and the old cache goes.
    let keys=[];for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,250));try{keys=await page.eval(caches_);}catch(e){keys=[];}if(keys.length===1&&keys[0]==="kingskiln-"+version)break;}
    assert.deepEqual(keys,["kingskiln-"+version]);
    assert.ok(await page.eval(ready));
    const data=await page.eval("const S=await import('/js/store.js');return S.state.sessions[0].ex[0].sets.length;");
    assert.equal(data,1,"the data after the update");
  });
  test("load everything fresh: drops the cache, reloads and keeps the data",async()=>{
    await page.eval("const U=await import('/js/update.js');setTimeout(()=>U.freshReload(),0);return 1;");
    await new Promise(r=>setTimeout(r,1500));
    assert.ok(await page.eval(ready));
    const after=await page.eval("const S=await import('/js/store.js');return S.state.sessions[0].ex[0].sets.length;");
    assert.equal(after,1);
    assert.deepEqual(page.errors,[],page.errors.join("\n"));
  });
});
