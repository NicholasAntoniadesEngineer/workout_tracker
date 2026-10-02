import {test} from "node:test";
import assert from "node:assert/strict";
import {BOOKS} from "../js/books.js";
import {SEED_EXERCISES} from "../js/model.js";

const books=BOOKS.flatMap(c=>c.topics);

test("every book card points to a pre-1931 scan, with each chapter at its page",()=>{
  books.forEach(t=>{
    assert.match(t.id,/^bk-/);
    assert.ok(t.title&&t.summary&&t.era&&t.book,t.id);
    assert.ok(+String(t.era).slice(0,4)<1931,t.id+" must be first published before 1931");
    // An Internet Archive scan (read inside the app) or another full scan with a page pattern.
    if(t.ia)assert.match(t.ia,/^[A-Za-z0-9._-]+$/,t.id+": archive.org identifier");
    else assert.ok(t.scan&&/^https:\/\//.test(t.scan.page)&&t.scan.page.includes("{page}"),t.id+": scan page pattern");
    assert.ok(t.contents&&t.contents.length,t.id+": contents");
    t.contents.forEach(c=>{assert.ok(c.t,t.id);assert.match(c.page,t.ia?/^n\d+$/:/^[A-Z]{1,2}\d+$/,t.id+": "+c.t);});
  });
});

test("book workouts use exercises in the app's list",()=>{
  const known=new Set(SEED_EXERCISES.map(n=>n.toLowerCase()));
  books.forEach(t=>{
    (t.exercises||[]).forEach(n=>assert.ok(known.has(n.toLowerCase()),t.id+": "+n));
    (t.days||[]).forEach(d=>d.ex.forEach(n=>assert.ok(known.has(n.toLowerCase()),t.id+" / "+d.name+": "+n)));
  });
});
