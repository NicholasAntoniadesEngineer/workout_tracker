// The things people do, through the app's own screens in a real browser: taps land on the
// middle of what's on screen (a covered or unreachable button fails as it would in the hand),
// fields are typed into, files are handed to the app's own file inputs. Each flow checks the
// saved state it should leave and that the page threw nothing. Phone (390 × 844) unless a flow
// says otherwise. Skips when Chrome isn't installed. node --test tests/browser/flows.test.mjs
import {test,describe,before,after} from "node:test";
import assert from "node:assert/strict";
import {launch,serve,chromePath} from "./chrome.mjs";
import {seedDoc,openApp,stateOf,tap,type,key,chooseFile,go,text,saveShot,dayKey,sleep} from "./e2e.mjs";

const has=!!chromePath();
let srv,page;
const PHONE={w:390,h:844,mobile:true},LAPTOP={w:1440,h:900,mobile:false};
const S=expr=>stateOf(page,expr);
// A flow's screenshot when it fails, so the report can point at what was on screen.
async function flow(name,fn){
  try{await fn();}
  catch(e){const p=await saveShot(page,"flow_"+name);
    // A plain error, so the test report prints all of it (it shows an assertion's diff alone).
    const err=new Error(e.message+(page.errors.length?"\n    page errors: "+page.errors.map(x=>String(x).split("\n").slice(0,2).join(" ")).join(" | "):"")+"\n    screenshot: "+p);
    err.stack=err.message;throw err;}
  assert.deepEqual(page.errors,[],"page errors during "+name);
}
const today=()=>dayKey(new Date().toISOString());
// A day this month (or next, at the month's end) with nothing on it, n days on from today.
const freeDay=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d;};
// Turn the calendar to the month of d by its own arrows.
async function calendarTo(d){
  for(let i=0;i<3;i++){
    const m=await S("state.calYear*12+state.calMonth");
    const want=d.getFullYear()*12+d.getMonth();
    if(m===want)return;
    await tap(page,m<want?"#calnext":"#calprev");
  }
}

describe("flows through the app",{skip:!has&&"Chrome not found"},()=>{
  before(async()=>{srv=await serve();page=await launch(PHONE);});
  after(()=>{if(page)page.close();if(srv)srv.close();});

  // ── Logging ──────────────────────────────────────────────────────────────────────────
  test("log sets with the steppers, the keypad and the Log button; edit one, delete one, undo",()=>flow("log-sets",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    await tap(page,"[data-nav='log']");
    assert.equal(await S("state.view"),"log");
    await tap(page,".exbtn","Barbell row");
    const ex=await S("(()=>{const s=state.sessions.find(x=>x.id===state.sessionId);return s.ex.find(e=>e.name==='Barbell row').id;})()");
    assert.equal(await S("state.exId"),ex,"tapping the row selects the exercise");
    // Last time's (or the next target's) numbers come in. A light day (below every earlier set,
    // so no New best banner): two reps fewer, then three kilos off.
    const start=await S("({r:state.reps,w:state.weight})");
    assert.ok(start.r>2&&start.w>10,"picked up last time's numbers: "+JSON.stringify(start));
    await tap(page,"[data-step='reps:-1']");await tap(page,"[data-step='reps:-1']");
    for(let i=0;i<3;i++)await tap(page,"[data-step='weight:-1']");
    const r0=start.r-2,w0=start.w-3;
    assert.deepEqual(await S("({r:state.reps,w:state.weight})"),{r:r0,w:w0});
    await tap(page,"#logbtn");
    await tap(page,"[data-step='reps:-1']");
    await tap(page,"#logbtn");
    const sets=()=>S("state.sessions.find(x=>x.id===state.sessionId).ex.find(e=>e.name==='Barbell row').sets.map(x=>[x.r,x.w])");
    assert.deepEqual(await sets(),[[r0,w0],[r0-1,w0]]);
    // The keypad: 52.5 typed into the weight.
    await tap(page,"[data-edit='weight']");
    for(const k of ["5","2",".","5","done"])await tap(page,"[data-key='"+k+"']",null,150);
    assert.equal(await S("state.weight"),52.5);
    await tap(page,"#logbtn");
    assert.equal((await sets()).length,3);
    // Edit the first set: one rep fewer, then Update.
    await tap(page,".cell.has[data-ex='"+ex+"'][data-i='0']");
    assert.deepEqual(await S("state.editing"),{ex,i:0});
    await tap(page,"[data-step='reps:-1']");
    await tap(page,"#upd");
    assert.deepEqual((await sets())[0],[r0-1,w0]);
    // Delete the second, then Undo brings it back.
    await tap(page,".cell.has[data-ex='"+ex+"'][data-i='1']");
    await tap(page,"#del");
    assert.deepEqual((await sets()).map(x=>x[1]),[w0,52.5]);
    await tap(page,"#undobtn");
    assert.equal((await sets()).length,3,"Undo restores the deleted set");
    // Saved: a reload keeps all three.
    await sleep(400);await page.nav(srv.url+"/index.html#/log",900);
    assert.equal((await sets()).length,3);
  }));

  test("add an exercise by searching the list, log it, then remove it",()=>flow("add-exercise",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    await tap(page,"[data-nav='log']");
    await tap(page,"#opensheet");
    assert.equal(await S("state.sheet"),true);
    await type(page,"#exsearch","face pull");
    assert.equal(await S("state.exSearch"),"face pull");
    await tap(page,"[data-add='Cable face pull']");
    await tap(page,"#sheetdone");
    const names=()=>S("state.sessions.find(x=>x.id===state.sessionId).ex.map(e=>e.name)");
    assert.deepEqual((await names()).slice(-1),["Cable face pull"]);
    assert.equal(await S("(state.sessions.find(x=>x.id===state.sessionId).ex.find(e=>e.id===state.exId)||{}).name"),"Cable face pull","the new exercise is selected");
    await tap(page,"#logbtn");
    assert.equal(await S("state.sessions.find(x=>x.id===state.sessionId).ex.find(e=>e.name==='Cable face pull').sets.length"),1);
    await tap(page,"#removesel");
    assert.ok(!(await names()).includes("Cable face pull"),"removed from the day");
    await tap(page,"#undobtn");
    assert.ok((await names()).includes("Cable face pull"),"Undo puts it back with its set");
  }));

  test("right after a New best, the Log set button still takes the next tap",()=>flow("best-banner",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    await tap(page,"[data-nav='log']");
    await tap(page,".exbtn","Barbell row");
    for(let i=0;i<10;i++)await tap(page,"[data-step='weight:1']",null,80);   // heavier than ever
    await tap(page,"#logbtn");
    assert.ok(await S("!!state.best"),"the New best banner is up");
    await tap(page,"#logbtn");   // the next set, straight away
    assert.equal(await S("state.sessions.find(x=>x.id===state.sessionId).ex.find(e=>e.name==='Barbell row').sets.length"),2);
  }));

  test("on a laptop: type reps and weight into the set row and press Enter",()=>flow("laptop-row",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),LAPTOP);
    await tap(page,".sitem[data-nav='log']");
    await tap(page,".lgexn","Shoulder press");
    await type(page,"#rowweight","47.5");
    await type(page,"#rowreps","7");
    await key(page,"Enter");
    const s=await S("state.sessions.find(x=>x.id===state.sessionId).ex.find(e=>e.name==='Shoulder press').sets.map(x=>[x.r,x.w])");
    assert.deepEqual(s,[[7,47.5]]);
    await page.size(PHONE.w,PHONE.h,true);
  }));

  test("with extra-large text on the smallest phone, a set can still be logged and edited",()=>flow("xxl-log",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false,textScale:1.9}}),{w:320,h:640,mobile:true});
    await tap(page,"[data-nav='log']");
    await tap(page,".exbtn","Shoulder press");
    await tap(page,"[data-step='reps:1']");
    await tap(page,"#logbtn");
    const n=()=>S("state.sessions.find(x=>x.id===state.sessionId).ex.find(e=>e.name==='Shoulder press').sets.length");
    assert.equal(await n(),1);
    await tap(page,".cell.has","");
    await tap(page,"#cxl");
    assert.equal(await S("state.editing"),null,"Cancel, the last of the three edit buttons, can be reached");
    await page.size(PHONE.w,PHONE.h,true);
  }));

  test("finish a workout and see the summary",()=>flow("finish",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    await tap(page,"[data-nav='log']");
    await tap(page,".exbtn","Barbell row");
    await tap(page,"#logbtn");
    assert.equal(await S("state.sessions.find(x=>x.id===state.sessionId).running"),true,"a set starts the workout");
    await tap(page,"#wtoggle");
    assert.equal(await S("state.dialog&&state.dialog.act"),"endworkout");
    await tap(page,"#dlgok");
    const s=await S("(()=>{const s=state.sessions.find(x=>x.id===state.sessionId);return {running:s.running,ended:!!s.ended,summary:state.summary,id:s.id};})()");
    assert.deepEqual(s,{running:false,ended:true,summary:s.id,id:s.id});
    const shown=await page.eval("const m=document.querySelector('.sumsheet');return m?m.innerText:'';");
    assert.match(shown,/Workout done/i);
    assert.match(shown,/\b3\s*Sets/i,"three sets today (two seeded, one logged): "+shown);
    await tap(page,"#summaryclose");
    assert.equal(await S("state.summary"),null);
  }));

  test("a workout started again later in the day keeps running",()=>flow("start-again",async()=>{
    // Sets logged this morning, and Start again now: the clock should run, not stop itself.
    const now=new Date(),mins=now.getHours()*60+now.getMinutes();
    if(mins<75)return;   // too early in the day to have a morning
    // (The rest alarm is off here; its sound is the next flow's subject.)
    await openApp(page,srv,seedDoc({settings:{checkin:false,restSound:false},mutate:d=>{
      const t=d.sessions.find(s=>s.id==="today"),at=new Date(Date.now()-70*60000);
      t.created=t.started=new Date(at.getTime()-10*60000).toISOString();
      t.ex[0].sets.forEach((x,i)=>{x.at=new Date(at.getTime()+i*60000).toISOString();});t.ended=new Date(at.getTime()+2*60000).toISOString();}}),PHONE);
    await tap(page,"[data-nav='log']");
    assert.match(await page.eval("return document.getElementById('wtoggle').textContent;"),/Start again/);
    await tap(page,"#wtoggle",null,1600);   // the app's clock ticks once a second
    const s=await S("(()=>{const s=state.sessions.find(x=>x.id==='today');return {running:s.running,started:s.started,ended:s.ended};})()");
    assert.equal(s.running,true,"the workout ended itself within a second of Start again, its end before its start: "+JSON.stringify(s));
  }));

  // Its own browser, killed at the end: when this goes wrong the browser stops answering for
  // a minute or more, and that mustn't stall the flows after it.
  test("starting a workout with the rest alarm on (the default) leaves the app responsive",async()=>{
    const p2=await launch(PHONE),within=(ms,p)=>Promise.race([p,new Promise(r=>setTimeout(()=>r("no answer"),ms))]);
    try{
      await openApp(p2,srv,seedDoc({settings:{checkin:false}}),PHONE);
      assert.equal(await stateOf(p2,"state.settings.restSound"),true);
      await tap(p2,"[data-nav='log']");
      await tap(p2,"#wtoggle",null,1000);
      assert.equal(await stateOf(p2,"state.sessions.find(x=>x.id===state.sessionId).running"),true);
      // A tap on reps +, timed until the app has answered it (about 50 ms with the alarm off).
      const t=Date.now();
      const r=await within(5000,(async()=>{await tap(p2,"[data-step='reps:1']",null,0);await p2.eval("return 1;");return "answered";})());
      const ms=Date.now()-t;
      const shot=r!=="answered"||ms>=1000?await within(4000,saveShot(p2,"flow_responsive")):"";
      assert.ok(r==="answered"&&ms<1000,"a tap after Start workout: "+(r==="answered"?"took "+ms+" ms to land":"no answer from the page in 5 s")+
        (shot&&shot!=="no answer"?"\n    screenshot: "+shot:""));
      assert.deepEqual(p2.errors,[]);
    }finally{p2.close();}
  });

  // ── History and routines ─────────────────────────────────────────────────────────────
  test("History lists every day, a day opens in full, and a deleted day comes back with Undo",()=>flow("history",async()=>{
    const doc=seedDoc({settings:{checkin:false}});
    await openApp(page,srv,doc,PHONE);
    await tap(page,"#homedays");
    assert.equal(await S("state.view"),"history");
    const rows=await page.eval("return [...document.querySelectorAll('[data-load]')].map(e=>e.getAttribute('data-load'));");
    assert.deepEqual(rows.slice().sort(),doc.sessions.map(s=>s.id).sort(),"one row per day, planned and cardio included");
    // Open Lower A from three days ago: its sets are on the Log.
    await tap(page,"[data-load='l9'] .info");
    assert.equal(await S("state.view"),"log");assert.equal(await S("state.sessionId"),"l9");
    const table=await text(page);
    assert.match(table,/Romanian deadlift/);assert.match(table,/Leg press/);
    // Delete a day from History; Undo brings it back.
    await go(page,"#/history");
    await tap(page,"[data-delday='u8']");
    assert.equal(await S("state.sessions.some(s=>s.id==='u8')"),false);
    await tap(page,"#undobtn");
    assert.equal(await S("state.sessions.some(s=>s.id==='u8')"),true);
  }));

  test("on a laptop, History shows the chosen day beside the list",()=>flow("history-laptop",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),LAPTOP);
    await go(page,"#/history");
    await tap(page,"[data-histsel='run1']");
    const pane=await page.eval("return document.querySelector('.hdetail').innerText;");
    assert.match(pane,/5\.21 km/);assert.match(pane,/152/);
    await tap(page,"[data-histsel='u8']");
    const pane2=await page.eval("return document.querySelector('.hdetail').innerText;");
    assert.match(pane2,/Bench press/);assert.match(pane2,/Hammer curl/);
    await tap(page,".hdetail [data-load='u8']");
    assert.equal(await S("state.view+'/'+state.sessionId"),"log/u8");
    await page.size(PHONE.w,PHONE.h,true);
  }));

  test("save a day as a routine, then start today from it",()=>flow("routine",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    await go(page,"#/history");
    await tap(page,"[data-saveroutine='l9']");
    assert.equal(await S("state.dialog&&state.dialog.act"),"nameroutine");
    await type(page,"#dlgin","Leg day");
    await tap(page,"#dlgok");
    const r=await S("state.routines.find(r=>r.name==='Leg day')");
    assert.ok(r,"saved");
    assert.deepEqual(r.ex,["Squats","Romanian deadlift","Bulgarian split squat","Leg press","Plank"]);
    assert.equal(r.plan[0].sets.length,3,"the plan keeps the working sets, not the warm-up");
    // On a phone: Start another workout, then the picker's Routines.
    await tap(page,"[data-nav='home']");
    await tap(page,"#homestart");
    assert.equal(await S("state.view+'/'+state.sheet"),"log/true","a new day with the list open");
    await tap(page,"[data-picktab='routines']");
    await tap(page,"[data-applyroutine='"+r.id+"']");
    const day=()=>S("(()=>{const s=state.sessions.find(x=>x.id===state.sessionId);return {view:state.view,title:s.title,routine:s.routine,ex:s.ex.map(e=>e.name),sets:s.ex.reduce((n,e)=>n+e.sets.length,0),day:s.created};})()");
    let s=await day();
    assert.equal(s.view,"log");assert.equal(s.routine,r.id);
    assert.deepEqual(s.ex,r.ex);assert.equal(s.sets,0);assert.equal(dayKey(s.day),today());
    await tap(page,"#sheetdone");
    assert.equal(await S("state.sheet"),false);
    // On a laptop: Today's Start from a routine.
    await page.size(LAPTOP.w,LAPTOP.h,false);await sleep(400);
    await tap(page,".sitem[data-nav='home']");
    await tap(page,"[data-routine='"+r.id+"']");
    s=await day();
    assert.equal(s.view,"log");assert.equal(s.title,"Leg day");assert.equal(s.routine,r.id);assert.deepEqual(s.ex,r.ex);
    await page.size(PHONE.w,PHONE.h,true);
  }));

  // ── Planning ─────────────────────────────────────────────────────────────────────────
  test("plan a routine on a calendar day, then move it to another day",()=>flow("plan-move",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    const d1=freeDay(4),d2=freeDay(6),k1=dayKey(d1.toISOString()),k2=dayKey(d2.toISOString());
    await tap(page,"#homecal");
    assert.equal(await S("state.view"),"calendar");
    await calendarTo(d1);
    await tap(page,"[data-newday='"+k1+"']");
    assert.equal(await S("state.planDay"),k1);
    await tap(page,"[data-planroutine='r1']");
    const on=k=>S("state.sessions.filter(s=>(d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))(new Date(s.created))==='"+k+"').map(s=>({title:s.title,routine:s.routine,ex:s.ex.map(e=>e.name),sets:s.ex.reduce((n,e)=>n+e.sets.length,0)}))");
    assert.deepEqual(await on(k1),[{title:"Upper A",routine:"r1",ex:["Bench press","Barbell row","Shoulder press","Pull ups","Hammer curl"],sets:0}]);
    // The planned day opens its own sheet: Move, to two days later.
    await tap(page,"[data-calday='"+k1+"']");
    assert.ok(await S("!!state.planned"),"the planned day's sheet");
    await tap(page,"[data-planmode='move']");
    await page.eval("const el=document.getElementById('plandate');el.value="+JSON.stringify(k2)+";el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return 1;");
    await tap(page,"[data-plando='move']");
    assert.deepEqual(await on(k1),[],"nothing left on the old day");
    assert.deepEqual(await on(k2),[{title:"Upper A",routine:"r1",ex:["Bench press","Barbell row","Shoulder press","Pull ups","Hammer curl"],sets:0}]);
    await calendarTo(d2);
    assert.ok(await page.eval("return !!document.querySelector(\"[data-calday='"+k2+"']\");"),"the calendar marks the new day");
  }));

  // ── Cardio ───────────────────────────────────────────────────────────────────────────
  test("cardio without GPS: start, pause (the clock holds), resume, finish, save to History",()=>flow("cardio",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false,voice:false}}),PHONE);
    await tap(page,"#homecardio");
    assert.equal(await S("state.view"),"cardio");
    await tap(page,"[data-cardioact='row']");
    assert.equal(await S("state.cardioSetup.activity+'/'+state.cardioSetup.gps"),"row/false","indoors: no GPS");
    await tap(page,"[data-cardiostart]");
    assert.ok(await S("!!state.cardio&&state.cardio.gps===false"));
    await sleep(2100);
    await tap(page,"[data-cardiopause]","Pause");
    const el=()=>page.eval("const {elapsedOf}=await import('/js/views/cardio.js');const {state}=await import('/js/store.js');return elapsedOf(state.cardio);");
    const held=await el();
    assert.ok(held>=2,"ran two seconds: "+held);
    await sleep(1200);
    assert.ok(Math.abs(await el()-held)<0.05,"paused: the clock holds");
    await tap(page,"[data-cardiopause]","Resume");
    await sleep(1100);
    await tap(page,"[data-cardiopause]","Pause");
    assert.ok(await el()>=held+1,"resumed");
    await tap(page,"[data-cardiofinish]");
    const done=await S("state.cardioDone");
    assert.equal(done.activity,"row");assert.ok(done.secs>=3,"finished at "+done.secs+" s");
    await tap(page,"[data-cardiosave]");
    assert.equal(await S("state.view"),"history");
    const s=await S("(()=>{const s=state.sessions[state.sessions.length-1];return {cardio:!!s.cardio,act:s.cardio&&s.cardio.activity,secs:s.cardio&&s.cardio.secs,ex:s.ex.map(e=>e.name+':'+e.sets.length)};})()");
    assert.deepEqual(s,{cardio:true,act:"row",secs:done.secs,ex:["Rowing:1"]});
    assert.equal(await S("state.cardio"),null);
  }));

  // ── Check-in ─────────────────────────────────────────────────────────────────────────
  test("the morning check-in: four ratings, sleep times and a sore spot; editing it keeps one a day",()=>flow("checkin",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:true}}),PHONE);
    await tap(page,"#cistart");
    assert.ok(await S("!!state.checkinDraft"));
    for(const c of ["sleep:2","soreness:1","fatigue:2","stress:3"])await tap(page,"[data-ci='"+c+"']",null,150);
    await page.eval("for(const [id,v] of [['cibed','23:30'],['ciwake','07:00']]){const el=document.getElementById(id);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));}return 1;");
    const joint=await page.eval("return document.querySelector('[data-cisore]').getAttribute('data-cisore');");
    await tap(page,"[data-cisore='"+joint+"']");
    await tap(page,"#cisave");
    const mine=()=>S("state.checkins.filter(c=>(d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))(new Date(c.at))==='"+today()+"')");
    let c=await mine();
    assert.equal(c.length,1);
    assert.deepEqual({sleep:c[0].sleep,soreness:c[0].soreness,fatigue:c[0].fatigue,stress:c[0].stress,bed:c[0].bed,wake:c[0].wake,hours:c[0].hours,sore:c[0].sore},
      {sleep:2,soreness:1,fatigue:2,stress:3,bed:"23:30",wake:"07:00",hours:7.5,sore:[joint]});
    // Open again: today's answers are there; change one and save — still one entry today.
    await tap(page,"#cistart");
    assert.equal(await S("state.checkinDraft.stress"),3);
    await tap(page,"[data-ci='stress:1']");
    await tap(page,"#cisave");
    c=await mine();
    assert.equal(c.length,1);assert.equal(c[0].stress,1);
  }));

  // ── Settings ─────────────────────────────────────────────────────────────────────────
  // Switching unit, through Settings › Logging, as a person does it.
  async function switchUnit(u){
    await tap(page,"[data-nav='settings']");
    if(!await page.eval("return !!document.querySelector(\"[data-set='unit']\");"))await tap(page,"[data-setpart='logging']");
    await tap(page,"[data-set='unit'][data-val='"+u+"']");
    assert.equal(await S("state.settings.unit"),u);
  }
  const weights=()=>S("({sets:state.sessions.flatMap(s=>s.ex.flatMap(e=>e.sets.map(x=>x.w))),body:state.body.map(b=>b.w),plan:state.routines.flatMap(r=>(r.plan||[]).flatMap(p=>p.sets.map(x=>x.w)))})");
  const toLb=v=>v?Math.round(v/0.45359237*10)/10:v;

  test("kg to lb converts every weight in history, routines and the body log",()=>flow("units",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    const kg=await weights();
    await switchUnit("lb");
    const lb=await weights();
    assert.deepEqual(lb.sets,kg.sets.map(toLb),"sets in lb");
    assert.deepEqual(lb.body,kg.body.map(toLb),"body weights in lb");
    assert.deepEqual(lb.plan,kg.plan.map(toLb),"routine targets in lb");
    // The screens say lb (and miles) now.
    await go(page,"#/history");
    assert.match(await text(page),/\bmi\b/,"the run reads in miles");
    await go(page,"#/body");
    const body=await text(page);
    assert.match(body,/weight \(lb\)/i);assert.match(body,/[\d.]+\s*lb/);
    assert.ok(!/kg/i.test(body),"no kg left on Body");
  }));

  test("kg to lb and back again leaves every weight as it was",()=>flow("units-back",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    const kg=await weights();
    await switchUnit("lb");
    await switchUnit("kg");
    const back=await weights();
    assert.deepEqual(back.body,kg.body,"body weights come back exactly");
    assert.deepEqual(back.plan,kg.plan,"routine targets come back exactly");
    const moved=[...new Set(back.sets.map((v,i)=>kg.sets[i]+" kg → "+v+" kg").filter((x,i)=>back.sets[i]!==kg.sets[i]))];
    assert.deepEqual(moved,[],"set weights changed by switching to lb and back");
  }));

  test("Settings: Count down on the rest clock turns it on",()=>flow("rest-countdown",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false,restTarget:120}}),PHONE);
    await go(page,"#/settings");
    await tap(page,"[data-setpart='workout']");
    await tap(page,"[data-set='restDown']","Count down");
    assert.equal(await S("state.settings.restDown"),true,"restDown after tapping Count down");
    assert.match(await page.eval("return document.querySelector(\"[data-set='restDown'].on\").textContent;"),/Count down/);
  }));

  test("Settings: Large text on the printed sheet turns it on",()=>flow("print-large",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    await go(page,"#/settings");
    await tap(page,"[data-setpart='printing']");
    await tap(page,"[data-set='printLarge']","Large");
    assert.equal(await S("state.settings.printLarge"),true,"printLarge after tapping Large");
  }));

  test("Settings: typing a height saves it",()=>flow("height",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    await go(page,"#/settings");
    await tap(page,"[data-setpart='body']");
    await type(page,"#heightcm","183");
    assert.equal(await S("state.settings.heightCm"),183);
  }));

  test("Settings: choosing a reminder time saves it",()=>flow("remind-time",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    await go(page,"#/settings");
    await tap(page,"[data-setpart='reminder']");
    await page.eval("const el=document.getElementById('remtime');el.value='18:30';el.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,200));return 1;");
    assert.equal(await S("state.settings.remindTime"),"18:30");
  }));

  // ── Files ────────────────────────────────────────────────────────────────────────────
  // The backup button, as pressed: the file the app hands to the browser, read back.
  async function backupFile(){
    await go(page,"#/settings");
    await tap(page,"[data-setpart='data']");
    await page.eval("window.__files.length=0;return 1;");
    await tap(page,"#exportjson");
    const f=await page.eval("await new Promise(r=>setTimeout(r,200));const f=window.__files.find(b=>/backup/.test(b.fname||''));return f?{name:f.fname,type:f.type,text:await f.text()}:null;");
    assert.ok(f,"a backup file was offered");
    assert.match(f.name,/^kingskiln_backup_\d{4}-\d\d-\d\d\.json$/);
    return f;
  }
  // A fresh install that has skipped its welcome, loading that file through Settings › Load file.
  async function loadInto(f){
    await openApp(page,srv,{version:3,welcomed:true,settings:{checkin:false},sessions:[{id:"blank",title:"Today",created:new Date().toISOString(),started:"",ended:"",running:false,timerFrom:"",ex:[]}]},PHONE);
    await go(page,"#/settings");
    await tap(page,"[data-setpart='data']");
    await chooseFile(page,"#csvfile",f.name,"application/json",f.text);
    await sleep(300);
  }

  test("export a backup and load it into a fresh install: every day, set, routine, weigh-in and setting",()=>flow("backup",async()=>{
    const doc=seedDoc({settings:{checkin:false,unit:"kg",restTarget:180,progressRange:"8-12"}});
    await openApp(page,srv,doc,PHONE);
    const before=await S("JSON.parse(JSON.stringify({sessions:state.sessions,body:state.body,routines:state.routines,settings:state.settings}))");
    const f=await backupFile();
    assert.equal(await S("!!state.backupAt"),true,"the backup is remembered");
    await loadInto(f);
    assert.match(await S("state.dialog&&state.dialog.title"),/Backup loaded/);
    await tap(page,"#dlgok");
    const after=await S("JSON.parse(JSON.stringify({sessions:state.sessions,body:state.body,routines:state.routines,settings:state.settings}))");
    const byId=l=>Object.fromEntries(l.map(s=>[s.id,s]));
    const was=byId(before.sessions),now=byId(after.sessions);
    for(const id of Object.keys(was)){
      assert.ok(now[id],"day "+id+" came back");
      assert.deepEqual(now[id].ex.map(e=>[e.name,e.sets.map(x=>[x.r,x.w,x.wu,x.kind||"",x.rpe||0,x.note||"",x.side])]),
        was[id].ex.map(e=>[e.name,e.sets.map(x=>[x.r,x.w,x.wu,x.kind||"",x.rpe||0,x.note||"",x.side])]),"day "+id+"'s sets");
      assert.deepEqual(now[id].cardio||null,was[id].cardio||null,"day "+id+"'s cardio");
    }
    assert.deepEqual(after.body,before.body);
    assert.deepEqual(after.routines.map(r=>[r.name,r.ex,r.plan||null]),before.routines.map(r=>[r.name,r.ex,r.plan||null]));
    assert.equal(after.settings.restTarget,180);assert.equal(after.settings.progressRange,"8-12");
    // Loading the same file again doesn't double anything.
    await tap(page,"[data-nav='settings']");
    await tap(page,"[data-setpart='data']");
    await chooseFile(page,"#csvfile",f.name,"application/json",f.text);
    await tap(page,"#dlgok");
    assert.equal(await S("state.sessions.length"),after.sessions.length);
    assert.equal(await S("state.routines.length"),after.routines.length);
  }));

  test("after loading a backup, Train opens on today, not on a day planned ahead",()=>flow("backup-current",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    const f=await backupFile();
    await loadInto(f);
    await tap(page,"#dlgok");
    await tap(page,"[data-nav='log']");
    const s=await S("(()=>{const s=state.sessions.find(x=>x.id===state.sessionId);return {id:s.id,title:s.title,created:s.created};})()");
    assert.ok(dayKey(s.created)<=today(),"Train opened on "+s.title+" dated "+dayKey(s.created)+", after today ("+today()+")");
  }));

  test("a backup keeps check-ins, Fuel, Markers and Mind too",()=>flow("backup-health",async()=>{
    const doc=seedDoc({settings:{checkin:true}});
    await openApp(page,srv,doc,PHONE);
    const f=await backupFile();
    const saved=JSON.parse(f.text);
    const missing=["checkins","fuel","markers","habits","habitDone","journal"].filter(k=>!(k in saved));
    await loadInto(f);
    const got=await S("({checkins:state.checkins.length,fuel:state.fuel.length,markers:state.markers.length,habits:state.habits.length,journal:Object.keys(state.journal).length})");
    assert.deepEqual(got,{checkins:doc.checkins.length,fuel:doc.fuel.length,markers:doc.markers.length,habits:doc.habits.length,journal:1},
      "after loading the backup into a fresh install; the backup file has no "+missing.join(", "));
  }));

  test("import a Strong CSV through the Import screen",()=>flow("strong",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    const n0=await S("state.sessions.length");
    const csv=["Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE",
      "2025-03-03 07:30:00,Push,1h 5m,Bench Press (Barbell),1,60,10,0,0,,,",
      "2025-03-03 07:30:00,Push,1h 5m,Bench Press (Barbell),2,70,8,0,0,,,8",
      "2025-03-03 07:30:00,Push,1h 5m,Overhead Press (Barbell),1,40,8,0,0,,,",
      "2025-03-03 07:30:00,Push,1h 5m,Rest Timer,,,,,90,,,",
      "2025-03-05 18:00:00,Legs,50m,Squat (Barbell),W,40,10,0,0,,,",
      "2025-03-05 18:00:00,Legs,50m,Squat (Barbell),1,90,5,0,0,,,",
      "2025-03-05 18:00:00,Legs,50m,Plank,1,0,0,0,60,,,"].join("\n");
    await go(page,"#/settings");
    await tap(page,"[data-setpart='data']");
    await tap(page,"#openimport");
    assert.equal(await S("state.view"),"import");
    await chooseFile(page,"#importany","strong.csv","text/csv",csv);
    const job=await S("state.importJob&&{stage:state.importJob.stage,source:state.importJob.source,days:(state.importJob.days||[]).length,err:state.importJob.error||''}");
    assert.deepEqual(job,{stage:"review",source:"Strong",days:2,err:""});
    await tap(page,"[data-importgo]");
    assert.equal(await S("state.importJob.stage"),"done");
    const days=await S("state.sessions.filter(s=>s.created.startsWith('2025-03')).sort((a,b)=>a.created.localeCompare(b.created)).map(s=>({title:s.title,ex:s.ex.map(e=>e.name+' '+e.sets.map(x=>x.r+'@'+x.w+(x.wu?'w':'')+(x.rpe?' rpe'+x.rpe:'')).join(','))}))");
    assert.deepEqual(days,[
      {title:"Push",ex:["Bench press 10@60,8@70 rpe8","Shoulder press 8@40"]},
      {title:"Legs",ex:["Squats 10@40w,5@90","Plank 60@0"]}]);
    assert.equal(await S("state.sessions.length"),n0+2);
    await tap(page,"[data-importview='history']");
    assert.equal(await S("state.view"),"history");
    assert.match(await text(page),/Push/);
    // The same file again finds nothing new.
    await go(page,"#/import");
    await chooseFile(page,"#importany","strong.csv","text/csv",csv);
    const again=await S("state.importJob&&state.importJob.days.filter(d=>!d.dup).length");
    assert.equal(again,0,"both days are already there");
  }));

  // ── Learn ────────────────────────────────────────────────────────────────────────────
  test("open a Learn topic, share its link, and open the app from that link",()=>flow("learn",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    await page.eval("window.__clip=null;Object.defineProperty(navigator,'clipboard',{value:{writeText:t=>{window.__clip=t;return Promise.resolve();}},configurable:true});await (await import('/js/lazy.js')).loadLearn();return 1;");
    await tap(page,"[data-nav='learn']");
    assert.equal(await S("state.view"),"learn");
    const id=await page.eval("return document.querySelector('[data-learn]').getAttribute('data-learn');");
    await tap(page,"[data-learn='"+id+"']");
    assert.equal(await S("state.learnOpen"),id);
    assert.equal(await page.eval("return location.hash;"),"#/learn/t/"+encodeURIComponent(id).replace(/%20/g,"+"));
    await tap(page,"[data-learnshare='"+id+"']");
    const url=await page.eval("return window.__clip;");
    assert.ok(url&&url.endsWith("/#learn="+encodeURIComponent(id)),"shared link: "+url);
    // Someone opens the link: the app starts on that topic.
    await page.nav(srv.url+"/index.html#learn="+encodeURIComponent(id),1500);
    assert.equal(await S("state.view+'/'+state.learnOpen"),"learn/"+id);
    assert.equal(await page.eval("return location.hash;"),"#/learn/t/"+encodeURIComponent(id).replace(/%20/g,"+"),"the link is tidied into the topic's own address");
    assert.ok((await text(page)).length>200,"the topic is drawn");
    // And a link followed while the app is already open.
    await page.eval("location.hash='#learn=wendler';return 1;");await sleep(700);
    assert.equal(await S("state.learnOpen"),"wendler");
  }));

  // ── Fuel, Markers, Mind ──────────────────────────────────────────────────────────────
  test("switch on Fuel, Markers and Mind, and use each once",()=>flow("modules",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false,modFuel:false,modMarkers:false,modMind:false},mutate:d=>{d.fuel=[];d.markers=[];d.habits=[];d.habitDone={};d.journal={};}}),PHONE);
    await go(page,"#/settings");
    await tap(page,"[data-setpart='modules']");
    for(const k of ["modFuel","modMarkers","modMind"])await tap(page,"[data-set='"+k+"']");
    assert.deepEqual(await S("[state.settings.modFuel,state.settings.modMarkers,state.settings.modMind]"),[true,true,true]);
    // Fuel, from its chip on Today.
    await tap(page,"[data-nav='home']");
    await tap(page,"[data-openhealth='fuel']");
    assert.equal(await S("state.view+'/'+state.healthPart"),"health/fuel");
    const quick=await page.eval("const b=document.querySelector('[data-fueladd]');return {name:b.getAttribute('data-fueladd'),p:+b.getAttribute('data-p')};");
    await tap(page,"[data-fueladd]");
    await tap(page,"#fuelown");
    await type(page,"#fuelname","Steak");await type(page,"#fuelp","50");
    await tap(page,"#fuelsave");
    await tap(page,"[data-water='1']");
    const fuel=await S("state.fuel.map(e=>e.water?'water':e.name+':'+e.p)");
    assert.deepEqual(fuel,[quick.name+":"+quick.p,"Steak:50","water"]);
    assert.match(await text(page),new RegExp("\\b"+(quick.p+50)+"\\s*g"),"today's protein adds up");
    // Markers: a ferritin reading.
    await tap(page,"[data-health='markers']");
    await tap(page,"#markeradd");
    await type(page,"#markerv","80");
    await tap(page,"#markersave");
    assert.deepEqual(await S("state.markers.map(m=>m.id+':'+m.v+':'+m.at)"),["ferritin:80:"+today()]);
    // Mind: a habit, ticked; a line on the day; the breath timer.
    await tap(page,"[data-health='mind']");
    await tap(page,"#habitadd");
    await type(page,"#habitname","Read");
    await tap(page,"#habitsave");
    await tap(page,"[data-habit='Read']");
    assert.deepEqual(await S("state.habitDone["+JSON.stringify(today())+"]"),["Read"]);
    await type(page,"#journal","Felt strong");
    assert.equal(await S("state.journal["+JSON.stringify(today())+"]"),"Felt strong");
    await tap(page,"#breathstart");
    assert.equal(await S("state.breath&&state.breath.running"),true);
    await tap(page,"#breathstop");
    assert.equal(await S("state.breath"),null);
  }));

  // ── Year in review ───────────────────────────────────────────────────────────────────
  test("the Year in review counts the year's days and shares a picture",()=>flow("review",async()=>{
    const doc=seedDoc({settings:{checkin:false}});
    await openApp(page,srv,doc,PHONE);
    const y=new Date().getFullYear();
    const days=new Set(doc.sessions.filter(s=>(s.ex.some(e=>e.sets.length)||s.cardio)&&new Date(s.created).getFullYear()===y).map(s=>dayKey(s.created))).size;
    await tap(page,"[data-nav='progress']");
    await tap(page,"[data-review='year:"+y+"']");
    assert.equal(await S("state.view"),"review");
    const t=await text(page);
    assert.match(t,new RegExp("Your "+y));
    assert.match(t,new RegExp("\\b"+days+"\\s*days trained"),"the days trained in "+y+": "+t.slice(0,300));
    const m=new Date().getMonth();
    await tap(page,"[data-review='month:"+y+":"+m+"']");
    assert.deepEqual(await S("state.reviewPeriod"),{kind:"month",y,m});
    await page.eval("window.__files.length=0;return 1;");
    await tap(page,"#reviewshare",null,800);
    const f=await page.eval("const f=window.__files[window.__files.length-1];return f?{type:f.type,size:f.size,name:f.fname}:null;");
    assert.ok(f&&f.type==="image/png"&&f.size>5000,"a picture to share: "+JSON.stringify(f));
  }));

  test("History, Calendar, Body and Fuel opened from Progress go Back to Progress; from Today, Back to Today",()=>flow("progressback",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false,modFuel:true}}),PHONE);
    for(const [tab,view] of [["#homedays","history"],["#homecal","calendar"],["#homebody","body"],["[data-openhealth='fuel']","health"]]){
      await tap(page,"[data-nav='progress']");
      await tap(page,".pgtabs "+tab);
      assert.equal(await S("state.view"),view,tab);
      await tap(page,"#backbtn");
      assert.equal(await S("state.view"),"progress","Back from "+view);
    }
    // History, then its Calendar button, then Back: still Progress, where it began.
    await tap(page,".pgtabs #homedays");await tap(page,"#calbtn");
    assert.equal(await S("state.view"),"calendar");
    await tap(page,"#backbtn");assert.equal(await S("state.view"),"progress");
    // From Today's tile, Back is Today.
    await tap(page,"[data-nav='home']");await tap(page,"#homedays");
    await tap(page,"#backbtn");assert.equal(await S("state.view"),"home");
  }));

  test("a muscle tapped on the figure opens a close-up of its area, which the cross or Escape closes",()=>flow("musclemap",async()=>{
    await openApp(page,srv,seedDoc({settings:{checkin:false}}),PHONE);
    await tap(page,"[data-nav='progress']");
    // The thigh on the front figure: the pop-up opens on the quads, the muscle chosen.
    await tap(page,".bmfig [data-muscle='p:vastuslat']");
    assert.equal(await S("state.bmSel"),"p:vastuslat");
    assert.ok(await page.eval("return !!document.querySelector('#bmback .bmsheet');"),"the pop-up is open");
    assert.match(await page.eval("return document.querySelector('.bmpoph').innerText;"),/Quads[\s\S]*Vastus lateralis/);
    // The deep layer, and a muscle in it from its number on the drawing.
    await tap(page,"[data-bmpanel='1']");
    assert.equal(await S("state.bmSel"),"g:quads");
    await tap(page,".bmxsvg .bmtag[data-muscle='p:vastusint']");
    assert.equal(await S("state.bmSel"),"p:vastusint");
    assert.match(await page.eval("return document.querySelector('.bmpoph').innerText;"),/Vastus intermedius[\s\S]*under the rectus femoris/);
    // Looking round: a drag moves the view and chooses nothing; a faded neighbour opens its group.
    const vb0=await page.eval("return document.querySelector('.bmxsvg').getAttribute('viewBox');");
    const at=await page.eval("const r=document.querySelector('.bmxsvg').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};");
    await page.send("Input.dispatchMouseEvent",{type:"mousePressed",x:at.x,y:at.y,button:"left",clickCount:1});
    for(let i=1;i<=6;i++)await page.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:at.x+i*8,y:at.y+i*6,button:"left",buttons:1});
    await page.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:at.x+48,y:at.y+36,button:"left",clickCount:1});
    await sleep(200);
    assert.notEqual(await page.eval("return document.querySelector('.bmxsvg').getAttribute('viewBox');"),vb0,"the view moved");
    assert.equal(await S("state.bmSel"),"p:vastusint","a drag isn't a tap");
    await tap(page,"[data-bmpanel='0']");
    await tap(page,".bmxsvg .bmghost[data-muscle='p:addlong']");
    assert.equal(await S("state.bmSel"),"p:addlong");
    assert.match(await page.eval("return document.querySelector('.bmpoph').innerText;"),/Adductors[\s\S]*Adductor longus/);
    await tap(page,"#bmclose");
    assert.equal(await S("state.bmSel"),"");
    assert.ok(!(await page.eval("return !!document.querySelector('#bmback');")),"closed");
    // From the list of groups, and closed with Escape.
    await tap(page,"[data-bmregion='lower']");
    await tap(page,".bmrow[data-muscle='g:feet']");
    assert.ok(await page.eval("return !!document.querySelector('#bmback');"));
    await key(page,"Escape");
    assert.equal(await S("state.bmSel"),"");
    // An exercise for the feet, put into today's workout, then opened on Train.
    await tap(page,".bmrow[data-muscle='g:feet']");
    await tap(page,"[data-bmadd='Short foot']");
    const today=await page.eval("const {state}=await import('/js/store.js'),{dateKey,nowISO}=await import('/js/model.js');const s=state.sessions.find(x=>x.id===state.sessionId);return {today:dateKey(s.created)===dateKey(nowISO()),names:s.ex.map(e=>e.name)};");
    assert.ok(today.today&&today.names.includes("Short foot"),JSON.stringify(today));
    await tap(page,"[data-bmgo='Short foot']");
    assert.equal(await S("state.view"),"log");
    assert.equal(await page.eval("const {state,activeEx}=await import('/js/store.js');return activeEx().name;"),"Short foot");
  }));
});
