// What an exercise is, where Learn uses it, and what else people call it. The descriptions and
// other names live in exinfo-data.js; the Learn links are worked out from the library, so a new
// programme or culture page shows up on every exercise it uses.
import {learnLib} from "./lazy.js";
import {EXINFO} from "./exinfo-data.js";

const key=n=>String(n||"").trim().toLowerCase();
let INDEX=null;
// Built once the Learn library has loaded; until then no exercise lists any topics.
function index(){
  if(INDEX)return INDEX;
  const L=learnLib();
  if(!L)return {};
  INDEX={};
  for(const a of L.AREAS)for(const c of a[2])for(const t of c.topics){
    const names=new Set((t.exercises||[]).map(key));
    (t.days||[]).forEach(d=>d.ex.forEach(n=>names.add(key(n))));
    names.forEach(n=>(INDEX[n]=INDEX[n]||[]).push({t,where:a[1]+" · "+c.cat,days:(t.days||[]).filter(d=>d.ex.some(x=>key(x)===n)).length}));
  }
  // Topics that programme the exercise come first, then the rest A–Z.
  Object.values(INDEX).forEach(l=>l.sort((x,y)=>y.days-x.days||x.t.title.localeCompare(y.t.title)));
  return INDEX;
}
export const learnTopicsFor=name=>index()[key(name)]||[];
export const exWhat=name=>(EXINFO[name]&&EXINFO[name].what)||"";
export const exAka=name=>(EXINFO[name]&&EXINFO[name].aka)||[];

// Search that forgives hyphens, spacing and plurals, and knows the usual short names.
const squash=s=>key(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"").replace(/s$/,"");
export function exMatches(name,q){
  const nq=squash(q),kq=key(q);
  if(!nq)return true;
  // Plain words match the start of any word in the name; squashed spelling ("pullup", "pull-up") only once
  // there's enough to go on; other names ("RDL", "OHP") match from their start.
  if((" "+key(name).replace(/[^a-z0-9]+/g," ")).indexOf(" "+kq)>=0)return true;
  if(nq.length>=4&&squash(name).indexOf(nq)>=0)return true;
  return exAka(name).some(a=>{const sa=squash(a);return sa===nq||(nq.length>=3&&sa.indexOf(nq)===0)||(nq.length>=4&&sa.indexOf(nq)>=0);});
}
