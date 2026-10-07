import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {periodReview,yearRange,monthRange} from "../js/review.js";

const at=(y,m,d)=>new Date(y,m,d,12).toISOString();
const S=(id,created,sets,name="Squats")=>({id,created,started:"",ended:"",title:"",ex:[{name,sets}]});
const st=(r,w,x={})=>Object.assign({r,w,side:false,t:0,rest:0,at:"",wu:false,band:""},x);
const sessions=[S("a",at(2025,11,1),[st(5,100)]),S("b",at(2026,0,5),[st(5,110),st(5,110),st(5,60,{wu:true})]),
  S("c",at(2026,0,12),[st(8,80)],"Bench press"),S("d",at(2026,2,3),[st(5,105)])];

describe("periodReview",()=>{
  const r=periodReview(sessions,Object.assign({restDay:0,now:Date.UTC(2026,11,31)},yearRange(2026)));
  test("counts days, workouts, sets and volume inside the period, warm-ups left out",()=>{
    assert.equal(r.days,3);assert.equal(r.workouts,3);assert.equal(r.sets,4);
    assert.equal(r.volume,5*110*2+8*80+5*105);
  });
  test("a record is a lift that beat its best from before the period",()=>{
    assert.equal(r.records.length,1);assert.equal(r.records[0].name,"Squats");
    assert.ok(r.records[0].to>r.records[0].from);
    assert.equal(r.firsts,1);
  });
  test("the busiest month and weeks trained",()=>{
    assert.equal(r.topMonth,"January");assert.equal(r.byMonth[0],2);assert.equal(r.weeks,3);
  });
  test("a month on its own",()=>{
    const m=periodReview(sessions,Object.assign({restDay:0,now:Date.UTC(2026,11,31)},monthRange(2026,2)));
    assert.equal(m.days,1);assert.equal(m.records.length,0);
  });
});
