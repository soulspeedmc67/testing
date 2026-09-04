---
name: taste
description: Editorial design judgment to eliminate generic AI-generated aesthetics, elevate visual refinement, and ensure premium brand identity.
---

# Taste Skill (Aesthetic & Editorial Judgment)

## Purpose
Guards against sloppy, generic "AI-slop" interfaces (e.g. garish neon gradients, excessive rounded blob containers, random glowing dropshadows, low-contrast text) and enforces intentional, high-end editorial aesthetics.

## When to Use
- Evaluating whether a redesign looks truly professional vs looking "AI-generated".
- Selecting surface textures, matte glass materials, dark mode shades, or luxury editorial layouts.
- Refining cards, banners, or badges to look like a polished, standalone product (like Dashit) rather than a cheap clone.

## When NOT to Use
- **Do NOT use** on backend scripts, database queries, build pipelines, or purely functional code.
- **Do NOT use** when tasked with a straightforward functional bug fix.

## The Anti-Slop Aesthetic Checklist
1. **No Cheap Gradients**: Avoid loud purple-to-cyan or bright blue-to-magenta gradients. Prefer matte obsidian surfaces (`#090D15`), deep midnight tones (`#061838`), or crisp bone/cream light backgrounds with subtle atmospheric ambient blurs.
2. **Subtle Elevation**: Replace heavy murky dropshadows with razor-thin borders (`border border-neutral-800/80` or `border-slate-200/80`) paired with directional soft shadows.
3. **Intentional Badge Sizing**: Badges must be crisp micro-elements (`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full`), not oversized bloated pills.
4. **Photography Framing**: Staged product imagery should be framed with inner ring highlights (`ring-1 ring-white/20`), clean aspect ratios, and subtle scale-up on hover/active.
5. **Distinctive Identity**: Never produce generic placeholder clones. DASHit has its own character: energetic Dashit Orange (`#FF5B00`), disciplined Midnight Blue (`#061838`), and rapid 8-minute delivery badges.
