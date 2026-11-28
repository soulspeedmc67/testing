/**
 * Launch day. Until LAUNCH_AT the website shows the shop and takes sign-ins,
 * but checkout doesn't place orders; from then on it does. Change the date
 * here and every banner and button follows.
 */
export const LAUNCH_AT = new Date("2026-10-05T10:00:00+05:30");

/** As people read it: "Monday 5 October, 10 am". */
export const LAUNCH_LABEL = "Monday 5 October, 10 am";
export const LAUNCH_DAY = "5 October";

export function isBeforeLaunch(now = Date.now()) {
  return now < LAUNCH_AT.getTime();
}

/** The Android app's page on Google Play (live since version 1.2.8). */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.dashit.app";

/** The iPhone app's page on the App Store (live since version 1.0.1). */
export const APP_STORE_URL = "https://apps.apple.com/in/app/dashit-fastest-grocery-app/id6815538756";
