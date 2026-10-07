// Paper and back: print a workout as a sheet (or every planned workout this week), and read a
// photo of a filled sheet into the day it was printed for.
import {state,getSession,newestFirst,lastPerformance,findRoutine,planFor} from "../store.js";
import {dateKey,normSet} from "../model.js";
import {sheetRows,sheetSVG,readSheet,idCode,notesWarp} from "../sheet.js";
import {notice} from "../dialog.js";
import {targetFor,unitFor,stepFor} from "../progression.js";

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
function pageFor(s){
  const rows=sheetRows(s,plansFor(s));
  s.sheet={rows,code:idCode(s.id)};            // kept, so the scan reads the layout that was printed
  const date=new Date(s.created).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"});
  return sheetSVG(s,rows,{unit:state.settings.unit||"kg",date});
}
// Print through the browser: the pages go in a box the print styles show on their own.
function printPages(svgs){
  let box=document.getElementById("printarea");
  if(!box){box=document.createElement("div");box.id="printarea";document.body.appendChild(box);}
  box.innerHTML=svgs.map(s=>"<div class='printpage'>"+s+"</div>").join("");
  setTimeout(()=>{window.print();},60);
}

// Read a photo: decode, shrink to about 1000 pixels, grey, then find which sheet it is.
function loadGray(file){
  return new Promise((ok,fail)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      const k=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.round(img.naturalWidth*k),h=Math.round(img.naturalHeight*k);
      const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.drawImage(img,0,0,w,h);
      const d=x.getImageData(0,0,w,h).data,g=new Float32Array(w*h);
      for(let i=0;i<w*h;i++)g[i]=(d[i*4]*0.3+d[i*4+1]*0.59+d[i*4+2]*0.11)/255;
      URL.revokeObjectURL(url);ok({gray:g,w,h,canvas:c});
    };
    img.onerror=()=>{URL.revokeObjectURL(url);fail(new Error("image"));};
    img.src=url;
  });
}
function notesPicture(canvas,corners){
  const nw=notesWarp(corners),scale=6,out=document.createElement("canvas");out.width=Math.round(nw.w*scale);out.height=Math.round(nw.h*scale);
  const src=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height),o=out.getContext("2d"),img=o.createImageData(out.width,out.height);
  for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){const [u,v]=nw.at(x/scale,y/scale),ux=Math.round(u),vy=Math.round(v);
    if(ux<0||vy<0||ux>=canvas.width||vy>=canvas.height)continue;const si=(vy*canvas.width+ux)*4,di=(y*out.width+x)*4;
    img.data[di]=src.data[si];img.data[di+1]=src.data[si+1];img.data[di+2]=src.data[si+2];img.data[di+3]=255;}
  o.putImageData(img,0,0);
  return out.toDataURL("image/jpeg",0.7);
}
export function scanFile(file,render){
  loadGray(file).then(({gray,w,h,canvas})=>{
    const first=readSheet(gray,w,h,null);
    if(first.error){notice("Couldn't read that sheet",first.error==="corners"?"All four black corner squares need to be in the photo. Lay the sheet flat, in good light, and try again.":"The code at the top is hard to see. Try again with more light, straight above the sheet.");render();return;}
    const s=state.sessions.find(x=>x.sheet&&x.sheet.code===first.code);
    if(!s){notice("Which workout is this?","This sheet wasn't printed from this device's KingsKiln, or its workout has been deleted.");render();return;}
    const read=readSheet(gray,w,h,s.sheet.rows,s.sheet.code);
    if(read.error){notice("Couldn't read that sheet","Try again with the whole page in the photo.");render();return;}
    const exact=setsFromMarksByStep(s.sheet.rows,read);
    state.scan={id:s.id,sets:exact,notes:notesPicture(canvas,read.corners)};
    render();
  }).catch(()=>{notice("Couldn't open that photo");render();});
}
// Each exercise's jumps in its own step (2.5 kg for most, 5 for legs if chosen, the exercise's own).
function setsFromMarksByStep(rows,read){
  const out={};
  read.rows.forEach(r=>{
    const row=rows[r.row];if(!row||row.kind!=="set")return;
    const did=row.extra?r.reps!=null:(r.done||r.reps!=null||r.adj!==0);if(!did)return;
    const st=stepFor(row.ex);
    (out[row.ex]=out[row.ex]||[]).push({r:r.reps!=null?r.reps:row.r,w:Math.max(0,Math.round((row.w+r.adj*st)*100)/100),changed:r.reps!=null||r.adj!==0,on:true});
  });
  return out;
}

export function handle(t,ctx){
  if(t.closest&&t.closest("[data-shareopt='print']")){state.shareMenu=null;const s=getSession();if(s&&s.ex.length)printPages([pageFor(s)]);ctx.render();return true;}
  if(t.closest&&t.closest("[data-shareopt='printweek']")){
    state.shareMenu=null;
    const today=dateKey(new Date().toISOString()),end=dateKey(new Date(Date.now()+7*86400000).toISOString());
    const week=newestFirst(state.sessions).reverse().filter(s=>{const k=dateKey(s.created);return k>=today&&k<end&&s.ex.length&&!s.ex.some(e=>e.sets.length);});
    if(week.length)printPages(week.map(pageFor));else notice("Nothing planned this week","Plan workouts on the calendar first, then print them.");
    ctx.render();return true;
  }
  if(t.closest&&t.closest("[data-shareopt='scan']")){state.shareMenu=null;const i=document.getElementById("sheetscan");if(i)i.click();ctx.render();return true;}
  if(t.closest&&t.closest("[data-printday]")){const s=state.sessions.find(x=>x.id===t.closest("[data-printday]").getAttribute("data-printday"));if(s)printPages([pageFor(s)]);return true;}
  // The review after a scan: tap a set to leave it out, then add.
  const sc=state.scan;
  if(!sc)return false;
  if(t.id==="scanclose"||t.id==="scanback"){state.scan=null;ctx.render();return true;}
  const st=t.closest&&t.closest("[data-scanset]");
  if(st){const [n,i]=st.getAttribute("data-scanset").split("|");const x=sc.sets[n]&&sc.sets[n][+i];if(x)x.on=!x.on;ctx.render();return true;}
  if(t.id==="scansave"){
    const s=state.sessions.find(x=>x.id===sc.id);
    if(s){
      ctx.snapshot("Added the sheet to "+s.title);
      const at=new Date(Date.parse(s.created)).toISOString();
      s.ex.forEach(e=>{const got=(sc.sets[e.name]||[]).filter(x=>x.on);if(!got.length)return;
        const u=unitFor(e.name),appU=state.settings.unit==="lb"?"lb":"kg";
        e.sets=got.map(x=>normSet({r:x.r,w:x.w,at,u:u!==appU?u:""}));});
      if(sc.notes)s.notePhoto=sc.notes;
      if(!s.started)s.started=at;
      state.summary=null;
    }
    state.scan=null;ctx.render();return true;
  }
  return false;
}
