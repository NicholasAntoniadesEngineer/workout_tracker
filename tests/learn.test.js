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
    assert.ok(["article","study","video","guideline"].includes(l.k),t.id+": "+l.k);
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
