// Body: weight and a few girths, one entry per day, with the weight drawn as a trend.
// Girths follow the weight unit — centimetres alongside kg, inches alongside lb.
import {dateKey,nowISO,shortDate} from "../model.js";
import {state} from "../store.js";
import {lineChart} from "../charts.js";
import {icon} from "../icons.js";
import {esc} from "./common.js";

const GIRTHS=[["waist","Waist"],["chest","Chest"],["arm","Arm"]];

export function bodyView(){
  const unit=esc(state.settings.unit||"kg");
  const girthUnit=unit==="lb"?"in":"cm";
  const list=state.body.slice().reverse();
  const today=state.body.find(b=>dateKey(b.at)===dateKey(nowISO()));

  let h="<div class='wrap scroll'>"+
    "<div class='hhead'><button class='backbtn' id='backbtn'>"+icon("back","sm")+"Back</button>"+
    "<div class='h1 plain'>Body</div></div>";

  h+="<div class='card chartcard'><div class='bodyform'>"+
    "<label class='timefield'><span>Weight ("+unit+")</span>"+
      "<input class='timein mono' id='bodyw' inputmode='decimal' value='"+
      (today&&today.w?today.w:"")+"'></label>";
  GIRTHS.forEach(g=>{
    const v=today&&today[g[0]]?today[g[0]]:"";
    h+="<label class='timefield'><span>"+g[1]+" ("+girthUnit+")</span>"+
      "<input class='timein mono' id='body_"+g[0]+"' inputmode='decimal' value='"+v+"'></label>";
  });
  h+="</div><button class='btn primary bodysave' id='bodysave'>"+
    (today?"Update today":"Log today")+"</button></div>";

  const ws=state.body.filter(b=>b.w);
  if(ws.length>1){
    const pts=ws.slice(-12);
    const delta=Math.round((pts[pts.length-1].w-pts[0].w)*10)/10;
    h+="<div class='setgroup'>Weight trend</div><div class='card chartcard'>"+
      lineChart(pts.map(p=>p.w))+
      "<div class='chartlbls'><span>"+esc(shortDate(pts[0].at))+"</span>"+
      "<span>now "+pts[pts.length-1].w+unit+(delta?" ("+(delta>0?"+":"")+delta+")":"")+"</span>"+
      "<span>"+esc(shortDate(pts[pts.length-1].at))+"</span></div></div>";
  }

  if(list.length){
    h+="<div class='setgroup'>Entries</div><div class='card'>";
    list.forEach(b=>{
      const parts=[];
      if(b.w)parts.push(b.w+unit);
      GIRTHS.forEach(g=>{if(b[g[0]])parts.push(g[1].toLowerCase()+" "+b[g[0]]+girthUnit);});
      h+="<div class='histrow'><span class='histdate'>"+esc(shortDate(b.at))+"</span>"+
        "<span class='histsets mono'>"+parts.join(" &middot; ")+"</span>"+
        "<button class='del' data-delbody='"+esc(dateKey(b.at))+"'>&times;</button></div>";
    });
    h+="</div>";
  }else{
    h+="<div class='empty-note'>Nothing logged yet.<br>Weigh-ins build their own trend here.</div>";
  }
  return h+"</div>";
}
