// The full muscle map: every muscle is either drawn or listed as deep, the figure's shapes are
// well-formed and inside the board, exercises credit the muscles that do the work, and the
// per-muscle numbers agree with the per-group ones.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {AIM,MUSCLES,MUSCLE_NAME,PARTS,PART_DEEP,PART_GROUP,PART_NAME,PART_UNDER,contributors,fatigueByMuscle,fatigueByPart,musclesOf,partsIn,partsOf,setsByMuscle,setsByPart} from "../js/muscles.js";
import {BACK,FRONT,SKIN} from "../js/anatomy.js";
import {EXERCISE_GROUPS} from "../js/model.js";

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
    for(const g of ["neck","traps","chest","serratus","frontdelt","sidedelt","reardelt","rotatorcuff","lats","upperback","biceps","triceps","forearms",
      "abs","obliques","lowerback","glutes","abductors","hipflexors","adductors","quads","hamstrings","calves","shins","feet"])assert.ok(MUSCLE_NAME[g],g);
    // Every head of the many-headed muscles.
    assert.deepEqual(partsIn("quads"),["rectusfem","vastuslat","vastusmed","vastusint"]);
    assert.deepEqual(partsIn("hamstrings"),["bicepsfem","semitend","semimem"]);
    assert.deepEqual(partsIn("triceps"),["tricepslong","tricepslat","tricepsmed"]);
    assert.deepEqual(partsIn("rotatorcuff"),["supraspinatus","infraspinatus","teresminor","subscapularis"]);
    assert.deepEqual(partsIn("traps"),["uppertrap","midtrap","lowertrap"]);
  });
  test("every muscle on the surface is drawn, front or back, and no deep one is",()=>{
    const drawn=new Set(FRONT.concat(BACK).map(x=>x[0]));
    PARTS.forEach(([k])=>{if(PART_DEEP[k])assert.ok(!drawn.has(k),k+" is deep but drawn");else assert.ok(drawn.has(k),k+" isn't drawn");});
    drawn.forEach(k=>assert.ok(PART_NAME[k],"drawn but unknown: "+k));
  });
  test("every shape is a closed path of plain commands, on the left half of the board",()=>{
    const all=SKIN.map(d=>["skin",d]).concat(FRONT,BACK);
    all.forEach(([k,d])=>{
      assert.match(d,/^M[\d. ]+([LQCZ][\d. ]*)+$/,k);assert.ok(d.endsWith("Z"),k);
      const n=d.match(/-?\d+(\.\d+)?/g).map(Number);
      for(let i=0;i<n.length;i+=2){assert.ok(n[i]>=28&&n[i]<=118,k+" x "+n[i]);assert.ok(n[i+1]>=4&&n[i+1]<=440,k+" y "+n[i+1]);}
    });
    // Muscles stay on their own half, so the mirrored half meets them at the midline.
    FRONT.concat(BACK).forEach(([k,d])=>d.match(/-?\d+(\.\d+)?/g).map(Number).filter((v,i)=>i%2===0).forEach(x=>assert.ok(x<=100,k+" crosses the midline at "+x)));
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
      m.secondary.forEach(k=>{assert.ok(!m.primary.includes(k),n);assert.ok(p.secondary.some(x=>PART_GROUP[x]===k),n);});}));
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
    PARTS.forEach(([k,,,deep])=>{if(typeof deep==="string"){assert.ok(PART_DEEP[k]);assert.ok(drawn.has(deep),k+" under "+deep);}});
    assert.ok(PARTS.filter(p=>p[3]).length>=15,"the deep layer is there too");
  });
});
