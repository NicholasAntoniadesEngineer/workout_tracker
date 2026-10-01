// Supplements and stacks: add, edit and delete products (with a photo) and stacks (lines of
// ingredient, dose and unit). Forms aren't re-rendered while typing, so their fields are read
// from the DOM into a draft before any repaint.
// Each handler returns true once it has dealt with the tap.
import {state} from "../store.js";
import {newId,shrinkPhoto} from "../stack.js";

const val=id=>{const el=document.getElementById(id);return el?el.value.trim():"";};

export function captureDraft(){
  const ed=state.stackEdit;
  if(!ed)return;
  const d=ed.draft;
  if(ed.kind==="sup"){
    d.name=val("supname");d.serving=val("supserving");d.unit=val("supunit")||d.unit;d.notes=val("supnotes");
    return;
  }
  d.name=val("stname");d.when=val("stwhen");
  document.querySelectorAll(".stln").forEach(el=>{d.lines[+el.dataset.i].name=el.value.trim();});
  document.querySelectorAll(".stld").forEach(el=>{d.lines[+el.dataset.i].dose=el.value.trim();});
  document.querySelectorAll(".stlu").forEach(el=>{d.lines[+el.dataset.i].unit=el.value;});
}

// A photo picked in the supplement form: shrink it, keep it in the draft, repaint.
export function pickPhoto(file,render){
  if(!file||!state.stackEdit)return;
  captureDraft();
  shrinkPhoto(file).then(url=>{if(state.stackEdit){state.stackEdit.draft.photo=url;render();}})
    .catch(()=>alert("That image couldn't be read."));
}

export function handle(t,ctx){
  if(t.closest&&t.closest("#opensupps")){state.view="stack";state.stackEdit=null;state.scrollTo=0;ctx.render();return true;}
  if(state.view!=="stack")return false;
  const ed=state.stackEdit;
  // Back leaves a form for the list, and the list for Body.
  if(t.closest&&t.closest("#backbtn")){
    if(ed)state.stackEdit=null;else state.view="body";
    state.scrollTo=0;ctx.render();return true;
  }
  if(t.id==="newsup"||(t.closest&&t.closest("#newsup"))){
    state.stackEdit={kind:"sup",id:null,draft:{name:"",serving:"",unit:"g",notes:"",photo:""}};
    state.scrollTo=0;ctx.render();return true;
  }
  if(t.id==="newstack"){
    state.stackEdit={kind:"stack",id:null,draft:{name:"",when:"",lines:[{name:"",dose:"",unit:"g"}]}};
    state.scrollTo=0;ctx.render();return true;
  }
  const es=t.closest&&t.closest("[data-editsup]");
  if(es){
    const s=state.supplements.find(x=>x.id===es.getAttribute("data-editsup"));
    if(s){state.stackEdit={kind:"sup",id:s.id,draft:JSON.parse(JSON.stringify(s))};state.scrollTo=0;}
    ctx.render();return true;
  }
  const et=t.closest&&t.closest("[data-editstack]");
  if(et){
    const s=state.stacks.find(x=>x.id===et.getAttribute("data-editstack"));
    if(s){state.stackEdit={kind:"stack",id:s.id,draft:JSON.parse(JSON.stringify(s))};state.scrollTo=0;}
    ctx.render();return true;
  }
  if(!ed)return false;
  if(t.id==="stackcancel"){state.stackEdit=null;ctx.render();return true;}
  if(t.id==="staddline"){captureDraft();ed.draft.lines.push({name:"",dose:"",unit:"g"});ctx.render();return true;}
  const rm=t.closest&&t.closest("[data-rmline]");
  if(rm){captureDraft();ed.draft.lines.splice(+rm.getAttribute("data-rmline"),1);ctx.render();return true;}
  if(t.id==="suprmphoto"){captureDraft();ed.draft.photo="";ctx.render();return true;}
  if(t.id==="supsave"||t.id==="stsave"){
    captureDraft();
    const d=ed.draft,kind=ed.kind==="sup"?"supplements":"stacks";
    if(!d.name){const el=document.getElementById(ed.kind==="sup"?"supname":"stname");if(el)el.focus();return true;}
    if(kind==="stacks")d.lines=d.lines.filter(l=>l.name);
    if(ed.id)state[kind]=state[kind].map(x=>x.id===ed.id?Object.assign({},d,{id:ed.id}):x);
    else state[kind].push(Object.assign({},d,{id:newId(ed.kind==="sup"?"s":"k")}));
    state.stackEdit=null;ctx.render();return true;
  }
  if(t.id==="supdelete"||t.id==="stdelete"){
    const kind=ed.kind==="sup"?"supplements":"stacks";
    ctx.snapshot("Deleted "+(ed.draft.name||"item"));
    state[kind]=state[kind].filter(x=>x.id!==ed.id);
    state.stackEdit=null;ctx.render();return true;
  }
  return false;
}
