// The device side of cardio: GPS while the app is open, a screen wake lock so it stays open, a
// Bluetooth heart-rate strap or watch (where the browser allows it), and a beep and buzz at
// each phase change. Each piece fails quietly and says why, so a session never breaks on it.
import {acceptFix,parseHeartRate} from "./cardio.js";

let watchId=null,wake=null,hrDevice=null,ctx=null;

export const gpsSupported=()=>typeof navigator!=="undefined"&&!!navigator.geolocation;
export const hrSupported=()=>typeof navigator!=="undefined"&&!!navigator.bluetooth;

// Where location stands for this site: "granted", "prompt", "denied", or "unknown" where the
// browser won't say (older iPhones).
export async function gpsPermission(){
  try{if(navigator.permissions&&navigator.permissions.query)return (await navigator.permissions.query({name:"geolocation"})).state;}catch(e){}
  return "unknown";
}
// Why location failed, by the browser's error code: blocked for the site, off on the phone, or no fix yet.
const WHY={1:"denied",2:"off",3:"nofix"};

// onFix({t,lat,lon,alt,acc}) for each good fix; onError(message, code) when location fails;
// onSignal(accuracy in metres) for every reading, good or not, so the screen can show signal.
// A timeout (no fix yet) re-arms the watch rather than giving up, and until a first fix is kept
// readings up to 100 m are taken so a slow start still begins the track.
let gpsOpts=null;
export function startGps(onFix,onError,onSignal){
  if(!gpsSupported()){onError&&onError("This device can't share its location.",0);return;}
  stopGps();stopWarm();
  let prev=null;const began=Date.now();
  const arm=()=>{
    watchId=navigator.geolocation.watchPosition(p=>{
      const fix={t:p.timestamp||Date.now(),lat:p.coords.latitude,lon:p.coords.longitude,
        alt:p.coords.altitude==null?null:p.coords.altitude,acc:p.coords.accuracy};
      onSignal&&onSignal(fix.acc);
      const limit=prev?50:(Date.now()-began>20000?100:50);
      if(acceptFix(prev,fix,limit)){prev=fix;onFix(fix);}
    },e=>{
      if(e.code===3){if(watchId!=null){navigator.geolocation.clearWatch(watchId);arm();}
        onError&&onError("No GPS fix yet. Head outside with a clear view of the sky.",3);return;}
      onError&&onError(e.code===1?"Location is blocked for KingsKiln.":e.code===2?"Your phone's location is unavailable.":"Location failed.",e.code,e.message);
    },{enableHighAccuracy:true,maximumAge:0,timeout:30000});
  };
  gpsOpts=arm;arm();
}
export function stopGps(){if(watchId!=null&&gpsSupported())navigator.geolocation.clearWatch(watchId);watchId=null;gpsOpts=null;}

// Turning GPS on before Start: this request is what brings up the phone's own location prompt
// (and on Android, the offer to switch location on). It keeps listening while the setup screen
// is open so the signal has settled by the time you start. onSignal(accuracy), onFail(why, code,
// the browser's own message). A timeout re-arms quietly after reporting it.
let warmId=null;
export function warmGps(onSignal,onFail){
  if(!gpsSupported()){onFail("none",0,"");return;}
  stopWarm();
  const arm=()=>{
    warmId=navigator.geolocation.watchPosition(p=>onSignal(p.coords.accuracy),e=>{
      onFail(WHY[e.code]||"nofix",e.code,e.message||"");
      if(e.code===3&&warmId!=null){navigator.geolocation.clearWatch(warmId);arm();}
    },{enableHighAccuracy:true,maximumAge:0,timeout:30000});
  };
  arm();
}
export function stopWarm(){if(warmId!=null&&gpsSupported())navigator.geolocation.clearWatch(warmId);warmId=null;}
// Running as an icon on the Home Screen, rather than in a browser tab.
export const standalone=()=>typeof matchMedia==="function"&&(matchMedia("(display-mode: standalone)").matches||navigator.standalone===true);

export async function keepAwake(on){
  try{
    if(on&&!wake&&navigator.wakeLock){wake=await navigator.wakeLock.request("screen");wake.addEventListener("release",()=>{wake=null;});}
    if(!on&&wake){await wake.release();wake=null;}
  }catch(e){wake=null;}
}
// The lock drops when the app is hidden; take it again on return if a session is live.
export function rewake(live){if(live&&document.visibilityState==="visible")keepAwake(true);}

// Pair a heart-rate strap or watch over Bluetooth; onBpm(bpm) for every reading.
export async function connectHeartRate(onBpm,onState){
  if(!hrSupported())throw new Error("unsupported");
  const dev=await navigator.bluetooth.requestDevice({filters:[{services:["heart_rate"]}]});
  hrDevice=dev;
  dev.addEventListener("gattserverdisconnected",()=>onState&&onState("disconnected"));
  const server=await dev.gatt.connect();
  const svc=await server.getPrimaryService("heart_rate");
  const ch=await svc.getCharacteristic("heart_rate_measurement");
  ch.addEventListener("characteristicvaluechanged",e=>onBpm(parseHeartRate(e.target.value)));
  await ch.startNotifications();
  onState&&onState("connected",dev.name||"Heart-rate monitor");
  return dev.name||"Heart-rate monitor";
}
export function disconnectHeartRate(){try{if(hrDevice&&hrDevice.gatt.connected)hrDevice.gatt.disconnect();}catch(e){}hrDevice=null;}

// A short beep (higher for work, lower for rest) and a buzz where phones allow it.
export function cue(kind){
  try{
    ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.frequency.value=kind==="work"?880:kind==="done"?660:520;
    g.gain.setValueAtTime(0.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.3,ctx.currentTime+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+(kind==="done"?0.8:0.35));
    o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.9);
  }catch(e){}
  try{navigator.vibrate&&navigator.vibrate(kind==="done"?[200,100,200]:kind==="work"?250:120);}catch(e){}
}
// Spoken cues — split times, interval changes — over whatever else is playing.
export const voiceSupported=()=>typeof window!=="undefined"&&"speechSynthesis" in window;
export function say(text){
  try{
    if(!voiceSupported()||!text)return;
    const u=new SpeechSynthesisUtterance(text);u.rate=1.02;
    window.speechSynthesis.speak(u);
  }catch(e){}
}
// Keeping the page awake under a locked iPhone: a silent, looping audio element started from a
// tap. Community practice rather than anything Apple promises, so everything that relies on it
// is labelled best effort. Stopped when the workout ends.
// Half a second of real silence: a clip with no samples loops flat out and swamps the page.
let keep=null,silence="";
function silentClip(){
  if(silence)return silence;
  const rate=8000,n=rate/2,b=new Uint8Array(44+n*2),v=new DataView(b.buffer),txt=(at,s)=>{for(let i=0;i<4;i++)b[at+i]=s.charCodeAt(i);};
  txt(0,"RIFF");v.setUint32(4,36+n*2,true);txt(8,"WAVE");txt(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);txt(36,"data");v.setUint32(40,n*2,true);
  try{silence=URL.createObjectURL(new Blob([b],{type:"audio/wav"}));}catch(e){let s="";for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);silence="data:audio/wav;base64,"+btoa(s);}
  return silence;
}
export function keepAlive(on){
  try{
    if(on&&!keep){
      keep=new Audio(silentClip());
      keep.loop=true;keep.volume=0.01;keep.play().catch(()=>{keep=null;});
    }else if(!on&&keep){keep.pause();keep=null;}
  }catch(e){keep=null;}
}
// iPhone only plays sound after a tap: unlock audio on the Start tap.
export function primeAudio(){try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();ctx.resume&&ctx.resume();}catch(e){}}
