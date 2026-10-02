// World: strength and sport traditions by culture. Each culture is one category, placed in a
// region, and its topics fall into four parts — its history, its athletes and coaches, its
// training methods, and its food and recovery. Culture modules are added here as they land.

// Regions in the order the World home shows them.
export const REGIONS=["Russia & former USSR","Eastern Europe","Middle East","South Asia","East Asia",
  "Africa","Nordic & Celtic","Ancient world","Americas & Western Europe"];

export const PARTS=[["history","History"],["people","Athletes & coaches"],["method","Methods"],
  ["food","Food & recovery"]];

// A topic's part: as marked, else worked out — a nutrition topic (id starting "h") is food, even
// when it's about one person; people have era/focus or bios; a programme without a person is a
// method; anything else is history.
export function partOf(tp){
  if(tp.part)return tp.part;
  if(/^h/.test(tp.id))return "food";
  if(tp.era||tp.focus||(tp.people&&tp.people.length))return "people";
  if(tp.days&&tp.days.length)return "method";
  return "history";
}

import {INDIA} from "./world-india.js";
import {IRAN} from "./world-iran.js";
import {BULGARIA} from "./world-bulgaria.js";
import {NORDIC} from "./world-nordic.js";
import {SOVIET} from "./soviet.js";
import {SOVIET_HEALTH} from "./soviet-health.js";

// Each culture: {cat, region, topics}. Training and nutrition modules for the same culture
// merge into one category.
function culture(cat,region,...modules){
  return {cat,region,topics:[].concat(...modules.filter(Boolean).map(m=>m.topics||[]))};
}

export const WORLD=[
  culture("Russia & former USSR","Russia & former USSR",SOVIET,SOVIET_HEALTH),
  BULGARIA,INDIA,IRAN,NORDIC
].filter(c=>c&&c.topics&&c.topics.length);
