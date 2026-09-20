# DASHit — Claude OS & Architecture Constitution

**DASHit** is a high-performance quick-commerce mobile & web application for Anantnag, Kashmir (Web, Android, iOS via Capacitor 8).

---

## 1. Knowledge Graph Navigation (Graphify)
This repository contains a pre-indexed knowledge graph (`graphify-out/graph.json`, 398+ nodes, 700+ edges).
- **Find code / trace dependencies**: Run `graphify query "<feature or question>"`
- **Path between components**: Run `graphify path "<ComponentA>" "<ComponentB>"`
- **Architectural hubs**: Run `graphify god-nodes`
- **After structural changes**: Run `graphify update .` (AST-only, fast, zero token cost)
*Never scan the entire repository with grep/find if graphify can locate the exact files.*

---

## 2. Progressive Context Router (Load ONLY when relevant)
Do **not** load documentation files preemptively. Load only the specific document when the task demands it:
- **System Architecture & Data Flow**: Read `docs/ARCHITECTURE.md` (when modifying state flow, socket events, or cross-layer integrations)
- **Pitfalls, Traps & Constraints**: Read `docs/GOTCHAS.md` (when debugging, touching floating overlays, safe-areas, or native bridges)
- **Current State, Recent Changes & Handoff**: Read `docs/HANDOFF.md` (at start of session to resume work without rediscovering history)

---

## 3. Strict Project Constraints (NEVER VIOLATE)
1. **NO UNPROMPTED RELEASES**: Never build or upload `.ipa` or `.apk` to GitHub releases unless the user explicitly commands it. Verify locally or on the connected physical Pixel (`08201FDD40016N`).
2. **STATIC EXPORT COMPATIBILITY**: `output: 'export'` is active in `next.config.js`. No SSR, no dynamic Next.js API routes inside the client app. All data, auth, orders, and real-time operations run through Firebase/Firestore (`src/lib/db.js`, `src/lib/auth.js`) with seamless fallback to `localStorage`.
3. **NO SEPARATE EXCLUSIVE SCREEN**: Offers sort and filter directly on the home screen (`/?deal=<category>`). Do not restore `/exclusive`.
4. **HAPTICS POLICY**: Crisp tactile feedback is restricted to iOS via `isIOS()` in `src/lib/haptics.js`. Keep Android vibrations disabled to prevent harsh motor buzz.
5. **DOCK COORDINATION**: `FloatingCartBar` and `LiveOrderFloatingTracker` coordinate via `ScrollChromeContext`. They must respect `env(safe-area-inset-bottom)` and auto-hide when the keyboard opens.

---

## 4. Tech Stack & Key Locations
- **Framework**: Next.js 14 (Pages Router, static export), React 18, Tailwind CSS v3
- **Animations**: Framer Motion, Anime.js, Canvas-Confetti, Remotion Player
- **Mobile Wrapper**: Capacitor 8 (`@capacitor/android`, `@capacitor/ios`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/app`, `@capacitor/local-notifications`)
- **Backend & Database**: Firebase Firestore & Firebase Auth (Client Web SDK, Spark free tier). Realtime `onSnapshot` listeners replace WebSockets. No Node/Express server needed.
- **Key Files**:
  - `src/pages/index.js`: Main storefront & dynamic deals filter
  - `src/components/PromoBanner.jsx`: Obsidian Hero Spotlight & Curated Everyday Rails
  - `src/components/FloatingCartBar.jsx`: Centered dynamic cart pill
  - `src/components/LiveOrderFloatingTracker.jsx`: Plain black delivery tracker & Dynamic Island docked capsule
  - `src/components/BottomNav.jsx`: Spring micro-animated bottom navigation
  - `src/data/products.js`: Product catalog & categories
  - `src/lib/api.js` & `src/lib/offers.js`: Data fetching & admin offer state

---

## 5. Skills Guidance (On-Demand Only)
Skills are located in `.claude/skills/`. **Never load all skills.** Use only the skill matching your specific task:
- `playwright-cli`: For browser end-to-end automation, interaction testing, and visual flow checks.
- `image-to-code`: When given a visual mockup or screenshot to translate into pixel-perfect Tailwind/JSX.
- `awesome-design`: For designing new components, layout hierarchy, micro-interactions, and spacing polish.
- `vercel-web-design-guidelines`: For accessibility, mobile touch-targets, and web design standards.
- `taste`: For editorial visual judgment, elevating aesthetics, and avoiding generic "AI-generated" UI look.
*Non-UI tasks (backend, state, bugs, config) MUST NOT load visual/design skills.*

---

## 6. Development & Verification Commands
- **Local Dev**: `npm run dev` (starts on port 3000)
- **Compile & Static Export**: `npm run build`
- **Sync to Native Android**: `npx cap sync android`
- **Build & Install to Physical Pixel**: `cd android && ./gradlew installDebug`
- **Inspect on Physical Pixel**:
  - Start app: `adb -s 08201FDD40016N shell am start -n com.dashit.app/.MainActivity`
  - Screenshot: `adb -s 08201FDD40016N exec-out screencap -p > /tmp/screen.png`

---

## 7. Execution & Token Efficiency Rules
1. **Scale planning to task**: 1-2 line action plan for simple edits. Detailed plan only for large architectural refactors.
2. **Be an active technical partner**: If a requested idea is inefficient, bad for UX, or violates architecture, point it out briefly and propose the better alternative.
3. **Keep answers terse**: Do not repeat the prompt. Provide verified results, diffs, and exact commands.
4. **State uncertainty clearly**: Distinguish `VERIFIED` (seen in code or tested on device) from `INFERRED` or `ASSUMED`. Never state an assumption as a fact.

---

## 8. App Store & Google Play Compliance (Mandatory Gate)
For any iOS or Android work, always adhere to the Apple App Store Review Guidelines and Google Play Developer Program Policies. Run the pre-submission compliance audit (`bash ~/.claude/hooks/app-store-compliance-guard.sh .`) before any release or store submission. Never report an app clear to submit while a critical rejection risk stands.
