// weeklyVolume across a daylight-saving change. Runs in its own process (node --test isolates
// files), so pinning the timezone here doesn't affect any other test.
process.env.TZ="America/New_York";

import {test} from "node:test";
import assert from "node:assert/strict";
import {weeklyVolume} from "../js/charts.js";

const set=r=>({r,side:false,w:0,t:0,rest:0,at:"",wu:false,band:""});

test("keys every week by its Monday when a DST change falls inside the window",
  t=>{
    // Friday 20 March 2026; US clocks went forward on Sunday 8 March.
    t.mock.timers.enable({apis:["Date"],now:new Date(2026,2,20,12).getTime()});
    const weeks=weeklyVolume([
      {id:"a",created:new Date(2026,2,3,12).toISOString(),ex:[{name:"Squats",sets:[set(10)]}]}
    ]);
    assert.ok(weeks.every(w=>new Date(w.key+"T12:00:00").getDay()===1),
      "keys: "+weeks.map(w=>w.key).join(", "));
    assert.equal(weeks.reduce((n,w)=>n+w.reps,0),10);
  });
