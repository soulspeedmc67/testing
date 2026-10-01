#!/usr/bin/env python3
"""
Which product photos are clean packshots: the product on a plain white
background, the way the apps show products. Lifestyle shots (vegetables in a
basket on a table, a pack on a kitchen counter, a gift box on purple) aren't.

    python3 scripts/clean_photo_check.py < urls.txt   ->   JSON {url: {"clean": bool, "white": 0.97}}

"white" is the share of the photo's outer edge that is white; 0.9 or more
counts as clean. Answers are kept in data/photo-matches/photo-check-cache.json,
so a photo is only downloaded once. Used by scripts/match-store-photos.mjs and
scripts/suggest-store-photos.mjs; the admin runs the same test in the browser
(src/lib/photoQuality.js).
"""
import io
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

CACHE = Path("data/photo-matches/photo-check-cache.json")
WHITE_LEVEL = 235   # every channel at least this bright
CLEAN_SHARE = 0.9   # of the outer edge


def edge_whiteness(data: bytes) -> float:
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    flat = Image.new("RGBA", img.size, (255, 255, 255, 255))
    flat.alpha_composite(img)
    img = flat.convert("RGB")
    img.thumbnail((200, 200))
    w, h = img.size
    band = max(2, round(min(w, h) * 0.04))
    px = img.load()
    total = white = 0
    for y in range(h):
        for x in range(w):
            if band <= x < w - band and band <= y < h - band:
                continue
            r, g, b = px[x, y]
            total += 1
            white += min(r, g, b) >= WHITE_LEVEL
    return white / total if total else 0.0


def check(url: str):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "DASHit photo check"})
        data = urllib.request.urlopen(req, timeout=30).read()
        share = edge_whiteness(data)
        return url, {"clean": share >= CLEAN_SHARE, "white": round(share, 3)}
    except Exception as err:  # missing or unreadable: never clean
        return url, {"clean": False, "white": 0, "error": str(err)[:80]}


def main():
    urls = [u.strip() for u in sys.stdin if u.strip()]
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    todo = [u for u in dict.fromkeys(urls) if u not in cache]
    with ThreadPoolExecutor(16) as pool:
        for url, answer in pool.map(check, todo):
            cache[url] = answer
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache))
    json.dump({u: cache[u] for u in urls}, sys.stdout)


if __name__ == "__main__":
    main()
