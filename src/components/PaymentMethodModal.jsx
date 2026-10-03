import { CheckCircle2, Circle, Smartphone, Banknote } from "lucide-react";
import DraggableSheet from "./ui/DraggableSheet";
import { hapticMedium } from "../lib/haptics";

/** How the order is paid. `label` is what the order records (the store and rider screens read it). */
export const PAYMENT_METHODS = [
  {
    id: "online",
    label: "Paid online",
    title: "Pay online",
    detail: "UPI, cards, net banking or wallets, through Razorpay",
    icon: Smartphone,
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    title: "Cash on delivery",
    detail: "Pay the rider in cash, or by UPI at your door",
    icon: Banknote,
  },
];

export default function PaymentMethodModal({ isOpen, onClose, selectedMethod, onSelectMethod }) {
  const choose = (method) => {
    hapticMedium();
    onSelectMethod({ id: method.id, label: method.label });
    onClose();
  };

  return (
    <DraggableSheet isOpen={isOpen} onClose={onClose} zIndex="z-[120]">
      <div className="px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <h2 className="text-[20px] font-extrabold tracking-tight text-[#061838] dark:text-content">How would you like to pay?</h2>
        <div className="mt-4 rounded-2xl border border-slate-200 divide-y divide-slate-200 overflow-hidden dark:border-line dark:divide-line">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            const active = selectedMethod?.id === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => choose(method)}
                className="w-full flex items-center gap-3.5 px-4 py-4 text-left bg-white hover:bg-slate-50 transition-colors dark:bg-surface-raised dark:hover:bg-surface-muted"
              >
                <span className="w-10 h-10 rounded-xl bg-slate-100 text-[#061838] flex items-center justify-center shrink-0 dark:bg-surface-muted dark:text-content">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="min-w-0 grow">
                  <span className="block text-[15px] font-bold text-slate-900 dark:text-content">{method.title}</span>
                  <span className="block text-[13px] text-slate-500 dark:text-content-muted">{method.detail}</span>
                </span>
                {active ? (
                  <CheckCircle2 className="w-5 h-5 text-[#FF5B00] shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 shrink-0 dark:text-content-faint" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </DraggableSheet>
  );
}
