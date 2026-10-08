// Shared by the scan tests: fill a printed sheet in the way a person would, photograph it,
// read it, and say what came back against what was meant.
import fs from "node:fs";
import assert from "node:assert/strict";
import {readSheet,setsFromMarks,markSpots} from "../../js/sheet.js";
import {PAPER,loadSheet,printSheet,markSheet,photograph,rng} from "./camera.js";
import {writePNG} from "./png.js";

export const fmt=s=>Object.entries(s).map(([k,v])=>[k,v.filter(x=>!x.maybe)]).filter(([,v])=>v.length).map(([k,v])=>k+":"+v.map(x=>x.r+"@"+x.w).join(",")).join("|");
const r2=w=>Math.round(w*100)/100;

// Marks for a change: minus or plus, and an amount. `sign` styles how the sign is marked.
export function changeMarks(ri,k,delta,amounts,sign){
  const i=amounts.indexOf(Math.abs(delta));if(i<0)throw new Error("no amount "+Math.abs(delta));
  return [{row:ri,kind:sign||"cross",group:k+"Sign",i:delta<0?0:1},{row:ri,kind:"fill",group:k+"Amt",i}];
}
// A filled-in sheet: most sets ticked, some with other reps or weight (minus or plus and how
// many), a few with something written in the note, some skipped. Returns {marks, want, flags}:
// want is what the scan should say, flags the rows it should bring to the review.
// o: {tick (style), sign (how signs are marked), style(mark) → mark, notes (hand key)}
export function fillIn(sheet,seed,o){
  const opt=o||{},R=rng(seed||1),marks=[],want={},flags={unsure:[],note:[],maybe:[]};
  const style=m=>opt.style?opt.style(m):m;
  const tick=ri=>marks.push(style({row:ri,kind:"tick",style:opt.tick}));
  markSpots(sheet.rows).forEach(m=>{
    const row=sheet.rows[m.row],ri=m.row;
    if(m.legacy)throw new Error("fillIn is for the table layout");
    const change=(k,plan,amounts)=>{let a=amounts[(R()*amounts.length)|0],sg=R()<0.6?-1:1;if(plan-a<=0)sg=1;
      changeMarks(ri,k,sg*a,amounts,opt.sign).forEach(x=>marks.push(style(x)));return Math.round((plan+sg*a)*100)/100;};
    let r=row.r,w=row.w,did=false,note=false;const x=R();
    // A new exercise written in: offered in the review unticked, so not among the sets kept.
    if(row.blank){if(x<0.7){note=true;flags.maybe.push(ri);marks.push({row:ri,kind:"note",hand:"n12"});}}
    else if(x<0.56){did=true;tick(ri);}
    else if(x<0.66&&row.reps.length){did=true;tick(ri);r=change("reps",row.r,row.reps);}
    else if(x<0.72&&row.reps.length){did=true;r=change("reps",row.r,row.reps);}
    else if(x<0.8&&row.kg.length){did=true;tick(ri);w=change("kg",row.w,row.kg);}
    else if(x<0.85&&row.kg.length&&row.reps.length){did=true;r=change("reps",row.r,row.reps);w=change("kg",row.w,row.kg);}
    else if(x<0.89){did=true;note=true;tick(ri);marks.push({row:ri,kind:"note",hand:R()<0.5?"n12":"n105"});}
    if(note)flags.note.push(ri);
    if(did)(want[row.ex]=want[row.ex]||[]).push({r,w});
  });
  if(opt.notes)marks.push({kind:"notes",hand:opt.notes});
  return {marks,want:fmt(want),flags};
}

// Print a workout's page on a paper size, fill it in, photograph it and read it.
// o: {seed, marks, want, codes (what the reader is told to expect), print, fill options}
export function shoot(key,page,paper,cam,o){
  const opt=o||{},sheet=printSheet(typeof key==="string"?loadSheet(key,page):key,PAPER[paper],opt.print);
  const plan=opt.marks?{marks:opt.marks,want:opt.want}:fillIn(sheet,opt.seed==null?11+page*7:opt.seed,opt);
  markSheet(sheet,plan.marks,opt.markSeed||5);
  const ph=photograph(sheet,Object.assign({W:1050,H:1400,seed:9,fill:0.85},cam));
  const read=readSheet(ph.gray,ph.w,ph.h,sheet.rows,opt.codes===undefined?sheet.code:opt.codes);
  return {sheet,plan,ph,read};
}
// Set SCAN_DEBUG=dir to keep a picture of every photo that didn't read right.
function keep(name,ph){const d=process.env.SCAN_DEBUG;if(!d)return;fs.mkdirSync(d,{recursive:true});writePNG(d+"/"+name.replace(/[^\w.-]+/g,"_")+".png",ph.gray,ph.w,ph.h);}
// The read must be exactly what was meant, with nothing left unclear.
export function readsRight(key,page,paper,cam,o){
  const r=shoot(key,page,paper,cam,o),label=(typeof key==="string"?key:key.key)+" p"+(page+1)+" "+paper+" "+JSON.stringify(cam);
  try{
    assert.ok(!r.read.error,"read failed: "+r.read.error+" (scale "+(r.read.scale||0).toFixed(2)+")");
    assert.equal(r.read.code,r.sheet.code,"wrong code");
    assert.equal(fmt(setsFromMarks(r.sheet.rows,r.read,2.5)),r.plan.want);
    const flags=r.plan.flags||{unsure:[],note:[],maybe:[]};
    assert.deepEqual(r.read.rows.filter(x=>x.unsure).map(x=>x.row),flags.unsure,"rows left unclear");
    assert.deepEqual(r.read.rows.filter(x=>x.note).map(x=>x.row),flags.note,"rows with writing in the note");
  }catch(e){keep(label,r.ph);e.message=label+"\n"+e.message;throw e;}
  return r;
}
// Reads right or says it isn't sure: never a confident wrong number.
export function neverWrong(r){
  if(r.read.error)return "refused";
  const got=setsFromMarks(r.sheet.rows,r.read,2.5);
  if(fmt(got)===r.plan.want)return "right";
  const unclear=new Set(r.read.rows.filter(x=>x.unsure).map(x=>r.sheet.rows[x.row].ex));
  // Every exercise that differs must have a row flagged for the review.
  const want=Object.fromEntries(r.plan.want.split("|").filter(Boolean).map(s=>{const i=s.indexOf(":");return [s.slice(0,i),s.slice(i+1)];}));
  const names=new Set(Object.keys(want).concat(Object.keys(got)));
  for(const n of names){const g=(got[n]||[]).filter(x=>!x.maybe).map(x=>x.r+"@"+x.w).join(",");if(g!==(want[n]||"")&&!unclear.has(n))return "wrong: "+n+" read "+g+" meant "+(want[n]||"nothing");}
  return "flagged";
}
