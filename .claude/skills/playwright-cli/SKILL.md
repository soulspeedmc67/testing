---
name: playwright-cli
description: Run automated browser interactions, verify UI rendering, check user flows, and capture screenshots using Playwright CLI.
---

# Playwright CLI Skill

## Purpose
Enables browser automation, flow testing, and visual verification of web applications.

## When to Use
- Validating critical end-to-end user flows (e.g. adding item to cart -> opening checkout drawer).
- Checking responsive layouts across different mobile screen viewport sizes.
- Verifying interactive components that rely on real browser DOM and JavaScript execution.

## When NOT to Use
- **Do NOT use** for static code reviews or syntax checking.
- **Do NOT use** for testing backend APIs or simple Node.js scripts.
- **Do NOT use** if verification can be done via `npm run build` or native `adb` commands on the connected physical device.

## Core Commands & Workflow
```bash
# Test a local URL with headless browser and capture screenshot
npx playwright screenshot --viewport-size="390,844" http://localhost:3000 /tmp/screenshot.png

# Run specific end-to-end tests if test files exist
npx playwright test

# Inspect network or console errors
npx playwright open http://localhost:3000
```
