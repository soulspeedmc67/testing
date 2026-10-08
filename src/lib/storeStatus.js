import { useState, useEffect } from "react";
import { watchStoreConfig } from "./db";
import { isFirebaseConfigured } from "./firebase";

/**
 * Realtime hook providing store open/closed status.
 * Syncs across Firestore, window custom events (admin in same session),
 * and localStorage cross-tab storage events.
 */
export function useStoreStatus() {
  const details = useStoreDetails();
  return details.isOpen;
}

/**
 * Hook providing both store open/closed boolean and the custom close reason
 * (e.g. "Night hours — reopening tomorrow at 7:00 AM", "Restocking fresh inventory").
 */
export function useStoreDetails() {
  /* Starts from the same value the server renders. Reading localStorage in the
     initialiser meant a device with the store cached as closed rendered a
     different tree than the prerendered HTML, and React responded by discarding
     the server markup and client-rendering the entire page. The cached value is
     picked up in the effect below instead, one tick later. */
  const [details, setDetails] = useState({ isOpen: true, closeReason: "", weatherAlert: null });

  useEffect(() => {
    // Adopt the cached status as soon as we are past hydration.
    try {
      const cachedOpen = localStorage.getItem("dashit_store_open");
      const cachedReason = localStorage.getItem("dashit_store_close_reason");
      const cachedWeather = localStorage.getItem("dashit_store_weather_alert");
      let weather = null;
      if (cachedWeather) {
        try { weather = JSON.parse(cachedWeather); } catch (e) {}
      }
      if (cachedOpen !== null || cachedReason || weather) {
        setDetails({
          isOpen: cachedOpen !== null ? JSON.parse(cachedOpen) !== false : true,
          closeReason: cachedReason || "Night hours — reopening tomorrow at 7:00 AM",
          weatherAlert: weather,
        });
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "dashit_store_open" || e.key === "dashit_store_close_reason" || e.key === "dashit_store_weather_alert") {
        try {
          const cachedOpen = localStorage.getItem("dashit_store_open");
          const cachedReason = localStorage.getItem("dashit_store_close_reason");
          const cachedWeather = localStorage.getItem("dashit_store_weather_alert");
          let weather = null;
          if (cachedWeather) {
            try { weather = JSON.parse(cachedWeather); } catch (e) {}
          }
          setDetails({
            isOpen: cachedOpen !== null ? JSON.parse(cachedOpen) !== false : true,
            closeReason: cachedReason || "Night hours — reopening tomorrow at 7:00 AM",
            weatherAlert: weather,
          });
        } catch (err) {}
      }
    };

    const handleCustom = (e) => {
      if (e.detail) {
        setDetails((prev) => ({
          isOpen: typeof e.detail.isOpen === "boolean" ? e.detail.isOpen : prev.isOpen,
          closeReason: e.detail.closeReason || prev.closeReason,
          weatherAlert: e.detail.weatherAlert !== undefined ? e.detail.weatherAlert : prev.weatherAlert,
        }));
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("dashit_store_status_changed", handleCustom);

    let unsub = () => {};
    if (isFirebaseConfigured) {
      unsub = watchStoreConfig((cfg) => {
        if (cfg) {
          const isOpen = typeof cfg.isOpen === "boolean" ? cfg.isOpen : true;
          const closeReason = cfg.closeReason || "Night hours — reopening tomorrow at 7:00 AM";
          const weatherAlert = cfg.weatherAlert || null;
          setDetails({ isOpen, closeReason, weatherAlert });
          try {
            localStorage.setItem("dashit_store_open", JSON.stringify(isOpen));
            if (cfg.closeReason) {
              localStorage.setItem("dashit_store_close_reason", cfg.closeReason);
            }
            if (cfg.weatherAlert !== undefined) {
              localStorage.setItem("dashit_store_weather_alert", JSON.stringify(cfg.weatherAlert));
            }
          } catch (err) {}
        }
      });
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("dashit_store_status_changed", handleCustom);
      if (typeof unsub === "function") unsub();
    };
  }, []);

  return details;
}

/** Cash on delivery is on unless the shop has switched it off (`codEnabled` on config/store). */
export function isCodEnabled(config) {
  return config?.codEnabled !== false;
}

/** Cash on delivery stops at 8 pm unless the shop allows it at night (`codAtNight` on config/store). */
export function isCodAllowedAtNight(config) {
  return config?.codAtNight === true;
}

/**
 * The whole `config/store` document, or null until it arrives. Rides on the
 * same shared listener as the open/closed status, so it costs no extra read.
 */
export function useStoreConfig() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    return watchStoreConfig((cfg) => setConfig(cfg || null));
  }, []);

  return config;
}

/**
 * True once `config/store` has come from the server on this visit. A returning
 * shopper's browser first shows the copy it saved last time, so a fee or a
 * charge the shop switched on since then is missing for a moment. Checkout
 * doesn't take an order until this is true. Same shared listener, no extra read.
 */
export function useStoreConfigLive() {
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    return watchStoreConfig((_cfg, isLive) => setLive(Boolean(isLive)));
  }, []);

  return live;
}
