// Grey pixels to and from files, for the test sheets and for looking at a failing photo:
// gzip'd raw bytes for the fixtures, PNG to open on a screen.
import fs from "node:fs";
import zlib from "node:zlib";

export function readGray(file,w,h){
  const b=zlib.gunzipSync(fs.readFileSync(file));
  if(b.length!==w*h)throw new Error(file+": expected "+w+"×"+h);
  const a=new Float32Array(w*h);for(let i=0;i<a.length;i++)a[i]=b[i]/255;return a;
}
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc=b=>{let c=0xffffffff;for(const x of b)c=CRC[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
// gray: 0–1 floats (or 0–255 bytes), w × h.
export function writePNG(file,gray,w,h){
  const raw=Buffer.alloc((w+1)*h),bytes=gray instanceof Uint8Array;
  for(let y=0;y<h;y++){raw[y*(w+1)]=0;for(let x=0;x<w;x++){const v=gray[y*w+x];raw[y*(w+1)+1+x]=bytes?v:Math.max(0,Math.min(255,Math.round(v*255)));}}
  const chunk=(t,b)=>{const len=Buffer.alloc(4);len.writeUInt32BE(b.length);const tb=Buffer.concat([Buffer.from(t),b]),c=Buffer.alloc(4);c.writeUInt32BE(crc(tb));return Buffer.concat([len,tb,c]);};
  const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=0;
  fs.writeFileSync(file,Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk("IHDR",ih),chunk("IDAT",zlib.deflateSync(raw,{level:6})),chunk("IEND",Buffer.alloc(0))]));
}
