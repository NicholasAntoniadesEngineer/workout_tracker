// Body, fuel, blood markers and supplement stacks at their edges: the tape body-fat estimate
// against the metric form of the same equations, in centimetres and inches, refusing what can't
// be a body; blood pressure at every band edge; protein, totals, recents and the fasting clock;
// marker ranges and series; caffeine across units.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {bodyFatRange,bpBand,navyBodyFat} from "../js/body.js";
import {STARTERS,fastingHours,frequent,proteinTarget,totalsOf} from "../js/fuel.js";
import {MARKERS,flagOf,markerById,series} from "../js/markers.js";
import {UNITS,lineText,newId,stackCaffeine} from "../js/stack.js";

// Hodgdon and Beckett's equations in their metric, density form — written separately from the
// app's inch form, so the two can check each other.
const metric=(sex,h,w,n,hip)=>sex==="f"?495/(1.29579-0.35004*Math.log10(w+hip-n)+0.221*Math.log10(h))-450
  :495/(1.0324-0.19077*Math.log10(w-n)+0.15456*Math.log10(h))-450;

describe("body fat from the tape",()=>{
  // The two forms are separate fits of the same data: within a point up to 40%, two above it.
  test("agrees with the metric form of the equations, across ordinary bodies",()=>{
    const near=(a,b)=>Math.abs(a-b)<(a<40?1:2);
    for(const h of [155,170,185,200])for(const w of [70,85,100,115])for(const n of [34,38,42]){
      const bf=navyBodyFat("m",h,w,n),ref=metric("m",h,w,n);
      if(bf!=null)assert.ok(near(bf,ref),`m ${h}/${w}/${n}: ${bf} vs ${ref.toFixed(1)}`);
      for(const hip of [90,100,115]){const f=navyBodyFat("f",h,w,n-4,hip),fr=metric("f",h,w,n-4,hip);
        if(f!=null)assert.ok(near(f,fr),`f ${h}/${w}/${n-4}/${hip}: ${f} vs ${fr.toFixed(1)}`);}
    }
  });
  test("every estimate it gives is a plausible body fat, to one decimal",()=>{
    for(let h=140;h<=210;h+=10)for(let w=55;w<=150;w+=5)for(let n=28;n<=52;n+=4)for(const s of ["m","f"]){
      const bf=navyBodyFat(s,h,w,n,s==="f"?w+15:0);
      if(bf==null)continue;
      assert.ok(bf>=2&&bf<=70,`${s} ${h}/${w}/${n}: ${bf}`);assert.equal(bf,Math.round(bf*10)/10);
    }
  });
  test("more waist reads fatter, more height or neck leaner",()=>{
    assert.ok(navyBodyFat("m",180,95,40)>navyBodyFat("m",180,85,40));
    assert.ok(navyBodyFat("m",190,85,40)<navyBodyFat("m",170,85,40));
    assert.ok(navyBodyFat("m",180,85,42)<navyBodyFat("m",180,85,38));
    assert.ok(navyBodyFat("f",165,75,33,105)>navyBodyFat("f",165,75,33,95));
  });
  test("inches converted at 2.54 give the same answer as centimetres",()=>{
    // The Body page converts girths typed in inches before asking; height is always in cm.
    assert.equal(navyBodyFat("m",180,33.5*2.54,15.75*2.54),navyBodyFat("m",180,85.09,40.005));
    const inches=86.010*Math.log10(33.5-15.75)-70.041*Math.log10(180/2.54)+36.76;
    assert.equal(navyBodyFat("m",180,33.5*2.54,15.75*2.54),Math.round(inches*10)/10);
  });
  test("refuses what can't be a reading: missing, zero, negative, not a number, waist inside the neck",()=>{
    for(const args of [["m",0,85,40],["m",180,0,40],["m",180,85,0],["m",180,null,40],["m",undefined,85,40],["m",NaN,85,40],
      ["m",180,-85,40],["m",-180,85,40],["m",180,40,40],["m",180,35,40],["f",165,75,33],["f",165,75,33,-95],["f",165,20,60,10]])
      assert.equal(navyBodyFat(...args),null,JSON.stringify(args));
  });
  test("refuses an answer outside 2 to 70 percent, as when a unit is mixed up",()=>{
    assert.equal(navyBodyFat("m",10,85,40),null);       // height typed in inches as if cm, and worse
    assert.equal(navyBodyFat("m",1800,85,40),null);     // height in millimetres
    assert.equal(navyBodyFat("m",180,850,40),null);     // waist in millimetres
    assert.equal(navyBodyFat("m",180,41,40),null);      // a waist a centimetre wider than the neck
  });
  // Exposes a bug: with sex "Not set" in Settings the male equation is used, so a woman who
  // hasn't set it sees a figure about half her own (here 15% instead of 27%). The Body page's
  // own message ("Set your height and sex") shows only when the estimate is null.
  test("with sex not set there is no estimate, rather than the men's one",()=>{
    assert.equal(navyBodyFat("",165,75,33,95),null);
    assert.equal(navyBodyFat(undefined,165,75,33,95),null);
  });
  test("the range shown is three points either side, never under 2%, and empty when there is none",()=>{
    assert.equal(bodyFatRange(null),"");assert.equal(bodyFatRange(undefined),"");
    assert.equal(bodyFatRange(4),"2–7%");assert.equal(bodyFatRange(15.5),"13–19%");assert.equal(bodyFatRange(22.4),"19–25%");
  });
});

describe("blood pressure",()=>{
  test("each band at its edges",()=>{
    const cases=[[89,70,"low"],[110,59,"low"],[90,60,"normal"],[119,79,"normal"],[120,79,"elevated"],[129,79,"elevated"],
      [130,79,"high (stage 1)"],[125,80,"high (stage 1)"],[139,89,"high (stage 1)"],[119,85,"high (stage 1)"],
      [140,90,"high (stage 2)"],[160,100,"high (stage 2)"]];
    cases.forEach(([s,d,want])=>assert.equal(bpBand(s,d),want,s+"/"+d));
  });
  test("half a reading gives no band",()=>{
    assert.equal(bpBand(0,0),"");assert.equal(bpBand(120,0),"");assert.equal(bpBand(0,80),"");assert.equal(bpBand(undefined,80),"");
  });
  // Exposes a bug: stage 1 is tested with "systolic under 140 OR diastolic under 90", so a
  // reading that is stage 2 in only one of its numbers comes out as stage 1.
  test("a reading at stage 2 in either number is stage 2",()=>{
    assert.equal(bpBand(150,85),"high (stage 2)");
    assert.equal(bpBand(135,95),"high (stage 2)");
    assert.equal(bpBand(180,70),"high (stage 2)");
  });
  // Exposes a bug: "low" is checked first, so a high top number with a low bottom one (common
  // with stiff arteries) reads as low blood pressure.
  test("a high systolic with a low diastolic reads high, not low",()=>{
    assert.equal(bpBand(150,55),"high (stage 2)");
  });
});

describe("protein, totals and recents",()=>{
  test("the target per goal, rounded to 5 g; an unknown goal is the general 1.6 g/kg",()=>{
    assert.equal(proteinTarget(81,"general"),130);assert.equal(proteinTarget(81,"lift"),160);assert.equal(proteinTarget(81,"cut"),180);
    assert.equal(proteinTarget(81,"endure"),130);assert.equal(proteinTarget(81,"bulk"),130);assert.equal(proteinTarget(81),130);
    assert.equal(proteinTarget(180*0.45359237,"lift"),165,"180 lb");
  });
  test("no weight gives no target, never NaN",()=>{
    for(const w of [0,undefined,null,NaN,""])assert.equal(proteinTarget(w,"lift"),0,String(w));
  });
  test("totals read numbers typed as text, ignore junk, and count water apart",()=>{
    assert.deepEqual(totalsOf([]),{p:0,kcal:0,c:0,f:0,water:0,n:0});
    const t=totalsOf([{name:"A",p:"19.5",kcal:"215"},{name:"B",p:"abc",kcal:null,c:"10",f:2},{water:1},{water:1},{name:"C"}]);
    assert.deepEqual(t,{p:19.5,kcal:215,c:10,f:2,water:2,n:3});
  });
  test("recents group names whatever their case or spacing, keep the latest values, most used first",()=>{
    const e=[{at:"2026-10-01T08:00:00Z",name:"Eggs",p:18},{at:"2026-10-03T08:00:00Z",name:" eggs ",p:19},{at:"2026-10-02T08:00:00Z",name:"Whey",p:25},
      {at:"2026-10-04T08:00:00Z",name:"Tuna",p:26},{at:"2026-10-04T09:00:00Z",water:1},{at:"2026-10-04T10:00:00Z",p:5}];
    const f=frequent(e);
    assert.deepEqual(f.map(x=>[x.name,x.count,x.p]),[["Eggs",2,19],["Tuna",1,26],["Whey",1,25]]);
    assert.equal(frequent(e,1).length,1);assert.deepEqual(frequent([]),[]);
    assert.equal(frequent(Array.from({length:12},(_,i)=>({at:"2026-10-01T0"+(i%10)+":00:00Z",name:"Item "+i,p:1}))).length,8);
  });
  test("the fasting clock runs from the newest food, whatever order it was stored in; water doesn't break a fast",()=>{
    const now=Date.parse("2026-10-08T20:00:00Z");
    const e=[{at:"2026-10-08T12:30:00Z",name:"Lunch",p:40},{at:"2026-10-08T07:00:00Z",name:"Eggs",p:19},{at:"2026-10-08T19:00:00Z",water:1},{name:"No time",p:5}];
    assert.equal(fastingHours(e,now),7.5);
    assert.equal(fastingHours([{at:"2026-10-08T19:00:00Z",water:1}],now),0);
    assert.equal(fastingHours([{at:"2026-10-07T20:00:00Z",name:"x"}],now),24);
    assert.equal(fastingHours([{at:"2026-10-08T19:57:00Z",name:"x"}],now),0.1);
  });
  test("the starter foods are real servings: protein, calories, and protein never more calories than the whole",()=>{
    assert.ok(STARTERS.length>=8);
    assert.equal(new Set(STARTERS.map(s=>s.name)).size,STARTERS.length);
    STARTERS.forEach(s=>{assert.ok(s.p>0&&s.kcal>0,s.name);assert.ok(s.p*4<=s.kcal,s.name+": "+s.p+" g is "+s.p*4+" kcal of "+s.kcal);});
  });
});

describe("blood markers",()=>{
  test("each marker has a unique id, a name, a unit and a range that makes sense",()=>{
    assert.equal(new Set(MARKERS.map(m=>m.id)).size,MARKERS.length);
    MARKERS.forEach(m=>{
      assert.ok(m.name&&m.unit&&typeof m.note==="string",m.id);
      assert.ok(Number.isFinite(m.lo)&&Number.isFinite(m.hi)&&m.lo>=0&&m.lo<m.hi,m.id);
      assert.equal(markerById(m.id),m);
    });
    assert.equal(markerById("nope"),null);assert.equal(markerById(undefined),null);
  });
  test("the printed range is in range at both ends",()=>{
    MARKERS.forEach(m=>{assert.equal(flagOf(m,m.lo),"ok",m.id);assert.equal(flagOf(m,m.hi),"ok",m.id);});
    const tsh=markerById("tsh");
    assert.equal(flagOf(tsh,0.39),"low");assert.equal(flagOf(tsh,4.01),"high");
    assert.equal(flagOf(markerById("crp"),0),"ok");
  });
  test("no reading has no flag; a reading typed as text still flags",()=>{
    const f=markerById("ferritin");
    assert.equal(flagOf(f,null),"");assert.equal(flagOf(f,undefined),"");assert.equal(flagOf(f,""),"");
    assert.equal(flagOf(f,"20"),"low");assert.equal(flagOf(f,0),"low");
  });
  test("a series is one marker's readings oldest first, with the change rounded to a tenth",()=>{
    const r=[{id:"hba1c",at:"2026-06-01",v:5.7},{id:"hba1c",at:"2025-12-01",v:5.4},{id:"vitd",at:"2026-01-01",v:30},{id:"hba1c",at:"2026-09-01",v:5.5}];
    assert.deepEqual(series(r,"hba1c").map(x=>[x.at,x.delta]),[["2025-12-01",null],["2026-06-01",0.3],["2026-09-01",-0.2]]);
    assert.deepEqual(series(r,"tsh"),[]);assert.deepEqual(series([],"tsh"),[]);
    assert.equal(r[0].delta,undefined,"the stored readings are left alone");
  });
});

describe("supplement stacks",()=>{
  test("caffeine adds up in mg, g and mcg, whatever the case of the name",()=>{
    assert.equal(stackCaffeine([{name:"CAFFEINE",dose:"150",unit:"mg"},{name:"Caffeine (green tea)",dose:"0.05",unit:"g"},{name:"caffeine",dose:"500",unit:"mcg"}]),201);
  });
  test("caffeine in caps, scoops, ml or tsp, or with a dose that isn't a number, isn't guessed",()=>{
    for(const unit of ["caps","scoops","ml","tsp","IU",""])assert.equal(stackCaffeine([{name:"Caffeine",dose:"2",unit}]),0,unit);
    assert.equal(stackCaffeine([{name:"Caffeine",dose:"lots",unit:"mg"},{name:"Caffeine",dose:"",unit:"mg"}]),0);
    assert.equal(stackCaffeine([{name:"Guarana",dose:"200",unit:"mg"},{name:"",dose:"200",unit:"mg"},{dose:"200",unit:"mg"}]),0);
    assert.equal(stackCaffeine([]),0);assert.equal(stackCaffeine(null),0);assert.equal(stackCaffeine(undefined),0);
  });
  test("a line reads as name, dose and unit, or just the name when there's no dose",()=>{
    assert.equal(lineText({name:"Creatine",dose:"5",unit:"g"}),"Creatine — 5 g");
    assert.equal(lineText({name:"Creatine",dose:"",unit:"g"}),"Creatine");assert.equal(lineText({name:"Creatine"}),"Creatine");
    assert.equal(lineText({}),"");
  });
  test("ids carry their prefix and don't repeat",()=>{
    const ids=Array.from({length:500},()=>newId("s"));
    assert.equal(new Set(ids).size,ids.length);ids.forEach(id=>assert.match(id,/^s[a-z0-9]{8,}$/));
    assert.ok(newId("k").startsWith("k"));
    assert.ok(["mg","g","mcg"].every(u=>UNITS.includes(u)));
  });
});
