// A workout on paper, and back again. The sheet is an A4 page in millimetres (scaled to fit A5
// or Letter): four black corner squares and a row of code squares naming the workout and page,
// then a bordered table for each exercise. A set done as planned is one tick; if it went
// differently, mark minus or plus and fill how many, for the reps and for the weight (in the
// exercise's own jumps); anything else is written in the note, which comes back as a picture.
// A photo is straightened from the corner squares, each row lined up on its printed lines, and
// read by how dark each box is against the paper around it. No AI, nothing leaves the phone.

export const PAGE={w:210,h:297};
// Corner squares: 10 mm, their centres 13 mm in from each edge.
export const FID=10,FIDC=[[13,13],[197,13],[13,284],[197,284]];
export const CODE={x:60,y:11,cell:4,bits:24};          // start bit, 22 bits of id, end bit
// The first layout (sheets printed on 8 October 2026, before tables): fixed rows of circles.
export const ROW={top:52,h:8.4,max:24};
export const COL={n:13,plan:20,done:73,tens:[86,92,98],ones:106,onesStep:6,adj:[167,174,181,188],r:2.2};
export const NOTES={x:12,y:262,w:186,h:16};
export const ADJ=[-2,-1,1,2];
// The table layout, normal and large print. A section is a band (name, last time, rest, note),
// a row of labels, then a row per set.
// reps/kg: how many amounts follow the two signs.
export const TABLE={top:41.5,foot:274,notesMin:16,gap:3.4,
  normal:{K:1,band:7,bandNote:10.4,label:8,row:8,box:5.6,r:2.1,pitch:6.2,split:2.2,reps:5,kg:6,set:8,done:11,plan:29},
  large:{K:1.22,band:8.6,bandNote:13,label:9,row:10.5,box:7.4,r:2.7,pitch:7.6,split:2.2,reps:4,kg:4,set:8,done:13,plan:30}};
export const SIGNS=[-1,1];
// Paper the page prints on; the layout is scaled to fit and centred.
export const PAPERS={a4:{w:210,h:297,css:"A4",name:"A4"},a5:{w:148,h:210,css:"A5",name:"A5"},letter:{w:215.9,h:279.4,css:"letter",name:"Letter"}};

// 22 bits from the session id (and page), the same every time.
export function idCode(id){
  let h=2166136261;for(const c of String(id)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
  return (h>>>0)&0x3FFFFF;
}
export const pageCode=(id,page)=>idCode(page?id+"#"+(page+1):id);
export function bitsOf(v){const bits=[1];for(let i=21;i>=0;i--)bits.push((v>>i)&1);bits.push(1);return bits;}
export function codeBits(id){return bitsOf(idCode(id));}

// How wide a string prints, in mm, at a font size in mm: wide scripts (Chinese, Japanese,
// Korean) a full em a character, Latin about half. Generous, so text is squeezed rather than
// spilling into the next column.
function emOf(ch){
  const c=ch.codePointAt(0);
  if((c>=0x1100&&c<=0x115f)||(c>=0x2e80&&c<=0xa4cf)||(c>=0xac00&&c<=0xd7a3)||(c>=0xf900&&c<=0xfaff)||(c>=0xfe30&&c<=0xfe4f)||(c>=0xff00&&c<=0xff60)||c>=0x20000)return 1;
  if(" .,:;'|!il1ijtfrI·()-".indexOf(ch)>=0)return 0.34;
  if("mwMW@%".indexOf(ch)>=0)return 0.9;
  if(c>=0x41&&c<=0x5a)return 0.7;
  if(c>=0x370&&c<=0x52f)return 0.64;
  return 0.58;
}
export function textWidth(s,size,bold){let n=0;for(const ch of String(s))n+=emOf(ch);return n*size*(bold?1.08:1);}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const fmtW=w=>String(Math.round(w*100)/100);
// A line of text that never runs past maxW: a smaller size first, then squeezed to fit.
function fitText(x,y,s,size,maxW,attrs,bold){
  if(!String(s))return "";
  const est=textWidth(s,size,bold);let sz=size,extra="";
  if(est>maxW){sz=Math.max(size*0.78,size*maxW/est);if(textWidth(s,sz,bold)>maxW)extra=" textLength='"+maxW.toFixed(1)+"' lengthAdjust='spacingAndGlyphs'";}
  return "<text x='"+(+x.toFixed(2))+"' y='"+(+y.toFixed(2))+"' font-size='"+(+sz.toFixed(2))+"'"+(bold?" font-weight='700'":"")+(attrs?" "+attrs:"")+extra+">"+esc(s)+"</text>";
}

// How much a set can differ by, after minus or plus. Reps: 1 to 5 (seconds or metres for time
// and distance). Weight: the exercise's own jump, times 1 to 6. None for a set printed with no
// plan, nor weight for one without weight.
export function repAmounts(r,mode,n){
  if(!(r>0))return [];
  const a=mode==="secs"||mode==="m"?[5,10,15,20,30]:[1,2,3,4,5,6];
  return a.slice(0,n);
}
export function kgAmounts(w,step,n){
  if(!(w>0)||!(step>0))return [];
  return Array.from({length:n},(_,i)=>Math.round(step*(i+1)*100)/100);
}
// Where the columns sit: set, done, plan, reps, kg, note, left to right.
export function tableCols(L){
  const W={set:L.set,done:L.done,plan:L.plan,reps:(L.reps+2)*L.pitch+5+L.split,kg:(L.kg+2)*L.pitch+5+L.split};
  W.note=186-W.set-W.done-W.plan-W.reps-W.kg;
  const X={};let x=12;["set","done","plan","reps","kg","note"].forEach(k=>{X[k]=[x,x+W[k]];x+=W[k];});
  return X;
}

// The pages a session prints as. `exs` lists each exercise to print:
//   {name, sets:[{r, w}], mode:"reps"|"secs"|"m", unit, hand, band, step, last, rest, note}
// (or a plain {name: [{r, w}]} of plans, for the bare minimum). An exercise is kept on one page
// when it fits; one too long for a page carries on, marked continued. Every page has its own
// code, rows with their positions, and a notes box filling what's left.
// Returns [{page, pages, code, rows, notes:{x,y,w,h}, large}].
export function sheetPages(session,exs,opts){
  const o=opts||{},L=o.large?TABLE.large:TABLE.normal,list=toList(session,exs);
  const limit=TABLE.foot-TABLE.notesMin-TABLE.gap,pages=[[]];let y=TABLE.top;
  const newPage=()=>{pages.push([]);y=TABLE.top;};
  list.forEach(e=>{
    const mode=e.mode||"reps",unit=e.unit||"kg",step=+e.step||(unit==="lb"?5:2.5);
    const sets=e.sets.map((p,i)=>({kind:"set",ex:e.name,i,r:+p.r||0,w:+p.w||0,mode,unit,hand:!!e.hand,large:!!o.large,step,
      reps:repAmounts(+p.r||0,mode,L.reps),kg:e.band?[]:kgAmounts(+p.w||0,step,L.kg),blank:!(+p.r>0)}));
    let first=true;
    while(sets.length){
      const band=first&&e.note?L.bandNote:L.band,hh=band+L.label;
      if(y+hh+sets.length*L.row>limit&&pages[pages.length-1].length)newPage();
      const fit=Math.max(1,Math.floor((limit-y-hh)/L.row+1e-9)),take=sets.splice(0,fit);
      pages[pages.length-1].push({kind:"ex",name:e.name,last:first?e.last||"":"",rest:first?e.rest||"":"",note:first?e.note||"":"",
        cont:!first,unit,y,band,h:hh,large:!!o.large});
      y+=hh;
      take.forEach(s=>{s.y=y;s.h=L.row;y+=L.row;pages[pages.length-1].push(s);});
      y+=TABLE.gap;first=false;
    }
  });
  const out=pages.filter(p=>p.length);if(!out.length)out.push([]);
  return out.map((rows,i)=>{
    const last=rows[rows.length-1],end=last?last.y+last.h+TABLE.gap:TABLE.top;
    return {page:i,pages:out.length,code:pageCode(session.id,i),rows,notes:{x:12,y:end,w:186,h:TABLE.foot-end},large:!!o.large};
  });
}
function toList(session,exs){
  if(Array.isArray(exs))return exs;
  const plans=exs||{};
  return session.ex.map(e=>({name:e.name,mode:e.timed?"secs":e.dist?"m":"reps",
    sets:plans[e.name]||(e.sets.length?e.sets.filter(x=>!x.wu).map(x=>({r:x.r,w:+x.w||0})):[{r:0,w:0},{r:0,w:0},{r:0,w:0}])}));
}
// The first page's rows, for the simplest callers.
export function sheetRows(session,plans){return sheetPages(session,plans)[0].rows;}

// Where each readable mark sits, row by row: the done box, the reps and weight choices (each
// with the value it means), the note cell, and the printed lines a photo is lined up on.
// Rows without positions are from the first layout.
export function markSpots(rows){
  const out=[];
  rows.forEach((row,ri)=>{
    if(row.kind!=="set")return;
    if(row.y==null){
      const y=ROW.top+ri*ROW.h+ROW.h/2,ones=Array.from({length:10},(_,d)=>COL.ones+d*COL.onesStep);
      out.push({row:ri,legacy:true,y,rowH:ROW.h,done:row.extra?null:[COL.done+2.5,y],box:5,groups:[
        {k:"tens",seg:0,shape:"circle",r:COL.r,pitch:6,pts:COL.tens.map((x,i)=>({x,y,v:i*10}))},
        {k:"ones",seg:1,shape:"circle",r:COL.r,pitch:COL.onesStep,pts:ones.map((x,d)=>({x,y,v:d}))},
        {k:"adj",seg:2,shape:"circle",r:COL.r,pitch:7,pts:COL.adj.map((x,i)=>({x,y,v:ADJ[i]}))}],
        segs:[{lines:[],box:!row.extra,rings:COL.tens.map(x=>[x,y])},{lines:[],rings:ones.map(x=>[x,y])},{lines:[],rings:COL.adj.map(x=>[x,y])}],ringR:COL.r,noteSeg:2});
      return;
    }
    const L=row.large?TABLE.large:TABLE.normal,X=tableCols(L),y=row.y+row.h/2,mid=k=>(X[k][0]+X[k][1])/2;
    // Two signs, a small gap, then the amounts, centred in the column.
    const place=(k,amounts)=>{const n=amounts.length+2,start=mid(k)-(n*L.pitch+L.split)/2+L.pitch/2,x=j=>+(start+j*L.pitch+(j>=2?L.split:0)).toFixed(3);
      const seg=k==="reps"?1:2;
      return [{k:k+"Sign",seg,shape:"circle",r:L.r,pitch:L.pitch,sign:true,pts:SIGNS.map((v,j)=>({x:x(j),y,v}))},
        {k:k+"Amt",seg,shape:"circle",r:L.r,pitch:L.pitch,pts:amounts.map((v,j)=>({x:x(j+2),y,v}))}];};
    const groups=[];
    if(row.reps.length)groups.push(...place("reps",row.reps));
    if(row.kg.length)groups.push(...place("kg",row.kg));
    // A photo is lined up in three parts along the row (a lens or a curl bends a long row): the
    // done box with its dividers, the reps circles with theirs, the weight circles with theirs.
    const ringsOf=k=>groups.filter(q=>q.k.startsWith(k)).flatMap(q=>q.pts.map(p=>[p.x,p.y]));
    const rules=xs=>xs.flatMap(x=>[[x,row.y],[x,row.y+row.h]]);
    out.push({row:ri,y,rowH:row.h,done:[mid("done"),y],box:L.box,groups,cellW:X.done[1]-X.done[0],
      cells:{reps:{x:X.reps[0]+0.8,y:row.y+0.7,w:X.reps[1]-X.reps[0]-1.6,h:row.h-1.4},kg:{x:X.kg[0]+0.8,y:row.y+0.7,w:X.kg[1]-X.kg[0]-1.6,h:row.h-1.4},
        note:{x:X.note[0]+0.8,y:row.y+0.7,w:X.note[1]-X.note[0]-1.6,h:row.h-1.4}},
      note:{x:X.note[0]+0.8,y:row.y+0.5,w:X.note[1]-X.note[0]-1.8,h:row.h-1},noteSeg:2,ringR:L.r,
      segs:[{lines:[X.done[0],X.plan[0],X.reps[0],X.kg[0],X.note[0]],box:true,rings:[],rules:rules([X.plan[0]+8,X.plan[0]+18,X.note[0]+8,X.note[1]-8])},
        {lines:[X.reps[0],X.kg[0]],rings:ringsOf("reps"),rules:rules([X.reps[0]+6,mid("reps"),X.reps[1]-6])},
        {lines:[X.kg[0],X.note[0]],rings:ringsOf("kg"),rules:rules([X.kg[0]+6,mid("kg"),X.note[0]+6,X.note[1]-6])}]});
  });
  return out;
}

// One printable page as SVG in millimetres. opts: {unit, date, gym, large}.
export function sheetSVG(session,page,opts){
  const o=opts||{},L=page.large?TABLE.large:TABLE.normal,K=L.K,X=tableCols(L),mid=k=>(X[k][0]+X[k][1])/2;
  const LINE="#151515",RULE="#d9d9d9",BAND="#f2f2f2",SUB="#666";
  const T=(x,y,t,a)=>"<text x='"+(+x.toFixed(2))+"' y='"+(+y.toFixed(2))+"' "+a+">"+t+"</text>";
  const hl=(x0,x1,y,c,w)=>"<line x1='"+x0+"' y1='"+(+y.toFixed(2))+"' x2='"+x1+"' y2='"+(+y.toFixed(2))+"' stroke='"+c+"' stroke-width='"+w+"'/>";
  const vl=(x,y0,y1)=>"<line x1='"+(+x.toFixed(2))+"' y1='"+(+y0.toFixed(2))+"' x2='"+(+x.toFixed(2))+"' y2='"+(+y1.toFixed(2))+"' stroke='"+LINE+"' stroke-width='0.3'/>";
  const band=(y,h)=>"<path d='M12 "+(+(y+h).toFixed(2))+" V"+(+(y+2).toFixed(2))+" a2 2 0 0 1 2 -2 H196 a2 2 0 0 1 2 2 V"+(+(y+h).toFixed(2))+" Z' fill='"+BAND+"'/>";
  const frame=(y,h)=>"<rect x='12' y='"+(+y.toFixed(2))+"' width='186' height='"+(+h.toFixed(2))+"' rx='2' fill='none' stroke='"+LINE+"' stroke-width='0.3'/>";
  const lab=(x,y,t,anchor)=>T(x,y,t,"font-size='"+(1.9*K).toFixed(2)+"' font-weight='700' fill='#555' letter-spacing='0.35'"+(anchor?" text-anchor='"+anchor+"'":""));
  let g="<svg xmlns='http://www.w3.org/2000/svg' class='printsheet' viewBox='0 0 "+PAGE.w+" "+PAGE.h+"' width='"+PAGE.w+"mm' height='"+PAGE.h+"mm' font-family='Helvetica Neue,Helvetica,Arial,sans-serif'>"+
    "<rect width='210' height='297' fill='#fff'/>";
  FIDC.forEach(([x,y])=>{g+="<rect x='"+(x-FID/2)+"' y='"+(y-FID/2)+"' width='"+FID+"' height='"+FID+"' fill='#000'/>";});
  bitsOf(page.code).forEach((b,i)=>{if(b)g+="<rect x='"+(CODE.x+i*CODE.cell)+"' y='"+CODE.y+"' width='"+CODE.cell+"' height='"+CODE.cell+"' fill='#000'/>";});
  // Title, the day, and the key, as few words as it takes.
  g+=fitText(12,29.5,session.title||"Workout",6.6,186,"fill='#111'",true);
  const sub=[o.date||"",o.gym||"",session.deload?"Deload week":"",page.pages>1?"Page "+(page.page+1)+" of "+page.pages:""].filter(Boolean).join("  ·  ");
  g+=fitText(12,35.4,sub,3.1,92,"fill='"+SUB+"'");
  let lx=106;const ly=35.4,INK="#1d2b6b";
  g+="<rect x='"+lx+"' y='"+(ly-2.9)+"' width='3.4' height='3.4' rx='0.5' fill='none' stroke='"+LINE+"' stroke-width='0.3'/><path d='M"+(lx+0.7)+" "+(ly-1.3)+" l0.9 1 l1.7 -2.1' fill='none' stroke='"+LINE+"' stroke-width='0.4'/>"+T(lx+4.6,ly,"as planned","font-size='2.7' fill='#444'");
  lx+=22;g+="<circle cx='"+(lx+1.8)+"' cy='"+(ly-1.2)+"' r='1.8' fill='#fff' stroke='#888' stroke-width='0.22'/><path d='M"+(lx+0.9)+" "+(ly-1.2)+" h1.8' stroke='#888' stroke-width='0.3'/>"+
    "<path d='M"+(lx+0.4)+" "+(ly-2.6)+" L"+(lx+3.2)+" "+(ly+0.2)+" M"+(lx+0.4)+" "+(ly+0.2)+" L"+(lx+3.2)+" "+(ly-2.6)+"' stroke='"+INK+"' stroke-width='0.45'/>"+
    "<circle cx='"+(lx+7.4)+"' cy='"+(ly-1.2)+"' r='1.8' fill='#333'/>"+T(lx+7.4,ly-0.55,"2","font-size='1.8' fill='#fff' text-anchor='middle'")+T(lx+10.6,ly,"= 2 fewer","font-size='2.7' fill='#444'");
  lx+=25.5;g+="<rect x='"+lx+"' y='"+(ly-3.1)+"' width='7.6' height='4' rx='0.6' fill='none' stroke='#aaa' stroke-width='0.22'/>"+
    T(lx+1.2,ly-0.2,"12","font-size='2.6' fill='"+INK+"' font-style='italic'")+T(lx+9,ly,"anything else","font-size='2.7' fill='#444'");
  const rows=page.rows,spots={};markSpots(rows).forEach(m=>{spots[m.row]=m;});
  // Sections: a header row, then its set rows until the next header.
  rows.forEach((row,ri)=>{
    if(row.kind!=="ex")return;
    let n=0;while(rows[ri+1+n]&&rows[ri+1+n].kind==="set")n++;
    const y=row.y,hb=row.band,h=row.h+n*L.row,unitL=(row.unit||o.unit||"kg").toUpperCase();
    g+=band(y,hb);
    const last=[row.last?"last "+row.last:"",row.rest?"rest "+row.rest:""].filter(Boolean).join("   ·   "),lastW=last?Math.min(90,textWidth(last,2.4*K)):0;
    g+=fitText(15,y+5*K,row.name+(row.cont?" (continued)":""),4.2*K,180-(last?lastW+5:0),"fill='#111'",true);
    if(last)g+=fitText(195,y+4.8*K,last,2.4*K,lastW,"fill='"+SUB+"' text-anchor='end'");
    if(row.note)g+=fitText(15,y+8.9*K,row.note,2.4*K,178,"fill='"+SUB+"'");
    g+=hl(12,198,y+hb,LINE,0.3);
    // Labels: "if different" over reps and weight, then each column's name.
    const gl=y+hb+4,ly2=y+hb+6.7*Math.min(K,1.12);
    g+=T((X.reps[0]+X.kg[1])/2,y+hb+2.9,"IF DIFFERENT","font-size='"+(1.9*K).toFixed(2)+"' font-weight='700' fill='#555' letter-spacing='0.35' text-anchor='middle'")+hl(X.reps[0]+2,X.kg[1]-2,gl,"#bdbdbd",0.2);
    const mode=(rows[ri+1]||{}).mode||"reps";
    g+=lab(mid("set"),ly2,"SET","middle")+lab(mid("done"),ly2,"DONE","middle")+lab(X.plan[0]+2.4,ly2,"PLAN")+lab(mid("reps"),ly2,mode==="secs"?"SECS":mode==="m"?"METRES":"REPS","middle")+lab(mid("kg"),ly2,unitL,"middle")+lab(X.note[0]+2.4,ly2,"NOTE");
    g+=hl(12,198,y+row.h,LINE,0.25);
    for(let j=0;j<n;j++){
      const s=rows[ri+1+j],m=spots[ri+1+j],ry=s.y,cy=ry+s.h/2;
      if(j%2===1)g+="<rect x='12' y='"+(+ry.toFixed(2))+"' width='186' height='"+s.h+"' fill='#f8f8f8'/>";
      if(j)g+=hl(12,198,ry,RULE,0.2);
      g+=T(mid("set"),cy+1*K,String(s.i+1),"font-size='"+(2.8*K).toFixed(2)+"' fill='#8a8a8a' text-anchor='middle'");
      // The plan, shrunk to fit its column when it's long (a distance, a weight per hand).
      const tail=s.mode==="secs"?" s":s.mode==="m"?" m":"",room=X.plan[1]-X.plan[0]-3.6;
      const u=" "+(s.unit||o.unit||"kg")+(s.hand?" each":"");
      const est=textWidth(s.r,3.9*K,true)+textWidth(tail,2.6*K)+(s.w?textWidth(" × ",3.9*K)+textWidth(fmtW(s.w),3.9*K,true)+textWidth(u,2.6*K):0);
      const f=Math.max(0.62,Math.min(1,room/est)),F=v=>(v*K*f).toFixed(2);
      let plan;
      if(s.blank)plan="<tspan fill='#999' font-weight='400' font-style='italic'>new</tspan>";
      else plan=s.r+(tail?"<tspan font-weight='400' font-size='"+F(2.6)+"' fill='#777'>"+tail+"</tspan>":"")+
        (s.w?"<tspan font-weight='400' fill='#999'> × </tspan>"+fmtW(s.w)+"<tspan font-weight='400' font-size='"+F(2.6)+"' fill='#555'>"+esc(u)+"</tspan>":"");
      g+=T(X.plan[0]+2.4,cy+1.35*K*f,plan,"font-size='"+F(3.9)+"' font-weight='700' fill='#111'"+(est*f>room?" textLength='"+room.toFixed(1)+"' lengthAdjust='spacingAndGlyphs'":""));
      g+="<rect x='"+(+(m.done[0]-L.box/2).toFixed(2))+"' y='"+(+(cy-L.box/2).toFixed(2))+"' width='"+L.box+"' height='"+L.box+"' rx='0.9' fill='#fff' stroke='"+LINE+"' stroke-width='0.35'/>";
      const lbl=v=>{const t=fmtW(v);return "font-size='"+((t.length>3?1.4:t.length>2?1.55:1.85)*K).toFixed(2)+"' fill='#8a8a8a' text-anchor='middle'";};
      const ring=x=>"<circle cx='"+x+"' cy='"+(+cy.toFixed(2))+"' r='"+L.r+"' fill='#fff' stroke='#a3a3a3' stroke-width='0.2'/>";
      ["reps","kg"].forEach(k=>{
        const sg=m.groups.find(q=>q.k===k+"Sign"),am=m.groups.find(q=>q.k===k+"Amt");
        if(!sg){g+=T(mid(k),cy+0.8,"—","font-size='2.6' fill='#ccc' text-anchor='middle'");return;}
        // The signs drawn as strokes, light, so a cross over one stands out.
        sg.pts.forEach(p=>{const a=1.05*K;g+="<circle cx='"+p.x+"' cy='"+(+cy.toFixed(2))+"' r='"+L.r+"' fill='#fff' stroke='#8a8a8a' stroke-width='0.22'/>"+
          // A minus as heavy as a plus, so an unmarked pair looks alike to the reader.
          "<path d='M"+(+(p.x-a).toFixed(2))+" "+(+cy.toFixed(2))+" h"+(2*a).toFixed(2)+(p.v>0?" M"+p.x+" "+(+(cy-a).toFixed(2))+" v"+(2*a).toFixed(2):"")+"' stroke='#888' stroke-width='"+(p.v>0?0.3:0.55)+"'/>";});
        am.pts.forEach(p=>{g+=ring(p.x)+T(p.x,cy+0.66*K,fmtW(p.v),lbl(p.v));});
      });
    }
    // Dividers, the full height; the one between reps and weight starts under "if different".
    ["done","plan","reps","kg","note"].forEach(k=>{g+=vl(X[k][0],k==="kg"?gl:y+hb,y+h);});
    g+=frame(y,h);
  });
  const nb=page.notes,nh=5.6;
  g+=band(nb.y,nh)+hl(12,198,nb.y+nh,LINE,0.3)+T(15,nb.y+3.9,"NOTES","font-size='1.9' font-weight='700' fill='#555' letter-spacing='0.35'")+
    (page.page<page.pages-1?T(195,nb.y+3.9,"continued on page "+(page.page+2),"font-size='2.3' fill='#888' text-anchor='end'"):"")+frame(nb.y,nb.h);
  return g+"</svg>";
}

// How dark is marked, how much clearer the chosen one must be, where a mark is only half there;
// the same for a sign (a cross covers less than a fill); how clearly a row's printed lines must
// show; and the fewest pixels per mm of page to read from.
export const READ={FILL:0.24,GAP:0.12,HALF:0.17,SIGN:0.12,SIGN_GAP:0.07,SIGN_HALF:0.1,TICK:0.065,TICK_HALF:0.045,LINED:0.035,BLUR:0.07,FAR:2,COL_EXTRA:0.02};

// ── Reading a photo ─────────────────────────────────────────────────────────────────────
// gray: Float32Array of brightness 0–1, w × h, top-left first.
// Dark against its own surroundings: each pixel is compared with the mean of a window around it
// (from an integral image), so a shadow or a dim room doesn't turn paper "dark".
function darkMask(gray,w,h){
  const k=Math.max(15,Math.round(Math.min(w,h)/6))|1,r=k>>1,I=new Float64Array((w+1)*(h+1));
  for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=gray[y*w+x];I[(y+1)*(w+1)+x+1]=I[y*(w+1)+x+1]+row;}}
  const m=new Uint8Array(w*h);
  for(let y=0;y<h;y++){const y0=Math.max(0,y-r),y1=Math.min(h,y+r+1);
    for(let x=0;x<w;x++){const x0=Math.max(0,x-r),x1=Math.min(w,x+r+1);
      const mean=(I[y1*(w+1)+x1]-I[y0*(w+1)+x1]-I[y1*(w+1)+x0]+I[y0*(w+1)+x0])/((x1-x0)*(y1-y0));
      m[y*w+x]=gray[y*w+x]<mean*0.68&&gray[y*w+x]<0.68?1:0;}}
  return m;
}
// Solid square-ish blobs of dark, whatever their rotation: a filled square has area exactly
// 12·√(λ1·λ2) of its second moments, an outline or a word has far less.
function blobs(mask,w,h,minArea){
  const seen=new Uint8Array(w*h),out=[],stack=new Int32Array(w*h);
  for(let start=0;start<w*h;start++){
    if(seen[start]||!mask[start])continue;
    let sp=0,n=0,sx=0,sy=0,sxx=0,syy=0,sxy=0;stack[sp++]=start;seen[start]=1;
    while(sp){const p=stack[--sp],x=p%w,y=(p/w)|0;n++;sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y;
      if(x>0&&!seen[p-1]&&mask[p-1]){seen[p-1]=1;stack[sp++]=p-1;}
      if(x<w-1&&!seen[p+1]&&mask[p+1]){seen[p+1]=1;stack[sp++]=p+1;}
      if(y>0&&!seen[p-w]&&mask[p-w]){seen[p-w]=1;stack[sp++]=p-w;}
      if(y<h-1&&!seen[p+w]&&mask[p+w]){seen[p+w]=1;stack[sp++]=p+w;}}
    if(n<minArea)continue;
    const mx=sx/n,my=sy/n,cxx=sxx/n-mx*mx,cyy=syy/n-my*my,cxy=sxy/n-mx*my;
    const tr=cxx+cyy,det=cxx*cyy-cxy*cxy,disc=Math.sqrt(Math.max(0,tr*tr/4-det)),l1=tr/2+disc,l2=tr/2-disc;
    if(l2<=0)continue;
    const solid=n/(12*Math.sqrt(l1*l2)),elong=Math.sqrt(l2/l1);
    if(solid>0.72&&solid<1.25&&elong>0.45)out.push({x:mx+0.5,y:my+0.5,n});
  }
  return out;
}
const area4=q=>{let a=0;const o=[q[0],q[1],q[3],q[2]];for(let i=0;i<4;i++){const [x0,y0]=o[i],[x1,y1]=o[(i+1)%4];a+=x0*y1-x1*y0;}return Math.abs(a)/2;};

// How bright a small disc on the page is, through the mapping.
function meanAt(gray,w,h,map,cx,cy,r){
  let s=0,n=0;const st=Math.max(r/3,0.2);
  for(let dy=-r;dy<=r+1e-9;dy+=st)for(let dx=-r;dx<=r+1e-9;dx+=st){if(dx*dx+dy*dy>r*r+1e-9)continue;
    const [u,v]=map(cx+dx,cy+dy),x=Math.round(u-0.5),y=Math.round(v-0.5);if(x<0||y<0||x>=w||y>=h)continue;s+=gray[y*w+x];n++;}
  return n?s/n:1;
}
// Ink on a disc relative to the paper right beside it: 0 is paper, 1 is black.
function inkRel(gray,w,h,map,cx,cy,r,around){
  let paper=0;around.forEach(([x,y])=>{paper=Math.max(paper,meanAt(gray,w,h,map,x,y,0.7));});
  return paper>0?Math.max(0,1-meanAt(gray,w,h,map,cx,cy,r)/paper):0;
}
// The code squares: black or not, judged against the darkest and lightest of the row, so glare
// or a printer low on toner (grey squares) still reads.
function readCode(gray,w,h,map){
  const ink=[];
  for(let i=0;i<24;i++){const x=CODE.x+i*CODE.cell+CODE.cell/2,y=CODE.y+CODE.cell/2;
    ink.push(inkRel(gray,w,h,map,x,y,1.1,[[x,CODE.y+CODE.cell+1.6],[x,CODE.y-1.6],[x-1.4,CODE.y+CODE.cell+1.6],[x+1.4,CODE.y-1.6]]));}
  const hi=Math.max(...ink),lo=Math.min(...ink);
  if(hi-lo<0.22)return null;
  const t=Math.max(0.18,(hi+lo)/2),bits=ink.map(v=>v>t?1:0);
  if(!bits[0]||!bits[23])return null;
  let v=0;for(let i=1;i<=22;i++)v=v*2+bits[i];
  return v;
}

// The four corner squares, and which code they frame. `want`: a code or a list of codes the
// sheet may be; a set of four that reads as one of them wins. Returns {corners, code, scale}
// (corners in FIDC order: top-left, top-right, bottom-left, bottom-right) or {error}.
export function locate(gray,w,h,want){
  const wants=want==null?null:new Set([].concat(want instanceof Set?[...want]:want));
  const minArea=Math.max(12,Math.round(w*h/40000));
  const bs=blobs(darkMask(gray,w,h),w,h,minArea).sort((a,b)=>b.n-a.n).slice(0,12);
  if(bs.length<4)return {error:"corners"};
  let best=null;
  for(let a=0;a<bs.length;a++)for(let b=a+1;b<bs.length;b++)for(let c=b+1;c<bs.length;c++)for(let d=c+1;d<bs.length;d++){
    const q=[bs[a],bs[b],bs[c],bs[d]],areas=q.map(x=>x.n);
    if(Math.max(...areas)/Math.min(...areas)>8)continue;
    // In order around their middle: on screen (y down) increasing angle runs clockwise.
    const cx=(q[0].x+q[1].x+q[2].x+q[3].x)/4,cy=(q[0].y+q[1].y+q[2].y+q[3].y)/4;
    const ring=q.slice().sort((p1,p2)=>Math.atan2(p1.y-cy,p1.x-cx)-Math.atan2(p2.y-cy,p2.x-cx));
    for(let k=0;k<4;k++){
      const tl=ring[k],tr=ring[(k+1)%4],br=ring[(k+2)%4],bl=ring[(k+3)%4];
      const corners=[[tl.x,tl.y],[tr.x,tr.y],[bl.x,bl.y],[br.x,br.y]];
      const wd=(Math.hypot(tr.x-tl.x,tr.y-tl.y)+Math.hypot(br.x-bl.x,br.y-bl.y))/2,ht=(Math.hypot(bl.x-tl.x,bl.y-tl.y)+Math.hypot(br.x-tr.x,br.y-tr.y))/2;
      if(!(wd/ht>0.42&&wd/ht<1.1))continue;
      const map=homography(FIDC,corners);
      // Each blob should be the size a 10 mm square would be there.
      let ok=true;
      for(let i=0;i<4;i++){const [fx,fy]=FIDC[i],sq=[map(fx-5,fy-5),map(fx+5,fy-5),map(fx-5,fy+5),map(fx+5,fy+5)],exp=area4(sq),got=[tl,tr,bl,br][i].n;
        if(got<exp*0.45||got>exp*1.9){ok=false;break;}}
      if(!ok)continue;
      const code=readCode(gray,w,h,map);
      if(code==null)continue;
      const match=wants?wants.has(code):true;
      const score=(match?2:0)+1;
      if(!best||score>best.score){best={corners,code,score,match};}
      if(match&&wants)break;
    }
    if(best&&best.match&&wants)break;
  }
  if(!best)return {error:bs.length>=4?"code":"corners"};
  if(wants&&!best.match)return {error:"nomatch",code:best.code};
  // Millimetres to pixels, from the corner squares' spacing: too few and the circles blur.
  const [tl,tr,bl,br]=best.corners,scale=(Math.hypot(tr[0]-tl[0],tr[1]-tl[1])+Math.hypot(br[0]-bl[0],br[1]-bl[1]))/2/(FIDC[1][0]-FIDC[0][0]);
  if(scale<READ.FAR)return {error:"far",code:best.code,corners:best.corners,scale};
  return {corners:best.corners,code:best.code,scale};
}
// Kept for callers that only need the corners.
export function findCorners(gray,w,h){const r=locate(gray,w,h);return r.error?null:r.corners;}

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

// ── Reading the rows ────────────────────────────────────────────────────────────────────
// One photo pixel at a page point (NaN off the photo).
function px(gray,w,h,map,x,y){const [u,v]=map(x,y),xx=Math.round(u-0.5),yy=Math.round(v-0.5);return xx<0||yy<0||xx>=w||yy>=h?NaN:gray[yy*w+xx];}
const median=a=>{const s=a.slice().sort((x,y)=>x-y);return s.length?s[s.length>>1]:0;};
// 3 × 3 linear equations, or null when they have no single answer.
function solve3(A,B){
  const M=A.map((r,i)=>r.concat([B[i]]));
  for(let c=0;c<3;c++){let p=c;for(let r=c+1;r<3;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;if(Math.abs(M[p][c])<1e-9)return null;[M[c],M[p]]=[M[p],M[c]];
    for(let r=0;r<3;r++){if(r===c)continue;const f=M[r][c]/M[c][c];for(let k=c;k<4;k++)M[r][k]-=f*M[c][k];}}
  return M.map((r,i)=>r[3]/r[i]);
}
// The paper's brightness as a gentle slope fitted to samples around a mark, so a shadow's edge or
// a lamp's glare across the mark stays paper. With `drop`, samples darker than that share of the
// slope through the rest (a printed line beside a box) are left out and the slope fitted again;
// a shadow, never as dark as print, stays in.
function planeOf(k){
  const n=k.length,mx=k.reduce((a,p)=>a+p[0],0)/n,my=k.reduce((a,p)=>a+p[1],0)/n,mv=k.reduce((a,p)=>a+p[2],0)/n;
  let sxx=0,syy=0,sxy=0,sxv=0,syv=0;
  k.forEach(([x,y,v])=>{const X=x-mx,Y=y-my;sxx+=X*X;syy+=Y*Y;sxy+=X*Y;sxv+=X*(v-mv);syv+=Y*(v-mv);});
  const det=sxx*syy-sxy*sxy;let bx=0,by=0;
  if(Math.abs(det)>1e-9){bx=(sxv*syy-syv*sxy)/det;by=(syv*sxx-sxv*sxy)/det;}
  return (x,y)=>mv+bx*(x-mx)+by*(y-my);
}
function paperFit(pts,drop){
  let k=pts.filter(p=>!isNaN(p[2]));
  if(!k.length)return ()=>1;
  if(k.length<3){const v=Math.max(...k.map(p=>p[2]));return ()=>v;}
  let P=planeOf(k);
  if(drop)for(let it=0;it<2;it++){const keep=k.filter(([x,y,v])=>v>=P(x,y)*drop);if(keep.length<3||keep.length===k.length)break;k=keep;P=planeOf(k);}
  const lo=Math.min(...k.map(p=>p[2])),hi=Math.max(...k.map(p=>p[2]));
  return (x,y)=>Math.min(hi,Math.max(lo,P(x,y)));
}
const discPts=(cx,cy,r)=>{const o=[],st=Math.max(r/3,0.25);for(let dy=-r;dy<=r+1e-9;dy+=st)for(let dx=-r;dx<=r+1e-9;dx+=st)if(dx*dx+dy*dy<=r*r+1e-9)o.push([cx+dx,cy+dy]);return o;};
const ringPts=(cx,cy,r,n)=>Array.from({length:n},(_,i)=>{const t=i*2*Math.PI/n;return [cx+r*Math.cos(t),cy+r*Math.sin(t)];});
// Ink over some points, 0 (paper) to 1 (black), against the paper fitted around them. Points
// lighter than the fit count against, so the two sides of a shadow's edge cancel out.
function inkOver(gray,w,h,map,inner,around){
  const P=paperFit(around.map(([x,y])=>[x,y,meanAt(gray,w,h,map,x,y,0.35)]));
  let s=0,n=0;inner.forEach(([x,y])=>{const v=px(gray,w,h,map,x,y);if(isNaN(v))return;const p=P(x,y);s+=p>0?1-v/p:0;n++;});
  return n?s/n:0;
}
// Share of points darker than the paper by a margin: for a tick in a box, or writing in a cell.
function darkShare(gray,w,h,map,inner,around,k){
  const P=paperFit(around.map(([x,y])=>[x,y,meanAt(gray,w,h,map,x,y,0.35)]));
  let d=0,n=0;inner.forEach(([x,y])=>{const v=px(gray,w,h,map,x,y);if(isNaN(v))return;n++;if(v<P(x,y)*k)d++;});
  return n?d/n:0;
}
// Pen and pencil in a cell: the share of points clearly darker than the paper a millimetre to
// each side. A shadow is broad and a fold's crease faint, so neither counts. Every row prints
// the same in a column, so a row with a clearly bigger share than the others has a mark in it.
function cellStrokes(gray,w,h,map,c,o){
  const g=(x,y)=>meanAt(gray,w,h,map,x,y,0.2);let d=0,n=0;
  for(let yy=c.y+o.dy;yy<=c.y+c.h+o.dy+1e-9;yy+=0.4)for(let xx=c.x+o.dx;xx<=c.x+c.w+o.dx+1e-9;xx+=0.4){
    const v=g(xx,yy),nb=Math.max(g(xx-1,yy),g(xx+1,yy),g(xx,yy-1),g(xx,yy+1));n++;if(v<nb*0.7)d++;}
  return n?d/n:0;
}
// Line a row up on what's printed in it: the column dividers (dark, the row's full height), the
// done box, and on the first layout the rings. The offset in mm that makes them darkest against
// the paper beside them, and how clearly they showed (0 when nothing lines up).
function alignRow(gray,w,h,map,m,seg,near,range,rangeY){
  // Three kinds of printed line: the dividers (they fix left-right), the done box and the
  // circles (they fix up-down too). For the done box part each kind counts the same, however
  // many points it has, so its box (not the long dividers) settles the height; for the circle
  // parts every point counts alike, the many circles leading.
  const F=[[],[],[]],y0=m.y-m.rowH/2,S=m.segs[seg];
  S.lines.forEach(x=>{for(const f of [0.2,0.4,0.6,0.8])F[0].push([x,y0+m.rowH*f,1,0]);});
  if(S.box&&m.done){const [bx,by]=m.done,s=m.box/2;for(const f of [-0.6,-0.2,0.2,0.6]){F[1].push([bx+f*s,by-s,0,1],[bx+f*s,by+s,0,1],[bx-s,by+f*s,1,0],[bx+s,by+f*s,1,0]);}}
  S.rings.forEach(([cx,cy])=>{for(let a=0;a<8;a++){const t=a*Math.PI/4,c=Math.cos(t),s=Math.sin(t);F[2].push([cx+m.ringR*c,cy+m.ringR*s,c,s]);}});
  // The row's own top and bottom lines: no shifted position lines up with them all.
  (S.rules||[]).forEach(([x,y])=>F[2].push([x,y,0,1]));
  if(!F[0].length&&!F[1].length&&!F[2].length)return {dx:0,dy:0,s:0,none:true};
  const flat=!S.box&&!S.rings.length;        // only upright lines: they say nothing about height
  const kind=(G,dx,dy)=>{let sc=0,n=0;for(const [x,y,nx,ny] of G){const on=px(gray,w,h,map,x+dx,y+dy),a=px(gray,w,h,map,x+dx+0.75*nx,y+dy+0.75*ny),b=px(gray,w,h,map,x+dx-0.75*nx,y+dy-0.75*ny);
    if(isNaN(on)||isNaN(a)||isNaN(b))continue;const p=(a+b)/2;if(p>0.02){sc+=(p-on)/p;n++;}}return n>G.length/2?sc/n:null;};
  const all=F[0].concat(F[1],F[2]),c00=near||[0,0],pull=(dx,dy)=>0.012*Math.hypot(dx-c00[0],dy-c00[1]);
  const score=seg?(dx,dy)=>(kind(all,dx,dy)||0)-pull(dx,dy):(dx,dy)=>{let t=0,k=0;F.forEach(G=>{if(!G.length)return;const v=kind(G,dx,dy);if(v!=null){t+=v;k++;}});return (k?t/k:0)-pull(dx,dy);};
  const c0=near||[0,0],R=range==null?3:range,RY=flat?0:(rangeY==null?R:rangeY),st=R>2?0.5:0.25;
  let best={dx:c0[0],dy:c0[1],s:score(c0[0],c0[1])};
  if(R>0)for(let dy=c0[1]-RY;dy<=c0[1]+RY+1e-9;dy+=st)for(let dx=c0[0]-R;dx<=c0[0]+R+1e-9;dx+=st){const s=score(dx,dy);if(s>best.s+1e-9)best={dx,dy,s};}
  const c={dx:best.dx,dy:best.dy},f=Math.min(0.5,Math.max(R,0.25)),fy=Math.min(f,RY);
  for(let dy=c.dy-fy;dy<=c.dy+fy+1e-9;dy+=0.125)for(let dx=c.dx-f;dx<=c.dx+f+1e-9;dx+=0.125){
    if(Math.abs(dx-c0[0])>R+0.25||Math.abs(dy-c0[1])>RY+0.25)continue;const s=score(dx,dy);if(s>best.s+1e-9)best={dx,dy,s};}
  return best;
}
// Read the sheet: which workout and page (from the code), and every row's marks. A row is
// `unsure` when two choices look equally marked, one is half there, or a sign has no amount:
// the review asks. `note` says something is written in the row's note cell.
// Returns {code, rows:[{row, done, reps|null, kg|null, adj, unsure, note, struck, off}], corners, scale}
// or {error}.
export function readSheet(gray,w,h,rows,want){
  const loc=locate(gray,w,h,want);
  if(loc.error)return loc;
  if(!rows)return loc;
  const map=homography(FIDC,loc.corners),spots=markSpots(rows);
  // Line each part of each row up; a page whose printed lines don't show where the corners say
  // is refused.
  // The done box part first (its box and dividers are the darkest print); the other parts then
  // only fine-tune within 2 mm of it, since a row bends gently, not in steps.
  const AL=[];
  [0,1,2].forEach(seg=>{
    // A row bends gently: its circles sit within a millimetre and a half of its box, up or down.
    const al=spots.map((m,i)=>seg?alignRow(gray,w,h,map,m,seg,[AL[0].al[i].dx,AL[0].al[i].dy],2,1.5):alignRow(gray,w,h,map,m,0)),ok=al.filter(a=>!a.none),med=median(ok.map(a=>a.s));
    if(seg)al.forEach((a,i)=>{if(a.none){a.dx=AL[0].al[i].dx;a.dy=AL[0].al[i].dy;}});
    al.forEach((a,i)=>{if(a.none||a.s<med*0.4){const nb=al.filter((b,j)=>j!==i&&Math.abs(j-i)<=4&&!b.none&&b.s>=med*0.4);if(nb.length){a.dx=median(nb.map(b=>b.dx));a.dy=median(nb.map(b=>b.dy));}}});
    // Rows next to each other move together (the page bends smoothly): one far from its
    // neighbours has lined up on the wrong line, so it's searched again close to theirs.
    const first=al.map(a=>({dx:a.dx,dy:a.dy}));
    al.forEach((a,i)=>{if(a.none)return;const nb=first.filter((b,j)=>j!==i&&Math.abs(j-i)<=2);if(nb.length<2)return;
      const mx=median(nb.map(b=>b.dx)),my=median(nb.map(b=>b.dy));
      if(Math.hypot(a.dx-mx,a.dy-my)>0.7){const again=alignRow(gray,w,h,map,spots[i],seg,[mx,my],0.4,0.4);a.dx=again.dx;a.dy=again.dy;}});
    // And the whole page bends smoothly from top to bottom: a curve through every row's shift
    // (rows far off it left out of the fit), and a row far off the curve searched again near it.
    if(!seg&&al.length>=6){
      const fit=(vals)=>{let use=al.map((a,i)=>i);for(let it=0;it<3;it++){
        const n=use.length;if(n<4)break;let A=[[0,0,0],[0,0,0],[0,0,0]],B=[0,0,0];
        use.forEach(i=>{const y=spots[i].y/100,v=vals[i],r=[1,y,y*y];for(let a=0;a<3;a++){B[a]+=r[a]*v;for(let b=0;b<3;b++)A[a][b]+=r[a]*r[b];}});
        const c=solve3(A,B);if(!c)break;const pred=i=>{const y=spots[i].y/100;return c[0]+c[1]*y+c[2]*y*y;};
        const keep=use.filter(i=>Math.abs(vals[i]-pred(i))<0.8);if(keep.length===use.length||keep.length<4){use.pred=pred;break;}use=keep;use.pred=pred;}
        return use.pred||null;};
      const px_=fit(al.map(a=>a.dx)),py_=fit(al.map(a=>a.dy));
      if(px_&&py_)al.forEach((a,i)=>{const ex=px_(i),ey=py_(i);if(Math.hypot(a.dx-ex,a.dy-ey)>1){const again=alignRow(gray,w,h,map,spots[i],0,[ex,ey],0.6,0.6);a.dx=again.dx;a.dy=again.dy;}});
    }
    AL.push({al,med});
  });
  // Pixels per mm where each row is (a tilted page has fewer at its far end): every row needs
  // enough to read, or the photo is too far. Printed lines that barely show: the corners are
  // wrong (nothing lines up), or the photo is too blurred to trust.
  const local=spots.map(m=>{const [a,b]=map(100,m.y),[c,d]=map(101,m.y),[e,f]=map(100,m.y+1);return Math.min(Math.hypot(c-a,d-b),Math.hypot(e-a,f-b));});
  const minScale=local.length?Math.min(...local):loc.scale,lined=AL[0].med;
  if(spots.length&&lined<READ.LINED)return {error:"corners",code:loc.code,scale:loc.scale,lined,minScale};
  if(minScale<READ.FAR)return {error:"far",code:loc.code,scale:loc.scale,lined,minScale};
  if(spots.length&&lined<READ.BLUR)return {error:"blur",code:loc.code,scale:loc.scale,lined,minScale};
  const out=spots.map((m,mi)=>{
    const off=seg=>AL[seg].al[mi],{dx,dy}=off(0),y=m.y+dy;let unsure=false;
    const at=(p,g)=>{const o=off(g.seg||0);return [p.x+o.dx,p.y+o.dy];};
    // A line struck through the whole row, between the choices where nothing else is: skipped.
    const gaps=[];m.groups.forEach(g=>{const o=off(g.seg||0);for(let i=0;i+1<g.pts.length;i++){const a=g.pts[i],b=g.pts[i+1];gaps.push([(a.x+b.x)/2+o.dx,a.y+o.dy]);}});
    // Looked for along a short upright strip at each gap: a hand-drawn line wanders.
    let struck=0;gaps.forEach(([x,yy])=>{let best=0;const ar=[[x,yy-2.6],[x,yy+2.6],[x-0.6,yy-2.6],[x+0.6,yy+2.6]];
      for(let oy=-1.4;oy<=1.401;oy+=0.35)best=Math.max(best,inkOver(gray,w,h,map,discPts(x,yy+oy,0.3),ar));if(best>0.3)struck++;});
    if(gaps.length>=4&&struck>=gaps.length*0.7)return {row:m.row,done:false,reps:null,kg:null,adj:0,unsure:false,note:false,struck:true,off:[dx,dy]};
    // One choice in a group: clearly darker than the rest, or the row is unclear.
    // Each circle lined up on its own printed outline, within half a millimetre.
    const snap=(x,yy,r)=>{const R=ringPts(0,0,r,16);let best=[x,yy],bs=-1;
      for(let oy=-0.6;oy<=0.601;oy+=0.2)for(let ox=-0.6;ox<=0.601;ox+=0.2){let sc=0,n=0;
        R.forEach(([a,b])=>{const c=Math.hypot(a,b),ux=a/c,uy=b/c,on=px(gray,w,h,map,x+ox+a,yy+oy+b),o1=px(gray,w,h,map,x+ox+a+0.7*ux,yy+oy+b+0.7*uy);if(isNaN(on)||isNaN(o1))return;sc+=o1-on;n++;});
        if(n&&sc/n>bs){bs=sc/n;best=[x+ox,yy+oy];}}
      return best;};
    const pick=g=>{
      // Never lighter than paper: a pen ring drawn round a circle mustn't make its neighbour look marked.
      const v=g.pts.map(p=>{const [x0,y0]=at(p,g),[x,yy]=snap(x0,y0,g.r);return Math.max(0,inkOver(gray,w,h,map,discPts(x,yy,Math.min(1.5,g.r*0.72)),ringPts(x,yy,g.r+0.85,8)));});
      const [F,G,H]=g.sign?[READ.SIGN,READ.SIGN_GAP,READ.SIGN_HALF]:[READ.FILL,READ.GAP,READ.HALF];
      // The printed label in each circle is the same grey for all of them: take the group's
      // typical (unmarked) circle as zero. Two signs: the lighter one is the unmarked.
      const base=v.length<=2?Math.min(...v):median(v),u=v.map(x=>Math.max(0,x-base));
      const top=Math.max(...u),i=u.indexOf(top),rest=u.filter((_,j)=>j!==i).sort((a,b)=>b-a)[0]||0;
      if(top>F&&top-rest>G)return g.pts[i].v;
      if(top>H)unsure=true;
      return null;
    };
    // The done box: how much of its inside carries ink, against the paper around it in its cell.
    let done=false;
    // Paper beside the box, left and right, where its cell has room (above and below it are the
    // row's lines).
    if(m.done){const bx=m.done[0]+dx,s=m.box/2,inner=[],around=[];
      for(const f of [-0.7,-0.25,0.25,0.7])around.push([bx-s-1.3,y+f*s],[bx+s+1.3,y+f*s]);
      for(let yy=-s+0.9;yy<=s-0.9+1e-9;yy+=0.3)for(let xx=-s+0.9;xx<=s-0.9+1e-9;xx+=0.3)inner.push([bx+xx,y+yy]);
      // All the paper around it, the shadowed side too: a shadow's edge across the box is then a
      // slope, not ink.
      const P=paperFit(around.map(([x,yy])=>[x,yy,meanAt(gray,w,h,map,x,yy,0.35)]),0.5);let sum=0,nn=0;
      inner.forEach(([x,yy])=>{const v=px(gray,w,h,map,x,yy);if(isNaN(v))return;nn++;const p=P(x,yy);if(p>0)sum+=1-v/p;});
      const f=nn?sum/nn:0;done=f>READ.TICK;if(!done&&f>READ.TICK_HALF)unsure=true;}
    // Writing in the note cell: thin strokes, darker than the paper a millimetre either side, so
    // a shadow across the cell (dark all over) isn't writing.
    let note=false,noteBox=null;
    if(m.note){const n=m.note,o=off(m.noteSeg||0);let ink=0,cnt=0;
      // A few pixels averaged at each point, so a grainy photo's noise isn't taken for a stroke.
      const g=(x,y)=>meanAt(gray,w,h,map,x,y,0.25);
      // How grainy this cell is (a dim, noisy photo is): a stroke must stand well clear of it.
      const vals=[];for(let yy=n.y+o.dy+0.6;yy<=n.y+n.h+o.dy-0.6+1e-9;yy+=0.8)for(let xx=n.x+o.dx+0.6;xx<=n.x+n.w+o.dx-0.6+1e-9;xx+=0.8)vals.push(g(xx,yy));
      const mv=median(vals),grain=1.4826*median(vals.map(v=>Math.abs(v-mv)));
      const grid=[];
      for(let yy=n.y+o.dy+0.6;yy<=n.y+n.h+o.dy-0.6+1e-9;yy+=0.4){const line=[];
        for(let xx=n.x+o.dx+0.6;xx<=n.x+n.w+o.dx-0.6+1e-9;xx+=0.4){const v=g(xx,yy),nb=Math.max(g(xx-1.2,yy),g(xx+1.2,yy),g(xx,yy-1.2),g(xx,yy+1.2));line.push(v<nb*0.76&&nb-v>5*grain?1:0);}
        grid.push(line);}
      // A printed line drifting in runs across most of the cell; writing doesn't.
      const rowsOn=grid.map(l=>l.reduce((a,b)=>a+b,0)/l.length),cols=grid[0]?grid[0].map((_,j)=>grid.reduce((a,l)=>a+l[j],0)/grid.length):[];
      grid.forEach((l,i)=>l.forEach((v,j)=>{cnt++;if(v&&rowsOn[i]<0.6&&cols[j]<0.6)ink++;}));
      // A row printed with no plan (an exercise new to the app) is there to be written in: a
      // little writing is enough.
      note=cnt>0&&ink/cnt>(rows[m.row].blank?0.004:0.008);noteBox={x:n.x+o.dx-0.6,y:n.y+o.dy-0.6,w:n.w+1.2,h:n.h+1.2};}
    const got={};m.groups.forEach(g=>{got[g.k]=pick(g);});
    let reps=null,kg=null,adj=0;
    if(m.legacy){
      if(got.ones!=null)reps=(got.tens||0)+got.ones;else if(got.tens!=null)unsure=true;
      adj=got.adj||0;
    }else{
      const delta=k=>{const s=got[k+"Sign"],a=got[k+"Amt"];if(s!=null&&a!=null)return s*a;if(s!=null||a!=null)unsure=true;return null;};
      const row=rows[m.row],dr=delta("reps"),dk=delta("kg");
      if(dr!=null)reps=Math.max(0,row.r+dr);
      if(dk!=null)kg=Math.max(0,Math.round((row.w+dk)*100)/100);
    }
    const ink={};if(m.cells)for(const k of ["reps","kg"])ink[k]=cellStrokes(gray,w,h,map,m.cells[k],off(k==="reps"?1:2));
    return {row:m.row,done,reps,kg,adj,unsure,note,struck:false,off:[dx,dy],noteBox,ink,has:{reps:m.groups.some(g=>g.k==="repsAmt"),kg:m.groups.some(g=>g.k==="kgAmt")}};
  });
  // The safety net: a column with clearly more ink than the same column in the other rows, yet
  // nothing read from it, is asked about rather than passed over. Rows are compared with rows
  // shaded alike (every other row of a table is grey).
  let j=0;const shade={};rows.forEach((r,i)=>{if(r.kind==="ex")j=0;else{shade[i]=j%2;j++;}});
  for(const k of ["reps","kg"])for(const par of [0,1]){
    const rs=out.filter(r=>r.ink&&r.ink[k]!=null&&r.has[k]&&shade[r.row]===par);if(rs.length<3)continue;
    const base=median(rs.map(r=>r.ink[k]));
    rs.forEach(r=>{const extra=r.ink[k]-base;
      if(r[k]==null&&!r.unsure&&!r.struck&&extra>READ.COL_EXTRA)r.unsure=true;});
  }
  out.forEach(r=>{delete r.ink;delete r.has;});
  return {code:loc.code,rows:out,corners:loc.corners,scale:loc.scale,lined,minScale};
}
// A box on the page, straightened, as a small picture: {w, h, at(x,y) → photo pixel} for the
// caller to copy pixels with. The page's notes box, a row's note cell, or the first layout's.
export function notesWarp(corners,box){
  const map=homography(FIDC,corners),b=box||NOTES;
  return {w:b.w,h:b.h,at:(x,y)=>map(b.x+x,b.y+y)};
}

// What the marks mean as sets: a ticked row is done as printed; minus or plus and an amount
// change its reps or weight; writing in its note brings it to the review with the picture. A
// row with only writing (no tick, no marks) is offered there unticked (`maybe`): one tap keeps
// it, so a smudge taken for writing never adds a set on its own.
// `step` is the jump for first-layout rows that don't carry one.
export function setsFromMarks(rows,read,step){
  const out={};
  read.rows.forEach(r=>{
    const row=rows[r.row];if(!row||row.kind!=="set")return;
    const did=row.extra?r.reps!=null:(r.done||r.reps!=null||r.kg!=null||!!r.adj||r.note);
    if(!did)return;
    const st=+row.step||step||2.5,w=r.kg!=null?r.kg:Math.max(0,Math.round((row.w+(r.adj||0)*st)*100)/100);
    const maybe=!!r.note&&!r.done&&r.reps==null&&r.kg==null&&!r.adj;
    (out[row.ex]=out[row.ex]||[]).push({r:r.reps!=null?r.reps:row.r,w,changed:r.reps!=null||r.kg!=null||!!r.adj,
      unsure:!!r.unsure||(!!row.blank&&r.reps==null),note:!!r.note,ask:!!row.blank,maybe,row:r.row,box:r.noteBox||null});
  });
  return out;
}
