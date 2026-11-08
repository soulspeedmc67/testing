"""
Soundtrack for the promo: an upbeat 120 BPM pop/house cue plus sound accents
locked to the picture. Everything is synthesized here (no samples, nothing to
license). Writes music.wav next to this file; render.js muxes it in.

    python3 marketing/promo-video/music.py

At 120 BPM one beat is exactly 15 video frames and one bar is 60, so the cuts
in index.html all land on the grid:
  bar 0  hook (Rs 60)        bar 5  how it works
  bar 1  free delivery       bar 6  payments
  bar 2  logo (breakdown)    bar 7  offer recap
  bar 3  words (the drop)    bar 8  install now
  bar 4  products            bar 9  final chord, fade
"""
import os
import subprocess
import wave

import numpy as np

SR = 48000
DUR = 20.0
N = int(SR * DUR)
BEAT = 0.5
S16 = BEAT / 4
rng = np.random.default_rng(11)


def fr(f):
    """Video frame -> seconds."""
    return f / 30.0


def hz(note):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    name, octave = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[name] + 12 * (octave + 1) - 69) / 12)


def tt(n):
    return np.arange(int(n * SR)) / SR


# ---------------------------------------------------------------- buses
MUSIC = np.zeros((N, 2))      # ducked by the kick
DRUMS = np.zeros((N, 2))
FX = np.zeros((N, 2))
SEND = np.zeros((N, 2))       # reverb send


def add(bus, sig, start, gain=1.0, pan=0.0, wet=0.0):
    i = int(round(start * SR))
    if i >= N or i + len(sig) <= 0:
        return
    sig = np.array(sig[: N - i], dtype=float) * gain
    tail = min(len(sig), int(0.01 * SR))
    sig[-tail:] *= np.cos(np.linspace(0, np.pi / 2, tail)) ** 2      # no clicks at note ends
    lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[i:i + len(sig), 0] += sig * lg
    bus[i:i + len(sig), 1] += sig * rg
    if wet:
        SEND[i:i + len(sig), 0] += sig * lg * wet
        SEND[i:i + len(sig), 1] += sig * rg * wet


def band(noise, lo, hi, soft=0.25):
    """Band-limit noise in the frequency domain with soft edges."""
    spec = np.fft.rfft(noise)
    f = np.fft.rfftfreq(len(noise), 1 / SR) + 1
    mask = 1 / (1 + (lo / f) ** (2 / soft)) if lo else np.ones_like(f)
    if hi:
        mask = mask / (1 + (f / hi) ** (2 / soft))
    return np.fft.irfft(spec * mask, len(noise))


def onepole_sweep(x, cut):
    out = np.empty_like(x)
    y = 0.0
    c = 1 - np.exp(-2 * np.pi * cut / SR)
    for i in range(len(x)):
        y += c[i] * (x[i] - y)
        out[i] = y
    return out


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-9)


# ---------------------------------------------------------------- instruments
def kick():
    t = tt(0.42)
    f = 52 + 130 * np.exp(-t / 0.025)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)
    knock = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.025) * 0.55
    click = band(rng.standard_normal(len(t)), 2000, 9000) * np.exp(-t / 0.004) * 0.7
    return np.tanh(1.6 * (body + knock + click)) / np.tanh(1.6)


def clap():
    t = tt(0.4)
    noise = band(rng.standard_normal(len(t)), 900, 5000)
    env = np.zeros_like(t)
    for k, d in enumerate((0.0, 0.011, 0.022)):
        env += (t >= d) * np.exp(-np.clip(t - d, 0, None) / (0.006 if k < 2 else 0.1))
    return norm(noise * env)


def hat(open_=False):
    t = tt(0.3 if open_ else 0.08)
    return norm(band(rng.standard_normal(len(t)), 7000, None) * np.exp(-t / (0.11 if open_ else 0.022)))


def saw(freq, length, harmonics, decay_bright, decay_body, detune=0.0):
    t = tt(length)
    out = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        if freq * k > 16000:
            break
        amp = 1 / k
        env = 0.6 * np.exp(-t * k / (decay_bright * 6)) + (0.4 * np.exp(-t / decay_body) if k <= 4 else 0)
        ph = rng.uniform(0, 2 * np.pi)
        out += amp * env * np.sin(2 * np.pi * freq * k * (1 + detune) * t + ph)
    return out


def stab(notes):
    sig = sum(saw(hz(n), 0.5, 18, 0.05, 0.2, d) for n in notes for d in (-0.004, 0.004))
    a = int(0.003 * SR)
    sig[:a] *= np.linspace(0, 1, a)
    return norm(sig)


def bass(note):
    t = tt(0.3)
    f = hz(note)
    sig = sum((1 / k) * np.exp(-k / 5) * np.sin(2 * np.pi * f * k * t) for k in range(1, 13))
    sig *= np.exp(-t / 0.16)
    sig[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return norm(np.tanh(1.4 * sig))


def pad(notes, length):
    t = tt(length)
    sig = np.zeros_like(t)
    for n in notes:
        for d in (-0.003, 0.003):
            for k in range(1, 7):
                sig += (1 / k ** 2) * np.sin(2 * np.pi * hz(n) * k * (1 + d) * t + rng.uniform(0, 6))
    a, r = int(0.25 * SR), int(0.4 * SR)
    sig[:a] *= np.linspace(0, 1, a)
    sig[-r:] *= np.linspace(1, 0, r)
    return norm(sig)


def pluck(freq, decay=0.18):
    t = tt(0.6)
    sig = np.sin(2 * np.pi * freq * t) * np.exp(-t / decay)
    sig += 0.25 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t / (decay * 0.5))
    sig += 0.12 * np.sin(2 * np.pi * freq * 3.98 * t) * np.exp(-t / (decay * 0.2))
    sig[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return sig


def bell(freq, length=1.6, decay=0.5):
    t = tt(length)
    sig = sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / (decay * d))
              for r, a, d in ((1, 1, 1), (2.0, 0.4, 0.6), (2.76, 0.3, 0.35), (5.4, 0.12, 0.15)))
    sig[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return sig


def impact(size=1.0):
    t = tt(1.4)
    f = 42 + 70 * np.exp(-t / 0.05)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.45 * size))
    crack = band(rng.standard_normal(len(t)), 300, 6000) * np.exp(-t / 0.05) * 0.6
    return np.tanh(1.3 * (boom + crack))


def chaching():
    sig = np.zeros(int(1.4 * SR))
    for start, notes in ((0.0, ('F#6', 'B6')), (0.085, ('B6', 'D#7'))):
        i = int(start * SR)
        for n in notes:
            b = bell(hz(n), 1.2, 0.35)
            sig[i:i + len(b)] += b[: len(sig) - i]
    t = tt(1.4)
    shimmer = band(rng.standard_normal(len(t)), 6000, None) * np.exp(-t / 0.25) * 0.5
    return norm(sig + shimmer)


def whoosh(length=0.4, peak=0.62, lo=300, hi=7000):
    t = tt(length)
    x = t / length
    shape = np.where(x < peak, (x / peak) ** 2.2, np.exp(-(x - peak) / 0.12))
    sig = onepole_sweep(rng.standard_normal(len(t)), lo + (hi - lo) * shape)
    sig = sig - onepole_sweep(sig, np.full(len(t), 250.0))
    return norm(sig * shape)


def riser(length):
    t = tt(length)
    x = t / length
    noise = onepole_sweep(rng.standard_normal(len(t)), 300 + 9000 * x ** 2)
    tone = np.sin(2 * np.pi * np.cumsum(220 + 880 * x ** 2) / SR) * 0.35
    return norm((noise + tone) * x ** 2.2)


def blip(freq):
    t = tt(0.3)
    f = freq * (1 + 0.5 * np.exp(-t / 0.008))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.08)


def tick():
    t = tt(0.06)
    return norm(band(rng.standard_normal(len(t)), 2500, 12000) * np.exp(-t / 0.006))


# ---------------------------------------------------------------- arrangement
PROG = ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'D']
STAB = {'Bm': ['B3', 'D4', 'F#4', 'B4'], 'G': ['G3', 'B3', 'D4', 'G4'],
        'D': ['A3', 'D4', 'F#4', 'A4'], 'A': ['A3', 'C#4', 'E4', 'A4']}
PAD = {'Bm': ['B2', 'F#3', 'D4'], 'G': ['G2', 'D3', 'B3'], 'D': ['D3', 'A3', 'F#4'], 'A': ['A2', 'E3', 'C#4']}
ROOT = {'Bm': 'B2', 'G': 'G2', 'D': 'D2', 'A': 'A2'}
ARP = {'Bm': ['B4', 'D5', 'F#5', 'B5'], 'G': ['G4', 'B4', 'D5', 'G5'],
       'D': ['A4', 'D5', 'F#5', 'A5'], 'A': ['A4', 'C#5', 'E5', 'A5']}
STAB_16THS = [0, 3, 6, 8, 11, 14]
GROOVE = {0, 1, 3, 4, 5, 6, 7, 8}          # bars with the full beat (2 is the breakdown)

cache = {}


def cached(key, fn):
    if key not in cache:
        cache[key] = fn()
    return cache[key]


K, C, CH, OH = kick(), clap(), hat(), hat(True)
for bar in range(10):
    b0 = bar * 2.0
    chord = PROG[bar]
    # bar 8 splits G -> A to lead into the final D
    chords = [(chord, 0, 16)] if bar != 8 else [('G', 0, 8), ('A', 8, 16)]

    # pad underneath everything
    for ch, s, e in chords:
        add(MUSIC, cached(('pad', ch, e - s), lambda: pad(PAD[ch], (e - s) * S16 + 0.4)), b0 + s * S16,
            gain=0.16 if bar != 2 else 0.24, wet=0.5)

    if bar in GROOVE:
        for beat in range(4):
            add(DRUMS, K, b0 + beat * BEAT, gain=0.6)
        for beat in (1, 3):
            add(DRUMS, C, b0 + beat * BEAT, gain=0.62, pan=0.05, wet=0.25)
        for s in range(16):
            if s % 4 == 2:
                add(DRUMS, OH, b0 + s * S16, gain=0.22, pan=0.25)
            elif bar >= 3 or s % 2 == 0:
                add(DRUMS, CH, b0 + s * S16, gain=0.12 if s % 2 else 0.17, pan=-0.2)
        for ch, s, e in chords:
            for p in STAB_16THS:
                if s <= p < e:
                    add(MUSIC, cached(('stab', ch), lambda: stab(STAB[ch])), b0 + p * S16,
                        gain=0.55 if p in (0, 8) else 0.44, pan=0.12 if p % 2 else -0.12, wet=0.22)
            for beat in range(s // 4, e // 4):
                add(MUSIC, cached(('bass', ch), lambda: bass(ROOT[ch])), b0 + beat * BEAT + BEAT / 2, gain=0.42)
        if 3 <= bar <= 8:                                      # sparkle on top after the drop
            for s in range(16):
                ch = chords[0][0] if s < chords[0][2] else chords[-1][0]
                n = ARP[ch][[0, 1, 2, 3, 2, 1, 3, 2][s % 8]]
                add(MUSIC, cached(('pl', n), lambda: pluck(hz(n))), b0 + s * S16,
                    gain=0.15 if s % 4 == 0 else 0.1, pan=0.35 if s % 2 else -0.35, wet=0.35)

# breakdown (bar 2): one kick, a long bass note, a snare roll and a riser into the drop
add(DRUMS, K, 4.0, gain=0.6)
add(MUSIC, cached('bsus', lambda: norm(np.tanh(1.3 * sum((1 / k) * np.exp(-k / 4) * np.sin(2 * np.pi * hz('D2') * k * tt(1.6)) for k in range(1, 10))) * np.exp(-tt(1.6) / 0.7))), 4.0, gain=0.5)
for i, s in enumerate([0, 4, 8, 10, 12, 13, 14, 15]):
    add(DRUMS, C, 5.0 + s * (S16 / 2), gain=0.12 + 0.04 * i, wet=0.2)
add(FX, riser(1.0), 5.0, gain=0.3, wet=0.3)
# a second, shorter build into the install screen
add(FX, riser(1.0), 15.0, gain=0.22, wet=0.3)

# ending: final chord on the downbeat of bar 9, beat thins out and fades
add(MUSIC, stab(['D3', 'A3', 'D4', 'F#4', 'A4']), 18.0, gain=0.6, wet=0.5)
add(MUSIC, bass('D2'), 18.0, gain=0.42)
for beat in range(4):
    add(DRUMS, K, 18.0 + beat * BEAT, gain=0.55 - 0.1 * beat)
    add(DRUMS, CH, 18.0 + beat * BEAT + BEAT / 2, gain=0.08)

# ---------------------------------------------------------------- accents on the picture
add(FX, impact(1.1), 0.0, gain=0.5, wet=0.3)                 # frame 0: Rs 60
add(FX, chaching(), 0.02, gain=0.32, wet=0.35, pan=0.05)
add(FX, whoosh(0.32), fr(63) - 0.32 * 0.62, gain=0.28)        # push to free delivery
add(FX, impact(0.8), fr(60), gain=0.4, wet=0.25)
for f, n in ((75, 'B5'), (90, 'D6'), (105, 'F#6')):           # three checks
    add(FX, blip(hz(n)), fr(f), gain=0.26, wet=0.3)
add(FX, whoosh(0.3, lo=500, hi=9000), fr(124) - 0.3 * 0.62, gain=0.22)   # iris to logo
add(FX, impact(1.2), fr(120), gain=0.45, wet=0.35)
add(FX, whoosh(0.3, peak=0.8, lo=800, hi=10000), fr(123), gain=0.18)    # logo dash
add(FX, bell(hz('F#6'), 1.8, 0.6), fr(132), gain=0.12, wet=0.5)
add(FX, impact(1.3), fr(180), gain=0.55, wet=0.35)            # the drop: "Groceries."
for f in (195, 210, 218):
    add(FX, impact(0.5), fr(f), gain=0.22, wet=0.2)
for i in range(8):                                            # product montage
    add(FX, tick(), fr(240 + i * 7.5), gain=0.16, pan=-0.3 + 0.08 * i)
add(FX, blip(hz('B6')), fr(292), gain=0.12, wet=0.3)          # 3,000+ lands
add(FX, whoosh(0.32, lo=200, hi=6000), fr(303) - 0.32 * 0.62, gain=0.26)  # push up to steps
for f in (300, 315, 330, 345):
    add(FX, whoosh(0.16, peak=0.4, lo=1500, hi=9000), fr(f), gain=0.1)
add(FX, whoosh(0.32), fr(363) - 0.32 * 0.62, gain=0.26)       # push to payments
for f, n in ((364, 'D6'), (379, 'F#6'), (394, 'A6')):
    add(FX, blip(hz(n)), fr(f), gain=0.24, wet=0.3)
add(FX, whoosh(0.3, lo=500, hi=9000), fr(424) - 0.3 * 0.62, gain=0.22)   # iris to recap
add(FX, chaching(), fr(424), gain=0.24, wet=0.35)
add(FX, blip(hz('B5')), fr(432), gain=0.16, wet=0.3)
add(FX, impact(0.6), fr(439), gain=0.3, wet=0.25)
add(FX, whoosh(0.32, lo=200, hi=6000), fr(483) - 0.32 * 0.62, gain=0.26)  # push up to install
add(FX, impact(1.2), fr(480), gain=0.5, wet=0.35)
add(FX, whoosh(0.3, peak=0.8, lo=800, hi=10000), fr(485), gain=0.16)
add(FX, impact(0.9), fr(488), gain=0.3, wet=0.3)              # "Install now."
add(FX, blip(hz('D6')), fr(502), gain=0.2, wet=0.3)           # the button pops in
add(FX, impact(1.4), 18.0, gain=0.4, wet=0.45)

# ---------------------------------------------------------------- mix
# Sidechain: the music bus dips under every kick so the beat pumps.
duck = np.ones(N)
t = np.arange(N) / SR
for bar in range(10):
    hits = range(4) if bar in GROOVE or bar == 9 else range(1)
    for beat in hits:
        k0 = bar * 2.0 + beat * BEAT
        i = int(k0 * SR)
        j = min(N, i + int(0.35 * SR))
        duck[i:j] = np.minimum(duck[i:j], 1 - 0.55 * np.exp(-(t[i:j] - k0) / 0.09))
MUSIC *= duck[:, None]

ir_n = int(1.6 * SR)
ir_t = np.arange(ir_n) / SR
size = 1 << int(np.ceil(np.log2(N + ir_n)))
wet = np.zeros_like(MUSIC)
for c in range(2):
    ir = rng.standard_normal(ir_n) * np.exp(-ir_t / 0.26)
    ir = np.convolve(ir, np.ones(5) / 5, mode='same')
    ir[: int(0.01 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2))
    wet[:, c] = np.fft.irfft(np.fft.rfft(SEND[:, c], size) * np.fft.rfft(ir, size), size)[:N]

mix = 1.0 * MUSIC + 0.85 * DRUMS + 0.9 * FX + 0.6 * wet
fade = int(1.2 * SR)
mix[-fade:] *= (np.cos(np.linspace(0, np.pi / 2, fade)) ** 2)[:, None]
mix[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.6) / np.tanh(1.6)          # glue

here = os.path.dirname(os.path.abspath(__file__))
raw = os.path.join(here, 'music.raw.wav')
with wave.open(raw, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32000).astype('<i2').tobytes())

# Social feeds normalize to about -14 LUFS: measure, set one gain, and catch peaks with a limiter.
report = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', 'ebur128', '-f', 'null', '-'],
                        capture_output=True, text=True).stderr
lufs = float(report.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0])
gain = -14.0 - lufs
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw,
                '-af', f'volume={gain:.2f}dB,alimiter=limit=0.84:attack=2:release=60:level=0',
                '-ar', str(SR), '-c:a', 'pcm_s16le', os.path.join(here, 'music.wav')], check=True)
os.remove(raw)
print('wrote music.wav (%.1f LUFS before, %+.1f dB)' % (lufs, gain))
