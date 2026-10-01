// Learn: short, plain-words summaries of how training works, each pointing out to the
// research, guidelines and videos behind it. The summaries are written for KingsKiln; the
// links go to the original publishers, so nothing of theirs is copied into the app.
import {LEARN} from "../learn.js";
import {state} from "../store.js";
import {esc,pageHead} from "./common.js";

const KIND_LABEL={article:"Article",study:"Research",video:"Video",guideline:"Guideline"};

function topicCard(tp){
  const open=state.learnOpen===tp.id;
  let h="<div class='learncard"+(open?" open":"")+"'>"+
    "<button class='learnhead' data-learn='"+esc(tp.id)+"'><span class='lt'>"+esc(tp.title)+"</span>"+
    "<span class='lchev'>"+(open?"&minus;":"+")+"</span></button>";
  if(!open)return h+"</div>";
  h+="<div class='learnbody'><p class='lsum'>"+esc(tp.summary)+"</p>";
  if(tp.points&&tp.points.length)
    h+="<ul class='cues'>"+tp.points.map(p=>"<li>"+esc(p)+"</li>").join("")+"</ul>";
  h+="<div class='llinks'>"+(tp.links||[]).map(l=>
    "<a class='llink' href='"+esc(l.u)+"' target='_blank' rel='noopener'>"+
    "<span class='lk'>"+esc(KIND_LABEL[l.k]||"Link")+"</span><span class='ll'>"+esc(l.t)+"</span>"+
    "<span class='lx'>&#8599;</span></a>").join("")+"</div>";
  return h+"</div></div>";
}

export function learnView(){
  let h="<div class='wrap scroll'>"+pageHead("Learn")+
    "<p class='learnnote'>Short summaries written for KingsKiln, with links to the original "+
    "research, guidelines and videos. General education, not medical advice.</p>";
  LEARN.forEach(c=>{
    h+="<div class='setgroup'>"+esc(c.cat)+"</div>";
    c.topics.forEach(tp=>{h+=topicCard(tp);});
  });
  return h+"</div>";
}
