// Supplements and stacks: what you own, and the combinations you take. Pure helpers only —
// the page and its taps live in views/stack.js and actions/stack.js.

export const UNITS=["mg","g","mcg","IU","caps","scoops","ml","tsp"];

// Caffeine in a stack, in mg — counted from lines whose name mentions caffeine and whose unit
// is a weight. Pre-workout tubs can't be counted without their label, so they're left out.
export function stackCaffeine(lines){
  let mg=0;
  (lines||[]).forEach(l=>{
    if(!/caff/i.test(l.name||""))return;
    const d=+l.dose||0;
    if(l.unit==="mg")mg+=d;else if(l.unit==="g")mg+=d*1000;else if(l.unit==="mcg")mg+=d/1000;
  });
  return Math.round(mg);
}

// A line as it reads in a stack: "Citrulline malate — 10 g".
export function lineText(l){
  return (l.name||"")+(l.dose?" — "+l.dose+" "+(l.unit||""):"");
}

export function newId(prefix){
  return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
}

// Shrink a photo to a small JPEG data URL so a shelf of products fits in local storage.
export const PHOTO_EDGE=240;
export function shrinkPhoto(file){
  return new Promise((resolve,reject)=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{
      const k=Math.min(1,PHOTO_EDGE/Math.max(img.width,img.height));
      const c=document.createElement("canvas");
      c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg",0.7));
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("unreadable image"));};
    img.src=url;
  });
}
