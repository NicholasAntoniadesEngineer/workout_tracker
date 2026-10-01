import {test,describe} from "node:test";
import assert from "node:assert/strict";

// routineLink builds on the page's own address; Node has no `location`, so give it one.
globalThis.location={origin:"https://www.kingskiln.com",pathname:"/"};

const {routineLink,decodeRoutineHash}=await import("../js/share.js");

const hashOf=url=>url.slice(url.indexOf("#"));
// Encodes any payload the way routineLink does, so malformed payloads can be built too.
const encode=obj=>"#r="+Buffer.from(JSON.stringify(obj),"utf8").toString("base64url");

describe("routineLink",()=>{
  test("points at the app's own page with the routine in the hash",()=>{
    const url=routineLink("Push day",["Bench press","Dips"]);
    assert.match(url,/^https:\/\/www\.kingskiln\.com\/#r=[A-Za-z0-9_-]+$/);
  });
});

describe("decodeRoutineHash",()=>{
  test("decodes a link made by routineLink",()=>{
    const hash=hashOf(routineLink("Push day",["Bench press","Dips"]));
    assert.deepEqual(decodeRoutineHash(hash),{name:"Push day",ex:["Bench press","Dips"]});
  });

  test("round-trips non-ASCII names",()=>{
    const hash=hashOf(routineLink("Día de pierna — 💪",["Sentadilla","Band squat"]));
    assert.deepEqual(decodeRoutineHash(hash),{name:"Día de pierna — 💪",ex:["Sentadilla","Band squat"]});
  });

  test("trims names and drops blank exercises",()=>{
    assert.deepEqual(decodeRoutineHash(encode({n:"  Legs ",e:[" Squats ","","  ","Deadlift"]})),
      {name:"Legs",ex:["Squats","Deadlift"]});
  });

  test("caps the name at 60 characters and the list at 40 exercises",()=>{
    const ex=Array.from({length:50},(_,i)=>"Move "+i);
    const out=decodeRoutineHash(encode({n:"x".repeat(80),e:ex}));
    assert.equal(out.name.length,60);
    assert.equal(out.ex.length,40);
  });

  test("rejects a hash without the #r= prefix",()=>{
    const hash=hashOf(routineLink("Push day",["Dips"]));
    assert.equal(decodeRoutineHash(hash.slice(1)),null);
    assert.equal(decodeRoutineHash("#x="+hash.slice(3)),null);
  });

  test("rejects characters outside the URL-safe base64 alphabet",()=>{
    assert.equal(decodeRoutineHash("#r=abc+def/"),null);
  });

  test("rejects payloads that are not valid base64 JSON",()=>{
    assert.equal(decodeRoutineHash("#r=bm90IGpzb24"),null); // "not json"
    assert.equal(decodeRoutineHash("#r=A"),null);
  });

  test("rejects JSON missing a string name or an exercise list",()=>{
    assert.equal(decodeRoutineHash(encode({n:5,e:["Dips"]})),null);
    assert.equal(decodeRoutineHash(encode({n:"Push"})),null);
    assert.equal(decodeRoutineHash(encode({n:"Push",e:"Dips"})),null);
    assert.equal(decodeRoutineHash(encode(null)),null);
  });

  test("rejects an empty name or an empty exercise list",()=>{
    assert.equal(decodeRoutineHash(encode({n:"   ",e:["Dips"]})),null);
    assert.equal(decodeRoutineHash(encode({n:"Push",e:[]})),null);
  });

  test("returns null for an empty or missing hash",()=>{
    assert.equal(decodeRoutineHash(""),null);
    assert.equal(decodeRoutineHash(undefined),null);
  });
});
