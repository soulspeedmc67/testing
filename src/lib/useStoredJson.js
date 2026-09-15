import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reads a JSON value out of localStorage and keeps it in sync.
 *
 * Several components used to each run their own `setInterval` over localStorage
 * — the cart bar every 2s on every screen, the live-order cards every 3s — and
 * every tick called setState with a freshly parsed object. A new object identity
 * re-renders the component even when the stored bytes are identical, so the app
 * was re-rendering its docked chrome around the clock, including while it sat in
 * the background.
 *
 * This hook compares the raw string first and only publishes a new value when
 * the stored JSON actually changed, and it stops polling while the document is
 * hidden (resyncing immediately when the app comes back to the foreground).
 * Writers that dispatch a custom event get picked up instantly; the poll is only
 * the safety net for writes made without one.
 *
 * @param {string} key localStorage key to watch.
 * @param {object} [options]
 * @param {string[]} [options.events] Custom window events that signal a write.
 * @param {number} [options.intervalMs] Safety-net poll interval; 0 disables it.
 * @param {*} [options.fallback] Value to use when the key is missing or invalid.
 */
export function useStoredJson(key, { events = [], intervalMs = 3000, fallback = null } = {}) {
  const fallbackRef = useRef(fallback);
  const rawRef = useRef(undefined);
  const [value, setValue] = useState(fallback);

  const sync = useCallback(() => {
    if (typeof window === "undefined") return;
    let raw = null;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      return; // Private mode or blocked storage: keep the last known value
    }

    if (raw === rawRef.current) return;
    rawRef.current = raw;

    if (!raw) {
      setValue(fallbackRef.current);
      return;
    }
    try {
      setValue(JSON.parse(raw));
    } catch (e) {
      setValue(fallbackRef.current);
    }
  }, [key]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let timer = null;
    const startTimer = () => {
      if (timer || !intervalMs) return;
      timer = setInterval(sync, intervalMs);
    };
    const stopTimer = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        sync(); // Catch up on anything written while we were away
        startTimer();
      }
    };

    sync();
    if (!document.hidden) startTimer();

    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", handleVisibility);
    events.forEach((evt) => window.addEventListener(evt, sync));

    return () => {
      stopTimer();
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", handleVisibility);
      events.forEach((evt) => window.removeEventListener(evt, sync));
    };
    // `events` is a literal array at every call site; join it so a fresh array
    // on each render does not tear the listeners down and rebuild them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync, intervalMs, events.join("|")]);

  return value;
}

export default useStoredJson;
