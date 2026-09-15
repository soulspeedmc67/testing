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
  const [details, setDetails] = useState({ isOpen: true, closeReason: "" });

  useEffect(() => {
    // Adopt the cached status as soon as we are past hydration.
    try {
      const cachedOpen = localStorage.getItem("dashit_store_open");
      const cachedReason = localStorage.getItem("dashit_store_close_reason");
      if (cachedOpen !== null || cachedReason) {
        setDetails({
          isOpen: cachedOpen !== null ? JSON.parse(cachedOpen) !== false : true,
          closeReason: cachedReason || "Night hours — reopening tomorrow at 7:00 AM",
        });
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "dashit_store_open" || e.key === "dashit_store_close_reason") {
        try {
          const cachedOpen = localStorage.getItem("dashit_store_open");
          const cachedReason = localStorage.getItem("dashit_store_close_reason");
          setDetails({
            isOpen: cachedOpen !== null ? JSON.parse(cachedOpen) !== false : true,
            closeReason: cachedReason || "Night hours — reopening tomorrow at 7:00 AM",
          });
        } catch (err) {}
      }
    };

    const handleCustom = (e) => {
      if (e.detail) {
        setDetails((prev) => ({
          isOpen: typeof e.detail.isOpen === "boolean" ? e.detail.isOpen : prev.isOpen,
          closeReason: e.detail.closeReason || prev.closeReason,
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
          setDetails({ isOpen, closeReason });
          try {
            localStorage.setItem("dashit_store_open", JSON.stringify(isOpen));
            if (cfg.closeReason) {
              localStorage.setItem("dashit_store_close_reason", cfg.closeReason);
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
