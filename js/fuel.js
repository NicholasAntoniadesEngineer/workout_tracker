// Fuel, protein first. A daily protein target from body weight (the lifters' rule of thumb
// of 1.6–2.2 g per kg, which Phillips's and Helms's reviews in Learn both land on), water
// by the glass, and a fasting clock. Food logging is a short list of recents and saved items
// with protein (and, if you want them, calories, carbs and fat); no database, no barcodes.
const PROTEIN_PER_KG={lift:2.0,cut:2.2,endure:1.6,general:1.6};
export function proteinTarget(weightKg,goal){
  if(!weightKg)return 0;
  return Math.round(weightKg*(PROTEIN_PER_KG[goal]||1.6)/5)*5;
}
// Today's totals from its entries.
export function totalsOf(entries){
  const t={p:0,kcal:0,c:0,f:0,water:0,n:0};
  entries.forEach(e=>{if(e.water){t.water+=e.water;return;}t.n++;t.p+=+e.p||0;t.kcal+=+e.kcal||0;t.c+=+e.c||0;t.f+=+e.f||0;});
  return t;
}
// The items you log most, for the quick row: by count, then recency.
export function frequent(entries,n){
  const by={};
  entries.forEach(e=>{if(e.water||!e.name)return;const k=e.name.trim().toLowerCase();
    const x=by[k]=by[k]||{name:e.name,p:e.p||0,kcal:e.kcal||0,c:e.c||0,f:e.f||0,count:0,last:""};x.count++;if(e.at>x.last){x.last=e.at;x.p=e.p||0;x.kcal=e.kcal||0;x.c=e.c||0;x.f=e.f||0;}});
  return Object.values(by).sort((a,b)=>b.count-a.count||b.last.localeCompare(a.last)).slice(0,n||8);
}
// A fasting clock: hours since the last food entry, and whether a chosen window is done.
export function fastingHours(entries,now){
  const last=entries.filter(e=>!e.water&&e.at).map(e=>Date.parse(e.at)).sort((a,b)=>b-a)[0];
  if(!last)return 0;
  return Math.round((now-last)/360000)/10;
}
// A handful of common foods to start from, protein per usual serving; the list grows with use.
export const STARTERS=[
  ["Eggs, 3 large",19,215],["Chicken breast, 200 g",62,330],["Greek yoghurt, 200 g",20,130],["Whey scoop",25,120],
  ["Beef mince, 200 g",52,500],["Salmon fillet, 150 g",34,310],["Tuna tin",26,120],["Milk, 300 ml",10,190],
  ["Cottage cheese, 200 g",22,200],["Lentils, cooked 200 g",18,230],["Rice, cooked 200 g",5,260],["Oats, 80 g dry",11,300],
].map(([name,p,kcal])=>({name,p,kcal}));
