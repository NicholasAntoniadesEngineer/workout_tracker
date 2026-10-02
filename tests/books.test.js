import {test} from "node:test";
import assert from "node:assert/strict";
import {BOOKS} from "../js/books.js";
import {SEED_EXERCISES} from "../js/model.js";

const books=BOOKS.flatMap(c=>c.topics);

test("every book card points to a pre-1931 scan, with its chapters at page leaves",()=>{
  books.forEach(t=>{
    assert.match(t.id,/^bk-/);
    assert.ok(t.title&&t.summary&&t.era&&t.book,t.id);
    assert.ok(+String(t.era).slice(0,4)<1931,t.id+" must be first published before 1931");
    assert.match(t.ia,/^[A-Za-z0-9._-]+$/,t.id+": archive.org identifier");
    assert.ok(t.contents&&t.contents.length,t.id+": contents");
    t.contents.forEach(c=>{assert.ok(c.t,t.id);assert.match(c.page,/^n\d+$/,t.id+": "+c.t);});
  });
});

test("book workouts use exercises in the app's list",()=>{
  const known=new Set(SEED_EXERCISES.map(n=>n.toLowerCase()));
  books.forEach(t=>{
    (t.exercises||[]).forEach(n=>assert.ok(known.has(n.toLowerCase()),t.id+": "+n));
    (t.days||[]).forEach(d=>d.ex.forEach(n=>assert.ok(known.has(n.toLowerCase()),t.id+" / "+d.name+": "+n)));
  });
});
