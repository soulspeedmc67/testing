import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { orderAddress } from "../../lib/orderReceipt";

/* Node and the browser default to different time zones, so an unpinned
   toLocaleString renders one time on the server and another on the client —
   a hydration mismatch that makes React re-render the whole page. The store
   is India-only, so the zone is fixed. */
const IST = "Asia/Kolkata";

/**
 * 80mm thermal packing slip.
 *
 * Two things were wrong before this rewrite:
 *
 *  - window.print() printed the whole admin console. There were no print styles,
 *    so the operator got the dashboard, sidebar and all, instead of the slip.
 *    The @media print block below hides everything except the slip itself.
 *
 *  - The money was decorative. "Delivery Partner Fee: FREE" was hardcoded
 *    regardless of what was actually charged, and there was no subtotal or
 *    discount line, so a slip could not be reconciled against the order.
 */
export default function PrintPackingSlip({ order, onClose }) {
  if (!order) return null;

  // createPortal needs a DOM target, which does not exist during prerender.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const orderId = order.orderId || order.id || "DSH";
  const items = order.items || [];
  const customerName = order.customerName || order.userAddress?.name || "Customer";
  const customerPhone = order.customerPhone || order.mobile || order.userAddress?.phone || "";
  const address = orderAddress(order, "No address on this order");

  const paymentMethod = order.paymentMethod || "Cash on Delivery";
  const isPaid = /online|upi|card/i.test(paymentMethod);

  /* Timestamps arrive as a Firestore Timestamp, an ISO string or an epoch
     number. The old version only understood Timestamps and silently stamped
     "now" on everything else, so reprinting an old order showed today's date. */
  const orderMs = (() => {
    const ts = order.createdAt ?? order.timestamp;
    if (!ts) return null;
    if (typeof ts === "number") return ts;
    if (typeof ts === "string") {
      const p = Date.parse(ts);
      return Number.isNaN(p) ? null : p;
    }
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    return null;
  })();

  /* Formatted only after mount. Node's and Chrome's date formatters disagree on
     small details even for the same locale and zone ("7 Sept" vs "7 Sep"), which
     is a hydration mismatch — and React responds by throwing away the server
     markup and re-rendering the whole page. */
  const orderTime =
    mounted && orderMs
      ? new Date(orderMs).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: IST })
      : "—";

  const lineTotal = (it) => (Number(it.price) || 0) * (it.qty || it.quantity || 1);
  const subtotal = items.reduce((sum, it) => sum + lineTotal(it), 0);
  const grandTotal = Number(order.totalAmount ?? order.total ?? subtotal) || 0;

  // Whatever the order total does not account for, shown honestly rather than
  // asserted as free.
  const deliveryFee = Number(order.deliveryFee ?? 0);
  const discount = Number(order.discount ?? order.couponDiscount ?? 0);
  const unitCount = items.reduce((n, it) => n + (it.qty || it.quantity || 1), 0);

  const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");


  const slip = {
    orderId, orderTime, isPaid, customerName, customerPhone, address, items,
    lineTotal, money, subtotal, unitCount, discount, deliveryFee, grandTotal,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 print:static print:bg-transparent print:p-0">
      {/* Print isolation lives in globals.css (@media print). */}

      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 space-y-4 max-h-[92vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:rounded-none">
        <div className="flex items-center justify-between print:hidden">
          <h3 className="font-semibold text-slate-900 text-sm">Packing slip</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* On-screen preview. The print copy is portalled to <body> below so
            the print stylesheet can hide everything except it. */}
        <div
          className="bg-white border border-slate-200 rounded-xl p-4 text-slate-900"
          style={{ fontFamily: SLIP_FONT }}
        >
          <SlipBody {...slip} />
        </div>

        <div className="flex items-center justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-[#061838] hover:bg-[#0A2450] text-white px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* The only thing that reaches paper. */}
      {mounted &&
        createPortal(
          <div id="dashit-print-root" style={{ fontFamily: SLIP_FONT }}>
            <SlipBody {...slip} />
          </div>,
          document.body
        )}
    </div>
  );
}

const SLIP_FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";

function SlipBody({ orderId, orderTime, isPaid, customerName, customerPhone, address, items, lineTotal, money, subtotal, unitCount, discount, deliveryFee, grandTotal }) {
  return (
    <>
          <header className="text-center pb-3 mb-3 border-b border-dashed border-slate-300">
            <h2 className="text-2xl font-black tracking-[0.18em] text-slate-900">DASHIT</h2>
            <p className="text-[10px] text-slate-500 mt-1">dashit.in &middot; +91 94190 00000</p>
          </header>

          <section className="text-[11px] space-y-1 pb-3 mb-3 border-b border-dashed border-slate-300">
            <Row label="Order" value={"#" + orderId} bold />
            <Row label="Placed" value={orderTime} />
            <Row label="Payment" value={isPaid ? "Prepaid" : "Cash on delivery"} />
          </section>

          <section className="text-[11px] pb-3 mb-3 border-b border-dashed border-slate-300">
            <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Deliver to</p>
            <p className="font-semibold">{customerName}</p>
            {customerPhone && <p className="text-slate-700">{customerPhone}</p>}
            <p className="text-slate-600 leading-snug mt-0.5">{address}</p>
          </section>

          <section className="pb-3 mb-3 border-b border-dashed border-slate-300">
            <div className="flex text-[9px] uppercase tracking-widest text-slate-400 pb-1.5">
              <span className="flex-1">Item</span>
              <span className="w-8 text-center">Qty</span>
              <span className="w-16 text-right">Amount</span>
            </div>
            <div className="space-y-1.5">
              {items.length === 0 ? (
                <p className="text-[11px] text-slate-400">No items recorded</p>
              ) : (
                items.map((it, idx) => (
                  <div key={idx} className="flex text-[11px] items-start">
                    <span className="flex-1 pr-2 leading-snug">{it.name}</span>
                    <span className="w-8 text-center text-slate-600">{it.qty || it.quantity || 1}</span>
                    <span className="w-16 text-right font-semibold">{money(lineTotal(it))}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="text-[11px] space-y-1">
            <Row label={`Subtotal (${unitCount} ${unitCount === 1 ? "unit" : "units"})`} value={money(subtotal)} />
            {discount > 0 && <Row label="Discount" value={"-" + money(discount)} />}
            <Row label="Delivery" value={deliveryFee > 0 ? money(deliveryFee) : "Free"} />
            <div className="flex justify-between pt-2 mt-1 border-t border-slate-900 text-sm font-bold">
              <span>{isPaid ? "Total (paid)" : "Collect"}</span>
              <span>{isPaid ? money(0) : money(grandTotal)}</span>
            </div>
          </section>

          <footer className="text-center mt-4 pt-3 border-t border-dashed border-slate-300">
            <p className="text-[10px] text-slate-500">Thank you for shopping with DASHit</p>
          </footer>
    </>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={"text-right " + (bold ? "font-bold" : "")}>{value}</span>
    </div>
  );
}
