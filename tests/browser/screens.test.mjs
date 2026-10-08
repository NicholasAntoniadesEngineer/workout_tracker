// Every screen at every size: phones (320, 390 and 430 wide, as a phone), a tablet both ways
// round and a laptop, each at the default text size, large (1.25) and extra large (1.9), in the
// light theme and, on a phone and the laptop, the dark one — over four weeks of seeded training.
// Each screen is checked for page errors, a page that scrolls sideways, anything sticking out of
// the screen, text spilling out of its box or cut off, a number broken over two lines, text drawn
// over other text, a button something else sits on, and text too faint to read. Every problem
// names the screen, the size, the text size and the element, with a screenshot (problems
// outlined in magenta) in a temp folder. About three minutes.
// Skips when Chrome isn't installed. node --test tests/browser/screens.test.mjs
// KK_ONLY="390×844" (or "dark", "text 1.9", "1440") runs only the matching combinations.
import {test,describe,before,after} from "node:test";
import assert from "node:assert/strict";
import {launch,serve,chromePath} from "./chrome.mjs";
import {seedDoc,openApp,saveShot,dayKey} from "./e2e.mjs";

const has=!!chromePath();
let srv,page,defaultUA="";
const ANDROID_UA="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

// ── The audit, run in the page ────────────────────────────────────────────────────────
// Returns [{kind, el, text, ...}] for what's wrong on screen now, and marks each offender with
// data-audit so the screenshot can outline it.
// W is the screen's width as set, not innerWidth: a phone widens its layout to fit content wider
// than the screen (and zooms out), which would hide exactly what is being looked for.
const AUDIT=String(async function audit(W){
  const H=innerHeight,out=[];
  document.querySelectorAll("[data-audit]").forEach(e=>e.removeAttribute("data-audit"));
  const name=el=>{
    if(!el||el.nodeType!==1)return "?";
    const cls=typeof el.className==="string"?el.className:(el.className&&el.className.baseVal)||"";
    return el.tagName.toLowerCase()+(el.id?"#"+el.id:"")+(cls.trim()?"."+cls.trim().split(/\s+/).join("."):"");
  };
  const path=el=>{const p=[];for(let e=el;e&&e!==document.body&&e.id!=="app"&&p.length<4;e=e.parentElement)p.unshift(name(e));return p.join(" > ");};
  const txt=el=>(el.textContent||"").replace(/\s+/g," ").trim().slice(0,70);
  const cs=new Map(),st=el=>{let s=cs.get(el);if(!s){s=getComputedStyle(el);cs.set(el,s);}return s;};
  const shown=el=>{
    for(let e=el;e&&e.nodeType===1;e=e.parentElement){const s=st(e);if(s.display==="none"||s.visibility==="hidden"||s.visibility==="collapse"||+s.opacity===0||e.hidden)return false;}
    return true;
  };
  const flag=(kind,el,extra)=>{out.push(Object.assign({kind,el:path(el),text:txt(el)},extra||{}));el.setAttribute("data-audit","1");};
  const root=document.getElementById("app")||document.body,all=[...root.querySelectorAll("*")];
  const FORM=/^(INPUT|TEXTAREA|SELECT|OPTION)$/;
  // 1. The page scrolls sideways.
  const sw=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
  if(sw>W+1)out.push({kind:"page scrolls sideways",el:"html",text:"scrollWidth "+sw+" > "+W});
  if(innerWidth>W+1)out.push({kind:"page wider than the screen (the phone zooms out)",el:"html",text:"innerWidth "+innerWidth+" > "+W});
  // Where an element can be seen: scroll containers clip (what's beyond can be scrolled to); a
  // hidden-overflow box clips only inside the screen — one flush with the edge is the screen's edge.
  const clipOf=el=>{
    let l=-Infinity,r=Infinity;
    for(let a=el.parentElement;a&&a!==document.documentElement;a=a.parentElement){
      const s=st(a);
      if(s.overflowX!=="visible"){
        const b=a.getBoundingClientRect(),scroller=s.overflowX==="auto"||s.overflowX==="scroll";
        if(scroller||(b.left>0.5&&b.right<W-0.5)){l=Math.max(l,b.left);r=Math.min(r,b.right);}
      }
      if(s.position==="fixed")break;
    }
    return [l,r];
  };
  const vis=[];
  for(const el of all){
    const r=el.getBoundingClientRect();if(r.width<1||r.height<1||!shown(el))continue;
    vis.push(el);
    // 2. Sticking out of the screen sideways (only the outermost offender is named).
    const [cl,cr]=clipOf(el),L=Math.max(r.left,cl),R=Math.min(r.right,cr);
    if(R-L<1||R<=0||L>=W||(R<=W+1&&L>=-1))continue;
    const p=el.parentElement;let parentOut=false;
    if(p&&p!==root){const pr=p.getBoundingClientRect(),[pl,prr]=clipOf(p);parentOut=Math.min(pr.right,prr)>W+1||Math.max(pr.left,pl)<-1;}
    if(!parentOut)flag("sticks out of the screen",el,{box:[Math.round(L),Math.round(R)]});
  }
  // Bring an element into view by scrolling up or down only (scrollIntoView would also slide a
  // hidden-overflow page sideways, which no finger can do).
  const scrollToV=el=>{for(let a=el.parentElement;a;a=a.parentElement){const s=getComputedStyle(a);
    if(/(auto|scroll)/.test(s.overflowY)&&a.scrollHeight>a.clientHeight){const r=el.getBoundingClientRect(),ar=a.getBoundingClientRect();a.scrollTop+=r.top-ar.top-(ar.height-r.height)/2;return;}}};
  window.__scrollToV=scrollToV;
  const textNodes=el=>[...el.childNodes].filter(n=>n.nodeType===3&&n.nodeValue.trim());
  const rectsOf=el=>{const q=[];for(const n of textNodes(el)){const rg=document.createRange();rg.selectNodeContents(n);q.push(...[...rg.getClientRects()].filter(x=>x.width>1&&x.height>1));}return q;};
  for(const el of vis){
    if(!textNodes(el).length||el instanceof SVGElement||FORM.test(el.tagName))continue;
    const s=st(el);if(s.display==="inline"||s.display==="contents")continue;
    // 3. Text spilling out of its box (a few pixels into a gap is allowed), cut off, or a short
    // label truncated past reading.
    const over=el.scrollWidth-el.clientWidth;
    if(over>4&&s.overflowX==="visible")flag("text overflows its box",el,{box:[el.clientWidth,el.scrollWidth]});
    else if(over>1&&s.overflowX==="hidden"&&s.textOverflow!=="ellipsis")flag("text cut off",el,{box:[el.clientWidth,el.scrollWidth]});
    // (A label: short and wordy. A line of numbers cut short, like a day's sets, is by design.)
    else if(over>1&&s.textOverflow==="ellipsis"&&txt(el).length<=30&&!/\d/.test(txt(el))&&el.clientWidth<0.6*el.scrollWidth)flag("label truncated past reading",el,{box:[el.clientWidth,el.scrollWidth]});
    if(s.overflowY==="hidden"&&s.webkitLineClamp==="none"&&s.textOverflow!=="ellipsis"&&el.scrollHeight>el.clientHeight+3)
      flag("text cut off at the bottom",el,{box:[el.clientHeight,el.scrollHeight]});
  }
  // 3b. Text cut off by a box around it that hides its overflow (one inside the screen; at the
  // screen's edge it is the sticking-out check's), with no ellipsis to say so.
  for(const el of vis){
    const q=rectsOf(el);if(!q.length||el.closest("svg")||FORM.test(el.tagName))continue;
    const L=Math.min(...q.map(x=>x.left)),R=Math.max(...q.map(x=>x.right));
    let cut=null;
    for(let a=el;a&&a!==root;a=a.parentElement){
      const s=st(a);
      if(s.textOverflow==="ellipsis"&&s.overflowX!=="visible")break;
      if(a===el||s.overflowX==="visible"||s.overflowX==="auto"||s.overflowX==="scroll")continue;
      const b=a.getBoundingClientRect();
      if(b.left<=0.5||b.right>=W-0.5)continue;
      if(L<b.left-2||R>b.right+2){cut=a;break;}
    }
    if(cut)flag("text cut off by its box",el,{by:name(cut),box:[Math.round(L),Math.round(R)]});
  }
  // 4. A number (or a short word) broken over two lines.
  for(const el of vis){
    if(el.closest("svg"))continue;
    for(const n of textNodes(el)){
      const v=n.nodeValue.trim();
      if(/\s/.test(v)||v.length<2||v.length>14||!/^[\d.,:%+−×/-]+[a-zA-Z]{0,3}$|^[A-Za-z][a-z]+$/.test(v))continue;
      const rg=document.createRange();rg.selectNodeContents(n);
      const tops=new Set([...rg.getClientRects()].filter(q=>q.width>0).map(q=>Math.round(q.top)));
      if(tops.size>1){flag("word broken over lines",el,{box:[tops.size,v]});break;}
    }
  }
  // 5. Text drawn over other text. Line boxes are taller than the glyphs, so a sliver of overlap
  // between tight lines doesn't count; and text under something opaque (a sheet) is hidden.
  const items=[];
  for(const el of vis){
    if(el.closest("svg")&&!el.closest("text"))continue;
    for(const q of rectsOf(el))items.push({el,l:q.left,r:q.right,t:q.top,b:q.bottom});
  }
  items.sort((a,b)=>a.t-b.t);
  const pairs=[],ids=new Map(),seen=new Set(),idOf=e=>{if(!ids.has(e))ids.set(e,ids.size);return ids.get(e);};
  for(let i=0;i<items.length;i++){
    const a=items[i];
    for(let j=i+1;j<items.length&&items[j].t<a.b;j++){
      const b=items[j];
      if(a.el===b.el||a.el.contains(b.el)||b.el.contains(a.el))continue;
      const ow=Math.min(a.r,b.r)-Math.max(a.l,b.l),oh=Math.min(a.b,b.b)-Math.max(a.t,b.t);
      if(ow<=2||oh<0.3*Math.min(a.b-a.t,b.b-b.t))continue;
      const k=Math.min(idOf(a.el),idOf(b.el))+"|"+Math.max(idOf(a.el),idOf(b.el));
      if(seen.has(k))continue;
      seen.add(k);pairs.push({a:a.el,b:b.el,ow,oh});
    }
  }
  const opaque=e=>{const s=st(e),m=/rgba?\(([^)]+)\)/.exec(s.backgroundColor),p=m?m[1].split(","):[];return p.length===3||+p[3]>0.85||s.backgroundImage!=="none";};
  const overlapAt=(a,b)=>{for(const p of rectsOf(a))for(const q of rectsOf(b)){const l=Math.max(p.left,q.left),r=Math.min(p.right,q.right),t=Math.max(p.top,q.top),bt=Math.min(p.bottom,q.bottom);
    if(r-l>2&&bt-t>=0.3*Math.min(p.height,q.height))return {x:(l+r)/2,y:(t+bt)/2};}return null;};
  for(const {a,b,ow,oh} of pairs){
    let pt=overlapAt(a,b);if(!pt)continue;
    if(pt.x<0||pt.y<0||pt.x>W||pt.y>H){scrollToV(a);pt=overlapAt(a,b);if(!pt||pt.x<0||pt.y<0||pt.x>W||pt.y>H)continue;}
    const stack=document.elementsFromPoint(pt.x,pt.y);
    const ia=stack.findIndex(e=>e===a||a.contains(e)),ib=stack.findIndex(e=>e===b||b.contains(e));
    if(ia>=0&&ib>=0){
      const lo=Math.max(ia,ib),low=stack[lo];
      if(stack.slice(Math.min(ia,ib)+1,lo).some(e=>!e.contains(low)&&opaque(e)))continue;
    }else{
      // Only one is hit there: the other is covered — unless it just ignores the pointer.
      if(ia<0&&ib<0)continue;
      if(st(ia>=0?b:a).pointerEvents!=="none")continue;
    }
    flag("text overlaps text",a,{other:path(b),otherText:txt(b),box:[Math.round(ow),Math.round(oh)]});b.setAttribute("data-audit","1");
  }
  // 5b. A button or field that can't be tapped because something else on the page sits on it
  // (a sheet or dialog over the page, and bars the page scrolls under, are fine). Checked down the
  // page's main scroller, a screenful at a time.
  const controls=vis.filter(e=>e.matches("button,a[href],input,select,textarea,[data-nav],[data-load]")&&!e.closest("[data-audit]"));
  const sc=[...root.querySelectorAll("*")].filter(e=>{const s=st(e);return /(auto|scroll)/.test(s.overflowY)&&e.scrollHeight>e.clientHeight+10&&e.clientHeight>200;})
    .sort((a,b)=>b.clientHeight*b.clientWidth-a.clientHeight*a.clientWidth)[0];
  const stops=[0];if(sc)for(let y=sc.clientHeight*0.8;y<sc.scrollHeight-sc.clientHeight*0.2&&stops.length<8;y+=sc.clientHeight*0.8)stops.push(y);
  const was=sc?sc.scrollTop:0,hidden=new Set();
  for(const y of stops){
    if(sc){sc.scrollTop=y;}
    for(const el of controls){
      if(hidden.has(el))continue;
      const r=el.getBoundingClientRect(),x=r.left+r.width/2,yy=r.top+r.height/2;
      if(x<1||yy<1||x>W-1||yy>H-1||r.width<4||r.height<4)continue;
      // Only where it can be seen: inside every box around it that clips.
      let inView=true;
      for(let a=el.parentElement;a&&a!==document.documentElement;a=a.parentElement){
        const s=st(a);if(s.overflowX==="visible"&&s.overflowY==="visible")continue;
        const b=a.getBoundingClientRect();if(x<b.left+2||x>b.right-2||yy<b.top+2||yy>b.bottom-2){inView=false;break;}
      }
      if(!inView)continue;
      const top=document.elementFromPoint(x,yy);
      if(!top||top===el||el.contains(top)||top.contains(el))continue;
      let skip=false;
      for(let a=top;a&&a!==document.body;a=a.parentElement){const s=st(a);if(s.position==="fixed"||s.position==="sticky"||a.classList.contains("overlay")){skip=true;break;}}
      if(skip||st(top).pointerEvents==="none")continue;
      hidden.add(el);flag("control covered by another",el,{other:path(top),otherText:txt(top)});
    }
  }
  if(sc)sc.scrollTop=was;
  // 6. Words too faint to read against what's behind them (symbols like ✓ and · are left out).
  const rgb=c=>{const m=/rgba?\(([^)]+)\)/.exec(c);if(!m)return null;const p=m[1].split(",").map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
  const lum=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);};
  const bgOf=el=>{for(let e=el;e;e=e.parentElement){const s=st(e);if(s.backgroundImage!=="none")return null;const c=rgb(s.backgroundColor);if(c&&c.a>0.9)return c;}
    const b=rgb(st(document.body).backgroundColor);return b&&b.a>0.9?b:{r:255,g:255,b:255,a:1};};
  for(const el of vis){
    if(el.closest("svg")||el.disabled||el.closest("[disabled],[aria-disabled='true']"))continue;
    if(!textNodes(el).some(n=>(n.nodeValue.match(/[A-Za-z0-9]/g)||[]).length>=2))continue;
    const fg=rgb(st(el).color),bg=bgOf(el);if(!fg||!bg)continue;
    let op=fg.a;for(let e=el;e;e=e.parentElement)op*=+st(e).opacity;
    const mix={r:fg.r*op+bg.r*(1-op),g:fg.g*op+bg.g*(1-op),b:fg.b*op+bg.b*(1-op)};
    const L1=lum(mix),L2=lum(bg),ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    if(ratio<2)flag("text too faint",el,{box:[+ratio.toFixed(2)]});
  }
  return out;
});

// ── The screens ───────────────────────────────────────────────────────────────────────
// Each: an address, then taps (CSS selectors, clicked in order) to reach a sheet or a part.
// "@x" taps a made-up button carrying attribute x — the way the app hears a tap on a link it
// would otherwise reach from deep inside Learn.
// The planned day (two days on) and an empty one (three days on), with the calendar turned to
// their month, which at the end of a month is the next one.
const onDay=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d;};
const monthOf=d=>"state.calYear="+d.getFullYear()+";state.calMonth="+d.getMonth()+";";
const PLAN_DAY=onDay(2),EMPTY_DAY=onDay(3);
const SCREENS=[
  {name:"Today",hash:"#/"},
  {name:"Today · check-in",hash:"#/",taps:["#cistart"]},
  {name:"Train",hash:"#/log"},
  {name:"Train · exercise list",hash:"#/log",taps:["#opensheet"]},
  {name:"Train · editing a set",hash:"#/log",taps:[".cell.has"]},
  {name:"Train · keypad",hash:"#/log",taps:["[data-edit='weight']"],phoneOnly:true},
  {name:"Train · exercise history",hash:"#/log",taps:[".exbtn.active"]},
  {name:"Train · share menu",hash:"#/log",taps:["#sharebtn"]},
  {name:"History",hash:"#/history"},
  {name:"Calendar",hash:"#/calendar"},
  {name:"Calendar · planned day",hash:"#/calendar",prep:monthOf(PLAN_DAY),taps:["[data-calday='"+dayKey(PLAN_DAY.toISOString())+"']"]},
  {name:"Calendar · empty day",hash:"#/calendar",prep:monthOf(EMPTY_DAY),taps:["[data-newday='"+dayKey(EMPTY_DAY.toISOString())+"']"]},
  {name:"Progress",hash:"#/progress"},
  {name:"Body",hash:"#/body"},
  {name:"Settings",hash:"#/settings"},
  ...["display","logging","progression","workout","printing","recovery","modules","body","data","reminder","about"].map(k=>
    ({name:"Settings · "+k,hash:"#/settings",taps:["[data-setpart='"+k+"']"]})),
  {name:"Import",hash:"#/import"},
  {name:"Supplements",hash:"#/supplements"},
  {name:"Fuel",hash:"#/health",taps:["[data-health='fuel']"]},
  {name:"Markers",hash:"#/health",taps:["[data-health='markers']"]},
  {name:"Mind",hash:"#/health",taps:["[data-health='mind']"]},
  {name:"Year in review",hash:"#/review"},
  {name:"Plan",hash:"#/plan"},
  {name:"Learn",hash:"#/learn/training"},
  {name:"Learn · topic",hash:"#/learn/training",taps:["[data-learn]"]},
  {name:"Programme",hash:"#/learn/training",taps:["@data-progsetup=wendler","[data-progbegin]"]},
  {name:"Cardio",hash:"#/cardio"},
  {name:"Cardio · live",hash:"#/cardio",taps:["[data-cardioact='row']","[data-cardiostart]"],keep:true},
  {name:"Cardio · paused",hash:"#/cardio",taps:["[data-cardiopause]"],keep:true},
  {name:"Cardio · done",hash:"#/cardio",taps:["[data-cardiofinish]"],keep:true,after:["[data-cardiodiscard]","#dlgok"]},
  {name:"Train · workout done",hash:"#/log",taps:["#wtoggle","#wtoggle","#dlgok"]},
];

// In the page: close whatever is open, go to the address, tap through, and wait for the paint.
const RUNNER=String(async function show(hash,taps,keep,prep){
  const {state}=await import("/js/store.js"),raf=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  if(!keep){Object.assign(state,{sheet:false,adding:false,editing:null,dialog:null,summary:null,checkinDraft:null,planned:null,planDay:null,settingsPart:null,
    numEdit:null,exHist:false,exInfo:null,shareMenu:null,learnOpen:null,learnCat:null,learnIndex:null,progSetup:null,keysOpen:false,palette:null,best:null,undo:null});
    if(prep)new Function("state",prep)(state);
    history.replaceState(null,"",hash);dispatchEvent(new PopStateEvent("popstate"));
    await new Promise(r=>setTimeout(r,60));await raf();}
  for(const t of taps||[]){
    let el;
    if(t[0]==="@"){const [k,v]=t.slice(1).split("=");el=document.createElement("button");el.setAttribute(k,v);document.body.appendChild(el);el.click();el.remove();}
    else{
      el=[...document.querySelectorAll(t)].find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;});
      if(!el)return {missing:t};
      el.click();
    }
    await new Promise(r=>setTimeout(r,40));await raf();
  }
  const w=document.querySelector(".wrap.scroll");if(w&&!keep)w.scrollTop=0;
  return {ok:true};
});

const SIZES=[[320,640,true],[390,844,true],[430,932,true],[768,1024,false],[1024,768,false],[1440,900,false]];
const COMBOS=[];
for(const [w,h,phone] of SIZES)for(const scale of [0,1.25,1.9])COMBOS.push({w,h,phone,scale,theme:"light"});
for(const [w,h,phone] of SIZES.filter(s=>s[0]===390||s[0]===1440))for(const scale of [0,1.25,1.9])COMBOS.push({w,h,phone,scale,theme:"dark"});
const ONLY=process.env.KK_ONLY||"";
const label=c=>c.w+"×"+c.h+(c.phone?" phone":"")+", text "+(c.scale||"default")+", "+c.theme;

async function setDevice(c){
  await page.send("Emulation.setUserAgentOverride",{userAgent:c.phone?ANDROID_UA:defaultUA});
  await page.send("Emulation.setTouchEmulationEnabled",{enabled:!!c.phone,maxTouchPoints:c.phone?5:0});
}
async function auditHere(c,screen,bad){
  const errs=page.errors.splice(0);
  const found=await page.eval("return await ("+AUDIT+")("+c.w+");");
  errs.forEach(e=>found.unshift({kind:"page error",el:"",text:String(e).split("\n")[0]}));
  // KK_SHOTS="Train" keeps a picture of every matching screen, clean or not, to look over.
  const want=process.env.KK_SHOTS;
  if(!found.length){if(want&&screen.includes(want))console.log("[shot] "+await saveShot(page,screen+"_"+c.w+"x"+c.h+"_text"+(c.scale||0)+"_"+c.theme));return;}
  // The first offender in view for the picture.
  await page.eval("const e=document.querySelector('[data-audit]');if(e&&window.__scrollToV)window.__scrollToV(e);await new Promise(r=>requestAnimationFrame(r));return 1;");
  const shot=await saveShot(page,screen+"_"+c.w+"x"+c.h+"_text"+(c.scale||0)+"_"+c.theme);
  found.forEach(p=>bad.push("["+screen+" · "+label(c)+"] "+p.kind+": "+p.el+(p.text?" “"+p.text+"”":"")+(p.by?" (by "+p.by+")":"")+
    (p.other?" over "+p.other+" “"+p.otherText+"”":"")+(p.box?" "+JSON.stringify(p.box):"")+"\n    screenshot: "+shot));
}

describe("every screen at every size, text size and theme",{skip:!has&&"Chrome not found"},()=>{
  before(async()=>{srv=await serve();page=await launch({w:390,h:844,mobile:true});defaultUA=await page.eval("return navigator.userAgent;");});
  after(()=>{if(page)page.close();if(srv)srv.close();});

  test("the audit itself catches what it looks for, and passes a clean page",async()=>{
    await page.size(390,844,true);await page.nav(srv.url+"/__blank",150);
    const r=await page.eval(`
      document.head.innerHTML="<meta name='viewport' content='width=device-width,initial-scale=1'>";
      document.body.innerHTML="<style>body{font:16px sans-serif;overflow:hidden;height:100vh}#app{padding:10px}</style><div id='app'>"+
        "<div id='ok' style='width:200px'>Fine and well inside its box</div>"+
        "<div id='spill' style='width:60px;white-space:nowrap'>Spills out of a narrow box</div>"+
        "<div id='wide' style='width:520px;background:#eee'>Wider than the phone</div>"+
        "<div style='position:relative;height:40px'><span id='a' style='position:absolute;left:0;top:0'>Overlapping words</span><span id='b' style='position:absolute;left:10px;top:4px'>drawn twice</span></div>"+
        "<div style='position:relative;height:40px'><span style='position:absolute;left:0;top:0'>Hidden below</span><div style='position:absolute;inset:0;background:#fff'><span>Sheet on top</span></div></div>"+
        "<div id='num' style='width:30px;font:700 30px monospace;overflow-wrap:anywhere'>12345</div>"+
        "<div id='faint' style='color:#f4f4f4'>Barely there</div>"+
        "<div style='position:relative;height:40px'><button id='under'>Hidden button</button><div style='position:absolute;left:0;top:0;width:200px;height:40px;background:#ddd'></div></div>"+
        "<div style='width:80px;overflow:hidden;margin-left:20px'><div id='clipped' style='white-space:nowrap;display:inline-block'>This sentence is clipped by its box</div></div></div>";
      const out=await (${AUDIT})(390);return out.map(p=>p.kind+"|"+p.el);`);
    const has=(k,id)=>r.some(x=>x.startsWith(k+"|")&&x.endsWith(id));
    assert.ok(has("page scrolls sideways","html"),r.join("\n"));
    assert.ok(has("text overflows its box","div#spill"),r.join("\n"));
    assert.ok(has("sticks out of the screen","div#wide"),r.join("\n"));
    assert.ok(has("text overlaps text","span#a")||has("text overlaps text","span#b"),r.join("\n"));
    assert.ok(has("word broken over lines","div#num"),r.join("\n"));
    assert.ok(has("text too faint","div#faint"),r.join("\n"));
    assert.ok(has("text cut off by its box","div#clipped"),r.join("\n"));
    assert.ok(has("control covered by another","button#under"),r.join("\n"));
    assert.ok(!r.some(x=>/#ok\b/.test(x)),"flagged the clean box: "+r.join("\n"));
    assert.ok(!r.some(x=>/Hidden below|Sheet on top/.test(x)),"text under an opaque sheet isn't an overlap: "+r.join("\n"));
  });

  for(const c of COMBOS.filter(c=>label(c).includes(ONLY)))test(label(c),async()=>{
    const bad=[];
    await setDevice(c);
    await openApp(page,srv,seedDoc({settings:{textScale:c.scale,theme:c.theme}}),{w:c.w,h:c.h,mobile:c.phone});
    await page.eval("const s=document.createElement('style');s.textContent='[data-audit]{outline:2px solid #f0f!important;outline-offset:-1px}';document.head.appendChild(s);"+
      "await (await import('/js/lazy.js')).loadLearn();return 1;");
    for(const s of SCREENS){
      if(s.phoneOnly&&c.w>=900)continue;
      const r=await page.eval("return await ("+RUNNER+")("+JSON.stringify(s.hash)+","+JSON.stringify(s.taps||[])+","+!!s.keep+");");
      if(r.missing){bad.push("["+s.name+" · "+label(c)+"] couldn't reach it: nothing visible to tap matches "+r.missing+"\n    screenshot: "+await saveShot(page,s.name+"_unreachable_"+c.w+"x"+c.h+"_text"+(c.scale||0)+"_"+c.theme));continue;}
      await auditHere(c,s.name,bad);
      if(s.after)await page.eval("return await ("+RUNNER+")('',"+JSON.stringify(s.after)+",true);");
    }
    // A fresh install: the welcome screens, before any history.
    await openApp(page,srv,seedDoc({settings:{textScale:c.scale,theme:c.theme},mutate:d=>{d.welcomed=false;d.sessions=[];d.body=[];d.checkins=[];}}),{w:c.w,h:c.h,mobile:c.phone});
    for(let i=0;i<3;i++){
      if(!await page.eval("return !!document.querySelector('[data-welcome]');"))break;
      await auditHere(c,"Welcome "+(i+1),bad);
      const next=await page.eval("const b=document.querySelector(\"[data-welcome='next']\");if(!b)return false;b.click();await new Promise(r=>setTimeout(r,80));return true;");
      if(!next)break;
    }
    assert.deepEqual(bad,[],"\n"+bad.join("\n"));
  });
});
