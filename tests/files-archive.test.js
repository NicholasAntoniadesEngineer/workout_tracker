import {test,describe} from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import {gunzip,isGzip,isZip,openZip,walkZip} from "../js/archive.js";
import {zip} from "./helpers/zipfile.js";
globalThis.document=globalThis.document||{documentElement:{dataset:{}}};
const {zipFiles}=await import("../js/exporters.js");

// The zip reader that opens Strava's, Garmin's and Apple's archives straight from the file:
// archives written here by hand, stored and deflated, with data descriptors, comments, odd
// names, zip64 records, zips inside zips, and damaged or cut-off archives that must fail cleanly.

const B=s=>Buffer.from(s);
const text=b=>new TextDecoder().decode(b);
const blobBytes=async b=>new Uint8Array(await b.arrayBuffer());
async function readAll(blob){const out={};await walkZip(blob,async en=>{out[en.name]=text(await en.read());});return out;}

describe("opening a zip",()=>{
  test("stored and deflated entries read back exactly, with their real sizes",async()=>{
    const big="lat,lon\n"+"51.5,-0.12\n".repeat(5000);
    const z=await openZip(zip([{name:"a.txt",data:B("plain")},{name:"dir/b.csv",data:B(big),method:8}]));
    assert.deepEqual(z.entries.map(e=>[e.name,e.method,e.size]),[["a.txt",0,5],["dir/b.csv",8,big.length]]);
    assert.ok(z.entries[1].csize<big.length/10,"really compressed");
    assert.equal(text(await z.bytes(z.entries[0])),"plain");
    assert.equal(text(await z.bytes(z.entries[1])),big);
  });
  test("folders are left out, and entries can be read in any order or more than once",async()=>{
    const z=await openZip(zip([{name:"export/",data:B("")},{name:"export/x.xml",data:B("<x/>"),method:8},{name:"export/y.gpx",data:B("<gpx/>")}]));
    assert.deepEqual(z.entries.map(e=>e.name),["export/x.xml","export/y.gpx"]);
    assert.equal(text(await z.bytes(z.entries[1])),"<gpx/>");
    assert.equal(text(await z.bytes(z.entries[0])),"<x/>");
    assert.equal(text(await z.bytes(z.entries[0])),"<x/>");
  });
  test("entries written with a data descriptor (sizes after the data) read from the directory",async()=>{
    const z=await openZip(zip([{name:"activities.csv",data:B("Activity ID\n1\n"),method:8,flags:8},{name:"n.txt",data:B("next"),flags:8}]));
    assert.equal(text(await z.bytes(z.entries[0])),"Activity ID\n1\n");
    assert.equal(text(await z.bytes(z.entries[1])),"next");
  });
  test("a local header with its own extra field is skipped correctly",async()=>{
    const z=await openZip(zip([{name:"a.gpx",data:B("<gpx>route</gpx>"),method:8,localExtra:Buffer.from([0x55,0x54,5,0,1,9,9,9,9,0xAA,0xBB,4,0,1,2,3,4])}]));
    assert.equal(text(await z.bytes(z.entries[0])),"<gpx>route</gpx>");
  });
  test("a trailing archive comment doesn't hide the directory",async()=>{
    const z=await openZip(zip([{name:"a.txt",data:B("x")}],{comment:"Exported by Garmin Connect. ".repeat(40)}));
    assert.equal(z.entries.length,1);
  });
  test("unicode, spaces and odd names come through as written",async()=>{
    const names=["Läufe/Morgenlauf 🏃.gpx","activities/1 2 3.fit.gz","__MACOSX/._export.xml","a\\b.tcx","日本語.csv"];
    const z=await openZip(zip(names.map(n=>({name:n,data:B(n),flags:0x800}))));
    assert.deepEqual(z.entries.map(e=>e.name),names);
    for(const en of z.entries)assert.equal(text(await z.bytes(en)),en.name);
  });
  test("zip64 archives, for exports past 4 GB or 65,535 files, read their real numbers",async()=>{
    const blob=zip([{name:"apple_health_export/export.xml",data:B("<HealthData/>"),method:8,zip64:true},{name:"b.txt",data:B("bee"),zip64:true}],{zip64:true});
    const z=await openZip(blob);
    assert.deepEqual(z.entries.map(e=>[e.name,e.size]),[["apple_health_export/export.xml",13],["b.txt",3]]);
    assert.equal(text(await z.bytes(z.entries[0])),"<HealthData/>");
    assert.equal(text(await z.bytes(z.entries[1])),"bee");
  });
  test("a directory that promises more entries than it holds stops at the last real one",async()=>{
    const z=await openZip(zip([{name:"a",data:B("1")},{name:"b",data:B("2")}],{count:9}));
    assert.deepEqual(z.entries.map(e=>e.name),["a","b"]);
  });
  test("two thousand entries open quickly",async()=>{
    const many=Array.from({length:2000},(_,i)=>({name:"activities/"+i+".gpx",data:B("<gpx>"+i+"</gpx>")}));
    const t=performance.now(),z=await openZip(zip(many));
    assert.equal(z.entries.length,2000);
    assert.ok(performance.now()-t<500);
    assert.equal(text(await z.bytes(z.entries[1234])),"<gpx>1234</gpx>");
  });
});

describe("damaged archives fail cleanly",()=>{
  const good=()=>zip([{name:"a.gpx",data:B("<gpx>"+"x".repeat(3000)+"</gpx>"),method:8},{name:"b.txt",data:B("bee")}]);
  test("anything that isn't a zip, or is empty, says it isn't a zip",async()=>{
    await assert.rejects(openZip(new Blob([])),/not a zip/);
    await assert.rejects(openZip(new Blob(["Date,Exercise,Reps\n"])),/not a zip/);
    await assert.rejects(openZip(new Blob([new Uint8Array(100000)])),/not a zip/);
  });
  test("a download cut off part-way says it isn't a zip rather than reading half of it",async()=>{
    const b=await blobBytes(good());
    for(const keep of [10,b.length/2|0,b.length-5])await assert.rejects(openZip(new Blob([b.slice(0,keep)])),/not a zip/);
  });
  test("an entry whose header is overwritten is called damaged",async()=>{
    const b=await blobBytes(good());b[0]=0;
    const z=await openZip(new Blob([b]));
    await assert.rejects(z.bytes(z.entries[0]),/damaged zip entry/);
    assert.equal(text(await z.bytes(z.entries[1])),"bee","the other entries still read");
  });
  test("an unsupported compression method is named",async()=>{
    const z=await openZip(zip([{name:"a.xml",data:B("x"),method:14,raw:B("lzma?")}]));
    await assert.rejects(z.bytes(z.entries[0]),/unsupported zip compression/);
  });
  test("deflated data that is garbage or cut short rejects instead of hanging",async()=>{
    const b=await blobBytes(good());
    for(let i=60;i<120;i++)b[i]^=0x5A;
    const z=await openZip(new Blob([b]));
    await assert.rejects(z.bytes(z.entries[0]));
  });
  test("a .gz inside that is damaged rejects when read",async()=>{
    const gz=zlib.gzipSync(Buffer.from(Array.from({length:3000},(_,i)=>(i*7919)%251)));
    const bad=Buffer.from(gz);bad.fill(7,20,60);
    let err=null;
    await walkZip(zip([{name:"activities/1.gpx.gz",data:bad}]),async en=>{try{await en.read();}catch(e){err=e;}});
    assert.ok(err instanceof Error);
  });
});

describe("walking an archive",()=>{
  test("zips inside zips are opened two levels deep; a third level is handed over as a file",async()=>{
    const c=await blobBytes(zip([{name:"deepest.fit",data:B("3")}]));
    const b=await blobBytes(zip([{name:"two.fit",data:B("2")},{name:"c.zip",data:c}]));
    const a=await blobBytes(zip([{name:"one.fit",data:B("1")},{name:"b.zip",data:b,method:8}]));
    const outer=zip([{name:"top.fit",data:B("0")},{name:"DI_CONNECT/a.zip",data:a}]);
    const seen=await readAll(outer);
    assert.deepEqual(Object.keys(seen),["top.fit","one.fit","two.fit","c.zip"]);
    assert.equal(seen["two.fit"],"2");
  });
  test("gzip layers are removed on read, and the stream gives the raw bytes",async()=>{
    const gz=zlib.gzipSync(B("<gpx>hello</gpx>"));
    const out={};
    await walkZip(zip([{name:"activities/9.gpx.gz",data:gz,method:8},{name:"plain.txt",data:B("p")}]),async en=>{
      out[en.name]={read:text(await en.read()),raw:new Uint8Array(await new Response(await en.stream()).arrayBuffer()),size:en.size};});
    assert.equal(out["activities/9.gpx.gz"].read,"<gpx>hello</gpx>");
    assert.ok(isGzip(out["activities/9.gpx.gz"].raw));
    assert.equal(out["activities/9.gpx.gz"].size,gz.length);
    assert.equal(out["plain.txt"].read,"p");
  });
  test("a visitor that answers false stops the walk",async()=>{
    const names=[];
    const r=await walkZip(zip([{name:"a",data:B("1")},{name:"b",data:B("2")},{name:"c",data:B("3")}]),en=>{names.push(en.name);return en.name==="b"?false:undefined;});
    assert.deepEqual(names,["a","b"]);assert.equal(r,false);
  });
  test("magic numbers: zip and gzip are told from text and from too-short input",async()=>{
    assert.equal(isZip(Uint8Array.from([0x50,0x4b,3,4,0])),true);
    assert.equal(isZip(Uint8Array.from([0x50,0x4b,5,6])),false,"an empty zip's end record is not a zip to read");
    assert.equal(isZip(Uint8Array.from([0x50,0x4b,3])),false);
    assert.equal(isGzip(Uint8Array.from([0x1f,0x8b,8])),true);
    assert.equal(isGzip(Uint8Array.from([0x1f,0x8b])),false);
    assert.equal(isGzip(new TextEncoder().encode("Date,Exercise")),false);
    assert.equal(text(await gunzip(zlib.gzipSync(B("ok")))),"ok");
    await assert.rejects(gunzip(Uint8Array.from([0x1f,0x8b,8,0,1,2,3])));
  });
});

describe("the app's own zip",()=>{
  test("what zipFiles writes, this reader (and any CRC check) opens byte for byte",async()=>{
    const bin=Uint8Array.from({length:3000},(_,i)=>(i*31)&255);
    const files=[["README.txt","KingsKiln export\n"],["runs/2026-03-02_run.gpx","<gpx>é ü 🏃</gpx>"],["lifting/day.fit",bin],["empty.csv",""]];
    const blob=zipFiles(files);
    const z=await openZip(blob),raw=await blobBytes(blob);
    assert.deepEqual(z.entries.map(e=>e.name),files.map(f=>f[0]));
    for(const [i,en] of z.entries.entries()){
      const want=typeof files[i][1]==="string"?new TextEncoder().encode(files[i][1]):files[i][1];
      const got=await z.bytes(en);
      assert.deepEqual([...got],[...want],en.name);
      const crc=new DataView(raw.buffer).getUint32(en.off+14,true);
      assert.equal(crc,zlib.crc32(want),en.name+" CRC");
    }
  });
});
