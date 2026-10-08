// The app in a real browser (headless Chrome): print the day's sheet to PDF on A4, A5 and Letter
// and check the pages; draw a filled-in sheet, photograph it as a JPEG and send it through the
// app's own scanner (decode, straighten, read, review); and check the review fits phones and
// laptops at every text size. Skips when Chrome isn't installed. npm run test:browser
import {test,describe,before,after} from "node:test";
import assert from "node:assert/strict";
import {launch,serve,chromePath} from "./chrome.mjs";

const KEY="workout_days_v2",has=!!chromePath();
let srv,page;
const T0=new Date();T0.setHours(9,0,0,0);
const iso=d=>new Date(T0.getTime()-d*86400000).toISOString();
const set=(r,w)=>({r,w,side:false,t:0,rest:0,at:"",wu:false,band:""});
const seed=paper=>JSON.stringify({version:3,welcomed:true,sessionId:"today",settings:{unit:"kg",paper,stepMode:"small",checkin:false},
  sessions:[
    {id:"today",title:"Lower A",created:iso(0),started:"",ended:"",running:false,timerFrom:"",ex:[
      {id:"e1",name:"Back squat",sets:[]},{id:"e2",name:"Romanian deadlift",sets:[]},{id:"e3",name:"Plank",timed:true,sets:[]}]},
    {id:"last",title:"Lower A",created:iso(7),started:iso(7),ended:iso(7),running:false,timerFrom:"",ex:[
      {id:"e4",name:"Back squat",sets:[set(5,100),set(5,100),set(5,100)]},{id:"e5",name:"Romanian deadlift",sets:[set(8,80),set(8,80),set(8,80)]},{id:"e6",name:"Plank",timed:true,sets:[set(60,0),set(60,0)]}]}]});
async function open(paper,w,h){
  await page.size(w||1200,h||900,false);
  await page.nav(srv.url+"/__blank",200);
  await page.eval("localStorage.clear();indexedDB.deleteDatabase('kingskiln');localStorage.setItem("+JSON.stringify(KEY)+","+JSON.stringify(seed(paper))+");return 1;");
  await page.nav(srv.url+"/index.html",600);
  // Ready when the app has drawn itself (its photo input is part of every screen).
  await page.eval("for(let i=0;i<50&&!document.getElementById('sheetscan');i++)await new Promise(r=>setTimeout(r,100));window.print=()=>{};return 1;");
}
// Tap a share-menu choice the way the app hears it: a click that bubbles to the body.
const tap=sel=>page.eval("const el=document.createElement('div');el.setAttribute('data-shareopt',"+JSON.stringify(sel)+");document.body.appendChild(el);el.click();el.remove();await new Promise(r=>setTimeout(r,300));return 1;");
const pdfPages=buf=>{const s=buf.toString("latin1"),boxes=[...s.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map(m=>[+m[1],+m[2]]);return boxes;};

describe("in the browser",{skip:!has&&"Chrome not found"},()=>{
  before(async()=>{srv=await serve();page=await launch({w:1200,h:900});});
  after(()=>{if(page)page.close();if(srv)srv.close();});

  for(const [paper,pw,ph] of [["a4",595.28,841.89],["a5",419.53,595.28],["letter",612,792]])
    test("printing on "+paper.toUpperCase()+": one page that size, the table drawn",async()=>{
      await open(paper);await tap("print");
      const info=await page.eval("const a=document.getElementById('printarea');return a?{pages:a.querySelectorAll('.printpage').length,svg:a.innerHTML.length,table:/IF DIFFERENT/.test(a.innerHTML),unit:/ kg</.test(a.innerHTML),last:/last 5·5·5 × 100 kg/.test(a.innerHTML)}:null;");
      assert.ok(info&&info.pages===1&&info.table&&info.unit&&info.last,JSON.stringify(info));
      const boxes=pdfPages(await page.pdf());
      assert.equal(boxes.length,1,"pages in the PDF");
      assert.ok(Math.abs(boxes[0][0]-pw)<2&&Math.abs(boxes[0][1]-ph)<2,"page size "+boxes[0]);
      assert.equal(page.errors.length,0,page.errors.join("\n"));
    });

  test("a filled-in sheet photographed as a JPEG reads back through the app's scanner",async()=>{
    await open("a4");await tap("print");
    const r=await page.eval(`
      const S=await import('/js/store.js'),A=await import('/js/actions/sheet.js'),SH=await import('/js/sheet.js');
      const s=S.state.sessions.find(x=>x.id==='today'),pg=s.sheet.pages[0],spots=SH.markSpots(pg.rows);
      const svg=document.querySelector('#printarea svg').outerHTML,img=new Image();
      img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();
      // The page at 300 dots an inch, then marked in pen and pencil.
      const P=11.81,page=document.createElement('canvas');page.width=Math.round(210*P);page.height=Math.round(297*P);
      const g=page.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,page.width,page.height);g.drawImage(img,0,0,page.width,page.height);
      const at=(row,k,i)=>{const m=spots.find(x=>x.row===row);if(k==='done')return m.done;const p=m.groups.find(q=>q.k===k).pts[i];return [p.x,p.y];};
      const tick=([x,y])=>{g.strokeStyle='#1d2b6b';g.lineWidth=0.7*P;g.lineCap='round';g.beginPath();g.moveTo((x-1.8)*P,y*P);g.lineTo((x-0.4)*P,(y+1.6)*P);g.lineTo((x+2.2)*P,(y-1.9)*P);g.stroke();};
      const cross=([x,y])=>{g.strokeStyle='#1d2b6b';g.lineWidth=0.6*P;g.beginPath();g.moveTo((x-1.7)*P,(y-1.7)*P);g.lineTo((x+1.7)*P,(y+1.7)*P);g.moveTo((x-1.7)*P,(y+1.7)*P);g.lineTo((x+1.7)*P,(y-1.7)*P);g.stroke();};
      const fill=([x,y])=>{g.fillStyle='rgba(40,40,60,0.85)';g.beginPath();g.arc(x*P,y*P,1.9*P,0,7);g.fill();};
      const sets=pg.rows.map((r,i)=>[r,i]).filter(([r])=>r.kind==='set').map(([,i])=>i);
      tick(at(sets[0],'done'));tick(at(sets[1],'done'));cross(at(sets[2],'repsSign',0));fill(at(sets[2],'repsAmt',0));   // squat: 5, 5, 4
      tick(at(sets[3],'done'));tick(at(sets[4],'done'));tick(at(sets[5],'done'));cross(at(sets[5],'kgSign',1));fill(at(sets[5],'kgAmt',1));  // RDL: last one 5 kg heavier
      tick(at(sets[6],'done'));                                                                                     // plank: one of two
      // The photo: on a grey table, turned a little, in a 3000 × 4000 frame, saved as a JPEG.
      const ph=document.createElement('canvas');ph.width=3000;ph.height=4000;const c=ph.getContext('2d');
      c.fillStyle='#6b665e';c.fillRect(0,0,3000,4000);c.translate(1500,2000);c.rotate(-0.07);c.scale(1.05,1.05);c.drawImage(page,-page.width/2,-page.height/2);
      const blob=await new Promise(ok=>ph.toBlob(ok,'image/jpeg',0.8)),file=new File([blob],'sheet.jpg',{type:'image/jpeg'});
      S.state.scan=null;await new Promise(ok=>{A.scanFile(file,()=>ok());});
      const sc=S.state.scan;if(!sc)return {error:document.body.innerText.slice(0,300)};
      const plan=sets.map(i=>[pg.rows[i].r,pg.rows[i].w,pg.rows[i].step]);
      return {plan,page:sc.page,sets:Object.fromEntries(Object.entries(sc.sets).map(([k,v])=>[k,v.map(x=>x.r+'@'+x.w+(x.on?'':' off'))])),notes:!!sc.notes};`);
    assert.ok(!r.error,"scan failed: "+r.error);
    // What was printed (today's targets), and what the marks meant: one rep fewer on the third
    // squat set, two jumps heavier on the third deadlift set, one plank of two.
    const [q,,,d,,,p]=r.plan,f=(a,b)=>a+"@"+b;
    assert.deepEqual(r.sets,{"Back squat":[f(q[0],q[1]),f(q[0],q[1]),f(q[0]-1,q[1])],"Romanian deadlift":[f(d[0],d[1]),f(d[0],d[1]),f(d[0],Math.round((d[1]+2*d[2])*100)/100)],"Plank":[f(p[0],p[1])]});
    assert.ok(r.notes);assert.equal(page.errors.length,0,page.errors.join("\n"));
  });

  test("the review fits phones and laptops at every text size",async()=>{
    const bad=[];
    for(const [w,h] of [[320,640],[390,844],[430,932],[1280,800]])for(const scale of [0,1.25,1.9]){
      await open("a4",w,h);
      const out=await page.eval(`
        const S=await import("/js/store.js");S.setSetting("textScale",${scale});
        S.state.scan={id:'today',page:0,pages:2,notes:'',sets:{'Back squat':[{r:5,w:100,on:true},{r:4,w:97.5,on:true,changed:true},{r:5,w:100,on:true,unsure:true}],
          'Single-arm half-kneeling landmine press with a pause at the bottom':[{r:10,w:25,on:false,note:true,maybe:true,pic:''}]}};
        const poke=async()=>{const el=document.createElement('div');el.setAttribute('data-scanset','none|0');document.body.appendChild(el);el.click();el.remove();await new Promise(r=>setTimeout(r,300));};
        await poke();if(!document.querySelector('.scansheet'))await poke();
        const sh=document.querySelector('.scansheet');if(!sh)return {missing:true,text:document.body.innerText.slice(0,120)};
        const over=[...sh.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>innerWidth+1||r.left<-1||e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='visible');}).map(e=>e.className||e.tagName).slice(0,5);
        return {over,inputs:sh.querySelectorAll('.scanr,.scanw').length};`);
      if(out.missing||out.over.length||out.inputs<4)bad.push(w+"×"+h+" text "+scale+": "+JSON.stringify(out));
    }
    assert.deepEqual(bad,[]);
  });
});
