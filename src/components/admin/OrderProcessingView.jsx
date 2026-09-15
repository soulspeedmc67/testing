import React, { useState, useMemo, useEffect } from "react";
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Search,
  Download,
  LayoutGrid,
  Table as TableIcon,
  PhoneCall,
  KeyRound,
  Filter,
  ChevronRight,
  ExternalLink,
  Printer,
  CheckSquare,
  Square,
  Sparkles,
  MapPin,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Zap,
  Banknote,
  ArrowRight,
  UserPlus,
  X
} from "lucide-react";
import { ORDER_STATUS } from "../../lib/db";
import { getDriverRoster, addDriverToRoster, getDriverActiveOrderCounts } from "../../lib/drivers";
import OrderDetailDrawer from "./OrderDetailDrawer";
import PrintPackingSlip from "./PrintPackingSlip";
import { whatsappReceiptLink, orderAddress } from "../../lib/orderReceipt";
import { generateCsvString, triggerCsvDownload, ORDERS_CSV_COLUMNS } from "../../lib/csvExport";

/* Node and the browser default to different time zones, so an unpinned
   toLocaleString renders one time on the server and another on the client —
   a hydration mismatch that makes React re-render the whole page. The store
   is India-only, so the zone is fixed. */
const IST = "Asia/Kolkata";


export default function OrderProcessingView({
  orders = [],
  onUpdateStatus,
  onAssignDriver,
  onNavigateTab,
  darkMode = false,
}) {
  /* The chronological list is the default. The board was the default before, and
     every status change made the card jump to a different column — the order the
     operator had just touched disappeared from where they were looking. */
  const [viewMode, setViewMode] = useState("table"); // "table" (list) | "kanban"
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [printingOrder, setPrintingOrder] = useState(null);

  // Table multi-selection for bulk operations
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  /* Orders the operator has just moved. They stay listed even when a status
     filter would now exclude them, so advancing "Placed → Packed" while filtered
     to "Placed" does not make the row vanish under the cursor. Cleared after a
     couple of minutes. */
  /* Each entry is { at, from } so the previous status can be restored. */
  const [recentlyUpdated, setRecentlyUpdated] = useState({});

  // Auto-open drawer for the latest PLACED order on first load
  useEffect(() => {
    if (selectedOrderId) return; // don't override if operator already picked one
    const latestPlaced = orders
      .filter((o) => o.status === ORDER_STATUS.PLACED)
      .sort((a, b) => orderTimeMs(b) - orderTimeMs(a))[0];
    if (latestPlaced) {
      setSelectedOrderId(latestPlaced.orderId || latestPlaced.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs only on mount

  /* Status changes that need a deliberate second step. Delivered closes the
     order and Cancelled stops it being fulfilled at all — neither should happen
     on a stray tap of a dropdown. */
  const [pendingChange, setPendingChange] = useState(null);

  // Driver roster and Out-for-Delivery handover modal state
  const [driverRoster, setDriverRoster] = useState(getDriverRoster);
  const [handoverModal, setHandoverModal] = useState(null); // { id, order }
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [skipDriverAssignment, setSkipDriverAssignment] = useState(false);

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

  const markRecentlyUpdated = React.useCallback((id, from) => {
    if (!id) return;
    setRecentlyUpdated((prev) => ({ ...prev, [String(id)]: { at: Date.now(), from } }));
  }, []);

  useEffect(() => {
    if (Object.keys(recentlyUpdated).length === 0) return;
    const timer = setInterval(() => {
      const cutoff = Date.now() - 120000;
      setRecentlyUpdated((prev) => {
        const next = {};
        let changed = false;
        Object.entries(prev).forEach(([id, entry]) => {
          if (entry.at > cutoff) next[id] = entry;
          else changed = true;
        });
        return changed ? next : prev;
      });
    }, 15000);
    return () => clearInterval(timer);
  }, [recentlyUpdated]);

  /** Order time in ms, whatever shape Firestore or localStorage hands back. */
  const orderTimeMs = (o) => {
    const ts = o?.createdAt ?? o?.timestamp;
    if (!ts) return 0;
    if (typeof ts === "number") return ts;
    if (typeof ts === "string") {
      const parsed = Date.parse(ts);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    return 0;
  };

  /** "14:32 · Today" style stamp so the operator can read order age at a glance. */
  const formatOrderTime = (o) => {
    const ms = orderTimeMs(o);
    if (!ms) return "—";
    const d = new Date(ms);
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
    const today = new Date();
    const sameDay =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    if (sameDay) return time;
    return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST })} ${time}`;
  };

  // Filter by search & status, then always order newest first.
  const filteredOrders = useMemo(() => {
    const matches = orders.filter((o) => {
      const orderId = String(o.orderId || o.id || "").toLowerCase();
      const name = String(o.customerName || o.userAddress?.name || "").toLowerCase();
      const phone = String(o.customerPhone || o.userAddress?.phone || "");
      const itemsStr = (o.items || []).map((i) => i.name).join(" ").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        orderId.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        itemsStr.includes(q);

      if (!matchesSearch) return false;

      // Just-touched orders stay on screen regardless of the status filter.
      if (recentlyUpdated[String(o.orderId || o.id)]) return true;

      if (statusFilter === "all") return true;
      if (statusFilter === "Packing") {
        return o.status === ORDER_STATUS.PACKED || o.status === "Packing";
      }
      return o.status === statusFilter;
    });

    return matches.sort((a, b) => orderTimeMs(b) - orderTimeMs(a));
  }, [orders, searchQuery, statusFilter, recentlyUpdated]);

  /* Applies a status change: pins the row in place and remembers what it was so
     the operator can undo. */
  const applyStatusChange = React.useCallback(
    async (id, nextStatus, order) => {
      markRecentlyUpdated(id, order?.status || null);
      if (onUpdateStatus) await onUpdateStatus(id, nextStatus, order);
    },
    [markRecentlyUpdated, onUpdateStatus]
  );

  /** Statuses that ask for confirmation before they are applied. */
  const NEEDS_CONFIRM = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];

  const handleStatusChange = React.useCallback(
    async (id, nextStatus, order) => {
      if (nextStatus === ORDER_STATUS.OUT_FOR_DELIVERY) {
        const ord = order || orders.find((o) => (o.orderId || o.id) === id);
        const currentDrivers = getDriverRoster();
        const existingDriver = currentDrivers.find(
          (d) =>
            (ord?.driverId && String(d.id) === String(ord.driverId)) ||
            (ord?.driverName && d.name.toLowerCase() === ord.driverName.toLowerCase())
        );
        setSelectedDriverId(existingDriver ? existingDriver.id : (currentDrivers[0]?.id || ""));
        setIsAddingDriver(false);
        setNewDriverName("");
        setNewDriverPhone("");
        setSkipDriverAssignment(false);
        setHandoverModal({ id, order: ord });
        return;
      }
      if (NEEDS_CONFIRM.includes(nextStatus)) {
        setPendingChange({ id, nextStatus, order });
        return;
      }
      await applyStatusChange(id, nextStatus, order);
    },
    [applyStatusChange, orders]
  );

  const handleConfirmHandover = React.useCallback(async () => {
    if (!handoverModal) return;
    const { id, order } = handoverModal;
    let chosenDriver = null;

    if (isAddingDriver && newDriverName.trim()) {
      chosenDriver = addDriverToRoster({ name: newDriverName.trim(), phone: newDriverPhone.trim() });
      if (chosenDriver) {
        setDriverRoster(getDriverRoster());
      }
    } else if (!skipDriverAssignment && selectedDriverId) {
      chosenDriver = driverRoster.find((d) => String(d.id) === String(selectedDriverId)) || null;
    }

    if (chosenDriver && onAssignDriver) {
      await onAssignDriver(id, chosenDriver.id, chosenDriver.name);
    }

    setHandoverModal(null);
    await applyStatusChange(id, ORDER_STATUS.OUT_FOR_DELIVERY, order);
  }, [handoverModal, isAddingDriver, newDriverName, newDriverPhone, skipDriverAssignment, selectedDriverId, driverRoster, onAssignDriver, applyStatusChange]);

  const handleCancelHandover = React.useCallback(() => {
    setHandoverModal(null);
  }, []);

  /** Puts an order back to the status it held before the last change. */
  const handleUndo = React.useCallback(
    async (id, order) => {
      const entry = recentlyUpdated[String(id)];
      if (!entry?.from) return;
      setRecentlyUpdated((prev) => {
        const next = { ...prev };
        delete next[String(id)];
        return next;
      });
      if (onUpdateStatus) await onUpdateStatus(id, entry.from, order);
    },
    [recentlyUpdated, onUpdateStatus]
  );

  // Selected Order Object for Drawer
  const activeOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => (o.orderId || o.id) === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const placed = orders.filter((o) => o.status === ORDER_STATUS.PLACED).length;
    const packing = orders.filter((o) => o.status === ORDER_STATUS.PACKED || o.status === "Packing").length;
    const out = orders.filter((o) => o.status === ORDER_STATUS.OUT_FOR_DELIVERY).length;
    const delivered = orders.filter((o) => o.status === ORDER_STATUS.DELIVERED);
    const deliveredCount = delivered.length;
    const totalDispatchedValue = delivered.reduce((acc, o) => acc + (o.totalAmount || o.total || 0), 0);

    return {
      placed,
      packing,
      out,
      deliveredCount,
      totalDispatchedValue,
    };
  }, [orders]);

  // Active delivery counts per driver
  const driverLoads = useMemo(() => getDriverActiveOrderCounts(orders), [orders]);

  // Helper for time-since-order badge
  const getElapsedInfo = (order) => {
    const timestamp = order.createdAt?.seconds
      ? order.createdAt.seconds * 1000
      : order.createdAt || Date.now();
    const mins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));

    if (order.status === ORDER_STATUS.DELIVERED) {
      return {
        mins,
        text: mins + "m",
        pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
        dot: "bg-emerald-500",
      };
    }
    if (mins <= 4) {
      return {
        mins,
        text: mins + "m",
        pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
        dot: "bg-emerald-500",
      };
    }
    if (mins <= 8) {
      return {
        mins,
        text: mins + "m",
        pillClass: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
        dot: "bg-amber-500",
      };
    }
    return {
      mins,
      text: mins + "m",
      pillClass: "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
      dot: "bg-rose-500",
    };
  };

  /** wa.me link carrying the receipt, or null when there is no phone number. */
  const waLink = (order) =>
    whatsappReceiptLink(order, {
      origin: typeof window !== "undefined" ? window.location.origin : "",
    });

  /** The single next action for an order, or null when it is finished. */
  const nextStep = (s) => {
    const v = s === "Packing" ? ORDER_STATUS.PACKED : s;
    if (v === ORDER_STATUS.PLACED) return { to: ORDER_STATUS.PACKED, label: "Mark packed" };
    if (v === ORDER_STATUS.PACKED) return { to: ORDER_STATUS.OUT_FOR_DELIVERY, label: "Send out" };
    if (v === ORDER_STATUS.OUT_FOR_DELIVERY) return { to: ORDER_STATUS.DELIVERED, label: "Mark delivered" };
    return null;
  };

  /** Every state an operator may set an order to, in fulfilment order. */
  const STATUS_OPTIONS = [
    ORDER_STATUS.PLACED,
    ORDER_STATUS.PACKED,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ];

  /** Older orders stored "Packing"; the canonical value is "Packed". */
  const normaliseStatus = (s) => (s === "Packing" ? ORDER_STATUS.PACKED : s || ORDER_STATUS.PLACED);

  const statusPillClass = (s) => {
    const v = normaliseStatus(s);
    if (v === ORDER_STATUS.PLACED)
      return "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700";
    if (v === ORDER_STATUS.PACKED)
      return "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700";
    if (v === ORDER_STATUS.OUT_FOR_DELIVERY)
      return "bg-violet-50 text-violet-900 border-violet-300 dark:bg-violet-950/80 dark:text-violet-300 dark:border-violet-700";
    if (v === ORDER_STATUS.CANCELLED)
      return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    return "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700";
  };

  // Columns for Kanban with Tactical Dark Store Buttons
  const kanbanColumns = [
    {
      id: "placed",
      title: "1. Incoming Orders",
      sub: "Needs picking & bagging",
      status: ORDER_STATUS.PLACED,
      pillColor: "bg-amber-500 text-slate-950",
      orders: orders.filter((o) => o.status === ORDER_STATUS.PLACED),
      actionText: "1-CLICK ACCEPT & PACK",
      nextStatus: ORDER_STATUS.PACKED,
      actionButtonClass: "bg-[#061838] hover:bg-[#0A2450] text-white",
      ActionIcon: Package,
    },
    {
      id: "packing",
      title: "2. Bagging & Packing",
      sub: "Item verification in progress",
      status: ORDER_STATUS.PACKED,
      pillColor: "bg-blue-600 text-white",
      orders: orders.filter((o) => o.status === ORDER_STATUS.PACKED || o.status === "Packing"),
      actionText: "BAG READY · DISPATCH TO RIDER",
      nextStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
      actionButtonClass: "bg-[#FF5B00] hover:bg-[#E04E00] text-white",
      ActionIcon: Truck,
    },
    {
      id: "out",
      title: "3. Out for Delivery",
      sub: "With rider on road (10m SLA)",
      status: ORDER_STATUS.OUT_FOR_DELIVERY,
      pillColor: "bg-purple-600 text-white",
      orders: orders.filter((o) => o.status === ORDER_STATUS.OUT_FOR_DELIVERY),
      actionText: "Confirm delivered",
      nextStatus: ORDER_STATUS.DELIVERED,
      actionButtonClass: "bg-emerald-700 hover:bg-emerald-800 text-white",
      ActionIcon: CheckCircle2,
    },
    {
      id: "delivered",
      title: "4. Delivered & Settled",
      sub: "Customer delivery completed",
      status: ORDER_STATUS.DELIVERED,
      pillColor: "bg-emerald-600 text-white",
      orders: orders.filter((o) => o.status === ORDER_STATUS.DELIVERED),
      actionText: null,
      nextStatus: null,
      actionButtonClass: "",
      ActionIcon: null,
    },
  ];

  // CSV Export Handler
  const handleExportCSV = (ordersToExport = filteredOrders) => {
    if (ordersToExport.length === 0) {
      alert("No orders available to export.");
      return;
    }
    const csvContent = generateCsvString(ordersToExport, ORDERS_CSV_COLUMNS);
    triggerCsvDownload(csvContent, `DASHit_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Bulk Actions
  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedOrderIds.length === 0) return;
    if (
      !confirm(
        "Advance " + selectedOrderIds.length + " selected orders to \"" + newStatus + "\"?"
      )
    )
      return;

    for (const id of selectedOrderIds) {
      const ord = orders.find((o) => (o.orderId || o.id) === id);
      await handleStatusChange(id, newStatus, ord);
    }
    setSelectedOrderIds([]);
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map((o) => o.orderId || o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. METIS EXECUTIVE KPI STATS RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Incoming */}
        <div
          className={"p-4 rounded-2xl border transition-all relative overflow-hidden " + (
            metrics.placed > 0
              ? "bg-amber-500/10 border-amber-400/50 shadow-xs"
              : darkMode
              ? "bg-[#14161E] border-zinc-800"
              : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Incoming Orders
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-black">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {metrics.placed}
            </span>
            {metrics.placed > 0 && (
              <span className="text-[10.5px] font-semibold text-amber-700 uppercase tracking-wide bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                Needs Packing
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Packing In-Flight */}
        <div
          className={"p-4 rounded-2xl border transition-all " + (
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Packing Tables
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-black">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {metrics.packing}
            </span>
            <span className="text-[10.5px] font-bold text-slate-500">
              in bagging
            </span>
          </div>
        </div>

        {/* Metric 3: Active Riders */}
        <div
          onClick={() => { if (onNavigateTab) onNavigateTab("drivers"); }}
          className={"p-4 rounded-2xl border transition-all cursor-pointer hover:border-[#FF5B00]/40 " + (
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <span>With Riders</span>
              <span className="text-[9.5px] text-[#FF5B00] font-bold">Manage Fleet &rarr;</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center font-black">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {metrics.out}
            </span>
            <span className="text-[10.5px] font-bold text-slate-500">
              on road
            </span>
          </div>
        </div>

        {/* Metric 4: Delivered */}
        <div
          className={"p-4 rounded-2xl border transition-all " + (
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Delivered Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-black">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {metrics.deliveredCount}
            </span>
            <span className="text-xs font-black text-emerald-600 font-mono">
              (₹{metrics.totalDispatchedValue.toLocaleString("en-IN")})
            </span>
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR: VIEW TOGGLE & SEARCH */}
      <div
        className={"p-3 sm:p-3.5 rounded-2xl border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 " + (
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        )}
      >
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 -mx-1 px-1">
          {["all", "Placed", "Packing", "Out for Delivery", "Delivered", "Cancelled"].map((st) => {
            const count =
              st === "all"
                ? orders.length
                : st === "Packing"
                ? orders.filter((o) => o.status === ORDER_STATUS.PACKED || o.status === "Packing").length
                : orders.filter((o) => o.status === st).length;

            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={"text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 " + (
                  statusFilter === st
                    ? "bg-[#FF5B00] text-white shadow-xs"
                    : darkMode
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-750"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <span>{st === "all" ? "All Orders" : st}</span>
                <span className="ml-1.5 opacity-80 font-mono text-[11px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Search, View Mode, Export.
            The row used to be a fixed-width cluster, so on a phone the view
            toggle was pushed past the right edge and clipped. */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 min-w-0 lg:min-w-[210px] lg:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, phone..."
              className={"w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none font-medium transition-all " + (
                darkMode
                  ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
              )}
            />
          </div>

          <div
            className={"p-1 rounded-lg border flex items-center space-x-1 shrink-0 " + (
              darkMode ? "bg-[#1A1D26] border-zinc-700/80" : "bg-slate-100 border-slate-200"
            )}
          >
            {/* The list is first because it is the default working view. */}
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={"flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer " + (
                viewMode === "table"
                  ? "bg-white dark:bg-[#181B24] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>All orders</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={"flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer " + (
                viewMode === "kanban"
                  ? "bg-white dark:bg-[#181B24] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleExportCSV()}
            title="Export to CSV"
            className={"p-2 rounded-xl border transition-all cursor-pointer shadow-xs " + (
              darkMode
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-zinc-700"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            )}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. BULK ACTIONS FLOATING STRIP */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-[#181B24] text-white p-3 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-xs font-bold pl-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5B00]" />
            <span>{selectedOrderIds.length} order(s) selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleBulkStatusUpdate(ORDER_STATUS.PACKED)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-black cursor-pointer shadow-xs flex items-center space-x-1"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Mark Packing</span>
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatusUpdate(ORDER_STATUS.OUT_FOR_DELIVERY)}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF5B00] hover:bg-[#E04E00] text-xs font-black cursor-pointer shadow-xs flex items-center space-x-1"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Mark Dispatched</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const selectedList = orders.filter((o) =>
                  selectedOrderIds.includes(o.orderId || o.id)
                );
                handleExportCSV(selectedList);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black cursor-pointer border border-white/20"
            >
              Export Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="text-xs text-slate-400 hover:text-white px-2 cursor-pointer font-bold"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 4. VIEW 1: KANBAN BOARD */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colOrders = filteredOrders.filter((o) => {
              if (col.id === "packing") return o.status === ORDER_STATUS.PACKED || o.status === "Packing";
              return o.status === col.status;
            });

            return (
              <div
                key={col.id}
                className={"rounded-2xl border flex flex-col p-3.5 space-y-3.5 min-h-[520px] transition-colors " + (
                  darkMode ? "bg-[#0E1015] border-zinc-800" : "bg-slate-100/70 border-slate-200/90"
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-zinc-800">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                        {col.title}
                      </h3>
                      <span className={"text-[10px] font-black px-2 py-0.2 rounded-full " + col.pillColor}>
                        {colOrders.length}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">{col.sub}</p>
                  </div>
                </div>

                {/* Orders Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
                  {colOrders.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-2xl border-slate-300 dark:border-zinc-800 text-slate-400 text-xs">
                      No orders in this stage
                    </div>
                  ) : (
                    colOrders.map((ord) => {
                      const orderId = ord.orderId || ord.id || "DSH";
                      const items = ord.items || [];
                      const elapsed = getElapsedInfo(ord);
                      const customerName = ord.customerName || ord.userAddress?.name || "Customer";
                      const phone = ord.customerPhone || ord.userAddress?.phone || "";
                      const address = orderAddress(ord, "No address");
                      const total = ord.totalAmount || ord.total || 0;
                      const isCOD = !(ord.paymentMethod || "").toLowerCase().includes("online");
                      const receiver = ord.receiverContact;

                      return (
                        <div
                          key={orderId}
                          className={"p-4 rounded-2xl border transition-all space-y-3 shadow-xs " + (
                            darkMode
                              ? "bg-[#14161E] border-zinc-800 hover:border-zinc-700"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          )}
                        >
                          {/* Row 1: Order # & SLA Timer Badge */}
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(orderId)}
                              className="font-mono font-black text-sm text-slate-900 dark:text-white hover:text-[#FF5B00] cursor-pointer flex items-center space-x-1"
                            >
                              <span>#{orderId}</span>
                            </button>

                            <span
                              className={"text-[11px] px-2.5 py-1 rounded-full border flex items-center space-x-1 " + elapsed.pillClass}
                            >
                              <Clock className="w-3 h-3 stroke-[2.5]" />
                              <span>{elapsed.text}</span>
                            </span>
                          </div>

                          {/* Row 2: Customer info + Quick Call & WhatsApp */}
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 pr-2">
                              <span className="font-extrabold text-xs text-slate-900 dark:text-white block truncate">
                                {customerName}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate flex items-center space-x-1">
                                <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                                <span className="truncate">{address}</span>
                              </span>
                              {receiver && (
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block">
                                  Deliver to: {receiver.name} ({receiver.phone})
                                </span>
                              )}
                            </div>

                            {phone && (
                              <div className="flex items-center space-x-1 shrink-0">
                                <a
                                  href={"tel:" + phone}
                                  title={"Call " + phone}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center transition-transform active:scale-90"
                                >
                                  <PhoneCall className="w-3.5 h-3.5 stroke-[2.5]" />
                                </a>
                                <a
                                  href={"https://wa.me/91" + phone.replace(/\D/g, "").slice(-10)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="WhatsApp"
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-7 h-7 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center transition-transform active:scale-90"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Row 3: Items Picking Box (High Legibility for Pickers) */}
                          <div
                            onClick={() => setSelectedOrderId(orderId)}
                            className={"p-3 rounded-xl space-y-1.5 cursor-pointer border " + (
                              darkMode
                                ? "bg-[#1A1D26] border-zinc-700/60 hover:bg-slate-800/70"
                                : "bg-slate-50 border-slate-200/80 hover:bg-slate-100/70"
                            )}
                          >
                            <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-500 border-b pb-1 border-slate-200/50 dark:border-zinc-700/50">
                              <span>Pick List ({items.length} {items.length === 1 ? "item" : "items"})</span>
                              <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                                ₹{total}
                              </span>
                            </div>

                            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                              {items.map((i, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                                  <span className="font-semibold text-slate-900 dark:text-zinc-100 truncate pr-2">
                                    <span className="font-mono font-black text-[#FF5B00] bg-[#FF5B00]/10 px-1.5 py-0.5 rounded mr-1.5 text-[11px]">
                                      {i.qty || 1}x
                                    </span>
                                    {i.name}
                                  </span>
                                  <span className="text-slate-400 font-mono text-[10.5px] shrink-0">
                                    ₹{(i.price || 0) * (i.qty || 1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Row 4: Badges (Payment, OTP, Driver) */}
                          <div className="flex items-center justify-between text-[10.5px] font-bold flex-wrap gap-1">
                            <span
                              className={"px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 " + (
                                isCOD
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black"
                                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black"
                              )}
                            >
                              {isCOD ? <Banknote className="w-3 h-3 shrink-0" /> : <Zap className="w-3 h-3 shrink-0" />}
                              <span>{isCOD ? "CASH ON DELIVERY" : "PAID ONLINE"}</span>
                            </span>

                            {ord.driverName ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                                <Truck className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[110px]">{ord.driverName}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                                <Truck className="w-3 h-3 shrink-0" />
                                <span>No rider</span>
                              </span>
                            )}

                            {ord.otp && (
                              <span className="font-mono bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-black flex items-center space-x-1 border border-amber-300 dark:border-amber-700">
                                <KeyRound className="w-3 h-3" />
                                <span>OTP: {ord.otp}</span>
                              </span>
                            )}
                          </div>

                          {/* Row 5: PRIMARY ACTION BUTTON (Big, Tactile, High-Contrast) */}
                          {col.actionText && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(orderId, col.nextStatus, ord)}
                              className={"w-full py-3 px-4 rounded-xl font-black text-xs cursor-pointer flex items-center justify-center space-x-2 transition-all active:scale-[0.98] " + col.actionButtonClass}
                            >
                              {col.ActionIcon && <col.ActionIcon className="w-4 h-4 stroke-[2.5]" />}
                              <span>{col.actionText}</span>
                              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          )}

                          {/* Row 6: Card Utilities (Print Slip & View Details) */}
                          <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800 flex items-center justify-between text-xs">
                            <button
                              type="button"
                              onClick={() => setPrintingOrder(ord)}
                              className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print Bag Slip</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(orderId)}
                              className="font-bold text-[#FF5B00] hover:underline cursor-pointer flex items-center space-x-0.5"
                            >
                              <span>View Details</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. VIEW 2: DATA TABLE */}
      {/* ---- Mobile: one card per order -------------------------------------
          A ten-column table is unusable on a phone — it forced sideways
          scrolling to reach the status and the action. Below `md` the same
          orders render as stacked cards with the status selector and the next
          step reachable with a thumb. */}
      {viewMode === "table" && (
        <div className="md:hidden space-y-2.5">
          {filteredOrders.length === 0 ? (
            <div className={"rounded-xl border border-dashed p-8 text-center text-xs text-slate-400 " + (darkMode ? "border-zinc-800" : "border-slate-300")}>
              No orders match your filter.
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const orderId = ord.orderId || ord.id || "DSH";
              const items = ord.items || [];
              const customerName = ord.customerName || ord.userAddress?.name || "Customer";
              const phone = ord.customerPhone || ord.userAddress?.phone || "";
              const total = ord.totalAmount || ord.total || 0;
              const status = ord.status || ORDER_STATUS.PLACED;
              const step = nextStep(status);

              return (
                <div
                  key={orderId}
                  className={"rounded-xl border p-3.5 space-y-3 " + (
                    darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(orderId)}
                        className="font-mono font-semibold text-sm text-slate-900 dark:text-white hover:text-[#FF5B00] cursor-pointer"
                      >
                        #{orderId}
                      </button>
                      {recentlyUpdated[String(orderId)] && (
                        <>
                          <span className="ml-2 text-[9px] font-semibold uppercase tracking-wider text-[#FF5B00]">
                            updated
                          </span>
                          {recentlyUpdated[String(orderId)].from && (
                            <button
                              type="button"
                              onClick={() => handleUndo(orderId, ord)}
                              className="ml-2 text-[10px] font-semibold underline text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                              Undo
                            </button>
                          )}
                        </>
                      )}
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        {formatOrderTime(ord)} &middot; {customerName}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-sm text-slate-900 dark:text-white shrink-0">
                      &#8377;{total}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-snug line-clamp-2">
                    {items.map((i) => (i.qty || 1) + "x " + i.name).join(", ") || "No items"}
                  </p>

                  <div className="flex items-center gap-2">
                    <select
                      value={normaliseStatus(status)}
                      onChange={(e) => handleStatusChange(orderId, e.target.value, ord)}
                      aria-label={"Status for order " + orderId}
                      style={{ WebkitTextFillColor: "currentColor", colorScheme: darkMode ? "dark" : "light" }}
                      className={"flex-1 min-w-0 appearance-none cursor-pointer rounded-lg border px-2.5 py-2 text-[11.5px] font-bold " + statusPillClass(status)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-white text-slate-900 dark:bg-[#1A1D26] dark:text-zinc-100 font-semibold">
                          {opt}
                        </option>
                      ))}
                    </select>

                    {step && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(orderId, step.to, ord)}
                        className="px-3 py-2 rounded-lg bg-[#061838] hover:bg-[#0A2450] text-white dark:bg-blue-600 dark:hover:bg-blue-500 font-semibold text-[11px] cursor-pointer whitespace-nowrap shrink-0 transition-colors shadow-xs"
                      >
                        {step.label}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 pt-0.5">
                    {phone && (
                      <a href={"tel:" + phone} className="text-[11px] font-medium text-slate-500 hover:text-[#FF5B00]">
                        Call {phone}
                      </a>
                    )}
                    {waLink(ord) && (
                      <a
                        href={waLink(ord)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        WhatsApp receipt
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setPrintingOrder(ord)}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      Print slip
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ---- Desktop: full table -------------------------------------------- */}
      {viewMode === "table" && (
        <div
          className={"hidden md:block rounded-2xl border overflow-hidden shadow-xs transition-colors " + (
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200"
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={"border-b font-black uppercase text-[10.5px] tracking-wider " + (
                  darkMode ? "bg-[#1A1D26] border-zinc-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                )}
              >
                <tr>
                  <th className="py-3 px-4 w-10" title="Select orders to bulk-update their status or export them">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="rounded accent-[#FF5B00] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 cursor-help" title="The unique ID of this order. Click any row to open full order details.">Order #</th>
                  <th className="py-3 px-3 cursor-help" title="The time this order was placed by the customer.">Placed At</th>
                  <th className="py-3 px-4 cursor-help" title="Customer name and phone number. Use these to call or message them if needed.">Customer</th>
                  <th className="py-3 px-4 cursor-help" title="A quick summary of what the customer ordered. Click the row to see the full item list.">Items</th>
                  <th className="py-3 px-3 cursor-help" title="Total bill amount the customer has to pay.">Total (Rs.)</th>
                  <th className="py-3 px-3 cursor-help" title="How the customer is paying. COD means they pay cash on delivery. Online means they already paid.">Payment</th>
                  <th className="py-3 px-3 cursor-help" title="Where this order currently is in the process: Placed = new order, Packing = being packed, Out for Delivery = with rider, Delivered = done.">Status</th>
                  <th className="py-3 px-3 cursor-help" title="How many minutes have passed since the customer placed this order. Orders should ideally be delivered within 10 minutes. Green = on time, Yellow = hurry up, Red = already overdue.">Time Since Order</th>
                  <th className="py-3 px-4 text-right cursor-help" title="Buttons to move this order to the next step, print the packing slip, or send the receipt to the customer.">Actions</th>
                </tr>
              </thead>
              <tbody className={"divide-y " + (darkMode ? "divide-zinc-800" : "divide-slate-100")}>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                      No orders match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const orderId = ord.orderId || ord.id || "DSH";
                    const isSelected = selectedOrderIds.includes(orderId);
                    const items = ord.items || [];
                    const elapsed = getElapsedInfo(ord);
                    const customerName = ord.customerName || ord.userAddress?.name || "Customer";
                    const phone = ord.customerPhone || ord.userAddress?.phone || "";
                    const total = ord.totalAmount || ord.total || 0;
                    const status = ord.status || ORDER_STATUS.PLACED;
                    const isCOD = !(ord.paymentMethod || "").toLowerCase().includes("online");

                    return (
                      <tr
                        key={orderId}
                        onClick={() => setSelectedOrderId(orderId)}
                        className={"cursor-pointer transition-colors " + (
                          isSelected
                            ? darkMode
                              ? "bg-zinc-800/60"
                              : "bg-orange-50/60"
                            : darkMode
                            ? "hover:bg-zinc-800/40"
                            : "hover:bg-slate-50/70"
                        )}
                      >
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(orderId)}
                            className="rounded accent-[#FF5B00] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(orderId)}
                            className="hover:text-[#FF5B00] hover:underline cursor-pointer"
                          >
                            #{orderId}
                          </button>
                          {/* Marks the row the operator just advanced, which is held
                              in the list even when the status filter would drop it. */}
                          {recentlyUpdated[String(orderId)] && (
                            <span className="ml-2 align-middle whitespace-nowrap">
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-[#FF5B00]">
                                updated
                              </span>
                              {recentlyUpdated[String(orderId)].from && (
                                <button
                                  type="button"
                                  onClick={() => handleUndo(orderId, ord)}
                                  className="ml-1.5 text-[10px] font-semibold underline text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                >
                                  Undo
                                </button>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 dark:text-zinc-400">
                          {formatOrderTime(ord)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-zinc-100 flex items-center justify-center font-black text-[11px] shrink-0">
                              {customerName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white block truncate">
                                {customerName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {phone ? "+91 " + phone : "No phone"}
                              </span>
                              {ord.driverName && (
                                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 block truncate">
                                  Rider: {ord.driverName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                            {items.length} {items.length === 1 ? "item" : "items"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                          Rs.{total}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={"px-2 py-0.5 rounded-full text-[10px] font-black uppercase " + (
                              isCOD
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {isCOD ? "COD" : "Online"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={normaliseStatus(status)}
                            onChange={(e) => handleStatusChange(orderId, e.target.value, ord)}
                            aria-label={"Status for order " + orderId}
                            style={{ WebkitTextFillColor: "currentColor", colorScheme: darkMode ? "dark" : "light" }}
                            className={"appearance-none cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11.5px] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/40 " + statusPillClass(status)}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-white text-slate-900 dark:bg-[#1A1D26] dark:text-zinc-100 font-semibold">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            title={elapsed.mins <= 4 ? "On time" : elapsed.mins <= 8 ? "Hurry up, pack now" : "Overdue! Pack immediately"}
                            className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-black " + elapsed.pillClass}
                          >
                            <span className={"w-1.5 h-1.5 rounded-full shrink-0 " + elapsed.dot} />
                            {elapsed.text}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setPrintingOrder(ord)}
                              title="Print the packing slip for this order"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-2xs"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {waLink(ord) && (
                              <a
                                href={waLink(ord)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Send the order receipt to the customer on WhatsApp"
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer shadow-2xs"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {nextStep(status) && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(orderId, nextStep(status).to, ord)}
                                title={"Move this order to: " + nextStep(status).label}
                                className="px-3 py-1.5 rounded-lg bg-[#061838] hover:bg-[#0A2450] text-white dark:bg-blue-600 dark:hover:bg-blue-500 font-semibold text-[11px] cursor-pointer whitespace-nowrap shadow-xs transition-colors"
                              >
                                {nextStep(status).label}
                              </button>
                            )}

                            {/* Quick tick: instantly marks order as Packed */}
                            {status !== ORDER_STATUS.DELIVERED && status !== ORDER_STATUS.CANCELLED && (
                              <button
                                type="button"
                                title="Mark all items packed and move order to Packing stage"
                                onClick={() => handleStatusChange(orderId, ORDER_STATUS.PACKED, ord)}
                                className="p-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white cursor-pointer transition-colors shadow-2xs"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(orderId)}
                              title="Open full order details"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
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
        </div>
      )}

      {/* 6. ORDER DETAIL SLIDE-OVER DRAWER */}
      {/* Confirmation for the two changes that are awkward to walk back:
          Delivered closes the order, Cancelled stops it being fulfilled. */}
      {pendingChange && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
          <div
            className={"w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border p-5 space-y-4 pb-[max(20px,env(safe-area-inset-bottom,20px))] sm:pb-5 " + (
              darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div>
              <h3 className="font-semibold text-base">
                {pendingChange.nextStatus === ORDER_STATUS.CANCELLED
                  ? "Cancel this order?"
                  : "Mark as delivered?"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {pendingChange.nextStatus === ORDER_STATUS.CANCELLED
                  ? `Order #${pendingChange.id} will stop being fulfilled and the customer will see it as cancelled.`
                  : `Order #${pendingChange.id} will be closed and counted in today's delivered total.`}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingChange(null)}
                className={"px-4 py-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer " + (
                  darkMode
                    ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                Keep as is
              </button>
              <button
                type="button"
                onClick={async () => {
                  const p = pendingChange;
                  setPendingChange(null);
                  await applyStatusChange(p.id, p.nextStatus, p.order);
                }}
                className={"px-4 py-2.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer " + (
                  pendingChange.nextStatus === ORDER_STATUS.CANCELLED
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-700 hover:bg-emerald-800"
                )}
              >
                {pendingChange.nextStatus === ORDER_STATUS.CANCELLED ? "Cancel order" : "Confirm delivered"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign a rider when an order goes out for delivery */}
      {handoverModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={"w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto pb-[max(20px,env(safe-area-inset-bottom,20px))] sm:pb-6 shadow-2xl " + (
              darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b pb-3.5 border-slate-200 dark:border-zinc-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5B00]/15 text-[#FF5B00] flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                    Send out with a rider
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Order #{handoverModal.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelHandover}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Mini-Card */}
            {handoverModal.order && (
              <div
                className={"p-3 rounded-xl border text-xs space-y-1.5 " + (
                  darkMode ? "bg-[#1A1D26] border-zinc-800" : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900 dark:text-white truncate pr-2">
                    {handoverModal.order.customerName || handoverModal.order.userAddress?.name || "Customer"}
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white shrink-0">
                    ₹{handoverModal.order.totalAmount || handoverModal.order.total || 0}
                  </span>
                </div>
                <div className="flex items-center text-slate-500 dark:text-zinc-400 space-x-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#FF5B00] shrink-0" />
                  <span className="truncate">
                    {orderAddress(handoverModal.order, "No address")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5">
                  <span>{(handoverModal.order.items || []).length} items</span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">
                    {(handoverModal.order.paymentMethod || "").toLowerCase().includes("online") ? "Paid Online" : "Cash On Delivery (COD)"}
                  </span>
                </div>
              </div>
            )}

            {/* Drivers Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Select Available Driver
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingDriver((prev) => !prev)}
                  className="text-xs font-bold text-[#FF5B00] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isAddingDriver ? "Choose Existing" : "+ Add New Driver"}</span>
                </button>
              </div>

              {/* Add New Driver Form */}
              {isAddingDriver ? (
                <div
                  className={"p-3.5 rounded-xl border space-y-3 " + (
                    darkMode ? "bg-[#1A1D26] border-zinc-700" : "bg-slate-50 border-slate-200"
                  )}
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Add rider and send out
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={newDriverName}
                      onChange={(e) => setNewDriverName(e.target.value)}
                      placeholder="Driver Name (e.g. Tariq)"
                      className={"w-full border text-xs rounded-xl px-3 py-2 font-medium outline-none " + (
                        darkMode
                          ? "bg-[#14161E] border-zinc-700 text-white focus:border-[#FF5B00]"
                          : "bg-white border-slate-300 text-slate-900 focus:border-[#FF5B00]"
                      )}
                    />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={newDriverPhone}
                      onChange={(e) => setNewDriverPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit Mobile"
                      className={"w-full border text-xs rounded-xl px-3 py-2 font-medium outline-none " + (
                        darkMode
                          ? "bg-[#14161E] border-zinc-700 text-white focus:border-[#FF5B00]"
                          : "bg-white border-slate-300 text-slate-900 focus:border-[#FF5B00]"
                      )}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    This rider will be saved to your fleet roster and assigned to this delivery.
                  </p>
                </div>
              ) : (
                /* Driver Roster Cards */
                <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                  {driverRoster.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                      No drivers registered yet. Click &quot;+ Add New Driver&quot; above.
                    </div>
                  ) : (
                    driverRoster.map((drv) => {
                      const activeCount = driverLoads[drv.id] || driverLoads[drv.name.toLowerCase()] || 0;
                      const isSelected = !skipDriverAssignment && selectedDriverId === drv.id;

                      return (
                        <div
                          key={drv.id}
                          onClick={() => {
                            setSelectedDriverId(drv.id);
                            setSkipDriverAssignment(false);
                          }}
                          className={"p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all " + (
                            isSelected
                              ? "bg-[#FF5B00]/10 border-[#FF5B00] ring-1 ring-[#FF5B00]/30 shadow-xs"
                              : darkMode
                              ? "bg-[#1A1D26] border-zinc-800 hover:border-zinc-700"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div
                              className={"w-4 h-4 rounded-full border flex items-center justify-center shrink-0 " + (
                                isSelected
                                  ? "border-[#FF5B00] bg-[#FF5B00]"
                                  : "border-slate-400 dark:border-zinc-600 bg-transparent"
                              )}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>

                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0">
                              {drv.name.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                                {drv.name}
                              </span>
                              {drv.phone && (
                                <span className="text-[10.5px] text-slate-400 font-mono block">
                                  +91 {drv.phone}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            {activeCount === 0 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Available (Idle)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                {activeCount} in transit
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Skip Assignment Option */}
              <div className="pt-1 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="skipDriverCheck"
                  checked={skipDriverAssignment}
                  onChange={(e) => setSkipDriverAssignment(e.target.checked)}
                  className="rounded accent-[#FF5B00] cursor-pointer"
                />
                <label
                  htmlFor="skipDriverCheck"
                  className="text-xs text-slate-500 dark:text-zinc-400 cursor-pointer select-none"
                >
                  Proceed without assigning a driver (open pool / self-pickup)
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleCancelHandover}
                className={"px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer " + (
                  darkMode
                    ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHandover}
                disabled={isAddingDriver && !newDriverName.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-md active:scale-[0.98]"
              >
                <Truck className="w-4 h-4" />
                <span>Confirm and send out</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      )}

      <OrderDetailDrawer
        order={activeOrder}
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        onUpdateStatus={handleStatusChange}
        onAssignDriver={onAssignDriver}
        darkMode={darkMode}
      />

      {/* 7. 80MM THERMAL SLIP PRINT MODAL */}
      {printingOrder && (
        <PrintPackingSlip
          order={printingOrder}
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </div>
  );
}
