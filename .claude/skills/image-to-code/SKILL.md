---
name: image-to-code
description: Translate visual designs, reference images, and UI mockups into clean, production-grade Tailwind CSS and React JSX.
---

# Image-to-Code Skill

## Purpose
Deconstruct visual layouts, typography, spacing, shadows, and color relationships from mockups or screenshots into clean React/Tailwind components.

## When to Use
- The user provides an image or screenshot of a component/screen they want built or refined.
- Replicating high-fidelity reference cards, hero banners, or complex widgets.
- Comparing an existing component's rendering against a target reference to fix visual discrepancies.

## When NOT to Use
- **Do NOT use** when editing logic, state, backend routes, or data structures.
- **Do NOT use** for minor text tweaks or fixing syntax errors.
- **Do NOT use** when no image or visual reference is provided.

## Workflow & Guidelines
1. **Deconstruct the Hierarchy**: Identify structural containers (Header, Media, Content, Actions, Meta).
2. **Color Extraction**: Extract exact hexadecimal values or closest Tailwind equivalents.
3. **Typography & Contrast**: Map font families, weights (`font-black`, `font-extrabold`), letter spacing, and line heights.
4. **Elevation & Borders**: Combine razor-thin borders (`border border-neutral-800/80` or `border-slate-200/80`) with soft atmospheric box shadows (`shadow-md`, `shadow-2xl`).
5. **Interactive Feedback**: Ensure every interactive button or tile has appropriate `:hover`, `:active`, and `active:scale-95` micro-feedback.
