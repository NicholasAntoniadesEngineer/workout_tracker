// The book reader: each book is the original scan at the Internet Archive, shown inside the
// app at the chapter you pick — the real printed pages, nothing retyped. Which chapter you
// last opened in each book is remembered on this device.

const BASE="https://archive.org/details/";

// The scan inside the app, opened at a page leaf ("n12"), one page across for a phone.
export function scanEmbed(ia,page){
  return BASE+encodeURIComponent(ia)+(page?"/page/"+page:"")+"/mode/1up?view=theater&ui=embed&wrapper=false";
}
// The same place at the Internet Archive itself.
export function scanLink(ia,page){
  return BASE+encodeURIComponent(ia)+(page?"/page/"+page:"")+"/mode/1up";
}

const POS_KEY="kk_bookpos";
function readPos(){try{return JSON.parse(localStorage.getItem(POS_KEY))||{};}catch(e){return {};}}
export function bookPos(id){return readPos()[id]||null;}
export function saveBookPos(id,chapter){
  try{const all=readPos();all[id]={chapter};localStorage.setItem(POS_KEY,JSON.stringify(all));}catch(e){}
}
