// Supplements: the products you own (with a photo of each) and your stacks — named
// combinations with doses and timing, like the pre-workout you mix. Everything stays on
// the phone; photos are shrunk before they're kept.
import {state} from "../store.js";
import {UNITS,lineText,stackCaffeine} from "../stack.js";
import {icon} from "../icons.js";
import {esc,pageHead} from "./common.js";

function unitSelect(cls,cur,attr){
  return "<select class='"+cls+"'"+(attr||"")+">"+UNITS.map(u=>"<option"+(u===cur?" selected":"")+">"+u+"</option>").join("")+"</select>";
}

function caffeineTag(lines){
  const mg=stackCaffeine(lines);
  return mg?"<span class='ltag"+(mg>400?" warn":"")+"'>Caffeine "+mg+" mg</span>":"";
}

function supplementForm(d,isNew){
  return "<div class='card stform'>"+
    "<div class='supphoto'>"+(d.photo?"<img src='"+esc(d.photo)+"' alt=''>":icon("photo"))+"</div>"+
    "<label class='btn ghost tiny photobtn'>"+(d.photo?"Change photo":"Add photo")+
      "<input type='file' id='supphoto' accept='image/*' hidden></label>"+
    (d.photo?"<button class='btn ghost tiny' id='suprmphoto'>Remove photo</button>":"")+
    "<label class='timefield'><span>Name</span><input class='timein' id='supname' value=\""+esc(d.name||"")+
      "\" placeholder='e.g. Citrulline malate'></label>"+
    "<div class='strow'><label class='timefield'><span>Serving</span><input class='timein mono' id='supserving' "+
      "inputmode='decimal' value=\""+esc(d.serving||"")+"\"></label>"+
      "<label class='timefield'><span>Unit</span>"+unitSelect("timein","" +(d.unit||"g")," id='supunit'")+"</label></div>"+
    "<label class='timefield'><span>Notes</span><textarea class='timein stnotes' id='supnotes' "+
      "placeholder='Brand, what a scoop really holds, taste…'>"+esc(d.notes||"")+"</textarea></label>"+
    "<div class='editrow'><button class='btn primary' id='supsave'>Save</button>"+
      (isNew?"":"<button class='btn dang' id='supdelete'>Delete</button>")+
      "<button class='btn ghost' id='stackcancel'>Cancel</button></div></div>";
}

function stackForm(d,isNew){
  let h="<div class='card stform'>"+
    "<label class='timefield'><span>Stack name</span><input class='timein' id='stname' value=\""+esc(d.name||"")+
      "\" placeholder='e.g. Pre-workout'></label>"+
    "<label class='timefield'><span>When</span><input class='timein' id='stwhen' value=\""+esc(d.when||"")+
      "\" placeholder='e.g. 30 min before training'></label>"+
    "<div class='picklbl'>What goes in it</div>"+
    "<datalist id='supnames'>"+state.supplements.map(s=>"<option value=\""+esc(s.name)+"\">").join("")+"</datalist>";
  (d.lines||[]).forEach((l,i)=>{
    h+="<div class='stline'><input class='timein stln' list='supnames' data-i='"+i+"' value=\""+esc(l.name||"")+
      "\" placeholder='Ingredient'><input class='timein mono stld' inputmode='decimal' data-i='"+i+
      "' value=\""+esc(l.dose||"")+"\" placeholder='Dose'>"+unitSelect("timein stlu",l.unit||"g"," data-i='"+i+"'")+
      "<button class='dact del' data-rmline='"+i+"' title='Remove this line'>&times;</button></div>";
  });
  h+="<button class='addbtn' id='staddline'>+ Add line</button>"+
    "<div class='sttotals'>"+caffeineTag(d.lines)+"</div>"+
    "<div class='editrow'><button class='btn primary' id='stsave'>Save</button>"+
      (isNew?"":"<button class='btn dang' id='stdelete'>Delete</button>")+
      "<button class='btn ghost' id='stackcancel'>Cancel</button></div></div>";
  return h;
}

export function stackView(){
  const ed=state.stackEdit;
  if(ed){
    const isNew=!ed.id;
    return "<div class='wrap scroll'>"+pageHead(ed.kind==="sup"?(isNew?"New supplement":"Supplement"):(isNew?"New stack":"Stack"),"","Supplements")+
      (ed.kind==="sup"?supplementForm(ed.draft,isNew):stackForm(ed.draft,isNew))+"</div>";
  }
  let h="<div class='wrap scroll'>"+pageHead("Supplements",
    "<button class='newday' id='newstack'>+ Stack</button>","Body");
  h+="<div class='setgroup'>My stacks</div>";
  if(!state.stacks.length)h+="<div class='empty-note'>No stacks yet. A stack is a combination you take together, with doses — like your pre-workout.</div>";
  state.stacks.forEach(s=>{
    h+="<button class='card stackcard' data-editstack='"+esc(s.id)+"'>"+
      "<div class='stname'>"+esc(s.name)+"</div>"+(s.when?"<div class='stwhen'>"+esc(s.when)+"</div>":"")+
      "<ul class='stlist'>"+(s.lines||[]).map(l=>"<li>"+esc(lineText(l))+"</li>").join("")+"</ul>"+
      "<div class='ltags'>"+caffeineTag(s.lines)+"</div></button>";
  });
  h+="<div class='setgroup'>My supplements</div><div class='supgrid'>";
  state.supplements.forEach(s=>{
    h+="<button class='supcard' data-editsup='"+esc(s.id)+"'>"+
      "<span class='supphoto'>"+(s.photo?"<img src='"+esc(s.photo)+"' alt=''>":icon("photo"))+"</span>"+
      "<span class='supname'>"+esc(s.name)+"</span>"+
      (s.serving?"<span class='supserv'>"+esc(s.serving+" "+(s.unit||""))+"</span>":"")+"</button>";
  });
  h+="<button class='supcard add' id='newsup'><span class='supphoto'>+</span><span class='supname'>Add supplement</span></button>";
  return h+"</div></div>";
}
