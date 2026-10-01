// Learn: short, plain-words summaries of how training works, each pointing out to the
// research, guidelines and videos behind it. The summaries are written for KingsKiln; the
// links go to the original publishers, so nothing of theirs is copied into the app.
// Laid out as tabs of topics; a topic opens as its own page, so nothing jumps in place.
import {AREAS,areaCats,catOfTopic,topicById} from "../library.js";
import {state} from "../store.js";
import {esc,pageHead} from "./common.js";

// Short tab names for the categories, in the order the library lists them.
const SHORT={"Lifters & methods":"Lifters","Training principles":"Principles","Workout types":"Workouts",
  "Joints & resilience":"Joints","Recovery & lifestyle":"Recovery","Recovery & nutrition":"Recovery"};
const tabName=c=>SHORT[c]||c.split(" & ")[0];
const GROUPS=[["Read",["article"]],["Watch",["video"]],["Research",["study","guideline"]]];


// "Arnold Schwarzenegger: high-volume splits" → the person, then the method.
function splitTitle(t){
  const i=t.indexOf(": ");
  return i>0?[t.slice(0,i),t.slice(i+2)]:[t,""];
}

function tags(tp){
  const list=[tp.era,tp.focus].filter(Boolean);
  return list.length?"<div class='ltags'>"+list.map(x=>"<span class='ltag'>"+esc(x)+"</span>").join("")+"</div>":"";
}

function section(c){
  if(c.cat==="Lifters & methods"){
    // People as cards: who, what they're known for, and when.
    return "<div class='lgrid'>"+c.topics.map(tp=>{
      const t=splitTitle(tp.title);
      return "<button class='lcard' data-learn='"+esc(tp.id)+"'><span class='lname'>"+esc(t[0])+"</span>"+
        (t[1]?"<span class='lmeth'>"+esc(t[1])+"</span>":"")+
        "<span class='lpre'>"+esc(tp.summary)+"</span>"+tags(tp)+"</button>";
    }).join("")+"</div>";
  }
  return "<div class='llist'>"+c.topics.map(tp=>
    "<button class='lrow' data-learn='"+esc(tp.id)+"'><span class='lt'>"+esc(tp.title)+"</span>"+
    "<span class='lpre'>"+esc(tp.summary)+"</span><span class='lchev'>&rsaquo;</span></button>").join("")+"</div>";
}

// All topics by default, under their category headings; a tab filters to one category.
function listView(){
  const area=state.learnArea||"training",cats=areaCats(area);
  const cur=cats.find(c=>c.cat===state.learnCat)||null;
  // Training or Health first, then All or one category within it.
  let h="<div class='wrap scroll'>"+pageHead("Learn")+
    (AREAS.length<2?"":"<div class='seg lareas'>"+AREAS.map(a=>"<button class='q"+(a[0]===area?" on":"")+
      "' data-learnarea='"+a[0]+"'>"+a[1]+"</button>").join("")+"</div>")+
    "<div class='ltabs'><button class='ltab"+(cur?"":" on")+"' data-learncat=''>All</button>"+
    cats.map(c=>"<button class='ltab"+(c===cur?" on":"")+"' data-learncat=\""+
      esc(c.cat)+"\">"+esc(tabName(c.cat))+"</button>").join("")+"</div>";
  if(cur)h+=section(cur);
  else cats.forEach(c=>{h+="<div class='setgroup'>"+esc(c.cat)+"</div>"+section(c);});
  h+="<p class='learnnote'>Summaries written for KingsKiln; links go to the original articles, research "+
    "and videos. General education, not medical advice.</p>";
  return h+"</div>";
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
