import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync,existsSync} from "node:fs";

// The service worker precaches the app for offline use; a module missing from its list
// would break the app the first time it opens without a connection.
const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
const listed=[...sw.matchAll(/"((?:js|icons)\/[^"]+)"/g)].map(m=>m[1]);

function jsFiles(dir){
  return readdirSync(new URL("../"+dir,import.meta.url),{withFileTypes:true}).flatMap(d=>
    d.isDirectory()?jsFiles(dir+"/"+d.name):(d.name.endsWith(".js")?[dir+"/"+d.name]:[]));
}

test("every listed asset exists",()=>{
  listed.forEach(p=>assert.ok(existsSync(new URL("../"+p,import.meta.url)),p+" is listed but missing"));
});

test("every app module is precached for offline use",()=>{
  jsFiles("js").forEach(p=>assert.ok(listed.includes(p),p+" is not in sw.js ASSETS"));
});
