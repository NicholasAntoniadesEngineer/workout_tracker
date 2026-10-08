// What a scanned sheet said, to check before it goes into the day. Sets read clearly are chips:
// gold if they differed from the plan, a tap leaves one out. A set the sheet wasn't sure of, one
// with something written in its note, or one printed with no plan, opens up: the handwriting as
// a picture, and its reps and weight to type. A set written only in the notes can be added.
import {state} from "../store.js";
import {esc} from "./common.js";
import {unitFor} from "../progression.js";

export function scanSheet(){
  const sc=state.scan;if(!sc)return "";
  const s=state.sessions.find(x=>x.id===sc.id);if(!s)return "";
  const names=Object.keys(sc.sets).filter(n=>sc.sets[n].length);
  const open=x=>x.unsure||x.note||x.ask||x.edit;
  // Each exercise in its own terms: seconds for a hold, metres for a carry, weight only if it has one.
  const kind=n=>{const e=s.ex.find(x=>x.name===n)||{};return {per:e.timed?"s":e.dist?"m":"reps",weighted:!e.timed&&!e.dist||sc.sets[n].some(x=>+x.w>0),u:unitFor(n)};};
  const chip=(n,x,i)=>{const k=kind(n);return "<button class='scanset"+(x.on?" on":"")+(x.changed?" chg":"")+"' data-scanset='"+esc(n)+"|"+i+"' aria-pressed='"+x.on+"'><b class='mono'>"+x.r+"</b>"+
    (k.per!=="reps"?"<span>"+k.per+"</span>":"")+(x.w?"<span class='mono'>× "+x.w+"</span><span>"+esc(k.u)+"</span>":"")+"</button>";};
  const check=(n,x,i)=>{const k=kind(n);return "<div class='scancheck"+(x.on?" on":"")+"'>"+
    (x.pic?"<img class='scanpic' alt='What you wrote for set "+(i+1)+"' src='"+x.pic+"'>":x.unsure?"<span class='scanq' aria-label='Unclear on the sheet'>?</span>":"")+
    "<label class='scanfield'><input class='scanr mono' type='number' inputmode='numeric' min='0' data-scanr='"+esc(n)+"|"+i+"' value='"+(x.r||"")+"' aria-label='"+(k.per==="s"?"Seconds":k.per==="m"?"Metres":"Reps")+", set "+(i+1)+"'><span>"+k.per+"</span></label>"+
    (k.weighted||x.ask?"<label class='scanfield'><input class='scanw mono' type='number' inputmode='decimal' step='any' min='0' data-scanw='"+esc(n)+"|"+i+"' value='"+(x.w||"")+"' aria-label='Weight, set "+(i+1)+"'><span>"+esc(k.u)+"</span></label>":"")+
    "<button class='scantoggle' data-scanset='"+esc(n)+"|"+i+"' aria-pressed='"+x.on+"'>"+(x.on?"Keep":"Left out")+"</button></div>";};
  const any=names.some(n=>sc.sets[n].some(open));
  return "<div class='overlay' id='scanback'><div class='sheet actionsheet scansheet'>"+
    "<div class='sheethead'><div class='plabel'>Read from the sheet"+(sc.pages>1?" &middot; page "+((sc.page||0)+1)+" of "+sc.pages:"")+"</div><button class='btn ghost tiny' id='scanclose'>Cancel</button></div><div class='sheetbody'>"+
    "<div class='h1 plain plantitle'>"+esc(s.title)+"</div><div class='planex'>"+esc(new Date(s.created).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"}))+"</div>"+
    (names.length?names.map(n=>{const list=sc.sets[n];
      return "<div class='scanex'><div class='scann'>"+esc(n)+"</div><div class='scansets'>"+list.map((x,i)=>open(x)?"":chip(n,x,i)).join("")+"</div>"+
        list.map((x,i)=>open(x)?check(n,x,i):"").join("")+"<button class='scanadd' data-scanadd='"+esc(n)+"'>+ Add a set</button></div>";}).join(""):
      "<div class='empty-note'>No ticks or marks found. Tick the done box for each set you did.</div>")+
    (sc.notes?"<div class='picklbl'>Notes</div><img class='scannotes' alt='Handwritten notes from the sheet' src='"+sc.notes+"'>":"")+
    "<div class='revsub'>"+(any?"Check the sets with writing or a <b>?</b> and type what you did. ":"")+"Gold differs from the plan. Tap a set to leave it out.</div>"+
    "<button class='btn primary pbig' id='scansave'"+(names.length?"":" disabled")+">Add to "+esc(s.title)+"</button>"+
    "</div></div></div>";
}
