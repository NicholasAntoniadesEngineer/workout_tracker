// Headless Chrome for the browser tests and for drawing the test sheets: the repo served on a
// local port, one page driven over the DevTools protocol. Chrome is found where macOS, Linux
// or CHROME puts it; without it the browser tests skip.
import {spawn} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import {fileURLToPath} from "node:url";

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const CANDIDATES=[process.env.CHROME,"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome","/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"].filter(Boolean);
export const chromePath=()=>CANDIDATES.find(p=>{try{return fs.statSync(p).isFile();}catch(e){return false;}})||null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TYPES={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/manifest+json"};

// The repo over http, plus a blank page at /__blank for tests that build their own page.
// opts.override(path) may return a file's contents to serve instead (a new release, say).
export function serve(opts){
  const o=opts||{};
  return new Promise(ok=>{
    const srv=http.createServer((req,res)=>{
      const u=decodeURIComponent(req.url.split("?")[0]);
      if(u==="/__blank"){res.writeHead(200,{"content-type":"text/html"});res.end("<!doctype html><meta charset='utf-8'><body style='margin:0'></body>");return;}
      const swap=o.override&&o.override(u);
      if(swap!=null){res.writeHead(200,{"content-type":TYPES[path.extname(u)]||"text/plain","cache-control":"no-store"});res.end(swap);return;}
      const f=path.join(ROOT,u==="/"?"index.html":u);
      if(!f.startsWith(ROOT)){res.writeHead(403);res.end();return;}
      fs.readFile(f,(err,data)=>{if(err){res.writeHead(404);res.end();return;}
        res.writeHead(200,{"content-type":TYPES[path.extname(f)]||"application/octet-stream","cache-control":"no-store"});res.end(data);});
    });
    srv.listen(0,"127.0.0.1",()=>ok({url:"http://127.0.0.1:"+srv.address().port,close:()=>srv.close()}));
  });
}

// A page: {send(method, params), eval(js) → value, nav(url), shot(), pdf(), size(w,h,mobile), tab() →
// another page in the same browser (sharing its storage, like a second window), close()}.
export async function launch(opts){
  const o=opts||{},exe=chromePath();if(!exe)throw new Error("Chrome not found");
  const port=9400+Math.floor(Math.random()*500),dir=fs.mkdtempSync(path.join(os.tmpdir(),"kk-chrome-"));
  const proc=spawn(exe,["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check","--hide-scrollbars","--remote-debugging-port="+port,"--user-data-dir="+dir,"--window-size="+(o.w||1200)+","+(o.h||900),"about:blank"],{stdio:"ignore"});
  let wsUrl=null;
  for(let i=0;i<80&&!wsUrl;i++){try{const l=await (await fetch("http://127.0.0.1:"+port+"/json/list")).json();const pg=l.find(x=>x.type==="page");if(pg)wsUrl=pg.webSocketDebuggerUrl;}catch(e){}if(!wsUrl)await sleep(150);}
  if(!wsUrl){proc.kill();throw new Error("Chrome didn't start");}
  const quit=()=>{proc.kill();try{fs.rmSync(dir,{recursive:true,force:true});}catch(e){}};
  const page=await connect(wsUrl,port,quit);
  await page.size(o.w||1200,o.h||900,o.mobile,o.scale);
  return page;
}
async function connect(wsUrl,port,quit){
  const ws=new WebSocket(wsUrl);
  await new Promise(r=>ws.addEventListener("open",r));
  let id=0;const pending={},errors=[];
  ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);if(m.id&&pending[m.id]){pending[m.id](m);delete pending[m.id];}
    if(m.method==="Runtime.exceptionThrown")errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
  const send=(method,params)=>new Promise(r=>{const i=++id;pending[i]=r;ws.send(JSON.stringify({id:i,method,params:params||{}}));});
  await send("Runtime.enable");await send("Page.enable");
  const page={
    errors,send,
    async size(w,h,mobile,scale){await send("Emulation.setDeviceMetricsOverride",{width:w,height:h,deviceScaleFactor:scale||1,mobile:!!mobile});},
    async nav(url,wait){await send("Page.navigate",{url});await sleep(wait==null?900:wait);},
    async eval(js){const r=await send("Runtime.evaluate",{expression:"(async()=>{"+js+"})()",awaitPromise:true,returnByValue:true});
      const ex=r.result&&r.result.exceptionDetails;if(ex)throw new Error(ex.exception?.description||ex.text);return r.result.result.value;},
    async shot(){const r=await send("Page.captureScreenshot",{format:"png"});return Buffer.from(r.result.data,"base64");},
    async pdf(){const r=await send("Page.printToPDF",{preferCSSPageSize:true,printBackground:true});if(!r.result)throw new Error(JSON.stringify(r.error));return Buffer.from(r.result.data,"base64");},
    // A second window of the same browser.
    async tab(){const t=await (await fetch("http://127.0.0.1:"+port+"/json/new?about:blank",{method:"PUT"})).json();
      const p=await connect(t.webSocketDebuggerUrl,port,()=>{fetch("http://127.0.0.1:"+port+"/json/close/"+t.id).catch(()=>{});});
      return p;},
    close(){try{ws.close();}catch(e){}if(quit)quit();},
  };
  return page;
}
