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
 * live. A GitHub release's "latest" link always points at the newest upload
 * of a file with this name; the repository has to be public for visitors to
 * download it.
 */
export const APK_URL =
  process.env.NEXT_PUBLIC_APK_URL || "https://github.com/soulspeedmc67/testing/releases/latest/download/DASHit.apk";
