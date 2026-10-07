// The year (or a month) in review: the numbers, the best month, records and rest kept, with a
// picture to share. Free, and the same for everyone.
import {state} from "../store.js";
import {esc,pageHead,wide} from "./common.js";
import {periodReview,yearRange,monthRange,monthName} from "../review.js";
import {icon} from "../icons.js";

const n=v=>Math.round(v).toLocaleString();
// What period is open: {kind:"year",y} or {kind:"month",y,m}. Defaults to this year, or last
// year in the first weeks of January.
export function reviewPeriod(){
  const p=state.reviewPeriod;if(p)return p;
  const d=new Date();return {kind:"year",y:d.getMonth()===0&&d.getDate()<15?d.getFullYear()-1:d.getFullYear()};
}
export function reviewOf(p){
  const r=p.kind==="month"?monthRange(p.y,p.m):yearRange(p.y);
  return periodReview(state.sessions,Object.assign({restDay:state.settings.restDay,now:Date.now()},r));
}
export const periodTitle=p=>p.kind==="month"?monthName(p.m)+" "+p.y:String(p.y);

export function reviewView(){
  const p=reviewPeriod(),r=reviewOf(p),u=esc(state.settings.unit||"kg"),year=p.kind==="year";
  const years=[...new Set(state.sessions.map(s=>new Date(s.created).getFullYear()).filter(y=>!isNaN(y)))].sort((a,b)=>b-a);
  const now=new Date();
  const months=[];for(let i=0;i<6;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({y:d.getFullYear(),m:d.getMonth()});}
  const pick="<div class='segc revpick'>"+years.slice(0,3).map(y=>"<button class='"+(year&&p.y===y?"on":"")+"' data-review='year:"+y+"'>"+y+"</button>").join("")+
    months.slice(0,3).map(x=>"<button class='"+(!year&&p.y===x.y&&p.m===x.m?"on":"")+"' data-review='month:"+x.y+":"+x.m+"'>"+monthName(x.m).slice(0,3)+"</button>").join("")+"</div>";
  let h="<div class='wrap scroll revwrap'>"+pageHead((year?"Your ":"")+periodTitle(p),"<button class='btn ghost tiny' id='reviewshare'>"+icon("share","sm")+"Share</button>",wide()?"Progress":"")+pick;
  if(!r.days)return h+"<div class='empty-note'>Nothing logged in "+esc(periodTitle(p))+" yet.</div></div>";
  const big=(v,l)=>"<div><b class='mono'>"+v+"</b><span>"+l+"</span></div>";
  h+="<div class='card hcard revhero'><div class='revk'>"+big(r.days,r.days===1?"day trained":"days trained")+big(r.workouts,"workouts")+
    big(r.volume>=10000?Math.round(r.volume/1000).toLocaleString()+"k":n(r.volume),u+" lifted")+(r.hours?big(r.hours,"hours"):big(n(r.sets),"sets"))+"</div>"+
    "<div class='revsub'>"+n(r.sets)+" sets &middot; "+n(r.reps)+" reps"+(r.cardio?" &middot; "+r.cardio+" cardio sessions"+(r.km?", "+r.km+" km":""):"")+"</div></div>";
  if(year){
    const max=Math.max(1,...r.byMonth);
    h+="<div class='card hcard'><div class='hcardh'><span class='llabel'>Days by month</span>"+(r.topMonth?"<span class='pgall'>Most in "+esc(r.topMonth)+"</span>":"")+"</div>"+
      "<div class='revbars'>"+r.byMonth.map((v,i)=>"<span title='"+monthName(i)+": "+v+" days'><i style='height:"+Math.round(v/max*100)+"%' class='"+(v===max&&v?"top":"")+"'></i><em>"+monthName(i)[0]+"</em></span>").join("")+"</div>"+
      "<div class='revsub'>"+r.weeks+" of "+Math.min(52,r.weeksSoFar)+" weeks with training</div></div>";
  }
  h+="<div class='card hcard'><div class='hcardh'><span class='llabel'>Records</span><span class='pgall'>"+r.records.length+" lifts got stronger"+(r.firsts?" &middot; "+r.firsts+" new":"")+"</span></div>"+
    (r.records.length?r.records.slice(0,8).map(x=>"<div class='histrow'><span class='histdate'>"+esc(x.name)+"</span><span class='histsets mono'>"+x.from+" &rarr; <b>"+x.to+"</b> "+u+"</span></div>").join("")+
      "<div class='revsub'>Estimated one-rep max, best of the period against everything before it.</div>":"<div class='empty-note'>No lift passed its earlier best this time.</div>")+"</div>";
  h+="<div class='pgmini'>"+
    "<div class='card hcard'><div class='hcardh'><span class='llabel'>Most trained</span></div>"+(r.favourite?"<b class='pgbig'>"+esc(r.favourite.name)+"</b><span class='pgsub'>"+r.favourite.sets+" sets</span>":"<b class='pgbig'>&mdash;</b>")+"</div>"+
    "<div class='card hcard'><div class='hcardh'><span class='llabel'>Rest kept</span></div><b class='pgbig'>"+r.restKept+"<small> of "+r.restAll+"</small></b><span class='pgsub'>"+(state.settings.restDay===6?"Saturdays":"Sundays")+" kept for rest</span></div></div>";
  return h+"</div>";
}

// The month just ended, as one card on Today in the first week of a month. Dismissed once.
export function monthCard(){
  const d=new Date();if(d.getDate()>7)return "";
  const y=d.getMonth()===0?d.getFullYear()-1:d.getFullYear(),m=(d.getMonth()+11)%12,id=y+"-"+m;
  if(state.monthSeen===id)return "";
  const r=reviewOf({kind:"month",y,m});if(!r.days)return "";
  return "<div class='card hcard revmonth'><div class='hcardh'><span class='llabel'>"+monthName(m)+" in short</span><button class='hmore' data-monthseen='"+id+"' aria-label='Hide'>&times;</button></div>"+
    "<div class='revline'><b class='mono'>"+r.days+"</b> days &middot; <b class='mono'>"+r.workouts+"</b> workouts"+(r.records.length?" &middot; <b class='mono'>"+r.records.length+"</b> lifts stronger":"")+"</div>"+
    "<button class='btn ghost tiny' data-review='month:"+y+":"+m+"'>See "+monthName(m)+" &rsaquo;</button></div>";
}
