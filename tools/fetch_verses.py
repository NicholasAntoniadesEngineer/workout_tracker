import json,urllib.request,urllib.parse,time,sys

# References chosen thematically (training, discipline, perseverance, the body, daily
# renewal, strength, the refiner). The TEXT is fetched, never typed — WEB is public domain.
REFS=[
 "1 Timothy 4:7-8","1 Corinthians 9:24-25","1 Corinthians 9:26-27",
 "1 Corinthians 6:19-20","Philippians 3:14","Philippians 4:13","Hebrews 12:1",
 "Galatians 6:9","Isaiah 40:31","Lamentations 3:22-23","Colossians 3:23",
 "Proverbs 27:17","Joshua 1:9","2 Timothy 4:7","Ecclesiastes 9:10",
 "1 Corinthians 10:31","Isaiah 41:10","Malachi 3:3","Proverbs 31:17","Psalm 18:32",
]

def clean(t):
    return " ".join(t.replace("¶"," ").split())

out=[]
for r in REFS:
    q=urllib.parse.quote(r)
    url="https://bible-api.com/%s?translation=web"%q
    try:
        with urllib.request.urlopen(url,timeout=20) as resp:
            d=json.load(resp)
    except Exception as e:
        print("FAIL",r,e,file=sys.stderr);continue
    ref=d.get("reference",r)
    text=clean(d.get("text",""))
    src="https://www.biblegateway.com/passage/?search="+urllib.parse.quote(ref)+"&version=WEB"
    out.append({"ref":ref,"text":text,"source":src})
    print("ok",ref,"-",len(text),"chars")

payload={"translation":"World English Bible (WEB)",
 "note":"Public Domain. Text fetched from bible-api.com; references link to Bible Gateway.",
 "verses":out}
open("verses.json","w",encoding="utf-8").write(json.dumps(payload,ensure_ascii=False,indent=1))
print("\nWROTE",len(out),"verses")
