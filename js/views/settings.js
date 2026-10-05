// Settings: display, logging and workout behaviour, as rows of labelled choices.
import {state} from "../store.js";
import {icon} from "../icons.js";
import {esc,pageHead} from "./common.js";
import {shortDate} from "../model.js";
import {DAY_LETTERS} from "../reminder.js";

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

// Cambridge University Press's required wording for quoting the KJV (UK Crown copyright).
// The app quotes well under their 500-verse limit and no complete book.
const KJV_NOTICE="Scripture quotations from The Authorized (King James) Version. Rights in the "+
  "Authorized Version in the United Kingdom are vested in the Crown. Reproduced by permission of "+
  "the Crown's patentee, Cambridge University Press.";

// A weekly reminder, set once into the phone's calendar: pick days and a time, then add it.
const REMIND_TIMES=["05:30","06:00","06:30","07:00","07:30","08:00","12:00","12:30","17:00","17:30",
  "18:00","18:30","19:00","19:30","20:00"];
function reminderRow(){
  const days=String(state.settings.remindDays||"").split(",").filter(x=>x!=="").map(Number);
  const time=state.settings.remindTime||"07:00";
  return "<div class='setgroup'>Reminder</div>"+
    "<div class='setrow'><div class='setlbl'>Training reminder</div>"+
    "<div class='sethint'>Adds a repeating event to your calendar, which reminds you — no account, works offline.</div>"+
    "<div class='setopts onerow'>"+DAY_LETTERS.map((l,i)=>"<button class='q"+(days.indexOf(i)>=0?" on":"")+
      "' data-remday='"+i+"'>"+l+"</button>").join("")+"</div>"+
    "<div class='setopts'><select class='trendsel' id='remtime'>"+REMIND_TIMES.map(t=>
      "<option"+(t===time?" selected":"")+">"+t+"</option>").join("")+"</select></div>"+
    "<div class='setopts'><button class='q' id='addreminder'"+(days.length?"":" disabled")+">"+
      icon("calendar","sm")+"Add to calendar</button></div></div>";
}

export function settingsView(){
  return "<div class='wrap scroll'>"+
    pageHead("Settings")+

    "<div class='setgroup'>Display</div>"+
    choiceRow("Text size","","textScale",TEXT_SIZES,"onerow")+
    choiceRow("Theme","","theme",THEMES)+
    toggleRow("Time of each set","","showSetTimes")+
    choiceRow("Bible version",state.settings.bibleVersion==="kjv"?KJV_NOTICE:"","bibleVersion",[["WEB","web"],["KJV","kjv"]])+
    choiceRow("Church calendar","Feast days marked in the calendar.","feastSet",
      [["Off","off"],["Western","western"],["Orthodox","orthodox"]])+
    choiceRow("Rest day","The day the week keeps for rest.","restDay",
      [["Sunday",0],["Saturday",6]])+

    "<div class='setgroup'>Logging</div>"+
    choiceRow("Rep range","Every set at the top of the range → go heavier next time.","progressRange",
      [["6–10","6-10"],["8–12","8-12"],["10–15","10-15"],["12–15","12-15"]])+
    choiceRow("Starting reps","","startReps",START_REPS.map(n=>[String(n),n]))+
    toggleRow("Per side counts double","10 per side totals 20 rather than 10.","perSideDouble")+
    choiceRow("Weight unit","","unit",[["kg","kg"],["lb","lb"]])+

    "<div class='setgroup'>Workout</div>"+
    choiceRow("Rest target","","restTarget",
      [["Off",0],["1:30",90],["2:00",120],["3:00",180],["4:00",240],["5:00",300]])+
    choiceRow("End an idle workout after","","idleEndMinutes",IDLE_ENDS)+

    // Files in and out: a spreadsheet of every set, a full backup, and loading either back.
    "<div class='setgroup'>Your data</div>"+
    "<div class='setrow'><div class='setlbl'>Save and load history</div>"+
    "<div class='sethint'>CSV opens in a spreadsheet. A backup also keeps routines, body log and settings. "+
      "Last backup: "+(state.backupAt?esc(shortDate(state.backupAt)):"never")+".</div>"+
    "<div class='setopts'>"+
      "<button class='q' id='exportcsv'>"+icon("save","sm")+"CSV</button>"+
      "<button class='q' id='exportjson'>"+icon("save","sm")+"Backup</button>"+
      "<button class='q' id='importcsv'>"+icon("share","sm")+"Load file</button>"+
    "</div>"+
    "<input type='file' id='csvfile' accept='.csv,.json,text/csv,application/json' style='display:none'>"+
    "</div>"+
    "<div class='setrow'><div class='setlbl'>Import from other apps</div>"+
    "<div class='sethint'>Strava, Garmin Connect, Apple Health, Strong, Hevy, Fitbod, or any FIT, GPX or TCX file. Read on this device; nothing is uploaded.</div>"+
    "<div class='setopts'><button class='q' id='openimport'>"+icon("share","sm")+"Import history</button></div></div>"+

    reminderRow()+

    "<div class='setgroup'>About</div>"+
    "<div class='setrow'><div class='setlbl'>Share KingsKiln</div>"+
    "<div class='setopts'><button class='q' id='shareapp'>&#8679; Send the app to a friend</button>"+
    "</div></div>"+
    "<div class='setrow'><div class='setlbl'>Send feedback</div>"+
    "<div class='setopts'><button class='q' id='feedbackbtn'>&#9998; Tell the developer</button>"+
    "</div></div>"+

    // Where the verses come from, and the acknowledgement the KJV's UK rights holder asks for.
    "<div class='setrow'><div class='setlbl'>Bible text</div>"+
    "<div class='sethint'>World English Bible (WEB): public domain. "+KJV_NOTICE+"</div></div>"+
    // Names are used only to describe movements; saying so plainly avoids implying endorsement.
    "<div class='setrow'><div class='setlbl'>Exercise names</div>"+
    "<div class='sethint'>Exercise and method names, including ATG and knees-over-toes terms, are used "+
      "only to describe movements. KingsKiln is independent and not affiliated with or endorsed by "+
      "anyone those names refer to. Demo links open a YouTube search.</div></div>"+

    "<div class='reset'><button id='resetsettings'>Restore defaults</button></div>"+
    "</div>";
}
