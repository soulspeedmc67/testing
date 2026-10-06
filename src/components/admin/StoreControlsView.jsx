import React, { useState, useEffect } from "react";
import {
  Store,
  Power,
  ShieldAlert,
  Volume2,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Boxes,
  CloudRain,
  Snowflake,
  Zap,
  Wrench,
  Edit3,
  X,
  Trash2,
  RotateCcw,
  Check,
  Loader2,
  PackageX,
  Sparkles,
} from "lucide-react";
import DeliveryChargeSettings from "./DeliveryChargeSettings";
import ShopRulesSettings from "./ShopRulesSettings";

export default function StoreControlsView({
  isStoreOpen = true,
  currentCloseReason = "",
  onToggleStoreClick,
  codBlacklist = [],
  onAddBlacklist,
  onRemoveBlacklist,
  soundEnabled = true,
  onToggleSound,
  onTestChime,
  weatherAlert = null,
  onSaveWeatherAlert,
  storeConfig = null,
  onSaveDeliverySettings,
  onClearAllOrders,
  onResetAllStock,
  onDeleteAllProducts,
  onWipeStore,
  darkMode = false,
}) {
  const [newBlacklistNumber, setNewBlacklistNumber] = useState("");

  // Weather & Surge Alert State
  const [alertActive, setAlertActive] = useState(false);
  const [alertType, setAlertType] = useState("rain");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [isSavingAlert, setIsSavingAlert] = useState(false);

  // Danger Zone Modals State
  const [confirmClearOrders, setConfirmClearOrders] = useState(false);
  const [isClearingOrders, setIsClearingOrders] = useState(false);
  const [confirmResetStock, setConfirmResetStock] = useState(false);
  const [isResettingStock, setIsResettingStock] = useState(false);
  const [confirmDeleteProducts, setConfirmDeleteProducts] = useState(false);
  const [isDeletingProducts, setIsDeletingProducts] = useState(false);
  const [confirmWipeStore, setConfirmWipeStore] = useState(false);
  const [isWipingStore, setIsWipingStore] = useState(false);

  useEffect(() => {
    if (weatherAlert) {
      setAlertActive(Boolean(weatherAlert.active));
      setAlertType(weatherAlert.type || "rain");
      setAlertTitle(weatherAlert.title || "");
      setAlertMessage(weatherAlert.message || "");
    }
  }, [weatherAlert]);

  const handleSaveAlert = async (e) => {
    e?.preventDefault();
    if (!onSaveWeatherAlert) return;
    setIsSavingAlert(true);
    try {
      await onSaveWeatherAlert({
        active: alertActive,
        type: alertType,
        title: alertTitle.trim(),
        message: alertMessage.trim(),
      });
    } finally {
      setIsSavingAlert(false);
    }
  };

  const handleClearOrdersExecute = async () => {
    if (!onClearAllOrders) return;
    setIsClearingOrders(true);
    try {
      await onClearAllOrders();
      setConfirmClearOrders(false);
    } finally {
      setIsClearingOrders(false);
    }
  };

  const handleResetStockExecute = async () => {
    if (!onResetAllStock) return;
    setIsResettingStock(true);
    try {
      await onResetAllStock();
      setConfirmResetStock(false);
    } finally {
      setIsResettingStock(false);
    }
  };

  const handleDeleteProductsExecute = async () => {
    if (!onDeleteAllProducts) return;
    setIsDeletingProducts(true);
    try {
      await onDeleteAllProducts();
      setConfirmDeleteProducts(false);
    } finally {
      setIsDeletingProducts(false);
    }
  };

  const handleWipeStoreExecute = async () => {
    if (!onWipeStore) return;
    setIsWipingStore(true);
    try {
      await onWipeStore();
      setConfirmWipeStore(false);
    } finally {
      setIsWipingStore(false);
    }
  };

  const handleBlacklistSubmit = (e) => {
    e.preventDefault();
    const clean = newBlacklistNumber.replace(/\D/g, "");
    if (clean.length === 10) {
      onAddBlacklist(clean);
      setNewBlacklistNumber("");
    } else {
      alert("Please enter a valid 10-digit Indian mobile number.");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
      {/* 1. Store Operations Card */}
      <div
        className={`rounded-2xl border p-5 space-y-4 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center space-x-2">
          <Store className="w-5 h-5 text-[#FF5B00]" />
          <h3 className="font-black text-sm text-slate-900 dark:text-white">
            Store Operations
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Control live customer order acceptance for the Anantnag hub. When paused, customers see a store-closed notice with reopening estimates.
        </p>

        {/* Neutral panel: the state is carried by one dot and a sentence, and the
            button says what it will do rather than restating the state. */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isStoreOpen ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                {isStoreOpen ? "Store is open" : "Store is closed"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 pl-4">
              {isStoreOpen
                ? "Customers can place orders right now."
                : `Customers see: "${currentCloseReason || 'Reopening shortly'}"`}
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleStoreClick}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              isStoreOpen
                ? "border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800"
                : "bg-[#FF5B00] hover:bg-[#E04E00] text-white"
            }`}
          >
            {isStoreOpen ? "Close store" : "Open store"}
          </button>
        </div>
      </div>

      {/* 2. Audio Chime & Notifications Alert */}
      <div
        className={`rounded-2xl border p-5 space-y-4 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-amber-500" />
          <h3 className="font-black text-sm text-slate-900 dark:text-white">
            Audio Chime & Live Order Alerts
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          A sound plays the moment a new order arrives, so pickers hear it straight away.
        </p>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/50 bg-slate-50 dark:bg-zinc-800/40">
          <div>
            <span className="font-black text-xs text-slate-900 dark:text-white block">
              Audio Chime Status: {soundEnabled ? "Active & Sounding" : "Muted"}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Web Audio synthesizer chiming upon order placed
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onToggleSound}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                soundEnabled
                  ? "bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-100"
                  : "bg-amber-500/20 text-amber-500 border-amber-500/30"
              }`}
            >
              {soundEnabled ? "Mute Chime" : "Unmute Chime"}
            </button>
            <button
              type="button"
              onClick={onTestChime}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
            >
              Test Chime
            </button>
          </div>
        </div>
      </div>

      {/* Cash on delivery, the minimum order and the fees: every shop app follows them live */}
      <ShopRulesSettings storeConfig={storeConfig} onSave={onSaveDeliverySettings} darkMode={darkMode} />

      {/* Night delivery charge and the rider's petrol figures */}
      <DeliveryChargeSettings storeConfig={storeConfig} onSave={onSaveDeliverySettings} darkMode={darkMode} />

      {/* 3. COD Fraud Prevention Blacklist */}
      <div
        className={`md:col-span-2 rounded-2xl border p-5 space-y-4 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <h3 className="font-black text-sm text-slate-900 dark:text-white">
            COD Fraud Prevention Blacklist
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Prevent bogus orders or habitual COD delivery refusals. Customers with these phone numbers cannot choose Cash on Delivery at checkout.
        </p>

        <form onSubmit={handleBlacklistSubmit} className="flex items-center space-x-2 max-w-md">
          <input
            type="tel"
            maxLength={10}
            placeholder="10-digit customer mobile number"
            value={newBlacklistNumber}
            onChange={(e) => setNewBlacklistNumber(e.target.value.replace(/\D/g, ""))}
            className={`flex-1 text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
              darkMode
                ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-rose-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-500"
            }`}
          />
          <button
            type="submit"
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Block Phone
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-1">
          {codBlacklist.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No numbers blacklisted</span>
          ) : (
            codBlacklist.map((num) => (
              <span
                key={num}
                className="inline-flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono font-bold px-3 py-1 rounded-xl"
              >
                <span>+91 {num}</span>
                <button
                  type="button"
                  onClick={() => onRemoveBlacklist(num)}
                  className="text-rose-400 hover:text-rose-600 font-black cursor-pointer"
                  title="Remove from blacklist"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* 4. Weather & Surge Delivery Alert */}
      <div
        className={`md:col-span-2 rounded-2xl border p-5 space-y-4 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CloudRain className="w-5 h-5 text-sky-500" />
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Weather & Demand Surge Delivery Notice
            </h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={alertActive}
              onChange={(e) => setAlertActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-[#FF5B00]"></div>
            <span className="ml-2.5 text-xs font-bold text-slate-700 dark:text-zinc-300">
              {alertActive ? "Notice Active" : "Notice Paused"}
            </span>
          </label>
        </div>

        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Broadcast a real-time banner across the shop when adverse Kashmiri weather (heavy snow/rain) or peak surge creates delivery delays.
        </p>

        {alertActive && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-zinc-400 self-center mr-1">Condition:</span>
              {[
                { type: "rain", label: "🌧️ Rain Alert", defaultTitle: "Rain Advisory in Anantnag 🌧️", defaultMsg: "Deliveries may take 10-15 mins longer. Riders are driving safely!" },
                { type: "snow", label: "❄️ Snow Alert", defaultTitle: "Snow Advisory · Anantnag ❄️", defaultMsg: "Heavy snowfall in Anantnag. Extra buffer added to ensure rider safety on the road." },
                { type: "surge", label: "⚡ High Demand Surge", defaultTitle: "High Demand Surge ⚡", defaultMsg: "Our dark store is experiencing peak volume. Orders are dispatching in batches." },
              ].map((c) => (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => {
                    setAlertType(c.type);
                    if (!alertTitle || alertTitle.includes("Advisory") || alertTitle.includes("Surge")) setAlertTitle(c.defaultTitle);
                    if (!alertMessage || alertMessage.includes("Deliveries") || alertMessage.includes("buffer") || alertMessage.includes("peak volume")) setAlertMessage(c.defaultMsg);
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    alertType === c.type
                      ? "bg-[#FF5B00]/10 border-[#FF5B00] text-[#FF5B00]"
                      : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">Notice Headline</label>
                <input
                  type="text"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  placeholder="e.g. Snow Advisory · Anantnag ❄️"
                  className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                    darkMode
                      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">Customer Message</label>
                <input
                  type="text"
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="e.g. Extra 10m buffer added to protect riders."
                  className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                    darkMode
                      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSaveAlert}
            disabled={isSavingAlert}
            className="inline-flex items-center gap-1.5 bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSavingAlert ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Delivery Notice
          </button>
        </div>
      </div>

      {/* 5. Pre-Launch Reset & Danger Zone */}
      <div
        className={`md:col-span-2 rounded-2xl border p-5 space-y-4 transition-colors ${
          darkMode ? "bg-rose-950/20 border-rose-900/50" : "bg-rose-50/50 border-rose-200"
        }`}
      >
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <h3 className="font-black text-sm text-rose-700 dark:text-rose-300">
            Launch Operations & Danger Zone
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-zinc-300">
          Clean testing records before opening the storefront to customer orders. These actions make permanent database modifications.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* Action 1: Clear All Test Orders */}
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-[#161822] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                <Trash2 className="w-4 h-4" />
                <span>Clear All Test Orders</span>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Permanently wipes all historical test orders from Firestore and customer active order queues.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmClearOrders(true)}
              className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All Test Orders
            </button>
          </div>

          {/* Action 2: Reset All Stock to 0 */}
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-[#161822] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <RotateCcw className="w-4 h-4" />
                <span>Reset All Stock to 0</span>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Sets stock quantity to 0 and marks items Out of Stock across the product catalog without deleting items.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmResetStock(true)}
              className="w-full py-2 px-3 rounded-lg border border-amber-600/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Stock to 0
            </button>
          </div>

          {/* Action 3: Delete Entire Product Catalog */}
          <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-[#161822] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                <PackageX className="w-4 h-4" />
                <span>Delete Entire Product Catalog</span>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Permanently deletes all products from Firestore and local catalogue caches. Completely removes everything (not just zeroing stock) so you can start a fresh piece.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDeleteProducts(true)}
              className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <PackageX className="w-3.5 h-3.5" />
              Delete Entire Catalog
            </button>
          </div>

          {/* Action 4: Fresh Start: Wipe Store (Products & Orders) */}
          <div className="p-4 rounded-xl border border-rose-400/80 dark:border-rose-700 bg-rose-50/30 dark:bg-rose-950/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-[#FF5B00]" />
                <span>Fresh Start: Wipe Store</span>
              </div>
              <p className="text-[11.5px] text-slate-600 dark:text-zinc-300 mt-1.5 leading-relaxed">
                Complete clean slate for opening tomorrow. Permanently removes all products/stock and wipes all orders in a single operation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmWipeStore(true)}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Wipe Products & Orders
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL: Clear Orders */}
      {confirmClearOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl p-6 border space-y-4 ${
            darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Permanently delete all orders?</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to clear all test orders? This will delete every order document from Firestore and reset order queues.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOrders(false)}
                disabled={isClearingOrders}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearOrdersExecute}
                disabled={isClearingOrders}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                {isClearingOrders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Yes, Delete All Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Reset Stock */}
      {confirmResetStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl p-6 border space-y-4 ${
            darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Reset all stock to 0?</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">All products will show as Out of Stock.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              This will update inventory to 0 for all items in the catalog. Shoppers will not be able to order them until fresh stock is inwarded via CSV or the Inventory tab.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetStock(false)}
                disabled={isResettingStock}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetStockExecute}
                disabled={isResettingStock}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                {isResettingStock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Yes, Reset All Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Delete Entire Catalog */}
      {confirmDeleteProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl p-6 border space-y-4 ${
            darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <PackageX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Permanently delete all products?</h3>
                <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold">Everything in the catalog will be deleted.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              This will completely remove every product from Firestore and local catalogue caches. This does NOT just set stock to 0 — it gets rid of everything completely so you have a clean slate to import your real stock.
            </p>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] leading-relaxed">
              <strong>Warning:</strong> Customers will see an empty store until you add or import your new catalogue.
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteProducts(false)}
                disabled={isDeletingProducts}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProductsExecute}
                disabled={isDeletingProducts}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingProducts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Yes, Delete Entire Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Wipe Store (Fresh Start) */}
      {confirmWipeStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl p-6 border space-y-4 ${
            darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/15 text-rose-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#FF5B00]" />
              </div>
              <div>
                <h3 className="font-bold text-base">Fresh Start: Wipe Store?</h3>
                <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold">Deletes all products AND wipes all orders.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to perform a complete store wipe? This will permanently delete the entire product catalogue (not zeroing stock, but deleting all items) and delete all test orders across the system.
            </p>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] leading-relaxed">
              <strong>Pre-Launch Clean Slate:</strong> You can start fresh tomorrow by inwarding your actual stock and receiving clean customer orders.
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmWipeStore(false)}
                disabled={isWipingStore}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWipeStoreExecute}
                disabled={isWipingStore}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isWipingStore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Yes, Wipe Store for Launch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
