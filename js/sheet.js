// A workout on paper, and back again. The printed sheet is an A4 page in millimetres: four
// black corner squares, a row of code squares naming the workout, and for each set a box to
// tick and circles to fill when it went differently. A photo of it is straightened from the
// corner squares and read by how dark each box is. No AI, nothing leaves the phone.
// Layout and reading are pure functions of the same numbers, so they can't drift apart.

export const PAGE={w:210,h:297};
// Corner squares: 10 mm, their centres 13 mm in from each edge.
export const FID=10,FIDC=[[13,13],[197,13],[13,284],[197,284]];
export const CODE={x:60,y:11,cell:4,bits:24};          // start bit, 22 bits of id, end bit
export const ROW={top:52,h:8.4,max:24};
export const COL={n:13,plan:20,done:73,tens:[86,92,98],ones:106,onesStep:6,adj:[167,174,181,188],r:2.2};
export const NOTES={x:12,y:262,w:186,h:16};
export const ADJ=[-2,-1,1,2];

// 22 bits from the session id, the same every time.
export function idCode(id){
  let h=2166136261;for(const c of String(id)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
  return (h>>>0)&0x3FFFFF;
}
export function codeBits(id){
  const v=idCode(id),bits=[1];for(let i=21;i>=0;i--)bits.push((v>>i)&1);bits.push(1);return bits;
}

// The rows a session prints as: each exercise's planned sets, then one extra.
// [{kind:"ex", name} | {kind:"set", ex, i, r, w, extra}]
export function sheetRows(session,plans){
  const rows=[];
  session.ex.forEach(e=>{
    const plan=(plans&&plans[e.name])||(e.sets.length?e.sets.filter(x=>!x.wu).map(x=>({r:x.r,w:+x.w||0})):[{r:0,w:0},{r:0,w:0},{r:0,w:0}]);
    if(rows.length+plan.length+2>ROW.max)return;
    rows.push({kind:"ex",name:e.name});
    plan.forEach((p,i)=>rows.push({kind:"set",ex:e.name,i,r:+p.r||0,w:+p.w||0}));
    rows.push({kind:"set",ex:e.name,i:plan.length,r:0,w:plan.length?+plan[plan.length-1].w||0:0,extra:true});
  });
  return rows;
}
// Where each readable mark sits on the page, row by row.
export function markSpots(rows){
  const out=[];
  rows.forEach((row,ri)=>{
    if(row.kind!=="set")return;
    const y=ROW.top+ri*ROW.h+ROW.h/2;
    const m={row:ri,done:row.extra?null:[COL.done+2.5,y],tens:COL.tens.map(x=>[x,y]),ones:[],adj:COL.adj.map(x=>[x,y])};
    for(let d=0;d<10;d++)m.ones.push([COL.ones+d*COL.onesStep,y]);
    out.push(m);
  });
  return out;
}

const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
// The printable page as SVG in millimetres.
export function sheetSVG(session,rows,opts){
  const o=opts||{},u=o.unit||"kg";
  let g="<svg xmlns='http://www.w3.org/2000/svg' class='printsheet' viewBox='0 0 "+PAGE.w+" "+PAGE.h+"' width='"+PAGE.w+"mm' height='"+PAGE.h+"mm' font-family='Helvetica,Arial,sans-serif'>"+
    "<rect width='210' height='297' fill='#fff'/>";
  FIDC.forEach(([x,y])=>{g+="<rect x='"+(x-FID/2)+"' y='"+(y-FID/2)+"' width='"+FID+"' height='"+FID+"' fill='#000'/>";});
  codeBits(session.id).forEach((b,i)=>{const x=CODE.x+i*CODE.cell;g+=b?"<rect x='"+x+"' y='"+CODE.y+"' width='"+CODE.cell+"' height='"+CODE.cell+"' fill='#000'/>":"<rect x='"+(x+0.3)+"' y='"+(CODE.y+0.3)+"' width='"+(CODE.cell-0.6)+"' height='"+(CODE.cell-0.6)+"' fill='none' stroke='#ccc' stroke-width='0.2'/>";});
  g+="<text x='12' y='29' font-size='7' font-weight='700'>"+esc(session.title||"Workout")+"</text>"+
    "<text x='12' y='35' font-size='3.4' fill='#555'>"+esc(o.date||"")+" · KingsKiln · tick ✓ if done as printed; fill circles only if different</text>";
  const hy=ROW.top-3;
  g+="<g font-size='2.6' fill='#666' font-weight='700' letter-spacing='0.2'><text x='"+COL.n+"' y='"+hy+"'>SET</text><text x='"+COL.plan+"' y='"+hy+"'>PLANNED</text><text x='"+(COL.done-1)+"' y='"+hy+"'>DONE</text>"+
    "<text x='"+(COL.tens[0]-2)+"' y='"+hy+"'>REPS IF DIFFERENT (TENS · ONES)</text><text x='"+(COL.adj[0]-2)+"' y='"+hy+"'>"+esc(u)+" ± JUMPS</text></g>";
  rows.forEach((row,ri)=>{
    const top=ROW.top+ri*ROW.h,y=top+ROW.h/2;
    if(row.kind==="ex"){g+="<text x='"+COL.n+"' y='"+(y+1.6)+"' font-size='4.2' font-weight='700'>"+esc(row.name)+"</text><line x1='12' y1='"+(top+ROW.h-0.4)+"' x2='198' y2='"+(top+ROW.h-0.4)+"' stroke='#000' stroke-width='0.3'/>";return;}
    g+="<line x1='12' y1='"+(top+ROW.h)+"' x2='198' y2='"+(top+ROW.h)+"' stroke='#ddd' stroke-width='0.2'/>";
    g+="<text x='"+COL.n+"' y='"+(y+1.2)+"' font-size='3.4'>"+(row.extra?"+":row.i+1)+"</text>";
    g+="<text x='"+COL.plan+"' y='"+(y+1.2)+"' font-size='3.4'>"+(row.extra?"Extra set":row.r?(row.r+(row.w?" × "+row.w:"")):"")+"</text>";
    if(!row.extra)g+="<rect x='"+COL.done+"' y='"+(y-2.5)+"' width='5' height='5' rx='0.6' fill='none' stroke='#000' stroke-width='0.35'/>";
    const bub=(x,label)=>"<circle cx='"+x+"' cy='"+y+"' r='"+COL.r+"' fill='none' stroke='#000' stroke-width='0.25'/><text x='"+x+"' y='"+(y+0.75)+"' font-size='2' text-anchor='middle' fill='#888'>"+label+"</text>";
    COL.tens.forEach((x,i)=>{g+=bub(x,i);});
    for(let d=0;d<10;d++)g+=bub(COL.ones+d*COL.onesStep,d);
    COL.adj.forEach((x,i)=>{g+=bub(x,(ADJ[i]>0?"+":"−")+Math.abs(ADJ[i]));});
  });
  g+="<rect x='"+NOTES.x+"' y='"+NOTES.y+"' width='"+NOTES.w+"' height='"+NOTES.h+"' rx='1.5' fill='none' stroke='#bbb' stroke-width='0.25'/>"+
    "<text x='"+(NOTES.x+2)+"' y='"+(NOTES.y+3.6)+"' font-size='2.6' fill='#888'>NOTES · kept as a photo with the day</text>"+
    "<text x='105' y='292.5' font-size='2.4' fill='#999' text-anchor='middle'>Scan with KingsKiln › Train › Share › Scan a filled sheet. Read on your phone; nothing is uploaded.</text>";
  return g+"</svg>";
}

// ── Reading a photo ─────────────────────────────────────────────────────────────────────
// gray: Float32Array of brightness 0–1, w × h. Returns the centres of the four corner squares
// (top-left, top-right, bottom-left, bottom-right), or null.
export function findCorners(gray,w,h){
  // A global threshold halfway between the paper and the ink.
  let sum=0;for(let i=0;i<gray.length;i++)sum+=gray[i];
  const mean=sum/gray.length,thr=mean*0.55;
  const seen=new Uint8Array(w*h),blobs=[],stack=[];
  for(let start=0;start<w*h;start++){
    if(seen[start]||gray[start]>thr)continue;
    let n=0,sx=0,sy=0,x0=w,x1=0,y0=h,y1=0;stack.push(start);seen[start]=1;
    while(stack.length){const p=stack.pop(),x=p%w,y=(p/w)|0;n++;sx+=x;sy+=y;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      for(const q of [p-1,p+1,p-w,p+w]){if(q<0||q>=w*h||seen[q])continue;if((q%w===0&&p%w===w-1)||(p%w===0&&q%w===w-1))continue;if(gray[q]<=thr){seen[q]=1;stack.push(q);}}}
    const bw=x1-x0+1,bh=y1-y0+1;
    if(n<20||bw<4||bh<4)continue;
    const fill=n/(bw*bh),aspect=bw/bh;
    if(fill>0.7&&aspect>0.6&&aspect<1.6)blobs.push({x:sx/n,y:sy/n,n,bw,bh});
  }
  if(blobs.length<4)return null;
  // The corner squares are the biggest solid blobs; take the biggest one nearest each corner.
  blobs.sort((a,b)=>b.n-a.n);
  const big=blobs.slice(0,Math.min(12,blobs.length)),top=big[0].n;
  const cand=big.filter(b=>b.n>top*0.35);
  const pick=(cx,cy)=>cand.slice().sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy))[0];
  const c=[pick(0,0),pick(w,0),pick(0,h),pick(w,h)];
  if(new Set(c).size<4)return null;
  return c.map(b=>[b.x,b.y]);
}

// A homography mapping page millimetres to photo pixels, from four pairs.
export function homography(src,dst){
  const A=[],B=[];
  for(let i=0;i<4;i++){const [x,y]=src[i],[u,v]=dst[i];
    A.push([x,y,1,0,0,0,-u*x,-u*y]);B.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);B.push(v);}
  const n=8;
  for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;
    [A[c],A[p]]=[A[p],A[c]];[B[c],B[p]]=[B[p],B[c]];
    for(let r=0;r<n;r++){if(r===c)continue;const f=A[r][c]/A[c][c];for(let k=c;k<n;k++)A[r][k]-=f*A[c][k];B[r]-=f*B[c];}}
  const hm=B.map((b,i)=>b/A[i][i]);
  return (x,y)=>{const d=hm[6]*x+hm[7]*y+1;return [(hm[0]*x+hm[1]*y+hm[2])/d,(hm[3]*x+hm[4]*y+hm[5])/d];};
}

// How dark a small disc on the page is, 0 (white) to 1 (black), sampled through the mapping.
function inkAt(gray,w,h,map,cx,cy,r){
  let s=0,n=0;
  for(let dy=-r;dy<=r;dy+=r/3)for(let dx=-r;dx<=r;dx+=r/3){if(dx*dx+dy*dy>r*r)continue;
    const [u,v]=map(cx+dx,cy+dy),x=Math.round(u),y=Math.round(v);if(x<0||y<0||x>=w||y>=h)continue;s+=gray[y*w+x];n++;}
  return n?1-s/n:0;
}

// Read the sheet: which workout (from the code), and every row's marks.
// Returns {code, rows:[{row, done, reps|null, adj|0}]} or {error}.
export function readSheet(gray,w,h,rows,want){
  const c=findCorners(gray,w,h);
  if(!c)return {error:"corners"};
  // The sheet may be upside down or sideways in the photo: try each way round and keep the one
  // whose code starts and ends black (and, when known, matches the workout).
  const turns=[[c[0],c[1],c[2],c[3]],[c[3],c[2],c[1],c[0]],[c[1],c[3],c[0],c[2]],[c[2],c[0],c[3],c[1]]];
  let best=null;
  for(const corners of turns){
    const m=homography(FIDC,corners),paper=1-inkAt(gray,w,h,m,105,45,3);
    const ink=(x,y)=>inkAt(gray,w,h,m,x,y,1.2)-(1-paper);
    const guard=ink(CODE.x+CODE.cell/2,CODE.y+CODE.cell/2)>0.35&&ink(CODE.x+23*CODE.cell+CODE.cell/2,CODE.y+CODE.cell/2)>0.35;
    if(!guard)continue;
    let code=0;for(let i=1;i<=22;i++)code=(code<<1)|(ink(CODE.x+i*CODE.cell+CODE.cell/2,CODE.y+CODE.cell/2)>0.35?1:0);
    code=code>>>0;
    if(!best||(want!=null&&code===want))best={corners,code};
    if(want==null||code===want)break;
  }
  if(!best)return {error:"code"};
  if(!rows)return {code:best.code,corners:best.corners};
  const corners=best.corners,map=homography(FIDC,corners);
  // Paper brightness, from blank margins, to judge marks against.
  const paper=1-inkAt(gray,w,h,map,105,45,3);
  const mark=(x,y,r)=>inkAt(gray,w,h,map,x,y,r)-(1-paper);
  const code=best.code;
  const out=markSpots(rows).map(m=>{
    // Inside a circle: the printed digit is faint grey, so a pencil fill stands well above it.
    const filled=(pts,r)=>{const v=pts.map(([x,y])=>mark(x,y,r));const top=Math.max(...v),i=v.indexOf(top);
      const rest=v.filter((_,j)=>j!==i).sort((a,b)=>b-a)[0]||0;return top>0.28&&top-rest>0.12?i:-1;};
    const done=m.done?mark(m.done[0],m.done[1],1.6)>0.18:false;
    const t=filled(m.tens,1.5),o=filled(m.ones,1.5),a=filled(m.adj,1.5);
    const reps=o>=0?(t>=0?t*10:0)+o:null;
    return {row:m.row,done,reps,adj:a>=0?ADJ[a]:0};
  });
  return {code,rows:out,corners};
}
// The notes box, straightened, as a small picture: [canvas width, height, function(x,y) →
// photo pixel] for the caller to copy pixels with.
export function notesWarp(corners){
  const map=homography(FIDC,corners);
  return {w:NOTES.w,h:NOTES.h,at:(x,y)=>map(NOTES.x+x,NOTES.y+y)};
}

// What the marks mean as sets: a ticked row is done as printed, circles change its reps or
// weight, an extra row counts only when its reps are filled.
export function setsFromMarks(rows,read,step){
  const out={};
  read.rows.forEach(r=>{
    const row=rows[r.row];if(!row||row.kind!=="set")return;
    const did=row.extra?r.reps!=null:(r.done||r.reps!=null||r.adj!==0);
    if(!did)return;
    (out[row.ex]=out[row.ex]||[]).push({r:r.reps!=null?r.reps:row.r,w:Math.max(0,Math.round((row.w+r.adj*step)*100)/100),changed:r.reps!=null||r.adj!==0});
  });
  return out;
}
