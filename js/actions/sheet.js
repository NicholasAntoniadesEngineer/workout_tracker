// Paper and back: print a workout as sheets (or every planned workout this week), and read a
// photo of a filled sheet into the day it was printed for, page by page.
import {state,getSession,newestFirst,lastPerformance,findRoutine,planFor} from "../store.js";
import {dateKey,normSet,isBandExercise} from "../model.js";
import {sheetPages,sheetSVG,readSheet,notesWarp,setsFromMarks,PAPERS} from "../sheet.js";
import {notice} from "../dialog.js";
import {targetFor,unitFor,stepFor,perHand,exProg} from "../progression.js";

// What each exercise is planned as: the sets already logged, the routine's targets, or last
// time's working sets at today's target weight.
function plansFor(s){
  const out={},r=s.routine?findRoutine(s.routine):null;
  s.ex.forEach(e=>{
    if(e.sets.length){out[e.name]=e.sets.filter(x=>!x.wu).map(x=>({r:x.r,w:+x.w||0}));return;}
    const p=r?planFor(r,e.name):null;if(p){out[e.name]=p.map(x=>({r:x.r,w:x.w}));return;}
    const last=lastPerformance(e.name),tg=targetFor(e);
    const n=last?Math.max(1,last.ex.sets.filter(x=>!x.wu).length):3;
    const w=tg&&tg.apply&&tg.apply.w!=null?tg.apply.w:last?Math.max(...last.ex.sets.map(x=>+x.w||0)):0;
    const reps=tg&&tg.apply&&tg.apply.r!=null?tg.apply.r:last?last.ex.sets[last.ex.sets.length-1].r:0;
    out[e.name]=Array.from({length:n},()=>({r:reps,w}));
  });
  return out;
}
const key=n=>String(n||"").trim().toLowerCase();
const fmtW=w=>String(Math.round(w*100)/100);
const clock=s=>Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
// The last time an exercise was done before this day, as a short line: "5·5·4 × 97.5 kg · 1 Oct".
function lastLine(s,name,unit,mode){
  for(const p of newestFirst(state.sessions)){
    if(p.id===s.id||(p.created||"")>=(s.created||""))continue;
    const e=p.ex.find(x=>key(x.name)===key(name)&&x.sets.some(y=>!y.wu));if(!e)continue;
    const w=e.sets.filter(x=>!x.wu),same=w.every(x=>+x.w===+w[0].w),u=mode==="secs"?" s":mode==="m"?" m":"";
    const day=new Date(p.created).toLocaleDateString(undefined,{day:"numeric",month:"short"});
    const body=same?w.map(x=>x.r).join("·")+u+(+w[0].w?" × "+fmtW(+w[0].w)+" "+unit:""):w.map(x=>x.r+(+x.w?"×"+fmtW(+x.w):"")).join(", ")+u+" "+unit;
    return body+" · "+day;
  }
  return "";
}
// The jump the sheet counts weight in: the exercise's own, or 2 kg / 5 lb for dumbbells logged
// per hand (racks go up in twos), else the Progression setting.
export function sheetStep(name){
  const own=+exProg(name).step;if(own>0)return own;
  if(perHand(name))return unitFor(name)==="lb"?5:2;
  return stepFor(name);
}
// Everything the sheet shows for each exercise: the plan, last time, the rest and the lifter's
// own pinned note.
export function sheetExercises(s){
  const plans=plansFor(s);
  return s.ex.map(e=>{
    const unit=unitFor(e.name),mode=e.timed?"secs":e.dist?"m":"reps";
    const rest=(state.restTargets||{})[key(e.name)]||+state.settings.restTarget||0;
    const note=String((state.exNotes||{})[key(e.name)]||"").split("\n")[0].trim().slice(0,90);
    return {name:e.name,mode,unit,hand:perHand(e.name),band:isBandExercise(e.name),step:sheetStep(e.name),
      sets:(plans[e.name]||[]).map(p=>({r:p.r,w:p.w})),last:lastLine(s,e.name,unit,mode),rest:rest?clock(rest):"",note};
  });
}
function pagesFor(s){
  const st=state.settings,large=!!st.printLarge,pages=sheetPages(s,sheetExercises(s),{large});
  // Kept, so the scan reads the layout that was printed.
  s.sheet={v:2,pages:pages.map(p=>({code:p.code,rows:p.rows,notes:p.notes})),got:(s.sheet&&s.sheet.got)||{}};
  const date=new Date(s.created).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"});
  const g=(state.gyms||[]).find(x=>x.id===s.gym);
  return pages.map(p=>sheetSVG(s,p,{unit:st.unit||"kg",date,gym:g?g.name:"",large}));
}
// Print through the browser: the pages go in a box the print styles show on their own, at the
// paper size chosen in Settings (the A4 layout is scaled to fit and centred).
function printPages(svgs){
  const paper=PAPERS[state.settings.paper]||PAPERS.a4;
  let box=document.getElementById("printarea");
  if(!box){box=document.createElement("div");box.id="printarea";document.body.appendChild(box);}
  let size=document.getElementById("printsize");
  if(!size){size=document.createElement("style");size.id="printsize";document.head.appendChild(size);}
  size.textContent="@media print{@page{size:"+paper.css+";margin:0;}.printpage{width:"+paper.w+"mm;height:"+paper.h+"mm;}.printpage svg{width:"+paper.w+"mm;height:"+paper.h+"mm;}}";
  box.innerHTML=svgs.map(s=>"<div class='printpage'>"+s+"</div>").join("");
  setTimeout(()=>{window.print();},60);
}

// Read a photo: decode, shrink to about 2000 pixels, grey, then find which sheet it is.
function loadGray(file){
  return new Promise((ok,fail)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      const k=Math.min(1,2000/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.round(img.naturalWidth*k),h=Math.round(img.naturalHeight*k);
      const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.drawImage(img,0,0,w,h);
      const d=x.getImageData(0,0,w,h).data,g=new Float32Array(w*h);
      for(let i=0;i<w*h;i++)g[i]=(d[i*4]*0.3+d[i*4+1]*0.59+d[i*4+2]*0.11)/255;
      URL.revokeObjectURL(url);ok({gray:g,w,h,canvas:c});
    };
    img.onerror=()=>{URL.revokeObjectURL(url);fail(new Error("image"));};
    img.src=url;
  });
}
function notesPicture(canvas,corners,box,px){
  const nw=notesWarp(corners,box),scale=px||6,out=document.createElement("canvas");out.width=Math.round(nw.w*scale);out.height=Math.round(nw.h*scale);
  const src=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height),o=out.getContext("2d"),img=o.createImageData(out.width,out.height);
  for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){const [u,v]=nw.at(x/scale,y/scale),ux=Math.round(u),vy=Math.round(v);
    if(ux<0||vy<0||ux>=canvas.width||vy>=canvas.height)continue;const si=(vy*canvas.width+ux)*4,di=(y*out.width+x)*4;
    img.data[di]=src.data[si];img.data[di+1]=src.data[si+1];img.data[di+2]=src.data[si+2];img.data[di+3]=255;}
  o.putImageData(img,0,0);
  return out.toDataURL("image/jpeg",0.7);
}
// Every printed page this device knows, by its code.
export function sheetIndex(sessions){
  const idx=new Map();
  (sessions||state.sessions).forEach(s=>{const sh=s.sheet;if(!sh)return;
    if(sh.pages)sh.pages.forEach((p,i)=>idx.set(p.code,{s,page:i,pages:sh.pages.length,rows:p.rows,notes:p.notes}));
    else if(sh.code!=null)idx.set(sh.code,{s,page:0,pages:1,rows:sh.rows,notes:null});});
  return idx;
}
export const SCAN_ERRORS={
  corners:["Couldn't find the sheet","All four black corner squares need to be in the photo. Lay the sheet flat, in good light, and try again."],
  code:["Couldn't read the code","The row of squares at the top is hard to see. Try again with more light, straight above the sheet."],
  far:["Move closer","The sheet should fill most of the photo, held flat and straight on, so every row is big enough to read."],
  blur:["A little blurred","Hold the phone steady over the sheet, in good light, and try again."],
  nomatch:["Which workout is this?","This sheet wasn't printed from this device's KingsKiln, or its workout has been deleted."],
};
export function scanFile(file,render){
  loadGray(file).then(({gray,w,h,canvas})=>{
    const idx=sheetIndex();
    if(!idx.size){notice("No printed sheets yet","Print a workout from Train › Share first, fill it in, then scan it.");render();return;}
    const first=readSheet(gray,w,h,null,new Set(idx.keys()));
    if(first.error){const m=SCAN_ERRORS[first.error]||SCAN_ERRORS.corners;notice(m[0],m[1]);render();return;}
    const hit=idx.get(first.code);
    const read=readSheet(gray,w,h,hit.rows,first.code);
    if(read.error){notice("Couldn't read that sheet","Try again with the whole page in the photo.");render();return;}
    const sets=scanSets(hit.rows,read);
    // What was written in a set's note cell, as a picture beside it in the review.
    Object.values(sets).forEach(list=>list.forEach(x=>{if(x.note&&x.box)x.pic=notesPicture(canvas,read.corners,x.box,10);delete x.box;}));
    state.scan={id:hit.s.id,page:hit.page,pages:hit.pages,sets,notes:notesPicture(canvas,read.corners,hit.notes)};
    render();
  }).catch(()=>{notice("Couldn't open that photo");render();});
}
// The sets as read, each exercise's jumps in its own step (rows of the first layout don't carry one).
export function scanSets(rows,read){
  const withStep=rows.map(r=>r.kind==="set"&&!r.step?Object.assign({},r,{step:stepFor(r.ex)}):r);
  const out=setsFromMarks(withStep,read,2.5);
  Object.values(out).forEach(list=>list.forEach(x=>{x.on=!x.maybe;}));
  return out;
}
// Put a page's sets into the day. Each page keeps its own sets, so scanning page 2 after page 1
// (or a page again) never loses the other page's.
export function applyScan(s,sc){
  const at=new Date(Date.parse(s.created)).toISOString();
  s.sheet=s.sheet||{};const got=s.sheet.got=s.sheet.got||{};
  got[sc.page||0]={};
  Object.keys(sc.sets).forEach(n=>{got[sc.page||0][n]=sc.sets[n].filter(x=>x.on).map(x=>({r:x.r,w:+x.w||0}));});
  const order=Object.keys(got).map(Number).sort((a,b)=>a-b);
  s.ex.forEach(e=>{
    let all=[];order.forEach(p=>{all=all.concat((got[p]||{})[e.name]||[]);});
    if(!all.length)return;
    const u=unitFor(e.name),appU=state.settings.unit==="lb"?"lb":"kg",hand=perHand(e.name);
    e.sets=all.map(x=>normSet({r:x.r,w:x.w,at,u:u!==appU?u:"",hand}));
  });
  if(sc.notes){s.notePhotos=(s.notePhotos||[]).slice();s.notePhotos[sc.page||0]=sc.notes;if(!sc.page||!s.notePhoto)s.notePhoto=s.notePhotos.find(Boolean);}
  if(!s.started)s.started=at;
}

export function handle(t,ctx){
  if(t.closest&&t.closest("[data-shareopt='print']")){state.shareMenu=null;const s=getSession();if(s&&s.ex.length)printPages(pagesFor(s));ctx.render();return true;}
  if(t.closest&&t.closest("[data-shareopt='printweek']")){
    state.shareMenu=null;
    const today=dateKey(new Date().toISOString()),end=dateKey(new Date(Date.now()+7*86400000).toISOString());
    const week=newestFirst(state.sessions).reverse().filter(s=>{const k=dateKey(s.created);return k>=today&&k<end&&s.ex.length&&!s.ex.some(e=>e.sets.length);});
    if(week.length)printPages([].concat(...week.map(pagesFor)));else notice("Nothing planned this week","Plan workouts on the calendar first, then print them.");
    ctx.render();return true;
  }
  if(t.closest&&t.closest("[data-shareopt='scan']")){state.shareMenu=null;const i=document.getElementById("sheetscan");if(i)i.click();ctx.render();return true;}
  if(t.closest&&t.closest("[data-printday]")){const s=state.sessions.find(x=>x.id===t.closest("[data-printday]").getAttribute("data-printday"));if(s)printPages(pagesFor(s));return true;}
  // The review after a scan: tap a set to leave it out, then add.
  const sc=state.scan;
  if(!sc)return false;
  if(t.id==="scanclose"||t.id==="scanback"){state.scan=null;ctx.render();return true;}
  if(t.closest&&t.closest(".scanw,.scanr"))return true;
  // A set written in a note that the sheet had no row for.
  const add=t.closest&&t.closest("[data-scanadd]");
  if(add){const n=add.getAttribute("data-scanadd"),list=sc.sets[n]||(sc.sets[n]=[]),last=list[list.length-1]||{r:0,w:0};
    list.push({r:last.r,w:last.w,changed:true,on:true,edit:true});ctx.render();return true;}
  const st=t.closest&&t.closest("[data-scanset]");
  if(st){const [n,i]=st.getAttribute("data-scanset").split("|");const x=sc.sets[n]&&sc.sets[n][+i];if(x)x.on=!x.on;ctx.render();return true;}
  if(t.id==="scansave"){
    const s=state.sessions.find(x=>x.id===sc.id);
    if(s){ctx.snapshot("Added the sheet to "+s.title);applyScan(s,sc);state.summary=null;}
    state.scan=null;ctx.render();return true;
  }
  return false;
}
