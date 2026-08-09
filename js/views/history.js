// Every day ever logged, newest first, with save/load and the way into the calendar.
import {fmtClock,shortDate,totals,workoutSeconds} from "../model.js";
import {newestFirst,state} from "../store.js";
import {esc} from "./common.js";

export function historyView(){
  let h="<div class='wrap scroll'>"+
    "<div class='hhead'><button class='backbtn' id='backbtn'>&lsaquo; Back</button>"+
    "<button class='newday' id='newday'>+ New day</button></div>"+
    "<div class='hhead csvrow'>"+
    "<button class='backbtn' id='calbtn'>&#128197; Calendar</button>"+
    "<button class='backbtn' id='exportcsv'>&#8681; CSV</button>"+
    "<button class='backbtn' id='exportjson'>&#8681; Backup</button>"+
    "<button class='backbtn' id='importcsv'>&#8679; Load</button></div>"+
    "<input type='file' id='csvfile' accept='.csv,.json,text/csv,application/json' style='display:none'>";
  const list=newestFirst(state.sessions);
  if(!list.length)h+="<div class='empty-note'>No days yet.</div>";
  list.forEach(s=>{
    const t=totals(s),cur=s.id===state.sessionId,secs=workoutSeconds(s);
    h+="<div class='day"+(cur?" cur":"")+"' data-load='"+s.id+"'>"+
      "<div class='info'>"+(cur?"<div class='cur-tag'>Current</div>":"")+
      "<div class='t'>"+esc(s.title)+"</div>"+
      "<div class='sub'>"+shortDate(s.created)+" &middot; "+s.ex.length+" exercises"+
      (secs===null?"":" &middot; "+fmtClock(secs))+
      (s.running?" <span class='live'>live</span>":"")+"</div></div>"+
      "<div class='nums'><div class='r mono'>"+t.reps+"</div><div class='rl'>reps</div></div>"+
      "<button class='copy' data-copyday='"+s.id+"' title='Repeat this day&rsquo;s exercises today'>&#10697;</button>"+
      "<button class='del' data-delday='"+s.id+"'>&times;</button></div>";
  });
  return h+"</div>";
}
