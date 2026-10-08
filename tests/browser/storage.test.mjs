// When the phone runs out of space: a set logged then isn't lost, the app says it can't save,
// keeps trying, saves as soon as there's room, and the warning goes by itself.
import {test,describe,before,after} from "node:test";
import assert from "node:assert/strict";
import {launch,serve,chromePath} from "./chrome.mjs";

const has=!!chromePath();
let srv,page;
const ready="for(let i=0;i<200&&!document.getElementById('sheetscan');i++)await new Promise(r=>setTimeout(r,25));return !!document.getElementById('sheetscan');";

describe("storage full",{skip:!has&&"Chrome not found"},()=>{
  before(async()=>{srv=await serve();page=await launch({w:390,h:844,mobile:true});});
  after(()=>{if(page)page.close();if(srv)srv.close();});

  test("warns, keeps trying, and saves the set once there's room",async()=>{
    await page.nav(srv.url+"/__blank",200);
    await page.eval("localStorage.clear();localStorage.setItem('workout_days_v2',JSON.stringify({version:3,welcomed:true,sessionId:'t',settings:{unit:'kg',checkin:false},sessions:[{id:'t',title:'Today',created:new Date().toISOString(),ex:[{id:'a',name:'Back squat',sets:[]}]}]}));return 1;");
    await page.nav(srv.url+"/index.html",300);assert.ok(await page.eval(ready));
    const full=await page.eval(`
      // The database refuses every write, as a full disk does.
      const put=IDBObjectStore.prototype.put;window.__put=put;
      IDBObjectStore.prototype.put=function(){throw new DOMException('The quota has been exceeded.','QuotaExceededError');};
      const S=await import('/js/store.js'),M=await import('/js/model.js');S.getSession().ex[0].sets.push(M.normSet({r:5,w:100,at:new Date().toISOString()}));S.save();
      for(let i=0;i<40&&!document.querySelector('.toast[role=alert]');i++)await new Promise(r=>setTimeout(r,50));
      const t=document.querySelector('.toast[role=alert]');return {warned:!!t,text:t?t.textContent:"",full:S.state.storageFull};`);
    assert.ok(full.warned&&full.full,JSON.stringify(full));assert.match(full.text,/Can't save/);
    const saved=await page.eval(`IDBObjectStore.prototype.put=window.__put;
      for(let i=0;i<80&&document.querySelector('.toast[role=alert]');i++)await new Promise(r=>setTimeout(r,100));
      const S=await import('/js/store.js');return {gone:!document.querySelector('.toast[role=alert]'),full:S.state.storageFull};`);
    assert.ok(saved.gone&&!saved.full,"the warning should go once a retry lands: "+JSON.stringify(saved));
    await page.nav(srv.url+"/index.html",300);assert.ok(await page.eval(ready));
    assert.equal(await page.eval("const S=await import('/js/store.js');return S.state.sessions.find(x=>x.id==='t').ex[0].sets.length;"),1,"the set after a reload");
    assert.deepEqual(page.errors,[],page.errors.join("\n"));
  });
});
