// People's bios in Learn: dates as written in the library ("1951-11-15", or just "1951" when
// only the year is known), turned into readable dates and an age that stays current.

const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parts(d){
  const m=String(d||"").match(/^(\d{4})(?:-(\d{2})-(\d{2}))?$/);
  return m?{y:+m[1],m:m[2]?+m[2]:null,d:m[3]?+m[3]:null}:null;
}

export function fmtBioDate(d){
  const p=parts(d);
  if(!p)return "";
  return p.m?p.d+" "+MONTHS[p.m-1]+" "+p.y:String(p.y);
}

// Age now, or at death. With only a birth year it's approximate, so it says "about".
export function bioAge(born,died,now){
  const b=parts(born);
  if(!b)return null;
  const endDate=died?parts(died):null;
  const n=now?new Date(now):new Date();
  const e=endDate||{y:n.getFullYear(),m:n.getMonth()+1,d:n.getDate()};
  let age=e.y-b.y;
  const exact=!!(b.m&&e.m);
  if(exact&&(e.m<b.m||(e.m===b.m&&e.d<b.d)))age--;
  return {age,exact,dead:!!died};
}

export function ageText(born,died,now){
  const a=bioAge(born,died,now);
  if(!a)return "";
  const n=(a.exact?"":"about ")+a.age;
  return a.dead?"aged "+n+" at death":n+" years old";
}

const KIND={book:"Book",podcast:"Podcast",film:"Film",programme:"Programme",paper:"Paper"};
export function workKind(k){return KIND[k]||"";}
