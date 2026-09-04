---
name: awesome-design
description: Design principles for visual hierarchy, intentional spacing, typography rhythm, cohesive color palettes, and polished component composition.
---

# Awesome Design Skill

## Purpose
Elevate user interface craftsmanship, typography balance, spatial layout, and micro-interactions.

## When to Use
- Designing new screens, modals, cards, or navigation elements from scratch.
- Refactoring cluttered, unbalanced, or amateur UI into a cohesive, professional interface.
- Choosing color pairings, surface elevations, and typographic scales.

## When NOT to Use
- **Do NOT use** on backend logic, database queries, build configurations, or unit tests.
- **Do NOT use** when making simple bug fixes to non-visual code.
- **Do NOT use** if the user asks for exact literal 1:1 reproduction of existing code without design changes.

## Core Rules & Patterns
1. **Visual Hierarchy**: Every screen needs ONE dominant focal point, followed by clear secondary and tertiary elements.
2. **Typography Rhythm**: Use no more than 2 distinct typefaces (e.g. Plus Jakarta Sans for UI + Outfit for branding). Ensure strong weight contrast (`font-black` headings vs `font-medium` metadata).
3. **Spacing System**: Strictly adhere to 4px/8px modular units (`p-2`, `p-3`, `p-4`, `space-y-3`, `gap-2.5`). Never use random arbitrary margins.
4. **Surface Treatment**: Layer background tones subtly (`bg-slate-50` body, `bg-white` cards, `border-slate-200/80` borders) to create depth without harsh outlines.
5. **Micro-Interactions**: Interactive elements must acknowledge touch immediately via spring physics (`whileTap={{ scale: 0.96 }}`) and distinct active states.
