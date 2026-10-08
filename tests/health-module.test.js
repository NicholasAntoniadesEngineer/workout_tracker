// The Health library: four groups of topics, each with a summary, key points and links out;
// the experts' pages with dates and works that read sensibly; and every place in the app that
// opens a Health topic by its id finding a real one.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {HEALTH,healthTopic} from "../js/health.js";
import {fmtBioDate,ageText,workKind} from "../js/bio.js";
import {topicById} from "../js/library.js";
import {MARKERS} from "../js/markers.js";
import {PATHS} from "../js/paths.js";
import {VIDEOS} from "../js/videos.js";

const topics=HEALTH.flatMap(c=>c.topics.map(t=>Object.assign({cat:c.cat},t)));
const KINDS=["article","study","video","guideline","podcast"];

describe("shape",()=>{
  test("four groups: experts, food, sleep and recovery, supplements, none empty",()=>{
    assert.deepEqual(HEALTH.map(c=>c.cat),["Experts & lifters","Food & fuel","Sleep & recovery","Supplements"]);
    HEALTH.forEach(c=>assert.ok(c.topics.length>=3,c.cat));
  });
  test("ids are unique, lower-case and start with h-; titles are unique too",()=>{
    const ids=topics.map(t=>t.id),titles=topics.map(t=>t.title.toLowerCase());
    assert.equal(new Set(ids).size,ids.length);assert.equal(new Set(titles).size,titles.length);
    ids.forEach(id=>assert.match(id,/^h-[a-z0-9]+(-[a-z0-9]+)*$/,id));
  });
  test("each topic has a title, a summary that ends a sentence, and at least three clean points",()=>{
    topics.forEach(t=>{
      assert.ok(t.title.trim()===t.title&&t.title.length>=4,t.id);
      assert.ok(t.summary.length>=80,t.id+" summary is short");
      assert.match(t.summary,/[.!?”)]$/,t.id);
      assert.ok(Array.isArray(t.points)&&t.points.length>=3,t.id);
      t.points.forEach(p=>{assert.equal(typeof p,"string",t.id);assert.ok(p.trim()===p&&p.length>=6,t.id+": "+JSON.stringify(p));});
      new Set(t.points).size===t.points.length||assert.fail(t.id+" repeats a point");
    });
  });
  test("no text carries markup, doubled spaces or a leaked value",()=>{
    topics.forEach(t=>[t.title,t.summary,t.era||"",t.focus||"",...t.points,...t.links.flatMap(l=>[l.t,l.d])].forEach(s=>{
      assert.doesNotMatch(s,/\s{2}|<\/?[a-z]|\bundefined\b|\bNaN\b|\bnull\b/,t.id+": "+s.slice(0,60));
    }));
  });
});

describe("links",()=>{
  test("every link is a well-formed https address with a title, a kind and a line on what it is",()=>{
    topics.forEach(t=>{
      assert.ok(t.links.length>=3,t.id+" has "+t.links.length+" links");
      t.links.forEach(l=>{
        assert.deepEqual(Object.keys(l).sort(),["d","k","t","u"],t.id);
        const u=new URL(l.u);
        assert.equal(u.protocol,"https:",l.u);assert.doesNotMatch(l.u,/\s/,l.u);assert.ok(u.hostname.includes("."),l.u);
        assert.ok(KINDS.includes(l.k),t.id+": "+l.k);
        assert.ok(l.t.trim()===l.t&&l.t.length>=4,t.id+": "+l.u);
        assert.ok(l.d.trim()===l.d&&l.d.length>=8,t.id+": "+l.u);
      });
    });
  });
  test("a topic never lists the same address twice",()=>{
    topics.forEach(t=>{const u=t.links.map(l=>l.u.replace(/\/$/,""));assert.equal(new Set(u).size,u.length,t.id);});
  });
  test("a YouTube link is filed under Watch or Listen, never as a study or an article",()=>{
    topics.forEach(t=>t.links.forEach(l=>{if(/youtube\.com\/watch|youtu\.be\//.test(l.u))assert.ok(["video","podcast"].includes(l.k),t.id+": "+l.u+" is "+l.k);}));
  });
});

describe("the experts' pages",()=>{
  const experts=topics.filter(t=>t.cat==="Experts & lifters");
  test("each has an era, a focus and at least one person; subject pages carry no people",()=>{
    experts.forEach(t=>{assert.ok(t.era&&t.focus,t.id);assert.ok((t.people||[]).length>=1,t.id);});
    topics.filter(t=>t.cat!=="Experts & lifters").forEach(t=>assert.ok(!t.people,t.id));
  });
  test("dates read as dates, deaths come after births, and the age shown is a sensible number",()=>{
    experts.forEach(t=>t.people.forEach(p=>{
      assert.ok(p.name&&p.from&&p.known,t.id+": "+p.name);
      if(p.born){assert.ok(fmtBioDate(p.born),t.id+" born "+p.born);
        const a=ageText(p.born,p.died,"2026-10-08");assert.match(a,/^(about )?\d+ years old$|^aged (about )?\d+ at death$/,p.name+": "+a);
        const n=+a.match(/\d+/)[0];assert.ok(n>=18&&n<=110,p.name+": "+n);}
      if(p.died){assert.ok(p.born&&fmtBioDate(p.died),p.name);assert.ok(p.died>p.born,p.name);}
    }));
  });
  test("works have a year, a title and a known kind, fall within the person's life, and don't repeat",()=>{
    experts.forEach(t=>t.people.forEach(p=>{
      const born=p.born?+p.born.slice(0,4):null,died=p.died?+p.died.slice(0,4):null;
      (p.works||[]).forEach(w=>{
        assert.ok(Number.isInteger(w.y)&&w.y>=1900&&w.y<=2026,p.name+": "+w.y);
        assert.ok(w.t&&w.t.trim()===w.t,p.name);assert.ok(workKind(w.k),p.name+": "+w.k);
        if(born)assert.ok(w.y>=born+15,p.name+" published at "+(w.y-born));
        if(died)assert.ok(w.y<=died+3,p.name+": "+w.y);
      });
      const keys=(p.works||[]).map(w=>w.t+"|"+w.k);assert.equal(new Set(keys).size,keys.length,p.name);
    }));
  });
});

describe("finding topics",()=>{
  test("healthTopic finds every topic by id and nothing for an unknown one",()=>{
    topics.forEach(t=>assert.equal(healthTopic(t.id).id,t.id));
    for(const x of ["nope","",undefined,null,"H-PROTEIN","h-protein "])assert.equal(healthTopic(x),null,String(x));
  });
  test("the library finds Health topics too, and related topics point somewhere real",()=>{
    topics.forEach(t=>{assert.equal(topicById(t.id).id,t.id);(t.related||[]).forEach(r=>{assert.ok(topicById(r),t.id+" → "+r);assert.notEqual(r,t.id);});});
  });
  test("every marker's Read link, and every path step and video list for Health, opens a real topic",()=>{
    MARKERS.forEach(m=>assert.ok(healthTopic(m.learn),m.id+" → "+m.learn));
    PATHS.forEach(p=>p.ids.filter(id=>id.startsWith("h-")).forEach(id=>assert.ok(healthTopic(id),p.id+" → "+id)));
    Object.keys(VIDEOS).filter(id=>id.startsWith("h-")).forEach(id=>assert.ok(healthTopic(id),"videos → "+id));
  });
  test("every Health id written anywhere in the app's code is a real topic",()=>{
    const root=new URL("../js/",import.meta.url),files=[];
    const walk=dir=>readdirSync(dir,{withFileTypes:true}).forEach(e=>{const u=new URL(e.name+(e.isDirectory()?"/":""),dir);if(e.isDirectory())walk(u);else if(e.name.endsWith(".js")&&e.name!=="health.js")files.push(u);});
    walk(root);
    let n=0;
    files.forEach(f=>{const src=readFileSync(f,"utf8");for(const m of src.matchAll(/["'](h-[a-z0-9-]+)["']/g)){n++;assert.ok(healthTopic(m[1]),f.pathname.split("/js/")[1]+" → "+m[1]);}});
    assert.ok(n>=20,"found "+n+" references");
  });
});
