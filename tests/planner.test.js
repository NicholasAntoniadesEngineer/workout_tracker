import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {blockDates,deloadTarget,parseProgramme,matchExercise,programmeRoutines,PROGRAMMES} from "../js/planner.js";

const catalog=["Squats","Bench press","Barbell row","Shoulder press","Deadlift","Pull ups","Romanian deadlift","Lat pulldown","Bicep curls"];
describe("blockDates",()=>{
  test("places routines on their weekdays and marks deload weeks",()=>{
    const d=blockDates({start:"2026-10-12",weeks:4,pattern:{1:"A",3:"B",5:"A"},deloadEvery:4});
    assert.equal(d.length,12);
    assert.deepEqual(d.slice(0,3).map(x=>[x.date,x.routine]),[["2026-10-12","A"],["2026-10-14","B"],["2026-10-16","A"]]);
    assert.equal(d.filter(x=>x.deload).length,3);
    assert.ok(d.filter(x=>x.deload).every(x=>x.week===4));
  });
});
describe("deloadTarget",()=>{
  test("ten percent lighter, same reps",()=>{
    assert.deepEqual(deloadTarget([{r:5,w:100},{r:5,w:100}],"kg").apply,{w:90,r:5});
  });
});
describe("parseProgramme",()=>{
  const text=`Day 1: Upper
Bench 4x8 @ 80kg
- Pull-ups 3 x 8-10
Barbell row: 3×10
Monday
Back squat 5x5 100
RDL 3 sets of 8
Bad line with no sets
Day 3
OHP 5 x 5`;
  const r=parseProgramme(text,catalog);
  test("finds days and exercises, matching names to the list",()=>{
    assert.deepEqual(r.days.map(d=>d.name),["Day 1 · Upper","Monday","Day 3"]);
    assert.deepEqual(r.days[0].ex,["Bench press","Pull ups","Barbell row"]);
    assert.deepEqual(r.days[1].ex,["Squats","Romanian deadlift"]);
    assert.deepEqual(r.days[2].ex,["Shoulder press"]);
  });
  test("keeps sets, the top of a rep range and the weight",()=>{
    assert.equal(r.days[0].plan[0].sets.length,4);assert.equal(r.days[0].plan[0].sets[0].w,80);
    assert.equal(r.days[0].plan[1].sets[0].r,10);
    assert.equal(r.days[1].plan[0].sets[0].w,100);
  });
  test("reports lines it could not read",()=>{assert.deepEqual(r.skipped,["Bad line with no sets"]);});
  test("an unknown name is kept as written",()=>{assert.equal(matchExercise("zercher squat",catalog),"Zercher squat");});
});
describe("programmes",()=>{
  test("every ready-made programme turns into routines with plans",()=>{
    PROGRAMMES.forEach(p=>{const rs=programmeRoutines(p);assert.ok(rs.length>=2);rs.forEach(r=>{assert.equal(r.ex.length,r.plan.length);});});
  });
});

describe("parseProgramme reads programmes as people write them",()=>{
  const cat=["Back squat","Bench press","Barbell row","Deadlift","Overhead press","Pull ups","Bicep curls","Lunges","Plank","Push ups","Dips","Leg press","Face pulls"];
  const one=(line,unit)=>{const r=parseProgramme("Day 1\n"+line,cat,unit);return r.days[0]&&r.days[0].plan[0];};
  test("RPE, RIR and percentages are effort, not weight",()=>{
    assert.equal(one("Squat 3x5 @ RPE 8").sets[0].w,0);
    assert.equal(one("Bench 3x8 @ 75%").sets[0].w,0);
    assert.equal(one("Deadlift 1x5 @ 85% of 1RM").sets[0].w,0);
    assert.equal(one("Row 4x10 RIR 2").sets[0].w,0);
    assert.equal(one("Curls 3x12 @12.5 kg RPE 9").sets[0].w,12.5);
    assert.equal(one("Bench 5x5 100kg @ RPE 7.5").sets[0].w,100);
  });
  test("sets, reps and weight in the usual spellings",()=>{
    const cases={"Row 4x10 60kg":[4,10,60],"Deadlift 1x5 @ 140 kg":[1,5,140],"OHP 3 x 8 @ 40":[3,8,40],"Dips 3×10":[3,10,0],
      "Push ups 3 sets of 15":[3,15,0],"Lunges 3x10/leg 16kg":[3,10,16],"Plank 3x60s":[3,60,0],"- Pull ups 3 x 8-10":[3,10,0],"Squats: 5×5 100kg":[5,5,100],"1. Bench press 4*8 @ 80":[4,8,80],"Leg press 4x12 @ 180,5":[4,12,180.5]};
    for(const [line,[n,r,w]] of Object.entries(cases)){const p=one(line);assert.ok(p,line);assert.equal(p.sets.length,n,line);assert.equal(p.sets[0].r,r,line);assert.equal(p.sets[0].w,w,line);}
  });
  test("a weight in the other unit is converted",()=>{
    assert.equal(one("Leg press 4x12 @ 180lb","kg").sets[0].w,81.5);
    assert.equal(one("Bench 3x5 @ 100 kg","lb").sets[0].w,220);
    assert.equal(one("Bench 3x5 @ 225 lbs","lb").sets[0].w,225);
    assert.equal(one("Bench 3x5 @ 100","lb").sets[0].w,100);
  });
  test("days named by letter, by weekday, as a heading, or with a colon",()=>{
    const r=parseProgramme("Day A\nSquat 3x5 @ 100\nDay B\nBench 3x5 @ 80\nMonday - Pull\nRow 3x8\n## Workout C\nDeadlift 1x5\nLegs:\nLeg press 3x10",cat);
    assert.deepEqual(r.days.map(d=>d.name),["Day A","Day B","Monday · Pull","Workout C","Legs"]);assert.deepEqual(r.skipped,[]);
  });
  test("lines it can't read are reported, not guessed",()=>{
    const r=parseProgramme("Day 1\nWarm up well\nSquat 3x5\nStretch after",cat);
    assert.deepEqual(r.skipped,["Warm up well","Stretch after"]);assert.equal(r.days[0].ex.length,1);
  });
});
