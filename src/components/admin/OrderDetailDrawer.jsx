import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  PhoneCall,
  MessageSquare,
  MapPin,
  ExternalLink,
  KeyRound,
  Printer,
  AlertTriangle,
  Check,
  ChevronRight,
  ShieldCheck,
  IndianRupee,
  ArrowRight,
  UserPlus
} from "lucide-react";
import PrintPackingSlip from "./PrintPackingSlip";
import { ORDER_STATUS } from "../../lib/db";
import { getDriverRoster, addDriverToRoster, removeDriverFromRoster } from "../../lib/drivers";
import { fetchDrivers } from "../../lib/db";
import { orderAddress } from "../../lib/orderReceipt";

export default function OrderDetailDrawer({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  onAssignDriver,
  darkMode = false,
}) {
  const [showPrintSlip, setShowPrintSlip] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [customDriverName, setCustomDriverName] = useState("");
  const [customDriverPhone, setCustomDriverPhone] = useState("");

  /* Real rider accounts first. Every entry's `id` is the rider's Firebase uid,
     which is what an assigned order must carry for it to show up on that
     rider's phone. The local roster stays only as an offline stand-in. */
  const [driverRoster, setDriverRoster] = useState(getDriverRoster);

  useEffect(() => {
    let cancelled = false;
    fetchDrivers().then((staffDrivers) => {
      if (!cancelled && staffDrivers.length > 0) setDriverRoster(staffDrivers);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleRosterUpdate = () => {
      setDriverRoster(getDriverRoster());
    };
    window.addEventListener("dashit_driver_roster_updated", handleRosterUpdate);
    window.addEventListener("storage", handleRosterUpdate);
    return () => {
      window.removeEventListener("dashit_driver_roster_updated", handleRosterUpdate);
      window.removeEventListener("storage", handleRosterUpdate);
    };
  }, []);

  // Reset checklist on order change — must stay before early return (Rules of Hooks)
  useEffect(() => {
    setCheckedItems({});
  }, [order?.orderId, order?.id]);

  const orderId = order?.orderId || order?.id || "DSH";
  const items = order?.items || [];
  const status = order?.status || ORDER_STATUS.PLACED;
  const isPlaced = status === ORDER_STATUS.PLACED;
  const isPacking = status === ORDER_STATUS.PACKED || status === "Packing";
  const isOut = status === ORDER_STATUS.OUT_FOR_DELIVERY;
  const isDelivered = status === ORDER_STATUS.DELIVERED;
  const isCancelled = status === ORDER_STATUS.CANCELLED;

  const customerName = order?.customerName || order?.userAddress?.name || "Customer";
  const customerPhone = order?.customerPhone || order?.userAddress?.phone || "";
  const address = orderAddress(order, "No address on this order");
  const receiver = order?.receiverContact;
  const totalAmount = order?.totalAmount || order?.total || 0;
  const paymentMethod = order?.paymentMethod || "COD (Cash on Delivery)";
  const isOnlinePaid =
    paymentMethod.toLowerCase().includes("online") ||
    paymentMethod.toLowerCase().includes("upi") ||
    paymentMethod.toLowerCase().includes("card");

  // SLA calculation against the quick-commerce dispatch benchmark
  const createdTimestamp = order?.createdAt?.seconds
    ? order.createdAt.seconds * 1000
    : order?.createdAt || Date.now();
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - createdTimestamp) / 60000));

  // All hooks must be called before any early returns (Rules of Hooks)
  const slaStatus = useMemo(() => {
    if (isDelivered) {
      return {
        label: "Delivered in " + elapsedMinutes + " minutes",
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        urgency: "done",
      };
    }
    if (isCancelled) {
      return {
        label: "Order Cancelled",
        color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
        urgency: "cancelled",
      };
    }
    if (elapsedMinutes <= 4) {
      return {
        label: elapsedMinutes + " min since order · On time, pack quickly",
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        urgency: "normal",
      };
    }
    if (elapsedMinutes <= 8) {
      return {
        label: elapsedMinutes + " min since order · Hurry up, pack this now",
        color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
        urgency: "warning",
      };
    }
    return {
      label: elapsedMinutes + " min since order · Overdue! Pack and dispatch immediately",
      color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
      urgency: "critical",
    };
  }, [elapsedMinutes, isDelivered, isCancelled]);

  // Early return AFTER all hooks — correct per React Rules of Hooks
  if (!isOpen || !order) return null;

  // Checklist counts
  const totalItemsCount = items.length;
  const packedItemsCount = items.filter((_, idx) => checkedItems[idx]).length;
  const allItemsPacked = totalItemsCount > 0 && packedItemsCount === totalItemsCount;

  const toggleCheckItem = (idx) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const markAllChecked = () => {
    const all = {};
    items.forEach((_, idx) => {
      all[idx] = true;
    });
    setCheckedItems(all);
  };

  const assignedDriverName = order?.driverName || "";
  const assignedDriverId = order?.driverId || "";
  const matchedDriver = driverRoster.find(
    (d) =>
      (assignedDriverName && d.name.toLowerCase() === assignedDriverName.toLowerCase()) ||
      (assignedDriverId && d.id === assignedDriverId)
  );
  const assignedDriverPhone = matchedDriver?.phone || "";

  const handleAssignDriver = async (drv) => {
    if (!drv || !onAssignDriver) return;
    setIsAssigning(true);
    try {
      await onAssignDriver(orderId, drv.id, drv.name);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignDriver = async () => {
    if (!onAssignDriver) return;
    setIsAssigning(true);
    try {
      await onAssignDriver(orderId, null, "");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAddAndAssign = async (e) => {
    e.preventDefault();
    const cleanName = customDriverName.trim();
    if (!cleanName) return;
    const newDrv = addDriverToRoster({ name: cleanName, phone: customDriverPhone });
    if (newDrv) {
      setDriverRoster(getDriverRoster());
    }
    setCustomDriverName("");
    setCustomDriverPhone("");
    setIsAddingDriver(false);
    if (newDrv && onAssignDriver) {
      setIsAssigning(true);
      try {
        await onAssignDriver(orderId, newDrv.id, newDrv.name);
      } finally {
        setIsAssigning(false);
      }
    }
  };

  const handleRemoveFromRoster = (drvId) => {
    const nextRoster = removeDriverFromRoster(drvId);
    setDriverRoster(nextRoster);
  };

  // Next status progression helper
  const getNextStageInfo = () => {
    if (isPlaced) {
      return {
        title: "1-CLICK ACCEPT & BEGIN PACKING",
        targetStatus: ORDER_STATUS.PACKED,
        color: "bg-[#061838] hover:bg-[#0A2450] text-white shadow-md",
        Icon: Package,
      };
    }
    if (isPacking) {
      return {
        title: "BAG READY · DISPATCH TO RIDER",
        targetStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
        color: "bg-[#FF5B00] hover:bg-[#E04E00] text-white shadow-md",
        Icon: Truck,
      };
    }
    if (isOut) {
      return {
        title: "Confirm delivered",
        targetStatus: ORDER_STATUS.DELIVERED,
        color: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md",
        Icon: CheckCircle2,
      };
    }
    return null;
  };

  const nextStage = getNextStageInfo();

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity">
        <div
          className={"w-full max-w-xl h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200 transition-colors " + (
            darkMode ? "bg-[#12141A] text-zinc-100 border-l border-zinc-800" : "bg-white text-slate-900"
          )}
        >
          {/* Header */}
          <div
            className={"px-6 py-4 border-b flex items-center justify-between shrink-0 " + (
              darkMode ? "bg-[#161822] border-zinc-800" : "bg-slate-50 border-slate-200"
            )}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5">
                <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
                  Order #{orderId}
                </span>
                <span
                  className={"text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border " + (
                    isPlaced
                      ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                      : isPacking
                      ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                      : isOut
                      ? "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                      : isDelivered
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                  )}
                >
                  {isPacking ? "Packing" : status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Created {new Date(createdTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setShowPrintSlip(true)}
                title="Print Bag Slip / Invoice"
                className={"p-2 rounded-xl border transition-all cursor-pointer " + (
                  darkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-zinc-700"
                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs"
                )}
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 admin-scroll">
            {/* 1. SLA Bar */}
            <div
              className={"p-3.5 rounded-2xl border flex items-center justify-between font-bold text-xs " + slaStatus.color}
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span>{slaStatus.label}</span>
              </div>
              <span className="text-[10.5px] uppercase font-black tracking-wider opacity-80">
                Goal: Deliver in 10 min
              </span>
            </div>

            {/* 2. Order Progress Steps */}
            <div
              className={"p-4 rounded-2xl border space-y-3 " + (
                darkMode ? "bg-[#161822] border-zinc-800" : "bg-slate-50 border-slate-200"
              )}
            >
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                Order Progress
              </span>

              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  { key: ORDER_STATUS.PLACED, label: "Placed", icon: Clock },
                  { key: ORDER_STATUS.PACKED, label: "Packing", icon: Package },
                  { key: ORDER_STATUS.OUT_FOR_DELIVERY, label: "Dispatch", icon: Truck },
                  { key: ORDER_STATUS.DELIVERED, label: "Delivered", icon: CheckCircle2 },
                ].map((step, idx) => {
                  const stepOrder = [
                    ORDER_STATUS.PLACED,
                    ORDER_STATUS.PACKED,
                    ORDER_STATUS.OUT_FOR_DELIVERY,
                    ORDER_STATUS.DELIVERED,
                  ];
                  const currentIdx = stepOrder.indexOf(status === "Packing" ? ORDER_STATUS.PACKED : status);
                  const isCompleted = currentIdx >= idx && !isCancelled;
                  const isCurrent = currentIdx === idx && !isCancelled;
                  const StepIcon = step.icon;

                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => onUpdateStatus(orderId, step.key, order)}
                      className={"p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 " + (
                        isCurrent
                          ? "bg-[#FF5B00] text-white border-[#FF5B00] shadow-sm ring-2 ring-[#FF5B00]/20"
                          : isCompleted
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : darkMode
                          ? "bg-[#1A1D26] border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <StepIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] leading-tight">{step.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Primary Next Action */}
              {nextStage && !isCancelled && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(orderId, nextStage.targetStatus, order)}
                  className={"w-full py-3.5 px-4 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer active:scale-98 flex items-center justify-center space-x-2 " + nextStage.color}
                >
                  <nextStage.Icon className="w-4 h-4" />
                  <span>{nextStage.title}</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              )}
            </div>

            {/* 3. Delivery Partner / Driver Assignment */}
            <div
              className={"p-4 rounded-2xl border space-y-3 " + (
                darkMode ? "bg-[#161822] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
              )}
            >
              <div className="flex items-center justify-between border-b pb-2.5 border-slate-200/50">
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-[#FF5B00]" />
                  <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                    Delivery Partner / Driver
                  </span>
                </div>
                {assignedDriverName ? (
                  <span className="text-[10.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Assigned</span>
                  </span>
                ) : (
                  <span className="text-[10.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Not Assigned
                  </span>
                )}
              </div>

              {assignedDriverName ? (
                /* Assigned Driver Card */
                <div className="space-y-2.5">
                  <div
                    className={"p-3 rounded-xl border flex items-center justify-between " + (
                      darkMode ? "bg-[#1A1D26] border-zinc-700" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#FF5B00]/15 text-[#FF5B00] flex items-center justify-center font-black text-xs shrink-0">
                        {assignedDriverName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-black text-xs text-slate-900 dark:text-white block">
                          {assignedDriverName}
                        </span>
                        {assignedDriverPhone ? (
                          <span className="text-[10.5px] text-slate-400 font-mono">
                            +91 {assignedDriverPhone}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Partner ID: {assignedDriverId || "Assigned"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {assignedDriverPhone && (
                        <>
                          <a
                            href={"tel:" + assignedDriverPhone}
                            className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                            title="Call Driver"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={"https://wa.me/91" + assignedDriverPhone}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                            title="WhatsApp Driver"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleUnassignDriver}
                        disabled={isAssigning}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-700 hover:underline px-2 py-1 cursor-pointer"
                      >
                        Unassign
                      </button>
                    </div>
                  </div>

                  {/* 1-tap dispatch shortcut if status is not yet Out for Delivery */}
                  {status !== ORDER_STATUS.OUT_FOR_DELIVERY && !isDelivered && !isCancelled && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(orderId, ORDER_STATUS.OUT_FOR_DELIVERY, order)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs transition-all active:scale-[0.99]"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Send out for delivery</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Unassigned: Quick Driver Select Chips + Add New Driver Form */
                <div className="space-y-3">
                  <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                    Select a driver from your team or add a new driver to assign this order:
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {driverRoster.map((drv) => (
                      <div
                        key={drv.id}
                        className="inline-flex items-center rounded-xl border overflow-hidden shadow-2xs group"
                      >
                        <button
                          type="button"
                          onClick={() => handleAssignDriver(drv)}
                          disabled={isAssigning}
                          className={"py-2 px-3 text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer " + (
                            darkMode
                              ? "bg-[#1A1D26] hover:bg-zinc-800 text-zinc-100 border-zinc-700"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                          )}
                        >
                          <Truck className="w-3.5 h-3.5 text-[#FF5B00]" />
                          <span>{drv.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromRoster(drv.id)}
                          title="Remove from fleet list"
                          className="px-1.5 py-2 text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-zinc-800/80 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setIsAddingDriver((prev) => !prev)}
                      className="py-2 px-3 rounded-xl border border-dashed text-xs font-bold text-[#FF5B00] hover:bg-[#FF5B00]/10 transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{isAddingDriver ? "Cancel" : "Add Driver"}</span>
                    </button>
                  </div>

                  {/* Add New Driver Form */}
                  {isAddingDriver && (
                    <form
                      onSubmit={handleAddAndAssign}
                      className={"p-3 rounded-xl border space-y-2.5 " + (
                        darkMode ? "bg-[#1A1D26] border-zinc-700" : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <span className="text-[11px] font-black uppercase text-slate-700 dark:text-zinc-300 block">
                        Add Driver to Team &amp; Assign
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={customDriverName}
                          onChange={(e) => setCustomDriverName(e.target.value)}
                          placeholder="Driver Name (e.g. Tariq)"
                          style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                          className="w-full bg-white border border-slate-300 text-slate-900 font-semibold text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#FF5B00]"
                        />
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={customDriverPhone}
                          onChange={(e) => setCustomDriverPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="10-digit mobile"
                          style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                          className="w-full bg-white border border-slate-300 text-slate-900 font-semibold text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#FF5B00]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!customDriverName.trim() || isAssigning}
                        className="w-full py-2 px-3 rounded-lg bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-50 text-white font-black text-xs transition-all cursor-pointer"
                      >
                        {isAssigning ? "Assigning…" : "Save to Team & Assign"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* 4. Interactive Warehouse Packing Checklist */}
            <div
              className={"p-4 rounded-2xl border space-y-3 " + (
                darkMode ? "bg-[#161822] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
              )}
            >
              <div className="flex items-center justify-between border-b pb-2.5 border-slate-200/50">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-[#FF5B00]" />
                  <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                    Warehouse Picking Checklist ({packedItemsCount}/{totalItemsCount})
                  </span>
                </div>
                {totalItemsCount > 1 && (
                  <button
                    type="button"
                    onClick={markAllChecked}
                    className="text-[11px] font-black text-[#FF5B00] hover:underline cursor-pointer"
                  >
                    Check All ({totalItemsCount})
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: (totalItemsCount > 0 ? (packedItemsCount / totalItemsCount) * 100 : 0) + "%" }}
                  className="h-full bg-gradient-to-r from-[#FF5E00] to-emerald-500 transition-all duration-300"
                />
              </div>

              <div className="space-y-2 pt-1">
                {items.map((item, idx) => {
                  const isChecked = !!checkedItems[idx];
                  const qty = item.qty || item.quantity || 1;
                  const price = Number(item.price) || 0;

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleCheckItem(idx)}
                      className={"p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all " + (
                        isChecked
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300"
                          : darkMode
                          ? "bg-[#1A1D26] border-zinc-700/60 hover:bg-zinc-800"
                          : "bg-slate-50 border-slate-200/80 hover:bg-slate-100"
                      )}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={"w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors " + (
                            isChecked
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-400 bg-transparent"
                          )}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span
                            className={"font-black text-xs block truncate " + (
                              isChecked ? "line-through opacity-60" : ""
                            )}
                          >
                            {item.name}
                          </span>
                          <span className="text-[10.5px] text-slate-500 font-medium">
                            Quantity: <strong className="text-[#FF5B00] font-black">{qty} units</strong> · ₹{price} each
                          </span>
                        </div>
                      </div>

                      <span className="font-mono font-black text-xs shrink-0 pl-2">
                        ₹{price * qty}
                      </span>
                    </div>
                  );
                })}
              </div>

              {allItemsPacked && !isDelivered && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 stroke-[2.5]" />
                  <span>All {totalItemsCount} items picked and verified into the bag</span>
                </div>
              )}

              {/* PLACE ALL IN PACKET — one-tap: checks all items + marks packed */}
              {!isDelivered && !isCancelled && !allItemsPacked && (
                <button
                  type="button"
                  onClick={() => {
                    markAllChecked();
                    if (!isPacking) onUpdateStatus(orderId, ORDER_STATUS.PACKED, order);
                  }}
                  className="w-full py-3.5 px-4 rounded-xl font-black text-xs cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>PLACE ALL {totalItemsCount} ITEMS IN PACKET</span>
                </button>
              )}
            </div>

            {/* 4. Customer Information & Direct Actions */}
            <div
              className={"p-4 rounded-2xl border space-y-3 " + (
                darkMode ? "bg-[#161822] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
              )}
            >
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                Customer & Delivery Route
              </span>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {customerName}
                  </span>
                  {customerPhone && (
                    <span className="font-mono text-xs font-bold text-slate-500">
                      +91 {customerPhone}
                    </span>
                  )}
                </div>

                <div className="flex items-start space-x-2 text-xs text-slate-500 dark:text-zinc-400 pt-1">
                  <MapPin className="w-4 h-4 text-[#FF5B00] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{address}</span>
                </div>

                {receiver && (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold">
                    Recipient: {receiver.name} ({receiver.phone})
                  </div>
                )}
              </div>

              {/* Action shortcuts: Call, WhatsApp, Google Maps */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/50">
                {customerPhone ? (
                  <>
                    <a
                      href={"tel:" + customerPhone}
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-xs hover:bg-emerald-500/25 transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                    <a
                      href={"https://wa.me/91" + customerPhone.replace(/\D/g, "").slice(-10)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </>
                ) : (
                  <div className="col-span-2 text-[11px] text-slate-400 italic">
                    No phone number provided
                  </div>
                )}

                <a
                  href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={"flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl font-black text-xs border transition-colors " + (
                    darkMode
                      ? "bg-slate-800 text-slate-300 border-zinc-700 hover:bg-slate-700"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  )}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Maps</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </div>
            </div>

            {/* 5. Payment & delivery OTP */}
            <div
              className={"p-4 rounded-2xl border space-y-3 " + (
                darkMode ? "bg-[#161822] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block">
                    Payment Method
                  </span>
                  <span
                    className={"font-black text-xs mt-0.5 inline-block " + (
                      isOnlinePaid ? "text-emerald-500" : "text-amber-500"
                    )}
                  >
                    {isOnlinePaid ? "PREPAID ONLINE" : "CASH ON DELIVERY (COD)"}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block">
                    Total Amount
                  </span>
                  <span className="font-mono font-black text-base text-slate-900 dark:text-white">
                    ₹{totalAmount}
                  </span>
                </div>
              </div>

              {order.otp && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                    <KeyRound className="w-4 h-4" />
                    <span>Customer OTP:</span>
                  </div>
                  <span className="font-mono font-black text-lg text-amber-500 tracking-wider">
                    {order.otp}
                  </span>
                </div>
              )}
            </div>

            {/* 6. Danger Zone: Cancel Order */}
            {!isDelivered && !isCancelled && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel Order #" + orderId + "?")) {
                      onUpdateStatus(orderId, ORDER_STATUS.CANCELLED, order);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel Customer Order</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print Packing Slip Modal */}
      {showPrintSlip && (
        <PrintPackingSlip order={order} onClose={() => setShowPrintSlip(false)} />
      )}
    </>
  );
}
