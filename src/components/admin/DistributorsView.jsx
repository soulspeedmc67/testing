import React, { useState, useMemo } from "react";
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Clock,
  FileText,
  Boxes,
  IndianRupee,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Building2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DistributorsView({
  distributors = [],
  catalogue = [],
  onUpsertDistributor,
  onDeleteDistributor,
  onViewDistributorStock,
  darkMode = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDistributor, setEditingDistributor] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    leadTime: "Same Day",
    notes: "",
  });

  // Calculate distributor-level metrics from current catalogue
  const distributorStats = useMemo(() => {
    const statsMap = {};

    distributors.forEach((d) => {
      statsMap[d.name] = {
        productCount: 0,
        totalUnits: 0,
        totalValue: 0,
        lowStockCount: 0,
      };
    });

    catalogue.forEach((p) => {
      const distName = p.distributor || "Unassigned";
      if (!statsMap[distName]) {
        statsMap[distName] = {
          productCount: 0,
          totalUnits: 0,
          totalValue: 0,
          lowStockCount: 0,
        };
      }

      const stock = Number(p.stock) || 0;
      const price = Number(p.price) || 0;

      statsMap[distName].productCount += 1;
      statsMap[distName].totalUnits += stock;
      statsMap[distName].totalValue += stock * price;
      if (stock > 0 && stock <= 10) {
        statsMap[distName].lowStockCount += 1;
      }
    });

    return statsMap;
  }, [distributors, catalogue]);

  // Overall Global Summary
  const globalSummary = useMemo(() => {
    let totalStockUnits = 0;
    let totalValuation = 0;
    let totalLowStock = 0;

    catalogue.forEach((p) => {
      const stock = Number(p.stock) || 0;
      const price = Number(p.price) || 0;
      totalStockUnits += stock;
      totalValuation += stock * price;
      if (stock > 0 && stock <= 10) totalLowStock += 1;
    });

    return {
      distributorCount: distributors.length,
      totalStockUnits,
      totalValuation,
      totalLowStock,
    };
  }, [distributors, catalogue]);

  // Filtered Distributors
  const filteredDistributors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return distributors;
    return distributors.filter((d) => {
      const name = String(d.name || "").toLowerCase();
      const contact = String(d.contactPerson || "").toLowerCase();
      const phone = String(d.phone || "").toLowerCase();
      const address = String(d.address || "").toLowerCase();
      const notes = String(d.notes || "").toLowerCase();
      return name.includes(q) || contact.includes(q) || phone.includes(q) || address.includes(q) || notes.includes(q);
    });
  }, [distributors, searchQuery]);

  const openAddModal = () => {
    setEditingDistributor(null);
    setForm({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      leadTime: "Same Day",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (d) => {
    setEditingDistributor(d);
    setForm({
      name: d.name || "",
      contactPerson: d.contactPerson || "",
      phone: d.phone || "",
      email: d.email || "",
      address: d.address || "",
      leadTime: d.leadTime || "Same Day",
      notes: d.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        id: editingDistributor ? editingDistributor.id : undefined,
      };
      await onUpsertDistributor(payload);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save distributor:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await onDeleteDistributor(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete distributor:", err);
    }
  };

  const cardCls = darkMode
    ? "bg-[#14161E] border-zinc-800 text-white"
    : "bg-white border-slate-200 text-slate-900 shadow-xs";

  const subtextCls = darkMode ? "text-zinc-400" : "text-slate-500";
  const inputCls = `w-full text-xs font-bold px-3 py-2.5 rounded-xl border outline-none transition-all ${
    darkMode
      ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500 focus:border-[#FF5B00]"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#FF5B00]"
  }`;

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Action Bar */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-colors ${cardCls}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-[#FF5B00]" />
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Distributors & Suppliers Hub
              </h2>
            </div>
            <p className={`text-xs ${subtextCls}`}>
              Manage who supplies your dark store inventory. Track stock holdings and valuations per supplier so you always know whose stock is in the warehouse.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center space-x-2 bg-[#FF5B00] hover:bg-[#E04E00] text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Distributor</span>
          </button>
        </div>
      </div>

      {/* 2. Global Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-4 rounded-2xl border transition-colors ${cardCls}`}>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-400 block">
            Active Distributors
          </span>
          <span className="text-2xl font-black mt-1 block">
            {globalSummary.distributorCount}
          </span>
          <p className={`text-[10.5px] font-medium mt-0.5 ${subtextCls}`}>Registered suppliers</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${cardCls}`}>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-blue-500 block">
            Total Stock Units
          </span>
          <span className="text-2xl font-black text-blue-500 mt-1 block">
            {globalSummary.totalStockUnits.toLocaleString()}
          </span>
          <p className={`text-[10.5px] font-medium mt-0.5 ${subtextCls}`}>Units in warehouse</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${cardCls}`}>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-500 block">
            Inventory Valuation
          </span>
          <span className="text-2xl font-black text-emerald-500 mt-1 block">
            ₹{globalSummary.totalValuation.toLocaleString()}
          </span>
          <p className={`text-[10.5px] font-medium mt-0.5 ${subtextCls}`}>Total retail value</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${cardCls}`}>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-500 block">
            Low Stock Alerts
          </span>
          <span className="text-2xl font-black text-amber-500 mt-1 block">
            {globalSummary.totalLowStock}
          </span>
          <p className={`text-[10.5px] font-medium mt-0.5 ${subtextCls}`}>Items need reordering</p>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${cardCls}`}>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, contact person, phone, or location..."
            className={`w-full text-xs pl-9 pr-3 py-2 rounded-xl border outline-none font-medium ${
              darkMode
                ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
            }`}
          />
        </div>
        <span className={`text-xs font-bold ${subtextCls}`}>
          Showing {filteredDistributors.length} of {distributors.length}
        </span>
      </div>

      {/* 4. Distributors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredDistributors.length === 0 ? (
          <div className={`col-span-full p-12 text-center rounded-2xl border ${cardCls}`}>
            <Truck className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="font-bold text-sm">No distributors found</p>
            <p className={`text-xs mt-1 ${subtextCls}`}>
              Try another search term or click "+ Add New Distributor" above.
            </p>
          </div>
        ) : (
          filteredDistributors.map((d) => {
            const stats = distributorStats[d.name] || {
              productCount: 0,
              totalUnits: 0,
              totalValue: 0,
              lowStockCount: 0,
            };

            return (
              <motion.div
                key={d.id || d.name}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3.5 transition-all hover:border-[#FF5B00]/40 ${cardCls}`}
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <Building2 className="w-4 h-4 text-[#FF5B00] shrink-0" />
                        <h3 className="font-black text-sm truncate" title={d.name}>
                          {d.name}
                        </h3>
                      </div>
                      {d.contactPerson && (
                        <p className={`text-[11px] font-semibold mt-0.5 ${subtextCls}`}>
                          Contact: <span className="font-bold text-slate-800 dark:text-zinc-200">{d.contactPerson}</span>
                        </p>
                      )}
                    </div>

                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700 shrink-0">
                      {d.leadTime || "Same Day"}
                    </span>
                  </div>

                  {/* Contact Info Pills */}
                  <div className="mt-2.5 space-y-1">
                    {d.phone && (
                      <a
                        href={`tel:${d.phone.replace(/\s+/g, "")}`}
                        className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-[#FF5B00] hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{d.phone}</span>
                      </a>
                    )}
                    {d.address && (
                      <p className={`text-[11px] font-medium flex items-center space-x-1 truncate ${subtextCls}`}>
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{d.address}</span>
                      </p>
                    )}
                    {d.notes && (
                      <p className={`text-[10.5px] italic mt-1 line-clamp-2 ${subtextCls}`}>
                        "{d.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Stock & Valuation Metrics Grid */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-[#1A1D26] p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                    <div>
                      <span className="text-[9.5px] font-black uppercase text-slate-400 dark:text-zinc-400 block">
                        SKUs
                      </span>
                      <span className="text-xs font-black block mt-0.5">
                        {stats.productCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-black uppercase text-slate-400 dark:text-zinc-400 block">
                        Stock
                      </span>
                      <span className="text-xs font-black block mt-0.5 text-blue-500">
                        {stats.totalUnits}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-black uppercase text-slate-400 dark:text-zinc-400 block">
                        Value
                      </span>
                      <span className="text-xs font-black block mt-0.5 text-emerald-500">
                        ₹{stats.totalValue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {stats.lowStockCount > 0 && (
                    <div className="mt-2 flex items-center justify-between px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10.5px] font-black">
                      <span className="inline-flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{stats.lowStockCount} items running low</span>
                      </span>
                      <span className="underline cursor-pointer" onClick={() => onViewDistributorStock(d.name)}>
                        Reorder
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => onViewDistributorStock(d.name)}
                    className="inline-flex items-center space-x-1 text-xs font-black text-[#FF5B00] hover:text-[#E04E00] cursor-pointer"
                  >
                    <span>View Stock ({stats.totalUnits})</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(d)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
                      title="Edit distributor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(d.id)}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors cursor-pointer"
                      title="Delete distributor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation In-Card */}
                {deleteConfirmId === d.id && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                      Delete "{d.name}"? Products assigned to it will become unassigned.
                    </p>
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-zinc-300 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id)}
                        className="px-2.5 py-1 text-[11px] font-black text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shadow-xs"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* 5. Add / Edit Distributor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl relative ${cardCls}`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center space-x-2">
                  <Truck className="w-5 h-5 text-[#FF5B00]" />
                  <h3 className="font-black text-base">
                    {editingDistributor ? "Edit Distributor" : "Add New Distributor"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-3.5">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                    Company / Distributor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Kashmir Wholesale FMCG"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={form.contactPerson}
                      onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))}
                      placeholder="e.g. Bashir Ahmad"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="e.g. +91 94190 12345"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="supplier@dashit.store"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                      Delivery Lead Time
                    </label>
                    <select
                      value={form.leadTime}
                      onChange={(e) => setForm((p) => ({ ...p, leadTime: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="Same Day">Same Day</option>
                      <option value="Daily 6:30 AM">Daily 6:30 AM</option>
                      <option value="Twice Daily">Twice Daily</option>
                      <option value="Next Day">Next Day</option>
                      <option value="2 Days">2 Days</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                    Warehouse / Mandi Address
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="e.g. KP Road, Near Bus Stand, Anantnag"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                    Supplier Notes / Schedule
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="e.g. Delivers fresh milk daily before 7 AM. Credit period: 7 days."
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isSaving ? "Saving..." : editingDistributor ? "Update Distributor" : "Save Distributor"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
