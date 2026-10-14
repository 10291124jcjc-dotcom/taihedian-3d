/* 月台陈设 — 故宫博物院: 日晷、嘉量各一，铜龟、铜鹤各一对，铜鼎 18 座.
   Positions from Esri World Imagery (z19, 0.229 m/px): the 18 鼎 stand in four rows beside the front flights —
   6 on the 月台 front (z 49.6), 4 on tier 2 (z 55.7), 4 on tier 1 (z 63.3), 4 on the plaza (z 73.2).
   日晷 (east) and 嘉量 (west) at the 月台 front corners (white bases at x ±30, z 50; gje06 shows the 嘉量 亭 on the west).
   龟 / 鹤: tall shadows at the 月台 side edges (x ±30.8, z ≈ 31 and 36) — approximate.
   Sizes from photos gje06 / gje08 against the 1.59 m 望柱: 鼎 ≈ 2.3 m of bronze on a 0.5 m stone base. */
const FUR = {};
FUR.bronze = () => U.mat('bronze', () => new THREE.MeshStandardMaterial({ color: '#343C30', roughness: .6, metalness: .55, envMapIntensity: .45 }));
FUR.lathe = (pts, m, seg = 28) => U.mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), m);
FUR.base = (w, h) => {   // small 须弥座 pedestal in marble
  const g = new THREE.Group(), m = TER.marbleSmooth();
  [[0, .18, w], [.18, .62, w * .86], [.62, .8, w * .92], [.8, 1, w]].forEach(([a, b, s]) => { const x = U.mesh(new THREE.BoxGeometry(s, (b - a) * h, s), m); x.position.y = (a + b) / 2 * h; g.add(x); });
  return g;
};
// 鼎炉 as in gje08: three cabriole legs, round belly, two upright handles, two-tier pagoda lid with a ball finial
FUR.ding = () => {
  const g = new THREE.Group(), m = FUR.bronze(); g.add(FUR.base(1.25, .5));
  const b = new THREE.Group(); b.position.y = .5; g.add(b);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, c = new THREE.CatmullRomCurve3([[.42, 0, 0], [.5, .15, 0], [.4, .35, 0], [.36, .5, 0]].map(([x, y]) => new THREE.Vector3(x * Math.cos(a), y, x * Math.sin(a))));
    b.add(U.mesh(new THREE.TubeGeometry(c, 12, .06, 8), m)); }
  b.add(FUR.lathe([[0, .45], [.5, .48], [.62, .62], [.64, .78], [.58, .95], [.5, 1.02], [.52, 1.06], [0, 1.06]], m));          // belly
  for (const s of [-1, 1]) { const c = new THREE.CatmullRomCurve3([[s * .5, .98, 0], [s * .62, 1.12, 0], [s * .58, 1.3, 0], [s * .5, 1.34, 0]].map(p => new THREE.Vector3(...p))); b.add(U.mesh(new THREE.TubeGeometry(c, 10, .045, 8), m)); }   // 耳
  b.add(FUR.lathe([[0, 1.06], [.42, 1.06], [.42, 1.36], [.62, 1.36], [.62, 1.4], [.3, 1.52], [.3, 1.74], [.48, 1.74], [.48, 1.77], [.2, 1.88], [.07, 1.92], [0, 1.92]], m));   // drum + roof, twice
  const ball = U.mesh(new THREE.SphereGeometry(.12, 16, 12), m); ball.position.y = 2.02; b.add(ball);
  return g;
};
FUR.rigui = () => {   // 日晷: marble pedestal, a disc in the equatorial plane (normal toward the celestial pole, 39.9° up toward north), bronze gnomon
  const g = new THREE.Group(); g.add(FUR.base(1.5, 1.35));
  const disc = U.mesh(new THREE.CylinderGeometry(.62, .62, .16, 40), TER.marbleSmooth()), pole = U.mesh(new THREE.CylinderGeometry(.02, .02, 1.6, 8), FUR.bronze());
  const holder = new THREE.Group(); holder.add(disc, pole); holder.position.y = 1.35 + .72; holder.rotation.x = -(Math.PI / 2 - THREE.MathUtils.degToRad(39.9)); g.add(holder);
  const strut = U.mesh(new THREE.BoxGeometry(.35, .7, .25), TER.marbleSmooth()); strut.position.y = 1.35 + .3; g.add(strut);
  return g;
};
FUR.jialiang = () => {   // 嘉量: a small square stone 亭 (four posts, hipped stone roof) on a pedestal, the bronze measure inside
  const g = new THREE.Group(), m = TER.marbleSmooth(); g.add(FUR.base(1.6, 1.2));
  for (const [x, z] of [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]]) { const p = U.mesh(new THREE.BoxGeometry(.16, 1.3, .16), m); p.position.set(x, 1.2 + .65, z); g.add(p); }
  const roof = U.mesh(new THREE.ConeGeometry(1.15, .6, 4, 1), m); roof.rotation.y = Math.PI / 4; roof.position.y = 1.2 + 1.3 + .3; g.add(roof);
  const fin = U.mesh(new THREE.SphereGeometry(.1, 12, 8), m); fin.position.y = 1.2 + 1.3 + .65; g.add(fin);
  const v = FUR.lathe([[0, 0], [.32, 0], [.36, .3], [.32, .55], [0, .55]], FUR.bronze()); v.position.y = 1.2 + .1; g.add(v);
  return g;
};
FUR.gui = () => {   // 铜龟: dragon-headed tortoise on a pedestal
  const g = new THREE.Group(), m = FUR.bronze(); g.add(FUR.base(1.5, .7));
  const shell = U.mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), m); shell.scale.set(.55, .38, .7); shell.position.y = .7; g.add(shell);
  const neck = new THREE.CatmullRomCurve3([[0, .82, .5], [0, 1.0, .72], [0, 1.25, .8]].map(p => new THREE.Vector3(...p))); g.add(U.mesh(new THREE.TubeGeometry(neck, 10, .1, 10), m));
  const head = U.mesh(new THREE.SphereGeometry(.16, 16, 12), m); head.scale.set(1, .9, 1.4); head.position.set(0, 1.3, .9); g.add(head);
  for (const [x, z] of [[-.45, .45], [.45, .45], [-.45, -.45], [.45, -.45]]) { const l = U.mesh(new THREE.SphereGeometry(.12, 10, 8), m); l.scale.set(1, .6, 1.4); l.position.set(x, .74, z); g.add(l); }
  return g;
};
FUR.he = () => {   // 铜鹤: standing crane, head raised
  const g = new THREE.Group(), m = FUR.bronze(); g.add(FUR.base(1.2, .7));
  for (const s of [-1, 1]) { const leg = U.mesh(new THREE.CylinderGeometry(.025, .03, .75, 8), m); leg.position.set(s * .1, .7 + .37, 0); g.add(leg); }
  const body = U.mesh(new THREE.SphereGeometry(1, 20, 14), m); body.scale.set(.24, .26, .48); body.position.set(0, 1.5, -.05); body.rotation.x = .25; g.add(body);
  const tail = U.mesh(new THREE.ConeGeometry(.18, .4, 12), m); tail.rotation.x = -Math.PI / 2 - .4; tail.position.set(0, 1.42, -.55); g.add(tail);
  const neck = new THREE.CatmullRomCurve3([[0, 1.62, .3], [0, 1.95, .38], [0, 2.2, .3], [0, 2.38, .38]].map(p => new THREE.Vector3(...p))); g.add(U.mesh(new THREE.TubeGeometry(neck, 14, .05, 8), m));
  const head = U.mesh(new THREE.SphereGeometry(.07, 12, 8), m); head.position.set(0, 2.4, .42); g.add(head);
  const beak = U.mesh(new THREE.ConeGeometry(.025, .3, 8), m); beak.rotation.x = Math.PI / 2; beak.position.set(0, 2.39, .6); g.add(beak);
  return g;
};
FUR.build = (root) => {
  const g = new THREE.Group(); root.add(g); BUILD.mark(g, 'fur');
  const put = (obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; g.add(obj); };
  const rows = [[49.6, TER.top(2), [-22.9, -15.3, -5.9, 5.9, 15.3, 22.9]], [55.7, TER.top(1), [-15.5, -5.9, 5.9, 15.5]], [63.3, TER.top(0), [-15.5, -5.9, 5.9, 15.5]], [73.2, -8.13, [-15.5, -5.9, 5.9, 15.5]]];
  let n = 0;
  for (const [z, y, xs] of rows) for (const x of xs) { put(FUR.ding(), x, y, z); n++; }
  put(FUR.rigui(), 30, TER.top(2), 50); put(FUR.jialiang(), -30, TER.top(2), 50);
  for (const s of [-1, 1]) { put(FUR.gui(), s * 30.8, TER.top(2), 31); put(FUR.he(), s * 30.8, TER.top(2), 36); }
  FUR.info = { ding: n };
  return g;
};
window.FUR = FUR;
