# Architecture & Data Flow — DASHit

## 1. System Overview
DASHit is a hybrid mobile application built with **Next.js 14** (statically exported to `out/`) and wrapped via **Capacitor 8** for Android and iOS. A standalone **Node.js Express + Socket.io** server (`server/index.js`) powers dark-store operations, driver GPS tracking, and real-time order lifecycle events.

```
┌────────────────────────────────────────────────────────┐
│                   DASHit Mobile App                    │
│     (Next.js 14 Static Export + Capacitor 8 Shell)    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Global App Shell (_app.js)                       │  │
│  │  - ScrollChromeProvider (dock visibility)        │  │
│  │  - LiveOrderFloatingTracker (plain black / island)│  │
│  │  - FloatingCartBar (centered pill dock)          │  │
│  │  - BottomNav (spring animated nav pill)          │  │
│  │  - FlyingBadgeOverlay (fly-to-cart physics)      │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                            │
│                  localStorage Events                   │
│   (dashit_cart_updated, dashit_offers_updated, etc.)   │
└───────────────────────────┬────────────────────────────┘
                            │ (REST + WebSockets)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Dashit Partner Server                  │
│       (Express + Socket.io on port 5001)               │
│  - /api/auth (OTP send/verify)                         │
│  - /api/orders (Order placement & status updates)      │
│  - /api/driver (GPS broadcast over socket)             │
│  - /partner (Admin & Driver Web Portal)                │
└────────────────────────────────────────────────────────┘
```

---

## 2. Client Architecture & State Flow
Because the client is a static export, it operates without an active Node.js server inside the mobile package:
- **Persistence**: All user state (`dashit_cart`, `dashit_user`, `dashit_active_order`, `dashit_offers`, `dashit_wishlist`) resides in `localStorage`.
- **Reactive Synchronization**: When state changes in any component, a matching window event is dispatched (e.g. `window.dispatchEvent(new Event("dashit_cart_updated"))`), allowing decoupled floating bars, badges, and drawers to re-render instantly without React context thrashing.
- **Offline Resilience**: `src/lib/api.js` wraps all network calls with automatic fallback to local simulation if the backend is unreachable.

---

## 3. UI Component Hierarchy & Docking System
The floating navigation layer uses strict stacking and coordination:
1. **`ScrollChromeContext`**: Monitors window scroll delta. Scrolling down hides `FloatingCartBar` and `BottomNav`; scrolling up restores them.
2. **`FloatingCartBar`**: Appears on storefront routes (`/`, `/categories`, `/order-again`, `/wishlist`) when cart items > 0. Stacks precisely above `BottomNav` with safe-area spacing.
3. **`LiveOrderFloatingTracker`**: Renders on storefront routes when an active order is in progress. Expands to a solid plain-black notification card or docks to screen edge as an ultra-compact Dynamic Island capsule.
4. **`FlyingBadgeOverlay`**: Global portal rendering parabolic bezier curve animations when items are added to cart.

---

## 4. Hardware & Native Bridge
Capacitor plugins bridge native device hardware:
- **Status & Navigation Bars**: `src/lib/systemBars.js` dynamically sets immersive edge-to-edge status bar colors based on active route.
- **Back Button**: Handled in `_app.js` via `@capacitor/app`. Closes open Vaul drawers first; navigates back if in sub-routes; exits only from Home (`/`).
- **Haptics**: `src/lib/haptics.js` gates all tactile pulses to iOS (`Capacitor.getPlatform() === 'ios'`).
