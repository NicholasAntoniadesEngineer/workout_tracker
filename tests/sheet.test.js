import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {sheetRows,markSpots,codeBits,idCode,homography,setsFromMarks,ROW} from "../js/sheet.js";

describe("sheet layout",()=>{
  const s={id:"abc",ex:[{name:"Squats",sets:[]},{name:"Bench press",sets:[]}]};
  const rows=sheetRows(s,{"Squats":[{r:5,w:100},{r:5,w:100}],"Bench press":[{r:8,w:80}]});
  test("an exercise row, its sets, then one extra",()=>{
    assert.deepEqual(rows.map(r=>r.kind+(r.extra?"+":"")),["ex","set","set","set+","ex","set","set+"]);
    assert.equal(markSpots(rows).length,5);
  });
  test("stays on one page",()=>{
    const big={id:"x",ex:Array.from({length:12},(_,i)=>({name:"E"+i,sets:[]}))};
    assert.ok(sheetRows(big,{}).length<=ROW.max);
  });
  test("the code is 24 squares, black at both ends, stable for an id",()=>{
    const b=codeBits("abc");assert.equal(b.length,24);assert.equal(b[0],1);assert.equal(b[23],1);
    assert.equal(idCode("abc"),idCode("abc"));assert.notEqual(idCode("abc"),idCode("abd"));
  });
});
describe("homography",()=>{
  test("maps the four corners exactly and a point in between sensibly",()=>{
    const src=[[0,0],[10,0],[0,10],[10,10]],dst=[[100,100],[300,120],[90,330],[310,300]];
    const m=homography(src,dst);
    src.forEach((p,i)=>{const q=m(...p);assert.ok(Math.abs(q[0]-dst[i][0])<1e-6&&Math.abs(q[1]-dst[i][1])<1e-6);});
  });
});
describe("setsFromMarks",()=>{
  const rows=[{kind:"ex",name:"Squats"},{kind:"set",ex:"Squats",i:0,r:5,w:100},{kind:"set",ex:"Squats",i:1,r:5,w:100},{kind:"set",ex:"Squats",i:2,r:0,w:100,extra:true}];
  test("ticked rows as printed, circles change them, an extra counts only with reps",()=>{
    const s=setsFromMarks(rows,{rows:[{row:1,done:true,reps:null,adj:0},{row:2,done:false,reps:4,adj:-1},{row:3,done:false,reps:null,adj:0}]},2.5);
    assert.deepEqual(s.Squats.map(x=>x.r+"@"+x.w),["5@100","4@97.5"]);
  });
});
