// Printing and scanning in the app: the jump a sheet counts weight in, what it prints for each
// exercise, finding a printed page by its code, the review's defaults, and putting a page's sets
// into the day without losing another page's.
import {test,describe,beforeEach} from "node:test";
import assert from "node:assert/strict";

const memory=new Map();
Object.defineProperty(globalThis,"localStorage",{configurable:true,writable:true,value:{getItem:k=>(memory.has(k)?memory.get(k):null),setItem:(k,v)=>{memory.set(k,String(v));},removeItem:k=>{memory.delete(k);},clear:()=>{memory.clear();}}});
globalThis.document={documentElement:{dataset:{}}};
const store=await import("../js/store.js");
const {sheetStep,sheetExercises,sheetIndex,scanSets,applyScan}=await import("../js/actions/sheet.js");
const {sheetPages,pageCode,idCode}=await import("../js/sheet.js");
const {state}=store;

const set=(r,w,o)=>Object.assign({r,side:false,w,t:0,rest:0,at:"",wu:false,band:""},o||{});
const day=(id,created,ex)=>({id,title:id,created,started:"",ended:"",running:false,timerFrom:"",ex});
beforeEach(()=>{
  memory.clear();store.load();
  state.settings.unit="kg";state.settings.stepMode="small";state.settings.restTarget=0;state.exProg={};state.exNotes={};state.restTargets={};
  state.sessions=[
    day("old","2026-10-01T10:00:00.000Z",[{id:"a",name:"Back squat",sets:[set(5,100),set(5,100),set(4,100)]},{id:"b",name:"Plank",timed:true,sets:[set(60,0),set(45,0)]}]),
    day("today","2026-10-08T10:00:00.000Z",[{id:"c",name:"Back squat",sets:[]},{id:"d",name:"Plank",timed:true,sets:[]},{id:"e",name:"Dumbbell curl",sets:[]},{id:"f",name:"Band pull-aparts",sets:[]}]),
  ];
});

describe("the jump a sheet counts weight in",()=>{
  test("an exercise's own jump comes first",()=>{state.exProg={"back squat":{step:5}};assert.equal(sheetStep("Back squat"),5);});
  test("dumbbells logged per hand go up in twos (fives in pounds)",()=>{
    state.exProg={"dumbbell curl":{hand:true}};assert.equal(sheetStep("Dumbbell curl"),2);
    state.exProg={"dumbbell curl":{hand:true,unit:"lb"}};assert.equal(sheetStep("Dumbbell curl"),5);
  });
  test("otherwise the Progression setting",()=>{assert.equal(sheetStep("Back squat"),2.5);state.settings.stepMode="big";assert.equal(sheetStep("Back squat"),5);});
});

describe("what each exercise prints",()=>{
  test("last time, rest and the pinned note, from the app",()=>{
    state.restTargets={"back squat":180};state.exNotes={"back squat":"Belt on the top set\nsecond line"};
    const e=sheetExercises(state.sessions[1]).find(x=>x.name==="Back squat");
    assert.match(e.last,/^5·5·4 × 100 kg · /);assert.equal(e.rest,"3:00");assert.equal(e.note,"Belt on the top set");
    assert.equal(e.sets.length,3);assert.equal(e.mode,"reps");
  });
  test("a hold prints in seconds, a band without weight, an exercise with no history as three blank rows",()=>{
    const list=sheetExercises(state.sessions[1]),plank=list.find(x=>x.name==="Plank"),band=list.find(x=>x.name==="Band pull-aparts"),curl=list.find(x=>x.name==="Dumbbell curl");
    assert.equal(plank.mode,"secs");assert.match(plank.last,/^60·45 s · /);assert.ok(band.band);
    assert.equal(curl.sets.length,3);assert.ok(curl.sets.every(x=>!x.r&&!x.w));
  });
  test("a day already logged prints what was logged",()=>{
    state.sessions[1].ex[0].sets=[set(3,110),set(3,110)];
    assert.deepEqual(sheetExercises(state.sessions[1])[0].sets.map(x=>x.r+"@"+x.w),["3@110","3@110"]);
  });
});

describe("finding a printed page",()=>{
  test("every page of every printed day, by its code, and sheets from the first layout",()=>{
    const s=state.sessions[1],exs=Array.from({length:12},(_,i)=>({name:"E"+i,sets:[{r:10,w:40},{r:10,w:40},{r:10,w:40}]})),pages=sheetPages(s,exs);
    s.sheet={v:2,pages:pages.map(p=>({code:p.code,rows:p.rows,notes:p.notes}))};
    state.sessions[0].sheet={code:idCode("old"),rows:[{kind:"ex",name:"Back squat"}]};
    const idx=sheetIndex();
    assert.equal(idx.size,pages.length+1);assert.equal(idx.get(pageCode(s.id,1)).page,1);assert.equal(idx.get(idCode("old")).s.id,"old");
  });
});

describe("the review",()=>{
  const rows=[{kind:"ex",name:"Back squat"},{kind:"set",ex:"Back squat",i:0,r:5,w:100,step:2.5,y:60,h:8},{kind:"set",ex:"Back squat",i:1,r:5,w:100,step:2.5,y:68,h:8}];
  test("sets read clearly start kept; one only written in starts left out",()=>{
    const out=scanSets(rows,{rows:[{row:1,done:true,reps:null,kg:null,adj:0,unsure:false,note:false},{row:2,done:false,reps:null,kg:null,adj:0,unsure:false,note:true}]});
    assert.deepEqual(out["Back squat"].map(x=>x.on),[true,false]);
  });
  test("first-layout rows take the exercise's jump",()=>{
    state.exProg={"back squat":{step:5}};const old=[{kind:"ex",name:"Back squat"},{kind:"set",ex:"Back squat",i:0,r:5,w:100}];
    assert.equal(scanSets(old,{rows:[{row:1,done:true,reps:null,kg:null,adj:1,unsure:false,note:false}]})["Back squat"][0].w,105);
  });
});

describe("putting a scan into the day",()=>{
  const sc=(page,sets,notes)=>({id:"today",page,pages:2,sets,notes});
  const on=list=>list.map(([r,w])=>({r,w,on:true}));
  test("page 1, then page 2: each exercise gets its own page's sets",()=>{
    const s=state.sessions[1];
    applyScan(s,sc(0,{"Back squat":on([[5,100],[5,100]])},"data:a"));
    applyScan(s,sc(1,{"Plank":on([[60,0],[45,0]])},"data:b"));
    assert.deepEqual(s.ex[0].sets.map(x=>x.r+"@"+x.w),["5@100","5@100"]);assert.deepEqual(s.ex[1].sets.map(x=>x.r),[60,45]);
    assert.deepEqual(s.notePhotos,["data:a","data:b"]);assert.equal(s.notePhoto,"data:a");assert.ok(s.started);
  });
  test("scanning a page again replaces only that page's sets",()=>{
    const s=state.sessions[1];
    applyScan(s,sc(0,{"Back squat":on([[5,100]])}));applyScan(s,sc(1,{"Plank":on([[60,0]])}));
    applyScan(s,sc(0,{"Back squat":on([[5,100],[4,97.5]])}));
    assert.deepEqual(s.ex[0].sets.map(x=>x.r+"@"+x.w),["5@100","4@97.5"]);assert.deepEqual(s.ex[1].sets.map(x=>x.r),[60]);
  });
  test("an exercise split over two pages keeps both pages' sets, in order",()=>{
    const s=state.sessions[1];
    applyScan(s,sc(0,{"Back squat":on([[5,100],[5,100]])}));applyScan(s,sc(1,{"Back squat":on([[5,100]])}));
    assert.equal(s.ex[0].sets.length,3);
  });
  test("sets left out stay out; a dumbbell set is per hand; another unit is kept as written",()=>{
    state.exProg={"dumbbell curl":{hand:true,unit:"lb"}};const s=state.sessions[1];
    applyScan(s,sc(0,{"Back squat":[{r:5,w:100,on:true},{r:5,w:100,on:false}],"Dumbbell curl":on([[10,30]])}));
    assert.equal(s.ex[0].sets.length,1);const c=s.ex[2].sets[0];assert.equal(c.hand,true);assert.equal(c.u,"lb");assert.equal(c.w,30);
  });
});
