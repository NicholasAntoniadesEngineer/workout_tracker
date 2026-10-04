import {test} from "node:test";
import assert from "node:assert/strict";
import {isFit,parseFit,unzipWorkout} from "../js/fit.js";

// A small FIT file built by hand: records with position, altitude, heart rate and distance
// (one with a compressed timestamp), a string field to skip, and a running session.
function buildFit(){
  const out=[];
  const u8=v=>out.push(v&0xFF),u16=v=>{u8(v);u8(v>>8);},u32=v=>{u16(v&0xFFFF);u16((v>>>16)&0xFFFF);};
  const i32=v=>u32(v>>>0);
  // record definition, local 0
  u8(0x40);u8(0);u8(0);u16(20);u8(7);
  [[253,4,0x86],[0,4,0x85],[1,4,0x85],[78,4,0x86],[3,1,0x02],[5,4,0x86],[200,8,0x07]].forEach(f=>{u8(f[0]);u8(f[1]);u8(f[2]);});
  const ts0=1100000000,semi=d=>Math.round(d/180*2147483648);
  const rec=(ts,lat,lon,altM,bpm,distM,hdr)=>{u8(hdr==null?0:hdr);if(hdr==null)u32(ts);else u32(0xFFFFFFFF);
    i32(semi(lat));i32(semi(lon));u32((altM+500)*5);u8(bpm);u32(distM*100);for(let i=0;i<8;i++)u8(65);};
  rec(ts0,51.5,-0.12,10,120,0);
  rec(ts0+10,51.5009,-0.12,12,140,100);
  // compressed header: local 0, offset = (ts0+20)&31, but its timestamp field is invalid so the header's time is used
  rec(0,51.5018,-0.12,11,150,200,0x80|((ts0+20)&0x1F));
  // session definition, local 1, with a developer field to skip
  u8(0x60|1);u8(0);u8(0);u16(18);u8(3);[[5,1,0x00],[7,4,0x86],[9,4,0x86]].forEach(f=>{u8(f[0]);u8(f[1]);u8(f[2]);});
  u8(1);u8(0);u8(2);u8(0);
  u8(1);u8(1);u32(20000);u32(20000);u16(0xBEEF);
  const data=Uint8Array.from(out),h=new Uint8Array(14+data.length+2);
  const dv=new DataView(h.buffer);
  h[0]=14;h[1]=0x20;dv.setUint16(2,2100,true);dv.setUint32(4,data.length,true);h.set([0x2E,0x46,0x49,0x54],8);
  h.set(data,14);
  return h;
}

test("a FIT file reads into a route, heart rate, distance and sport", () => {
  const f=buildFit();
  assert.ok(isFit(f));
  const w=parseFit(f);
  assert.equal(w.track.length,3);
  assert.equal(w.hr.length,3);
  assert.equal(w.sport,"running");
  assert.equal(w.secs,20);
  assert.equal(w.distM,200);
  assert.ok(Math.abs(w.track[1].lat-51.5009)<1e-6);
  assert.ok(Math.abs(w.track[1].alt-12)<1e-9);
  assert.equal(w.track[2].t-w.track[0].t,20000);
  assert.equal(w.start,631065600000+1100000000*1000);
  assert.equal(w.hr[2].bpm,150);
});

test("text and other files are not taken for FIT", () => {
  assert.equal(isFit(new TextEncoder().encode("<?xml version='1.0'?><gpx></gpx>")),false);
  assert.throws(()=>parseFit(new Uint8Array(20)));
});

function zip(name,bytes,method,stored){
  const n=new TextEncoder().encode(name),body=method===8?stored:bytes;
  const local=new Uint8Array(30+n.length+body.length),ld=new DataView(local.buffer);
  ld.setUint32(0,0x04034b50,true);ld.setUint16(8,method,true);ld.setUint32(18,body.length,true);ld.setUint32(22,bytes.length,true);
  ld.setUint16(26,n.length,true);local.set(n,30);local.set(body,30+n.length);
  const cd=new Uint8Array(46+n.length),cdv=new DataView(cd.buffer);
  cdv.setUint32(0,0x02014b50,true);cdv.setUint16(10,method,true);cdv.setUint32(20,body.length,true);cdv.setUint32(24,bytes.length,true);
  cdv.setUint16(28,n.length,true);cdv.setUint32(42,0,true);cd.set(n,46);
  const end=new Uint8Array(22),ed=new DataView(end.buffer);
  ed.setUint32(0,0x06054b50,true);ed.setUint16(8,1,true);ed.setUint16(10,1,true);ed.setUint32(12,cd.length,true);ed.setUint32(16,local.length,true);
  const all=new Uint8Array(local.length+cd.length+end.length);all.set(local);all.set(cd,local.length);all.set(end,local.length+cd.length);
  return all.buffer;
}

test("Garmin's zipped export opens to the FIT inside, stored or deflated", async () => {
  const f=buildFit();
  const a=await unzipWorkout(zip("12345_ACTIVITY.fit",f,0));
  assert.equal(a.name,"12345_ACTIVITY.fit");
  assert.deepEqual([...a.bytes],[...f]);
  const deflated=new Uint8Array(await new Response(new Blob([f]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
  const b=await unzipWorkout(zip("12345_ACTIVITY.fit",f,8,deflated));
  assert.equal(parseFit(b.bytes).track.length,3);
});
