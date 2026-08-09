// Settings: display, logging and workout behaviour, as rows of labelled choices.
import {state} from "../store.js";

const TEXT_SIZES=[["Auto",0],["XS",.7],["Small",.85],["Medium",1],
  ["Large",1.25],["XL",1.55],["XXL",1.9]];
const THEMES=[["System","system"],["Light","light"],["Dark","dark"]];
const START_REPS=[5,8,10,12,15,20];
const IDLE_ENDS=[["30 min",30],["1 hour",60],["2 hours",120],["Never",0]];

function choiceRow(label,hint,key,pairs){
  const cur=state.settings[key];
  let h="<div class='setrow'><div class='setlbl'>"+label+"</div>"+
    (hint?"<div class='sethint'>"+hint+"</div>":"")+"<div class='setopts'>";
  pairs.forEach(p=>{
    const text=p[0],val=p[1];
    h+="<button class='q"+(cur===val?" on":"")+"' data-set='"+key+"' data-val='"+val+"'>"+text+"</button>";
  });
  return h+"</div></div>";
}

function toggleRow(label,hint,key){
  const on=!!state.settings[key];
  return "<div class='setrow'><div class='setlbl'>"+label+"</div>"+
    (hint?"<div class='sethint'>"+hint+"</div>":"")+"<div class='setopts'>"+
    "<button class='q"+(on?" on":"")+"' data-set='"+key+"' data-val='1'>On</button>"+
    "<button class='q"+(on?"":" on")+"' data-set='"+key+"' data-val='0'>Off</button>"+
    "</div></div>";
}

export function settingsView(){
  return "<div class='wrap scroll'>"+
    "<div class='hhead'><button class='backbtn' id='backbtn'>&lsaquo; Back</button>"+
    "<div class='h1 plain'>Settings</div></div>"+

    "<div class='setgroup'>Display</div>"+
    choiceRow("Text size","Auto shrinks text so the whole day fits the window. "+
      "A fixed size is kept exactly, and the table scrolls if the day outgrows it.",
      "textScale",TEXT_SIZES)+
    choiceRow("Theme","",
      "theme",THEMES)+
    toggleRow("Time of each set","Shown under the reps in the grid.","showSetTimes")+

    "<div class='setgroup'>Logging</div>"+
    choiceRow("Starting reps","What the counter opens on.","startReps",
      START_REPS.map(n=>[String(n),n]))+
    toggleRow("Per side counts double","10 per side totals 20 rather than 10.","perSideDouble")+
    choiceRow("Weight unit","Switching converts every saved weight and measurement.",
      "unit",[["kg","kg"],["lb","lb"]])+

    "<div class='setgroup'>Workout</div>"+
    choiceRow("Rest target","The rest clock turns amber and the phone buzzes once "+
      "the rest since the last set passes this.","restTarget",
      [["Off",0],["1:00",60],["1:30",90],["2:00",120],["3:00",180]])+
    choiceRow("End an idle workout after",
      "Backdated to the last set, so a session left running does not count all night.",
      "idleEndMinutes",IDLE_ENDS)+

    "<div class='reset'><button id='resetsettings'>Restore defaults</button></div>"+
    "</div>";
}
