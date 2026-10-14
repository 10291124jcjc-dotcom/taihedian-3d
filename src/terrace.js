/* 三台 — the three-tier white-marble terrace under 太和殿 / 中和殿 / 保和殿 (only 太和殿 is modelled on it).
   Plan: OpenStreetMap building:part outlines (traced from aerial imagery), rotated into the hall frame, made
   rectilinear and symmetric about the axis, then moved 6.9 m north: on Esri World Imagery (z19, 0.229 m/px, near nadir)
   the top-tier 月台 front lies 36 m in front of the front 檐柱, OSM placed it 42.9 m; each tier = steps [z0, z1, halfWidth] (x east, z south, metres).
   Heights: 故宫博物院 total 8.13 m, split from photo gje04 (h1 4.20, h2 2.10, h3 1.83).
   Balustrade from gje04: 望柱 1.59 m, 栏板 0.84 m, spacing 2.04 m (≈ total perimeter 2360 m / 1142 螭首 = 2.07 m). */
const TER = {};
TER.TIERS = [   // [z0, z1, halfWidth]
  [[-160.83, -79.46, 66.3], [-79.46, -50.34, 36.1], [-50.34, 33.41, 66.3], [33.41, 69.20, 44.21]],
  [[-153.68, -84.68, 58.51], [-84.68, -44.18, 27.91], [-44.18, 27.94, 58.9], [27.94, 59.87, 38.48]],
  [[-148.36, -89.74, 53.59], [-89.74, -38.99, 22.23], [-38.99, 21.39, 53.46], [21.39, 52.56, 32.9]],
];
TER.H = [4.20, 2.10, 1.83];                          // tier heights, bottom to top (sum 8.13)
TER.top = i => -8.13 + TER.H.slice(0, i + 1).reduce((a, b) => a + b, 0);   // floor of tier i (0 = lowest); tier 2 top = 0 = hall floor
TER.base = i => i ? TER.top(i - 1) : -8.13;
// 须弥座 profile per tier: [y fraction from the tier base, outward offset from the outline (m)] — read from gje04
TER.PROF = [
  [[0, .14], [.08, .14], [.08, 0], [.68, 0], [.69, .1], [.74, .1], [.77, .03], [.82, .03], [.84, .12], [1, .12]],                 // tier 1: 圭角, plain wall, 枋/枭, 束腰, 上枋
  [[0, .12], [.12, .12], [.12, .05], [.26, .05], [.33, -.04], [.6, -.04], [.67, .05], [.78, .05], [.78, .12], [1, .12]],          // tiers 2, 3: classic 须弥座
  [[0, .12], [.12, .12], [.12, .05], [.26, .05], [.33, -.04], [.6, -.04], [.67, .05], [.78, .05], [.78, .12], [1, .12]],
];
// polygon (CCW in x, z) of a tier from its steps, offset outward by e
TER.outline = (i, e = 0) => {   // rectilinear offset: each step face moves outward by e (north faces −z, south faces +z)
  const S = TER.TIERS[i], right = [[S[0][2] + e, S[0][0] - e]];
  for (let k = 0; k < S.length - 1; k++) { const [, z1, w] = S[k], w2 = S[k + 1][2], zz = z1 + (w2 < w ? e : -e); right.push([w + e, zz], [w2 + e, zz]); }
  right.push([S.at(-1)[2] + e, S.at(-1)[1] + e]);
  return [...right, ...right.map(([x, z]) => [-x, z]).reverse()];
};
TER.marble = () => U.mat('marble', () => {   // 汉白玉: warm white, faint veining; ashlar joints every 1.5 m (wall faces, uv in metres / 3)
  const H = U.canvas(512, 512, (g, w, h) => {
    const n = U.noiseCanvas(512, 512, 30, 3, .5); g.drawImage(n, 0, 0);
    g.strokeStyle = '#000'; g.lineWidth = 5;
    for (let r = 0; r < 4; r++) { const y = r * 128; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let k = 0; k < 2; k++) { const x = (k * 256 + (r % 2) * 128) % 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 128); g.stroke(); } }
  });
  const nm = U.normalFromHeight(H, 2.5); nm.wrapS = nm.wrapT = THREE.RepeatWrapping;
  const col = U.tex(512, 512, (g, w, h) => { g.fillStyle = '#E2D8C4'; g.fillRect(0, 0, w, h); g.globalAlpha = .12; g.globalCompositeOperation = 'multiply'; g.drawImage(U.noiseCanvas(512, 512, 90, 9, .5), 0, 0); g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over'; g.strokeStyle = 'rgba(90,80,65,.55)'; g.lineWidth = 4; for (let r = 0; r < 4; r++) { const y = r * 128; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let k = 0; k < 2; k++) { const x = (k * 256 + (r % 2) * 128) % 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 128); g.stroke(); } } }, { repeat: [1, 1] });
  col.wrapS = col.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ color: '#E6DDCB', map: col, roughness: .8, normalMap: nm, normalScale: new THREE.Vector2(.6, .6), envMapIntensity: .2 });
});
TER.marbleSmooth = () => U.mat('marbleS', () => new THREE.MeshStandardMaterial({ color: '#CEC4B0', roughness: .75, envMapIntensity: .2 }));
// one tier: profile bands as extrusions of the offset outline, plus the floor slab
TER.tier = (parent, i) => {
  const y0 = TER.base(i), H = TER.H[i], prof = TER.PROF[i], m = TER.marble();
  for (let k = 0; k < prof.length - 1; k++) {
    const [fa, ea] = prof[k], [fb, eb] = prof[k + 1]; if (fb - fa < 1e-3) continue;
    const ya = y0 + fa * H, yb = y0 + fb * H, A = TER.outline(i, ea), B = TER.outline(i, eb);
    const pos = [], idx = [], n = A.length;
    const uvs = []; let run = 0;
    for (let j = 0; j < n; j++) { pos.push(A[j][0], ya, A[j][1], B[j][0], yb, B[j][1]); uvs.push(run / 3, ya / 3, run / 3, yb / 3); run += Math.hypot(A[(j + 1) % n][0] - A[j][0], A[(j + 1) % n][1] - A[j][1]); }
    for (let j = 0; j < n; j++) { const a = 2 * j, b = 2 * ((j + 1) % n); idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(idx);
    const ng = geo.toNonIndexed(); ng.computeVertexNormals(); parent.add(U.mesh(ng, m));
  }
  // floor: a flat cap at the tier top (paving texture)
  const sh = U.shape(TER.outline(i, .12).map(([x, z]) => [x, -z]));
  const fg = new THREE.ShapeGeometry(sh); fg.rotateX(-Math.PI / 2);
  const pave = TER.paving(); const fl = U.mesh(fg, pave); fl.position.y = TER.top(i) + .002; parent.add(fl);
  // world-scale UVs for the paving
  const p = fg.attributes.position, uv = fg.attributes.uv; for (let j = 0; j < p.count; j++) uv.setXY(j, p.getX(j) / 4, p.getZ(j) / 4);
};
TER.paving = () => U.mat('pave', () => {
  const c = U.canvas(512, 512, (g, w, h) => {   // large marble slabs on the tier tops (photos: long rectangular slabs)
    g.fillStyle = '#C9BFAC'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9F9683'; g.lineWidth = 3;
    for (let r = 0; r < 4; r++) { g.beginPath(); g.moveTo(0, r * 128); g.lineTo(w, r * 128); g.stroke(); for (let k = 0; k < 3; k++) { const x = ((k * 171 + r * 97) % 512); g.beginPath(); g.moveTo(x, r * 128); g.lineTo(x, r * 128 + 128); g.stroke(); } }
  });
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, roughness: .85, envMapIntensity: .2 });
});

/* ---------------- stairs (OSM skillion parts; heights 3 / 6 / 9 in OSM = tops of tiers 1 / 2 / 3) ---------------- */
TER.STAIRS = [   // [x0, z0, x1, z1, top tier, rise tiers, downhill direction 'S' | 'E' | 'W' | 'N', kind]
  [-4.5, 52.5, 4.5, 84.2, 2, 3, 'S', 'yulu'],            // central 御路 with steps either side
  [8.2, 52.5, 13.0, 82.1, 2, 3, 'S', 'step'], [-13.0, 52.5, -8.2, 82.1, 2, 3, 'S', 'step'],   // x from satellite (OSM had them 1.4 m further in)
  [33.0, 23.7, 37.1, 27.1, 2, 1, 'E', 'step'], [-37.1, 23.7, -33.0, 27.1, 2, 1, 'W', 'step'],     // 月台 sides: tier 3 → tier 2
  [40.0, 27.1, 43.0, 32.1, 1, 1, 'S', 'step'], [-43.0, 27.1, -40.0, 32.1, 1, 1, 'S', 'step'],      // tier 2 → tier 1
  [43.8, 32.7, 53.7, 37.7, 0, 1, 'E', 'step'], [-53.7, 32.7, -43.8, 37.7, 0, 1, 'W', 'step'],      // tier 1 → ground
  [58.8, 11.7, 62.6, 15.7, 1, 1, 'E', 'step'], [-62.6, 11.7, -58.8, 15.7, 1, 1, 'W', 'step'],
];
TER.stairs = (parent) => {
  const m = TER.marbleSmooth(), rise = .15;
  for (const [x0, z0, x1, z1, top, n, dir, kind] of TER.STAIRS) {
    const yT = TER.top(top), yB = top - n >= 0 ? TER.top(top - n) : -8.13, Ht = yT - yB;
    const along = dir === 'S' || dir === 'N' ? [z0, z1] : [x0, x1], across = dir === 'S' || dir === 'N' ? [x0, x1] : [z0, z1];
    const run = along[1] - along[0], nSteps = Math.max(2, Math.round(Ht / rise)), tread = run / nSteps, sgn = dir === 'S' || dir === 'E' ? 1 : -1;
    const g = new THREE.Group(); parent.add(g);
    const place = (u, w, h, a, c, y) => {   // a box `u` long in the downhill direction, `w` wide, top at y
      const b = U.mesh(new THREE.BoxGeometry(dir === 'S' || dir === 'N' ? w : u, h, dir === 'S' || dir === 'N' ? u : w), m);
      if (dir === 'S' || dir === 'N') b.position.set(c, y - h / 2, a); else b.position.set(a, y - h / 2, c); g.add(b);
    };
    const start = sgn > 0 ? along[0] : along[1], width = across[1] - across[0], mid = (across[0] + across[1]) / 2;
    if (kind === 'yulu') {
      // 御路: a carved inclined slab 3.6 m wide in the middle, steps on both sides
      const wy = 3.6, side = (width - wy) / 2;
      for (let k = 0; k < nSteps; k++) for (const s of [-1, 1]) place(tread + .02, side, Ht * (nSteps - k) / nSteps, start + sgn * (k + .5) * tread, mid + s * (wy / 2 + side / 2), yT - k * Ht / nSteps);
      const L = Math.hypot(run, Ht), slab = U.mesh(new THREE.BoxGeometry(wy, .35, L), TER.yuluMat()); slab.position.set(mid, (yT + yB) / 2 - .05, (along[0] + along[1]) / 2); slab.rotation.x = Math.atan2(Ht, run); g.add(slab);
      const uv = slab.geometry.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j), uv.getY(j) * L / 6);
    } else for (let k = 0; k < nSteps; k++) place(tread + .02, width, Ht * (nSteps - k) / nSteps, start + sgn * (k + .5) * tread, mid, yT - k * Ht / nSteps);
  }
};
TER.yuluMat = () => U.mat('yulu', () => {   // 丹陛石 relief: clouds, dragons among waves (normal map from a drawn height field)
  const c = U.canvas(512, 1024, (g, w, h) => {
    g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d8d8d8'; g.lineWidth = 10;
    for (let k = 0; k < 40; k++) { const x = (k * 137) % w, y = (k * 263) % h, r = 26 + (k % 5) * 6; g.beginPath(); for (let t = 0; t < 26; t++) { const a = t * .5, rr = r * (1 - t / 28); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.stroke(); }
    for (let k = 0; k < 3; k++) { g.save(); g.translate(w / 2, h * (.2 + k * .3)); g.strokeStyle = '#f0f0f0'; g.lineWidth = 26; g.beginPath(); for (let t = 0; t <= 40; t++) { const u = t / 40; g.lineTo((u - .5) * w * .8, Math.sin(u * 9 + k) * 60); } g.stroke(); g.restore(); }
    g.strokeStyle = '#eee'; g.lineWidth = 8; for (let y = h - 120; y < h; y += 20) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * .05) * 8); g.stroke(); }   // waves at the foot
  });
  const n = U.normalFromHeight(c, 3); n.wrapS = n.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ color: '#D6CCB9', roughness: .8, normalMap: n, envMapIntensity: .25 });
});

/* ---------------- balustrades and 螭首 ---------------- */
TER.BAL = { post: 1.59, panel: .84, sp: 2.04, postW: .24, difu: .16, inset: .3 };
TER.panelMat = () => U.mat('lanban', () => {   // 栏板: 寻杖 rail on top, 净瓶 balusters, a framed 华板 below (relief as normal map)
  const c = U.canvas(512, 256, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, w, h * .2);                                   // 寻杖
    g.fillStyle = '#505050'; g.fillRect(w * .04, h * .22, w * .92, h * .3);                  // openings between 净瓶
    g.fillStyle = '#c8c8c8'; for (const x of [.17, .5, .83]) { g.beginPath(); g.ellipse(w * x, h * .37, w * .05, h * .15, 0, 0, Math.PI * 2); g.fill(); }   // 净瓶
    g.fillStyle = '#a8a8a8'; g.fillRect(w * .04, h * .56, w * .92, h * .4); g.strokeStyle = '#e0e0e0'; g.lineWidth = 8; g.strokeRect(w * .1, h * .62, w * .8, h * .28);   // 华板
  });
  const n = U.normalFromHeight(c, 3.5);
  return new THREE.MeshStandardMaterial({ color: '#CEC4B0', roughness: .78, normalMap: n, normalScale: new THREE.Vector2(1.4, 1.4), envMapIntensity: .2 });
});
TER.postGeo = () => TER._pg || (TER._pg = (() => {   // 望柱: square shaft with a carved 云龙 head (lathe profile)
  const B = TER.BAL, shaft = new THREE.BoxGeometry(B.postW, B.post * .64, B.postW).translate(0, B.post * .32, 0);
  const head = new THREE.LatheGeometry([[0, 0], [.14, 0], [.15, .05], [.12, .1], [.15, .2], [.15, .38], [.1, .5], [.06, .56], [0, .57]].map(([r, y]) => new THREE.Vector2(r, y)), 12).translate(0, B.post * .64, 0);
  return THREE.BufferGeometryUtils.mergeBufferGeometries([shaft.toNonIndexed(), head.toNonIndexed()].map(g => { const n = new THREE.BufferGeometry(); n.setAttribute('position', g.attributes.position); n.setAttribute('normal', g.attributes.normal); n.setAttribute('uv', g.attributes.uv); return n; }));
})());
TER.chishouGeo = () => TER._cg || (TER._cg = (() => {   // 螭首 (gje04): a squarish neck ~0.32 m projecting ~0.75 m, ending in a rounded head with a downturned snout
  const parts = [new THREE.BoxGeometry(.32, .3, .5).translate(0, 0, .25), new THREE.SphereGeometry(.2, 16, 12).scale(1, .85, 1.1).translate(0, .02, .56),
    new THREE.BoxGeometry(.2, .16, .22).translate(0, -.05, .76), new THREE.SphereGeometry(.06, 8, 6).translate(.09, .12, .62), new THREE.SphereGeometry(.06, 8, 6).translate(-.09, .12, .62)];
  return THREE.BufferGeometryUtils.mergeBufferGeometries(parts.map(g => { const n = g.toNonIndexed(); const o = new THREE.BufferGeometry(); for (const a of ['position', 'normal', 'uv']) o.setAttribute(a, n.attributes[a]); return o; }));
})());
// run a balustrade along a polyline (y given per point) leaving out openings; returns the posts placed
TER.balustrade = (parent, path, posts, panels, difu, chis, withChi = true) => {
  const B = TER.BAL;
  for (let s = 0; s < path.length - 1; s++) {
    const a = path[s], b = path[s + 1], len = Math.hypot(b[0] - a[0], b[2] - a[2]); if (len < .5) continue;
    const n = Math.max(1, Math.round(len / B.sp)), dx = (b[0] - a[0]) / len, dz = (b[2] - a[2]) / len, rot = Math.atan2(dx, dz);
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t;
      if (k < n || s === path.length - 2) { posts.push(new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z)); if (withChi) chis.push(new THREE.Matrix4().makeRotationY(rot + Math.PI / 2).setPosition(x + dz * .32, y - .3, z - dx * .32)); }   // outward = (dz, −dx)
      if (k < n) {
        const t2 = (k + .5) / n, cx = a[0] + (b[0] - a[0]) * t2, cz = a[2] + (b[2] - a[2]) * t2, cy = a[1] + (b[1] - a[1]) * t2, seg = len / n, slope = Math.atan2(b[1] - a[1], len);
        const m = new THREE.Matrix4().makeRotationY(rot - Math.PI / 2).multiply(new THREE.Matrix4().makeRotationZ(slope));
        panels.push(m.clone().scale(new THREE.Vector3(seg - B.postW, 1, 1)).setPosition(cx, cy + B.difu + B.panel / 2, cz));
        difu.push(m.clone().scale(new THREE.Vector3(seg, 1, 1)).setPosition(cx, cy + B.difu / 2, cz));
      }
    }
  }
};
TER.build = (root) => {
  const g = new THREE.Group(); root.add(g);
  for (let i = 0; i < 3; i++) { BUILD.mark(g, 'tier' + i); TER.tier(g, i); }
  BUILD.mark(g, 'stairs'); TER.stairs(g);
  // balustrade along each tier edge, with openings where stairs leave the tier
  const B = TER.BAL, posts = [], panels = [], difu = [], chis = [];
  const openings = i => TER.STAIRS.filter(s => s[4] === i).map(([x0, z0, x1, z1, , , dir]) => ({ x0: x0 - .3, z0: z0 - .3, x1: x1 + .3, z1: z1 + .3, dir }));
  for (let i = 0; i < 3; i++) {
    const P = TER.outline(i, -B.inset), y = TER.top(i), ops = openings(i);
    const inOpen = (x, z) => ops.some(o => x > o.x0 && x < o.x1 && z > o.z0 - 1.2 && z < o.z1 + 1.2);
    for (let s = 0; s < P.length; s++) {
      const a = P[s], b = P[(s + 1) % P.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < .4) continue;
      // split the edge at openings
      const N = Math.ceil(len / .25); let run = [];
      const flush = () => { if (run.length > 1) { const p0 = run[0], p1 = run.at(-1); if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 1) TER.balustrade(g, [[p0[0], y, p0[1]], [p1[0], y, p1[1]]], posts, panels, difu, chis); } run = []; };
      for (let k = 0; k <= N; k++) { const t = k / N, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; if (inOpen(x, z)) flush(); else run.push([x, z]); }
      flush();
    }
  }
  // stair-side balustrades on the long front flights (slanted)
  for (const [x0, z0, x1, z1, top, n, dir, kind] of TER.STAIRS) {
    if (dir !== 'S') continue; const yT = TER.top(top), yB = top - n >= 0 ? TER.top(top - n) : -8.13;
    for (const x of kind === 'yulu' ? [] : [x0 - .15, x1 + .15]) TER.balustrade(g, [[x, yT, z0], [x, yB, z1]], posts, panels, difu, chis, false);
  }
  const m = TER.marbleSmooth();
  BUILD.mark(g, 'balus'); HALL.inst(g, TER.postGeo(), m, posts, .06);
  HALL.inst(g, new THREE.BoxGeometry(1, B.panel, .16), [m, m, m, m, TER.panelMat(), TER.panelMat()], panels, .06);
  HALL.inst(g, new THREE.BoxGeometry(1, B.difu, .3), m, difu, .04);
  HALL.inst(g, TER.chishouGeo(), m, chis, .06);
  // the courtyard: 海墁 brick paving
  BUILD.mark(g, 'ground'); const ground = U.mesh(new THREE.PlaneGeometry(4000, 4000), U.mat('court', () => {
    const c = U.canvas(256, 256, (q, w, h) => { q.fillStyle = '#8E8981'; q.fillRect(0, 0, w, h); q.strokeStyle = '#6F6B64'; q.lineWidth = 2; for (let r = 0; r < 8; r++) { q.beginPath(); q.moveTo(0, r * 32); q.lineTo(w, r * 32); q.stroke(); for (let k = 0; k < 4; k++) { const x = (k * 64 + (r % 2) * 32); q.beginPath(); q.moveTo(x, r * 32); q.lineTo(x, r * 32 + 32); q.stroke(); } } });
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4000 / 3, 4000 / 3); t.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: t, roughness: .9, envMapIntensity: .2 });
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -8.13; g.add(ground);
  TER.info = { posts: posts.length, chishou: chis.length, panels: panels.length };
  return g;
};
window.TER = TER;
