// The scanner at the size the app reads photos (the long side shrunk to 2000 pixels), on a
// busy two-page day: it must read right and finish quickly enough to feel instant on a phone.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {readSheet,setsFromMarks} from "../js/sheet.js";
import {PAPER,loadSheet,printSheet,markSheet,photograph} from "./helpers/camera.js";
import {fillIn,fmt} from "./helpers/scan.js";

// A laptop's budget; a phone is a few times slower.
const BUDGET_MS=2500;
describe("reading a full-size photo",()=>{
  for(const [key,page,W,H] of [["en-big",0,1500,2000],["en-big",1,2000,1500],["en-strongman-lb",0,1500,2000]])
    test(key+" page "+(page+1)+" from a "+W+" × "+H+" photo",()=>{
      const sheet=printSheet(loadSheet(key,page),PAPER.A4,{ppm:8}),plan=fillIn(sheet,41+page);markSheet(sheet,plan.marks,5);
      const ph=photograph(sheet,{W,H,seed:3,fill:0.85,rot:W>H?92:-6,pitch:0.08,noise:0.02,light:{base:0.9,grad:[0.2,0.1]}});
      const t=performance.now(),read=readSheet(ph.gray,ph.w,ph.h,sheet.rows,sheet.code),ms=performance.now()-t;
      assert.ok(!read.error,read.error);
      assert.equal(fmt(setsFromMarks(sheet.rows,read,2.5)),plan.want);
      assert.ok(ms<BUDGET_MS,"took "+Math.round(ms)+" ms");
    });
  test("a photo with no sheet in it is refused quickly",()=>{
    const W=1500,H=2000,g=new Float32Array(W*H);for(let i=0;i<g.length;i++)g[i]=0.5+0.3*Math.sin(i*0.37)*Math.cos(i*0.011);
    const t=performance.now(),r=readSheet(g,W,H,null,new Set([1,2,3]));assert.ok(r.error);assert.ok(performance.now()-t<BUDGET_MS);
  });
});
