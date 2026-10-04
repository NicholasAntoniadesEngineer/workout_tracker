import {test} from "node:test";
import assert from "node:assert/strict";
import {makeProgramme,position,nextDate,prescription,defaultWeekdays,trainingMax} from "../js/programme.js";

const topic={id:"wendler",title:"Jim Wendler: 5/3/1",days:[
  {name:"Press",ex:["Shoulder press","Dips"]},{name:"Deadlift",ex:["Deadlift"]},
  {name:"Bench",ex:["Bench press"]},{name:"Squat",ex:["Squats"]}]};
const done=(p,n)=>Array.from({length:n},(_,i)=>({created:new Date(2026,9,1+i,12).toISOString(),prog:{pid:p.id},ex:[{name:"x",sets:[{r:5,w:50}]}]}));

test("5/3/1 walks the four days, then the weeks, then a new cycle with a higher max",()=>{
  const p=makeProgramme(topic,{maxes:{"Shoulder press":50,"Deadlift":150},start:"2026-10-01"});
  assert.equal(p.rule,"531");
  let pos=position(p,done(p,0));
  assert.equal(pos.dayName,"Press");assert.equal(pos.week,0);assert.equal(pos.cycle,1);
  assert.deepEqual(prescription(p,pos).sets.map(s=>s.w),[32.5,37.5,42.5]);
  pos=position(p,done(p,5));
  assert.equal(pos.dayName,"Deadlift");assert.equal(pos.weekLabel,"3s");
  assert.deepEqual(prescription(p,pos).sets.map(s=>s.r),["3","3","3+"]);
  pos=position(p,done(p,16));
  assert.equal(pos.cycle,2);assert.equal(prescription(p,pos).tm,52.5);
});

test("the next date skips rest days and today once today's workout is done",()=>{
  const p=makeProgramme(topic,{weekdays:[1,4],start:"2026-10-01"});
  assert.equal(nextDate(p,[],new Date(2026,9,5,9)),"2026-10-05");   // a Monday
  assert.equal(nextDate(p,[],new Date(2026,9,6,9)),"2026-10-08");   // Tuesday → Thursday
  const today=[{created:new Date(2026,9,5,8).toISOString(),prog:{pid:p.id},ex:[{name:"x",sets:[{r:5}]}]}];
  assert.equal(nextDate(p,today,new Date(2026,9,5,18)),"2026-10-08");
  assert.deepEqual(defaultWeekdays(3),[1,3,5]);
});

test("a training max is 90% of the best estimated one-rep max, rounded to a plate",()=>{
  const s=[{ex:[{name:"Bench press",sets:[{w:100,r:5},{w:60,r:10,wu:true}]}]}];
  assert.equal(trainingMax(s,"Bench press","kg"),105);
});
