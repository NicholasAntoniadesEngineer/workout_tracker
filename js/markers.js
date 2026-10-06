// Blood and health markers, typed in from a lab report a few times a year: each has a usual
// range, a trend and a flag, and a Learn topic to read when it's out of range. The ranges are
// the ones labs print; the point is to see your own line over time, not a diagnosis.
export const MARKERS=[
  {id:"ferritin",name:"Ferritin",unit:"ng/mL",lo:30,hi:300,learn:"h-micronutrients",note:"Iron stores. Endurance training and heavy sweating pull it down."},
  {id:"vitd",name:"Vitamin D (25-OH)",unit:"ng/mL",lo:30,hi:80,learn:"h-vitamin-d",note:"Most of a year indoors and north of the sun's reach lands low."},
  {id:"hba1c",name:"HbA1c",unit:"%",lo:4.0,hi:5.6,learn:"h-carbs",note:"Three months of blood sugar in one number."},
  {id:"glucose",name:"Fasting glucose",unit:"mg/dL",lo:70,hi:99,learn:"h-low-carb",note:"Taken before breakfast."},
  {id:"tc",name:"Total cholesterol",unit:"mg/dL",lo:120,hi:200,learn:"h-animal-based",note:"The whole picture matters more than this one line."},
  {id:"ldl",name:"LDL",unit:"mg/dL",lo:40,hi:100,learn:"h-animal-based",note:""},
  {id:"hdl",name:"HDL",unit:"mg/dL",lo:40,hi:100,learn:"h-wholefood",note:"Higher is the good direction here."},
  {id:"trig",name:"Triglycerides",unit:"mg/dL",lo:30,hi:150,learn:"h-carbs",note:"Rises with sugar and alcohol; falls with training."},
  {id:"test",name:"Testosterone, total",unit:"ng/dL",lo:300,hi:1000,learn:"h-sleep",note:"Morning draw. Sleep, body fat and training load all move it."},
  {id:"crp",name:"hs-CRP",unit:"mg/L",lo:0,hi:3,learn:"h-omega3",note:"Inflammation; a hard session the day before can raise it."},
  {id:"b12",name:"Vitamin B12",unit:"pg/mL",lo:300,hi:900,learn:"h-organ-meats",note:""},
  {id:"tsh",name:"TSH",unit:"mIU/L",lo:0.4,hi:4.0,learn:"h-micronutrients",note:""},
];
export const markerById=id=>MARKERS.find(m=>m.id===id)||null;

// Where a reading sits: "low", "ok" or "high", and a short word for the card.
export function flagOf(m,v){
  if(v==null||v==="")return "";
  if(m.lo!=null&&v<m.lo)return "low";
  if(m.hi!=null&&v>m.hi)return "high";
  return "ok";
}
// The readings of one marker, oldest first, with the change since the one before.
export function series(readings,id){
  return readings.filter(r=>r.id===id).sort((a,b)=>(a.at||"").localeCompare(b.at||""))
    .map((r,i,a)=>Object.assign({},r,{delta:i?Math.round((r.v-a[i-1].v)*10)/10:null}));
}
