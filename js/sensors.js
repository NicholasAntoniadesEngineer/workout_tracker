// The device side of cardio: GPS while the app is open, a screen wake lock so it stays open, a
// Bluetooth heart-rate strap or watch (where the browser allows it), and a beep and buzz at
// each phase change. Each piece fails quietly and says why, so a session never breaks on it.
import {acceptFix,parseHeartRate} from "./cardio.js";

let watchId=null,wake=null,hrDevice=null,ctx=null;

export const gpsSupported=()=>typeof navigator!=="undefined"&&!!navigator.geolocation;
export const hrSupported=()=>typeof navigator!=="undefined"&&!!navigator.bluetooth;

// onFix({t,lat,lon,alt,acc}) for each good fix; onError(message) if location is refused.
export function startGps(onFix,onError){
  if(!gpsSupported()){onError&&onError("This device can't share its location.");return;}
  stopGps();
  let prev=null;
  watchId=navigator.geolocation.watchPosition(p=>{
    const fix={t:p.timestamp||Date.now(),lat:p.coords.latitude,lon:p.coords.longitude,
      alt:p.coords.altitude==null?null:p.coords.altitude,acc:p.coords.accuracy};
    if(acceptFix(prev,fix)){prev=fix;onFix(fix);}
  },e=>onError&&onError(e.code===1?"Location is off for KingsKiln. Allow it in your browser's settings to track distance.":
    "No GPS fix yet. Head outside with a clear view of the sky."),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
}
export function stopGps(){if(watchId!=null&&gpsSupported())navigator.geolocation.clearWatch(watchId);watchId=null;}

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
// iPhone only plays sound after a tap: unlock audio on the Start tap.
export function primeAudio(){try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();ctx.resume&&ctx.resume();}catch(e){}}
