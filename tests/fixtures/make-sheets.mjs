// Draws the test sheets: every workout in workouts.js printed with the app's own sheetSVG,
// drawn by Chrome with real fonts (so Chinese, Arabic, Hindi and the rest look as they print),
// kept as grey pixels. Also handwriting for the notes box. Run after changing the sheet layout:
//   npm run fixtures
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {fileURLToPath} from "node:url";
import {launch,serve} from "../browser/chrome.mjs";
import {sheetPages,sheetSVG} from "../../js/sheet.js";
import {WORKOUTS,NOTES_HAND,printable} from "./workouts.js";
import {svgHash} from "./hash.js";

const DIR=path.join(path.dirname(fileURLToPath(import.meta.url)),"sheets");
export const PPM=6;                     // pixels per mm of the A4 layout
fs.mkdirSync(DIR,{recursive:true});
// Sheets in the first layout (printed before pages) are drawn once and kept: see legacy below.
for(const f of fs.readdirSync(DIR))if(f.endsWith(".gray.gz")&&!f.startsWith("legacy-"))fs.unlinkSync(path.join(DIR,f));
const old=fs.existsSync(path.join(DIR,"manifest.json"))?JSON.parse(fs.readFileSync(path.join(DIR,"manifest.json"),"utf8")):{};

const srv=await serve(),page=await launch({w:800,h:600});
await page.nav(srv.url+"/__blank",300);
// Draw an SVG (or handwriting) to grey bytes in the page.
const GREY="const g=new Uint8Array(W*H),d=x.getImageData(0,0,W,H).data;for(let i=0;i<W*H;i++)g[i]=Math.round(d[i*4]*0.3+d[i*4+1]*0.59+d[i*4+2]*0.11);"+
  "let s='';for(let i=0;i<g.length;i+=0x8000)s+=String.fromCharCode.apply(null,g.subarray(i,i+0x8000));return btoa(s);";
async function drawSVG(svg,W,H){
  return Buffer.from(await page.eval("const W="+W+",H="+H+",img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent("+JSON.stringify(svg)+");await img.decode();"+
    "const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.drawImage(img,0,0,W,H);"+GREY),"base64");
}
async function drawHand(text,mm){
  const r=await page.eval("const px="+(mm*PPM)+",t="+JSON.stringify(text)+",f=px+'px \"Bradley Hand\",\"Noteworthy\",\"Segoe Print\",\"Comic Sans MS\",cursive';"+
    "const m=document.createElement('canvas').getContext('2d');m.font=f;const W=Math.ceil(m.measureText(t).width+px),H=Math.ceil(px*1.6);"+
    "const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.font=f;x.fillStyle='#1d2b6b';x.textBaseline='middle';"+
    "x.setTransform(1,0,-0.12,1,px*0.15,0);x.fillText(t,px*0.3,H/2);const out=(()=>{"+GREY+"})();return {W,H,out};");
  return {w:r.W,h:r.H,data:Buffer.from(r.out,"base64")};
}

const manifest={ppm:PPM,sheets:{},hands:{},legacy:old.legacy||null};
const W=210*PPM,H=297*PPM;
let bytes=0;
for(const w of WORKOUTS){
  const p=printable(w),pages=sheetPages(p.session,p.exs,p.opts);
  manifest.sheets[w.key]=[];
  for(const pg of pages){
    const svg=sheetSVG(p.session,pg,p.opts),gray=await drawSVG(svg,W,H),file=w.key+".p"+(pg.page+1)+".gray.gz",gz=zlib.gzipSync(gray,{level:9});
    fs.writeFileSync(path.join(DIR,file),gz);bytes+=gz.length;
    manifest.sheets[w.key].push({file,w:W,h:H,hash:svgHash(svg)});
  }
  console.log(w.key.padEnd(18),pages.length+" page"+(pages.length>1?"s":""));
}
for(const [k,t] of NOTES_HAND.concat([["n105","105"],["n12","12"],["skip","skipped"]])){
  const r=await drawHand(t,k.startsWith("n")||k==="skip"?4.5:4.2),file="hand-"+k+".gray.gz",gz=zlib.gzipSync(r.data,{level:9});
  fs.writeFileSync(path.join(DIR,file),gz);bytes+=gz.length;manifest.hands[k]={file,w:r.w,h:r.h,text:t};
}
fs.writeFileSync(path.join(DIR,"manifest.json"),JSON.stringify(manifest,null,1));
if(page.errors.length)console.log("page errors:",page.errors);
page.close();srv.close();
console.log("wrote",Object.keys(manifest.sheets).length,"workouts,",Math.round(bytes/1024),"KB");
