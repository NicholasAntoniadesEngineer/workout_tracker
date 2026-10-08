// How people mark a sheet: ticks of every kind, minus or plus crossed, ticked or filled, amounts
// in pencil or pen, light or heavy, off centre or spilling; second thoughts (a smudge, both signs,
// two amounts), a row struck out, a note written, numbers scribbled beside the plan. Then every
// amount either way, and a random sweep that must never come back with a wrong number.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {readSheet,setsFromMarks,markSpots} from "../js/sheet.js";
import {PAPER,loadSheet,printSheet,markSheet,photograph,placePaper,rng} from "./helpers/camera.js";
import {readsRight,shoot,fmt,fillIn,neverWrong,changeMarks} from "./helpers/scan.js";
import {WORKOUTS} from "./fixtures/workouts.js";

const cam={fill:0.82,rot:4,light:{base:0.9,grad:[0.2,-0.1]}};
// Rows of en-lower page 1: 0 Back squat heading, 1–3 its sets; 4 Romanian deadlift, 5–7; 8 Bulgarian split squat, 9–11; 12 leg curl, 13–15.
const S=loadSheet("en-lower",0),spot=ri=>markSpots(S.rows).find(m=>m.row===ri);
const one=(marks,o)=>shoot("en-lower",0,"A4",Object.assign({},cam,o&&o.cam),{marks,want:""});
const rowOf=(r,ri)=>r.read.rows.find(x=>x.row===ri);

describe("ticking the done box",()=>{
  const styles={"a tick":{},"a cross":{style:"cross"},"a slash":{style:"slash"},"a dot":{style:"dot"},"a scribble":{style:"scribble"},
    "a thin pen":{lw:0.35},"light pencil":{v:0.5},"a heavy marker":{lw:1.4,v:0.05},"a big tick spilling out of the box":{big:1.5},"off centre":{jitter:0.9}};
  for(const [name,o] of Object.entries(styles))test(name,()=>readsRight("en-lower",0,"A4",cam,{tick:o.style,style:m=>m.kind==="tick"?Object.assign({},m,o):m,seed:21}));
  test("an empty box isn't done",()=>{const r=one([]);assert.ok(r.read.rows.every(x=>!x.done&&!x.unsure&&!x.note));});
});

describe("marking minus or plus",()=>{
  for(const sign of ["cross","fill","check"])test("by "+(sign==="fill"?"filling":sign==="check"?"ticking":"crossing")+" the sign",()=>readsRight("de-pull",0,"A4",cam,{sign,seed:31}));
  test("a sign crossed lightly in pencil",()=>readsRight("es-legs",0,"A4",cam,{sign:"cross",style:m=>m.kind==="cross"?Object.assign({},m,{v:0.45,lw:0.45}):m,seed:32}));
  test("a sign crossed off centre",()=>readsRight("ja-legs",0,"A4",cam,{sign:"cross",style:m=>m.kind==="cross"?Object.assign({},m,{jitter:0.6}):m,seed:33}));
  test("a sign circled instead of crossed: asked, not guessed",()=>{
    const r=one([{row:3,kind:"ring",group:"repsSign",i:0},{row:3,kind:"fill",group:"repsAmt",i:1}]);
    const x=rowOf(r,3);assert.equal(x.reps,null);assert.equal(x.unsure,true);
  });
  test("both signs crossed: asked",()=>{const r=one([{row:3,kind:"cross",group:"repsSign",i:0},{row:3,kind:"cross",group:"repsSign",i:1},{row:3,kind:"fill",group:"repsAmt",i:1}]);
    assert.equal(rowOf(r,3).reps,null);assert.equal(rowOf(r,3).unsure,true);});
  test("an amount with no sign: asked",()=>{const r=one([{row:3,kind:"fill",group:"kgAmt",i:2}]);assert.equal(rowOf(r,3).kg,null);assert.equal(rowOf(r,3).unsure,true);});
  test("a sign with no amount: asked",()=>{const r=one([{row:3,kind:"cross",group:"kgSign",i:1}]);assert.equal(rowOf(r,3).kg,null);assert.equal(rowOf(r,3).unsure,true);});
});

describe("filling the amount",()=>{
  const fills={"soft pencil":{},"light pencil":{v:0.55,cover:0.8},"a pen scribble":{v:0.2,rough:0.05,cover:0.7},"spilling over the edge":{spill:1.15,v:0.1},
    "only partly filled":{cover:0.6},"off centre":{jitter:0.7}};
  for(const [name,o] of Object.entries(fills))test(name,()=>readsRight("en-lower",0,"A4",cam,{style:m=>m.kind==="fill"?Object.assign({},m,o):m,seed:41}));
  test("a smudged-out mark beside the real one is ignored",()=>{
    const r=one([{row:5,kind:"cross",group:"repsSign",i:0},{row:5,kind:"fill",group:"repsAmt",i:2},{row:5,kind:"smudge",group:"repsAmt",i:4}]);
    assert.equal(rowOf(r,5).reps,5);assert.equal(rowOf(r,5).unsure,false);
  });
  test("two amounts filled: asked",()=>{const r=one([{row:5,kind:"cross",group:"repsSign",i:0},{row:5,kind:"fill",group:"repsAmt",i:1},{row:5,kind:"fill",group:"repsAmt",i:3}]);
    assert.equal(rowOf(r,5).reps,null);assert.equal(rowOf(r,5).unsure,true);});
  test("a number written in the circle instead of filling it: never a wrong number",()=>{
    const r=one([{row:5,kind:"cross",group:"repsSign",i:0},{row:5,kind:"digit",group:"repsAmt",i:2}]);
    const x=rowOf(r,5);assert.ok(x.reps===null||x.reps===5,"read "+x.reps);if(x.reps===null)assert.equal(x.unsure,true);
  });
});

describe("every amount, either way",()=>{
  // Back squat 5 × 102.5: reps ±1–5 and weight ±2.5–15, each on its own sheet row by row.
  const plan=S.rows[1];
  for(const k of ["reps","kg"])for(const sign of [-1,1]){
    test(k+" "+(sign<0?"minus":"plus")+" each amount",()=>{
      const amounts=plan[k];let marks=[],want=[];
      amounts.forEach((a,j)=>{const ri=[1,2,3,5,6,7][j];const row=S.rows[ri];if(k==="reps"&&row.r-a<0&&sign<0)return;
        marks=marks.concat(changeMarks(ri,k,sign*S.rows[ri][k][j],S.rows[ri][k],"cross"));want.push([ri,sign*S.rows[ri][k][j]]);});
      const r=one(marks);
      want.forEach(([ri,d])=>{const row=S.rows[ri],x=rowOf(r,ri);
        if(k==="reps")assert.equal(x.reps,Math.max(0,row.r+d),"row "+ri);else assert.equal(x.kg,Math.round((row.w+d)*100)/100,"row "+ri);
        assert.equal(x.unsure,false,"row "+ri);});
    });
  }
  test("dumbbells count in their own 2 kg jumps",()=>{
    const r=one(changeMarks(9,"kg",4,S.rows[9].kg,"cross")),x=rowOf(r,9);
    assert.deepEqual(S.rows[9].kg,[2,4,6,8,10,12]);assert.equal(x.kg,20);
  });
  test("a hold in seconds, a distance in metres, pounds, large print",()=>{
    readsRight("fr-full",0,"A4",cam,{seed:51});
    readsRight("en-strongman-lb",0,"A4",cam,{seed:52});
    readsRight("en-strongman-lb",1,"A5",{fill:0.85},{seed:53});
  });
});

describe("other things written on the sheet",()=>{
  test("a row struck through is skipped, even with its box ticked",()=>{
    const r=one([{row:2,kind:"tick"},{row:2,kind:"strike"},{row:3,kind:"tick"}]);
    assert.equal(rowOf(r,2).struck,true);assert.equal(rowOf(r,2).done,false);assert.equal(rowOf(r,3).done,true);
    assert.equal(fmt(setsFromMarks(r.sheet.rows,r.read,2.5)),"Back squat:5@102.5");
  });
  test("writing in a set's note brings it to the review, with the plan's numbers to correct",()=>{
    const r=one([{row:6,kind:"tick"},{row:6,kind:"note",hand:"n105"},{row:7,kind:"note",hand:"skip"}]);
    const sets=setsFromMarks(r.sheet.rows,r.read,2.5)["Romanian deadlift"];
    assert.equal(sets.length,2);assert.ok(sets.every(x=>x.note&&x.box));
    // Ticked and written: kept. Only written: offered unticked, one tap to keep.
    assert.equal(sets[0].maybe,false);assert.equal(sets[1].maybe,true);
  });
  test("numbers scribbled beside the plan change nothing",()=>{
    const r=one([{row:1,kind:"tick"},{kind:"write",hand:"n105",x:50,y:S.rows[2].y+S.rows[2].h/2,size:3.5},{kind:"write",hand:"n12",x:50,y:S.rows[3].y+S.rows[3].h/2,size:3.5}]);
    assert.equal(fmt(setsFromMarks(r.sheet.rows,r.read,2.5)),"Back squat:5@102.5");assert.ok(r.read.rows.every(x=>!x.unsure&&!x.note));
  });
  test("a page of notes in any language leaves the rows alone",()=>{
    for(const h of ["en","el","zh","ar","hi"])readsRight("en-lower",0,"A4",cam,{seed:61,notes:h});
  });
  test("an exercise new to the app: what's written comes to the review",()=>{
    const s=loadSheet("en-new",0),blank=s.rows.findIndex(x=>x.kind==="set"&&x.blank);
    const r=shoot("en-new",0,"A4",cam,{marks:[{row:blank,kind:"note",hand:"n12"}],want:""});
    const set=setsFromMarks(r.sheet.rows,r.read,2.5)["Zercher squat"][0];
    assert.ok(set.ask&&set.note&&set.unsure&&set.maybe);
  });
});

describe("random sheets, random photos",()=>{
  // Ninety random fill-ins across every workout, page and paper, photographed across the
  // supported range. None may come back with a wrong number; a few may refuse or ask.
  test("ninety random photos, never wrong",()=>{
    const R=rng(2026),keys=WORKOUTS.map(w=>w.key),bad=[],asked=[];
    for(let k=0;k<90;k++){
      const key=keys[(R()*keys.length)|0],pages=loadSheet(key,0).pages.length,page=(R()*pages)|0;
      const paper=["A4","A4","A5","Letter","A4margins"][(R()*5)|0],rot=(R()-0.5)*360,side=Math.abs(Math.sin(rot*Math.PI/180))>0.6;
      // Near enough to read: at least 2.2 pixels per mm of page even at the far end of a tilted
      // one, the reader's floor being 2.
      const pitch=R()*0.2,min=(side?0.64:0.46)*(paper==="A5"?1.42:1)/(1-pitch);
      const c={fill:min+R()*(Math.max(min,0.92)-min),rot,pitch,yaw:(R()-0.5)*0.25,dx:(R()-0.5)*0.08,dy:(R()-0.5)*0.08,
        noise:R()*0.05,blur:(R()*3)|0,seed:k+100,jpeg:R()<0.4?40+((R()*50)|0):0,barrel:(R()-0.5)*0.06,
        light:{base:0.5+R()*0.6,grad:[(R()-0.5)*1,(R()-0.5)*1],vignette:R()*0.4},bg:R()};
      if(Math.abs(Math.sin(c.rot*Math.PI/180))>0.6){c.W=1400;c.H=1050;}
      // The whole page in the frame, with a little room: shrink it until it is.
      for(let t=0;t<30;t++){const W=c.W||1050,H=c.H||1400;if(placePaper(PAPER[paper],Object.assign({W,H},c)).every(([u,v])=>u>W*0.02&&v>H*0.02&&u<W*0.98&&v<H*0.98))break;c.fill*=0.97;}
      const o={seed:k*7+1,sign:["cross","fill","check"][k%3],tick:["check","cross","slash","dot"][k%4]};
      const v=neverWrong(shoot(key,page,paper,c,o));
      if(v.startsWith("wrong"))bad.push(key+" p"+(page+1)+" "+paper+" "+v+" "+JSON.stringify(c));
      else if(v!=="right")asked.push(key+" "+v);
    }
    assert.deepEqual(bad,[],"wrong reads");
    assert.ok(asked.length<=6,"asked or refused "+asked.length+": "+asked.join("; "));
  });
});
