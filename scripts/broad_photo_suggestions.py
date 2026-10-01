#!/usr/bin/env python3
"""
Photo suggestions for items the strict matcher found nothing for, for the
owner to confirm in the admin's "Check photos" (nothing here goes live alone).

    python3 scripts/broad_photo_suggestions.py

Shop names are till-style ("VEET CRM HAIR REMOVAL", "MAMA EARTH TEA TREE
SHAMPOO", "CLEAN&CLEAR FOAMING FW"), so before matching: common shorthand is
spelled out, words a brand writes as one are joined, and a word matches with a
one-letter typo or as the start of a longer word. Each catalogue name is scored
by the rarer words it shares (IDF), and must share the brand (the first word,
or the first two joined). Up to three suggestions, best first, each checked to
load from dashit.co.in. Appends them to public/catalog/photo-review-v1.json.
"""
import json
import math
import re
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

KEY = "AIzaSyB6tH6rYJ3fDZ7SBVkTNL3i_lOTXkPYjsg"
REVIEW = Path("public/catalog/photo-review-v1.json")

SHORTHAND = {
    "crm": "cream", "fw": "face wash", "hw": "hand wash", "bw": "body wash", "sh": "shampoo",
    "shmp": "shampoo", "cond": "conditioner", "deo": "deodorant", "tp": "toothpaste",
    "tb": "toothbrush", "lot": "lotion", "pwd": "powder", "pdr": "powder", "choc": "chocolate",
    "bisc": "biscuit", "bis": "biscuit", "ckies": "cookies", "chkn": "chicken", "veg": "veg",
    "lmn": "lemon", "strw": "strawberry", "van": "vanilla", "oil": "oil", "jr": "junior",
    "brightning": "brightening", "nourshing": "nourishing", "shampo": "shampoo",
    "noddles": "noodles", "coco": "cocoa", "masla": "masala", "chille": "chilli",
}
STOP = {"new", "pack", "pc", "pcs", "of", "and", "with", "the", "for", "free", "offer", "combo", "x", "m", "l", "s", "xl"}
UNIT = re.compile(r"^\d+(\.\d+)?(g|gm|gms|kg|ml|l|ltr|n|pc|pcs|s|x)?$")


def words(name):
    text = re.sub(r"['’`.]", "", name.lower())
    text = re.sub(r"[^a-z0-9]+", " ", text)
    out = []
    for w in text.split():
        if UNIT.match(w) or w in STOP:
            continue
        out += SHORTHAND.get(w, w).split()
    return [w[:-1] if len(w) > 3 and w.endswith("s") else w for w in out]


def one_edit(a, b):
    if abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        return sum(x != y for x, y in zip(a, b)) <= 1
    if len(a) > len(b):
        a, b = b, a
    i = 0
    while i < len(a) and a[i] == b[i]:
        i += 1
    return a[i:] == b[i + 1:]


def same(s, l):
    return s == l or (len(s) >= 5 and len(l) >= 5 and one_edit(s, l)) or (len(s) >= 4 and l.startswith(s))


master = [e for e in json.load(open("data/dashit_master_catalog.json")) if e.get("category") != "Paan Corner" and e.get("local_path")]
cat_words = [words(e["name"]) for e in master]
df = Counter(w for ws in cat_words for w in set(ws))
N = len(master)
idf = lambda w: math.log(N / (1 + df.get(w, 0)))
by_brand = defaultdict(list)  # first word, and first two joined ("mamaearth")
for i, ws in enumerate(cat_words):
    if ws:
        by_brand[ws[0]].append(i)
        if len(ws) > 1:
            by_brand[ws[0] + ws[1]].append(i)


def candidates(shop):
    ws = words(shop)
    if len(ws) < 2:
        return []
    keys = {ws[0], ws[0] + ws[1]}
    pool = set()
    for k in keys:
        pool.update(by_brand.get(k, []))
    # Brand typos ("colagate", "bicano"): any catalogue brand one letter away.
    if not pool and len(ws[0]) >= 5:
        for b, ids in by_brand.items():
            if one_edit(ws[0], b):
                pool.update(ids)
    rest = ws[2:] if ws[0] + ws[1] in by_brand and ws[0] not in by_brand else ws[1:]
    if not rest:
        return []
    total = sum(idf(w) for w in rest)
    scored = []
    for i in pool:
        lw = cat_words[i]
        got = sum(idf(w) for w in rest if any(same(w, l) for l in lw))
        if got / total >= 0.5:
            extra = sum(1 for l in lw if not any(same(w, l) for w in ws))
            scored.append((got / total - 0.03 * extra, i))
    scored.sort(reverse=True)
    seen, out = set(), []
    for score, i in scored:
        key = master[i]["name"].lower()
        if key in seen:
            continue
        seen.add(key)
        out.append({"img": "https://dashit.co.in/" + master[i]["local_path"].lstrip("/"), "name": master[i]["name"]})
        if len(out) == 5:
            break
    return out


def head(url):
    try:
        return urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=20).status == 200
    except Exception:
        return False


def main():
    url = f"https://firestore.googleapis.com/v1/projects/dashit-1ecba/databases/(default)/documents/products?pageSize=300&key={KEY}"
    docs, token = [], None
    while True:
        page = json.load(urllib.request.urlopen(url + (f"&pageToken={token}" if token else ""), timeout=60))
        docs += page.get("documents", [])
        token = page.get("nextPageToken")
        if not token:
            break
    plain = lambda f, k: next(iter((f.get(k) or {"x": None}).values()))
    todo = []
    for d in docs:
        f = d["fields"]
        cat = (plain(f, "cat") or "").lower()
        if plain(f, "img") or plain(f, "photoSuggestionsSkipped") or "tobacco" in cat or "smok" in cat:
            continue
        todo.append({"id": d["name"].split("/")[-1], "name": plain(f, "name") or "", "unit": plain(f, "unit") or ""})
    found = [(p, candidates(p["name"])) for p in todo]
    found = [(p, c) for p, c in found if c]
    urls = sorted({o["img"] for _, c in found for o in c})
    with ThreadPoolExecutor(16) as pool:
        ok = dict(zip(urls, pool.map(head, urls)))
    review = json.loads(REVIEW.read_text())
    have = {r["id"] for r in review["review"]}
    added = 0
    for p, c in found:
        opts = [o for o in c if ok.get(o["img"])][:3]
        if opts and p["id"] not in have:
            review["review"].append({"id": p["id"], "name": p["name"], "unit": p["unit"], "options": opts})
            added += 1
    REVIEW.write_text(json.dumps(review))
    print(f"without a photo: {len(todo)}, new suggestions: {added}, review list now {len(review['review'])}")


if __name__ == "__main__":
    main()
