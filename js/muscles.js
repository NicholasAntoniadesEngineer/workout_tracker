// Which muscles an exercise trains and which joints it loads, from its name. Two levels: the
// muscles themselves (PARTS, 82 of them, deep ones included), and the groups they make up
// (MUSCLES, the 26 a lifter counts sets for: chest, quads, rotator cuff…). Rules run in order,
// most specific first; the first that matches decides. Primary muscles count a full set,
// secondary ones half; a group takes the most any of its muscles took from that exercise.
// Used for weekly sets by muscle, recovery by muscle and sore-joint warnings.
import {exerciseGroup} from "./model.js";

// [id, name, region, aim low, aim high, recovery half-life in hours]. The big movers aim at
// 10–20 hard sets a week; the small and stabilising ones at 4–10.
export const MUSCLES=[
  ["neck","Neck","upper",4,10,30],["traps","Traps","upper",10,20,36],["chest","Chest","upper",10,20,36],["serratus","Serratus","upper",4,10,30],
  ["frontdelt","Front delts","upper",10,20,30],["sidedelt","Side delts","upper",10,20,30],["reardelt","Rear delts","upper",10,20,30],
  ["rotatorcuff","Rotator cuff","upper",4,10,30],["lats","Lats","upper",10,20,36],["upperback","Upper back","upper",10,20,36],
  ["biceps","Biceps","upper",10,20,30],["triceps","Triceps","upper",10,20,30],["forearms","Forearms","upper",10,20,30],["hands","Hands","upper",4,10,30],
  ["abs","Abs","core",10,20,30],["obliques","Obliques","core",4,10,30],["lowerback","Lower back","core",10,20,48],
  ["glutes","Glutes","lower",10,20,42],["abductors","Hip abductors","lower",4,10,36],["hipflexors","Hip flexors","lower",4,10,36],
  ["adductors","Adductors","lower",10,20,36],["quads","Quads","lower",10,20,42],["hamstrings","Hamstrings","lower",10,20,42],
  ["calves","Calves","lower",10,20,30],["shins","Shins","lower",4,10,30],["feet","Feet","lower",4,10,30],
];
export const MUSCLE_NAME=Object.fromEntries(MUSCLES.map(m=>[m[0],m[1]]));
export const AIM=Object.fromEntries(MUSCLES.map(m=>[m[0],[m[3],m[4]]]));
const HALF=Object.fromEntries(MUSCLES.map(m=>[m[0],m[5]]));

// [id, name, group, deep]. Deep muscles lie under others and aren't on the figure: deep names the
// drawn muscle on top of one, or is 1 where none is, or "sole" for the sole of the foot.
export const PARTS=[
  ["scm","Sternocleidomastoid","neck"],["splenius","Splenius","neck"],["scalenes","Scalenes","neck","scm"],["levator","Levator scapulae","neck","uppertrap"],
  ["uppertrap","Upper trapezius","traps"],["midtrap","Middle trapezius","traps"],["lowertrap","Lower trapezius","traps"],
  ["pecupper","Pec major, upper head","chest"],["peclower","Pec major, lower head","chest"],["pecminor","Pec minor","chest","pecupper"],
  ["serratus","Serratus anterior","serratus"],
  ["frontdelt","Front deltoid","frontdelt"],["sidedelt","Side deltoid","sidedelt"],["reardelt","Rear deltoid","reardelt"],
  ["supraspinatus","Supraspinatus","rotatorcuff","uppertrap"],["infraspinatus","Infraspinatus","rotatorcuff"],["teresminor","Teres minor","rotatorcuff"],["subscapularis","Subscapularis","rotatorcuff","infraspinatus"],
  ["lats","Latissimus dorsi","lats"],
  ["rhomboids","Rhomboids","upperback","midtrap"],["teresmajor","Teres major","upperback"],
  ["bicepsbr","Biceps brachii","biceps"],["brachialis","Brachialis","biceps"],["coraco","Coracobrachialis","biceps","bicepsbr"],
  ["tricepslong","Triceps, long head","triceps"],["tricepslat","Triceps, lateral head","triceps"],["tricepsmed","Triceps, medial head","triceps"],
  ["brachiorad","Brachioradialis","forearms"],["wristflex","Wrist and finger flexors","forearms"],["wristext","Wrist and finger extensors","forearms"],
  ["pronsup","Pronators and supinator","forearms","wristflex"],
  ["thenar","Thenar muscles (thumb)","hands"],["hypothenar","Hypothenar muscles (little finger)","hands"],["addpoll","Adductor pollicis","hands","thenar"],
  ["handlumb","Lumbricals of the hand","hands",1],["handinter","Interossei of the hand","hands"],
  ["rectusabd","Rectus abdominis","abs"],["transverse","Transversus abdominis","abs","extoblique"],["diaphragm","Diaphragm","abs","rectusabd"],
  ["extoblique","External oblique","obliques"],["intoblique","Internal oblique","obliques","extoblique"],
  ["erectors","Erector spinae","lowerback"],["multifidus","Multifidus","lowerback","erectors"],["ql","Quadratus lumborum","lowerback","erectors"],
  ["glutemax","Gluteus maximus","glutes"],["hiprot","Deep hip rotators","glutes","glutemax"],
  ["glutemed","Gluteus medius","abductors"],["glutemin","Gluteus minimus","abductors","glutemed"],["tfl","Tensor fasciae latae","abductors"],
  ["iliopsoas","Iliopsoas","hipflexors"],["sartorius","Sartorius","hipflexors"],
  ["addlong","Adductor longus","adductors"],["addmag","Adductor magnus","adductors"],["addbrev","Adductor brevis","adductors","addlong"],
  ["gracilis","Gracilis","adductors"],["pectineus","Pectineus","adductors"],
  ["rectusfem","Rectus femoris","quads"],["vastuslat","Vastus lateralis","quads"],["vastusmed","Vastus medialis","quads"],["vastusint","Vastus intermedius","quads","rectusfem"],
  ["bicepsfem","Biceps femoris","hamstrings"],["semitend","Semitendinosus","hamstrings"],["semimem","Semimembranosus","hamstrings"],
  ["gastroc","Gastrocnemius","calves"],["soleus","Soleus","calves"],["popliteus","Popliteus","calves","gastroc"],["tibpost","Tibialis posterior","calves","soleus"],["toeflex","Long toe flexors","calves","soleus"],
  ["tibant","Tibialis anterior","shins"],["toeext","Long toe extensors","shins"],["fibularis","Fibularis (peroneals)","shins"],
  ["edb","Extensor digitorum brevis","feet"],["ehb","Extensor hallucis brevis","feet"],
  ["abdhal","Abductor hallucis","feet","sole"],["fdb","Flexor digitorum brevis","feet","sole"],["abddm","Abductor digiti minimi","feet","sole"],
  ["quadplantae","Quadratus plantae","feet","sole"],["footlumb","Lumbricals of the foot","feet","sole"],["fhb","Flexor hallucis brevis","feet","sole"],
  ["addhal","Adductor hallucis","feet","sole"],["fdmb","Flexor digiti minimi brevis","feet","sole"],["footinter","Interossei of the foot","feet","sole"],
];
export const PART_NAME=Object.fromEntries(PARTS.map(p=>[p[0],p[1]]));
export const PART_GROUP=Object.fromEntries(PARTS.map(p=>[p[0],p[2]]));
export const PART_DEEP=Object.fromEntries(PARTS.map(p=>[p[0],!!p[3]]));
export const PART_UNDER=Object.fromEntries(PARTS.filter(p=>typeof p[3]==="string"&&p[3]!=="sole").map(p=>[p[0],p[3]]));
export const PART_SOLE=Object.fromEntries(PARTS.filter(p=>p[3]==="sole").map(p=>[p[0],true]));
export const partsIn=g=>PARTS.filter(p=>p[2]===g).map(p=>p[0]);

export const JOINTS=[["shoulder","Shoulder"],["elbow","Elbow"],["wrist","Wrist"],["neck","Neck"],["lowerback","Lower back"],["hip","Hip"],["knee","Knee"],["ankle","Ankle"]];
export const JOINT_NAME=Object.fromEntries(JOINTS);

// Shorthands in the rules: a group's name stands for all its muscles, plus a few working sets.
const SHORT={vasti:["vastuslat","vastusmed","vastusint"],hams:["bicepsfem","semitend","semimem"],pecs:["pecupper","peclower"],
  flexors:["bicepsbr","brachialis"]};
// A name that is none of these is a slip in the table below, caught the moment it loads.
const expand=list=>{const out=[];list.forEach(t=>{const l=SHORT[t]||(PART_NAME[t]?[t]:partsIn(t));if(!l.length)throw new Error("muscles: no such muscle "+t);
  l.forEach(p=>{if(out.indexOf(p)<0)out.push(p);});});return out;};

// [pattern, primary, secondary, joints]
const R=[
  // Not lifting: no muscles counted.
  [/stretch|pose|breathing|rolling$|hamstring roller|pancake|toe touch/,[],[],[]],
  [/vacuum/,["transverse"],["intoblique","diaphragm"],[]],
  // Lower leg
  [/tibialis/,["tibant"],["toeext"],["ankle"]],
  [/fhl/,["gastroc","soleus","toeflex"],["tibpost","fhb","abdhal"],["ankle"]],
  // The foot's own muscles.
  [/short foot|foot dom|arch lift|arch raise/,["abdhal","fdb","quadplantae"],["fhb","footinter","tibpost"],["ankle"]],
  [/toe curl|towel curl|towel scrunch|toe grip/,["fdb","quadplantae","footlumb","fhb"],["toeflex","abdhal"],["ankle"]],
  [/toe spread|toe splay|toe abduct/,["abdhal","abddm","footinter"],[],["ankle"]],
  [/toe yoga|toe lift|toe extension/,["edb","ehb","toeext"],["fhb","fdb"],["ankle"]],
  [/seated calf|kot calf|soleus/,["soleus"],["gastroc","tibpost","toeflex"],["ankle"]],
  [/calf|straddle hop/,["gastroc","soleus"],["tibpost","fibularis","toeflex"],["ankle"]],
  [/reverse nordic|sissy squat|leg extension/,["quads"],[],["knee"]],
  [/nordic|leg curl|hamstring curl/,["hams"],["gastroc","popliteus"],["knee"]],
  // Hinges
  [/good morning|jefferson curl|back extension|reverse hyper|ql extension|seated good/,["erectors","multifidus","hams"],["glutemax","ql","addmag"],["lowerback","hip"]],
  [/romanian|\brdl\b|stiff-leg|single-leg deadlift/,["hams","glutemax"],["erectors","multifidus","addmag","wristflex","glutemed"],["lowerback","hip"]],
  [/rack pull|deadlift from blocks|pull from blocks/,["uppertrap","midtrap","glutemax"],["hams","wristflex","erectors","rhomboids","lats"],["lowerback","hip"]],
  [/snatch pull|clean pull|high pull/,["uppertrap","midtrap","glutemax"],["hams","quads","sidedelt","erectors","gastroc"],["lowerback","hip","shoulder"]],
  [/sumo deadlift/,["glutemax","hams","erectors","multifidus","addmag","addlong","addbrev"],["vasti","uppertrap","midtrap","lats","wristflex"],["lowerback","hip"]],
  [/leverage lift/,["wristflex","wristext","brachiorad"],["hands","pronsup"],["wrist"]],
  [/deadlift|jefferson lift|hand-and-thigh|stone lift|barrel lift|keg/,["glutemax","hams","erectors","multifidus"],["vasti","addmag","uppertrap","midtrap","lats","rhomboids","wristflex"],["lowerback","hip"]],
  [/swing|pull-through|pull through/,["glutemax","hams"],["erectors","wristflex","rectusabd"],["hip","lowerback"]],
  [/wrestler's bridge/,["splenius","uppertrap","erectors"],["glutemax","hams","scm"],["neck"]],
  [/hip thrust|glute bridge|glute kickback|bridge$/,["glutemax"],["hams","glutemed","addmag"],["hip"]],
  [/lateral walk|abduction|abductor|clamshell|fire hydrant/,["glutemed","glutemin","tfl"],["glutemax","hiprot"],["hip"]],
  [/copenhagen|adduction|adductor/,["addlong","addbrev","addmag","gracilis","pectineus"],["extoblique","intoblique"],["hip"]],
  [/pigeon push/,["hiprot","glutemax"],["glutemed"],["hip"]],
  // Olympic and full-body
  [/clean and jerk|clean and press|long cycle|squat press clean/,["quads","glutemax","frontdelt"],["uppertrap","triceps","hams","sidedelt","erectors","gastroc","serratus"],["shoulder","wrist","knee","hip","lowerback"]],
  [/snatch/,["quads","glutemax","uppertrap","midtrap"],["sidedelt","hams","triceps","lowertrap","erectors","supraspinatus","infraspinatus"],["shoulder","wrist","knee","hip","lowerback"]],
  [/power clean|hang clean|one-hand barbell clean|clean$/,["glutemax","quads","uppertrap"],["hams","wristflex","erectors","midtrap","gastroc"],["wrist","knee","hip","lowerback"]],
  [/jerk|push press/,["frontdelt","triceps"],["quads","sidedelt","uppertrap","serratus","glutemax"],["shoulder","wrist","knee"]],
  [/indian club|mace/,["sidedelt","wristflex","wristext","brachiorad"],["reardelt","infraspinatus","teresminor","subscapularis","lats","rectusabd"],["shoulder","wrist"]],
  [/put$|toss|throw|weight for distance|weight over bar/,["glutemax","frontdelt"],["quads","rectusabd","extoblique","triceps","serratus"],["shoulder","hip"]],
  [/pit digging|sledgehammer/,["lats","extoblique","intoblique","rectusabd"],["wristflex","glutemax","teresmajor","triceps"],["lowerback","shoulder"]],
  [/turkish get-up|windmill/,["frontdelt","extoblique","intoblique","rectusabd"],["infraspinatus","supraspinatus","glutemax","glutemed","sidedelt","triceps","serratus"],["shoulder","hip"]],
  [/suitcase/,["wristflex","extoblique","intoblique","ql"],["hands","uppertrap","glutemed","erectors"],["wrist","lowerback"]],
  [/farmer|yoke|stone carry|carry|loaded march|front rack hold/,["wristflex","uppertrap"],["hands","rectusabd","transverse","extoblique","glutemed","glutemax","erectors","midtrap"],["wrist","lowerback"]],
  [/sled|backward walk|elephant walk|scrum/,["vasti","glutemax"],["gastroc","soleus","hams","rectusfem"],["knee","ankle"]],
  [/mountain climber/,["iliopsoas","rectusabd"],["frontdelt","quads","triceps","serratus","transverse"],["wrist","shoulder"]],
  [/jumping jack/,["gastroc","soleus","glutemed"],["sidedelt","addlong","tfl"],["knee","ankle"]],
  [/burpee/,["quads","glutemax","pecs"],["triceps","frontdelt","rectusabd","gastroc"],["knee","wrist","shoulder"]],
  [/box jump|depth jump|long jump|high jump|jump|bound|\bhop(s|ping)?\b|hurdle|pole vault/,["quads","glutemax","gastroc","soleus"],["hams","iliopsoas","erectors"],["knee","ankle"]],
  // Squats and lunges
  [/cossack/,["vasti","glutemax","addlong","addmag","gracilis"],["rectusfem","hams","addbrev"],["knee","hip"]],
  [/split squat|lunge|step[ -]?up|step-down|slant board steps|patrick step|pistol/,["vasti","rectusfem","glutemax"],["addmag","hams","glutemed"],["knee","hip"]],
  [/sumo squat/,["vasti","glutemax","addlong","addmag","addbrev"],["rectusfem","hams","gracilis"],["knee","hip"]],
  [/leg press|hack squat/,["vasti"],["rectusfem","glutemax","addmag"],["knee"]],
  [/front squat|overhead squat|goblet/,["vasti"],["rectusfem","glutemax","uppertrap","midtrap","rectusabd","transverse","erectors"],["knee","hip","wrist"]],
  [/squat|wall sit|horse stance|shiko|koshiwari|matawari|barbell foot press/,["vasti","glutemax"],["rectusfem","addmag","hams","erectors"],["knee","hip","lowerback"]],
  // Pushes: an incline press, even a log, before the overhead presses.
  [/incline (bench|dumbbell press|log)|inclined bench|incline press/,["pecupper","frontdelt"],["peclower","triceps","serratus"],["shoulder","elbow"]],
  [/handstand push|pike push|behind-the-neck|overhead press|shoulder press|seated press|military|log press|axle press|kettlebell press|bent press|one-hand barbell press|one-arm push$|sang press|single-arm dumbbell press|band overhead/,["frontdelt","triceps"],["sidedelt","uppertrap","serratus","pecupper"],["shoulder","elbow"]],
  [/decline/,["peclower","triceps"],["pecupper","frontdelt"],["shoulder","elbow","wrist"]],
  [/dip/,["peclower","triceps"],["frontdelt","pecupper","pecminor"],["shoulder","elbow"]],
  [/push[- ]?up|push up|meels|kabbadeh|bridge press/,["pecs","triceps"],["frontdelt","serratus","rectusabd","transverse"],["shoulder","wrist","elbow"]],
  [/pullover/,["lats","peclower"],["tricepslong","teresmajor","serratus","pecupper"],["shoulder"]],
  [/bench|chest press|floor press|isometric rack press/,["pecs","triceps"],["frontdelt"],["shoulder","elbow","wrist"]],
  [/external rotation/,["infraspinatus","teresminor"],["reardelt","supraspinatus"],["shoulder"]],
  [/trap 3 raise|y raise|prone y/,["lowertrap"],["reardelt","midtrap","infraspinatus"],["shoulder"]],
  [/rear delt|reverse fly|reverse pec deck|face pull|pull-apart|pull apart/,["reardelt"],["midtrap","rhomboids","infraspinatus","teresminor","lowertrap"],["shoulder"]],
  [/incline fly|fly upper|low to high fly/,["pecupper"],["frontdelt","peclower"],["shoulder"]],
  [/fly lower|decline fly|high to low fly/,["peclower"],["pecupper","pecminor"],["shoulder"]],
  [/fly|pec deck|crossover/,["pecs"],["frontdelt"],["shoulder"]],
  [/lateral raise|upright row/,["sidedelt"],["uppertrap","supraspinatus"],["shoulder"]],
  [/front raise/,["frontdelt"],["pecupper","serratus"],["shoulder"]],
  [/tricep|skull crusher|kickback|pushdown/,["triceps"],[],["elbow"]],
  // Pulls
  [/straight-arm pulldown/,["lats","teresmajor"],["tricepslong","peclower"],["shoulder"]],
  [/pull[- ]?up|chin[- ]?up|pulldown|rope climb|lat spread/,["lats"],["flexors","brachiorad","teresmajor","lowertrap","rhomboids","reardelt","wristflex"],["shoulder","elbow"]],
  [/row/,["lats","midtrap","rhomboids","teresmajor"],["reardelt","flexors","brachiorad","lowertrap","erectors","infraspinatus"],["lowerback","elbow"]],
  [/shrug/,["uppertrap"],["levator","wristflex","midtrap"],["neck"]],
  [/neck/,["scm","splenius","scalenes"],["levator","uppertrap"],["neck"]],
  [/reverse wrist curl/,["wristext"],["brachiorad"],["wrist"]],
  [/wrist curl/,["wristflex"],[],["wrist"]],
  [/finger extension|band finger|finger spread/,["handinter","wristext"],["handlumb"],["wrist"]],
  [/pinch/,["thenar","addpoll","wristflex"],["handinter","hypothenar"],["wrist"]],
  [/grip|finger|gripper|nigiri|chi-ishi|ishi-sashi/,["wristflex"],["hands","wristext"],["wrist"]],
  [/wrist|roller/,["wristflex","wristext"],["brachiorad","pronsup"],["wrist"]],
  [/hammer curl|reverse curl|zottman/,["brachialis","bicepsbr","brachiorad"],["wristext"],["elbow","wrist"]],
  [/curl/,["bicepsbr","brachialis"],["brachiorad","wristflex"],["elbow"]],
  // Core, ahead of the hang rule so hanging raises count as abs.
  [/side plank|side bend/,["extoblique","intoblique","ql"],["glutemed","rectusabd"],["lowerback"]],
  [/woodchop|trunk twist|russian twist|pallof/,["extoblique","intoblique"],["rectusabd","transverse"],["lowerback"]],
  [/leg raise|knee raise|l-sit|garhammer|powell/,["rectusabd","iliopsoas"],["extoblique","intoblique","rectusfem","wristflex"],["lowerback"]],
  [/sit-up|sit up/,["rectusabd"],["iliopsoas","extoblique","intoblique"],["lowerback"]],
  [/plank|dead bug|hollow|ab wheel|crunch/,["rectusabd","transverse"],["extoblique","intoblique"],["lowerback"]],
  [/hang/,["wristflex"],["hands","lats","teresmajor","lowertrap"],["shoulder","wrist"]],
  [/handstand|frog stand|headstand|forearm stand|hand balancing/,["frontdelt","triceps"],["rectusabd","serratus","uppertrap","wristflex"],["shoulder","wrist","neck"]],
  [/archery|full-draw/,["midtrap","rhomboids","reardelt","infraspinatus"],["lats","wristflex","lowertrap"],["shoulder"]],
].map(([re,p,s,j])=>{const P=expand(p);return [re,P,expand(s).filter(x=>P.indexOf(x)<0),j];});

// A custom name with no rule falls back to its movement group.
const GROUP_FALLBACK={"Squat & lunge":[["vasti","glutemax"],["rectusfem","hams","addmag"],["knee","hip"]],"Hinge & glutes":[["glutemax","hams"],["erectors"],["lowerback","hip"]],
  "Push":[["pecs","triceps"],["frontdelt"],["shoulder","elbow"]],"Pull":[["lats","midtrap","rhomboids"],["flexors"],["shoulder","elbow"]],
  "Core":[["rectusabd","transverse"],["extoblique","intoblique"],["lowerback"]],"Lower leg":[["gastroc","soleus"],[],["ankle"]]};

// The muscles themselves: {primary:[part…], secondary:[part…], joints:[…]}.
const pcache={};
export function partsOf(name){
  const k=String(name||"").trim().toLowerCase();
  if(pcache[k])return pcache[k];
  let out=null;
  for(const [re,p,s,j] of R)if(re.test(k)){out={primary:p,secondary:s,joints:j};break;}
  if(!out){const f=GROUP_FALLBACK[exerciseGroup(name)];
    if(f){const P=expand(f[0]);out={primary:P,secondary:expand(f[1]).filter(x=>P.indexOf(x)<0),joints:f[2]};}
    else out={primary:[],secondary:[],joints:[]};}
  return pcache[k]=out;
}
// The groups: a group is primary when any of its muscles is, else secondary when any is.
const cache={};
export function musclesOf(name){
  const k=String(name||"").trim().toLowerCase();
  if(cache[k])return cache[k];
  const p=partsOf(name),primary=[],secondary=[];
  p.primary.forEach(x=>{const g=PART_GROUP[x];if(primary.indexOf(g)<0)primary.push(g);});
  p.secondary.forEach(x=>{const g=PART_GROUP[x];if(primary.indexOf(g)<0&&secondary.indexOf(g)<0)secondary.push(g);});
  return cache[k]={primary,secondary,joints:p.joints};
}

const DAY=86400000;
// Each exercise's hard sets in a window: fn(name, how many).
function eachWork(sessions,from,to,fn){
  sessions.forEach(s=>{const t=Date.parse(s.created);if(isNaN(t)||t<from||t>to)return;
    s.ex.forEach(e=>{const n=e.sets.filter(x=>!x.wu).length;if(n)fn(e.name,n);});});
}
const round=by=>{Object.keys(by).forEach(k=>{by[k]=Math.round(by[k]*2)/2;});return by;};
// Hard sets per group in a window: primary 1 a set, secondary ½.
export function setsByMuscle(sessions,from,to){
  const by={};MUSCLES.forEach(m=>{by[m[0]]=0;});
  eachWork(sessions,from,to,(name,n)=>{const m=musclesOf(name);m.primary.forEach(k=>{by[k]+=n;});m.secondary.forEach(k=>{by[k]+=n/2;});});
  return round(by);
}
// The same for each muscle on its own: a bench press is a full set for both heads of the pec
// and the triceps, and half of one for the front deltoid.
export function setsByPart(sessions,from,to){
  const by={};PARTS.forEach(p=>{by[p[0]]=0;});
  eachWork(sessions,from,to,(name,n)=>{const m=partsOf(name);m.primary.forEach(k=>{by[k]+=n;});m.secondary.forEach(k=>{by[k]+=n/2;});});
  return round(by);
}
// Which exercises gave a group (or, with part set, one muscle) its sets, for the detail.
export function contributors(sessions,muscle,from,to,part){
  const by={};
  eachWork(sessions,from,to,(name,n)=>{const m=part?partsOf(name):musclesOf(name);
    const w=m.primary.indexOf(muscle)>=0?1:m.secondary.indexOf(muscle)>=0?0.5:0;if(w)by[name]=(by[name]||0)+n*w;});
  return Object.entries(by).sort((a,b)=>b[1]-a[1]);
}
// How fatigued each group (or each muscle) still is, 0–1: each hard set adds to it and it fades
// with the group's half-life, so a heavy leg day reads "recovering" for two days, then "ready".
function fatigue(sessions,now,keys,of,half){
  const by={};keys.forEach(k=>{by[k]=0;});
  sessions.forEach(s=>{s.ex.forEach(e=>{const m=of(e.name);
    e.sets.forEach(x=>{if(x.wu)return;const t=Date.parse(x.at||s.created);if(isNaN(t)||t>now||now-t>5*DAY)return;
      const age=(now-t)/3600000;
      const add=(k,w)=>{by[k]+=w*Math.pow(0.5,age/(half(k)||30));};
      m.primary.forEach(k=>add(k,1));m.secondary.forEach(k=>add(k,0.5));});});});
  // Eight hard sets just done is "fully worked".
  Object.keys(by).forEach(k=>{by[k]=Math.min(1,by[k]/8);});
  return by;
}
export const fatigueByMuscle=(sessions,now)=>fatigue(sessions,now,MUSCLES.map(m=>m[0]),musclesOf,k=>HALF[k]);
export const fatigueByPart=(sessions,now)=>fatigue(sessions,now,PARTS.map(p=>p[0]),partsOf,k=>HALF[PART_GROUP[k]]);
export const recoveryWord=f=>f>=0.6?"recovering":f>=0.3?"partly recovered":"ready";
