import { getFirebaseAuth } from "./firebase";

const MAX_EDGE = 1600;
const MAX_BYTES = 1_900_000; // the server takes up to 2 MB

const load = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a photo. Choose a JPEG or PNG."));
    };
    image.src = url;
  });

/** The photo as a JPEG under the server's size limit, longest side at most 1600 px. */
async function shrink(file) {
  const image = await load(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(100, Math.round(image.width * scale));
  canvas.height = Math.max(100, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.88, 0.78, 0.68, 0.55]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("That photo is too big. Try a smaller one.");
}

/**
 * Sends a photo to the shop's website (api/staff/upload-photo.php, admin only)
 * and returns its link. Banners and product photos are hosted on the website,
 * never in Firebase Storage.
 */
export async function uploadStaffPhoto(file) {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const body = await shrink(file);
  const idToken = await user.getIdToken();
  const response = await fetch("https://dashit.co.in/api/staff/upload-photo.php", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "image/jpeg" },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error || "The photo couldn't be uploaded. Try again.");
  return data.url;
}
