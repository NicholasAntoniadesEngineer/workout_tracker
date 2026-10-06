// Getting the newest version on demand. A home-screen app is often resumed rather than
// reopened, so the browser rarely checks for a new version by itself; these let Settings
// ask now. Your data lives in the database, not the app's file cache, so neither touches it.
import * as db from "./db.js";

const PREFIX="kingskiln-";
const num=k=>parseInt(k.slice(PREFIX.length+1),10)||0;

// The version this device is running, read from the cache name the service worker made.
export async function currentVersion(){
  try{
    const keys=(await caches.keys()).filter(k=>k.startsWith(PREFIX)).sort((a,b)=>num(b)-num(a));
    return keys.length?keys[0].slice(PREFIX.length):"";
  }catch(e){return "";}
}

// Ask the server for a newer version. "found" means one is installing and the page will
// reload itself when it takes over; "latest" means this is it; "offline" means no answer.
export async function checkForUpdate(){
  if(!("serviceWorker" in navigator))return "latest";
  try{
    const reg=await navigator.serviceWorker.getRegistration();
    if(!reg)return "latest";
    await reg.update();
    return reg.installing||reg.waiting?"found":"latest";
  }catch(e){return "offline";}
}

// The fallback that always works: drop the app's cached files and load everything fresh.
export async function freshReload(){
  try{await db.flush();}catch(e){}
  try{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)).map(k=>caches.delete(k)));}catch(e){}
  try{const reg=await navigator.serviceWorker.getRegistration();if(reg)await reg.unregister();}catch(e){}
  location.reload();
}

// Quietly look again whenever the app comes back to the front, at most every 10 minutes.
let lastCheck=0;
export function watchForUpdates(){
  if(typeof document==="undefined")return;
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState!=="visible"||Date.now()-lastCheck<600000)return;
    lastCheck=Date.now();checkForUpdate();
  });
}
