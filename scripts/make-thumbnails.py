#!/usr/bin/env python3
"""
Small copies of the catalogue photos for product cards (400px, about a tenth
of the 1000px originals), so lists scroll fast in the apps.

    python3 scripts/make-thumbnails.py

Makes thumbnails for every photo a product uses (read from Firestore) and
every photo on the admin's "Check photos" list, from the local archive in
data/products/catalog/, into data/photo-thumbs/products/thumbs/<folder>/<file>.webp,
and zips them as dashit-photo-thumbnails.zip: extract it into public_html on
Hostinger. The apps ask for /products/thumbs/... and fall back to the full
photo when a thumbnail isn't there, so photos picked later still show. Run it
again after picking more photos; it skips thumbnails already made.
"""
import json
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

KEY = "AIzaSyB6tH6rYJ3fDZ7SBVkTNL3i_lOTXkPYjsg"
SIZE = 400
OUT = Path("data/photo-thumbs")
MARK = "dashit.co.in/"


def used_photos():
    url = f"https://firestore.googleapis.com/v1/projects/dashit-1ecba/databases/(default)/documents/products?pageSize=300&key={KEY}&mask.fieldPaths=img"
    paths, token = [], None
    while True:
        page = json.load(urllib.request.urlopen(url + (f"&pageToken={token}" if token else ""), timeout=60))
        paths += [d.get("fields", {}).get("img", {}).get("stringValue", "") for d in page.get("documents", [])]
        token = page.get("nextPageToken")
        if not token:
            break
    review = json.loads(Path("public/catalog/photo-review-v1.json").read_text())
    paths += [s["img"] for s in review["sure"]] + [o["img"] for r in review["review"] for o in r["options"]]
    return sorted({p.split(MARK, 1)[1] for p in paths if MARK + "products/catalog/" in p})


def make(rel):
    src = Path("data") / rel
    dst = OUT / rel.replace("products/catalog/", "products/thumbs/", 1)
    if dst.exists() or not src.exists():
        return dst.exists()
    dst.parent.mkdir(parents=True, exist_ok=True)
    img = Image.open(src).convert("RGBA")
    img.thumbnail((SIZE, SIZE), Image.LANCZOS)
    img.save(dst, "WEBP", quality=78, method=5)
    return True


paths = used_photos()
with ThreadPoolExecutor(8) as pool:
    made = sum(pool.map(make, paths))
with zipfile.ZipFile("dashit-photo-thumbnails.zip", "w", zipfile.ZIP_STORED) as z:
    for f in sorted(OUT.rglob("*.webp")):
        z.write(f, f.relative_to(OUT))
print(f"photos: {len(paths)}, thumbnails ready: {made}")
