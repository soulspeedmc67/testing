# Dark Mode — Handoff

**Status:** complete and verified for the core journey. The theme engine, token
layer, bulk styling and the context-aware correction passes are all done; the
production build passes and light mode is byte-for-byte unchanged. What remains
is listed under "Still open" at the bottom — none of it blocks use.

Verified by screenshot in both themes: home/shop, account, orders, categories,
product, checkout. Verified by build: all 20 routes plus 50 product pages.

**Scope rule (hard):** customer storefront only. `src/pages/admin.js`,
`src/pages/driver.js` and `src/components/admin/**` are **out of scope and must
not be edited.** The admin console already has its own dark theme with its own
`dashit_admin_theme` key and its own toggle. Leave it alone.

---

## 1. What already exists

### Theme engine (done, verified working)

| File | Role |
|---|---|
| `src/lib/theme.js` | Theme resolution, persistence, system-watch, and the pre-paint boot script. Framework-free on purpose — it also runs inline in `_document.js`. |
| `src/context/ThemeContext.jsx` | `ThemeProvider` + `useTheme()`. Exposes `{ preference, theme, hydrated, setPreference }`. |
| `src/components/AppearanceSetting.jsx` | The Light / Dark / Auto segmented control on `/account`. |

- `preference` is what the user picked: `'light' | 'dark' | 'system'`.
- `theme` is what is actually rendered: `'light' | 'dark'`. **Branch on `theme`**,
  never on `preference`.
- Preference persists to `localStorage` under `dashit_theme`.
- `_document.js` runs `THEME_BOOT_SCRIPT` as a blocking inline script so the
  `dark` class is on `<html>` before first paint. **Do not move this into React**
  — an effect runs after the browser has already painted, which means a white
  flash on every cold start for dark-mode users.
- `_app.js` has a `SystemChromeSync` component that syncs the Capacitor status
  bar / nav bar colours and the `color-scheme` meta to the active theme. Colours
  live in `THEME_CHROME` in `src/lib/theme.js`.
- `_app.js` re-asserts the theme on route change, skipping `/admin`. This exists
  because the admin console writes the `dark` class itself and strips it on
  unmount; the storefront reclaims it on arrival instead of us editing admin.

**Verified working:** boot script applies the class pre-paint; the token layer
compiles; the `/account` control renders with the correct selection and
persists; switching the stored preference repaints the whole app in both
directions.

> Note on testing: the in-app preview pane freezes hidden tabs, which makes a
> hidden page report zero layout and no React hydration. If you see that, front
> the tab or use a real browser before concluding anything is broken.

### Token layer (done)

Two palettes, one set of role names, defined in `src/styles/globals.css` under
`:root` and `.dark`, and aliased as Tailwind colours in `tailwind.config.js`.

| Token | Use |
|---|---|
| `bg-surface` | the page ground |
| `bg-surface-sunken` | wells / insets that recede |
| `bg-surface-raised` | cards and rows on the page |
| `bg-surface-overlay` | bottom sheets, modals, floating dock |
| `bg-surface-muted` | chips, steppers, quiet fills, hover states |
| `text-content` / `-secondary` / `-muted` / `-faint` | text, loudest to quietest |
| `text-content-inverse` | text on a brand-coloured or inverted fill |
| `border-line` / `-soft` / `-strong` | hairlines |
| `accent` / `accent-contrast` | accent text/icons (lightened in dark for contrast) |

Each token exists twice: a hex form (`--surface`) for plain CSS in that file,
and a channel form (`--surface-rgb`) that Tailwind needs for opacity modifiers
like `bg-surface-raised/80`. **Edit them in pairs.**

Also made theme-aware in `globals.css`: the `html, body` ground colour (was
pinned `#FFFFFF`, which flashed white in the overscroll gutter), form-control
colours, placeholder colour, the `@layer base body` rule, and the
`.animate-shimmer` skeleton gradient.

### Bulk styling (applied and corrected)

`scripts/darkify.py` added ~1,100 `dark:` utilities across 74 customer-side
files. It is **additive only** — it never removes or rewrites an existing class,
so light mode is byte-for-byte unchanged and any mistake can only be a dark-mode
bug. Re-run with `python3 scripts/darkify.py` (dry run) or `--apply`.

It is context-aware: `bg-white` becomes `surface` on a page root, `surface-overlay`
on a bottom sheet, `surface-raised` on a card; and text colours are left alone
when the same `className` carries a coloured background, so dark text on a
yellow badge stays dark.

---

## 2. What was done

Beyond the first bulk pass, four correction passes ran, each driven by JSX
ancestor analysis rather than single-className matching — which is the only way
to know what an element actually sits on:

| Pass | Result |
|---|---|
| Removed dark backgrounds from elements inside a fixed-colour ancestor (white buttons on the orange login page, the slate-950 phone mockup, the midnight cart pill) | 31 fixed |
| Removed white text that had landed on light tints (`bg-amber-50`, `bg-sky-50`, `bg-[#f0f7ff]`) where it was invisible | 66 fixed |
| Mapped the brand navy `text-[#061838]`, which the first pass never covered — this was why headings and nav labels were navy-on-black | 80 mapped |
| Themed class strings nested inside `${...}` template expressions, which the first pass structurally could not see | 50 mapped |

Also themed by hand: the home top bar (legibility only — not restyled), the
categories rail and its active item, the splash screen and its native bars, the
Leaflet map tiles, and the near-black panels (PromoBanner hero, live order
tracker) that would otherwise vanish against the dark ground.

The dark text ramp was re-tuned for contrast: `content` 18.9:1, `secondary`
8.2:1, `muted` 4.7:1, `faint` 3.8:1 against the app ground.

## Still open

None of these block use of the feature.

- **Raster logos.** `/dashit-app-icon.png` has a white counterpart
  (`dashit-app-icon-white.png`). Swap on `theme === 'dark'` wherever a dark-ink
  logo sits on the dark ground.
- **Brand-navy buttons** (`bg-[#061838]`) read as low-contrast panels against
  the near-black page. They are legible (white text carries them) and changing
  them is a design decision, not a legibility fix — left alone deliberately.
- **Native status bars.** `THEME_CHROME` is wired but only testable on the
  physical Pixel (`08201FDD40016N`); see CLAUDE.md section 6.
- **Screens not screenshot-verified:** login, search, wishlist, offers,
  add-address, terms, privacy. All compile and were covered by the automated
  passes.

## 3. Project constraints you must respect

These come from `CLAUDE.md` and from standing instructions. Violating them means
the work gets reverted.

1. **The home screen top bar — everything above the search bar — is finished and
   must not be restyled.** Theme it so it is legible in dark; do not redesign it.
2. **No unprompted releases.** Do not build or upload `.apk` / `.ipa`. Verify
   locally or on the connected Pixel only.
3. **Static export compatibility.** `output: 'export'` is active — no SSR, no
   dynamic API routes.
4. **Dialogs are iOS-style bottom sheets** that slide up from the bottom, never
   centered modals. The one exception is the live order-progress widget, which
   is a top-docked live-activity notification.
5. **Restraint.** No multi-stop gradients, tinted notice slabs, or decorative
   badges. The storefront reads as a restrained, professional shop. Dark mode
   should make it quieter, not flashier.
6. **Haptics are iOS-only** (`isIOS()` in `src/lib/haptics.js`). Do not enable
   Android vibration.
7. **Admin and driver are out of scope.** Do not edit them.

---

## 4. Commands

```bash
npm run dev
```

```bash
python3 scripts/darkify.py
```

```bash
npm run build
```
