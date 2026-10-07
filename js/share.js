// A finished day as one clean image for the share sheet: shield and wordmark, the day's
// numbers, its exercises, and the verse on screen — black and gold, 4:5 portrait.
// Everything is drawn on a canvas, so it costs no network and works offline.
import {exerciseTotal,fmtClock,totals,workoutSeconds} from "./model.js";
import {state} from "./store.js";
import {VERSES} from "./verses.js";
import {notice} from "./dialog.js";

const W=1080,H=1350,MARGIN=84;
const INK="#ffffff",MUTED="#9a9a9a",GOLD="#f5c518",BG="#000000",PANEL="#111111";
const FONT="ui-sans-serif,system-ui,-apple-system,sans-serif";

function wrap(ctx,text,maxWidth){
  const words=String(text).split(" ");
  const lines=[];let line="";
  words.forEach(w=>{
    const t=line?line+" "+w:w;
    if(ctx.measureText(t).width>maxWidth&&line){lines.push(line);line=w;}
    else line=t;
  });
  if(line)lines.push(line);
  return lines;
}

function shield(ctx,x,y,size){
  const k=size/100;
  ctx.save();ctx.translate(x,y);ctx.scale(k,k);
  ctx.strokeStyle=GOLD;ctx.lineCap="round";ctx.lineJoin="round";
  ctx.lineWidth=8;
  ctx.stroke(new Path2D("M50 14 L78 25 V50 C78 69 65 81 50 88 C35 81 22 69 22 50 V25 Z"));
  ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(50,33);ctx.lineTo(50,64);ctx.stroke();
  ctx.beginPath();ctx.moveTo(37,45);ctx.lineTo(63,45);ctx.stroke();
  ctx.restore();
}

export function buildShareCanvas(session){
  const c=document.createElement("canvas");c.width=W;c.height=H;
  const ctx=c.getContext("2d");
  ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);

  // Brand row
  shield(ctx,MARGIN,MARGIN,72);
  ctx.textBaseline="middle";
  ctx.font="800 44px "+FONT;
  ctx.fillStyle=INK;ctx.fillText("Kings",MARGIN+88,MARGIN+36);
  const kw=ctx.measureText("Kings").width;
  ctx.fillStyle=GOLD;ctx.fillText("Kiln",MARGIN+88+kw,MARGIN+36);
  // The trademark mark, small and raised after the name.
  const nw=kw+ctx.measureText("Kiln").width;
  ctx.font="700 18px "+FONT;ctx.fillStyle=INK;ctx.fillText("\u2122",MARGIN+88+nw+4,MARGIN+22);

  // Date + day title
  ctx.textBaseline="alphabetic";
  const d=new Date(session.created);
  const dateStr=d.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  ctx.font="600 34px "+FONT;ctx.fillStyle=MUTED;
  ctx.fillText(dateStr,MARGIN,MARGIN+150);
  ctx.font="800 68px "+FONT;ctx.fillStyle=INK;
  ctx.fillText(session.title,MARGIN,MARGIN+228);

  // Stat row
  const t=totals(session),secs=workoutSeconds(session);
  const stats=[[String(t.reps),"reps"],[String(t.sets),"sets"],
    [String(session.ex.length),"exercises"]];
  if(secs)stats.push([fmtClock(secs),"time"]);
  let sx=MARGIN;const sy=MARGIN+330;
  stats.forEach(s=>{
    ctx.font="800 58px "+FONT;ctx.fillStyle=GOLD;
    ctx.fillText(s[0],sx,sy);
    const w=ctx.measureText(s[0]).width;
    ctx.font="600 30px "+FONT;ctx.fillStyle=MUTED;
    ctx.fillText(s[1],sx,sy+42);
    sx+=Math.max(w,ctx.measureText(s[1]).width)+70;
  });

  // Exercise lines on a soft panel
  const shown=session.ex.filter(e=>e.sets.length).slice(0,8);
  const py=MARGIN+430,ph=shown.length?46+shown.length*62:0;
  if(shown.length){
    ctx.fillStyle=PANEL;
    ctx.beginPath();ctx.roundRect(MARGIN-24,py-52,W-2*MARGIN+48,ph+20,24);ctx.fill();
    shown.forEach((e,i)=>{
      const y=py+i*62;
      ctx.font="700 36px "+FONT;ctx.fillStyle=INK;
      ctx.fillText(e.name,MARGIN,y);
      const best=e.sets.reduce((m,x)=>Math.max(m,+x.w||0),0);
      const band=(e.sets.find(x=>x.band)||{}).band||"";
      const sum=e.sets.length+"×"+(e.timed?" · "+fmtClock(exerciseTotal(e)):
        (e.dist?" · "+exerciseTotal(e)+" m":" · "+exerciseTotal(e)+" reps"))+
        (best?" @"+best:(band?" · "+band+" lb":""));
      ctx.font="600 34px "+FONT;ctx.fillStyle=MUTED;ctx.textAlign="right";
      ctx.fillText(sum,W-MARGIN,y);
      ctx.textAlign="left";
    });
    if(session.ex.filter(e=>e.sets.length).length>8){
      ctx.font="600 30px "+FONT;ctx.fillStyle=MUTED;
      ctx.fillText("+"+(session.ex.filter(e=>e.sets.length).length-8)+" more",MARGIN,py+shown.length*62);
    }
  }

  // The verse on screen right now, in the chosen version.
  const v=VERSES.length?VERSES[state.verseIdx||0]:null;
  if(v){
    const ver=state.settings.bibleVersion==="kjv"?"kjv":"web";
    ctx.font="italic 600 34px "+FONT;ctx.fillStyle=INK;
    const lines=wrap(ctx,"“"+v[ver]+"”",W-2*MARGIN).slice(0,6);
    const vy=H-MARGIN-70-lines.length*46;
    ctx.textAlign="center";
    lines.forEach((ln,i)=>ctx.fillText(ln,W/2,vy+i*46));
    ctx.font="700 30px "+FONT;ctx.fillStyle=GOLD;
    ctx.fillText(v.ref,W/2,vy+lines.length*46+14);
    ctx.textAlign="left";
  }

  // Footer
  ctx.font="600 26px "+FONT;ctx.fillStyle=MUTED;ctx.textAlign="center";
  ctx.fillText("kingskiln.com",W/2,H-MARGIN+30);
  ctx.textAlign="left";
  return c;
}

// A workout plan travels as a link: the routine is encoded into the URL itself, so the
// recipient taps it, KingsKiln opens, and offers to save the routine — no accounts, no
// server, and every shared workout carries the app with it.
function b64url(s){
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

export function routineLink(name,exNames){
  const payload=b64url(JSON.stringify({n:name,e:exNames}));
  return location.origin+location.pathname+"#r="+payload;
}

export function decodeRoutineHash(hash){
  const m=String(hash||"").match(/^#r=([A-Za-z0-9_-]+)$/);
  if(!m)return null;
  try{
    const json=decodeURIComponent(escape(atob(m[1].replace(/-/g,"+").replace(/_/g,"/"))));
    const d=JSON.parse(json);
    if(!d||typeof d.n!=="string"||!Array.isArray(d.e))return null;
    const ex=d.e.map(x=>String(x).trim()).filter(Boolean).slice(0,40);
    const name=d.n.trim().slice(0,60);
    return name&&ex.length?{name,ex}:null;
  }catch(e){return null;}
}

// Told in the app's own dialog, repainted by whoever is listening for it.
let repaint=()=>{};
export function onShareNotice(fn){repaint=fn;}
const copied=text=>{notice("Link copied",text);repaint();};
const copyBox=url=>{state.dialog={kind:"notice",title:"Copy this link",copy:url,ok:"Done"};repaint();};

export function shareRoutine(name,exNames){
  const url=routineLink(name,exNames);
  const text=name+" — "+exNames.length+" exercises on KingsKiln";
  try{
    if(navigator.share){navigator.share({title:name,text:text,url:url}).catch(()=>{});return;}
  }catch(e){}
  try{
    navigator.clipboard.writeText(url).then(()=>copied("Send it to whoever's training with you."),()=>copyBox(url));
  }catch(e){copyBox(url);}
}

// The app itself, passed along — the door a friend walks in through.
const APP_URL="https://www.kingskiln.com";

export function shareApp(){
  try{
    if(navigator.share){
      navigator.share({title:"KingsKiln",
        text:"KingsKiln\u2122 — a quiet workout tracker. Free, offline, your data stays yours.",
        url:APP_URL}).catch(()=>{});
      return;
    }
  }catch(e){}
  try{
    navigator.clipboard.writeText(APP_URL).then(()=>copied("kingskiln.com"),()=>copyBox(APP_URL));
  }catch(e){copyBox(APP_URL);}
}

// A Learn topic, passed along: kingskiln.com/#learn=<id> opens straight on it.
export const learnLink=id=>APP_URL+"/#learn="+encodeURIComponent(id);
export function learnLinkId(hash){
  const m=/^#learn=([\w-]+)$/.exec(hash||"");
  return m?m[1]:null;
}
export function shareTopic(id,title){
  const url=learnLink(id);
  try{
    if(navigator.share){navigator.share({title:title,text:title+" on KingsKiln",url:url}).catch(()=>{});return;}
  }catch(e){}
  try{
    navigator.clipboard.writeText(url).then(()=>copied(""),()=>copyBox(url));
  }catch(e){copyBox(url);}
}

// A year or a month in review, the same black and gold card: the title, four big numbers,
// the records, and the verse.
export function buildReviewCanvas(title,sub,stats,lines){
  const c=document.createElement("canvas");c.width=W;c.height=H;
  const ctx=c.getContext("2d");
  ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
  shield(ctx,MARGIN,MARGIN,72);
  ctx.textBaseline="middle";ctx.font="800 44px "+FONT;
  ctx.fillStyle=INK;ctx.fillText("Kings",MARGIN+88,MARGIN+36);
  const kw=ctx.measureText("Kings").width;ctx.fillStyle=GOLD;ctx.fillText("Kiln",MARGIN+88+kw,MARGIN+36);
  ctx.textBaseline="alphabetic";
  ctx.font="600 34px "+FONT;ctx.fillStyle=MUTED;ctx.fillText(sub,MARGIN,MARGIN+150);
  ctx.font="800 76px "+FONT;ctx.fillStyle=INK;ctx.fillText(title,MARGIN,MARGIN+236);
  const cw=(W-MARGIN*2)/2;
  stats.slice(0,4).forEach((s,i)=>{const x=MARGIN+(i%2)*cw,y=MARGIN+360+Math.floor(i/2)*150;
    ctx.font="800 72px "+FONT;ctx.fillStyle=GOLD;ctx.fillText(s[0],x,y);
    ctx.font="600 30px "+FONT;ctx.fillStyle=MUTED;ctx.fillText(s[1],x,y+46);});
  let y=MARGIN+690;
  ctx.font="700 32px "+FONT;
  lines.slice(0,6).forEach(l=>{ctx.fillStyle=INK;ctx.textAlign="left";ctx.fillText(l[0],MARGIN,y);
    ctx.fillStyle=MUTED;ctx.textAlign="right";ctx.fillText(l[1],W-MARGIN,y);ctx.textAlign="left";y+=58;});
  ctx.font="600 26px "+FONT;ctx.fillStyle=MUTED;ctx.textAlign="center";ctx.fillText("kingskiln.com",W/2,H-MARGIN+30);
  return c;
}
export function shareCanvas(canvas,fname,text){
  canvas.toBlob(blob=>{
    if(!blob)return;
    try{const file=new File([blob],fname,{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:"KingsKiln",text:text+" · "+APP_URL}).catch(()=>{});return;}}catch(e){}
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=fname;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);
  },"image/png");
}

// Share sheet where it exists — AirDrop, Messages, Instagram — a PNG download otherwise.
export function shareDay(session){
  const canvas=buildShareCanvas(session);
  const fname="kingskiln_"+new Date(session.created).toISOString().slice(0,10)+".png";
  canvas.toBlob(blob=>{
    if(!blob)return;
    try{
      const file=new File([blob],fname,{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        // The picture travels with the door in: targets that keep text show the link too.
        navigator.share({files:[file],title:"KingsKiln",
          text:session.title+" — logged with KingsKiln\u2122 · "+APP_URL}).catch(()=>{});
        return;
      }
    }catch(e){}
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=fname;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);
  },"image/png");
}
