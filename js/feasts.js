// The church year, computed — no data files, works offline for any year. Fixed feasts are
// calendar dates; movable feasts hang off Easter. Western Easter uses the Gregorian
// computus (Butcher's algorithm); Orthodox Pascha uses the Julian computus, shifted to the
// civil (Gregorian) calendar — the +13 day offset holds for 1900–2099.
const JULIAN_OFFSET_DAYS=13;

export function westernEaster(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,
    f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
    i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(y,month-1,day);
}

export function orthodoxPascha(y){
  const a=y%4,b=y%7,c=y%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7;
  const month=Math.floor((d+e+114)/31),day=((d+e+114)%31)+1;
  const julian=new Date(y,month-1,day);
  julian.setDate(julian.getDate()+JULIAN_OFFSET_DAYS);
  return julian;
}

function plus(date,days){const d=new Date(date);d.setDate(d.getDate()+days);return d;}

// Advent begins the fourth Sunday before Christmas.
function adventStart(y){
  const xmas=new Date(y,11,25);
  return plus(xmas,-(((xmas.getDay()+6)%7)+1)-21);
}

// Each tradition's feasts for a year: fixed dates plus the Easter-anchored cycle.
function westernFeasts(y){
  const e=westernEaster(y);
  return [
    [new Date(y,0,6),"Epiphany"],
    [plus(e,-46),"Ash Wednesday"],
    [plus(e,-7),"Palm Sunday"],
    [plus(e,-3),"Maundy Thursday"],
    [plus(e,-2),"Good Friday"],
    [e,"Easter"],
    [plus(e,39),"Ascension"],
    [plus(e,49),"Pentecost"],
    [new Date(y,10,1),"All Saints"],
    [adventStart(y),"Advent begins"],
    [new Date(y,11,25),"Christmas"],
  ];
}

function orthodoxFeasts(y){
  const p=orthodoxPascha(y);
  return [
    [new Date(y,0,6),"Theophany"],
    [new Date(y,1,2),"Presentation"],
    [new Date(y,2,25),"Annunciation"],
    [plus(p,-48),"Clean Monday"],
    [plus(p,-7),"Palm Sunday"],
    [plus(p,-2),"Great Friday"],
    [p,"Pascha"],
    [plus(p,39),"Ascension"],
    [plus(p,49),"Pentecost"],
    [new Date(y,7,6),"Transfiguration"],
    [new Date(y,7,15),"Dormition"],
    [new Date(y,8,14),"Exaltation of the Cross"],
    [new Date(y,11,25),"Nativity"],
  ];
}

// The month's feasts as {day: name}, for the tradition chosen in settings.
export function feastsForMonth(y,m,tradition){
  if(tradition!=="western"&&tradition!=="orthodox")return {};
  const list=tradition==="orthodox"?orthodoxFeasts(y):westernFeasts(y);
  const out={};
  list.forEach(f=>{if(f[0].getFullYear()===y&&f[0].getMonth()===m)out[f[0].getDate()]=f[1];});
  return out;
}
