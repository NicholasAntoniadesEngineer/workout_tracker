// Planning ahead: routines placed on calendar days, a block of weeks from a weekly pattern with
// a deload week, ready-made programmes, and a programme pasted as text turned into routines.
// Pure functions; the store and views do the placing and showing.

const DAY=86400000;
const pad=n=>String(n).padStart(2,"0");
export const keyOfDate=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());

// Dates for a block: from `start` (YYYY-MM-DD), `weeks` long, one routine per weekday in
// `pattern` ({1:"routineId", 3:"…"}; 0 is Sunday). Every `deloadEvery`-th week is a deload.
export function blockDates(opts){
  const start=new Date(opts.start+"T12:00:00"),out=[];
  const weeks=Math.max(1,Math.min(26,+opts.weeks||4)),every=+opts.deloadEvery||0;
  for(let i=0;i<weeks*7;i++){
    const d=new Date(+start+i*DAY),rid=opts.pattern[d.getDay()];
    if(!rid)continue;
    const week=Math.floor(i/7)+1;
    out.push({date:keyOfDate(d),routine:rid,week,deload:!!(every&&week%every===0)});
  }
  return out;
}

// A deload: the same exercises, a third fewer sets, the weight 10% lighter.
export function deloadTarget(sets,unit){
  const step=unit==="lb"?5:2.5,work=(sets||[]).filter(x=>!x.wu);
  if(!work.length)return null;
  const w=Math.max(...work.map(x=>+x.w||0)),r=Math.min(...work.map(x=>x.r));
  const next=Math.round(w*0.9/step)*step;
  return {text:"Deload week: "+(w?next+unit+" × "+r:r+" reps")+", about two-thirds of your usual sets",apply:w?{w:next,r}:{r},rule:"deload"};
}

// Ready-made programmes that aren't in Learn. Each day lists its exercises with target sets;
// `pattern` is the usual weekdays.
export const PROGRAMMES=[
  {id:"gzclp",name:"GZCLP",by:"Cody LeFever",note:"Four days rotating over three or four days a week. T1 heavy (5 × 3), T2 volume (3 × 10), T3 light (3 × 15+). Add weight each session the reps are all made.",
   pattern:[1,3,5],days:[
    {name:"GZCLP A1",ex:[["Squats",5,3],["Bench press",3,10],["Lat pulldown",3,15]]},
    {name:"GZCLP B1",ex:[["Shoulder press",5,3],["Deadlift",3,10],["Dumbbell row",3,15]]},
    {name:"GZCLP A2",ex:[["Bench press",5,3],["Squats",3,10],["Lat pulldown",3,15]]},
    {name:"GZCLP B2",ex:[["Deadlift",5,3],["Shoulder press",3,10],["Dumbbell row",3,15]]}]},
  {id:"lp5x5",name:"5 × 5 linear",by:"After Reg Park and Bill Starr",note:"Two full-body days alternating three times a week. Five sets of five; add the smallest jump every session all 25 reps are made.",
   pattern:[1,3,5],days:[
    {name:"5 × 5 A",ex:[["Squats",5,5],["Bench press",5,5],["Barbell row",5,5]]},
    {name:"5 × 5 B",ex:[["Squats",5,5],["Shoulder press",5,5],["Deadlift",1,5]]}]},
  {id:"ppl",name:"Push, pull, legs",by:"",note:"Three days a week, or six by running it twice. Eight to twelve reps; add weight once every set reaches twelve.",
   pattern:[1,3,5],days:[
    {name:"Push",ex:[["Bench press",4,8],["Shoulder press",3,10],["Dips",3,10],["Dumbbell lateral raise",3,12]]},
    {name:"Pull",ex:[["Barbell row",4,8],["Pull ups",3,8],["Cable face pull",3,15],["Bicep curls",3,12]]},
    {name:"Legs",ex:[["Squats",4,8],["Romanian deadlift",3,10],["Bulgarian split squat",3,10],["Calf raises",3,15]]}]},
  {id:"upperlower",name:"Upper and lower",by:"",note:"Four days a week: two upper, two lower.",
   pattern:[1,2,4,5],days:[
    {name:"Upper A",ex:[["Bench press",4,6],["Barbell row",4,6],["Shoulder press",3,10],["Lat pulldown",3,10]]},
    {name:"Lower A",ex:[["Squats",4,6],["Romanian deadlift",3,8],["Walking lunges",3,10],["Calf raises",3,15]]},
    {name:"Upper B",ex:[["Incline dumbbell press",4,8],["Pull ups",4,8],["Dumbbell lateral raise",3,12],["Hammer curl",3,12]]},
    {name:"Lower B",ex:[["Deadlift",3,5],["Front squat",3,8],["Lying leg curl",3,12],["Hip thrust",3,10]]}]},
];
// A programme's days as routines to save: {name, ex:[names], plan:[{name, sets:[{r,w}]}]}.
export function programmeRoutines(p){
  return p.days.map(d=>({name:d.name,ex:d.ex.map(x=>x[0]),plan:d.ex.map(x=>({name:x[0],sets:Array.from({length:x[1]},()=>({r:x[2],w:0,rest:0}))}))}));
}

// ── Pasting a programme ─────────────────────────────────────────────────────────────────
// Reads a programme written as text, from a coach, a forum or an AI chat:
//   Day 1: Upper            ← a day: "Day 1", "Monday", "Workout A", or any line ending ":"
//   Bench press 4x8 @ 80    ← an exercise: name, then sets × reps (a range keeps its top), then weight
//   - Pull ups 3 x 8-10
//   Squats: 5×5 100kg
// Lines it can't read are skipped and reported. Exercise names are matched to the list.
const DAYNAMES=/^(mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?|sun)(day)?\b/i;
const HEAD=/^(#+\s*)?(day\s*\d+|week\s*\d+.*day\s*\d+|workout\s*[a-z0-9]+|session\s*\d+|[a-z][\w &'\/-]{1,40}:)\s*(.*)$/i;
const SETS=/(\d+)\s*(?:x|×|\*|sets? of)\s*(\d+)(?:\s*[-–to]+\s*(\d+))?(\s*(?:reps?|r))?/i;
const WEIGHT=/(?:@|at)?\s*(\d+(?:[.,]\d+)?)\s*(kg|lbs?|#)?\s*$/i;
const tidy=s=>s.replace(/^[\s\-–•*·\d.)]+(?=[a-z])/i,"").replace(/\s+/g," ").trim();

export function matchExercise(raw,catalog){
  const k=raw.trim().toLowerCase().replace(/s$/,"");
  if(!k)return "";
  const exact=catalog.find(n=>n.toLowerCase()===raw.trim().toLowerCase());if(exact)return exact;
  const loose=catalog.find(n=>n.toLowerCase().replace(/s$/,"")===k);if(loose)return loose;
  const ALIAS={"bench":"Bench press","squat":"Squats","back squat":"Squats","ohp":"Shoulder press","overhead press":"Shoulder press","press":"Shoulder press",
    "military press":"Shoulder press","rdl":"Romanian deadlift","row":"Barbell row","bent over row":"Barbell row","pull-up":"Pull ups","pullup":"Pull ups",
    "chin-up":"Chin ups","chinup":"Chin ups","pulldown":"Lat pulldown","curl":"Bicep curls","dip":"Dips","lunge":"Walking lunges","calf raise":"Calf raises","hip thrust":"Hip thrust"};
  if(ALIAS[k])return ALIAS[k];
  const starts=catalog.filter(n=>n.toLowerCase().startsWith(k));if(starts.length===1)return starts[0];
  return raw.trim().replace(/^./,c=>c.toUpperCase());
}

export function parseProgramme(text,catalog){
  const days=[],skipped=[];let cur=null;
  String(text||"").split(/\r?\n/).forEach(line=>{
    const l=line.trim();if(!l)return;
    const sm=l.match(SETS);
    const head=!sm&&(DAYNAMES.test(l)||HEAD.test(l));
    if(head){
      const name=l.replace(/^#+\s*/,"").replace(/[:\-–]+\s*$/,"").replace(/\s*[:\-–]\s*/," · ").trim();
      cur={name:name.slice(0,40),ex:[],plan:[]};days.push(cur);return;
    }
    if(!sm){skipped.push(l);return;}
    let name=tidy(l.slice(0,sm.index).replace(/[:\-–]\s*$/,""));
    const after=l.slice(sm.index+sm[0].length);
    if(!name){skipped.push(l);return;}
    const sets=+sm[1],reps=+(sm[3]||sm[2]);
    const wm=after.match(WEIGHT),w=wm?parseFloat(wm[1].replace(",",".")):0;
    if(!(sets>0&&sets<=20&&reps>0&&reps<=100)){skipped.push(l);return;}
    if(!cur){cur={name:"Day 1",ex:[],plan:[]};days.push(cur);}
    name=matchExercise(name,catalog);
    if(cur.ex.indexOf(name)<0){cur.ex.push(name);cur.plan.push({name,sets:Array.from({length:sets},()=>({r:reps,w,rest:0}))});}
  });
  return {days:days.filter(d=>d.ex.length),skipped};
}
