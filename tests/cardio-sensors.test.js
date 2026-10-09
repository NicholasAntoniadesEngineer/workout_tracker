import {test,describe,mock,beforeEach,afterEach} from "node:test";
import assert from "node:assert/strict";

// The phone's side of cardio, with the phone faked: which GPS fixes reach the session, how a
// slow first fix and a lost signal are handled, what each location failure is called, and the
// heart-rate strap's readings. Nothing here may throw when a sensor is missing.

const watches=new Map();let nextId=1;
const geo={watchPosition(ok,err,opts){const id=nextId++;watches.set(id,{ok,err,opts});return id;},clearWatch(id){watches.delete(id);}};
const one=()=>[...watches.values()][0];
const pos=(lat,acc,t=Date.now())=>({timestamp:t,coords:{latitude:lat,longitude:0,altitude:null,accuracy:acc}});
const M=1/111194.9;

const sensors=await import("../js/sensors.js");
const T0=Date.UTC(2026,2,1,6);

// Node before 21 has no navigator; the browser always does.
if(typeof navigator==="undefined")Object.defineProperty(globalThis,"navigator",{configurable:true,writable:true,value:{}});
beforeEach(()=>{watches.clear();mock.timers.enable({apis:["Date"],now:T0});
  Object.defineProperty(navigator,"geolocation",{configurable:true,value:geo});});
afterEach(()=>{sensors.stopGps();sensors.stopWarm();mock.timers.reset();delete navigator.geolocation;});

describe("GPS during a session",()=>{
  test("asks for high accuracy, fresh fixes and a 30 s timeout",()=>{
    sensors.startGps(()=>{});
    assert.deepEqual(one().opts,{enableHighAccuracy:true,maximumAge:0,timeout:30000});
  });
  test("only fixes that pass the filter reach the session, but every reading shows as signal",()=>{
    const kept=[],signal=[];
    sensors.startGps(f=>kept.push(f),null,a=>signal.push(a));
    const w=one();
    w.ok(pos(51,8));
    mock.timers.tick(1000);w.ok(pos(51+1*M,8));          // 1 m: jitter
    mock.timers.tick(1000);w.ok(pos(51+20*M,70));        // poor accuracy
    mock.timers.tick(1000);w.ok(pos(51+10*M,8));
    assert.deepEqual(signal,[8,8,70,8]);
    assert.equal(kept.length,2);
    assert.deepEqual(Object.keys(kept[0]).sort(),["acc","alt","lat","lon","t"]);
    assert.equal(kept[0].alt,null);
  });
  test("a slow first fix is taken at up to 100 m after twenty seconds of waiting",()=>{
    const kept=[];
    sensors.startGps(f=>kept.push(f));
    one().ok(pos(51,80));
    assert.equal(kept.length,0,"80 m is refused straight away");
    mock.timers.tick(21000);
    one().ok(pos(51,80));
    assert.equal(kept.length,1);
    mock.timers.tick(5000);
    one().ok(pos(51+30*M,80));
    assert.equal(kept.length,1,"once a fix is kept, the 50 m limit is back");
  });
  test("a timeout keeps listening and says to head outside; a block says it is blocked",()=>{
    const errs=[];
    sensors.startGps(()=>{},(m,c)=>errs.push([m,c]));
    const first=one();
    first.err({code:3,message:"Timeout expired"});
    assert.equal(watches.size,1);
    assert.notEqual(one(),first,"re-armed with a new watch");
    assert.equal(errs[0][1],3);assert.match(errs[0][0],/No GPS fix yet/);
    one().err({code:1,message:"User denied"});
    assert.deepEqual(errs[1],["Location is blocked for KingsKiln.",1]);
    one().err({code:2});
    assert.deepEqual(errs[2],["Your phone's location is unavailable.",2]);
  });
  test("stopping clears the watch; a phone without location says so instead of throwing",()=>{
    sensors.startGps(()=>{});
    sensors.stopGps();
    assert.equal(watches.size,0);
    delete navigator.geolocation;
    const errs=[];
    assert.equal(sensors.gpsSupported(),false);
    sensors.startGps(()=>{},(m,c)=>errs.push([m,c]));
    assert.deepEqual(errs,[["This device can't share its location.",0]]);
    assert.doesNotThrow(()=>sensors.stopGps());
  });
});

describe("GPS before Start",()=>{
  test("each failure gets its own reason, and a timeout re-arms",()=>{
    const fails=[];
    sensors.warmGps(()=>{},(why,code,msg)=>fails.push([why,code,msg]));
    one().err({code:1,message:"denied"});one().err({code:2});one().err({code:9});
    const before=one();one().err({code:3,message:"t"});
    assert.deepEqual(fails,[["denied",1,"denied"],["off",2,""],["nofix",9,""],["nofix",3,"t"]]);
    assert.notEqual(one(),before);
  });
  test("signal readings are passed on as they come",()=>{
    const acc=[];
    sensors.warmGps(a=>acc.push(a),()=>{});
    one().ok(pos(51,35));one().ok(pos(51,12));
    assert.deepEqual(acc,[35,12]);
  });
  test("starting the session stops the warm-up watch",()=>{
    sensors.warmGps(()=>{},()=>{});
    sensors.startGps(()=>{});
    assert.equal(watches.size,1);
  });
  test("permission state comes from the browser when it will say, else unknown",async()=>{
    assert.equal(await sensors.gpsPermission(),"unknown");
    Object.defineProperty(navigator,"permissions",{configurable:true,value:{query:async q=>({state:q.name==="geolocation"?"granted":"x"})}});
    try{assert.equal(await sensors.gpsPermission(),"granted");}
    finally{delete navigator.permissions;}
    Object.defineProperty(navigator,"permissions",{configurable:true,value:{query:async()=>{throw new Error("no");}}});
    try{assert.equal(await sensors.gpsPermission(),"unknown");}
    finally{delete navigator.permissions;}
  });
});

describe("a heart-rate strap",()=>{
  test("each Bluetooth notification becomes a beat-per-minute reading",async()=>{
    const listeners={};
    const ch={addEventListener:(k,f)=>{listeners[k]=f;},startNotifications:async()=>{}};
    const dev={name:"Polar H10",addEventListener:(k,f)=>{listeners["dev:"+k]=f;},
      gatt:{connected:true,connect:async()=>({getPrimaryService:async()=>({getCharacteristic:async()=>ch})}),disconnect(){this.connected=false;}}};
    Object.defineProperty(navigator,"bluetooth",{configurable:true,value:{requestDevice:async()=>dev}});
    try{
      const bpm=[],states=[];
      const name=await sensors.connectHeartRate(b=>bpm.push(b),(s,n)=>states.push([s,n]));
      assert.equal(name,"Polar H10");
      listeners.characteristicvaluechanged({target:{value:new DataView(Uint8Array.from([0,142]).buffer)}});
      listeners.characteristicvaluechanged({target:{value:new DataView(Uint8Array.from([1,0x2c,0x01]).buffer)}});
      assert.deepEqual(bpm,[142,300]);
      listeners["dev:gattserverdisconnected"]();
      assert.deepEqual(states,[["connected","Polar H10"],["disconnected",undefined]]);
      sensors.disconnectHeartRate();
      assert.equal(dev.gatt.connected,false);
    }finally{delete navigator.bluetooth;}
  });
  test("a browser without Bluetooth refuses cleanly",async()=>{
    assert.equal(sensors.hrSupported(),false);
    await assert.rejects(sensors.connectHeartRate(()=>{}),/unsupported/);
    assert.doesNotThrow(()=>sensors.disconnectHeartRate());
  });
});

describe("sound, speech and staying awake without the hardware",()=>{
  test("none of them throw where the browser lacks the feature",async()=>{
    assert.doesNotThrow(()=>sensors.cue("work"));
    assert.doesNotThrow(()=>sensors.say("Kilometre 1."));
    assert.doesNotThrow(()=>sensors.primeAudio());
    assert.doesNotThrow(()=>sensors.keepAlive(true));
    assert.doesNotThrow(()=>sensors.keepAlive(false));
    await assert.doesNotReject(sensors.keepAwake(true));
    await assert.doesNotReject(sensors.keepAwake(false));
    assert.equal(sensors.voiceSupported(),false);
  });
});
