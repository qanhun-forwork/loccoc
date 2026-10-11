"""Synthesized score + SFX for the 12.075 s sting (124 BPM, drop at beat 5 = 2.467 s).
Deterministic: no random module, noise comes from a seeded generator.
Writes raw.wav (stereo, 48 kHz); master.sh normalizes to -14 LUFS / -1 dBTP."""
import wave
import numpy as np

SR = 48000
DUR = 12.075
N = int(round(DUR * SR))
t_all = np.arange(N) / SR
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(124)


def beat(k):
    return 0.048 + 0.4838 * k


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(sig, t0, gain=1.0, pan=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N:
        return
    s = sig[: N - i0] if i0 >= 0 else sig[-i0:]
    i0 = max(i0, 0)
    gl, gr = gain * np.sqrt(0.5 * (1 - pan)), gain * np.sqrt(0.5 * (1 + pan))
    L[i0:i0 + len(s)] += s * gl
    R[i0:i0 + len(s)] += s * gr


def fft_filter(x, lo=None, hi=None):
    """Zero-phase band limit with soft (raised cosine, ~1/3 octave) skirts."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= np.clip(1 - np.log2(np.maximum(f, 1) / hi) / 0.5, 0, 1)
    if lo:
        g *= np.clip(np.log2(np.maximum(f, 1) / lo) / 0.5 + 1, 0, 1)
    return np.fft.irfft(X * g, n)


def svf_bp(x, fc, q=2.0):
    """State-variable band-pass with per-sample cutoff array fc."""
    y = np.zeros_like(x)
    low = band = 0.0
    damp = 1.0 / q
    for i in range(len(x)):
        fr = 2 * np.sin(np.pi * min(fc[i], SR / 6) / SR)
        high = x[i] - low - damp * band
        band += fr * high
        low += fr * band
        y[i] = band
    return y


def env_adsr(n, a, d, s=0.0, r=0.0, hold=0.0):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), 1.0)
    td = t - a - hold
    dec = s + (1 - s) * np.exp(-np.maximum(td, 0) / max(d, 1e-4))
    e = np.where(t < a, e, np.where(td < 0, 1.0, dec))
    if r:
        tail = int(r * SR)
        e[-tail:] *= np.linspace(1, 0, tail)
    return e


def saw(freq, n, detune=0.0, phase=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for d in (-detune, 0, detune):
        p = (t * freq * (1 + d) + phase) % 1.0
        out += 2 * p - 1
    return out / 3


# ---------------------------------------------------------------- music
DROP = 5
CHORDS = {  # bar start beat -> midi notes
    1: [53, 57, 60, 64],        # Fmaj7 (intro)
    5: [57, 60, 64, 67, 71],    # Am9
    9: [53, 57, 60, 64],        # Fmaj7
    13: [48, 52, 55, 59, 64],   # Cmaj7
    17: [55, 59, 62, 64],       # G6
    21: [57, 60, 64, 67, 71],   # Am9
}
ROOT = {1: 41, 5: 45, 9: 41, 13: 48, 17: 43, 21: 45}
LAST_BEAT = 25


def chord_at(k):
    return CHORDS[max(b for b in CHORDS if b <= k)]


def root_at(k):
    return ROOT[max(b for b in ROOT if b <= k)]


# kick sidechain envelope (applied to pad + bass)
duck = np.ones(N)
for k in range(DROP, LAST_BEAT):
    i0 = int(beat(k) * SR)
    n = int(0.22 * SR)
    seg = 1 - 0.7 * np.exp(-np.arange(n) / SR / 0.09)
    duck[i0:i0 + n] = np.minimum(duck[i0:i0 + n], seg[: max(0, min(n, N - i0))])

# pad: whole film, soft and filtered in the intro, opening after the drop
pad = np.zeros(N)
for b0, notes in CHORDS.items():
    t0 = beat(b0 if b0 > 1 else 0)
    t1 = beat(b0 + 4) if b0 + 4 in CHORDS else DUR
    n = int((t1 - t0 + 0.4) * SR)
    seg = sum(saw(note(m), n, 0.004, phase=m * 0.137) for m in notes) / len(notes)
    e = env_adsr(n, 0.35 if b0 == 1 else 0.02, 10, 1, 0.4)
    i0 = int(t0 * SR)
    pad[i0:i0 + n][: N - i0] += (seg * e)[: N - i0]
pad_intro = fft_filter(pad, hi=700)
pad_open = fft_filter(pad, lo=120, hi=2600)
mixw = np.clip((t_all - beat(3)) / (beat(DROP) - beat(3)), 0, 1) ** 2
padm = (pad_intro * (1 - mixw) + pad_open * mixw) * np.where(t_all < beat(DROP), np.clip(t_all / 1.2, 0, 1), 1.0)
padm *= np.where(t_all >= beat(DROP), duck, 1.0)
L += 0.16 * padm
R += 0.16 * np.roll(padm, 240)

# kick
for k in range(DROP, LAST_BEAT):
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 46 + 95 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    k_sig = np.sin(ph) * np.exp(-t / 0.16) + 0.25 * np.sin(ph * 2) * np.exp(-t / 0.02)
    k_sig += 0.15 * fft_filter(rng.standard_normal(n), lo=1500, hi=6000) * np.exp(-t / 0.004)
    add(k_sig, beat(k), 0.9)

# clap on 2 and 4 of each bar after the drop
for k in range(DROP + 1, LAST_BEAT, 2):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    nz = fft_filter(rng.standard_normal(n), lo=900, hi=5000)
    e = sum(np.exp(-np.maximum(t - o, 0) / 0.008) * (t >= o) for o in (0, 0.011, 0.022)) * 0.6
    e += 0.6 * np.exp(-np.maximum(t - 0.022, 0) / 0.09) * (t >= 0.022)
    add(nz * e, beat(k) - 0.022, 0.32, pan=-0.05)

# hats: soft offbeats in the intro, offbeat open-ish + 16ths after the drop
for k in range(2, LAST_BEAT):
    for sub, g, dec in ((0.5, 1.0, 0.045), (0.25, 0.35, 0.015), (0.75, 0.35, 0.015)):
        if k < DROP and sub != 0.5:
            continue
        n = int(0.12 * SR)
        t = np.arange(n) / SR
        h = fft_filter(rng.standard_normal(n), lo=7000, hi=16000) * np.exp(-t / dec)
        gain = g * (0.05 if k < DROP else 0.11)
        add(h, beat(k + sub), gain, pan=0.25 if sub == 0.5 else -0.2)

# bass: offbeat roots after the drop
for k in range(DROP, LAST_BEAT):
    m = root_at(k) - 12
    n = int(0.26 * SR)
    b = saw(note(m), n, 0.002) + 0.6 * np.sin(2 * np.pi * note(m) * np.arange(n) / SR)
    b = fft_filter(b, hi=420) * env_adsr(n, 0.004, 0.12, 0.3, 0.05)
    add(b, beat(k + 0.5), 0.34)

# chord stabs: house syncopation (the "and" of 2 and the 4) after the drop
for k in range(DROP, LAST_BEAT):
    if (k - DROP) % 4 in (1, 3):
        notes = chord_at(k)
        n = int(0.32 * SR)
        st = sum(saw(note(m + 12), n, 0.006, m * 0.31) for m in notes) / len(notes)
        st = fft_filter(st, lo=250, hi=3800) * env_adsr(n, 0.003, 0.11, 0.0)
        add(st, beat(k + 0.5 if (k - DROP) % 4 == 1 else k), 0.17, pan=0.15 if k % 2 else -0.15)

# intro riser into the drop (beats 2.5 -> 5)
t0, t1 = beat(2.5), beat(DROP) - 0.01
n = int((t1 - t0) * SR)
tt = np.linspace(0, 1, n)
riser = svf_bp(rng.standard_normal(n), 400 * (14 ** tt), 1.8) * tt ** 2.2
add(riser, t0, 0.1)

# ---------------------------------------------------------------- SFX
def whoosh(peak, rise=0.42, fall=0.16, gain=0.2, f0=250, f1=3600, pan=0.0):
    n = int((rise + fall) * SR)
    t = np.arange(n) / SR
    up = t < rise
    e = np.where(up, (t / rise) ** 2.6, np.exp(-(t - rise) / (fall / 3)))
    fc = np.where(up, f0 * (f1 / f0) ** (t / rise), f1 * (0.5 ** ((t - rise) / fall)))
    w = svf_bp(rng.standard_normal(n), fc, 1.4) * e
    add(w, peak - rise, gain * 0.6, pan=pan - 0.3)
    add(np.roll(w, 90), peak - rise, gain * 0.6, pan=pan + 0.3)


def impact(t0, gain=0.4):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * (52 + 30 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.28)
    s += 0.35 * fft_filter(rng.standard_normal(n), hi=900) * np.exp(-t / 0.06)
    add(s * np.clip(t / 0.004, 0, 1), t0, gain)


def hit(t0, gain=0.33):
    n = int(0.8 * SR)
    t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in ((110, 1, 0.3), (220, .5, .18), (660, .25, .08), (1320, .12, .05)))
    s += 0.6 * fft_filter(rng.standard_normal(n), lo=1800, hi=11000) * np.exp(-t / 0.05)
    add(s, t0, gain)
    # small pre-swell so the hit lands rather than pops
    n2 = int(0.25 * SR)
    sw = fft_filter(rng.standard_normal(n2), lo=2000, hi=9000) * np.linspace(0, 1, n2) ** 3
    add(sw, t0 - 0.25, gain * 0.25)


def click(t0, gain=0.22):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    c = np.sin(2 * np.pi * 3100 * t) * np.exp(-t / 0.0022) + 0.5 * np.sin(2 * np.pi * 1450 * t) * np.exp(-t / 0.004)
    add(c, t0, gain, pan=0.1)
    add(0.6 * c, t0 + 0.07, gain * 0.7, pan=0.1)  # release


def tick(t0, gain):
    n = int(0.02 * SR)
    t = np.arange(n) / SR
    c = np.sin(2 * np.pi * 4600 * t) * np.exp(-t / 0.0012) + 0.4 * fft_filter(rng.standard_normal(n), lo=3000) * np.exp(-t / 0.001)
    add(c, t0, gain, pan=0.2)


def shimmer(t0, gain=0.12):
    n = int(1.9 * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for i, m in enumerate((81, 88, 93, 95, 100, 105)):
        f = note(m) * (1 + 0.003 * np.sin(2 * np.pi * (5 + i) * t))
        s += np.sin(2 * np.pi * np.cumsum(f) / SR + i) * np.exp(-t / (0.9 - 0.1 * i)) / (1 + 0.3 * i)
    s *= np.clip(t / 0.03, 0, 1)
    s += 0.25 * fft_filter(rng.standard_normal(n), lo=6000, hi=15000) * np.exp(-t / 0.25)
    add(s, t0, gain, pan=-0.2)
    add(np.roll(s, 300), t0, gain * 0.8, pan=0.3)


impact(0.10, 0.42)
for p in (2.402, 3.370, 5.305, 10.043):
    whoosh(p)
hit(6.240)
hit(8.175)
click(2.33)
click(3.83)
t = 4.04
i = 0
while t <= 5.0:
    tick(t, 0.035 + 0.025 * ((i * 7919) % 13) / 13)
    t += 0.032
    i += 1
shimmer(10.05)

# soft bus glue
for ch in (L, R):
    ch[:] = np.tanh(ch * 1.2) / 1.2
mx = max(np.abs(L).max(), np.abs(R).max())
st = np.stack([L, R], 1) / mx * 0.7
with wave.open('raw.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
print('wrote raw.wav', N / SR, 's')
