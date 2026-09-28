/**
 * A quick look at a product photo, in the browser, for the "Needs a photo"
 * list: a small photo (shorter side under 300px) or one that's nearly all one
 * colour still gets used, but is flagged. Photos are only ever links (nothing
 * is uploaded); the white-square look is done in CSS by components/ProductImage.
 *
 * The measuring (`findContentBox`, `isMostlyFlat`) works on plain RGBA arrays
 * and has no imports, so `npm test` checks it.
 */

export const MIN_SOURCE_SIDE = 300;

/** Near-white (all channels at or above `threshold`) or near-transparent pixels are background. */
function isBackground(data, i, threshold, alphaMin) {
  return data[i + 3] < alphaMin || (data[i] >= threshold && data[i + 1] >= threshold && data[i + 2] >= threshold);
}

/**
 * The smallest box around everything that isn't white border, in an RGBA
 * pixel array. An all-white image returns the whole image with `empty: true`.
 */
export function findContentBox(data, width, height, { threshold = 242, alphaMin = 16 } = {}) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      if (isBackground(data, row + x * 4, threshold, alphaMin)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return { x: 0, y: 0, width, height, empty: true };
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, empty: false };
}

/**
 * True when 90% or more of the product area is one colour (a blank or
 * placeholder-like picture). Colours are grouped in steps of 32 per channel.
 */
export function isMostlyFlat(data, width, height, box = { x: 0, y: 0, width, height }, share = 0.9) {
  const counts = new Map();
  let total = 0;
  const step = Math.max(1, Math.floor(Math.sqrt((box.width * box.height) / 40000)));
  for (let y = box.y; y < box.y + box.height; y += step) {
    for (let x = box.x; x < box.x + box.width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 16) continue;
      const key = ((data[i] >> 5) << 6) | ((data[i + 1] >> 5) << 3) | (data[i + 2] >> 5);
      counts.set(key, (counts.get(key) || 0) + 1);
      total += 1;
    }
  }
  if (total === 0) return true;
  let top = 0;
  for (const count of counts.values()) if (count > top) top = count;
  return top / total >= share;
}

/** The quality verdict for a photo, in plain words for the "Needs a better photo" list. */
export function qualityReasons({ width, height, flat }) {
  const reasons = [];
  if (Math.min(width, height) < MIN_SOURCE_SIDE) reasons.push("Too small");
  if (flat) reasons.push("Looks blank");
  return reasons;
}

// ---------------------------------------------------------------------------
// Browser only

/** Loads an image for drawing on a canvas; photos from other sites need CORS. */
export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isBlob = typeof Blob !== "undefined" && source instanceof Blob;
    const url = isBlob ? URL.createObjectURL(source) : String(source);
    if (!isBlob) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (isBlob) URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      if (isBlob) URL.revokeObjectURL(url);
      reject(new Error("Couldn't load the photo"));
    };
    img.src = url;
  });
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/* Measuring runs on a copy no bigger than this, so a 4000px photo doesn't
   take seconds. */
const MEASURE_MAX = 600;

function measure(img) {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const factor = Math.min(1, MEASURE_MAX / Math.max(width, height));
  const w = Math.max(1, Math.round(width * factor));
  const h = Math.max(1, Math.round(height * factor));
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const flat = isMostlyFlat(data, w, h, findContentBox(data, w, h));
  return { width, height, flat };
}

/**
 * The quality check alone, for photos that are shown straight from Open Food
 * Facts. `checked: false` when the photo couldn't be read (no CORS, offline).
 */
export async function checkPhoto(source) {
  try {
    const img = await loadImage(source);
    const { width, height, flat } = measure(img);
    const reasons = qualityReasons({ width, height, flat });
    return { checked: true, width, height, flat, weak: reasons.length > 0, reasons };
  } catch {
    return { checked: false, weak: false, reasons: [] };
  }
}

/**
 * Whether a pasted link opens as a picture at all (a web page link doesn't).
 * No CORS needed: this only loads it, it doesn't read the pixels.
 */
export function opensAsPhoto(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth > 0);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}
