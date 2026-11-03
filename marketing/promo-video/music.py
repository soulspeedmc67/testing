"""
Music bed and sound accents for the promo, synthesized from scratch (no samples,
nothing to license). Writes music.wav next to this file; render.js muxes it in.

    python3 marketing/promo-video/music.py

The timeline matches index.html at 30 fps: the offers sheet rises at frame 690
(23.0 s) and the end sheet at frame 1056 (35.2 s), so the music lifts and
resolves on those cuts.
"""
import os
import subprocess
import wave

import numpy as np

SR = 48000
DUR = 40.0
N = int(SR * DUR)
T = np.arange(N) / SR
rng = np.random.default_rng(7)

EIGHTH = 23.0 / 64          # 8 bars of 8 eighths land the offers cut on a downbeat
BAR = EIGHTH * 8


def frame(f):
    return f / 30.0


def hz(note):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    name, octave = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[name] + 12 * (octave + 1) - 69) / 12)


# Bars 0-10 are 8 eighths; bar 11 stretches to 10 so the home chord lands on the end sheet.
bar_len = [8] * 11 + [10]
bar_start = [0.0]
for n in bar_len:
    bar_start.append(bar_start[-1] + n * EIGHTH)
END_CHORD = bar_start[12]   # ~35.22 s

PROG = ['D', 'Bm', 'G', 'A'] * 3
PAD = {
    'D': ['D3', 'A3', 'C#4', 'E4', 'F#4'],
    'Bm': ['B2', 'F#3', 'A3', 'D4', 'E4'],
    'G': ['G2', 'D3', 'B3', 'F#4', 'A4'],
    'A': ['A2', 'E3', 'B3', 'C#4', 'E4'],
    'Dend': ['D3', 'A3', 'E4', 'F#4', 'A4'],
}
ARP = {
    'D': ['D5', 'E5', 'F#5', 'A5'],
    'Bm': ['B4', 'D5', 'F#5', 'A5'],
    'G': ['G4', 'B4', 'D5', 'F#5'],
    'A': ['A4', 'B4', 'C#5', 'E5'],
}
BASS = {'D': 'D2', 'Bm': 'B1', 'G': 'G1', 'A': 'A1'}
PATTERN = [0, 2, 1, 3, 2, 1, 3, 2, 0, 2]

L = np.zeros(N)
R = np.zeros(N)
WET_L = np.zeros(N)
WET_R = np.zeros(N)


def add(sig, start, gain=1.0, pan=0.0, wet=0.0):
    """Mix a mono signal in at `start` seconds, panned (-1..1), with a reverb send."""
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    tail = min(len(sig), int(0.015 * SR))                     # never cut a note off mid-wave
    sig[-tail:] *= np.cos(np.linspace(0, np.pi / 2, tail)) ** 2
    lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * lg
    R[i:i + len(sig)] += sig * rg
    WET_L[i:i + len(sig)] += sig * lg * wet
    WET_R[i:i + len(sig)] += sig * rg * wet


def env_adsr(length, attack, release):
    n = int(length * SR)
    e = np.ones(n)
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    e[-r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return e


def pad_voice(freq, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, 6):
        amp = 1 / k ** 2.2
        for detune in (-0.0025, 0.0025):
            out += amp * np.sin(2 * np.pi * freq * k * (1 + detune) * t + rng.uniform(0, 2 * np.pi))
    out *= 1 + 0.08 * np.sin(2 * np.pi * 0.23 * t + rng.uniform(0, 6))
    return out


def marimba(freq, length=1.2, decay=0.32):
    n = int(length * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t / decay)
    body += 0.22 * np.sin(2 * np.pi * freq * 3.93 * t) * np.exp(-t / (decay * 0.18))
    body += 0.06 * np.sin(2 * np.pi * freq * 9.2 * t) * np.exp(-t / (decay * 0.06))
    a = int(0.004 * SR)
    body[:a] *= np.linspace(0, 1, a)
    return body


def bell(freq, length=2.4, decay=0.8):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, amp, d in ((1, 1, 1), (2.0, 0.35, 0.6), (2.76, 0.25, 0.35), (5.4, 0.08, 0.15)):
        out += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / (decay * d))
    a = int(0.003 * SR)
    out[:a] *= np.linspace(0, 1, a)
    return out


def kick(length=0.45):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = 44 + 80 * np.exp(-t / 0.04)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t / 0.13)


def lowpass_sweep(noise, cutoffs):
    """One-pole low-pass with a per-sample cutoff."""
    out = np.empty_like(noise)
    y = 0.0
    coeff = 1 - np.exp(-2 * np.pi * cutoffs / SR)
    for i in range(len(noise)):
        y += coeff[i] * (noise[i] - y)
        out[i] = y
    return out


def shaker(length=0.06):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    x = np.diff(x, prepend=0)              # tilt toward the highs
    return x * np.exp(-t / 0.018)


def whoosh(length, peak_at, lo=250, hi=5200):
    n = int(length * SR)
    t = np.arange(n) / SR
    shape = np.where(t < peak_at, (t / peak_at) ** 2, np.exp(-(t - peak_at) / (length * 0.22)))
    cut = lo + (hi - lo) * shape
    x = lowpass_sweep(rng.standard_normal(n), cut)
    x -= lowpass_sweep(x, np.full(n, 180.0))   # remove rumble
    return x * shape


def pop(freq):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = freq * (1 - 0.06 * np.exp(-t / 0.012))
    phase = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(phase) + 0.18 * np.sin(2 * phase)) * np.exp(-t / 0.09)


# ---- pad: one chord per bar, crossfaded; a home chord rings out at the end ----
for b, chord in enumerate(PROG):
    start, end = bar_start[b], bar_start[b + 1]
    length = end - start + 1.4
    for j, note in enumerate(PAD[chord]):
        v = pad_voice(hz(note), length) * env_adsr(length, 0.9 if b else 1.6, 1.5)
        add(v, start, gain=0.05, pan=(-0.5 + j * 0.25), wet=0.55)
end_len = DUR - END_CHORD
for j, note in enumerate(PAD['Dend']):
    v = pad_voice(hz(note), end_len) * env_adsr(end_len, 0.5, 2.8)
    add(v, END_CHORD, gain=0.055, pan=(-0.5 + j * 0.25), wet=0.6)

# ---- arpeggio from bar 1; doubled an octave up for the offers (bars 8-11) ----
for b, chord in enumerate(PROG):
    if b == 0:
        continue
    tones = ARP[chord]
    for e in range(bar_len[b]):
        t0 = bar_start[b] + e * EIGHTH
        f = hz(tones[PATTERN[e % len(PATTERN)]])
        accent = 1.0 if e % 4 == 0 else 0.72
        swell = 0.75 if b == 1 else 1.0
        add(marimba(f), t0, gain=0.15 * accent * swell, pan=0.28 if e % 2 else -0.28, wet=0.35)
        if b >= 8 and e % 2 == 1:
            add(marimba(f * 2, decay=0.22), t0, gain=0.05, pan=-0.45 if e % 4 == 1 else 0.45, wet=0.5)

# ---- bass: root on 1 and the "and" of 2 ----
for b, chord in enumerate(PROG):
    if b == 0:
        continue
    f = hz(BASS[chord])
    for pos in (0, 3) if bar_len[b] == 8 else (0, 3, 8):
        n = int(1.2 * SR)
        t = np.arange(n) / SR
        tone = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.5)
        tone[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
        add(tone, bar_start[b] + pos * EIGHTH, gain=0.2)

# ---- light pulse from bar 2 until the end sheet ----
for b in range(2, 12):
    for e in range(bar_len[b]):
        t0 = bar_start[b] + e * EIGHTH
        if e % 4 == 0:
            add(kick(), t0, gain=0.3)
        if e % 2 == 1:
            add(shaker(), t0, gain=0.075 if b < 8 else 0.1, pan=0.3, wet=0.15)

# ---- accents, synced to the picture ----
add(whoosh(0.75, 0.42), frame(4), gain=0.14, wet=0.3)            # logo dash streaks in
add(kick() * 0.6, frame(19), gain=0.22)                          # ...and lands
add(bell(hz('D6')), frame(19), gain=0.05, wet=0.6)
for f in (444, 478, 512):                                        # how-it-works steps
    add(marimba(hz('A5'), decay=0.12), frame(f), gain=0.06, wet=0.4)
add(whoosh(0.9, 0.55, lo=150, hi=2600), frame(682), gain=0.12, wet=0.35)   # offers sheet
add(bell(hz('D6'), decay=0.9), frame(750), gain=0.07, wet=0.5)   # Rs 60 lands
add(bell(hz('A6'), decay=0.9), frame(750) + 0.07, gain=0.06, wet=0.5)
for f, note in ((934, 'D6'), (950, 'E6'), (966, 'F#6')):         # FREE, FREE, FREE
    add(pop(hz(note)), frame(f), gain=0.09, wet=0.35)
add(whoosh(0.9, 0.55, lo=150, hi=2600), frame(1048), gain=0.12, wet=0.35)  # end sheet
add(whoosh(0.75, 0.42), frame(1076), gain=0.12, wet=0.3)          # end logo dash
add(bell(hz('D6'), length=3.5, decay=1.3), frame(1095), gain=0.06, wet=0.65)
add(bell(hz('A6'), length=3.5, decay=1.3), frame(1095) + 0.09, gain=0.04, wet=0.65)

# ---- reverb: convolution with a decaying stereo noise tail ----
ir_n = int(2.6 * SR)
ir_t = np.arange(ir_n) / SR
size = 1 << int(np.ceil(np.log2(N + ir_n)))
out = []
for dry, wet in ((L, WET_L), (R, WET_R)):
    ir = rng.standard_normal(ir_n) * np.exp(-ir_t / 0.38)
    ir = np.convolve(ir, np.ones(6) / 6, mode='same')        # darken the tail
    ir[: int(0.012 * SR)] = 0                                 # pre-delay
    ir /= np.sqrt(np.sum(ir ** 2))
    tail = np.fft.irfft(np.fft.rfft(wet, size) * np.fft.rfft(ir, size), size)[:N]
    out.append(dry + 0.9 * tail)
mix = np.stack(out, axis=1)

# Fades and a gentle safety limiter.
fade_in = int(0.25 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
fade_out = int(2.2 * SR)
mix[-fade_out:] *= (np.cos(np.linspace(0, np.pi / 2, fade_out)) ** 2)[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.2) / np.tanh(1.2)

here = os.path.dirname(os.path.abspath(__file__))
raw = os.path.join(here, 'music.raw.wav')
with wave.open(raw, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32000).astype('<i2').tobytes())

# Loudness for phones and social feeds: measure, then one fixed gain to -16 LUFS
# (a fixed gain keeps the fades and the lift into the offers intact).
report = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                        capture_output=True, text=True).stderr
lufs = float(report.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0])
peak = float(report.split('True peak:')[1].split('Peak:')[1].split('dBFS')[0])
gain = min(-16.0 - lufs, -1.5 - peak)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', f'volume={gain:.2f}dB',
                os.path.join(here, 'music.wav')], check=True)
os.remove(raw)
print('wrote music.wav: %.1f LUFS before, gain %+.1f dB, end chord at %.2fs' % (lufs, gain, END_CHORD))
