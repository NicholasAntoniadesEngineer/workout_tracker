// Large screens: the page sits in a shell with persistent navigation down the left — an icon
// rail on a tablet (900px and up), a labelled sidebar with number keys on a laptop (1200px and
// up). Phones never see any of this: below 900px paint() hands the view over untouched.
import {state} from "../store.js";
import {fmtClock} from "../model.js";
import {icon} from "../icons.js";
import {desk,esc,wide} from "./common.js";
import {setClockSeconds,workoutLabel} from "./log.js";

export {desk,wide};

// Every section, in the order of the number keys.
export const NAV=[["home","Home","home"],["log","Log","dumbbell"],["history","History","days"],["calendar","Calendar","calendar"],
  ["progress","Progress","progress"],["body","Body","body"],["cardio","Cardio","bolt"],["learn","Learn","book"],["settings","Settings","settings"]];
const ACTIVE={prog:"learn",stack:"learn"};

function brand(){
  return "<div class='sbrand'><svg class='brandshield' viewBox='0 0 100 100' aria-hidden='true'>"+
    "<path d='M50 14 L78 25 V50 C78 69 65 81 50 88 C35 81 22 69 22 50 V25 Z' fill='none' stroke='currentColor' stroke-width='9' stroke-linejoin='round'/>"+
    "<line x1='50' y1='33' x2='50' y2='64' stroke='var(--accent)' stroke-width='8' stroke-linecap='round'/>"+
    "<line x1='37' y1='45' x2='63' y2='45' stroke='var(--accent)' stroke-width='8' stroke-linecap='round'/>"+
    "</svg><span class='sbrandt'>Kings<span class='bk'>Kiln</span></span></div>";
}

// A workout under way, wherever you are: its rest clock and elapsed time, one click back to it.
export const runningSession=()=>state.sessions.find(s=>s.running)||null;
function liveCard(){
  const s=runningSession();
  if(!s||state.view==="log")return "";
  const done=s.ex.filter(e=>e.sets.length).length;
  return "<button class='slive' data-nav='log'><span class='sliveh'><span class='lgdot'></span>Live workout</span>"+
    "<span class='slivet'>"+esc(s.title)+"</span>"+
    "<span class='sliver'><span>Rest</span><b class='mono' id='sidelive-rest'>"+fmtClock(setClockSeconds(s))+"</b></span>"+
    "<span class='sliver'><span>"+done+" of "+s.ex.length+" exercises</span><b class='mono' id='sidelive-work'>"+workoutLabel(s)+"</b></span></button>";
}

function sideNav(){
  const cur=ACTIVE[state.view]||state.view;
  return "<aside class='side' aria-label='Sections'>"+brand()+liveCard()+
    "<nav class='snav'>"+NAV.map(([k,l,ic],i)=>{
      const live=k==="log"&&runningSession()||k==="cardio"&&state.cardio;
      return "<button class='sitem"+(cur===k?" on":"")+"' data-nav='"+k+"'"+(cur===k?" aria-current='page'":"")+">"+
        "<span class='sicon'>"+icon(ic,"sm")+(live?"<span class='slivedot'></span>":"")+"</span><span class='slabel'>"+l+"</span>"+
        "<kbd>"+(i+1)+"</kbd></button>";}).join("")+"</nav>"+
    "<div class='sfoot'><button id='feedbackbtn'>"+icon("chat","sm")+"<span>Send feedback</span></button>"+
      "<button id='shareapp'>"+icon("share","sm")+"<span>Share KingsKiln</span></button>"+
      "<button id='keyshelp'><span class='skq'>?</span><span>Shortcuts</span><kbd>?</kbd></button></div>"+
    "</aside>";
}

export function shell(view){
  return "<div class='shell"+(state.view==="learn"&&state.reading?" reading":"")+"'>"+sideNav()+
    "<main class='main' data-view='"+esc(state.view)+"'>"+view+"</main></div>";
}

// Refresh the sidebar's live clocks once a second without repainting the page.
export function tickSide(){
  const s=runningSession();if(!s)return;
  const r=document.getElementById("sidelive-rest"),w=document.getElementById("sidelive-work");
  if(r)r.textContent=fmtClock(setClockSeconds(s));
  if(w)w.innerHTML=workoutLabel(s);
}

// The ? sheet: every shortcut, grouped by where it works.
const KEYS=[["Anywhere",[["1 – 9","Go to a section"],["/","Search on this page"],["?","These shortcuts"],["Esc","Close or go back"]]],
  ["Log",[["L","Log the set"],["Space","Start or cancel a set"],["↑ ↓","Reps up or down"],["⇧ ↑ ↓","Weight up or down"],
    ["R / W","Type reps or weight"],["P","Per side"],["U","Warm-up"],["J / K","Next or previous exercise"],["A","Add an exercise"]]],
  ["Learn",[["[ ]","Previous or next tab"],["← →","Previous or next area"]]],
  ["Cardio",[["Space","Pause or resume"],["N","Skip to the next phase"]]]];
export function keysSheet(){
  if(!state.keysOpen)return "";
  return "<div class='overlay' id='keysback'><div class='sheet actionsheet keyssheet' role='dialog' aria-label='Keyboard shortcuts'>"+
    "<div class='sheethead'><div class='plabel'>Keyboard shortcuts</div><button class='btn ghost tiny' id='keysclose'>Close</button></div>"+
    "<div class='sheetbody keysgrid'>"+KEYS.map(([g,list])=>"<div class='keysgroup'><div class='llabel'>"+g+"</div>"+
      list.map(([k,d])=>"<div class='keysrow'><kbd>"+k+"</kbd><span>"+d+"</span></div>").join("")+"</div>").join("")+"</div></div></div>";
}
