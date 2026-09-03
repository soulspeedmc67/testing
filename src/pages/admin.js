import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Power,
  Package,
  Truck,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Tag,
  Clock,
  IndianRupee,
  Users,
  Search,
  Barcode,
  Sparkles,
  Check,
  Trash2,
  Plus,
  Layers,
  ShoppingBag
} from "lucide-react";

import { fetchAdminOrders, updateAdminOrderStatus } from "../lib/api";

const FMCG_PRESETS = [
  { label: "Lay's Magic Masala", query: "lays magic masala", cat: "Chips" },
  { label: "Parle-G Biscuits", query: "parle-g", cat: "Biscuits" },
  { label: "Maggi 2-Min Noodles", query: "maggi 2-minute noodles", cat: "Instant Food" },
  { label: "Amul Butter", query: "amul butter", cat: "Dairy" },
  { label: "Tata Salt Iodized", query: "tata salt", cat: "Spices" },
  { label: "Haldiram's Bhujia", query: "haldiram bhujia", cat: "Snacks" },
  { label: "Frooti Mango Drink", query: "frooti", cat: "Beverages" },
  { label: "Dettol Soap", query: "dettol soap", cat: "Personal Care" },
  { label: "Surf Excel Detergent", query: "surf excel", cat: "Household Items" },
  { label: "India Gate Basmati", query: "india gate basmati rice", cat: "Staples" }
];

const CATEGORIES = [
  "All",
  "Chips",
  "Biscuits",
  "Snacks",
  "Beverages",
  "Dairy",
  "Instant Food",
  "Staples",
  "Spices",
  "Personal Care",
  "Household Items",
  "Fruits",
  "Vegetables",
  "Bakery"
];

export default function EasyAdminDashboard() {
  const [activeTab, setActiveTab] = useState("orders"); // "orders" | "importer" | "catalogue"
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [codBlacklist, setCodBlacklist] = useState(["9876543210"]);
  const [newBlacklistNumber, setNewBlacklistNumber] = useState("");

  // Open Food Facts Importer States
  const [offSearchQuery, setOffSearchQuery] = useState("");
  const [isSearchingOff, setIsSearchingOff] = useState(false);
  const [offResults, setOffResults] = useState([]);
  const [importedBarcodes, setImportedBarcodes] = useState({});

  // App Catalogue State
  const [catalogue, setCatalogue] = useState([]);
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState(false);
  const [catalogueFilter, setCatalogueFilter] = useState("All");

  const loadOrders = async () => {
    const res = await fetchAdminOrders();
    if (res.success && res.orders && res.orders.length > 0) {
      setOrders(res.orders);
      return;
    }

    const history = localStorage.getItem("dashit_orders_history");
    const active = localStorage.getItem("dashit_active_order");
    let combined = [];
    if (active) {
      try { combined.push(JSON.parse(active)); } catch (e) {}
    }
    if (history) {
      try {
        const hist = JSON.parse(history);
        combined = [...combined, ...hist];
      } catch (e) {}
    }
    setOrders(combined);
  };

  const loadCatalogue = async () => {
    setIsLoadingCatalogue(true);
    try {
      const res = await fetch("http://localhost:5001/api/products");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCatalogue(data.products || []);
        }
      }
    } catch (e) {
      console.warn("Could not load catalogue from backend:", e);
    }
    setIsLoadingCatalogue(false);
  };

  useEffect(() => {
    loadOrders();
    loadCatalogue();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    const updated = orders.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o));
    setOrders(updated);

    await updateAdminOrderStatus(orderId, newStatus);

    const targetOrder = updated.find((o) => o.orderId === orderId);
    if (targetOrder) {
      localStorage.setItem("dashit_active_order", JSON.stringify(targetOrder));
    }
    alert(`Order #${orderId} status updated to: ${newStatus}`);
  };

  // Open Food Facts Search Handler (Query or Barcode)
  const handleSearchOff = async (customTerm = null) => {
    const term = (customTerm !== null ? customTerm : offSearchQuery).trim();
    if (!term) return;

    setIsSearchingOff(true);
    try {
      const isBarcode = /^\d{8,14}$/.test(term);
      const url = isBarcode
        ? `http://localhost:5001/api/admin/products/search-off?barcode=${term}`
        : `http://localhost:5001/api/admin/products/search-off?q=${encodeURIComponent(term)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.products) {
        setOffResults(data.products);
      } else {
        alert(data.message || "No Indian FMCG products found for this term.");
        setOffResults([]);
      }
    } catch (err) {
      alert("Search error: " + err.message);
    }
    setIsSearchingOff(false);
  };

  // Import Product to App Catalogue
  const handleImportProduct = async (prod, index) => {
    try {
      const res = await fetch("http://localhost:5001/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: prod })
      });
      const data = await res.json();
      if (data.success) {
        setImportedBarcodes((prev) => ({ ...prev, [prod.barcode]: true }));
        loadCatalogue();
      } else {
        alert("Import failed: " + data.message);
      }
    } catch (err) {
      alert("Error importing product: " + err.message);
    }
  };

  // Delete Product from Catalogue
  const handleDeleteProduct = async (id) => {
    if (!confirm("Are you sure you want to remove this product from the storefront?")) return;
    try {
      const res = await fetch(`http://localhost:5001/api/admin/products/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setCatalogue((prev) => prev.filter((p) => p.id !== id && p.barcode !== id));
      }
    } catch (err) {
      alert("Error deleting product: " + err.message);
    }
  };

  const handleAddBlacklist = (e) => {
    e.preventDefault();
    if (newBlacklistNumber.length === 10) {
      setCodBlacklist([...codBlacklist, newBlacklistNumber]);
      setNewBlacklistNumber("");
      alert(`Mobile number ${newBlacklistNumber} added to COD Blacklist!`);
    }
  };

  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const filteredCatalogue = catalogue.filter((p) => {
    if (catalogueFilter === "All") return true;
    return (p.cat || "").toLowerCase() === catalogueFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-3 sm:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <Link href="/" className="p-2 bg-slate-100 rounded-2xl text-slate-700 hover:bg-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-black text-lg text-slate-900 tracking-tight">DASHit Fulfilment Admin Desk</h1>
              <p className="text-xs text-slate-500 font-medium">Anantnag Store #01 Manager</p>
            </div>
          </div>

          {/* Master Store Power Switch */}
          <button
            onClick={() => setIsStoreOpen(!isStoreOpen)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-black text-xs shadow-md transition-all ${
              isStoreOpen ? "bg-[#0c831f] text-white" : "bg-rose-600 text-white"
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isStoreOpen ? "STORE OPEN" : "STORE CLOSED"}</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "orders" ? "bg-[#0c831f] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Orders Dispatch ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("importer")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "importer" ? "bg-[#0c831f] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Food Facts Importer</span>
          </button>

          <button
            onClick={() => setActiveTab("catalogue")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "catalogue" ? "bg-[#0c831f] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Live Store Catalogue ({catalogue.length})</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ORDERS DISPATCH                                   */}
        {/* ======================================================== */}
        {activeTab === "orders" && (
          <div className="space-y-5">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase">Today's Orders</span>
                <div className="text-2xl font-black text-slate-900 font-mono">{orders.length}</div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase">Total Revenue</span>
                <div className="text-2xl font-black text-[#0c831f] font-mono">₹{totalRevenue}</div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase">Riders Online</span>
                <div className="text-2xl font-black text-sky-700 font-mono">4 Riders</div>
              </div>
            </div>

            {/* Live Order Queue */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="font-black text-sm text-slate-900 tracking-tight flex items-center space-x-2">
                  <Package className="w-4 h-4 text-[#0c831f]" />
                  <span>Live Order Dispatch Desk</span>
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-full">
                  AUTO-SYNCED
                </span>
              </div>

              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-semibold text-xs">
                    No active orders at this moment.
                  </div>
                ) : (
                  orders.map((ord) => (
                    <div key={ord.orderId} className="bg-slate-50 border border-slate-200 rounded-3xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-sm text-slate-900">{ord.orderId}</span>
                            <span className="bg-amber-200 text-amber-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono">
                              OTP: {ord.otp}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">
                            Customer: <b className="text-slate-900">{ord.customerName || "Azan Iqbal Mir"}</b> ({ord.mobile || "9622720283"})
                          </p>
                          <p className="text-[11px] text-slate-500">{ord.address || "Nai Basti, Anantnag"}</p>
                        </div>

                        <span className={`text-xs font-black px-3 py-1 rounded-full ${
                          ord.status === "Delivered" ? "bg-emerald-100 text-emerald-800" :
                          ord.status === "Out for Delivery" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {ord.status}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="bg-white rounded-2xl p-3 border border-slate-200 space-y-1">
                        {ord.items && ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs font-semibold text-slate-700">
                            <span>{it.name} x {it.qty}</span>
                            <span className="font-mono">₹{it.price * it.qty}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-slate-100 flex justify-between font-black text-xs text-slate-900">
                          <span>Total Amount ({ord.paymentMethod})</span>
                          <span className="text-[#0c831f] font-mono">₹{ord.totalAmount}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => updateOrderStatus(ord.orderId, "Packing")}
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                            ord.status === "Packing" ? "bg-amber-500 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-700"
                          }`}
                        >
                          Packing
                        </button>
                        <button
                          onClick={() => updateOrderStatus(ord.orderId, "Out for Delivery")}
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                            ord.status === "Out for Delivery" ? "bg-sky-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-700"
                          }`}
                        >
                          Dispatched
                        </button>
                        <button
                          onClick={() => updateOrderStatus(ord.orderId, "Delivered")}
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                            ord.status === "Delivered" ? "bg-[#0c831f] text-white shadow-sm" : "bg-white border border-slate-200 text-slate-700"
                          }`}
                        >
                          Delivered
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* COD Blacklist */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-black text-xs text-slate-900 flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>COD Blacklist Manager</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Prevent fake COD orders by blocking habitual fake customer numbers.</p>

                <form onSubmit={handleAddBlacklist} className="flex space-x-2">
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Mobile number..."
                    value={newBlacklistNumber}
                    onChange={(e) => setNewBlacklistNumber(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 text-xs font-bold text-slate-900 grow focus:outline-none focus:border-rose-500"
                  />
                  <button type="submit" className="bg-rose-600 text-white font-extrabold text-xs px-3 py-2 rounded-2xl hover:bg-rose-700">
                    Block
                  </button>
                </form>
              </div>

              {/* Promo Coupon */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-black text-xs text-slate-900 flex items-center space-x-1.5">
                  <Tag className="w-4 h-4 text-[#0c831f]" />
                  <span>Promo Coupon Manager</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Active campaigns running in customer app:</p>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs space-y-1">
                  <span className="font-black text-emerald-900">GET30 · DASHIT50 · FREEDEL</span>
                  <p className="text-[11px] text-emerald-700 font-medium">Discounts automatically validated at checkout.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: OPEN FOOD FACTS IMPORTER                          */}
        {/* ======================================================== */}
        {activeTab === "importer" && (
          <div className="space-y-5">
            {/* Search & Barcode Hub */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h2 className="font-black text-sm text-slate-900 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#0c831f]" />
                  <span>Open Food Facts Indian FMCG Product Pipeline</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Import authentic Indian FMCG products directly by barcode or brand name with highest-res front imagery.
                </p>
              </div>

              {/* Search Bar */}
              <div className="flex space-x-2">
                <div className="relative grow">
                  <input
                    type="text"
                    placeholder="Enter Indian Product Name (e.g. Parle-G, Maggi, Amul) or Barcode (e.g. 8901491101837)..."
                    value={offSearchQuery}
                    onChange={(e) => setOffSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchOff()}
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0c831f]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <button
                  onClick={() => handleSearchOff()}
                  disabled={isSearchingOff}
                  className="bg-[#0c831f] hover:bg-emerald-800 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center space-x-1.5 shrink-0"
                >
                  {isSearchingOff ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Search India FMCG</span>
                </button>
              </div>

              {/* 1-Click FMCG Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  1-Click Popular Indian Brand Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {FMCG_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setOffSearchQuery(p.query);
                        handleSearchOff(p.query);
                      }}
                      className="bg-slate-100 hover:bg-emerald-50 hover:text-[#0c831f] text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-xl transition-colors border border-slate-200/80"
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Header & Category Filter */}
            {offResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xs text-slate-900">
                    Found {offResults.length} Indian FMCG Items in Open Food Facts
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Images loaded directly via Open Food Facts CDN (Zero app bloat)
                  </span>
                </div>

                {/* Grid of Results */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {offResults.map((item, idx) => {
                    const isImported = importedBarcodes[item.barcode];

                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-3xl p-3.5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 transition-all hover:border-[#0c831f]"
                      >
                        {/* Image Preview & Badges */}
                        <div className="space-y-2">
                          <div className="relative w-full h-36 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center p-2 border border-slate-100">
                            <img
                              src={item.img}
                              alt={item.name}
                              className="max-h-full max-w-full object-contain rounded-lg"
                              loading="lazy"
                            />
                            <span className="absolute top-2 left-2 bg-[#0c831f] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {item.cat}
                            </span>
                            <span className="absolute bottom-2 right-2 bg-black/65 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                              {item.barcode}
                            </span>
                          </div>

                          {/* Info */}
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                              {item.brand}
                            </span>
                            <h4 className="font-black text-xs text-slate-900 line-clamp-2 leading-snug">
                              {item.name}
                            </h4>
                            <span className="text-[11px] text-slate-500 font-medium">{item.unit}</span>
                          </div>
                        </div>

                        {/* Price & Import CTA */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-extrabold text-slate-400">₹</span>
                            <input
                              type="number"
                              defaultValue={item.price}
                              onChange={(e) => { item.price = Number(e.target.value); }}
                              className="w-14 bg-slate-100 font-black text-xs px-2 py-1 rounded-lg text-slate-900 border border-slate-200"
                            />
                          </div>

                          <button
                            onClick={() => handleImportProduct(item, idx)}
                            disabled={isImported}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1 ${
                              isImported
                                ? "bg-emerald-100 text-[#0c831f] cursor-default"
                                : "bg-[#0c831f] text-white hover:bg-emerald-800 active:scale-95 shadow-xs"
                            }`}
                          >
                            {isImported ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Imported!</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Import to Store</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: LIVE STORE CATALOGUE                              */}
        {/* ======================================================== */}
        {activeTab === "catalogue" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-sm text-slate-900 flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-[#0c831f]" />
                  <span>Active Storefront Catalogue ({catalogue.length} Products)</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Products currently available to customers in Anantnag.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={catalogueFilter}
                  onChange={(e) => setCatalogueFilter(e.target.value)}
                  className="bg-slate-100 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadCatalogue}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingCatalogue ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Product Table / Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredCatalogue.map((prod) => (
                <div
                  key={prod.id || prod.barcode}
                  className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex space-x-3">
                    <img
                      src={prod.img}
                      alt={prod.name}
                      className="w-16 h-16 object-contain rounded-xl bg-slate-50 p-1 border border-slate-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                        {prod.brand || prod.cat}
                      </span>
                      <h4 className="font-black text-xs text-slate-900 truncate">{prod.name}</h4>
                      <p className="text-[11px] text-slate-500 font-semibold">{prod.unit}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs font-black text-[#0c831f] font-mono">₹{prod.price}</span>
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {prod.cat}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                      {prod.barcode || prod.id}
                    </span>
                    <button
                      onClick={() => handleDeleteProduct(prod.id || prod.barcode)}
                      className="text-rose-600 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
