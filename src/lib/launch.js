/**
 * Launch day. Until LAUNCH_AT the website shows the shop and takes sign-ins,
 * but checkout doesn't place orders; from then on it does. Change the date
 * here and every banner and button follows.
 */
export const LAUNCH_AT = new Date("2026-10-05T17:00:00+05:30");

/** As people read it: "Monday 5 October, 5 pm". */
export const LAUNCH_LABEL = "Monday 5 October, 5 pm";
export const LAUNCH_DAY = "5 October";

export function isBeforeLaunch(now = Date.now()) {
  return now < LAUNCH_AT.getTime();
}

/**
 * The Android app, for people to install before the Google Play listing is
 * live. Hosted on the website itself (public_html/DASHit.apk, shipped in the
 * upload zip, not in git); NEXT_PUBLIC_APK_URL points it elsewhere.
 */
export const APK_URL = process.env.NEXT_PUBLIC_APK_URL || "/DASHit.apk";
