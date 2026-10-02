// The book reader: public-domain books kept as books/<id>.json, fetched the first time one is
// opened and then kept by the service worker, so the app installs small and a book reads
// offline once it has been opened. Where you are in each book is remembered on this device.
import {esc} from "./views/common.js";

const loaded={},failed={},pending={};

// The book's text, or null while it's on its way. onReady repaints once it lands.
export function bookText(id,onReady){
  if(loaded[id])return loaded[id];
  if(!pending[id]&&!failed[id]){
    pending[id]=fetch("books/"+id+".json").then(r=>{
      if(!r.ok)throw new Error(r.status);
      return r.json();
    }).then(b=>{loaded[id]=b;}).catch(()=>{failed[id]=true;})
      .finally(()=>{delete pending[id];if(onReady)onReady();});
  }
  return null;
}
export const bookFailed=id=>!!failed[id];
export function retryBook(id){delete failed[id];}

// Reading place per book: {chapter, scroll}. Device-only, and the reader works without it.
const POS_KEY="kk_bookpos";
function readPos(){try{return JSON.parse(localStorage.getItem(POS_KEY))||{};}catch(e){return {};}}
export function bookPos(id){return readPos()[id]||null;}
export function saveBookPos(id,chapter,scroll){
  try{const all=readPos();all[id]={chapter,scroll:Math.round(scroll||0)};localStorage.setItem(POS_KEY,JSON.stringify(all));}catch(e){}
}

const words=s=>(String(s).match(/\S+/g)||[]).length;
export function chapterMinutes(ch){
  const n=ch.b.reduce((a,x)=>a+(typeof x==="string"?words(x):x.pre?words(x.pre):x.h?words(x.h):0),0);
  return Math.max(1,Math.round(n/230));
}

// A chapter's blocks: paragraphs, subheadings, figures, and set text whose lines matter.
export function chapterHtml(ch){
  return ch.b.map(x=>{
    if(typeof x==="string")return "<p>"+esc(x)+"</p>";
    if(x.h)return "<h3>"+esc(x.h)+"</h3>";
    if(x.pre)return "<pre>"+esc(x.pre)+"</pre>";
    if(x.img)return "<figure><img src=\""+esc(x.img)+"\" alt=\""+esc(x.cap||"Illustration")+"\" loading=\"lazy\""+
      (x.w&&x.h?" width=\""+(+x.w)+"\" height=\""+(+x.h)+"\"":"")+">"+(x.cap?"<figcaption>"+esc(x.cap)+"</figcaption>":"")+"</figure>";
    return "";
  }).join("");
}
