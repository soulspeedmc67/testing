# Critical Gotchas & Pitfalls — DASHit

### 1. No Server-Side Next.js Features in Mobile Apps
- **Problem**: Next.js is configured for static export (`output: 'export'`).
- **Trap**: Using `getServerSideProps`, `getInitialProps`, or assuming `fetch('/api/...')` will hit an internal Next.js API server inside the Capacitor APK.
- **Rule**: All API communication must route through `src/lib/api.js` (which targets `http://<IP>:5001` with localStorage fallback).

### 2. Physical Device Verification vs GitHub Releases
- **Rule**: NEVER build or upload `.ipa` or `.apk` files to GitHub releases unless the user explicitly requests: *"upload the apk/ipa"*.
- **Trap**: Uploading release binaries wastes CI time, quota, and slows down iteration.
- **Correct Workflow**: Verify directly on the connected USB device (`08201FDD40016N`) using `./gradlew installDebug` and `adb exec-out screencap`.

### 3. Capacitor Asset Syncing Trap
- **Trap**: Running `npm run build` updates `out/`, but the Android app does NOT see changes until assets are copied.
- **Requirement**: Always run `npm run build && npx cap sync android` to ensure web assets in `android/app/src/main/assets/public` are current before compiling debug APKs.

### 4. Android Haptic Motor Harshness
- **Problem**: Android device vibration motors do not produce subtle taptic clicks; they produce loud, annoying mechanical buzzes.
- **Rule**: All haptic functions in `src/lib/haptics.js` must check `isIOS()` (`Capacitor.getPlatform() === 'ios'`). Android haptics must remain silently disabled.

### 5. Virtual Keyboard & Floating Docks
- **Problem**: When a mobile input or search bar is focused, the virtual keyboard pushes fixed elements (`FloatingCartBar`, `BottomNav`) into the middle of the viewport.
- **Solution**: Components listen to `window.visualViewport.addEventListener('resize', ...)` and apply `translateY(120%)` / `hidden` when height shrinks significantly.

### 6. Safe Area Insets
- **Problem**: Edge-to-edge screens (iPhone notch/island, Android gesture bar) clip bottom pills.
- **Rule**: Always pad floating docks with `bottom: max(16px, calc(12px + env(safe-area-inset-bottom, 16px)))`.

### 6b. Modal Sheets: Background Scroll & the vaul Conflict
- **Symptom**: opening a bottom sheet (variant "more options", address picker) and dragging scrolled the page *behind* the sheet instead of the sheet's own content.
- **Two separate causes, both fixed**:
  1. The hand-rolled sheets (`VariantSelectorModal`, `CheckoutLoginModal`, `OrderingForSomeoneElseModal`, `LocationPermissionModal`) had **no scroll container at all** — no `max-h`, no `overflow-y-auto`. They now have `max-h-[85vh] overflow-y-auto overscroll-contain`.
  2. Nothing locked `<body>`. `src/lib/useBodyScrollLock.js` now does, and every sheet uses it — including `ui/VaulDrawer.jsx`.
- **The trap worth remembering**: vaul is *supposed* to lock background scroll itself. Measured against this app it does not — and worse, it writes `body.style.position = "relative"` **after** the lock effect runs, silently undoing it (`top` was applied but computed position stayed `relative` and the page still scrolled). That is why `useBodyScrollLock` sets its properties with `"important"` priority. Do not "clean that up" — a plain inline write loses to vaul.
- **Rule**: any new sheet gets `useBodyScrollLock(isOpen)` plus its own `overflow-y-auto overscroll-contain`. Call the hook **before** the `if (!isOpen) return null` guard — hooks cannot be conditional.

### 6c. Hidden-but-Mounted Chrome Is Still Tappable
- **Trap**: `BottomNav` never unmounts; when hidden it only animates to `opacity: 0` / `translateY(110)`. It stayed hit-testable, so an invisible tab near the bottom edge could be tapped on `/login` or `/admin` and navigate the user away.
- **Rule**: anything hidden by animation rather than unmounting needs `pointer-events-none` and `aria-hidden` while hidden. Same applies to any future hidden overlay.

### 7. Leaflet: Never Hand-Roll Panning
- **Problem**: `MapWithPinInner.jsx` once ran a custom `touchmove` handler calling `map.panBy()` *while* Leaflet's own `dragging` was enabled. Both moved the map, so it travelled ~2x the finger distance and stuttered — the "map doesn't work smoothly" symptom.
- **Rule**: Let Leaflet own panning (`dragging` + `inertia`). Do not add manual `panBy` handlers.
- **Second trap — the feedback loop**: `moveend` → `onChangePos` → parent state → `pos` prop → `setView()` → fires `moveend` again. Guard it: track the last centre you emitted and a `isProgrammatic` flag, and skip the recentre when the incoming `pos` is an echo of your own emit. Report position from `moveend` only (`dragend` double-reports).

### 8. Component Prop Contracts Are Loose
- **Trap**: Several components accept differently-named props at different call sites (`onQuickView` vs `onOpenQuickView`, `cartQty` vs `cart`, `onAdd` vs `onAddToCart`). A mismatch fails **silently** — the UI renders but the button does nothing.
- **Rule**: When wiring these up, read the component's actual destructured props. `ProductCard` and `QuickProductSheet` now accept both spellings defensively, but new call sites should still be checked.
- **Also**: cart ids are normalised to strings on add. Always compare with `String(a) === String(b)`; a strict `===` against a numeric product id silently never matches.

### 9. Tailwind Class Purging
- **Trap**: Writing dynamic class names like `bg-${deal.color}-500` results in missing CSS in production builds.
- **Rule**: Always write complete class strings (e.g. `border-orange-200/80`) or use static lookup tables.
