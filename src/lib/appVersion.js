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
