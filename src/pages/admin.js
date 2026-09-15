import { useState, useEffect, useRef, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  ShieldAlert,
  Mail,
  Lock,
  Loader2,
  LogIn,
  Package,
  Boxes,
  Tag,
  IndianRupee,
  Power,
  Moon,
  CloudRain,
  Zap,
  Wrench,
  Edit3,
  X,
  Sparkles,
  ArrowDownToLine
} from "lucide-react";

import AdminLayout from "../components/admin/AdminLayout";
import OrderProcessingView from "../components/admin/OrderProcessingView";
import DriversView from "../components/admin/DriversView";
import InventoryView from "../components/admin/InventoryView";
import AddProductView from "../components/admin/AddProductView";
import BatchInwardView from "../components/admin/BatchInwardView";
import CatalogueView from "../components/admin/CatalogueView";
import OffersView from "../components/admin/OffersView";
import ImporterView from "../components/admin/ImporterView";
import CsvInventoryView from "../components/admin/CsvInventoryView";
import StoreControlsView from "../components/admin/StoreControlsView";

import BarcodeScannerView from "../components/BarcodeScannerView";
import { get4KPhotoSuggestions, findInIndianCatalog, STUDIO_4K_PHOTOS } from "../lib/barcodeCatalog";
import { isFirebaseConfigured } from "../lib/firebase";
import { watchAuth, getStaffRole, signInWithEmail, signOut } from "../lib/auth";
import {
  watchAllOrders,
  updateOrderStatus as fsUpdateOrderStatus,
  watchOffers,
  saveOffer,
  deleteOffer as fsDeleteOffer,
  watchProducts,
  fetchProducts,
  upsertProduct,
  deleteProduct as fsDeleteProduct,
  adjustSingleProductStock,
  bulkUpdateProductStock,
  deductInventoryForOrder,
  watchStoreConfig,
  setStoreConfig,
  assignDriver,
  ORDER_STATUS
} from "../lib/db";
import { searchOffByBarcode, searchOffByQuery } from "../lib/openFoodFacts";
import {
  playOrderChime,
  notifyNewOrder,
  unlockAudio,
  requestNotificationPermission
} from "../lib/chime";
import {
  getExclusiveOffers,
  addExclusiveOffer,
  toggleOfferActive,
  deleteExclusiveOffer,
  saveExclusiveOffers,
  DEFAULT_OFFERS
} from "../lib/offers";

const QUICK_TEMPLATES = [
  {
    name: "Fresh Kashmiri Lavas Bread (4 pcs)",
    cat: "Bakery",
    price: 30,
    originalPrice: 40,
    unit: "4 pcs",
    brand: "Local Kandur",
    badge: "Hot Fresh",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&auto=format&fit=crop&q=80",
    stock: 120,
  },
  {
    name: "Amul Taaza Toned Fresh Milk 1L",
    cat: "Dairy",
    price: 66,
    originalPrice: 70,
    unit: "1 Litre",
    brand: "Amul",
    badge: "Daily Fresh",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
    stock: 200,
  },
  {
    name: "Amul Pasteurised Salted Butter 100g",
    cat: "Dairy",
    price: 58,
    originalPrice: 60,
    unit: "100g",
    brand: "Amul",
    badge: "Bestseller",
    img: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop&q=80",
    stock: 80,
  },
  {
    name: "Fresh Kashmiri Red Apples (1 kg)",
    cat: "Fruits",
    price: 140,
    originalPrice: 170,
    unit: "1 kg",
    brand: "Kashmir Orchards",
    badge: "Crisp Sweet",
    img: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80",
    stock: 60,
  },
  {
    name: "Lay's Magic Masala Potato Chips",
    cat: "Chips",
    price: 20,
    originalPrice: 20,
    unit: "50g",
    brand: "Lay's",
    badge: "Crunchy",
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
    stock: 150,
  },
  {
    name: "Maggi 2-Minute Masala Noodles (4-Pack)",
    cat: "Instant Food",
    price: 56,
    originalPrice: 60,
    unit: "280g",
    brand: "Nestle",
    badge: "Quick 2-Min",
    img: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80",
    stock: 100,
  },
  {
    name: "Coca-Cola Refreshing Soft Drink",
    cat: "Beverages",
    price: 40,
    originalPrice: 40,
    unit: "750 ml",
    brand: "Coca-Cola",
    badge: "Chilled",
    img: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
    stock: 90,
  },
  {
    name: "India Gate Basmati Rice Rozzana",
    cat: "Staples",
    price: 110,
    originalPrice: 125,
    unit: "1 kg",
    brand: "India Gate",
    badge: "Aromatic",
    img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
    stock: 50,
  },
  {
    name: "Tata Salt Vacuum Evaporated Iodized",
    cat: "Spices",
    price: 28,
    originalPrice: 28,
    unit: "1 kg",
    brand: "Tata",
    badge: "Purity",
    img: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=600&auto=format&fit=crop&q=80",
    stock: 100,
  },
  {
    name: "Dettol Original Germ Protection Soap",
    cat: "Personal Care",
    price: 38,
    originalPrice: 40,
    unit: "75g",
    brand: "Dettol",
    badge: "100% Protection",
    img: "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=600&auto=format&fit=crop&q=80",
    stock: 75,
  }
];

const VISUAL_IMAGE_PALETTE = [
  { label: "Kashmiri Lavas", url: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&auto=format&fit=crop&q=80", cat: "Bakery" },
  { label: "Fresh Milk", url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80", cat: "Dairy" },
  { label: "Salted Butter", url: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop&q=80", cat: "Dairy" },
  { label: "Kashmiri Apples", url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80", cat: "Fruits" },
  { label: "Chips & Crisps", url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80", cat: "Chips" },
  { label: "Cookies & Biscuits", url: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80", cat: "Biscuits" },
  { label: "Cold Drinks", url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80", cat: "Beverages" },
  { label: "Instant Noodles", url: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80", cat: "Instant Food" },
  { label: "Basmati Rice", url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80", cat: "Staples" },
  { label: "Salt & Spices", url: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=600&auto=format&fit=crop&q=80", cat: "Spices" },
  { label: "Chocolates", url: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80", cat: "Snacks" },
  { label: "Soaps & Hygiene", url: "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=600&auto=format&fit=crop&q=80", cat: "Personal Care" }
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

export default function AdminAccessGate() {
  const [currentUid, setCurrentUid] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  /* The session is restored from Firebase Auth, never from a sessionStorage
     flag: a flag is writable from devtools, so trusting it would let anyone
     open the console shell by typing one line in the browser. */
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = watchAuth(async (user) => {
      if (!user) {
        setCurrentUid("");
        setIsAuthenticated(false);
        return;
      }
      setCurrentUid(user.uid);
      const role = await getStaffRole(user.uid);
      if (role === "admin") {
        setIsAuthenticated(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("dashit_admin_email", user.email || "");
        }
      } else {
        setIsAuthenticated(false);
      }
    });
    return unsub;
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();

    if (!cleanEmail || !cleanPassword) {
      setLoginError("Please enter both administrator email and password.");
      setIsLoading(false);
      return;
    }

    /* Authentication is Firebase Auth, and authorisation is the staff/{uid}
       document — both are required. A correct password alone is not enough:
       every customer who signs up with email also has a valid Firebase account,
       so without the role check any of them could open the command console.
       There are deliberately no hardcoded "master" credentials here; this file
       ships to the browser, so anything hardcoded is public. */
    try {
      const res = await signInWithEmail(cleanEmail, cleanPassword);
      if (!res.success) {
        setLoginError(res.message || "Invalid administrator email or password. Access denied.");
        return;
      }

      const role = await getStaffRole(res.user?.uid);
      if (role !== "admin") {
        // The uid is shown so a real administrator can create
        // staff/<uid> = { role: "admin", active: true } in the Firebase console
        // without having to hunt for it — otherwise the first deploy of these
        // rules locks everyone out of their own store.
        const uid = res.user?.uid || "";
        await signOut();
        setLoginError(
          `This account is not authorised for the admin console. In the Firebase console create the document staff/${uid} with { role: "admin", active: true }.`
        );
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("dashit_admin_email", cleanEmail);
      }
      setIsAuthenticated(true);
    } catch (err) {
      setLoginError(err?.message || "Authentication error. Please check credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return <ProfessionalAdminDashboard isSandbox={false} currentUid={currentUid} />;
  }

  return (
    <div className="h-screen h-[100dvh] max-h-screen overflow-y-auto admin-scroll bg-[#090A0F] p-4 selection:bg-[#FF5B00] selection:text-white">
      <Head>
        <title>DASHIT — Partner Sign In</title>
        {/* Staff console: never indexed, never surfaced in search results. */}
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </Head>
      <div className="min-h-full flex items-center justify-center py-6">
        <div className="bg-[#12141A] border border-zinc-800 rounded-3xl shadow-2xl p-7 sm:p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-[#FF5B00]/25 flex items-center justify-center mx-auto text-[#FF5B00] shadow-inner">
          <ShieldAlert className="w-7 h-7" />
        </div>
        
        <div>
          <span className="text-[10.5px] font-black uppercase tracking-widest text-[#FF5B00] block mb-1">
            Restricted Partner Portal
          </span>
          <h1 className="font-black text-xl text-white tracking-tight">Store Console</h1>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1">
            Sign in with your store administrator email and password to manage orders and inventory.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-3.5 pt-1 text-left">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-300 block">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLoginError("");
                }}
                placeholder="admin@dashit.in"
                className="w-full bg-[#181B24] border border-zinc-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00] transition-colors"
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-300 block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError("");
                }}
                placeholder="••••••••"
                className="w-full bg-[#181B24] border border-zinc-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00] transition-colors"
                autoComplete="current-password"
              />
            </div>
          </div>

          {loginError && (
            <p className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-lg text-center">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-xs py-3 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            <span>{isLoading ? "Authenticating..." : "Access Command Console"}</span>
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-800 text-[10.5px] text-slate-500 flex items-center justify-between">
          <span>Anantnag</span>
          <span className="text-slate-400 font-mono">v1.2 Metis</span>
        </div>
        </div>
      </div>
    </div>
  );
}

// Helper to extract timestamp in milliseconds from an order object reliably
function getOrderTimestampMs(order) {
  if (!order) return 0;
  const ts = order.createdAt || order.timestamp;
  if (!ts) return 0;
  if (typeof ts === "number") return ts;
  if (typeof ts === "object" && ts.seconds) return ts.seconds * 1000;
  if (typeof ts === "string") {
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function ProfessionalAdminDashboard({ isSandbox = false, currentUid = "" }) {
  // Tabs: "orders" | "inventory" | "add-product" | "batch-inward" | "catalogue" | "csv" | "offers" | "importer" | "settings"
  const [activeTab, setActiveTab] = useState("orders");
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [orders, setOrders] = useState([]);

  // Logout Handler
  const handleAdminSignOut = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("dashit_admin_email");
    }
    try {
      await signOut();
    } catch (e) {}
    window.location.reload();
  };

  // Audio Chime & Notifications State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Orders tracking refs — guarantees past/historical orders NEVER fire notifications on login/reload
  const previousOrderIdsRef = useRef(new Set());
  const isInitialSyncDoneRef = useRef(false);
  const adminSessionStartTimeRef = useRef(Date.now());

  // Store Close Reason Modal & Presets
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("Night hours — reopening tomorrow at 7:00 AM");
  const [customReasonText, setCustomReasonText] = useState("");
  const [currentCloseReason, setCurrentCloseReason] = useState("");

  const CLOSE_REASON_PRESETS = [
    {
      id: "night",
      title: "Closed for Night Hours",
      subtitle: "Reopening tomorrow morning at 7:00 AM",
      text: "Night hours — reopening tomorrow at 7:00 AM",
      Icon: Moon,
      color: "text-indigo-400",
    },
    {
      id: "restocking",
      title: "Restocking Fresh Inventory",
      subtitle: "Fresh shipments arriving, available in 30 minutes",
      text: "Restocking fresh inventory — available in 30 minutes",
      Icon: Boxes,
      color: "text-amber-500",
    },
    {
      id: "weather",
      title: "Severe Weather / Heavy Rain or Snow",
      subtitle: "Pausing temporarily for delivery partner safety",
      text: "Severe weather conditions — pausing for delivery partner safety",
      Icon: CloudRain,
      color: "text-sky-400",
    },
    {
      id: "rush",
      title: "High Order Rush / Peak Surge",
      subtitle: "Briefly pausing new orders to clear delivery queue",
      text: "High order surge — pausing new orders for 20 minutes",
      Icon: Zap,
      color: "text-orange-500",
    },
    {
      id: "maintenance",
      title: "Store Maintenance & Stock Audit",
      subtitle: "Brief inventory count — back shortly",
      text: "Routine store maintenance & inventory audit — back shortly",
      Icon: Wrench,
      color: "text-slate-400",
    },
  ];

  // Add Product Form State
  const [productForm, setProductForm] = useState({
    name: "",
    cat: "Bakery",
    price: "",
    originalPrice: "",
    unit: "1 pc",
    brand: "Local Kandur",
    badge: "Fresh",
    barcode: "",
    img: VISUAL_IMAGE_PALETTE[0].url,
    stock: 100,
  });
  const [isPublishingProduct, setIsPublishingProduct] = useState(false);

  // Catalogue State
  const [catalogue, setCatalogue] = useState([]);
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState(false);

  // Offers State
  const [exclusiveOffers, setExclusiveOffers] = useState(DEFAULT_OFFERS);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({
    title: "",
    badge: "DASHIT EXCLUSIVE",
    subtitle: "Delivered to your doorstep in 8 minutes.",
    priceTag: "Flat 20% OFF",
    category: "Snacks",
    promoCode: "DASH20",
    discountPercent: 20,
    expiresIn: "Active Today",
    img: VISUAL_IMAGE_PALETTE[4].url,
    gradient: "from-[#040E22] via-[#061838] to-[#0A2558]",
    accent: "text-amber-400"
  });

  // Open Food Facts Importer
  const [offSearchQuery, setOffSearchQuery] = useState("");
  const [isSearchingOff, setIsSearchingOff] = useState(false);
  const [offResults, setOffResults] = useState([]);

  // COD Blacklist
  const [codBlacklist, setCodBlacklist] = useState(["9876543210"]);

  // Dark Mode Theme
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("dashit_admin_theme");
      if (savedTheme === "dark") {
        setDarkMode(true);
      } else if (savedTheme === "light") {
        setDarkMode(false);
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setDarkMode(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        document.documentElement.classList.remove("dark");
      }
    };
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("dashit_admin_theme", next ? "dark" : "light");
      }
      return next;
    });
  };

  // Barcode Scanner & 4K Photo Suggestions
  const [showScanner, setShowScanner] = useState(false);
  const [photo4KSuggestions, setPhoto4KSuggestions] = useState(get4KPhotoSuggestions("Bakery"));

  // Batch Inward Restock State
  const [showBatchScanner, setShowBatchScanner] = useState(false);
  const [batchInwardList, setBatchInwardList] = useState([]);
  const [batchPasteText, setBatchPasteText] = useState("");
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);

  const showToast = (msg, duration = 4000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  };

  // 1. Initialise Audio and permissions on user click
  const handleTestChime = async () => {
    unlockAudio();
    playOrderChime();
    const permGranted = await requestNotificationPermission();
    showToast(
      permGranted
        ? "Audio Chime and Desktop Notifications are active."
        : "Audio Chime tested. Enable notifications for popup alerts."
    );
  };

  // 2. Realtime Order watching with Sound Chime
  useEffect(() => {
    // Record the exact time admin session started / mounted
    adminSessionStartTimeRef.current = Date.now();
    isInitialSyncDoneRef.current = false;

    // Grace window: all orders received during initial connection (first 3s) are strictly seeded
    const initialSyncTimer = setTimeout(() => {
      isInitialSyncDoneRef.current = true;
    }, 3000);

    const handleNewOrdersList = (incomingOrders = []) => {
      setOrders(incomingOrders);

      // Auto-reconcile inventory for any placed orders so store inventory reflects all purchases
      incomingOrders.forEach((o) => {
        if (o && o.items && !o.inventoryDeducted && o.status !== "Cancelled") {
          deductInventoryForOrder(o.orderId || o.id, o.items).catch(() => {});
        }
      });

      // 1. Initial sync or connection warm-up: strictly register all existing order IDs, NEVER notify
      if (!isInitialSyncDoneRef.current) {
        incomingOrders.forEach((o) => {
          const id = String(o.orderId || o.id || "");
          if (id) previousOrderIdsRef.current.add(id);
        });
        return;
      }

      // 2. Online live mode: strictly identify orders created AFTER the admin logged in
      const freshOrders = incomingOrders.filter((o) => {
        const id = String(o.orderId || o.id || "");
        if (!id) return false;
        if (previousOrderIdsRef.current.has(id)) return false;

        const orderTime = getOrderTimestampMs(o);
        // Must have been created while admin is actively online (allow 10s clock skew)
        const isCreatedWhileOnline = orderTime > 0 && orderTime >= (adminSessionStartTimeRef.current - 10000);

        // Must be in initial "Placed" status
        const isPlaced = !o.status || String(o.status).toLowerCase() === "placed";

        return isCreatedWhileOnline && isPlaced;
      });

      // Register all incoming order IDs so we never alert repeatedly
      incomingOrders.forEach((o) => {
        const id = String(o.orderId || o.id || "");
        if (id) previousOrderIdsRef.current.add(id);
      });

      // 3. Trigger chime & visual desktop notification ONLY for genuinely new orders placed while online
      if (freshOrders.length > 0) {
        freshOrders.forEach((newOrd) => {
          if (soundEnabledRef.current) {
            notifyNewOrder(newOrd);
          }

          setNewOrderAlert(newOrd);
          setTimeout(() => setNewOrderAlert((prev) => (prev?.orderId === newOrd.orderId ? null : prev)), 15000);
        });
      }
    };

    let unsub = () => {};
    if (isFirebaseConfigured) {
      unsub = watchAllOrders(handleNewOrdersList);
    } else {
      const readLocal = () => {
        try {
          const hist = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
          const active = localStorage.getItem("dashit_active_order");
          let list = [...hist];
          if (active) {
            const parsed = JSON.parse(active);
            if (!list.some((o) => (o.orderId || o.id) === (parsed.orderId || parsed.id))) {
              list = [parsed, ...list];
            }
          }
          handleNewOrdersList(list);
        } catch (e) {}
      };
      readLocal();
      const interval = setInterval(readLocal, 4000);
      return () => {
        clearInterval(interval);
        clearTimeout(initialSyncTimer);
      };
    }

    return () => {
      clearTimeout(initialSyncTimer);
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // 3. Realtime Catalogue watching
  useEffect(() => {
    setIsLoadingCatalogue(true);
    const unsub = watchProducts((products) => {
      setCatalogue(products);
      setIsLoadingCatalogue(false);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // 4. Store Config watching (open/closed and closeReason)
  useEffect(() => {
    try {
      const cachedOpen = localStorage.getItem("dashit_store_open");
      if (cachedOpen !== null) setIsStoreOpen(JSON.parse(cachedOpen) !== false);
      const cachedReason = localStorage.getItem("dashit_store_close_reason");
      if (cachedReason) setCurrentCloseReason(cachedReason);
    } catch (e) {}

    if (isFirebaseConfigured) {
      const unsub = watchStoreConfig((cfg) => {
        if (cfg) {
          if (typeof cfg.isOpen === "boolean") {
            setIsStoreOpen(cfg.isOpen);
            try {
              localStorage.setItem("dashit_store_open", JSON.stringify(cfg.isOpen));
            } catch (e) {}
          }
          if (cfg.closeReason !== undefined) {
            setCurrentCloseReason(cfg.closeReason || "");
            try {
              localStorage.setItem("dashit_store_close_reason", cfg.closeReason || "");
            } catch (e) {}
          }
        }
      });
      return () => {
        if (typeof unsub === "function") unsub();
      };
    }
  }, []);

  // 5. Watch exclusive offers
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setExclusiveOffers(getExclusiveOffers());
      return;
    }
    const unsub = watchOffers((firestoreOffers) => {
      if (firestoreOffers && firestoreOffers.length > 0) {
        setExclusiveOffers(firestoreOffers);
      } else {
        setExclusiveOffers(getExclusiveOffers());
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Store Pause / Open Handlers
  /* Both directions confirm through an in-app modal.
     Opening used to call window.confirm(), which is unreliable inside the
     Capacitor WebView — it can return false without ever drawing a dialog, so
     the button looked completely dead and the store could not be opened. An
     ordinary React modal has no such dependency and works identically on the
     phone and the desktop. */
  const handleToggleStoreClick = () => {
    if (isStoreOpen) {
      setShowCloseModal(true);
    } else {
      setShowOpenModal(true);
    }
  };

  const handleConfirmOpenStore = async () => {
    setShowOpenModal(false);
    await handleOpenStoreDirect();
  };

  const handleOpenStoreDirect = async () => {
    setIsStoreOpen(true);
    setCurrentCloseReason("");
    try {
      localStorage.setItem("dashit_store_open", "true");
      localStorage.removeItem("dashit_store_close_reason");
    } catch (e) {}

    if (isFirebaseConfigured) {
      try {
        await setStoreConfig({ isOpen: true, closeReason: "" });
      } catch (err) {
        console.warn("Store open sync notice:", err?.message);
      }
    }
    showToast("Store is now OPEN. Deliveries resumed across Anantnag!");
  };

  const handleConfirmCloseStore = async () => {
    const finalReason = selectedReason === "custom" ? customReasonText.trim() : selectedReason;
    setIsStoreOpen(false);
    setCurrentCloseReason(finalReason);
    setShowCloseModal(false);

    try {
      localStorage.setItem("dashit_store_open", "false");
      if (finalReason) {
        localStorage.setItem("dashit_store_close_reason", finalReason);
      }
    } catch (e) {}

    if (isFirebaseConfigured) {
      try {
        await setStoreConfig({ isOpen: false, closeReason: finalReason });
      } catch (err) {
        console.warn("Store close sync notice:", err?.message);
      }
    }
    showToast(`Store paused. Reason shown to customers: "${finalReason}"`);
  };

  // Order Status Update
  const handleUpdateOrderStatus = async (orderId, newStatus, order = null) => {
    try {
      if (isFirebaseConfigured) {
        await fsUpdateOrderStatus(orderId, newStatus);
      }
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId || o.id === orderId ? { ...o, status: newStatus } : o))
      );

      // Auto-deduct stock on Out for Delivery
      if (newStatus === ORDER_STATUS.OUT_FOR_DELIVERY) {
        const ordObj = order || orders.find((o) => o.orderId === orderId || o.id === orderId);
        if (ordObj && ordObj.items && !ordObj.inventoryDeducted) {
          await deductInventoryForOrder(orderId, ordObj.items);
          showToast(`Order #${orderId} out for delivery. Auto-deducted inventory.`);
          return;
        }
      }

      showToast(`Order #${orderId} updated to "${newStatus}".`);
    } catch (err) {
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId || o.id === orderId ? { ...o, status: newStatus } : o))
      );
      showToast(`Order #${orderId} updated to "${newStatus}".`);
    }
  };

  // Assign Driver to Order
  const handleAssignDriver = async (orderId, driverId, driverName) => {
    try {
      await assignDriver(orderId, driverId, driverName);
      setOrders((prev) =>
        prev.map((o) =>
          (o.orderId === orderId || o.id === orderId)
            ? { ...o, driverId, driverName }
            : o
        )
      );
      if (driverName) {
        showToast(`Assigned ${driverName} to Order #${orderId}`);
      } else {
        showToast(`Driver unassigned from Order #${orderId}`);
      }
    } catch (err) {
      showToast(`Driver assignment note: ${err?.message}`);
    }
  };

  // Quick Stock Adjust
  const handleQuickStockAdjust = async (productId, delta) => {
    try {
      const newStock = await adjustSingleProductStock(productId, delta, false);
      showToast(`Stock updated: ${newStock} units`);
    } catch (err) {
      showToast(`Stock adjust note: ${err?.message}`);
    }
  };

  // Publish / Add Product
  const handlePublishProduct = async (e) => {
    if (e) e.preventDefault();
    if (!productForm.name.trim()) {
      alert("Please enter a product title.");
      return;
    }
    if (!productForm.price || Number(productForm.price) <= 0) {
      alert("Please enter a valid price.");
      return;
    }

    setIsPublishingProduct(true);
    const prodId = productForm.barcode || `prod-${Date.now()}`;
    const newProduct = {
      id: prodId,
      barcode: productForm.barcode || prodId,
      name: productForm.name.trim(),
      cat: productForm.cat,
      price: Number(productForm.price),
      originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : Number(productForm.price),
      unit: productForm.unit || "1 pc",
      brand: productForm.brand.trim() || "Indian Brand",
      badge: productForm.badge.trim() || "Fresh",
      img: productForm.img || VISUAL_IMAGE_PALETTE[0].url,
      stock: Number(productForm.stock) || 100,
      updatedAt: Date.now()
    };

    try {
      if (isFirebaseConfigured) {
        await upsertProduct(newProduct);
      }
      setCatalogue((prev) => {
        const idx = prev.findIndex((p) => p.id === prodId || p.barcode === prodId);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = newProduct;
          return copy;
        }
        return [newProduct, ...prev];
      });

      showToast(`Published "${newProduct.name}" to store.`);
      setProductForm({
        name: "",
        cat: "Bakery",
        price: "",
        originalPrice: "",
        unit: "1 pc",
        brand: "Local Kandur",
        badge: "Fresh",
        barcode: "",
        img: VISUAL_IMAGE_PALETTE[0].url,
        stock: 100,
      });
      setActiveTab("catalogue");
    } catch (err) {
      showToast(`Notice: ${err?.message || "Saved product"}`);
    } finally {
      setIsPublishingProduct(false);
    }
  };

  /* CSV import — the plan arriving here has already been confirmed line by line
     in CsvInventoryView, so this only commits it. bulkUpdateProductStock creates
     rows that do not exist yet and sets stock on the ones that do. */
  const handleApplyCsvImport = async (stockUpdates, summary) => {
    if (!stockUpdates || stockUpdates.length === 0) return { success: false };
    try {
      const res = await bulkUpdateProductStock(stockUpdates);
      const fresh = await fetchProducts();
      if (fresh && fresh.length > 0) setCatalogue(fresh);

      /* Only claim an import when it actually reached Firestore. A partial or
         rejected write leaves the plan on screen so the owner can retry it
         rather than being told it worked. */
      if (res?.failures?.length) {
        showToast(
          `${res.count} of ${res.attempted} saved — ${res.failures.length} rejected (${res.failures[0].reason}). Nothing else was changed.`,
          8000
        );
        return res;
      }
      if (res && res.syncedToServer === false) {
        showToast(
          `Saved on this device only — the store database did not accept the write. Check you are signed in as an admin.`,
          8000
        );
        return { ...res, success: false };
      }

      showToast(
        `Imported ${summary.approved} items (${summary.newItems} new, ${summary.restocks} restocked, ${summary.units} units).`
      );
      setActiveTab("inventory");
      return res;
    } catch (err) {
      showToast(`Import failed: ${err?.message || "Please try again."}`);
      return { success: false };
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id, name) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the store catalogue?`)) return;
    try {
      await fsDeleteProduct(id);
      showToast(`Removed "${name}" from store.`);
    } catch (err) {
      showToast(`Delete notice: ${err?.message}`);
    }
  };

  // Barcode Scanner: single item lookup
  const handleBarcodeScanned = async (scannedCode) => {
    setShowScanner(false);
    showToast(`Looking up barcode ${scannedCode}...`);
    try {
      const res = await searchOffByBarcode(scannedCode);
      if (res.success && res.products && res.products.length > 0) {
        const prod = res.products[0];
        const suggestions = prod.photoSuggestions || get4KPhotoSuggestions(prod.cat || "Snacks");
        setProductForm((prev) => ({
          ...prev,
          barcode: scannedCode,
          name: prod.name || prev.name,
          brand: prod.brand || prev.brand,
          cat: prod.cat || prev.cat,
          unit: prod.unit || prev.unit,
          price: prod.price || prev.price || 40,
          originalPrice: prod.originalPrice || prod.price || prev.originalPrice || 45,
          img: prod.img || suggestions[0] || prev.img,
          badge: prod.badge || "Verified",
          stock: prod.stock || 100,
        }));
        setPhoto4KSuggestions(suggestions);
        showToast(`Auto-filled "${prod.name}" with 4K studio photo.`);
      } else {
        setProductForm((prev) => ({ ...prev, barcode: scannedCode }));
        showToast(`Barcode ${scannedCode} captured.`);
      }
    } catch (err) {
      setProductForm((prev) => ({ ...prev, barcode: scannedCode }));
      showToast(`Captured barcode: ${scannedCode}`);
    }
  };

  // Batch Inward continuous scanning
  const handleBatchBarcodeScanned = async (scannedCode) => {
    const clean = String(scannedCode).trim();
    if (!clean) return;

    let foundExisting = false;
    setBatchInwardList((prev) => {
      const idx = prev.findIndex((item) => item.barcode === clean);
      if (idx !== -1) {
        foundExisting = true;
        const copy = [...prev];
        const item = copy[idx];
        const newQty = (item.qtyToAdd || 1) + 1;
        copy[idx] = {
          ...item,
          qtyToAdd: newQty,
          newStock: (item.currentStock || 0) + newQty,
        };
        showToast(`+1 ${item.name} (Inward: ${newQty})`);
        return copy;
      }
      return prev;
    });

    if (foundExisting) return;

    // Check existing catalogue
    const inCat = catalogue.find((p) => String(p.barcode || p.id) === clean);
    if (inCat) {
      const curStock = Number(inCat.stock) || 0;
      setBatchInwardList((prev) => [
        {
          id: inCat.id,
          barcode: clean,
          name: inCat.name,
          brand: inCat.brand || "Indian Brand",
          cat: inCat.cat || "Snacks",
          img: inCat.img,
          currentStock: curStock,
          qtyToAdd: 1,
          newStock: curStock + 1,
          product: inCat,
        },
        ...prev,
      ]);
      showToast(`+1 Added: ${inCat.name}`);
      return;
    }

    // Lookup via Open Food Facts
    try {
      const res = await searchOffByBarcode(clean);
      if (res.success && res.products && res.products.length > 0) {
        const prod = res.products[0];
        setBatchInwardList((prev) => [
          {
            id: clean,
            barcode: clean,
            name: prod.name,
            brand: prod.brand || "Indian Brand",
            cat: prod.cat || "Snacks",
            img: prod.img,
            currentStock: 0,
            qtyToAdd: 1,
            newStock: 1,
            product: prod,
          },
          ...prev,
        ]);
        showToast(`+1 Added: ${prod.name}`);
      } else {
        setBatchInwardList((prev) => [
          {
            id: clean,
            barcode: clean,
            name: `Product ${clean}`,
            brand: "Custom",
            cat: "Snacks",
            img: VISUAL_IMAGE_PALETTE[4].url,
            currentStock: 0,
            qtyToAdd: 1,
            newStock: 1,
            product: {
              id: clean,
              barcode: clean,
              name: `Product ${clean}`,
              cat: "Snacks",
              price: 40,
              originalPrice: 45,
              unit: "1 pc",
              img: VISUAL_IMAGE_PALETTE[4].url,
            },
          },
          ...prev,
        ]);
        showToast(`+1 Added: Barcode ${clean}`);
      }
    } catch (e) {
      showToast(`Added barcode: ${clean}`);
    }
  };

  // Apply Batch Inward Restock
  const handleApplyBatchInward = async () => {
    if (batchInwardList.length === 0) return;
    try {
      const updates = batchInwardList.map((item) => ({
        id: item.id || item.barcode,
        barcode: item.barcode,
        qtyToAdd: item.qtyToAdd,
        calculatedStock: item.newStock,
        product: item.product,
      }));
      const inwardRes = await bulkUpdateProductStock(updates);
      if (inwardRes?.failures?.length) {
        showToast(
          `${inwardRes.count} of ${inwardRes.attempted} saved — ${inwardRes.failures.length} rejected by the store database.`,
          8000
        );
        return;
      }
      const totalUnits = batchInwardList.reduce((acc, curr) => acc + (curr.qtyToAdd || 1), 0);
      showToast(`Restocked +${totalUnits} units across ${batchInwardList.length} products.`);
      setBatchInwardList([]);
      setShowBatchScanner(false);
      setActiveTab("inventory");
    } catch (err) {
      showToast(`Batch update notice: ${err?.message}`);
    }
  };

  // Bulk Paste list parser
  const handleApplyBulkPaste = async () => {
    if (!batchPasteText.trim()) return;
    const lines = batchPasteText.split("\n").map((l) => l.trim()).filter(Boolean);
    let count = 0;
    for (const line of lines) {
      const parts = line.split(/[,\t]+/).map((s) => s.trim());
      const code = parts[0];
      const qty = Number(parts[1]) || 1;
      if (code) {
        await handleBatchBarcodeScanned(code);
        if (qty > 1) {
          setBatchInwardList((prev) => {
            const copy = [...prev];
            const idx = copy.findIndex((i) => i.barcode === code);
            if (idx !== -1) {
              copy[idx].qtyToAdd = qty;
              copy[idx].newStock = (copy[idx].currentStock || 0) + qty;
            }
            return copy;
          });
        }
        count += 1;
      }
    }
    setBatchPasteText("");
    setShowBulkPasteModal(false);
    showToast(`Processed ${count} items from paste list.`);
  };

  // Save Banner Offer
  const handleSaveOffer = async (e) => {
    if (e) e.preventDefault();
    if (!offerForm.title.trim()) {
      alert("Please enter an offer title.");
      return;
    }
    const newOffer = {
      id: `offer-${Date.now()}`,
      badge: offerForm.badge || "DASHIT EXCLUSIVE",
      title: offerForm.title.trim(),
      subtitle: offerForm.subtitle.trim(),
      priceTag: offerForm.priceTag.trim(),
      category: offerForm.category || "Snacks",
      promoCode: offerForm.promoCode || "DASHIT",
      discountPercent: Number(offerForm.discountPercent) || 20,
      expiresIn: offerForm.expiresIn || "Active Today",
      img: offerForm.img || VISUAL_IMAGE_PALETTE[4].url,
      gradient: "from-[#040E22] via-[#061838] to-[#0A2558]",
      accent: "text-amber-400",
      active: true,
      createdAt: Date.now()
    };
    try {
      if (isFirebaseConfigured) {
        await saveOffer(newOffer);
      }
      addExclusiveOffer(newOffer);
      setExclusiveOffers(getExclusiveOffers());
      setShowOfferModal(false);
      showToast(`Banner offer "${newOffer.title}" published.`);
    } catch (err) {
      showToast(`Offer notice: ${err?.message}`);
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!confirm("Remove this promo banner?")) return;
    try {
      if (isFirebaseConfigured) {
        await fsDeleteOffer(id);
      }
      deleteExclusiveOffer(id);
      setExclusiveOffers((p) => p.filter((o) => o.id !== id));
      showToast("Offer removed.");
    } catch (err) {
      showToast(`Delete notice: ${err?.message}`);
    }
  };

  // OFF Importer Search
  const handleSearchOff = async () => {
    const term = offSearchQuery.trim();
    if (!term) return;

    setIsSearchingOff(true);
    const isBarcode = /^\d{8,14}$/.test(term);
    const data = isBarcode ? await searchOffByBarcode(term) : await searchOffByQuery(term);
    if (data.success && data.products) {
      setOffResults(data.products);
    } else {
      alert(data.message || "No Indian FMCG products found for this term.");
      setOffResults([]);
    }
    setIsSearchingOff(false);
  };

  const handleImportOffProduct = (item) => {
    setProductForm({
      name: item.name || "",
      cat: item.cat || "Snacks",
      price: item.price || 40,
      originalPrice: item.originalPrice || 45,
      unit: item.unit || "1 pc",
      brand: item.brand || "Indian Brand",
      badge: "Verified",
      barcode: item.id || item.barcode || "",
      img: item.img || VISUAL_IMAGE_PALETTE[4].url,
      stock: 100,
    });
    setPhoto4KSuggestions(item.photoSuggestions || get4KPhotoSuggestions(item.cat || "Snacks"));
    setActiveTab("add-product");
    showToast(`Loaded "${item.name}" into Add Product form.`);
  };

  // Inventory Summary
  const inventorySummary = useMemo(() => {
    const totalUnits = catalogue.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const lowStockCount = catalogue.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 10).length;
    const outOfStockCount = catalogue.filter((p) => !p.stock || Number(p.stock) <= 0).length;
    return { totalUnits, lowStockCount, outOfStockCount };
  }, [catalogue]);

  const activeOrdersCount = orders.filter(
    (o) => o.status !== ORDER_STATUS.DELIVERED && o.status !== ORDER_STATUS.CANCELLED
  ).length;

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount || o.total) || 0), 0);

  return (
    <AdminLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isStoreOpen={isStoreOpen}
      currentCloseReason={currentCloseReason}
      onToggleStoreClick={handleToggleStoreClick}
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      soundEnabled={soundEnabled}
      onToggleSound={() => setSoundEnabled(!soundEnabled)}
      onTestChime={handleTestChime}
      onSignOut={handleAdminSignOut}
      activeOrdersCount={activeOrdersCount}
      lowStockCount={inventorySummary.lowStockCount}
      catalogueCount={catalogue.length}
      newOrderAlert={newOrderAlert}
      onDismissNewOrderAlert={() => setNewOrderAlert(null)}
      toastMessage={toastMessage}
      onDismissToast={() => setToastMessage(null)}
    >
      {/* KPI METRICS OVERVIEW STRIP (Inspired by Metis Bootstrap Admin) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          className={`p-4 rounded-2xl border transition-colors ${
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Live Active Orders
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FF5B00]/10 text-[#FF5B00] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {activeOrdersCount}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">
            Needs picking, packing or dispatch
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-colors ${
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Warehouse Stock
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {inventorySummary.totalUnits.toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">
            {inventorySummary.lowStockCount > 0 ? (
              <span className="text-amber-500 font-black">{inventorySummary.lowStockCount} items low in stock</span>
            ) : (
              "Total inventory units ready"
            )}
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-colors ${
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Store Catalogue
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {catalogue.length}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">
            Retail products active online
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-colors ${
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Processed Volume (GMV)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">
            Total sales processed
          </p>
        </div>
      </div>

      {/* ACTIVE TAB RENDER */}
      {activeTab === "orders" && (
        <OrderProcessingView
          orders={orders}
          onUpdateStatus={handleUpdateOrderStatus}
          onAssignDriver={handleAssignDriver}
          onNavigateTab={setActiveTab}
          darkMode={darkMode}
        />
      )}

      {activeTab === "drivers" && (
        <DriversView
          orders={orders}
          darkMode={darkMode}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === "inventory" && (
        <InventoryView
          catalogue={catalogue}
          onQuickStockAdjust={handleQuickStockAdjust}
          onNavigateTab={setActiveTab}
          darkMode={darkMode}
        />
      )}

      {activeTab === "add-product" && (
        <AddProductView
          productForm={productForm}
          setProductForm={setProductForm}
          photoSuggestions={photo4KSuggestions}
          setPhotoSuggestions={setPhoto4KSuggestions}
          onOpenScanner={() => setShowScanner(true)}
          onPublishProduct={handlePublishProduct}
          isPublishing={isPublishingProduct}
          quickTemplates={QUICK_TEMPLATES}
          categories={CATEGORIES}
          visualPalette={VISUAL_IMAGE_PALETTE}
          darkMode={darkMode}
        />
      )}

      {activeTab === "batch-inward" && (
        <BatchInwardView
          batchInwardList={batchInwardList}
          setBatchInwardList={setBatchInwardList}
          onOpenContinuousScanner={() => setShowBatchScanner(true)}
          onOpenBulkPasteModal={() => setShowBulkPasteModal(true)}
          onApplyBatchInward={handleApplyBatchInward}
          darkMode={darkMode}
        />
      )}

      {activeTab === "catalogue" && (
        <CatalogueView
          catalogue={catalogue}
          onDeleteProduct={handleDeleteProduct}
          onNavigateTab={setActiveTab}
          darkMode={darkMode}
        />
      )}

      {activeTab === "offers" && (
        <OffersView
          exclusiveOffers={exclusiveOffers}
          onOpenOfferModal={() => setShowOfferModal(true)}
          onDeleteOffer={handleDeleteOffer}
          darkMode={darkMode}
        />
      )}

      {activeTab === "csv" && (
        <CsvInventoryView
          catalogue={catalogue}
          onApplyImport={handleApplyCsvImport}
          darkMode={darkMode}
        />
      )}

      {activeTab === "importer" && (
        <ImporterView
          searchQuery={offSearchQuery}
          setSearchQuery={setOffSearchQuery}
          onSearch={handleSearchOff}
          isSearching={isSearchingOff}
          results={offResults}
          onImportProduct={handleImportOffProduct}
          darkMode={darkMode}
        />
      )}

      {activeTab === "settings" && (
        <StoreControlsView
          isStoreOpen={isStoreOpen}
          currentCloseReason={currentCloseReason}
          onToggleStoreClick={handleToggleStoreClick}
          codBlacklist={codBlacklist}
          onAddBlacklist={(num) => {
            setCodBlacklist((p) => [...p, num]);
            showToast(`Blocked +91-${num} from COD orders.`);
          }}
          onRemoveBlacklist={(num) => {
            setCodBlacklist((p) => p.filter((n) => n !== num));
            showToast(`Removed +91-${num} from blacklist.`);
          }}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onTestChime={handleTestChime}
          darkMode={darkMode}
        />
      )}

      {/* PAUSE STORE REASONS MODAL */}
      {/* Confirm before putting the store live. Mobile-first sizing: full-width
          on a phone, centred card on a desktop. */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
          <div
            className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 border space-y-4 pb-[max(20px,env(safe-area-inset-bottom,20px))] sm:pb-6 ${
              darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF5B00]/10 text-[#FF5B00] flex items-center justify-center shrink-0">
                <Power className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">Open the store?</h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Customers can order the moment you confirm.
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
              Orders will start reaching the store and riders straight away.
              Check that staff are on shift and stock is ready.
            </p>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  darkMode
                    ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOpenStore}
                className="px-4 py-2.5 rounded-lg bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Open store
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`rounded-3xl p-6 border shadow-2xl max-w-md w-full space-y-4 relative animate-in fade-in zoom-in-95 ${
              darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between border-b pb-3 border-slate-200/50 dark:border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-black border border-rose-500/20 shrink-0">
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Pause Store Deliveries</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">Why are you pausing deliveries right now?</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-300 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300">
              Customers in Anantnag will see: <span className="font-bold text-slate-900 dark:text-white">&quot;Store will be available: (Reason)&quot;</span> on the app banner. Select a reason or enter a custom one:
            </p>

            <div className="space-y-2">
              {CLOSE_REASON_PRESETS.map((preset) => {
                const isSelected = selectedReason === preset.text;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedReason(preset.text)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                      isSelected
                        ? "border-[#FF5B00] bg-orange-500/10 ring-2 ring-[#FF5B00]/20"
                        : darkMode
                        ? "border-zinc-800 bg-[#1A1D26] hover:border-zinc-700"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      <preset.Icon className={`w-4 h-4 ${preset.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-black text-xs text-slate-900 dark:text-white block">{preset.title}</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium leading-tight block mt-0.5">
                        {preset.subtitle}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center mt-1 shrink-0 ${
                        isSelected ? "border-[#FF5B00] bg-[#FF5B00]" : "border-slate-300 dark:border-zinc-700 bg-transparent"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}

              {/* Custom Reason */}
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  selectedReason === "custom"
                    ? "border-[#FF5B00] bg-orange-500/10 ring-2 ring-[#FF5B00]/20"
                    : darkMode
                    ? "border-zinc-800 bg-[#1A1D26]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedReason("custom")}
                  className="w-full text-left flex items-start space-x-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Edit3 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-black text-xs text-slate-900 dark:text-white block">Custom / Specific Reason</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium block mt-0.5">
                      Type your own custom message to display to customers
                    </span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center mt-1 shrink-0 ${
                      selectedReason === "custom" ? "border-[#FF5B00] bg-[#FF5B00]" : "border-slate-300 dark:border-zinc-700 bg-transparent"
                    }`}
                  >
                    {selectedReason === "custom" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>

                {selectedReason === "custom" && (
                  <div className="mt-2.5 pt-2 border-t border-orange-200/60 dark:border-zinc-750">
                    <input
                      type="text"
                      placeholder="e.g. Back in 45 mins after Friday prayers / Stock audit"
                      value={customReasonText}
                      onChange={(e) => setCustomReasonText(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#FF5B00] ${
                        darkMode
                          ? "bg-[#14161E] border-zinc-700 text-white placeholder:text-zinc-500"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                Keep Store Open
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseStore}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer active:scale-95 flex items-center space-x-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Confirm & Pause Store</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE ITEM BARCODE SCANNER MODAL */}
      {showScanner && (
        <BarcodeScannerView
          onDetected={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
          darkMode={darkMode}
          title="Scan Packaging Barcode (Single Item)"
          continuous={false}
        />
      )}

      {/* CONTINUOUS BATCH BARCODE INWARD SCANNER */}
      {showBatchScanner && (
        <BarcodeScannerView
          onDetected={handleBatchBarcodeScanned}
          onClose={() => setShowBatchScanner(false)}
          darkMode={darkMode}
          title="Continuous Inward Barcode Scanner"
          continuous={true}
        />
      )}

      {/* BULK PASTE RESTOCK MODAL */}
      {showBulkPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`rounded-3xl p-6 border shadow-2xl max-w-lg w-full space-y-4 relative animate-in fade-in zoom-in-95 ${
              darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between border-b pb-3 border-slate-200/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-black">
                  <ArrowDownToLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Bulk Paste Barcodes List</h3>
                  <p className="text-[11px] text-zinc-400 font-medium">Paste rows formatted as: barcode, quantity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkPasteModal(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">
                Enter 1 barcode per line (optional: comma or tab separated quantity)
              </label>
              <textarea
                rows={6}
                value={batchPasteText}
                onChange={(e) => setBatchPasteText(e.target.value)}
                placeholder={`8901058852331, 24\n8901262010015, 12\n8901491101837, 50`}
                className={`w-full font-mono text-xs p-3 rounded-2xl border outline-none ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-emerald-500"
                    : "bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500"
                }`}
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200/50">
              <button
                type="button"
                onClick={() => setShowBulkPasteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkPaste}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Parse & Queue Inward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW BANNER OFFER MODAL */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`rounded-3xl p-6 border shadow-2xl max-w-md w-full space-y-4 relative animate-in fade-in zoom-in-95 ${
              darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between border-b pb-3 border-slate-200/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">New Storefront Banner Drop</h3>
                  <p className="text-[11px] text-zinc-400 font-medium">Add top promo card to customer homepage</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOfferModal(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">Headline / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kashmiri Apples & Fresh Bakes"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm((p) => ({ ...p, title: e.target.value }))}
                  className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                    darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. DASHIT EXCLUSIVE"
                    value={offerForm.badge}
                    onChange={(e) => setOfferForm((p) => ({ ...p, badge: e.target.value }))}
                    className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                      darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">Price Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 20% OFF"
                    value={offerForm.priceTag}
                    onChange={(e) => setOfferForm((p) => ({ ...p, priceTag: e.target.value }))}
                    className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                      darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">Promo Code</label>
                  <input
                    type="text"
                    placeholder="e.g. DASH20"
                    value={offerForm.promoCode}
                    onChange={(e) => setOfferForm((p) => ({ ...p, promoCode: e.target.value.toUpperCase() }))}
                    className={`w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border outline-none ${
                      darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">Category</label>
                  <select
                    value={offerForm.category}
                    onChange={(e) => setOfferForm((p) => ({ ...p, category: e.target.value }))}
                    className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                      darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Delivered to your doorstep in 8 minutes."
                  value={offerForm.subtitle}
                  onChange={(e) => setOfferForm((p) => ({ ...p, subtitle: e.target.value }))}
                  className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                    darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">Banner Image URL</label>
                <input
                  type="url"
                  value={offerForm.img}
                  onChange={(e) => setOfferForm((p) => ({ ...p, img: e.target.value }))}
                  className={`w-full text-xs font-mono px-3 py-2 rounded-xl border outline-none ${
                    darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Publish Banner Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
