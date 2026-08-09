import {uid,workoutEnd} from "./model.js";

const HEADER=["Date","Day","Started","Ended","Exercise","Set","Reps","Side","Weight","Rest","Work","At","Mark","Mode"];
const SIDE_WORDS=["per side","side","each side","yes","y","true","1"];
const SIDE_MARK="per side";
const BOM="\ufeff";
const EOL="\r\n";
const NEEDS_QUOTES=/[",\n\r]/;

function csvField(v){
  const s=String(v==null?"":v);
  return NEEDS_QUOTES.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}

export function buildCSV(sessions){
  const rows=[HEADER];
  const oldestFirst=sessions.slice().sort((a,b)=>(a.created||"").localeCompare(b.created||""));
  oldestFirst.forEach(s=>s.ex.forEach(e=>{
    const day=[s.created,s.title,s.started||"",workoutEnd(s)];
    const mode=e.timed?"sec":"";
    if(e.sets.length)e.sets.forEach((x,i)=>
      rows.push(day.concat([e.name,i+1,x.r,x.side?SIDE_MARK:"",x.w||"",x.rest||"",x.t||"",x.at||"",
        x.wu?"warmup":"",mode])));
    else rows.push(day.concat([e.name,"","","","","","","","",mode]));
  }));
  return rows.map(r=>r.map(csvField).join(",")).join(EOL);
}

export function parseCSV(text){
  const src=text.replace(new RegExp("^"+BOM),"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  const rows=[];
  let row=[],cur="",i=0,inQuotes=false;
  while(i<src.length){
    const c=src[i];
    if(inQuotes){
      if(c=='"'){if(src[i+1]=='"'){cur+='"';i++;}else inQuotes=false;}
      else cur+=c;
    }else{
      if(c=='"')inQuotes=true;
      else if(c==","){row.push(cur);cur="";}
      else if(c=="\n"){row.push(cur);rows.push(row);row=[];cur="";}
      else cur+=c;
    }
    i++;
  }
  if(cur!==""||row.length){row.push(cur);rows.push(row);}
  return rows;
}

function isSide(v){return SIDE_WORDS.indexOf(String(v||"").trim().toLowerCase())>=0;}

export function parseImport(text){
  const rows=parseCSV(text).filter(r=>!(r.length===1&&r[0]===""));
  if(!rows.length)throw new Error("That file looks empty.");
  const head=rows[0].map(x=>x.trim().toLowerCase());
  const col={date:head.indexOf("date"),day:head.indexOf("day"),ex:head.indexOf("exercise"),
    set:head.indexOf("set"),reps:head.indexOf("reps"),side:head.indexOf("side"),
    started:head.indexOf("started"),ended:head.indexOf("ended"),work:head.indexOf("work"),rest:head.indexOf("rest"),weight:head.indexOf("weight"),
    at:head.indexOf("at"),mark:head.indexOf("mark"),mode:head.indexOf("mode")};
  if(col.date<0||col.ex<0||col.reps<0)
    throw new Error("Couldn't find the expected columns. Keep the header row: Date, Day, Exercise, Set, Reps, Side.");

  const groups={},order=[];
  for(let r=1;r<rows.length;r++){
    const row=rows[r];
    if(!row.length)continue;
    const key=(row[col.date]||"").trim();
    if(!key)continue;
    const name=(row[col.ex]||"").trim();
    if(!name)continue;
    if(!groups[key]){
      groups[key]={created:key,title:(col.day>=0?(row[col.day]||""):"")||key,
        started:col.started>=0?(row[col.started]||"").trim():"",
        ended:col.ended>=0?(row[col.ended]||"").trim():"",
        ex:[],byName:{}};
      order.push(key);
    }
    const g=groups[key];
    if(!g.byName[name]){g.byName[name]={name,timed:false,tmp:[]};g.ex.push(g.byName[name]);}
    if(col.mode>=0&&(row[col.mode]||"").trim().toLowerCase()==="sec")g.byName[name].timed=true;
    const repsRaw=(row[col.reps]||"").trim();
    if(repsRaw==="")continue;
    const reps=parseInt(repsRaw,10);
    if(isNaN(reps))continue;
    const setNo=parseInt((row[col.set]||"").trim(),10);
    const num=i=>{const v=i>=0?parseInt((row[i]||"").trim(),10):NaN;return isNaN(v)?0:v;};
    g.byName[name].tmp.push({i:isNaN(setNo)?g.byName[name].tmp.length+1:setNo,
      r:reps,side:col.side>=0&&isSide(row[col.side]),w:col.weight>=0?(parseFloat((row[col.weight]||"").trim())||0):0,t:num(col.work),rest:num(col.rest),
      at:col.at>=0?(row[col.at]||"").trim():"",
      wu:col.mark>=0&&(row[col.mark]||"").trim().toLowerCase()==="warmup"});
  }

  const imported=order.map(k=>{
    const g=groups[k];
    const day={id:uid(),title:g.title,created:g.created,
      started:g.started||"",ended:g.ended||"",running:false};
    return Object.assign(day,{
      ex:g.ex.map(e=>{
        e.tmp.sort((a,b)=>a.i-b.i);
        return {id:uid(),name:e.name,timed:!!e.timed,sets:e.tmp.map(o=>({r:o.r,side:o.side,w:o.w,t:o.t,rest:o.rest,at:o.at,wu:o.wu}))};
      })});
  });
  if(!imported.length)throw new Error("No workout rows found in that file.");
  return imported;
}

function download(text,fname,mime){
  const url=URL.createObjectURL(new Blob([text],{type:mime}));
  const a=document.createElement("a");
  a.href=url;a.download=fname;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);
}

// The share sheet where it exists — straight to AirDrop, Drive, mail — a download otherwise.
function deliver(text,fname,mime){
  try{
    const file=new File([text],fname,{type:mime});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:fname}).catch(()=>download(text,fname,mime));
      return;
    }
  }catch(e){}
  download(text,fname,mime);
}

export function exportCSV(sessions){
  deliver(BOM+buildCSV(sessions),
    "kingskiln_"+new Date().toISOString().slice(0,10)+".csv","text/csv;charset=utf-8");
}

// A complete backup: every day, the exercise list, settings and body log — unlike the
// CSV, this round-trips the lot with nothing left behind.
export function exportJSON(data){
  const json=JSON.stringify(Object.assign({app:"kingskiln",exported:new Date().toISOString()},data));
  deliver(json,"kingskiln_backup_"+new Date().toISOString().slice(0,10)+".json","application/json");
}
