// Import: how to get each app's export, the progress while a big archive is read, what was
// found (ticked by type, duplicates skipped), and what came in.
import {state} from "../store.js";
import {icon} from "../icons.js";
import {esc,pageHead,wide} from "./common.js";

const plural=(n,w,many)=>n.toLocaleString()+" "+(n===1?w:many||w+"s");
const SOURCES=[
  ["Strava","Activities, routes, splits, heart rate.",
    "On strava.com: Settings › My Account › Download or Delete Your Account › Get Started › Request Your Archive. Strava emails a link; choose the zip it sends."],
  ["Garmin Connect","Every activity your watch recorded.",
    "At garmin.com, sign in: Account › Data Management › Export Your Data › Request Data Export. Garmin emails a link; choose the zip it sends."],
  ["Apple Health","Workouts, routes, heart rate, weigh-ins.",
    "On iPhone: Health app › your picture (top right) › Export All Health Data › Export, then Save to Files. Choose export.zip here."],
  ["Strong, Hevy, Fitbod","Every exercise, set and weight.",
    "In the app's settings, export your workouts as a CSV file, then choose it here."],
  ["Coros, Wahoo, Polar, Suunto, Zwift","FIT, GPX or TCX files.",
    "Export the activity as a FIT, GPX or TCX file (or zip several together) and choose it here."],
];
const input="<label class='btn primary pbig impbtn'>"+icon("share","sm")+"Choose a file<input type='file' id='importany' "+
  "accept='.zip,.fit,.gpx,.tcx,.gz,.csv,.xml,application/zip,text/csv,text/xml,application/xml,application/gpx+xml,application/octet-stream' hidden></label>";

function intro(){
  return "<p class='pnote impnote'>Read on your device. Nothing is uploaded; duplicates are skipped.</p>"+input+
    "<div class='llabel'>Where to get your file</div>"+
    SOURCES.map(([n,what,how])=>"<details class='card impsrc'><summary><b>"+esc(n)+"</b><span>"+esc(what)+"</span></summary><p>"+esc(how)+"</p></details>").join("");
}

function reading(j){
  const pct=j.total?Math.round(j.done/j.total*100):j.pct||0;
  return "<div class='card impcard'><div class='llabel'>Reading "+esc(j.source||j.name||"your file")+"</div>"+
    "<div class='impbar'><span style='width:"+Math.max(4,pct)+"%'></span></div>"+
    "<div class='impstat'>"+(j.total?j.done.toLocaleString()+" of "+plural(j.total,"workout")+" read":
      j.found?plural(j.found,"workout")+" found so far":"Opening the file&hellip;")+"</div>"+
    "<p class='pnote'>Keep this screen open.</p></div>";
}

function review(j){
  const fresh=j.acts.filter(a=>!a.dup),dups=j.acts.length-fresh.length;
  const picked=Object.keys(j.groups).filter(g=>j.pick[g]).reduce((n,g)=>n+j.groups[g],0);
  const days=j.days?j.days.filter(d=>!d.dup):[],dupDays=j.days?j.days.length-days.length:0;
  let h="<div class='card impcard'><div class='llabel'>Found in "+esc(j.source||"your file")+"</div>";
  if(j.acts.length){
    h+="<div class='impsec'><b>"+plural(fresh.length,"workout")+"</b>"+(dups?"<span> &middot; "+plural(dups,"already here, skipped","already here, skipped")+"</span>":"")+"</div>"+
      (fresh.length?"<div class='impchips'>"+Object.keys(j.groups).sort((a,b)=>j.groups[b]-j.groups[a]).map(g=>
        "<button class='lchip"+(j.pick[g]?" on":"")+"' data-importgroup=\""+esc(g)+"\" aria-pressed='"+!!j.pick[g]+"'>"+esc(g)+" &middot; "+j.groups[g].toLocaleString()+"</button>").join("")+"</div>"+
        "<p class='pnote'>Tap a type to leave it out.</p>":"");
  }
  if(j.days)h+="<button class='impopt"+(j.pickDays?" on":"")+"' data-importdays='1'><span><b>"+plural(days.length,"strength day")+"</b>"+
    "<span>Every exercise and set"+(dupDays?" &middot; "+dupDays+" already here":"")+"</span></span><span class='cdot'></span></button>";
  if(j.weights.length)h+="<button class='impopt"+(j.pickWeights?" on":"")+"' data-importweights='1'><span><b>"+plural(j.weights.length,"weigh-in")+"</b>"+
    "<span>To Body</span></span><span class='cdot'></span></button>";
  const n=picked+(j.pickDays?days.length:0);
  h+="<button class='btn primary pbig' data-importgo='1'"+(n||(j.pickWeights&&j.weights.length)?"":" disabled")+">Import "+
    (n?plural(n,"workout"):"")+(n&&j.pickWeights&&j.weights.length?" and ":"")+(j.pickWeights&&j.weights.length?plural(j.weights.length,"weigh-in"):"")+"</button></div>";
  return h;
}

function done(j){
  const s=j.saved,parts=[];
  if(s.acts)parts.push(plural(s.acts,"workout"));
  if(s.days)parts.push(plural(s.days,"strength day"));
  if(s.weights)parts.push(plural(s.weights,"weigh-in"));
  return "<div class='card impcard'><div class='llabel'>Done</div><div class='impdone'>"+(parts.length?esc(parts.join(", "))+" brought in from "+esc(j.source):"Nothing new to bring in")+".</div>"+
    "<div class='pacts'><button class='btn primary' data-importview='history'>See History</button>"+
    (s.acts?"<button class='btn ghost' data-importview='progress'>Progress</button>":"")+
    (s.weights?"<button class='btn ghost' data-importview='body'>Body</button>":"")+"</div></div>";
}

export function importView(){
  const j=state.importJob;
  let h="<div class='wrap scroll impwrap'>"+(wide()?pageHead("Import","","Settings","importback"):pageHead("Import").replace("id='backbtn'","id='importback'"));
  if(!j)h+=intro();
  else if(j.stage==="reading")h+=reading(j);
  else if(j.stage==="review")h+=review(j);
  else if(j.stage==="done")h+=done(j);
  else h+="<div class='card impcard'><div class='llabel'>Couldn't import</div><p class='impdone'>"+esc(j.error||"")+"</p>"+input+"</div>";
  return h+"</div>";
}
