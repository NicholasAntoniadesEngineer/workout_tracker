// ⌘K (Ctrl+K): one box to go anywhere and do the common things — open a section, start a
// workout or a run, add or look up an exercise, open a Learn topic, reopen a past day. Each
// result is the same tap the app already understands (data-nav, data-add, data-learnjump…),
// so the palette never does anything a button couldn't.
import {state,newestFirst} from "./store.js";
import {shortDate} from "./model.js";
import {exMatches} from "./exinfo.js";
import {learnLib} from "./lazy.js";
import {NAV} from "./views/shell.js";
import {esc} from "./views/common.js";

const plain=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
// Where a query hits a label: its start scores best, a word start next, anywhere last.
function score(label,q){
  const l=plain(label);if(!q)return 1;
  const i=l.indexOf(q);if(i<0)return 0;
  return i===0?3:/\W/.test(l[i-1])?2:1;
}

// What a result does, as the attributes of the button it stands in for.
const ACTIONS=[
  ["Start today's workout",{id:"homestart"},"Train"],
  ["Start a run",{"data-cardioopen":'{"activity":"run"}'},"Cardio"],
  ["Start a ride",{"data-cardioopen":'{"activity":"ride","preset":"open"}'},"Cardio"],
  ["Start intervals (4 × 4)",{"data-cardioopen":'{"activity":"run","preset":"4x4"}'},"Cardio"],
  ["Log a weigh-in",{"data-nav":"body"},"Body"],
  ["Import history from another app",{id:"openimport"},"Settings"],
  ["Back up now",{id:"backupnow"},"Settings"],
  ["Keyboard shortcuts",{id:"keyshelp"},"Help"],
  ["Dark theme",{"data-set":"theme","data-val":"dark"},"Settings"],
  ["Light theme",{"data-set":"theme","data-val":"light"},"Settings"],
];

export function paletteResults(query){
  const q=plain(query).trim(),out=[];
  const add=(group,label,sub,attrs,s)=>out.push({group,label,sub,attrs,s});
  NAV.forEach(([k,l])=>{const s=score("Go to "+l,q)||score(l,q);if(s)add("Go to",l,"Section",{"data-nav":k},s+1);});
  ACTIONS.forEach(([l,a,sub])=>{const s=score(l,q);if(s)add("Do",l,sub,a,s);});
  if(q){
    state.catalog.filter(n=>exMatches(n,q)).slice(0,6).forEach(n=>add("Exercises",n,"Exercise",{"data-add":n,"data-palinfo":n},2));
    const L=learnLib();
    if(L){
      const hits=[];
      L.AREAS.forEach(a=>a[2].forEach(c=>c.topics.forEach(t=>{const s=score(t.title,q)||((t.people||[]).some(p=>score(p.name,q))?1:0);
        if(s)hits.push({t,s,where:a[1]+" · "+c.cat});})));
      hits.sort((a,b)=>b.s-a.s).slice(0,6).forEach(h=>add("Learn",h.t.title,h.where,{"data-learnjump":h.t.id},h.s));
    }
    newestFirst(state.sessions).filter(s=>(s.ex.length||s.cardio)&&(score(s.title,q)||score(shortDate(s.created),q))).slice(0,5)
      .forEach(s=>add("Days",s.title,shortDate(s.created),{"data-load":s.id},1));
  }else{
    const L=learnLib();
    (state.learnRecent||[]).slice(0,3).forEach(id=>{const t=L&&L.topicById(id);if(t)add("Recent in Learn",t.title,"Continue reading",{"data-learnjump":id},1);});
  }
  // Sections and actions first by how well they match, then everything else in its group.
  const order=["Go to","Do","Exercises","Learn","Days","Recent in Learn"];
  return out.sort((a,b)=>q&&(a.group==="Go to"||a.group==="Do")&&(b.group==="Go to"||b.group==="Do")?b.s-a.s:order.indexOf(a.group)-order.indexOf(b.group)).slice(0,24);
}

export function paletteList(){
  const p=state.palette;if(!p)return "";
  const items=paletteResults(p.q);
  p.count=items.length;if(p.sel>=items.length)p.sel=Math.max(0,items.length-1);
  if(!items.length)return "<div class='empty-note'>Nothing matches &ldquo;"+esc(p.q)+"&rdquo;.</div>";
  let g=null;
  return items.map((it,i)=>{
    const head=it.group!==g?(g=it.group,"<div class='palgroup'>"+esc(it.group)+"</div>"):"";
    return head+"<button class='palitem"+(i===p.sel?" on":"")+"' data-palidx='"+i+"'"+(i===p.sel?" aria-selected='true'":"")+">"+
      "<span class='pallabel'>"+esc(it.label)+"</span><span class='palsub'>"+esc(it.group==="Exercises"?(i===p.sel?"Enter adds to today · ⇧Enter opens it":"Exercise"):it.sub||"")+"</span></button>";
  }).join("");
}
export function paletteView(){
  if(!state.palette)return "";
  return "<div class='overlay palover' id='palback'><div class='sheet palette' role='dialog' aria-label='Search KingsKiln'>"+
    "<input class='searchin palin' id='palin' type='search' autocomplete='off' placeholder='Go to, start, find an exercise, a topic or a day…' value='"+esc(state.palette.q)+"'>"+
    "<div class='pallist' id='pallist' role='listbox'>"+paletteList()+"</div>"+
    "<div class='palfoot'><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div></div></div>";
}

// Run a result: stand in a button with its attributes and click it, so the normal handlers act.
// Exercises need the Log on screen, and ⇧ opens their page instead of adding them.
export function runPalette(i,shift){
  const p=state.palette;if(!p)return;
  const it=paletteResults(p.q)[i];
  state.palette=null;
  if(!it)return;
  const click=attrs=>{const b=document.createElement("button");Object.entries(attrs).forEach(([k,v])=>b.setAttribute(k,v));
    b.hidden=true;document.body.appendChild(b);b.click();b.remove();};
  if(it.group==="Exercises"){
    click({"data-nav":"log"});
    click(shift?{"data-exinfo":it.attrs["data-palinfo"]}:{"data-add":it.attrs["data-add"]});
    if(!shift){state.sheet=false;}
    return;
  }
  click(it.attrs);
}
