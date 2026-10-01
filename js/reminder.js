// A training reminder without a server: a repeating calendar event, saved once into the
// phone's own calendar, which then does the reminding — offline, private, no push service.
const DAY_CODES=["MO","TU","WE","TH","FR","SA","SU"];
export const DAY_LETTERS=["M","T","W","T","F","S","S"];

const pad=n=>String(n).padStart(2,"0");
// Floating local time (no zone): the event stays at 7:00 wherever the phone is.
function localStamp(d){
  return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+"T"+pad(d.getHours())+pad(d.getMinutes())+"00";
}
function utcStamp(d){return d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");}

// days are indexes into DAY_CODES (0 = Monday); time is "HH:MM".
export function reminderICS(days,time,now){
  const t=String(time||"07:00").split(":").map(Number);
  const today=now?new Date(now):new Date();
  // First occurrence: the next chosen weekday at that time, today included if still ahead.
  let first=null;
  for(let i=0;i<8&&!first;i++){
    const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()+i,t[0]||0,t[1]||0);
    if(days.indexOf((d.getDay()+6)%7)>=0&&d>today)first=d;
  }
  if(!first)return "";
  const end=new Date(first.getTime()+45*60000);
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//KingsKiln//Training reminder//EN","CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:"+utcStamp(today)+"-"+days.join("")+"@kingskiln.com",
    "DTSTAMP:"+utcStamp(today),
    "DTSTART:"+localStamp(first),
    "DTEND:"+localStamp(end),
    "RRULE:FREQ=WEEKLY;BYDAY="+days.map(i=>DAY_CODES[i]).join(","),
    "SUMMARY:Train — KingsKiln",
    "DESCRIPTION:Time to train. Open KingsKiln to start today's workout.",
    "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Time to train","TRIGGER:PT0M","END:VALARM",
    "END:VEVENT","END:VCALENDAR"].join("\r\n");
}
