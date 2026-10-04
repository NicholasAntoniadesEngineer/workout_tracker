import {icon} from "../icons.js";

const ESCAPES={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"};

// Big screens get their own layouts: a tablet from 900px, a laptop from 1200px. Phones never do.
export const wide=()=>typeof matchMedia==="function"&&matchMedia("(min-width:900px)").matches;
export const desk=()=>typeof matchMedia==="function"&&matchMedia("(min-width:1200px)").matches;

export function esc(s){return String(s).replace(/[&<>"]/g,c=>ESCAPES[c]);}

// Every secondary screen opens the same way: Back on the left, its name in the middle, and
// its one action (if any) on the right — so moving between them never reshuffles the top.
export function pageHead(title,action){
  return "<div class='hhead'><button class='backbtn' id='backbtn'>"+icon("back","sm")+"Back</button>"+
    "<div class='h1 plain htitle'>"+title+"</div>"+
    "<div class='hact'>"+(action||"")+"</div></div>";
}
