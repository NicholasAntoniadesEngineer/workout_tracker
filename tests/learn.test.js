import {test} from "node:test";
import assert from "node:assert/strict";
import {LEARN,learnTopic} from "../js/learn.js";

const topics=LEARN.flatMap(c=>c.topics);

test("every topic has a unique id, a summary, and links out",()=>{
  const ids=topics.map(t=>t.id);
  assert.equal(new Set(ids).size,ids.length);
  topics.forEach(t=>{
    assert.ok(t.title&&t.summary,t.id);
    assert.ok(t.links.length>=2,t.id+" has too few links");
  });
});

test("links are https and of a known kind",()=>{
  topics.forEach(t=>t.links.forEach(l=>{
    assert.match(l.u,/^https:\/\//,t.id);
    assert.ok(["article","study","video","guideline","podcast"].includes(l.k),t.id+": "+l.k);
    assert.ok(l.t,t.id);
  }));
});

test("learnTopic finds a topic by id",()=>{
  assert.equal(learnTopic(topics[0].id),topics[0]);
  assert.equal(learnTopic("nope"),null);
});

import {VERSES} from "../js/verses.js";
test("the KJV stays within Cambridge University Press's 500-verse allowance",()=>{
  let n=0;
  VERSES.forEach(v=>{const m=v.ref.match(/:(\d+)(?:-(\d+))?$/);n+=m&&m[2]?(+m[2]-+m[1]+1):1;});
  assert.ok(n<500,n+" verses");
});

import {SEED_EXERCISES} from "../js/model.js";
test("every lifter exercise and workout uses an exercise in the app's list",()=>{
  const known=new Set(SEED_EXERCISES.map(n=>n.toLowerCase()));
  topics.forEach(t=>{
    (t.exercises||[]).forEach(n=>assert.ok(known.has(n.toLowerCase()),t.id+": "+n));
    (t.days||[]).forEach(d=>{
      assert.ok(d.name&&d.ex.length,t.id);
      d.ex.forEach(n=>assert.ok(known.has(n.toLowerCase()),t.id+" / "+d.name+": "+n));
    });
  });
});

import {HEALTH,healthTopic} from "../js/health.js";
test("Health topics are well formed, start with h- and never clash with Training ids",()=>{
  const ht=HEALTH.flatMap(c=>c.topics);
  const ids=ht.map(t=>t.id);
  assert.equal(new Set(ids).size,ids.length);
  ids.forEach(id=>assert.match(id,/^h-/));
  const training=new Set(topics.map(t=>t.id));
  ids.forEach(id=>assert.ok(!training.has(id),id));
  ht.forEach(t=>{
    assert.ok(t.title&&t.summary&&t.links.length,t.id);
    t.links.forEach(l=>{
      assert.match(l.u,/^https:\/\//,t.id);
      assert.ok(["article","study","video","guideline","podcast"].includes(l.k),t.id+": "+l.k);
    });
  });
  assert.equal(healthTopic(ids[0]),ht[0]);
});

import {AREAS} from "../js/library.js";
test("Learn lists categories, topics and culture sections A–Z",()=>{
  const az=list=>list.slice().sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:"base",numeric:true}));
  AREAS.forEach(a=>{
    const cats=a[2].map(c=>c.sort||c.cat);
    assert.deepEqual(cats,az(cats),a[0]);
    a[2].forEach(c=>{const t=c.topics.map(x=>x.title);assert.deepEqual(t,az(t),c.cat);});
  });
  const parts=PARTS.map(p=>p[1]);
  assert.deepEqual(parts,az(parts));
});

import {fmtBioDate,bioAge,ageText} from "../js/bio.js";
test("bios read dates and keep age current",()=>{
  assert.equal(fmtBioDate("1951-11-15"),"15 Nov 1951");
  assert.equal(fmtBioDate("1890"),"1890");
  assert.equal(ageText("1951-11-15","2001-06-10"),"aged 49 at death");
  assert.equal(ageText("1947-07-30",null,"2026-10-01"),"79 years old");
  assert.equal(ageText("1947-07-30",null,"2026-07-29"),"78 years old");
  assert.equal(ageText("1980",null,"2026-10-01"),"about 46 years old");
  assert.equal(bioAge("bad"),null);
});

import {WORLD,REGIONS,PARTS,partOf} from "../js/world.js";
test("World cultures sit in a known region, every topic has a part, and workouts use known exercises",()=>{
  const known=new Set(SEED_EXERCISES.map(n=>n.toLowerCase()));
  const ids=new Set();
  WORLD.forEach(c=>{
    assert.ok(REGIONS.includes(c.region),c.cat+": "+c.region);
    c.topics.forEach(t=>{
      assert.ok(!ids.has(t.id),"duplicate "+t.id);ids.add(t.id);
      assert.ok(["history","people","method","food"].includes(partOf(t)),t.id);
      (t.days||[]).forEach(d=>d.ex.forEach(n=>assert.ok(known.has(n.toLowerCase()),t.id+": "+n)));
    });
  });
});

import {topicById as anyTopic} from "../js/library.js";
test("every related link points to a real Learn topic",()=>{
  AREAS.forEach(a=>a[2].forEach(c=>c.topics.forEach(t=>(t.related||[]).forEach(r=>assert.ok(anyTopic(r),t.id+" → "+r)))));
});

test("every Start here step is a real topic, and paths don't repeat a step", async () => {
  const {PATHS}=await import("../js/paths.js");
  const {topicById}=await import("../js/library.js");
  for(const p of PATHS){
    assert.ok(p.ids.length>=4,p.id);
    assert.equal(new Set(p.ids).size,p.ids.length,p.id);
    for(const id of p.ids)assert.ok(topicById(id),p.id+" → "+id);
  }
});

test("a shared Learn link opens only a plain topic id", async () => {
  const {learnLink,learnLinkId}=await import("../js/share.js");
  assert.equal(learnLinkId(new URL(learnLink("su-prilepin")).hash),"su-prilepin");
  assert.equal(learnLinkId("#learn=bad id"),null);
  assert.equal(learnLinkId("#r=abc"),null);
  assert.equal(learnLinkId(""),null);
});
