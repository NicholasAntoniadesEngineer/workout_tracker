// Settings: display, logging and workout behaviour, as rows of labelled choices.
import {state} from "../store.js";
import {icon} from "../icons.js";
import {pageHead} from "./common.js";

// Short labels so all seven sit on one row, even on a small phone.
const TEXT_SIZES=[["Auto",0],["XS",.7],["S",.85],["M",1],
  ["L",1.25],["XL",1.55],["XXL",1.9]];
const THEMES=[["System","system"],["Light","light"],["Dark","dark"]];
const START_REPS=[5,8,10,12,15,20];
const IDLE_ENDS=[["30 min",30],["1 hour",60],["2 hours",120],["Never",0]];

function choiceRow(label,hint,key,pairs,cls){
  const cur=state.settings[key];
  let h="<div class='setrow'><div class='setlbl'>"+label+"</div>"+
    (hint?"<div class='sethint'>"+hint+"</div>":"")+"<div class='setopts"+(cls?" "+cls:"")+"'>";
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
    pageHead("Settings")+

    "<div class='setgroup'>Display</div>"+
    choiceRow("Text size","","textScale",TEXT_SIZES,"onerow")+
    choiceRow("Theme","","theme",THEMES)+
    toggleRow("Time of each set","","showSetTimes")+
    choiceRow("Bible version","","bibleVersion",[["WEB","web"],["KJV","kjv"]])+
    choiceRow("Church calendar","Feast days marked in the calendar.","feastSet",
      [["Off","off"],["Western","western"],["Orthodox","orthodox"]])+
    choiceRow("Rest day","The day the week keeps for rest.","restDay",
      [["Sunday",0],["Saturday",6]])+

    "<div class='setgroup'>Logging</div>"+
    choiceRow("Starting reps","","startReps",START_REPS.map(n=>[String(n),n]))+
    toggleRow("Per side counts double","10 per side totals 20 rather than 10.","perSideDouble")+
    choiceRow("Weight unit","","unit",[["kg","kg"],["lb","lb"]])+

    "<div class='setgroup'>Workout</div>"+
    choiceRow("Rest target","","restTarget",
      [["Off",0],["1:00",60],["1:30",90],["2:00",120],["3:00",180]])+
    choiceRow("End an idle workout after","","idleEndMinutes",IDLE_ENDS)+

    // Files in and out: a spreadsheet of every set, a full backup, and loading either back.
    "<div class='setgroup'>Your data</div>"+
    "<div class='setrow'><div class='setlbl'>Save and load history</div>"+
    "<div class='sethint'>CSV opens in a spreadsheet. A backup also keeps routines, body log and settings.</div>"+
    "<div class='setopts'>"+
      "<button class='q' id='exportcsv'>"+icon("save","sm")+"CSV</button>"+
      "<button class='q' id='exportjson'>"+icon("save","sm")+"Backup</button>"+
      "<button class='q' id='importcsv'>"+icon("share","sm")+"Load file</button>"+
    "</div>"+
    "<input type='file' id='csvfile' accept='.csv,.json,text/csv,application/json' style='display:none'>"+
    "</div>"+

    "<div class='setgroup'>About</div>"+
    "<div class='setrow'><div class='setlbl'>Share KingsKiln</div>"+
    "<div class='setopts'><button class='q' id='shareapp'>&#8679; Send the app to a friend</button>"+
    "</div></div>"+
    "<div class='setrow'><div class='setlbl'>Send feedback</div>"+
    "<div class='setopts'><button class='q' id='feedbackbtn'>&#9998; Tell the developer</button>"+
    "</div></div>"+

    "<div class='reset'><button id='resetsettings'>Restore defaults</button></div>"+
    "</div>";
}
