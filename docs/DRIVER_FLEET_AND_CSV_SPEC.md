# DASHit — Driver Fleet Multi-Drop Tracking & Admin CSV Suite Specification

> **Document Type:** Production Engineering Specification & Implementation Blueprint  
> **Target Applications:** DASHit Rider Console (`src/pages/driver.js`), DASHit Admin Dashboard (`src/pages/admin.js`), Customer Live Tracking (`src/components/MapTracking.jsx`, `src/components/LiveOrderFloatingTracker.jsx`)  
> **Platform Targets:** Web, Android, iOS via Capacitor 8 (Static Export Architecture)  
> **Target Region:** Anantnag, Kashmir (Central Dark Store: Lal Chowk / Nai Basti)  
> **Date:** September 2026

---

## Table of Contents
1. [System Architecture & Core Principles](#1-system-architecture--core-principles)
2. [Feature 1: Driver Order Queue Management](#2-feature-1-driver-order-queue-management)
3. [Feature 2: Multiple Drop Locations on Driver Map](#3-feature-2-multiple-drop-locations-on-driver-map)
4. [Feature 3: Real GPS Tracking of the Driver](#4-feature-3-real-gps-tracking-of-the-driver)
5. [Feature 4: Actual Delivery ETA from Live Position](#5-feature-4-actual-delivery-eta-from-live-position)
6. [Feature 5: CSV Importer with Editable Review Step](#6-feature-5-csv-importer-with-editable-review-step)
7. [Feature 6: CSV Exporter Engine](#7-feature-6-csv-exporter-engine)
8. [Database Schema & State Synchronization](#8-database-schema--state-synchronization)
9. [Component Modifications & File Placement](#9-component-modifications--file-placement)
10. [Testing & Verification Protocol](#10-testing--verification-protocol)

---

## 1. System Architecture & Core Principles

All implementations must strictly abide by the core architecture established in `CLAUDE.md`, `docs/ARCHITECTURE.md`, and `docs/GOTCHAS.md`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DASHIT CLIENT RUNTIME                                │
│                     (Static Export: output: 'export')                       │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │   Rider Console      │  │   Customer Tracker   │  │   Admin Console   │  │
│  │  src/pages/driver.js │  │  MapTracking.jsx     │  │  Catalogue / CSV  │  │
│  └──────────┬───────────┘  └──────────▲───────────┘  └─────────┬─────────┘  │
│             │                         │                        │            │
│             │ Location Broadcast      │ Live Listener          │ Batch CRUD │
│             ▼                         │                        ▼            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Firestore & LocalStorage Bus                      │  │
│  │  - orders/{orderId}/tracking/live                                     │  │
│  │  - drivers/{driverId}/location                                        │  │
│  │  - products/{productId}                                               │  │
│  │  - window.dispatchEvent("dashit_tracking_updated" / "...products_...")│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Guardrails:
1. **Static Export Strictness**: No Next.js server-side routes or API routes (`/pages/api/` cannot be invoked in standalone mobile builds). All backend communications occur directly via the Firebase Web SDK (with offline fallback to `localStorage` + `window.dispatchEvent`).
2. **Capacitor Mobile Integrity**: Foreground geolocation requires high accuracy, screen wake-lock, and background capability on Android and iOS.
3. **Map Performance**: Leaflet map panning must rely exclusively on internal momentum dragging. Never attach manual touch-pan listeners.
4. **Anantnag Road Routing**: Use cached OSRM (`fetchRoadRoute` in `src/lib/maps.js`) with Anantnag POI database fallbacks (`ANANTNAG_LOCALITIES`).

---

## 2. Feature 1: Driver Order Queue Management

### 2.1 Problem Definition
Currently, `src/pages/driver.js` treats assigned orders as a flat list and selects a single `currentOrder = activeOrders[0]`. When riders pick up a batch of 2 to 4 orders from the Central Dark Store at Lal Chowk, there is no sequential stop tracking, queue ordering, or auto-advancement after drop completion.

### 2.2 Functional Requirements
- **Batched Pickup**: Drivers can claim or be dispatched 1–5 orders in a single trip.
- **Ordered Stop Sequence**: Orders in `activeOrders` are assigned a discrete sequence index: `[Stop 1, Stop 2, Stop 3]`.
- **Manual Sequence Reordering**: Drivers can promote/demote stops if local traffic conditions (e.g. market congestion on KP Road or Janglat Mandi) warrant changing the delivery order.
- **Drop Lifecycle Progression**:
  1. `PICKED_UP`: Batch loaded at Central Dark Store.
  2. `HEADING_TO_STOP`: Active stop highlighted.
  3. `ARRIVED`: Rider arrives at customer door.
  4. `DELIVERED`: 4-digit customer OTP verified; order marked `DELIVERED`; queue automatically shifts Stop 2 to the active position.
  5. `COMPLETED_ALL`: All orders in queue fulfilled; congratulations card rendered; driver status resets to idle at Central Hub.

### 2.3 Data Structure & Order Sequence State
Each active order object will contain queue metadata:

```typescript
interface QueuedOrder {
  orderId: string;
  queueIndex: number;            // 0 = active drop, 1 = second drop, etc.
  customerName: string;
  mobile: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    landmark?: string;
  };
  totalAmount: number;
  paymentMethod: "COD" | "ONLINE" | "UPI";
  items: Array<{ name: string; quantity: number; price: number }>;
  otp: string;                   // 4-digit delivery confirmation code
  status: "packed" | "out_for_delivery" | "delivered";
  distanceFromPreviousKm?: number;
  estimatedTransitMins?: number;
}
```

### 2.4 UI Component Implementation: Queue Ribbon & Stepper
Replace the single-order card in `src/pages/driver.js` with an **Active Drop Hero** + **Collapsible Upcoming Stops Timeline**:

```jsx
{/* Multi-Drop Queue Stepper */}
<div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 flex items-center space-x-2 overflow-x-auto scrollbar-none">
  {activeQueue.map((ord, idx) => {
    const isCurrent = idx === 0;
    return (
      <button
        key={ord.orderId || ord.id}
        onClick={() => setSelectedOrderId(ord.orderId || ord.id)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
          isCurrent
            ? "bg-[#FF5B00] text-white shadow-md shadow-[#FF5B00]/30"
            : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
        }`}
      >
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
          isCurrent ? "bg-white text-[#FF5B00]" : "bg-white/10 text-slate-300"
        }`}>
          {idx + 1}
        </span>
        <span className="truncate max-w-[90px]">{ord.customerName || `Drop #${idx + 1}`}</span>
        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
      </button>
    );
  })}
</div>
```

### 2.5 Queue Auto-Advance Logic on Delivery Confirmation
In `handleVerifyDelivery`:
```javascript
const handleVerifyDelivery = async () => {
  if (!currentOrder) return;
  const oId = currentOrder.orderId || currentOrder.id;
  const expectedOtp = String(currentOrder.otp || "").trim();

  if (enteredOtp.trim() === expectedOtp) {
    await updateOrderStatus(oId, ORDER_STATUS.DELIVERED);
    setCompletedOrdersCount((prev) => prev + 1);
    setShowDeliverySuccess(true);
    setEnteredOtp("");

    // Advance queue: remove completed drop, select next
    const remaining = activeOrders.filter((o) => (o.orderId || o.id) !== oId);
    setActiveOrders(remaining);
    if (remaining.length > 0) {
      setSelectedOrderId(remaining[0].orderId || remaining[0].id);
    } else {
      setSelectedOrderId(null);
      stopTracking();
    }
  } else {
    alert("Incorrect code. Ask customer for the 4-digit code in their DASHit app.");
  }
};
```

---

## 3. Feature 2: Multiple Drop Locations on the Driver Map

### 3.1 Problem Definition
The current Leaflet map in `driver.js` initializes with only one destination marker (`destMarkerRef`) and draws one single polyline. When carrying multiple orders, the rider cannot visualize the multi-stop drop route or geographic clustering.

### 3.2 Visual Marker Hierarchy
The map must render three distinct classes of pins:
1. **Driver Vehicle Puck**: Blue radar circle with scooter icon (`#1A73E8`), oriented to heading.
2. **Current Drop Pin (Stop #1)**: DASHit flame orange (`#FF5B00`), enlarged (38x46px), pulsing halo, with dynamic inner badge `"1"`.
3. **Subsequent Drop Pins (Stop #2, #3)**: Dark slate/cyan pins with high-contrast sequence numbers (`"2"`, `"3"`).
4. **Central Hub Pin (Optional)**: Amber warehouse pin marking Central Dark Store (Lal Chowk).

### 3.3 Dynamic Numbered Marker Generator
```javascript
function createNumberedDropIcon(stopNumber, isCurrent) {
  const pinColor = isCurrent ? "#FF5B00" : "#3B82F6";
  const haloHtml = isCurrent
    ? `<div style="position:absolute; width:44px; height:44px; top:-4px; left:-4px; border-radius:50%; background:rgba(255,91,0,0.3); animation:pulse 2s infinite;"></div>`
    : "";

  return L.divIcon({
    className: `stop-pin-${stopNumber}`,
    html: `
      <div style="position:relative; width:36px; height:44px; display:flex; flex-direction:column; align-items:center;">
        ${haloHtml}
        <svg width="36" height="44" viewBox="0 0 24 30" fill="none">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 18 12 18s12-9.5 12-18c0-6.63-5.37-12-12-12z" fill="${pinColor}"/>
          <circle cx="12" cy="11" r="7.5" fill="#ffffff"/>
        </svg>
        <span style="position:absolute; top:4px; font-weight:900; font-size:11px; color:#0f172a; font-family:sans-serif;">
          ${stopNumber}
        </span>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -42],
  });
}
```

### 3.4 Multi-Leg Polylines
- **Active Leg (Driver ➔ Stop 1)**: Solid primary navigation blue (`#1A73E8`, weight 5, white casing 8).
- **Secondary Legs (Stop 1 ➔ Stop 2 ➔ Stop 3)**: Dashed slate polyline (`#94A3B8`, dashArray: "6, 8", weight 3.5).

```javascript
// Remove previous polyline layers
if (routeLayersRef.current) {
  routeLayersRef.current.forEach((layer) => layer.remove());
}
routeLayersRef.current = [];

// 1. Fetch & draw active leg (Driver -> Stop 1)
const leg1 = await fetchRoadRoute(currentCoords.latitude, currentCoords.longitude, stop1.lat, stop1.lng);
if (leg1?.points?.length) {
  const casing = L.polyline(leg1.points, { color: "#ffffff", weight: 8, lineCap: "round" }).addTo(map);
  const core = L.polyline(leg1.points, { color: "#1A73E8", weight: 5, lineCap: "round" }).addTo(map);
  routeLayersRef.current.push(casing, core);
}

// 2. Fetch & draw subsequent legs between stops
for (let i = 0; i < upcomingStops.length; i++) {
  const from = i === 0 ? stop1 : upcomingStops[i - 1];
  const to = upcomingStops[i];
  const legRoute = await fetchRoadRoute(from.lat, from.lng, to.lat, to.lng);
  if (legRoute?.points?.length) {
    const dashedLine = L.polyline(legRoute.points, {
      color: "#94A3B8",
      weight: 3.5,
      dashArray: "6, 8",
      opacity: 0.7,
    }).addTo(map);
    routeLayersRef.current.push(dashedLine);
  }
}
```

### 3.5 External Google Maps Multi-Stop Navigation
Drivers can hand off the multi-stop route directly into turn-by-turn Google Maps app:

```javascript
export function generateMultiStopNavUrl(driverCoords, stops = []) {
  if (!stops.length) return "#";
  const origin = `${driverCoords.latitude},${driverCoords.longitude}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  const waypoints = stops
    .slice(0, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join("|");

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
    waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""
  }&travelmode=driving`;
}
```

---

## 4. Feature 3: Real GPS Tracking of the Driver

### 4.1 Native Mobile Geolocation & Background Persistence
In mobile WebView environments, `navigator.geolocation` sleeps when the device display turns off. For uninterrupted delivery telemetry, combine:
1. **Screen WakeLock API**: Keeps the screen active while on an active delivery trip.
2. **Capacitor Geolocation Native Bridge**: Uses `@capacitor/geolocation` with native GPS hardware.
3. **Android Foreground Service / iOS Location Permissions**: Configured in `android/app/src/main/AndroidManifest.xml` and `ios/App/App/Info.plist`.

### 4.2 WakeLock Controller
```javascript
// src/lib/wakeLock.js
let wakeLockSentinel = null;

export async function requestScreenWakeLock() {
  if (typeof window === "undefined" || !("wakeLock" in navigator)) return null;
  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    wakeLockSentinel.addEventListener("release", () => {
      wakeLockSentinel = null;
    });
    return wakeLockSentinel;
  } catch (err) {
    console.warn("WakeLock request notice:", err?.message);
    return null;
  }
}

export function releaseScreenWakeLock() {
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
}
```

### 4.3 Adaptive GPS Broadcasting with Deadband Filtering
To preserve battery life and minimize Firestore write consumption (Spark tier limits), enforce a **spatial and temporal deadband**:
- Minimum displacement threshold: $\Delta d \ge 8\text{ meters}$
- Minimum time threshold: $\Delta t \ge 3\text{ seconds}$
- Maximum stationary throttle: If stationary, broadcast heartbeat at most once every $15\text{ seconds}$.
- Accuracy filter: Reject fixes with `accuracy > 35m`.

```javascript
// Haversine displacement calculation
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Telemetry Broadcast Throttle
export function shouldBroadcastFix(prevFix, nextFix) {
  if (!prevFix) return true;
  if (nextFix.accuracy && nextFix.accuracy > 35) return false; // Filter inaccurate readings

  const distanceM = haversineMeters(
    prevFix.latitude,
    prevFix.longitude,
    nextFix.latitude,
    nextFix.longitude
  );
  const timeElapsedMs = Date.now() - (prevFix.timestamp || 0);

  // Moving: displaced > 8m and elapsed > 3s
  if (distanceM >= 8 && timeElapsedMs >= 3000) return true;

  // Stationary heartbeat: 15s
  if (timeElapsedMs >= 15000) return true;

  return false;
}
```

### 4.4 Fan-Out Broadcasting to Multi-Order Subcollections
When a driver is broadcasting GPS coordinates, update both the centralized driver document and all active orders in the driver's queue:

```javascript
// src/lib/db.js
export async function pushDriverTelemetryToQueue(driverId, activeOrderIds, telemetry) {
  const payload = {
    ...telemetry,
    updatedAt: new Date().toISOString(),
  };

  // 1. Dispatch locally for immediate 0ms UI responsiveness
  if (typeof window !== "undefined") {
    activeOrderIds.forEach((oId) => {
      localStorage.setItem(`dashit_tracking_${oId}`, JSON.stringify(payload));
      window.dispatchEvent(
        new CustomEvent("dashit_tracking_updated", { detail: { orderId: oId, ...payload } })
      );
    });
  }

  // 2. Persist to Firestore
  const db = getDb();
  if (!db) return;

  try {
    const batch = writeBatch(db);

    // Global driver document
    const driverRef = doc(db, "drivers", String(driverId), "telemetry", "live");
    batch.set(driverRef, { ...telemetry, updatedAt: serverTimestamp() }, { merge: true });

    // Subcollections for every customer waiting in this queue
    activeOrderIds.forEach((orderId, idx) => {
      const orderTrackingRef = doc(db, "orders", String(orderId), "tracking", "live");
      batch.set(
        orderTrackingRef,
        {
          ...telemetry,
          queuePosition: idx, // 0 = next drop, 1 = stop after next
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();
  } catch (err) {
    console.warn("Telemetry fan-out warning:", err?.message);
  }
}
```

---

## 5. Feature 4: Actual Delivery ETA from Live Position

### 5.1 Problem Definition
Currently, `calculateDeliveryEta()` in `src/lib/deliveryEta.js` only computes ETA statically from `DARK_STORE_HUB` (Lal Chowk). Furthermore, `MapTracking.jsx` computes the route once on mount and never updates the ETA as the courier moves towards the customer.

### 5.2 Dynamic Multi-Stop ETA Formula
The true arrival time for any customer in the queue is a function of:
1. Transit time from rider's live position to current stop ($\text{Leg}_1$).
2. Handover & OTP verification buffer at preceding stops ($\approx 2.5\text{ mins}$ per stop).
3. Transit time from preceding stop to customer destination ($\text{Leg}_2$).
4. Mandatory DASHit Safety Margin ($+3\text{ mins}$ as specified in `checklist.md`).

$$\text{ETA}_{\text{Customer}} = \text{Transit}(\text{Driver} \to \text{Stop}_1) + \sum_{k=1}^{n-1} \left[ \text{Buffer}_{\text{Drop}} + \text{Transit}(\text{Stop}_k \to \text{Stop}_{k+1}) \right] + \text{SafetyMargin}$$

### 5.3 Live Position ETA Calculator Implementation
```javascript
// src/lib/liveEtaCalculator.js
import { fetchRoadRoute } from "./maps";

export async function calculateLiveOrderEta({
  driverCoords,
  orderCoords,
  queuePosition = 0,
  precedingStops = []
}) {
  if (!driverCoords?.latitude || !orderCoords?.lat) {
    return { etaMinutes: 10, distanceKm: "1.2", statusText: "On the way" };
  }

  // 1. Direct active drop (Stop 1)
  if (queuePosition === 0) {
    const route = await fetchRoadRoute(
      driverCoords.latitude,
      driverCoords.longitude,
      orderCoords.lat,
      orderCoords.lng
    );

    const transitMins = route.durationMins || 6;
    const safetyBuffer = 2;
    const totalEta = Math.max(3, transitMins + safetyBuffer);

    return {
      etaMinutes: totalEta,
      distanceKm: route.distanceKm,
      statusText: totalEta <= 3 ? "Arriving in your area" : `Arriving in ~${totalEta} mins`,
      isDirectDrop: true
    };
  }

  // 2. Downstream drop (Stop 2, 3 in queue)
  let cumulativeTransitMins = 0;
  let cumulativeDistanceKm = 0;
  let currentOrigin = { lat: driverCoords.latitude, lng: driverCoords.longitude };

  // Calculate legs through preceding stops
  for (const stop of precedingStops) {
    const leg = await fetchRoadRoute(currentOrigin.lat, currentOrigin.lng, stop.lat, stop.lng);
    cumulativeTransitMins += (leg.durationMins || 5) + 2.5; // +2.5m door buffer per stop
    cumulativeDistanceKm += parseFloat(leg.distanceKm || "1.0");
    currentOrigin = stop;
  }

  // Final leg to this customer
  const finalLeg = await fetchRoadRoute(currentOrigin.lat, currentOrigin.lng, orderCoords.lat, orderCoords.lng);
  cumulativeTransitMins += finalLeg.durationMins || 5;
  cumulativeDistanceKm += parseFloat(finalLeg.distanceKm || "1.0");

  const totalEta = Math.round(cumulativeTransitMins + 3); // +3m DASHit safety margin

  return {
    etaMinutes: totalEta,
    distanceKm: cumulativeDistanceKm.toFixed(1),
    statusText: `Rider is dropping a nearby order first · ~${totalEta} mins`,
    isDirectDrop: false,
    stopsAhead: queuePosition
  };
}
```

### 5.4 Customer Live ETA Polling & Reactive Re-renders
In `src/components/MapTracking.jsx`, recompute ETA on significant rider coordinate changes:

```javascript
// Recompute dynamic ETA whenever rider position updates > 100m or every 20s
useEffect(() => {
  if (!riderLocation?.lat || !customerLat) return;

  const timer = setTimeout(async () => {
    const liveStats = await calculateLiveOrderEta({
      driverCoords: { latitude: riderLocation.lat, longitude: riderLocation.lng },
      orderCoords: { lat: customerLat, lng: customerLng },
      queuePosition: queuePosition || 0,
      precedingStops: precedingStops || []
    });

    setEtaMinutes(liveStats.etaMinutes);
    setDistanceKm(liveStats.distanceKm);
    setEtaStatusLabel(liveStats.statusText);
  }, 500);

  return () => clearTimeout(timer);
}, [riderLocation.lat, riderLocation.lng, customerLat, customerLng, queuePosition]);
```

---

## 6. Feature 5: CSV Importer with Editable Review Step

### 6.1 Problem Definition
Currently, `src/components/admin/ImporterView.jsx` only supports individual product search from Open Food Facts. Onboarding hundreds of FMCG products, spices, bakery goods, and produce from distributor price lists requires bulk spreadsheet import. To prevent corrupted entries, a **multi-stage review data-grid** must precede publishing.

### 6.2 4-Stage Import Workflow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     STAGE 1     │      │     STAGE 2     │      │     STAGE 3     │      │     STAGE 4     │
│  File Dropzone  │ ───► │  Column Mapping │ ───► │  Editable Grid  │ ───► │ Batch Firestore │
│   (.csv, .tsv)  │      │  (Fuzzy Match)  │      │  Review & Fix   │      │    Publishing   │
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
```

### 6.3 Stage 1: File Dropzone & Template Download
- Supports `.csv`, `.tsv`, `.txt`.
- Provides a one-click **"Download Sample CSV Template"** pre-populated with Kashmiri FMCG entries (e.g. Kashmiri Wazwan Spices, Shirmal, Nun Chai, Amul Butter).

### 6.4 Stage 2: Smart Auto-Column Detection
Fuzzy maps unpredictable supplier column headers to standard DASHit schema:

| Target Field | Accepted CSV Header Aliases |
| :--- | :--- |
| `name` | `name`, `product_name`, `title`, `item`, `description` |
| `price` | `price`, `selling_price`, `sp`, `rate`, `offer_price` |
| `originalPrice` | `originalPrice`, `mrp`, `list_price`, `marked_price` |
| `cat` | `cat`, `category`, `dept`, `group`, `section` |
| `unit` | `unit`, `pack`, `size`, `weight`, `volume`, `qty_unit` |
| `stock` | `stock`, `qty`, `quantity`, `inventory`, `count` |
| `barcode` | `barcode`, `sku`, `code`, `upc`, `ean` |
| `brand` | `brand`, `company`, `manufacturer`, `make` |
| `img` | `img`, `image`, `photo`, `image_url`, `picture` |

### 6.5 Stage 3: Editable Review Data-Grid (Inline Spreadsheet)
Admins inspect all rows in a tabular spreadsheet before committing:
- **Interactive Inline Edits**: Click any cell (Name, Price, MRP, Category, Stock) to modify value in-place.
- **Automated Validation Badges**:
  - `VALID` (Green): Row is ready to be published.
  - `WARNING` (Amber): Missing image URL (system automatically assigns high-resolution 4K category stock image via `get4KPhotoSuggestions(cat)`).
  - `ERROR` (Red): Missing product title, non-numeric price, or duplicate barcode.
- **Filter Tabs**: `All Rows (240)`, `Errors (4)`, `Warnings (18)`, `Ready to Publish (218)`.
- **Row Operations**: Delete invalid row, Clone row, or Bulk assign category.

```jsx
{/* Editable Grid Row Example */}
<tr className={hasError ? "bg-rose-500/10" : "hover:bg-white/5"}>
  <td>
    <input
      type="text"
      value={row.name}
      onChange={(e) => handleCellEdit(row.id, "name", e.target.value)}
      className="bg-transparent border-b border-transparent focus:border-[#FF5B00] outline-none text-xs font-bold text-white w-full"
    />
  </td>
  <td>
    <select
      value={row.cat}
      onChange={(e) => handleCellEdit(row.id, "cat", e.target.value)}
      className="bg-[#1A1D26] text-xs font-semibold rounded px-2 py-1 text-slate-200 border border-white/10"
    >
      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  </td>
  <td>
    <input
      type="number"
      value={row.price}
      onChange={(e) => handleCellEdit(row.id, "price", parseFloat(e.target.value))}
      className="w-16 bg-transparent border-b text-xs font-mono text-emerald-400"
    />
  </td>
  {/* Validation Indicator & Delete Button */}
  <td>
    {hasError ? (
      <span className="text-rose-400 text-[10px] font-black uppercase">Fix Error</span>
    ) : (
      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    )}
  </td>
</tr>
```

### 6.6 Stage 4: Staged Batch Publishing Engine
Writes products in chunks of 400 using Firestore `writeBatch` (strictly below the 500 limit) and synchronizes to `localStorage.dashit_custom_products`:

```javascript
// src/lib/csvImport.js
export async function batchPublishProducts(validatedProducts, onProgress) {
  const db = getDb();
  const CHUNK_SIZE = 400;
  let publishedCount = 0;

  for (let i = 0; i < validatedProducts.length; i += CHUNK_SIZE) {
    const chunk = validatedProducts.slice(i, i + CHUNK_SIZE);

    if (db) {
      const batch = writeBatch(db);
      chunk.forEach((p) => {
        const prodId = p.id || p.barcode || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const docRef = doc(db, "products", String(prodId));
        batch.set(
          docRef,
          {
            ...p,
            id: prodId,
            active: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
      await batch.commit();
    }

    publishedCount += chunk.length;
    if (onProgress) onProgress(publishedCount, validatedProducts.length);
  }

  // Update localStorage mirror & notify storefront
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      const existingMap = new Map(existing.map((item) => [item.id, item]));
      validatedProducts.forEach((p) => existingMap.set(p.id, p));
      localStorage.setItem("dashit_custom_products", JSON.stringify(Array.from(existingMap.values())));
      window.dispatchEvent(new CustomEvent("dashit_products_updated"));
    } catch (e) {}
  }

  return publishedCount;
}
```

---

## 7. Feature 6: CSV Exporter Engine

### 7.1 Problem Definition
The admin dashboard lacks bulk data extraction capabilities for inventory reconciliation, vendor purchase order creation, and order financial reporting.

### 7.2 RFC 4180 Compliant CSV Serializer
Special characters (commas, line breaks, double quotes) and Kashmiri product names with Unicode characters require strict serialization and UTF-8 Byte Order Mark (`\uFEFF`) to ensure Excel and Google Sheets render characters without distortion:

```javascript
// src/lib/csvExport.js
export function generateCsvString(data = [], columns = []) {
  if (!data.length || !columns.length) return "";

  // 1. Header row
  const headerLine = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");

  // 2. Data rows
  const dataLines = data.map((row) => {
    return columns
      .map((col) => {
        const val = typeof col.accessor === "function" ? col.accessor(row) : row[col.accessor];
        if (val === null || val === undefined) return '""';
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(",");
  });

  // UTF-8 BOM ensures seamless opening in Microsoft Excel
  return "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
}

export function triggerCsvDownload(csvString, filename = "export.csv") {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

### 7.3 Multi-Entity Admin Export Modules

#### Module A: Product Catalogue Export (`CatalogueView.jsx`)
- **Action**: "Export Full Catalogue (.CSV)"
- **Columns**: `Product ID`, `Barcode`, `Name`, `Category`, `Brand`, `Selling Price (₹)`, `MRP (₹)`, `Discount (%)`, `Pack Unit`, `Stock Quantity`, `Status`, `Image URL`.
- **Filter Support**: Respects active search query and category filter.

#### Module B: Inventory & Low-Stock Reorder Export (`InventoryView.jsx`)
- **Action**: "Export Low-Stock Report (.CSV)"
- **Columns**: `SKU / Barcode`, `Product Title`, `Category`, `Current Stock Units`, `Stock Status (LOW / OUT)`, `Unit Cost (₹)`, `Estimated Warehouse Value (₹)`.
- **Purpose**: Direct attachment for supplier purchase orders in Anantnag wholesale market.

#### Module C: Sales & Orders Export (`OrderProcessingView.jsx`)
- **Action**: "Export Order Ledger (.CSV)"
- **Columns**: `Order ID`, `Customer Name`, `Mobile`, `Delivery Address`, `Total Amount (₹)`, `Payment Method (COD / UPI)`, `Order Status`, `Item Count`, `Assigned Driver`, `Date Placed`, `Date Delivered`.

---

## 8. Database Schema & State Synchronization

### 8.1 Firestore Document Mapping

```
/orders/{orderId}
  ├── status: "placed" | "packed" | "out_for_delivery" | "delivered"
  ├── driverId: string
  ├── driverName: string
  ├── queueIndex: number
  └── /tracking/live
        ├── latitude: number
        ├── longitude: number
        ├── heading: number
        ├── speed: number
        ├── queuePosition: number
        ├── liveEtaMinutes: number
        ├── updatedAt: serverTimestamp

/drivers/{driverId}
  ├── name: string
  ├── mobile: string
  ├── onDuty: boolean
  ├── activeQueue: Array<orderId>
  └── /telemetry/live
        ├── latitude: number
        ├── longitude: number
        ├── heading: number
        ├── speed: number
        ├── updatedAt: serverTimestamp

/products/{productId}
  ├── id: string
  ├── barcode: string
  ├── name: string
  ├── cat: string
  ├── price: number
  ├── originalPrice: number
  ├── unit: string
  ├── brand: string
  ├── stock: number
  ├── img: string
  ├── active: boolean
  └── updatedAt: serverTimestamp
```

---

## 9. Component Modifications & File Placement

| Component Path | Changes & Enhancements |
| :--- | :--- |
| `src/pages/driver.js` | Implement `activeQueue` state, multi-drop queue timeline, numbered stop pins on Leaflet map, multi-leg polyline rendering, and `generateMultiStopNavUrl`. |
| `src/components/MapTracking.jsx` | Subscribe to `watchOrderTracking`, dynamically recalculate ETA on driver movement, display queue status banner (`"Rider is dropping a nearby order first"`). |
| `src/lib/deliveryEta.js` | Add `calculateLiveOrderEta` supporting cumulative transit time across multi-drop routes with Kashmir terrain buffers. |
| `src/components/admin/ImporterView.jsx` | Add CSV file upload dropzone, smart column mapping modal, and interactive spreadsheet review data-grid with pre-publishing validation. |
| `src/components/admin/CatalogueView.jsx` | Add "Export Catalogue CSV" action button calling `triggerCsvDownload`. |
| `src/components/admin/InventoryView.jsx` | Add "Export Stock Ledger CSV" with filter for low/out-of-stock items. |
| `src/lib/csvExport.js` | **[NEW]** RFC 4180 CSV serializer, UTF-8 BOM generator, and download trigger. |
| `src/lib/csvImport.js` | **[NEW]** PapaParse/regex CSV parser, header normalizer, row validator, and batch Firestore committer. |
| `src/lib/wakeLock.js` | **[NEW]** Screen WakeLock controller for persistent driver GPS telemetry. |

---

## 10. Testing & Verification Protocol

### 10.1 Multi-Drop Queue & Map Verification
1. **Assign 3 test orders** in Anantnag (`Nai Basti`, `Lazibal`, `Khanabal`).
2. Verify all 3 pins render with numbered badges (`"1"`, `"2"`, `"3"`).
3. Confirm solid blue polyline connects Driver to Stop 1, and dashed grey polylines connect Stop 1 ➔ Stop 2 ➔ Stop 3.
4. Verify tapping "Start Navigation" opens Google Maps with Stop 1 and Stop 2 as waypoints and Stop 3 as destination.
5. Complete Stop 1 with 4-digit OTP; verify Stop 1 disappears, Stop 2 automatically promotes to `#1`, and map refocuses.

### 10.2 GPS Telemetry & Dynamic ETA Verification
1. Start GPS broadcasting on mobile device.
2. In customer view (`MapTracking.jsx`), verify scooter puck moves smoothly via `requestAnimationFrame` interpolation.
3. Move test device $\approx 200\text{ meters}$; verify customer ETA count updates downwards in real-time.
4. Verify backgrounding the driver app keeps GPS broadcasting active via WakeLock.

### 10.3 CSV Importer Review & Exporter Verification
1. Download sample CSV template from admin portal.
2. Upload CSV with 50 products, including 2 intentional errors (missing title, invalid price).
3. Verify Stage 3 grid highlights 2 red rows and disables "Publish All" until resolved.
4. Correct errors directly in the spreadsheet grid cell and click "Publish 50 Products".
5. Verify products immediately appear in the live storefront catalogue.
6. Click "Export Catalogue CSV"; open the generated file in Microsoft Excel; verify Kashmiri characters and prices display without distortion.
