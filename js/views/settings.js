// Settings: display, logging and workout behaviour, as rows of labelled choices.
import {state} from "../store.js";
import {icon} from "../icons.js";
import {esc,pageHead,wide} from "./common.js";
import {standalone} from "../sensors.js";
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
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
  return "<div class='setrow'><div class='setlbl'>Training reminder</div>"+
    "<div class='sethint'>Adds a repeating event to your calendar, which reminds you — no account, works offline.</div>"+
    "<div class='setopts onerow'>"+DAY_LETTERS.map((l,i)=>"<button class='q"+(days.indexOf(i)>=0?" on":"")+
      "' data-remday='"+i+"'>"+l+"</button>").join("")+"</div>"+
    "<div class='setopts'><select class='trendsel' id='remtime'>"+REMIND_TIMES.map(t=>
      "<option"+(t===time?" selected":"")+">"+t+"</option>").join("")+"</select></div>"+
    "<div class='setopts'><button class='q' id='addreminder'"+(days.length?"":" disabled")+">"+
      icon("calendar","sm")+"Add to calendar</button></div></div>"+
    (state.settings.checkin?"<div class='setrow'><div class='setlbl'>Check-in reminder</div>"+
    "<div class='sethint'>A daily calendar event at the same time, so the morning check-in isn't forgotten. The app can't send notifications on its own yet.</div>"+
    "<div class='setopts'><button class='q' id='addcheckinrem'>"+icon("calendar","sm")+"Add to calendar</button></div></div>":"");
}

// The groups. On a phone each is its own page behind a list, so one screen is never
// everything at once; a big screen shows them all down one column.
const stepLabel=st=>{const lb=st.unit==="lb";return st.stepMode==="big"?(lb?"10 lb":"5 kg"):st.stepMode==="split"?(lb?"5/10 lb":"2.5/5 kg"):(lb?"5 lb":"2.5 kg");};
const BREAK_HINT={off:"Pick up where you left off.",gentle:"2+ weeks away: 95%. 4+ weeks: 90%.",standard:"2+ weeks away: 90%. 4+ weeks: 80%.",careful:"2+ weeks away: 85%. 4+ weeks: 70%."};
const pick=(pairs,v)=>{const p=pairs.find(x=>x[1]===v);return p?p[0]:"";};
function groups(){
  const st=state.settings,on=k=>!!st[k];
  const days=String(st.remindDays||"").split(",").filter(x=>x!=="").map(Number);
  return [
    {id:"display",title:"Display",pre:pick(TEXT_SIZES,st.textScale||0)+" text &middot; "+pick(THEMES,st.theme||"system")+" theme &middot; "+(st.bibleVersion==="kjv"?"KJV":"WEB"),html:()=>
      choiceRow("Text size","","textScale",TEXT_SIZES,"onerow")+
      choiceRow("Theme","","theme",THEMES)+
      toggleRow("Time of each set","","showSetTimes")+
      choiceRow("Bible version",st.bibleVersion==="kjv"?KJV_NOTICE:"","bibleVersion",[["WEB","web"],["KJV","kjv"]])+
      choiceRow("Church calendar","Feast days marked in the calendar.","feastSet",[["Off","off"],["Western","western"],["Orthodox","orthodox"]])+
      choiceRow("Rest day","The day the week keeps for rest.","restDay",[["Sunday",0],["Saturday",6]])},
    {id:"logging",title:"Logging",pre:"Start at "+(st.startReps||10)+" reps &middot; "+(st.unit||"kg")+" &middot; per side "+(on("perSideDouble")?"doubles":"as logged"),html:()=>
      choiceRow("Starting reps","","startReps",START_REPS.map(n=>[String(n),n]))+
      toggleRow("Per side counts double","10 per side totals 20 rather than 10.","perSideDouble")+
      choiceRow("Weight unit","","unit",[["kg","kg"],["lb","lb"]])},
    {id:"progression",title:"Progression",pre:(st.progressRange||"10-15").replace("-","&ndash;")+" reps &middot; +"+stepLabel(st)+" &middot; "+(+st.stallAfter?"deload after "+st.stallAfter:"no deload")+(st.breakRule&&st.breakRule!=="off"?" &middot; eases you back":""),html:()=>{
      const lb=st.unit==="lb",sm=lb?"5 lb":"2.5 kg",bg=lb?"10 lb":"5 kg";
      return choiceRow("Rep range","Every set at the top of the range → go heavier next time. Any exercise can have its own, in its sheet.","progressRange",[["6–10","6-10"],["8–12","8-12"],["10–15","10-15"],["12–15","12-15"]])+
      choiceRow("Jump","How much to add once every set reaches the top.","stepMode",[["+"+sm,"small"],["+"+bg,"big"],["Legs +"+bg+", rest +"+sm,"split"]])+
      choiceRow("If a set falls short","A set below the bottom of the range.","missRule",[["Keep the weight","hold"],["Drop one jump","drop"]])+
      choiceRow("Deload when stuck","The same weight with no extra reps, session after session.","stallAfter",[["Never",0],["After 2",2],["After 3",3],["After 4",4]])+
      (+st.stallAfter?choiceRow("Deload by","","deloadPct",[["5%",5],["10%",10],["15%",15]]):"")+
      choiceRow("Back after a break",BREAK_HINT[st.breakRule||"off"],"breakRule",[["Off","off"],["Gentle","gentle"],["Standard","standard"],["Careful","careful"]])+
      toggleRow("Fill in the next target","Off fills in last time's numbers instead.","autoTarget");}},
    {id:"workout",title:"Workout",pre:"Rest "+(st.restTarget?pick([["1:30",90],["2:00",120],["3:00",180],["4:00",240],["5:00",300]],st.restTarget)||st.restTarget+" s":"target off")+" &middot; alarm "+(on("restSound")?"on":"off")+" &middot; max HR "+(st.maxHR||190),html:()=>
      choiceRow("Rest target","","restTarget",[["Off",0],["1:30",90],["2:00",120],["3:00",180],["4:00",240],["5:00",300]])+
      choiceRow("Rest clock","Count down to the target, or up from the last set.","restDown",[["Count up",false],["Count down",true]])+
      toggleRow("Rest alarm","A beep and a buzz when the target passes. Keep the app open on iPhone; the beep is best effort with the screen locked.","restSound")+
      choiceRow("End an idle workout after","","idleEndMinutes",IDLE_ENDS)+
      toggleRow("Voice cues","Splits and interval changes spoken during cardio.","voice")+
      "<div class='setrow'><div class='setlbl'>Max heart rate</div><div class='sethint'>Sets your heart-rate zones for cardio.</div>"+
      "<div class='setopts cstepv'><button class='q' data-cardiomax='-1' aria-label='Lower'>&minus;</button><b class='mono'>"+(st.maxHR||190)+"</b><button class='q' data-cardiomax='1' aria-label='Higher'>+</button></div></div>"},
    {id:"recovery",title:"Recovery",pre:"Check-in "+(on("checkin")?"on":"off")+" &middot; "+(st.sleepNeed||8)+" h sleep",html:()=>
      toggleRow("Morning check-in","Four quick ratings and your sleep each morning. After a week, Today shows a readiness word and why.","checkin")+
      choiceRow("Sleep you aim for","","sleepNeed",[["7 h",7],["7.5 h",7.5],["8 h",8],["8.5 h",8.5],["9 h",9]])},
    {id:"modules",title:"More to track",pre:[["modFuel","Fuel"],["modMarkers","Markers"],["modMind","Mind"]].filter(([k])=>on(k)).map(x=>x[1]).join(", ")||"Fuel, Markers and Mind are off",html:()=>
      "<div class='setrow'><div class='setlbl'>Modules</div><div class='sethint'>Off until you want them. Each adds one chip to Today and a page under Progress.</div>"+
      "<div class='setopts'>"+[["modFuel","Fuel"],["modMarkers","Markers"],["modMind","Mind"]].map(([k,l])=>"<button class='q"+(st[k]?" on":"")+"' data-set='"+k+"' data-val='"+(st[k]?"0":"1")+"'>"+l+(st[k]?" &#10003;":"")+"</button>").join("")+"</div></div>"+
      (st.modFuel?choiceRow("Protein goal","Sets your daily target from your weight.","goal",[["Building","lift"],["Cutting","cut"],["Endurance","endure"],["General","general"]])+
        toggleRow("Track calories and macros too","Protein alone is enough for most lifters; switch this on for the full picture.","fuelMacros"):"")},
    {id:"body",title:"Body",pre:st.heightCm?st.heightCm+" cm"+(st.sex?" &middot; "+(st.sex==="m"?"male":"female"):""):"Height and sex, for the body-fat estimate",html:()=>
      "<div class='setrow'><div class='setlbl'>Height and sex</div><div class='sethint'>Only for the body-fat estimate from your tape measurements.</div>"+
      "<div class='setopts'><input class='timein mono setin' id='heightcm' inputmode='numeric' placeholder='Height, cm' value='"+(st.heightCm||"")+"'>"+
        [["","Not set"],["m","Male"],["f","Female"]].map(([v,l])=>"<button class='q"+((st.sex||"")===v?" on":"")+"' data-set='sex' data-val='"+v+"'>"+l+"</button>").join("")+"</div></div>"},
    {id:"data",title:"Your data",pre:"Backup, export, import &middot; last backup "+(state.backupAt?esc(shortDate(state.backupAt)):"never"),html:()=>
      // Files in and out: a spreadsheet of every set, a full backup, and loading either back.
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
      "<div class='setrow'><div class='setlbl'>Export for another app</div>"+
      "<div class='sethint'>Nothing here is locked in. A Strong-format CSV imports into Hevy, Strong and most trackers; runs and rides go out as GPX and TCX from History. Everything together as one zip.</div>"+
      "<div class='setopts'><button class='q' id='exportstrong'>"+icon("save","sm")+"Strong-format CSV</button>"+
        "<button class='q' id='exportall'>"+icon("save","sm")+"Everything (zip)</button></div></div>"+
      "<div class='setrow'><div class='setlbl'>Import from other apps</div>"+
      "<div class='sethint'>Strava, Garmin Connect, Apple Health, Strong, Hevy, Fitbod, or any FIT, GPX or TCX file. Read on this device; nothing is uploaded.</div>"+
      "<div class='setopts'><button class='q' id='openimport'>"+icon("share","sm")+"Import history</button></div></div>"+
      "<div class='setrow'><div class='setlbl'>Home Screen</div>"+
      "<div class='sethint'>"+(standalone()?"Installed. KingsKiln opens full screen and keeps your data safe.":
        (isIOS()?"In Safari: Share &rsaquo; Add to Home Screen &rsaquo; Add. Installed, it opens full screen, keeps the screen on during runs and keeps your data safe.":
         "In the browser menu: Add to Home screen or Install app. Installed, it opens full screen and keeps your data safe."))+"</div></div>"+
      "<div class='setrow'><div class='setlbl'>Storage</div>"+
      "<div class='sethint' id='storageline'>"+(state.storageInfo?esc(state.storageInfo):"Measuring&hellip;")+"</div></div>"},
    {id:"reminder",title:"Reminder",pre:days.length?days.map(i=>DAY_LETTERS[i]).join(" ")+" at "+(st.remindTime||"07:00"):"A calendar reminder to train",html:reminderRow},
    {id:"about",title:"About",pre:(state.appVersion?"Version "+esc(state.appVersion)+" &middot; ":"")+"updates, share, feedback, credits",html:()=>
      "<div class='setrow'><div class='setlbl'>App version</div>"+
      "<div class='sethint'>"+(state.appVersion?"This device is running "+esc(state.appVersion)+". ":"")+(state.updating?"Updating&hellip;":"Your history stays as it is either way.")+"</div>"+
      "<div class='setopts'><button class='q' id='checkupdate'"+(state.updating?" disabled":"")+">"+icon("reset","sm")+"Check for updates</button>"+
      "<button class='q' id='freshreload'>Reload app</button></div></div>"+
      "<div class='setrow'><div class='setlbl'>Share KingsKiln</div>"+
      "<div class='setopts'><button class='q' id='shareapp'>&#8679; Send the app to a friend</button></div></div>"+
      "<div class='setrow'><div class='setlbl'>Send feedback</div>"+
      "<div class='setopts'><button class='q' id='feedbackbtn'>&#9998; Tell the developer</button></div></div>"+
      // Where the verses come from, and the acknowledgement the KJV's UK rights holder asks for.
      "<div class='setrow'><div class='setlbl'>Bible text</div>"+
      "<div class='sethint'>World English Bible (WEB): public domain. "+KJV_NOTICE+"</div></div>"+
      // Names are used only to describe movements; saying so plainly avoids implying endorsement.
      "<div class='setrow'><div class='setlbl'>Exercise names</div>"+
      "<div class='sethint'>Exercise and method names, including ATG and knees-over-toes terms, are used "+
        "only to describe movements. KingsKiln is independent and not affiliated with or endorsed by "+
        "anyone those names refer to. Demo links open a YouTube search.</div></div>"+
      // Whose names are whose: ours marked as a trademark, everyone else's credited to them.
      "<div class='setrow'><div class='setlbl'>Trademarks</div>"+
      "<div class='sethint'>KingsKiln&trade; and the shield-and-cross mark are trademarks of KingsKiln. Other product, "+
        "programme and company names are trademarks of their owners, used only to identify them.</div></div>"+
      "<div class='reset'><button id='resetsettings'>Restore defaults</button></div>"},
  ];
}

export function settingsView(){
  const all=groups();
  const list=sel=>"<div class='setlist'>"+all.map(x=>"<button class='lrow setpart"+(sel===x.id?" sel":"")+"' data-setpart='"+x.id+"'"+(sel===x.id?" aria-current='true'":"")+"><span class='lt'>"+x.title+"</span><span class='lpre'>"+x.pre+"</span><span class='lchev'>&rsaquo;</span></button>").join("")+"</div>";
  // A big screen shows the same groups as a list on the left and the chosen one on the right.
  if(wide()){
    const cur=all.find(x=>x.id===state.settingsPart)||all[0];
    return "<div class='wrap setsplit'><section class='setmaster' data-keepx='setm'>"+pageHead("Settings")+list(cur.id)+"</section>"+
      "<section class='setdetail' data-keepx='setd'><div class='dhead'><div class='dheadt'><h1 class='dtitle'>"+cur.title+"</h1></div></div><div class='setcols'>"+cur.html()+"</div></section></div>";
  }
  const g=all.find(x=>x.id===state.settingsPart);
  if(g)return "<div class='wrap scroll setwrap'>"+pageHead(g.title)+"<div class='setcols'>"+g.html()+"</div></div>";
  // The list: each group as one row with a line on what it holds now.
  return "<div class='wrap scroll setwrap'>"+
    "<div class='hhead'><div></div><div class='h1 plain htitle'>Settings</div><div class='hact'></div></div>"+list(null)+"</div>";
}
