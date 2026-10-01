// Health library — placeholder until the researched content lands. Same shape as LEARN.
export const HEALTH=[];
export function healthTopic(id){
  for(const c of HEALTH){const t=c.topics.find(x=>x.id===id);if(t)return t;}
  return null;
}
