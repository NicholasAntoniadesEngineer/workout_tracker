// Planning ahead. A sheet for an empty calendar day (a routine onto it, or pick exercises), a
// sheet for a planned day (open, move, copy, remove), and the Plan page: a block of weeks from
// a weekly pattern with a deload week, ready-made programmes, and a programme pasted as text.
import {state,allRoutines} from "../store.js";
import {dateKey,nowISO,shortDate} from "../model.js";
import {esc,pageHead,wide} from "./common.js";
import {PROGRAMMES,blockDates,keyOfDate} from "../planner.js";
import {icon} from "../icons.js";

const WD=[[1,"Monday"],[2,"Tuesday"],[3,"Wednesday"],[4,"Thursday"],[5,"Friday"],[6,"Saturday"],[0,"Sunday"]];
const niceDate=k=>new Date(k+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"});
export const isPlanned=s=>!!s&&!s.cardio&&s.ex.length>0&&!s.ex.some(e=>e.sets.length)&&!s.running;

// An empty day: put a routine on it, or open it to pick exercises.
export function planDaySheet(){
  const k=state.planDay;if(!k)return "";
  const past=k<dateKey(nowISO()),rs=allRoutines();
  return "<div class='overlay' id='planback'><div class='sheet actionsheet plansheet'>"+
    "<div class='sheethead'><div class='plabel'>"+esc(niceDate(k))+"</div><button class='btn ghost tiny' id='planclose'>Close</button></div><div class='sheetbody'>"+
    "<button class='btn primary pbig' data-planpick='"+k+"'>"+(past?"Log a workout on this day":"Pick exercises")+"</button>"+
    (rs.length?"<div class='picklbl'>"+(past?"Or log it from a routine":"Or plan a routine")+"</div><div class='planrs'>"+
      rs.map(r=>"<button class='lrow' data-planroutine='"+esc(r.id)+"'><span class='lt'>"+esc(r.name)+"</span><span class='lpre'>"+esc(r.ex.slice(0,4).join(" · "))+(r.ex.length>4?" …":"")+"</span><span class='lchev'>+</span></button>").join("")+"</div>":"")+
    (past?"":"<button class='btn ghost' data-planblock='"+k+"'>"+icon("calendar","sm")+"Plan several weeks from here</button>")+
    "</div></div></div>";
}

// A planned day: open it, move it, copy it, or remove it. Move and copy take a date.
export function plannedSheet(){
  const s=state.planned&&state.sessions.find(x=>x.id===state.planned.id);if(!s)return "";
  const mode=state.planned.mode||"";
  return "<div class='overlay' id='plannedback'><div class='sheet actionsheet plansheet'>"+
    "<div class='sheethead'><div class='plabel'>Planned &middot; "+esc(shortDate(s.created))+(s.deload?" &middot; deload":"")+"</div><button class='btn ghost tiny' id='plannedclose'>Close</button></div><div class='sheetbody'>"+
    "<div class='h1 plain plantitle'>"+esc(s.title)+"</div><div class='planex'>"+esc(s.ex.map(e=>e.name).join(" · "))+"</div>"+
    "<button class='btn primary pbig' data-load='"+s.id+"'>Open</button>"+
    (mode?"<div class='planmove'><label class='picklbl' for='plandate'>"+(mode==="move"?"Move to":"Copy to")+"</label>"+
      "<input type='date' class='timein mono' id='plandate' value='"+dateKey(s.created)+"'><button class='btn primary' data-plando='"+mode+"'>"+(mode==="move"?"Move":"Copy")+"</button></div>":
      "<div class='planacts'><button class='btn ghost' data-planmode='move'>Move</button><button class='btn ghost' data-planmode='copy'>Copy</button>"+
      "<button class='btn ghost dang' data-delday='"+s.id+"'>Remove</button></div>")+
    "</div></div></div>";
}

// The Plan page.
export function plannerView(){
  const b=state.block||(state.block={start:nextMonday(),weeks:4,deloadEvery:4,pattern:{}});
  const rs=allRoutines(),dates=blockDates(b);
  const taken=new Set(state.sessions.filter(s=>s.ex.length||s.cardio).map(s=>dateKey(s.created)));
  const fresh=dates.filter(d=>!taken.has(d.date));
  let h="<div class='wrap scroll planwrap'>"+pageHead("Plan","",wide()?"Progress":"");
  // Ready-made programmes and the paste box.
  h+="<div class='card hcard'><div class='hcardh'><span class='llabel'>Start from a programme</span></div>"+
    "<div class='planprogs'>"+PROGRAMMES.map(p=>"<button class='lrow' data-planprog='"+p.id+"'><span class='lt'>"+esc(p.name)+(p.by?" <small>"+esc(p.by)+"</small>":"")+"</span><span class='lpre'>"+esc(p.note)+"</span><span class='lchev'>+</span></button>").join("")+
    "<button class='lrow' id='planpaste'><span class='lt'>Paste a programme</span><span class='lpre'>From a coach, a forum or an AI chat. Days and exercises become routines.</span><span class='lchev'>&rsaquo;</span></button></div></div>";
  if(state.paste)h+=pasteCard();
  // The weekly pattern.
  h+="<div class='card hcard'><div class='hcardh'><span class='llabel'>Each week</span></div>"+
    "<div class='planweek'>"+WD.map(([d,l])=>"<label class='planrow'><span>"+l+"</span><select class='pickchip' data-planwd='"+d+"' aria-label='"+l+"'>"+
      "<option value=''>Rest</option>"+rs.map(r=>"<option value='"+esc(r.id)+"'"+(b.pattern[d]===r.id?" selected":"")+">"+esc(r.name)+"</option>").join("")+"</select></label>").join("")+"</div></div>";
  // How long, from when, and the deload.
  h+="<div class='card hcard'><div class='hcardh'><span class='llabel'>The block</span></div>"+
    "<label class='planrow'><span>Starts</span><input type='date' class='timein mono' id='planstart' value='"+esc(b.start)+"'></label>"+
    "<div class='seglbl'>Weeks</div><div class='segc'>"+[2,4,6,8,12].map(w=>"<button class='"+(b.weeks===w?"on":"")+"' data-planweeks='"+w+"'>"+w+"</button>").join("")+"</div>"+
    "<div class='seglbl'>Deload week</div><div class='segc'>"+[[0,"None"],[3,"Every 3rd"],[4,"Every 4th"],[5,"Every 5th"],[6,"Every 6th"]].map(([v,l])=>"<button class='"+(b.deloadEvery===v?"on":"")+"' data-plandeload='"+v+"'>"+l+"</button>").join("")+"</div>"+
    "<div class='revsub'>A deload week keeps the same exercises with about two-thirds of the sets, 10% lighter.</div></div>";
  // What it will add.
  h+="<div class='card hcard'><div class='hcardh'><span class='llabel'>"+fresh.length+" workout"+(fresh.length===1?"":"s")+" to add</span>"+
    (dates.length>fresh.length?"<span class='pgall'>"+(dates.length-fresh.length)+" days already have one</span>":"")+"</div>"+
    (fresh.length?"<div class='planlist'>"+fresh.slice(0,10).map(d=>{const r=rs.find(x=>x.id===d.routine);
      return "<div class='histrow'><span class='histdate'>"+esc(new Date(d.date+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"}))+"</span><span class='histsets'>"+esc(r?r.name:"?")+(d.deload?" &middot; <b>deload</b>":"")+"</span></div>";}).join("")+
      (fresh.length>10?"<div class='revsub'>and "+(fresh.length-10)+" more</div>":"")+"</div>":
      "<div class='empty-note'>Choose a routine for at least one day of the week.</div>")+
    "<button class='btn primary pbig' id='planmake'"+(fresh.length?"":" disabled")+">Add to the calendar</button></div>";
  return h+"</div>";
}
function pasteCard(){
  const p=state.paste;
  return "<div class='card hcard'><div class='hcardh'><span class='llabel'>Paste a programme</span><button class='hmore' id='pasteclose'>Close</button></div>"+
    "<textarea class='exnote pastebox' id='pastetext' rows='7' placeholder='Day 1: Upper&#10;Bench press 4x8 @ 80&#10;Pull ups 3 x 8-10&#10;&#10;Day 2: Lower&#10;Squats 5x5 100&#10;RDL 3 sets of 8'>"+esc(p.text||"")+"</textarea>"+
    "<button class='btn ghost' id='pasteread'>Read it</button>"+
    (p.result?(p.result.days.length?"<div class='planlist'>"+p.result.days.map(d=>"<div class='histrow'><span class='histdate'>"+esc(d.name)+"</span><span class='histsets'>"+esc(d.ex.join(" · "))+"</span></div>").join("")+"</div>"+
      (p.result.skipped.length?"<div class='revsub'>Skipped "+p.result.skipped.length+" line"+(p.result.skipped.length===1?"":"s")+": "+esc(p.result.skipped.slice(0,3).join(" / "))+"</div>":"")+
      "<button class='btn primary' id='pastesave'>Save "+p.result.days.length+" routine"+(p.result.days.length===1?"":"s")+"</button>":
      "<div class='empty-note'>No exercises found. Write each as a name then sets × reps, like “Squats 5x5”.</div>"):"")+"</div>";
}
function nextMonday(){
  const d=new Date();d.setHours(12,0,0,0);const add=(8-d.getDay())%7||7;d.setDate(d.getDate()+add);return keyOfDate(d);
}
