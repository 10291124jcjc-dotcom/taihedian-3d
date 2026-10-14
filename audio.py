"""Soundtrack for the 太和殿 film (24.5 s, 120 BPM). Every build step and every cut has a sound, on the picture's times
(src/film.js): stone grinding as the terrace rises, wood knocks for columns, clacks for brackets, a rattle of tiles,
a heavy hit when the 正吻 lands; then a driving drum section for the cuts and a bell over the title.
Run: python audio.py -> soundtrack.wav (finish.py normalizes to -14 LUFS)"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent / "tools"))
from audio_lib import *

DUR, BPM = 24.5, 120
mix = Mixer(DUR, BPM); B = mix.beat

def zheng(n, d=1.6, bright=.55, decay=.996):
    f = hz(n); N = max(2, int(round(SR / f))); total = int(d * SR)
    y = np.zeros(total + 2 * N + 1); exc = filt(rng.standard_normal(N), "lowpass", 1500 + bright * 9000)
    y[1:N + 1] = exc / (np.max(np.abs(exc)) + 1e-9)
    for s in range(N + 1, total + 1, N):
        e = min(s + N, len(y)); y[s:e] = decay * .5 * (y[s - N:e - N] + y[s - N - 1:e - N - 1])
    t = tt(d); return (y[1:total + 1] + .25 * np.sin(2 * np.pi * f * t) * np.exp(-t * 3)) * np.exp(-t * 1.1)
def taiko(big=1.0):
    d = 1.0; t = tt(d); body = np.sin(2 * np.pi * np.cumsum(58 + 95 * np.exp(-t * 18)) / SR) * np.exp(-t * 5)
    return np.tanh((body * 1.4 + filt(noise(d), "lowpass", 900) * np.exp(-t * 22) * .7) * big)
def grind(d):
    t = tt(d); return filt(noise(d), "lowpass", 600) * (.6 + .4 * np.sin(2 * np.pi * 19 * t)) * np.sin(np.pi * t / d) ** .6
def knock(n=48): d = .25; t = tt(d); return (np.sin(2 * np.pi * hz(n) * t) * np.exp(-t * 28) + filt(noise(d), "bandpass", [400, 2500]) * np.exp(-t * 60) * .6)
def clack(): d = .08; t = tt(d); return filt(noise(d), "bandpass", [1500, 6000]) * np.exp(-t * 90)
def tile_rattle(d):
    out = np.zeros(int(d * SR))
    for k in range(int(d * 90)):
        i = int(rng.random() * (len(out) - 4000)); c = clack() * (.3 + .7 * rng.random()); out[i:i + len(c)] += c
    return out * np.minimum(1, tt(d) / .15)
def bell(f0=196, d=4.0):
    t = tt(d); s = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t * k) for r, a, k in [(1, 1, .9), (2.4, .5, 1.4), (3.9, .3, 2), (5.4, .2, 2.8), (.5, .35, .6)])
    return s * np.minimum(1, t / .004) * .5
PENTA = [0, 2, 4, 7, 9]; deg = lambda i, base=62: base + 12 * (i // 5) + PENTA[i % 5]

# ---- part 1: building (0–12 s), sparse pulse that thickens
mix.add(taiko(1.4), .02, .9); mix.add(impact(.8), .02, .5); mix.add(grind(.9), 0, .6); mix.add(bell(98, 3.0), .04, .35, verb=.6)   # opening hit
mix.add(pad([38, 45], 12.3, cutoff=450, amp=.13), 0, 1.0, verb=.5)
for k, t0 in enumerate([.35, .85, 1.35]): mix.add(grind(1.0), t0, .7, verb=.3); mix.add(taiko(1.1 + .1 * k), t0 + .75, .8); mix.add(impact(.6), t0 + .75, .25)
for k in range(8): mix.add(clack(), 1.9 + k * .13, .25, pan=-.4 + k * .1)                         # balustrade popping
for k in range(12): mix.add(knock(45 + (k % 5) * 2), 3.15 + k * .075, .45, pan=-.5 + k * .08)     # columns
mix.add(grind(.7), 3.9, .45)                                                                       # walls rise
for k in range(10): mix.add(knock(52), 4.1 + k * .08, .3, pan=.4 - k * .08)                        # beams
for k in range(24): mix.add(clack(), 4.9 + k * .055, .35, pan=-.6 + (k % 12) * .1)                 # brackets
for k in range(14): mix.add(clack(), 6.3 + k * .05, .25, pan=.5 - k * .07)                         # rafters
mix.add(tile_rattle(1.6), 7.1, .6, verb=.2); mix.add(tile_rattle(1.9), 7.9, .6, verb=.2)            # tiles
for k in range(11): mix.add(blip(hz(76 + PENTA[k % 5]), hz(72 + PENTA[k % 5]), .14), 9.55 + k * .06, .12, verb=.4)   # beasts pop
mix.add(whoosh(.5, 300, 3000, rev=True), 10.55, .5)                                                 # 正吻 falls
mix.add(taiko(1.8), 11.05, 1.0); mix.add(impact(1.3), 11.05, .8); mix.add(bell(110, 3.5), 11.07, .6, verb=.7)
# rising string line through the build, one note per beat, climbing the scale
for k in range(int(10.5 / B)):
    t0 = .5 + k * B; mix.add(zheng(deg(k // 2 % 10, 50), 1.2, .5), t0, .32 + .015 * k, pan=-.2, verb=.35)
for k in range(int(8 / B)): mix.add(taiko(.5), 3.0 + k * B, .28 + .02 * k)                          # pulse from the columns on
mix.add(riser(1.0, 50, 74), 11.0, .25)

# ---- part 2: the cuts (12–24.5 s), full groove
kicks = [12 + k * B for k in range(int(8.5 / B))]
mix.sidechain(kicks, .45)
mix.add(pad([50, 57, 62, 66], 12.5, cutoff=1500, amp=.11), 12, 1.0, verb=.6, duck=True)
mix.add(pad([38, 45], 12.5, cutoff=420, amp=.1), 12, 1.0, duck=True)
for k, t0 in enumerate(kicks):
    mix.add(taiko(.9 if k % 2 == 0 else .6), t0, .6); mix.add(filt(snare(), "lowpass", 3500), t0 + B / 2, .2 if k % 2 else .3, pan=.2)
    mix.add(hat(), t0 + B / 4, .1, pan=-.3); mix.add(hat(), t0 + 3 * B / 4, .1, pan=.3)
osti = [0, 3, 4, 3, 5, 4, 3, 1]
for k in range(int(8.5 / (B / 2))): mix.add(zheng(deg(osti[k % 8], 50), .8, .45), 12 + k * B / 2, .4 if k % 2 else .5, pan=-.2, verb=.25)
for c in [12, 14, 16, 18, 20]:
    mix.add(whoosh(.4, 400, 4000, rev=True), c - .4, .35)
    for k in range(9): mix.add(zheng(deg(5 + k), 1.2, .7), c + k * .03, .14 + k * .012, pan=-.3 + k * .07, verb=.4)
mix.add(whoosh(1.0, 3000, 300), 12.0, .35)                     # dolly burst
# title: groove drops out, bell and a rolled chord
mix.add(taiko(1.5), 20.5, .9); mix.add(impact(1.0), 20.5, .5)
mix.add(bell(147, 4.0), 21.3, .7, verb=.8)
for k, n in enumerate([50, 57, 62, 66, 69, 74, 78]): mix.add(zheng(n, 3.0, .5), 21.3 + k * .08, .45, verb=.6)
mix.add(pad([50, 57, 62, 69, 74], 4.0, cutoff=1800, amp=.12), 20.5, 1.0, verb=.7)
mix.write("soundtrack.wav")
