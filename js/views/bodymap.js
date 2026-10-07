// Muscles this week: a plain front-and-back figure, each muscle shaded by its hard sets against
// the 10–20 aim (or, switched to Recovery, by how recently it was worked), a tap for the detail,
// and the same numbers as a list underneath. Neutral shapes, no anatomy realism, no gender.
import {state} from "../store.js";
import {esc} from "./common.js";
import {MUSCLES,MUSCLE_NAME,contributors,fatigueByMuscle,recoveryWord,setsByMuscle} from "../muscles.js";

const AIM_LOW=10,AIM_HIGH=20;
function weekStartMs(now){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return +d;}
const setsClass=v=>v<=0?"m0":v<AIM_LOW?"m1":v<=AIM_HIGH?"m2":"m3";
const recClass=f=>f>=0.6?"m2":f>=0.3?"m1":"m0";

// Shapes on a 150 × 300 board; a muscle can have several (left and right).
const FRONT=[["frontdelt","M32 52 Q40 44 50 50 L48 70 Q36 70 32 60 Z"],["frontdelt","M118 52 Q110 44 100 50 L102 70 Q114 70 118 60 Z"],
  ["chest","M50 50 Q75 44 100 50 L99 74 Q75 82 51 74 Z"],
  ["biceps","M30 64 Q38 70 46 72 L44 106 Q34 106 30 96 Z"],["biceps","M120 64 Q112 70 104 72 L106 106 Q116 106 120 96 Z"],
  ["forearms","M30 110 L44 110 L42 146 L32 146 Z"],["forearms","M120 110 L106 110 L108 146 L118 146 Z"],
  ["abs","M58 80 L92 80 L90 128 Q75 134 60 128 Z"],
  ["sidedelt","M28 56 Q30 50 34 50 L32 64 Q28 62 28 56 Z"],["sidedelt","M122 56 Q120 50 116 50 L118 64 Q122 62 122 56 Z"],
  ["quads","M52 136 Q64 132 74 138 L72 206 Q60 210 54 204 Z"],["quads","M98 136 Q86 132 76 138 L78 206 Q90 210 96 204 Z"],
  ["adductors","M66 142 L74 142 L72 178 Z"],["adductors","M84 142 L76 142 L78 178 Z"],
  ["calves","M56 214 L70 214 L68 270 L58 270 Z"],["calves","M94 214 L80 214 L82 270 L92 270 Z"]];
const BACK=[["upperback","M56 46 Q75 38 94 46 L98 62 L94 84 L56 84 L52 62 Z"],
  ["reardelt","M32 52 Q40 44 50 50 L48 70 Q36 70 32 60 Z"],["reardelt","M118 52 Q110 44 100 50 L102 70 Q114 70 118 60 Z"],
  ["lats","M50 84 L72 86 L68 120 L54 112 Z"],["lats","M100 84 L78 86 L82 120 L96 112 Z"],
  ["lowerback","M64 112 L86 112 L86 130 L64 130 Z"],
  ["triceps","M30 64 Q38 70 46 72 L44 106 Q34 106 30 96 Z"],["triceps","M120 64 Q112 70 104 72 L106 106 Q116 106 120 96 Z"],
  ["forearms","M30 110 L44 110 L42 146 L32 146 Z"],["forearms","M120 110 L106 110 L108 146 L118 146 Z"],
  ["glutes","M52 134 Q64 128 75 136 L74 160 Q60 166 52 156 Z"],["glutes","M98 134 Q86 128 75 136 L76 160 Q90 166 98 156 Z"],
  ["hamstrings","M53 164 L72 166 L70 208 L56 206 Z"],["hamstrings","M97 164 L78 166 L80 208 L94 206 Z"],
  ["calves","M56 214 L70 214 L68 270 L58 270 Z"],["calves","M94 214 L80 214 L82 270 L92 270 Z"]];

function figure(shapes,label,cls,sel){
  let g="<svg class='bmfig' viewBox='0 0 150 300' role='img' aria-label='"+label+" view'><circle cx='75' cy='22' r='15' class='bmhead'/><rect x='67' y='36' width='16' height='10' rx='4' class='bmhead'/>";
  shapes.forEach(([k,d])=>{g+="<path d='"+d+"' class='bmm "+cls[k]+(sel===k?" sel":"")+"' data-muscle='"+k+"'><title>"+esc(MUSCLE_NAME[k])+"</title></path>";});
  return g+"<text x='75' y='294' class='bmlbl'>"+label.toUpperCase()+"</text></svg>";
}

export function bodyMapCard(){
  const now=Date.now(),mode=state.bmMode==="rec"?"rec":"sets";
  const from=weekStartMs(now),sets=setsByMuscle(state.sessions,from,now+1),fat=fatigueByMuscle(state.sessions,now);
  const cls={};MUSCLES.forEach(([k])=>{cls[k]=mode==="rec"?recClass(fat[k]):setsClass(sets[k]);});
  const sel=MUSCLE_NAME[state.bmSel]?state.bmSel:"";
  let h="<div class='card hcard bmcard'><div class='hcardh'><span class='llabel'>Muscles this week</span>"+
    "<div class='segc bmseg'><button class='"+(mode==="sets"?"on":"")+"' data-bmmode='sets'>Sets</button><button class='"+(mode==="rec"?"on":"")+"' data-bmmode='rec'>Recovery</button></div></div>"+
    "<div class='bmfigs'>"+figure(FRONT,"Front",cls,sel)+figure(BACK,"Back",cls,sel)+"</div>"+
    (mode==="rec"?"<div class='bmkey'><span><i class='m0'></i>ready</span><span><i class='m1'></i>partly recovered</span><span><i class='m2'></i>recovering</span></div>":
      "<div class='bmkey'><span><i class='m0'></i>none</span><span><i class='m1'></i>under 10</span><span><i class='m2'></i>10–20</span><span><i class='m3'></i>over 20</span></div>");
  // The tapped muscle, with what gave it its sets.
  if(sel){
    const c=contributors(state.sessions,sel,from,now+1),v=sets[sel];
    h+="<div class='bmsel'><div class='bmselh'><b>"+esc(MUSCLE_NAME[sel])+"</b><span>"+v+" set"+(v===1?"":"s")+" &middot; "+(v<AIM_LOW?"under the aim":v<=AIM_HIGH?"on aim":"over the aim")+" &middot; "+recoveryWord(fat[sel])+"</span>"+
      "<button class='hmore' data-muscle=''>&times;</button></div>"+
      (c.length?"<div class='bmselx'>"+c.slice(0,5).map(([n,s])=>esc(n)+" "+s).join(" &middot; ")+"</div>":"<div class='bmselx'>Nothing for it yet this week.</div>")+"</div>";
  }
  // The same numbers as a list, upper body then lower.
  const row=k=>{const v=sets[k],f=fat[k];return "<button class='sbrow bmrow"+(v>=AIM_LOW?(v>AIM_HIGH?" over":" in"):" under")+(sel===k?" sel":"")+"' data-muscle='"+k+"'><span class='sbname'>"+esc(MUSCLE_NAME[k])+"</span>"+
    "<span class='sbtrack'><span class='sbzone' style='left:"+(AIM_LOW/25*100)+"%;width:"+((AIM_HIGH-AIM_LOW)/25*100)+"%'></span><span class='sbfill' style='width:"+Math.min(100,v/25*100)+"%'></span></span>"+
    "<span class='sbn mono'>"+v+"</span>"+(f>=0.6?"<span class='bmrec' title='Recovering'></span>":"<span class='bmrec none'></span>")+"</button>";};
  const groups=[["Upper body","upper"],["Core","core"],["Lower body","lower"]];
  h+="<div class='bmlist'>"+groups.map(([l,g])=>"<div class='recgroup bmgroup'>"+l+"</div>"+MUSCLES.filter(m=>m[2]===g).map(m=>row(m[0])).join("")).join("")+"</div>";
  return h+"</div>";
}
