// FIT files written by hand for tests: either byte order, developer fields and compressed
// timestamps, so the reader can be checked against files no watch in the drawer would make.
import {fitCrc} from "../../js/fitwrite.js";

export const semi=d=>Math.round(d/180*2147483648);
// A FIT file writer for tests. def() describes a local message, msg() writes one.
export function fit({hlen=14,big=false}={}){
  const out=[],defs={};
  const put=(v,size,type)=>{
    const b=new Uint8Array(size),dv=new DataView(b.buffer);
    if(type===0x88)dv.setFloat32(0,v,!big);else if(type===0x89)dv.setFloat64(0,v,!big);
    else for(let i=0;i<size;i++)b[big?size-1-i:i]=Number((BigInt.asUintN(size*8,BigInt(Math.round(v)))>>BigInt(8*i))&255n);
    out.push(...b);
  };
  return {
    def(local,global,fields,dev){
      defs[local]={fields,dev:dev||[]};
      out.push((dev?0x60:0x40)|local,0,big?1:0);
      if(big)out.push(global>>8,global&255);else out.push(global&255,global>>8);
      out.push(fields.length);fields.forEach(([n,s,t])=>out.push(n,s,t));
      if(dev){out.push(dev.length);dev.forEach(([n,s,i])=>out.push(n,s,i));}
      return this;
    },
    msg(local,values,compressed){
      out.push(compressed!=null?0x80|(local<<5)|(compressed&0x1F):local);
      defs[local].fields.forEach(([,s,t],i)=>put(values[i],s,t));
      defs[local].dev.forEach(([,s])=>{for(let i=0;i<s;i++)out.push(0xAB);});
      return this;
    },
    bytes(){
      const data=Uint8Array.from(out),f=new Uint8Array(hlen+data.length+2),dv=new DataView(f.buffer);
      f[0]=hlen;f[1]=0x20;dv.setUint16(2,2132,true);dv.setUint32(4,data.length,true);f.set([0x2E,0x46,0x49,0x54],8);
      if(hlen===14)dv.setUint16(12,fitCrc(f,0,12),true);
      f.set(data,hlen);dv.setUint16(hlen+data.length,fitCrc(f,0,hlen+data.length),true);
      return f;
    }};
}
