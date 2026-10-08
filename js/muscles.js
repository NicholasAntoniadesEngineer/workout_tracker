// Which muscles an exercise trains and which joints it loads, from its name. Rules run in
// order, most specific first; the first that matches decides. Primary muscles count a full set,
// secondary ones half. Used for weekly sets by muscle, recovery by muscle and sore-joint warnings.
import {exerciseGroup} from "./model.js";

export const MUSCLES=[
  ["chest","Chest","upper"],["frontdelt","Front delts","upper"],["sidedelt","Side delts","upper"],["reardelt","Rear delts","upper"],
  ["lats","Lats","upper"],["upperback","Upper back","upper"],["biceps","Biceps","upper"],["triceps","Triceps","upper"],["forearms","Forearms","upper"],
  ["abs","Abs","core"],["lowerback","Lower back","core"],
  ["glutes","Glutes","lower"],["quads","Quads","lower"],["hamstrings","Hamstrings","lower"],["adductors","Adductors","lower"],["calves","Calves","lower"],
];
export const MUSCLE_NAME=Object.fromEntries(MUSCLES.map(m=>[m[0],m[1]]));
export const JOINTS=[["shoulder","Shoulder"],["elbow","Elbow"],["wrist","Wrist"],["neck","Neck"],["lowerback","Lower back"],["hip","Hip"],["knee","Knee"],["ankle","Ankle"]];
export const JOINT_NAME=Object.fromEntries(JOINTS);

// [pattern, primary, secondary, joints]
const R=[
  // Not lifting: no muscles counted.
  [/stretch|pose|breathing|vacuum|rolling$|hamstring roller|pancake/,[],[],[]],
  // Lower leg
  [/tibialis/,[],[],["ankle"]],
  [/calf|soleus|fhl|straddle hop/,["calves"],[],["ankle"]],
  [/reverse nordic|sissy squat|leg extension/,["quads"],[],["knee"]],
  [/nordic|leg curl|hamstring curl/,["hamstrings"],[],["knee"]],
  // Hinges
  [/good morning|jefferson curl|back extension|reverse hyper|ql extension|seated good/,["lowerback","hamstrings"],["glutes"],["lowerback","hip"]],
  [/romanian|\brdl\b|stiff-leg|single-leg deadlift/,["hamstrings","glutes"],["lowerback","forearms"],["lowerback","hip"]],
  [/rack pull|deadlift from blocks|pull from blocks/,["upperback","glutes"],["hamstrings","forearms","lowerback"],["lowerback","hip"]],
  [/snatch pull|clean pull|high pull/,["upperback","glutes"],["hamstrings","quads","sidedelt"],["lowerback","hip","shoulder"]],
  [/deadlift|jefferson lift|hand-and-thigh|leverage lift|stone lift|barrel lift|keg/,["glutes","hamstrings","lowerback"],["quads","upperback","forearms"],["lowerback","hip"]],
  [/swing|pull-through|pull through/,["glutes","hamstrings"],["lowerback","forearms"],["hip","lowerback"]],
  [/wrestler's bridge/,["upperback"],["glutes","hamstrings"],["neck"]],
  [/hip thrust|glute bridge|glute kickback|bridge$/,["glutes"],["hamstrings"],["hip"]],
  [/lateral walk/,["glutes"],[],["hip"]],
  // Olympic and full-body
  [/clean and jerk|clean and press|long cycle|squat press clean/,["quads","glutes","frontdelt"],["upperback","triceps","hamstrings"],["shoulder","wrist","knee","hip","lowerback"]],
  [/snatch/,["quads","glutes","upperback"],["sidedelt","hamstrings","triceps"],["shoulder","wrist","knee","hip","lowerback"]],
  [/power clean|hang clean|one-hand barbell clean|clean$/,["glutes","quads","upperback"],["hamstrings","forearms"],["wrist","knee","hip","lowerback"]],
  [/jerk|push press/,["frontdelt","triceps"],["quads","sidedelt"],["shoulder","wrist","knee"]],
  [/indian club|mace/,["sidedelt","forearms"],["reardelt","abs"],["shoulder","wrist"]],
  [/put$|toss|throw|weight for distance|weight over bar/,["glutes","frontdelt"],["quads","abs","triceps"],["shoulder","hip"]],
  [/pit digging|sledgehammer/,["upperback","abs"],["forearms","glutes"],["lowerback","shoulder"]],
  [/turkish get-up|windmill/,["frontdelt","abs"],["glutes","sidedelt"],["shoulder","hip"]],
  [/farmer|suitcase|yoke|stone carry|carry|loaded march|front rack hold/,["forearms","upperback"],["abs","glutes"],["wrist","lowerback"]],
  [/sled|backward walk|elephant walk/,["quads","glutes"],["calves","hamstrings"],["knee","ankle"]],
  [/burpee|mountain climber|jumping jack/,["quads","chest"],["abs","triceps"],["knee","wrist","shoulder"]],
  [/box jump|depth jump|long jump|high jump|jump|bound|\bhop(s|ping)?\b|hurdle|pole vault/,["quads","glutes","calves"],["hamstrings"],["knee","ankle"]],
  // Squats and lunges
  [/split squat|lunge|step[ -]?up|step-down|slant board steps|patrick step|cossack|pistol/,["quads","glutes"],["adductors","hamstrings"],["knee","hip"]],
  [/sumo squat/,["quads","glutes","adductors"],["hamstrings"],["knee","hip"]],
  [/leg press|hack squat/,["quads"],["glutes","adductors"],["knee"]],
  [/front squat|overhead squat|goblet/,["quads"],["glutes","upperback","abs"],["knee","hip","wrist"]],
  [/squat|wall sit|horse stance|shiko|koshiwari|matawari|barbell foot press/,["quads","glutes"],["adductors","hamstrings","lowerback"],["knee","hip","lowerback"]],
  // Pushes
  [/handstand push|pike push|behind-the-neck|overhead press|shoulder press|seated press|military|log press|axle press|kettlebell press|bent press|one-hand barbell press|one-arm push$|sang press|single-arm dumbbell press|band overhead/,["frontdelt","triceps"],["sidedelt","upperback"],["shoulder","elbow"]],
  [/incline (bench|dumbbell press|log)|inclined bench|incline press/,["chest","frontdelt"],["triceps"],["shoulder","elbow"]],
  [/dip/,["chest","triceps"],["frontdelt"],["shoulder","elbow"]],
  [/push[- ]?up|push up|meels|kabbadeh|scrum|bridge press/,["chest","triceps"],["frontdelt","abs"],["shoulder","wrist","elbow"]],
  [/pullover/,["lats","chest"],["triceps"],["shoulder"]],
  [/bench|chest press|floor press|isometric rack press/,["chest","triceps"],["frontdelt"],["shoulder","elbow","wrist"]],
  [/rear delt|reverse fly|reverse pec deck|face pull|pull-apart|pull apart|external rotation/,["reardelt"],["upperback"],["shoulder"]],
  [/fly|pec deck|crossover/,["chest"],["frontdelt"],["shoulder"]],
  [/lateral raise|upright row|trap 3 raise/,["sidedelt"],["upperback"],["shoulder"]],
  [/front raise/,["frontdelt"],[],["shoulder"]],
  [/tricep|skull crusher|kickback|pushdown/,["triceps"],[],["elbow"]],
  // Pulls
  [/pull[- ]?up|chin[- ]?up|pulldown|rope climb|lat spread/,["lats"],["biceps","upperback","forearms"],["shoulder","elbow"]],
  [/row/,["upperback","lats"],["biceps","reardelt","forearms"],["lowerback","elbow"]],
  [/shrug/,["upperback"],["forearms"],["neck"]],
  [/neck/,[],[],["neck"]],
  [/wrist|grip|pinch|finger|gripper|roller|nigiri|chi-ishi|ishi-sashi/,["forearms"],[],["wrist"]],
  [/hammer curl|reverse curl|zottman/,["biceps","forearms"],[],["elbow","wrist"]],
  [/curl/,["biceps"],["forearms"],["elbow"]],
  // Core, ahead of the hang rule so hanging raises count as abs.
  [/plank|dead bug|hollow|pallof|ab wheel|crunch|sit-up|sit up|leg raise|knee raise|l-sit|woodchop|side bend|trunk twist|garhammer|powell/,["abs"],[],["lowerback"]],
  [/hang/,["forearms"],["lats"],["shoulder","wrist"]],
  [/handstand|frog stand|headstand|forearm stand|hand balancing/,["frontdelt","triceps"],["abs"],["shoulder","wrist","neck"]],
];

// {primary:[...], secondary:[...], joints:[...]} for an exercise name; custom names with no rule
// fall back to their movement group.
const GROUP_FALLBACK={"Squat & lunge":[["quads","glutes"],["hamstrings"],["knee","hip"]],"Hinge & glutes":[["glutes","hamstrings"],["lowerback"],["lowerback","hip"]],
  "Push":[["chest","triceps"],["frontdelt"],["shoulder","elbow"]],"Pull":[["lats","upperback"],["biceps"],["shoulder","elbow"]],
  "Core":[["abs"],[],["lowerback"]],"Lower leg":[["calves"],[],["ankle"]]};
const cache={};
export function musclesOf(name){
  const k=String(name||"").trim().toLowerCase();
  if(cache[k])return cache[k];
  let out=null;
  for(const [re,p,s,j] of R)if(re.test(k)){out={primary:p,secondary:s,joints:j};break;}
  if(!out){const f=GROUP_FALLBACK[exerciseGroup(name)];out=f?{primary:f[0],secondary:f[1],joints:f[2]}:{primary:[],secondary:[],joints:[]};}
  return cache[k]=out;
}

const DAY=86400000;
// Hard sets per muscle in a window ending at `now`: primary muscles 1 a set, secondary ½.
export function setsByMuscle(sessions,from,to){
  const by={};MUSCLES.forEach(m=>{by[m[0]]=0;});
  sessions.forEach(s=>{const t=Date.parse(s.created);if(isNaN(t)||t<from||t>to)return;
    s.ex.forEach(e=>{const n=e.sets.filter(x=>!x.wu).length;if(!n)return;
      const m=musclesOf(e.name);m.primary.forEach(k=>{by[k]+=n;});m.secondary.forEach(k=>{by[k]+=n/2;});});});
  Object.keys(by).forEach(k=>{by[k]=Math.round(by[k]*2)/2;});
  return by;
}
// Which exercises gave a muscle its sets, for the tap-a-muscle detail.
export function contributors(sessions,muscle,from,to){
  const by={};
  sessions.forEach(s=>{const t=Date.parse(s.created);if(isNaN(t)||t<from||t>to)return;
    s.ex.forEach(e=>{const n=e.sets.filter(x=>!x.wu).length;if(!n)return;const m=musclesOf(e.name);
      const w=m.primary.indexOf(muscle)>=0?1:m.secondary.indexOf(muscle)>=0?0.5:0;if(w)by[e.name]=(by[e.name]||0)+n*w;});});
  return Object.entries(by).sort((a,b)=>b[1]-a[1]);
}
// How fatigued each muscle still is, 0–1: each hard set adds to it and it fades with a half-life
// of about a day and a half, so a heavy leg day reads "recovering" for two days, then "ready".
// Big muscles recover a little slower than small ones.
const HALF={quads:42,glutes:42,hamstrings:42,lowerback:48,lats:36,upperback:36,chest:36,adductors:36};
export function fatigueByMuscle(sessions,now){
  const by={};MUSCLES.forEach(m=>{by[m[0]]=0;});
  sessions.forEach(s=>{s.ex.forEach(e=>{const m=musclesOf(e.name);
    e.sets.forEach(x=>{if(x.wu)return;const t=Date.parse(x.at||s.created);if(isNaN(t)||t>now||now-t>5*DAY)return;
      const age=(now-t)/3600000;
      const add=(k,w)=>{by[k]+=w*Math.pow(0.5,age/(HALF[k]||30));};
      m.primary.forEach(k=>add(k,1));m.secondary.forEach(k=>add(k,0.5));});});});
  // Eight hard sets just done is "fully worked".
  Object.keys(by).forEach(k=>{by[k]=Math.min(1,by[k]/8);});
  return by;
}
export const recoveryWord=f=>f>=0.6?"recovering":f>=0.3?"partly recovered":"ready";
