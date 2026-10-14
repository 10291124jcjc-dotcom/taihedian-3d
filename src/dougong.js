/* 斗拱 — 下檐七踩单翘重昂, 上檐九踩单翘三昂 (平身科 / 柱头科 / 角科).
   Local frame: x along the facade, z outward (+), y up. Origin = bottom centre of 坐斗 = top of 平板枋 on the column axis line.
   All sizes in 斗口 d (清式营造则例 proportions); the row lines (拽架) sit at z = 0, 3, 6, 9 d. */
const DG = {};

// polygon offset (inset by e, CCW polygon) — used for the gold outline painted on each member's side faces
DG.inset = (pts, e) => {
  const n = pts.length, lines = [];
  let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const s = area > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l * s, ny = dx / l * s; lines.push([a[0] + nx * e, a[1] + ny * e, dx, dy]);
  }
  return lines.map((L1, i) => {
    const L0 = lines[(i - 1 + n) % n];
    const den = L0[2] * L1[3] - L0[3] * L1[2];
    if (Math.abs(den) < 1e-9) return [L1[0], L1[1]];
    const t = ((L1[0] - L0[0]) * L1[3] - (L1[1] - L0[1]) * L1[2]) / den;
    return [L0[0] + L0[2] * t, L0[1] + L0[3] * t];
  });
};
// arm profile: length L (u), height h (v from 0), 卷杀 rounding on the lower end(s)
DG.armProfile = (L, h, ends = 'both', c = 1.0) => {
  const k = h * .55, seg = [[1, 0], [.82, .45], [.55, .78], [.25, .95], [0, 1]];   // quarter-ish curve, x: along cut, y: up
  const right = ends !== 'left', left = ends !== 'right', pts = [];
  pts.push([-L / 2 + (left ? c : 0), 0]);
  if (right) { pts.push([L / 2 - c, 0]); seg.slice(1).forEach(([a, b]) => pts.push([L / 2 - c + (1 - a) * c, b * k])); } else pts.push([L / 2, 0]);
  pts.push([L / 2, h], [-L / 2, h]);
  if (left) seg.slice(0, -1).reverse().forEach(([a, b]) => pts.push([-L / 2 + c - (1 - a) * c, b * k])); else pts.push([-L / 2, 0]);
  if (left) pts.splice(pts.length - 1, 1, [-L / 2, k]);
  return pts;
};
// a member from a profile in its own (u, v) plane, thickness t; gold edge ring on both side faces
DG.member = (pts, t, col, along, pos, d) => {
  const g = new THREE.Group();
  g.add(U.mesh(U.extrude(pts.map(([u, v]) => [u * d, v * d]), t * d, 3), U.paint(col, .7)));
  g.add(DG.rings(pts, t, d));
  if (along === 'z') g.rotation.y = -Math.PI / 2;   // profile u axis → +z
  g.position.set(pos[0] * d, pos[1] * d, pos[2] * d);
  return g;
};
// 斗 / 升: 耳 (top 0.4h) + 腰 (0.2h) + 底 (0.4h, tapered)
DG.dou = (w, dep, h, col, pos, d) => {
  const g = new THREE.Group(), m = U.paint(col, .7);
  const ear = U.mesh(new THREE.BoxGeometry(w * d, .4 * h * d, dep * d), m); ear.position.y = .8 * h * d;
  const waist = U.mesh(new THREE.BoxGeometry(w * d * .98, .2 * h * d, dep * d * .98), m); waist.position.y = .5 * h * d;
  const bg = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2 * .74, .4 * h * d, 4, 1); bg.rotateY(Math.PI / 4); bg.scale(w * d * .98, 1, dep * d * .98);
  const base = U.mesh(bg, m); base.position.y = .2 * h * d;
  g.add(ear, waist, base); g.position.set(pos[0] * d, pos[1] * d, pos[2] * d);
  return g;
};
// 昂 profile in (z, y): body from z0 to the 斗 at zs, beak drooping beyond
DG.angProfile = (z0, zs, yb) => {
  const h = 2;
  // 昂嘴: short beak, its tip about 0.8 d below the body, reaching ~1.7 d past the 十八斗 centre
  return [[z0, yb], [zs - .5, yb], [zs + .3, yb - .3], [zs + 1.1, yb - .7], [zs + 1.7, yb - .85], [zs + 1.8, yb - .55],
          [zs + 1.4, yb + .4], [zs + .8, yb + h], [z0, yb + h]];
};
// 蚂蚱头 profile in (z, y)
DG.mzt = (z0, z1, yb) => [[z0, yb], [z1 - 1.2, yb], [z1 - .4, yb + .5], [z1, yb + .5], [z1, yb + 1.1], [z1 - .5, yb + 1.3], [z1 - .9, yb + 2], [z0, yb + 2]];

/* one bracket set with n 拽架 (n = 3: 七踩单翘重昂, 下檐 · n = 4: 九踩单翘三昂, 上檐).
   kind: 'ping' 平身科 | 'zhu' 柱头科. A = colour of arms, B = colour of 斗/升. Heights in d above the 平板枋:
   level i (i = 0 翘, 1…n-1 昂) sits at y_i = 1.2 + 2.6 i; on row j (z = 3j) a 瓜拱 at y_j and a 万拱 2 d higher,
   the outermost row carries the 厢拱 instead. Every arm sits in the ear of the 斗/升 below it (升 top − 0.4 d).
   n = 3 reproduces the sample exactly: 挑檐枋 11–13 · 挑檐桁 centre 14.5 · 正心桁 centre 18.25. */
DG.geo = (n = 3) => { const yn = 1.2 + 2.6 * n; return { n, yn, out: 3 * n, TOPn: yn + 7, TOP0: yn + 7 + 1.5 * n }; };   // 五举 from 挑檐桁 to 正心桁
DG.set = (d, A, B, kind = 'ping', n = 3) => {
  const g = new THREE.Group(), M = DG.member, D = DG.dou, Z = (pts, t) => g.add(DG.zMember(pts, t, A, d)), y = i => 1.2 + 2.6 * i, yn = y(n);
  g.add(D(kind === 'zhu' ? 4 : 3, 3, 2, B, [0, 0, 0], d));                                       // 坐斗
  g.add(M(DG.armProfile(6.2, 2), 1.24, A, 'x', [0, 1.2, 0], d));                                  // 正心瓜拱 (足材)
  g.add(M(DG.armProfile(7.0, 2, 'right'), 1, A, 'z', [0, 1.2, .4], d));                          // 头翘
  for (const s of [-1, 1]) g.add(D(1.3, 1.72, 1, B, [s * 2.45, 3.2, 0], d));                    // 槽升子
  g.add(D(1.8, 1.48, 1, B, [0, 3.2, 3], d));                                                       // 十八斗 on 翘
  g.add(M(DG.armProfile(9.2, 2), 1.24, A, 'x', [0, 3.8, 0], d));                                  // 正心万拱
  for (const s of [-1, 1]) g.add(D(1.3, 1.72, 1, B, [s * 3.95, 5.8, 0], d));
  for (let i = 1; i < n; i++) {                                                                    // 昂 i, its 十八斗 on row i+1
    Z(DG.angProfile(-3, 3 * (i + 1), y(i)), 1);
    g.add(D(1.8, 1.48, 1, B, [0, y(i) + 2, 3 * (i + 1)], d));
  }
  for (let j = 1; j <= n; j++) {                                                                   // cross arms on row j
    const z = 3 * j, yj = y(j);
    if (j < n) {
      g.add(M(DG.armProfile(6.2, 1.4), 1, A, 'x', [0, yj, z], d)); g.add(M(DG.armProfile(9.2, 1.4), 1, A, 'x', [0, yj + 2, z], d));
      for (const s of [-1, 1]) { g.add(D(1.3, 1.48, 1, B, [s * 2.45, yj + 1.4, z], d)); g.add(D(1.3, 1.48, 1, B, [s * 3.95, yj + 3.4, z], d)); }
    } else {
      g.add(M(DG.armProfile(7.2, 1.4), 1, A, 'x', [0, yj, z], d));                                 // 厢拱
      for (const s of [-1, 1]) g.add(D(1.3, 1.48, 1, B, [s * 2.95, yj + 1.4, z], d));
    }
  }
  const zEnd = 3 * n + 3.5;
  if (kind === 'zhu') Z([[-3, yn], [zEnd - 2.1, yn], [zEnd - .7, yn + .6], [zEnd - .1, yn + 2], [zEnd - .7, yn + 3.3], [zEnd - 1.9, yn + 4], [-3, yn + 4]], 4);   // 桃尖梁头
  else { Z(DG.mzt(-3, zEnd, yn), 1); Z([[-3, yn + 2], [zEnd - 2.3, yn + 2], [zEnd - 1.9, yn + 2.8], [zEnd - 1.9, yn + 4], [-3, yn + 4]], 1); }   // 蚂蚱头 + 撑头木
  return g;
};
DG.zMember = (pts, t, col, d) => {   // profile given in (z, y) coordinates (units of d), thickness along x
  const g = new THREE.Group(), sc = pts.map(([u, v]) => [u * d, v * d]);
  g.add(U.mesh(U.extrude(sc, t * d, 3), U.paint(col, .7)));
  g.add(DG.rings(pts, t, d));
  g.rotation.y = -Math.PI / 2;
  return g;
};
DG.rings = (pts, t, d) => {   // gold outline on both side faces of a member
  const g = new THREE.Group(), sc = p => p.map(([u, v]) => [u * d, v * d]);
  const outer = U.shape(sc(pts)); outer.holes.push(U.shape(sc(DG.inset(pts, .09))));
  const rg = new THREE.ShapeGeometry(outer), gm = U.goldLine();
  for (const s of [-1, 1]) { const r = U.mesh(rg, gm, false); r.position.z = s * (t * d / 2 + .0015); g.add(r); }
  return g;
};
/* continuous members along a run of brackets (list of [width, y0, y1, z] boxes and [r, y, z] logs, in d) */
DG.runList = (n = 3) => {
  const { yn, out, TOPn, TOP0 } = DG.geo(n), y = i => 1.2 + 2.6 * i, boxes = [[1.24, 6.4, TOP0 - 4.5, 0, 'qing']];   // 正心枋 stack
  for (let j = 1; j < n; j++) boxes.push([1, y(j) + 4, y(j) + 6, 3 * j, j % 2 ? 'lv' : 'qing'], [1, y(j) + 6, y(j) + 8, 3 * j, j % 2 ? 'qing' : 'lv']);   // 拽枋
  boxes.push([1, yn + 2, yn + 4, out, 'lv']);                                                        // 挑檐枋
  return { boxes, logs: [[1.5, TOPn - 1.5, out, 'qing'], [2.25, TOP0 - 2.25, 0, 'lv']] };           // 挑檐桁, 正心桁
};
DG.runs = (d, len, n = 3) => {
  const g = new THREE.Group(), m = { qing: U.paint(U.COL.qing, .72), lv: U.paint(U.COL.lv, .72) }, L = DG.runList(n);
  for (const [w, y0, y1, z, c] of L.boxes) { const b = U.mesh(new THREE.BoxGeometry(len, (y1 - y0) * d, w * d), m[c]); b.position.set(0, (y0 + y1) / 2 * d, z * d); g.add(b); }
  for (const [r, yy, z, c] of L.logs) { const q = new THREE.CylinderGeometry(r * d, r * d, len, 20); q.rotateZ(Math.PI / 2); const cy = U.mesh(q, m[c]); cy.position.set(0, yy * d, z * d); g.add(cy); }
  return g;
};
DG.TOP0 = DG.geo(3).TOP0;   // 20.5: rafter line above the 平板枋 at the column axis (d)
DG.TOP9 = DG.geo(3).TOPn;   // 16.0: … at the 挑檐桁
// 垫栱板: red boards between bracket sets with the gold "灶火门" outline, one texture repeat per 攒当
DG.boardTex = (spacing, d) => U.tex(512, 256, (g, w, h) => {
  g.fillStyle = '#7A231C'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#D9A93E'; g.lineWidth = 7; g.beginPath();
  const m = w * .5, top = h * .1;
  g.moveTo(w * .08, h); g.lineTo(w * .08, h * .55); g.bezierCurveTo(w * .08, h * .28, w * .3, h * .22, m - w * .08, top + 18);
  g.quadraticCurveTo(m, top - 8, m + w * .08, top + 18); g.bezierCurveTo(w * .7, h * .22, w * .92, h * .28, w * .92, h * .55); g.lineTo(w * .92, h); g.stroke();
  g.fillStyle = '#2E5E8E'; g.beginPath(); g.arc(m, h * .62, h * .12, 0, Math.PI * 2); g.fill();
});
window.DG = DG;
