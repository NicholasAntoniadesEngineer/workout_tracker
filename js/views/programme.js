// Programmes: setting one up from a Learn topic, the card on home that says what's next, and the
// programme's own page — progress round by round, and for 5/3/1 the weeks of the cycle.
import {RULES,doneSessions,nextDate,position,prescription} from "../programme.js";
import {dateKey,nowISO} from "../model.js";
import {state} from "../store.js";
import {topicById} from "../lazy.js";
import {icon} from "../icons.js";
import {esc} from "./common.js";

const WD=["Su","M","Tu","W","Th","F","Sa"];
export function whenLabel(day){
  const t=dateKey(nowISO()),tm=new Date();tm.setDate(tm.getDate()+1);
  if(day===t)return "Today";
  if(day===dateKey(tm.toISOString()))return "Tomorrow";
  return new Date(day+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"short"});
}
const fmtSets=(rx,unit)=>rx.sets.map(s=>s.r+" @ "+s.w).join(" · ")+" "+unit;

// What the next session holds, in one line.
export function nextSummary(p){
  const pos=position(p,state.sessions),day=p.days[pos.day],rx=prescription(p,pos);
  if(rx&&rx.sets)return esc(rx.lift)+" "+esc(fmtSets(rx,p.unit))+(day.ex.length>1?" · then "+esc(day.ex.slice(1).join(", ")):"");
  return esc(day.ex.join(" · "));
}

// Home's card: the next workout, when it falls, and one tap to start it.
export function nextCard(){
  const p=state.programme;
  if(!p||p.paused)return "";
  const pos=position(p,state.sessions),when=nextDate(p,state.sessions);
  const tag=p.rule==="531"?"Week "+(pos.week+1)+" of 4 · "+esc(pos.weekLabel):"Round "+(pos.round+1);
  return "<div class='pcard'><div class='pcardtop'><span class='leyebrow'>Next workout &middot; "+esc(whenLabel(when))+"</span>"+
    "<span class='pcardtag'>"+tag+"</span></div>"+
    "<div class='pcardn'>"+esc(pos.dayName)+"</div><div class='pcards'>"+nextSummary(p)+"</div>"+
    "<button class='btn primary pcardgo' data-progrun='1'>Start "+esc(pos.dayName)+"</button>"+
    "<button class='homelink' data-progopen='1'>"+esc(shortName(p))+" &middot; view programme</button></div>";
}
const shortName=p=>p.name.split(": ")[1]||p.name;

// Setting a programme up: which days, when to start, and for 5/3/1 the training maxes.
function setupView(){
  const s=state.progSetup,tp=topicById(s.topic);
  let h="<div class='wrap scroll lcatpage'><button class='backbtn' id='progback'>"+icon("back","sm")+"Back</button>"+
    "<div class='leyebrow' style='margin-top:14px'>Follow a programme</div><div class='lcatn'>"+esc(tp.title)+"</div>"+
    "<div class='lcatstats'>"+tp.days.length+" workouts, run in order"+(s.rule==="531"?" &middot; 4-week cycles":"")+"</div>"+
    "<div class='llabel'>Training days</div><div class='pdays'>"+
    [1,2,3,4,5,6,0].map(d=>"<button class='pday"+(s.weekdays.indexOf(d)>=0?" on":"")+"' data-progday='"+d+"'>"+WD[d]+"</button>").join("")+"</div>"+
    "<p class='pnote'>"+(s.weekdays.length?s.weekdays.length+" days a week. ":"")+"A missed day simply waits — the next workout is always the next in line.</p>"+
    "<div class='llabel'>Start</div><div class='pdays'>"+
    [["today","Today"],["monday","Next Monday"]].map(([k,l])=>"<button class='pday wide"+(s.start===k?" on":"")+"' data-progstartopt='"+k+"'>"+l+"</button>").join("")+"</div>";
  if(s.rule==="531"){
    h+="<div class='llabel'>Training maxes &middot; 90% of your best</div>"+
      Object.keys(s.maxes).map(n=>"<label class='pmax'><span>"+esc(n)+"</span><span class='pmaxv'><input type='number' inputmode='decimal' step='0.5' min='0' "+
        "data-progmax=\""+esc(n)+"\" value='"+(s.maxes[n]||"")+"' placeholder='kg'> "+esc(state.settings.unit||"kg")+"</span></label>").join("")+
      "<p class='pnote'>Filled in from your log where you've done the lift. Wendler: set it a little light and let the cycles add weight.</p>"+
      "<div class='llabel'>Each cycle</div><div class='pweeks'>"+RULES["531"].weekLabels.map((l,i)=>"<span><b>Week "+(i+1)+"</b>"+l+"</span>").join("")+"</div>";
  }
  return h+"<button class='btn primary pbig' data-progbegin='1'"+(s.weekdays.length?"":" disabled")+">Start this programme</button></div>";
}

// The programme's page: where you are, what's done, what's next.
function progressView(){
  const p=state.programme,pos=position(p,state.sessions),done=doneSessions(p,state.sessions);
  const len=p.days.length;
  let h="<div class='wrap scroll lcatpage'><button class='backbtn' id='progback'>"+icon("back","sm")+"Home</button>"+
    "<div class='leyebrow' style='margin-top:14px'>Your programme"+(p.paused?" &middot; paused":"")+"</div>"+
    "<div class='lcatn'>"+esc(shortName(p))+(p.rule==="531"?" &middot; cycle "+pos.cycle:"")+"</div>"+
    "<div class='lcatstats'>"+p.weekdays.map(d=>WD[d]).join(" · ")+" &middot; started "+esc(whenLabel(p.start))+"</div>"+
    "<div class='lstats' style='margin-top:6px'>"+
      "<div class='lstat'><span class='lstatv'>"+done.length+"</span><span class='lstatl'>sessions done</span></div>"+
      "<div class='lstat'><span class='lstatv'>"+(p.rule==="531"?"Wk "+(pos.week+1):pos.round+1)+"</span><span class='lstatl'>"+(p.rule==="531"?esc(pos.weekLabel):"round")+"</span></div>"+
      "<div class='lstat'><span class='lstatv'>"+esc(whenLabel(nextDate(p,state.sessions)).split(" ")[0])+"</span><span class='lstatl'>next</span></div></div>";
  // Weeks of the current 5/3/1 cycle, or the current and next rounds of the days.
  const rows=p.rule==="531"?[0,1,2,3].map(w=>({label:"Week "+(w+1)+" · "+RULES["531"].weekLabels[w],round:(pos.cycle-1)*4+w})):
    [pos.round,pos.round+1].map(r=>({label:"Round "+(r+1),round:r}));
  h+="<div class='llabel' style='margin-top:14px'>"+(p.rule==="531"?"This cycle":"Rounds")+"</div>";
  rows.forEach(r=>{
    const n=Math.max(0,Math.min(len,done.length-r.round*len)),cur=r.round===pos.round;
    h+="<div class='pround"+(cur?" cur":"")+"'><div class='proundtop'><span>"+esc(r.label)+"</span><span class='pcardtag'>"+n+"/"+len+" done</span></div>"+
      "<div class='prounddays'>"+p.days.map((d,i)=>"<span class='"+(i<n?"on":"")+"'>"+esc(d.name.split(" (")[0])+"</span>").join("")+"</div></div>";
  });
  if(p.rule==="531")h+="<p class='pnote'>After each cycle the training max rises by "+(p.unit==="lb"?"5 lb on presses and 10 lb on squats and deadlifts":"2.5 kg on presses and 5 kg on squats and deadlifts")+", as Wendler sets out.</p>";
  h+="<div class='llabel'>Next</div><div class='pcards' style='margin-bottom:12px'><b>"+esc(pos.dayName)+"</b> &middot; "+nextSummary(p)+"</div>"+
    "<button class='btn primary pbig' data-progrun='1'>Start "+esc(pos.dayName)+"</button>"+
    "<div class='pacts'><button class='btn ghost' data-progpause='1'>"+(p.paused?"Resume":"Pause")+"</button>"+
    "<button class='btn ghost' data-learnjump='"+esc(p.topic)+"'>About the programme</button>"+
    "<button class='btn ghost' data-progstop='1'>Stop</button></div>";
  if(done.length){
    h+="<div class='llabel' style='margin-top:16px'>Done</div><div class='lwrows'>"+done.slice().reverse().slice(0,12).map(s=>
      "<button class='lwrow' data-resume='"+esc(s.id)+"'><span class='lalso'><span class='lwrt'>"+esc(s.title)+"</span><span class='lalsow'>"+
      esc(whenLabel(dateKey(s.created)))+"</span></span><span class='lchev'>&rsaquo;</span></button>").join("")+"</div>";
  }
  return h+"</div>";
}

export function programmeView(){
  if(state.progSetup&&topicById(state.progSetup.topic))return setupView();
  if(state.programme)return progressView();
  return "<div class='wrap scroll'><button class='backbtn' id='progback'>"+icon("back","sm")+"Home</button>"+
    "<div class='empty-note'>No programme yet. Open one in Learn — 5/3/1, Starting Strength, Smolov — and tap Follow.</div></div>";
}

// On a topic with two or more workouts: follow it, or see how it's going.
export function followCard(tp){
  if(!tp.days||tp.days.length<2||tp.book)return "";
  const p=state.programme;
  if(p&&p.topic===tp.id){
    const pos=position(p,state.sessions);
    return "<div class='pfollow on'><span><b>You're following this</b> &middot; next "+esc(pos.dayName)+"</span>"+
      "<button class='btn ghost tiny' data-progopen='1'>View</button></div>";
  }
  return "<div class='pfollow'><span><b>Follow as a programme</b> &middot; its "+tp.days.length+" workouts in order on your days"+
    (p?" (replaces "+esc(shortName(p))+")":"")+"</span><button class='btn primary tiny' data-progsetup='"+esc(tp.id)+"'>Follow</button></div>";
}
