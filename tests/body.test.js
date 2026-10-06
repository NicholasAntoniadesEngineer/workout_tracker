import {test} from "node:test";
import assert from "node:assert/strict";
import {bodyFatRange,bpBand,navyBodyFat} from "../js/body.js";

test("the Navy tape estimate lands where the published calculators do", () => {
  // A 180 cm man, 85 cm waist, 40 cm neck: calculators give about 16%.
  const m=navyBodyFat("m",180,85,40);
  assert.ok(m>13&&m<17,String(m));
  assert.equal(bodyFatRange(m),Math.round(m-3)+"–"+Math.round(m+3)+"%");
  // A 165 cm woman, 75 cm waist, 95 cm hip, 33 cm neck: about 27%.
  const f=navyBodyFat("f",165,75,33,95);
  assert.ok(f>25&&f<30,String(f));
  assert.equal(navyBodyFat("m",0,85,40),null);
  assert.equal(navyBodyFat("f",165,75,33,0),null,"women need a hip measurement");
  assert.equal(navyBodyFat("m",180,40,40),null,"waist equal to neck is not a reading");
});

test("blood pressure bands", () => {
  assert.equal(bpBand(118,76),"normal");assert.equal(bpBand(125,78),"elevated");assert.equal(bpBand(135,85),"high (stage 1)");
  assert.equal(bpBand(150,95),"high (stage 2)");assert.equal(bpBand(85,55),"low");assert.equal(bpBand(0,0),"");
});
