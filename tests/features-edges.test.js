// The edges of the newer features: when progression eases back after a break or deloads, how
// a unit change carries a history, how recovery reads, blocks across odd dates, the yearly
// review at the turn of a year, and the exports with awkward input.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {progressionHint,BREAK_RULES} from "../js/coach.js";
import {recoveryWord,fatigueByMuscle,setsByMuscle,contributors,musclesOf} from "../js/muscles.js";
import {blockDates,deloadTarget,keyOfDate} from "../js/planner.js";
import {periodReview,yearRange} from "../js/review.js";
import {checkinsCSV,aiSummary} from "../js/aiexport.js";
import {strengthFit,fitCrc} from "../js/fitwrite.js";
import {isFit} from "../js/fit.js";

const set=(r,w,x)=>Object.assign({r,w,side:false,t:0,rest:0,at:"",wu:false,band:""},x||{});
const DAY=86400000,now=Date.UTC(2026,9,8,12);
const hint=(sets,o)=>progressionHint(sets,Object.assign({unit:"reps",weightUnit:"kg",low:8,top:12,step:2.5,miss:"hold"},o));

describe("progression: back after a break",()=>{
  const last=[set(10,100),set(10,100),set(9,100)];
  for(const [rule,[a,b]] of Object.entries(BREAK_RULES))test(rule+": "+a+"% from two weeks, "+b+"% from four",()=>{
    const at=d=>hint(last,{breakRule:rule,prevAt:new Date(now-d*DAY).toISOString(),now});
    assert.notEqual(at(13).rule,"break");
    assert.equal(at(14).apply.w,Math.round(100*a/100*2)/2);assert.equal(at(27).apply.w,Math.round(100*a/100*2)/2);
    assert.equal(at(28).apply.w,Math.round(100*b/100*2)/2);assert.equal(at(28).apply.r,8);
  });
  test("pounds round to whole pounds",()=>{assert.equal(hint([set(10,225)],{weightUnit:"lb",step:5,breakRule:"standard",prevAt:new Date(now-30*DAY).toISOString(),now}).apply.w,180);});
  test("a bodyweight lift has nothing to take off",()=>{assert.notEqual(hint([set(10,0)],{breakRule:"careful",prevAt:new Date(now-60*DAY).toISOString(),now}).rule,"break");});
  test("off: picks up where it left off",()=>{assert.notEqual(hint(last,{breakRule:"off",prevAt:new Date(now-60*DAY).toISOString(),now}).rule,"break");});
  test("a break comes before a deload or a jump",()=>{
    const top=[set(12,100),set(12,100)],stuck=[set(9,100),set(9,100)],hist=[{sets:stuck},{sets:stuck}];
    const o={breakRule:"standard",prevAt:new Date(now-20*DAY).toISOString(),now};
    assert.equal(hint(top,o).rule,"break");assert.equal(hint(stuck,Object.assign({stallAfter:2,history:hist},o)).rule,"break");
  });
});

describe("progression: stuck, short, or every set at the top",()=>{
  const stuck=[set(9,100),set(9,100)];
  test("deloads once stuck for the chosen number of sessions, by the chosen share",()=>{
    const h=[{sets:stuck},{sets:stuck}];
    assert.equal(hint(stuck,{stallAfter:3,history:h}).rule,"deload");
    assert.equal(hint(stuck,{stallAfter:3,history:h,deloadPct:15}).apply.w,85);
    assert.notEqual(hint(stuck,{stallAfter:4,history:h}).rule,"deload");
    assert.notEqual(hint(stuck,{stallAfter:0,history:h}).rule,"deload");
  });
  test("a rep gained breaks the run",()=>{
    assert.notEqual(hint(stuck,{stallAfter:3,history:[{sets:[set(8,100),set(9,100)]},{sets:stuck}]}).rule,"deload");
  });
  test("a set below the range: hold, or drop one jump",()=>{
    const short=[set(10,100),set(7,100)];
    assert.equal(hint(short).apply.w,100);assert.equal(hint(short,{miss:"drop"}).apply.w,97.5);assert.equal(hint(short,{miss:"drop",step:5}).apply.w,95);
  });
  test("every set at the top: the exercise's own jump, back to the bottom of the range",()=>{
    assert.deepEqual(hint([set(12,60),set(13,60)],{step:5}).apply,{w:65,r:8});
    assert.deepEqual(hint([set(12,135),set(12,135)],{weightUnit:"lb",step:5}).apply,{w:140,r:8});
  });
  test("holds add five seconds; distance holds; a band asks for the next band",()=>{
    assert.deepEqual(hint([set(45,0),set(60,0)],{unit:"secs"}).apply,{r:65});
    assert.deepEqual(hint([set(40,0)],{unit:"m"}).apply,{r:40});
    assert.equal(hint([set(12,0),set(12,0)],{isBand:true}).apply,null);
    assert.deepEqual(hint([set(9,0),set(10,0)],{isBand:true}).apply,{r:10});
  });
  test("warm-ups never count",()=>{assert.deepEqual(hint([set(5,40,{wu:true}),set(12,60),set(12,60)]).apply,{w:62.5,r:8});});
});

describe("deload weeks",()=>{
  test("10% lighter to the plate, the same reps; bodyweight keeps its reps",()=>{
    assert.deepEqual(deloadTarget([set(5,100),set(5,102.5)],"kg").apply,{w:92.5,r:5});
    assert.deepEqual(deloadTarget([set(5,225)],"lb").apply,{w:205,r:5});
    assert.deepEqual(deloadTarget([set(12,0)],"kg").apply,{r:12});
    assert.equal(deloadTarget([set(5,60,{wu:true})],"kg"),null);
  });
});

describe("blocks across odd dates",()=>{
  test("clocks changing in spring and autumn never shift a day",()=>{
    for(const start of ["2026-03-23","2026-10-19"]){const out=blockDates({start,weeks:2,deloadEvery:0,pattern:{1:"A",4:"B"}});
      assert.deepEqual(out.map(x=>new Date(x.date+"T12:00:00").getDay()),[1,4,1,4],start);}
  });
  test("a block over the year's end keeps counting weeks",()=>{
    const out=blockDates({start:"2026-12-28",weeks:3,deloadEvery:3,pattern:{1:"A"}});
    assert.deepEqual(out.map(x=>x.date+" w"+x.week+(x.deload?" deload":"")),["2026-12-28 w1","2027-01-04 w2","2027-01-11 w3 deload"]);
  });
  test("weeks are kept between 1 and 26 (four when not given), and no pattern plans nothing",()=>{
    assert.equal(blockDates({start:"2026-10-05",weeks:99,pattern:{1:"A"}}).length,26);
    assert.equal(blockDates({start:"2026-10-05",weeks:1,pattern:{1:"A"}}).length,1);
    assert.equal(blockDates({start:"2026-10-05",pattern:{1:"A"}}).length,4);
    assert.deepEqual(blockDates({start:"2026-10-05",weeks:4,pattern:{}}),[]);
  });
  test("dates are written as the calendar shows them",()=>{assert.equal(keyOfDate(new Date(2026,0,5)),"2026-01-05");});
});

describe("recovery by muscle",()=>{
  const day=(t,name,n)=>({id:"x"+t,created:new Date(t).toISOString(),ex:[{name,sets:Array.from({length:n},()=>set(8,60,{at:new Date(t).toISOString()}))}]});
  test("the words at their edges",()=>{assert.equal(recoveryWord(0.6),"recovering");assert.equal(recoveryWord(0.59),"partly recovered");assert.equal(recoveryWord(0.3),"partly recovered");assert.equal(recoveryWord(0.29),"ready");});
  test("eight hard sets just done is fully worked, and it fades over days",()=>{
    const s=[day(now,"Back squat",8)];assert.equal(fatigueByMuscle(s,now).quads,1);
    const two=fatigueByMuscle(s,now+2*DAY).quads,four=fatigueByMuscle(s,now+4*DAY).quads;
    assert.ok(two<0.6&&four<two&&fatigueByMuscle(s,now+6*DAY).quads===0);
  });
  test("a big muscle recovers slower than a small one",()=>{
    const f=fatigueByMuscle([day(now,"Back squat",6),day(now,"Bicep curls",6)],now+DAY);assert.ok(f.quads>f.biceps);
  });
  test("sets in a window only, and what gave them, most first",()=>{
    const s=[day(now-1*DAY,"Bench press",4),day(now-2*DAY,"Dips",3),day(now-20*DAY,"Bench press",9)];
    assert.equal(setsByMuscle(s,now-7*DAY,now).chest,7);
    assert.deepEqual(contributors(s,"chest",now-7*DAY,now).map(([n,v])=>n+" "+v),["Bench press 4","Dips 3"]);
  });
  test("names people type land on the right muscles",()=>{
    const m=n=>musclesOf(n).primary;
    assert.ok(m("Incline dumbbell press").includes("chest"));assert.ok(m("Barbell hip thrust").includes("glutes"));
    assert.ok(m("Seated calf raise").includes("calves"));assert.ok(m("Wide grip lat pulldown").includes("lats"));
    assert.ok(m("Romanian deadlift").includes("hamstrings"));assert.ok(m("Face pull").includes("reardelt"));
    assert.deepEqual(m("Couch stretch"),[]);
  });
});

describe("the year in review at the year's turn",()=>{
  const at=(y,m,d,h)=>new Date(y,m,d,h||12).toISOString();
  const s=(id,created,sets)=>({id,title:id,created,ex:[{name:"Back squat",sets}]});
  const sessions=[s("a",at(2025,11,31,23),[set(5,100)]),s("b",at(2026,0,1,0),[set(5,110)]),s("c",at(2026,5,1),[set(5,120)]),s("d",at(2027,0,1,1),[set(5,130)])];
  test("each day counts in its own year, records against everything before",()=>{
    const r=periodReview(sessions,Object.assign(yearRange(2026),{now:Date.UTC(2027,1,1)}));
    assert.equal(r.days,2);assert.equal(r.workouts,2);assert.equal(r.records.length,1);assert.equal(r.records[0].w,120);
  });
  test("rest days kept: Sunday by default, Saturday when chosen",()=>{
    const r0=periodReview([],Object.assign(yearRange(2026),{now:Date.UTC(2027,1,1)})),r6=periodReview([],Object.assign(yearRange(2026),{now:Date.UTC(2027,1,1),restDay:6}));
    assert.equal(r0.restAll,52);assert.equal(r6.restAll,52);assert.equal(r0.restKept,52);
  });
  test("a year still going counts its weeks so far",()=>{
    const r=periodReview(sessions,Object.assign(yearRange(2026),{now:new Date(2026,1,1).getTime()}));assert.equal(r.weeksSoFar,5);
  });
});

describe("exports with awkward input",()=>{
  test("check-ins CSV quotes commas, quotes and new lines, in date order",()=>{
    const csv=checkinsCSV([{at:"2026-10-02T07:00:00Z",bed:"23:00",wake:"06:30",hours:7.5,sleep:2,rundown:true},{at:"2026-10-01T07:00:00Z",bed:'late, "very"',wake:"07:00\nish"}]);
    const lines=csv.trim().split(/\n(?=\d{4}-)/);assert.match(lines[0],/^date,bed,wake/);
    assert.ok(csv.includes('"late, ""very"""')&&csv.includes('"07:00\nish"'));assert.ok(csv.indexOf("2026-10-01")<csv.indexOf("2026-10-02"));assert.match(csv,/,yes\n$/);
  });
  test("an empty history still summarises",()=>{const t=aiSummary({settings:{unit:"kg"},sessions:[],body:[],checkins:[]},{weeks:12,now});assert.equal(typeof t,"string");assert.ok(t.length>0);});
  test("a FIT file for an empty day, a timed set, and sets in pounds",()=>{
    const t0=now,mk=ex=>({created:new Date(t0).toISOString(),started:new Date(t0).toISOString(),ended:new Date(t0+600000).toISOString(),ex});
    for(const s of [mk([]),mk([{name:"Plank",timed:true,sets:[set(60,0,{t:60,at:new Date(t0+120000).toISOString()})]}]),mk([{name:"Bench press",sets:[set(5,225,{u:"lb",at:new Date(t0+60000).toISOString()})]}])]){
      const f=strengthFit(s,"kg"),dv=new DataView(f.buffer);assert.ok(isFit(f));assert.equal(dv.getUint16(f.length-2,true),fitCrc(f,0,f.length-2));}
  });
});
