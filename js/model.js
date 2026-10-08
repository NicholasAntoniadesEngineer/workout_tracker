// The exercises a fresh install starts with in the picker, grouped by the movement they
// train. A day begins empty; these are what you can choose from, not what you get.
export const EXERCISE_GROUPS=[
  ["Squat & lunge",["Squats","Forward lunges","Backward lunges","Bulgarian split squat","Wall sit",
    "Front squat","Goblet squat","Box squat","Hack squat","Leg press","Leg extension",
    "Walking lunges","Step ups","Smith machine squat","Smith machine front squat",
    "Smith machine sumo squat","Smith machine split squat","Smith machine Bulgarian split squat",
    "Smith machine reverse lunge","Smith machine front lunge","Pistol squat","Hindu squats","Kettlebell squat jump","Safety bar squat","Overhead squat","Barbell foot press","Quarter squat","Horse stance","Isometric rack squat"]],
  ["Hinge & glutes",["Deadlift","Romanian deadlift","Kettlebell swings","Kettlebell deadlift",
    "Single-leg RDL","Good mornings","Glute bridge","Hip thrust",
    "Cable pull-through","Trap bar deadlift","Sumo deadlift","Rack pull","Back extension",
    "Lying leg curl","Seated leg curl","Stiff-leg deadlift","Standing leg curl","Reverse hyper","Snatch pull","Clean pull","Deadlift from blocks","Axle deadlift","Jefferson lift","Hand-and-thigh lift","Isometric rack pull"]],
  ["Push",["Push ups","Pike push ups","Dips","Shoulder press",
    "Bench press","Inclined Bench Press","Decline bench press","Dumbbell bench press",
    "Incline dumbbell press","Dumbbell fly","Incline fly","Cable Fly Lower","Cable Fly Upper",
    "Cable chest press","Cable lateral raise","Cable Tricep Extension","Cable tricep pushdown",
    "Dumbbell pullover","Behind-the-neck press","Dumbbell lateral raise","Front raise","Single-arm dumbbell press",
    "Skull crusher","Overhead tricep extension","Single-arm overhead tricep extension",
    "Rolling dumbbell tricep extension","Floor press","Pec deck","Cable crossover","Smith machine shoulder press",
    "Hindu push-ups","Shena push-ups","Persian meels","Kabbadeh","Sang press","Kettlebell press","Bridge press","Push press","Seated press",
    "Log press","Incline log press","Axle press","Barbell pullover","Bent press","One-hand barbell press","One-arm push","Fingertip push-ups","Handstand","Scrum machine","Self-resisted tricep extension","Handstand push-ups",
    "Isometric rack press","Tricep kickback","Frog stand","Headstand","Forearm stand","One-arm push-up"]],
  ["Pull",["Pull ups","Chin ups","Gorilla rows","Standing kettlebell rows","Shoulder shrugs",
    "Lat pulldown","Seated cable row","Straight-arm pulldown","Bicep curls",
    "Kettlebell bicep curl","Cable bicep curl","Cable hammer curl","Cable face pull","Bar Hangs",
    "Barbell row","Dumbbell row","T-bar row","Chest-supported row","Inverted row",
    "Close-grip lat pulldown","Rear delt fly","Barbell curl","EZ-bar curl","Hammer curl",
    "Incline dumbbell curl","Preacher curl","Concentration curl","Reverse curl",
    "Upright row","Nautilus pullover","Single-arm machine row","Barbell high pull","Wrist curl","Reverse wrist curl",
    "Rope climb","Zottman curl","Rope hang","Plate pinch","Lat spread","Neck resistance",
    "Self-resisted curl","Isometric rack shrug","Finger lift","Leverage lift","Wrist roller","Gripper closes"]],
  ["Core",["Plank","Side plank","Dead bug","Hollow hold","Hanging knee raises",
    "Pallof press","Ab wheel rollout","Mountain climbers","Cable crunch",
    "Single Arm High to Low woodchop","Single Arm Low to High woodchop","Crunch","Reverse crunch",
    "GHD sit-up","Wrestler's bridge","Side bend","Windmill","Weighted sit-up","Bent-knee sit-up","Sit-ups","Deep breathing","Abdominal vacuum","Abdominal rolling","Lying leg raise","Barbell trunk twist"]],
  ["Carry & full body",["Farmer carry","Suitcase carry","Turkish get-up","Kettlebell squat press clean","Burpees",
    "Power clean","Sled drag","Snatch","Clean and jerk","Indian clubs","Mace swings","Pit digging",
    "Power snatch","Kettlebell snatch","Kettlebell jerk","Kettlebell long cycle","Depth jump",
    "Standing long jump","Jerk","Hang snatch","Atlas stone lift","Natural stone lift","Stone carry",
    "Yoke carry","Stone put","Caber toss","Scottish hammer throw","Weight for distance",
    "Weight over bar","Keg toss","Indian club front circle","Indian club back circle",
    "Indian club side circle","Indian club moulinet","Indian club windmill",
    "One-hand barbell clean","One-hand barbell jerk","One-hand barbell snatch",
    "Two-dumbbell clean and jerk","One-hand dumbbell swing","Partner hand balancing","Front rack hold","Box jumps","High jump","Sledgehammer strikes","Shot put","Clean and press","Barrel lift","Long jump","Pole vault","Hammer throw",
    "Discus throw","Javelin throw"]],
  ["Conditioning",["Walking","Track intervals","Time trial","Rowing","Running","Hill repeats","Sprints","Swimming",
    "Board paddling","Surf ski paddling","Jump rope","Loaded march","Small-ball game","Fartlek","Stride-outs","Sled sprints","High knees",
    "Straight-leg bounds","Horse riding","Uphill bounding","Race walking","Race-walk drills","Hill bounding","Hill springing",
    "Outrigger paddling","Cycling","Jumping jacks","Hurdles","Tempo runs"]],
  ["Combat & skill",["Wrestling practice","Pahlavani wrestling","Pa zadan footwork","Charkh spins","Mallakhamb",
    "Stick fighting","Oil wrestling","Peşrev","Judo randori","Jiu-jitsu drilling",
    "Jiu-jitsu rolling","Shrimping","Technical stand-up","Breakfalls","Capoeira roda","Ginga","Aú",
    "Meia lua de frente","Meia lua de compasso","Armada","Esquiva","Negativa","Capoeira sequences","Palus drill","Shadow boxing",
    "Shiko","Koshiwari","Matawari","Suriashi","Teppo","Butsukari-geiko","Uchikomi","Makiwara","Chi-ishi",
    "Nigiri-game","Ishi-sashi","Kongoken","Eagle dance","Archery","Footwork drills","Sparring","Jacket wrestling","Heavy bag","Mitt work","Belt wrestling","Forms practice","Pad kicks",
    "Full-draw holds","Speed bag"]],
  ["Lower leg",["Calf raises","Seated calf raise","Donkey calf raise","Leg press calf raise","Isometric rack calf raise",
    "Barbell straddle hop"]],
  // Ben Patrick's Knees Over Toes / ATG work, by his names, gathered from his books and
  // programs (Knee Ability Zero and Pro, the ATG Standards, his articles). Some overlap
  // the sections above on purpose — this is the whole ATG library in one place.
  ["ATG / Knees over toes",[
    // Feet, shins and calves — where his programs start.
    "Tibialis raises","FHL calf raise","KOT calf raise","Soleus raise","Single-leg calf raise",
    // Knees and quads.
    "Patrick step","Poliquin step-up","Petersen step-up","Slant step-down","Slant board steps",
    "ATG split squat","KOT squat","Slant board squats","ATG squat","Sissy squat",
    "Reverse Nordic","Reverse squat",
    // Hamstrings, lower back and hips.
    "Nordic curls","Hamstring roller","ATG RDL","Seated DB deadlift","Elephant walk",
    "Jefferson curl","Seated good morning","Single-leg back extension","QL extension",
    // Groin and mobility.
    "Cossack squat","Standing pancake pulse","Couch stretch","Piriformis stretch",
    "Pigeon push-up","Pigeon pose","Slant toe touch",
    // Core and hip flexors.
    "L-sit","Full knee raise","Hanging leg raise","Garhammer raise",
    // Upper body and shoulders.
    "Powell raise","External rotation","Trap 3 raise","Ring face pull","Cross bench pullover",
    "ATG shoulder press","ATG dip","ATG chin-up",
    // Sled and walking.
    "Backward sled drag","Forward sled push","Backward walk","Backward step-up"]],
  // A band and a door anchor cover every pattern — the travel kit, in one section.
  ["Bands",["Band squat","Band deadlift","Band Romanian deadlift","Band good morning",
    "Band lateral walk","Band glute kickback","Band chest press","Band overhead press",
    "Band row","Band lat pulldown","Band pull-aparts","Band face pull","Band bicep curl",
    "Band tricep pushdown","Band Pallof press","Band woodchop"]]
];

export const SEED_EXERCISES=EXERCISE_GROUPS.reduce((all,g)=>all.concat(g[1]),[]);

// Routines that ship with the app, kept here like the exercises above: add or change one and
// every install has it on its next update. Each name should be one of the exercises above.
export const BUILTIN_ROUTINES=[
  {name:"Legs, Back & Biceps",ex:["Smith machine squat","Smith machine front lunge","Deadlift",
    "Barbell row","Seated cable row","Straight-arm pulldown",
    "Hammer curl","Barbell curl"]},
  // Lower legs up to the hips, slow and light: shins, feet and calves first, then knee travel
  // over the toes, then hamstrings, hip flexors and a quad stretch. Named for what it does.
  // A kettlebell session needing one or two bells: hinge, squat, pull, carry, then a hold.
  {name:"Kettlebell full body",ex:["Kettlebell swings","Goblet squat","Standing kettlebell rows",
    "Kettlebell deadlift","Kettlebell bicep curl","Farmer carry","Plank"]},
  // The travel kit: one band and a door anchor cover legs, push, pull and core.
  {name:"Travel bands",ex:["Band squat","Band Romanian deadlift","Band chest press","Band row",
    "Band overhead press","Band pull-aparts","Band Pallof press"]},
  {name:"Knee & ankle foundations",ex:["Tibialis raises","FHL calf raise","KOT calf raise",
    "Patrick step","ATG split squat","Elephant walk","L-sit","Couch stretch"]}
];

// Built-ins since dropped. An older install still lists them, so the picker leaves them out
// unless you have trained them — and then they keep their group instead of falling to User added.
export const RETIRED={"lunges":"Squat & lunge","cable woodchop":"Core"};

const GROUP_OF=Object.assign({},RETIRED);
EXERCISE_GROUPS.forEach(g=>g[1].forEach(n=>{GROUP_OF[n.toLowerCase()]=g[0];}));

// Anything you add yourself goes under User added rather than being forced into a group.
export const OTHER_GROUP="User added";

export function exerciseGroup(name){
  return GROUP_OF[String(name||"").trim().toLowerCase()]||OTHER_GROUP;
}

// Lifts done on a standard Olympic bar, where the plates per side are worth working out.
const BARBELL_LIFTS=["deadlift","romanian deadlift","sumo deadlift","rack pull","squats","front squat",
  "box squat","bench press","inclined bench press","decline bench press","good mornings","hip thrust",
  "barbell row","barbell curl","trap bar deadlift","shoulder press","overhead press","push press","pendlay row",
  "power clean","clean and jerk","snatch","clean","jerk","overhead squat","zercher squat","safety bar squat",
  "pause squat","close-grip bench press","floor press","deficit deadlift","paused deadlift","barbell shrug","barbell lunge"];
export function isBarbellLift(name){return BARBELL_LIFTS.indexOf(String(name||"").trim().toLowerCase())>=0;}

// Plates per side for a total weight on a standard bar (20kg / 45lb), largest first.
// Returns null when the bar alone is the weight or more than it; inexact loads flag `exact`.
const PLATES={kg:[25,20,15,10,5,2.5,1.25],lb:[45,35,25,10,5,2.5]};
const BAR={kg:20,lb:45};
export function platesPerSide(total,unit,bar){
  const u=unit==="lb"?"lb":"kg",b=+bar>0?+bar:BAR[u];
  let side=(+total-b)/2;
  if(!(side>0))return null;
  const out=[];
  PLATES[u].forEach(p=>{while(side>=p-1e-9){out.push(p);side=Math.round((side-p)*1000)/1000;}});
  return {plates:out,exact:side<1e-9,bar:b};
}

// Bands carry a resistance range, not a fixed weight — three bands, labelled in pounds.
export const BANDS=["15–35","30–60","40–80"];
export function isBandExercise(name){return exerciseGroup(name)==="Bands";}
export const QUICK_REPS=[5,8,10,12,15,20];
// Quick picks for timed movements — planks, carries, wall sits — counted in seconds.
export const QUICK_SECS=[15,20,30,45,60,90];

const SIDES_PER_SET=2;
const UID_RADIX=36;
// Set from the settings screen; kept here so counting and staleness stay in one place.
export const options={perSideDouble:true,idleEndSeconds:3600,unit:"kg"};
const UID_SPREAD=1e6;
const MS_PER_SEC=1000;
const SEC_PER_MIN=60;
const SEC_PER_HOUR=3600;
const RESUME_SECONDS=1800;

// fmtClock takes a negative as an overrun: "-0:12".
export function fmtClock(totalSec){
  const neg=Math.round(totalSec||0)<0;
  if(neg)return "-"+fmtClock(-totalSec);
  const s=Math.max(0,Math.round(totalSec||0));
  const h=Math.floor(s/SEC_PER_HOUR);
  const m=Math.floor((s%SEC_PER_HOUR)/SEC_PER_MIN);
  const pad=n=>String(n).padStart(2,"0");
  return h?h+":"+pad(m)+":"+pad(s%SEC_PER_MIN):m+":"+pad(s%SEC_PER_MIN);
}

export function fmtTime(iso){
  if(!iso)return "";
  const d=new Date(iso);
  return isNaN(d)?"":d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
}

export function nowISO(){return new Date().toISOString();}

export function uid(){
  return "i"+Date.now().toString(UID_RADIX)+Math.floor(Math.random()*UID_SPREAD).toString(UID_RADIX);
}

export function todayLabel(){
  return new Date().toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
}

export function shortDate(iso){
  try{return new Date(iso).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}
  catch(e){return "";}
}

// A workout belongs to a calendar day in local time, so the key is derived from the
// local date rather than the UTC slice of the ISO stamp.
export function dateKey(iso){
  const d=new Date(iso);
  if(isNaN(d))return "";
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+
    "-"+String(d.getDate()).padStart(2,"0");
}

export function keyOf(y,m,day){
  return y+"-"+String(m+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
}

export function timeLabel(iso){
  try{return new Date(iso).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});}
  catch(e){return "";}
}

export function monthLabel(y,m){
  return new Date(y,m,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});
}

// t is time spent working the set, rest is the gap that preceded it, at is when it ended.
// w is the weight carried — 0 is bodyweight, so no separate weighted flag is needed.
// wu marks a warm-up: logged and shown, but kept out of totals, records and trends.
// A set's kind: "" for a working set, "wu" warm-up (also kept as the wu flag everything else
// reads), "drop" for a drop set straight after a working set, "fail" for a set taken to failure.
// RPE is 0 when not rated, 5–10 (halves allowed) when it is. Notes are short and optional.
export const SET_KINDS=[["","Working"],["wu","Warm-up"],["drop","Drop set"],["fail","To failure"]];
export function normSet(v){
  // The first version saved a set as its bare rep count.
  if(!v||typeof v!=="object")v={r:+v||0};
  const kind=v.kind||(v.wu?"wu":"");
  const out={r:+v.r||0,side:!!v.side,w:+v.w||0,t:+v.t||0,rest:+v.rest||0,at:v.at||"",wu:kind==="wu",
    band:v.band||""};
  if(kind&&kind!=="wu")out.kind=kind;
  if(+v.rpe)out.rpe=Math.min(10,Math.max(5,Math.round(+v.rpe*2)/2));
  if(v.note&&String(v.note).trim())out.note=String(v.note).trim().slice(0,200);
  // A dumbbell pair logged per hand, and a weight logged in the other unit than the app's.
  if(v.hand)out.hand=true;
  if(v.u==="kg"||v.u==="lb")out.u=v.u;
  if(v.orig&&typeof v.orig==="object")out.orig=v.orig;
  return out;
}
export const setKind=x=>x.wu?"wu":(x.kind||"");

export function setReps(x){return (x.side&&options.perSideDouble)?x.r*SIDES_PER_SET:x.r;}
// The weight a set moved, in the app's unit: both hands for a pair, converted if logged in
// the other unit. Volume and tonnage add these up.
const LB_PER_KG=2.2046226;
// A set's weight in the given unit, for a set logged in its own unit (lb in a kg app).
export function weightIn(x,unit){
  let w=+x.w||0;const u=unit==="lb"?"lb":"kg";
  if(x.u&&x.u!==u&&w)w=Math.round((x.u==="lb"?w/LB_PER_KG:w*LB_PER_KG)*10)/10;
  return w;
}
export function setLoad(x){
  let w=+x.w||0;
  if(x.u&&x.u!==options.unit)w=x.u==="lb"?w/LB_PER_KG:w*LB_PER_KG;
  return x.hand?w*2:w;
}

export function exerciseTotal(e){return e.sets.reduce((sum,x)=>sum+(x.wu?0:setReps(x)),0);}

// An exercise counts in one of three units: reps (the default), seconds held (timed), or
// metres covered (dist) — a plank is held, a sled is dragged, a squat is counted.
export function unitOf(e){return e&&e.timed?"secs":(e&&e.dist?"m":"reps");}

// Timed and distance exercises hold seconds or metres in r, so they count toward sets but
// never the rep total.
export function totals(session){
  let reps=0,sets=0;
  session.ex.forEach(e=>e.sets.forEach(x=>{if(!x.wu&&!e.timed&&!e.dist)reps+=setReps(x);sets++;}));
  return {reps,sets};
}

// The exercise the newest set belongs to — rest after it follows that exercise's target.
export function lastSetExercise(session){
  let best=null,at=null;
  session.ex.forEach(e=>e.sets.forEach(x=>{
    if(at===null||(x.at||"")>=at){at=x.at||"";best=e;}
  }));
  return best;
}

// Sets append per exercise, so the newest stamp has to be found across all of them.
export function lastSetAt(session){
  let last="";
  session.ex.forEach(e=>e.sets.forEach(x=>{if(x.at&&x.at>last)last=x.at;}));
  return last;
}

// The most recently logged set: newest stamp, or the last one pushed if none are stamped.
export function lastSet(session){
  let newest=null;
  session.ex.forEach(e=>e.sets.forEach(x=>{
    if(!newest||(x.at||"")>=(newest.at||""))newest=x;
  }));
  return newest;
}

// How far into the workout a moment fell, in seconds — the workout's own clock rather
// than the time of day, so it matches the Workout clock. Sets from before the clock was
// last started (a workout begun again later the same day) count from the day's first set
// instead, so nothing is ever "before" its workout. Null for an unstamped moment.
export function workoutOffset(session,iso){
  if(!iso)return null;
  let start=session.started&&iso>=session.started?session.started:"";
  if(!start)session.ex.forEach(e=>e.sets.forEach(x=>{if(x.at&&(!start||x.at<start))start=x.at;}));
  if(!start)return null;
  return Math.max(0,(Date.parse(iso)-Date.parse(start))/MS_PER_SEC);
}

// Rest is measured from the last set, the workout start, or wherever the timer was last
// reset to — whichever is most recent. It can never predate the workout itself.
export function setAnchor(session){
  return [lastSetAt(session),session.started||"",session.timerFrom||""]
    .reduce((a,b)=>b>a?b:a,"");
}

export function restSeconds(session){
  const anchor=setAnchor(session);
  if(!anchor)return 0;
  const end=session.running?Date.now():Date.parse(session.ended||lastSetAt(session)||anchor);
  return Math.max(0,(end-Date.parse(anchor))/MS_PER_SEC);
}

export function secondsSince(iso){
  return iso?Math.max(0,(Date.now()-Date.parse(iso))/MS_PER_SEC):0;
}

function isToday(iso){
  return new Date(iso).toDateString()===new Date().toDateString();
}

// A workout left running overnight freezes at its last set instead of counting forever.
export function workoutSeconds(session){
  if(!session.started)return null;
  // Still live past midnight while sets keep coming; left overnight it freezes at its last set.
  const last=Date.parse(lastSetAt(session)||session.started);
  const live=session.running&&(isToday(session.started)||(Date.now()-last)/MS_PER_SEC<(options.idleEndSeconds||3600));
  const end=live?Date.now():Date.parse(session.ended||lastSetAt(session)||session.started);
  return Math.max(0,(end-Date.parse(session.started))/MS_PER_SEC);
}

// The stamp a finished workout ended on, for display and export.
export function workoutEnd(session){
  return session.ended||lastSetAt(session)||"";
}

// Start means "a new workout begins now" — except right after an accidental End,
// where picking straight back up should keep the clock you were already running.
// A stopped workout picks back up if it ended recently; after that, starting again begins
// a fresh clock rather than counting the gap as training.
export function canResume(session){
  return !!(session.started&&!session.running&&session.ended&&
    (Date.now()-Date.parse(session.ended))/MS_PER_SEC<=RESUME_SECONDS);
}

export function startWorkout(session){
  const resuming=canResume(session);
  if(!resuming)session.started=nowISO();
  session.ended="";
  session.running=true;
}

export function endWorkout(session){
  if(!session.started)return;
  session.ended=nowISO();
  session.running=false;
}

// A workout nobody ended stops itself at its last set rather than running all night.
export function autoEndIfStale(session){
  if(!session||!session.running||!session.started)return false;
  if(!options.idleEndSeconds)return false;
  const last=lastSetAt(session)||session.started;
  if((Date.now()-Date.parse(last))/MS_PER_SEC<options.idleEndSeconds)return false;
  session.ended=last;
  session.running=false;
  return true;
}

// A set always lands inside a running workout, so forgetting to press Start costs nothing.
// startedAt is when the set began, if it was timed: the gap before it is rest, the gap
// after it is work. Untimed sets record the whole gap as rest and no work.
const QUICK_WEIGHTS_KG=[4,6,8,10,12,16,20,24];
const QUICK_WEIGHTS_LB=[10,15,20,25,35,45,55,65];
export function quickWeights(unit){return unit==="lb"?QUICK_WEIGHTS_LB:QUICK_WEIGHTS_KG;}

// Weights are stored in whichever unit is chosen; switching converts every stored number,
// so 24 kg becomes 52.9 lb rather than silently relabelling itself.
const KG_PER_LB=0.45359237;
const CM_PER_IN=2.54;

function convert(v,from,to,perImperial){
  if(!v||from===to)return v;
  const metric=from==="lb"?v*perImperial:v;
  return Math.round((to==="lb"?metric/perImperial:metric)*10)/10;
}
export function convertWeight(v,from,to){return convert(v,from,to,KG_PER_LB);}
// Girths ride along with the weight unit: centimetres beside kg, inches beside lb.
export function convertLength(v,from,to){return convert(v,from,to,CM_PER_IN);}

// extra: {kind, rpe, note} for the set, or the old boolean warm-up flag.
const extraOf=x=>typeof x==="object"&&x?x:{kind:x?"wu":""};
export function addSet(session,ex,reps,perSide,startedAt,weight,extra,band){
  if(!session.running)startWorkout(session);
  const anchor=setAnchor(session);
  const end=nowISO();
  const begun=startedAt||end;
  const work=(Date.parse(end)-Date.parse(begun))/MS_PER_SEC;
  const rest=anchor?(Date.parse(begun)-Date.parse(anchor))/MS_PER_SEC:0;
  ex.sets.push(normSet(Object.assign({r:reps,side:perSide,w:Math.max(0,+weight||0),
    t:Math.max(0,Math.round(work)),rest:Math.max(0,Math.round(rest)),at:end,band:band||""},extraOf(extra))));
  session.timerFrom="";
}

export function makeSession(){
  return {id:uid(),title:todayLabel(),created:new Date().toISOString(),
    started:"",ended:"",running:false,timerFrom:"",ex:[]};
}

// Backfill a workout onto a past calendar day you trained but didn't log. Dated to local
// noon so it lands squarely on that day regardless of timezone; the title names the date.
export function makeSessionOn(y,m,day){
  const at=new Date(y,m,day,12,0,0);
  const title=at.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
  return {id:uid(),title:title,created:at.toISOString(),
    started:"",ended:"",running:false,timerFrom:"",ex:[]};
}

// Lets a workout be told it really began earlier — you trained for ten minutes before
// remembering to press Start.
export function setWorkoutMinutes(session,minutes){
  const mins=Math.max(0,+minutes||0);
  session.started=new Date(Date.now()-mins*SEC_PER_MIN*MS_PER_SEC).toISOString();
  if(!session.running){session.ended="";session.running=true;}
}

// Parse a duration a person typed: "1:30" or "90" both mean ninety seconds.
export function parseClock(str){
  const s=String(str==null?"":str).trim();
  if(!s)return 0;
  if(s.indexOf(":")>=0){
    const p=s.split(":");
    return Math.max(0,(parseInt(p[0],10)||0)*SEC_PER_MIN+(parseInt(p[1],10)||0));
  }
  return Math.max(0,Math.round(parseFloat(s)||0));
}

// Transcribing a workout done off-app: add one or more identical sets without starting a
// live timer, stamped to the session's own day and with unknown (0) work/rest until edited.
export function addManualSets(session,ex,reps,perSide,weight,count,extra,band){
  const n=Math.max(1,Math.round(+count||1));
  for(let i=0;i<n;i++){
    ex.sets.push(normSet(Object.assign({r:reps,side:perSide,w:Math.max(0,+weight||0),t:0,rest:0,at:session.created,
      band:band||""},extraOf(extra))));
  }
}

// A workout recorded after the fact — backfilled or planned — gets a fixed span on its own
// day rather than counting live from now. Start defaults to the session's created time.
export function setWorkoutSpanOn(session,minutes,startISO){
  const mins=Math.max(0,+minutes||0);
  const start=new Date(startISO||session.created);
  session.started=start.toISOString();
  session.ended=new Date(start.getTime()+mins*SEC_PER_MIN*MS_PER_SEC).toISOString();
  session.running=false;
}

// Restarts the rest clock from now, without touching anything already logged.
export function resetRestTimer(session){
  session.timerFrom=nowISO();
}

// Clears the workout clock back to "not started" — the logged sets are left untouched.
export function resetWorkout(session){
  session.started="";session.ended="";session.running=false;session.timerFrom="";
}

// Holds and stretches start counted in seconds, sled work in metres; anything else in reps.
// The unit can still be switched per exercise from the logging panel.
const TIMED_BY_DEFAULT=["plank","side plank","hollow hold","wall sit","bar hangs","l-sit",
  "couch stretch","piriformis stretch","pigeon pose"];
const DIST_BY_DEFAULT=["backward sled drag","forward sled push","backward walk"];

export function makeExercise(name){
  const k=String(name||"").trim().toLowerCase();
  const e={id:uid(),name,sets:[]};
  if(TIMED_BY_DEFAULT.indexOf(k)>=0)e.timed=true;
  else if(DIST_BY_DEFAULT.indexOf(k)>=0)e.dist=true;
  return e;
}
