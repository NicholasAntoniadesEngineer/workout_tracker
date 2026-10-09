// Muscles this week: a front-and-back anatomy figure, every muscle drawn and shaded by its own
// hard sets against its group's aim (or, switched to Recovery, by how recently it was worked),
// and the same numbers by group as a list underneath. A tap on a muscle or a group opens a
// close-up of that area as a pop-up, deep layer and sole of the foot included.
import {state} from "../store.js";
import {dateKey,exerciseGroup,nowISO} from "../model.js";
import {esc} from "./common.js";
import {AIM,MUSCLES,MUSCLE_NAME,PARTS,PART_GROUP,PART_NAME,PART_UNDER,contributors,exercisesFor,fatigueByMuscle,fatigueByPart,partsIn,recoveryWord,setsByMuscle,setsByPart} from "../muscles.js";
import {BACK,BACK_DEEP,FRONT,FRONT_DEEP,SKIN,SOLE,SOLE_DEEP,SOLE_SKIN} from "../anatomy.js";
import {GROUP_INFO,PART_INFO} from "../muscleinfo.js";

function weekStartMs(now){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return +d;}
const setsClass=(v,aim)=>v<=0?"m0":v<aim[0]?"m1":v<=aim[1]?"m2":"m3";
const recClass=f=>f>=0.6?"m2":f>=0.3?"m1":"m0";
const aimWord=(v,aim)=>v<aim[0]?"under the aim":v<=aim[1]?"on aim":"over the aim";
const sets1=v=>v+" set"+(v===1?"":"s");
// What's chosen: "g:chest" for a group, "p:pecupper" for one muscle.
function chosen(){
  const v=String(state.bmSel||""),k=v.slice(2);
  if(v.startsWith("g:")&&MUSCLE_NAME[k])return {group:k};
  if(v.startsWith("p:")&&PART_NAME[k])return {part:k,group:PART_GROUP[k]};
  return null;
}

function figure(list,label,cls,sel){
  // The chosen muscle (or all of the chosen group's), and for a deep one the muscle over it.
  const lit=k=>sel&&(sel.part?sel.part===k:PART_GROUP[k]===sel.group),over=k=>sel&&sel.part&&PART_UNDER[sel.part]===k;
  const half=SKIN.map(d=>"<path d='"+d+"' class='bmskin'/>").join("")+
    list.map(([k,d])=>"<path d='"+d+"' class='bmm "+cls[k]+(lit(k)?" sel":over(k)?" under":"")+"' data-muscle='p:"+k+"'><title>"+esc(PART_NAME[k])+"</title></path>").join("");
  return "<svg class='bmfig' viewBox='28 4 144 444' role='img' aria-label='"+label+" view'><g>"+half+"</g><g transform='matrix(-1 0 0 1 200 0)'>"+half+"</g>"+
    "<text x='100' y='446' class='bmlbl'>"+label.toUpperCase()+"</text></svg>";
}

export function bodyMapCard(){
  const now=Date.now(),mode=state.bmMode==="rec"?"rec":"sets",from=weekStartMs(now);
  const sets=setsByMuscle(state.sessions,from,now+1),fat=fatigueByMuscle(state.sessions,now);
  const psets=setsByPart(state.sessions,from,now+1),pfat=fatigueByPart(state.sessions,now);
  const cls={};PARTS.forEach(([k,,g])=>{cls[k]=mode==="rec"?recClass(pfat[k]):setsClass(psets[k],AIM[g]);});
  const sel=chosen();
  let h="<div class='card hcard bmcard'><div class='hcardh'><span class='llabel'>Muscles this week</span>"+
    "<div class='segc bmseg'><button class='"+(mode==="sets"?"on":"")+"' data-bmmode='sets'>Sets</button><button class='"+(mode==="rec"?"on":"")+"' data-bmmode='rec'>Recovery</button></div></div>"+
    "<div class='bmfigs'>"+figure(FRONT,"Front",cls,sel)+figure(BACK,"Back",cls,sel)+"</div>"+
    (mode==="rec"?"<div class='bmkey'><span><i class='m0'></i>ready</span><span><i class='m1'></i>partly recovered</span><span><i class='m2'></i>recovering</span></div>":
      "<div class='bmkey'><span><i class='m0'></i>none</span><span><i class='m1'></i>under aim</span><span><i class='m2'></i>on aim</span><span><i class='m3'></i>over aim</span></div>");
  // The groups as a list, upper body, core, lower body.
  const row=k=>{const v=sets[k],f=fat[k],a=AIM[k],on=sel&&!sel.part&&sel.group===k;
    return "<button class='sbrow bmrow"+(v>=a[0]?(v>a[1]?" over":" in"):" under")+(on?" sel":"")+"' data-muscle='g:"+k+"'><span class='sbname'>"+esc(MUSCLE_NAME[k])+"</span>"+
    "<span class='sbtrack'><span class='sbzone' style='left:"+(a[0]/25*100)+"%;width:"+((a[1]-a[0])/25*100)+"%'></span><span class='sbfill' style='width:"+Math.min(100,v/25*100)+"%'></span></span>"+
    "<span class='sbn mono'>"+v+"</span>"+(f>=0.6?"<span class='bmrec' title='Recovering'></span>":"<span class='bmrec none'></span>")+"</button>";};
  // Folded by region, each with a one-line summary, so the page stays short; a tap opens one.
  const regions=[["Upper body","upper"],["Core","core"],["Lower body","lower"]],open=state.bmOpen||{};
  h+="<div class='bmlist'>"+regions.map(([l,r])=>{
    const list=MUSCLES.filter(m=>m[2]===r).map(m=>m[0]),n=list.length,isOpen=!!open[r];
    const on=list.filter(k=>sets[k]>=AIM[k][0]&&sets[k]<=AIM[k][1]).length,over=list.filter(k=>sets[k]>AIM[k][1]).length,rec=list.filter(k=>fat[k]>=0.6).length;
    const part=list.filter(k=>fat[k]>=0.3&&fat[k]<0.6).length;
    const sum=mode==="rec"?([rec?rec+" recovering":"",part?part+" partly":""].filter(Boolean).join(" &middot; ")||"all "+n+" ready"):on+" of "+n+" on aim"+(over?" &middot; "+over+" over":"");
    // A dot a group, its colour its state, so the folded row still shows the picture.
    const dots=list.map(k=>"<i class='"+(mode==="rec"?recClass(fat[k]):setsClass(sets[k],AIM[k]))+"'></i>").join("");
    return "<button class='bmregion"+(isOpen?" open":"")+"' data-bmregion='"+r+"' aria-expanded='"+isOpen+"'><span class='bmrname'>"+l+"</span>"+
      "<span class='bmrdots' aria-hidden='true'>"+dots+"</span><span class='bmrsum'>"+sum+"</span><span class='bmrchev' aria-hidden='true'>&#8250;</span></button>"+
      (isOpen?"<div class='bmrrows'>"+list.map(row).join("")+"</div>":"");
  }).join("")+"</div>";
  return h+"</div>";
}

// ── The close-up: the chosen group's own area, front, back or sole, its muscles pulled a little
// apart from each other and numbered to match the list under it. A deep layer gets its own
// panel, with the muscles on top lifted away to dashed outlines.
const VIEWS=[["front","Front",SKIN,FRONT,FRONT_DEEP,1],["back","Back",SKIN,BACK,BACK_DEEP,1],["sole","Sole",SOLE_SKIN,SOLE,SOLE_DEEP,0]];
const nums=d=>d.match(/-?\d+(\.\d+)?/g).map(Number);
function box(d){const n=nums(d);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=0;i+1<n.length;i+=2){x0=Math.min(x0,n[i]);x1=Math.max(x1,n[i]);y0=Math.min(y0,n[i+1]);y1=Math.max(y1,n[i+1]);}return [x0,y0,x1,y1];}
const centre=d=>{const b=box(d);return [(b[0]+b[2])/2,(b[1]+b[3])/2];};
const r1=v=>Math.round(v*10)/10;
// The views to show: the one holding most of the group, then any holding a muscle not yet shown.
export function closeUps(g){
  const mine=l=>l.filter(([k])=>PART_GROUP[k]===g);
  const views=VIEWS.map(v=>({v,surf:mine(v[3]),deep:mine(v[4])})).map(x=>Object.assign(x,{ids:new Set(x.surf.concat(x.deep).map(p=>p[0]))}))
    .filter(x=>x.ids.size).sort((a,b)=>b.ids.size-a.ids.size);
  const out=[],seen=new Set();
  views.forEach(x=>{if(!out.length||[...x.ids].some(k=>!seen.has(k))){out.push(x);x.ids.forEach(k=>seen.add(k));}});
  return out;
}
// Today's lifting day, if there is one: where a suggested exercise goes.
export function todayWork(){
  const k=dateKey(nowISO());
  return state.sessions.filter(s=>!s.cardio&&dateKey(s.created)===k).sort((a,b)=>(b.created||"").localeCompare(a.created||""))[0]||null;
}
// Four exercises for a group or muscle from the exercise list, the most targeted first and the
// ones already done ahead of equals; ones it only helps in fill in when there are too few.
// Runs, rides and fighting drills only when they're already part of the training.
const SKILL=["Conditioning","Combat & skill"];
export function suggestions(id,part){
  const done={};state.sessions.forEach(s=>s.ex.forEach(e=>{if(e.sets.length){const k=e.name.trim().toLowerCase();done[k]=(done[k]||0)+1;}}));
  const removed=new Set((state.removed||[]).map(n=>n.trim().toLowerCase()));
  const names=state.catalog.filter(n=>{const k=n.trim().toLowerCase();return !removed.has(k)&&(done[k]||SKILL.indexOf(exerciseGroup(n))<0);});
  // Where two or more are picked as best for it, only those: a filler could contradict the advice.
  const info=part?PART_INFO[id]:GROUP_INFO[id],best=info?info[info.length-1]:[];
  const all=exercisesFor(id,part,names,done,best),picked=all.filter(x=>best.indexOf(x.name)>=0);
  return (picked.length>=2?picked:all).slice(0,4);
}
// The panels a group's close-up offers, in order: each view's surface, then its deep layer.
function panelsOf(g){
  const out=[];
  closeUps(g).forEach(({v,surf,deep})=>{
    const label=g==="feet"&&v[0]==="front"?"Top":v[1];
    if(surf.length)out.push({v,label,layer:"surface",list:surf,surf,deep});
    if(deep.length)out.push({v,label:label+" deep",layer:"deep",list:deep,surf,deep});
  });
  return out;
}
// The muscles in a panel, in the group's order: numbered 1, 2, 3… in that panel.
function panelOrder(g,P){const all=partsIn(g),ids=[];P.list.forEach(([p])=>{if(ids.indexOf(p)<0)ids.push(p);});return ids.sort((x,y)=>all.indexOf(x)-all.indexOf(y));}
// One panel drawn: the area cropped round the group's muscles (both layers, so switching layer
// keeps the frame), those muscles pulled apart and numbered, everything else faded.
function panelSVG(g,P,sel,cls){
  const [,,skin,surfAll,deepAll,mirror]=P.v,order=panelOrder(g,P);
  const spread=list=>{const cs=list.map(([,d])=>centre(d)),mx=cs.reduce((a,c)=>a+c[0],0)/cs.length,my=cs.reduce((a,c)=>a+c[1],0)/cs.length,k=list.length>1?0.5:0;
    return list.map(([p,d],i)=>[p,d,r1((cs[i][0]-mx)*k),r1((cs[i][1]-my)*k),cs[i]]);};
  const layers=[spread(P.surf),spread(P.deep)].filter(l=>l.length),list=P.layer==="deep"?spread(P.deep):spread(P.surf);
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  layers.forEach(l=>l.forEach(([,d,dx,dy])=>{const b=box(d);x0=Math.min(x0,b[0]+dx);y0=Math.min(y0,b[1]+dy);x1=Math.max(x1,b[2]+dx);y1=Math.max(y1,b[3]+dy);}));
  const big=Math.max(x1-x0,y1-y0),pad=Math.max(mirror?9:5,big*0.25),min=mirror?62:30;
  let w=Math.max(x1-x0+2*pad,min),hh=Math.max(y1-y0+2*pad,min);
  if(hh>w*1.8)w=hh/1.8;if(w>hh*1.4)hh=w/1.4;
  const vx=(x0+x1)/2-w/2,vy=(y0+y1)/2-hh/2,badge=Math.max(2.2,Math.min(w,hh)*0.055),font=badge*1.3;
  const skinH=skin.map(d=>"<path d='"+d+"' class='bmskin'/>").join("");
  // The muscles around it, faded, are taps too: one opens its own group here, so a look round
  // the body never needs the pop-up closed.
  const near=(p,d,c)=>"<path d='"+d+"' class='"+c+"' data-muscle='p:"+p+"'><title>"+esc(PART_NAME[p])+"</title></path>";
  const ghost=P.layer==="deep"?surfAll.map(([p,d])=>near(p,d,"bmlift")).join("")+deepAll.filter(([p])=>PART_GROUP[p]!==g).map(([p,d])=>near(p,d,"bmghost")).join("")
    :surfAll.filter(([p])=>PART_GROUP[p]!==g).map(([p,d])=>near(p,d,"bmghost")).join("");
  const mid={};list.forEach(([p,,dx,dy,c])=>{const m=mid[p]||(mid[p]={x:0,y:0,n:0});m.x+=c[0]+dx;m.y+=c[1]+dy;m.n++;});
  let body="",tags="";const spots=[];
  list.forEach(([p,d,dx,dy])=>{body+="<path d='"+d+"' transform='translate("+dx+" "+dy+")' class='bmm bmx "+cls(p)+(sel.part===p?" sel":"")+"' data-muscle='p:"+p+"'><title>"+esc(PART_NAME[p])+"</title></path>";});
  Object.keys(mid).forEach(p=>{let bx=mid[p].x/mid[p].n,by=mid[p].y/mid[p].n;
    for(let n=0;n<16&&spots.some(([x,y])=>Math.hypot(x-bx,y-by)<badge*2.1);n++){const a=n*2.4;bx+=Math.cos(a)*badge*1.3;by+=Math.sin(a)*badge*1.3;}
    spots.push([bx,by]);bx=r1(bx);by=r1(by);
    tags+="<g class='bmtag"+(sel.part===p?" on":"")+"' data-muscle='p:"+p+"'><circle cx='"+bx+"' cy='"+by+"' r='"+r1(badge)+"'/><text x='"+bx+"' y='"+r1(by+font*0.36)+"' font-size='"+r1(font)+"'>"+(order.indexOf(p)+1)+"</text></g>";});
  const other=mirror?"<g transform='matrix(-1 0 0 1 200 0)' class='bmfar'>"+skinH+surfAll.map(([p,d])=>near(p,d,P.layer==="deep"?"bmlift":"bmghost")).join("")+"</g>":"";
  // data-board: the whole board, so dragging the view stays on the body.
  return "<svg class='bmxsvg' viewBox='"+r1(vx)+" "+r1(vy)+" "+r1(w)+" "+r1(hh)+"' data-board='"+(mirror?"0 0 200 440":"0 0 60 132")+"' role='img' aria-label='"+esc(MUSCLE_NAME[g]+", "+P.label)+"'>"+other+"<g>"+skinH+ghost+body+tags+"</g></svg>";
}
// The chosen area as a pop-up over the page: its views as tabs, one drawing at a time, the
// muscles in that drawing numbered underneath, and what trained the chosen one this week.
export function bodyMapPop(){
  const sel=state.view==="progress"?chosen():null;
  if(!sel)return "";
  const now=Date.now(),from=weekStartMs(now),g=sel.group,a=AIM[g],mode=state.bmMode==="rec"?"rec":"sets";
  const sets=setsByMuscle(state.sessions,from,now+1),fat=fatigueByMuscle(state.sessions,now);
  const psets=setsByPart(state.sessions,from,now+1),pfat=fatigueByPart(state.sessions,now);
  const cls=k=>mode==="rec"?recClass(pfat[k]):setsClass(psets[k],AIM[g]);
  const panels=panelsOf(g);
  // The tab asked for, or the first that holds the chosen muscle.
  let pi=Math.min(Math.max(0,+state.bmPanel||0),panels.length-1);
  if(sel.part&&!panels[pi].list.some(x=>x[0]===sel.part))pi=Math.max(0,panels.findIndex(P=>P.list.some(x=>x[0]===sel.part)));
  const P=panels[pi];
  const v=sel.part?psets[sel.part]:sets[g],f=sel.part?pfat[sel.part]:fat[g];
  const where=sel.part&&PART_UNDER[sel.part]?"under the "+esc(PART_NAME[PART_UNDER[sel.part]].toLowerCase())+" &middot; ":"";
  const sub=(sel.part?esc(PART_NAME[sel.part])+" &middot; "+where:"")+sets1(v)+" &middot; "+aimWord(v,a)+" ("+a[0]+"–"+a[1]+") &middot; "+recoveryWord(f);
  const c=contributors(state.sessions,sel.part||g,from,now+1,!!sel.part);
  const ids=panelOrder(g,P),order=ids;
  let h="<div class='overlay bmpop' id='bmback'><div class='sheet bmsheet' role='dialog' aria-label='"+esc(MUSCLE_NAME[g])+"'>"+
    "<div class='sheethead'><div class='bmpoph'><b>"+esc(MUSCLE_NAME[g])+"</b><span>"+sub+"</span></div><button class='hmore bmclose' id='bmclose' aria-label='Close'>&times;</button></div>"+
    "<div class='sheetbody'>";
  if(panels.length>1)h+="<div class='segc bmtabs'>"+panels.map((Q,i)=>"<button class='"+(i===pi?"on":"")+"' data-bmpanel='"+i+"' data-bmgroup='"+g+"'>"+esc(Q.label)+"</button>").join("")+"</div>";
  h+="<div class='bmxwrap'>"+panelSVG(g,P,sel,cls)+"<div class='bmhint'>Drag to look around &middot; tap any muscle</div></div>";
  h+="<div class='bmleg'>"+ids.map(p=>"<button class='bmlrow"+(sel.part===p?" on":"")+"' data-muscle='p:"+p+"'><i class='bmnum'>"+(order.indexOf(p)+1)+"</i><span>"+esc(PART_NAME[p])+"</span><b class='mono'>"+psets[p]+"</b></button>").join("")+"</div>";
  if(c.length)h+="<div class='bmfrom'>This week: "+c.slice(0,4).map(([n,x])=>esc(n)+" "+x).join(" &middot; ")+"</div>";
  // Exercises for it: tap to put one in today's workout; one already there opens it on Train.
  const today=todayWork(),inToday=n=>!!today&&today.ex.some(e=>e.name.trim().toLowerCase()===n.trim().toLowerCase());
  const sug=suggestions(sel.part||g,!!sel.part);
  // What it does and what trains it, a line each; then the exercises, each saying how.
  const info=sel.part?PART_INFO[sel.part]:GROUP_INFO[g];
  const ROLE={isolates:"isolates it",main:"main mover",helps:"helps"};
  h+="<div class='bmtrain'>"+(info?(sel.part?"<p class='bminfo'><b>Does</b> "+esc(info[0])+"</p>":"")+"<p class='bminfo'><b>Train</b> "+esc(info[sel.part?1:0])+"</p>":"");
  if(sug.length)h+="<div class='bmsug'>"+sug.map(x=>inToday(x.name)?
    "<button class='bmsg in' data-bmgo='"+esc(x.name)+"'><i aria-hidden='true'>&#10003;</i><span><b>"+esc(x.name)+"</b><small>in today's workout</small></span></button>":
    "<button class='bmsg' data-bmadd='"+esc(x.name)+"' aria-label='Add "+esc(x.name)+" to today'><i aria-hidden='true'>+</i><span><b>"+esc(x.name)+"</b><small>"+ROLE[x.role]+"</small></span></button>").join("")+"</div>";
  h+="</div>";
  return h+"</div></div></div>";
}
