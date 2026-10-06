import { useEffect, useState } from "react";
import { SHOP_RULE_DEFAULTS, shopRules, sameShopRules } from "./deliveryCharges";

const RULES_CACHE_KEY = "dashit_shop_rules";

/**
 * The shop's order rules (minimum order, delivery fees, handling charge) from
 * `config/store`, on the same shared listener as the open/closed status, so
 * they cost no extra read.
 *
 * Starts from the built-in defaults so the first render matches the exported
 * HTML, then takes the rules this browser last saw, then the live ones. The
 * database code is loaded on demand, so a page that only quotes the numbers
 * (Help) doesn't carry it in its first load. Pass `false` to stay off the
 * listener on screens that don't show the rules.
 */
export function useShopRules(enabled = true) {
  const [rules, setRules] = useState(SHOP_RULE_DEFAULTS);

  useEffect(() => {
    if (!enabled) return undefined;
    const adopt = (next) => setRules((prev) => (sameShopRules(prev, next) ? prev : next));
    try {
      const cached = JSON.parse(localStorage.getItem(RULES_CACHE_KEY) || "null");
      if (cached) adopt(shopRules(cached));
    } catch (e) {}

    let stop = null;
    let left = false;
    Promise.all([import("./firebase"), import("./db")])
      .then(([firebase, db]) => {
        if (left || !firebase.isFirebaseConfigured) return;
        stop = db.watchStoreConfig((cfg) => {
          const next = shopRules(cfg);
          adopt(next);
          try {
            localStorage.setItem(RULES_CACHE_KEY, JSON.stringify(next));
          } catch (e) {}
        });
      })
      .catch(() => {});
    return () => {
      left = true;
      if (typeof stop === "function") stop();
    };
  }, [enabled]);

  return rules;
}
