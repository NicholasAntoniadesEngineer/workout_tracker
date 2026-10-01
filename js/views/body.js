// Body: weight and a few girths, one entry per day, with the weight drawn as a trend.
// Girths follow the weight unit — centimetres alongside kg, inches alongside lb.
import {dateKey,nowISO,shortDate} from "../model.js";
import {state} from "../store.js";
import {lineChart,withAxis} from "../charts.js";
import {esc,pageHead} from "./common.js";

const GIRTHS=[["waist","Waist"],["chest","Chest"],["arm","Arm"]];

export function bodyView(){
  const unit=esc(state.settings.unit||"kg");
  const girthUnit=unit==="lb"?"in":"cm";
  const list=state.body.slice().reverse();
  const today=state.body.find(b=>dateKey(b.at)===dateKey(nowISO()));

  let h="<div class='wrap scroll'>"+pageHead("Body");

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

  // Any measure can be charted, not just weight — pick it above the line.
  const metrics=[["w","Weight",unit]].concat(GIRTHS.map(g=>[g[0],g[1],girthUnit]))
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
    h+=withAxis(lineChart(vs),Math.max(...vs),Math.min(...vs))+
      "<div class='chartlbls'><span>"+esc(shortDate(pts[0].at))+"</span>"+
      "<span>"+met[1].toLowerCase()+" now "+vs[vs.length-1]+met[2]+
        (delta?" ("+(delta>0?"+":"")+delta+")":"")+"</span>"+
      "<span>"+esc(shortDate(pts[pts.length-1].at))+"</span></div></div>";
  }

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
  return h+"</div>";
}
