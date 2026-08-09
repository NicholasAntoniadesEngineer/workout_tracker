# Cache the whole WEB + KJV New Testament from getbible.net (public domain) to
# web_full.json / kjv_full.json, so build_verses.py can curate from it offline.
import json,urllib.request,time,sys

def get(trans,book):
    url="https://api.getbible.net/v2/%s/%d.json"%(trans,book)
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (KingsKiln build)"})
    for a in range(4):
        try:
            with urllib.request.urlopen(req,timeout=25) as r: return json.load(r)
        except Exception as e:
            print("retry",trans,book,e,file=sys.stderr); time.sleep(3)
    return None

def verses(d):
    o={}
    for ch in d["chapters"]:
        for v in ch["verses"]: o[v["name"]]=" ".join(v["text"].split())
    return o

web={}; kjv={}
for b in range(40,67):   # Matthew (40) .. Revelation (66)
    web.update(verses(get("web",b))); time.sleep(0.25)
    kjv.update(verses(get("kjv",b))); time.sleep(0.25)
    print("book",b,"done",file=sys.stderr)
json.dump(web,open("web_full.json","w"),ensure_ascii=False)
json.dump(kjv,open("kjv_full.json","w"),ensure_ascii=False)
print("web",len(web),"kjv",len(kjv))
