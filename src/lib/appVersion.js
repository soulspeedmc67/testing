/**
 * The oldest iPhone app the shop takes orders from.
 *
 * An installed app keeps the fees it was built with, so an old one misses a
 * charge added since (rain, night distance). The shop saves the oldest version
 * it accepts on config/store as `minIosVersion` ("1.0.3", the way the App
 * Store shows it) and, beside it, `minIosVersionCode` (10003), the number
 * firestore.rules and create-order.php compare an order's `appVersionCode`
 * with. Blank or 0 means every version may order.
 *
 * iOS: `AppVersion` in ios-swift/DASHit/Core/Utils/AppVersion.swift. Keep the
 * two in step.
 */

/** "1.0.3" → 10003, "1.2" → 10200; null for anything that isn't a version. */
export function versionCode(text) {
  const parts = String(text ?? "").trim().split(".");
  if (parts.length < 1 || parts.length > 3) return null;
  const numbers = [];
  for (const part of parts) {
    if (!/^\d{1,2}$/.test(part)) return null;
    numbers.push(Number(part));
  }
  while (numbers.length < 3) numbers.push(0);
  return numbers[0] * 10000 + numbers[1] * 100 + numbers[2];
}

/** The two fields to save on config/store for a typed version; blank lets every version order. */
export function minIosVersionPatch(text) {
  const version = String(text ?? "").trim();
  const code = version === "" ? 0 : versionCode(version);
  if (code === null) return null;
  return { minIosVersion: version, minIosVersionCode: code };
}

export const UPDATE_TITLE_MAX = 60;
export const UPDATE_MESSAGE_MAX = 300;

/** What the iPhone app's update screen says when the shop hasn't written its own. */
export const DEFAULT_UPDATE_TITLE = "Update DASHit to keep ordering";
export const DEFAULT_UPDATE_MESSAGE =
  "A new version is on the App Store. This one is too old to place orders. Updating takes a minute, and your account, addresses and orders stay as they are.";

/** The two fields to save for the wording of the update screen; blank means the built-in words. */
export function updateTextPatch(title, message) {
  return {
    updateTitle: String(title ?? "").trim().slice(0, UPDATE_TITLE_MAX),
    updateMessage: String(message ?? "").trim().slice(0, UPDATE_MESSAGE_MAX),
  };
}
