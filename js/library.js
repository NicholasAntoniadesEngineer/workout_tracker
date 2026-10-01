// The Learn library in two areas — Training (lifters, principles, workouts, joints) and
// Health (protein, supplements, fuel, recovery) — with one lookup across both.
import {LEARN} from "./learn.js";
import {HEALTH} from "./health.js";

// An area only shows once it has content.
export const AREAS=[["training","Training",LEARN],["health","Health",HEALTH]].filter(a=>a[2].length);

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
