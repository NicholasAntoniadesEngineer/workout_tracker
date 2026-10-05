// FIT files, the binary format Garmin, Wahoo, Coros and Suunto watches record in, read into the
// same shape as a GPX or TCX import: {track, hr, sport, name, start, secs, distM}. Garmin
// Connect's "Export original" is a .zip holding the .fit; unzipWorkout opens that first.
// Only what a summary needs is read: positions, altitude, heart rate, distance and the sport.

const FIT_EPOCH=631065600000;                 // 1989-12-31 00:00 UTC, where FIT time starts
const SEMI=180/2147483648;                    // semicircles to degrees
const SIZE={0:1,1:1,2:1,3:2,4:2,5:4,6:4,7:1,8:4,9:8,10:1,11:2,12:4,13:1,14:8,15:8,16:8};
const INVALID={0:0xFF,1:0x7F,2:0xFF,3:0x7FFF,4:0xFFFF,5:0x7FFFFFFF,6:0xFFFFFFFF,10:0,11:0,12:0};
const SPORT={1:"running",2:"cycling",5:"swimming",11:"walking",15:"rowing",17:"hiking"};

export function isFit(bytes){
  return bytes.length>12&&bytes[8]===0x2E&&bytes[9]===0x46&&bytes[10]===0x49&&bytes[11]===0x54;
}

function readValue(dv,at,type,size,little){
  const t=type&0x1F;
  if(SIZE[t]!==size)return null;              // arrays and strings: not needed here
  let v;
  switch(t){
    case 0:case 2:case 10:case 13:v=dv.getUint8(at);break;
    case 1:v=dv.getInt8(at);break;
    case 3:v=dv.getInt16(at,little);break;
    case 4:case 11:v=dv.getUint16(at,little);break;
    case 5:v=dv.getInt32(at,little);break;
    case 6:case 12:v=dv.getUint32(at,little);break;
    case 8:v=dv.getFloat32(at,little);return isFinite(v)?v:null;
    case 9:v=dv.getFloat64(at,little);return isFinite(v)?v:null;
    default:return null;
  }
  return INVALID[t]!==undefined&&v===INVALID[t]?null:v;
}

export function parseFit(buf){
  const bytes=buf instanceof Uint8Array?buf:new Uint8Array(buf);
  if(!isFit(bytes))throw new Error("not a FIT file");
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const hlen=bytes[0],end=Math.min(bytes.length,hlen+dv.getUint32(4,true));
  const defs={},track=[],hr=[];
  let at=hlen,lastTs=0,sport="",elapsed=0,distM=0,lastDist=0,fileType=null,climb=0;
  while(at<end){
    const rh=bytes[at++];
    let local,ts=null;
    if(rh&0x80){                               // compressed timestamp: a data message
      local=(rh>>5)&0x3;
      const off=rh&0x1F;
      ts=(lastTs&~0x1F)+off;if(off<(lastTs&0x1F))ts+=0x20;
    }else if(rh&0x40){                         // a definition: how this local type's data is laid out
      local=rh&0x0F;
      const little=bytes[at+1]===0,num=little?dv.getUint16(at+2,true):dv.getUint16(at+2,false);
      const n=bytes[at+4];at+=5;
      const fields=[];
      for(let i=0;i<n;i++){fields.push({num:bytes[at],size:bytes[at+1],type:bytes[at+2]});at+=3;}
      let devSize=0;
      if(rh&0x20){const nd=bytes[at++];for(let i=0;i<nd;i++){devSize+=bytes[at+1];at+=3;}}
      defs[local]={num,little,fields,devSize};
      continue;
    }else local=rh&0x0F;
    const d=defs[local];
    if(!d)throw new Error("FIT data before its definition");
    const v={};
    d.fields.forEach(f=>{v[f.num]=readValue(dv,at,f.type,f.size,d.little);at+=f.size;});
    at+=d.devSize;
    if(v[253]!=null){ts=v[253];}
    if(ts!=null)lastTs=ts;
    if(d.num===20&&ts!=null){                  // record: one sample along the way
      const t=FIT_EPOCH+ts*1000;
      if(v[0]!=null&&v[1]!=null){
        const alt=v[78]!=null?v[78]/5-500:v[2]!=null?v[2]/5-500:null;
        track.push({t,lat:v[0]*SEMI,lon:v[1]*SEMI,alt});
      }
      if(v[3]!=null&&v[3]>0)hr.push({t,bpm:v[3]});
      if(v[5]!=null)lastDist=v[5]/100;
    }else if(d.num===18){                      // session: the totals
      if(v[5]!=null&&!sport)sport=SPORT[v[5]]||"";
      if(v[7]!=null)elapsed+=v[7]/1000;
      if(v[9]!=null)distM+=v[9]/100;
      if(v[22]!=null)climb+=v[22];
    }else if(d.num===0&&v[0]!=null){           // file id: 4 is an activity, others are settings or wellness
      fileType=v[0];
    }else if(d.num===12&&v[0]!=null&&!sport){  // sport message
      sport=SPORT[v[0]]||"";
    }
  }
  const first=track.length?track[0].t:hr.length?hr[0].t:null;
  const last=track.length?track[track.length-1].t:hr.length?hr[hr.length-1].t:null;
  return {track,hr,sport,name:"",start:first,
    secs:Math.round(elapsed||(first&&last?(last-first)/1000:0)),distM:Math.round(distM||lastDist),climbM:Math.round(climb),fileType};
}

// The first workout file in a .zip (Garmin Connect's "Export original"), as {name, bytes}.
export async function unzipWorkout(buf){
  const b=new Uint8Array(buf),dv=new DataView(b.buffer,b.byteOffset,b.byteLength);
  let eocd=-1;
  for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0)throw new Error("not a zip file");
  let p=dv.getUint32(eocd+16,true);
  const count=dv.getUint16(eocd+10,true);
  for(let k=0;k<count;k++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true);
    const nlen=dv.getUint16(p+28,true),xlen=dv.getUint16(p+30,true),clen=dv.getUint16(p+32,true);
    const off=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(b.subarray(p+46,p+46+nlen));
    p+=46+nlen+xlen+clen;
    if(!/\.(fit|gpx|tcx)$/i.test(name))continue;
    const start=off+30+dv.getUint16(off+26,true)+dv.getUint16(off+28,true);
    const raw=b.subarray(start,start+csize);
    if(method===0)return {name,bytes:raw.slice()};
    if(method!==8||typeof DecompressionStream==="undefined")throw new Error("can't unpack this zip");
    const out=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
    return {name,bytes:new Uint8Array(out)};
  }
  throw new Error("no workout file in the zip");
}
