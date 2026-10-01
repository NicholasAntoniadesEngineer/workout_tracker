import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {buildCSV,parseCSV,parseImport} from "../js/csv.js";

const BOM="﻿";

// One finished day with a weighted exercise (incl. a warm-up and a per-side set), a band
// exercise, a timed exercise, and an exercise added but never logged.
function sampleDay(){
  return {
    id:"day1",title:"Thursday, Jan 15",created:"2026-01-15T10:00:00.000Z",
    started:"2026-01-15T10:01:00.000Z",ended:"2026-01-15T10:55:00.000Z",running:false,timerFrom:"",
    ex:[
      {id:"e1",name:"Squats",timed:false,sets:[
        {r:5,side:false,w:40,t:20,rest:0,at:"2026-01-15T10:05:00.000Z",wu:true,band:""},
        {r:8,side:false,w:82.5,t:35,rest:120,at:"2026-01-15T10:10:00.000Z",wu:false,band:""}
      ]},
      {id:"e2",name:"Bulgarian split squat",timed:false,sets:[
        {r:10,side:true,w:0,t:40,rest:90,at:"2026-01-15T10:20:00.000Z",wu:false,band:""}
      ]},
      {id:"e3",name:"Band row",timed:false,sets:[
        {r:15,side:false,w:0,t:30,rest:60,at:"2026-01-15T10:30:00.000Z",wu:false,band:"30–60"}
      ]},
      {id:"e4",name:"Plank",timed:true,sets:[
        {r:60,side:false,w:0,t:60,rest:45,at:"2026-01-15T10:40:00.000Z",wu:false,band:""}
      ]},
      {id:"e5",name:"Dips",timed:false,sets:[]}
    ]
  };
}

// What survives the trip: everything except generated ids.
const strip=s=>({title:s.title,created:s.created,started:s.started,ended:s.ended,running:s.running,
  ex:s.ex.map(e=>({name:e.name,timed:!!e.timed,sets:e.sets}))});

describe("parseCSV",()=>{
  test("splits rows and fields",()=>{
    assert.deepEqual(parseCSV("a,b\r\nc,d"),[["a","b"],["c","d"]]);
  });

  test("handles quoted commas, quotes and newlines",()=>{
    assert.deepEqual(parseCSV('"x, y","say ""hi""","two\nlines"'),[["x, y",'say "hi"',"two\nlines"]]);
  });

  test("strips a leading byte-order mark",()=>{
    assert.deepEqual(parseCSV(BOM+"Date,Reps"),[["Date","Reps"]]);
  });
});

describe("parseImport",()=>{
  test("round-trips a day through the export format",()=>{
    const day=sampleDay();
    const [back]=parseImport(BOM+buildCSV([day]));
    assert.deepEqual(strip(back),strip(day));
  });

  test("round-trips several days, keeping each one separate",()=>{
    const a=sampleDay();
    const b=Object.assign(sampleDay(),{id:"day2",title:"Friday, Jan 16",created:"2026-01-16T10:00:00.000Z"});
    const back=parseImport(buildCSV([b,a]));
    assert.deepEqual(back.map(strip),[strip(a),strip(b)]);
  });

  test("gives each imported day and exercise a fresh id",()=>{
    const [back]=parseImport(buildCSV([sampleDay()]));
    assert.equal(typeof back.id,"string");
    assert.notEqual(back.id,"day1");
    assert.ok(back.ex.every(e=>typeof e.id==="string"&&e.id.length>0));
  });

  test("orders sets by their set number, not row order",()=>{
    const csv="Date,Exercise,Set,Reps\n2026-01-15,Squats,2,8\n2026-01-15,Squats,1,10";
    const [back]=parseImport(csv);
    assert.deepEqual(back.ex[0].sets.map(x=>x.r),[10,8]);
  });

  test("accepts the side column's yes-style words",()=>{
    const csv="Date,Exercise,Reps,Side\n2026-01-15,Lunges,10,yes\n2026-01-15,Lunges,10,";
    const [back]=parseImport(csv);
    assert.deepEqual(back.ex[0].sets.map(x=>x.side),[true,false]);
  });

  test("uses the date as the title when there is no Day column",()=>{
    const [back]=parseImport("Date,Exercise,Reps\n2026-01-15,Squats,10");
    assert.equal(back.title,"2026-01-15");
  });

  test("skips rows with no date or no exercise name",()=>{
    const csv="Date,Exercise,Reps\n,Squats,10\n2026-01-15,,10\n2026-01-15,Dips,12";
    const back=parseImport(csv);
    assert.deepEqual(back.map(s=>s.ex.map(e=>e.name)),[["Dips"]]);
  });

  test("rejects an empty file",()=>{
    assert.throws(()=>parseImport(""),/empty/);
  });

  test("rejects a file without the required columns",()=>{
    assert.throws(()=>parseImport("Name,Count\nSquats,10"),/expected columns/);
  });

  test("rejects a header with no workout rows",()=>{
    assert.throws(()=>parseImport("Date,Exercise,Reps\n"),/No workout rows/);
  });
});
