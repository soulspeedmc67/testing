/**
 * Product photo clean-up on a canvas, in the browser: trim the white border,
 * put the product on a plain white 1000×1000 square so it fills 82% of the
 * longer side, and export WebP at 800 and 400px. Also a quality check: a small
 * source (shorter side under 300px) or a product area that's nearly all one
 * colour still gets used, but goes on the "Needs a better photo" list.
 *
 * The measuring (`findContentBox`, `placementFor`, `isMostlyFlat`) works on
 * plain RGBA arrays and has no imports, so `node --test tests/` checks it.
 */

export const CANVAS_SIZE = 1000;
export const PRODUCT_FILL = 0.82;
export const OUTPUT_SIZES = [800, 400];
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

/** Where the trimmed product goes on the square: centred, its longer side at 82%. */
export function placementFor(box, size = CANVAS_SIZE, fill = PRODUCT_FILL) {
  const scale = (size * fill) / Math.max(box.width, box.height);
  const width = box.width * scale;
  const height = box.height * scale;
  return { x: (size - width) / 2, y: (size - height) / 2, width, height, scale };
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

/* Measuring runs on a copy no bigger than this, so a 4000px phone photo
   doesn't take seconds; the box is scaled back up afterwards. */
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
  const small = findContentBox(data, w, h);
  const flat = isMostlyFlat(data, w, h, small);
  const box = small.empty
    ? { x: 0, y: 0, width, height }
    : {
        x: Math.max(0, Math.floor(small.x / factor)),
        y: Math.max(0, Math.floor(small.y / factor)),
        width: Math.min(width, Math.ceil(small.width / factor)),
        height: Math.min(height, Math.ceil(small.height / factor)),
      };
  return { width, height, box, flat };
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

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * The full clean-up: trimmed, centred on white at 1000×1000, exported as WebP
 * (JPEG where the browser can't encode WebP) at 800 and 400px.
 */
export async function cleanupPhoto(source, { quality = 0.85 } = {}) {
  const img = await loadImage(source);
  const { width, height, box, flat } = measure(img);
  const canvas = makeCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.imageSmoothingQuality = "high";
  const place = placementFor(box);
  ctx.drawImage(img, box.x, box.y, box.width, box.height, place.x, place.y, place.width, place.height);

  const blobs = {};
  for (const size of OUTPUT_SIZES) {
    const out = makeCanvas(size, size);
    const octx = out.getContext("2d");
    octx.imageSmoothingQuality = "high";
    octx.drawImage(canvas, 0, 0, size, size);
    let blob = await canvasToBlob(out, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(out, "image/jpeg", quality);
    blobs[size] = blob;
  }
  const reasons = qualityReasons({ width, height, flat });
  return { canvas, blobs, box, placement: place, width, height, weak: reasons.length > 0, reasons };
}
