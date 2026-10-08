// Learn's library — about 1.9 MB of topics, books and videos — loads just after the app's first
// paint, so logging opens at once and Learn is ready by the time it's tapped. Code outside
// Learn asks learnLib() and copes with null for the moment before it arrives.
let lib=null,pending=null;
export const learnLib=()=>lib;
export function loadLearn(){
  // A failed load (a dropped connection) is forgotten, so the next ask tries again.
  if(!pending)pending=Promise.all([import("./library.js"),import("./views/learn.js")])
    .then(([l,v])=>{lib=Object.assign({},l,v);return lib;},e=>{pending=null;throw e;});
  return pending;
}
// Topic lookup that is safe before the library has loaded.
export const topicById=id=>lib?lib.topicById(id):null;
