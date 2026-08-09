import json,urllib.request,urllib.parse,time,sys

# New Testament, words of Jesus only (red-letter). References chosen thematically — daily
# discipline, perseverance, strength, rest, following — but the TEXT is fetched, never
# typed. WEB (World English Bible) is public domain, so it can ship inside the app; the
# link opens the whole chapter on Bible Gateway so the quote is read in context.
REFS=[
 "Matthew 11:28-30","Luke 9:23","Matthew 6:33","John 15:5","John 16:33",
 "Matthew 19:26","Mark 12:30","John 10:10","Matthew 5:6","Matthew 7:7",
 "John 8:12","Matthew 4:4","Matthew 6:34","John 14:6","Matthew 28:20",
 "John 11:25","Revelation 3:20","Matthew 5:16","John 13:34","Luke 6:38",
]

def clean(t):
    return " ".join(t.replace("¶"," ").split())

def chapter(ref):
    return ref.split(":")[0]   # "Matthew 11:28-30" -> "Matthew 11", the page to read

out=[]
for r in REFS:
    url="https://bible-api.com/%s?translation=web"%urllib.parse.quote(r)
    d=None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url,timeout=20) as resp:
                d=json.load(resp)
            break
        except Exception as e:
            print("retry",r,e,file=sys.stderr); time.sleep(5)
    if not d:
        print("FAIL",r,file=sys.stderr); continue
    ref=d.get("reference",r)
    src="https://www.biblegateway.com/passage/?search="+urllib.parse.quote(chapter(ref))+"&version=WEB"
    out.append({"ref":ref,"text":clean(d.get("text","")),"source":src})
    print("ok",ref)
    time.sleep(2)   # be gentle: bible-api rate-limits bursts

payload={"translation":"World English Bible (WEB)",
 "note":"New Testament, words of Jesus. Public Domain; text from bible-api.com, links open the chapter on Bible Gateway.",
 "verses":out}
open("verses.json","w",encoding="utf-8").write(json.dumps(payload,ensure_ascii=False,indent=1))
print("\nWROTE",len(out),"verses")
