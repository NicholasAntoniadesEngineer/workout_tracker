// The Learn library in four areas — Training (how to train), Health (fuel and recovery), World
// (traditions by culture) and Books (classics to read in full) — with one lookup across them.
import {LEARN} from "./learn.js";
import {HEALTH} from "./health.js";
import {WORLD} from "./world.js";
import {BOOKS} from "./books.js";

// Everything reads A–Z: categories by name, topics by the title on their card.
const az=(a,b)=>a.localeCompare(b,undefined,{sensitivity:"base",numeric:true});
function sorted(cats){
  return cats.slice().sort((a,b)=>az(a.cat,b.cat))
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
