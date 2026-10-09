import {test,describe,mock,beforeEach,afterEach} from "node:test";
import assert from "node:assert/strict";

// A live cardio session driven the way the phone drives it: taps on Start, Pause, Lap, Skip and
// Finish, a clock that ticks, GPS fixes arriving, and the voice listened to. What is said, and
// when, and what is saved at the end. Also the spoken sentences themselves and the form cues.

const memory=new Map();
Object.defineProperty(globalThis,"localStorage",{configurable:true,writable:true,value:{
  getItem:k=>(memory.has(k)?memory.get(k):null),setItem:(k,v)=>{memory.set(k,String(v));},
  removeItem:k=>{memory.delete(k);},clear:()=>{memory.clear();}}});
globalThis.document={documentElement:{dataset:{}},getElementById:()=>null,visibilityState:"visible"};

// The voice, and a GPS that hands over whatever fixes the test gives it.
const spoken=[];
globalThis.window={speechSynthesis:{speak:u=>spoken.push(u.text)}};
globalThis.SpeechSynthesisUtterance=class{constructor(t){this.text=t;}};
const gps={watchers:new Map(),next:1,
  watchPosition(ok,err){const id=this.next++;this.watchers.set(id,{ok,err});return id;},
  clearWatch(id){this.watchers.delete(id);},
  fix(lat,lon,acc=5){for(const w of this.watchers.values())w.ok({timestamp:Date.now(),coords:{latitude:lat,longitude:lon,altitude:null,accuracy:acc}});}};
// Node before 21 has no navigator; the browser always does.
if(typeof navigator==="undefined")Object.defineProperty(globalThis,"navigator",{configurable:true,writable:true,value:{}});
Object.defineProperty(navigator,"geolocation",{configurable:true,value:gps});

const store=await import("../js/store.js");
const {state}=store;
const cardio=await import("../js/actions/cardio.js");
const {splitSpeech,lapSpeech,phaseSpeech}=await import("../js/cardio.js");
const {CUES,cuesFor}=await import("../js/cues.js");
const {EXINFO}=await import("../js/exinfo-data.js");

const T0=Date.UTC(2026,2,1,6,0,0);
const ctx={render(){}};
const tap=(sel,attrs={})=>{const el={getAttribute:k=>attrs[k]??null,closest:s=>s===sel?el:null};return cardio.handle(el,ctx);};
const M_PER_DEG=111194.9;
// Run north at a steady pace, one fix every `every` seconds, `step` metres apart.
let lat=51;
function run(metres,step,every){for(let d=0;d<metres-1e-9;d+=step){mock.timers.tick(every*1000);lat+=step/M_PER_DEG;gps.fix(lat,0);}}
// The phone's one-second ticker, run second by second.
const wait=secs=>{for(let i=0;i<secs;i++)mock.timers.tick(1000);};

function start(preset,activity="run",gpsOn=true){
  cardio.openCardio({activity,preset});
  state.cardioSetup.gps=gpsOn;
  spoken.length=0;
  tap("[data-cardiostart]");
  // The first fix, where the run begins.
  lat=51;gps.fix(lat,0);
}
function finishAndSave(){
  tap("[data-cardiofinish]");
  const done=state.cardioDone;
  tap("[data-cardiosave]");
  return {done,saved:state.sessions[state.sessions.length-1]};
}

beforeEach(()=>{
  memory.clear();store.load();
  state.settings.voice=true;state.settings.unit="kg";state.settings.maxHR=190;
  mock.timers.enable({apis:["setInterval","Date"],now:T0});
});
afterEach(()=>{try{tap("[data-cardiofinish]");}catch(e){}state.cardioDone=null;mock.timers.reset();});

describe("what the voice says",()=>{
  test("split, lap and phase sentences, singular and plural, never empty",()=>{
    assert.equal(splitSpeech(1,60,false),"Kilometre 1. 1 minute.");
    assert.equal(splitSpeech(12,0,true),"Mile 12. 0 seconds.");
    assert.equal(splitSpeech(2,59.6,false),"Kilometre 2. 1 minute.");
    assert.equal(splitSpeech(5,3601,false),"Kilometre 5. 60 minutes 1 second.");
    assert.equal(lapSpeech(1,1),"Lap 1. 1 second.");
    assert.equal(lapSpeech(3,125),"Lap 3. 2 minutes 5 seconds.");
    assert.equal(phaseSpeech({label:"Work 1 of 8",secs:20}),"Work 1 of 8. 20 seconds.");
    assert.equal(phaseSpeech({label:"Rest",secs:10},true),"Timer done.");
    assert.equal(phaseSpeech(null),"");
  });
});

describe("a timed session's cues",()=>{
  test("4 × 4 says each phase as it starts, once, and Timer done at the end",()=>{
    start("4x4","run",false);
    assert.deepEqual(spoken,["Hard 1 of 4. 4 minutes."]);
    wait(239);assert.equal(spoken.length,1,"nothing before the first change");
    wait(1);assert.equal(spoken[1],"Easy. 4 minutes.");
    wait(240);assert.equal(spoken[2],"Hard 2 of 4. 4 minutes.");
    wait(240*5);
    assert.deepEqual(spoken.slice(3),["Easy. 4 minutes.","Hard 3 of 4. 4 minutes.","Easy. 4 minutes.","Hard 4 of 4. 4 minutes.","Timer done."]);
    wait(600);assert.equal(spoken.length,8,"said once, not every second after");
  });
  test("an open session just says Go and nothing more",()=>{
    start("open","run",false);
    wait(3600);
    assert.deepEqual(spoken,["Go."]);
  });
  test("the voice switched off says nothing, and the timer still runs",()=>{
    state.settings.voice=false;
    start("tabata","run",false);
    wait(300);
    assert.deepEqual(spoken,[]);
    assert.equal(state.cardio.lastPhase,15);
  });
  test("a pause holds the timer: no cues while paused, and the phase picks up where it was",()=>{
    start("tabata","run",false);
    wait(15);tap("[data-cardiopause]");
    wait(120);assert.deepEqual(spoken,["Work 1 of 8. 20 seconds."]);
    tap("[data-cardiopause]");
    wait(4);assert.equal(spoken.length,1);
    wait(1);assert.equal(spoken[1],"Rest. 10 seconds.");
  });
  test("laps are said with their own time and saved as lap lengths",()=>{
    start("open","run",false);
    wait(90);tap("[data-cardiolap]");
    wait(110);tap("[data-cardiolap]");
    wait(50);
    assert.deepEqual(spoken.slice(1),["Lap 1. 1 minute 30 seconds.","Lap 2. 1 minute 50 seconds."]);
    const {saved}=finishAndSave();
    assert.deepEqual(saved.cardio.laps,[90,110,50]);
    assert.equal(saved.cardio.secs,250);
  });
  test("a lap tapped while paused is ignored",()=>{
    start("open","run",false);
    wait(30);tap("[data-cardiopause]");tap("[data-cardiolap]");
    assert.equal((state.cardio.laps||[]).length,0);
  });
  test("finishing part-way counts only the work rounds completed",()=>{
    start("4x4","run",false);
    wait(600);                                    // into the second hard round
    const {done,saved}=finishAndSave();
    assert.equal(done.rounds,1);assert.equal(saved.cardio.rounds,1);
    assert.equal(saved.cardio.secs,600);
    assert.equal(saved.created,new Date(T0).toISOString());
    assert.equal(Date.parse(saved.ended)-Date.parse(saved.created),600000);
  });
  test("paused time is left out of the saved duration",()=>{
    start("open","run",false);
    wait(300);tap("[data-cardiopause]");wait(600);tap("[data-cardiopause]");wait(300);
    const {saved}=finishAndSave();
    assert.equal(saved.cardio.secs,600);
    assert.equal(saved.ex[0].timed,true);assert.equal(saved.ex[0].sets[0].r,600);
  });
  test("skipping a rest moves to the next phase without adding the skipped time to the session",()=>{
    // BUG: Skip moves the start time back, so the skipped minutes are saved as training time
    // and the session's start moves earlier than when it began.
    start("4x4","run",false);
    wait(250);                                    // 10 s into the first rest
    tap("[data-cardioskip]");
    assert.equal(spoken[spoken.length-1],"Hard 2 of 4. 4 minutes.","Skip goes straight to the next phase");
    wait(60);
    const {saved}=finishAndSave();
    assert.equal(saved.cardio.secs,310,"the session was 310 s on the clock");
    assert.equal(saved.created,new Date(T0).toISOString(),"it started when Start was tapped");
  });
});

describe("GPS distance and splits, live",()=>{
  test("each kilometre is said with its own time as it is crossed",()=>{
    start("open");
    run(1000,10,3);                               // 1 km in 300 s
    run(1000,10,2.4);                             // then 1 km in 240 s
    assert.deepEqual(spoken.slice(1),["Kilometre 1. 5 minutes.","Kilometre 2. 4 minutes."]);
    const {saved}=finishAndSave();
    assert.ok(Math.abs(saved.cardio.dist-2000)<5,saved.cardio.dist);
    assert.deepEqual(saved.cardio.splits.map(x=>x.secs),[300,240]);
    assert.equal(saved.ex[0].dist,true);assert.equal(saved.ex[0].name,"Running");
    assert.match(saved.title,/^Run · 2\.0 km$/);
  });
  test("a lifter in pounds hears miles",()=>{
    state.settings.unit="lb";
    start("open");
    run(1700,10,3);
    assert.equal(spoken.length,2);
    assert.equal(spoken[1],"Mile 1. 8 minutes 3 seconds.");
  });
  test("fixes with poor accuracy, or that teleport, are not added",()=>{
    start("open");
    run(100,10,3);
    mock.timers.tick(3000);gps.fix(lat+5000/M_PER_DEG,0);     // a 5 km jump in 3 s
    mock.timers.tick(3000);gps.fix(lat+20/M_PER_DEG,0,80);    // 80 m accuracy
    run(100,10,3);
    const {saved}=finishAndSave();
    assert.ok(Math.abs(saved.cardio.dist-200)<3,saved.cardio.dist);
  });
  test("no GPS fix at all saves a timed session, not a zero-distance run",()=>{
    start("open","run",false);
    wait(1200);
    const {saved}=finishAndSave();
    assert.equal(saved.cardio.dist,0);assert.equal(saved.ex[0].timed,true);assert.deepEqual(saved.cardio.track,[]);
    assert.equal(saved.title,"Run");
  });
  test("distance covered while paused is not counted",()=>{
    // BUG: fixes are ignored while paused, but the first fix after Resume is joined to the last
    // one before Pause, so a walk to the car (or a lift) while paused is added to the run.
    start("open");
    run(500,10,3);
    tap("[data-cardiopause]");
    run(1500,10,3);                               // moved 1.5 km while paused
    tap("[data-cardiopause]");
    run(500,10,3);
    const {saved}=finishAndSave();
    assert.ok(Math.abs(saved.cardio.dist-1000)<=15,"ran 1 km, saved "+saved.cardio.dist+" m");
  });
  test("a kilometre split saved after a pause matches the one the voice said",()=>{
    // BUG: the spoken split leaves the pause out, the saved split (from fix times) keeps it in.
    start("open");
    run(500,10,3);
    tap("[data-cardiopause]");wait(600);tap("[data-cardiopause]");
    run(600,10,3);
    const said=/^Kilometre 1\. (?:(\d+) minutes?)? ?(?:(\d+) seconds?)?\.$/.exec(spoken[1]);
    assert.ok(said,spoken[1]);
    const {saved}=finishAndSave();
    assert.equal(saved.cardio.splits[0].secs,(+said[1]||0)*60+(+said[2]||0),"said "+spoken[1]);
  });
});

describe("a session survives a reload",()=>{
  test("a running session is picked up again with its track and clock",()=>{
    start("open");
    run(300,10,3);
    const before=state.cardio;
    state.cardio=null;
    cardio.resumeCardio(()=>{});
    assert.ok(state.cardio&&state.cardio!==before);
    assert.equal(state.cardio.track.length,before.track.length);
    assert.equal(state.cardio.startedAt,T0);
  });
  test("a session left more than twelve hours is dropped, not resumed",()=>{
    start("open","run",false);
    state.cardio=null;
    mock.timers.tick(13*3600*1000);
    cardio.resumeCardio(()=>{});
    assert.equal(state.cardio,null);
    assert.equal(localStorage.getItem("kk_cardio"),null);
  });
});

describe("saving a finished session",()=>{
  test("heart-rate samples become the average, peak and zones",()=>{
    const ses=cardio.cardioSession({activity:"ride",title:"Ride",created:"2026-03-01T06:00:00.000Z",secs:120,track:[],
      hr:[{t:0,bpm:100},{t:60000,bpm:150},{t:120000,bpm:170}]});
    assert.deepEqual({avg:ses.cardio.hr.avg,max:ses.cardio.hr.max,maxHR:ses.cardio.hr.maxHR},{avg:140,max:170,maxHR:190});
    assert.equal(ses.ex[0].sets[0].hr,140);
    assert.equal(ses.ex[0].name,"Cycling");
  });
  test("a treadmill with only a distance keeps it, a session with neither stays timed",()=>{
    const a=cardio.cardioSession({activity:"run",title:"T",created:"2026-03-01T06:00:00.000Z",secs:1800,track:[],distM:5000});
    assert.equal(a.cardio.dist,5000);assert.equal(a.ex[0].dist,true);assert.equal(a.ex[0].sets[0].r,5000);assert.equal(a.ex[0].sets[0].t,1800);
    const b=cardio.cardioSession({activity:"row",title:"R",created:"2026-03-01T06:00:00.000Z",secs:600,track:[]});
    assert.equal(b.ex[0].timed,true);assert.equal(b.ex[0].sets[0].r,600);assert.equal(b.cardio.hr,null);
  });
  test("the stored route is thinned and rounded to five places",()=>{
    const track=Array.from({length:1000},(_,i)=>({t:i*1000,lat:51+i*1e-5+1.234e-7,lon:-0.1}));
    const ses=cardio.cardioSession({activity:"run",title:"R",created:"2026-03-01T06:00:00.000Z",secs:999,track},{points:100});
    assert.equal(ses.cardio.track.length,100);
    assert.deepEqual(ses.cardio.track[0],[51,-0.1]);
    assert.ok(ses.cardio.track.every(p=>p.every(v=>Number.isFinite(v)&&/^-?\d+(\.\d{1,5})?$/.test(String(v)))));
  });
});

describe("form cues",()=>{
  test("every written cue has three short, non-empty lines",()=>{
    for(const [k,v] of Object.entries(CUES)){
      assert.equal(k,k.toLowerCase().trim(),k);
      assert.equal(v.length,3,k);
      assert.ok(v.every(s=>typeof s==="string"&&s.trim()&&s.length<=80),k);
    }
  });
  test("cues are found whatever the case or spacing of the name",()=>{
    assert.deepEqual(cuesFor("  Bench Press "),CUES["bench press"]);
    assert.deepEqual(cuesFor("SQUATS"),CUES.squats);
  });
  test("an exercise without its own cues falls back to its catalogue entry, else none",()=>{
    const name=Object.keys(EXINFO).find(n=>!CUES[n.toLowerCase()]&&EXINFO[n].cues&&EXINFO[n].cues.length);
    assert.ok(name,"some catalogue entry carries cues");
    assert.deepEqual(cuesFor(name),EXINFO[name].cues);
    assert.equal(cuesFor("Underwater basket weaving"),null);
    assert.equal(cuesFor(""),null);assert.equal(cuesFor(undefined),null);
  });
});
