// Muscles this week: a front-and-back anatomy figure, every muscle drawn and shaded by its own
// hard sets against its group's aim (or, switched to Recovery, by how recently it was worked).
// A tap on a muscle names it and says what trained it; a tap on a group lists all its muscles,
// the deep ones the figure can't show included. The same numbers as a list underneath.
import {state} from "../store.js";
import {esc} from "./common.js";
import {AIM,MUSCLES,MUSCLE_NAME,PARTS,PART_DEEP,PART_GROUP,PART_NAME,PART_UNDER,contributors,fatigueByMuscle,fatigueByPart,partsIn,recoveryWord,setsByMuscle,setsByPart} from "../muscles.js";
import {BACK,FRONT,SKIN} from "../anatomy.js";

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
  const under=sel.part&&PART_UNDER[sel.part]?"deep, under the "+esc(PART_NAME[PART_UNDER[sel.part]].toLowerCase())+" &middot; ":sel.part&&PART_DEEP[sel.part]?"deep &middot; ":"";
  const sub=(sel.part?esc(MUSCLE_NAME[g])+" &middot; "+under:"")+sets1(v)+" &middot; "+aimWord(v,a)+" ("+a[0]+"–"+a[1]+") &middot; "+recoveryWord(f);
  const c=contributors(state.sessions,sel.part||g,from,now+1,!!sel.part);
  const parts=partsIn(g);
  let h="<div class='bmsel'><div class='bmselh'><b>"+esc(title)+"</b><span>"+sub+"</span><button class='hmore' data-muscle='' aria-label='Close'>&times;</button></div>";
  if(parts.length>1)h+="<div class='bmparts'>"+parts.map(p=>"<button class='bmpart"+(sel.part===p?" on":"")+"' data-muscle='p:"+p+"'>"+esc(PART_NAME[p])+
    (PART_DEEP[p]?" <em>deep</em>":"")+" <b class='mono'>"+psets[p]+"</b></button>").join("")+"</div>";
  h+=c.length?"<div class='bmselx'>"+c.slice(0,6).map(([n,s])=>esc(n)+" "+s).join(" &middot; ")+"</div>":"<div class='bmselx'>Nothing for it yet this week.</div>";
  return h+"</div>";
}
