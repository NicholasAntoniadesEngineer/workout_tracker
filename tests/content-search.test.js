// Finding things in the library: Learn's search across all four areas, the People index, the
// "Also in Learn" links on a person's page, and the exercise search. Each topic and person must be
// findable, results must come in a steady order, and nothing typed may break the page.
import {test} from "node:test";
import assert from "node:assert/strict";
import {AREAS,topicById,relatedFor} from "../js/library.js";
import {SEED_EXERCISES} from "../js/model.js";
import {EXINFO} from "../js/exinfo-data.js";
import {exMatches,learnTopicsFor} from "../js/exinfo.js";
// The app's storage listens for other windows on a BroadcastChannel, and an open channel keeps
// Node running after the tests end. A test has no other windows, so it goes without one.
delete globalThis.BroadcastChannel;
const {state}=await import("../js/store.js");
const {learnHomeBody,peopleIndex}=await import("../js/views/learn.js");
const {loadLearn}=await import("../js/lazy.js");

const topics=AREAS.flatMap(a=>a[2].flatMap(c=>c.topics));
const none=(list,what)=>assert.deepEqual(list,[],what+":\n  "+list.join("\n  "));
const plain=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
// What Learn's search shows for a query: the topics listed, and the count it reports.
function search(q){
  state.learnQuery=q;
  const html=learnHomeBody();
  const n=/(\d+) results? across Learn/.exec(html);
  return {html,ids:[...html.matchAll(/data-learn='([^']+)'/g)].map(m=>m[1]),count:n?+n[1]:0};
}

test("searching a topic's title finds that topic",()=>{
  none(topics.filter(t=>!search(t.title).ids.includes(t.id)).map(t=>t.id+": "+t.title),"topics their own title doesn't find");
});

test("searching anyone's name finds a topic about them",()=>{
  none(peopleIndex().filter(p=>!search(p.name).ids.some(id=>p.ids.includes(id))).map(p=>p.name),"people their name doesn't find");
});

test("a name typed on a plain keyboard, in any case, finds its topic",()=>{
  // Accents drop away; the letters that have no accent to drop are typed the usual way.
  const typed=s=>plain(s).replace(/ı/g,"i").replace(/þ/g,"th").replace(/ø/g,"o").replace(/æ/g,"ae").replace(/ß/g,"ss")
    .replace(/ł/g,"l").replace(/[đð]/g,"d").replace(/×/g,"x");
  const bad=[];
  const tryAll=(label,text,found)=>{
    if(typed(text)===text.toLowerCase())return;
    const miss=[...new Set([typed(text),typed(text).toUpperCase(),text.toUpperCase()])].filter(q=>!found(search(q).ids));
    if(miss.length)bad.push(label+" not found by "+miss.map(q=>JSON.stringify(q)).join(" or "));
  };
  topics.forEach(t=>tryAll(t.id,t.title,ids=>ids.includes(t.id)));
  peopleIndex().forEach(p=>tryAll(p.name,p.name,ids=>ids.some(id=>p.ids.includes(id))));
  assert.ok(search(typed("Aurélio Miguel")).ids.includes("br-aurelio"),"the check itself works");
  none(bad,"names a plain keyboard can't find");
});

test("title matches come first, then topics that mention the words, in the same order every time",()=>{
  for(const q of ["squat","sleep","Olympic","kettlebell","milk"]){
    const a=search(q),b=search(q);
    assert.deepEqual(a.ids,b.ids,q+" gives the same list twice");
    assert.ok(a.ids.length>0&&a.ids.length<=80&&a.count>=a.ids.length,q);
    const inTitle=a.ids.map(id=>plain(topicById(id).title).includes(plain(q)));
    const firstMention=inTitle.indexOf(false);
    if(firstMention>=0)assert.ok(!inTitle.slice(firstMention).includes(true),q+": a title match comes after a mention");
    assert.equal(new Set(a.ids).size,a.ids.length,q+" lists a topic twice");
  }
});

test("odd input never breaks search, is matched literally, and is shown back escaped",()=>{
  const odd=["(","[","*",".*","\\","$^","?+","🏋️‍♂️","x".repeat(100000),"<img src=x onerror=alert(1)>","'\"","\u0000","%","%E2%80%93",
    "undefined","null","  squat  ","‮evil"];
  for(const q of odd){
    let r;
    assert.doesNotThrow(()=>{r=search(q);},JSON.stringify(q.slice(0,20)));
    assert.ok(!r.html.includes("<img"),"raw HTML from "+q);
    if(!r.ids.length&&q.trim())assert.ok(r.html.includes("Nothing matches"),JSON.stringify(q.slice(0,20)));
  }
  // Regex characters are plain characters: nothing in the library says ".*" or "[".
  assert.equal(search(".*").count,0);
  assert.equal(search("[").count,0);
  assert.deepEqual(search("  squat  ").ids,search("squat").ids,"spaces around a word don't matter");
  for(const q of [""," ","\t"])assert.ok(search(q).html.includes("data-learnindex"),"an empty search shows Learn's home");
  state.learnQuery="";
});

test("the People index lists everyone once, A–Z, each opening a real topic that names them",()=>{
  const ppl=peopleIndex();
  assert.ok(ppl.length>200,"people found");
  const keys=ppl.map(p=>p.key);
  assert.deepEqual(keys,keys.slice().sort((a,b)=>a.localeCompare(b)),"sorted");
  const names=ppl.map(p=>plain(p.name));
  none(names.filter((n,i)=>names.indexOf(n)!==i),"people listed twice");
  const bad=[];
  ppl.forEach(p=>{
    if(!/^[A-Z]$/.test(p.key[0].toUpperCase()))bad.push(p.name+": files under "+p.key[0]);
    p.ids.forEach(id=>{const t=topicById(id);if(!t||!(t.people||[]).some(x=>x.name===p.name))bad.push(p.name+" → "+id);});
  });
  none(bad,"people index entries that go nowhere");
});

test("a person's other pages never point back at the same topic, or at one topic twice",()=>{
  const bad=[];
  topics.filter(t=>(t.people||[]).length).forEach(t=>{
    const r=relatedFor(t),ids=r.about.concat(r.mentions).map(x=>x.t.id);
    if(ids.includes(t.id))bad.push(t.id+" lists itself");
    if(new Set(ids).size!==ids.length)bad.push(t.id+" lists a topic twice");
    r.about.concat(r.mentions).forEach(x=>{if(!x.where||!x.where.includes(" · "))bad.push(t.id+" → "+x.t.id+" has no place");});
  });
  none(bad,"odd Also in Learn lists");
});

test("exercise search finds every exercise by its name, its other names and its name run together",()=>{
  const bad=[];
  SEED_EXERCISES.forEach(n=>{
    if(!exMatches(n,n))bad.push(n);
    if(!exMatches(n,n.toUpperCase()))bad.push(n+" in capitals");
    const joined=n.replace(/[\s-]+/g,"");
    if(joined.length>=4&&!exMatches(n,joined))bad.push(n+" as "+joined);
    ((EXINFO[n]||{}).aka||[]).forEach(a=>{if(!exMatches(n,a))bad.push(n+" as "+a);});
  });
  none(bad,"exercises search can't find");
  assert.equal(exMatches("Squats","zzzz"),false);
  for(const q of ["(","[",".*","\\","🏋️","x".repeat(100000),"<b>",""])assert.doesNotThrow(()=>SEED_EXERCISES.forEach(n=>exMatches(n,q)),JSON.stringify(q.slice(0,10)));
});

test("an exercise's Learn list includes every topic that programmes it, programmes first, then A–Z",async()=>{
  await loadLearn();
  const bad=[];
  topics.forEach(t=>(t.days||[]).forEach(d=>d.ex.forEach(n=>{
    if(!learnTopicsFor(n).some(x=>x.t===t))bad.push(n+" doesn't list "+t.id);
  })));
  none([...new Set(bad)],"missing Learn links on exercises");
  SEED_EXERCISES.forEach(n=>{
    const l=learnTopicsFor(n);
    for(let i=1;i<l.length;i++){
      const a=l[i-1],b=l[i];
      assert.ok(a.days>b.days||(a.days===b.days&&a.t.title.localeCompare(b.t.title)<=0),n+": "+a.t.id+" before "+b.t.id);
    }
  });
});
