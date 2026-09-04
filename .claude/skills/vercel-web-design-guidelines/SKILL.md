---
name: vercel-web-design-guidelines
description: Modern web design standards covering accessibility, touch targets, keyboard navigation, responsive layout stability, and performance.
---

# Vercel Web Design Guidelines Skill

## Purpose
Enforces web craftsmanship, WCAG accessibility, touch-target sizing, layout shift prevention, and responsive mobile-first behavior.

## When to Use
- Reviewing UI components for accessibility (a11y), contrast ratios, and semantic HTML tags.
- Designing responsive components that must seamlessly adapt across small mobile screens and large tablets.
- Optimizing tap target sizes and virtual keyboard handling on mobile web/Capacitor.

## When NOT to Use
- **Do NOT use** for server logic, database design, or offline caching.
- **Do NOT use** when editing build scripts or native Android/iOS gradle configs.

## Essential Principles
1. **Touch Targets**: All mobile interactive buttons and icons must have a minimum tap target of 44x44px (`min-h-[44px] min-w-[44px]` or generous padding).
2. **Cumulative Layout Shift (CLS)**: Always reserve aspect ratio space for images and dynamic media (`aspect-square`, `aspect-video`, or explicit height placeholders) to avoid jumpy page rendering.
3. **Safe Area Insets**: Respect mobile notches and home indicators using `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
4. **Semantic HTML**: Use `<header>`, `<main>`, `<nav>`, `<button>` (with `type="button"`), and `aria-label` where visual text is omitted.
5. **Fast Perceived Performance**: Use instant optimistic UI updates and subtle skeleton shimmer loaders while fetching data.
