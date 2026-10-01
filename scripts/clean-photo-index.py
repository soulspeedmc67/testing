#!/usr/bin/env python3
"""
The list of shop photos that are clean packshots (product on plain white).

    python3 scripts/clean-photo-index.py

Reads every product's photo from Firestore, checks it with the same edge test
as scripts/clean_photo_check.py (from the local copy in data/products/catalog
when there is one, else from dashit.co.in), and writes
public/catalog/clean-photos-v1.json: {"builtAt", "clean": ["dsh_<hash>", ...]}.
The apps download it and list items with a clean white photo first, then other
photos, then items without one. Run again after photos are added, then upload.
"""
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from clean_photo_check import CLEAN_SHARE, edge_whiteness, CACHE  # noqa: E402

PROJECT = "dashit-1ecba"
API_KEY = "AIzaSyB6tH6rYJ3fDZ7SBVkTNL3i_lOTXkPYjsg"
LOCAL = Path("data/products")
OUT = Path("public/catalog/clean-photos-v1.json")


def photos():
    base = (f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/products"
            f"?pageSize=300&key={API_KEY}&mask.fieldPaths=img")
    page, found = "", set()
    while True:
        body = json.load(urllib.request.urlopen(base + (f"&pageToken={page}" if page else ""), timeout=60))
        for doc in body.get("documents", []):
            img = doc.get("fields", {}).get("img", {}).get("stringValue", "")
            if "/products/catalog/" in img:
                found.add("https://dashit.co.in/products/catalog/" + img.split("/products/catalog/", 1)[1].split("#")[0])
        page = body.get("nextPageToken", "")
        if not page:
            return sorted(found)


def check(url):
    local = LOCAL / "catalog" / url.split("/products/catalog/", 1)[1]
    try:
        data = local.read_bytes() if local.exists() else urllib.request.urlopen(
            urllib.request.Request(url, headers={"User-Agent": "DASHit photo check"}), timeout=30).read()
        share = edge_whiteness(data)
        return url, {"clean": share >= CLEAN_SHARE, "white": round(share, 3)}
    except Exception as err:
        return url, {"clean": False, "white": 0, "error": str(err)[:80]}


def main():
    urls = photos()
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    todo = [u for u in urls if u not in cache or "error" in cache[u]]
    with ThreadPoolExecutor(8) as pool:
        for url, answer in pool.map(check, todo):
            cache[url] = answer
    CACHE.write_text(json.dumps(cache))
    clean = sorted({u.rsplit("/", 1)[1].split(".")[0] for u in urls if cache[u]["clean"]})
    OUT.write_text(json.dumps({"builtAt": date.today().isoformat(), "clean": clean}))
    errors = sum("error" in cache[u] for u in urls)
    print(f"photos {len(urls)}: clean {len(clean)}, not clean {len(urls) - len(clean) - errors}, unreadable {errors}")


if __name__ == "__main__":
    main()
