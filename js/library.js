// The Learn library in four areas — Training (how to train), Health (fuel and recovery), World
// (traditions by culture) and Books (classics to read in full) — with one lookup across them.
import {LEARN} from "./learn.js";
import {HEALTH} from "./health.js";
import {WORLD} from "./world.js";
import {BOOKS} from "./books.js";

// Everything reads A–Z: categories by name, topics by the title on their card.
const az=(a,b)=>a.localeCompare(b,undefined,{sensitivity:"base",numeric:true});
// A category may carry its own sort key — Books are authors, A–Z by surname.
function sorted(cats){
  return cats.slice().sort((a,b)=>az(a.sort||a.cat,b.sort||b.cat))
    .map(c=>Object.assign({},c,{topics:c.topics.slice().sort((a,b)=>az(a.title,b.title))}));
}

// An area only shows once it has content.
export const AREAS=[["training","Training",sorted(LEARN)],["health","Health",sorted(HEALTH)],
  ["world","World",sorted(WORLD)],["books","Books",sorted(BOOKS.filter(c=>c.topics.length))]].filter(a=>a[2].length);

export function areaCats(area){
  const a=AREAS.find(x=>x[0]===area)||AREAS[0];
  return a[2];
}

export function topicById(id){
  for(const a of AREAS)for(const c of a[2]){const t=c.topics.find(x=>x.id===id);if(t)return t;}
  return null;
}

export function catOfTopic(id){
  for(const a of AREAS)for(const c of a[2])if(c.topics.some(x=>x.id===id))return c;
  return null;
}

// The books in the library that an author's own page points to.
export function booksFrom(id){
  const out=[];
  for(const a of AREAS)for(const c of a[2])c.topics.forEach(t=>{if(t.book&&(t.from||[]).indexOf(id)>=0)out.push(t);});
  return out;
}

// People across Learn. Someone can turn up in several places — Mentzer in Training, in Health on
// eating, in Books — so a person's page lists every other topic about them, and every topic that
// mentions them by full name. Names are matched without accents, initials or bracketed full names.
const norm=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\([^)]*\)/g," ")
  .toLowerCase().replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim();
let ALL=null;
function allTopics(){
  if(!ALL){ALL=[];for(const a of AREAS)for(const c of a[2])for(const t of c.topics)
    ALL.push({t,c,area:a[1],keys:(t.people||[]).map(p=>norm(p.name)),title:norm(t.title),
      head:norm(t.title.split(": ")[0]),text:norm(t.summary+" "+(t.points||[]).join(" "))});}
  return ALL;
}
export function relatedFor(tp){
  const people=(tp.people||[]).map(p=>norm(p.name)).filter(Boolean);
  if(!people.length)return {about:[],mentions:[]};
  const about=[],mentions=[],seen=new Set([tp.id]);
  const self=allTopics().find(x=>x.t===tp);
  for(const x of allTopics()){
    if(seen.has(x.t.id))continue;
    const sameCat=self&&x.c===self.c;
    const hit=people.some(k=>{
      const w=k.split(" "),last=w[w.length-1],first=w[0];
      if(x.keys.includes(k)||x.title.indexOf(k)>=0)return true;
      // Within the same category, a topic named for their surname ("The Gracie diet") or their
      // first name in the possessive ("Rickson's conditioning") is about them too.
      if(!sameCat)return false;
      if(last.length>3&&(" "+x.head+" ").indexOf(" "+last+" ")>=0)return true;
      return first.length>3&&(x.head===first||x.head.indexOf(first+" s ")===0);
    });
    if(hit){seen.add(x.t.id);about.push({t:x.t,where:x.area+" · "+x.c.cat});continue;}
    if(people.some(k=>k.split(" ").length>1&&(" "+x.text+" ").indexOf(" "+k+" ")>=0)){
      seen.add(x.t.id);mentions.push({t:x.t,where:x.area+" · "+x.c.cat});
    }
  }
  return {about,mentions};
}
