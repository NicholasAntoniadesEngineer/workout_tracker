// The first run: three short screens, then the app. Start logging first, since that is the
// point; then Add to Home Screen, which on iPhone nobody is ever prompted to do and which
// storage, push and the wake lock all depend on; then bringing history from another app.
// Shown once on a fresh install, never to anyone who already has workouts.
import {state} from "../store.js";
import {standalone} from "../sensors.js";
import {icon} from "../icons.js";
import {esc} from "./common.js";

const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const isAndroid=()=>/Android/.test(navigator.userAgent);
const shield="<svg class='brandshield big' viewBox='0 0 100 100' aria-hidden='true'><path d='M50 14 L78 25 V50 C78 69 65 81 50 88 C35 81 22 69 22 50 V25 Z' fill='none' stroke='currentColor' stroke-width='9' stroke-linejoin='round'/>"+
  "<line x1='50' y1='33' x2='50' y2='64' stroke='var(--accent)' stroke-width='8' stroke-linecap='round'/><line x1='37' y1='45' x2='63' y2='45' stroke='var(--accent)' stroke-width='8' stroke-linecap='round'/></svg>";

export function welcomeNeeded(){
  if(state.welcomed)return false;
  return !state.sessions.some(s=>s.ex.some(e=>e.sets.length)||s.cardio);
}
// Which screens apply: the install step is skipped when the app is already on the Home Screen
// or on a computer, where there is nothing to add.
export function welcomeSteps(){
  const steps=["start"];
  const phone=isIOS()||isAndroid();
  if(phone&&!standalone())steps.push("install");
  steps.push("history");
  return steps;
}
function dots(i,n){return "<div class='wdots'>"+Array.from({length:n},(_,k)=>"<span"+(k===i?" class='on'":"")+"></span>").join("")+"</div>";}

export function welcomeView(){
  const steps=welcomeSteps(),i=Math.min(state.welcomeStep||0,steps.length-1),k=steps[i],last=i===steps.length-1;
  let body="";
  if(k==="start")body="<div class='wbrand'>"+shield+"<span>Kings<span class='bk'>Kiln</span><sup class='tm'>&trade;</sup></span></div>"+
    "<h1 class='wtitle'>Your training, in one place.</h1>"+
    "<p class='wtext'>Log lifts and runs, follow a programme, and read the people and methods behind it. Free, with no account. Your data stays on this device.</p>"+
    "<ul class='wlist'><li>"+icon("dumbbell","sm")+"Log a set in two taps</li><li>"+icon("bolt","sm")+"Time intervals, track runs</li><li>"+icon("book","sm")+"545 topics to learn from</li></ul>";
  else if(k==="install")body="<div class='wicon'>"+icon("share","sm")+"</div><h1 class='wtitle'>Put it on your Home Screen</h1>"+
    "<p class='wtext'>Installed, KingsKiln opens full screen, keeps the screen on during a run, and keeps your data safe for as long as you like.</p>"+
    (isIOS()?"<ol class='wsteps'><li>Tap <b>Share</b> "+icon("share","sm")+" at the bottom of Safari</li><li>Choose <b>Add to Home Screen</b></li><li>Tap <b>Add</b>, then open KingsKiln from the icon</li></ol>":
      "<ol class='wsteps'><li>Tap the browser's <b>&#8942;</b> menu</li><li>Choose <b>Add to Home screen</b> or <b>Install app</b></li><li>Open KingsKiln from the icon</li></ol>")+
    "<p class='wsmall'>You can do this later too; the steps are in Settings.</p>";
  else body="<div class='wicon'>"+icon("days","sm")+"</div><h1 class='wtitle'>Bring your history</h1>"+
    "<p class='wtext'>Already logging somewhere else? Import it and carry on from where you are. Read on your device, nothing uploaded.</p>"+
    "<div class='wapps'>"+["Strong","Hevy","Fitbod","Strava","Garmin","Apple Health"].map(n=>"<span>"+n+"</span>").join("")+"</div>"+
    "<button class='btn ghost pbig' data-welcome='import'>Import a file</button>";
  return "<div class='wrap scroll welcome'><div class='winner'>"+body+"</div>"+
    "<div class='wfoot'>"+dots(i,steps.length)+
    "<button class='btn primary pbig' data-welcome='"+(last?"done":"next")+"'>"+(k==="start"?"Start":last?"Start logging":"Next")+"</button>"+
    (k==="start"?"":"<button class='homelink' data-welcome='done'>Skip</button>")+"</div></div>";
}
