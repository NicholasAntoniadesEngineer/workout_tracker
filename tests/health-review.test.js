// The Year (or month) in Review at its edges: an empty period, cardio beside lifting, records
// that only tie, one-hand lifts, timed holds, the weeks a period can hold, and the rest days
// counted when the clocks change.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {periodReview,yearRange,monthRange,monthName} from "../js/review.js";

const at=(y,m,d,h)=>new Date(y,m,d,h==null?12:h).toISOString();
const st=(r,w,x)=>Object.assign({r,w,side:false,t:0,rest:0,at:"",wu:false,band:""},x||{});
const S=(id,created,ex,x)=>Object.assign({id,created,started:"",ended:"",title:"",ex},x||{});
const E=(name,sets,x)=>Object.assign({name,sets},x||{});
const review=(sessions,range,o)=>periodReview(sessions,Object.assign({restDay:0,now:Date.UTC(2027,5,1)},range,o||{}));
function inZone(tz,fn){const was=process.env.TZ;process.env.TZ=tz;try{fn();}finally{if(was===undefined)delete process.env.TZ;else process.env.TZ=was;}}

describe("an empty or odd period",()=>{
  test("nothing logged reads as zeros, never NaN, with no favourite and no busiest month",()=>{
    const r=review([],yearRange(2026));
    assert.deepEqual([r.days,r.workouts,r.cardio,r.sets,r.reps,r.volume,r.hours,r.km,r.firsts,r.weeks],[0,0,0,0,0,0,0,0,0,0]);
    assert.equal(r.favourite,null);assert.equal(r.topMonth,"");assert.deepEqual(r.records,[]);
    Object.entries(r).forEach(([k,v])=>{if(typeof v==="number")assert.ok(Number.isFinite(v),k);});
  });
  test("a period still to come counts no rest days and at least one week",()=>{
    const r=review([],yearRange(2030),{now:Date.UTC(2026,9,8)});
    assert.equal(r.restAll,0);assert.equal(r.restKept,0);assert.equal(r.weeksSoFar,1);
  });
  test("days with only empty exercises, or broken dates, aren't training days",()=>{
    const r=review([S("a",at(2026,2,3),[E("Squats",[])]),S("b","garbage",[E("Squats",[st(5,100)])])],yearRange(2026));
    assert.equal(r.days,0);assert.equal(r.workouts,0);
  });
  test("month names, and month ranges across the year's end",()=>{
    assert.equal(monthName(0),"January");assert.equal(monthName(11),"December");
    const dec=monthRange(2026,11);assert.equal(new Date(dec.to).getFullYear(),2027);assert.equal(new Date(dec.to).getMonth(),0);
    assert.equal(new Date(yearRange(2024).to-1).getDate(),31);
  });
});

describe("what a period holds",()=>{
  test("cardio counts its distance and time beside lifting, and its own day",()=>{
    const r=review([S("a",at(2026,4,1),[],{cardio:{dist:5250,secs:1800}}),S("b",at(2026,4,1,18),[E("Squats",[st(5,100)])])],monthRange(2026,4));
    assert.equal(r.cardio,1);assert.equal(r.workouts,1);assert.equal(r.days,1);assert.equal(r.km,5.3);assert.equal(r.hours,0.5);
  });
  test("a record must beat the old best, not tie it; a lift new this year is a first, not a record",()=>{
    const s=[S("a",at(2025,5,1),[E("Squats",[st(5,100)]),E("Bench press",[st(5,80)])]),
      S("b",at(2026,5,1),[E("Squats",[st(5,100)]),E("Bench press",[st(5,82.5)]),E("Front squat",[st(5,70)])])];
    const r=review(s,yearRange(2026));
    assert.deepEqual(r.records.map(x=>x.name),["Bench press"]);assert.equal(r.firsts,1);
    assert.ok(r.records[0].to>r.records[0].from);
  });
  test("records come biggest gain first, and a lift is the same lift in any case",()=>{
    const s=[S("a",at(2025,5,1),[E("squats",[st(5,100)]),E("Bench press",[st(5,100)])]),S("b",at(2026,5,1),[E("Squats",[st(5,105)]),E("Bench press",[st(5,120)])])];
    assert.deepEqual(review(s,yearRange(2026)).records.map(x=>x.name),["Bench press","Squats"]);
  });
  test("a one-hand lift is judged per hand: a pair of 30s beats a single 30 only by the reps",()=>{
    const s=[S("a",at(2025,5,1),[E("Dumbbell row",[st(8,30,{hand:true})])]),S("b",at(2026,5,1),[E("Dumbbell row",[st(10,30,{hand:true})])])];
    const r=review(s,yearRange(2026));
    assert.equal(r.records.length,1);assert.equal(r.records[0].to,40);assert.equal(r.volume,600);
  });
  test("bodyweight sets count as sets and reps but set no records",()=>{
    const r=review([S("a",at(2025,5,1),[E("Pull ups",[st(8,0)])]),S("b",at(2026,5,1),[E("Pull ups",[st(12,0),st(10,0)])])],yearRange(2026));
    assert.equal(r.sets,2);assert.equal(r.reps,22);assert.equal(r.volume,0);assert.deepEqual(r.records,[]);
    assert.deepEqual(r.favourite,{name:"Pull ups",sets:2});
  });
  // Exposes a bug: timed and distance sets keep seconds or metres in r; the review leaves them
  // out of the volume but adds them to the rep total, so three one-minute planks are 180 reps.
  test("seconds held and metres carried are not counted as reps",()=>{
    const r=review([S("a",at(2026,5,1),[E("Squats",[st(5,100)]),E("Plank",[st(60,0),st(60,0),st(60,0)],{timed:true}),E("Farmer carry",[st(40,32)],{dist:true})])],yearRange(2026));
    assert.equal(r.sets,5);assert.equal(r.reps,5);
  });
});

describe("weeks",()=>{
  // Exposes a bug: weeks trained counts the Monday-started weeks the days touch, but the weeks
  // a period holds is its length divided by seven, so a month that starts on a Sunday, trained
  // in every week, reads "6 of 5 weeks".
  test("weeks trained never exceed the weeks the period holds",()=>{
    const march=[1,2,9,16,23,30].map(d=>S("m"+d,at(2026,2,d),[E("Squats",[st(5,100)])]));
    const m=review(march,monthRange(2026,2));
    assert.ok(m.weeks<=m.weeksSoFar,m.weeks+" of "+m.weeksSoFar+" weeks");
  });
  test("a year trained every week touches 53 Monday weeks in 2026, and says so",()=>{
    const year=[];for(let t=new Date(2026,0,1);t.getFullYear()===2026;t.setDate(t.getDate()+3))year.push(S("y"+t.getTime(),at(2026,t.getMonth(),t.getDate()),[E("Squats",[st(5,100)])]));
    const y=review(year,yearRange(2026));
    assert.equal(y.weeks,53);assert.ok(y.weeks<=y.weeksSoFar,y.weeks+" of "+y.weeksSoFar);
  });
});

describe("rest days kept when the clocks change",()=>{
  // Exposes a bug: the loop steps 24 hours at a time from local midnight, so when the clocks
  // go back the step lands at 23:00 and the same Sunday is counted twice; where they jump
  // forward at midnight a Sunday is skipped.
  const sundays=(tz,y,m)=>{let n=0;inZone(tz,()=>{n=review([],m==null?yearRange(y):monthRange(y,m)).restAll;});return n;};
  test("each Sunday counts once in the month the clocks go back, north and south",()=>{
    assert.equal(sundays("Europe/London",2026,9),4,"London, October 2026");
    assert.equal(sundays("America/New_York",2026,10),5,"New York, November 2026");
    assert.equal(sundays("Australia/Sydney",2026,3),4,"Sydney, April 2026");
  });
  test("no Sunday goes missing where the clocks jump forward at midnight",()=>{
    assert.equal(sundays("America/Santiago",2026,8),4,"Santiago, September 2026");
    assert.equal(sundays("America/Santiago",2026),52,"Santiago, 2026");
  });
  test("where the clocks never change, every month and year counts right",()=>{
    inZone("Africa/Johannesburg",()=>{
      assert.equal(review([],monthRange(2026,9)).restAll,4);assert.equal(review([],yearRange(2026)).restAll,52);
      assert.equal(review([],yearRange(2026),{restDay:6}).restAll,52);
      // Sunday 4 October trained, the other Sundays rested.
      assert.equal(review([S("a",at(2026,9,4),[E("Squats",[st(5,100)])])],monthRange(2026,9)).restKept,3);
    });
  });
});
