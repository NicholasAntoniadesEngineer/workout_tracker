// Real workouts to print and scan in the tests: the way people plan them, in their own
// languages and scripts, with what the sheet carries for each exercise (last time, rest, a
// pinned note, warm-ups and plates for barbell lifts). Shared by the sheet drawer
// (tests/fixtures/make-sheets.mjs) and the scan tests, so both print exactly the same pages.
import {platesPerSide} from "../../js/model.js";
import {warmupRamp} from "../../js/coach.js";

const fmt=w=>String(Math.round(w*100)/100);
// [name, sets "5x100,5x100" or "3x5@100", options]
function ex(name,plan,o){
  const opt=o||{},unit=opt.unit||"kg",bar=unit==="lb"?45:20;
  let sets=[];
  const m=/^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(plan);
  if(m)sets=Array.from({length:+m[1]},()=>({r:+m[2],w:m[3]?+m[3]:0}));
  else if(plan)sets=plan.split(",").map(p=>{const [r,w]=p.split("x");return {r:+r||0,w:+w||0};});
  if(opt.bb)sets.forEach(s=>{const p=platesPerSide(s.w,unit,bar);s.plates=p&&p.plates.length?p.plates.map(fmt).join(" ")+" a side":"";});
  const top=Math.max(0,...sets.map(s=>s.w)),ramp=opt.bb&&top?warmupRamp(top,unit,bar):[];
  return {name,mode:opt.mode||"reps",unit,hand:!!opt.hand,band:!!opt.band,step:opt.step||(opt.hand?(unit==="lb"?5:2):(unit==="lb"?5:2.5)),sets,
    last:opt.last||"",rest:opt.rest||"",note:opt.note||"",warm:ramp.map(x=>(x.w===bar?"bar":fmt(x.w))+"×"+x.r).join(", ")};
}
const W=(key,lang,title,exs,o)=>({key,lang,title,exs,...(o||{})});

export const WORKOUTS=[
  W("en-lower","en-GB","Lower A · Squat focus",[
    ex("Back squat","3x5@102.5",{bb:1,last:"5·5·5 × 100 kg · 1 Oct",rest:"3:00",note:"Belt on the top set, knees out"}),
    ex("Romanian deadlift","3x8@80",{bb:1,last:"8·8·7 × 80 kg · 1 Oct",rest:"2:30"}),
    ex("Bulgarian split squat","3x10@16",{hand:1,last:"10·10·9 × 16 kg · 1 Oct",rest:"1:30",note:"Front foot on the second floor tile"}),
    ex("Lying leg curl","3x12@45",{last:"12·12·11 × 45 kg · 1 Oct",rest:"1:30",note:"Seat 4, pad on the ankles"}),
    ex("Standing calf raise","4x15@60",{last:"15·15·15·14 × 60 kg · 1 Oct",rest:"1:00"}),
    ex("Plank","3x60",{mode:"secs",last:"60·60·45 s · 1 Oct",rest:"1:00"}),
  ],{gym:"Home gym"}),
  W("af-push","af-ZA","Bolyf: Druk",[
    ex("Bankdruk","4x6@80",{bb:1,last:"6·6·6·5 × 80 kg · 2 Okt.",rest:"3:00",note:"Skouerblaaie saam, voete plat"}),
    ex("Skuinsbankdruk met handgewigte","3x10@26",{hand:1,last:"10·10·8 × 26 kg · 2 Okt.",rest:"2:00"}),
    ex("Staande skouerdruk","3x8@50",{bb:1,last:"8·8·7 × 47.5 kg · 2 Okt.",rest:"2:30"}),
    ex("Sywaartse lig","3x15@10",{hand:1,last:"15·14·12 × 10 kg · 2 Okt.",rest:"1:00"}),
    ex("Trisep-afdruk met tou","3x12@30",{last:"12·12·12 × 27.5 kg · 2 Okt.",rest:"1:00"}),
  ],{gym:"Virgin Active Sandton"}),
  W("es-legs","es-ES","Pierna y glúteo",[
    ex("Sentadilla trasera","4x6@90",{bb:1,last:"6·6·6·6 × 87,5 kg · 1 oct",rest:"3:00",note:"Profundidad: cadera por debajo de la rodilla"}),
    ex("Peso muerto rumano","3x10@70",{bb:1,last:"10·10·10 × 70 kg · 1 oct",rest:"2:00"}),
    ex("Hip thrust con barra","3x12@100",{bb:1,last:"12·12·10 × 100 kg · 1 oct",rest:"2:00",note:"Pausa de un segundo arriba"}),
    ex("Prensa de piernas","3x12@160",{last:"12·12·12 × 150 kg · 1 oct",rest:"2:00"}),
    ex("Elevación de talones de pie","4x15@50",{last:"15·15·15·15 × 50 kg · 1 oct",rest:"1:00"}),
  ],{gym:"Gimnasio municipal"}),
  W("de-pull","de-DE","Oberkörper Zug",[
    ex("Klimmzüge","5x8",{last:"8·8·7·6·6 · 30. Sept.",rest:"2:30",note:"Breiter Griff, ganz runter"}),
    ex("Langhantelrudern vorgebeugt","4x8@70",{bb:1,last:"8·8·8·8 × 67,5 kg · 30. Sept.",rest:"2:00"}),
    ex("Latziehen am Kabelzug mit engem Untergriff","3x12@55",{last:"12·12·10 × 55 kg · 30. Sept.",rest:"1:30"}),
    ex("Face Pulls am Seilzug","3x15@20",{last:"15·15·15 × 17,5 kg · 30. Sept.",rest:"1:00"}),
    ex("Hammercurls","3x12@14",{hand:1,last:"12·11·10 × 14 kg · 30. Sept.",rest:"1:00"}),
  ]),
  W("fr-full","fr-FR","Full body débutant",[
    ex("Squat goblet","3x10@20",{last:"10·10·10 × 18 kg · 1 oct.",rest:"1:30"}),
    ex("Développé couché","3x8@60",{bb:1,last:"8·8·6 × 60 kg · 1 oct.",rest:"2:30",note:"Barre au niveau des tétons"}),
    ex("Rowing haltère à un bras","3x10@24",{last:"10·10·10 × 22 kg · 1 oct.",rest:"1:30"}),
    ex("Fentes marchées","3x12@12",{hand:1,last:"12·12·12 × 10 kg · 1 oct.",rest:"1:30"}),
    ex("Gainage","3x45",{mode:"secs",last:"45·40·30 s · 1 oct.",rest:"1:00"}),
  ],{deload:true}),
  W("pt-a","pt-BR","Treino A — Peito e tríceps",[
    ex("Supino reto com barra","4x8@70",{bb:1,last:"8·8·8·7 × 70 kg · 1 de out.",rest:"2:30"}),
    ex("Supino inclinado com halteres","3x10@24",{hand:1,last:"10·10·9 × 24 kg · 1 de out.",rest:"2:00"}),
    ex("Crucifixo no cabo","3x15@15",{last:"15·15·15 × 12,5 kg · 1 de out.",rest:"1:00"}),
    ex("Mergulho nas paralelas","3x10",{last:"10·9·8 · 1 de out.",rest:"1:30"}),
    ex("Tríceps testa","3x12@25",{last:"12·12·10 × 25 kg · 1 de out.",rest:"1:00"}),
  ]),
  W("it-push","it-IT","Spinta",[
    ex("Panca piana","5x5@85",{bb:1,last:"5·5·5·5·4 × 85 kg · 1 ott",rest:"3:00"}),
    ex("Lento avanti in piedi","3x6@50",{bb:1,last:"6·6·5 × 50 kg · 1 ott",rest:"2:30"}),
    ex("Croci ai cavi alti","3x12@12.5",{last:"12·12·12 × 12,5 kg · 1 ott",rest:"1:00"}),
    ex("Dip alle parallele","3x8",{last:"8·8·8 · 1 ott",rest:"2:00"}),
  ]),
  W("el-legs","el-GR","Πόδια και πλάτη",[
    ex("Καθίσματα με μπάρα","5x5@100",{bb:1,last:"5·5·5·5·5 × 97,5 kg · 1 Οκτ",rest:"3:00",note:"Ζώνη στο τελευταίο σετ"}),
    ex("Άρσεις θανάτου","1x5@140",{bb:1,last:"5 × 137,5 kg · 1 Οκτ",rest:"4:00"}),
    ex("Προβολές με αλτήρες","3x10@18",{hand:1,last:"10·10·10 × 16 kg · 1 Οκτ",rest:"1:30"}),
    ex("Κωπηλατική με μπάρα","3x8@70",{bb:1,last:"8·8·8 × 70 kg · 1 Οκτ",rest:"2:00"}),
  ]),
  W("ru-back","ru-RU","Спина и бицепс",[
    ex("Становая тяга","3x5@150",{bb:1,last:"5·5·5 × 145 кг · 1 окт.",rest:"4:00",note:"Ремень, хват разнохват"}),
    ex("Подтягивания широким хватом","4x8",{last:"8·8·7·6 · 1 окт.",rest:"2:00"}),
    ex("Тяга штанги в наклоне","4x8@75",{bb:1,last:"8·8·8·8 × 72,5 кг · 1 окт.",rest:"2:00"}),
    ex("Подъём штанги на бицепс","3x10@35",{last:"10·10·9 × 35 кг · 1 окт.",rest:"1:30"}),
  ]),
  W("zh-push","zh-CN","推日",[
    ex("杠铃卧推","5x5@80",{bb:1,last:"5·5·5·5·5 × 77.5 kg · 10月1日",rest:"3:00",note:"肩胛后收，脚踩实"}),
    ex("上斜哑铃卧推","3x10@24",{hand:1,last:"10·10·9 × 24 kg · 10月1日",rest:"2:00"}),
    ex("坐姿哑铃推肩","3x10@20",{hand:1,last:"10·10·10 × 18 kg · 10月1日",rest:"2:00"}),
    ex("绳索下压","3x15@25",{last:"15·15·12 × 25 kg · 10月1日",rest:"1:00"}),
  ]),
  W("ja-legs","ja-JP","脚の日",[
    ex("バーベルスクワット","5x5@95",{bb:1,last:"5·5·5·5·5 × 92.5 kg · 10月1日",rest:"3:00",note:"ベルトは最後のセットだけ"}),
    ex("ルーマニアンデッドリフト","3x8@80",{bb:1,last:"8·8·8 × 80 kg · 10月1日",rest:"2:30"}),
    ex("レッグプレス","3x12@180",{last:"12·12·12 × 170 kg · 10月1日",rest:"2:00"}),
    ex("スタンディング・カーフレイズ","4x15@70",{last:"15·15·15·15 × 70 kg · 10月1日",rest:"1:00"}),
  ]),
  W("ko-back","ko-KR","등 운동",[
    ex("데드리프트","3x5@140",{bb:1,last:"5·5·5 × 135 kg · 10월 1일",rest:"4:00"}),
    ex("랫 풀다운","4x10@60",{last:"10·10·10·9 × 60 kg · 10월 1일",rest:"1:30",note:"가슴 쪽으로 당기기"}),
    ex("바벨 로우","4x8@70",{bb:1,last:"8·8·8·8 × 67.5 kg · 10월 1일",rest:"2:00"}),
    ex("페이스 풀","3x15@20",{last:"15·15·15 × 20 kg · 10월 1일",rest:"1:00"}),
  ]),
  W("ar-chest","ar-EG","يوم الصدر",[
    ex("ضغط البنش بالبار","4x8@70",{bb:1,last:"8·8·8·7 × 70 kg · 1 أكتوبر",rest:"2:30",note:"لوحا الكتف للخلف"}),
    ex("ضغط مائل بالدمبل","3x10@22",{hand:1,last:"10·10·10 × 22 kg · 1 أكتوبر",rest:"2:00"}),
    ex("تفتيح بالكابل","3x15@12.5",{last:"15·15·15 × 12.5 kg · 1 أكتوبر",rest:"1:00"}),
    ex("غطس على المتوازي","3x10",{last:"10·10·8 · 1 أكتوبر",rest:"1:30"}),
  ]),
  W("hi-legs","hi-IN","पैर का दिन",[
    ex("बारबेल स्क्वाट","4x8@80",{bb:1,last:"8·8·8·8 × 77.5 kg · 1 अक्टू॰",rest:"3:00",note:"घुटने पंजों की दिशा में"}),
    ex("लेग प्रेस","3x12@140",{last:"12·12·12 × 130 kg · 1 अक्टू॰",rest:"2:00"}),
    ex("डम्बल लंज","3x10@14",{hand:1,last:"10·10·10 × 12 kg · 1 अक्टू॰",rest:"1:30"}),
    ex("काफ रेज़","4x15@40",{last:"15·15·15·15 × 40 kg · 1 अक्टू॰",rest:"1:00"}),
  ]),
  W("he-legs","he-IL","יום רגליים",[
    ex("סקוואט עם מוט","5x5@90",{bb:1,last:"5·5·5·5·5 × 87.5 kg · 1 באוק׳",rest:"3:00"}),
    ex("דדליפט רומני","3x8@75",{bb:1,last:"8·8·8 × 75 kg · 1 באוק׳",rest:"2:30"}),
    ex("מכרעים עם משקולות יד","3x10@16",{hand:1,last:"10·10·10 × 14 kg · 1 באוק׳",rest:"1:30"}),
  ]),
  W("en-strongman-lb","en-US","Saturday strongman",[
    ex("Log clean and press","5x3@185",{unit:"lb",last:"3·3·3·3·2 × 180 lb · Oct 1",rest:"3:00",note:"Clean every rep"}),
    ex("Farmer carry","3x40@150",{unit:"lb",mode:"m",hand:1,last:"40·40·30 m × 150 lb · Oct 1",rest:"2:00"}),
    ex("Sled push","4x20@270",{unit:"lb",mode:"m",last:"20·20·20·20 m × 250 lb · Oct 1",rest:"2:00"}),
    ex("Front squat","3x5@225",{unit:"lb",bb:1,last:"5·5·5 × 215 lb · Oct 1",rest:"3:00"}),
    ex("Band pull-apart","3x25",{band:1,last:"25·25·25 · Oct 1",rest:"0:45"}),
    ex("Hollow body hold","3x30",{mode:"secs",last:"30·30·20 s · Oct 1",rest:"1:00"}),
  ],{large:true,unit:"lb",gym:"Garage"}),
  W("en-big","en-AU","Full body volume day",[
    ex("Deadlift","4x5@160",{bb:1,last:"5·5·5·5 × 155 kg · 1 Oct",rest:"4:00"}),
    ex("Bench press","4x6@90",{bb:1,last:"6·6·6·6 × 87.5 kg · 1 Oct",rest:"3:00"}),
    ex("Pull ups","4x8",{last:"8·8·8·7 · 1 Oct",rest:"2:00"}),
    ex("Overhead press","4x6@55",{bb:1,last:"6·6·6·5 × 55 kg · 1 Oct",rest:"2:30"}),
    ex("Leg press","4x12@200",{last:"12·12·12·12 × 190 kg · 1 Oct",rest:"2:00"}),
    ex("Seated cable row","4x12@65",{last:"12·12·12·10 × 65 kg · 1 Oct",rest:"1:30"}),
    ex("Lateral raise","4x15@10",{hand:1,last:"15·15·15·12 × 10 kg · 1 Oct",rest:"1:00"}),
    ex("EZ bar curl","3x12@30",{last:"12·12·10 × 30 kg · 1 Oct",rest:"1:00"}),
    ex("Cable crunch","3x15@40",{last:"15·15·15 × 40 kg · 1 Oct",rest:"1:00"}),
  ]),
  W("en-long","en-GB","Accessory day with the longest exercise names people actually type into the app 💪",[
    ex("Single-arm half-kneeling landmine press with a pause at the bottom","3x10@25",{last:"10·10·10 × 25 kg · 1 Oct",rest:"1:30",note:"Keep the ribs down and squeeze the glute of the down knee the whole set, slow on the way down"}),
    ex("Chest-supported dumbbell row on a 30° incline bench","3x12@22",{hand:1,last:"12·12·12 × 22 kg · 1 Oct",rest:"1:30"}),
    ex("Cable Y-raise","3x15@5",{last:"15·15·15 × 5 kg · 1 Oct",rest:"1:00"}),
  ]),
  W("en-new","en-GB","Trying new things",[
    ex("Zercher squat","",{}),
    ex("Copenhagen plank","",{mode:"secs"}),
    ex("Nordic hamstring curl","3x5",{last:"5·4·4 · 1 Oct",rest:"2:00"}),
  ]),
];
// Blank plans: three empty rows, as the app prints an exercise with no history.
WORKOUTS.forEach(w=>w.exs.forEach(e=>{if(!e.sets.length)e.sets=[{r:0,w:0},{r:0,w:0},{r:0,w:0}];}));

// The session and print options each workout prints with, the same in the drawer and the tests.
export function printable(w){
  const session={id:"fx-"+w.key,title:w.title,deload:!!w.deload,ex:w.exs.map(e=>({name:e.name,timed:e.mode==="secs",dist:e.mode==="m",sets:[]}))};
  const date=new Date(Date.UTC(2026,9,8,12)).toLocaleDateString(w.lang,{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"});
  return {session,exs:w.exs,opts:{unit:w.unit||"kg",date,gym:w.gym||"",large:!!w.large}};
}

// Handwriting for the notes box, in the same languages, drawn in a handwriting font.
export const NOTES_HAND=[
  ["en","Left hip pinched on set 3 — try a narrower stance"],
  ["af","Linkerknie voel styf, volgende keer 2.5 kg ligter"],
  ["es","Subir 2,5 kg la próxima semana. Dormí mal."],
  ["de","Rücken fühlte sich gut an, nächstes Mal +2,5"],
  ["el","Καλή μέρα, ανέβασε βάρος την επόμενη φορά"],
  ["ru","Плечо побаливало на жиме, проверить технику"],
  ["zh","左膝有点不舒服，下次减轻重量"],
  ["ja","最後のセットはきつかった。来週も同じ重さで"],
  ["ar","الكتف الأيسر متعب قليلا، خفف الوزن"],
  ["hi","आज ऊर्जा कम थी, अगली बार वही वज़न"],
];
