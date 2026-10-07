// Large screens: the page sits in a shell with persistent navigation down the left — an icon
// rail on a tablet (900px and up), a labelled sidebar with number keys on a laptop (1200px and
// up). Phones never see any of this: below 900px paint() hands the view over untouched.
import {state} from "../store.js";
import {fmtClock} from "../model.js";
import {icon} from "../icons.js";
import {desk,esc,wide} from "./common.js";
import {setClockSeconds,workoutLabel} from "./log.js";

export {desk,wide};

// The sidebar: the phone's five places, flat, in the order of the number keys. History,
// Calendar and Body are tabs under Progress; Cardio is a tab under Train.
export const NAV=[["home","Today","home"],["log","Train","dumbbell"],["progress","Progress","progress"],["learn","Learn","book"],["settings","Settings","settings"]];
// Which place each screen belongs to, shared by the sidebar and the phone's tab bar so the
// two always agree.
const TAB_OF={home:"home",log:"log",cardio:"log",prog:"log",history:"progress",calendar:"progress",progress:"progress",body:"progress",
  stack:"progress",health:"progress",review:"progress",learn:"learn",settings:"settings",import:"settings"};

function brand(){
  return "<div class='sbrand'><svg class='brandshield' viewBox='0 0 100 100' aria-hidden='true'>"+
    "<path d='M50 14 L78 25 V50 C78 69 65 81 50 88 C35 81 22 69 22 50 V25 Z' fill='none' stroke='currentColor' stroke-width='9' stroke-linejoin='round'/>"+
    "<line x1='50' y1='33' x2='50' y2='64' stroke='var(--accent)' stroke-width='8' stroke-linecap='round'/>"+
    "<line x1='37' y1='45' x2='63' y2='45' stroke='var(--accent)' stroke-width='8' stroke-linecap='round'/>"+
    "</svg><span class='sbrandt'>Kings<span class='bk'>Kiln</span><sup class='tm' aria-label='trademark'>&trade;</sup></span></div>";
}

export const runningSession=()=>state.sessions.find(s=>s.running)||null;

function sideNav(){
  const cur=TAB_OF[state.view]||state.view;
  const mac=typeof navigator!=="undefined"&&/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent);
  return "<aside class='side' aria-label='Sections'>"+brand()+
    "<nav class='snav'>"+NAV.map(([k,l,ic],i)=>{
      const live=k==="log"&&(runningSession()||state.cardio);
      return "<button class='sitem"+(cur===k?" on":"")+"' data-nav='"+k+"'"+(cur===k?" aria-current='page'":"")+">"+
        "<span class='sicon'>"+icon(ic,"sm")+(live?"<span class='slivedot'></span>":"")+"</span><span class='slabel'>"+l+"</span>"+
        "<kbd>"+(i+1)+"</kbd></button>";}).join("")+"</nav>"+
    "<div class='sfoot'><button id='palopen' title='Search'>"+icon("search","sm")+"<span>Search</span><kbd>"+(mac?"&#8984;K":"Ctrl K")+"</kbd></button>"+
      "<button id='shareapp'>"+icon("share","sm")+"<span>Share KingsKiln</span></button>"+
      "<button id='feedbackbtn'>"+icon("chat","sm")+"<span>Send feedback</span></button>"+
      "<button id='keyshelp'><span class='skq'>?</span><span>Shortcuts</span><kbd>?</kbd></button></div>"+
    "</aside>";
}

// Under Train and Progress, the screens the sidebar no longer lists, as one row of tabs.
const TABSETS={log:[["log","Lifting"],["cardio","Cardio"]],progress:[["progress","Charts"],["history","History"],["calendar","Calendar"],["body","Body"]]};
export function sectionTabs(){
  if(state.view==="learn"&&state.reading)return "";
  const sec=TAB_OF[state.view],set=TABSETS[sec];
  if(!set)return "";
  const tabs=set.map(([k,l])=>"<button class='sectab"+(state.view===k?" on":"")+"' data-nav='"+k+"'>"+l+"</button>");
  if(sec==="progress")[["modFuel","fuel","Fuel"],["modMarkers","markers","Markers"],["modMind","mind","Mind"]].forEach(([flag,part,l])=>{
    if(state.settings[flag])tabs.push("<button class='sectab"+(state.view==="health"&&state.healthPart===part?" on":"")+"' data-openhealth='"+part+"'>"+l+"</button>");});
  return "<div class='sectabwrap'><nav class='sectabs' aria-label='"+(sec==="log"?"Train":"Progress")+"'>"+tabs.join("")+"</nav></div>";
}

// The phone's tab bar: five places, always in reach. Hidden while a run or a book takes the
// full height, and while a sheet is open over the Log.
export const TABS=NAV;
export function tabBar(){
  if(state.cardio&&state.view==="cardio")return "";
  if(state.view==="learn"&&state.reading)return "";
  const cur=TAB_OF[state.view]||"";
  return "<nav class='tabbar' aria-label='Sections'>"+TABS.map(([k,l,ic])=>{
    const live=k==="log"&&(runningSession()||state.cardio);
    return "<button class='tab"+(cur===k?" on":"")+"' data-nav='"+k+"'"+(cur===k?" aria-current='page'":"")+">"+
      "<span class='tabi'>"+icon(ic,"sm")+(live?"<span class='slivedot'></span>":"")+"</span><span class='tabl'>"+l+"</span></button>";}).join("")+"</nav>";
}

export function shell(view){
  return "<div class='shell"+(state.view==="learn"&&state.reading?" reading":"")+"'>"+sideNav()+
    "<main class='main' data-view='"+esc(state.view)+"'>"+sectionTabs()+view+"</main></div>";
}

// Refresh the sidebar's live clocks once a second without repainting the page.
export function tickSide(){
  const s=runningSession();if(!s)return;
  ["hhero-rest"].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=fmtClock(setClockSeconds(s));});
  ["hhero-work"].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=workoutLabel(s);});
}

// The ? sheet: every shortcut, grouped by where it works.
const KEYS=[["Anywhere",[["⌘K / Ctrl K","Search and jump anywhere"],["1 – 5","Today, Train, Progress, Learn, Settings"],["/","Search on this page"],["?","These shortcuts"],["Esc","Close or go back"]]],
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
