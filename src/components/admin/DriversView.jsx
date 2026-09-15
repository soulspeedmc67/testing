import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  Bike,
  UserPlus,
  Search,
  PhoneCall,
  MessageSquare,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import {
  getDriverRoster,
  addDriverToRoster,
  updateDriverInRoster,
  removeDriverFromRoster,
  getDriverActiveOrderCounts
} from "../../lib/drivers";
import { ORDER_STATUS } from "../../lib/db";

export default function DriversView({
  orders = [],
  darkMode = false,
  onNavigateTab
}) {
  const [drivers, setDrivers] = useState(getDriverRoster);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "available" | "on_road"

  // Modal states
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [editingDriver, setEditingDriver] = useState(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formVehicle, setFormVehicle] = useState("Scooter");
  const [driverToDelete, setDriverToDelete] = useState(null);

  // Sync with global driver roster updates
  useEffect(() => {
    const handleRosterUpdate = () => {
      setDrivers(getDriverRoster());
    };
    window.addEventListener("dashit_driver_roster_updated", handleRosterUpdate);
    window.addEventListener("storage", handleRosterUpdate);
    return () => {
      window.removeEventListener("dashit_driver_roster_updated", handleRosterUpdate);
      window.removeEventListener("storage", handleRosterUpdate);
    };
  }, []);

  // Compute active deliveries per driver
  const driverLoads = useMemo(() => getDriverActiveOrderCounts(orders), [orders]);

  // Find active orders per driver for quick lookup
  const driverActiveOrders = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (o.status === ORDER_STATUS.OUT_FOR_DELIVERY) {
        const idKey = o.driverId ? String(o.driverId) : null;
        const nameKey = o.driverName ? String(o.driverName).toLowerCase().trim() : null;
        if (idKey) {
          if (!map[idKey]) map[idKey] = [];
          map[idKey].push(o);
        }
        if (nameKey) {
          if (!map[nameKey]) map[nameKey] = [];
          map[nameKey].push(o);
        }
      }
    });
    return map;
  }, [orders]);

  // Filtered drivers list
  const filteredDrivers = useMemo(() => {
    return drivers.filter((drv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        drv.name.toLowerCase().includes(q) ||
        (drv.phone && drv.phone.includes(q)) ||
        (drv.vehicle && drv.vehicle.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const activeCount = driverLoads[drv.id] || driverLoads[drv.name.toLowerCase()] || 0;
      if (statusFilter === "available") return activeCount === 0;
      if (statusFilter === "on_road") return activeCount > 0;
      return true;
    });
  }, [drivers, searchQuery, statusFilter, driverLoads]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = drivers.length;
    let onRoad = 0;
    let available = 0;
    drivers.forEach((drv) => {
      const load = driverLoads[drv.id] || driverLoads[drv.name.toLowerCase()] || 0;
      if (load > 0) onRoad += 1;
      else available += 1;
    });
    return { total, onRoad, available };
  }, [drivers, driverLoads]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingDriver(null);
    setFormName("");
    setFormPhone("");
    setFormVehicle("Scooter");
    setModalMode("add");
  };

  // Open Edit Modal
  const handleOpenEdit = (drv) => {
    setEditingDriver(drv);
    setFormName(drv.name || "");
    setFormPhone(drv.phone || "");
    setFormVehicle(drv.vehicle || "Scooter");
    setModalMode("edit");
  };

  // Save Add / Edit
  const handleSaveDriver = (e) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) return;

    if (modalMode === "add") {
      addDriverToRoster({
        name: cleanName,
        phone: formPhone,
        vehicle: formVehicle,
      });
    } else if (modalMode === "edit" && editingDriver) {
      updateDriverInRoster({
        id: editingDriver.id,
        name: cleanName,
        phone: formPhone,
        vehicle: formVehicle,
      });
    }

    setDrivers(getDriverRoster());
    setModalMode(null);
    setEditingDriver(null);
  };

  // Delete Driver
  const handleConfirmDelete = () => {
    if (!driverToDelete) return;
    removeDriverFromRoster(driverToDelete.id);
    setDrivers(getDriverRoster());
    setDriverToDelete(null);
  };

  return (
    <div className="space-y-5">
      {/* 1. KPI STATS RIBBON */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div
          className={"p-4 rounded-2xl border transition-all " + (
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Fleet Drivers
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
              registered riders
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
              On Road (Delivering)
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
              active on road
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
              ready to send out
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
              placeholder="Search driver name, phone..."
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
            <span>Add Driver</span>
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
              <th className="py-3 px-4">Driver Name</th>
              <th className="py-3 px-3">Contact</th>
              <th className="py-3 px-3">Vehicle</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Current Deliveries</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={"divide-y " + (darkMode ? "divide-zinc-800" : "divide-slate-100")}>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                  No drivers found matching your search.
                </td>
              </tr>
            ) : (
              filteredDrivers.map((drv) => {
                const activeCount = driverLoads[drv.id] || driverLoads[drv.name.toLowerCase()] || 0;
                const activeOrdList = driverActiveOrders[drv.id] || driverActiveOrders[drv.name.toLowerCase()] || [];

                return (
                  <tr
                    key={drv.id}
                    className={"transition-colors " + (
                      darkMode ? "hover:bg-zinc-800/40" : "hover:bg-slate-50/70"
                    )}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#FF5B00]/15 text-[#FF5B00] font-black text-xs flex items-center justify-center shrink-0">
                          {drv.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {drv.name}
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-mono">
                            ID: {drv.id.slice(-6)}
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
                            title="Call Driver"
                            className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={"https://wa.me/91" + drv.phone.replace(/\D/g, "").slice(-10)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp Driver"
                            className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No phone</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        <Bike className="w-3 h-3 text-[#FF5B00]" />
                        <span>{drv.vehicle || "Scooter"}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {activeCount === 0 ? (
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
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(drv)}
                          title="Edit Driver Details"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-2xs transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDriverToDelete(drv)}
                          title="Remove Driver from Fleet"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shadow-2xs transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
            No drivers found matching your search.
          </div>
        ) : (
          filteredDrivers.map((drv) => {
            const activeCount = driverLoads[drv.id] || driverLoads[drv.name.toLowerCase()] || 0;
            const activeOrdList = driverActiveOrders[drv.id] || driverActiveOrders[drv.name.toLowerCase()] || [];

            return (
              <div
                key={drv.id}
                className={"rounded-xl border p-3.5 space-y-3 " + (
                  darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-[#FF5B00]/15 text-[#FF5B00] font-black text-sm flex items-center justify-center shrink-0">
                      {drv.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                        {drv.name}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {drv.vehicle || "Scooter"} &middot; ID: {drv.id.slice(-6)}
                      </span>
                    </div>
                  </div>

                  {activeCount === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Available</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>{activeCount} active</span>
                    </span>
                  )}
                </div>

                {activeOrdList.length > 0 && (
                  <div className="p-2 rounded-lg bg-[#FF5B00]/5 border border-[#FF5B00]/15 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-zinc-400 font-medium">Currently delivering:</span>
                    <div className="flex gap-1">
                      {activeOrdList.map((ord) => {
                        const oid = ord.orderId || ord.id;
                        return (
                          <span key={oid} className="font-mono font-bold text-[#FF5B00]">
                            #{oid}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center space-x-2">
                    {drv.phone ? (
                      <>
                        <a
                          href={"tel:" + drv.phone}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center space-x-1"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={"https://wa.me/91" + drv.phone.replace(/\D/g, "").slice(-10)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center space-x-1 shadow-2xs"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No phone</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(drv)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDriverToDelete(drv)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. ADD / EDIT DRIVER MODAL */}
      {modalMode && (
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
                <h3 className="font-extrabold text-base">
                  {modalMode === "add" ? "Add Driver to Fleet" : "Edit Driver Details"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-3.5">
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
                  Mobile Number (10 Digits)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
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
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={formVehicle}
                  onChange={(e) => setFormVehicle(e.target.value)}
                  style={{ WebkitTextFillColor: "currentColor", colorScheme: darkMode ? "dark" : "light" }}
                  className={"w-full border text-xs rounded-xl px-3 py-2.5 font-semibold outline-none transition-all " + (
                    darkMode
                      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-[#FF5B00]"
                  )}
                >
                  <option value="Scooter" className="bg-white text-slate-900 dark:bg-[#1A1D26] dark:text-zinc-100">Scooter</option>
                  <option value="Bike" className="bg-white text-slate-900 dark:bg-[#1A1D26] dark:text-zinc-100">Motorcycle / Bike</option>
                  <option value="Electric Scooter" className="bg-white text-slate-900 dark:bg-[#1A1D26] dark:text-zinc-100">Electric Scooter (EV)</option>
                  <option value="Bicycle" className="bg-white text-slate-900 dark:bg-[#1A1D26] dark:text-zinc-100">Bicycle / Cycle</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
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
                  disabled={!formName.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-50 cursor-pointer shadow-md transition-transform active:scale-95"
                >
                  {modalMode === "add" ? "Save Driver" : "Update Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {driverToDelete && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={"w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border p-5 space-y-4 " + (
              darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div>
              <h3 className="font-extrabold text-base text-rose-600 dark:text-rose-400">
                Remove Driver from Fleet?
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{driverToDelete.name}</strong> from the team roster?
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDriverToDelete(null)}
                className={"px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer " + (
                  darkMode
                    ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-sm transition-transform active:scale-95"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
