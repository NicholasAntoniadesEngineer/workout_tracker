import {icon} from "../icons.js";

// Apostrophes too: links and titles sit inside single-quoted attributes.
const ESCAPES={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};

// Big screens get their own layouts: a tablet from 900px, a laptop from 1200px. Phones never do.
export const wide=()=>typeof matchMedia==="function"&&matchMedia("(min-width:900px)").matches;
export const desk=()=>typeof matchMedia==="function"&&matchMedia("(min-width:1200px)").matches;
// The Log's third column (the docked exercise list) needs this much room to leave the day readable.
export const roomy=()=>typeof matchMedia==="function"&&matchMedia("(min-width:1360px)").matches;

export function esc(s){return String(s).replace(/[&<>"']/g,c=>ESCAPES[c]);}

// Every secondary screen opens the same way: Back on the left, its name in the middle, and
// its one action (if any) on the right — so moving between them never reshuffles the top.
// On a big screen the sidebar is always there, so a section page drops Back for a large title
// with its actions on the right; a page inside a section shows the way back as a crumb
// ("Settings ›"), keeping Back's id so the same handler runs.
export function pageHead(title,action,parent,backId){
  if(wide())return "<div class='dhead'><div class='dheadt'>"+
    (parent?"<button class='dcrumb' id='"+(backId||"backbtn")+"'>"+parent+" &rsaquo;</button>":"")+
    "<h1 class='dtitle'>"+title+"</h1></div><div class='hact'>"+(action||"")+"</div></div>";
  return "<div class='hhead'><button class='backbtn' id='backbtn'>"+icon("back","sm")+"Back</button>"+
    "<div class='h1 plain htitle'>"+title+"</div>"+
    "<div class='hact'>"+(action||"")+"</div></div>";
}
