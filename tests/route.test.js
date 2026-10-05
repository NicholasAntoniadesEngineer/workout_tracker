import {test} from "node:test";
import assert from "node:assert/strict";
import {parseRoute,routeOf,titleOf} from "../js/route.js";

test("each screen has an address, and the address leads back to it", () => {
  const cases=[
    [{view:"home"},"#/"],[{view:"log"},"#/log"],[{view:"history"},"#/history"],[{view:"stack"},"#/supplements"],
    [{view:"learn",learnArea:"world",learnCat:"New Zealand & Pacific"},"#/learn/world/c/New+Zealand+%26+Pacific"],
    [{view:"learn",learnOpen:"su-prilepin"},"#/learn/t/su-prilepin"],
    [{view:"learn",learnIndex:"people"},"#/learn/i/people"],
    [{view:"learn"},"#/learn/training"],
  ];
  for(const [s,r] of cases){
    assert.equal(routeOf(s),r);
    const back=parseRoute(r);
    assert.equal(back.view,s.view);
    if(s.learnCat)assert.equal(back.learnCat,s.learnCat);
    if(s.learnOpen)assert.equal(back.learnOpen,s.learnOpen);
  }
});

test("shared links and stray hashes are left alone", () => {
  assert.equal(parseRoute("#r=abc"),null);
  assert.equal(parseRoute("#learn=wendler"),null);
  assert.equal(parseRoute("#/nonsense"),null);
  assert.deepEqual(parseRoute(""),{view:"home"});
});

test("tab titles name the screen", () => {
  assert.equal(titleOf({view:"history"}),"History · KingsKiln™");
  assert.equal(titleOf({view:"learn"},"Jim Wendler: 5/3/1"),"Jim Wendler · KingsKiln™");
  assert.equal(titleOf({view:"home"}),"Home · KingsKiln™");
});
