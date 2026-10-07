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
