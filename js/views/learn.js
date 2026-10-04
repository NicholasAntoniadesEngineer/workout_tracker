// Learn: short, plain-words summaries of how training works, each pointing out to the
// research, guidelines and videos behind it. The summaries are written for KingsKiln; the
// links go to the original publishers, so nothing of theirs is copied into the app.
// Calm and tiled: Learn's home is a grid of categories, a category is one page of people and
// topics, and a topic opens as its own page, so nothing jumps in place.
import {AREAS,areaCats,booksFrom,catOfTopic,relatedFor,topicById} from "../library.js";
import {bookPos,scanEmbed,scanLink} from "../reader.js";
import {filmEmbed,filmKey,filmPage,filmsFor} from "../films.js";
import {followCard} from "./programme.js";
import {PARTS,partOf} from "../world.js";
import {state} from "../store.js";
import {icon} from "../icons.js";
import {ageText,fmtBioDate,workKind} from "../bio.js";
import {esc} from "./common.js";

// Short tab names for the categories, in the order the library lists them.
const SHORT={"Lifters & methods":"Lifters","Training principles":"Principles","Workout types":"Workouts",
  "Joints & resilience":"Joints",
  "Experts & lifters":"People","Sleep & recovery":"Sleep","Kenya & Ethiopia":"Kenya & Ethiopia"};
const tabName=c=>SHORT[c]||c.split(" & ")[0];
const GROUPS=[["Read",["article"]],["Watch",["video"]],["Listen",["podcast"]],["Research",["study","guideline"]]];


// "Arnold Schwarzenegger: high-volume splits" → the person, then the method.
function splitTitle(t){
  const i=t.indexOf(": ");
  return i>0?[t.slice(0,i),t.slice(i+2)]:[t,""];
}

// Each category's icon on the Learn home grid.
const CAT_ICON={"Joints & resilience":"joint","Lifters & methods":"people",
  "Training principles":"target","Workout types":"dumbbell","Experts & lifters":"people","Food & fuel":"bowl",
  "Hydration":"drop","Sleep & recovery":"moon","Supplements":"pill"};
const isBooks=c=>c.topics.some(t=>t.book);

const isPeople=c=>c.cat==="Lifters & methods"||c.topics.some(t=>(t.era||t.focus)&&!t.book);

// A person's badge: their initials in the app's one accent colour — no photos of anyone.
function avatar(name){
  const words=name.replace(/[^A-Za-z& ]/g," ").split(/\s+/).filter(w=>w&&w!=="&");
  const ini=(words[0]?words[0][0]:"")+(words.length>1?words[words.length-1][0]:"");
  return "<span class='lav'>"+esc(ini.toUpperCase())+"</span>";
}

// Everything a category search can match on: title, summary, key points, exercises, people.
function searchText(tp){
  return (tp.title+" "+tp.summary+" "+(tp.points||[]).join(" ")+" "+(tp.exercises||[]).join(" ")+" "+
    (tp.people||[]).map(p=>p.name).join(" ")).toLowerCase();
}

function topicRows(topics,showCat){
  return "<div class='llist'>"+topics.map(tp=>{
    const c=showCat?catOfTopic(tp.id):null;
    return "<button class='lrow' data-learn='"+esc(tp.id)+"' data-find=\""+esc(searchText(tp))+"\"><span class='lt'>"+esc(tp.title)+"</span>"+
      (c?"<span class='lpre'>"+esc(c.cat)+"</span>":"")+"<span class='lchev'>&rsaquo;</span></button>";
  }).join("")+"</div>";
}

// A book on a shelf: a plain cover — title, author, year — in the app's colours.
function bookTile(tp){
  const t=splitTitle(tp.title);
  return "<button class='lsc lbk' data-learn='"+esc(tp.id)+"' data-find=\""+esc(searchText(tp))+"\"><span class='lbkc'><span class='lbkt'>"+esc(t[1]||t[0])+"</span>"+
    "<span class='lbka'>"+esc(tp.subject||"")+"</span><span class='lbky mono'>"+esc(tp.era||"")+"</span></span></button>";
}

// The featured story: drawn from every topic in the area — people and subjects alike — in a
// shuffled order that is new each year, stepping on one each day. Next skips ahead.
function hashOf(s){let n=2166136261;for(const ch of s)n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;return n;}
function featured(cats){
  const d=new Date(),day=Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);
  const all=[].concat(...cats.map(c=>c.topics))
    .sort((a,b)=>hashOf(a.id+d.getFullYear())-hashOf(b.id+d.getFullYear()));
  if(!all.length)return null;
  return all[(day+(state.featureShift||0))%all.length];
}

// Each culture's badge: a short country code in a gold ring.
const CODE={"Ancient Greece & Rome":"GR","Australia":"AU","Brazil":"BR","Bulgaria":"BG","China":"CN","Cuba":"CU",
  "Georgia & Caucasus":"GE","India":"IN","Iran":"IR","Jamaica":"JM","Japan":"JP","Kenya & Ethiopia":"KE","Korea":"KR",
  "Mexico":"MX","Mongolia":"MN","New Zealand & Pacific":"NZ","Nordic & Celtic":"NC","Russia & former USSR":"RU",
  "South Africa":"ZA","Turkey":"TR","United Kingdom":"UK","United States":"US"};
// An author's badge: their initials, like a country's code.
function initials(name){
  const w=name.split(" & ")[0].replace(/[^A-Za-zÀ-ÿ ]/g," ").split(/\s+/).filter(Boolean);
  return (w.length>1?w[0][0]+w[w.length-1][0]:w[0].slice(0,2)).toUpperCase();
}
function badge(c,big){
  const inner=c.region?esc(CODE[c.cat]||c.cat.slice(0,2).toUpperCase()):isBooks(c)?esc(initials(c.cat)):icon(CAT_ICON[c.cat]||"book","sm");
  return "<span class='lring"+(big?" big":"")+"'>"+inner+"</span>";
}
const plural=(n,w)=>n+" "+w+(n===1?"":"s");
function catStats(c){
  if(isBooks(c))return plural(c.topics.length,"book")+" &middot; "+esc(subjects(c));
  const w=c.topics.reduce((a,t)=>a+(t.days?t.days.length:0),0),l=c.topics.reduce((a,t)=>a+(t.links||[]).length,0);
  return [plural(c.topics.length,"topic")].concat(w?[plural(w,"workout")]:[]).concat(l?[plural(l,"link")]:[]).join(" &middot; ");
}
const subjects=c=>[...new Set(c.topics.map(t=>t.subject).filter(Boolean))].join(", ");
// A category on Learn's home: its badge, its name, and where it is or how much is in it.
function tile(c){
  const sub=isBooks(c)?plural(c.topics.length,"book")+" &middot; "+esc(subjects(c)):
    (c.region?esc(c.region)+" &middot; ":"")+plural(c.topics.length,"topic");
  return "<button class='ltile' data-learncat=\""+esc(c.cat)+"\">"+badge(c)+
    "<span class='ltilen'>"+esc(c.cat)+"</span><span class='ltiles2'>"+sub+"</span></button>";
}

// What sits under the search on Learn's home: search hits while something is typed, else the
// featured story and the shelves. Typing repaints only this part, so the box keeps its
// keyboard and caret.
export function learnHomeBody(){
  const area=state.learnArea||"training",cats=areaCats(area);
  const q=(state.learnQuery||"").trim().toLowerCase();
  if(q){
    // Search covers all of Learn — Training, Health, World and Books — titles first, then the rest.
    const strip=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const nq=strip(q),first=[],rest=[];
    AREAS.forEach(a=>a[2].forEach(c=>c.topics.forEach(tp=>{
      const who=(tp.people||[]).map(p=>p.name+" "+(p.known||"")).join(" ");
      const text=strip(tp.title+" "+tp.summary+" "+(tp.points||[]).join(" ")+" "+(tp.exercises||[]).join(" ")+" "+who);
      const where=a[1]+" · "+c.cat;
      if(strip(tp.title).indexOf(nq)>=0)first.push({tp,where});
      else if(text.indexOf(nq)>=0)rest.push({tp,where});
    })));
    const hits=first.concat(rest);
    return hits.length?"<div class='llabel'>"+plural(hits.length,"result")+" across Learn</div><div class='lwrows'>"+hits.slice(0,80).map(x=>
      "<button class='lwrow' data-learn='"+esc(x.tp.id)+"'><span class='lalso'><span class='lwrt'>"+esc(x.tp.title)+"</span>"+
      "<span class='lalsow'>"+esc(x.where)+"</span></span><span class='lchev'>&rsaquo;</span></button>").join("")+"</div>":
      "<div class='empty-note'>Nothing matches &ldquo;"+esc(state.learnQuery)+"&rdquo;.</div>";
  }
  let h="";
  const f=featured(cats);
  if(f){
    const t=splitTitle(f.title),c=catOfTopic(f.id),n=f.days?f.days.length:0;
    h+="<div class='lfeat'>"+
      "<div class='lfeattop'><span class='lfeate'><span class='lgdot'></span>Featured &middot; "+esc(c?tabName(c.cat):"")+"</span>"+
        "<button class='lfeatnext' data-featurenext='1' aria-label='Show another'>Next &rsaquo;</button></div>"+
      "<button class='lfeatbody' data-learn='"+esc(f.id)+"'>"+
        "<span class='lfeatn'>"+esc(t[0])+"</span><span class='lfeatm'>"+esc(t[1]||(f.points&&f.points[0])||"")+"</span>"+
        "<span class='lfeatcta'>"+(n?"Read and train":"Read")+" &rsaquo;</span></button></div>";
  }
  if(area==="books"){
    // Authors A–Z by surname, as tiles like World's cultures; an author's page holds their books.
    h+="<div class='llabel'>"+cats.length+" authors &middot; A&ndash;Z</div><div class='ltiles'>"+cats.map(tile).join("")+"</div>";
  }else{
    h+="<div class='llabel'>"+(area==="world"?cats.length+" cultures &middot; A&ndash;Z":cats.length+" categories")+"</div>"+
      "<div class='ltiles'>"+cats.map(tile).join("")+"</div>";
  }
  return h+(area==="books"?
    "<p class='learnnote'>Public-domain books, read as the original printed pages "+
      "from the Internet Archive. General education, not medical advice.</p>":
    "<p class='learnnote'>Summaries written for KingsKiln; links go to the original articles and videos. "+
      "General education, not medical advice.</p>");
}

function searchBox(id,placeholder,value){
  return "<div class='searchrow lsearch'><span class='lsicon'>"+icon("search","sm")+"</span>"+
    "<input class='searchin' id='"+id+"' type='search' enterkeyhint='search' placeholder='"+placeholder+
    "' autocomplete='off' autocorrect='off' value='"+esc(value||"")+"'></div>";
}

// Learn home, magazine-style: a big title, Training or Health, an always-there search, then
// today's featured story and a swipeable shelf per category.
function homeView(area){
  const open=state.learnSearchOpen||!!state.learnQuery;
  return "<div class='wrap scroll lhome'>"+
    "<div class='lmasthead'><button class='backbtn' id='backbtn'>"+icon("back","sm")+"Back</button>"+
      "<button class='lsearchbtn' id='learnsearchbtn' aria-label='Search'>"+icon("search","sm")+"</button></div>"+
    "<div class='lbigtitle'>Learn</div>"+
    (AREAS.length<2?"":"<div class='lseg'>"+AREAS.map(a=>"<button class='lsegb"+(a[0]===area?" on":"")+
      "' data-learnarea='"+a[0]+"'>"+a[1]+"</button>").join("")+"</div>")+
    (open?searchBox("learnsearch","Search all of Learn",state.learnQuery):"")+
    "<div id='learnbody'>"+learnHomeBody()+"</div></div>";
}

// One category, calm and on one page: its badge and name, what's in it, then its people as
// compact cards and its other topics as rows that show how many workouts each holds. A culture
// adds chips to narrow to one part — athletes, methods, food, history. Swipe for the next one.
function personCards(topics){
  return "<div class='lpcards'>"+topics.map(tp=>{
    const t=splitTitle(tp.title);
    return "<button class='lpcard' data-learn='"+esc(tp.id)+"'>"+avatar(t[0])+
      "<span class='lpcb'><span class='lpcn'>"+esc(t[0])+"</span><span class='lpcm'>"+esc(t[1]||tp.focus||"")+"</span></span></button>";
  }).join("")+"</div>";
}
function workRows(topics){
  return "<div class='lwrows'>"+topics.map(tp=>{
    const n=tp.days?tp.days.length:0;
    return "<button class='lwrow' data-learn='"+esc(tp.id)+"'><span class='lwrt'>"+esc(tp.title)+"</span>"+
      (n?"<span class='lwbadge'>"+plural(n,"workout")+"</span>":"")+"<span class='lchev'>&rsaquo;</span></button>";
  }).join("")+"</div>";
}
function categoryView(area,cats,cur){
  const areaName=(AREAS.find(a=>a[0]===area)||["","Learn"])[1];
  let h="<div class='wrap scroll lcatpage'><button class='backbtn' id='backbtn'>"+icon("back","sm")+esc(areaName)+"</button>"+
    "<div class='lcathead'>"+badge(cur,true)+"<div class='lcatt'><span class='leyebrow'>"+esc(cur.region||areaName)+"</span>"+
      "<span class='lcatn'>"+esc(cur.cat)+"</span></div></div>"+
    "<div class='lcatstats'>"+catStats(cur)+"</div>";
  if(cur.region){
    const parts=PARTS.filter(([key])=>cur.topics.some(tp=>partOf(tp)===key));
    const on=state.learnPartCat===cur.cat&&parts.some(p=>p[0]===state.learnPart)?state.learnPart:null;
    h+="<div class='lchips'><button class='lchip"+(on?"":" on")+"' data-learnpart=''>All</button>"+
      parts.map(([key,label])=>"<button class='lchip"+(on===key?" on":"")+"' data-learnpart='"+key+"'>"+label+"</button>").join("")+"</div>";
    parts.filter(([key])=>!on||on===key).forEach(([key,label])=>{
      const list=cur.topics.filter(tp=>partOf(tp)===key);
      h+="<div class='llabel'>"+label+"</div>"+(key==="people"?personCards(list):workRows(list));
    });
  }else if(isBooks(cur))h+="<div class='lbooks'>"+cur.topics.slice().sort((a,b)=>String(a.era).localeCompare(String(b.era))).map(bookTile).join("")+"</div>";
  else h+=isPeople(cur)?personCards(cur.topics):workRows(cur.topics);
  return h+"</div>";
}

function listView(){
  const area=state.learnArea||"training",cats=areaCats(area);
  const cur=cats.find(c=>c.cat===state.learnCat)||null;
  return cur?categoryView(area,cats,cur):homeView(area);
}

// Who they are, in brief: born (and died), age, where from, what they're known for, and
// what they've published — newest first.
function aboutPeople(people){
  return "<div class='picklbl'>About</div>"+people.map(p=>{
    const works=(p.works||[]).slice().sort((a,b)=>(b.y||0)-(a.y||0));
    return "<div class='lbio'><div class='lbiohead'>"+avatar(p.name)+"<div class='lbion'><span class='lbionm'>"+esc(p.name)+"</span>"+
      (p.known?"<span class='lbiok'>"+esc(p.known)+"</span>":"")+"</div></div>"+
      "<div class='lbiofacts'>"+
        (p.born?"<div><span>Born</span>"+esc(fmtBioDate(p.born))+(p.from?" &middot; "+esc(p.from):"")+"</div>":
          (p.from?"<div><span>From</span>"+esc(p.from)+"</div>":""))+
        (p.died?"<div><span>Died</span>"+esc(fmtBioDate(p.died))+"</div>":"")+
        (p.born?"<div><span>Age</span>"+esc(ageText(p.born,p.died))+"</div>":"")+
      "</div>"+
      (works.length?"<div class='lworks'>"+works.map(w=>"<div class='lwork'><span class='lwy mono'>"+esc(w.y||"")+"</span>"+
        "<span class='lwt'>"+esc(w.t)+"</span>"+(workKind(w.k)?"<span class='lwk'>"+workKind(w.k)+"</span>":"")+"</div>").join("")+"</div>":"")+
      "</div>";
  }).join("");
}

// A topic: a quiet header with where it sits, who or what it is and how much it holds, then
// Overview · Train · Read & watch, so the page never gets long and text-heavy.
function topicView(tp){
  const t=splitTitle(tp.title),cat=catOfTopic(tp.id);
  const nd=tp.days?tp.days.length:0,nl=(tp.links||[]).length,ne=tp.exercises?tp.exercises.length:0;
  if(tp.ia&&state.learnTab==="read"&&state.bookFor===tp.book&&state.bookCh!=null)return scanView(tp);
  const tabs=[["overview","Overview"]].concat(tp.book?[["read","Read"]]:[]).concat(nd?[["workouts","Train"]]:[])
    .concat(nl?[["links",tp.book?"Links":"Read &amp; watch"]]:[]);
  const tab=tabs.some(x=>x[0]===state.learnTab)?state.learnTab:"overview";
  const part=cat&&cat.region?(PARTS.find(p=>p[0]===partOf(tp))||[])[1]:null;
  const eyebrow=cat&&cat.region?[cat.cat,part]:[cat?tabName(cat.cat):"",tp.era];
  const stats=[[nd,"workout"],[ne,"exercise"],[tp.contents?tp.contents.length:0,"chapter"],[nl,"link"]].filter(x=>x[0]).slice(0,3);
  let h="<div class='wrap scroll ltopicwrap'><div class='lhead'>"+
    "<button class='backbtn' id='backbtn'>"+icon("back","sm")+esc(cat?tabName(cat.cat):"Learn")+"</button>"+
    "<div class='leyebrow'>"+esc(eyebrow.filter(Boolean).join(" · "))+"</div>"+
    "<div class='lheadn'>"+esc(t[0])+"</div>"+((t[1]||tp.focus)?"<div class='lheadm'>"+esc(t[1]||tp.focus)+"</div>":"")+"</div>"+
    (stats.length?"<div class='lstats'>"+stats.map(x=>"<div class='lstat'><span class='lstatv'>"+x[0]+"</span><span class='lstatl'>"+
      x[1]+(x[0]===1?"":"s")+"</span></div>").join("")+"</div>":"")+
    "<div class='ltopic'>";
  if(tabs.length>1)
    h+="<div class='lseg'>"+tabs.map(x=>"<button class='lsegb"+(x[0]===tab?" on":"")+"' data-learntab='"+x[0]+"'>"+x[1]+"</button>").join("")+"</div>";
  if(tab==="overview"){
    h+="<p class='lsum'>"+esc(tp.summary)+"</p>";
    if(tp.book)h+=readButton(tp);
    h+=filmsHtml(tp);
    if(tp.people&&tp.people.length)h+=aboutPeople(tp.people)+alsoIn(tp);
    h+=relatedHtml(tp);
    const books=booksFrom(tp.id);
    if(books.length)h+="<div class='picklbl'>Read the book</div>"+topicRows(books,false);
    if(tp.points&&tp.points.length)
      h+="<div class='lpoints'>"+tp.points.map(p=>"<div class='lpoint'><span class='lpdot'></span><span>"+esc(p)+"</span></div>").join("")+"</div>";
    if(ne)h+="<div class='picklbl'>Signature exercises</div><div class='lexlist'>"+
      tp.exercises.map(n=>"<span class='lex'>"+esc(n)+"</span>").join("")+"</div>";
    if(nd&&!tp.book)h+="<button class='btn primary lstart' data-learnday='"+esc(tp.id)+":0'>Start "+esc(tp.days[0].name)+"</button>";
  }else if(tab==="read"){
    h+=contentsView(tp);
  }else if(tab==="workouts"){
    h+=followCard(tp);
    tp.days.forEach((d,i)=>{
      const ref=esc(tp.id)+":"+i;
      h+="<div class='lday2'><div class='ldname'>"+esc(d.name)+"</div>"+
        (d.note?"<div class='ldnote'>"+esc(d.note)+"</div>":"")+
        "<div class='ldchips'>"+d.ex.map(n=>"<span>"+esc(n)+"</span>").join("")+"</div>"+
        timerButton(d)+
        "<div class='ldacts'><button class='btn primary' data-learnday='"+ref+"'>Start workout</button>"+
        "<button class='btn ghost' data-learnsave='"+ref+"'>Save as routine</button></div></div>";
    });
  }else{
    // Links grouped by what they are, each with a line on what it covers.
    GROUPS.forEach(g=>{
      const links=(tp.links||[]).filter(l=>g[1].indexOf(l.k)>=0);
      if(!links.length)return;
      h+="<div class='picklbl'>"+g[0]+"</div><div class='llinks'>"+links.map(l=>
        "<a class='llink' href='"+esc(l.u)+"' target='_blank' rel='noopener'><span class='lbody'>"+
        "<span class='ll'>"+esc(l.t)+"</span>"+(l.d?"<span class='ld'>"+esc(l.d)+"</span>":"")+"</span>"+
        "<span class='lx'>&#8599;</span></a>").join("")+"</div>";
    });
  }
  return h+"</div></div>";
}

// A conditioning day (rides, runs, intervals) can run on the cardio timer, set up to match.
const CARDIO_ACT={"Running":"run","Cycling":"ride","Walking":"walk","Rowing":"row","Swimming":"swim","Track intervals":"run",
  "Hill repeats":"run","Sprints":"run","Fartlek":"run","Tempo runs":"run","Time trial":"run","Race walking":"walk"};
function timerButton(d){
  const act=d.ex.map(n=>CARDIO_ACT[n]).find(Boolean);
  if(!act)return "";
  const t=(d.name+" "+(d.note||"")).toLowerCase();
  const preset=/4\s*[×x]\s*4/.test(t)?"4x4":/zone 2/.test(t)?"z2":/tabata/.test(t)?"tabata":/emom/.test(t)?"emom10":"open";
  return "<button class='btn ghost ldtimer' data-cardioopen='"+esc(JSON.stringify({activity:act,preset}))+"'>Run it on the cardio timer &rsaquo;</button>";
}

// Public-domain film of the subject, from the Internet Archive. Nothing loads until Play.
function filmsHtml(tp){
  const films=filmsFor(tp.id);
  if(!films.length)return "";
  const offline=typeof navigator!=="undefined"&&navigator.onLine===false;
  const len=m=>m<1?"under a minute":m>=90?Math.round(m/60*10)/10+" hours":Math.round(m)+" min";
  return "<div class='llabel'>Watch</div><div class='lfilms'>"+films.map(f=>{
    const meta="<span class='lfilmm'>"+[f.y,f.min?len(f.min):"",f.yt?f.ch:"public domain"].filter(Boolean).join(" &middot; ")+"</span>";
    const key=filmKey(f);
    if(state.filmOpen===key)return "<div class='lfilm'>"+(offline?
      "<div class='empty-note'>Videos play online, so they need a connection.</div>":
      "<iframe class='lfilmf' src='"+esc(filmEmbed(f))+"' title='"+esc(f.t)+"' allow='autoplay; encrypted-media; picture-in-picture; fullscreen' allowfullscreen referrerpolicy='strict-origin-when-cross-origin'></iframe>")+
      "<div class='lfilmc'><span class='lfilmt'>"+esc(f.t)+"</span>"+meta+
      "<a class='lfilml' href='"+esc(filmPage(f))+"' target='_blank' rel='noopener'>"+(f.yt?"Open on YouTube":"Open at the Internet Archive")+" &#8599;</a></div></div>";
    return "<button class='lfilmb' data-film='"+esc(key)+"'><span class='lfilmp' aria-hidden='true'>&#9654;</span>"+
      "<span class='lfilmc'><span class='lfilmt'>"+esc(f.t)+"</span>"+meta+"<span class='lfilmd'>"+esc(f.d)+"</span></span></button>";
  }).join("")+"</div>";
}

// Everywhere else in Learn this person turns up: topics about them, then topics that mention them.
function alsoIn(tp){
  const r=relatedFor(tp);
  const row=x=>"<button class='lwrow' data-learn='"+esc(x.t.id)+"'><span class='lalso'><span class='lwrt'>"+esc(x.t.title)+"</span>"+
    "<span class='lalsow'>"+esc(x.where)+"</span></span><span class='lchev'>&rsaquo;</span></button>";
  return (r.about.length?"<div class='llabel'>Also in Learn</div><div class='lwrows'>"+r.about.map(row).join("")+"</div>":"")+
    (r.mentions.length?"<div class='llabel'>Mentioned in</div><div class='lwrows'>"+r.mentions.slice(0,8).map(row).join("")+"</div>":"");
}

// A subject's own pointers to where it's covered elsewhere in Learn — World cultures, people.
function relatedHtml(tp){
  const list=(tp.related||[]).map(id=>{const t=topicById(id),c=t&&catOfTopic(id);
    const a=c&&AREAS.find(x=>x[2].includes(c));return t?{t,where:(a?a[1]+" · ":"")+c.cat}:null;}).filter(Boolean);
  if(!list.length)return "";
  return "<div class='llabel'>Related in Learn</div><div class='lwrows'>"+list.map(x=>
    "<button class='lwrow' data-learn='"+esc(x.t.id)+"'><span class='lalso'><span class='lwrt'>"+esc(x.t.title)+"</span>"+
    "<span class='lalsow'>"+esc(x.where)+"</span></span><span class='lchev'>&rsaquo;</span></button>").join("")+"</div>";
}

// Start, or pick up where you left off.
function readButton(tp){
  if(!tp.ia)return "<button class='btn primary lstart' data-learntab='read'>Read the book</button>";
  const pos=bookPos(tp.book);
  return "<button class='btn primary lstart' data-bookgo='"+esc(tp.book)+"'>"+
    (pos?"Continue reading &middot; chapter "+(pos.chapter+1):"Start reading")+"</button>";
}

// The Read tab: the edition, then the book's chapters — each opens the scan at that page. A
// scan the Internet Archive doesn't hold (Google Books) can't show inside the app, so its
// chapters open there instead.
function contentsView(tp){
  if(!tp.ia)return "<div class='lbkhead'><div class='lbkht'>"+esc(splitTitle(tp.title)[1]||tp.title)+"</div><div class='lbkhm'>"+
      esc(splitTitle(tp.title)[0])+(tp.edition?" &middot; "+esc(tp.edition):"")+"</div>"+
      "<div class='lbkhpd'>Public domain &middot; the original printed pages &middot; each chapter opens at Google Books</div></div>"+
    "<div class='llinks lchapters'>"+tp.contents.map((c,i)=>
      "<a class='llink' href='"+esc(tp.scan.page.replace("{page}",encodeURIComponent(c.page)))+"' target='_blank' rel='noopener'>"+
        "<span class='lchn mono'>"+(i+1)+"</span><span class='lbody'><span class='ll'>"+esc(c.t)+"</span></span><span class='lx'>&#8599;</span></a>").join("")+
    "</div>";
  const pos=bookPos(tp.book);
  return "<div class='lbkhead'><div class='lbkht'>"+esc(splitTitle(tp.title)[1]||tp.title)+"</div><div class='lbkhm'>"+
      esc(splitTitle(tp.title)[0])+(tp.edition?" &middot; "+esc(tp.edition):"")+"</div>"+
      "<div class='lbkhpd'>Public domain &middot; the original printed pages, from the Internet Archive</div></div>"+
    "<div class='llist lchapters'>"+tp.contents.map((c,i)=>
      "<button class='lrow"+(pos&&pos.chapter===i?" on":"")+"' data-bookch='"+esc(tp.book)+":"+i+"'>"+
        "<span class='lchn mono'>"+(i+1)+"</span><span class='lt'>"+esc(c.t)+"</span><span class='lchev'>&rsaquo;</span></button>").join("")+
    "</div>";
}

// A chapter: the scan fills the screen under a slim bar — back to the contents, where you
// are, and the same page at the Internet Archive. The scan scrolls on through the book.
function scanView(tp){
  const n=tp.contents.length,i=Math.max(0,Math.min(state.bookCh,n-1)),c=tp.contents[i];
  const offline=typeof navigator!=="undefined"&&navigator.onLine===false;
  return "<div class='wrap lscanwrap'><div class='lreadbar'><button class='backbtn' id='bookback'>"+icon("back","sm")+"Contents</button>"+
      "<span class='lreadpos'>"+esc(c.t)+"</span>"+
      "<a class='lreadout' href='"+esc(scanLink(tp.ia,c.page))+"' target='_blank' rel='noopener' aria-label='Open at the Internet Archive'>&#8599;</a></div>"+
    (offline?"<div class='empty-note'>The book is read from the Internet Archive, so it needs a connection. "+
      "Everything else in KingsKiln works offline.</div>":
      "<iframe class='lscan' src='"+esc(scanEmbed(tp.ia,c.page))+"' title='"+esc(tp.title)+"' allowfullscreen "+
        "referrerpolicy='no-referrer'></iframe>")+
    "</div>";
}

export function learnView(){
  const tp=state.learnOpen&&topicById(state.learnOpen);
  return tp?topicView(tp):listView();
}
