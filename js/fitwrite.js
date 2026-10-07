// A strength workout written as a FIT activity file, the format Garmin Connect, Intervals.icu
// and most training platforms import: a training session (strength) with one "set" message per
// set, carrying its reps, weight, timing and the exercise's category, so the lifts arrive as
// lifts rather than as a blank timed activity. Built byte by byte; nothing leaves the device.

const FIT_EPOCH=631065600;                     // seconds from 1970 to 1989-12-31 00:00 UTC
const fitTime=ms=>Math.max(0,Math.round(ms/1000)-FIT_EPOCH)>>>0;
const CRC=[0x0000,0xCC01,0xD801,0x1400,0xF001,0x3C00,0x2800,0xE401,0xA001,0x6C00,0x7800,0xB401,0x5000,0x9C01,0x8801,0x4400];
export function fitCrc(bytes,from,to){
  let crc=0;
  for(let i=from;i<to;i++){
    const b=bytes[i];
    let t=CRC[crc&0xF];crc=(crc>>4)&0x0FFF;crc=crc^t^CRC[b&0xF];
    t=CRC[crc&0xF];crc=(crc>>4)&0x0FFF;crc=crc^t^CRC[(b>>4)&0xF];
  }
  return crc;
}

// FIT's exercise categories, matched from the exercise's name. Unmatched lifts go as "unknown",
// which Garmin still shows with their sets, reps and weight.
const CATEGORY=[
  [/leg curl|hamstring curl|nordic/,15],[/leg raise|knee raise|toes to bar/,16],[/calf/,1],
  [/bench|chest press|floor press/,0],[/farmer|suitcase|yoke|carry/,3],[/woodchop|chop/,4],
  [/curl/,7],[/deadlift|rdl|rack pull|good morning|jefferson/,8],[/fly|flye|pec deck|crossover/,9],
  [/hip thrust|glute bridge|bridge/,10],[/swing/,12],[/back extension|hyperext|reverse hyper/,13],
  [/lateral raise|front raise|rear delt/,14],[/lunge|split squat|step up|step-up/,17],
  [/clean|snatch|jerk/,18],[/plank|hollow|dead bug/,19],[/jump|burpee|box/,20],
  [/pull up|pull-up|chin up|chin-up|pulldown|pull down/,21],[/push up|push-up|pushup/,22],[/row/,23],
  [/shoulder press|overhead press|military|push press|arnold/,24],[/shrug/,26],[/sit-up|sit up|situp/,27],[/crunch/,6],
  [/squat|leg press|hack/,28],[/tricep|skull|pushdown|kickback|dip/,30],
];
export function fitCategory(name){
  const n=String(name||"").toLowerCase();
  for(const [re,c] of CATEGORY)if(re.test(n))return c;
  return 65534;
}

// Field base types: enum, uint8, uint16, uint32, uint32z.
const T={enum:[0x00,1],u8:[0x02,1],u16:[0x84,2],u32:[0x86,4],u32z:[0x8C,4]};
function writer(){
  const out=[];
  const put=(v,size)=>{for(let i=0;i<size;i++)out.push((v>>>(8*i))&0xFF);};
  // A definition for a local message type: [global number, [[field, type], ...]].
  const defs={};
  return {out,
    define(local,global,fields){
      defs[local]=fields;
      out.push(0x40|local,0,0);put(global,2);out.push(fields.length);
      fields.forEach(([num,type])=>{out.push(num,T[type][1],T[type][0]);});
    },
    data(local,values){
      out.push(local);
      defs[local].forEach(([num,type],i)=>{
        const size=T[type][1],v=values[i];
        const invalid=type==="enum"||type==="u8"?0xFF:type==="u16"?0xFFFF:type==="u32z"?0:0xFFFFFFFF;
        put(v==null||!isFinite(v)?invalid:Math.round(v),size);
      });
    }};
}

const LB=0.45359237;
// session: {created, started, ended, title, ex:[{name, sets:[{r, w, t, rest, at, wu, u}]}]}
// unit: the app's weight unit, for sets that don't carry their own.
export function strengthFit(session,unit){
  const sets=[];
  session.ex.forEach(e=>e.sets.forEach(x=>sets.push({e,x})));
  sets.sort((a,b)=>Date.parse(a.x.at||session.created)-Date.parse(b.x.at||session.created));
  const startMs=Date.parse(session.started||(sets[0]&&sets[0].x.at)||session.created);
  const lastAt=sets.length?Date.parse(sets[sets.length-1].x.at||session.created):startMs;
  const endMs=Math.max(Date.parse(session.ended||0)||0,lastAt,startMs+60000);
  const start=fitTime(startMs),end=fitTime(endMs),elapsed=(end-start)*1000;
  const w=writer();
  // file_id: an activity from a development device.
  w.define(0,0,[[0,"enum"],[1,"u16"],[2,"u16"],[3,"u32z"],[4,"u32"]]);
  w.data(0,[4,255,0,(start%0xFFFFFFFE)+1,start]);
  // timer start
  w.define(1,21,[[253,"u32"],[0,"enum"],[1,"enum"]]);
  w.data(1,[start,0,0]);
  // one set message per set: timestamp, duration (ms), reps, weight (kg ×16), active, start, category, display unit
  w.define(2,225,[[254,"u32"],[0,"u32"],[3,"u16"],[4,"u16"],[5,"u8"],[6,"u32"],[7,"u16"],[9,"u16"],[10,"u16"]]);
  let idx=0;
  sets.forEach(({e,x})=>{
    const at=Date.parse(x.at||session.created),secs=Math.max(1,+x.t||Math.min(60,Math.max(15,(+x.r||1)*3)));
    const u=x.u||unit,kg=(+x.w||0)*(u==="lb"?LB:1);
    const t0=fitTime(at-secs*1000);
    w.data(2,[fitTime(at),secs*1000,e.timed?null:+x.r||0,kg?kg*16:null,1,t0,fitCategory(e.name),u==="lb"?2:1,idx++]);
  });
  // timer stop, lap, session (training › strength training), activity
  w.data(1,[end,0,4]);
  w.define(3,19,[[254,"u32"],[2,"u32"],[7,"u32"],[8,"u32"],[0,"enum"],[1,"enum"]]);
  w.data(3,[end,start,elapsed,elapsed,9,1]);
  w.define(4,18,[[254,"u32"],[2,"u32"],[7,"u32"],[8,"u32"],[5,"enum"],[6,"enum"],[0,"enum"],[1,"enum"],[25,"u16"],[26,"u16"]]);
  w.data(4,[end,start,elapsed,elapsed,10,20,8,1,0,1]);
  w.define(5,34,[[254,"u32"],[0,"u32"],[1,"u16"],[2,"enum"],[3,"enum"],[4,"enum"]]);
  w.data(5,[end,elapsed,1,0,26,1]);
  const data=w.out,file=new Uint8Array(14+data.length+2),dv=new DataView(file.buffer);
  file[0]=14;file[1]=0x20;dv.setUint16(2,2132,true);dv.setUint32(4,data.length,true);file.set([0x2E,0x46,0x49,0x54],8);
  dv.setUint16(12,fitCrc(file,0,12),true);
  file.set(data,14);
  dv.setUint16(14+data.length,fitCrc(file,0,14+data.length),true);
  return file;
}
