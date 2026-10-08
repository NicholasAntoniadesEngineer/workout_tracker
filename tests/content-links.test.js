// Every way the library points somewhere: from one topic to another, to a book's author, along a
// reading path, out to the web, to a film or a video, and back in through a shared link or an
// address. Each must lead to something real, and arrive where it was meant to.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {AREAS,topicById,booksFrom} from "../js/library.js";
import {PATHS} from "../js/paths.js";
import {FILMS,filmsFor,filmKey} from "../js/films.js";
import {VIDEOS} from "../js/videos.js";
import {parseRoute,routeOf} from "../js/route.js";
// The app's storage listens for other windows on a BroadcastChannel, and an open channel keeps
// Node running after the tests end. A test has no other windows, so it goes without one.
delete globalThis.BroadcastChannel;
const {learnLink,learnLinkId}=await import("../js/share.js");
const {state}=await import("../js/store.js");
const {learnView}=await import("../js/views/learn.js");

const topics=AREAS.flatMap(a=>a[2].flatMap(c=>c.topics));
const YEAR=new Date().getFullYear();
const none=(list,what)=>assert.deepEqual(list,[],what+":\n  "+list.join("\n  "));
// Every web address in the library, with the topic it sits on.
const urls=topics.flatMap(t=>(t.links||[]).map(l=>({id:t.id,u:l.u}))
  .concat(t.scan?[{id:t.id,u:t.scan.u},{id:t.id,u:t.scan.page.replace("{page}","1")}]:[]));

describe("Links inside Learn",()=>{
  test("every related topic is real, not the topic itself, and listed once",()=>{
    const bad=[];
    topics.forEach(t=>(t.related||[]).forEach((r,i,all)=>{
      if(!topicById(r))bad.push(t.id+" → "+r+" doesn't exist");
      if(r===t.id)bad.push(t.id+" relates to itself");
      if(all.indexOf(r)!==i)bad.push(t.id+" → "+r+" twice");
    }));
    none(bad,"broken related topics");
  });

  test("every book names real author topics, and each author's page lists the book back",()=>{
    const bad=[];
    topics.filter(t=>t.book).forEach(t=>(t.from||[]).forEach(id=>{
      const a=topicById(id);
      if(!a)bad.push(t.id+" → "+id+" doesn't exist");
      else if(a.book)bad.push(t.id+" → "+id+" is a book, not an author topic");
      else if(!booksFrom(id).includes(t))bad.push(id+" doesn't list "+t.id);
    }));
    none(bad,"broken book authors");
  });

  test("reading paths have their own ids, a name and a note, and every step is a real topic",()=>{
    const ids=PATHS.map(p=>p.id);
    none(ids.filter((x,i)=>ids.indexOf(x)!==i),"path ids used twice");
    none(PATHS.filter(p=>!p.name||!p.note).map(p=>p.id),"paths without a name or note");
    none(PATHS.flatMap(p=>p.ids.filter(id=>!topicById(id)).map(id=>p.id+" → "+id)),"path steps that don't exist");
  });

  test("films and videos hang on real topics, and no topic lists the same one twice",()=>{
    none(Object.keys(FILMS).concat(Object.keys(VIDEOS)).filter(id=>!topicById(id)),"film or video topics that don't exist");
    none(topics.flatMap(t=>{const k=filmsFor(t.id).map(filmKey);return k.filter((x,i)=>k.indexOf(x)!==i).map(x=>t.id+": "+x);}),"films listed twice on a topic");
  });
});

describe("Links out to the web",()=>{
  test("every address is well formed: a real host, and no space, quote or bracket in it",()=>{
    const bad=urls.filter(({u})=>{
      if(typeof u!=="string"||/[\s"<>\\]/.test(u))return true;
      try{const p=new URL(u);return !/^https?:$/.test(p.protocol)||!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(p.hostname);}catch(e){return true;}
    });
    none(bad.map(x=>x.id+": "+x.u),"malformed addresses");
    const page=topics.filter(t=>t.scan).filter(t=>t.scan.page.split("{page}").length!==2);
    none(page.map(t=>t.id),"scan page patterns without one {page}");
  });

  // These sites don't serve https at all (checked 8 October 2026); everything else must.
  const NO_HTTPS=["odysseus.culture.gr","sportlegend.kulichki.net","sportlib.su","www.chidlovski.net","www.china.org.cn","www.chinwoo.com","www.healthandstrength.org.uk","www.ibhof.com","www.tlahui.com"];
  test("every address uses https, apart from the few sites that have none",()=>{
    none(urls.filter(({u})=>!/^https:\/\//.test(u)&&!NO_HTTPS.includes(u.split("/")[2])).map(x=>x.id+": "+x.u),"addresses that aren't https");
  });

  test("a topic never lists the same address twice",()=>{
    const norm=u=>u.replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,"");
    none(topics.flatMap(t=>{const u=(t.links||[]).map(l=>norm(l.u));return u.filter((x,i)=>u.indexOf(x)!==i).map(x=>t.id+": "+x);}),"repeated addresses");
  });

  test("YouTube links carry a well-formed video id",()=>{
    const ID=/^[A-Za-z0-9_-]{11}$/;
    const bad=urls.filter(({u})=>/(^|\.)(youtube\.com|youtu\.be)$/.test(new URL(u).hostname)).filter(({u})=>{
      const p=new URL(u);
      if(p.hostname==="youtu.be")return !ID.test(p.pathname.slice(1));
      if(p.pathname==="/watch")return !ID.test(p.searchParams.get("v")||"");
      const m=/^\/(embed|shorts|live)\/([^/]+)/.exec(p.pathname);
      if(m)return !ID.test(m[2]);
      if(p.pathname==="/playlist")return !p.searchParams.get("list");
      return false;   // a channel or a search
    });
    none(bad.map(x=>x.id+": "+x.u),"YouTube links with a broken id");
  });

  test("Internet Archive films and books have plain identifiers; films are old enough to be public domain",()=>{
    const IA=/^[A-Za-z0-9._-]+$/;
    const bad=[];
    topics.filter(t=>t.ia!=null).forEach(t=>{if(!IA.test(t.ia))bad.push(t.id+": "+t.ia);});
    Object.entries(FILMS).forEach(([id,list])=>list.forEach(f=>{
      if(!IA.test(f.ia||""))bad.push(id+": film id "+f.ia);
      if(!f.t||!f.d)bad.push(id+" / "+f.ia+": no title or description");
      if(!Number.isInteger(f.y)||f.y<1880||f.y>1963)bad.push(id+" / "+f.ia+": year "+f.y);
      if(!(f.min>0&&f.min<300))bad.push(id+" / "+f.ia+": length "+f.min);
    }));
    none(bad,"odd films");
  });

  test("every video is a YouTube id with its channel, year and running time",()=>{
    const bad=[];
    Object.entries(VIDEOS).forEach(([id,list])=>list.forEach(v=>{
      const who=id+" / "+v.yt+" ("+v.t+")";
      if(!/^[A-Za-z0-9_-]{11}$/.test(v.yt||""))bad.push(who+": id");
      if(!v.t||!v.ch||!v.d)bad.push(who+": no title, channel or description");
      // YouTube opened in 2005.
      if(!Number.isInteger(v.y)||v.y<2005||v.y>YEAR)bad.push(who+": year "+v.y);
      if(!(v.min>0&&v.min<600))bad.push(who+": length "+v.min);
    }));
    none(bad,"videos missing details");
  });
});

describe("Links back in",()=>{
  test("every topic's shared link opens that topic",()=>{
    none(topics.filter(t=>encodeURIComponent(t.id)!==t.id||learnLinkId(new URL(learnLink(t.id)).hash)!==t.id).map(t=>t.id),"topics whose link doesn't open them");
  });

  test("every topic, category and index has an address that leads back to it",()=>{
    const bad=[];
    topics.forEach(t=>{const r=parseRoute(routeOf({view:"learn",learnOpen:t.id}));if(!r||r.learnOpen!==t.id)bad.push(t.id);});
    AREAS.forEach(([area,,cats])=>cats.forEach(c=>{
      const r=parseRoute(routeOf({view:"learn",learnArea:area,learnCat:c.cat}));
      if(!r||r.learnArea!==area||r.learnCat!==c.cat)bad.push(area+" / "+c.cat);
    }));
    ["paths","saved","recent","people"].forEach(k=>{const r=parseRoute(routeOf({view:"learn",learnIndex:k}));if(r.learnIndex!==k)bad.push("index "+k);});
    none(bad,"addresses that don't lead back");
  });

  test("on a topic's Read & watch tab, every link opens the address the library gives it",()=>{
    const unesc=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
    const bad=[];
    Object.assign(state,{learnIndex:null,learnTab:"links",filmOpen:null});
    topics.forEach(t=>{
      state.learnOpen=t.id;
      const shown=[...learnView().matchAll(/<a class='llink' href='([^']*)'/g)].map(m=>unesc(m[1]));
      (t.links||[]).forEach(l=>{if(!shown.includes(l.u))bad.push(t.id+": "+l.u+(shown.length?"":" (tab shows no links)"));});
    });
    state.learnOpen=null;state.learnTab=null;
    none(bad,"links that open somewhere else");
  });
});
