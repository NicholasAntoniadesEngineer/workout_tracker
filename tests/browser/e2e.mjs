// Shared by the end-to-end browser tests (screens and flows): a realistic seeded history, opening
// the app on it at a given size, and taps that land the way a finger or a mouse does — at the
// middle of the element on screen, through whatever is on top of it.
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

export const KEY="workout_days_v2";
const DAY=86400000;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// Today at 09:00 local, and n days before it (negative n: after it).
const T0=(()=>{const d=new Date();d.setHours(9,0,0,0);return d.getTime();})();
export const ago=(n,h)=>new Date(T0-n*DAY+(h||0)*3600000).toISOString();
const noonIn=n=>{const d=new Date(T0+n*DAY);d.setHours(12,0,0,0);return d.toISOString();};
export const dayKey=iso=>{const d=new Date(iso);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};

let uid=0;
const set=(r,w,o)=>Object.assign({r,w,side:false,t:35,rest:120,at:"",wu:false,band:""},o||{});
// A lifting day: [name, [[reps, weight, extra]...], exerciseFlags].
function day(id,title,n,list){
  const created=ago(n),start=Date.parse(created);let k=0;
  return {id,title,created,started:created,ended:new Date(start+62*60000).toISOString(),running:false,timerFrom:"",
    ex:list.map(([name,sets,flags])=>Object.assign({id:"e"+(++uid),name,
      sets:sets.map(([r,w,o])=>set(r,w,Object.assign({at:new Date(start+(++k)*150000).toISOString()},o||{})))},flags||{}))};
}

// Four weeks of an upper/lower split three days a week, a run with a route, today's workout
// part-way, a planned day two days on, weigh-ins, routines, check-ins, Fuel, Markers and Mind.
export function seedDoc(over){
  uid=0;
  const o=over||{},sessions=[];
  const prog=i=>Math.floor(i/2)*2.5;
  [26,24,22,19,17,15,12,10,8,5,3,1].forEach((n,i)=>{
    const p=prog(i);
    if(i%2===0)sessions.push(day("u"+i,"Upper A",n,[
      ["Bench press",[[8,40,{wu:true}],[5,80+p],[5,80+p],[5,80+p,{rpe:8.5}]]],
      ["Barbell row",[[8,60+p],[8,60+p],[8,60+p,{note:"Strict, no swing"}]]],
      ["Shoulder press",[[6,42.5+p/2],[6,42.5+p/2],[5,42.5+p/2,{kind:"fail"}]]],
      ["Pull ups",[[8,0],[7,0],[6,0]]],
      ["Hammer curl",[[12,14,{hand:true}],[12,14,{hand:true}],[10,16,{hand:true,kind:"drop"}]]]]));
    else sessions.push(day("l"+i,"Lower A",n,[
      ["Squats",[[5,60,{wu:true}],[5,100+p],[5,100+p],[5,100+p]]],
      ["Romanian deadlift",[[8,90+p],[8,90+p],[8,90+p]]],
      ["Bulgarian split squat",[[10,20,{side:true}],[10,20,{side:true}]]],
      ["Leg press",[[12,180+2*p],[12,180+2*p],[10,180+2*p]]],
      ["Plank",[[60,0],[45,0]],{timed:true}]]));
  });
  // A 5 km run six days ago: route, splits, heart rate.
  const runAt=ago(6,-1.5),track=[];
  for(let i=0;i<60;i++)track.push([+(51.5007+0.0004*i*Math.cos(i/9)).toFixed(5),+(-0.1246+0.0006*i).toFixed(5)]);
  sessions.push({id:"run1",title:"Run · 5.2 km",created:runAt,started:runAt,ended:new Date(Date.parse(runAt)+1650000).toISOString(),running:false,timerFrom:"",
    ex:[{id:"e"+(++uid),name:"Running",dist:true,timed:false,sets:[set(5210,0,{t:1650,rest:0,at:new Date(Date.parse(runAt)+1650000).toISOString(),hr:152})]}],
    cardio:{activity:"run",secs:1650,dist:5210,climb:34,splits:[1,2,3,4,5].map(n=>({n,secs:310+n*4})),rounds:0,laps:[],preset:"",
      hr:{avg:152,max:174,maxHR:190,zones:[60,240,620,560,170]},track,imported:false}});
  // Today: Upper A from the routine, the first lift done in the last half hour (so the app's
  // idle rule doesn't end it), the rest still to do.
  const today=day("today","Upper A",0,[
    ["Bench press",[[8,40,{wu:true}],[5,95]]],["Barbell row",[]],["Shoulder press",[]],["Hammer curl",[]]]);
  const midnight=new Date();midnight.setHours(0,0,30,0);
  const begun=Math.max(midnight.getTime(),Date.now()-30*60000),gap=Math.min(150000,(Date.now()-begun)/4);
  today.created=today.started=new Date(begun).toISOString();
  today.ex[0].sets.forEach((x,i)=>{x.at=new Date(begun+(i+1)*gap).toISOString();});
  today.ended=new Date(begun+3*gap).toISOString();today.routine="r1";
  sessions.push(today);
  // Planned: Lower A in two days' time.
  sessions.push({id:"plan1",title:"Lower A",created:noonIn(2),started:"",ended:"",running:false,timerFrom:"",routine:"r2",
    ex:["Squats","Romanian deadlift","Bulgarian split squat","Leg press","Plank"].map((name,i)=>({id:"p"+i,name,timed:name==="Plank",sets:[]}))});
  const body=[27,23,20,16,13,9,6,2].map((n,i)=>Object.assign({at:ago(n,-2),w:Math.round((82.4-i*0.2)*10)/10},i%3===0?{waist:86-i*0.2}:{}));
  const routines=[
    {id:"r1",name:"Upper A",ex:["Bench press","Barbell row","Shoulder press","Pull ups","Hammer curl"],
      plan:[{name:"Bench press",sets:[{r:5,w:95,rest:180},{r:5,w:95,rest:180},{r:5,w:95,rest:180}]},{name:"Barbell row",sets:[{r:8,w:72.5,rest:120},{r:8,w:72.5,rest:120},{r:8,w:72.5,rest:120}]}]},
    {id:"r2",name:"Lower A",ex:["Squats","Romanian deadlift","Bulgarian split squat","Leg press","Plank"]}];
  const checkins=[9,8,7,6,5,4,3,2,1].map((n,i)=>({at:ago(n,-2),sleep:1+i%3,soreness:2,fatigue:1+i%2,stress:2,bed:"22:45",wake:"06:45",hours:8}));
  const settings=Object.assign({unit:"kg",checkin:true,modFuel:true,modMarkers:true,modMind:true,textScale:0,theme:"light"},o.settings||{});
  const doc={version:3,welcomed:true,sessionId:"today",settings,sessions,body,routines,checkins,
    fuel:[{id:"f1",at:ago(0,-1),name:"Eggs",p:18,kcal:220,c:1,f:15},{id:"f2",at:ago(0,0.5),name:"Greek yoghurt",p:20,kcal:180,c:9,f:5},{id:"f3",at:ago(0,0.6),water:1}],
    markers:[{key:"m1",id:"ferritin",at:dayKey(ago(200)),v:48},{key:"m2",id:"ferritin",at:dayKey(ago(20)),v:95}],
    habits:["Pray","Walk","No phone in bed"],habitDone:{[dayKey(ago(0))]:["Pray"]},journal:{[dayKey(ago(0))]:"Good session, bench moving well."},
    gyms:[],favs:["Bench press"],learnSaved:[]};
  if(o.mutate)o.mutate(doc);
  return doc;
}

// Load the app on a document: blank page, clear storage (waiting for the database to go),
// seed, open, wait until the first paint is in (its photo input is part of every screen).
export async function openApp(page,srv,doc,opts,retried){
  const o=opts||{};
  if(o.w)await page.size(o.w,o.h,!!o.mobile,o.scale);
  await page.nav(srv.url+"/__blank",150);
  // The app's own database is emptied and seeded in place, the way db.js lays it out (store "kv",
  // the document under its key). Deleting the database instead can wait forever on a connection
  // still held by the app page just left (kept in the back-forward cache), and the app's own
  // open would wait behind it.
  await page.eval("localStorage.clear();await new Promise((ok,no)=>{const q=indexedDB.open('kingskiln',1);"+
    "q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onerror=()=>no(q.error);q.onblocked=()=>no(new Error('blocked'));"+
    "q.onsuccess=()=>{const db=q.result,t=db.transaction('kv','readwrite'),s=t.objectStore('kv');s.clear();"+
    (doc?"s.put("+JSON.stringify(JSON.stringify(doc))+","+JSON.stringify(KEY)+");":"")+
    "t.oncomplete=()=>{db.close();ok();};t.onerror=()=>no(t.error);};});return 1;");
  page.errors.length=0;
  await page.nav(srv.url+"/index.html"+(o.hash||""),300);
  const ok=await page.eval("const drawn=()=>document.getElementById('sheetscan')||document.querySelector('[data-welcome]');for(let i=0;i<100&&!drawn();i++)await new Promise(r=>setTimeout(r,50));"+
    // Nothing leaves the page: no printing, no share sheet, files captured instead of downloaded.
    "window.print=()=>{};try{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'canShare',{value:undefined,configurable:true});}catch(e){}"+
    "window.__files=[];const mk=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{window.__files.push(b);return mk(b);};"+
    "const ac=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.__files[window.__files.length-1].fname=this.download;return;}return ac.call(this);};"+
    "return !!drawn();");
  if(!ok){
    const seen=await page.eval("const dbs=indexedDB.databases?(await indexedDB.databases()).map(d=>d.name).join(','):'?';return location.href+' · '+document.readyState+' · databases: '+dbs+' · '+(navigator.serviceWorker.controller?'service worker':'no service worker')+' · '+"+
      "performance.getEntriesByType('resource').filter(r=>r.responseStatus&&r.responseStatus!==200).map(r=>r.name.replace(location.origin,'')+' '+r.responseStatus).join(', ')+' · '+document.body.innerText.slice(0,200);").catch(e=>e.message);
    const why="the app didn't draw: "+seen+(page.errors.length?" · errors: "+page.errors.join(" | "):"");
    // Seen about once in a hundred loads on a busy machine, with nothing thrown and nothing
    // missing: said out loud, then given one more go. A second blank start fails the test.
    if(!retried){console.warn("[e2e] "+why+" — retrying once");return openApp(page,srv,doc,opts,true);}
    throw new Error(why);
  }
  await sleep(o.settle==null?250:o.settle);
}

// The app's state, read in the page.
export const stateOf=(page,expr)=>page.eval("const {state}=await import('/js/store.js');return ("+expr+");");

// A tap the way a person makes one: the element is scrolled into view, and the press lands on
// whatever is on top at its middle — so a covered or off-screen button fails like it would in
// the hand. sel is a CSS selector; text, if given, picks the match whose text contains it.
export async function tap(page,sel,text,wait){
  const at=await page.eval(`
    const all=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;});
    const want=${JSON.stringify(text||"")};
    const el=want?all.find(e=>(e.textContent||"").replace(/\\s+/g," ").toLowerCase().indexOf(want.toLowerCase())>=0):all[0];
    if(!el)return {missing:true,count:all.length};
    // Scroll it into view the ways a finger can: up and down, and sideways only in a strip
    // that scrolls sideways (not a page whose overflow is merely hidden).
    for(let a=el.parentElement;a;a=a.parentElement){
      const s=getComputedStyle(a),r=el.getBoundingClientRect(),ar=a.getBoundingClientRect();
      if(/(auto|scroll)/.test(s.overflowY)&&a.scrollHeight>a.clientHeight&&(r.top<ar.top||r.bottom>ar.bottom))a.scrollTop+=r.top-ar.top-(ar.height-r.height)/2;
      if(/(auto|scroll)/.test(s.overflowX)&&a.scrollWidth>a.clientWidth&&(r.left<ar.left||r.right>ar.right))a.scrollLeft+=r.left-ar.left-(ar.width-r.width)/2;
    }
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const r=el.getBoundingClientRect(),x=Math.min(innerWidth-2,Math.max(1,r.left+r.width/2)),y=Math.min(innerHeight-2,Math.max(1,r.top+r.height/2));
    const top=document.elementFromPoint(x,y);
    const name=n=>n?(n.tagName.toLowerCase()+(n.id?"#"+n.id:"")+(n.className&&typeof n.className==="string"?"."+n.className.trim().split(/\\s+/).join("."):"")):"nothing";
    if(!top||!(top===el||el.contains(top)))return {covered:name(top),target:name(el),x,y};
    return {x,y};`);
  if(at.missing)throw new Error("tap: nothing visible matches "+sel+(text?" with text '"+text+"'":"")+" ("+at.count+" visible matches)");
  if(at.covered)throw new Error("tap: "+at.target+" is covered by "+at.covered+" at "+Math.round(at.x)+","+Math.round(at.y));
  await page.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:at.x,y:at.y});
  await page.send("Input.dispatchMouseEvent",{type:"mousePressed",x:at.x,y:at.y,button:"left",clickCount:1});
  await page.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:at.x,y:at.y,button:"left",clickCount:1});
  await sleep(wait==null?300:wait);
}

// Type into a field the way a keyboard does: focus it, select what's there, insert the text.
export async function type(page,sel,text){
  const ok=await page.eval(`const el=document.querySelector(${JSON.stringify(sel)});if(!el)return false;el.focus();try{el.select();}catch(e){}return true;`);
  if(!ok)throw new Error("type: no "+sel);
  await page.send("Input.insertText",{text:String(text)});
  await sleep(120);
}
export async function key(page,k){
  const codes={Enter:13,Escape:27,Tab:9};
  await page.send("Input.dispatchKeyEvent",{type:"keyDown",key:k,code:k,windowsVirtualKeyCode:codes[k]||0});
  await page.send("Input.dispatchKeyEvent",{type:"keyUp",key:k,code:k,windowsVirtualKeyCode:codes[k]||0});
  await sleep(250);
}
// A file chosen in a file input: handed to the input and its change event fired, as the picker does.
export async function chooseFile(page,sel,name,mime,content){
  const ok=await page.eval(`const el=document.querySelector(${JSON.stringify(sel)});if(!el)return false;
    const f=new File([${JSON.stringify(content)}],${JSON.stringify(name)},{type:${JSON.stringify(mime)}});
    const dt=new DataTransfer();dt.items.add(f);el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));return true;`);
  if(!ok)throw new Error("chooseFile: no "+sel);
  await sleep(500);
}
// Go to a screen by its address, as Back/Forward or a bookmark would.
export async function go(page,hash,wait){
  await page.eval("location.hash="+JSON.stringify(hash)+";return 1;");
  await sleep(wait==null?300:wait);
}
export const text=page=>page.eval("return document.getElementById('app').innerText;");

// Where failure screenshots go: a fresh folder under the system temp directory, never the repo.
let shotDir=null;
export function shotPath(name){
  if(!shotDir)shotDir=fs.mkdtempSync(path.join(os.tmpdir(),"kk-e2e-"));
  return path.join(shotDir,name.replace(/[^\w.-]+/g,"_").slice(0,150)+".png");
}
export async function saveShot(page,name){
  const p=shotPath(name);
  try{fs.writeFileSync(p,await page.shot());}catch(e){return "(screenshot failed: "+e.message+")";}
  return p;
}
export {sleep};
