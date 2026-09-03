import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, User, Check, Users } from "lucide-react";
import { hapticLight, hapticMedium } from "../lib/haptics";

export default function OrderingForSomeoneElseModal({ isOpen, onClose, onSaveReceiver }) {
  const [showInputForm, setShowInputForm] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  if (!isOpen) return null;

  const handleConfirmReceiver = (e) => {
    e?.preventDefault();
    if (receiverName.trim() && receiverPhone.length >= 10) {
      hapticMedium();
      onSaveReceiver({ name: receiverName, phone: receiverPhone });
      onClose();
    } else {
      alert("Please enter a valid name and 10-digit mobile number");
    }
  };

  const handleForMe = () => {
    hapticLight();
    onSaveReceiver(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 360 }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[34px] px-6 pt-7 pb-8 shadow-2xl z-10 border-t border-slate-100 dark:border-zinc-800"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {!showInputForm ? (
            <div className="text-center">
              {/* Confetti & Trio Avatar Illustration */}
              <div className="relative w-36 h-20 mx-auto mb-2 flex items-center justify-center">
                <span className="absolute -left-3 top-2 text-amber-500 font-bold text-xs">✨</span>
                <span className="absolute -right-3 top-3 text-rose-500 font-bold text-xs">🎉</span>
                <div className="flex items-center -space-x-4">
                  <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-white dark:border-zinc-900 overflow-hidden flex items-center justify-center text-2xl shadow-sm">
                    👦
                  </div>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-white dark:border-zinc-900 overflow-hidden flex items-center justify-center text-3xl z-10 shadow-md">
                    👩
                  </div>
                  <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-white dark:border-zinc-900 overflow-hidden flex items-center justify-center text-2xl shadow-sm">
                    👵
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                Ordering for someone else?
              </h3>

              <div className="space-y-3 text-left mb-6">
                <div className="flex items-start space-x-3.5 bg-amber-50/60 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
                      Add receiver’s details as alternate contact
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                      For this delivery address
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 bg-amber-50/60 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
                      We’ll coordinate directly with them
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                      Rider will call them when arriving
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setShowInputForm(true);
                  }}
                  className="w-full py-4 rounded-2xl bg-[#061838] hover:bg-slate-900 text-white font-black text-sm shadow-md transition-transform active:scale-[0.98]"
                >
                  Yes, add receiver’s details!
                </button>
                <button
                  type="button"
                  onClick={handleForMe}
                  className="w-full py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-transparent text-slate-700 dark:text-zinc-300 font-extrabold text-sm hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  No, it’s for me!
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                Receiver Contact Details
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-4">
                The delivery partner will coordinate with this person upon arrival in Anantnag.
              </p>

              <form onSubmit={handleConfirmReceiver} className="space-y-3">
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1 block">
                    Receiver Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Sahil Mir"
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#061838]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1 block">
                    Receiver Mobile Number
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 9622XXXXXX"
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#061838]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3.5 rounded-2xl bg-[#061838] hover:bg-slate-900 text-white font-black text-xs shadow-md transition-transform active:scale-[0.98]"
                >
                  Save Receiver Details
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
