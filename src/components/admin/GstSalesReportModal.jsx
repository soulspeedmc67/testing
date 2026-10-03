import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  Download,
  X,
  Filter,
  CheckCircle2,
  Calendar,
  Building2,
  Receipt,
  FileText,
  Search,
  ChevronRight,
  TrendingUp,
  Percent,
  Settings
} from "lucide-react";
import {
  DEFAULT_BUSINESS_GST_INFO,
  computeAggregatedGstReport,
  generateGstr1CsvString,
  computeOrderGst
} from "../../lib/gst";
import { triggerCsvDownload } from "../../lib/csvExport";
import PrintGstTaxInvoice from "./PrintGstTaxInvoice";

export default function GstSalesReportModal({
  orders = [],
  isOpen = false,
  onClose,
  businessInfo = DEFAULT_BUSINESS_GST_INFO,
  onSaveBusinessInfo,
  darkMode = false,
}) {
  const [period, setPeriod] = useState("this-month");
  const [statusFilter, setStatusFilter] = useState("delivered");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("slabs"); // "slabs" | "invoices"

  // Business Profile customization
  const [showBusinessEditor, setShowBusinessEditor] = useState(false);
  const [businessForm, setBusinessForm] = useState(businessInfo || DEFAULT_BUSINESS_GST_INFO);

  // Printing State
  const [printingStatement, setPrintingStatement] = useState(false);
  const [printingOrder, setPrintingOrder] = useState(null);

  // Aggregated Report Computation
  const report = useMemo(() => {
    return computeAggregatedGstReport(orders, {
      period,
      statusFilter,
      startDate: period === "custom" ? startDate : null,
      endDate: period === "custom" ? endDate : null
    });
  }, [orders, period, statusFilter, startDate, endDate]);

  // Filtered Invoices in the register table
  const displayedInvoices = useMemo(() => {
    if (!searchQuery.trim()) return report.orders;
    const q = searchQuery.toLowerCase().trim();
    return report.orders.filter(
      (o) =>
        o.orderId.toLowerCase().includes(q) ||
        o.invoiceNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerMobile.includes(q)
    );
  }, [report.orders, searchQuery]);

  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    if (!report.orders || report.orders.length === 0) {
      alert("No sales orders in this period to export.");
      return;
    }
    const csvContent = generateGstr1CsvString(report.orders);
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerCsvDownload(csvContent, `DASHit_GSTR1_Sales_${period}_${dateStr}.csv`);
  };

  const handleSaveBusiness = (e) => {
    e.preventDefault();
    if (onSaveBusinessInfo) {
      onSaveBusinessInfo(businessForm);
    }
    setShowBusinessEditor(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs">
      <div
        className={`w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 ${
          darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/15 text-[#FF5B00] flex items-center justify-center font-black">
              <Receipt className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  GST Sales Bill & Tax Register
                </h2>
                <span className="text-[10px] font-mono font-black uppercase bg-[#FF5B00]/10 text-[#FF5B00] px-2 py-0.5 rounded-md border border-[#FF5B00]/20">
                  GSTR-1
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                GSTIN: <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{businessForm.gstin}</span> &middot; Place of Supply: {businessForm.state} ({businessForm.stateCode})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowBusinessEditor(!showBusinessEditor)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-slate-200 dark:border-zinc-700 text-xs font-bold flex items-center space-x-1"
              title="Edit Company GSTIN & Business Info"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GST Profile</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-700 bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>GSTR-1 CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setPrintingStatement(true)}
              className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Print Sales Bill</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Business Info Accordion Editor (collapsible) */}
        {showBusinessEditor && (
          <form onSubmit={handleSaveBusiness} className="p-4 bg-orange-50/40 dark:bg-orange-950/15 border-b border-orange-200 dark:border-orange-900/40 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-zinc-200">
                Company & GST Registration Details (Appears on Tax Invoices & Statements)
              </span>
              <button
                type="button"
                onClick={() => setShowBusinessEditor(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Company Legal Name</label>
                <input
                  type="text"
                  required
                  value={businessForm.legalName}
                  onChange={(e) => setBusinessForm((p) => ({ ...p, legalName: e.target.value }))}
                  className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Trade / Brand Name</label>
                <input
                  type="text"
                  required
                  value={businessForm.tradeName}
                  onChange={(e) => setBusinessForm((p) => ({ ...p, tradeName: e.target.value }))}
                  className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">GSTIN Number *</label>
                <input
                  type="text"
                  required
                  placeholder="01AABCD1234E1Z5"
                  value={businessForm.gstin}
                  onChange={(e) => setBusinessForm((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                  className="w-full text-xs font-mono font-black px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="submit"
                className="bg-[#061838] dark:bg-zinc-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              >
                Save GST Profile
              </button>
            </div>
          </form>
        )}

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-50 dark:bg-[#1A1D26] p-3 rounded-2xl border border-slate-200 dark:border-zinc-800">
            {/* Period buttons */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              {[
                { id: "this-month", label: "This Month" },
                { id: "last-month", label: "Last Month" },
                { id: "this-quarter", label: "This Quarter" },
                { id: "today", label: "Today" },
                { id: "all", label: "All Time" },
                { id: "custom", label: "Custom Dates" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setPeriod(btn.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    period === btn.id
                      ? "bg-[#FF5B00] text-white shadow-xs"
                      : "text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-400">Orders:</span>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "delivered" ? "all" : "delivered")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  statusFilter === "delivered"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-200 dark:bg-zinc-800 border-transparent text-slate-700 dark:text-zinc-300"
                }`}
              >
                {statusFilter === "delivered" ? "Delivered Only (Realized)" : "All Placed Orders"}
              </button>
            </div>
          </div>

          {/* Custom Date Inputs */}
          {period === "custom" && (
            <div className="flex items-center space-x-3 p-3 bg-slate-100 dark:bg-zinc-900 rounded-xl">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
            </div>
          )}

          {/* KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1A1D26] shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Gross Sales Invoiced</span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                ₹{report.totalGross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                {report.orderCount} orders
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1A1D26] shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Net Taxable Turnover</span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                ₹{report.totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                Base supply value
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1A1D26] shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Central Tax (CGST)</span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                ₹{report.totalCgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                50% intra-state split
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1A1D26] shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 block">State Tax (SGST / UTGST)</span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                ₹{report.totalSgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                Jammu & Kashmir (01)
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-orange-500/20 bg-orange-500/10 shadow-xs col-span-2 lg:col-span-1">
              <span className="text-[10px] font-black uppercase text-[#FF5B00] block">Total Output GST</span>
              <span className="text-xl font-black font-mono text-[#FF5B00] mt-1 block">
                ₹{report.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold">
                Tax liability collected
              </span>
            </div>
          </div>

          {/* Tabs: Slabs Summary vs Invoices Register */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("slabs")}
                className={`text-xs font-black pb-1.5 px-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === "slabs"
                    ? "border-[#FF5B00] text-[#FF5B00]"
                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white"
                }`}
              >
                GST Slabs Breakdown (GSTR-1 Table 7)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("invoices")}
                className={`text-xs font-black pb-1.5 px-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === "invoices"
                    ? "border-[#FF5B00] text-[#FF5B00]"
                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white"
                }`}
              >
                Sales Invoices Register ({report.orders.length})
              </button>
            </div>

            {/* TAB 1: Slabs Breakdown */}
            {activeTab === "slabs" && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-3 px-4">Rate Slab</th>
                      <th className="py-3 px-4">Category Schedule</th>
                      <th className="py-3 px-4 text-right">Taxable Turnover (₹)</th>
                      <th className="py-3 px-4 text-right">Central Tax CGST (₹)</th>
                      <th className="py-3 px-4 text-right">State Tax SGST (₹)</th>
                      <th className="py-3 px-4 text-right">Total GST (₹)</th>
                      <th className="py-3 px-4 text-right">Gross Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-mono">
                    {[0, 5, 12, 18].map((rate) => {
                      const s = report.slabs[rate];
                      return (
                        <tr key={rate} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                          <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                            {rate}%
                          </td>
                          <td className="py-3 px-4 font-sans font-medium text-slate-500 dark:text-zinc-400 text-[11px]">
                            {s.label}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                            {s.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-zinc-300">
                            {s.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-zinc-300">
                            {s.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-[#FF5B00]">
                            {s.tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                            {s.gross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="bg-slate-50 dark:bg-zinc-800 font-black border-t-2 border-slate-200 dark:border-zinc-700">
                      <td colSpan={2} className="py-3 px-4 font-sans uppercase text-[11px]">
                        Total Summary
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 dark:text-white">
                        {report.totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 dark:text-white">
                        {report.totalCgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 dark:text-white">
                        {report.totalSgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-[#FF5B00]">
                        {report.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 dark:text-white">
                        {report.totalGross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Invoices Register */}
            {activeTab === "invoices" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="relative max-w-xs w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Invoice #, Order ID or Customer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    Showing {displayedInvoices.length} invoices
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-wider">
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                        <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total Bill (₹)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-mono text-[11px]">
                      {displayedInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 text-xs font-sans">
                            No invoices match your filter.
                          </td>
                        </tr>
                      ) : (
                        displayedInvoices.map((inv) => (
                          <tr key={inv.orderId} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-2 px-3 text-slate-500 dark:text-zinc-400">
                              {inv.date}
                            </td>
                            <td className="py-2 px-3 font-sans font-medium text-slate-800 dark:text-zinc-200">
                              {inv.customerName}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {inv.totalTaxable.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 dark:text-zinc-400">
                              {inv.totalCgst.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 dark:text-zinc-400">
                              {inv.totalSgst.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-white">
                              {inv.grandTotal.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-center font-sans">
                              <span className="text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-sans">
                              <button
                                type="button"
                                onClick={() => {
                                  const rawOrd = orders.find((o) => (o.orderId || o.id) === inv.orderId);
                                  setPrintingOrder(rawOrd || inv);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#FF5B00]/10 text-[#FF5B00] hover:bg-[#FF5B00]/20 transition-colors cursor-pointer"
                              >
                                Print Tax Bill
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Statement Modal */}
      {printingStatement && (
        <PrintGstTaxInvoice
          mode="statement"
          aggregatedReport={report}
          businessInfo={businessForm}
          onClose={() => setPrintingStatement(false)}
        />
      )}

      {/* Printable Individual Order Invoice Modal */}
      {printingOrder && (
        <PrintGstTaxInvoice
          mode="order"
          order={printingOrder}
          businessInfo={businessForm}
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </div>
  );
}
