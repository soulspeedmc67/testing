/**
 * DASHit Motion Language
 *
 * Single source of truth for the app's animation feel. Every surface pulls its
 * easing, spring physics and entrance choreography from here so the whole app
 * moves with one consistent, restrained rhythm instead of ad-hoc timings.
 *
 * Rules of thumb:
 * - Only animate `opacity` and `transform` (WebView-safe, GPU composited).
 * - Entrances are short (< 450ms) and never block interaction.
 * - Taps respond with spring physics, not linear scaling.
 */

// Expo-out: quick departure, long soft landing. The house easing curve.
export const EASE_OUT = [0.22, 1, 0.36, 1];
// Gentle in-out for crossfades and reversible states.
export const EASE_SOFT = [0.4, 0, 0.2, 1];

/** Springs */
export const SPRING_SOFT = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
export const SPRING_SNAPPY = { type: "spring", stiffness: 420, damping: 28, mass: 0.6 };
export const SPRING_BOUNCY = { type: "spring", stiffness: 500, damping: 18, mass: 0.6 };

/** Standard entrance: rise and fade. */
export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT } },
};

/** Lighter entrance for dense grids where 14px of travel feels heavy. */
export const fadeUpTight = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_OUT } },
};

/** Pure crossfade, for content that swaps in place (carousels, tab panels). */
export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: EASE_SOFT } },
  exit: { opacity: 0, transition: { duration: 0.22, ease: EASE_SOFT } },
};

/** Cards and tiles that should feel physically placed. */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: SPRING_SOFT },
};

/**
 * Parent wrapper that cascades its children's entrances.
 * Usage: <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
 */
export const stagger = (staggerChildren = 0.06, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

/**
 * Props for an element that animates the first time it scrolls into view.
 * `once: true` keeps long product grids cheap — each card animates exactly once.
 */
export const inViewOnce = {
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, margin: "-40px 0px -40px 0px" },
};

/** Touch feedback presets. */
export const TAP_SOFT = { scale: 0.97 };
export const TAP_FIRM = { scale: 0.94 };

/** Interactive card: lifts on hover, compresses on press. */
export const pressableCard = {
  whileTap: TAP_SOFT,
  transition: SPRING_SNAPPY,
};
