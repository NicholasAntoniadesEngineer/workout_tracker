// Learn: short, plain-words summaries of how training works, each pointing out to the
// research, guidelines and videos behind it. The summaries are written for KingsKiln; the
// links go to the original publishers, so nothing of theirs is copied into the app.
// Laid out as tabs of topics; a topic opens as its own page, so nothing jumps in place.
import {AREAS,areaCats,booksFrom,catOfTopic,topicById} from "../library.js";
import {bookPos,scanEmbed,scanLink} from "../reader.js";
import {PARTS,partOf} from "../world.js";
import {state} from "../store.js";
import {icon} from "../icons.js";
import {ageText,fmtBioDate,workKind} from "../bio.js";
import {esc,pageHead} from "./common.js";

// Short tab names for the categories, in the order the library lists them.
const SHORT={"Lifters & methods":"Lifters","Training principles":"Principles","Workout types":"Workouts",
  "Joints & resilience":"Joints",
  "What the lifters say":"Lifters","Protein & supplements":"Supplements"};
const tabName=c=>SHORT[c]||c.split(" & ")[0];
const GROUPS=[["Read",["article"]],["Watch",["video"]],["Listen",["podcast"]],["Research",["study","guideline"]]];


// "Arnold Schwarzenegger: high-volume splits" → the person, then the method.
function splitTitle(t){
  const i=t.indexOf(": ");
  return i>0?[t.slice(0,i),t.slice(i+2)]:[t,""];
}

function tags(tp){
  const list=[tp.era,tp.focus].filter(Boolean);
  return list.length?"<div class='ltags'>"+list.map(x=>"<span class='ltag'>"+esc(x)+"</span>").join("")+"</div>":"";
}

// Each category's icon on the Learn home grid.
const CAT_ICON={"Joints & resilience":"joint","Lifters & methods":"people",
  "Training principles":"target","Workout types":"dumbbell","Experts":"people","Fuel & hydration":"drop",
  "Pre-workout":"bolt","Protein & supplements":"pill","Recovery & health":"moon","What the lifters say":"chat"};
const isBooks=c=>c.topics.some(t=>t.book);

const isPeople=c=>c.cat==="Lifters & methods"||c.topics.some(t=>(t.era||t.focus)&&!t.book);

// A person's badge: their initials in the app's one accent colour — no photos of anyone.
function avatar(name){
  const words=name.replace(/[^A-Za-z& ]/g," ").split(/\s+/).filter(w=>w&&w!=="&");
  const ini=(words[0]?words[0][0]:"")+(words.length>1?words[words.length-1][0]:"");
  return "<span class='lav'>"+esc(ini.toUpperCase())+"</span>";
}

// People as compact tiles — badge, name, one line on what they're known for. No summaries
// here; the detail lives on their page.
// Everything a category search can match on: title, summary, key points, exercises, people.
function searchText(tp){
  return (tp.title+" "+tp.summary+" "+(tp.points||[]).join(" ")+" "+(tp.exercises||[]).join(" ")+" "+
    (tp.people||[]).map(p=>p.name).join(" ")).toLowerCase();
}

function peopleGrid(topics){
  return "<div class='lpeople'>"+topics.map(tp=>{
    const t=splitTitle(tp.title);
    return "<button class='lperson' data-learn='"+esc(tp.id)+"' data-find=\""+esc(searchText(tp))+"\">"+avatar(t[0])+
      "<span class='lpn'>"+esc(t[0])+"</span>"+
      "<span class='lpf'>"+esc(t[1]||tp.focus||"")+"</span></button>";
  }).join("")+"</div>";
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
    "<span class='lbka'>"+esc(t[1]?t[0]:"")+"</span><span class='lbky mono'>"+esc(tp.era||"")+"</span></span></button>";
}

function areaSwitch(area){
  return AREAS.length<2?"":"<div class='seg lareas'>"+AREAS.map(a=>"<button class='q"+(a[0]===area?" on":"")+
    "' data-learnarea='"+a[0]+"'>"+a[1]+"</button>").join("")+"</div>";
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

// A shelf: the category's name and a See all, then its topics in a row you swipe sideways.
function shelf(c){
  const people=isPeople(c);
  let h="<div class='lshelfhead'><div class='lshelft'>"+esc(c.cat)+"</div>"+
    "<button class='lseeall' data-learncat=\""+esc(c.cat)+"\">See all "+c.topics.length+"</button></div>"+
    "<div class='lshelf"+(people?" people":isBooks(c)?" books":"")+"'>";
  c.topics.forEach(tp=>{
    const t=splitTitle(tp.title);
    if(tp.book){h+=bookTile(tp);return;}
    h+=people?
      "<button class='lsc lscp' data-learn='"+esc(tp.id)+"'>"+avatar(t[0])+
        "<span class='lscb'><span class='lscn'>"+esc(t[0])+"</span><span class='lscm'>"+esc(t[1]||tp.focus||"")+"</span></span></button>":
      "<button class='lsc lsct' data-learn='"+esc(tp.id)+"'><span class='lsci'>"+icon(CAT_ICON[c.cat]||"book","sm")+"</span>"+
        "<span class='lscn'>"+esc(tp.title)+"</span></button>";
  });
  return h+"</div>";
}

// Learn home, magazine-style: a big title and search, Training or Health, today's featured
// story, then a swipeable shelf per category.
// What sits under the search on Learn's home: search hits while something is typed, else the
// featured story and the shelves. Typing repaints only this part, so the box keeps its
// keyboard and caret.
export function learnHomeBody(){
  const area=state.learnArea||"training",cats=areaCats(area);
  const q=(state.learnQuery||"").trim().toLowerCase();
  if(q){
    const hits=[];
    cats.forEach(c=>c.topics.forEach(tp=>{
      const who=(tp.people||[]).map(p=>p.name+" "+(p.known||"")).join(" ");
      const text=(tp.title+" "+tp.summary+" "+(tp.points||[]).join(" ")+" "+(tp.exercises||[]).join(" ")+" "+who).toLowerCase();
      if(text.indexOf(q)>=0)hits.push(tp);
    }));
    return hits.length?topicRows(hits,true):"<div class='empty-note'>Nothing matches &ldquo;"+esc(state.learnQuery)+"&rdquo;.</div>";
  }
  let h="";
  const f=featured(cats);
  if(f){
    const t=splitTitle(f.title),c=catOfTopic(f.id),n=f.days?f.days.length:0;
    h+="<div class='lfeature'>"+
      "<div class='lftop'><span class='lfe'>Featured &middot; "+esc(c?tabName(c.cat):"")+"</span>"+
        "<button class='lfnext' data-featurenext='1' aria-label='Show another'>Next &rsaquo;</button></div>"+
      "<button class='lfbody' data-learn='"+esc(f.id)+"'>"+
        "<span class='lfn'>"+esc(t[0])+"</span>"+(t[1]?"<span class='lfm'>"+esc(t[1])+"</span>":"")+
        "<span class='lfs'>"+esc((f.points&&f.points[0])||"")+"</span>"+
        "<span class='lfcta'>Read"+(n?" &middot; "+n+" workout"+(n>1?"s":""):"")+"</span></button></div>";
  }
  // World's cultures run A–Z, each shelf labelled with its region.
  cats.forEach(c=>{
    if(c.region&&c.region!==c.cat)h+="<div class='lregion'>"+esc(c.region)+"</div>";
    h+=shelf(c);
  });
  return h+(area==="books"?
    "<p class='learnnote'>Public-domain books, first published before 1931, read as the original printed pages "+
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
  return "<div class='wrap scroll lhome'>"+
    "<div class='lmasthead'><button class='backbtn' id='backbtn'>"+icon("back","sm")+"Back</button></div>"+
    "<div class='lbigtitle'>Learn</div>"+
    (AREAS.length<2?"":"<div class='lpills'>"+AREAS.map(a=>"<button class='lpill"+(a[0]===area?" on":"")+
      "' data-learnarea='"+a[0]+"'>"+a[1]+"</button>").join("")+"</div>")+
    searchBox("learnsearch","Search "+(area==="health"?"health":area==="world"?"the world":area==="books"?"books":"training"),state.learnQuery)+
    "<div id='learnbody'>"+learnHomeBody()+"</div></div>";
}

// One category: tabs to hop between categories (or swipe), then people tiles or topic rows.
// One category: tabs to hop between categories (or swipe), a search that filters what's here
// as you type, then people tiles or topic rows.
function categoryView(area,cats,cur){
  let h="<div class='wrap scroll'>"+pageHead(esc(tabName(cur.cat)))+
    "<div class='ltabs'>"+cats.map(c=>"<button class='ltab"+(c===cur?" on":"")+"' data-learncat=\""+
      esc(c.cat)+"\">"+esc(tabName(c.cat))+"</button>").join("")+"</div>"+
    searchBox("learncatsearch","Search "+esc(tabName(cur.cat).toLowerCase()),"");
  if(cur.region){
    // A culture: History, Athletes & coaches, Methods, Food & recovery — each part that has topics.
    PARTS.forEach(([key,label])=>{
      const list=cur.topics.filter(tp=>partOf(tp)===key);
      if(!list.length)return;
      h+="<div class='picklbl lpart'>"+label+"</div>"+(key==="people"?peopleGrid(list):topicRows(list,false));
    });
  }else if(isBooks(cur))h+="<div class='lbooks'>"+cur.topics.map(bookTile).join("")+"</div>";
  else h+=isPeople(cur)?peopleGrid(cur.topics):topicRows(cur.topics,false);
  return h+"<div class='empty-note' id='learncatnone' hidden>No match.</div></div>";
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

// A topic, magazine-style: a dark header with who, what and how much there is, then
// Overview · Workouts · Links, so the page never gets long and text-heavy.
function topicView(tp){
  const t=splitTitle(tp.title),cat=catOfTopic(tp.id);
  const nd=tp.days?tp.days.length:0,nl=(tp.links||[]).length,ne=tp.exercises?tp.exercises.length:0;
  if(tp.ia&&state.learnTab==="read"&&state.bookFor===tp.book&&state.bookCh!=null)return scanView(tp);
  const tabs=[["overview","Overview"]].concat(tp.book?[["read","Read"]]:[]).concat(nd?[["workouts","Workouts"]]:[])
    .concat(nl?[["links","Links"]]:[]);
  const tab=tabs.some(x=>x[0]===state.learnTab)?state.learnTab:"overview";
  let h="<div class='wrap scroll ltopicwrap'><div class='lhero'>"+
    "<button class='backbtn lheroback' id='backbtn'>"+icon("back","sm")+esc(cat?tabName(cat.cat):"Learn")+"</button>"+
    "<div class='lhe'>"+esc([cat?tabName(cat.cat):"",tp.era].filter(Boolean).join(" · "))+"</div>"+
    "<div class='lhn'>"+esc(t[0])+"</div>"+(t[1]?"<div class='lhm'>"+esc(t[1])+"</div>":"")+
    "<div class='lhchips'>"+(tp.contents?"<span>"+tp.contents.length+" chapters</span>":"")+
      (tp.images?"<span>"+tp.images+" illustrations</span>":"")+(nl?"<span>"+nl+" link"+(nl>1?"s":"")+"</span>":"")+(nd?"<span>"+nd+" workout"+(nd>1?"s":"")+"</span>":"")+
      (ne?"<span>"+ne+" exercises</span>":"")+(tp.focus?"<span>"+esc(tp.focus)+"</span>":"")+"</div></div>"+
    "<div class='ltopic'>";
  if(tabs.length>1)
    h+="<div class='seg ltabs3'>"+tabs.map(x=>"<button class='q"+(x[0]===tab?" on":"")+"' data-learntab='"+x[0]+"'>"+x[1]+"</button>").join("")+"</div>";
  if(tab==="overview"){
    h+="<p class='lsum'>"+esc(tp.summary)+"</p>";
    if(tp.book)h+=readButton(tp);
    if(tp.people&&tp.people.length)h+=aboutPeople(tp.people);
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
    tp.days.forEach((d,i)=>{
      const ref=esc(tp.id)+":"+i;
      h+="<div class='lday'><div class='ldname'>"+esc(d.name)+"</div>"+
        (d.note?"<div class='ldnote'>"+esc(d.note)+"</div>":"")+
        "<ol class='ldex'>"+d.ex.map(n=>"<li>"+esc(n)+"</li>").join("")+"</ol>"+
        "<div class='ldacts'><button class='btn primary tiny' data-learnday='"+ref+"'>Start this workout</button>"+
        "<button class='btn ghost tiny' data-learnsave='"+ref+"'>Save as routine</button></div></div>";
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
