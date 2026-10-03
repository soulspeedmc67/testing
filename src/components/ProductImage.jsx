import React, { useEffect, useState } from "react";
import { isPlaceholderImage } from "../lib/productPhotoMatch";

/**
 * Open Food Facts keeps each photo as the full original (~0.7 MB) and smaller
 * copies at the same path; a card only needs the 400px one. Catalogue photos
 * saved as a path ("/products/catalog/…") live on the website, and load from
 * there in the apps and on every host.
 */
export function productImageUrl(url, size = "small") {
  const value = String(url || "");
  if (size === "small" && /images\.open(food|beauty)facts\.org/.test(value)) {
    return value.replace(/\.full\.(jpg|jpeg|png|webp)$/i, ".400.$1");
  }
  let full = value;
  if (/^\/?products\/catalog\//.test(value)) {
    full = `https://dashit.co.in/${value.replace(/^\//, "")}`;
  }
  // Catalogue photos: the 400px copy (~10 KB instead of ~100 KB), as in the apps.
  if (size === "small" && full.includes("dashit.co.in/products/catalog/")) {
    return full.replace("/products/catalog/", "/products/thumbs/");
  }
  return full;
}

/**
 * What to try after a photo fails: the small copy may not exist yet (then the
 * full one), and the host sometimes answers a full-size photo with "not found"
 * and serves it a moment later (so once more).
 */
function nextAttempt(url, attempt) {
  if (attempt === 0) {
    if (url.includes("/products/thumbs/")) return url.replace("/products/thumbs/", "/products/catalog/");
    if (url.includes("/products/catalog/")) return url.replace("/products/catalog/", "/products/thumbs/");
  }
  if (attempt === 1 && (url.includes("/products/catalog/") || url.includes("/products/thumbs/"))) {
    return `${url}${url.includes("?") ? "&" : "?"}r=1`;
  }
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
  useEffect(() => {
    setFailed(false);
    setAttempt({ n: 0, url: "" });
  }, [src]);

  const url = !failed && !isPlaceholderImage(src) ? attempt.url || productImageUrl(src, size) : "";
  const onError = () => {
    const next = nextAttempt(url, attempt.n);
    if (next) setTimeout(() => setAttempt({ n: attempt.n + 1, url: next }), attempt.n === 0 ? 0 : 350);
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
    <div className={`${frame} overflow-hidden bg-white ${className}`}>
      <img
        src={url}
        alt={name}
        loading={loading}
        decoding="async"
        onError={onError}
        className={`absolute inset-0 h-full w-full object-contain p-[8%] ${dimmed ? "grayscale-[40%]" : ""} ${imgClassName}`}
      />
    </div>
  );
}
