// Reading filled sheets from photos taken the way people take them: near and far, anywhere in
// the frame, turned and tilted, in good and bad light, on any table, with phone cameras of
// every quality, from paper that's been curled, folded or printed with low toner, and the
// photos it must refuse rather than guess from.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {readSheet} from "../js/sheet.js";
import {PAPER,loadSheet,printSheet,placePaper,photograph,rng} from "./helpers/camera.js";
import {readsRight,shoot,neverWrong} from "./helpers/scan.js";

// A normal page (rows of 7.6 mm), a tight one (7.0 mm), Japanese, and large print in lb with
// distance rows: each condition runs on one of them in turn.
const SHEETS=[["en-lower",0],["de-pull",0],["ja-legs",0],["en-strongman-lb",0],["es-legs",0]];
let turn=0;const next=()=>SHEETS[(turn++)%SHEETS.length];
const run=(name,paper,cam,o)=>{const [k,p]=next();test(name+" · "+k,()=>readsRight(k,p,paper,cam,o));};
const wide={W:1400,H:1050};

describe("paper sizes and distances",()=>{
  for(const [paper,fills] of [["A4",[0.97,0.85,0.7,0.55,0.45]],["A5",[0.97,0.8,0.65,0.58]],["Letter",[0.95,0.75,0.55]],["A4margins",[0.9,0.6]]])
    for(const fill of fills)run(paper+" filling "+Math.round(fill*100)+"% of the frame",paper,{fill});
  for(const k of ["en-lower","ja-legs"])test(k+" · A4 from a small 900 × 1200 photo",()=>readsRight(k,0,"A4",{W:900,H:1200,fill:0.9}));
  test("A5 from a large 1500 × 2000 photo, far away",()=>readsRight("de-pull",0,"A5",{W:1500,H:2000,fill:0.42}));
  test("large print on A5, far away",()=>readsRight("en-strongman-lb",0,"A5",{fill:0.6}));
  test("too far away: refuses with 'far', never guesses",()=>{
    for(const [paper,fill] of [["A4",0.28],["A5",0.3],["Letter",0.28]]){const {read}=shoot("en-lower",0,paper,{fill});assert.equal(read.error,"far",paper+" "+fill);}
  });
});

describe("where the sheet sits in the photo",()=>{
  for(const [dx,dy] of [[-0.15,0],[0.15,0],[0,-0.12],[0,0.12],[-0.14,-0.1],[0.14,0.1]])run("off centre by "+dx+", "+dy,"A4",{fill:0.6,dx,dy});
  run("paper running off the edge of the frame, corner squares still in","A4",{fill:1.02});
  run("A5 in a corner of the frame","A5",{fill:0.6,dx:-0.16,dy:-0.16});
});

describe("angles",()=>{
  for(const rot of [-45,-30,-15,-5,5,15,30,45,135,-150])run("turned "+rot+"°","A4",{fill:0.6,rot});
  run("sideways, 90°","A4",Object.assign({fill:0.9,rot:90},wide));
  run("sideways, 270°","A4",Object.assign({fill:0.9,rot:270},wide));
  run("upside down","A4",{fill:0.85,rot:180});
  for(const pitch of [0.1,0.2,0.3])run("camera leaning back, pitch "+pitch,"A4",{fill:0.8,pitch});
  for(const yaw of [-0.2,0.1,0.2])run("camera off to one side, yaw "+yaw,"A4",{fill:0.75,yaw});
  run("tilted, turned and off to the side at once","A4",{fill:0.6,rot:-20,pitch:0.18,yaw:0.12});
  run("A5 tilted and turned","A5",{fill:0.66,rot:25,pitch:0.15});
  run("Letter sideways and tilted","Letter",Object.assign({fill:0.85,rot:90,pitch:0.12},wide));
});

describe("light",()=>{
  const cases={
    "a dim room":{base:0.45},"a very dim room":{base:0.3},"over-exposed":{base:1.35},
    "light falling off across the page":{grad:[0.8,0.6]},"a dark corner":{grad:[-0.9,0.9]},
    "a strong vignette":{vignette:0.6},

    "a soft shadow from a hand":{shadow:{x0:300,y0:0,x1:900,y1:1400,depth:0.5,soft:120}},
    "a shadow over a corner square":{shadow:{x0:0,y0:300,x1:400,y1:0,depth:0.65,soft:30}},
    "a phone's shadow down the middle":{shadow:{x0:560,y0:0,x1:540,y1:1400,depth:0.55,soft:10}},
    "glare from a lamp":{glare:{x:600,y:600,r:350,amount:0.45}},
    "glare on a corner square":{glare:{x:150,y:150,r:200,amount:0.5}},
    "dim with a shadow":{base:0.5,shadow:{x0:0,y0:700,x1:1050,y1:700,depth:0.5,soft:50}},
  };
  for(const [name,light] of Object.entries(cases))run(name,"A4",{fill:0.8,light});
  // A crisp shadow edge cutting through a circle off its centre looks, pixel for pixel, like a
  // faint mark: the reader may ask about that set, but never reads it wrong.
  test("a hard-edged shadow across the rows: right, or a set or two asked about, never wrong",()=>{
    for(const [k,sh] of [["en-lower",{x0:0,y0:900,x1:1050,y1:300,depth:0.6,soft:20}],["de-pull",{x0:0,y0:400,x1:1050,y1:1000,depth:0.55,soft:12}],["ja-legs",{x0:500,y0:0,x1:600,y1:1400,depth:0.6,soft:15}]]){
      const r=shoot(k,0,"A4",{fill:0.8,light:{shadow:sh}}),v=neverWrong(r);assert.ok(!v.startsWith("wrong"),k+": "+v);
      assert.ok(r.read.error||r.read.rows.filter(x=>x.unsure).length<=2,k+": too many asked");}
  });
  run("A5 in a dim room with a shadow","A5",{fill:0.75,light:{base:0.5,shadow:{x0:0,y0:800,x1:1050,y1:500,depth:0.45,soft:40}}});
  run("washed-out contrast (gamma 0.55)","A4",{fill:0.8,gamma:0.55});
  run("crushed shadows (gamma 1.8)","A4",{fill:0.8,gamma:1.8});
});

describe("the camera",()=>{
  for(const noise of [0.03,0.06,0.09])run("sensor noise "+noise,"A4",{fill:0.8,noise});
  for(const blur of [1,2,3])run("out of focus, blur "+blur,"A4",{fill:0.8,blur});
  for(const len of [4,8])run("a shaky hand, motion blur "+len+" px","A4",{fill:0.8,motion:{len,angle:30}});
  for(const q of [70,40,20])run("JPEG quality "+q,"A4",{fill:0.8,jpeg:q});
  run("banding from heavy compression","A4",{fill:0.8,levels:12});
  // Phones straighten their own lens; what's left is a few per cent at the corners of the frame.
  for(const barrel of [0.02,0.04,0.05,-0.03,-0.05])run("lens distortion "+barrel,"A4",{fill:0.85,barrel});
  test("strong lens distortion (7%): right, flagged or refused, never wrong",()=>{
    for(const [k,barrel] of [["es-legs",0.07],["de-pull",-0.07],["ja-legs",0.07]]){const v=neverWrong(shoot(k,0,"A4",{fill:0.85,barrel}));assert.ok(!v.startsWith("wrong"),k+" "+barrel+": "+v);}
  });
  run("everything at once: dim, noisy, blurred, tilted, compressed","A4",{fill:0.7,noise:0.05,blur:2,rot:12,pitch:0.12,jpeg:50,light:{base:0.55,grad:[0.4,0.3]}});
  run("A5 far, noisy and blurred","A5",{fill:0.65,noise:0.04,blur:1});
});

describe("what the sheet is lying on",()=>{
  run("a white desk","A4",{fill:0.8,bg:0.92});
  run("a black table","A4",{fill:0.8,bg:0.04});
  run("a checked tablecloth","A4",{fill:0.75,bg:0.5,bgTexture:0.25});
  run("a phone on the table by a corner","A4",{fill:0.75,clutter:[{x:880,y:30,w:160,h:240,v:0.05}]});
  run("a pen across the margin","A4",{fill:0.75,clutter:[{x:120,y:640,w:30,h:520,v:0.08}]});
  run("black squares on the table that look like corner squares","A4",{fill:0.7,clutter:[{x:20,y:20,w:60,h:60,v:0.03},{x:960,y:1300,w:70,h:70,v:0.03},{x:980,y:600,w:55,h:55,v:0.03}]});
  run("a gym bench: dark, textured","A4",{fill:0.82,bg:0.12,bgTexture:0.06,noise:0.03});
});

describe("the paper itself",()=>{
  for(const curl of [0.5,1,1.5])run("curled "+curl+" mm out of flat","A4",{fill:0.85,curl});
  run("folded in three, flattened","A4",{fill:0.85,folds:[1/3,2/3],curl:0.6});
  run("folded in half, a crease across the rows","A4",{fill:0.85,folds:[0.5]});
  run("A5 folded in half","A5",{fill:0.85,folds:[0.5]});
  run("printer running low on toner","A4",{fill:0.85},{print:{toner:0.55}});
  run("cream paper","A4",{fill:0.85},{print:{paperV:0.86}});
  run("grey recycled paper in a dim room","A4",{fill:0.85,light:{base:0.6}},{print:{paperV:0.78,inkV:0.12}});
});

describe("refusing rather than guessing",()=>{
  test("a photo with no sheet in it",()=>{
    const R=rng(9),W=900,H=1200,g=new Float32Array(W*H);for(let i=0;i<W*H;i++)g[i]=0.4+R()*0.3;
    for(let k=0;k<30;k++){const x=(R()*W)|0,y=(R()*H)|0,s=10+(R()*40|0);for(let yy=y;yy<Math.min(H,y+s);yy++)for(let xx=x;xx<Math.min(W,x+s);xx++)g[yy*W+xx]=0.05;}
    assert.ok(readSheet(g,W,H,null,new Set([1,2,3])).error);
  });
  test("a thumb over a corner square",()=>{
    const [x,y]=placePaper(PAPER.A4,{W:1050,H:1400,fill:0.85})[0];
    const {read}=shoot("en-lower",0,"A4",{fill:0.85,clutter:[{x:x+10,y:y+15,w:120,h:110,v:0.55}]});
    assert.ok(read.error,"should not read with a corner hidden");
  });
  test("the bottom of the page cut off",()=>{const {read}=shoot("en-lower",0,"A4",{fill:0.85,dy:0.18});assert.ok(read.error);});
  test("a corner square out of the frame, the page turned and tilted",()=>{
    for(const [k,paper,cam] of [["de-pull","A4",{fill:0.7,rot:-20,pitch:0.18,yaw:0.12,dx:0.05}],["ja-legs","A5",{fill:0.78,rot:25,pitch:0.15}],["en-lower","A4",{fill:0.9,dx:0.16}]]){
      const {read}=shoot(k,0,paper,cam);assert.ok(read.error,k+" "+JSON.stringify(cam)+" should refuse");}
  });
  test("a corner square partly out of the frame: right, or refused, never wrong",()=>{
    for(const dx of [0.1,0.12,0.13]){const r=shoot("en-lower",0,"A4",{fill:0.9,dx});const v=neverWrong(r);assert.ok(v==="right"||v==="refused"||v==="flagged",dx+": "+v);}
  });
  test("a sheet from another workout says no match, with the code it found",()=>{
    const {read,sheet}=shoot("en-lower",0,"A4",{fill:0.85},{codes:new Set([12345])});
    assert.equal(read.error,"nomatch");assert.equal(read.code,sheet.code);
  });
  test("finding which of many printed sheets it is",()=>{
    const s=loadSheet("ru-back",0),{read}=shoot("ru-back",0,"A4",{fill:0.85},{codes:new Set([1,2,3,s.code,99,1234])});
    assert.equal(read.code,s.code);
  });
});
