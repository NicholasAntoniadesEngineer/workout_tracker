// Learn: short, plain-words summaries of how training works, each pointing out to the
// research, guidelines and videos behind it. The summaries are written for KingsKiln; the
// links go to the original publishers, so nothing of theirs is copied into the app.
// Laid out as tabs of topics; a topic opens as its own page, so nothing jumps in place.
import {AREAS,areaCats,catOfTopic,topicById} from "../library.js";
import {state} from "../store.js";
import {icon} from "../icons.js";
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

const isPeople=c=>c.cat==="Lifters & methods"||c.topics.some(t=>t.era||t.focus);

// A person's badge: their initials in the app's one accent colour — no photos of anyone.
function avatar(name){
  const words=name.replace(/[^A-Za-z& ]/g," ").split(/\s+/).filter(w=>w&&w!=="&");
  const ini=(words[0]?words[0][0]:"")+(words.length>1?words[words.length-1][0]:"");
  return "<span class='lav'>"+esc(ini.toUpperCase())+"</span>";
}

// People as compact tiles — badge, name, one line on what they're known for. No summaries
// here; the detail lives on their page.
function peopleGrid(topics){
  return "<div class='lpeople'>"+topics.map(tp=>{
    const t=splitTitle(tp.title);
    return "<button class='lperson' data-learn='"+esc(tp.id)+"'>"+avatar(t[0])+
      "<span class='lpn'>"+esc(t[0])+"</span>"+
      "<span class='lpf'>"+esc(t[1]||tp.focus||"")+"</span></button>";
  }).join("")+"</div>";
}

function topicRows(topics,showCat){
  return "<div class='llist'>"+topics.map(tp=>{
    const c=showCat?catOfTopic(tp.id):null;
    return "<button class='lrow' data-learn='"+esc(tp.id)+"'><span class='lt'>"+esc(tp.title)+"</span>"+
      (c?"<span class='lpre'>"+esc(c.cat)+"</span>":"")+"<span class='lchev'>&rsaquo;</span></button>";
  }).join("")+"</div>";
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
    "<div class='lshelf"+(people?" people":"")+"'>";
  c.topics.forEach(tp=>{
    const t=splitTitle(tp.title);
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
function homeView(area,cats){
  const q=(state.learnQuery||"").trim().toLowerCase();
  const searching=state.learnSearching||q;
  let h="<div class='wrap scroll lhome'>"+
    "<div class='lmasthead'><button class='backbtn' id='backbtn'>"+icon("back","sm")+"Back</button>"+
    "<button class='lsearchbtn"+(searching?" on":"")+"' id='learnsearchtoggle' aria-label='Search'>"+icon("search")+"</button></div>"+
    "<div class='lbigtitle'>Learn</div>"+
    (AREAS.length<2?"":"<div class='lpills'>"+AREAS.map(a=>"<button class='lpill"+(a[0]===area?" on":"")+
      "' data-learnarea='"+a[0]+"'>"+a[1]+"</button>").join("")+"</div>");
  if(searching){
    h+="<div class='searchrow lsearch'><span class='lsicon'>"+icon("search","sm")+"</span>"+
      "<input class='searchin' id='learnsearch' type='search' placeholder='Search "+
        (area==="health"?"health":"training")+" topics' autocomplete='off' value='"+esc(state.learnQuery||"")+"'>"+
      (q?"<button class='searchx' id='learnsearchx'>&times;</button>":"")+"</div>";
  }
  if(q){
    const hits=[];
    cats.forEach(c=>c.topics.forEach(tp=>{
      const text=(tp.title+" "+tp.summary+" "+(tp.points||[]).join(" ")+" "+(tp.exercises||[]).join(" ")).toLowerCase();
      if(text.indexOf(q)>=0)hits.push(tp);
    }));
    h+=hits.length?topicRows(hits,true):"<div class='empty-note'>Nothing matches &ldquo;"+esc(state.learnQuery)+"&rdquo;.</div>";
    return h+"</div>";
  }
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
  cats.forEach(c=>{h+=shelf(c);});
  h+="<p class='learnnote'>Summaries written for KingsKiln; links go to the original articles and videos. "+
    "General education, not medical advice.</p>";
  return h+"</div>";
}

// One category: tabs to hop between categories (or swipe), then people tiles or topic rows.
function categoryView(area,cats,cur){
  let h="<div class='wrap scroll'>"+pageHead(esc(tabName(cur.cat)))+
    "<div class='ltabs'>"+cats.map(c=>"<button class='ltab"+(c===cur?" on":"")+"' data-learncat=\""+
      esc(c.cat)+"\">"+esc(tabName(c.cat))+"</button>").join("")+"</div>";
  h+=isPeople(cur)?peopleGrid(cur.topics):topicRows(cur.topics,false);
  return h+"</div>";
}

function listView(){
  const area=state.learnArea||"training",cats=areaCats(area);
  const cur=cats.find(c=>c.cat===state.learnCat)||null;
  return cur?categoryView(area,cats,cur):homeView(area,cats);
}

// A topic, magazine-style: a dark header with who, what and how much there is, then
// Overview · Workouts · Links, so the page never gets long and text-heavy.
function topicView(tp){
  const t=splitTitle(tp.title),cat=catOfTopic(tp.id);
  const nd=tp.days?tp.days.length:0,nl=(tp.links||[]).length,ne=tp.exercises?tp.exercises.length:0;
  const tabs=[["overview","Overview"]].concat(nd?[["workouts","Workouts"]]:[]).concat(nl?[["links","Links"]]:[]);
  const tab=tabs.some(x=>x[0]===state.learnTab)?state.learnTab:"overview";
  let h="<div class='wrap scroll ltopicwrap'><div class='lhero'>"+
    "<button class='backbtn lheroback' id='backbtn'>"+icon("back","sm")+esc(cat?tabName(cat.cat):"Learn")+"</button>"+
    "<div class='lhe'>"+esc([cat?tabName(cat.cat):"",tp.era].filter(Boolean).join(" · "))+"</div>"+
    "<div class='lhn'>"+esc(t[0])+"</div>"+(t[1]?"<div class='lhm'>"+esc(t[1])+"</div>":"")+
    "<div class='lhchips'>"+(nl?"<span>"+nl+" links</span>":"")+(nd?"<span>"+nd+" workout"+(nd>1?"s":"")+"</span>":"")+
      (ne?"<span>"+ne+" exercises</span>":"")+(tp.focus?"<span>"+esc(tp.focus)+"</span>":"")+"</div></div>"+
    "<div class='ltopic'>";
  if(tabs.length>1)
    h+="<div class='seg ltabs3'>"+tabs.map(x=>"<button class='q"+(x[0]===tab?" on":"")+"' data-learntab='"+x[0]+"'>"+x[1]+"</button>").join("")+"</div>";
  if(tab==="overview"){
    h+="<p class='lsum'>"+esc(tp.summary)+"</p>";
    if(tp.points&&tp.points.length)
      h+="<div class='lpoints'>"+tp.points.map(p=>"<div class='lpoint'><span class='lpdot'></span><span>"+esc(p)+"</span></div>").join("")+"</div>";
    if(ne)h+="<div class='picklbl'>Signature exercises</div><div class='lexlist'>"+
      tp.exercises.map(n=>"<span class='lex'>"+esc(n)+"</span>").join("")+"</div>";
    if(nd)h+="<button class='btn primary lstart' data-learnday='"+esc(tp.id)+":0'>Start "+esc(tp.days[0].name)+"</button>";
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

export function learnView(){
  const tp=state.learnOpen&&topicById(state.learnOpen);
  return tp?topicView(tp):listView();
}
