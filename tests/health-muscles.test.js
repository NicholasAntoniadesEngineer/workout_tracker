// Muscles this week, beyond the basics: names that sit near another rule's words, the empty and
// odd inputs, the edges of the week window and of the five-day recovery look-back, and the
// sets timed inside a session rather than at its start.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {JOINTS,JOINT_NAME,MUSCLES,MUSCLE_NAME,contributors,fatigueByMuscle,musclesOf,recoveryWord,setsByMuscle} from "../js/muscles.js";

const DAY=86400000,HOUR=3600000,now=Date.UTC(2026,9,8,12);
const iso=t=>new Date(t).toISOString();
const sets=(n,t,x)=>Array.from({length:n},()=>Object.assign({r:8,w:60,at:t?iso(t):""},x||{}));
const day=(t,name,n,x)=>({id:"d"+t+name,created:iso(t),ex:[{name,sets:sets(n,t,x)}]});

describe("which muscles a name trains",()=>{
  test("the tables agree with each other",()=>{
    assert.equal(new Set(MUSCLES.map(m=>m[0])).size,MUSCLES.length);
    MUSCLES.forEach(m=>{assert.equal(MUSCLE_NAME[m[0]],m[1]);assert.ok(["upper","core","lower"].includes(m[2]),m[0]);});
    JOINTS.forEach(j=>assert.equal(JOINT_NAME[j[0]],j[1]));
  });
  test("every muscle and joint any name maps to is one the figure and the check-in know",()=>{
    const names=["Squats","Bench press","Deadlift","Pull ups","Plank","Farmer carry","Snatch","Calf raises","Neck curl","Hip thrust","Dips","Mystery move"];
    names.forEach(n=>{const m=musclesOf(n);m.primary.concat(m.secondary).forEach(k=>assert.ok(MUSCLE_NAME[k],n+": "+k));m.joints.forEach(j=>assert.ok(JOINT_NAME[j],n+": "+j));});
  });
  test("an empty, missing or unknown name trains nothing and never throws",()=>{
    for(const n of ["","   ",undefined,null,"Zzzz"])assert.deepEqual(musclesOf(n),{primary:[],secondary:[],joints:[]},String(n));
  });
  test("case and spacing don't matter",()=>{
    assert.deepEqual(musclesOf("  BACK SQUAT "),musclesOf("back squat"));
  });
  test("names that brush against another rule land on the right one",()=>{
    const p=n=>musclesOf(n).primary;
    assert.deepEqual(p("Narrow-grip bench press"),["chest","triceps"]);   // "row" inside "narrow"
    assert.deepEqual(p("Shot put"),["glutes","frontdelt"]);              // "row" inside "throw" in the list below it
    assert.deepEqual(p("Javelin throw"),["glutes","frontdelt"]);
    assert.deepEqual(p("Upright row"),["sidedelt"]);
    assert.deepEqual(p("Leg press calf raise"),["calves"]);
    assert.deepEqual(p("Snatch-grip deadlift"),["glutes","hamstrings","lowerback"]);
    assert.deepEqual(p("Hammer curl"),["biceps","forearms"]);
    assert.deepEqual(p("Rolling dumbbell tricep extension"),["triceps"]);
    assert.deepEqual(p("Indian club windmill"),["sidedelt","forearms"]);
  });
  // Exposes a bug: rules run in order and the first match wins, so a broader rule earlier in
  // the list catches these: "fly" before "rear delt", "hang" before the core raises, "hop"
  // inside "woodchop", "bridge$" before "wrestler's bridge", "rdl" inside "hurdles", and
  // "bench" before "pullover". All but the custom names are in the app's own exercise list.
  test("rear-delt flies, hanging raises, woodchops, the wrestler's bridge, hurdles and pullovers credit the right muscles",()=>{
    const p=n=>musclesOf(n).primary;
    assert.deepEqual(p("Rear delt fly"),["reardelt"]);
    assert.deepEqual(p("Reverse fly"),["reardelt"]);
    // Raising the legs is the hip flexors' work as much as the abs'; a woodchop is the obliques'.
    assert.deepEqual(p("Hanging leg raise"),["abs","hipflexors"]);
    assert.deepEqual(p("Hanging knee raises"),["abs","hipflexors"]);
    assert.deepEqual(p("Band woodchop"),["obliques"]);
    assert.deepEqual(p("Single Arm High to Low woodchop"),["obliques"]);
    assert.deepEqual(musclesOf("Wrestler's bridge").joints,["neck"]);
    assert.deepEqual(p("Hurdles"),["quads","glutes","calves"]);
    assert.deepEqual(p("Cross bench pullover"),["lats","chest"]);
  });
});

describe("hard sets in a window",()=>{
  test("an empty history is zero for every muscle, never undefined",()=>{
    const by=setsByMuscle([],0,now);
    assert.deepEqual(Object.keys(by).sort(),MUSCLES.map(m=>m[0]).sort());
    Object.values(by).forEach(v=>assert.equal(v,0));
  });
  test("both ends of the window are inside it; a millisecond out is not",()=>{
    const s=[day(now-7*DAY,"Bench press",3),day(now,"Bench press",2),day(now+1,"Bench press",9),day(now-7*DAY-1,"Bench press",9)];
    assert.equal(setsByMuscle(s,now-7*DAY,now).chest,5);
  });
  test("warm-ups only, no sets, or a broken date add nothing",()=>{
    const s=[day(now,"Squats",4,{wu:true}),{created:iso(now),ex:[{name:"Squats",sets:[]}]},{created:"garbage",ex:[{name:"Squats",sets:sets(5)}]}];
    assert.equal(setsByMuscle(s,0,now).quads,0);
    assert.deepEqual(contributors(s,"quads",0,now),[]);
  });
  test("secondary muscles take half a set, summed across exercises to the nearest half",()=>{
    const s=[{created:iso(now),ex:[{name:"Squats",sets:sets(3)},{name:"Romanian deadlift",sets:sets(1)}]}];
    const by=setsByMuscle(s,0,now);
    assert.equal(by.hamstrings,2.5);assert.equal(by.lowerback,2);assert.equal(by.glutes,4);
  });
  test("contributors list primaries at full weight and secondaries at half, biggest first",()=>{
    const s=[{created:iso(now),ex:[{name:"Bench press",sets:sets(2)},{name:"Overhead press",sets:sets(4)},{name:"Dips",sets:sets(4)}]}];
    assert.deepEqual(contributors(s,"triceps",0,now),[["Overhead press",4],["Dips",4],["Bench press",2]]);
    assert.deepEqual(contributors(s,"frontdelt",0,now),[["Overhead press",4],["Dips",2],["Bench press",1]]);
    assert.deepEqual(contributors(s,"calves",0,now),[]);
  });
});

describe("recovery",()=>{
  test("nothing logged is fully ready",()=>{
    Object.values(fatigueByMuscle([],now)).forEach(v=>assert.equal(v,0));
    assert.equal(recoveryWord(0),"ready");assert.equal(recoveryWord(1),"recovering");
  });
  test("a set's own time counts, not the session's start",()=>{
    // A long session that began three days ago but whose sets were logged an hour ago.
    const s=[{created:iso(now-3*DAY),ex:[{name:"Back squat",sets:sets(8,now-HOUR)}]}];
    assert.ok(fatigueByMuscle(s,now).quads>0.9);
    const old=[{created:iso(now-HOUR),ex:[{name:"Back squat",sets:sets(8,now-3*DAY)}]}];
    assert.ok(fatigueByMuscle(old,now).quads<0.4);
  });
  test("sets logged in the future or more than five days ago are ignored; exactly five days still counts",()=>{
    assert.equal(fatigueByMuscle([day(now+HOUR,"Back squat",8)],now).quads,0);
    assert.equal(fatigueByMuscle([day(now-5*DAY-1,"Back squat",8)],now).quads,0);
    assert.ok(fatigueByMuscle([day(now-5*DAY,"Back squat",8)],now).quads>0);
  });
  test("heaps of sets still top out at fully worked, and warm-ups don't tire anything",()=>{
    assert.equal(fatigueByMuscle([day(now,"Back squat",40)],now).quads,1);
    assert.equal(fatigueByMuscle([day(now,"Back squat",8,{wu:true})],now).quads,0);
  });
  test("a muscle's fatigue halves over its half-life: a day and three quarters for legs, 30 hours for arms",()=>{
    const legs=fatigueByMuscle([day(now-42*HOUR,"Back squat",8)],now).quads,arms=fatigueByMuscle([day(now-30*HOUR,"Bicep curls",8)],now).biceps;
    assert.ok(Math.abs(legs-0.5)<1e-9,String(legs));assert.ok(Math.abs(arms-0.5)<1e-9,String(arms));
  });
  test("a set with a broken time falls back to the session's",()=>{
    const s=[{created:iso(now-HOUR),ex:[{name:"Back squat",sets:sets(8).map(x=>Object.assign(x,{at:""}))}]}];
    assert.ok(fatigueByMuscle(s,now).quads>0.9);
    const broken=[{created:"garbage",ex:[{name:"Back squat",sets:sets(8).map(x=>Object.assign(x,{at:"also garbage"}))}]}];
    assert.equal(fatigueByMuscle(broken,now).quads,0);
  });
});
