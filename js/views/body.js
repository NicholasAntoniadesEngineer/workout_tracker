// Body: weight and a few girths, one entry per day, with the weight drawn as a trend.
// Girths follow the weight unit — centimetres alongside kg, inches alongside lb.
import {dateKey,nowISO,shortDate} from "../model.js";
import {state} from "../store.js";
import {lineChart,withAxis} from "../charts.js";
import {esc,pageHead,wide} from "./common.js";
import {icon} from "../icons.js";
import {bodyFatRange,bpBand,navyBodyFat} from "../body.js";

// Progress photos, kept on this device, newest first; two can be put side by side.
function photosCard(day){
  const ph=state.photos.slice().reverse(),cmp=state.photoCompare||[];
  let h="<div class='card chartcard'><div class='hcardh'><span class='llabel'>Progress photos</span>"+
    "<label class='btn ghost tiny photoadd'>"+icon("photo","sm")+"Add<input type='file' id='bodyphoto' accept='image/*' hidden></label></div>";
  if(!ph.length)return h+"<div class='empty-note'>Same spot, same light, same pose. They stay on this device and go into your backup.</div></div>";
  if(cmp.length===2){const a=state.photos.find(p=>p.id===cmp[0]),b=state.photos.find(p=>p.id===cmp[1]);
    if(a&&b)h+="<div class='photocmp'>"+[a,b].map(p=>"<figure><img src='"+p.data+"' alt=''><figcaption>"+esc(shortDate(p.at))+"</figcaption></figure>").join("")+"</div>";}
  h+="<div class='photogrid'>"+ph.map(p=>"<button class='photo"+(cmp.indexOf(p.id)>=0?" on":"")+"' data-photo='"+p.id+"' title='Tap two to compare'><img src='"+p.data+"' alt='Progress photo, "+esc(shortDate(p.at))+"'><span>"+esc(shortDate(p.at))+"</span>"+
    "<i class='x' data-delphoto='"+p.id+"' title='Delete'>&times;</i></button>").join("")+"</div>";
  return h+"<p class='pnote'>Tap two photos to see them side by side.</p></div>";
}

const GIRTHS=[["waist","Waist"],["chest","Chest"],["arm","Arm"],["neck","Neck"],["hip","Hip"],["thigh","Thigh"]];
const toCm=(v,unit)=>unit==="lb"?v*2.54:v;

export function bodyView(){
  const unit=esc(state.settings.unit||"kg");
  const girthUnit=unit==="lb"?"in":"cm";
  const list=state.body.slice().reverse();
  // The form logs any day: today unless another date is picked, and that day's entry fills it.
  const day=state.bodyDate||dateKey(nowISO());
  const today=state.body.find(b=>dateKey(b.at)===day);

  // A big screen puts logging and the trend on the left and the entries beside them.
  const big=wide();
  let h="<div class='wrap scroll"+(big?" bodywide":"")+"'>"+pageHead("Body")+(big?"<div class='bodygrid'><div class='bodyl'>":"");
  // What you take sits with what you weigh: products, photos and your stacks.
  h+="<button class='card supslink' id='opensupps'><span class='sl-t'>Supplements &amp; stacks</span>"+
    "<span class='sl-s'>"+state.supplements.length+" products &middot; "+state.stacks.length+" stacks</span>"+
    "<span class='lchev'>&rsaquo;</span></button>";

  const more=!!state.bodyMore;
  h+="<div class='card chartcard'><div class='bodydate'><label>Day <input type='date' id='bodydate' value='"+day+"' max='"+dateKey(nowISO())+"'></label>"+
    "<button class='hmore' id='bodymore'>"+(more?"Fewer fields":"More fields")+"</button></div>"+
    "<div class='bodyform'>"+
    "<label class='timefield'><span>Weight ("+unit+")</span>"+
      "<input class='timein mono' id='bodyw' inputmode='decimal' value='"+
      (today&&today.w?today.w:"")+"'></label>";
  GIRTHS.slice(0,more?GIRTHS.length:3).forEach(g=>{
    const v=today&&today[g[0]]?today[g[0]]:"";
    h+="<label class='timefield'><span>"+g[1]+" ("+girthUnit+")</span>"+
      "<input class='timein mono' id='body_"+g[0]+"' inputmode='decimal' value='"+v+"'></label>";
  });
  if(more)h+="<label class='timefield'><span>Blood pressure</span><span class='bpin'><input class='timein mono' id='body_sys' inputmode='numeric' placeholder='120' value='"+(today&&today.sys?today.sys:"")+"'>/"+
      "<input class='timein mono' id='body_dia' inputmode='numeric' placeholder='80' value='"+(today&&today.dia?today.dia:"")+"'></span></label>"+
    "<label class='timefield'><span>Resting pulse</span><input class='timein mono' id='body_pulse' inputmode='numeric' value='"+(today&&today.pulse?today.pulse:"")+"'></label>";
  h+="</div>";
  // Body fat from the tape, as a range, once neck and waist (and hip for women) are in.
  const bf=today?navyBodyFat(state.settings.sex,state.settings.heightCm,toCm(today.waist,unit),toCm(today.neck,unit),toCm(today.hip,unit)):null;
  if(today&&(today.neck||today.sys)){
    h+="<div class='bodyderived'>"+(bf!=null?"<span><b>Body fat about "+bodyFatRange(bf)+"</b> by the US Navy tape method; a lab reading can differ by 3–4 points.</span>":
      today.neck?"<span>Set your height"+(state.settings.sex?"":" and sex")+" in Settings to estimate body fat from the tape.</span>":"")+
      (today.sys?"<span>Blood pressure "+today.sys+"/"+today.dia+": "+bpBand(today.sys,today.dia)+".</span>":"")+"</div>";
  }
  h+="<button class='btn primary bodysave' id='bodysave'>"+(today?"Update":"Log")+(day===dateKey(nowISO())?" today":" "+shortDate(day+"T12:00:00"))+"</button></div>";
  h+=photosCard(day);

  // Any measure can be charted, not just weight — pick it above the line.
  const metrics=[["w","Weight",unit]].concat(GIRTHS.map(g=>[g[0],g[1],girthUnit])).concat([["pulse","Pulse","bpm"],["sys","Systolic","mmHg"]])
    .filter(m=>state.body.filter(b=>b[m[0]]).length>1);
  if(metrics.length){
    const met=metrics.find(m=>m[0]===state.bodyMetric)||metrics[0];
    const pts=state.body.filter(b=>b[met[0]]).slice(-12);
    const vs=pts.map(p=>p[met[0]]);
    const delta=Math.round((vs[vs.length-1]-vs[0])*10)/10;
    h+="<div class='setgroup'>Trend</div><div class='card chartcard'>";
    if(metrics.length>1){
      h+="<div class='seg bodymet'>"+metrics.map(m=>"<button class='q"+(m===met?" on":"")+
        "' data-bodymet='"+m[0]+"'>"+m[1]+"</button>").join("")+"</div>";
    }
    h+=withAxis(lineChart(vs,big?{w:640,h:200,labels:pts.map(p=>shortDate(p.at)+": "+p[met[0]])}:undefined),Math.max(...vs),Math.min(...vs))+
      "<div class='chartlbls'><span>"+esc(shortDate(pts[0].at))+"</span>"+
      "<span>"+met[1].toLowerCase()+" now "+vs[vs.length-1]+met[2]+
        (delta?" ("+(delta>0?"+":"")+delta+")":"")+"</span>"+
      "<span>"+esc(shortDate(pts[pts.length-1].at))+"</span></div></div>";
  }

  if(big)h+="</div><div class='bodyr'>";
  if(list.length){
    h+="<div class='setgroup'>Entries</div><div class='card'>";
    list.forEach(b=>{
      const parts=[];
      if(b.w)parts.push(b.w+unit);
      GIRTHS.forEach(g=>{if(b[g[0]])parts.push(g[1].toLowerCase()+" "+b[g[0]]+girthUnit);});
      // Values wrap under the date rather than being cut off at the edge.
      h+="<div class='histrow bodyrow'><span class='histdate'>"+esc(shortDate(b.at))+"</span>"+
        "<span class='histsets wrapvals mono'>"+parts.join(" &middot; ")+"</span>"+
        "<button class='dact del' data-delbody='"+esc(dateKey(b.at))+"' title='Delete this entry'>&times;</button></div>";
    });
    h+="</div>";
  }else{
    h+="<div class='empty-note'>Nothing logged yet.<br>Weigh-ins build their own trend here.</div>";
  }
  if(big)h+="</div></div>";
  return h+"</div>";
}
