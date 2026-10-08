// The church calendar: Western Easter and Orthodox Pascha against published dates and against a
// second, independent computus (Gauss's), the moveable feasts that hang off them, the fixed
// feasts, and the month view the calendar reads, in time zones whose clocks jump at midnight.
import {test,describe} from "node:test";
import assert from "node:assert/strict";
import {westernEaster,orthodoxPascha,feastsForMonth} from "../js/feasts.js";

const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const pad=n=>String(n).padStart(2,"0");
// Every feast of a year, from the month view, as "YYYY-MM-DD name".
function yearFeasts(y,tradition){
  const out=[];
  for(let m=0;m<12;m++)Object.entries(feastsForMonth(y,m,tradition)).forEach(([d,n])=>out.push(y+"-"+pad(m+1)+"-"+pad(d)+" "+n));
  return out;
}
const find=(y,tradition,name)=>yearFeasts(y,tradition).find(x=>x.endsWith(" "+name)).slice(0,10);
function inZone(tz,fn){const was=process.env.TZ;process.env.TZ=tz;try{fn();}finally{if(was===undefined)delete process.env.TZ;else process.env.TZ=was;}}

// Gauss's Easter, written from his rules rather than from Butcher's algorithm the app uses.
function gaussGregorian(y){
  const a=y%19,b=y%4,c=y%7,k=Math.floor(y/100),p=Math.floor((13+8*k)/25),q=Math.floor(k/4);
  const M=(15-p+k-q)%30,N=(4+k-q)%7,d=(19*a+M)%30,e=(2*b+4*c+6*d+N)%7;
  if(d===29&&e===6)return y+"-04-19";
  if(d===28&&e===6&&(11*M+11)%30<19)return y+"-04-18";
  return 22+d+e<=31?y+"-03-"+pad(22+d+e):y+"-04-"+pad(d+e-9);
}
// Gauss's Julian Easter, then carried to the civil calendar through the Julian day number, so
// the 13-day gap is worked out rather than assumed.
function gaussJulianCivil(y){
  const a=y%19,b=y%4,c=y%7,d=(19*a+15)%30,e=(2*b+4*c+6*d+6)%7;
  let m=3,day=22+d+e;if(day>31){m=4;day-=31;}
  const A=Math.floor((14-m)/12),Y=y+4800-A,Mo=m+12*A-3;
  const jdn=day+Math.floor((153*Mo+2)/5)+365*Y+Math.floor(Y/4)-32083;
  return new Date((jdn-2440588)*86400000).toISOString().slice(0,10);
}

const WESTERN={2000:"04-23",2001:"04-15",2002:"03-31",2003:"04-20",2004:"04-11",2005:"03-27",2006:"04-16",2007:"04-08",2008:"03-23",
  2009:"04-12",2010:"04-04",2011:"04-24",2012:"04-08",2013:"03-31",2014:"04-20",2015:"04-05",2016:"03-27",2017:"04-16",2018:"04-01",
  2019:"04-21",2020:"04-12",2021:"04-04",2022:"04-17",2023:"04-09",2024:"03-31",2025:"04-20",2026:"04-05",2027:"03-28",2028:"04-16",
  2029:"04-01",2030:"04-21",2031:"04-13",2032:"03-28",2033:"04-17",2034:"04-09",2035:"03-25",2036:"04-13",2037:"04-05",2038:"04-25",
  2039:"04-10",2040:"04-01",1913:"03-23",1943:"04-25",1954:"04-18",1981:"04-19",2049:"04-18",2076:"04-19",1818:"03-22",2285:"03-22"};
const ORTHODOX={2000:"04-30",2001:"04-15",2002:"05-05",2003:"04-27",2004:"04-11",2005:"05-01",2006:"04-23",2007:"04-08",2008:"04-27",
  2009:"04-19",2010:"04-04",2011:"04-24",2012:"04-15",2013:"05-05",2014:"04-20",2015:"04-12",2016:"05-01",2017:"04-16",2018:"04-08",
  2019:"04-28",2020:"04-19",2021:"05-02",2022:"04-24",2023:"04-16",2024:"05-05",2025:"04-20",2026:"04-12",2027:"05-02",2028:"04-16",
  2029:"04-08",2030:"04-28",2031:"04-13",2032:"05-02",2033:"04-24",2034:"04-09",2035:"04-29",2036:"04-20",2037:"04-05",2038:"04-25",
  2039:"04-17",2040:"05-06"};

describe("Easter and Pascha",()=>{
  test("Western Easter matches the published dates, the extremes and Gauss's exception years",()=>{
    for(const [y,md] of Object.entries(WESTERN))assert.equal(ymd(westernEaster(+y)),y+"-"+md,y);
  });
  test("Orthodox Pascha matches the published dates, 2000 to 2040",()=>{
    for(const [y,md] of Object.entries(ORTHODOX))assert.equal(ymd(orthodoxPascha(+y)),y+"-"+md,y);
  });
  test("the dates asked for: 2024 to 2027",()=>{
    assert.deepEqual([2024,2025,2026,2027].map(y=>ymd(westernEaster(y))),["2024-03-31","2025-04-20","2026-04-05","2027-03-28"]);
    assert.deepEqual([2024,2025,2026,2027].map(y=>ymd(orthodoxPascha(y))),["2024-05-05","2025-04-20","2026-04-12","2027-05-02"]);
  });
  test("both agree with an independent computus for every year from 1900 to 2099",()=>{
    for(let y=1900;y<=2099;y++){
      assert.equal(ymd(westernEaster(y)),gaussGregorian(y),"Western "+y);
      assert.equal(ymd(orthodoxPascha(y)),gaussJulianCivil(y),"Orthodox "+y);
    }
  });
  test("always a Sunday, inside the possible window, Pascha never before Western Easter",()=>{
    for(let y=1900;y<=2099;y++){
      const w=westernEaster(y),o=orthodoxPascha(y);
      assert.equal(w.getDay(),0,"Western "+y);assert.equal(o.getDay(),0,"Orthodox "+y);
      assert.ok(ymd(w).slice(5)>="03-22"&&ymd(w).slice(5)<="04-25",ymd(w));
      assert.ok(ymd(o).slice(5)>="04-04"&&ymd(o).slice(5)<="05-08",ymd(o));
      const gap=Math.round((o-w)/86400000);
      assert.ok([0,7,28,35].includes(gap),y+": "+gap+" days apart");
    }
  });
  test("the years both churches keep Easter together",()=>{
    const together=[];for(let y=2000;y<=2040;y++)if(ymd(westernEaster(y))===ymd(orthodoxPascha(y)))together.push(y);
    assert.deepEqual(together,[2001,2004,2007,2010,2011,2014,2017,2025,2028,2031,2034,2037,2038]);
  });
  test("each call returns its own date, so moving one never moves the next",()=>{
    const a=westernEaster(2026);a.setDate(a.getDate()+10);
    assert.equal(ymd(westernEaster(2026)),"2026-04-05");
    const b=orthodoxPascha(2026);b.setDate(1);
    assert.equal(ymd(orthodoxPascha(2026)),"2026-04-12");
  });
});

describe("moveable feasts",()=>{
  test("Western: Ash Wednesday, Palm Sunday, the Triduum, Ascension and Pentecost for 2024 to 2027",()=>{
    const want={
      2024:["02-14","03-24","03-28","03-29","05-09","05-19"],2025:["03-05","04-13","04-17","04-18","05-29","06-08"],
      2026:["02-18","03-29","04-02","04-03","05-14","05-24"],2027:["02-10","03-21","03-25","03-26","05-06","05-16"]};
    for(const [y,dates] of Object.entries(want))
      assert.deepEqual(["Ash Wednesday","Palm Sunday","Maundy Thursday","Good Friday","Ascension","Pentecost"].map(n=>find(+y,"western",n).slice(5)),dates,y);
  });
  test("Orthodox: Clean Monday, Palm Sunday, Great Friday, Ascension and Pentecost for 2024 to 2027",()=>{
    const want={
      2024:["03-18","04-28","05-03","06-13","06-23"],2025:["03-03","04-13","04-18","05-29","06-08"],
      2026:["02-23","04-05","04-10","05-21","05-31"],2027:["03-15","04-25","04-30","06-10","06-20"]};
    for(const [y,dates] of Object.entries(want))
      assert.deepEqual(["Clean Monday","Palm Sunday","Great Friday","Ascension","Pentecost"].map(n=>find(+y,"orthodox",n).slice(5)),dates,y);
  });
  test("Ash Wednesday counts back across February in leap years and ordinary ones",()=>{
    assert.equal(find(2024,"western","Ash Wednesday"),"2024-02-14");   // leap: 29 February in between
    assert.equal(find(2008,"western","Ash Wednesday"),"2008-02-06");
    assert.equal(find(2028,"western","Ash Wednesday"),"2028-03-01");   // the day after 29 February
    assert.equal(find(2017,"western","Ash Wednesday"),"2017-03-01");
    assert.equal(find(2013,"western","Ash Wednesday"),"2013-02-13");
  });
  test("each feast falls on its own weekday every year",()=>{
    const wd={"Ash Wednesday":3,"Palm Sunday":0,"Maundy Thursday":4,"Good Friday":5,"Easter":0,"Ascension":4,"Pentecost":0,"Advent begins":0,
      "Clean Monday":1,"Great Friday":5,"Pascha":0};
    for(let y=1900;y<=2099;y++)for(const t of ["western","orthodox"])yearFeasts(y,t).forEach(x=>{
      const n=x.slice(11);if(n in wd)assert.equal(new Date(x.slice(0,10)+"T12:00:00").getDay(),wd[n],x);
    });
  });
  test("Advent begins on the fourth Sunday before Christmas, between 27 November and 3 December",()=>{
    assert.deepEqual([2021,2022,2023,2024,2025,2026,2027].map(y=>find(y,"western","Advent begins")),
      ["2021-11-28","2022-11-27","2023-12-03","2024-12-01","2025-11-30","2026-11-29","2027-11-28"]);
    for(let y=1900;y<=2099;y++){const d=find(y,"western","Advent begins").slice(5);assert.ok(d>="11-27"&&d<="12-03",y+": "+d);
      const days=Math.round((new Date(y,11,25)-new Date(y+"-"+d+"T00:00:00"))/86400000);assert.ok(days>=22&&days<=28,y+": "+days);}
  });
});

describe("fixed feasts and the month view",()=>{
  test("the Western fixed feasts sit on their dates",()=>{
    assert.deepEqual(feastsForMonth(2026,0,"western"),{6:"Epiphany"});
    assert.deepEqual(feastsForMonth(2026,10,"western"),{1:"All Saints",29:"Advent begins"});
    assert.deepEqual(feastsForMonth(2026,11,"western"),{25:"Christmas"});
    assert.deepEqual(feastsForMonth(2026,3,"western"),{2:"Maundy Thursday",3:"Good Friday",5:"Easter"});
  });
  test("the Orthodox fixed feasts sit on their dates",()=>{
    assert.deepEqual(feastsForMonth(2026,0,"orthodox"),{6:"Theophany"});
    assert.deepEqual(feastsForMonth(2026,1,"orthodox"),{2:"Presentation",23:"Clean Monday"});
    assert.deepEqual(feastsForMonth(2026,2,"orthodox"),{25:"Annunciation"});
    assert.deepEqual(feastsForMonth(2026,3,"orthodox"),{5:"Palm Sunday",10:"Great Friday",12:"Pascha"});
    assert.deepEqual(feastsForMonth(2026,7,"orthodox"),{6:"Transfiguration",15:"Dormition"});
    assert.deepEqual(feastsForMonth(2026,8,"orthodox"),{14:"Exaltation of the Cross"});
    assert.deepEqual(feastsForMonth(2026,11,"orthodox"),{25:"Nativity"});
  });
  test("no two feasts ever share a day, so the month view never hides one",()=>{
    for(let y=1900;y<=2099;y++){assert.equal(yearFeasts(y,"western").length,11,"Western "+y);assert.equal(yearFeasts(y,"orthodox").length,13,"Orthodox "+y);}
  });
  test("calendar off, or anything unknown, marks nothing",()=>{
    for(const t of ["off","",undefined,null,"Western","catholic"])for(let m=0;m<12;m++)assert.deepEqual(feastsForMonth(2026,m,t),{},String(t));
  });
  test("a month with no feasts is empty, and every day given is a real day of that month",()=>{
    assert.deepEqual(feastsForMonth(2026,6,"western"),{});assert.deepEqual(feastsForMonth(2026,9,"orthodox"),{});
    for(let y=2020;y<=2030;y++)for(let m=0;m<12;m++)for(const t of ["western","orthodox"])Object.keys(feastsForMonth(y,m,t)).forEach(d=>{
      const n=+d;assert.ok(Number.isInteger(n)&&n>=1&&n<=new Date(y,m+1,0).getDate(),y+"-"+(m+1)+" "+d);});
  });
});

describe("time zones",()=>{
  // São Paulo, Beirut, Tehran and Santiago have moved their clocks at midnight, the hour a feast's
  // date is built on; Sydney and London are the usual northern and southern switches.
  for(const tz of ["America/Sao_Paulo","Asia/Beirut","Asia/Tehran","America/Santiago","Australia/Sydney","Europe/London","Pacific/Kiritimati"])
    test("the same dates in "+tz,()=>inZone(tz,()=>{
      for(let y=1990;y<=2040;y++){
        assert.equal(ymd(westernEaster(y)),gaussGregorian(y),tz+" Western "+y);
        assert.equal(ymd(orthodoxPascha(y)),gaussJulianCivil(y),tz+" Orthodox "+y);
        assert.equal(yearFeasts(y,"western").length,11,tz+" "+y);assert.equal(yearFeasts(y,"orthodox").length,13,tz+" "+y);
      }
      assert.equal(find(2026,"western","Ash Wednesday"),"2026-02-18");assert.equal(find(2026,"orthodox","Pentecost"),"2026-05-31");
      assert.equal(find(2018,"western","Advent begins"),"2018-12-02");
    }));
});
