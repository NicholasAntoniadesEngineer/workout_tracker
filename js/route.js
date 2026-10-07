// Every screen has an address, so the browser's Back and Forward (and a mouse's back button,
// ⌘[, Android's back gesture) move between screens, a reload stays put, and a section can be
// bookmarked. Addresses live after "#/" so they never collide with shared links (#r=, #learn=).
// routeOf reads the state; parseRoute turns an address back into the few fields that set it.

const VIEW_PATH={home:"",log:"log",history:"history",calendar:"calendar",progress:"progress",body:"body",
  cardio:"cardio",settings:"settings",import:"import",stack:"supplements",prog:"programme",health:"health",review:"review"};
const PATH_VIEW=Object.fromEntries(Object.entries(VIEW_PATH).map(([v,p])=>[p,v]));
const enc=s=>encodeURIComponent(s).replace(/%20/g,"+");
const dec=s=>decodeURIComponent(String(s).replace(/\+/g,"%20"));

export function routeOf(s){
  if(s.view==="learn"){
    if(s.learnOpen)return "#/learn/t/"+enc(s.learnOpen);
    if(s.learnIndex)return "#/learn/i/"+enc(s.learnIndex);
    const area=s.learnArea||"training";
    return "#/learn/"+enc(area)+(s.learnCat?"/c/"+enc(s.learnCat):"");
  }
  const p=VIEW_PATH[s.view];
  return "#/"+(p==null?"log":p);
}

// The fields an address sets; anything it doesn't mention is left as it is.
export function parseRoute(hash){
  const h=String(hash||"");
  if(h!==""&&h!=="#"&&!h.startsWith("#/"))return null;
  const parts=h.replace(/^#\/?/,"").split("/").filter(Boolean);
  if(!parts.length)return {view:"home"};
  if(parts[0]==="learn"){
    const r={view:"learn",learnOpen:null,learnIndex:null,learnCat:null};
    if(parts[1]==="t"&&parts[2])r.learnOpen=dec(parts[2]);
    else if(parts[1]==="i"&&parts[2])r.learnIndex=dec(parts[2]);
    else{if(parts[1])r.learnArea=dec(parts[1]);if(parts[2]==="c"&&parts[3])r.learnCat=dec(parts[3]);}
    return r;
  }
  const v=PATH_VIEW[parts[0]];
  return v?{view:v}:null;
}

// The browser tab's title for a screen.
const TITLES={home:"Home",log:"Log",history:"History",calendar:"Calendar",progress:"Progress",body:"Body",
  cardio:"Cardio",settings:"Settings",import:"Import",stack:"Supplements",prog:"Programme",learn:"Learn",health:"Health",review:"Year in review"};
export function titleOf(s,topicTitle){
  const name=s.view==="learn"&&topicTitle?topicTitle.split(": ")[0]:s.view==="log"&&s.logTitle?s.logTitle:TITLES[s.view]||"";
  return (name?name+" · ":"")+"KingsKiln™";
}
