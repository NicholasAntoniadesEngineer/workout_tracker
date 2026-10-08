// The verse pool on Today: every verse has a reference and both translations, references are
// real New Testament chapters and verses, in Bible order, with no repeats or overlapping
// ranges, and the text is clean enough to show as it is.
import {test} from "node:test";
import assert from "node:assert/strict";
import {VERSES} from "../js/verses.js";

// Chapters in each New Testament book.
const NT=[["Matthew",28],["Mark",16],["Luke",24],["John",21],["Acts",28],["Romans",16],["1 Corinthians",16],["2 Corinthians",13],
  ["Galatians",6],["Ephesians",6],["Philippians",4],["Colossians",4],["1 Thessalonians",5],["2 Thessalonians",3],["1 Timothy",6],
  ["2 Timothy",4],["Titus",3],["Philemon",1],["Hebrews",13],["James",5],["1 Peter",5],["2 Peter",3],["1 John",5],["2 John",1],
  ["3 John",1],["Jude",1],["Revelation",22]];
const ORDER=NT.map(b=>b[0]),CHAPTERS=Object.fromEntries(NT);
const parse=ref=>{const m=ref.match(/^(.+) (\d+):(\d+)(?:-(\d+))?$/);return m?{book:m[1],ch:+m[2],from:+m[3],to:+(m[4]||m[3])}:null;};

test("there are verses, and each has a reference and both translations, nothing else",()=>{
  assert.ok(VERSES.length>=100,VERSES.length+" verses");
  VERSES.forEach((v,i)=>{
    assert.deepEqual(Object.keys(v).sort(),["kjv","ref","web"],"verse "+i);
    for(const k of ["ref","web","kjv"])assert.ok(typeof v[k]==="string"&&v[k].trim().length>0,(v.ref||i)+" "+k);
  });
});

test("every reference is a real New Testament book, chapter and verse range",()=>{
  VERSES.forEach(v=>{
    const p=parse(v.ref);assert.ok(p,v.ref);
    assert.ok(CHAPTERS[p.book],"unknown book: "+v.ref);
    assert.ok(p.ch>=1&&p.ch<=CHAPTERS[p.book],"no such chapter: "+v.ref);
    assert.ok(p.from>=1&&p.to>p.from-1&&p.to-p.from<=6,"odd range: "+v.ref);
    if(p.to===p.from)assert.doesNotMatch(v.ref,/-/,v.ref);
  });
});

test("no reference repeats, and no range overlaps another verse in the pool",()=>{
  const refs=VERSES.map(v=>v.ref);
  assert.equal(new Set(refs).size,refs.length);
  const p=VERSES.map(v=>parse(v.ref));
  for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
    const a=p[i],b=p[j];
    assert.ok(!(a.book===b.book&&a.ch===b.ch&&a.from<=b.to&&b.from<=a.to),VERSES[i].ref+" overlaps "+VERSES[j].ref);
  }
});

test("the pool runs in Bible order, so paging through it reads Matthew to Revelation",()=>{
  const key=p=>[ORDER.indexOf(p.book),p.ch,p.from];
  for(let i=1;i<VERSES.length;i++){
    const a=key(parse(VERSES[i-1].ref)),b=key(parse(VERSES[i].ref));
    assert.ok(a[0]<b[0]||(a[0]===b[0]&&(a[1]<b[1]||(a[1]===b[1]&&a[2]<b[2]))),VERSES[i-1].ref+" then "+VERSES[i].ref);
  }
});

test("the text is clean: trimmed, single-spaced, no markup or leftovers from the source",()=>{
  VERSES.forEach(v=>{for(const k of ["web","kjv"]){
    const t=v[k];
    assert.equal(t,t.trim(),v.ref+" "+k);
    assert.doesNotMatch(t,/\s{2}|[<>{}[\]\\|]|undefined|null|NaN|\d+:\d+/,v.ref+" "+k);
    assert.match(t,/^[“‘"(A-Za-z]/,v.ref+" "+k+" starts oddly");
    assert.ok(t.length>=12&&t.length<=420,v.ref+" "+k+" is "+t.length+" characters");
  }});
});

test("no two verses carry the same text, and the KJV reads as the KJV",()=>{
  for(const k of ["web","kjv"]){const t=VERSES.map(v=>v[k]);assert.equal(new Set(t).size,t.length,k);}
  // The two translations differ for nearly every verse; a handful read the same word for word.
  const same=VERSES.filter(v=>v.web===v.kjv).map(v=>v.ref);
  assert.ok(same.length<=6,same.join(", "));
  assert.ok(VERSES.filter(v=>/\b(ye|thee|thou|thy|unto|hath|shall)\b/i.test(v.kjv)).length>VERSES.length/2);
  assert.ok(VERSES.every(v=>!/\b(thee|thou|hath)\b/.test(v.web)),"WEB text with KJV words");
});

test("a range carries more text than a single verse would",()=>{
  const singles=VERSES.filter(v=>!v.ref.includes("-")),avg=singles.reduce((a,v)=>a+v.web.length,0)/singles.length;
  VERSES.filter(v=>v.ref.includes("-")).forEach(v=>assert.ok(v.web.length>avg*0.9,v.ref));
});

test("paging forwards and back from any verse stays inside the pool",()=>{
  // The Today card steps the index with ((i + dir) % n + n) % n.
  const n=VERSES.length,step=(i,d)=>((i+d)%n+n)%n;
  assert.equal(step(0,-1),n-1);assert.equal(step(n-1,1),0);
  for(let i=0;i<n;i++){assert.ok(VERSES[step(i,1)]&&VERSES[step(i,-1)]);}
});
