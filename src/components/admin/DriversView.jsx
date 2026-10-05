import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  Bike,
  UserPlus,
  Search,
  PhoneCall,
  MessageSquare,
  KeyRound,
  Power,
  CheckCircle2,
  Clock,
  MapPin,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Loader2,
  Check
} from "lucide-react";
import { watchAllDrivers, getDriverActiveOrderCounts } from "../../lib/drivers";
import { ORDER_STATUS } from "../../lib/db";
import { getFirebaseAuth } from "../../lib/firebase";

export default function DriversView({
  orders = [],
  darkMode = false,
  onNavigateTab
}) {
  const [drivers, setDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "available" | "on_road" | "inactive"

  // Modal states: null | "add" | "reset-pin"
  const [modalMode, setModalMode] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formPhoto, setFormPhoto] = useState("");
  const [resetPin, setResetPin] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");

  // Real-time sync with Firebase staff drivers
  useEffect(() => {
    const unsub = watchAllDrivers((updatedDrivers) => {
      setDrivers(updatedDrivers || []);
    });
    return () => unsub();
  }, []);

  // Compute active deliveries per driver
  const driverLoads = useMemo(() => getDriverActiveOrderCounts(orders), [orders]);

  // Find active orders per driver for quick navigation
  const driverActiveOrders = useMemo(() => {
    const map = {};
    if (!Array.isArray(orders)) return map;
    orders.forEach((o) => {
      const isOut = o.status === ORDER_STATUS.OUT_FOR_DELIVERY;
      const isPacked = o.status === ORDER_STATUS.PACKED || o.status === "Packing";
      if (isOut || isPacked) {
        const idKey = o.driverId ? String(o.driverId) : null;
        if (idKey) {
          if (!map[idKey]) map[idKey] = [];
          map[idKey].push(o);
        }
      }
    });
    return map;
  }, [orders]);

  // Filtered drivers list
  const filteredDrivers = useMemo(() => {
    // Riders waiting for approval first, so they are not missed.
    const pendingFirst = [...drivers].sort(
      (a, b) => Number(b.status === "pending") - Number(a.status === "pending")
    );
    return pendingFirst.filter((drv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (drv.name && drv.name.toLowerCase().includes(q)) ||
        (drv.phone && drv.phone.includes(q)) ||
        (drv.id && drv.id.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const activeCount = driverLoads[drv.id] || 0;
      const isDriverActive = drv.active !== false;

      if (statusFilter === "available") return isDriverActive && activeCount === 0;
      if (statusFilter === "on_road") return isDriverActive && activeCount > 0;
      if (statusFilter === "inactive") return !isDriverActive;
      return true;
    });
  }, [drivers, searchQuery, statusFilter, driverLoads]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = drivers.length;
    let onRoad = 0;
    let available = 0;
    let inactive = 0;

    drivers.forEach((drv) => {
      if (drv.active === false) {
        inactive += 1;
        return;
      }
      const load = driverLoads[drv.id] || 0;
      if (load > 0) onRoad += 1;
      else available += 1;
    });

    return { total, onRoad, available, inactive };
  }, [drivers, driverLoads]);

  // Helper to call backend PHP endpoint
  const callDriverApi = async (payload) => {
    const auth = getFirebaseAuth();
    let token = null;
    if (auth?.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
      } catch (e) {
        console.warn("Could not get ID token:", e?.message);
      }
    }

    const send = () =>
      fetch("/api/staff/add-driver.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...payload, id_token: token }),
      });
    // The request never reaching the server (Safari words it "Load failed")
    // is a connection problem, not a refusal: try once more, then say so.
    let res;
    try {
      res = await send();
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        res = await send();
      } catch (e2) {
        throw new Error(
          "Couldn't reach the shop's server from this phone or browser. Check the internet connection, turn off any ad blocker or VPN for dashit.co.in, and try again."
        );
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new Error(data.error || "Operation failed on server.");
    }
    return data;
  };

  // Generate random 4-digit PIN
  const generateRandomPin = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName("");
    setFormPhone("");
    setFormPin(generateRandomPin());
    setFormPhoto("");
    setApiError("");
    setApiSuccess("");
    setModalMode("add");
  };

  // Open Reset PIN Modal
  const handleOpenResetPin = (drv) => {
    setSelectedDriver(drv);
    setResetPin(generateRandomPin());
    setApiError("");
    setApiSuccess("");
    setModalMode("reset-pin");
  };

  // Toggle Driver Active / Inactive
  const handleToggleActive = async (drv) => {
    if (!drv || !drv.id) return;
    const nextActive = drv.active === false;
    const confirmMsg = nextActive
      ? drv.status === "pending"
        ? `Approve rider "${drv.name}" (${drv.phone || "no number"})? They will get the app and can be given orders.`
        : `Reactivate rider "${drv.name}"? They will be able to sign in and take deliveries.`
      : `Turn off rider "${drv.name}"? They will be deactivated and cannot sign in.`;

    if (!confirm(confirmMsg)) return;

    try {
      await callDriverApi({
        action: "toggle-active",
        uid: drv.id,
        active: nextActive,
      });
    } catch (err) {
      alert(`Could not change rider status: ${err.message}`);
    }
  };

  // Submit Add Rider or Reset PIN Form
  const handleSubmitModal = async (e) => {
    e.preventDefault();
    setApiError("");
    setApiSuccess("");
    setIsSubmitting(true);

    try {
      if (modalMode === "add") {
        const cleanName = formName.trim();
        const cleanPhone = formPhone.replace(/\D/g, "").slice(0, 10);
        const cleanPin = formPin.trim();

        if (!cleanName) throw new Error("Enter rider full name.");
        if (cleanPhone.length !== 10) throw new Error("Enter a valid 10-digit mobile number.");
        if (cleanPin.length !== 4) throw new Error("PIN must be 4 digits.");

        await callDriverApi({
          action: "create",
          name: cleanName,
          phone: cleanPhone,
          pin: cleanPin,
          photoUrl: formPhoto.trim(),
        });

        setApiSuccess(`Rider ${cleanName} created! PIN: ${cleanPin}`);
        setTimeout(() => {
          setModalMode(null);
          setApiSuccess("");
        }, 1800);
      } else if (modalMode === "reset-pin" && selectedDriver) {
        const cleanPin = resetPin.trim();
        if (cleanPin.length !== 4) throw new Error("PIN must be 4 digits.");

        await callDriverApi({
          action: "reset-pin",
          uid: selectedDriver.id,
          pin: cleanPin,
        });

        setApiSuccess(`New PIN ${cleanPin} saved for ${selectedDriver.name}!`);
        setTimeout(() => {
          setModalMode(null);
          setApiSuccess("");
        }, 1800);
      }
    } catch (err) {
      setApiError(err.message || "Failed to complete request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. KPI STATS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          className={"p-4 rounded-2xl border transition-all " + (
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {metrics.total}
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              registered
            </span>
          </div>
        </div>

        <div
          className={"p-4 rounded-2xl border transition-all " + (
            metrics.onRoad > 0
              ? "bg-amber-500/10 border-amber-400/50 shadow-xs"
              : darkMode
              ? "bg-[#14161E] border-zinc-800"
              : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              On Road
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-black">
              <Bike className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {metrics.onRoad}
            </span>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              active drops
            </span>
          </div>
        </div>

        <div
          className={"p-4 rounded-2xl border transition-all " + (
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Available at Hub
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {metrics.available}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              ready to assign
            </span>
          </div>
        </div>

        <div
          className={"p-4 rounded-2xl border transition-all " + (
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Deactivated
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
              <Power className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {metrics.inactive}
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              turned off
            </span>
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR: SEARCH, FILTERS & ADD DRIVER */}
      <div
        className={"p-3 sm:p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 " + (
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        )}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {[
            { id: "all", label: "All Drivers", count: metrics.total },
            { id: "available", label: "Available (Idle)", count: metrics.available },
            { id: "on_road", label: "On Road", count: metrics.onRoad },
            { id: "inactive", label: "Deactivated", count: metrics.inactive },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={"text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 " + (
                statusFilter === tab.id
                  ? "bg-[#FF5B00] text-white shadow-xs"
                  : darkMode
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-750"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 opacity-80 font-mono text-[11px]">({tab.count})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rider name, phone..."
              className={"w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none font-medium transition-all " + (
                darkMode
                  ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
              )}
            />
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-xl bg-[#FF5B00] hover:bg-[#E04E00] text-white font-bold text-xs flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-xs transition-transform active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Rider</span>
          </button>
        </div>
      </div>

      {/* 3. DESKTOP TABLE VIEW */}
      <div
        className={"hidden md:block rounded-2xl border overflow-hidden shadow-xs transition-colors " + (
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200"
        )}
      >
        <table className="w-full text-left text-xs">
          <thead
            className={"border-b font-black uppercase text-[10.5px] tracking-wider " + (
              darkMode ? "bg-[#1A1D26] border-zinc-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
            )}
          >
            <tr>
              <th className="py-3 px-4">Rider</th>
              <th className="py-3 px-3">Contact</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Active Deliveries</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={"divide-y " + (darkMode ? "divide-zinc-800" : "divide-slate-100")}>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                  No riders found. Click "Add Rider" to register a delivery partner.
                </td>
              </tr>
            ) : (
              filteredDrivers.map((drv) => {
                const activeCount = driverLoads[drv.id] || 0;
                const activeOrdList = driverActiveOrders[drv.id] || [];
                const isDriverActive = drv.active !== false;

                return (
                  <tr
                    key={drv.id}
                    className={"transition-colors " + (
                      !isDriverActive
                        ? "opacity-60 bg-slate-50/50 dark:bg-zinc-900/40"
                        : darkMode
                        ? "hover:bg-zinc-800/40"
                        : "hover:bg-slate-50/70"
                    )}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-3">
                        {drv.photo ? (
                          <img
                            src={drv.photo}
                            alt={drv.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#FF5B00]/30"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#FF5B00]/15 text-[#FF5B00] font-black text-xs flex items-center justify-center shrink-0">
                            {(drv.name || "R").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {drv.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            UID: {drv.id.slice(0, 10)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      {drv.phone ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-700 dark:text-zinc-300 font-medium">
                            +91 {drv.phone}
                          </span>
                          <a
                            href={"tel:" + drv.phone}
                            title="Call Rider"
                            className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={"https://wa.me/91" + drv.phone.replace(/\D/g, "").slice(-10)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp Rider"
                            className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No phone</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {drv.status === "pending" && !isDriverActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Waiting for approval</span>
                        </span>
                      ) : !isDriverActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>Deactivated</span>
                        </span>
                      ) : activeCount === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Available (Idle)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>{activeCount} {activeCount === 1 ? "Active Drop" : "Active Drops"}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      {activeOrdList.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {activeOrdList.map((ord) => {
                            const oid = ord.orderId || ord.id;
                            return (
                              <button
                                key={oid}
                                type="button"
                                onClick={() => {
                                  if (onNavigateTab) onNavigateTab("orders");
                                }}
                                title="View in Live Orders"
                                className="font-mono text-[10.5px] font-black bg-[#FF5B00]/10 text-[#FF5B00] border border-[#FF5B00]/20 px-1.5 py-0.5 rounded hover:bg-[#FF5B00]/20 cursor-pointer"
                              >
                                #{oid}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenResetPin(drv)}
                          title="Reset Rider 4-Digit PIN"
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:border-[#FF5B00] font-bold text-xs flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reset PIN</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(drv)}
                          title={isDriverActive ? "Turn off rider" : "Turn on rider"}
                          className={"px-2.5 py-1 rounded-lg border font-bold text-xs flex items-center space-x-1 cursor-pointer transition-colors " + (
                            isDriverActive
                              ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                          )}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{isDriverActive ? "Turn off" : drv.status === "pending" ? "Approve" : "Turn on"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. MOBILE CARDS VIEW */}
      <div className="md:hidden space-y-2.5">
        {filteredDrivers.length === 0 ? (
          <div className={"rounded-xl border border-dashed p-8 text-center text-xs text-slate-400 " + (darkMode ? "border-zinc-800" : "border-slate-300")}>
            No riders found. Tap "Add Rider" above.
          </div>
        ) : (
          filteredDrivers.map((drv) => {
            const activeCount = driverLoads[drv.id] || 0;
            const activeOrdList = driverActiveOrders[drv.id] || [];
            const isDriverActive = drv.active !== false;

            return (
              <div
                key={drv.id}
                className={"rounded-xl border p-3.5 space-y-3 " + (
                  !isDriverActive
                    ? "opacity-60 bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200"
                    : darkMode
                    ? "bg-[#14161E] border-zinc-800"
                    : "bg-white border-slate-200 shadow-xs"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    {drv.photo ? (
                      <img
                        src={drv.photo}
                        alt={drv.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#FF5B00]/30"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#FF5B00]/15 text-[#FF5B00] font-black text-sm flex items-center justify-center shrink-0">
                        {(drv.name || "R").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                        {drv.name}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                        +91 {drv.phone}
                      </span>
                    </div>
                  </div>

                  {drv.status === "pending" && !isDriverActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      <span>Waiting for approval</span>
                    </span>
                  ) : !isDriverActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <span>Deactivated</span>
                    </span>
                  ) : activeCount === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span>Available</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      <span>{activeCount} active</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenResetPin(drv)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold flex items-center space-x-1"
                    >
                      <KeyRound className="w-3 h-3 text-amber-600" />
                      <span>PIN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(drv)}
                      className={"px-2.5 py-1 rounded-lg border text-xs font-bold " + (
                        isDriverActive
                          ? "border-rose-200 text-rose-600"
                          : "border-emerald-200 text-emerald-600"
                      )}
                    >
                      {isDriverActive ? "Turn off" : drv.status === "pending" ? "Approve" : "Turn on"}
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {drv.phone && (
                      <>
                        <a
                          href={"tel:" + drv.phone}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 text-xs font-bold flex items-center space-x-1"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={"https://wa.me/91" + drv.phone.replace(/\D/g, "").slice(-10)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center space-x-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. ADD RIDER MODAL */}
      {modalMode === "add" && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={"w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xl " + (
              darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF5B00]/15 text-[#FF5B00] flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Add Rider to Fleet</h3>
                  <p className="text-[11px] text-slate-400">Creates Auth account &amp; staff document</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {apiError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {apiSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{apiSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitModal} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Tariq Ahmad"
                  className={"w-full border text-xs rounded-xl px-3 py-2.5 font-medium outline-none transition-all " + (
                    darkMode
                      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-[#FF5B00]"
                  )}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    className={"w-full pl-11 pr-3 py-2.5 text-xs rounded-xl border font-mono outline-none transition-all " + (
                      darkMode
                        ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                        : "bg-slate-50 border-slate-300 text-slate-900 focus:border-[#FF5B00]"
                    )}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    4-Digit Sign-In PIN *
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormPin(generateRandomPin())}
                    className="text-[11px] font-bold text-[#FF5B00] hover:underline flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                  className={"w-full border text-center text-sm font-mono tracking-widest font-black rounded-xl px-3 py-2.5 outline-none transition-all " + (
                    darkMode
                      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-[#FF5B00]"
                  )}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Rider uses phone number + this 4-digit PIN to sign into the driver app.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={formPhoto}
                  onChange={(e) => setFormPhoto(e.target.value)}
                  placeholder="https://..."
                  className={"w-full border text-xs rounded-xl px-3 py-2.5 font-medium outline-none transition-all " + (
                    darkMode
                      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-[#FF5B00]"
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  disabled={isSubmitting}
                  className={"px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer " + (
                    darkMode
                      ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim() || formPhone.length !== 10 || formPin.length !== 4}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-50 cursor-pointer shadow-md transition-transform active:scale-95 flex items-center space-x-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? "Creating..." : "Save Rider"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. RESET PIN MODAL */}
      {modalMode === "reset-pin" && selectedDriver && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={"w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xl " + (
              darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Reset Rider PIN</h3>
                  <p className="text-[11px] text-slate-400">For {selectedDriver.name} (+91 {selectedDriver.phone})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {apiError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {apiSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{apiSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitModal} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    New 4-Digit PIN *
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetPin(generateRandomPin())}
                    className="text-[11px] font-bold text-[#FF5B00] hover:underline flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={resetPin}
                  onChange={(e) => setResetPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="654321"
                  className={"w-full border text-center text-sm font-mono tracking-widest font-black rounded-xl px-3 py-2.5 outline-none transition-all " + (
                    darkMode
                      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-[#FF5B00]"
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  disabled={isSubmitting}
                  className={"px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer " + (
                    darkMode
                      ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || resetPin.length !== 4}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-50 cursor-pointer shadow-md transition-transform active:scale-95 flex items-center space-x-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? "Saving..." : "Save PIN"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
