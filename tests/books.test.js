import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {BOOKS} from "../js/books.js";
import {SEED_EXERCISES} from "../js/model.js";

const books=BOOKS.flatMap(c=>c.topics);

test("every book card has its full text, and every figure it shows is there",()=>{
  books.forEach(t=>{
    assert.match(t.id,/^bk-/);
    assert.ok(t.title&&t.summary&&t.era,t.id);
    assert.ok(+t.era<1931,t.id+" must be first published before 1931");
    const file="books/"+t.book+".json";
    assert.ok(existsSync(file),file);
    const b=JSON.parse(readFileSync(file,"utf8"));
    assert.equal(b.id,t.book);
    assert.ok(b.chapters.length,t.id);
    b.chapters.forEach(ch=>{
      assert.ok(ch.t&&ch.b.length,t.book+": "+ch.t);
      ch.b.forEach(x=>{
        if(typeof x==="string")return;
        if(x.img)assert.ok(existsSync(x.img),x.img);
        else assert.ok(x.h||x.pre,t.book+": unknown block "+JSON.stringify(x).slice(0,60));
      });
    });
  });
});

test("book workouts use exercises in the app's list",()=>{
  const known=new Set(SEED_EXERCISES.map(n=>n.toLowerCase()));
  books.forEach(t=>{
    (t.exercises||[]).forEach(n=>assert.ok(known.has(n.toLowerCase()),t.id+": "+n));
    (t.days||[]).forEach(d=>d.ex.forEach(n=>assert.ok(known.has(n.toLowerCase()),t.id+" / "+d.name+": "+n)));
  });
});
