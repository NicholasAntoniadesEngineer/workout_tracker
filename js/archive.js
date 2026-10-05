// Reading the archives other apps hand over — Strava's, Garmin's and Apple Health's zips, and
// the .gz files inside Strava's — straight from the file on disk. Only the directory at the end
// of the zip is read up front; each entry is then sliced out and inflated on its own, as a
// stream, so a multi-gigabyte Apple Health export never has to fit in memory at once.

const u16=(b,i)=>b[i]|b[i+1]<<8;
const u32=(b,i)=>(b[i]|b[i+1]<<8|b[i+2]<<16|b[i+3]<<24)>>>0;
const u64=(b,i)=>u32(b,i)+u32(b,i+4)*4294967296;
const bytesOf=async blob=>new Uint8Array(await blob.arrayBuffer());

export const isZip=b=>b.length>3&&b[0]===0x50&&b[1]===0x4b&&b[2]===3&&b[3]===4;
export const isGzip=b=>b.length>2&&b[0]===0x1f&&b[1]===0x8b;

async function drain(stream){return new Uint8Array(await new Response(stream).arrayBuffer());}
export async function gunzip(bytes){
  if(typeof DecompressionStream==="undefined")throw new Error("This browser can't unpack .gz files.");
  return drain(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")));
}

// The zip's table of contents: every entry's name, method, sizes and where its header sits.
export async function openZip(blob){
  const size=blob.size,tailLen=Math.min(size,65557+20);
  const tail=await bytesOf(blob.slice(size-tailLen,size));
  let e=-1;
  for(let i=tail.length-22;i>=0;i--){if(u32(tail,i)===0x06054b50){e=i;break;}}
  if(e<0)throw new Error("not a zip file");
  let count=u16(tail,e+10),cdSize=u32(tail,e+12),cdOff=u32(tail,e+16);
  // Zip64, for archives past 4 GB or 65,535 entries: the real numbers sit in an extra record.
  if(e>=20&&u32(tail,e-20)===0x07064b50){
    const at=u64(tail,e-20+8),rec=await bytesOf(blob.slice(at,at+56));
    if(u32(rec,0)===0x06064b50){count=u64(rec,32);cdSize=u64(rec,40);cdOff=u64(rec,48);}
  }
  const cd=await bytesOf(blob.slice(cdOff,cdOff+cdSize));
  const entries=[];
  let p=0;
  for(let k=0;k<count&&p+46<=cd.length;k++){
    if(u32(cd,p)!==0x02014b50)break;
    const method=u16(cd,p+10),nlen=u16(cd,p+28),xlen=u16(cd,p+30),clen=u16(cd,p+32);
    let csize=u32(cd,p+20),usize=u32(cd,p+24),off=u32(cd,p+42);
    const name=new TextDecoder().decode(cd.subarray(p+46,p+46+nlen));
    // Zip64 sizes and offset, in that order, for whichever fields overflowed.
    let x=p+46+nlen;const xend=x+xlen;
    while(x+4<=xend){
      const id=u16(cd,x),len=u16(cd,x+2);
      if(id===1){let q=x+4;
        if(usize===0xFFFFFFFF){usize=u64(cd,q);q+=8;}
        if(csize===0xFFFFFFFF){csize=u64(cd,q);q+=8;}
        if(off===0xFFFFFFFF){off=u64(cd,q);}
      }
      x+=4+len;
    }
    p=xend+clen;
    if(!name.endsWith("/"))entries.push({name,method,csize,size:usize,off});
  }
  async function dataStart(en){
    const h=await bytesOf(blob.slice(en.off,en.off+30));
    if(u32(h,0)!==0x04034b50)throw new Error("damaged zip entry");
    return en.off+30+u16(h,26)+u16(h,28);
  }
  // An entry's bytes as a stream, inflated if need be.
  async function stream(en){
    const start=await dataStart(en),raw=blob.slice(start,start+en.csize).stream();
    if(en.method===0)return raw;
    if(en.method!==8)throw new Error("unsupported zip compression");
    if(typeof DecompressionStream==="undefined")throw new Error("This browser can't unpack zip files.");
    return raw.pipeThrough(new DecompressionStream("deflate-raw"));
  }
  return {entries,stream,
    bytes:async en=>drain(await stream(en)),
    // A nested zip (Garmin keeps its FIT files in zips inside the zip) as a Blob to open in turn.
    blob:async en=>new Response(await stream(en)).blob()};
}

// Every entry of a zip, and of any zips inside it, as {name, read()} where read() resolves to
// the entry's bytes with any .gz layer already removed.
export async function walkZip(blob,visit,depth){
  const z=await openZip(blob);
  for(const en of z.entries){
    if(/\.zip$/i.test(en.name)&&(depth||0)<2){await walkZip(await z.blob(en),visit,(depth||0)+1);continue;}
    const stop=await visit({name:en.name,size:en.size,stream:()=>z.stream(en),
      read:async()=>{const b=await z.bytes(en);return isGzip(b)?gunzip(b):b;}});
    if(stop===false)return false;
  }
}
