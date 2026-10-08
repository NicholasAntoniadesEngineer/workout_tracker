import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {isFit,parseFit,unzipWorkout} from "../js/fit.js";
import {strengthFit,fitCategory,fitCrc} from "../js/fitwrite.js";
import {fit,semi} from "./helpers/fitfile.js";
import {zip} from "./helpers/zipfile.js";

// FIT files in and out. Files are built here byte by byte (either byte order, developer fields,
// compressed timestamps, several sessions) and read back; damaged and cut-off files must fail
// cleanly; and the app's own strength FIT is checked against the FIT profile.

const FIT_EPOCH=631065600000;
const T=1100000000;                                     // a FIT timestamp in 2024

// record: timestamp, lat, lon, heart rate, distance (cm)
const REC=[[253,4,0x86],[0,4,0x85],[1,4,0x85],[3,1,0x02],[5,4,0x86]];
// session: sport, elapsed (ms), distance (cm), ascent (m)
const SES=[[5,1,0x00],[7,4,0x86],[9,4,0x86],[22,2,0x84]];
const FILEID=[[0,1,0x00]];
// Bytes up to the end of the fourth record: header, file id (definition and data), the record
// definition, four records.
const AFTER_4=14+(6+3)+2+(6+5*3)+4*18;
function sampleRun(opts){
  const f=fit(opts).def(0,0,FILEID).msg(0,[4]).def(1,20,REC);
  for(let i=0;i<5;i++)f.msg(1,[T+i*10,semi(51+i*0.0009),semi(-0.12),130+i,i*10000]);
  return f.def(2,18,SES).msg(2,[1,40000,40000,7]);
}

describe("reading FIT",()=>{
  test("a little-endian activity reads into route, heart rate, distance, time, climb and sport",()=>{
    const w=parseFit(sampleRun().bytes());
    assert.equal(w.fileType,4);assert.equal(w.sport,"running");
    assert.equal(w.track.length,5);assert.equal(w.hr.length,5);
    assert.equal(w.secs,40);assert.equal(w.distM,400);assert.equal(w.climbM,7);
    assert.equal(w.start,FIT_EPOCH+T*1000);
    assert.ok(Math.abs(w.track[4].lat-51.0036)<1e-6);assert.ok(Math.abs(w.track[0].lon+0.12)<1e-6);
    assert.equal(w.track[0].alt,null);
  });
  test("a big-endian file reads the same",()=>{
    const a=parseFit(sampleRun().bytes()),b=parseFit(sampleRun({big:true}).bytes());
    assert.deepEqual(b,a);
  });
  test("an old 12-byte header without its own CRC reads the same",()=>{
    assert.deepEqual(parseFit(sampleRun({hlen:12}).bytes()),parseFit(sampleRun().bytes()));
  });
  test("bytes handed over as a slice of a bigger buffer are read from the slice",()=>{
    const f=sampleRun().bytes(),big=new Uint8Array(f.length+100);big.set(f,37);
    assert.deepEqual(parseFit(big.subarray(37,37+f.length)),parseFit(f));
    assert.deepEqual(parseFit(f.buffer),parseFit(f));
  });
  test("invalid values are left out: no position, no pulse, a zero pulse",()=>{
    const f=fit().def(0,20,REC)
      .msg(0,[T,0x7FFFFFFF,0x7FFFFFFF,140,0])
      .msg(0,[T+1,semi(51),semi(0),0xFF,100])
      .msg(0,[T+2,semi(51.0001),semi(0),0,200]).bytes();
    const w=parseFit(f);
    assert.equal(w.track.length,2);
    assert.deepEqual(w.hr.map(h=>h.bpm),[140]);
    assert.equal(w.distM,2,"no session: the last record's distance");
    assert.equal(w.secs,1,"no session: first to last route point");
  });
  test("compressed timestamps roll over correctly past each 32 seconds",()=>{
    const base=T-(T%32)+30;                            // offset 30 within its 32-second block
    const f=fit().def(0,20,REC).msg(0,[base,semi(51),semi(0),120,0])
      .msg(0,[0xFFFFFFFF,semi(51.001),semi(0),121,100],(base+4)&31)     // wraps: offset 2
      .msg(0,[0xFFFFFFFF,semi(51.002),semi(0),122,200],(base+20)&31).bytes();
    const w=parseFit(f);
    assert.deepEqual(w.track.map(p=>(p.t-FIT_EPOCH)/1000-base),[0,4,20]);
  });
  test("developer fields are skipped over without shifting what follows",()=>{
    const f=fit().def(0,20,REC,[[0,3,0],[1,2,0]]);
    for(let i=0;i<3;i++)f.msg(0,[T+i,semi(51+i*0.001),semi(0),100+i,i*100]);
    const w=parseFit(f.bytes());
    assert.deepEqual(w.hr.map(h=>h.bpm),[100,101,102]);
    assert.ok(Math.abs(w.track[2].lat-51.002)<1e-6);
  });
  test("enhanced altitude is preferred, and floats and arrays don't derail the reader",()=>{
    const f=fit().def(0,20,[[253,4,0x86],[0,4,0x85],[1,4,0x85],[2,2,0x84],[78,4,0x86],[13,4,0x88],[99,6,0x02]])
      .msg(0,[T,semi(51),semi(0),(20+500)*5,(25+500)*5,1.5,0])
      .msg(0,[T+1,semi(51.001),semi(0),(30+500)*5,0xFFFFFFFF,2.5,0]).bytes();
    const w=parseFit(f);
    assert.equal(w.track[0].alt,25);
    assert.equal(w.track[1].alt,30,"invalid enhanced altitude falls back to plain altitude");
  });
  test("a multisport file adds up its sessions and keeps the first sport",()=>{
    const f=sampleRun().msg(2,[2,60000,1000000,3]).bytes();
    const w=parseFit(f);
    assert.equal(w.sport,"running");assert.equal(w.secs,100);assert.equal(w.distM,10400);assert.equal(w.climbM,10);
  });
  test("the sport message names the sport when the session doesn't",()=>{
    const f=fit().def(0,12,[[0,1,0x00]]).msg(0,[11]).def(1,20,REC).msg(1,[T,semi(51),semi(0),100,0]).bytes();
    assert.equal(parseFit(f).sport,"walking");
  });
  test("a settings or wellness file says what it is, so it isn't imported as a workout",()=>{
    const f=fit().def(0,0,FILEID).msg(0,[32]).def(1,20,REC).msg(1,[T,0x7FFFFFFF,0x7FFFFFFF,60,0]).bytes();
    assert.equal(parseFit(f).fileType,32);
  });
  test("data before its definition is refused with a clear error",()=>{
    const f=fit().def(0,20,REC).bytes();
    f[14]=0x01;                                         // a data header for an undefined local type
    assert.throws(()=>parseFit(f),/before its definition/);
  });
  test("anything that isn't FIT is refused before reading",()=>{
    for(const b of [new Uint8Array(0),new Uint8Array(12),new TextEncoder().encode("<?xml version='1.0'?><gpx></gpx>"),Uint8Array.from([14,0,0,0,0,0,0,0,0x2E,0x46,0x49])]){
      assert.equal(isFit(b),false);
      assert.throws(()=>parseFit(b),/not a FIT file/);
    }
  });
  test("a file cut off cleanly between two records reads what is there",()=>{
    const full=sampleRun().bytes();
    const cut=full.slice(0,AFTER_4);
    const w=parseFit(cut);
    assert.equal(w.track.length,4);assert.equal(w.secs,30);assert.equal(w.distM,300);
  });
  test("a FIT file cut off mid-record keeps the records before the cut",()=>{
    // BUG: a cut at a message boundary keeps everything before it, but a cut anywhere inside
    // a message throws, so a watch file cut short by a flat battery loses the whole activity.
    const full=sampleRun().bytes();
    const cut=full.slice(0,AFTER_4+10);                  // half way into the fifth record
    let w;
    assert.doesNotThrow(()=>{w=parseFit(cut);});
    assert.equal(w.track.length,4);
  });
  test("damaged files either read or fail with an error; they never hang or give NaN",()=>{
    const good=sampleRun().bytes();let seed=11;
    const rnd=n=>(seed=(seed*48271)%2147483647)%n;
    for(let k=0;k<400;k++){
      const b=good.slice();
      for(let j=0;j<1+rnd(6);j++)b[14+rnd(b.length-16)]=rnd(256);
      if(k%3===0)b.fill(0,14+rnd(b.length-16));
      let w=null;
      try{w=parseFit(b);}catch(e){assert.ok(e instanceof Error);continue;}
      for(const k2 of ["secs","distM","climbM"])assert.ok(Number.isFinite(w[k2]),k2);
      assert.ok(w.track.every(p=>Number.isFinite(p.t)&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)));
    }
  });
});

// Garmin Connect's "Export original": a zip holding the .fit.
const zipBuf=async(entries,opts)=>zip(entries,opts).arrayBuffer();

describe("Garmin's zipped export",()=>{
  const f=sampleRun().bytes();
  test("finds the activity past other files, deflated, with a data descriptor and a comment",async()=>{
    const z=await zipBuf([{name:"readme.txt",data:Buffer.from("hi")},{name:"18071234_ACTIVITY.FIT",data:f,method:8,flags:8}],{comment:"Garmin Connect"});
    const out=await unzipWorkout(z);
    assert.equal(out.name,"18071234_ACTIVITY.FIT");
    assert.deepEqual(parseFit(out.bytes),parseFit(f));
  });
  test("a zip with no workout in it, an unknown compression, or not a zip at all says so",async()=>{
    await assert.rejects(unzipWorkout(await zipBuf([{name:"a.txt",data:Buffer.from("x")}])),/no workout file/);
    await assert.rejects(unzipWorkout(await zipBuf([{name:"a.fit",data:f,method:12}])),/can't unpack/);
    await assert.rejects(unzipWorkout(new TextEncoder().encode("PK but not really").buffer),/not a zip/);
    await assert.rejects(unzipWorkout(new ArrayBuffer(0)),/not a zip/);
  });
  test("a cut-off zip is refused rather than read as garbage",async()=>{
    const z=new Uint8Array(await zipBuf([{name:"a.fit",data:f}]));
    await assert.rejects(unzipWorkout(z.slice(0,z.length-30).buffer));
  });
});

// A reader for what strengthFit writes: global message number → [{field: value}].
function messages(bytes){
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),defs={},out={};
  let at=bytes[0];const end=at+dv.getUint32(4,true);
  while(at<end){const h=bytes[at++];
    if(h&0x40){const g=dv.getUint16(at+2,true),n=bytes[at+4];at+=5;const f=[];for(let i=0;i<n;i++){f.push([bytes[at],bytes[at+1],bytes[at+2]]);at+=3;}defs[h&0xF]={g,f};continue;}
    const d=defs[h&0xF],v={},sizes={};
    d.f.forEach(([num,size])=>{v[num]=size===1?bytes[at]:size===2?dv.getUint16(at,true):dv.getUint32(at,true);sizes[num]=size;at+=size;});
    v.sizes=sizes;(out[d.g]=out[d.g]||[]).push(v);}
  return out;
}
const t0=Date.UTC(2026,9,8,7,0,0),iso=m=>new Date(t0+m*60000).toISOString();

describe("writing a strength FIT",()=>{
  test("a day with no sets is still a valid activity of at least a minute",()=>{
    const f=strengthFit({created:iso(0),ex:[]},"kg");
    const dv=new DataView(f.buffer);
    assert.equal(dv.getUint16(f.length-2,true),fitCrc(f,0,f.length-2));
    const w=parseFit(f);
    assert.equal(w.fileType,4);assert.equal(w.secs,60);
    assert.equal((messages(f)[225]||[]).length,0);
  });
  test("sets go out in the order they were done, numbered, whatever the exercise order",()=>{
    const f=strengthFit({created:iso(0),started:iso(0),ended:iso(30),ex:[
      {name:"Squats",sets:[{r:5,w:100,at:iso(5)},{r:5,w:100,at:iso(20)}]},
      {name:"Bench press",sets:[{r:8,w:60,at:iso(10)}]}]},"kg");
    const sets=messages(f)[225];
    assert.deepEqual(sets.map(s=>s[10]),[0,1,2]);
    assert.deepEqual(sets.map(s=>s[7]),[28,0,28]);
    assert.deepEqual(sets.map(s=>s[3]),[5,8,5]);
  });
  test("pounds become kilograms ×16, bodyweight and timed sets carry no weight or reps",()=>{
    const f=strengthFit({created:iso(0),ex:[
      {name:"Bench press",sets:[{r:5,w:225,at:iso(1)}]},
      {name:"Pull ups",sets:[{r:10,w:0,at:iso(2)}]},
      {name:"Plank",timed:true,sets:[{r:60,t:60,at:iso(3)}]}]},"lb");
    const [bench,pull,plank]=messages(f)[225];
    assert.ok(Math.abs(bench[4]/16-102.06)<0.05);assert.equal(bench[9],2);
    assert.equal(pull[4],0xFFFF);assert.equal(pull[3],10);
    assert.equal(plank[3],0xFFFF);assert.equal(plank[0],60000);
  });
  test("each set's start is its end less its working time",()=>{
    const f=strengthFit({created:iso(0),ex:[{name:"Squats",sets:[{r:5,w:100,t:40,at:iso(5)}]}]},"kg");
    const [s]=messages(f)[225];
    assert.equal(s[254]-s[6],40);assert.equal(s[0],40000);
  });
  test("lap, session and activity carry their timestamp in field 253, FIT's timestamp field",()=>{
    // BUG: they are written to field 254, which in these messages is message_index (a 16-bit
    // index), so the lap, session and activity have no timestamp and a nonsense index.
    const f=strengthFit({created:iso(0),started:iso(0),ended:iso(30),ex:[{name:"Squats",sets:[{r:5,w:100,at:iso(5)}]}]},"kg");
    const m=messages(f),end=Math.round((t0+30*60000)/1000)-631065600;
    for(const g of [19,18,34]){
      assert.equal(m[g][0][253],end,"message "+g+" timestamp");
      assert.notEqual(m[g][0].sizes[254],4,"message "+g+" has no 32-bit field 254");
    }
  });
  test("a box squat is filed as a squat, not a plyometric jump",()=>{
    // BUG: "box" is matched for box jumps before "squat" is reached.
    assert.equal(fitCategory("Box squat"),28);
    assert.equal(fitCategory("Box jumps"),20);
  });
  test("names are matched whatever their case, and nothing is never a category",()=>{
    assert.equal(fitCategory("BENCH PRESS"),0);assert.equal(fitCategory(""),65534);assert.equal(fitCategory(null),65534);
    assert.equal(fitCategory("Nordic curls"),15,"a hamstring curl before a biceps curl");
    assert.equal(fitCategory("Hanging leg raise"),16);assert.equal(fitCategory("Calf raises"),1);
  });
});
