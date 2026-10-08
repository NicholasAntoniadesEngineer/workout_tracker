// Every real workout in tests/fixtures/workouts.js (sixteen languages and scripts, kg and lb,
// normal and large print, timed, distance, bands, unplanned new exercises, two-page days)
// printed by the app's own layout, filled in, photographed and read back.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {readSheet,setsFromMarks,sheetPages,sheetSVG,pageCode,markSpots,tableCols,TABLE} from "../js/sheet.js";
import {PAPER,MANIFEST,loadSheet,loadLegacy,printSheet,markSheet,photograph} from "./helpers/camera.js";
import {readsRight,shoot,fmt} from "./helpers/scan.js";
import {WORKOUTS,printable} from "./fixtures/workouts.js";
import {svgHash} from "./fixtures/hash.js";

const HANDS=new Set(Object.keys(MANIFEST.hands));
const handFor=lang=>{const k=lang.slice(0,2);return HANDS.has(k)?k:"en";};

describe("the drawn sheets match the layout",()=>{
  test("every page's picture was drawn from today's sheetSVG (else run npm run fixtures)",()=>{
    WORKOUTS.forEach(w=>{const p=printable(w),pages=sheetPages(p.session,p.exs,p.opts);
      assert.equal(MANIFEST.sheets[w.key].length,pages.length,w.key+": pages");
      pages.forEach((pg,i)=>assert.equal(MANIFEST.sheets[w.key][i].hash,svgHash(sheetSVG(p.session,pg,p.opts)),w.key+" page "+(i+1)+" changed: run npm run fixtures"));});
  });
});

describe("text never runs into the boxes",()=>{
  // On the printed pixels: nothing between the plan's divider and the first circle, nothing past
  // the right margin, nothing written over a done box.
  const ink=(img,x0,y0,x1,y1)=>{let n=0;for(let y=Math.round(y0*img.ppm);y<Math.round(y1*img.ppm);y++)for(let x=Math.round(x0*img.ppm);x<Math.round(x1*img.ppm);x++)if(img.a[y*img.w+x]<0.75)n++;return n;};
  for(const w of WORKOUTS)MANIFEST.sheets[w.key].forEach((_,pi)=>test(w.key+" page "+(pi+1),()=>{
    const s=loadSheet(w.key,pi),L=s.page.large?TABLE.large:TABLE.normal,X=tableCols(L),spots={};markSpots(s.rows).forEach(m=>{spots[m.row]=m;});
    s.rows.forEach((r,ri)=>{
      if(r.kind==="set"){const m=spots[ri],first=m.groups.length?m.groups[0].pts[0].x-L.r-0.4:X.reps[1]-2;
        assert.equal(ink(s.img,X.plan[1]+0.45,r.y+1.2,first,r.y+r.h-1.2),0,"plan text runs past its column: "+r.ex+" set "+(r.i+1));
        assert.equal(ink(s.img,X.plan[0]+0.45,r.y+0.6,X.plan[1]-0.45,r.y+1),0,"plan text too tall for its row: "+r.ex+" set "+(r.i+1));}
      assert.equal(ink(s.img,198.8,r.y+0.5,206,r.y+r.h-0.5),0,"past the right margin: "+(r.name||r.ex));
    });
  }));
});

describe("every workout and page, on A4 and A5",()=>{
  WORKOUTS.forEach((w,wi)=>MANIFEST.sheets[w.key].forEach((_,pi)=>{
    test(w.key+" page "+(pi+1)+" · A4, notes in "+handFor(w.lang),()=>readsRight(w.key,pi,"A4",{fill:0.86,rot:(wi%5-2)*3,light:{base:0.9,grad:[0.2,-0.15]}},{seed:100+wi*10+pi,notes:handFor(w.lang)}));
    test(w.key+" page "+(pi+1)+" · A5",()=>readsRight(w.key,pi,"A5",{fill:0.88,rot:(wi%3-1)*4,pitch:0.06},{seed:200+wi*10+pi}));
  }));
  for(const k of ["en-lower","ar-chest","ko-back","en-strongman-lb"])test(k+" · Letter",()=>readsRight(k,0,"Letter",{fill:0.86},{seed:300}));
});

describe("pages of the same day",()=>{
  test("each page has its own code, and a photo says which page it is",()=>{
    const s=loadSheet("en-big",0),codes=s.pages.map(p=>p.code);
    assert.equal(new Set(codes).size,codes.length);
    assert.equal(codes[1],pageCode(s.session.id,1));
    const r=shoot("en-big",1,"A4",{fill:0.85},{codes:new Set([123,...codes])});
    assert.equal(r.read.code,codes[1]);
  });
  test("an exercise is never split when it fits on the next page",()=>{
    WORKOUTS.forEach(w=>{const p=printable(w),pages=sheetPages(p.session,p.exs,p.opts),seen={};
      pages.forEach((pg,i)=>pg.rows.filter(r=>r.kind==="ex").forEach(r=>{assert.ok(!(r.name in seen)||r.cont,w.key+": "+r.name+" on two pages");seen[r.name]=i;}));
      assert.deepEqual(Object.keys(seen).sort(),p.session.ex.map(e=>e.name).sort(),w.key+": an exercise went missing");});
  });
  test("every planned set is on a page, however long the workout",()=>{
    const ex=Array.from({length:14},(_,i)=>({name:"Exercise "+(i+1),sets:Array.from({length:5},()=>({r:10,w:40}))}));
    const pages=sheetPages({id:"long",ex:ex.map(e=>({name:e.name,sets:[]}))},ex);
    assert.ok(pages.length>=3);
    const sets=pages.flatMap(p=>p.rows.filter(r=>r.kind==="set"));
    assert.equal(sets.length,14*5);
    pages.forEach(p=>{const last=p.rows[p.rows.length-1];assert.ok(last.y+last.h<=TABLE.foot-TABLE.notesMin,"rows run into the notes");assert.ok(p.notes.h>=TABLE.notesMin);});
  });
  test("one exercise of thirty sets runs onto a second page, marked continued",()=>{
    const ex=[{name:"Squats",sets:Array.from({length:30},()=>({r:5,w:60}))}];
    const pages=sheetPages({id:"thirty",ex:[{name:"Squats",sets:[]}]},ex);
    assert.equal(pages.length,2);assert.ok(pages[1].rows[0].cont);
    assert.equal(pages.flatMap(p=>p.rows.filter(r=>r.kind==="set")).length,30);
  });
});

describe("sheets printed before pages",()=>{
  // The first layout, as printed on 8 October, still reads.
  const L=loadLegacy();
  const MARKS=[{row:1,kind:"tick"},{row:2,kind:"tick"},{row:3,kind:"fill",group:"ones",i:4},{row:3,kind:"fill",group:"adj",i:1},
    {row:6,kind:"tick"},{row:7,kind:"tick"},{row:8,kind:"fill",group:"tens",i:1},{row:8,kind:"fill",group:"ones",i:0},
    {row:11,kind:"tick"},{row:13,kind:"fill",group:"tens",i:1},{row:13,kind:"fill",group:"ones",i:1},{row:13,kind:"fill",group:"adj",i:1}];
  const WANT="Squats:5@100,5@100,4@97.5|Barbell row:8@70,8@70,10@70|Bicep curls:10@14,11@11.5";
  for(const [paper,cam] of [["A4",{fill:0.85}],["A4",{fill:0.6,rot:20,pitch:0.15}],["A5",{fill:0.85}],["Letter",{fill:0.85,light:{base:0.6}}]])
    test(paper+" "+JSON.stringify(cam),()=>readsRight(L,0,paper,cam,{marks:MARKS,want:WANT}));
  test("an old tens circle filled alone is unclear, not a guess",()=>{
    const r=shoot(L,0,"A4",{fill:0.85},{marks:[{row:1,kind:"fill",group:"tens",i:1}],want:""});
    assert.equal(r.read.rows[0].reps,null);assert.equal(r.read.rows[0].unsure,true);
  });
});
