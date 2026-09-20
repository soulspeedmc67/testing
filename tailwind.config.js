/** @type {import('tailwindcss').Config} */

/**
 * The codebase was written against Tailwind v4 naming while the project runs
 * v3.4. Utilities like `shadow-xs`, `shadow-2xs` and `backdrop-blur-xs` do not
 * exist in v3, so roughly two hundred elements that were meant to carry a fine
 * hairline of elevation were rendering completely flat — which is most of why
 * the interface read as unfinished. The same applied to a handful of off-scale
 * spacing and scale values.
 *
 * They are defined here rather than find-and-replaced, so the intent the markup
 * already expresses is preserved: 2xs is a barely-there seam, xs is one step up,
 * and neither should ever look like a drop shadow.
 */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      /**
       * Every page root carries `font-sans` (`min-h-screen ... font-sans`), and
       * in v3 that utility resolves to Tailwind's own ui-sans-serif/system-ui
       * stack. It therefore overrode the `body { font-family: 'Plus Jakarta
       * Sans' }` rule in globals.css for essentially all visible content — the
       * brand face was being downloaded on every load and then used for almost
       * nothing, while headings and prices rendered in the device system font.
       *
       * Pointing the utility at the brand stack fixes it everywhere at once and
       * keeps `font-sans` meaning what the markup already assumes it means.
       */
      /**
       * Semantic colour aliases over the CSS variables in globals.css.
       *
       * These are what new and re-themed markup should use — `bg-surface-raised`
       * instead of `bg-white`, `text-content-muted` instead of `text-slate-500`
       * — because a token resolves per theme while a literal shade does not.
       * The literal Tailwind palette is still available and still correct for
       * anything that is genuinely one fixed colour in both themes: the brand
       * orange, a white glyph on an orange button, a semantic red.
       *
       * `<alpha-value>` is what lets the opacity modifiers keep working, so
       * `bg-surface-raised/80` and `border-line/50` behave as they would on a
       * normal Tailwind colour.
       */
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--surface-rgb) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken-rgb) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised-rgb) / <alpha-value>)',
          overlay: 'rgb(var(--surface-overlay-rgb) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted-rgb) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'rgb(var(--content-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--content-secondary-rgb) / <alpha-value>)',
          muted: 'rgb(var(--content-muted-rgb) / <alpha-value>)',
          faint: 'rgb(var(--content-faint-rgb) / <alpha-value>)',
          inverse: 'rgb(var(--content-inverse-rgb) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line-rgb) / <alpha-value>)',
          soft: 'rgb(var(--line-soft-rgb) / <alpha-value>)',
          strong: 'rgb(var(--line-strong-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          contrast: 'rgb(var(--accent-contrast-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      spacing: {
        /**
         * Clearance for the floating dock stack. The bottom nav sits 12px off
         * the safe area and the cart pill rides 70px above that, so the top of
         * the chrome lands ~136px up — more than `pb-32` (128px) was
         * reserving, which left the final row of products sitting underneath
         * the cart bar with no way to scroll clear of it.
         */
        dock: '11rem',
        '0.2': '0.05rem',
        '4.5': '1.125rem',
      },
      boxShadow: {
        // Hairline seams. Tight, low-opacity, no visible blur halo.
        '2xs': '0 1px 1px 0 rgb(15 23 42 / 0.04)',
        'xs': '0 1px 2px 0 rgb(15 23 42 / 0.06)',
      },
      backdropBlur: {
        xs: '2px',
      },
      scale: {
        '98': '.98',
      },
    },
  },
  plugins: [],
}
