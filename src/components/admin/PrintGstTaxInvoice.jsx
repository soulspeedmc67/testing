import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X, Download, ShieldCheck } from "lucide-react";
import { DEFAULT_BUSINESS_GST_INFO, computeOrderGst } from "../../lib/gst";

const IST = "Asia/Kolkata";

/**
 * Formats numbers into Indian Rupees currency string
 */
function money(val) {
  return "₹" + Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converts a number to words (Indian numbering system)
 */
function numberToWords(num) {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return "Zero Rupees Only";

  function convertGroup(val) {
    let str = "";
    if (val > 99) {
      str += a[Math.floor(val / 100)] + " Hundred ";
      val %= 100;
    }
    if (val > 19) {
      str += b[Math.floor(val / 10)] + " ";
      val %= 10;
    }
    if (val > 0) {
      str += a[val] + " ";
    }
    return str.trim();
  }

  let words = "";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crore > 0) words += convertGroup(crore) + " Crore ";
  if (lakh > 0) words += convertGroup(lakh) + " Lakh ";
  if (thousand > 0) words += convertGroup(thousand) + " Thousand ";
  if (remainder > 0) words += convertGroup(remainder) + " ";

  return (words.trim() + " Rupees Only");
}

export default function PrintGstTaxInvoice({
  order = null,
  aggregatedReport = null,
  businessInfo = DEFAULT_BUSINESS_GST_INFO,
  onClose,
  mode = "order" // "order" | "statement"
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const info = { ...DEFAULT_BUSINESS_GST_INFO, ...(businessInfo || {}) };

  const computedOrder = mode === "order" && order ? computeOrderGst(order) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs print:static print:bg-transparent print:p-0">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:overflow-visible">
        {/* On-Screen Action Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF5B00] flex items-center justify-center font-black text-white text-xs">
              GST
            </div>
            <div>
              <h3 className="text-sm font-black">
                {mode === "order"
                  ? `GST Tax Invoice — ${computedOrder?.invoiceNumber || "Bill"}`
                  : `Consolidated GST Sales Bill & Tax Statement`}
              </h3>
              <p className="text-[11px] text-slate-300">
                GSTIN: {info.gstin} &middot; Place of Supply: {info.state} ({info.stateCode})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex-1 print:p-0 print:bg-white print:overflow-visible">
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-[210mm] mx-auto text-slate-900 text-xs">
            {mode === "order" && computedOrder ? (
              <OrderInvoiceContent data={computedOrder} business={info} />
            ) : mode === "statement" && aggregatedReport ? (
              <StatementContent report={aggregatedReport} business={info} />
            ) : (
              <div className="py-12 text-center text-slate-400">No data available to print.</div>
            )}
          </div>
        </div>
      </div>

      {/* Portalled Printable Copy */}
      {mounted &&
        createPortal(
          <div id="dashit-gst-print-root">
            {mode === "order" && computedOrder ? (
              <OrderInvoiceContent data={computedOrder} business={info} />
            ) : mode === "statement" && aggregatedReport ? (
              <StatementContent report={aggregatedReport} business={info} />
            ) : null}
          </div>,
          document.body
        )}
    </div>
  );
}

/**
 * Single Order GST Tax Invoice
 */
function OrderInvoiceContent({ data, business }) {
  return (
    <div className="space-y-4 font-sans text-[11px] leading-relaxed">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5B00] block">
            {business.tradeName}
          </span>
          <h1 className="text-xl font-black text-slate-900 leading-tight">
            {business.legalName}
          </h1>
          <p className="text-slate-600 mt-0.5">{business.address}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-slate-700 mt-1 font-semibold">
            <span><strong>GSTIN:</strong> {business.gstin}</span>
            <span><strong>State:</strong> {business.state} (Code: {business.stateCode})</span>
            {business.fssai && <span><strong>FSSAI:</strong> {business.fssai}</span>}
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono font-black text-xs uppercase tracking-widest mb-1">
            TAX INVOICE
          </span>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Original for Recipient</p>
          <p className="font-mono font-black text-sm text-slate-900 mt-1">
            {data.invoiceNumber}
          </p>
          <p className="text-slate-600 text-[10px]">
            Date: <strong>{data.date}</strong> &middot; {data.time}
          </p>
          <p className="text-slate-600 text-[10px]">
            Order Ref: <strong>#{data.orderId}</strong>
          </p>
        </div>
      </div>

      {/* Bill To & Supply Info */}
      <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-200">
        <div>
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
            Billed & Delivered To:
          </h4>
          <p className="font-black text-sm text-slate-900">{data.customerName}</p>
          <p className="text-slate-700 font-medium">{data.customerMobile}</p>
          <p className="text-slate-600 text-[10.5px] mt-0.5 leading-snug">{data.deliveryAddress}</p>
        </div>

        <div className="space-y-1 text-right">
          <div>
            <span className="text-slate-500">Place of Supply: </span>
            <strong className="text-slate-900">{data.placeOfSupply}</strong>
          </div>
          <div>
            <span className="text-slate-500">Supply Type: </span>
            <strong className="text-slate-900">Intra-State (B2C)</strong>
          </div>
          <div>
            <span className="text-slate-500">Reverse Charge: </span>
            <strong className="text-slate-900">No</strong>
          </div>
          <div>
            <span className="text-slate-500">Payment Mode: </span>
            <strong className="text-slate-900 uppercase">{data.paymentMethod}</strong>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div>
        <table className="w-full text-left border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-100 text-slate-800 text-[9.5px] uppercase tracking-wider font-black border-b border-slate-200">
              <th className="py-2 px-2 border-r border-slate-200 w-8 text-center">#</th>
              <th className="py-2 px-2 border-r border-slate-200">Item Description</th>
              <th className="py-2 px-2 border-r border-slate-200 w-14 text-center">HSN</th>
              <th className="py-2 px-2 border-r border-slate-200 w-10 text-center">Qty</th>
              <th className="py-2 px-2 border-r border-slate-200 w-16 text-right">MRP (₹)</th>
              <th className="py-2 px-2 border-r border-slate-200 w-18 text-right">Taxable (₹)</th>
              <th className="py-2 px-2 border-r border-slate-200 w-12 text-center">GST %</th>
              <th className="py-2 px-2 border-r border-slate-200 w-14 text-right">CGST (₹)</th>
              <th className="py-2 px-2 border-r border-slate-200 w-14 text-right">SGST (₹)</th>
              <th className="py-2 px-2 w-18 text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((it, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-1.5 px-2 border-r border-slate-200 text-center text-slate-500 font-mono text-[10px]">
                  {idx + 1}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 font-bold text-slate-900">
                  {it.name}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-slate-600 text-[10px]">
                  {it.hsn}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-slate-800">
                  {it.qty}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-slate-600">
                  {it.unitPrice.toFixed(2)}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-slate-800">
                  {it.taxable.toFixed(2)}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                  {it.gstRate}%
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-slate-600">
                  {it.cgst.toFixed(2)}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-slate-600">
                  {it.sgst.toFixed(2)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                  {it.lineGross.toFixed(2)}
                </td>
              </tr>
            ))}

            {/* Delivery Charge Line */}
            {data.deliveryFee > 0 && (
              <tr className="bg-amber-50/30">
                <td className="py-1.5 px-2 border-r border-slate-200 text-center text-slate-500 font-mono text-[10px]">
                  {data.items.length + 1}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 font-bold text-slate-900">
                  Express Delivery & Handling Charges
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-slate-600 text-[10px]">
                  9968
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-slate-800">
                  1
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-slate-600">
                  {data.deliveryFee.toFixed(2)}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-slate-800">
                  {(Math.round((data.deliveryFee / 1.18) * 100) / 100).toFixed(2)}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                  18%
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-slate-600">
                  {(Math.round(((data.deliveryFee - data.deliveryFee / 1.18) / 2) * 100) / 100).toFixed(2)}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-slate-600">
                  {(Math.round(((data.deliveryFee - data.deliveryFee / 1.18) / 2) * 100) / 100).toFixed(2)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                  {data.deliveryFee.toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tax Slabs Summary & Invoice Totals */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        {/* Left: GST Slabs Summary Table */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
            GST Slabs Breakdown:
          </h4>
          <table className="w-full text-left border-collapse border border-slate-200 text-[10px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-1 px-1.5">Rate</th>
                <th className="py-1 px-1.5 text-right">Taxable</th>
                <th className="py-1 px-1.5 text-right">CGST</th>
                <th className="py-1 px-1.5 text-right">SGST</th>
                <th className="py-1 px-1.5 text-right">Total Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {[0, 5, 12, 18].map((rate) => {
                const s = data.slabs[rate];
                if (!s || s.taxable <= 0) return null;
                return (
                  <tr key={rate}>
                    <td className="py-1 px-1.5 font-bold">{rate}%</td>
                    <td className="py-1 px-1.5 text-right">{s.taxable.toFixed(2)}</td>
                    <td className="py-1 px-1.5 text-right">{s.cgst.toFixed(2)}</td>
                    <td className="py-1 px-1.5 text-right">{s.sgst.toFixed(2)}</td>
                    <td className="py-1 px-1.5 text-right font-bold">{s.tax.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[9.5px] text-slate-500 italic mt-1">
            Amount in Words: <strong>{numberToWords(data.grandTotal)}</strong>
          </p>
        </div>

        {/* Right: Totals summary */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
          <div className="flex justify-between text-slate-600 font-medium">
            <span>Total Taxable Value</span>
            <span className="font-mono">{money(data.totalTaxable)}</span>
          </div>
          <div className="flex justify-between text-slate-600 font-medium">
            <span>Central Tax (CGST)</span>
            <span className="font-mono">{money(data.totalCgst)}</span>
          </div>
          <div className="flex justify-between text-slate-600 font-medium">
            <span>State Tax (SGST / UTGST)</span>
            <span className="font-mono">{money(data.totalSgst)}</span>
          </div>
          <div className="flex justify-between text-slate-600 font-bold border-t border-slate-200 pt-1">
            <span>Total GST Collected</span>
            <span className="font-mono text-[#FF5B00]">{money(data.totalTax)}</span>
          </div>
          <div className="flex justify-between text-slate-900 text-sm font-black border-t-2 border-slate-900 pt-1.5 mt-1">
            <span>INVOICE TOTAL</span>
            <span className="font-mono">{money(data.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer & Signature */}
      <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-[10px]">
        <div>
          <p className="font-bold text-slate-700">Terms & Conditions:</p>
          <ul className="text-slate-500 list-disc list-inside mt-0.5 space-y-0.5">
            <li>Goods once sold are covered under DASHit standard 10-minute return / refund policy.</li>
            <li>All disputes are subject to Anantnag jurisdiction.</li>
            <li>This is a computer-generated tax invoice and requires no physical signature.</li>
          </ul>
        </div>

        <div className="text-right flex flex-col justify-end items-end">
          <p className="text-[10px] text-slate-400 font-semibold mb-6">For {business.legalName}</p>
          <div className="border-t border-slate-400 w-48 pt-1 text-center font-bold text-slate-800 text-[10.5px]">
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Consolidated GST Sales Statement & Bill (for Company / CA filing)
 */
function StatementContent({ report, business }) {
  return (
    <div className="space-y-5 font-sans text-[11px] leading-relaxed">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5B00] block">
            {business.tradeName}
          </span>
          <h1 className="text-xl font-black text-slate-900 leading-tight">
            {business.legalName}
          </h1>
          <p className="text-slate-600 mt-0.5">{business.address}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-slate-700 mt-1 font-semibold">
            <span><strong>GSTIN:</strong> {business.gstin}</span>
            <span><strong>State:</strong> {business.state} ({business.stateCode})</span>
            <span><strong>CIN:</strong> {business.cin}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono font-black text-xs uppercase tracking-widest mb-1">
            GST SALES STATEMENT
          </span>
          <p className="text-[10px] text-slate-500 font-bold uppercase">B2C Sales Summary & Filing Register</p>
          <p className="text-slate-600 text-[10px] mt-1">
            Generated on: <strong>{new Date().toLocaleDateString("en-IN", { timeZone: IST })}</strong>
          </p>
          <p className="text-slate-600 text-[10px]">
            Status: <strong>{report.statusFilter === "delivered" ? "Delivered / Realized Sales" : "All Processed Orders"}</strong>
          </p>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Gross Turnover</span>
          <span className="text-base font-black font-mono text-slate-900">{money(report.totalGross)}</span>
          <span className="text-[9.5px] text-slate-500 block">{report.orderCount} orders invoiced</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Taxable Value</span>
          <span className="text-base font-black font-mono text-slate-900">{money(report.totalTaxable)}</span>
          <span className="text-[9.5px] text-slate-500 block">Total supply base</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">CGST + SGST Output</span>
          <span className="text-base font-black font-mono text-[#FF5B00]">{money(report.totalTax)}</span>
          <span className="text-[9.5px] text-slate-500 block">CGST: {money(report.totalCgst)} | SGST: {money(report.totalSgst)}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Charges</span>
          <span className="text-base font-black font-mono text-slate-900">{money(report.totalDelivery)}</span>
          <span className="text-[9.5px] text-slate-500 block">Taxed at 18% (SAC 9968)</span>
        </div>
      </div>

      {/* GST Slabs Summary Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
          1. GST Rate-Wise Sales Breakdown (GSTR-1 Table 7 / B2C Others)
        </h3>
        <table className="w-full text-left border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-100 text-slate-800 text-[10px] uppercase font-black border-b border-slate-200">
              <th className="py-2 px-3 border-r border-slate-200">GST Slab Rate</th>
              <th className="py-2 px-3 border-r border-slate-200">Categories & Commodities</th>
              <th className="py-2 px-3 border-r border-slate-200 text-right">Taxable Turnover (₹)</th>
              <th className="py-2 px-3 border-r border-slate-200 text-right">Central Tax CGST (₹)</th>
              <th className="py-2 px-3 border-r border-slate-200 text-right">State Tax SGST (₹)</th>
              <th className="py-2 px-3 border-r border-slate-200 text-right">Total Tax (₹)</th>
              <th className="py-2 px-3 text-right">Gross Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[10.5px]">
            {[0, 5, 12, 18].map((rate) => {
              const s = report.slabs[rate];
              return (
                <tr key={rate} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900">
                    {rate}%
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 font-sans font-medium text-slate-600 text-[10px]">
                    {s.label}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 text-right font-bold text-slate-900">
                    {s.taxable.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 text-right text-slate-700">
                    {s.cgst.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 text-right text-slate-700">
                    {s.sgst.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 text-right font-bold text-[#FF5B00]">
                    {s.tax.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    {s.gross.toFixed(2)}
                  </td>
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
              <td colSpan={2} className="py-2 px-3 border-r border-slate-200 font-sans uppercase">
                TOTAL AGGREGATE
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right font-black text-slate-900">
                {report.totalTaxable.toFixed(2)}
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right text-slate-900">
                {report.totalCgst.toFixed(2)}
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right text-slate-900">
                {report.totalSgst.toFixed(2)}
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right font-black text-[#FF5B00]">
                {report.totalTax.toFixed(2)}
              </td>
              <td className="py-2 px-3 text-right font-black text-slate-900">
                {report.totalGross.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Order Invoices Summary List */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
          2. Tax Invoices Register (Latest {Math.min(report.orders.length, 30)} Invoices)
        </h3>
        <table className="w-full text-left border-collapse border border-slate-200 text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800 uppercase font-bold border-b border-slate-200">
              <th className="py-1.5 px-2 border-r border-slate-200">Invoice #</th>
              <th className="py-1.5 px-2 border-r border-slate-200">Date</th>
              <th className="py-1.5 px-2 border-r border-slate-200">Customer</th>
              <th className="py-1.5 px-2 border-r border-slate-200 text-right">Taxable (₹)</th>
              <th className="py-1.5 px-2 border-r border-slate-200 text-right">CGST (₹)</th>
              <th className="py-1.5 px-2 border-r border-slate-200 text-right">SGST (₹)</th>
              <th className="py-1.5 px-2 border-r border-slate-200 text-right">Total (₹)</th>
              <th className="py-1.5 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {report.orders.slice(0, 30).map((o, idx) => (
              <tr key={idx}>
                <td className="py-1 px-2 border-r border-slate-200 font-bold text-slate-900">
                  {o.invoiceNumber}
                </td>
                <td className="py-1 px-2 border-r border-slate-200 text-slate-600">
                  {o.date}
                </td>
                <td className="py-1 px-2 border-r border-slate-200 font-sans font-medium text-slate-800">
                  {o.customerName}
                </td>
                <td className="py-1 px-2 border-r border-slate-200 text-right">
                  {o.totalTaxable.toFixed(2)}
                </td>
                <td className="py-1 px-2 border-r border-slate-200 text-right text-slate-600">
                  {o.totalCgst.toFixed(2)}
                </td>
                <td className="py-1 px-2 border-r border-slate-200 text-right text-slate-600">
                  {o.totalSgst.toFixed(2)}
                </td>
                <td className="py-1 px-2 border-r border-slate-200 text-right font-bold text-slate-900">
                  {o.grandTotal.toFixed(2)}
                </td>
                <td className="py-1 px-2 text-center font-sans uppercase text-[9px] font-bold text-slate-600">
                  {o.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {report.orders.length > 30 && (
          <p className="text-[10px] text-slate-500 italic text-right">
            Showing 30 of {report.orders.length} invoices. Full register available in GSTR-1 CSV export.
          </p>
        )}
      </div>

      {/* Certification & Signature */}
      <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-[10px]">
        <div>
          <p className="font-bold text-slate-700">Declaration & Certification:</p>
          <p className="text-slate-500 mt-0.5 leading-relaxed">
            We declare that this statement presents a true and correct summary of supplies effected through our electronic commerce platform in the Union Territory of Jammu & Kashmir in accordance with the provisions of the Central Goods and Services Tax Act, 2017.
          </p>
        </div>

        <div className="text-right flex flex-col justify-end items-end">
          <p className="text-[10px] text-slate-400 font-semibold mb-6">For {business.legalName}</p>
          <div className="border-t border-slate-400 w-52 pt-1 text-center font-bold text-slate-800 text-[10.5px]">
            Authorized Signatory / Tax Manager
          </div>
        </div>
      </div>
    </div>
  );
}
