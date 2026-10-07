import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {strengthFit,fitCategory,fitCrc} from "../js/fitwrite.js";
import {parseFit,isFit} from "../js/fit.js";

// A tiny reader for the messages we write: global number → list of {field: value}.
function messages(bytes){
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),defs={},out={};
  let at=bytes[0];const end=at+dv.getUint32(4,true);
  while(at<end){const h=bytes[at++];
    if(h&0x40){const local=h&0xF,g=dv.getUint16(at+2,true),n=bytes[at+4];at+=5;const f=[];for(let i=0;i<n;i++){f.push([bytes[at],bytes[at+1]]);at+=3;}defs[local]={g,f};continue;}
    const d=defs[h&0xF],v={};d.f.forEach(([num,size])=>{v[num]=size===1?bytes[at]:size===2?dv.getUint16(at,true):dv.getUint32(at,true);at+=size;});
    (out[d.g]=out[d.g]||[]).push(v);}
  return out;
}
const t0=Date.UTC(2026,9,8,7,0,0);
const s={created:new Date(t0).toISOString(),started:new Date(t0).toISOString(),ended:new Date(t0+30*60000).toISOString(),title:"Legs",
  ex:[{name:"Squats",sets:[{r:5,w:100,t:40,at:new Date(t0+5*60000).toISOString()},{r:5,w:100,t:40,at:new Date(t0+9*60000).toISOString()}]},
      {name:"Bench press",sets:[{r:8,w:135,u:"lb",t:30,at:new Date(t0+15*60000).toISOString()}]}]};

describe("strengthFit",()=>{
  const f=strengthFit(s,"kg");
  test("is a valid FIT file with matching CRCs",()=>{
    assert.ok(isFit(f));
    const dv=new DataView(f.buffer);
    assert.equal(dv.getUint16(12,true),fitCrc(f,0,12));
    assert.equal(dv.getUint16(f.length-2,true),fitCrc(f,0,f.length-2));
  });
  test("the app's own reader opens it as an activity of the right length",()=>{
    const r=parseFit(f);
    assert.ok(Math.abs(r.secs-1800)<2);
  });
  test("one set message per set, with reps, weight in kg and the lift's category",()=>{
    const m=messages(f),sets=m[225];
    assert.equal(sets.length,3);
    assert.equal(sets[0][3],5);assert.equal(sets[0][4],100*16);assert.equal(sets[0][7],28);
    assert.equal(sets[2][7],0);assert.ok(Math.abs(sets[2][4]/16-61.23)<0.1);assert.equal(sets[2][9],2);
  });
  test("the session is training › strength training",()=>{
    const m=messages(f);assert.equal(m[18][0][5],10);assert.equal(m[18][0][6],20);assert.equal(m[0][0][0],4);
  });
});
describe("fitCategory",()=>{
  test("matches common lifts",()=>{
    assert.equal(fitCategory("Romanian deadlift"),8);assert.equal(fitCategory("Lying leg curl"),15);
    assert.equal(fitCategory("Bicep curls"),7);assert.equal(fitCategory("Lat pulldown"),21);
    assert.equal(fitCategory("Bulgarian split squat"),17);assert.equal(fitCategory("Turkish get-up"),65534);
  });
});
