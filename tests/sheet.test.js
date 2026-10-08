// The printed sheet's layout, and what its marks mean, without a camera: pages, the choices
// printed either side of a plan, where every circle sits, the SVG itself, and the sets.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {sheetPages,sheetRows,sheetSVG,markSpots,repAmounts,kgAmounts,tableCols,textWidth,codeBits,idCode,pageCode,homography,setsFromMarks,TABLE,COL} from "../js/sheet.js";
import {WORKOUTS,printable} from "./fixtures/workouts.js";

const ex=(name,sets,o)=>Object.assign({name,sets:sets.map(([r,w])=>({r,w})),step:2.5,unit:"kg"},o||{});
const sess=list=>({id:"t-"+list.map(e=>e.name).join(""),title:"T",ex:list.map(e=>({name:e.name,sets:[]}))});

describe("pages",()=>{
  test("a heading for each exercise, then a row per planned set",()=>{
    const list=[ex("Squats",[[5,100],[5,100]]),ex("Bench press",[[8,80]])],p=sheetPages(sess(list),list);
    assert.equal(p.length,1);assert.deepEqual(p[0].rows.map(r=>r.kind),["ex","set","set","ex","set"]);
  });
  test("rows run down the page without overlapping, and the notes box takes what's left",()=>{
    WORKOUTS.forEach(w=>{const {session,exs,opts}=printable(w);sheetPages(session,exs,opts).forEach(pg=>{
      let y=TABLE.top-1e-9;pg.rows.forEach(r=>{assert.ok(r.y>=y-1e-9,w.key+": rows overlap");y=r.y+r.h;});
      assert.ok(pg.notes.y>=y&&pg.notes.y+pg.notes.h<=TABLE.foot+1e-9&&pg.notes.h>=TABLE.notesMin,w.key+": notes box");});});
  });
  test("an exercise that doesn't fit what's left of a page starts the next",()=>{
    const list=Array.from({length:7},(_,i)=>ex("E"+i,[[10,40],[10,40],[10,40],[10,40]]));const p=sheetPages(sess(list),list);
    assert.ok(p.length>=2);const names=p.map(pg=>pg.rows.filter(r=>r.kind==="ex").map(r=>r.name));
    assert.equal(new Set(names.flat()).size,7,"each exercise once");
  });
  test("every page has its own code; page 1's is the session's",()=>{
    const list=Array.from({length:12},(_,i)=>ex("E"+i,[[10,40],[10,40],[10,40]])),s=sess(list),p=sheetPages(s,list);
    assert.equal(p[0].code,idCode(s.id));assert.equal(p[1].code,pageCode(s.id,1));assert.equal(new Set(p.map(x=>x.code)).size,p.length);
  });
  test("large print: taller rows, fewer to a page",()=>{
    const list=Array.from({length:6},(_,i)=>ex("E"+i,[[10,40],[10,40],[10,40]])),s=sess(list);
    const n=sheetPages(s,list),l=sheetPages(s,list,{large:true});
    assert.ok(l[0].rows.find(r=>r.kind==="set").h>n[0].rows.find(r=>r.kind==="set").h);assert.ok(l.length>=n.length);
  });
  test("a bare plan of {name: sets} still prints, blanks for exercises with nothing planned",()=>{
    const s={id:"b",ex:[{name:"Squats",sets:[]},{name:"New one",sets:[]}]},rows=sheetRows(s,{Squats:[{r:5,w:60}]});
    assert.deepEqual(rows.filter(r=>r.kind==="set").map(r=>r.ex+(r.blank?" blank":"")),["Squats","New one blank","New one blank","New one blank"]);
  });
});

describe("the choices either side of the plan",()=>{
  test("reps: minus or plus one to five",()=>{assert.deepEqual(repAmounts(8,"reps",5),[1,2,3,4,5]);});
  test("time and distance count in seconds and metres",()=>{assert.deepEqual(repAmounts(60,"secs",5),[5,10,15,20,30]);assert.deepEqual(repAmounts(40,"m",4),[5,10,15,20]);});
  test("weight: the exercise's own jump, times one to six",()=>{assert.deepEqual(kgAmounts(100,2.5,6),[2.5,5,7.5,10,12.5,15]);assert.deepEqual(kgAmounts(16,2,6),[2,4,6,8,10,12]);assert.deepEqual(kgAmounts(185,5,4),[5,10,15,20]);});
  test("nothing to change for a set with no plan, nor weight for bodyweight or a band",()=>{
    assert.deepEqual(repAmounts(0,"reps",5),[]);assert.deepEqual(kgAmounts(0,2.5,6),[]);
    const s=sheetPages(sess([ex("Band pull-apart",[[25,0]],{band:true})]),[ex("Band pull-apart",[[25,0]],{band:true})])[0].rows[1];
    assert.deepEqual(s.kg,[]);
  });
});

describe("where the marks are",()=>{
  const list=[ex("Squats",[[5,102.5],[5,102.5]]),ex("Plank",[[60,0]],{mode:"secs"})],rows=sheetPages(sess(list),list)[0].rows,spots=markSpots(rows);
  test("each set row: a done box, minus and plus, and amounts, for reps and for weight",()=>{
    const m=spots[0];assert.deepEqual(m.groups.map(g=>g.k),["repsSign","repsAmt","kgSign","kgAmt"]);
    assert.deepEqual(m.groups[0].pts.map(p=>p.v),[-1,1]);assert.deepEqual(m.groups[3].pts.map(p=>p.v),[2.5,5,7.5,10,12.5,15]);
  });
  test("every circle sits inside its column, clear of its neighbours, on its row's middle",()=>{
    const X=tableCols(TABLE.normal);
    spots.forEach(m=>m.groups.forEach(g=>{const col=g.k.startsWith("reps")?X.reps:X.kg;
      g.pts.forEach((p,i)=>{assert.ok(p.x-g.r>col[0]+0.5&&p.x+g.r<col[1]-0.5,g.k+" "+p.v+" outside its column");assert.equal(p.y,m.y);
        if(i)assert.ok(p.x-g.pts[i-1].x>=2*g.r+1.5,"circles too close");});}));
  });
  test("a hold has no weight circles; the done box sits in its column",()=>{
    const m=spots[2],X=tableCols(TABLE.normal);assert.deepEqual(m.groups.map(g=>g.k),["repsSign","repsAmt"]);
    assert.ok(m.done[0]-m.box/2>X.done[0]&&m.done[0]+m.box/2<X.done[1]);
  });
  test("the first layout's rows still have their circles where they were printed",()=>{
    const old=[{kind:"ex",name:"Squats"},{kind:"set",ex:"Squats",i:0,r:5,w:100}],m=markSpots(old)[0];
    assert.ok(m.legacy);assert.deepEqual(m.groups.map(g=>g.k),["tens","ones","adj"]);assert.equal(m.groups[1].pts[0].x,COL.ones);
  });
});

describe("the printed page",()=>{
  test("every workout prints without a stray undefined or NaN",()=>{
    WORKOUTS.forEach(w=>{const {session,exs,opts}=printable(w);sheetPages(session,exs,opts).forEach(pg=>{const svg=sheetSVG(session,pg,opts);
      assert.ok(!/undefined|NaN/.test(svg),w.key+" page "+(pg.page+1));assert.ok(svg.startsWith("<svg")&&svg.endsWith("</svg>"));});});
  });
  test("the plan says its unit, per hand for dumbbells",()=>{
    const list=[ex("Curls",[[10,14]],{hand:true}),ex("Log press",[[3,185]],{unit:"lb",step:5})],s=sess(list),svg=sheetSVG(s,sheetPages(s,list)[0],{});
    assert.ok(/ kg each</.test(svg)&&/ lb</.test(svg)&&/>LB</.test(svg));
  });
  test("two pages: page numbers, and the first says it carries on",()=>{
    const list=Array.from({length:12},(_,i)=>ex("E"+i,[[10,40],[10,40],[10,40]])),s=sess(list),p=sheetPages(s,list);
    const a=sheetSVG(s,p[0],{date:"Thursday"}),b=sheetSVG(s,p[1],{});
    assert.ok(a.includes("Page 1 of "+p.length)&&a.includes("continued on page 2")&&b.includes("Page 2 of "+p.length));
  });
  test("names with & < > and quotes are printed safely",()=>{
    const list=[ex("Curl & press <heavy> \"x\" 'y'",[[5,20]])],s=Object.assign(sess(list),{title:"A & B"}),svg=sheetSVG(s,sheetPages(s,list)[0],{});
    assert.ok(svg.includes("Curl &amp; press &lt;heavy&gt; &quot;x&quot; &#39;y&#39;")&&svg.includes("A &amp; B"));
  });
  test("text widths: wide scripts take more room than Latin",()=>{assert.ok(textWidth("杠铃卧推",4)>textWidth("Bench",4));});
  test("the code is 24 squares, black at both ends, stable for an id",()=>{
    const b=codeBits("abc");assert.equal(b.length,24);assert.equal(b[0],1);assert.equal(b[23],1);
    assert.equal(idCode("abc"),idCode("abc"));assert.notEqual(idCode("abc"),idCode("abd"));
  });
});

describe("homography",()=>{
  test("maps the four corners exactly",()=>{
    const src=[[0,0],[10,0],[0,10],[10,10]],dst=[[100,100],[300,120],[90,330],[310,300]],m=homography(src,dst);
    src.forEach((p,i)=>{const q=m(...p);assert.ok(Math.abs(q[0]-dst[i][0])<1e-6&&Math.abs(q[1]-dst[i][1])<1e-6);});
  });
});

describe("what the marks mean",()=>{
  const list=[ex("Squats",[[5,100],[5,100],[5,100],[5,100],[5,100]]),ex("New",[[0,0]])],rows=sheetPages(sess(list),list)[0].rows;
  const r=(row,o)=>Object.assign({row,done:false,reps:null,kg:null,adj:0,unsure:false,note:false},o);
  const sets=setsFromMarks(rows,{rows:[r(1,{done:true}),r(2,{reps:4,kg:97.5}),r(3,{note:true,done:true}),r(4,{note:true}),r(5,{}),r(7,{note:true})]},2.5);
  test("a tick is the plan; a change is its new numbers",()=>{assert.deepEqual(sets.Squats.slice(0,2).map(x=>x.r+"@"+x.w+(x.changed?"*":"")),["5@100","4@97.5*"]);});
  test("writing with a tick is kept; writing alone is offered unticked; nothing is nothing",()=>{
    assert.equal(sets.Squats.length,4);assert.equal(sets.Squats[2].maybe,false);assert.equal(sets.Squats[3].maybe,true);
  });
  test("a new exercise's written row asks for its numbers",()=>{const x=sets.New[0];assert.ok(x.ask&&x.unsure&&x.maybe);});
  test("the first layout's weight jumps use the step given",()=>{
    const old=[{kind:"ex",name:"Squats"},{kind:"set",ex:"Squats",i:0,r:5,w:100}];
    assert.deepEqual(setsFromMarks(old,{rows:[r(1,{done:true,adj:-1})]},2.5).Squats.map(x=>x.w),[97.5]);
  });
});
