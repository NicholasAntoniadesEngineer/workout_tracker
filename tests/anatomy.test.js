// The full muscle map: every muscle is either drawn or listed as deep, the figure's shapes are
// well-formed and inside the board, exercises credit the muscles that do the work, and the
// per-muscle numbers agree with the per-group ones.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {AIM,MUSCLES,MUSCLE_NAME,PARTS,PART_DEEP,PART_GROUP,PART_NAME,PART_SOLE,PART_UNDER,contributors,exercisesFor,fatigueByMuscle,fatigueByPart,musclesOf,partsIn,partsOf,setsByMuscle,setsByPart} from "../js/muscles.js";
import {BACK,BACK_DEEP,FRONT,FRONT_DEEP,SKIN,SOLE,SOLE_DEEP,SOLE_SKIN} from "../js/anatomy.js";
import {EXERCISE_GROUPS,SEED_EXERCISES} from "../js/model.js";

const HOUR=3600000,DAY=24*HOUR,now=Date.UTC(2026,9,8,12);
const iso=t=>new Date(t).toISOString();
const day=(name,n,ago)=>({created:iso(now-(ago||HOUR)),ex:[{name,sets:Array.from({length:n},()=>({r:8,w:60,at:iso(now-(ago||HOUR))}))}]});

describe("the anatomy",()=>{
  test("every muscle belongs to a group, every group has muscles, and the aims make sense",()=>{
    assert.equal(new Set(PARTS.map(p=>p[0])).size,PARTS.length);
    PARTS.forEach(([k,n,g])=>{assert.ok(MUSCLE_NAME[g],k+" in "+g);assert.ok(n&&n.length>2,k);});
    MUSCLES.forEach(([g,,region,lo,hi])=>{assert.ok(partsIn(g).length,g);assert.ok(lo>0&&hi>lo,g);assert.ok(["upper","core","lower"].includes(region),g);
      assert.deepEqual(AIM[g],[lo,hi]);});
    assert.ok(PARTS.length>=60,"the major skeletal muscles, not a handful: "+PARTS.length);
  });
  test("the groups a lifter looks for are all there",()=>{
    for(const g of ["neck","traps","chest","serratus","frontdelt","sidedelt","reardelt","rotatorcuff","lats","upperback","biceps","triceps","forearms","hands",
      "abs","obliques","lowerback","glutes","abductors","hipflexors","adductors","quads","hamstrings","calves","shins","feet"])assert.ok(MUSCLE_NAME[g],g);
    // Every head of the many-headed muscles.
    assert.deepEqual(partsIn("quads"),["rectusfem","vastuslat","vastusmed","vastusint"]);
    assert.deepEqual(partsIn("hamstrings"),["bicepsfem","semitend","semimem"]);
    assert.deepEqual(partsIn("triceps"),["tricepslong","tricepslat","tricepsmed"]);
    assert.deepEqual(partsIn("rotatorcuff"),["supraspinatus","infraspinatus","teresminor","subscapularis"]);
    assert.deepEqual(partsIn("traps"),["uppertrap","midtrap","lowertrap"]);
    // The foot's own muscles, top and all four layers of the sole, and the hand's.
    assert.deepEqual(partsIn("feet"),["edb","ehb","abdhal","fdb","abddm","quadplantae","footlumb","fhb","addhal","fdmb","footinter"]);
    assert.deepEqual(partsIn("hands"),["thenar","hypothenar","addpoll","handlumb","handinter"]);
  });
  test("every muscle on the surface is drawn, front or back, and no deep one is",()=>{
    const drawn=new Set(FRONT.concat(BACK).map(x=>x[0]));
    PARTS.forEach(([k])=>{if(PART_DEEP[k])assert.ok(!drawn.has(k),k+" is deep but drawn");else assert.ok(drawn.has(k),k+" isn't drawn");});
    drawn.forEach(k=>assert.ok(PART_NAME[k],"drawn but unknown: "+k));
  });
  test("every deep muscle is drawn in the deep layer or on the sole, once it's chosen",()=>{
    const deep=new Set(FRONT_DEEP.concat(BACK_DEEP,SOLE_DEEP,SOLE).map(x=>x[0]));
    PARTS.forEach(([k])=>{if(PART_DEEP[k])assert.ok(deep.has(k),k+" has no shape");else assert.ok(!deep.has(k),k+" is on the surface");});
    SOLE.concat(SOLE_DEEP).forEach(([k])=>assert.equal(PART_GROUP[k],"feet",k));
  });
  test("the sole's shapes are closed paths on their own board",()=>{
    SOLE_SKIN.map(d=>["skin",d]).concat(SOLE,SOLE_DEEP).forEach(([k,d])=>{assert.match(d,/^M[\d. ]+([LQCZ][\d. ]*)+$/,k);
      const n=d.match(/-?\d+(\.\d+)?/g).map(Number);for(let i=0;i<n.length;i+=2){assert.ok(n[i]>=0&&n[i]<=60,k+" x");assert.ok(n[i+1]>=0&&n[i+1]<=132,k+" y");}});
  });
  test("every shape is a closed path of plain commands, on the left half of the board",()=>{
    const all=SKIN.map(d=>["skin",d]).concat(FRONT,BACK,FRONT_DEEP,BACK_DEEP);
    all.forEach(([k,d])=>{
      assert.match(d,/^M[\d. ]+([LQCZ][\d. ]*)+$/,k);assert.ok(d.endsWith("Z"),k);
      const n=d.match(/-?\d+(\.\d+)?/g).map(Number);
      for(let i=0;i<n.length;i+=2){assert.ok(n[i]>=28&&n[i]<=118,k+" x "+n[i]);assert.ok(n[i+1]>=4&&n[i+1]<=440,k+" y "+n[i+1]);}
    });
    // Muscles stay on their own half, so the mirrored half meets them at the midline.
    FRONT.concat(BACK,FRONT_DEEP,BACK_DEEP).forEach(([k,d])=>d.match(/-?\d+(\.\d+)?/g).map(Number).filter((v,i)=>i%2===0).forEach(x=>assert.ok(x<=100,k+" crosses the midline at "+x)));
  });
});

describe("which muscles an exercise works",()=>{
  const prim=n=>partsOf(n).primary,sec=n=>partsOf(n).secondary;
  test("each head and each small muscle gets its own exercises",()=>{
    assert.deepEqual(prim("External rotation"),["infraspinatus","teresminor"]);
    assert.deepEqual(prim("Trap 3 raise"),["lowertrap"]);
    assert.deepEqual(prim("Tibialis raises"),["tibant"]);
    assert.deepEqual(prim("Seated calf raise"),["soleus"]);
    assert.deepEqual(prim("Calf raises"),["gastroc","soleus"]);
    assert.deepEqual(prim("Shoulder shrugs"),["uppertrap"]);
    assert.deepEqual(prim("Neck resistance"),["scm","splenius","scalenes"]);
    assert.deepEqual(prim("Side plank"),["extoblique","intoblique","ql"]);
    assert.deepEqual(prim("Cable Fly Upper"),["pecupper"]);
    assert.deepEqual(prim("Cable Fly Lower"),["peclower"]);
    assert.deepEqual(prim("Reverse wrist curl"),["wristext"]);
    assert.deepEqual(prim("Wrist curl"),["wristflex"]);
    assert.deepEqual(prim("Band lateral walk"),["glutemed","glutemin","tfl"]);
    assert.deepEqual(prim("Abdominal vacuum"),["transverse"]);
  });
  test("the right muscles lead the big lifts",()=>{
    assert.deepEqual(prim("Squats"),["vastuslat","vastusmed","vastusint","glutemax"]);
    assert.ok(sec("Squats").includes("rectusfem")&&sec("Squats").includes("addmag"));
    assert.deepEqual(prim("Bench press"),["pecupper","peclower","tricepslong","tricepslat","tricepsmed"]);
    assert.deepEqual(prim("Inclined Bench Press"),["pecupper","frontdelt"]);
    assert.deepEqual(prim("Pull ups"),["lats"]);
    assert.ok(sec("Pull ups").includes("bicepsbr")&&sec("Pull ups").includes("teresmajor"));
    assert.deepEqual(prim("Barbell row"),["lats","midtrap","rhomboids","teresmajor"]);
    assert.deepEqual(prim("Hammer curl"),["brachialis","bicepsbr","brachiorad"]);
    assert.ok(!partsOf("Straight-arm pulldown").secondary.includes("bicepsbr"),"arms straight: no biceps");
    assert.deepEqual(prim("Hanging leg raise"),["rectusabd","iliopsoas"]);
  });
  test("names that used to land on the wrong rule now land on the right one",()=>{
    assert.deepEqual(musclesOf("Incline log press").primary,["chest","frontdelt"]);   // an incline press, not overhead
    assert.deepEqual(musclesOf("Leverage lift").primary,["forearms"]);                // a wrist lever, not a deadlift
    assert.deepEqual(musclesOf("Pigeon push-up").primary,["glutes"]);                 // a hip drill, not a push-up
    assert.deepEqual(musclesOf("Scrum machine").primary,["quads","glutes"]);         // the legs drive it
  });
  test("a muscle is never both primary and secondary, and every one named exists",()=>{
    EXERCISE_GROUPS.forEach(g=>g[1].forEach(n=>{const p=partsOf(n);
      p.primary.concat(p.secondary).forEach(k=>assert.ok(PART_NAME[k],n+": "+k));
      p.primary.forEach(k=>assert.ok(!p.secondary.includes(k),n+": "+k+" twice"));}));
  });
  test("a group is primary when any of its muscles is, secondary otherwise",()=>{
    EXERCISE_GROUPS.forEach(g=>g[1].forEach(n=>{const p=partsOf(n),m=musclesOf(n);
      assert.deepEqual(new Set(m.primary),new Set(p.primary.map(k=>PART_GROUP[k])),n);
      // Secondary only through a surface muscle: a deep steadier doesn't make it a set for its group.
      m.secondary.forEach(k=>{assert.ok(!m.primary.includes(k),n);assert.ok(p.secondary.some(x=>PART_GROUP[x]===k&&(!PART_DEEP[x]||PART_SOLE[x])),n);});}));
    assert.ok(!musclesOf("Dumbbell fly").secondary.includes("biceps"),"a fly is no biceps set");
  });
});

describe("exercises for a muscle",()=>{
  test("every muscle has an exercise in the list, and every group one that works it as a main mover",()=>{
    PARTS.forEach(([k])=>assert.ok(exercisesFor(k,true,SEED_EXERCISES).length,k));
    MUSCLES.forEach(([g])=>assert.ok(exercisesFor(g,false,SEED_EXERCISES).some(x=>x.main),g));
  });
  test("the most targeted come first, then the ones it only helps in",()=>{
    const top=(id,part)=>exercisesFor(id,part,SEED_EXERCISES).map(x=>x.name);
    assert.equal(top("pecupper",true)[0],"Cable Fly Upper");
    assert.equal(top("subscapularis",true)[0],"Internal rotation");
    assert.equal(top("supraspinatus",true)[0],"Full can raise");
    assert.equal(top("serratus",false)[0],"Scapular push-up");
    assert.deepEqual(top("feet",false).slice(0,4).sort(),["Short foot","Toe spreads","Toe yoga","Towel curls"]);
    const all=exercisesFor("glutemin",true,SEED_EXERCISES);assert.ok(all.every(x=>x.main));
    const mixed=exercisesFor("popliteus",true,SEED_EXERCISES);assert.ok(mixed.length&&mixed.every(x=>!x.main),"helps only");
    const r=exercisesFor("quads",false,SEED_EXERCISES);r.forEach((x,i)=>{if(i)assert.ok(!(x.main&&!r[i-1].main),"main ones first");});
  });
  test("among equals, the ones already done come first",()=>{
    const names=["Hammer curl","Zottman curl","Reverse curl"];
    assert.deepEqual(exercisesFor("brachiorad",true,names).map(x=>x.name),["Hammer curl","Reverse curl","Zottman curl"]);
    assert.deepEqual(exercisesFor("brachiorad",true,names,{"zottman curl":3}).map(x=>x.name)[0],"Zottman curl");
  });
});

describe("what each muscle does and what trains it",async()=>{
  const {GROUP_INFO,PART_INFO}=await import("../js/muscleinfo.js");
  test("every muscle and group has its lines, one short sentence each",()=>{
    PARTS.forEach(([k])=>assert.ok(PART_INFO[k],k));MUSCLES.forEach(([g])=>assert.ok(GROUP_INFO[g],g));
    const line=(x,w)=>{assert.match(x,/^[A-Z].*\.$/,w);assert.ok(x.length<=110,w+" is long: "+x);};
    Object.entries(PART_INFO).forEach(([k,[does,how]])=>{assert.ok(PART_NAME[k],k);line(does,k);line(how,k);});
    Object.entries(GROUP_INFO).forEach(([g,[how]])=>{assert.ok(MUSCLE_NAME[g],g);line(how,g);});
  });
  test("every exercise picked for a muscle is in the list and credits that muscle",()=>{
    Object.entries(PART_INFO).forEach(([k,[,,best]])=>{assert.ok(best.length,k);const ok=exercisesFor(k,true,SEED_EXERCISES).map(x=>x.name);
      best.forEach(n=>assert.ok(ok.includes(n),k+": "+n));});
    Object.entries(GROUP_INFO).forEach(([g,[,best]])=>{const ok=exercisesFor(g,false,SEED_EXERCISES).map(x=>x.name);best.forEach(n=>assert.ok(ok.includes(n),g+": "+n));});
  });
  test("the picks lead, in their order, and say how they work it",()=>{
    const best=PART_INFO.tricepslong[2],r=exercisesFor("tricepslong",true,SEED_EXERCISES,{},best);
    assert.deepEqual(r.slice(0,3).map(x=>x.name),best);
    assert.deepEqual(exercisesFor("soleus",true,["Calf raises","Seated calf raise"]).map(x=>[x.name,x.role]),[["Seated calf raise","isolates"],["Calf raises","main"]]);
    assert.equal(exercisesFor("popliteus",true,["Lying leg curl"])[0].role,"helps");
  });
});

describe("sets and recovery, muscle by muscle",()=>{
  test("a bench press set is a full set for both pec heads and the triceps, half for the front deltoid",()=>{
    const s=[day("Bench press",4)];
    const p=setsByPart(s,now-DAY,now),g=setsByMuscle(s,now-DAY,now);
    assert.deepEqual([p.pecupper,p.peclower,p.tricepslong,p.frontdelt,p.pecminor],[4,4,4,2,0]);
    assert.deepEqual([g.chest,g.triceps,g.frontdelt],[4,4,2]);
    assert.equal(Object.keys(p).length,PARTS.length);
  });
  test("a group counts an exercise once, however many of its muscles it works",()=>{
    const s=[day("Barbell row",3),day("Shoulder shrugs",2)];
    const g=setsByMuscle(s,now-DAY,now),p=setsByPart(s,now-DAY,now);
    assert.equal(g.traps,3+2);                    // row: mid traps primary (lower traps too, but once); shrug: upper traps
    assert.deepEqual([p.midtrap,p.lowertrap,p.uppertrap],[3+1,1.5,2]);
  });
  test("what trained one muscle, and how worked it still is",()=>{
    const s=[day("Seated calf raise",4),day("Calf raises",2)];
    assert.deepEqual(contributors(s,"soleus",now-DAY,now,true),[["Seated calf raise",4],["Calf raises",2]]);
    assert.deepEqual(new Map(contributors(s,"gastroc",now-DAY,now,true)),new Map([["Calf raises",2],["Seated calf raise",2]]));
    const f=fatigueByPart(s,now),fg=fatigueByMuscle(s,now);
    assert.ok(f.soleus>f.gastroc,"the bent-knee raise works the soleus harder");
    assert.ok(Math.abs(fg.calves-f.soleus)<0.2);
    assert.equal(f.tibant,0);
  });
});

describe("deep muscles",()=>{
  test("each deep muscle under a drawn one names it, and that one is drawn",()=>{
    const drawn=new Set(FRONT.concat(BACK).map(x=>x[0]));
    PARTS.forEach(([k,,,deep])=>{if(typeof deep==="string"&&deep!=="sole"){assert.ok(PART_DEEP[k]);assert.ok(drawn.has(deep),k+" under "+deep);}});
    assert.ok(PARTS.filter(p=>p[3]).length>=15,"the deep layer is there too");
  });
});

describe("the close-up of a chosen group",async()=>{
  // The view needs a store; an empty one is enough to draw every group's close-up.
  const mem=new Map();
  Object.defineProperty(globalThis,"localStorage",{configurable:true,writable:true,value:{getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)}});
  Object.defineProperty(globalThis,"BroadcastChannel",{configurable:true,writable:true,value:undefined});
  globalThis.document={documentElement:{dataset:{}},getElementById:()=>null};
  const store=await import("../js/store.js");store.load();
  const {bodyMapPop,closeUps}=await import("../js/views/bodymap.js");
  store.state.view="progress";
  const pop=(sel,panel)=>{store.state.bmSel=sel;store.state.bmPanel=panel||0;return bodyMapPop();};
  const tabs=g=>[...pop("g:"+g).matchAll(/data-bmpanel='\d+' data-bmgroup='\w+'>([^<]+)</g)].map(m=>m[1]);
  test("every group's views between them show every one of its muscles, numbered 1, 2, 3… as listed",()=>{
    MUSCLES.forEach(([g])=>{
      const shown=new Set(),n=Math.max(1,tabs(g).length);
      for(let i=0;i<n;i++){const h=pop("g:"+g,i);
        assert.doesNotMatch(h,/NaN|undefined/,g+" "+i);
        const onFig=[...h.matchAll(/<g class='bmtag[^']*' data-muscle='p:(\w+)'>.*?<text[^>]*>(\d+)</g)].map(m=>[m[1],+m[2]]);
        const listed=[...h.matchAll(/data-muscle='p:(\w+)'><i class='bmnum'>(\d+)</g)].map(m=>[m[1],+m[2]]);
        assert.deepEqual(onFig.slice().sort(),listed.slice().sort(),g+" "+i+": the drawing's numbers and the list's agree");
        assert.deepEqual(listed.map(x=>x[1]),listed.map((x,j)=>j+1),g+" "+i+": numbered from 1");
        listed.forEach(([p])=>shown.add(p));}
      assert.deepEqual([...shown].sort(),partsIn(g).slice().sort(),g);
      closeUps(g).forEach(x=>x.ids.forEach(k=>assert.ok(shown.has(k),g+" "+k)));
    });
  });
  test("a deep layer is its own tab; the foot has its sole; one view needs no tabs",()=>{
    assert.deepEqual(tabs("feet"),["Sole","Sole deep","Top"]);
    assert.deepEqual(tabs("rotatorcuff"),["Back","Back deep","Front deep"]);
    assert.deepEqual(tabs("quads"),["Front","Front deep"]);
    assert.deepEqual(tabs("hamstrings"),[]);
    assert.match(pop("p:supraspinatus"),/class='on' data-bmpanel='1'/,"a deep muscle opens on its own layer");
    assert.match(pop("p:supraspinatus"),/under the upper trapezius/);
    assert.match(pop("p:edb"),/class='on' data-bmpanel='2'/,"the top of the foot");
    store.state.view="home";assert.equal(pop("g:feet"),"","only over Progress");store.state.view="progress";
    for(const bad of ["","g:nope","p:nope","chest"])assert.equal(pop(bad),"",bad);
  });
  test("Train it offers exercises for it; one already in today's workout says so",()=>{
    const h=pop("p:pecupper");
    assert.match(h,/<b>Train<\/b> Incline presses/);assert.match(h,/data-bmadd='Cable Fly Upper'/);
    const today=store.state.sessions.find(s=>s.created.slice(0,10)===new Date().toISOString().slice(0,10))||store.state.sessions[0];
    today.created=new Date().toISOString();today.ex.push({id:"x1",name:"Cable Fly Upper",sets:[]});
    assert.match(pop("p:pecupper"),/data-bmgo='Cable Fly Upper'/);
    // No archery for the rotator cuff unless it's already being done.
    assert.doesNotMatch(pop("g:rotatorcuff"),/Archery/);
    // Picked exercises only, where two or more are picked: no pushdown for the long head.
    const t=pop("p:tricepslong");assert.match(t,/data-bmadd='Overhead tricep extension'/);assert.doesNotMatch(t,/pushdown'/i);
    assert.match(t,/<b>Does<\/b> Straightens the elbow/);assert.match(t,/<b>Train<\/b> Overhead extensions/);
    assert.match(pop("g:calves"),/<b>Train<\/b> Calf raises with the knee straight/);
  });
});

describe("the year in review on Today",async()=>{
  const store=await import("../js/store.js");
  const {yearCard}=await import("../js/views/review.js");
  const at=(y,m,d)=>new Date(y,m,d,12).getTime();
  test("shows from December to mid-January, for the year that's ending or just ended, until hidden",()=>{
    const S=store.state,keep=S.sessions;
    S.sessions=[{id:"a",created:new Date(2026,5,3,10).toISOString(),ex:[{name:"Squats",sets:[{r:5,w:100}]}]}];
    S.yearSeen="";
    assert.equal(yearCard(at(2026,9,9)),"","not in October");
    assert.match(yearCard(at(2026,11,3)),/Your 2026/);
    assert.match(yearCard(at(2027,0,10)),/Your 2026/,"early January looks back on the year just ended");
    assert.equal(yearCard(at(2027,0,16)),"","gone after the 15th");
    S.yearSeen="2026";assert.equal(yearCard(at(2026,11,3)),"","hidden once");
    S.yearSeen="";S.sessions=[];assert.equal(yearCard(at(2026,11,3)),"","nothing trained, nothing to show");
    S.sessions=keep;
  });
});
