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
  if (/^\/?products\/catalog\//.test(value)) {
    return `https://dashit.co.in/${value.replace(/^\//, "")}`;
  }
  return value;
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
  useEffect(() => setFailed(false), [src]);

  const url = !failed && !isPlaceholderImage(src) ? productImageUrl(src, size) : "";
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
        onError={() => setFailed(true)}
        className={`absolute inset-0 h-full w-full object-contain p-[8%] ${dimmed ? "grayscale-[40%]" : ""} ${imgClassName}`}
      />
    </div>
  );
}
