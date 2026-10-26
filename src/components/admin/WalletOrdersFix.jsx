import React, { useState } from "react";
import { Wallet, Loader2, Search, Check } from "lucide-react";
import { collection, query, where, getDocs, runTransaction, doc, serverTimestamp } from "firebase/firestore";
import { getDb } from "../../lib/firebase";
import { isPaidOnline } from "../../lib/orderChange";

/* An order the store can still change the price of: not out for delivery, not
   delivered, not cancelled, and paid in cash (an order paid online was charged
   the reduced amount already). */
const stillWithStore = (order) => {
  const status = String(order?.status || "").toLowerCase();
  return /placed|pack/.test(status) && !/out|deliver|cancel/.test(status);
};

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * One-time clean-up for orders placed while the wallet credit was coming off
 * the bill: finds the cash orders that used the wallet and have not gone out
 * for delivery, shows what each would cost without the credit, and on
 * confirmation puts the credit back into the order's total. The old total and
 * the amount are kept on the order (`previousTotal`, `walletWaived`). Orders
 * already out, delivered, cancelled or paid online are left alone.
 */
export default function WalletOrdersFix({ darkMode = false }) {
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState("");

  const card = `rounded-2xl border p-5 space-y-4 ${darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"}`;
  const button =
    "inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer";

  const find = async () => {
    setBusy("find");
    setResult("");
    try {
      const snap = await getDocs(query(collection(getDb(), "orders"), where("walletUsed", ">", 0)));
      setOrders(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    } catch (e) {
      setResult("Couldn't look up the orders. Check your connection and that you're signed in as the owner.");
    } finally {
      setBusy("");
    }
  };

  const eligible = (orders || []).filter((o) => stillWithStore(o) && !isPaidOnline(o));
  const left = (orders || []).filter((o) => !eligible.includes(o));

  const apply = async () => {
    if (!eligible.length) return;
    if (
      !window.confirm(
        `Add the wallet credit back to ${eligible.length} cash order${eligible.length === 1 ? "" : "s"}?\n\nEach order's total goes up by the credit it used, and the rider will collect that. The old total is kept on the order.`
      )
    ) {
      return;
    }
    setBusy("apply");
    let fixed = 0;
    let skipped = 0;
    const db = getDb();
    for (const order of eligible) {
      try {
        const done = await runTransaction(db, async (tx) => {
          const ref = doc(db, "orders", order.id);
          const snap = await tx.get(ref);
          if (!snap.exists()) return false;
          const now = snap.data();
          const credit = Number(now.walletUsed) || 0;
          // Looked at again inside the transaction: it may have gone out meanwhile.
          if (credit <= 0 || !stillWithStore(now) || isPaidOnline(now)) return false;
          const before = Number(now.total ?? now.totalAmount ?? now.finalTotal) || 0;
          const after = before + credit;
          tx.update(ref, {
            total: after,
            totalAmount: after,
            finalTotal: after,
            walletUsed: 0,
            walletWaived: credit,
            previousTotal: before,
            totalFixedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          return true;
        });
        if (done) fixed += 1;
        else skipped += 1;
      } catch (e) {
        skipped += 1;
      }
    }
    setBusy("");
    setResult(`Done. ${fixed} order${fixed === 1 ? "" : "s"} fixed${skipped ? `, ${skipped} left alone (already changed or out for delivery)` : ""}.`);
    await find();
  };

  return (
    <div className={card}>
      <div className="flex items-center space-x-2">
        <Wallet className="w-5 h-5 text-[#FF5B00]" />
        <h3 className="font-black text-sm text-slate-900 dark:text-white">Orders that used the wallet</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-400">
        While the wallet was on, its credit came off the bill and the total came out near the items alone. This finds those orders
        and, only for cash orders that haven&apos;t gone out for delivery, puts the credit back into the total. Nothing changes until you
        confirm.
      </p>

      <button type="button" onClick={find} disabled={Boolean(busy)} className={`${button} bg-[#FF5B00] hover:bg-[#E04E00] text-white`}>
        {busy === "find" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        Find the orders
      </button>

      {result && <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{result}</p>}

      {orders && (
        <div className="space-y-3">
          <p className="text-xs font-black text-slate-900 dark:text-white">
            {orders.length === 0
              ? "No order used the wallet."
              : `${orders.length} order${orders.length === 1 ? "" : "s"} used the wallet: ${eligible.length} can be fixed, ${left.length} will be left alone.`}
          </p>

          {eligible.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold">Order</th>
                    <th className="text-left px-3 py-2 font-bold">Status</th>
                    <th className="text-right px-3 py-2 font-bold">Total now</th>
                    <th className="text-right px-3 py-2 font-bold">Wallet</th>
                    <th className="text-right px-3 py-2 font-bold">New total</th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map((o) => {
                    const now = Number(o.total ?? o.totalAmount ?? o.finalTotal) || 0;
                    return (
                      <tr key={o.id} className="border-t border-slate-100 dark:border-zinc-800">
                        <td className="px-3 py-2 font-mono font-bold">{o.id}</td>
                        <td className="px-3 py-2">{o.status}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{rupees(now)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500">+{rupees(o.walletUsed)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-black">{rupees(now + (Number(o.walletUsed) || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {left.length > 0 && (
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Left alone: {left.map((o) => `${o.id} (${isPaidOnline(o) ? "paid online" : o.status})`).join(", ")}.
            </p>
          )}

          {eligible.length > 0 && (
            <button type="button" onClick={apply} disabled={Boolean(busy)} className={`${button} bg-emerald-600 hover:bg-emerald-700 text-white`}>
              {busy === "apply" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Add the credit back to {eligible.length} order{eligible.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
