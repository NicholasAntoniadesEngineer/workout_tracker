// The Learn library in three areas — Training (how to train), Health (fuel and recovery) and
// World (traditions by culture) — with one lookup across all of them.
import {LEARN} from "./learn.js";
import {HEALTH} from "./health.js";
import {REGIONS,WORLD} from "./world.js";

// Everything reads A–Z: categories by name, topics by the title on their card.
const az=(a,b)=>a.localeCompare(b,undefined,{sensitivity:"base",numeric:true});
function sorted(cats){
  return cats.slice().sort((a,b)=>az(a.cat,b.cat))
    .map(c=>Object.assign({},c,{topics:c.topics.slice().sort((a,b)=>az(a.title,b.title))}));
}

// An area only shows once it has content.
// World keeps its own order — by region, then culture A–Z — rather than one A–Z list.
function byRegion(cats){
  return sorted(cats).sort((a,b)=>REGIONS.indexOf(a.region)-REGIONS.indexOf(b.region)||az(a.cat,b.cat));
}
export const AREAS=[["training","Training",sorted(LEARN)],["health","Health",sorted(HEALTH)],
  ["world","World",byRegion(WORLD)]].filter(a=>a[2].length);

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
