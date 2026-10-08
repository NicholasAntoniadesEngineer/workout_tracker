import {test,describe} from "node:test";
import assert from "node:assert/strict";

// Share links: a routine packed into the link itself, and a link straight to a Learn topic.
// Whatever goes in comes back out exactly; a link that is cut short, mangled or forged opens
// nothing rather than a broken or junk routine, and never throws.

globalThis.location={origin:"https://www.kingskiln.com",pathname:"/"};
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){},clear(){}};
globalThis.document={documentElement:{dataset:{}}};
const {routineLink,decodeRoutineHash,learnLink,learnLinkId}=await import("../js/share.js");

const hashOf=url=>url.slice(url.indexOf("#"));
const forge=obj=>"#r="+Buffer.from(JSON.stringify(obj),"utf8").toString("base64url");
let seed=12345;const rnd=n=>(seed=(seed*1103515245+12345)%2147483648)%n;
const PIECES=["Squat","Día","💪🏽","é","e\u0301","「腕立て」","ﷺ","+","/","=","#","&","%20","?x=1","'","\"","\\","<b>","  ","Ω","🇿🇦","z\u200Dz"];
const word=()=>Array.from({length:1+rnd(4)},()=>PIECES[rnd(PIECES.length)]).join("").trim()||"x";

describe("routine links",()=>{
  test("five hundred routines of every kind of name come back exactly",()=>{
    for(let k=0;k<500;k++){
      const name=word().slice(0,60).trim()||"x",ex=Array.from({length:1+rnd(40)},word);
      const url=routineLink(name,ex);
      assert.match(url,/^https:\/\/www\.kingskiln\.com\/#r=[A-Za-z0-9_-]+$/);
      const back=decodeRoutineHash(hashOf(url));
      assert.deepEqual(back,{name:name.trim(),ex:ex.map(e=>e.trim())},JSON.stringify([name,ex]));
    }
  });
  test("a link cut short at any point opens nothing, and never throws",()=>{
    const hash=hashOf(routineLink("Push day 💪",["Bench press","Overhead press","Dips","Triceps pushdown"]));
    for(let n=0;n<hash.length;n++)assert.equal(decodeRoutineHash(hash.slice(0,n)),null,"cut at "+n);
  });
  test("a link with any one character changed either opens nothing or a valid routine",()=>{
    const hash=hashOf(routineLink("Legs",["Squats","Romanian deadlift","Calf raises"]));
    for(let i=3;i<hash.length;i++)for(const c of "Aa0-_z"){
      const h=hash.slice(0,i)+c+hash.slice(i+1);
      const out=decodeRoutineHash(h);
      if(out){assert.equal(typeof out.name,"string");assert.ok(out.name.length&&out.name.length<=60);
        assert.ok(Array.isArray(out.ex)&&out.ex.length&&out.ex.length<=40&&out.ex.every(e=>typeof e==="string"&&e));}
    }
  });
  test("anything after the routine (a tracking tag, a second hash) opens nothing",()=>{
    const hash=hashOf(routineLink("Legs",["Squats"]));
    for(const tail of ["&utm_source=x","?ref=1"," ","%20","#r=abc","\n"])assert.equal(decodeRoutineHash(hash+tail),null,JSON.stringify(tail));
    assert.equal(decodeRoutineHash(" "+hash),null);
  });
  test("other kinds of JSON open nothing",()=>{
    for(const v of [[],"Legs",42,true,{n:"Legs",e:{}},{n:"Legs",e:null},{n:["Legs"],e:["Squats"]},{name:"Legs",ex:["Squats"]}])
      assert.equal(decodeRoutineHash(forge(v)),null,JSON.stringify(v));
  });
  test("a huge forged link is cut down to 60 characters and 40 exercises",()=>{
    const out=decodeRoutineHash(forge({n:"N".repeat(100000),e:Array.from({length:5000},(_,i)=>"Move "+i)}));
    assert.equal(out.name.length,60);assert.equal(out.ex.length,40);
  });
  test("non-text entries in a forged link are dropped, not saved as exercises called null",()=>{
    // BUG: every entry is turned into text with String(), so null, numbers and objects in a
    // forged or corrupted link become exercises named "null", "5" and "[object Object]".
    const out=decodeRoutineHash(forge({n:"Legs",e:["Squats",null,5,{},["x"],"Lunges"]}));
    assert.deepEqual(out,{name:"Legs",ex:["Squats","Lunges"]});
  });
});

describe("Learn links",()=>{
  test("a topic's link opens that topic",()=>{
    for(const id of ["fivebyfive","zone-2","sleep_debt","a1"]){
      const url=learnLink(id);
      assert.equal(url,"https://www.kingskiln.com/#learn="+id);
      assert.equal(learnLinkId(url.slice(url.indexOf("#"))),id);
    }
  });
  test("anything else is not a topic",()=>{
    for(const h of ["","#learn=","#learn=a b","#learn=x/y","#learn=x#y","#r=abc","learn=x",null,undefined])
      assert.equal(learnLinkId(h),null,String(h));
  });
});
