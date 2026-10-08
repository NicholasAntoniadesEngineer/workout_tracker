// Getting around and the small helpers: every screen's address there and back, the keyboard
// shortcuts, the ⌘K palette, in-app dialogs, calendar reminders, checking for a new version, and
// sending feedback. Runs in its own process, so pinning the timezone here touches no other test.
process.env.TZ="Europe/London";

import {test,describe,beforeEach} from "node:test";
import assert from "node:assert/strict";

const memory=new Map();
Object.defineProperty(globalThis,"localStorage",{configurable:true,writable:true,value:{
  getItem:k=>(memory.has(k)?memory.get(k):null),
  setItem:(k,v)=>{memory.set(k,String(v));},
  removeItem:k=>{memory.delete(k);},
  clear:()=>{memory.clear();}
}});
// db.js tells the app's other windows when it saves; a test has none.
Object.defineProperty(globalThis,"BroadcastChannel",{configurable:true,writable:true,value:undefined});
// Just enough page for the shortcuts and the palette: buttons found by the selector the code
// asks for, buttons the palette makes and clicks, and the listeners modules add.
const screen=new Map(),clicked=[],listeners=[];
globalThis.document={documentElement:{dataset:{}},visibilityState:"visible",
  querySelector:s=>{const v=screen.get(s);return (Array.isArray(v)?v[0]:v)||null;},
  querySelectorAll:s=>{const v=screen.get(s);return v?[].concat(v):[];},
  getElementById:id=>screen.get("#"+id)||null,
  addEventListener:(type,fn)=>{listeners.push([type,fn]);},
  createElement:()=>{const attrs={};return {hidden:false,setAttribute:(k,v)=>{attrs[k]=v;},click(){clicked.push(attrs);},remove(){}};},
  body:{appendChild(){}}};

const {parseRoute,routeOf,titleOf}=await import("../js/route.js");
const store=await import("../js/store.js");
const {handleKey}=await import("../js/keys.js");
const pal=await import("../js/palette.js");
const dialog=await import("../js/dialog.js");
const {checkinICS,reminderICS}=await import("../js/reminder.js");
const update=await import("../js/update.js");
const feedback=await import("../js/feedback.js");
const {NAV}=await import("../js/views/shell.js");
const S=store.state;

describe("addresses",()=>{
  const VIEWS={home:"#/",log:"#/log",history:"#/history",calendar:"#/calendar",progress:"#/progress",body:"#/body",cardio:"#/cardio",
    settings:"#/settings",import:"#/import",stack:"#/supplements",prog:"#/programme",health:"#/health",review:"#/review",planner:"#/plan"};

  test("every screen's address leads back to that screen",()=>{
    for(const [view,hash] of Object.entries(VIEWS)){
      assert.equal(routeOf({view}),hash,view);
      assert.deepEqual(parseRoute(hash),{view},hash);
    }
  });

  test("a screen with no address of its own is addressed as the Log",()=>{
    assert.equal(routeOf({view:"somewhere new"}),"#/log");
  });

  test("Learn names with spaces, ampersands, plus signs, slashes, percent signs and accents come back exactly",()=>{
    for(const name of ["New Zealand & Pacific","5+3/1","100% effort","Pahlavani — Zurkhaneh","Café Müller","Ben Patrick's ATG"]){
      assert.equal(parseRoute(routeOf({view:"learn",learnArea:"world",learnCat:name})).learnCat,name);
      assert.equal(parseRoute(routeOf({view:"learn",learnOpen:name})).learnOpen,name);
      assert.equal(parseRoute(routeOf({view:"learn",learnIndex:name})).learnIndex,name);
      assert.equal(parseRoute(routeOf({view:"learn",learnArea:name})).learnArea,name);
    }
  });

  test("a topic wins over an index, an index over an area, and the area defaults to training",()=>{
    assert.equal(routeOf({view:"learn",learnOpen:"kot",learnIndex:"people",learnArea:"world"}),"#/learn/t/kot");
    assert.equal(routeOf({view:"learn",learnIndex:"people",learnArea:"world"}),"#/learn/i/people");
    assert.equal(routeOf({view:"learn"}),"#/learn/training");
  });

  test("opening Learn by address clears what was open, and a bare #/learn keeps the area",()=>{
    assert.deepEqual(parseRoute("#/learn"),{view:"learn",learnOpen:null,learnIndex:null,learnCat:null});
    assert.deepEqual(parseRoute("#/learn/world"),{view:"learn",learnOpen:null,learnIndex:null,learnCat:null,learnArea:"world"});
  });

  test("extra parts after a screen's address are ignored, and other hashes are left alone",()=>{
    assert.deepEqual(parseRoute("#/log/extra/bits"),{view:"log"});
    assert.deepEqual([parseRoute(null),parseRoute("#"),parseRoute("#/")],[{view:"home"},{view:"home"},{view:"home"}]);
    assert.equal(parseRoute("#/history?x=1"),null);assert.equal(parseRoute("#!/log"),null);
  });

  test("a broken escape in an address is left alone rather than throwing",()=>{
    for(const h of ["#/learn/t/%E0%A4%A","#/learn/world/c/100%","#/learn/i/%"])
      assert.doesNotThrow(()=>parseRoute(h),h);
  });

  test("tab titles name the screen, the day on the Log, and the topic's lead in Learn",()=>{
    assert.equal(titleOf({view:"log",logTitle:"Legs"}),"Legs · KingsKiln™");
    assert.equal(titleOf({view:"log"}),"Log · KingsKiln™");
    assert.equal(titleOf({view:"learn"},"Knees over toes"),"Knees over toes · KingsKiln™");
    assert.equal(titleOf({view:"learn"}),"Learn · KingsKiln™");
    assert.equal(titleOf({view:"nowhere"}),"KingsKiln™");
  });
});

describe("keyboard shortcuts",()=>{
  let renders=0;
  const render=()=>{renders++;};
  const btn=(sel,o={})=>{const b={clicks:0,focused:false,disabled:!!o.disabled,on:!!o.on,dataset:{ex:o.ex},
    classList:{contains:c=>b.on&&(c==="on"||c==="sel")},click(){b.clicks++;},focus(){b.focused=true;},select(){}};
    if(sel)screen.set(sel,b);return b;};
  const row=(sel,n,onAt)=>{const list=Array.from({length:n},(_,i)=>btn(null,{on:i===onAt,ex:"x"+i}));screen.set(sel,list);return list;};
  const key=(k,x={})=>handleKey(Object.assign({key:k,target:{tagName:x.tag||"BODY"},metaKey:false,ctrlKey:false,altKey:false,shiftKey:false},x),render);
  beforeEach(()=>{screen.clear();renders=0;
    Object.assign(S,{view:"log",numEdit:null,sheet:false,exHist:false,exInfo:null,editing:null,keysOpen:false,dialog:null,palette:null,
      learnOpen:null,learnCat:null,learnIndex:null,cardio:null,cardioDone:null,exId:null});});

  test("typing in a field, or holding ⌘, Ctrl or Alt, is left to the browser",()=>{
    const log=btn("#logbtn");
    for(const tag of ["INPUT","TEXTAREA","SELECT"])assert.equal(key("l",{tag}),false);
    for(const mod of ["metaKey","ctrlKey","altKey"])assert.equal(key("l",{[mod]:true}),false);
    assert.equal(log.clicks,0);
  });

  test("Space and Enter on a focused button press that button, not a shortcut",()=>{
    const start=btn("#setstart");
    assert.equal(key(" ",{tag:"BUTTON"}),false);assert.equal(key("Enter",{tag:"BUTTON"}),false);
    assert.equal(start.clicks,0);
  });

  test("with the number pad open, digits, the point, Backspace and Enter go to the pad and nothing else",()=>{
    S.numEdit={field:"weight",buf:""};
    const seven=btn("[data-key='7']"),dot=btn("[data-key='.']"),back=btn("[data-key='back']"),done=btn("[data-key='done']"),log=btn("#logbtn");
    for(const k of ["7",".","Backspace","Enter"])assert.equal(key(k),true,k);
    assert.deepEqual([seven.clicks,dot.clicks,back.clicks,done.clicks],[1,1,1,1]);
    assert.equal(key("l"),false);assert.equal(log.clicks,0);
  });

  test("? opens and closes the list of shortcuts",()=>{
    assert.equal(key("?"),true);assert.equal(S.keysOpen,true);
    key("?");assert.equal(S.keysOpen,false);assert.equal(renders,2);
  });

  test("1 to 5 go to the sections in the sidebar, in order",()=>{
    const navs=NAV.map(n=>btn(".side [data-nav='"+n[0]+"']"));
    for(let i=1;i<=5;i++)assert.equal(key(String(i)),true);
    assert.deepEqual(navs.map(b=>b.clicks),[1,1,1,1,1]);
    assert.equal(key("6"),false);
  });

  test("/ focuses the first search box on screen, else opens the picker",()=>{
    const ex=btn("#exsearch"),open=btn("#opensheet");
    key("/");assert.deepEqual([ex.focused,open.clicks],[true,0]);
    screen.delete("#exsearch");key("/");assert.equal(open.clicks,1);
  });

  test("on the Log: L logs, or updates while editing; Space starts a set; arrows step reps, with Shift the weight",()=>{
    const log=btn("#logbtn"),upd=btn("#upd"),start=btn("#setstart"),up=btn("[data-step='reps:1']"),down=btn("[data-step='reps:-1']"),wup=btn("[data-step='weight:1']");
    key("L");S.editing={ex:"x",i:0};key("l");S.editing=null;
    key(" ");key("ArrowUp");key("ArrowDown");key("ArrowUp",{shiftKey:true});
    assert.deepEqual([log.clicks,upd.clicks,start.clicks,up.clicks,down.clicks,wup.clicks],[1,1,1,1,1,1]);
  });

  test("on the Log, the arrows step the band when there is no reps stepper, and letters reach the panel's buttons",()=>{
    const band=btn("[data-step='band:1']"),reps=btn("[data-edit='reps']"),w=btn("[data-edit='weight']"),side=btn("#sidebtn"),warm=btn("#warmbtn"),add=btn("#opensheet");
    for(const k of ["ArrowUp","r","w","p","u","a"])assert.equal(key(k),true,k);
    assert.deepEqual([band,reps,w,side,warm,add].map(b=>b.clicks),[1,1,1,1,1,1]);
  });

  test("a disabled button is never pressed",()=>{
    const log=btn("#logbtn",{disabled:true});
    assert.equal(key("l"),false);assert.equal(log.clicks,0);
  });

  test("with the picker, an exercise's history or its page open, the Log's own keys do nothing",()=>{
    const log=btn("#logbtn");
    for(const k of ["sheet","exHist","exInfo"]){S[k]=true;assert.equal(key("l"),false,k);S[k]=k==="exInfo"?null:false;}
    assert.equal(log.clicks,0);
  });

  test("J and K step through the day's exercises and stop at the ends",()=>{
    const list=row(".lgsheet .lgexn[data-ex], .tblwrap .exbtn[data-ex]",3);
    S.exId="x1";assert.equal(key("j"),true);assert.equal(list[2].clicks,1);
    S.exId="x2";assert.equal(key("j"),false);
    S.exId="x0";assert.equal(key("k"),false);
    S.exId="none";key("k");assert.equal(list[0].clicks,1,"nothing selected starts at the first");
  });

  test("in History, J and K move the selection and Enter opens it; in the calendar, the arrows change month",()=>{
    S.view="history";const list=row(".hmaster [data-histsel]",3,0),open=btn(".hdetail [data-load]");
    key("j");key("Enter");assert.deepEqual([list[1].clicks,open.clicks],[1,1]);
    S.view="calendar";const prev=btn("#calprev"),next=btn("#calnext");
    key("ArrowLeft");key("ArrowRight");key("Enter");assert.deepEqual([prev.clicks,next.clicks,open.clicks],[1,1,2]);
  });

  test("in Learn, [ and ] change tab, and the arrows change area only on the area list",()=>{
    S.view="learn";const tabs=row("[data-learntab]",3,1),areas=row("[data-learnarea]",3,1);
    key("]");key("[");assert.deepEqual([tabs[2].clicks,tabs[0].clicks],[1,1]);
    key("ArrowRight");assert.equal(areas[2].clicks,1);
    S.learnOpen="kot";assert.equal(key("ArrowLeft"),false);
  });

  test("on Cardio, Enter starts, and while running Space pauses and N skips",()=>{
    S.view="cardio";const go=btn("[data-cardiostart]"),pause=btn("[data-cardiopause]"),skip=btn("[data-cardioskip]");
    key("Enter");S.cardio={};key(" ");key("n");key("Enter");
    assert.deepEqual([go.clicks,pause.clicks,skip.clicks],[1,1,1]);
  });

  test("shortcuts do nothing behind an open dialog",()=>{
    const log=btn("#logbtn"),nav=btn(".side [data-nav='"+NAV[1][0]+"']");
    S.dialog={kind:"confirm",title:"End the workout?",act:"endworkout",ok:"End workout"};
    assert.equal(key("l"),false);assert.equal(key("2"),false);
    assert.deepEqual([log.clicks,nav.clicks],[0,0]);
  });
});

describe("the ⌘K palette",()=>{
  const day=(id,created,title,ex=[{name:"Squats",sets:[]}])=>({id,title,created,ex});
  beforeEach(()=>{clicked.length=0;
    Object.assign(S,{catalog:["Squats","Front squat","Deadlift","Romanian deadlift","Bench press","Leg press","Leg extension"],
      sessions:[],learnRecent:[],palette:null,sheet:true});});

  test("with nothing typed, every section and action is offered, sections first",()=>{
    const r=pal.paletteResults("");
    assert.deepEqual(r.filter(x=>x.group==="Go to").map(x=>x.label),NAV.map(n=>n[1]));
    assert.equal(r.filter(x=>x.group==="Do").length,10);
    assert.equal(r.findIndex(x=>x.group==="Do"),NAV.length);
  });

  test("a match at the start of a word ranks above one inside a word, and accents and case don't matter",()=>{
    const r=pal.paletteResults("p").filter(x=>x.group==="Go to"||x.group==="Do");
    assert.equal(r[0].label,"Progress");
    assert.deepEqual(r.map(x=>x.s),r.map(x=>x.s).slice().sort((a,b)=>b-a));
    assert.equal(pal.paletteResults("SÉTTINGS")[0].label,"Settings");
    assert.deepEqual(pal.paletteResults("zzzz"),[]);
  });

  test("exercises, at most six, add to today; matching days, at most five and newest first, open",()=>{
    S.sessions=[1,2,3,4,5,6,7].map(i=>day("d"+i,"2026-09-0"+i+"T09:00:00.000Z","Leg day "+i)).concat([day("e","2026-09-09T09:00:00.000Z","Leg day empty",[])]);
    const r=pal.paletteResults("leg");
    const exs=r.filter(x=>x.group==="Exercises"),days=r.filter(x=>x.group==="Days");
    assert.deepEqual(exs.map(x=>x.label),["Leg press","Leg extension"]);
    assert.deepEqual(exs[0].attrs,{"data-add":"Leg press","data-palinfo":"Leg press"});
    assert.deepEqual(days.map(x=>x.attrs["data-load"]),["d7","d6","d5","d4","d3"]);
    assert.ok(pal.paletteResults("squat").filter(x=>x.group==="Exercises").length<=6);
  });

  test("no more than 24 results are listed",()=>{
    S.catalog=Array.from({length:50},(_,i)=>"Thing "+i);
    S.sessions=Array.from({length:20},(_,i)=>day("t"+i,new Date(Date.UTC(2026,8,1+i)).toISOString(),"Thing day"));
    assert.ok(pal.paletteResults("t").length<=24);
  });

  test("the list says when nothing matches, showing the query safely, and keeps the selection in range",()=>{
    S.palette={q:"<b>zz",sel:0};
    const empty=pal.paletteList();
    assert.ok(empty.includes("&lt;b&gt;zz")&&!empty.includes("<b>zz"));
    S.palette={q:"",sel:99};const html=pal.paletteList();
    assert.equal(S.palette.sel,S.palette.count-1);assert.equal((html.match(/aria-selected/g)||[]).length,1);
    S.palette=null;assert.equal(pal.paletteView(),"");assert.equal(pal.paletteList(),"");
  });

  test("running a result presses the same button a tap would, and closes the palette",()=>{
    S.palette={q:"dark",sel:0};pal.runPalette(0);
    assert.deepEqual(clicked,[{"data-set":"theme","data-val":"dark"}]);assert.equal(S.palette,null);
    S.palette={q:"dark",sel:0};pal.runPalette(5);assert.equal(clicked.length,1,"a result that isn't there does nothing");
  });

  test("an exercise opens the Log and goes onto today, or with Shift opens its page",()=>{
    S.palette={q:"deadlift",sel:0};const i=pal.paletteResults("deadlift").findIndex(x=>x.label==="Deadlift");
    pal.runPalette(i);
    assert.deepEqual(clicked,[{"data-nav":"log"},{"data-add":"Deadlift"}]);assert.equal(S.sheet,false);
    clicked.length=0;S.sheet=true;S.palette={q:"deadlift",sel:0};pal.runPalette(i,true);
    assert.deepEqual(clicked,[{"data-nav":"log"},{"data-exinfo":"Deadlift"}]);assert.equal(S.sheet,true);
  });
});

describe("the ⌘K palette once Learn has loaded",()=>{
  test("a topic is found by its title, and recent topics show with nothing typed",async()=>{
    const {loadLearn,topicById}=await import("../js/lazy.js");
    await loadLearn();
    Object.assign(S,{catalog:[],sessions:[],learnRecent:["kot","no-such-topic"]});
    const hit=pal.paletteResults("knees over").find(x=>x.group==="Learn");
    assert.deepEqual([hit.label,hit.attrs],[topicById("kot").title,{"data-learnjump":"kot"}]);
    assert.ok(pal.paletteResults("knees over").filter(x=>x.group==="Learn").length<=6);
    assert.deepEqual(pal.paletteResults("").filter(x=>x.group==="Recent in Learn").map(x=>x.attrs["data-learnjump"]),["kot"]);
  });
});

describe("in-app dialogs",()=>{
  // What a browser reads as the value of the rename box: the single-quoted attribute, decoded.
  const inputValue=html=>{const m=html.match(/<input class='dlgin[^>]* value='([^']*)'/);
    return m&&m[1].replace(/&quot;/g,'"').replace(/&#39;|&#x27;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");};
  beforeEach(()=>{S.dialog=null;});

  test("ask, confirm and notice set up the dialog with their defaults",()=>{
    dialog.ask({title:"Name this day",value:"Legs",act:"nameday"});
    assert.deepEqual(S.dialog,{kind:"ask",ok:"Save",title:"Name this day",value:"Legs",act:"nameday"});
    dialog.confirmAct({title:"Reset?",act:"resetrest",ok:"Reset"});assert.deepEqual([S.dialog.kind,S.dialog.ok],["confirm","Reset"]);
    dialog.notice("Saved");assert.deepEqual(S.dialog,{kind:"notice",title:"Saved",text:"",ok:"OK"});
  });

  test("nothing is shown with no dialog, and title and text are shown as text, never markup",()=>{
    assert.equal(dialog.dialogView(),"");
    dialog.confirmAct({title:"<img src=x onerror=alert(1)>",text:"a & b \"c\""});
    const h=dialog.dialogView();
    assert.ok(!h.includes("<img")&&h.includes("&lt;img")&&h.includes("a &amp; b &quot;c&quot;"));
  });

  test("a notice has only OK, a dangerous one is marked, and the box takes its type and placeholder",()=>{
    dialog.notice("Couldn't read that backup");let h=dialog.dialogView();
    assert.ok(!h.includes("dlgcancel")&&h.includes("alertdialog"));
    dialog.confirmAct({title:"Delete?",danger:true,cancel:"Keep"});h=dialog.dialogView();
    assert.ok(h.includes("btn dang")&&h.includes(">Keep<"));
    dialog.ask({title:"Minutes",value:null,type:"number",inputmode:"decimal",placeholder:"45",mono:true});h=dialog.dialogView();
    assert.ok(h.includes("type='number'")&&h.includes("inputmode='decimal'")&&h.includes("placeholder='45'")&&h.includes("dlgin mono"));
    assert.equal(inputValue(h),"");
  });

  test("a name with quotes and ampersands comes back whole in the rename box",()=>{
    dialog.ask({title:"Name this day",value:'Push & "pull"',act:"nameday"});
    assert.equal(inputValue(dialog.dialogView()),'Push & "pull"');
  });

  test("a name with an apostrophe comes back whole in the rename box",()=>{
    // Learn's workouts are named like this one; starting it names the day.
    const name="Ben Patrick's Knee Ability Pro: Thursday";
    dialog.ask({title:"Name this day",value:name,act:"nameday"});
    assert.equal(inputValue(dialog.dialogView()),name);
  });
});

describe("calendar reminders",()=>{
  const line=(ics,k)=>(ics.split("\r\n").find(l=>l.startsWith(k+":"))||"").slice(k.length+1);
  // Thursday 8 October 2026, 08:00 in London.
  const thu8=new Date(2026,9,8,8,0).getTime();

  test("the training reminder starts on the next chosen weekday, later today if the time is still ahead",()=>{
    assert.equal(line(reminderICS([3],"09:00",thu8),"DTSTART"),"20261008T090000");
    assert.equal(line(reminderICS([3],"07:00",thu8),"DTSTART"),"20261015T070000");
    assert.equal(line(reminderICS([0,4],"07:00",thu8),"DTSTART"),"20261009T070000");
    assert.equal(line(reminderICS([3],"08:00",thu8),"DTSTART"),"20261015T080000","the very minute has already passed");
  });

  test("it repeats weekly on the chosen days, lasts 45 minutes in local time, and is a well-formed calendar",()=>{
    const ics=reminderICS([0,4],"7:5",thu8);
    assert.equal(line(ics,"RRULE"),"FREQ=WEEKLY;BYDAY=MO,FR");
    assert.deepEqual([line(ics,"DTSTART"),line(ics,"DTEND")],["20261009T070500","20261009T075000"]);
    assert.match(line(ics,"UID"),/-04@kingskiln\.com$/);
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n")&&ics.endsWith("END:VCALENDAR")&&!/\n(?!.)|[^\r]\n/.test(ics));
  });

  test("no days chosen means no reminder",()=>{assert.equal(reminderICS([],"07:00",thu8),"");});

  test("the morning check-in starts tomorrow once today's time has passed, and lasts five minutes",()=>{
    let ics=checkinICS("07:00",thu8);
    assert.deepEqual([line(ics,"DTSTART"),line(ics,"DTEND"),line(ics,"RRULE")],["20261009T070000","20261009T070500","FREQ=DAILY"]);
    ics=checkinICS("09:30",thu8);assert.equal(line(ics,"DTSTART"),"20261008T093000");
    assert.equal(line(checkinICS("",thu8),"DTSTART"),"20261009T070000","no time chosen means 07:00");
  });

  test("a training reminder set the day before the clocks change still starts at the chosen hour",()=>{
    assert.equal(line(reminderICS([6],"07:00",new Date(2026,2,28,8).getTime()),"DTSTART"),"20260329T070000");
    assert.equal(line(reminderICS([6],"07:00",new Date(2026,9,24,8).getTime()),"DTSTART"),"20261025T070000");
  });

  test("a check-in reminder set the day before the clocks change still starts at the chosen hour",()=>{
    assert.equal(line(checkinICS("07:00",new Date(2026,2,28,8).getTime()),"DTSTART"),"20260329T070000","spring forward");
    assert.equal(line(checkinICS("07:00",new Date(2026,9,24,8).getTime()),"DTSTART"),"20261025T070000","fall back");
  });
});

describe("checking for a new version",()=>{
  const nav=v=>Object.defineProperty(globalThis,"navigator",{configurable:true,value:v});
  const realNav=globalThis.navigator;
  const cacheList=keys=>({keys:async()=>keys,deleted:[],async delete(k){this.deleted.push(k);return true;}});

  test("the version running is the newest KingsKiln cache, by number not by spelling",async()=>{
    globalThis.caches=cacheList(["kingskiln-v9","kingskiln-v194","kingskiln-v20","other-v999"]);
    assert.equal(await update.currentVersion(),"v194");
    globalThis.caches=cacheList(["other-v1"]);assert.equal(await update.currentVersion(),"");
    globalThis.caches={keys:async()=>{throw new Error("no caches");}};assert.equal(await update.currentVersion(),"");
    delete globalThis.caches;
  });

  test("no service worker or none registered is up to date; one installing or waiting is found; a failure is offline",async()=>{
    try{
      nav({});assert.equal(await update.checkForUpdate(),"latest");
      nav({serviceWorker:{getRegistration:async()=>undefined}});assert.equal(await update.checkForUpdate(),"latest");
      const reg=x=>({serviceWorker:{getRegistration:async()=>Object.assign({updated:0,async update(){this.updated++;}},x)}});
      nav(reg({}));assert.equal(await update.checkForUpdate(),"latest");
      nav(reg({installing:{}}));assert.equal(await update.checkForUpdate(),"found");
      nav(reg({waiting:{}}));assert.equal(await update.checkForUpdate(),"found");
      nav({serviceWorker:{getRegistration:async()=>({async update(){throw new Error("offline");}})}});
      assert.equal(await update.checkForUpdate(),"offline");
    }finally{nav(realNav);}
  });

  test("Reload app drops only the app's own caches, unregisters it and reloads, leaving the data alone",async()=>{
    const c=cacheList(["kingskiln-v193","kingskiln-v194","fonts"]);globalThis.caches=c;
    let unregistered=0,reloaded=0;
    nav({serviceWorker:{getRegistration:async()=>({async unregister(){unregistered++;}})}});
    globalThis.location={reload(){reloaded++;}};
    memory.set("workout_days_v2","kept");
    try{await update.freshReload();}finally{nav(realNav);delete globalThis.caches;delete globalThis.location;}
    assert.deepEqual([c.deleted,unregistered,reloaded,memory.get("workout_days_v2")],[["kingskiln-v193","kingskiln-v194"],1,1,"kept"]);
  });

  test("coming back to the app looks again, at most every ten minutes",async t=>{
    t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-10-08T09:00:00Z")});
    let checks=0;
    nav({serviceWorker:{getRegistration:async()=>{checks++;return null;}}});
    try{
      const from=listeners.length;update.watchForUpdates();
      const back=()=>listeners.slice(from).filter(([type])=>type==="visibilitychange").forEach(([,fn])=>fn());
      back();back();
      t.mock.timers.setTime(Date.parse("2026-10-08T09:09:59Z"));back();
      t.mock.timers.setTime(Date.parse("2026-10-08T09:10:01Z"));back();
      document.visibilityState="hidden";t.mock.timers.setTime(Date.parse("2026-10-08T10:00:00Z"));back();
      await new Promise(r=>setImmediate(r));
      assert.equal(checks,2);
    }finally{document.visibilityState="visible";nav(realNav);}
  });
});

describe("sending feedback",()=>{
  const nav=v=>Object.defineProperty(globalThis,"navigator",{configurable:true,value:v});
  const realNav=globalThis.navigator,realFetch=globalThis.fetch;
  const reply=(ok,status,body)=>async(url,opts)=>{reply.last={url,opts};return {ok,status,json:async()=>{if(body===undefined)throw new Error("not json");return body;}};};

  test("the context names the screen and version, and only the start of the device's name",t=>{
    t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-10-08T09:00:00Z")});
    nav({userAgent:"x".repeat(300)});
    try{
      assert.deepEqual(feedback.feedbackContext("log"),{screen:"log",version:"1.0",device:"x".repeat(180),when:"2026-10-08T09:00:00.000Z"});
      assert.equal(feedback.feedbackContext().screen,"home");
    }finally{nav(realNav);}
  });

  test("only what was typed and the context are sent, with a reply-to when an email is given",async()=>{
    globalThis.fetch=reply(true,200,{success:"true"});
    const ctx={screen:"log",version:"1.0",device:"phone",when:"2026-10-08T09:00:00.000Z"};
    try{
      await feedback.sendFeedback("Bug","The timer froze","me@example.com",ctx);
      const body=JSON.parse(reply.last.opts.body);
      assert.match(reply.last.url,/^https:\/\/formsubmit\.co\/ajax\//);assert.equal(reply.last.opts.method,"POST");
      assert.deepEqual(Object.keys(body).sort(),["Device","From","Message","Screen","Type","Version","When","_captcha","_replyto","_subject","_template","_url"]);
      assert.deepEqual([body.Message,body._replyto,body.From],["The timer froze","me@example.com","me@example.com"]);
      await feedback.sendFeedback("Idea","More plates","",ctx);
      assert.equal("_replyto" in JSON.parse(reply.last.opts.body),false);
    }finally{globalThis.fetch=realFetch;}
  });

  test("only a real success resolves; an unconfirmed address, a server error or no network rejects",async()=>{
    const ctx={screen:"log",version:"1.0",device:"",when:""};
    try{
      globalThis.fetch=reply(true,200,{success:true,message:"sent"});
      assert.equal((await feedback.sendFeedback("Bug","x","",ctx)).message,"sent");
      globalThis.fetch=reply(true,200,{success:"false",message:"This form needs Activation."});
      await assert.rejects(feedback.sendFeedback("Bug","x","",ctx),/needs Activation/);
      globalThis.fetch=reply(false,500);
      await assert.rejects(feedback.sendFeedback("Bug","x","",ctx),/HTTP 500/);
      globalThis.fetch=async()=>{throw new TypeError("Failed to fetch");};
      await assert.rejects(feedback.sendFeedback("Bug","x","",ctx),/Failed to fetch/);
    }finally{globalThis.fetch=realFetch;}
  });

  test("the email fallback is addressed to the developer with the message and reply address encoded",()=>{
    const u=feedback.feedbackMailto("Bug","Sets & reps?\nLine two","me@example.com");
    assert.match(u,/^mailto:[^?]+\?subject=KingsKiln%20feedback%20%E2%80%94%20Bug&body=/);
    assert.equal(decodeURIComponent(u.split("&body=")[1]),"Sets & reps?\nLine two\n\n— reply to: me@example.com");
    assert.match(decodeURIComponent(feedback.feedbackMailto("Idea","x","")),/reply to: n\/a$/);
  });
});
