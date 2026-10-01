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
  "Joints & resilience":"Joints","Recovery & lifestyle":"Recovery","Recovery & nutrition":"Recovery",
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
const CAT_ICON={"Joints & resilience":"joint","Lifters & methods":"people","Recovery & nutrition":"moon",
  "Training principles":"target","Workout types":"dumbbell","Experts":"people","Fuel & hydration":"drop",
  "Pre-workout":"bolt","Protein & supplements":"pill","Recovery & health":"moon","What the lifters say":"chat"};
const AVATAR_COLOURS=["#e8a317","#2a9d8f","#4c78dd","#d1495b","#8e6cd8","#5a9e3a","#c46f2b","#3b8fb5"];

const isPeople=c=>c.cat==="Lifters & methods"||c.topics.some(t=>t.era||t.focus);

// A person's badge: their initials on a colour picked from their name — no photos of anyone.
function avatar(name){
  const words=name.replace(/[^A-Za-z& ]/g," ").split(/\s+/).filter(w=>w&&w!=="&");
  const ini=(words[0]?words[0][0]:"")+(words.length>1?words[words.length-1][0]:"");
  let n=0;for(const ch of name)n=(n*31+ch.charCodeAt(0))>>>0;
  return "<span class='lav' style='background:"+AVATAR_COLOURS[n%AVATAR_COLOURS.length]+"'>"+esc(ini.toUpperCase())+"</span>";
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

// Learn home: Training or Health, a search, and one tile per category — icon, name, count.
function homeView(area,cats){
  const q=(state.learnQuery||"").trim().toLowerCase();
  let h="<div class='wrap scroll'>"+pageHead("Learn")+areaSwitch(area)+
    "<div class='searchrow lsearch'><span class='lsicon'>"+icon("search","sm")+"</span>"+
    "<input class='searchin' id='learnsearch' type='search' placeholder='Search "+
      (area==="health"?"health":"training")+" topics' autocomplete='off' value='"+esc(state.learnQuery||"")+"'>"+
    (q?"<button class='searchx' id='learnsearchx'>&times;</button>":"")+"</div>";
  if(q){
    const hits=[];
    cats.forEach(c=>c.topics.forEach(tp=>{
      const text=(tp.title+" "+tp.summary+" "+(tp.points||[]).join(" ")+" "+(tp.exercises||[]).join(" ")).toLowerCase();
      if(text.indexOf(q)>=0)hits.push(tp);
    }));
    h+=hits.length?topicRows(hits,true):"<div class='empty-note'>Nothing matches &ldquo;"+esc(state.learnQuery)+"&rdquo;.</div>";
    return h+"</div>";
  }
  h+="<div class='lcats'>"+cats.map(c=>{
    const people=isPeople(c);
    return "<button class='lcat' data-learncat=\""+esc(c.cat)+"\">"+
      "<span class='lci'>"+icon(CAT_ICON[c.cat]||"book","ht")+"</span>"+
      "<span class='lcn'>"+esc(c.cat)+"</span>"+
      "<span class='lcc'>"+c.topics.length+(people?" people":" topics")+"</span>"+
      (people?"<span class='lcav'>"+c.topics.slice(0,4).map(tp=>avatar(splitTitle(tp.title)[0])).join("")+"</span>":"")+
      "</button>";
  }).join("")+"</div>";
  h+="<p class='learnnote'>Summaries written for KingsKiln; links go to the original articles, research "+
    "and videos. General education, not medical advice.</p>";
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

function topicView(tp){
  const t=splitTitle(tp.title),cat=catOfTopic(tp.id);
  let h="<div class='wrap scroll'>"+pageHead(esc(cat?tabName(cat.cat):"Learn"))+
    "<div class='ltopic'><div class='ltitle'>"+esc(t[0])+"</div>"+
    (t[1]?"<div class='lsubtitle'>"+esc(t[1])+"</div>":"")+tags(tp)+
    "<p class='lsum'>"+esc(tp.summary)+"</p>";
  if(tp.points&&tp.points.length)
    h+="<div class='picklbl'>Key points</div><ul class='cues'>"+tp.points.map(p=>"<li>"+esc(p)+"</li>").join("")+"</ul>";
  // What they trained: their signature exercises, then documented workouts you can start or
  // keep as a routine.
  if(tp.exercises&&tp.exercises.length)
    h+="<div class='picklbl'>Signature exercises</div><div class='lexlist'>"+
      tp.exercises.map(n=>"<span class='lex'>"+esc(n)+"</span>").join("")+"</div>";
  if(tp.days&&tp.days.length){
    h+="<div class='picklbl'>Workouts</div>";
    tp.days.forEach((d,i)=>{
      const ref=esc(tp.id)+":"+i;
      h+="<div class='lday'><div class='ldname'>"+esc(d.name)+"</div>"+
        (d.note?"<div class='ldnote'>"+esc(d.note)+"</div>":"")+
        "<ol class='ldex'>"+d.ex.map(n=>"<li>"+esc(n)+"</li>").join("")+"</ol>"+
        "<div class='ldacts'><button class='btn primary tiny' data-learnday='"+ref+"'>Start this workout</button>"+
        "<button class='btn ghost tiny' data-learnsave='"+ref+"'>Save as routine</button></div></div>";
    });
  }
  // Links grouped by what they are — read, watch, research — each with a line on what it covers.
  GROUPS.forEach(g=>{
    const links=(tp.links||[]).filter(l=>g[1].indexOf(l.k)>=0);
    if(!links.length)return;
    h+="<div class='picklbl'>"+g[0]+"</div><div class='llinks'>"+links.map(l=>
      "<a class='llink' href='"+esc(l.u)+"' target='_blank' rel='noopener'><span class='lbody'>"+
      "<span class='ll'>"+esc(l.t)+"</span>"+(l.d?"<span class='ld'>"+esc(l.d)+"</span>":"")+"</span>"+
      "<span class='lx'>&#8599;</span></a>").join("")+"</div>";
  });
  return h+"</div></div>";
}

export function learnView(){
  const tp=state.learnOpen&&topicById(state.learnOpen);
  return tp?topicView(tp):listView();
}
