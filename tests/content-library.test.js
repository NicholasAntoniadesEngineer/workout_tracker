// The Learn library is written by hand, so these check what slips into big hand-written content:
// a missing field, a placeholder left behind, a stray tag or bracket, a date that can't be right,
// a person whose dates differ from one page to the next, a culture file that never got loaded.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {AREAS,topicById} from "../js/library.js";
import {WORLD,PARTS} from "../js/world.js";
import {FILMS} from "../js/films.js";
import {VIDEOS} from "../js/videos.js";
import {VERSES} from "../js/verses.js";
import {fmtBioDate,ageText,bioAge,workKind} from "../js/bio.js";
import {RULES,ruleFor} from "../js/programme.js";

const entries=AREAS.flatMap(([area,,cats])=>cats.flatMap(cat=>cat.topics.map(t=>({area,cat,t}))));
const topics=entries.map(e=>e.t);
const people=topics.flatMap(t=>(t.people||[]).map(p=>({id:t.id,p})));
const TODAY=new Date().toISOString().slice(0,10),YEAR=+TODAY.slice(0,4);
// An empty list passes; anything else fails naming every offending entry.
const none=(list,what)=>assert.deepEqual(list,[],what+":\n  "+list.join("\n  "));

// Every piece of text the library shows, with where it lives.
function texts(){
  const out=[];
  const add=(where,s)=>{if(s!=null)out.push([where,s]);};
  for(const t of topics){
    const at=f=>t.id+"."+f;
    ["title","summary","era","focus","book","edition","subject"].forEach(f=>add(at(f),t[f]));
    (t.points||[]).forEach((p,i)=>add(at("points["+i+"]"),p));
    (t.links||[]).forEach((l,i)=>{add(at("links["+i+"].t"),l.t);add(at("links["+i+"].d"),l.d);});
    (t.days||[]).forEach((d,i)=>{add(at("days["+i+"].name"),d.name);add(at("days["+i+"].note"),d.note);});
    (t.contents||[]).forEach((c,i)=>add(at("contents["+i+"]"),c.t));
    (t.people||[]).forEach((p,i)=>{
      ["name","known","from"].forEach(f=>add(at("people["+i+"]."+f),p[f]));
      (p.works||[]).forEach((w,j)=>add(at("people["+i+"].works["+j+"]"),w.t));
    });
  }
  for(const [src,lib] of [["FILMS",FILMS],["VIDEOS",VIDEOS]])
    for(const [id,list] of Object.entries(lib))list.forEach((f,i)=>{
      add(src+"."+id+"["+i+"].t",f.t);add(src+"."+id+"["+i+"].d",f.d);add(src+"."+id+"["+i+"].ch",f.ch);
    });
  return out;
}
const TEXT=texts();
const offending=re=>TEXT.filter(([,s])=>re.test(s)).map(([w,s])=>w+": "+s.slice(0,100));

describe("Topics",()=>{
  test("every topic in every area has its own id, a plain lower-case slug",()=>{
    const seen=new Map();
    entries.forEach(e=>seen.set(e.t.id,(seen.get(e.t.id)||[]).concat(e.area+" / "+e.cat.cat)));
    none([...seen].filter(([,w])=>w.length>1).map(([id,w])=>id+" in "+w.join(" and ")),"ids used twice");
    none(topics.map(t=>t.id).filter(id=>!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)),"ids that aren't plain slugs");
  });

  test("every topic has a title, a summary, three or more key points and two or more links",()=>{
    const bad=[];
    topics.forEach(t=>{
      if(typeof t.title!=="string"||!t.title.trim())bad.push(t.id+": no title");
      if(typeof t.summary!=="string"||t.summary.length<80)bad.push(t.id+": summary missing or too short");
      else if(!/[.!?”’)]$/.test(t.summary))bad.push(t.id+": summary stops mid-sentence");
      if(!Array.isArray(t.points)||t.points.length<3)bad.push(t.id+": fewer than three points");
      (t.points||[]).forEach((p,i)=>{if(typeof p!=="string"||!p.trim())bad.push(t.id+": empty point "+i);});
      if(!Array.isArray(t.links)||t.links.length<2)bad.push(t.id+": fewer than two links");
      (t.links||[]).forEach((l,i)=>{
        if(!l.t||!l.u||!l.d)bad.push(t.id+": link "+i+" lacks a title, address or description");
        if(!["article","video","podcast","study","guideline"].includes(l.k))bad.push(t.id+": link "+i+" is of unknown kind "+l.k);
      });
    });
    none(bad,"incomplete topics");
  });

  test("a title splits into who and what at most once, with both halves filled, and no two titles match",()=>{
    none(topics.filter(t=>{const p=t.title.split(": ");return p.length>2||p.some(x=>!x.trim());}).map(t=>t.id+": "+t.title),"titles that split badly");
    const seen=new Map();topics.forEach(t=>{const k=t.title.toLowerCase();seen.set(k,(seen.get(k)||[]).concat(t.id));});
    none([...seen.values()].filter(ids=>ids.length>1).map(ids=>ids.join(" and ")),"topics sharing a title");
  });

  test("categories are named, hold topics, and no name repeats across Learn",()=>{
    const names=AREAS.flatMap(a=>a[2].map(c=>c.cat));
    none(names.filter((n,i)=>names.indexOf(n)!==i),"category names used twice");
    none(AREAS.flatMap(a=>a[2].filter(c=>!c.cat||!c.topics.length).map(c=>a[0]+": "+c.cat)),"empty categories");
  });

  test("workout days have a name and exercises, and never list an exercise twice",()=>{
    const bad=[];
    topics.forEach(t=>{
      (t.days||[]).forEach((d,i)=>{
        if(!d.name||!Array.isArray(d.ex)||!d.ex.length)bad.push(t.id+": day "+i+" lacks a name or exercises");
        else if(new Set(d.ex.map(n=>n.toLowerCase())).size!==d.ex.length)bad.push(t.id+" / "+d.name+": repeats an exercise");
        if(d.note!=null&&(typeof d.note!=="string"||!d.note.trim()))bad.push(t.id+" / "+d.name+": empty note");
      });
      const names=(t.days||[]).map(d=>d.name);
      if(new Set(names).size!==names.length)bad.push(t.id+": two days share a name");
      if(t.exercises&&new Set(t.exercises.map(n=>n.toLowerCase())).size!==t.exercises.length)bad.push(t.id+": repeats a signature exercise");
    });
    none(bad,"malformed workout days");
  });
});

describe("Text",()=>{
  test("no placeholder or broken value is shown anywhere",()=>{
    none(TEXT.filter(([,s])=>typeof s!=="string"||!s.trim()).map(([w,s])=>w+" = "+JSON.stringify(s)),"empty or non-text fields");
    none(offending(/\bundefined\b|\bnull\b|\[object |\blorem\b|\bipsum\b/i),"placeholder words");
    none(offending(/\bNaN\b|\bTODO\b|\bTBD\b|\bFIXME\b/),"placeholder words");
  });

  test("text is plain: no HTML tags or entities, and no markdown, since the app escapes it as written",()=>{
    none(offending(/<\/?[a-z][^>]*>|&[a-z]+;|&#x?[0-9a-f]+;/i),"HTML in text");
    none(offending(/\*\*|__|\]\(|`|^#{1,6} |^\s*[-*+] /),"markdown in text");
  });

  test("brackets and double quotes open and close",()=>{
    const balanced=(s,o,c)=>{let d=0;for(const ch of s){if(ch===o)d++;else if(ch===c&&--d<0)return false;}return d===0;};
    none(TEXT.filter(([,s])=>!balanced(s,"(",")")||!balanced(s,"[","]")||!balanced(s,"“","”")||(s.match(/"/g)||[]).length%2)
      .map(([w,s])=>w+": "+s),"unbalanced brackets or quotes");
  });

  test("no stray spaces or accidentally doubled small words",()=>{
    none(TEXT.filter(([,s])=>s!==s.trim()||/[\n\t]/.test(s)).map(([w,s])=>w+": "+JSON.stringify(s)),"untrimmed text");
    none(offending(/ [,.;:!?](\s|$)/),"a space before punctuation");
    none(offending(/\b(the|a|an|of|to|in|and|is|on|for|with|at|by|as|it)\s+\1\b/i),"doubled words");
  });

  test("the owner's rule: the word mainstream never appears in the app's text",()=>{
    const root=new URL("../",import.meta.url);
    const files=readdirSync(new URL("js/",root),{recursive:true}).filter(f=>/\.js$/.test(f)).map(f=>"js/"+f)
      .concat(["index.html","manifest.webmanifest"]);
    assert.ok(files.length>100,"found the app's files");
    const hits=[];
    files.forEach(f=>readFileSync(new URL(f,root),"utf8").split("\n").forEach((line,i)=>{
      if(/\bmainstream\b/i.test(line))hits.push(f+":"+(i+1));
    }));
    none(hits,"lines using the word");
  });
});

describe("People",()=>{
  test("every person has a name and a line on what they're known for",()=>{
    none(people.filter(({p})=>!p.name||!p.name.trim()||!p.known||!p.known.trim()).map(({id,p})=>id+": "+JSON.stringify(p).slice(0,80)),"people without a name or known-for");
  });

  test("dates are a real day or a year, born before died, nothing in the future, nobody over 110",()=>{
    const real=d=>{const m=/^(\d{4})(?:-(\d{2})-(\d{2}))?$/.exec(d);if(!m)return false;if(!m[2])return true;
      const x=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return x.getUTCMonth()===+m[2]-1&&x.getUTCDate()===+m[3];};
    const bad=[];
    people.forEach(({id,p})=>{
      const who=id+" / "+p.name;
      for(const f of ["born","died"])if(p[f]!=null){
        // Bios reach back to the Mongol and Persian middle ages.
        if(!real(p[f]))bad.push(who+": "+f+" "+p[f]+" is not YYYY or YYYY-MM-DD");
        else if(+p[f].slice(0,4)<1000||p[f]>TODAY)bad.push(who+": "+f+" "+p[f]+" is out of range");
      }
      if(p.born&&p.died&&p.died.slice(0,p.born.length)<p.born)bad.push(who+": died before born");
      const a=p.born&&bioAge(p.born,p.died);
      if(a&&(a.age<10||a.age>110))bad.push(who+": age "+a.age);
    });
    none(bad,"impossible dates");
  });

  test("a bio's dates and age read cleanly",()=>{
    const bad=[];
    people.forEach(({id,p})=>{
      const check=s=>{if(!s||/NaN|undefined/.test(s))bad.push(id+" / "+p.name+": "+JSON.stringify(s));};
      if(p.born){check(fmtBioDate(p.born));check(ageText(p.born,p.died));}
      if(p.died)check(fmtBioDate(p.died));
    });
    none(bad,"bios that render blank or broken");
  });

  test("works have a title, a year from 1800 to now, after the person's childhood, and a kind the app can label",()=>{
    const bad=[];
    people.forEach(({id,p})=>(p.works||[]).forEach(w=>{
      const who=id+" / "+p.name+" / "+w.t;
      if(!w.t)bad.push(who+": no title");
      if(!Number.isInteger(w.y)||w.y<1800||w.y>YEAR)bad.push(who+": year "+w.y);
      if(p.born&&w.y<+p.born.slice(0,4)+10)bad.push(who+": "+w.y+" is before they were ten");
      if(!workKind(w.k))bad.push(who+": kind "+w.k+" has no label");
    }));
    none(bad,"odd works");
  });

  test("someone who appears in several topics has the same birth and death dates in each",()=>{
    const key=n=>n.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
    const by=new Map();
    people.forEach(x=>by.set(key(x.p.name),(by.get(key(x.p.name))||[]).concat(x)));
    const bad=[];
    by.forEach(list=>{
      const sig=x=>"born "+(x.p.born||"(none)")+", died "+(x.p.died||"(none)");
      if(new Set(list.map(sig)).size>1)bad.push(list[0].p.name+": "+list.map(x=>x.id+" has "+sig(x)).join("; "));
    });
    none(bad,"people whose dates differ between topics");
  });
});

describe("World, Books, verses and programmes",()=>{
  test("every js/world-*.js culture is loaded into World with all its topics",async()=>{
    const files=readdirSync(new URL("../js/",import.meta.url)).filter(f=>/^world-.+\.js$/.test(f));
    assert.ok(files.length>=20,"found the culture files");
    const bad=[];
    for(const f of files){
      const mod=await import("../js/"+f);
      const cultures=Object.values(mod).filter(v=>v&&v.cat&&Array.isArray(v.topics));
      if(!cultures.length)bad.push(f+": exports no culture");
      cultures.forEach(c=>{
        const w=WORLD.find(x=>x.cat===c.cat);
        if(!w)bad.push(f+": "+c.cat+" is not in World");
        else c.topics.forEach(t=>{if(!w.topics.includes(t))bad.push(f+": "+t.id+" is missing from World");});
      });
    }
    none(bad,"culture files not wired in");
  });

  test("a culture's topics carry its own id prefix, so none sits in the wrong culture",()=>{
    const bad=[];
    WORLD.forEach(c=>{
      const pre=new Set(c.topics.map(t=>t.id.split("-")[0]));
      // Russia merges its training (su-) and nutrition (hsu-) modules.
      const allowed=c.cat==="Russia & former USSR"?2:1;
      if(pre.size>allowed)bad.push(c.cat+": "+[...pre].join(", "));
    });
    none(bad,"cultures mixing prefixes");
  });

  test("parts marked by hand are known parts",()=>{
    const keys=PARTS.map(p=>p[0]);
    none(topics.filter(t=>t.part!=null&&!keys.includes(t.part)).map(t=>t.id+": "+t.part),"unknown parts");
  });

  test("eras name years up to now, earliest first",()=>{
    const bad=[];
    topics.filter(t=>t.era!=null).forEach(t=>{
      const ys=(String(t.era).match(/\d{4}/g)||[]).map(Number);
      if(ys.some(y=>y<1000||y>YEAR))bad.push(t.id+": "+t.era);
      for(let i=1;i<ys.length;i++)if(ys[i]<ys[i-1])bad.push(t.id+": "+t.era+" runs backwards");
    });
    none(bad,"odd eras");
  });

  test("each book has a subject, an edition, chapters and an image count, under an author A–Z by surname",()=>{
    const bad=[];
    AREAS.find(a=>a[0]==="books")[2].forEach(c=>{
      if(!c.sort||c.cat.indexOf(c.sort)<0)bad.push(c.cat+": sort key "+c.sort+" is not part of the name");
      c.topics.forEach(t=>{
        if(!t.book||!t.subject||!t.edition)bad.push(t.id+": lacks book, subject or edition");
        if(!Number.isInteger(t.images)||t.images<0)bad.push(t.id+": images "+t.images);
        if(!Array.isArray(t.from))bad.push(t.id+": no author topics list");
        (t.contents||[]).forEach((x,i)=>{if(!x.t||!x.t.trim())bad.push(t.id+": chapter "+i+" has no title");});
      });
    });
    const keys=topics.filter(t=>t.book).map(t=>t.book);
    none(keys.filter((k,i)=>keys.indexOf(k)!==i).map(k=>"book key "+k+" used twice"),"book keys");
    none(bad,"incomplete books");
  });

  test("every verse has a proper reference, read once, in both translations",()=>{
    const NT=["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians",
      "Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews",
      "James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];
    const bad=[];
    VERSES.forEach(v=>{
      const m=/^(.+) (\d+):(\d+)(?:-(\d+))?$/.exec(v.ref||"");
      if(!m||!NT.includes(m[1]))bad.push(v.ref+": not a New Testament reference");
      else if(m[4]&&+m[4]<=+m[3])bad.push(v.ref+": range runs backwards");
      if(!v.web||!v.web.trim()||!v.kjv||!v.kjv.trim())bad.push(v.ref+": a translation is missing");
    });
    const refs=VERSES.map(v=>v.ref);
    none(refs.filter((r,i)=>refs.indexOf(r)!==i).map(r=>r+" twice"),"repeated verses");
    none(bad,"malformed verses");
  });

  test("5/3/1 has four weeks of three rising sets, and the Wendler topic opens each day on a main lift",()=>{
    const r=RULES["531"];
    assert.equal(r.weeks.length,r.weekLabels.length);
    r.weeks.forEach((w,i)=>{
      assert.equal(w.length,3,r.weekLabels[i]);
      w.forEach(([pct,reps])=>{assert.ok(pct>0&&pct<1,r.weekLabels[i]);assert.match(reps,/^\d\+?$/);});
      assert.ok(w[0][0]<w[1][0]&&w[1][0]<w[2][0],r.weekLabels[i]+" rises");
    });
    const tp=topicById("wendler");
    assert.equal(ruleFor(tp),"531");
    assert.deepEqual(tp.days.map(d=>d.ex[0]).sort(),["Bench press","Deadlift","Shoulder press","Squats"]);
  });
});
