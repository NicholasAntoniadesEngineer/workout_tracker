// What a scanned sheet said, to check before it goes into the day: each set as read, a tap to
// leave one out, the handwritten notes as a picture.
import {state} from "../store.js";
import {esc} from "./common.js";

export function scanSheet(){
  const sc=state.scan;if(!sc)return "";
  const s=state.sessions.find(x=>x.id===sc.id);if(!s)return "";
  const names=Object.keys(sc.sets),u=esc(state.settings.unit||"kg");
  return "<div class='overlay' id='scanback'><div class='sheet actionsheet scansheet'>"+
    "<div class='sheethead'><div class='plabel'>Read from the sheet</div><button class='btn ghost tiny' id='scanclose'>Cancel</button></div><div class='sheetbody'>"+
    "<div class='h1 plain plantitle'>"+esc(s.title)+"</div><div class='planex'>"+esc(new Date(s.created).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"}))+"</div>"+
    (names.length?names.map(n=>"<div class='scanex'><div class='scann'>"+esc(n)+"</div><div class='scansets'>"+sc.sets[n].map((x,i)=>
      "<button class='scanset"+(x.on?" on":"")+(x.changed?" chg":"")+"' data-scanset='"+esc(n)+"|"+i+"' aria-pressed='"+x.on+"'><b class='mono'>"+x.r+"</b>"+(x.w?"<span class='mono'>@ "+x.w+"</span>":"")+"</button>").join("")+"</div></div>").join(""):
      "<div class='empty-note'>No ticks or filled circles found. Tick the done box for each set you did.</div>")+
    (sc.notes?"<div class='picklbl'>Notes</div><img class='scannotes' alt='Handwritten notes from the sheet' src='"+sc.notes+"'>":"")+
    "<div class='revsub'>Gold is what differed from the plan. Tap a set to leave it out.</div>"+
    "<button class='btn primary pbig' id='scansave'"+(names.length?"":" disabled")+">Add to "+esc(s.title)+"</button>"+
    "</div></div></div>";
}
