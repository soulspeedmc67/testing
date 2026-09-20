#!/usr/bin/env bash
# Hands the dark-mode work to Antigravity (agy) headlessly.
#
# Run this from a terminal. It cannot be launched from inside a Claude Code
# session: --dangerously-skip-permissions grants agy unattended authority to
# edit files and run shell commands, which Claude Code's permission classifier
# blocks by design.
#
# Usage:   bash scripts/run-antigravity.sh [task-number]
# Default is task 3 (the three known failure classes) — the bounded first pass.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

AGY="${HOME}/.local/bin/agy"
[[ -x "$AGY" ]] || { echo "agy not found at $AGY"; exit 1; }

TASK="${1:-3}"

read -r -d '' PROMPT <<EOF
Read docs/DARK_MODE_HANDOFF.md first — it is the full brief for this work.

Then execute ONLY "Task ${TASK}" from section 2 of that document.
Do not start any other task. Report what you changed, file by file, when done.

HARD RULES — violating any of these means the work is reverted:
- Customer storefront ONLY. Do not edit src/pages/admin.js, src/pages/driver.js,
  or anything under src/components/admin/.
- Changes to className strings must be additive, or must DELETE a wrong
  generated dark: class. Never alter a non-dark class. Light mode must stay
  byte-for-byte identical. Verify with:
      git diff -U0 -- src | grep '^[+-]' | grep -v 'dark:'
  That should show no styling changes other than dark: utilities.
- The home screen top bar (everything above the search bar in src/pages/index.js
  and src/components/AppHeader.jsx) is finished. Theme it for legibility only;
  do not restyle it.
- Do NOT run a build. Never produce or upload an .apk or .ipa.
- Do not start a dev server; one is already running on port 3000.
- Use only the semantic tokens in section 1 of the handoff (bg-surface,
  bg-surface-raised, bg-surface-overlay, bg-surface-muted, text-content and its
  -secondary/-muted/-faint variants, border-line and its -soft/-strong
  variants). Do not introduce new hex colours or new Tailwind shades.
EOF

echo "=== Handing task ${TASK} to Antigravity ==="
exec "$AGY" -p "$PROMPT" \
  --model gemini-3.1-pro-high \
  --dangerously-skip-permissions \
  --print-timeout 0
