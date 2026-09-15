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
