# Build js/verses.js: the New Testament devotional pool in WEB + KJV (both public domain).
# Text is fetched verbatim from getbible.net — never hand-typed. References are curated for
# standalone readability across all NT books; a few are joined into ranges so a famous
# passage reads whole, and spacing artifacts from the source are normalized.
#
# Usage: run dump_full.py once to cache web_full.json / kjv_full.json, then run this.
import json,re,sys

web=json.load(open("web_full.json")); kjv=json.load(open("kjv_full.json"))

# Single verses that read well on their own.
SINGLES="""
Matthew 4:4|Matthew 5:6|Matthew 5:9|Matthew 5:14|Matthew 5:16|Matthew 6:6|Matthew 6:24|Matthew 6:33|Matthew 6:34|Matthew 7:7|Matthew 7:12|Matthew 11:28|Matthew 11:29|Matthew 16:26|Matthew 19:26|Matthew 22:37|Matthew 28:20
Mark 8:36|Mark 9:23|Mark 10:27|Mark 10:45|Mark 11:24|Mark 12:30|Mark 12:31|Mark 16:15
Luke 1:37|Luke 6:31|Luke 6:35|Luke 6:37|Luke 6:38|Luke 9:23|Luke 11:9|Luke 12:15|Luke 12:34|Luke 21:33
John 1:5|John 3:16|John 3:17|John 6:35|John 8:12|John 8:32|John 10:10|John 11:25|John 13:34|John 14:1|John 14:6|John 14:27|John 15:5|John 15:12|John 15:13|John 16:33
Acts 1:8|Acts 4:12|Acts 16:31|Acts 20:35
Romans 5:1|Romans 5:8|Romans 6:23|Romans 8:1|Romans 8:18|Romans 8:28|Romans 8:31|Romans 8:37|Romans 10:13|Romans 12:1|Romans 12:2|Romans 12:21|Romans 15:13
1 Corinthians 10:13|1 Corinthians 10:31|1 Corinthians 13:13|1 Corinthians 15:57|1 Corinthians 15:58|1 Corinthians 16:13|1 Corinthians 16:14
2 Corinthians 1:3|2 Corinthians 4:16|2 Corinthians 5:7|2 Corinthians 5:17|2 Corinthians 9:7|2 Corinthians 12:9
Galatians 2:20|Galatians 5:1|Galatians 6:9
Ephesians 2:10|Ephesians 4:32|Ephesians 6:10|Ephesians 6:11
Philippians 3:14|Philippians 4:6|Philippians 4:7|Philippians 4:8|Philippians 4:11|Philippians 4:13|Philippians 4:19
Colossians 3:2|Colossians 3:15|Colossians 3:16|Colossians 3:17
1 Thessalonians 5:11|1 Thessalonians 5:16|1 Thessalonians 5:17|1 Thessalonians 5:18|1 Thessalonians 5:21
2 Thessalonians 3:3|2 Thessalonians 3:13
1 Timothy 4:7|1 Timothy 4:8|1 Timothy 4:12|1 Timothy 6:6|1 Timothy 6:11|1 Timothy 6:12
2 Timothy 1:7|2 Timothy 2:15|2 Timothy 4:7
Hebrews 4:12|Hebrews 4:16|Hebrews 10:23|Hebrews 11:1|Hebrews 11:6|Hebrews 12:11|Hebrews 13:5|Hebrews 13:8
James 1:5|James 1:12|James 1:22|James 2:17|James 3:17|James 4:7|James 4:8|James 5:16
1 Peter 2:9|1 Peter 3:15|1 Peter 4:8|1 Peter 4:10
2 Peter 3:9|2 Peter 3:18
1 John 1:9|1 John 3:1|1 John 3:18|1 John 4:4|1 John 4:7|1 John 4:18|1 John 4:19|1 John 5:4|1 John 5:14
2 John 1:6
3 John 1:2|3 John 1:4
Jude 1:20
Revelation 1:8|Revelation 3:20|Revelation 21:4|Revelation 21:5|Revelation 22:13
""".replace("\n","|")
SINGLES=[r.strip() for r in SINGLES.split("|") if r.strip()]

# Famous passages the single-verse boundary would cut in half — joined so they read whole.
COMBINE=[
 ("1 Corinthians 6:19-20",["1 Corinthians 6:19","1 Corinthians 6:20"]),
 ("1 Corinthians 13:4-7",["1 Corinthians 13:4","1 Corinthians 13:5","1 Corinthians 13:6","1 Corinthians 13:7"]),
 ("Galatians 5:22-23",["Galatians 5:22","Galatians 5:23"]),
 ("Ephesians 2:8-9",["Ephesians 2:8","Ephesians 2:9"]),
 ("Ephesians 3:20-21",["Ephesians 3:20","Ephesians 3:21"]),
 ("Colossians 3:23-24",["Colossians 3:23","Colossians 3:24"]),
 ("Hebrews 12:1-2",["Hebrews 12:1","Hebrews 12:2"]),
 ("James 1:2-3",["James 1:2","James 1:3"]),
 ("1 Peter 5:6-7",["1 Peter 5:6","1 Peter 5:7"]),
 ("2 Timothy 3:16-17",["2 Timothy 3:16","2 Timothy 3:17"]),
 ("Jude 1:24-25",["Jude 1:24","Jude 1:25"]),
]

# Fix source spacing artifacts: a comma/semicolon/colon or sentence-end glued to the next word.
def norm(t):
    t=" ".join(t.split())
    t=re.sub(r'([,;:])([A-Za-z“‘])', r'\1 \2', t)
    t=re.sub(r'([.!?][”’"\'])([A-Za-z“‘])', r'\1 \2', t)
    t=re.sub(r'([a-z])([”’])([A-Z“])', r'\1\2 \3', t)
    return " ".join(t.split())

def joined(members,book):
    return norm(" ".join(book[m] for m in members))

out=[]; miss=[]
for label,members in COMBINE:
    if any(m not in web for m in members): miss+=members; continue
    out.append({"ref":label,"web":joined(members,web),"kjv":joined(members,kjv)})
for r in SINGLES:
    if r not in web: miss.append(r); continue
    out.append({"ref":r,"web":norm(web[r]),"kjv":norm(kjv.get(r,""))})

# Order by canonical NT position (book then chapter:verse), using the first number of each.
BOOKS=["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians",
 "Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy",
 "Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"]
def sortkey(v):
    ref=v["ref"]; m=re.match(r"(.+?) (\d+):(\d+)",ref)
    return (BOOKS.index(m.group(1)),int(m.group(2)),int(m.group(3)))
out.sort(key=sortkey)

# Report anything still off: fragments or over-long cards.
def weak(t):
    core=t.lstrip("“\"'‘ ")
    return (not core[:1].isupper()) or t.rstrip()[-1:] in ";," or len(t)>330
print("verses:",len(out),"| missing:",miss)
print("still-weak:")
for v in out:
    if weak(v["web"]): print("  ",v["ref"],"|len",len(v["web"]),"|",v["web"][:70])
books={v["ref"].rsplit(" ",1)[0] for v in out}
print("books covered:",len(books),"/ 27")

def esc(s): return s.replace("\\","\\\\").replace('"','\\"')
lines=["// New Testament devotional pool — WEB & KJV, both public domain. Text fetched verbatim",
"// from getbible.net (never hand-typed); references curated for standalone readability across",
"// the NT, a few joined into ranges. Regenerate with tools/build_verses.py.",
"export const VERSES=["]
for v in out: lines.append('  {ref:"%s",web:"%s",kjv:"%s"},'%(esc(v["ref"]),esc(v["web"]),esc(v["kjv"])))
lines.append("];")
open("../js/verses.js","w",encoding="utf-8").write("\n".join(lines)+"\n") if False else None
import os
target=os.environ.get("VERSES_OUT","js/verses.js")
open(target,"w",encoding="utf-8").write("\n".join(lines)+"\n")
print("wrote",target)
