// In-app dialogs in place of the browser's prompt, confirm and alert boxes, which look foreign
// and can't be styled. One at a time: state.dialog holds {kind, title, text, value, ok, danger,
// act}, where act names what happens on OK (handled in js/actions/dialog.js). A notice has no
// act; it just closes.
import {state} from "./store.js";
import {esc} from "./views/common.js";

export function ask(opts){state.dialog=Object.assign({kind:"ask",ok:"Save"},opts);}
export function confirmAct(opts){state.dialog=Object.assign({kind:"confirm",ok:"OK"},opts);}
export function notice(title,text){state.dialog={kind:"notice",title,text:text||"",ok:"OK"};}

export function dialogView(){
  const d=state.dialog;if(!d)return "";
  const input=d.kind==="ask"?"<input class='dlgin"+(d.mono?" mono":"")+"' id='dlgin' type='"+(d.type||"text")+"'"+(d.inputmode?" inputmode='"+d.inputmode+"'":"")+
    " value='"+esc(d.value==null?"":d.value)+"'"+(d.placeholder?" placeholder='"+esc(d.placeholder)+"'":"")+" autocomplete='off' enterkeyhint='done'>":"";
  const copy=d.copy?"<input class='dlgin mono' id='dlgcopy' readonly value='"+esc(d.copy)+"'>":"";
  return "<div class='overlay dlgover' id='dlgback'><div class='sheet actionsheet dlg' role='"+(d.kind==="notice"?"alertdialog":"dialog")+"' aria-labelledby='dlgtitle'>"+
    "<div class='dlgtitle' id='dlgtitle'>"+esc(d.title)+"</div>"+
    (d.text?"<div class='dlgtext'>"+esc(d.text)+"</div>":"")+input+copy+
    "<div class='dlgacts'>"+(d.kind==="notice"?"":"<button class='btn ghost' id='dlgcancel'>"+esc(d.cancel||"Cancel")+"</button>")+
    "<button class='btn "+(d.danger?"dang":"primary")+"' id='dlgok'>"+esc(d.ok)+"</button></div></div></div>";
}
