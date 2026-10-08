// The exercise catalogue and what the app says about each exercise: its group, a line on what it
// is, form cues and the other names people know it by. Other names steer search and imports from
// other apps, so one that points at two exercises sends a workout to the wrong place.
import {test} from "node:test";
import assert from "node:assert/strict";
import {EXERCISE_GROUPS,SEED_EXERCISES,RETIRED,OTHER_GROUP,exerciseGroup} from "../js/model.js";
import {EXINFO} from "../js/exinfo-data.js";
import {cuesFor} from "../js/cues.js";
import {exerciseMatcher} from "../js/importers.js";
import {AREAS} from "../js/library.js";

const none=(list,what)=>assert.deepEqual(list,[],what+":\n  "+list.join("\n  "));
const lc=s=>s.trim().toLowerCase();
// Names compared the way imports compare them: no case, accents, spaces or punctuation, no plural.
const sq=s=>lc(s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]/g,"").replace(/es$|s$/,"");

test("every group has a name and exercises, and no exercise is listed twice, in one group or two",()=>{
  const groups=EXERCISE_GROUPS.map(g=>g[0]);
  none(groups.filter((g,i)=>!g||groups.indexOf(g)!==i),"group names missing or repeated");
  none(EXERCISE_GROUPS.filter(g=>!g[1].length).map(g=>g[0]),"empty groups");
  const where=new Map();
  EXERCISE_GROUPS.forEach(([g,list])=>list.forEach(n=>where.set(lc(n),(where.get(lc(n))||[]).concat(g+": "+n))));
  none([...where.values()].filter(w=>w.length>1).map(w=>w.join(" and ")),"exercises listed twice");
  none(SEED_EXERCISES.filter(n=>n!==n.trim()||/\s{2}/.test(n)),"names with stray spaces");
});

test("every catalogue exercise files under its own group, and retired ones under a real group",()=>{
  EXERCISE_GROUPS.forEach(([g,list])=>list.forEach(n=>assert.equal(exerciseGroup(n),g,n)));
  const groups=EXERCISE_GROUPS.map(g=>g[0]);
  Object.entries(RETIRED).forEach(([n,g])=>{
    assert.ok(groups.includes(g),n+" → "+g);
    assert.ok(!SEED_EXERCISES.some(x=>lc(x)===n),n+" is retired but still listed");
  });
  assert.equal(exerciseGroup("My own odd lift"),OTHER_GROUP);
});

test("every catalogue exercise has a line on what it is and form cues, and every line is for a catalogue exercise",()=>{
  const bad=[];
  SEED_EXERCISES.forEach(n=>{
    if(!EXINFO[n])bad.push(n+": no description");
    if(!cuesFor(n))bad.push(n+": no form cues");
  });
  Object.keys(EXINFO).filter(n=>!SEED_EXERCISES.includes(n)).forEach(n=>bad.push(n+": described but not in the catalogue"));
  none(bad,"gaps in exercise info");
});

test("descriptions are one plain sentence, and cues two or three short lines",()=>{
  const bad=[];
  Object.entries(EXINFO).forEach(([n,x])=>{
    if(typeof x.what!=="string"||!/^[A-Z].{20,240}\.$/.test(x.what)||x.what!==x.what.trim())bad.push(n+": "+JSON.stringify(x.what));
    if(/<[a-z]|&[a-z]+;|\*\*|`/i.test(x.what||""))bad.push(n+": markup in "+x.what);
    if(x.cues!=null&&(!Array.isArray(x.cues)||x.cues.length<2||x.cues.length>3||x.cues.some(c=>typeof c!=="string"||!c.trim()||c.length>80)))
      bad.push(n+": cues "+JSON.stringify(x.cues));
  });
  none(bad,"odd descriptions or cues");
});

test("other names are trimmed, differ from the exercise's own name, and aren't repeated on one exercise",()=>{
  const bad=[];
  Object.entries(EXINFO).forEach(([n,x])=>{
    if(!Array.isArray(x.aka)){bad.push(n+": no list of other names");return;}
    x.aka.forEach((a,i)=>{
      if(typeof a!=="string"||!a.trim()||a!==a.trim())bad.push(n+": "+JSON.stringify(a));
      else if(lc(a)===lc(n))bad.push(n+": lists its own name");
      else if(x.aka.findIndex(b=>lc(b)===lc(a))!==i)bad.push(n+": "+a+" twice");
    });
  });
  none(bad,"odd other names");
});

test("an other name points to one exercise only: never shared, never another exercise's own name",()=>{
  // For each name as imports read it, the exercises that claim it as an other name.
  const owners=new Map();
  Object.entries(EXINFO).forEach(([n,x])=>(x.aka||[]).forEach(a=>{
    const m=owners.get(sq(a))||new Map();if(!m.has(n))m.set(n,"“"+a+"”");owners.set(sq(a),m);
  }));
  const names=new Map(SEED_EXERCISES.map(n=>[sq(n),n]));
  const bad=[];
  owners.forEach((m,k)=>{
    if(m.size>1)bad.push("shared: "+[...m].map(([n,a])=>n+" "+a).join(", "));
    const own=names.get(k);
    if(own)[...m].filter(([n])=>n!==own).forEach(([n,a])=>bad.push(a+", an other name of "+n+", is the name of "+own));
  });
  none(bad.sort(),"other names that point two ways");
});

test("importing a workout under an exercise's name, or a name only it goes by, files it under that exercise",()=>{
  const match=exerciseMatcher(SEED_EXERCISES);
  const count=new Map();
  Object.values(EXINFO).forEach(x=>(x.aka||[]).forEach(a=>count.set(sq(a),(count.get(sq(a))||0)+1)));
  const names=new Set(SEED_EXERCISES.map(sq));
  const bad=[];
  SEED_EXERCISES.forEach(n=>{
    if(match(n)!==n)bad.push(n+" → "+match(n));
    if(match(n.toUpperCase())!==n)bad.push(n.toUpperCase()+" → "+match(n.toUpperCase()));
    ((EXINFO[n]||{}).aka||[]).filter(a=>count.get(sq(a))===1&&!names.has(sq(a)))
      .forEach(a=>{if(match(a)!==n)bad.push(a+" → "+match(a)+", not "+n);});
  });
  none(bad,"imports filed under the wrong exercise");
});

test("every exercise a Learn topic names or programmes is in the catalogue, spelled as the catalogue spells it",()=>{
  const exact=new Set(SEED_EXERCISES);
  const bad=[];
  AREAS.forEach(a=>a[2].forEach(c=>c.topics.forEach(t=>{
    (t.exercises||[]).forEach(n=>{if(!exact.has(n))bad.push(t.id+": "+n);});
    (t.days||[]).forEach(d=>d.ex.forEach(n=>{if(!exact.has(n))bad.push(t.id+" / "+d.name+": "+n);}));
  })));
  none(bad,"exercises the catalogue doesn't have");
});
