// Just enough of the browser's DOMParser for the GPX and TCX reader to run in Node: elements
// with qualified tag names, attributes, textContent and getElementsByTagName. Comments,
// declarations and CDATA are handled; anything unparseable is skipped, as a browser would
// leave a document with nothing useful in it.
const ENT={amp:"&",lt:"<",gt:">",quot:'"',apos:"'"};
const unesc=s=>s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi,(m,e)=>e[0]==="#"?String.fromCodePoint(e[1]==="x"||e[1]==="X"?parseInt(e.slice(2),16):+e.slice(1)):(ENT[e]??m));

class Node{
  constructor(tag,attrs){this.tagName=tag;this.attrs=attrs;this.kids=[];}
  getAttribute(n){return Object.prototype.hasOwnProperty.call(this.attrs,n)?this.attrs[n]:null;}
  getElementsByTagName(n){
    const out=[],walk=e=>{for(const k of e.kids)if(typeof k!=="string"){if(k.tagName===n)out.push(k);walk(k);}};
    walk(this);return out;
  }
  get textContent(){return this.kids.map(k=>typeof k==="string"?k:k.textContent).join("");}
}

const TOKEN=/<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<![^>]*>|<\/([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/y;
export class DOMParser{
  parseFromString(src){
    const doc=new Node("#document",{}),stack=[doc];
    const s=String(src);let at=0;
    while(at<s.length){
      TOKEN.lastIndex=at;const m=TOKEN.exec(s);
      if(!m){at++;continue;}
      at=TOKEN.lastIndex;
      const top=stack[stack.length-1];
      if(m[1]!=null)top.kids.push(m[1]);
      else if(m[2]){for(let i=stack.length-1;i>0;i--)if(stack[i].tagName===m[2]){stack.length=i;break;}}
      else if(m[3]){
        const attrs={};(m[4]||"").replace(/([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g,(_,k,__,a,b)=>{attrs[k]=unesc(a??b);return "";});
        const el=new Node(m[3],attrs);top.kids.push(el);if(!m[5])stack.push(el);
      }else if(m[6]!=null)top.kids.push(unesc(m[6]));
    }
    return doc;
  }
}
export function installDOMParser(){if(typeof globalThis.DOMParser==="undefined")globalThis.DOMParser=DOMParser;}
