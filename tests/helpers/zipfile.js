// Zip archives written by hand for tests, as a Blob: stored, deflated or any other method's raw
// bytes, data descriptors, local extra fields, comments, zip64 records and a false entry count.
import zlib from "node:zlib";

const B=s=>Buffer.from(s);
// entries: {name, data, method 0|8, flags, localExtra, zip64}
export function zip(entries,{comment="",zip64=false,count}={}){
  const parts=[],cd=[];let off=0;
  for(const en of entries){
    const {name,data,method=0,flags=0,localExtra=Buffer.alloc(0)}=en;
    const n=B(name),body=method===8?zlib.deflateRawSync(data):method===0?Buffer.from(data):Buffer.from(en.raw||data);
    const crc=zlib.crc32(data),desc=!!(flags&8);
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(flags,6);h.writeUInt16LE(method,8);
    if(!desc){h.writeUInt32LE(crc,14);h.writeUInt32LE(body.length,18);h.writeUInt32LE(data.length,22);}
    h.writeUInt16LE(n.length,26);h.writeUInt16LE(localExtra.length,28);
    const dd=desc?Buffer.alloc(16):Buffer.alloc(0);
    if(desc){dd.writeUInt32LE(0x08074b50,0);dd.writeUInt32LE(crc,4);dd.writeUInt32LE(body.length,8);dd.writeUInt32LE(data.length,12);}
    let x=Buffer.alloc(0);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(flags,8);c.writeUInt16LE(method,10);c.writeUInt32LE(crc,16);
    if(en.zip64){
      x=Buffer.alloc(4+24);x.writeUInt16LE(1,0);x.writeUInt16LE(24,2);
      x.writeBigUInt64LE(BigInt(data.length),4);x.writeBigUInt64LE(BigInt(body.length),12);x.writeBigUInt64LE(BigInt(off),20);
      c.writeUInt32LE(0xFFFFFFFF,20);c.writeUInt32LE(0xFFFFFFFF,24);c.writeUInt32LE(0xFFFFFFFF,42);
    }else{c.writeUInt32LE(body.length,20);c.writeUInt32LE(data.length,24);c.writeUInt32LE(off,42);}
    // An unrelated extra record first, as Info-ZIP writes timestamps, so the reader must walk them.
    const ts=Buffer.from([0x55,0x54,5,0,1,0,0,0,0]);x=Buffer.concat([ts,x]);
    c.writeUInt16LE(n.length,28);c.writeUInt16LE(x.length,30);
    parts.push(h,n,localExtra,body,dd);cd.push(c,n,x);off+=30+n.length+localExtra.length+body.length+dd.length;
  }
  const cdb=Buffer.concat(cd),cm=B(comment),tail=[];
  const n=count??entries.length;
  if(zip64){
    const r=Buffer.alloc(56);r.writeUInt32LE(0x06064b50,0);r.writeBigUInt64LE(44n,4);r.writeUInt16LE(45,12);r.writeUInt16LE(45,14);
    r.writeBigUInt64LE(BigInt(n),24);r.writeBigUInt64LE(BigInt(n),32);r.writeBigUInt64LE(BigInt(cdb.length),40);r.writeBigUInt64LE(BigInt(off),48);
    const l=Buffer.alloc(20);l.writeUInt32LE(0x07064b50,0);l.writeBigUInt64LE(BigInt(off+cdb.length),8);l.writeUInt32LE(1,16);
    tail.push(r,l);
  }
  const e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50,0);
  e.writeUInt16LE(zip64?0xFFFF:n,8);e.writeUInt16LE(zip64?0xFFFF:n,10);
  e.writeUInt32LE(zip64?0xFFFFFFFF:cdb.length,12);e.writeUInt32LE(zip64?0xFFFFFFFF:off,16);e.writeUInt16LE(cm.length,20);
  return new Blob([...parts,cdb,...tail,e,cm]);
}
