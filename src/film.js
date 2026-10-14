/* 16:9 film, 24.5 s at 120 BPM (beat 0.5 s). Part 1 (0–12 s): the hall is built in the real order of work; captions use the
   dates in 《太和殿纪事》 (via 王子林 2020). Part 2 (12–24.5 s): cuts every 2 s on the beat. The sun runs from midday to
   sunset across the whole film. Pure function of t. */
const FILM = { DUR: 24.5, FPS: 30 };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
// build phases (see director.js)
FILM.PHASES = {
  tier0: { t: .35, dur: .8, spread: .25, type: 'rise', H: 4.3, order: 'center' },
  tier1: { t: .85, dur: .8, spread: .2, type: 'rise', H: 6.4, order: 'center' },
  tier2: { t: 1.35, dur: .8, spread: .2, type: 'rise', H: 8.3, order: 'center' },
  stairs: { t: 1.7, dur: .7, spread: .5, type: 'rise', H: 8.2, order: 'front' },
  balus: { t: 1.9, dur: .35, spread: 1.0, type: 'pop', order: 'angle' },
  ground: { t: -10, dur: .1, type: 'drop', H: 0 },
  cols: { t: 3.15, dur: .5, spread: .85, type: 'grow', order: 'center' },
  body: { t: 3.9, dur: .6, spread: .5, type: 'rise', H: 7.5, order: 'angle' },
  beams: { t: 4.1, dur: .5, spread: .7, type: 'drop', H: 3, order: 'angle' },
  bracketsLo: { t: 4.9, dur: .45, spread: .8, type: 'drop', H: 2.5, order: 'angle' },
  bracketsUp: { t: 5.5, dur: .45, spread: .8, type: 'drop', H: 2.5, order: 'angle' },
  rafters: { t: 6.3, dur: .45, spread: .6, type: 'drop', H: 2, order: 'angle' },
  tilesLo: { t: 7.15, dur: .4, spread: 1.1, type: 'drop', H: 1.6, order: 'roof' },
  tilesUp: { t: 7.9, dur: .4, spread: 1.4, type: 'drop', H: 1.6, order: 'roof' },
  weiji: { t: 9.2, dur: .5, spread: .3, type: 'drop', H: 2, order: 'angle' },
  ridge: { t: 9.45, dur: .5, spread: .2, type: 'drop', H: 2.5, order: 'center' },
  hips: { t: 9.55, dur: .4, spread: .6, type: 'pop', order: 'angle' },
  wen: { t: 10.55, dur: .5, type: 'slam', H: 9 },
  plaque: { t: 11.0, dur: .4, type: 'pop' },
  fur: { t: 11.0, dur: .45, spread: .5, type: 'drop', H: 3, order: 'center' },
};
FILM.IMPACTS = [[1.15, .06], [1.65, .06], [2.15, .07], [11.05, .16]];   // [time, metres of camera shake]
FILM.SHOTS = [
  // part 1: building
  { t0: 0, t1: 3, from: { pos: [-112, 9, 118], tgt: [0, -5, 12], fov: 34 }, to: { pos: [-88, 22, 104], tgt: [0, -3, 10], fov: 34 },
    cap: [['动土', 'big'], ['康熙三十四年二月二十五日', 'small']] },
  { t0: 3, t1: 7, from: { pos: [-74, 9, 72], tgt: [0, 5, 4], fov: 34 }, to: { pos: [-34, 17, 84], tgt: [0, 7, 4], fov: 34 },
    cap: [['竖柱 · 上梁', 'big'], ['康熙三十四年八月二十四日、十二月十七日', 'small']] },
  { t0: 7, t1: 10, from: { pos: [62, 46, 88], tgt: [0, 13, 0], fov: 34 }, to: { pos: [30, 42, 98], tgt: [0, 14, 0], fov: 34 },
    cap: [['二样黄琉璃瓦', 'big'], ['瓦件八万余件', 'small']] },
  { t0: 10, t1: 12, from: { pos: [-3, 21.5, 19], tgt: [-14, 26.5, 0], fov: 36 }, to: { pos: [-5, 22.5, 17], tgt: [-14.2, 26.3, 0], fov: 33 },
    cap: [['安吻', 'big'], ['康熙三十六年六月二十七日', 'small']] },
  // part 2: on the beat
  { t0: 12, t1: 14, ramp: true, from: { pos: [0, -6.6, 116], tgt: [0, 6, 0], fov: 30 }, to: { pos: [0, 1.6, 56], tgt: [0, 10, 0], fov: 30 }, cap: [] },
  { t0: 14, t1: 16, from: { pos: [23.5, 11.6, 31], tgt: [31.4, 9.7, 18.8], fov: 24 }, to: { pos: [36.5, 12.4, 30], tgt: [31.8, 9.8, 18.8], fov: 22 },
    cap: [['仙人 + 十走兽', 'mid'], ['现存古建中仅此一例', 'small']] },
  { t0: 16, t1: 18, from: { pos: [-26, 3.4, 21.6], tgt: [-22, 8.4, 15], fov: 46 }, to: { pos: [4, 3.4, 21.6], tgt: [8, 8.4, 15], fov: 46 },
    cap: [['下檐七踩 · 上檐九踩', 'mid'], ['外檐斗拱 372 攒', 'small']] },
  { t0: 18, t1: 20, from: { pos: [5, 19.5, 21], tgt: [14, 26, 0], fov: 30 }, to: { pos: [21, 20.5, 19], tgt: [14.2, 26.2, 0], fov: 28 },
    cap: [['正吻高 3.4 米', 'mid'], ['十三块琉璃拼成', 'small']] },
  { t0: 20, t1: 24.5, from: { pos: [-28, .5, 58], tgt: [0, 8, 10], fov: 36 }, to: { pos: [-78, 34, 130], tgt: [0, 9, 0], fov: 32 },
    cap: [['太和殿', 'big'], ['紫禁城内规模最大的殿宇', 'small']], capAt: 21.3 },
];
FILM.CUTS = FILM.SHOTS.slice(1).map(s => s.t0);
FILM.shot = t => FILM.SHOTS.find(s => t >= s.t0 && t < s.t1) || FILM.SHOTS.at(-1);
FILM.camera = t => {
  const s = FILM.shot(t), x = Math.min(1, Math.max(0, (t - s.t0) / (s.t1 - s.t0)));
  const u = s.ramp ? easeOut(x) : ease(x);   // speed ramp: burst off the cut, then glide
  const L = (a, b) => a.map((v, i) => v + (b[i] - v) * u), pos = L(s.from.pos, s.to.pos);
  for (const [ti, amp] of FILM.IMPACTS) { const dt = t - ti; if (dt > 0 && dt < .6) { const k = amp * Math.exp(-dt * 9); pos[0] += k * Math.sin(dt * 83 + ti); pos[1] += k * Math.cos(dt * 71 + ti * 3); } }
  return { pos, tgt: L(s.from.tgt, s.to.tgt), fov: s.from.fov + (s.to.fov - s.from.fov) * u };
};
// sun: midday → sunset across the film (azimuth from south, positive toward east; elevation in degrees)
FILM.sun = t => {
  const u = Math.min(1, t / FILM.DUR), e = u * u * (3 - 2 * u);
  return { az: -12 - 46 * e, el: 44 - 35 * e, col: new THREE.Color().lerpColors(new THREE.Color('#FFF3E2'), new THREE.Color('#FFC78A'), Math.pow(e, 1.5)), int: 2.7 - .5 * e, exp: .72 + .1 * e };
};
FILM.caption = (g, t, W, H) => {
  const s = FILM.shot(t); if (!s || !s.cap.length) return;
  const st = s.capAt ?? s.t0 + .25, a = Math.min(1, Math.max(0, (t - st) / .35)) * Math.min(1, Math.max(0, (s.t1 - .25 - t) / .3)); if (a <= 0) return;
  const u = H / 1080, x = 110 * u; let y = H - 140 * u;
  g.save(); g.textBaseline = 'alphabetic'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 16 * u;
  const lift = (1 - Math.min(1, (t - st) / .35)) * 24 * u;   // captions rise into place
  for (let i = s.cap.length - 1; i >= 0; i--) {
    const [txt, kind] = s.cap[i], size = (kind === 'big' ? 104 : kind === 'mid' ? 64 : 34) * u;
    g.globalAlpha = a; g.font = `${kind === 'small' ? 500 : 900} ${size}px "Noto Serif SC", serif`; g.fillStyle = kind === 'small' ? 'rgba(246,238,223,.92)' : '#F6EEDF';
    g.fillText(txt, x, y + lift); y -= size * 1.3;
  }
  g.shadowBlur = 0; g.fillStyle = '#B8352A'; g.fillRect(x, H - 140 * u + 22 * u + lift, 72 * u * a, 6 * u);
  g.restore();
};
window.FILM = FILM;
