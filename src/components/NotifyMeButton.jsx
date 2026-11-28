import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Bell, BellRing, Check } from "lucide-react";
import { hapticLight } from "../lib/haptics";
import { hasAskedForRestock, onRestockChange, setRestockRequest } from "../lib/restock";

/**
 * Shown instead of ADD on an item that is out of stock: "Notify me" tells the
 * shop someone wants it (the owner sees it under "Restock requests") and the
 * shopper gets a notification on their phone once it's back. Tapping again
 * takes the request back.
 *
 * It fills the ADD button's slot (product cards, quick view, product page).
 */
export default function NotifyMeButton({ product, className = "" }) {
  const router = useRouter();
  const productId = String(product?.id || product?.barcode || "");
  const [asked, setAsked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = () => setAsked(hasAskedForRestock(productId));
    sync();
    return onRestockChange(sync);
  }, [productId]);

  const toggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy || !productId) return;
    hapticLight();
    setBusy(true);
    setError("");
    try {
      await setRestockRequest(productId, !asked);
    } catch (err) {
      if (err.needsSignIn) {
        router.push(`/login?next=${encodeURIComponent(router.asPath || "/shop")}`);
        return;
      }
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const tone = asked
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
    : "bg-white text-[#FF5B00] border-[#FF5B00]/60 hover:bg-orange-50 dark:bg-surface-raised dark:hover:bg-surface-muted";
  const Icon = asked ? Check : busy ? BellRing : Bell;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`relative ${className.includes("h-") ? "" : "h-8"} w-full shrink-0 overflow-hidden rounded-xl select-none ${className}`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={asked}
        aria-label={asked ? `You'll be told when ${product?.name || "this item"} is back. Tap to cancel.` : `Notify me when ${product?.name || "this item"} is back`}
        title={error || undefined}
        className={`w-full h-full rounded-xl border font-black text-[10.5px] uppercase tracking-wide flex items-center justify-center gap-1 transition-all active:scale-[0.97] cursor-pointer disabled:opacity-70 ${tone}`}
      >
        <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{asked ? "Requested" : "Notify me"}</span>
      </button>
    </div>
  );
}
