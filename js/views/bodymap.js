// Muscles this week: a front-and-back anatomy figure, every muscle drawn and shaded by its own
// hard sets against its group's aim (or, switched to Recovery, by how recently it was worked).
// A tap on a muscle names it and says what trained it; a tap on a group lists all its muscles,
// the deep ones the figure can't show included. The same numbers as a list underneath.
import {state} from "../store.js";
import {esc} from "./common.js";
import {AIM,MUSCLES,MUSCLE_NAME,PARTS,PART_DEEP,PART_GROUP,PART_NAME,PART_SOLE,PART_UNDER,contributors,fatigueByMuscle,fatigueByPart,partsIn,recoveryWord,setsByMuscle,setsByPart} from "../muscles.js";
import {BACK,BACK_DEEP,FRONT,FRONT_DEEP,SKIN,SOLE,SOLE_DEEP,SOLE_SKIN} from "../anatomy.js";

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
  if(sel)h+=detail(sel,sets,fat,psets,pfat,from,now);
  // The groups as a list, upper body, core, lower body.
  const row=k=>{const v=sets[k],f=fat[k],a=AIM[k],on=sel&&!sel.part&&sel.group===k;
    return "<button class='sbrow bmrow"+(v>=a[0]?(v>a[1]?" over":" in"):" under")+(on?" sel":"")+"' data-muscle='g:"+k+"'><span class='sbname'>"+esc(MUSCLE_NAME[k])+"</span>"+
    "<span class='sbtrack'><span class='sbzone' style='left:"+(a[0]/25*100)+"%;width:"+((a[1]-a[0])/25*100)+"%'></span><span class='sbfill' style='width:"+Math.min(100,v/25*100)+"%'></span></span>"+
    "<span class='sbn mono'>"+v+"</span>"+(f>=0.6?"<span class='bmrec' title='Recovering'></span>":"<span class='bmrec none'></span>")+"</button>";};
  const regions=[["Upper body","upper"],["Core","core"],["Lower body","lower"]];
  h+="<div class='bmlist'>"+regions.map(([l,g])=>"<div class='recgroup bmgroup'>"+l+"</div>"+MUSCLES.filter(m=>m[2]===g).map(m=>row(m[0])).join("")).join("")+"</div>";
  return h+"</div>";
}

// The chosen group or muscle: its sets against the aim, how recovered, every muscle in the
// group (deep ones marked), and the exercises that gave the sets.
function detail(sel,sets,fat,psets,pfat,from,now){
  const g=sel.group,a=AIM[g];
  const v=sel.part?psets[sel.part]:sets[g],f=sel.part?pfat[sel.part]:fat[g];
  const title=sel.part?PART_NAME[sel.part]:MUSCLE_NAME[g];
  const under=sel.part&&PART_UNDER[sel.part]?"deep, under the "+esc(PART_NAME[PART_UNDER[sel.part]].toLowerCase())+" &middot; ":
    sel.part&&PART_SOLE[sel.part]?"sole of the foot &middot; ":sel.part&&PART_DEEP[sel.part]?"deep &middot; ":"";
  const sub=(sel.part?esc(MUSCLE_NAME[g])+" &middot; "+under:"")+sets1(v)+" &middot; "+aimWord(v,a)+" ("+a[0]+"–"+a[1]+") &middot; "+recoveryWord(f);
  const c=contributors(state.sessions,sel.part||g,from,now+1,!!sel.part);
  const parts=partsIn(g);
  let h="<div class='bmsel'><div class='bmselh'><b>"+esc(title)+"</b><span>"+sub+"</span><button class='hmore' data-muscle='' aria-label='Close'>&times;</button></div>";
  h+=exploded(g,sel,psets,pfat);
  h+="<div class='bmparts'>"+parts.map((p,i)=>"<button class='bmpart"+(sel.part===p?" on":"")+"' data-muscle='p:"+p+"'><i class='bmnum'>"+(i+1)+"</i>"+esc(PART_NAME[p])+
    (PART_SOLE[p]?" <em>sole</em>":PART_DEEP[p]?" <em>deep</em>":"")+" <b class='mono'>"+psets[p]+"</b></button>").join("")+"</div>";
  h+=c.length?"<div class='bmselx'>"+c.slice(0,6).map(([n,s])=>esc(n)+" "+s).join(" &middot; ")+"</div>":"<div class='bmselx'>Nothing for it yet this week.</div>";
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
function exploded(g,sel,psets,pfat){
  const order=partsIn(g),mode=state.bmMode==="rec"?"rec":"sets";
  const cls=k=>mode==="rec"?recClass(pfat[k]):setsClass(psets[k],AIM[g]);
  // Pulled apart from the middle of the group's muscles in a panel: [part, path, dx, dy, centre].
  const spread=list=>{if(!list.length)return [];const cs=list.map(([,d])=>centre(d)),mx=cs.reduce((a,c)=>a+c[0],0)/cs.length,my=cs.reduce((a,c)=>a+c[1],0)/cs.length,k=list.length>1?0.5:0;
    return list.map(([p,d],i)=>[p,d,r1((cs[i][0]-mx)*k),r1((cs[i][1]-my)*k),cs[i]]);};
  let h="";
  closeUps(g).forEach(({v,surf,deep})=>{
    const [,label,skin,surfAll,deepAll,mirror]=v,layers=[["surface",spread(surf)],["deep",spread(deep)]].filter(l=>l[1].length);
    // The crop: everything of the group in this view as it's drawn, pulled apart, with room around it.
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    layers.forEach(([,l])=>l.forEach(([,d,dx,dy])=>{const b=box(d);x0=Math.min(x0,b[0]+dx);y0=Math.min(y0,b[1]+dy);x1=Math.max(x1,b[2]+dx);y1=Math.max(y1,b[3]+dy);}));
    const big=Math.max(x1-x0,y1-y0),pad=Math.max(mirror?9:5,big*0.25),min=mirror?62:30;
    let w=Math.max(x1-x0+2*pad,min),hh=Math.max(y1-y0+2*pad,min);
    if(hh>w*2.2)w=hh/2.2;
    const vx=(x0+x1)/2-w/2,vy=(y0+y1)/2-hh/2;
    const badge=Math.max(2.2,Math.min(w,hh)*0.06),font=badge*1.3;
    const skinH=skin.map(d=>"<path d='"+d+"' class='bmskin'/>").join("");
    layers.forEach(([layer,list])=>{
      const ghost=layer==="deep"?surfAll.map(([,d])=>"<path d='"+d+"' class='bmlift'/>").join("")+deepAll.filter(([p])=>PART_GROUP[p]!==g).map(([,d])=>"<path d='"+d+"' class='bmghost'/>").join("")
        :surfAll.filter(([p])=>PART_GROUP[p]!==g).map(([,d])=>"<path d='"+d+"' class='bmghost'/>").join("");
      // Each muscle's number in the middle of all its shapes (four slips make one lumbricals),
      // nudged clear of any number already placed.
      const mid={};list.forEach(([p,,dx,dy,c])=>{const m=mid[p]||(mid[p]={x:0,y:0,n:0});m.x+=c[0]+dx;m.y+=c[1]+dy;m.n++;});
      let body="",tags="";const spots=[];
      list.forEach(([p,d,dx,dy])=>{body+="<path d='"+d+"' transform='translate("+dx+" "+dy+")' class='bmm bmx "+cls(p)+(sel.part===p?" sel":"")+"' data-muscle='p:"+p+"'><title>"+esc(PART_NAME[p])+"</title></path>";});
      Object.keys(mid).forEach(p=>{let bx=mid[p].x/mid[p].n,by=mid[p].y/mid[p].n;
        for(let n=0;n<16&&spots.some(([x,y])=>Math.hypot(x-bx,y-by)<badge*2.1);n++){const a=n*2.4;bx+=Math.cos(a)*badge*1.3;by+=Math.sin(a)*badge*1.3;}
        spots.push([bx,by]);bx=r1(bx);by=r1(by);
        tags+="<g class='bmtag' data-muscle='p:"+p+"'><circle cx='"+bx+"' cy='"+by+"' r='"+r1(badge)+"'/><text x='"+bx+"' y='"+r1(by+font*0.36)+"' font-size='"+r1(font)+"'>"+(order.indexOf(p)+1)+"</text></g>";});
      const other=mirror?"<g transform='matrix(-1 0 0 1 200 0)' class='bmfar'>"+skinH+surfAll.map(([,d])=>"<path d='"+d+"' class='"+(layer==="deep"?"bmlift":"bmghost")+"'/>").join("")+"</g>":"";
      h+="<figure class='bmxp'><svg viewBox='"+r1(vx)+" "+r1(vy)+" "+r1(w)+" "+r1(hh)+"' style='aspect-ratio:"+r1(w)+"/"+r1(hh)+"' role='img' aria-label='"+esc(MUSCLE_NAME[g]+", "+label+(layer==="deep"?", deep":""))+"'>"+
        other+"<g>"+skinH+ghost+body+tags+"</g></svg><figcaption>"+label+(layer==="deep"?" &middot; deep":"")+"</figcaption></figure>";
    });
  });
  return h?"<div class='bmxs'>"+h+"</div>":"";
}
