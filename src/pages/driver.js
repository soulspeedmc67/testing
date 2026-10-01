import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";

// Runs before the first paint in the browser; on the server it can't run, so it is an effect there.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
import Head from "next/head";
import {
  Bike,
  Navigation,
  Phone,
  Volume2,
  CheckCircle2,
  Check,
  AlertCircle,
  RefreshCw,
  LogOut,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  IndianRupee,
  MapPin,
  Package,
  X,
  Play,
  Clock,
  Power,
  Compass,
  Lock,
  PhoneCall,
  MessageSquare,
  Layers,
  ChevronRight,
  Sparkles,
  User
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  watchDriverOrders,
  pushDriverTelemetryToQueue,
  updateOrderStatus,
  ORDER_STATUS
} from "../lib/db";
import {
  watchAuth,
  getDriverStatus,
  signInWithEmail,
  registerOrSignInDriver,
  signOut
} from "../lib/auth";
import { isFirebaseConfigured, getFirebaseAuth } from "../lib/firebase";
import { ANANTNAG_LOCALITIES } from "../lib/maps";
import { requestScreenWakeLock, releaseScreenWakeLock } from "../lib/wakeLock";
import { orderAddress } from "../lib/orderReceipt";
import { DRIVER_LANGUAGES, DRIVER_STRINGS } from "../lib/driverTranslations";

// Lal Chowk Dark Store Hub default coordinates
const DARK_STORE_HUB = { latitude: 33.735832, longitude: 75.143614 };
/** Longest gap between position updates, even standing still. */
const TELEMETRY_PUSH_INTERVAL_MS = 20000;
/** Shortest gap while riding. */
const TELEMETRY_MIN_INTERVAL_MS = 4000;

/** Straight-line metres between two { latitude, longitude } points. */
function metresBetween(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

class SoundAlerts {
  constructor() {
    this.ctx = null;
    this.repeatingTimer = null;
  }
  init() {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    } catch (e) {}
  }
  playTone(freq, duration = 0.2, type = "sine", gainVal = 0.3) {
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
  startNewOrderAlarm() {
    this.stopAlarm();
    this.init();
    let step = 0;
    const tick = () => {
      this.playTone(step % 2 === 0 ? 880 : 660, 0.25, "square", 0.35);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate([300, 150, 300]); } catch (e) {}
      }
      step++;
    };
    tick();
    this.repeatingTimer = setInterval(tick, 900);
  }
  stopAlarm() {
    if (this.repeatingTimer) {
      clearInterval(this.repeatingTimer);
      this.repeatingTimer = null;
    }
  }
  playSuccess() {
    this.stopAlarm();
    this.playTone(523.25, 0.15, "triangle", 0.3);
    setTimeout(() => this.playTone(659.25, 0.15, "triangle", 0.3), 120);
    setTimeout(() => this.playTone(783.99, 0.3, "triangle", 0.35), 240);
  }
  playError() {
    this.playTone(200, 0.18, "sawtooth", 0.3);
    setTimeout(() => this.playTone(140, 0.25, "sawtooth", 0.35), 150);
  }
}
const soundAlerts = new SoundAlerts();

export default function DashItDriverApp() {
  // 1. Language & Voice
  const [lang, setLang] = useState("ur");
  const [showLangSheet, setShowLangSheet] = useState(false);
  const strings = DRIVER_STRINGS[lang] || DRIVER_STRINGS.ur;

  // Preview mode support for automated testing and documentation screenshots
  const [previewMode, setPreviewMode] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const prev = sp.get("preview");
      const pLang = sp.get("lang");
      if (pLang && DRIVER_STRINGS[pLang]) {
        setLang(pLang);
      } else {
        const savedLang = localStorage.getItem("dashit_rider_lang");
        if (savedLang && DRIVER_STRINGS[savedLang]) {
          setLang(savedLang);
        }
      }

      if (prev) {
        setPreviewMode(prev);
        setAuthReady(true);
        if (prev === "phone") {
          setUser(null);
          setStaffRole(null);
          setAuthStep("phone");
          setInputPhone("");
        } else if (prev === "name") {
          setUser(null);
          setStaffRole(null);
          setAuthStep("name");
          setInputPhone("9876543210");
          setInputName("Tariq Ahmad");
        } else if (prev === "pin") {
          setUser(null);
          setStaffRole(null);
          setAuthStep("pin");
          setInputPhone("9876543210");
          setInputPin("123");
        } else if (prev === "waiting_onduty") {
          setUser({ uid: "preview_rider" });
          setStaffRole("driver");
          setOnDuty(true);
          setAssignedOrders([]);
        } else if (prev === "waiting_offduty") {
          setUser({ uid: "preview_rider" });
          setStaffRole("driver");
          setOnDuty(false);
          setAssignedOrders([]);
        } else if (prev === "new_order") {
          setUser({ uid: "preview_rider" });
          setStaffRole("driver");
          setOnDuty(true);
          setAssignedOrders([
            {
              id: "DASH-4912",
              orderId: "DASH-4912",
              status: "Placed",
              userAddress: { area: "KP Road", city: "Anantnag", street: "Near Stadium, House 4B" },
              items: [{}, {}, {}],
              paymentMethod: "COD",
              totalAmount: 390,
              otp: "8841",
              customerPhone: "+919876543210"
            }
          ]);
        } else if (prev === "en_route") {
          setUser({ uid: "preview_rider" });
          setStaffRole("driver");
          setOnDuty(true);
          setAssignedOrders([
            {
              id: "DASH-4912",
              orderId: "DASH-4912",
              status: "Out for Delivery",
              userAddress: { area: "KP Road", city: "Anantnag", street: "Near Stadium, House 4B" },
              items: [{}, {}, {}],
              paymentMethod: "COD",
              totalAmount: 390,
              otp: "8841",
              customerPhone: "+919876543210"
            }
          ]);
          setReachedDoor(false);
          setShowDoneScreen(false);
        } else if (prev === "door_cash") {
          setUser({ uid: "preview_rider" });
          setStaffRole("driver");
          setOnDuty(true);
          setAssignedOrders([
            {
              id: "DASH-4912",
              orderId: "DASH-4912",
              status: "Out for Delivery",
              userAddress: { area: "KP Road", city: "Anantnag", street: "Near Stadium, House 4B" },
              items: [{}, {}, {}],
              paymentMethod: "COD",
              totalAmount: 390,
              otp: "8841",
              customerPhone: "+919876543210"
            }
          ]);
          setReachedDoor(true);
          setCashCollected(false);
        } else if (prev === "door_code") {
          setUser({ uid: "preview_rider" });
          setStaffRole("driver");
          setOnDuty(true);
          setAssignedOrders([
            {
              id: "DASH-4912",
              orderId: "DASH-4912",
              status: "Out for Delivery",
              userAddress: { area: "KP Road", city: "Anantnag", street: "Near Stadium, House 4B" },
              items: [{}, {}, {}],
              paymentMethod: "Prepaid",
              totalAmount: 390,
              otp: "8841",
              customerPhone: "+919876543210"
            }
          ]);
          setReachedDoor(true);
          setCashCollected(true);
          setEnteredCode("88");
        } else if (prev === "done") {
          setUser({ uid: "preview_rider" });
          setStaffRole("driver");
          setShowDoneScreen(true);
          setTodayDeliveredCount(8);
        } else if (prev === "multidrop") {
          setUser({ uid: "preview_rider" });
          setStaffRole("driver");
          setOnDuty(true);
          setAssignedOrders([
            {
              id: "DASH-4912",
              orderId: "DASH-4912",
              status: "Out for Delivery",
              userAddress: { area: "KP Road", city: "Anantnag", street: "Near Stadium, House 4B" },
              items: [{}, {}, {}],
              paymentMethod: "COD",
              totalAmount: 390,
              otp: "8841",
              customerPhone: "+919876543210"
            },
            {
              id: "DASH-4915",
              orderId: "DASH-4915",
              status: "Placed",
              userAddress: { area: "Khanabal", city: "Anantnag", street: "Main Chowk, Shop 2" },
              items: [{}, {}],
              paymentMethod: "Prepaid",
              totalAmount: 540,
              otp: "3192",
              customerPhone: "+919876543211"
            },
            {
              id: "DASH-4918",
              orderId: "DASH-4918",
              status: "Packed",
              userAddress: { area: "Mattan", city: "Anantnag", street: "Sun Temple Road" },
              items: [{}],
              paymentMethod: "COD",
              totalAmount: 180,
              otp: "6240",
              customerPhone: "+919876543212"
            }
          ]);
          setReachedDoor(false);
          setShowDoneScreen(false);
        }
      }
    }
  }, []);

  const handleSelectLanguage = (selectedLang) => {
    setLang(selectedLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("dashit_rider_lang", selectedLang);
    }
    setShowLangSheet(false);
  };

  const speak = useCallback((text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const l = DRIVER_LANGUAGES.find((x) => x.id === lang);
      utterance.lang = l?.speechLang || "ur-PK";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }, [lang]);

  // 2. Auth & Role. These start empty on the server and the client alike, so
  // hydration matches; the saved session is read just before the first paint,
  // so a returning rider still never sees the dial pad flash up on launch.
  const [cachedSession, setCachedSession] = useState(null);
  const [user, setUser] = useState(null);
  const [staffRole, setStaffRole] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);
  // Signed up but not approved by the owner yet: no orders, just a waiting screen.
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [authStep, setAuthStep] = useState("phone"); // "phone" | "name" | "pin"
  const [inputPhone, setInputPhone] = useState("");
  const [inputName, setInputName] = useState("");
  const [inputPin, setInputPin] = useState("");
  const [authError, setAuthError] = useState("");
  const [isPinShaking, setIsPinShaking] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useIsomorphicLayoutEffect(() => {
    let saved = null;
    try {
      const raw = localStorage.getItem("dashit_driver_session");
      saved = raw ? JSON.parse(raw) : null;
    } catch (e) {}
    if (!saved) return;
    setCachedSession(saved);
    setUser(saved);
    setStaffRole("driver");
    setAuthReady(true);
    setInputPhone(saved.phone || "");
    setInputName(saved.name || "");
  }, []);

  // Load saved phone if any
  useEffect(() => {
    if (typeof window !== "undefined" && !window.location.search.includes("preview=")) {
      const savedPhone = localStorage.getItem("dashit_rider_saved_phone");
      if (savedPhone && !inputPhone) setInputPhone(savedPhone);
    }
  }, [inputPhone]);

  // Subscribe to Firebase Auth
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("preview=")) {
      return;
    }
    const unsub = watchAuth(async (fbUser) => {
      if (!fbUser) {
        if (!window.location.search.includes("preview=")) {
          try { localStorage.removeItem("dashit_driver_session"); } catch (e) {}
          setUser(null);
          setStaffRole(null);
          setIsDeactivated(false);
          setIsPendingApproval(false);
          setAuthReady(true);
        }
        return;
      }
      setUser(fbUser);
      try {
        let status = await getDriverStatus(fbUser.uid);
        if (status === "none") {
          // If the staff document write is in progress, briefly pause and recheck
          await new Promise((r) => setTimeout(r, 800));
          status = await getDriverStatus(fbUser.uid);
        }
        setStaffRole("driver");
        setIsDeactivated(status === "off");
        // No record at all counts as waiting: it can't see anything either way.
        setIsPendingApproval(status === "pending" || status === "none");

        // Cache session for instant subsequent cold launches
        if (typeof window !== "undefined") {
          try {
            const riderPhone = inputPhone || fbUser.phoneNumber || cachedSession?.phone || "";
            const session = {
              uid: fbUser.uid,
              phone: riderPhone,
              email: fbUser.email || "",
              name: fbUser.displayName || cachedSession?.name || `Rider ${riderPhone.slice(-4)}`,
              savedAt: Date.now()
            };
            localStorage.setItem("dashit_driver_session", JSON.stringify(session));
            if (riderPhone) {
              localStorage.setItem("dashit_rider_saved_phone", riderPhone);
            }
          } catch (e) {}
        }
      } catch (e) {
        setStaffRole("driver");
        setIsPendingApproval(true);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [cachedSession, inputPhone]);

  const handlePhoneDigit = (d) => {
    if (inputPhone.length < 10) {
      setInputPhone((prev) => prev + d);
      setAuthError("");
    }
  };

  const handlePhoneBackspace = () => {
    setInputPhone((prev) => prev.slice(0, -1));
    setAuthError("");
  };

  const handlePhoneConfirm = () => {
    if (inputPhone.length !== 10) {
      setAuthError("Enter 10 digits");
      soundAlerts.playError();
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("dashit_rider_saved_phone", inputPhone);
    }
    setInputPin("");
    setAuthError("");
    // Returning riders who already gave a real name go straight to the PIN.
    const knownName = String(cachedSession?.name || "").trim();
    const hasRealName = knownName !== "" && !/^Rider \d{4}$/.test(knownName);
    setAuthStep(hasRealName ? "pin" : "name");
  };

  const handlePinDigit = async (d) => {
    if (inputPin.length >= 4 || isAuthLoading) return;
    const nextPin = inputPin + d;
    setInputPin(nextPin);
    setAuthError("");

    if (nextPin.length === 4) {
      // Trigger sign-in or auto-registration
      setIsAuthLoading(true);
      try {
        const res = await registerOrSignInDriver(inputPhone, nextPin, inputName.trim());
        if (!res?.success) {
          throw new Error(res?.message || "Wrong PIN");
        }
        if (typeof window !== "undefined") {
          const session = {
            uid: res.user.uid,
            phone: inputPhone,
            name: inputName.trim() || res.user.displayName || `Rider ${inputPhone.slice(-4)}`,
            email: res.user.email,
            savedAt: Date.now()
          };
          localStorage.setItem("dashit_driver_session", JSON.stringify(session));
          localStorage.setItem("dashit_rider_saved_phone", inputPhone);
          if (inputName.trim()) localStorage.setItem("dashit_rider_name", inputName.trim());
        }
        setUser(res.user);
        setStaffRole("driver");
        setAuthReady(true);
        soundAlerts.playSuccess();
      } catch (err) {
        setIsPinShaking(true);
        soundAlerts.playError();
        speak(strings.wrongPin);
        setAuthError(strings.wrongPin);
        setTimeout(() => {
          setIsPinShaking(false);
          setInputPin("");
        }, 800);
      } finally {
        setIsAuthLoading(false);
      }
    }
  };

  const handlePinBackspace = () => {
    if (isAuthLoading) return;
    setInputPin((prev) => prev.slice(0, -1));
    setAuthError("");
  };

  const handleSignOut = async () => {
    soundAlerts.stopAlarm();
    releaseScreenWakeLock();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("dashit_driver_session");
      } catch (e) {}
    }
    await signOut();
    setUser(null);
    setStaffRole(null);
    setAuthStep("phone");
    setInputPin("");
    setAuthReady(true);
  };

  // 3. Shift / Duty State
  const [onDuty, setOnDuty] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDuty = localStorage.getItem("dashit_rider_on_duty");
      if (savedDuty !== null) setOnDuty(savedDuty !== "false");
    }
  }, []);

  const handleToggleDuty = () => {
    const next = !onDuty;
    setOnDuty(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("dashit_rider_on_duty", String(next));
    }
    if (next) {
      soundAlerts.playSuccess();
      speak(strings.onDuty);
    } else {
      soundAlerts.stopAlarm();
      speak(strings.offDuty);
    }
  };

  // 4. Assigned Orders Listener (SINGLE listener, only orders assigned to this rider)
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("preview=")) {
      return;
    }
    if (!user?.uid || isDeactivated || isPendingApproval) {
      setAssignedOrders([]);
      return;
    }
    const unsub = watchDriverOrders(user.uid, (orders) => {
      setAssignedOrders(orders || []);
    });
    return () => unsub();
  }, [user?.uid, isDeactivated, isPendingApproval]);

  // While waiting, look again every few seconds: the screen opens by itself once approved.
  useEffect(() => {
    if (!user?.uid || !isPendingApproval) return;
    let stopped = false;
    const look = async () => {
      const status = await getDriverStatus(user.uid);
      if (stopped) return;
      if (status === "approved") setIsPendingApproval(false);
      else if (status === "off") {
        setIsPendingApproval(false);
        setIsDeactivated(true);
      }
    };
    const timer = setInterval(look, 8000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [user?.uid, isPendingApproval]);

  // Current active order
  const activeOrder = assignedOrders[activeQueueIndex] || assignedOrders[0] || null;

  // 5. Delivery Workflow States
  // 'waiting' | 'new_order' | 'en_route' | 'cash_collection' | 'code_entry' | 'done'
  const [reachedDoor, setReachedDoor] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");
  const [isCodeShaking, setIsCodeShaking] = useState(false);
  const [showDoneScreen, setShowDoneScreen] = useState(false);
  const [todayDeliveredCount, setTodayDeliveredCount] = useState(0);

  // Load today's count
  const todayKey = useMemo(() => {
    const d = new Date();
    return `dashit_driver_delivered_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.location.search.includes("preview=")) {
      const savedCount = parseInt(localStorage.getItem(todayKey) || "0", 10);
      setTodayDeliveredCount(savedCount);
    }
  }, [todayKey]);

  // Alert triggers when new assigned order arrives
  const isOrderPlacedOrPacked = activeOrder && (
    activeOrder.status === ORDER_STATUS.PLACED ||
    activeOrder.status === ORDER_STATUS.PACKED ||
    activeOrder.status === "Packing"
  );
  const isOrderOutForDelivery = activeOrder && activeOrder.status === ORDER_STATUS.OUT_FOR_DELIVERY;

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("preview=")) {
      return;
    }
    if (isOrderPlacedOrPacked && onDuty) {
      soundAlerts.startNewOrderAlarm();
      requestScreenWakeLock();
      speak(strings.speechNewOrder);
    } else {
      soundAlerts.stopAlarm();
    }
    return () => {
      soundAlerts.stopAlarm();
    };
  }, [isOrderPlacedOrPacked, onDuty, speak, strings.speechNewOrder]);

  // Reset internal door states on order switch
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("preview=")) {
      return;
    }
    setReachedDoor(false);
    setCashCollected(false);
    setEnteredCode("");
  }, [activeOrder?.orderId, activeOrder?.id]);

  // 6. GPS Tracking - ALWAYS ON when onDuty is true, silently broadcasting telemetry in background
  const [currentCoords, setCurrentCoords] = useState(DARK_STORE_HUB);
  const lastPushTimestampRef = useRef(0);
  const lastPushedCoordsRef = useRef(null);
  const watchPositionIdRef = useRef(null);

  const startGps = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (watchPositionIdRef.current !== null) return;

    watchPositionIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading || 0,
          speed: pos.coords.speed || 0,
          accuracy: Math.round(pos.coords.accuracy || 0),
        };
        setCurrentCoords(coords);

        /* Customers see the rider move, so fixes go out often while riding, and
           rarely while standing still (each one is a billed Firestore write).
           A rough fix (worse than 60 m, e.g. indoors) waits for a better one,
           unless nothing has gone out for a while. */
        const now = Date.now();
        const since = now - lastPushTimestampRef.current;
        const last = lastPushedCoordsRef.current;
        const moved = last ? metresBetween(last, coords) : Infinity;
        const precise = !coords.accuracy || coords.accuracy <= 60;
        const due =
          (precise && moved >= 12 && since >= TELEMETRY_MIN_INTERVAL_MS) ||
          since >= TELEMETRY_PUSH_INTERVAL_MS;
        if (due && user?.uid) {
          lastPushTimestampRef.current = now;
          lastPushedCoordsRef.current = coords;
          const activeOrderIds = assignedOrders.map((o) => o.orderId || o.id).filter(Boolean);
          // One write per order (the queue fan-out) plus the rider's own document.
          await pushDriverTelemetryToQueue(user.uid, activeOrderIds, coords).catch(() => {});
        }
      },
      (err) => {
        console.warn("GPS error:", err?.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, [assignedOrders, user?.uid]);

  const stopGps = useCallback(() => {
    if (typeof window !== "undefined" && navigator.geolocation && watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }
  }, []);

  // GPS tracking is always active while driver is on duty (no toggle required)
  useEffect(() => {
    if (typeof window === "undefined" || window.location.search.includes("preview=")) {
      return;
    }
    if (!onDuty) {
      stopGps();
    } else {
      startGps();
    }
    return () => stopGps();
  }, [onDuty, startGps, stopGps]);

  // 7. Embedded Google Maps Target Resolution & Live Directions URL
  const targetCoords = useMemo(() => {
    if (!activeOrder) return DARK_STORE_HUB;
    if (activeOrder.location?.lat && activeOrder.location?.lng) {
      return { latitude: Number(activeOrder.location.lat), longitude: Number(activeOrder.location.lng) };
    }
    if (activeOrder.location?.latitude && activeOrder.location?.longitude) {
      return { latitude: Number(activeOrder.location.latitude), longitude: Number(activeOrder.location.longitude) };
    }
    if (activeOrder.userAddress?.coords?.lat && activeOrder.userAddress?.coords?.lng) {
      return { latitude: Number(activeOrder.userAddress.coords.lat), longitude: Number(activeOrder.userAddress.coords.lng) };
    }
    const area = (activeOrder.userAddress?.area || activeOrder.userAddress?.city || "").toLowerCase();
    const match = ANANTNAG_LOCALITIES.find(
      (l) => l.name.toLowerCase().includes(area) || l.area.toLowerCase().includes(area) || l.aliases?.some((a) => area.includes(a))
    );
    if (match) {
      return { latitude: match.lat, longitude: match.lng };
    }
    return { latitude: 33.7290, longitude: 75.1550 };
  }, [activeOrder]);

  const targetLat = targetCoords.latitude;
  const targetLng = targetCoords.longitude;

  // Embedded Google Maps Directions URL (from live GPS coords to customer drop)
  const googleMapsEmbedUrl = useMemo(() => {
    const origin = `${currentCoords.latitude},${currentCoords.longitude}`;
    const dest = `${targetLat},${targetLng}`;
    return `https://maps.google.com/maps?saddr=${origin}&daddr=${dest}&output=embed`;
  }, [currentCoords.latitude, currentCoords.longitude, targetLat, targetLng]);

  // 8. User Actions
  // START Delivery
  const handleStartDelivery = async () => {
    if (!activeOrder) return;
    soundAlerts.stopAlarm();
    soundAlerts.playSuccess();
    const oId = activeOrder.orderId || activeOrder.id;
    await updateOrderStatus(oId, ORDER_STATUS.OUT_FOR_DELIVERY);
    speak(strings.speechReached);
  };

  // Open Turn-by-Turn Navigation in external Google Maps app
  const handleOpenNavigation = () => {
    if (!activeOrder || typeof window === "undefined") return;
    // In the rider app (Android), straight into Google Maps' turn-by-turn; the
    // app hands any non-web link to the phone, like tel: for calls.
    const isAndroidApp = window.Capacitor?.getPlatform?.() === "android";
    if (isAndroidApp) {
      window.location.href = `google.navigation:q=${targetLat},${targetLng}&mode=d`;
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}&travelmode=driving`;
    window.open(url, "_blank", "noopener") || (window.location.href = url);
  };

  // Call Customer
  const handleCallCustomer = () => {
    // The shop apps save the number as `mobile`; older orders used the others.
    const raw = String(
      activeOrder?.mobile || activeOrder?.customerPhone || activeOrder?.phone || activeOrder?.userAddress?.phone || ""
    ).replace(/[^\d+]/g, "");
    if (!raw) {
      speak(strings.noPhone || "No phone number on this order");
      return;
    }
    const phone = raw.startsWith("+") ? raw : raw.length === 10 ? `+91${raw}` : raw;
    window.location.href = `tel:${phone}`;
  };

  // Listen Address Aloud
  const handleListenAddress = () => {
    if (!activeOrder) return;
    const addr = orderAddress(activeOrder, "Address on order");
    const landmark = activeOrder.landmark || activeOrder.userAddress?.landmark || "";
    const speech = landmark ? `${addr}. Landmark: ${landmark}` : addr;
    speak(speech);
  };

  // Reached Customer Door
  const handleReachedDoor = () => {
    soundAlerts.playSuccess();
    setReachedDoor(true);
    const isCOD = isCashOnDelivery(activeOrder);
    if (isCOD && !cashCollected) {
      speak(`${strings.takeCashAmount} ₹${orderTotal}`);
    } else {
      speak(strings.speechAskCode);
    }
  };

  // Code entry key taps
  const handleCodeDigit = async (d) => {
    if (enteredCode.length >= 4) return;
    const next = enteredCode + d;
    setEnteredCode(next);

    if (next.length === 4) {
      const expected = String(activeOrder?.otp || "").trim();
      // Verify against order OTP
      if (expected && next !== expected) {
        setIsCodeShaking(true);
        soundAlerts.playError();
        speak(strings.wrongCode);
        setTimeout(() => {
          setIsCodeShaking(false);
          setEnteredCode("");
        }, 700);
      } else {
        // Correct code! Complete Delivery!
        soundAlerts.playSuccess();
        confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });

        const oId = activeOrder.orderId || activeOrder.id;
        await updateOrderStatus(oId, ORDER_STATUS.DELIVERED, {
          deliveryCode: next,
          enteredOtp: next,
        });

        // Increment today's count
        const newCount = todayDeliveredCount + 1;
        setTodayDeliveredCount(newCount);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(todayKey, String(newCount));
          } catch (e) {}
        }

        setShowDoneScreen(true);
        speak(strings.speechDelivered);

        setTimeout(() => {
          setShowDoneScreen(false);
          setReachedDoor(false);
          setCashCollected(false);
          setEnteredCode("");
          // Advance queue index if more orders
          if (assignedOrders.length > 1) {
            setActiveQueueIndex((prev) => (prev + 1) % assignedOrders.length);
          }
        }, 2500);
      }
    }
  };

  const handleCodeBackspace = () => {
    setEnteredCode((prev) => prev.slice(0, -1));
  };

  // Helper properties
  const isCOD = activeOrder && isCashOnDelivery(activeOrder);
  const orderTotal = activeOrder?.totalAmount || activeOrder?.total || 0;
  const bagCount = activeOrder?.items?.length || 1;
  // The first part of the address ("Court Road"), as riders know the town by its areas.
  const areaName =
    activeOrder?.userAddress?.area ||
    (activeOrder?.location?.address || "").split(",").map((p) => p.trim()).find((p) => p && !/^\d+$/.test(p) && !/anantnag/i.test(p)) ||
    activeOrder?.userAddress?.city ||
    "Anantnag";

  function isCashOnDelivery(ord) {
    if (!ord) return true;
    const pm = String(ord.paymentMethod || "").toLowerCase();
    const ps = String(ord.paymentStatus || "").toLowerCase();
    if (pm.includes("online") || pm.includes("upi") || pm.includes("card") || pm.includes("prepaid")) return false;
    if (ps === "paid" || ps === "completed" || ps === "captured") return false;
    return true;
  }

  // ------------------------------------------------ RENDERING ------------------------------------------------

  // Screen 0: Initial Session Boot Check (Prevents dial pad flashing)
  if (!authReady && !user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 max-w-md mx-auto select-none">
        <Head>
          <title>DASHit Driver</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        </Head>
        <div className="w-20 h-20 rounded-3xl bg-[#FF5B00] flex items-center justify-center shadow-2xl animate-pulse">
          <Bike className="w-10 h-10 text-white" />
        </div>
        <div className="mt-4 flex items-center space-x-2 text-slate-400 font-mono text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-[#FF5B00]" />
          <span>Starting rider app…</span>
        </div>
      </div>
    );
  }

  // Screen 1: Auth (Not logged in)
  if (!user || !staffRole) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 max-w-md mx-auto select-none">
        <Head>
          <title>DASHit Driver</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        </Head>

        {/* Top Language Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5B00] flex items-center justify-center font-black shadow-lg">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <span className="font-mono font-black text-xl tracking-wider">DASHit</span>
          </div>

          <button
            type="button"
            onClick={() => setShowLangSheet(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-bold text-sm flex items-center space-x-1.5 active:scale-95"
          >
            <span className="text-base font-extrabold">{DRIVER_LANGUAGES.find((l) => l.id === lang)?.label}</span>
            <span>{strings.langName}</span>
          </button>
        </div>

        {/* Middle Input / Display */}
        <div className="my-auto text-center space-y-4">
          {authStep === "name" ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-[#FF5B00]">
                <User className="w-8 h-8" />
              </div>
              <input
                type="text"
                autoCapitalize="words"
                autoComplete="name"
                maxLength={40}
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder={strings.enterName}
                className="w-full h-16 rounded-2xl bg-slate-800 border border-slate-700 px-4 text-center text-2xl font-black text-white placeholder:text-slate-600 focus:outline-none focus:border-[#FF5B00]"
              />
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => setAuthStep("phone")}
                  className="h-16 w-20 rounded-2xl bg-slate-800/60 active:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700/40 active:scale-95"
                >
                  <ArrowLeft className="w-7 h-7" />
                </button>
                <button
                  type="button"
                  disabled={inputName.trim().length < 2}
                  onClick={() => setAuthStep("pin")}
                  className="flex-1 h-16 rounded-2xl bg-emerald-600 disabled:opacity-40 text-white font-black text-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          ) : authStep === "phone" ? (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-[#FF5B00]">
                <Phone className="w-8 h-8" />
              </div>
              <div className="min-h-[56px] flex items-center justify-center">
                <span className="font-mono text-3xl font-black tracking-widest text-slate-100">
                  {inputPhone ? (
                    inputPhone.replace(/(\d{5})(\d{1,5})/, "$1 $2")
                  ) : (
                    <span className="text-slate-600">__________</span>
                  )}
                </span>
              </div>
              {authError && <p className="text-rose-400 font-bold text-sm">{authError}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-amber-500">
                <Lock className="w-8 h-8" />
              </div>
              <div className={"flex items-center justify-center space-x-3 min-h-[48px] " + (isPinShaking ? "animate-shake" : "")}>
                {[0, 1, 2, 3].map((idx) => {
                  const filled = inputPin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={"w-5 h-5 rounded-full transition-all " + (
                        isPinShaking
                          ? "bg-rose-500 ring-4 ring-rose-500/30"
                          : filled
                          ? "bg-emerald-500 ring-4 ring-emerald-500/30"
                          : "bg-slate-700"
                      )}
                    />
                  );
                })}
              </div>
              {authError && <p className="text-rose-400 font-bold text-sm">{authError}</p>}
            </div>
          )}
        </div>

        {/* Bottom Large Number Pad */}
        <div className={"space-y-2 pb-4 " + (authStep === "name" ? "hidden" : "")}>
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => (authStep === "phone" ? handlePhoneDigit(String(num)) : handlePinDigit(String(num)))}
                className="h-16 rounded-2xl bg-slate-800 active:bg-slate-700 text-3xl font-black font-mono text-white flex items-center justify-center shadow-md border border-slate-700/60 active:scale-95"
              >
                {num}
              </button>
            ))}

            {authStep === "phone" ? (
              <div />
            ) : (
              <button
                type="button"
                onClick={() => setAuthStep("phone")}
                className="h-16 rounded-2xl bg-slate-800/60 active:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700/40 active:scale-95"
              >
                <ArrowLeft className="w-7 h-7" />
              </button>
            )}

            <button
              type="button"
              onClick={() => (authStep === "phone" ? handlePhoneDigit("0") : handlePinDigit("0"))}
              className="h-16 rounded-2xl bg-slate-800 active:bg-slate-700 text-3xl font-black font-mono text-white flex items-center justify-center shadow-md border border-slate-700/60 active:scale-95"
            >
              0
            </button>

            <button
              type="button"
              onClick={authStep === "phone" ? handlePhoneBackspace : handlePinBackspace}
              className="h-16 rounded-2xl bg-slate-800/80 active:bg-slate-700 text-slate-400 flex items-center justify-center border border-slate-700/60 active:scale-95"
            >
              ⌫
            </button>
          </div>

          {authStep === "phone" && (
            <button
              type="button"
              disabled={inputPhone.length !== 10}
              onClick={handlePhoneConfirm}
              className="w-full h-16 rounded-2xl bg-emerald-600 disabled:opacity-40 text-white font-black text-2xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-8 h-8 stroke-[3]" />
            </button>
          )}
        </div>

        {/* Language Bottom Sheet */}
        {showLangSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs">
            <div className="w-full max-w-md bg-slate-900 border-t border-slate-800 rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-black text-lg">Language / زبان / भाषा</span>
                <button type="button" onClick={() => setShowLangSheet(false)} className="p-2 text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-2.5">
                {DRIVER_LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSelectLanguage(l.id)}
                    className={"w-full h-16 rounded-2xl border text-xl font-bold flex items-center justify-between px-6 active:scale-95 " + (
                      lang === l.id ? "bg-[#FF5B00] text-white border-[#FF5B00]" : "bg-slate-800 text-slate-200 border-slate-700"
                    )}
                  >
                    <span>{l.label}</span>
                    {lang === l.id && <Check className="w-7 h-7 stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Screen 1b: signed up, waiting for the owner's approval
  if (isPendingApproval) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-md mx-auto">
        <div className="w-24 h-24 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border-2 border-amber-500/40">
          <Clock className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black">{strings.waitingApproval}</h2>
          <p className="text-slate-400 text-sm">{strings.waitingApprovalHint}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            const status = await getDriverStatus(user.uid);
            if (status === "approved") setIsPendingApproval(false);
          }}
          className="px-6 py-4 rounded-2xl bg-emerald-600 font-black text-base"
        >
          {strings.checkAgain}
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 font-bold text-sm text-slate-300"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Screen 2: Deactivated
  if (isDeactivated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-md mx-auto">
        <div className="w-24 h-24 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center border-2 border-rose-500/40">
          <Power className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black">{strings.turnedOff}</h2>
          <p className="text-slate-400 text-sm">Please contact your store admin.</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 font-bold text-sm text-slate-300"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Screen 3: Done Screen
  if (showDoneScreen) {
    return (
      <div className="min-h-screen bg-emerald-600 text-white flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-md mx-auto select-none">
        <Head>
          <title>Delivered ✓</title>
        </Head>
        <div className="w-32 h-32 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-2xl animate-in zoom-in-75">
          <Check className="w-20 h-20 stroke-[3.5]" />
        </div>

        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight">{strings.orderDelivered}</h1>
          <p className="text-emerald-100 text-lg font-bold">{strings.todayDeliveries}</p>
        </div>

        {/* Big Box Icon + Delivered Count */}
        <div className="p-6 rounded-3xl bg-emerald-700/60 border border-emerald-400/40 flex items-center space-x-4">
          <Package className="w-14 h-14 text-emerald-200 stroke-[2.5]" />
          <span className="font-mono text-5xl font-black">{todayDeliveredCount}</span>
        </div>
      </div>
    );
  }

  // Screen 4: Waiting Screen (No active assigned order)
  if (!activeOrder) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 max-w-md mx-auto select-none">
        <Head>
          <title>DASHit Driver — Ready</title>
        </Head>

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-11 h-11 rounded-2xl bg-[#061838] flex items-center justify-center p-2">
              <img src="/dashit-mark-white.png" alt="" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className={"w-3 h-3 rounded-full " + (onDuty ? "bg-emerald-500 animate-pulse" : "bg-slate-600")} />
              <span className="font-extrabold text-sm">{onDuty ? strings.onDuty : strings.offDuty}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => speak(strings.speechWait)}
              className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center active:scale-95"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowLangSheet(true)}
              className="h-11 px-4 rounded-xl bg-slate-800 border border-slate-700 font-bold text-sm flex items-center space-x-1 active:scale-95"
            >
              <span className="text-base font-extrabold">{DRIVER_LANGUAGES.find((l) => l.id === lang)?.label}</span>
            </button>
          </div>
        </div>

        {/* Calm Resting Illustration */}
        <div className="my-auto text-center space-y-6">
          <div className="w-56 h-56 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center relative">
            <img
              src="/rider/rider_180.png"
              alt=""
              width={256}
              height={256}
              className="w-52 h-52 object-contain"
            />
            {onDuty && (
              <div className="absolute top-6 right-6 w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-100">{strings.waitingOrder}</h2>
            <p className="text-slate-400 font-medium text-sm">{strings.todayDeliveries}: {todayDeliveredCount}</p>
          </div>
        </div>

        {/* Bottom On Duty / Off Duty Big Switch */}
        <div className="pb-4 space-y-3">
          <button
            type="button"
            onClick={handleToggleDuty}
            className={"w-full h-20 rounded-3xl font-black text-xl flex items-center justify-between px-6 shadow-xl transition-all cursor-pointer active:scale-98 " + (
              onDuty ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 border border-slate-700"
            )}
          >
            <div className="flex items-center space-x-3">
              <Power className="w-8 h-8" />
              <span>{onDuty ? strings.onDuty : strings.offDuty}</span>
            </div>
            <div className={"w-14 h-8 rounded-full p-1 transition-colors " + (onDuty ? "bg-white/30" : "bg-slate-700")}>
              <div className={"w-6 h-6 rounded-full bg-white transition-transform " + (onDuty ? "translate-x-6" : "translate-x-0")} />
            </div>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            aria-label={strings.signOut}
            className="w-full h-12 rounded-2xl text-slate-400 font-bold text-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            <span>{strings.signOut}</span>
          </button>
        </div>

        {/* Language Modal */}
        {showLangSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs">
            <div className="w-full max-w-md bg-slate-900 border-t border-slate-800 rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-black text-lg">Language / زبان / भाषा</span>
                <button type="button" onClick={() => setShowLangSheet(false)} className="p-2 text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-2.5">
                {DRIVER_LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSelectLanguage(l.id)}
                    className={"w-full h-16 rounded-2xl border text-xl font-bold flex items-center justify-between px-6 active:scale-95 " + (
                      lang === l.id ? "bg-[#FF5B00] text-white border-[#FF5B00]" : "bg-slate-800 text-slate-200 border-slate-700"
                    )}
                  >
                    <span>{l.label}</span>
                    {lang === l.id && <Check className="w-7 h-7 stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Screen 5: Active Delivery (Unified view with Pinned Multi-Drop Queue, Embedded Google Maps, and Bottom Action Sheet)
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between max-w-md mx-auto select-none">
      <Head>
        <title>DASHit Driver — Delivery</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>

      {/* Top bar: on or off duty, language, sign out. Nothing else to read. */}
      <div className="bg-slate-900 px-4 pt-3 pb-3 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={handleToggleDuty}
          className={"h-11 px-4 rounded-2xl font-extrabold text-base flex items-center gap-2.5 border active:scale-95 transition-transform " + (
            onDuty ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400 border-slate-700"
          )}
        >
          <span className={"w-3 h-3 rounded-full " + (onDuty ? "bg-emerald-400 animate-pulse" : "bg-slate-500")} />
          <span>{onDuty ? strings.onDuty : strings.offDuty}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLangSheet(true)}
            className="h-11 px-4 rounded-2xl bg-slate-800 border border-slate-700 text-slate-100 flex items-center active:scale-95"
          >
            <span className="text-base font-extrabold">{DRIVER_LANGUAGES.find((l) => l.id === lang)?.label}</span>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label={strings.signOut}
            className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center active:scale-95"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* More than one order: big numbers, one per order. Amber is new, blue is on the way. */}
      {assignedOrders.length > 1 && (
        <div className="bg-slate-900 px-4 pb-3 flex items-center gap-3 overflow-x-auto no-scrollbar shrink-0">
          {assignedOrders.map((ord, idx) => {
            const isSelected = idx === activeQueueIndex;
            const isOut = ord.status === ORDER_STATUS.OUT_FOR_DELIVERY;
            return (
              <button
                key={ord.orderId || ord.id || idx}
                type="button"
                aria-label={`${idx + 1}`}
                onClick={() => {
                  setActiveQueueIndex(idx);
                  setReachedDoor(false);
                  setCashCollected(false);
                  setEnteredCode("");
                }}
                className={"shrink-0 w-14 h-14 rounded-2xl font-black text-2xl tabular-nums flex items-center justify-center border-2 active:scale-95 transition-transform " + (
                  isSelected
                    ? (isOut ? "bg-sky-600 border-sky-300 text-white" : "bg-amber-500 border-amber-200 text-slate-950")
                    : (isOut ? "bg-sky-500/15 border-sky-500/40 text-sky-300" : "bg-amber-500/15 border-amber-500/40 text-amber-300")
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* The map */}
      <div className="relative w-full flex-1 min-h-[200px] bg-slate-800 overflow-hidden">
        <iframe
          title="Delivery Route Map"
          src={googleMapsEmbedUrl}
          // Pinned to the box: a percentage height doesn't fill a flex-sized box,
          // so the map stayed at the browser's default iframe height.
          className="absolute inset-0 w-full h-full border-0 select-none"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Where, how much, and what to do */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 pt-4 pb-5 shrink-0 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-[#FF5B00] flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-2xl leading-tight text-white truncate">{areaName}</p>
              <p className="text-slate-400 text-sm line-clamp-1 mt-0.5">
                {orderAddress(activeOrder, "")}
              </p>
            </div>
          </div>

          {isCOD ? (
            <div className="shrink-0 rounded-2xl bg-amber-500/15 border border-amber-500/40 px-3.5 py-2 text-right">
              <span className="flex items-center justify-end gap-1 text-[11px] font-bold text-amber-300 leading-none">
                <IndianRupee className="w-3.5 h-3.5" />
                {strings.cashToCollect}
              </span>
              <span dir="ltr" className="mt-1 block font-black text-[28px] leading-none tabular-nums text-amber-300">₹{orderTotal}</span>
            </div>
          ) : (
            <div className="shrink-0 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 px-3.5 py-3 flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-black text-base">{strings.paidOnline}</span>
            </div>
          )}
        </div>

        {/* Three big buttons: an icon and one word each */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Navigation, label: strings.map, onClick: handleOpenNavigation, tone: "bg-sky-600 active:bg-sky-700 text-white" },
            { icon: PhoneCall, label: strings.call, onClick: handleCallCustomer, tone: "bg-emerald-600 active:bg-emerald-700 text-white" },
            { icon: Volume2, label: strings.listen, onClick: handleListenAddress, tone: "bg-amber-500 active:bg-amber-600 text-slate-950" },
          ].map(({ icon: Icon, label, onClick, tone }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={"h-[84px] rounded-3xl flex flex-col items-center justify-center gap-1.5 font-extrabold text-[15px] active:scale-95 transition-transform " + tone}
            >
              <Icon className="w-8 h-8 stroke-[2.4]" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Delivery Flow Action */}
        {isOrderPlacedOrPacked ? (
          // State 1: Placed / Packed -> "Start Delivery"
          <div className="pt-1">
            <button
              type="button"
              onClick={handleStartDelivery}
              className="w-full h-[72px] rounded-3xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <Play className="w-8 h-8 fill-current" />
              <span>{strings.startDelivery}</span>
            </button>
          </div>
        ) : !reachedDoor ? (
          // State 2: En Route -> "Arrived at Door"
          <div className="pt-1">
            <button
              type="button"
              onClick={handleReachedDoor}
              className="w-full h-[72px] rounded-3xl bg-[#FF5B00] hover:bg-[#ff6e1a] active:bg-[#e04e00] text-white font-black text-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <Check className="w-9 h-9 stroke-[3]" />
              <span>{strings.reached}</span>
            </button>
          </div>
        ) : isCOD && !cashCollected ? (
          // State 3: At Door & COD & Cash not yet confirmed
          <div className="pt-1 space-y-2">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <IndianRupee className="w-5 h-5 text-amber-400" />
                <span className="font-black text-lg text-amber-300">
                  {strings.takeCashAmount}: <span dir="ltr" className="font-black text-3xl tabular-nums text-amber-200 inline-block">₹{orderTotal}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => speak(`${strings.takeCashAmount} ₹${orderTotal}`)}
                className="p-1 text-amber-400"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setReachedDoor(false)}
                aria-label="back"
                className="w-16 h-[72px] rounded-3xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center active:scale-95"
              >
                <ArrowLeft className="w-7 h-7" />
              </button>
              <button
                type="button"
                onClick={() => {
                  soundAlerts.playSuccess();
                  setCashCollected(true);
                  speak(strings.speechAskCode);
                }}
                className="flex-1 h-[72px] rounded-3xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <Check className="w-8 h-8 stroke-[3]" />
                <span>{strings.cashTaken} <span dir="ltr" className="inline-block">₹{orderTotal}</span></span>
              </button>
            </div>
          </div>
        ) : (
          // State 4: At Door -> Enter 4-Digit OTP Code
          <div className="pt-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isCOD) setCashCollected(false);
                    else setReachedDoor(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-base font-extrabold text-slate-100">{strings.askCustomerCode}</span>
              </div>
              <button
                type="button"
                onClick={() => speak(strings.speechAskCode)}
                className="p-1 text-emerald-400"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Large Dots */}
            <div className={"flex items-center justify-center space-x-4 min-h-[44px] " + (isCodeShaking ? "animate-shake" : "")}>
              {[0, 1, 2, 3].map((idx) => {
                const filled = enteredCode.length > idx;
                return (
                  <div
                    key={idx}
                    className={"w-7 h-7 rounded-full transition-all " + (
                      isCodeShaking
                        ? "bg-rose-500 ring-4 ring-rose-500/30"
                        : filled
                        ? "bg-emerald-500 ring-4 ring-emerald-500/30"
                        : "bg-slate-800 border-2 border-slate-700"
                    )}
                  />
                );
              })}
            </div>

            {/* Compact On-Screen Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleCodeDigit(String(num))}
                  className="h-14 rounded-2xl bg-slate-800 active:bg-slate-700 text-2xl font-black tabular-nums text-white flex items-center justify-center border border-slate-700/60 active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (isCOD) setCashCollected(false);
                  else setReachedDoor(false);
                }}
                aria-label="cancel"
                className="h-14 rounded-2xl bg-slate-800/60 active:bg-slate-700 text-slate-400 flex items-center justify-center border border-slate-700/40 active:scale-95"
              >
                <X className="w-7 h-7" />
              </button>
              <button
                type="button"
                onClick={() => handleCodeDigit("0")}
                className="h-14 rounded-2xl bg-slate-800 active:bg-slate-700 text-2xl font-black tabular-nums text-white flex items-center justify-center border border-slate-700/60 active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleCodeBackspace}
                className="h-14 rounded-2xl bg-slate-800/80 active:bg-slate-700 text-slate-400 text-2xl flex items-center justify-center border border-slate-700/60 active:scale-95"
              >
                ⌫
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Language Bottom Sheet */}
      {showLangSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border-t border-slate-800 rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-black text-lg">Language / زبان / भाषा</span>
              <button type="button" onClick={() => setShowLangSheet(false)} className="p-2 text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-2.5">
              {DRIVER_LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => handleSelectLanguage(l.id)}
                  className={"w-full h-16 rounded-2xl border text-xl font-bold flex items-center justify-between px-6 active:scale-95 " + (
                    lang === l.id ? "bg-[#FF5B00] text-white border-[#FF5B00]" : "bg-slate-800 text-slate-200 border-slate-700"
                  )}
                >
                  <span>{l.label}</span>
                  {lang === l.id && <Check className="w-7 h-7 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
