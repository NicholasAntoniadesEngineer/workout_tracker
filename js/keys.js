// Keyboard shortcuts for a laptop. Each one presses a button that is already on screen, so
// what happens stays in the action modules and nothing fires that a tap couldn't. Typing in a
// field, or holding ⌘, Ctrl or Alt, is left to the browser.
import {state} from "./store.js";
import {NAV} from "./views/shell.js";

const press=sel=>{const el=document.querySelector(sel);if(el&&!el.disabled){el.click();return true;}return false;};
// Step through a row of buttons: the one after (or before) the one marked on.
function stepIn(list,isOn,dir){
  const all=[...document.querySelectorAll(list)];if(!all.length)return false;
  const i=all.findIndex(isOn),next=all[Math.max(0,Math.min(all.length-1,(i<0?0:i+dir)))];
  if(next&&next!==all[i]){next.click();return true;}
  return false;
}
function focusSearch(){
  for(const id of ["learnsearch","exsearch","searchin"]){const el=document.getElementById(id);if(el){el.focus();el.select&&el.select();return true;}}
  return press("#learnsearchbtn")||press("#opensheet")||press("#managebtn");
}

export function handleKey(ev,render){
  const tag=(ev.target&&ev.target.tagName)||"";
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(tag)||ev.metaKey||ev.ctrlKey||ev.altKey)return false;
  const k=ev.key;
  if((k===" "||k==="Enter")&&tag==="BUTTON")return false;
  // While the number pad is open it takes the digits.
  if(state.numEdit){
    if(/^[0-9.]$/.test(k))return press("[data-key='"+k+"']");
    if(k==="Backspace")return press("[data-key='back']");
    if(k==="Enter")return press("[data-key='done']");
    return false;
  }
  if(k==="?"){state.keysOpen=!state.keysOpen;render();return true;}
  if(/^[1-9]$/.test(k))return press(".side [data-nav='"+NAV[+k-1][0]+"']");
  if(k==="/")return focusSearch();
  const v=state.view,lower=k.length===1?k.toLowerCase():k;
  if(v==="log"&&!state.sheet&&!state.exHist&&!state.exInfo){
    if(lower==="l")return press(state.editing?"#upd":"#logbtn");
    if(k===" ")return press("#setstart");
    if(k==="ArrowUp"||k==="ArrowDown"){
      const d=k==="ArrowUp"?1:-1;
      return press("[data-step='"+(ev.shiftKey?"weight":"reps")+":"+d+"']")||press("[data-step='band:"+d+"']");
    }
    if(lower==="r")return press("[data-edit='reps']");
    if(lower==="w")return press("[data-edit='weight']");
    if(lower==="p")return press("#sidebtn");
    if(lower==="u")return press("#warmbtn");
    if(lower==="a")return press("#opensheet")||press("#managebtn");
    if(lower==="j"||lower==="k")return stepIn(".tblwrap .exbtn[data-ex]",b=>b.dataset.ex===state.exId,lower==="j"?1:-1);
  }
  if(v==="learn"){
    if(k==="["||k==="]")return stepIn("[data-learntab]",b=>b.classList.contains("on"),k==="]"?1:-1);
    if((k==="ArrowLeft"||k==="ArrowRight")&&!state.learnOpen&&!state.learnCat&&!state.learnIndex)
      return stepIn("[data-learnarea]",b=>b.classList.contains("on"),k==="ArrowRight"?1:-1);
  }
  if(v==="cardio"&&state.cardio){
    if(k===" ")return press("[data-cardiopause]");
    if(lower==="n")return press("[data-cardioskip]");
  }
  return false;
}
