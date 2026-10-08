// A camera for testing the sheet reader without a printer or a phone. The paper is the app's
// real printed page (drawn by Chrome from sheetSVG, see tests/fixtures/make-sheets.mjs), printed
// on A4, A5, Letter or with a printer's margins. A person marks it the way people do (pencil
// fills, pen ticks, crosses, dots, smudges, numbers written beside a row, a set struck out,
// handwritten notes), then it's laid on a table and photographed: any angle, rotation, distance
// and perspective, curled or folded, with uneven light, shadows, glare, lens distortion,
// motion blur, noise, JPEG blocks and clutter. Seeded, so every case is the same every run.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {COL,NOTES,markSpots,sheetPages,idCode} from "../../js/sheet.js";
import {readGray} from "./png.js";
import {WORKOUTS,printable} from "../fixtures/workouts.js";

const FX=path.join(path.dirname(fileURLToPath(import.meta.url)),"../fixtures/sheets");
export const MANIFEST=JSON.parse(fs.readFileSync(path.join(FX,"manifest.json"),"utf8"));
export function rng(seed){let s=(seed>>>0)||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
const gauss=r=>{const u=Math.max(1e-9,r()),v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};

// Paper sizes in mm, and how the A4 layout lands on them when printed "fit to page".
export const PAPER={
  A4:{w:210,h:297,s:1,ox:0,oy:0},
  A5:{w:148,h:210,s:148/210,ox:0,oy:0},
  Letter:{w:215.9,h:279.4,s:279.4/297,ox:(215.9-210*279.4/297)/2,oy:0},
  // A printer adding its own margins, shrinking the page to 94%.
  A4margins:{w:210,h:297,s:0.94,ox:210*0.03,oy:297*0.03},
};

// ── The printed page ───────────────────────────────────────────────────────────────────
const cache={};
// A workout's page as printed: its pixels, its rows and everything it printed with.
export function loadSheet(key,page){
  const w=WORKOUTS.find(x=>x.key===key);if(!w)throw new Error("no workout "+key);
  const p=printable(w),pages=sheetPages(p.session,p.exs,p.opts),pg=pages[page||0],f=MANIFEST.sheets[key][page||0];
  const id=key+"#"+(page||0);
  if(!cache[id])cache[id]=readGray(path.join(FX,f.file),f.w,f.h);
  return {key,workout:w,session:p.session,opts:p.opts,pages,page:pg,rows:pg.rows,code:pg.code,img:{a:cache[id],w:f.w,h:f.h,ppm:MANIFEST.ppm}};
}
// The sheet as printed by the first layout (before pages), for reading old sheets.
export function loadLegacy(){
  const L=MANIFEST.legacy;if(!cache.legacy)cache.legacy=readGray(path.join(FX,L.file),L.w,L.h);
  return {key:"legacy",session:L.session,rows:L.rows,code:idCode(L.session.id),page:{notes:NOTES,page:0,pages:1},img:{a:cache.legacy,w:L.w,h:L.h,ppm:MANIFEST.ppm}};
}
function hand(k){
  const h=MANIFEST.hands[k];if(!h)throw new Error("no handwriting "+k);
  if(!cache["hand-"+k])cache["hand-"+k]={a:readGray(path.join(FX,h.file),h.w,h.h),w:h.w,h:h.h};
  return cache["hand-"+k];
}
function canvas(w,h,v){const a=new Float32Array(w*h);a.fill(v);return {w,h,a};}
function ink(c,x,y,v,alpha){if(x<0||y<0||x>=c.w||y>=c.h||alpha<=0)return;const i=y*c.w+x,t=c.a[i]*(1-alpha)+v*alpha;if(t<c.a[i])c.a[i]=t;}
const bil=(img,u,v)=>{if(u<0||v<0||u>=img.w-1||v>=img.h-1)return 1;const x0=u|0,y0=v|0,fx=u-x0,fy=v-y0,i=y0*img.w+x0,a=img.a;
  return a[i]*(1-fx)*(1-fy)+a[i+1]*fx*(1-fy)+a[i+img.w]*(1-fx)*fy+a[i+img.w+1]*fx*fy;};

// The page on paper: the layout scaled onto the paper size, at `ppm` pixels per paper mm.
// opt: {ppm, paperV (paper brightness), inkV (printed black), toner (1 full, 0.6 running low)}
export function printSheet(sheet,paper,opt){
  const o=Object.assign({ppm:5,paperV:0.96,inkV:0.07,toner:1},opt||{});
  const c=canvas(Math.round(paper.w*o.ppm),Math.round(paper.h*o.ppm),o.paperV),img=sheet.img;
  for(let y=0;y<c.h;y++)for(let x=0;x<c.w;x++){
    const mx=((x+0.5)/o.ppm-paper.ox)/paper.s,my=((y+0.5)/o.ppm-paper.oy)/paper.s;
    if(mx<0||my<0||mx>210||my>297)continue;
    const v=bil(img,mx*img.ppm-0.5,my*img.ppm-0.5),dark=(1-v)*o.toner;
    c.a[y*c.w+x]=o.paperV-(o.paperV-o.inkV)*dark;
  }
  const P=(x,y)=>[(paper.ox+paper.s*x)*o.ppm,(paper.oy+paper.s*y)*o.ppm];
  return Object.assign({},sheet,{c,g:painter(c,P,o.ppm*paper.s),paper,ppm:o.ppm,P});
}

// ── Pen and pencil ─────────────────────────────────────────────────────────────────────
// Shapes in layout millimetres: `P` maps a layout point to paper pixels.
function painter(c,P,ppm){
  const px=mm=>mm*ppm;
  return {
    line(ax,ay,bx,by,lw,v){const [x0,y0]=P(ax,ay),[x1,y1]=P(bx,by),r=Math.max(0.5,px(lw)/2),L=Math.hypot(x1-x0,y1-y0)||1;
      const minx=Math.floor(Math.min(x0,x1)-r-1),maxx=Math.ceil(Math.max(x0,x1)+r+1),miny=Math.floor(Math.min(y0,y1)-r-1),maxy=Math.ceil(Math.max(y0,y1)+r+1);
      for(let yy=miny;yy<=maxy;yy++)for(let xx=minx;xx<=maxx;xx++){const t=Math.max(0,Math.min(1,((xx+0.5-x0)*(x1-x0)+(yy+0.5-y0)*(y1-y0))/(L*L)));
        const d=Math.hypot(xx+0.5-(x0+t*(x1-x0)),yy+0.5-(y0+t*(y1-y0)));ink(c,xx,yy,v,Math.max(0,Math.min(1,r+0.5-d)));}},
    ring(cx,cy,rr,lw,v){const n=36;for(let i=0;i<n;i++){const a0=i/n*2*Math.PI,a1=(i+1)/n*2*Math.PI;this.line(cx+rr*Math.cos(a0),cy+rr*Math.sin(a0),cx+rr*Math.cos(a1),cy+rr*Math.sin(a1),lw,v);}},
    // A filled disc; `rough` gives it a pencil's grain, `cover` leaves some paper showing.
    disc(cx,cy,rr,v,opt){const o=opt||{},R=o.rand||Math.random,[x0,y0]=P(cx,cy),r=px(rr);
      for(let yy=Math.floor(y0-r-1);yy<=Math.ceil(y0+r+1);yy++)for(let xx=Math.floor(x0-r-1);xx<=Math.ceil(x0+r+1);xx++){
        const d=Math.hypot(xx+0.5-x0,yy+0.5-y0);const a=Math.max(0,Math.min(1,r+0.5-d));if(!a)continue;
        if(o.cover!=null&&R()>o.cover)continue;
        ink(c,xx,yy,Math.min(1,Math.max(0,v+(o.rough?(R()-0.5)*o.rough:0))),a);}},
    // Handwriting from the fixtures, `hmm` tall, its left edge at (x, y-middle), turned `rot` radians.
    stamp(k,x,y,hmm,v,rot){const s=hand(k),scale=hmm/s.h,wmm=s.w*scale,cs=Math.cos(rot||0),sn=Math.sin(rot||0);
      const pts=[[0,-hmm/2],[wmm,-hmm/2],[0,hmm/2],[wmm,hmm/2]].map(([a,b])=>P(x+a*cs-b*sn,y+a*sn+b*cs));
      const minx=Math.floor(Math.min(...pts.map(p=>p[0]))),maxx=Math.ceil(Math.max(...pts.map(p=>p[0]))),miny=Math.floor(Math.min(...pts.map(p=>p[1]))),maxy=Math.ceil(Math.max(...pts.map(p=>p[1])));
      const [ox,oy]=P(x,y),k2=ppm*scale;
      for(let yy=miny;yy<=maxy;yy++)for(let xx=minx;xx<=maxx;xx++){const dx=(xx+0.5-ox)/k2,dy=(yy+0.5-oy)/k2;
        const u=dx*cs+dy*sn,w=-dx*sn+dy*cs+s.h/2;ink(c,xx,yy,v,1-bil(s,u,w));}
      return wmm;},
  };
}
const spotOf=(m,group,i)=>{const g=m.groups.find(x=>x.k===group);if(!g)throw new Error("row "+m.row+" has no "+group+" circles");const p=g.pts[i];if(!p)throw new Error("row "+m.row+": no "+group+" circle "+i);return [p.x,p.y];};

// A person's marks. `marks` is a list of {row, kind, ...}:
//   tick     the done box   {style:"check"|"cross"|"slash"|"dot"|"scribble", lw, v, big}
//   fill     a circle       {group:"repsSign"|"repsAmt"|"kgSign"|"kgAmt" (or the first layout's
//                            "tens"|"ones"|"adj"), i, v, cover, rough, spill, jitter}
//   cross    an X over a circle (how people mark minus or plus) {group, i, lw, v, jitter}
//   check    a tick over a circle {group, i}
//   smudge   an erased fill {group, i, v}
//   ring     a circle drawn round a number, not filled {group, i}
//   digit    a number written inside a circle instead of filling it {group, i}
//   strike   a line through the whole row (skipped it)
//   note     handwriting in the row's note cell {hand}
//   write    handwriting at a layout point {hand, x, y, size}
//   notes    handwriting in the notes box {hand}
export function markSheet(sheet,marks,seed){
  const R=rng(seed||7),g=sheet.g,byRow={};markSpots(sheet.rows).forEach(s=>{byRow[s.row]=s;});
  marks.forEach(m=>{
    const v=m.v==null?undefined:m.v,jx=(m.jitter||0)*(R()-0.5)*2,jy=(m.jitter||0)*(R()-0.5)*2;
    if(m.kind==="notes"){const nb=sheet.page.notes;g.stamp(m.hand||"en",nb.x+4,nb.y+8,Math.min(6,nb.h*0.4),v==null?0.25:v,m.rot||-0.02);return;}
    if(m.kind==="write"){g.stamp(m.hand,m.x,m.y,m.size||4,v==null?0.25:v,m.rot||0);return;}
    const s=byRow[m.row];if(!s)throw new Error("no marks for row "+m.row);
    if(m.kind==="note"){if(!s.note)throw new Error("row "+m.row+" has no note cell");g.stamp(m.hand||"n12",s.note.x+0.5,s.note.y+s.note.h/2,(m.size||1.25)*s.note.h,v==null?0.25:v,m.rot||-0.03);return;}
    const y0=s.y;
    if(m.kind==="strike"){g.line(15,y0+(R()-0.5),196,y0+(R()-0.5)*1.5,m.lw||0.7,v==null?0.2:v);return;}
    // People tick in proportion to the box: a large-print box gets a larger tick.
    if(m.kind==="tick"){if(!s.done)throw new Error("row "+m.row+" has no done box");const [x0,y1]=s.done,x=x0+jx,y=y1+jy,lw=m.lw||0.8,iv=v==null?0.15:v,k=(m.big||1)*(s.box||5.6)/5.6;
      if(m.style==="cross"){g.line(x-1.8*k,y-1.8*k,x+1.8*k,y+1.8*k,lw,iv);g.line(x-1.8*k,y+1.8*k,x+1.8*k,y-1.8*k,lw,iv);}
      else if(m.style==="slash")g.line(x-1.6*k,y+1.8*k,x+1.6*k,y-1.8*k,lw,iv);
      else if(m.style==="dot")g.disc(x,y,1.2,iv,{rand:R});
      else if(m.style==="scribble"){for(let i=0;i<5;i++)g.line(x-1.8+R()*0.6,y-1.6+i*0.8,x+1.8-R()*0.6,y-1.2+i*0.8,lw*0.7,iv);}
      else{g.line(x-1.8*k,y,x-0.4*k,y+1.6*k,lw,iv);g.line(x-0.4*k,y+1.6*k,x+2.2*k,y-1.9*k,lw,iv);}
      return;}
    const [x,y]=spotOf(s,m.group,m.i);
    if(m.kind==="fill")g.disc(x+jx,y+jy,COL.r*(m.spill||0.9),v==null?0.3:v,{rand:R,cover:m.cover==null?0.95:m.cover,rough:m.rough==null?0.25:m.rough});
    else if(m.kind==="smudge")g.disc(x+jx,y+jy,COL.r*0.8,v==null?0.8:v,{rand:R,cover:0.7,rough:0.2});
    else if(m.kind==="ring")g.ring(x,y,COL.r+0.8,0.5,0.2);
    else if(m.kind==="digit"){g.line(x-0.5,y-1.3,x+0.4,y-1.6,0.45,0.2);g.line(x+0.4,y-1.6,x+0.1,y+1.5,0.45,0.2);}
    else if(m.kind==="cross"){const a=m.size||1.7,lw=m.lw||0.6,iv=v==null?0.18:v;g.line(x+jx-a,y+jy-a,x+jx+a,y+jy+a,lw,iv);g.line(x+jx-a,y+jy+a,x+jx+a,y+jy-a,lw,iv);}
    else if(m.kind==="check"){const lw=m.lw||0.6,iv=v==null?0.18:v;g.line(x+jx-1.5,y+jy,x+jx-0.3,y+jy+1.4,lw,iv);g.line(x+jx-0.3,y+jy+1.4,x+jx+1.9,y+jy-1.7,lw,iv);}
  });
  return sheet;
}

// ── Taking the photo ────────────────────────────────────────────────────────────────────
// Where the paper's corners land in a W × H photo: `fill` of the frame, rotated `rot` degrees,
// moved off centre by `dx`, `dy` (fractions of the frame), and tilted: `pitch` narrows the top
// edge (camera leaning back), `yaw` narrows one side.
export function placePaper(paper,o){
  const W=o.W,H=o.H,asp=paper.w/paper.h,f=o.fill||0.8;
  let pw,ph;if(W/H>asp){ph=H*f;pw=ph*asp;}else{pw=W*f;ph=pw/asp;}
  const cx=W/2+(o.dx||0)*W,cy=H/2+(o.dy||0)*H,p=o.pitch||0,q=o.yaw||0,a=(o.rot||0)*Math.PI/180;
  const base=[[-pw/2*(1-p)*(1-q),-ph/2*(1-q*0.5)],[pw/2*(1-p)*(1+q),-ph/2*(1+q*0.5)],[-pw/2*(1+p)*(1-q),ph/2*(1-q*0.5)],[pw/2*(1+p)*(1+q),ph/2*(1+q*0.5)]];
  return base.map(([x,y])=>[cx+x*Math.cos(a)-y*Math.sin(a),cy+x*Math.sin(a)+y*Math.cos(a)]);
}
function homog(src,dst){
  const A=[],B=[];for(let i=0;i<4;i++){const [x,y]=src[i],[u,v]=dst[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);B.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);B.push(v);}
  for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;[A[c],A[p]]=[A[p],A[c]];[B[c],B[p]]=[B[p],B[c]];
    for(let r=0;r<8;r++){if(r===c)continue;const f=A[r][c]/A[c][c];for(let k=c;k<8;k++)A[r][k]-=f*A[c][k];B[r]-=f*B[c];}}
  const m=B.map((b,i)=>b/A[i][i]);return (x,y)=>{const d=m[6]*x+m[7]*y+1;return [(m[0]*x+m[1]*y+m[2])/d,(m[3]*x+m[4]*y+m[5])/d];};
}
// 8 × 8 JPEG blocks at a quality, on the brightness.
const QT=[16,11,10,16,24,40,51,61,12,12,14,19,26,58,60,55,14,13,16,24,40,57,69,56,14,17,22,29,51,87,80,62,18,22,37,56,68,109,103,77,24,35,55,64,81,104,113,92,49,64,78,87,103,121,120,101,72,92,95,98,112,100,103,99];
const DCT=(()=>{const m=[];for(let k=0;k<8;k++)for(let n=0;n<8;n++)m.push((k?Math.sqrt(2/8):Math.sqrt(1/8))*Math.cos(Math.PI*(2*n+1)*k/16));return m;})();
function jpeg(img,W,H,q){
  const sc=q<50?5000/q:200-2*q,qt=QT.map(v=>Math.max(1,Math.floor((v*sc+50)/100))),b=new Float64Array(64),t=new Float64Array(64);
  for(let by=0;by+8<=H;by+=8)for(let bx=0;bx+8<=W;bx+=8){
    for(let y=0;y<8;y++)for(let x=0;x<8;x++)b[y*8+x]=img[(by+y)*W+bx+x]*255-128;
    for(let y=0;y<8;y++)for(let k=0;k<8;k++){let s=0;for(let n=0;n<8;n++)s+=DCT[k*8+n]*b[y*8+n];t[y*8+k]=s;}
    for(let k=0;k<8;k++)for(let x=0;x<8;x++){let s=0;for(let n=0;n<8;n++)s+=DCT[k*8+n]*t[n*8+x];b[k*8+x]=Math.round(s/qt[k*8+x])*qt[k*8+x];}
    for(let n=0;n<8;n++)for(let x=0;x<8;x++){let s=0;for(let k=0;k<8;k++)s+=DCT[k*8+n]*b[k*8+x];t[n*8+x]=s;}
    for(let y=0;y<8;y++)for(let n=0;n<8;n++){let s=0;for(let k=0;k<8;k++)s+=DCT[k*8+n]*t[y*8+k];img[(by+y)*W+bx+n]=(s+128)/255;}
  }
}
// o: {W, H, seed, fill, rot, pitch, yaw, dx, dy, corners, bg, bgTexture, clutter:[{x,y,w,h,v}],
//   light:{base, grad:[gx,gy], vignette, shadow:{x0,y0,x1,y1,depth,soft}, glare:{x,y,r,amount}},
//   curl (mm the middle of the page lifts out of line), folds (creases across, as fractions),
//   barrel (lens distortion), motion:{len, angle} (px), blur, noise, gamma, levels, jpeg (quality)}
export function photograph(sheet,o){
  const W=o.W,H=o.H,R=rng(o.seed||11),c=sheet.c,ppm=sheet.ppm;
  const corners=o.corners||placePaper(sheet.paper,o);
  const toPaper=homog(corners,[[0,0],[c.w,0],[0,c.h],[c.w,c.h]]);
  const out=new Float32Array(W*H),bg=o.bg==null?0.35:o.bg,folds=o.folds||[],curl=(o.curl||0)*ppm;
  const cx0=W/2,cy0=H/2,rr=Math.hypot(W,H)/2;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    let px=x+0.5,py=y+0.5;
    if(o.barrel){const dx=(px-cx0)/rr,dy=(py-cy0)/rr,k=1+o.barrel*(dx*dx+dy*dy);px=cx0+dx*k*rr;py=cy0+dy*k*rr;}
    let [u,v]=toPaper(px,py);
    // A curled page: the middle bows away from the line between the corners.
    if(curl){const fu=u/c.w,fv=v/c.h;v-=curl*Math.sin(Math.PI*Math.min(1,Math.max(0,fu)))*0.6;u-=curl*Math.sin(Math.PI*Math.min(1,Math.max(0,fv)))*0.4;}
    let val;
    if(u>=0&&v>=0&&u<c.w-1&&v<c.h-1){const x0=u|0,y0=v|0,fx=u-x0,fy=v-y0,i=y0*c.w+x0;
      val=c.a[i]*(1-fx)*(1-fy)+c.a[i+1]*fx*(1-fy)+c.a[i+c.w]*(1-fx)*fy+c.a[i+c.w+1]*fx*fy;
      // Folds: a dark crease, and each panel lit a little differently.
      folds.forEach((f,j)=>{const d=v/c.h-f;if(Math.abs(d)*c.h<ppm*0.6)val*=0.82;if(d>0)val*=j%2?1.04:0.94;});}
    else val=bg+(o.bgTexture?(((x>>3)+(y>>3))%2?o.bgTexture:-o.bgTexture):0);
    out[y*W+x]=val;
  }
  // Things on the table: a phone, a pen, a thumb.
  // (Solid things: they hide what's under them.)
  (o.clutter||[]).forEach(k=>{for(let y=Math.max(0,k.y|0);y<Math.min(H,k.y+k.h);y++)for(let x=Math.max(0,k.x|0);x<Math.min(W,k.x+k.w);x++)out[y*W+x]=k.v;});
  // Light.
  const L=o.light||{};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    let f=L.base==null?1:L.base;
    if(L.grad)f*=1+L.grad[0]*(x/W-0.5)+L.grad[1]*(y/H-0.5);
    if(L.vignette){const d=Math.hypot(x/W-0.5,y/H-0.5)/0.707;f*=1-L.vignette*d*d;}
    if(L.shadow){const s=L.shadow,dx=s.x1-s.x0,dy=s.y1-s.y0,len=Math.hypot(dx,dy),side=((x-s.x0)*dy-(y-s.y0)*dx)/len;
      f*=1-s.depth*Math.max(0,Math.min(1,0.5+side/(s.soft||40)));}
    let v=out[y*W+x]*f;
    if(L.glare){const gd=Math.hypot(x-L.glare.x,y-L.glare.y)/L.glare.r;if(gd<1)v=v+(1-v)*L.glare.amount*(1-gd*gd);}
    out[y*W+x]=v;
  }
  // Motion blur along a line, then lens blur, sensor noise, the tone curve, banding and JPEG.
  let img=out;
  if(o.motion&&o.motion.len>1){const n=Math.round(o.motion.len),a=(o.motion.angle||0)*Math.PI/180,ux=Math.cos(a),uy=Math.sin(a),t=new Float32Array(W*H);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){let s=0,k=0;for(let j=0;j<n;j++){const xx=Math.round(x+(j-n/2)*ux),yy=Math.round(y+(j-n/2)*uy);if(xx>=0&&yy>=0&&xx<W&&yy<H){s+=img[yy*W+xx];k++;}}t[y*W+x]=s/k;}img=t;}
  if(o.blur){for(let pass=0;pass<o.blur;pass++){const t=new Float32Array(W*H);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){let s=0,n=0;for(let d=-1;d<=1;d++){const xx=x+d;if(xx>=0&&xx<W){s+=img[y*W+xx];n++;}}t[y*W+x]=s/n;}
    const t2=new Float32Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){let s=0,n=0;for(let d=-1;d<=1;d++){const yy=y+d;if(yy>=0&&yy<H){s+=t[yy*W+x];n++;}}t2[y*W+x]=s/n;}img=t2;}}
  for(let i=0;i<W*H;i++){let v=img[i];if(o.noise)v+=gauss(R)*o.noise;if(o.gamma)v=Math.pow(Math.max(0,v),o.gamma);
    if(o.levels)v=Math.round(v*o.levels)/o.levels;img[i]=Math.max(0,Math.min(1,v));}
  if(o.jpeg){jpeg(img,W,H,o.jpeg);for(let i=0;i<W*H;i++)img[i]=Math.max(0,Math.min(1,img[i]));}
  return {gray:img,w:W,h:H,corners};
}
