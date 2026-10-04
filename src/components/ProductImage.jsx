import React, { useEffect, useRef, useState } from "react";
import { isPlaceholderImage } from "../lib/productPhotoMatch";

const CATALOG = "dashit.co.in/products/catalog/";
const THUMBS = "dashit.co.in/products/thumbs/";

/**
 * The address a photo is loaded from.
 *
 * Cards get the small copy: 400px, about 10 KB, and the host lets browsers
 * keep it for a year, so it is downloaded once per phone. Only the product
 * page asks for the 1000px original (`size="full"`).
 *
 * Cards used to ask for the original first. Most products have no original on
 * the host, so every card paid for a failed request before falling back to the
 * small copy: that was the slow photo loading.
 *
 * Open Food Facts keeps each photo as the full original (~0.7 MB) with smaller
 * copies at the same path; a card only needs the 400px one. Catalogue photos
 * saved as a path ("/products/catalog/…") live on the website, and load from
 * there in the apps and on every host.
 */
export function productImageUrl(url, size = "small") {
  const value = String(url || "");
  if (size === "small" && /images\.open(food|beauty)facts\.(org|net)/.test(value)) {
    return value.replace(/\.full\.(jpg|jpeg|png|webp)$/i, ".400.$1");
  }
  let full = value;
  if (/^\/?products\/(catalog|thumbs)\//.test(value)) {
    full = `https://dashit.co.in/${value.replace(/^\//, "")}`;
  }
  if (size === "small") return full.replace(CATALOG, THUMBS);
  return full;
}

/**
 * What to try once after a photo fails: a photo picked after the small copies
 * were made has only the original, and many originals were never uploaded, so
 * each stands in for the other. (No "ask again with ?r=1": the host answers
 * any photo address with a query string "not found".)
 */
function nextAttempt(url, attempt) {
  if (attempt !== 0) return null;
  if (url.includes(THUMBS)) return url.replace(THUMBS, CATALOG);
  if (url.includes(CATALOG)) return url.replace(CATALOG, THUMBS);
  return null;
}

/**
 * A product photo the Blinkit way: the whole product on a plain white square
 * with the same padding every time (object-contain, so a label is never cut
 * off). No photo, a stock placeholder or a broken link shows a neutral tile
 * with the product's first letter, never a random stock picture.
 *
 * `fill` makes it cover its positioned parent instead of sizing itself square.
 */
export default function ProductImage({
  src,
  name = "",
  size = "small",
  fill = false,
  className = "",
  imgClassName = "",
  letterClassName = "text-3xl",
  loading = "lazy",
  dimmed = false,
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState({ n: 0, url: "" });
  const [shown, setShown] = useState(false);
  /* The fade only starts once the page's scripts are running. A photo that is
     already in the exported HTML must not sit at opacity 0 waiting for them. */
  const [canFade, setCanFade] = useState(false);
  useEffect(() => setCanFade(true), []);
  const [fullReady, setFullReady] = useState(false);
  const imgRef = useRef(null);

  const small = productImageUrl(src, "small");
  const full = size === "small" ? small : productImageUrl(src, size);

  useEffect(() => {
    setFailed(false);
    setAttempt({ n: 0, url: "" });
    setShown(false);
  }, [src]);

  /* The product page shows the small copy at once (it is already on the phone
     from the card that was tapped) and swaps in the original when, and if, it
     arrives. It never waits on a blank square for a photo that may not exist. */
  useEffect(() => {
    setFullReady(false);
    if (!full || full === small) return undefined;
    let alive = true;
    const probe = new window.Image();
    probe.onload = () => {
      if (alive) setFullReady(true);
    };
    probe.src = full;
    return () => {
      alive = false;
    };
  }, [full, small]);

  const url = !failed && !isPlaceholderImage(src) ? attempt.url || (fullReady ? full : small) : "";

  /* A photo already in the browser's cache is complete before React attaches
     onLoad, so it is shown without the fade (and never left invisible). */
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setShown(true);
  }, [url]);

  const onError = () => {
    const next = nextAttempt(url, attempt.n);
    if (next) setAttempt({ n: attempt.n + 1, url: next });
    else setFailed(true);
  };
  const letter = (String(name).trim().match(/[A-Za-z0-9]/)?.[0] || "?").toUpperCase();
  const frame = fill ? "absolute inset-0" : "relative w-full aspect-square";

  if (!url) {
    return (
      <div
        role="img"
        aria-label={name}
        className={`${frame} flex items-center justify-center select-none bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500 ${className}`}
      >
        <span className={`font-black leading-none ${letterClassName}`}>{letter}</span>
      </div>
    );
  }

  return (
    <div
      className={`${frame} overflow-hidden ${
        /* A soft grey square while the photo is on its way, so a slow
           connection shows "loading", not an empty white box. */
        shown ? "bg-white" : "bg-slate-100 animate-pulse dark:bg-zinc-800"
      } ${className}`}
    >
      <img
        ref={imgRef}
        src={url}
        alt={name}
        loading={loading}
        decoding="async"
        onLoad={() => setShown(true)}
        onError={onError}
        style={{ opacity: shown || !canFade ? 1 : 0, transition: "opacity 180ms ease-out" }}
        className={`absolute inset-0 h-full w-full object-contain p-[8%] ${dimmed ? "grayscale-[40%]" : ""} ${imgClassName}`}
      />
    </div>
  );
}
