/**
 * The loud new-order alarm for the rider app and the store's console (and the
 * Android admin and driver apps, which wrap them).
 *
 * Inside the Android apps it is native (MainActivity.startOrderAlarm): the
 * sound res/raw/order_alarm.wav loops on the phone's ALARM stream, so it rings
 * with the media volume down or the phone on silent, at least 85% loud, with
 * a strong repeating vibration and a heads-up notification. In a browser it
 * loops /sounds/order-alarm.wav at full volume (or a synthesised siren if the
 * browser won't play the file), with vibration where the phone supports it.
 *
 * It rings until stopOrderAlarm() (the "tap to silence" banner, or the rider
 * taking the order), a tap on its notification, or a minute has passed.
 */

const MAX_MS = 60_000;
const listeners = new Set();
let ringing = false;
let stopTimer = null;
let audio = null;
let synthTimer = null;
let vibrateTimer = null;
let ctx = null;
let primed = false;

const nativeBridge = () => {
  if (typeof window === "undefined") return null;
  const n = window.AndroidNotifications;
  return n && typeof n.startOrderAlarm === "function" ? n : null;
};

function emit() {
  listeners.forEach((cb) => {
    try {
      cb(ringing);
    } catch (e) {}
  });
}

/** Browsers only play sound after the person has touched the page once: get ready on that first touch. */
function prime() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  const unlock = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx && !ctx) ctx = new Ctx();
      if (ctx && ctx.state === "suspended") ctx.resume();
      if (!audio) audio = new Audio("/sounds/order-alarm.wav");
      audio.muted = true;
      const p = audio.play();
      if (p && p.then) p.then(() => { audio.pause(); audio.muted = false; audio.currentTime = 0; }).catch(() => { audio.muted = false; });
    } catch (e) {}
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}
if (typeof window !== "undefined") prime();

/** A loud two-tone siren from the Web Audio API, for when the sound file can't play. */
function synthBurst() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!ctx) ctx = new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    for (let i = 0; i < 7; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(i % 2 === 0 ? 1046.5 : 784, now + i * 0.12);
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.9, now + i * 0.12 + 0.01);
      gain.gain.setValueAtTime(0.9, now + i * 0.12 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.12);
      osc.connect(gain);
      gain.connect(comp);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.13);
    }
  } catch (e) {}
}

function vibrate() {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([700, 250, 700, 250, 700]);
  } catch (e) {}
}

/** Starts the alarm (restarts it if it is already ringing). */
export function startOrderAlarm({ title = "New order", body = "" } = {}) {
  stopOrderAlarm(false);
  ringing = true;
  const native = nativeBridge();
  let nativeOk = false;
  if (native) {
    try {
      native.startOrderAlarm(String(title), String(body));
      nativeOk = true;
    } catch (e) {}
  }
  if (!nativeOk && typeof window !== "undefined") {
    try {
      if (!audio) audio = new Audio("/sounds/order-alarm.wav");
      audio.muted = false;
      audio.loop = true;
      audio.volume = 1;
      audio.currentTime = 0;
      const p = audio.play();
      if (p && p.catch) {
        p.catch(() => {
          // Not allowed to play the file: the synthesised siren, once a second.
          synthBurst();
          synthTimer = setInterval(synthBurst, 1000);
        });
      }
    } catch (e) {
      synthBurst();
      synthTimer = setInterval(synthBurst, 1000);
    }
    vibrate();
    vibrateTimer = setInterval(vibrate, 3000);
  }
  if (nativeOk && typeof native.isOrderAlarmRinging === "function") {
    // Silenced from its notification: the banner goes too.
    synthTimer = setInterval(() => {
      try {
        if (!native.isOrderAlarmRinging()) stopOrderAlarm();
      } catch (e) {}
    }, 1500);
  }
  stopTimer = setTimeout(() => stopOrderAlarm(), MAX_MS);
  emit();
}

/** Silences the alarm. */
export function stopOrderAlarm(notify = true) {
  clearTimeout(stopTimer);
  clearInterval(synthTimer);
  clearInterval(vibrateTimer);
  stopTimer = synthTimer = vibrateTimer = null;
  const native = nativeBridge();
  if (native && typeof native.stopOrderAlarm === "function") {
    try {
      native.stopOrderAlarm();
    } catch (e) {}
  }
  if (audio) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {}
  }
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(0);
  } catch (e) {}
  const was = ringing;
  ringing = false;
  if (notify && was) emit();
}

export const isOrderAlarmRinging = () => ringing;

/** `cb(ringing)` whenever the alarm starts or stops; returns the unsubscribe. */
export function onOrderAlarmChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
