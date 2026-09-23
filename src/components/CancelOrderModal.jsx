import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, ArrowLeft, ShoppingBag, RotateCcw } from "lucide-react";
import { hapticMedium, hapticLight } from "../lib/haptics";
import { SPRING_SNAPPY } from "../lib/motion";

export default function CancelOrderModal({
  isOpen,
  onClose,
  onConfirmCancel,
  order,
  isCancelling = false,
}) {
  const [restoreCart, setRestoreCart] = useState(true);

  if (!isOpen) return null;

  const orderId = order?.orderId || order?.id || "ORDER";
  const items = order?.items || [];
  const itemCount = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  const total = order?.finalTotal || order?.totalAmount || order?.total || 0;

  const handleConfirm = () => {
    hapticMedium();
    onConfirmCancel({ restoreCart });
  };

  const handleDismiss = () => {
    hapticLight();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
        {/* Frosted Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-[#061838]/60 backdrop-blur-md"
        />

        {/* Modal Card / Bottom Sheet */}
        <motion.div
          initial={{ y: "100%", opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: "100%", opacity: 0, scale: 0.95 }}
          transition={SPRING_SNAPPY}
          className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-slate-100 z-10 overflow-hidden dark:bg-[#16171B] dark:border-white/10"
          style={{
            paddingBottom: "max(1.75rem, calc(1.25rem + env(safe-area-inset-bottom, 16px)))",
          }}
        >
          {/* Top Sheet Notch */}
          <div className="sm:hidden w-full flex justify-center mb-3">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-full" />
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-neutral-300 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Header with Alert Icon */}
          <div className="flex items-center space-x-3.5 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/50 shadow-xs">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full inline-block">
                Grace Period Cancel
              </span>
              <h2 className="text-lg font-black text-[#061838] dark:text-white tracking-tight leading-tight mt-0.5">
                Cancel Order #{orderId}?
              </h2>
            </div>
          </div>

          <p className="text-[13px] text-slate-600 dark:text-neutral-300 leading-relaxed mb-4">
            Packing has not started yet. You can cancel this order instantly with zero fees or penalties.
          </p>

          {/* Order Snapshot Card */}
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 mb-4 space-y-1.5 text-xs">
            <div className="flex justify-between font-medium text-slate-600 dark:text-neutral-400">
              <span>Order Total</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">₹{total}</span>
            </div>
            <div className="flex justify-between font-medium text-slate-600 dark:text-neutral-400">
              <span>Items in Order</span>
              <span className="font-bold text-slate-900 dark:text-white">{itemCount} items</span>
            </div>
          </div>

          {/* Restore Cart Option */}
          <label className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 mb-5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={restoreCart}
              onChange={(e) => setRestoreCart(e.target.checked)}
              className="w-4 h-4 rounded text-[#FF5B00] accent-[#FF5B00] focus:ring-0 cursor-pointer"
            />
            <div className="text-[12px] leading-tight">
              <span className="font-bold text-[#061838] dark:text-white block">
                Restore items back to my cart
              </span>
              <span className="text-[10.5px] text-slate-500 dark:text-neutral-400">
                Keep the items in your cart so you can modify and checkout again.
              </span>
            </div>
          </label>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isCancelling}
              className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-extrabold text-[14px] shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isCancelling ? (
                <span>Cancelling Order…</span>
              ) : (
                <>
                  <X className="w-4 h-4 stroke-[3]" />
                  <span>Yes, Cancel Order</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Don't Cancel — Keep Order
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
