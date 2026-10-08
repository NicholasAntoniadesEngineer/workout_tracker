// The check-in, Fuel, Markers, Mind, Body and muscle-map screens as they render, and the taps
// that fill them, with the clock fixed: nothing a user reads says NaN, undefined or Infinity,
// pounds and inches carry through, and half-filled or imported entries read sensibly.
import {test,describe,beforeEach} from "node:test";
import assert from "node:assert/strict";

// A fixed clock (Thursday 8 October 2026, midday UTC) and just enough of a browser: an
// in-memory localStorage, a bare <html>, form fields by id, and no BroadcastChannel, which
// would keep the test process alive.
process.env.TZ="UTC";
Object.defineProperty(globalThis,"BroadcastChannel",{configurable:true,writable:true,value:undefined});
const memory=new Map();
Object.defineProperty(globalThis,"localStorage",{configurable:true,writable:true,value:{
  getItem:k=>(memory.has(k)?memory.get(k):null),setItem:(k,v)=>{memory.set(k,String(v));},removeItem:k=>{memory.delete(k);},clear:()=>{memory.clear();}}});
const fields={};
globalThis.document={documentElement:{dataset:{}},getElementById:id=>(id in fields?{value:fields[id]}:null)};
const RealDate=Date,NOW=RealDate.parse("2026-10-08T12:00:00.000Z"),DAY=86400000,HOUR=3600000;
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[NOW]));}static now(){return NOW;}};

const {state,load}=await import("../js/store.js");
const CI=await import("../js/views/checkin.js");
const HV=await import("../js/views/health.js");
const {bodyView}=await import("../js/views/body.js");
const {bodyMapCard}=await import("../js/views/bodymap.js");
const checkinAct=await import("../js/actions/checkin.js");
const healthAct=await import("../js/actions/health.js");
const {bodyFatRange,navyBodyFat}=await import("../js/body.js");

const iso=ago=>new RealDate(NOW-ago).toISOString();
const ctx={render(){},snapshot(){}};
// A tapped element: matches "#id" and "[data-x]" the way the handlers ask for them.
const tap=(id,attrs={})=>({id,getAttribute:k=>(k in attrs?attrs[k]:null),
  closest(sel){if(sel==="#"+id)return this;const m=sel.match(/^\[([a-z-]+)\]$/);return m&&m[1] in attrs?this:null;}});
const press=(mod,id,attrs)=>mod.handle(tap(id,attrs),ctx);
const clean=(h,what)=>{const m=String(h).match(/.{0,30}\b(NaN|undefined|Infinity|null)\b.{0,30}/);assert.equal(m,null,(what||"")+": "+(m&&m[0]));return h;};
const rated=(ago,r,x)=>Object.assign({at:iso(ago),sleep:r,soreness:r,fatigue:r,stress:r,bed:"23:00",wake:"07:00",hours:8},x||{});
const sq=(ago,n,name)=>({id:"s"+ago+(name||""),created:iso(ago),started:"",ended:"",title:"",ex:[{name:name||"Back squat",sets:Array.from({length:n},()=>({r:5,w:100,at:iso(ago),wu:false}))}]});
const marks=h=>[...h.matchAll(/<i class='([a-z]*)' title='([^']*)'/g)].map(m=>[m[1],m[2]]);

function fresh(settings){
  memory.clear();load();
  Object.assign(state,{checkinDraft:null,fuelDraft:null,markerDraft:null,habitDraft:null,breath:null,breathKind:null,breathMins:null,
    bodyDate:null,bodyMore:false,bodyMetric:null,bmMode:null,bmSel:null,healthPart:null});
  for(const k in fields)delete fields[k];
  Object.assign(state.settings,settings||{});
}
beforeEach(()=>fresh());

describe("the readiness card and strip",()=>{
  test("with check-ins off in Settings, nothing shows on Today or Progress",()=>{
    fresh({checkin:false});state.checkins=[rated(0,2)];
    assert.equal(CI.readinessCard(),"");assert.equal(CI.recoverMini(),"");assert.equal(CI.recoverSection(),"");
  });
  test("before today's check-in it invites one; after the first few it counts down to readiness",()=>{
    assert.match(CI.readinessCard(),/Morning check-in/);
    state.checkins=[rated(2*DAY,2),rated(DAY,2),rated(0,2)];
    assert.match(clean(CI.readinessCard()),/readiness shows after 4 more/);
  });
  test("after a week it shows the band and what to do",()=>{
    state.checkins=Array.from({length:7},(_,i)=>rated((6-i)*DAY,2));
    const h=clean(CI.readinessCard());
    assert.match(h,/class='rslim push'/);assert.match(h,/<b>Push<\/b>/);
  });
  test("run down shows as run down, not as a band",()=>{
    state.checkins=Array.from({length:7},(_,i)=>rated((6-i)*DAY,1,i===6?{rundown:true}:{}));
    assert.match(clean(CI.readinessCard()),/<b>Run down<\/b> &middot; Rest today/);
  });
  // Exposes a bug: imported nights become check-ins rated 0 (actions/importer.js), which score
  // over 100, so a morning with no check-in reads "Push" and the strip fills with push marks.
  test("nights imported from a watch never show as Push on the card or the strip",()=>{
    state.checkins=Array.from({length:10},(_,i)=>({at:iso((9-i)*DAY),sleep:0,soreness:0,fatigue:0,stress:0,bed:"23:00",wake:"07:00",hours:7.5,imported:true}));
    assert.doesNotMatch(CI.readinessCard(),/rslim push|<b>Push<\/b>/);
    assert.deepEqual(marks(CI.readinessStrip()).filter(m=>m[0]==="ps").map(m=>m[1]),[]);
  });
  test("the strip has fourteen mornings, each coloured as it read, run down apart, missing ones blank",()=>{
    state.checkins=[rated(5*DAY,0,{sleep:4,soreness:4,fatigue:3,stress:3}),rated(3*DAY,5),rated(2*DAY,1,{rundown:true,sore:["knee"]}),
      rated(DAY,2,{hours:5}),rated(0,2)];
    const m=marks(clean(CI.readinessStrip()));
    assert.equal(m.length,14);
    assert.deepEqual(m.slice(-6).map(x=>x[0]),["ez","","rc","rd","rdy","ps"]);
    assert.match(m[11][1],/run down, slept 8 h, sore knee/);assert.match(m[12][1],/ready, slept 5 h/);
  });
  test("the Progress cards read sensibly with no sleep logged and with a heavy week",()=>{
    state.checkins=[rated(DAY,3,{hours:0,bed:"",wake:""}),rated(0,3,{hours:0,bed:"",wake:""})];
    let h=clean(CI.recoverMini(),"no sleep");assert.match(h,/No nights logged/);assert.match(h,/Steady/);
    clean(CI.recoverSection(),"no sleep");
    state.sessions=[sq(2*HOUR,20),sq(DAY,20),sq(2*DAY,20)];
    state.checkins=Array.from({length:10},(_,i)=>rated((9-i)*DAY,2,{hours:6.5}));
    h=clean(CI.recoverMini(),"heavy");assert.match(h,/Spike|High/);assert.match(h,/15 h sleep debt/);
    assert.match(clean(CI.recoverSection(),"heavy"),/spike: ease off|high: watch it/);
  });
  test("the hero line names what is still recovering and what is sore",()=>{
    state.sessions=[sq(HOUR,8)];state.checkins=[rated(0,2,{sore:["knee","lowerback"]})];
    assert.equal(CI.bodyLine(),"Still recovering: glutes, quads &middot; Sore: knee, lower back");
    state.sessions=[];state.checkins=[];assert.equal(CI.bodyLine(),"");
  });
});

describe("the check-in sheet",()=>{
  test("opens on yesterday's ratings and times, but never yesterday's run down or sore spots",()=>{
    state.checkins=[rated(DAY,2,{bed:"22:30",wake:"06:15",rundown:true,sore:["knee"]})];
    assert.equal(press(checkinAct,"cistart"),true);
    const d=state.checkinDraft;
    assert.deepEqual([d.sleep,d.soreness,d.fatigue,d.stress,d.bed,d.wake,d.rundown],[2,2,2,2,"22:30","06:15",0]);assert.deepEqual(d.sore,[]);
  });
  test("a first check-in starts empty, from 23:00 to 07:00, and Done waits for all four ratings",()=>{
    press(checkinAct,"cistart");
    assert.deepEqual(state.checkinDraft,{sleep:0,soreness:0,fatigue:0,stress:0,bed:"23:00",wake:"07:00",rundown:0,sore:[]});
    let h=clean(CI.checkinSheet());assert.match(h,/id='cisave' disabled/);assert.match(h,/8 h/);
    ["sleep","soreness","fatigue"].forEach(k=>press(checkinAct,"x",{"data-ci":k+":2"}));
    assert.match(CI.checkinSheet(),/id='cisave' disabled/);
    press(checkinAct,"x",{"data-ci":"stress:3"});
    assert.doesNotMatch(CI.checkinSheet(),/disabled/);
  });
  test("saving twice in a day corrects that day's check-in, keeping its time",()=>{
    press(checkinAct,"cistart");["sleep","soreness","fatigue","stress"].forEach(k=>press(checkinAct,"x",{"data-ci":k+":2"}));
    fields.cibed="23:45";fields.ciwake="06:30";press(checkinAct,"cisave");
    assert.equal(state.checkins.length,1);assert.equal(state.checkins[0].hours,6.8);assert.equal(state.checkinDraft,null);
    const first=state.checkins[0].at;
    press(checkinAct,"cistart");press(checkinAct,"x",{"data-ci":"sleep:4"});press(checkinAct,"x",{"data-cisore":"knee"});press(checkinAct,"cisave");
    assert.equal(state.checkins.length,1);assert.equal(state.checkins[0].at,first);assert.equal(state.checkins[0].sleep,4);assert.deepEqual(state.checkins[0].sore,["knee"]);
  });
  test("a sore spot tapped twice is cleared, and Close drops the draft without saving",()=>{
    press(checkinAct,"cistart");press(checkinAct,"x",{"data-cisore":"knee"});press(checkinAct,"x",{"data-cisore":"knee"});
    assert.deepEqual(state.checkinDraft.sore,[]);
    press(checkinAct,"ciclose");assert.equal(state.checkinDraft,null);assert.equal(state.checkins.length,0);
    assert.equal(CI.checkinSheet(),"");assert.equal(press(checkinAct,"cisave"),false);
  });
});

describe("Fuel",()=>{
  test("with nothing switched on, the page says where to switch things on",()=>{
    assert.match(clean(HV.healthView()),/Switch Fuel, Markers or Mind on in Settings/);
  });
  test("the protein target comes from the last weigh-in, converted from pounds",()=>{
    fresh({unit:"lb",goal:"lift",modFuel:true});state.body=[{at:iso(3*DAY),w:200},{at:iso(DAY),w:180}];
    const h=clean(HV.fuelSection());assert.match(h,/ of 165<span class='fuelsub'> &middot; from 180 lb, building/);
  });
  test("no weigh-in asks for one and draws no bar; no food shows a dash for the fast",()=>{
    fresh({modFuel:true,fastHours:16});
    const h=clean(HV.fuelSection());
    assert.match(h,/log a weigh-in for a target/);assert.doesNotMatch(h,/fuelbar/);assert.match(h,/&mdash;<\/b> since you last ate/);
  });
  test("adding a starter, your own item and water; Undo takes back only today's last glass",()=>{
    press(healthAct,"x",{"data-fueladd":"Eggs, 3 large","data-p":"19","data-kcal":"215"});
    press(healthAct,"fuelown");fields.fuelname="  Steak ";fields.fuelp="-5";fields.fuelkcal="abc";press(healthAct,"fuelsave");
    state.fuel.push({id:"old",at:iso(DAY),water:1});
    press(healthAct,"x",{"data-water":"1"});press(healthAct,"x",{"data-water":"1"});press(healthAct,"x",{"data-water":"-1"});
    assert.deepEqual(state.fuel.filter(e=>!e.water).map(e=>[e.name,e.p,e.kcal]),[["Eggs, 3 large",19,215],["Steak",0,0]]);
    assert.equal(state.fuel.filter(e=>e.water).length,2);assert.ok(state.fuel.some(e=>e.id==="old"));
    press(healthAct,"x",{"data-water":"-1"});press(healthAct,"x",{"data-water":"-1"});
    assert.deepEqual(state.fuel.filter(e=>e.water).map(e=>e.id),["old"]);
    clean(HV.fuelSection());
  });
  test("an own item with no name is dropped, and a logged item can be removed",()=>{
    press(healthAct,"fuelown");fields.fuelname="   ";fields.fuelp="30";press(healthAct,"fuelsave");
    assert.equal(state.fuel.length,0);assert.equal(state.fuelDraft,null);
    press(healthAct,"x",{"data-fueladd":"Tuna tin","data-p":"26"});
    press(healthAct,"x",{"data-delfuel":state.fuel[0].id});assert.equal(state.fuel.length,0);
  });
});

describe("Markers",()=>{
  const save=(id,at,v)=>{press(healthAct,"markeradd");fields.markerid=id;fields.markerdate=at;fields.markerv=v;press(healthAct,"markersave");};
  test("a reading saves; another for the same marker and day replaces it; zero or junk is refused",()=>{
    save("ferritin","2026-10-01","45");save("ferritin","2026-10-01","52");save("ferritin","2026-10-02","0");save("ferritin","2026-10-03","n/a");
    assert.deepEqual(state.markers.map(m=>[m.id,m.at,m.v]),[["ferritin","2026-10-01",52]]);
    assert.equal(state.markerDraft,null);
  });
  // Exposes a bug: readings are rounded to one decimal, so a TSH of 0.38 (below the 0.4 range)
  // is saved as 0.4 and shown "in range".
  test("a reading is kept to the decimals the lab printed, and flagged on them",()=>{
    save("tsh","2026-10-01","0.38");
    assert.equal(state.markers[0].v,0.38);
    assert.match(HV.markersSection(),/class='mflag low'/);
  });
  // Exposes a bug: parseFloat stops at a comma, so on a phone whose decimal key types "," an
  // HbA1c of 5,9 is saved as 5 and reads "in range" instead of high.
  test("a reading typed with a decimal comma keeps its decimals",()=>{
    save("hba1c","2026-10-01","5,9");
    assert.equal(state.markers.length,1);assert.equal(state.markers[0].v,5.9);
  });
  test("one reading, or several the same, draw without NaN; a change shows its sign",()=>{
    state.markers=[{key:"a",id:"vitd",at:"2026-01-01",v:30}];
    let h=clean(HV.markersSection());assert.doesNotMatch(h,/since last|mspark/);
    state.markers.push({key:"b",id:"vitd",at:"2026-04-01",v:30},{key:"c",id:"vitd",at:"2026-07-01",v:30});
    clean(HV.markersSection(),"flat");
    state.markers.push({key:"d",id:"vitd",at:"2026-09-01",v:24.5});
    h=clean(HV.markersSection());assert.match(h,/-5.5 since last/);assert.match(h,/class='mrow off'/);assert.match(h,/4 readings/);
    state.markers.push({key:"e",id:"ldl",at:"2026-09-01",v:90});assert.match(HV.markersSection(),/\+?90 <small>mg\/dL/);
  });
  test("removing a reading removes only that one",()=>{
    state.markers=[{key:"a",id:"vitd",at:"2026-01-01",v:30},{key:"b",id:"vitd",at:"2026-04-01",v:35}];
    press(healthAct,"x",{"data-delmarker":"b"});assert.deepEqual(state.markers.map(m=>m.key),["a"]);
  });
});

describe("Mind",()=>{
  test("habits: up to eight, no repeats, a tap marks today only, and removal by name",()=>{
    for(let i=0;i<10;i++){press(healthAct,"habitadd");fields.habitname=i===3?"Habit 0":"Habit "+i;press(healthAct,"habitsave");}
    assert.equal(state.habits.length,8);assert.equal(new Set(state.habits).size,8);
    assert.doesNotMatch(clean(HV.mindSection()),/id='habitadd'/,"eight is the limit");
    press(healthAct,"x",{"data-habit":"Habit 1"});assert.deepEqual(state.habitDone["2026-10-08"],["Habit 1"]);
    press(healthAct,"x",{"data-habit":"Habit 1"});assert.deepEqual(state.habitDone["2026-10-08"],[]);
    press(healthAct,"x",{"data-delhabit":"Habit 2"});assert.ok(!state.habits.includes("Habit 2"));
    assert.match(HV.mindSection(),/id='habitadd'/,"room for another");
  });
  test("the breath timer reads In, Hold and Out through every second, and Prayer just says Breathe",()=>{
    for(const kind of ["box","sigh","478","prayer"])for(let s=0;s<40;s++){
      state.breath={kind,secs:300,startedAt:NOW-s*1000,running:true};
      const word=HV.mindSection().match(/id='breathword'>([^<]*)</)[1];
      assert.match(word,kind==="prayer"?/^Breathe$/:/^(In|Hold|Out) \d+$/,kind+" at "+s+" s: "+word);
    }
    state.breath={kind:"box",secs:300,startedAt:NOW-5000,running:true};
    assert.match(HV.mindSection(),/Hold 3<\/span><span class='mono breathleft' id='breathleft'>4:55/);
    state.breath={kind:"box",secs:60,startedAt:NOW-90000,running:true};
    assert.match(clean(HV.mindSection()),/0:00<\/span><button class='btn ghost' id='breathstop'>Done/);
  });
});

describe("Body",()=>{
  test("pounds: girths in inches give the same body fat as the centimetres they are",()=>{
    fresh({unit:"lb",heightCm:180,sex:"m"});state.body=[{at:iso(HOUR),w:180,waist:33.5,neck:15.75}];
    const want=bodyFatRange(navyBodyFat("m",180,33.5*2.54,15.75*2.54));
    assert.ok(want);assert.ok(clean(bodyView()).includes("Body fat about "+want));
  });
  test("a neck measurement with no height asks for height and sex",()=>{
    state.body=[{at:iso(HOUR),w:80,waist:85,neck:40}];
    assert.match(clean(bodyView()),/Set your height and sex in Settings/);
    fresh({sex:"m"});state.body=[{at:iso(HOUR),w:80,waist:85,neck:40}];
    assert.match(bodyView(),/Set your height in Settings/);
  });
  // Exposes a bug: a systolic with no diastolic is saved with dia 0 and the Body page prints
  // "Blood pressure 120/0: ." with an empty band.
  test("a systolic with no diastolic isn't shown as 120/0",()=>{
    state.body=[{at:iso(HOUR),w:80,sys:120,dia:0}];
    assert.doesNotMatch(bodyView(),/120\/0/);
  });
  test("one weigh-in draws no trend; two draw it with the change; girths show their unit",()=>{
    state.body=[{at:iso(HOUR),w:80}];assert.doesNotMatch(clean(bodyView()),/Trend/);
    fresh({unit:"lb"});state.body=[{at:iso(8*DAY),w:182,waist:34},{at:iso(HOUR),w:180.4,waist:33.5}];
    const h=clean(bodyView());
    assert.match(h,/weight now 180.4lb \(-1.6\)/);assert.match(h,/waist 33.5in/);assert.match(h,/Waist \(in\)/);
  });
});

describe("Muscles this week",()=>{
  const cls=(h,k)=>[...h.matchAll(new RegExp("class='bmm (m\\d)[^']*' data-muscle='"+k+"'","g"))].map(m=>m[1]);
  test("an empty week shades nothing and says so, never NaN",()=>{
    const h=clean(bodyMapCard());
    assert.ok(cls(h,"p:peclower").length&&cls(h,"p:peclower").every(c=>c==="m0"));assert.match(h,/<i class='m0'><\/i>none/);
  });
  test("only sets since Monday count; last Sunday's still shows in recovery",()=>{
    // Thursday 8 October: the week began Monday 5 October.
    state.sessions=[sq(3*DAY+4*HOUR,12,"Bench press"),sq(4*DAY,9,"Bench press")];
    state.bmSel="g:chest";
    let h=clean(bodyMapCard());
    // Drawn once a side: both halves of the chest on aim.
    assert.deepEqual(cls(h,"p:peclower"),["m2","m2"]);assert.match(h,/<b>Chest<\/b><span>12 sets &middot; on aim/);assert.match(h,/Bench press 12/);
    state.bmMode="rec";h=clean(bodyMapCard());assert.match(h,/partly recovered|recovering|ready/);
  });
  test("one set is \"1 set\", and a muscle with none says nothing yet",()=>{
    state.sessions=[sq(HOUR,1,"Bicep curls")];state.bmSel="g:biceps";
    assert.match(clean(bodyMapCard()),/1 set &middot; under the aim/);
    state.bmSel="g:calves";assert.match(bodyMapCard(),/Nothing for it yet this week/);
    for(const bad of ["not-a-muscle","g:nope","p:nope","chest"])state.bmSel=bad,assert.doesNotMatch(bodyMapCard(),/bmsel/,bad);
  });
  test("recovery shades a muscle worked an hour ago as recovering",()=>{
    state.sessions=[sq(HOUR,8)];state.bmMode="rec";
    const h=clean(bodyMapCard());assert.deepEqual(cls(h,"p:vastuslat"),["m2","m2"]);assert.deepEqual(cls(h,"p:peclower"),["m0","m0"]);
  });
});
