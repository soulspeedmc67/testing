#!/usr/bin/env python3
"""
Adds `dark:` counterparts to the light colour utilities in the customer-facing
storefront. Additive only: no existing class is ever removed or rewritten, so
light mode is byte-for-byte unchanged and a bad mapping can only ever be a dark
mode bug.

Context matters, so this does not do a flat find-and-replace. `bg-white` on a
page root is the app ground; on a card it is a raised surface; on a bottom
sheet it is an overlay. `text-slate-900` on a white card should invert, but the
same class on a yellow badge must not, because the badge stays yellow in both
themes. Both decisions are made from the other classes sitting in the same
className string, which is where Tailwind markup keeps that context.
"""
import re
import sys
import os

ROOT = '/home/aleemkanyu/Projects/Blinkit'

# --- scope -----------------------------------------------------------------
# Staff consoles are deliberately excluded: they ship as separate app flavors
# and already carry their own dark theme.
EXCLUDE_FILES = {
    'src/pages/admin.js',
    'src/pages/driver.js',
    'src/pages/_app.js',
    'src/pages/_document.js',
    'src/pages/hero-3d-demo.js',
}
EXCLUDE_DIRS = ('src/components/admin/', 'src/components/remotion/')


def in_scope(rel):
    if rel in EXCLUDE_FILES:
        return False
    if any(rel.startswith(d) for d in EXCLUDE_DIRS):
        return False
    return rel.startswith('src/pages/') or rel.startswith('src/components/')


# --- context probes ---------------------------------------------------------
COLOURED_BG = re.compile(
    r'\bbg-(?:orange|amber|yellow|emerald|green|red|rose|pink|blue|indigo|'
    r'violet|purple|teal|cyan|sky|fuchsia|lime)-\d{2,3}\b'
    r'|\bbg-(?:slate|zinc|gray|neutral|stone)-(?:700|800|900|950)\b'
    r'|\bbg-black\b'
    r'|\bbg-gradient-'
    r'|\bbg-\[#(?:0|1|2|3|4|5|6|D|E0|FF5|FF6)'
)
PAGE_ROOT = re.compile(r'\bmin-h-screen\b|\bh-screen\b|\bmin-h-\[100dvh\]\b')
SHEET = re.compile(r'\brounded-t-(?:xl|2xl|3xl|\[)|\bfixed\b[^"\']*\bbottom-0\b')
STICKY = re.compile(r'\bsticky\b|\bfixed\b[^"\']*\btop-0\b')

# Light neutral hex fills used as page/card grounds throughout the app.
LIGHT_HEX = {
    'f7f8fa', 'f4f6f8', 'fffdf5', 'fffdf9', 'f8fafc', 'f4f6f9', 'f9fafb',
    'ffffff', 'fff', 'fafafa', 'f1f5f9', 'f5f5f5', 'fefefe', 'fcfcfd',
}


def surface_for(literal):
    """Which surface token `bg-white` (and friends) should become here."""
    if SHEET.search(literal):
        return 'surface-overlay'
    if PAGE_ROOT.search(literal):
        return 'surface'
    if STICKY.search(literal):
        return 'surface'
    return 'surface-raised'


# --- mappings ---------------------------------------------------------------
TEXT_MAP = {
    'text-slate-900': 'text-content', 'text-slate-800': 'text-content',
    'text-gray-900': 'text-content', 'text-gray-800': 'text-content',
    'text-zinc-900': 'text-content', 'text-black': 'text-content',
    'text-slate-700': 'text-content-secondary',
    'text-slate-600': 'text-content-secondary',
    'text-gray-700': 'text-content-secondary',
    'text-gray-600': 'text-content-secondary',
    'text-slate-500': 'text-content-muted',
    'text-gray-500': 'text-content-muted',
    'text-slate-400': 'text-content-faint',
    'text-gray-400': 'text-content-faint',
    'text-slate-300': 'text-content-faint',
}

BORDER_MAP = {
    'border-slate-50': 'border-line-soft',
    'border-slate-100': 'border-line-soft',
    'border-gray-100': 'border-line-soft',
    'border-slate-200': 'border-line',
    'border-gray-200': 'border-line',
    'border-slate-300': 'border-line-strong',
    'border-gray-300': 'border-line-strong',
    'divide-slate-100': 'divide-line-soft',
    'divide-slate-200': 'divide-line',
    'divide-gray-100': 'divide-line-soft',
    'ring-slate-200': 'ring-line',
    'ring-slate-100': 'ring-line-soft',
}

MUTED_BG = {
    'bg-slate-100', 'bg-gray-100', 'bg-zinc-100',
    'bg-slate-200', 'bg-gray-200',
}
SUNKEN_BG = {'bg-slate-50', 'bg-gray-50', 'bg-zinc-50', 'bg-neutral-50'}

PLACEHOLDER_MAP = {
    'placeholder-slate-400': 'placeholder-content-faint',
    'placeholder-slate-500': 'placeholder-content-muted',
    'placeholder:text-slate-400': 'placeholder:text-content-faint',
    'placeholder:text-slate-500': 'placeholder:text-content-muted',
}

VARIANT = re.compile(r'^((?:[a-z-]+(?:\[[^\]]*\])?:)*)(.+)$')


def split_variants(token):
    m = VARIANT.match(token)
    if not m:
        return '', token
    return m.group(1), m.group(2)


def map_utility(util, literal):
    """Map a bare utility (no variant prefix) to its dark counterpart."""
    coloured = bool(COLOURED_BG.search(literal))

    # --- backgrounds ---
    if util == 'bg-white':
        return 'bg-' + surface_for(literal)

    m = re.match(r'^bg-white/(\d{1,3})$', util)
    if m:
        alpha = int(m.group(1))
        # A low-alpha white is a highlight laid over something coloured — a
        # glass pill on the orange header, a divider on a photo. It is not a
        # surface and must stay white in both themes.
        if alpha < 40:
            return None
        return f'bg-{surface_for(literal)}/{alpha}'

    m = re.match(r'^bg-\[#([0-9a-fA-F]{3,8})\]$', util)
    if m and m.group(1).lower() in LIGHT_HEX:
        return 'bg-' + surface_for(literal)

    if util in SUNKEN_BG:
        return 'bg-surface' if PAGE_ROOT.search(literal) else 'bg-surface-raised'
    if util in MUTED_BG:
        return 'bg-surface-muted'

    # --- text ---
    if util in TEXT_MAP:
        # On a fill that keeps its colour in dark mode, the text must keep its
        # colour too. Dark text on a yellow badge stays dark.
        if coloured:
            return None
        return TEXT_MAP[util]

    # --- borders, dividers, rings ---
    if util in BORDER_MAP:
        return BORDER_MAP[util]
    m = re.match(r'^(border|divide|ring)-(slate|gray)-(\d{2,3})/(\d{1,3})$', util)
    if m:
        kind, _, shade, alpha = m.groups()
        base = {'50': 'line-soft', '100': 'line-soft', '200': 'line',
                '300': 'line-strong'}.get(shade)
        if base:
            return f'{kind}-{base}/{alpha}'

    if util in PLACEHOLDER_MAP:
        return PLACEHOLDER_MAP[util]

    return None


# Utility families already handled in a literal are skipped, so a hand-written
# dark: class is never doubled up or overridden by a generated one.
def family(util):
    for pre in ('bg-', 'text-', 'border-', 'divide-', 'ring-', 'placeholder'):
        if util.startswith(pre):
            return pre
    return util


CLASS_TOKEN = re.compile(r'[A-Za-z0-9_\-/\[\]#().,%:]+')


def process_literal(body):
    """Return the rewritten class-list body, plus the additions made."""
    tokens = body.split()
    if not tokens:
        return body, []

    existing_dark_families = {
        family(split_variants(t[5:])[1])
        for t in tokens if t.startswith('dark:')
    }

    additions = []
    for tok in tokens:
        if '${' in tok or '{' in tok or '}' in tok:
            continue
        if tok.startswith('dark:'):
            continue
        prefix, util = split_variants(tok)
        if 'dark:' in prefix:
            continue
        mapped = map_utility(util, body)
        if not mapped:
            continue
        if family(util) in existing_dark_families:
            continue
        new_tok = f'dark:{prefix}{mapped}'
        if new_tok in tokens or new_tok in additions:
            continue
        additions.append(new_tok)

    if not additions:
        return body, []
    return body.rstrip() + ' ' + ' '.join(additions), additions


STRING_LIT = re.compile(r'"([^"\n]*)"' r"|'([^'\n]*)'" r'|`([^`]*)`', re.S)
TRIGGER = re.compile(
    r'\b(bg-white|bg-slate-\d|bg-gray-\d|text-slate-\d|text-gray-\d|'
    r'border-slate-\d|border-gray-\d|divide-slate-\d|ring-slate-\d|'
    r'placeholder-slate-\d|bg-\[#)'
)


def process_file(path):
    src = open(path).read()
    out = []
    last = 0
    total = []

    for m in STRING_LIT.finditer(src):
        body = m.group(1) if m.group(1) is not None else (
            m.group(2) if m.group(2) is not None else m.group(3))
        quote = '"' if m.group(1) is not None else ("'" if m.group(2) is not None else '`')
        if body is None or not TRIGGER.search(body):
            continue
        # Skip anything that is plainly not a class list.
        if '\n' in body and quote != '`':
            continue
        if body.strip().startswith(('http', '/', 'M ')) or '<' in body:
            continue

        new_body, adds = process_literal(body)
        if not adds:
            continue
        out.append(src[last:m.start()])
        out.append(quote + new_body + quote)
        last = m.end()
        total.extend(adds)

    if not total:
        return 0
    out.append(src[last:])
    open(path, 'w').write(''.join(out))
    return len(total)


def main():
    apply = '--apply' in sys.argv
    targets = []
    for base, _, files in os.walk(os.path.join(ROOT, 'src')):
        for f in files:
            if not f.endswith(('.js', '.jsx')):
                continue
            full = os.path.join(base, f)
            rel = os.path.relpath(full, ROOT)
            if in_scope(rel):
                targets.append((rel, full))

    targets.sort()
    grand = 0
    for rel, full in targets:
        if not apply:
            src = open(full).read()
            n = 0
            for m in STRING_LIT.finditer(src):
                body = m.group(1) or m.group(2) or m.group(3)
                if body and TRIGGER.search(body):
                    _, adds = process_literal(body)
                    n += len(adds)
        else:
            n = process_file(full)
        if n:
            print(f'{n:5d}  {rel}')
            grand += n
    print(f'\nTOTAL {grand} dark: utilities across {len([1 for r,f in targets])} scanned files')


if __name__ == '__main__':
    main()
