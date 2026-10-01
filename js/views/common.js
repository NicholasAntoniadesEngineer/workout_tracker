import {icon} from "../icons.js";

const ESCAPES={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"};

export function esc(s){return String(s).replace(/[&<>"]/g,c=>ESCAPES[c]);}

// Every secondary screen opens the same way: Back on the left, its name in the middle, and
// its one action (if any) on the right — so moving between them never reshuffles the top.
export function pageHead(title,action){
  return "<div class='hhead'><button class='backbtn' id='backbtn'>"+icon("back","sm")+"Back</button>"+
    "<div class='h1 plain htitle'>"+title+"</div>"+
    "<div class='hact'>"+(action||"")+"</div></div>";
}
