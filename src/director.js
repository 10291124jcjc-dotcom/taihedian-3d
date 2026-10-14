/* Build-up animation: every phase mark (BUILD.marks) becomes a timed reveal. apply(t) is a pure function of t.
   types: rise (comes up from below) · drop (falls into place, springs) · grow (instances scale up in y from their base)
          pop (scales up from its own origin) · slam (accelerates down from high, lands hard) */
const DIR = { phases: {}, items: [] };
DIR.spring = (t, k = 170, d = 17) => { if (t <= 0) return 0; const w0 = Math.sqrt(k), z = d / (2 * w0), wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); };
// order value 0..1 for a point (staggering inside a phase)
DIR.ORDER = {
  center: (x, y, z) => Math.min(1, Math.hypot(x, z - 2) / 75),
  angle: (x, y, z) => Math.abs(Math.atan2(x, z - 1.5)) / Math.PI,
  height: (x, y, z) => (y + 8.13) / 36,
  roof: (x, y, z) => .65 * (1 - Math.min(1, Math.max(0, (Math.hypot(x / 1.8, z) - 0) / 22))) + .35 * Math.abs(Math.atan2(x, z)) / Math.PI,   // eaves first, toward the ridge
  front: (x, y, z) => 1 - Math.min(1, Math.max(0, (z + 160) / 240)),
};
DIR.prepare = (table) => {
  const ranges = {};
  BUILD.marks.forEach((m, i) => {
    const next = BUILD.marks.slice(i + 1).find(n => n.g === m.g), end = next ? next.idx : m.g.children.length;
    ranges[m.name] = m.g.children.slice(m.idx, end);
  });
  const box = new THREE.Box3(), c = new THREE.Vector3();
  for (const [name, ph] of Object.entries(table)) {
    const kids = ranges[name]; if (!kids) { console.warn('no phase', name); continue; }
    const ord = DIR.ORDER[ph.order || 'center'];
    for (const o of kids) {
      if (o.isInstancedMesh) {
        const B = o.instanceMatrix.array.slice(), n = o.count, del = new Float32Array(n);
        for (let i = 0; i < n; i++) del[i] = ord(B[i * 16 + 12], B[i * 16 + 13], B[i * 16 + 14]) * (ph.spread || 0);
        DIR.items.push({ o, ph, inst: true, B, del, state: null });
      } else {
        box.setFromObject(o); box.getCenter(c);
        DIR.items.push({ o, ph, inst: false, pos: o.position.clone(), scl: o.scale.clone(), del: ord(c.x, c.y, c.z) * (ph.spread || 0) });
      }
    }
  }
};
DIR.amount = (ph, lt) => {   // displacement fraction (1 = fully away, 0 = in place); lt = time since this item's start
  const u = lt / ph.dur;
  if (ph.type === 'slam') return u >= 1 ? -.02 * Math.exp(-(lt - ph.dur) * 9) * Math.sin((lt - ph.dur) * 40) : 1 - u * u * u;
  if (ph.type === 'pop' || ph.type === 'grow') return 1 - DIR.spring(lt, 260, ph.type === 'pop' ? 14 : 22);
  return 1 - DIR.spring(lt * (1.4 / ph.dur) * .9, 170, ph.type === 'rise' ? 26 : 17);
};
DIR.apply = (t) => {
  for (const it of DIR.items) {
    const ph = it.ph, t0 = ph.t, settled = t >= t0 + (ph.spread || 0) + ph.dur * 2.2, before = t < t0;
    if (!it.inst) {
      const lt = t - t0 - it.del, o = it.o;
      if (lt < 0) { o.visible = false; continue; }
      o.visible = true; const a = settled ? 0 : DIR.amount(ph, lt);
      o.position.copy(it.pos); o.scale.copy(it.scl);
      if (ph.type === 'pop' || ph.type === 'grow') o.scale.multiplyScalar(Math.max(1e-4, 1 - a));
      else o.position.y += (ph.type === 'rise' ? -1 : 1) * ph.H * a;
      continue;
    }
    const key = settled ? 'done' : before ? 'hidden' : null;
    if (key && it.state === key) continue;
    it.state = key;
    const A = it.o.instanceMatrix.array, B = it.B, n = it.o.count;
    for (let i = 0; i < n; i++) {
      const k = i * 16, lt = t - t0 - it.del[i];
      if (key === 'done') { for (let j = 0; j < 16; j++) A[k + j] = B[k + j]; continue; }
      if (lt < 0) { for (let j = 0; j < 16; j++) A[k + j] = B[k + j] * (j < 11 ? 1e-5 : 1); A[k + 15] = 1; continue; }
      const a = DIR.amount(ph, lt);
      for (let j = 0; j < 16; j++) A[k + j] = B[k + j];
      if (ph.type === 'grow') { const s = Math.max(1e-4, 1 - a); A[k + 4] *= s; A[k + 5] *= s; A[k + 6] *= s; }
      else if (ph.type === 'pop') { const s = Math.max(1e-4, 1 - a); for (const j of [0, 1, 2, 4, 5, 6, 8, 9, 10]) A[k + j] *= s; }
      else A[k + 13] += (ph.type === 'rise' ? -1 : 1) * ph.H * a;
    }
    it.o.instanceMatrix.needsUpdate = true;
  }
};
window.DIR = DIR;
