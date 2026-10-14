/* 太和殿 — the whole hall. World: x east, z south (front), y up, origin = centre of the 台明 (floor) surface.
   Two eaves share one generator (EAVE): the lower eave on the 檐柱 ring (七踩), the upper eave on the 金柱 ring (九踩).
   A roof face is a height profile T(v) of the outward distance v from its column line (v < 0 = inward); the hall's roof
   at a plan point is the lower envelope of the front and side profiles, which puts the hips where they meet.
   The upper roof's side profile is compressed by k (推山) so its ridge is as long as measured. Corners get the 翼角
   displacement (冲三翘四) from the corner column outward. */
const HALL = {};
const BUILD = { marks: [] };   // phase marks: children of a group from this index on belong to the named phase
BUILD.mark = (g, name) => BUILD.marks.push({ g, name, idx: g.children.length });
window.BUILD = BUILD;
const F_SER = '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif';
const SG = [[1, 1], [-1, 1], [-1, -1], [1, -1]];   // quadrant signs (x, z): SE, SW, NW, NE

/* ---------------- eave / roof geometry ---------------- */
HALL.eave = (o) => {
  const d = P.d(), rd = P.v('rafterD'), G = DG.geo(o.n);
  const e = { ...o, d, rd, G };
  e.y0 = o.colTop + 2 * d;                       // top of 平板枋 = bracket base
  e.Y0 = e.y0 + G.TOP0 * d;                      // top of 正心桁 on the column axis = 檐椽 bottom there
  e.tiao = G.out * d; e.Ee = e.tiao + 14 * d; e.Ef = e.tiao + 21 * d;
  e.k = o.k || 1;
  e.rise = o.rise;                               // inward rise of the rafter line, vin ≥ 0
  e.B = v => v >= 0 ? e.Y0 - .5 * v : e.Y0 + e.rise(-v);
  e.flyB = v => e.B(e.Ee) + rd + .03 - P.v('flyPitch') * (v - e.Ee);
  const smax = (a, b, k = .08) => { const h = U.clamp(.5 + .5 * (a - b) / k); return U.lerp(b, a, h) + k * h * (1 - h); };
  e.deck = v => smax(e.B(v) + rd + .03, e.flyB(v) + rd + .03);
  e.vTop = o.vTop;                               // most inward v on the front faces (ridge or wall line)
  e.T = (v, side = false) => { const w = side && v < 0 ? v * e.k : v; return e.deck(w) + U.lerp(.26, .15, U.smooth((w - e.vTop) / (e.Ef - e.vTop))); };
  e.hipX = vz => vz < 0 ? vz / e.k : vz;         // front face holds points with vx ≤ hipX(vz)
  e.hipInv = vx => vx < 0 ? vx * e.k : vx;       // side face holds points with vz ≤ hipInv(vx)
  // 翼角: displacement field mirrored into each quadrant (as in the sample corner)
  const IN = -o.wingStart, LIFT = P.v('wingUp') * d, PUSH = P.v('wingOut') * d;
  e.warp = (x, y, z) => {
    const sx = x < 0 ? -1 : 1, sz = z < 0 ? -1 : 1;
    let u = Math.abs(x) - o.X, v = Math.abs(z) - o.Z; const front = u <= v; if (!front) [u, v] = [v, u];
    const wA = Math.pow(U.clamp((u - IN) / (e.Ef - IN)), 2.2), gB = U.smooth((v + 1) / (e.Ef + 1));
    const kk = U.clamp(1 - (v - u) / 1.6), p = PUSH * wA * gB;
    const dy = LIFT * wA * gB, dOut = p, dAlong = p * kk;
    return front ? new THREE.Vector3(sx * (Math.abs(x) + dAlong), y + dy, sz * (Math.abs(z) + dOut))
                 : new THREE.Vector3(sx * (Math.abs(x) + dOut), y + dy, sz * (Math.abs(z) + dAlong));
  };
  // a point on a face. face: 'S' | 'N' | 'E' | 'W'; along = coordinate along the face (x or z); v = outward distance
  e.side = f => f === 'E' || f === 'W';
  e.plan = (f, along, v) => f === 'S' ? [along, o.Z + v] : f === 'N' ? [along, -(o.Z + v)] : f === 'E' ? [o.X + v, along] : [-(o.X + v), along];
  e.F = (f, along, y, v) => { const [x, z] = e.plan(f, along, v); return e.warp(x, y, z); };
  e.halfAlong = (f, v) => (e.side(f) ? o.Z + e.hipInv(v) : o.X + e.hipX(v));   // extent of a face at outward distance v
  e.vTopOf = f => e.side(f) ? o.vTopSide : o.vTop;
  return e;
};

/* ---------------- helpers ---------------- */
HALL.inst = (parent, geo, mat, mats, vary = 0, base = 1) => {   // base < 1 darkens (板瓦 lie in the 筒瓦's shade)
  const im = new THREE.InstancedMesh(geo, mat, mats.length), c = new THREE.Color();
  mats.forEach((m, i) => { im.setMatrixAt(i, m); if (vary) { const v = base * (1 - vary / 2 + vary * U.hash(i * 7 + mats.length)), h = (U.hash(i * 13 + 5) - .5) * .025; im.setColorAt(i, c.setRGB(v + h, v, v - 2 * h)); } });
  im.castShadow = im.receiveShadow = true; parent.add(im); return im;
};
HALL.rodMatrix = (p0, p1) => {   // a unit-length member along +y placed from p0 to p1, sides kept vertical
  const dir = p1.clone().sub(p0), len = dir.length(); dir.normalize();
  const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(side, dir).normalize();
  return new THREE.Matrix4().makeBasis(side, dir, up).scale(new THREE.Vector3(1, len, 1)).setPosition(p0.clone().add(p1).multiplyScalar(.5));
};
HALL.sheet = (parent, e, f, vA, vB, yfn, mat, na = 160, nv = 30) => {   // a surface over one face between v = vA..vB, clipped at the hips
  const pos = [], idx = [];
  for (let i = 0; i <= na; i++) for (let k = 0; k <= nv; k++) {
    const v = U.lerp(vA, vB, k / nv), h = e.halfAlong(f, v), a = U.lerp(-h, h, i / na);
    const p = e.F(f, a, yfn(v, e.side(f)), v); pos.push(p.x, p.y, p.z);
  }
  for (let i = 0; i < na; i++) for (let k = 0; k < nv; k++) { const q = i * (nv + 1) + k; idx.push(q, q + 1, q + nv + 1, q + 1, q + nv + 2, q + nv + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = U.mesh(geo, mat); parent.add(m); return m;
};
HALL.FACES = ['S', 'E', 'N', 'W'];
HALL.rotOf = f => ({ S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 })[f];
// world position of a point given in a face's bracket frame (along, y, outward)
HALL.facePt = (e, f, a, y, out) => { const [x, z] = e.plan(f, a, out); return new THREE.Vector3(x, y, z); };

/* ---------------- painted beam rings ---------------- */
HALL.texCache = {};
HALL.beamRing = (parent, e, xs, zs, o = {}) => {
  const d = e.d, top = e.colTop, faceMat = (key, make, side) => { const s = U.paint(side, .75), f = HALL.texCache[key] || (HALL.texCache[key] = PT.gilded(make())); return [s, s, s, s, f, f]; };
  const beam = (f, a0, a1, yTop, h, t, mat) => {
    const m = U.mesh(new THREE.BoxGeometry(a1 - a0, h, t), mat), c = (a0 + a1) / 2;
    const [x, z] = e.plan(f, c, 0); m.position.set(x, yTop - h / 2, z); m.rotation.y = HALL.rotOf(f); parent.add(m);
  };
  for (const f of HALL.FACES) {
    const lines = e.side(f) ? zs : xs;
    for (let i = 0; i < lines.length - 1; i++) {
      const a0 = lines[i], a1 = lines[i + 1], w = a1 - a0, k = Math.round(w * 100);
      const g1 = (i + (e.side(f) ? 1 : 0)) % 2 ? 'qing' : 'lv', g2 = g1 === 'qing' ? 'lv' : 'qing', C = g => PT[g === 'qing' ? 'QING' : 'LV'];
      beam(f, a0, a1, top, 6 * d, 4.8 * d, faceMat(`hx${k}${g1}6`, () => PT.hexi(w, 6 * d, g1), C(g1)));                // 大额枋
      beam(f, a0, a1, top - 6 * d, 2 * d, 1.2 * d, faceMat(`db${k}`, () => PT.dianban(w, 2 * d), PT.RED));            // 由额垫板
      beam(f, a0, a1, top - 8 * d, 4 * d, 3.2 * d, faceMat(`hx${k}${g2}4`, () => PT.hexi(w, 4 * d, g2), C(g2)));        // 小额枋
    }
    const half = e.side(f) ? e.Z : e.X;
    for (const s of [-1, 1]) beam(f, s > 0 ? half : -half - .42, s > 0 ? half + .42 : -half, top, 6 * d, 4.8 * d, U.paint(PT.QING, .7));   // 霸王拳
    const pb = HALL.texCache.pb || (HALL.texCache.pb = PT.pingban());
    const len = 2 * half + 7 * d, pt = pb.clone(); pt.needsUpdate = true; pt.wrapS = THREE.RepeatWrapping; pt.repeat.set(len / 2.4, 1);
    const s = U.paint(PT.QING, .75), fm = new THREE.MeshStandardMaterial({ map: pt, roughness: .6 });
    beam(f, -half - 3.5 * d, half + 3.5 * d, top + 2 * d, 2 * d, 3.5 * d, [s, s, s, s, fm, fm]);                     // 平板枋
  }
};

/* ---------------- brackets ---------------- */
HALL.brackets = (parent, e, xs, zs) => {
  const d = e.d, n = e.n, span = 11 * d, cache = {};
  const baked = (kind, alt) => { const k = kind + alt; return cache[k] || (cache[k] = U.bake(DG.set(d, alt ? U.COL.lv : U.COL.qing, alt ? U.COL.qing : U.COL.lv, kind, n))); };
  const lists = {};
  const put = (kind, alt, f, a) => { const [x, z] = e.plan(f, a, 0); const m = new THREE.Matrix4().makeRotationY(HALL.rotOf(f)).setPosition(x, e.y0, z); (lists[kind + alt] = lists[kind + alt] || { kind, alt, mats: [] }).mats.push(m); };
  let count = 0;
  for (const f of HALL.FACES) {
    const lines = e.side(f) ? zs : xs; let i = 0;
    for (let b = 0; b < lines.length - 1; b++) {
      const a0 = lines[b], a1 = lines[b + 1], m = Math.round((a1 - a0) / span);
      if (b > 0) { put('zhu', i++ % 2, f, a0); count++; }
      for (let k = 1; k < m; k++) { put('ping', i++ % 2, f, U.lerp(a0, a1, k / m)); count++; }
    }
    put('ping', 0, f, lines[0]); put('ping', 0, f, lines.at(-1));   // each face's set at the corner (they cross as 搭交)
  }
  for (const L of Object.values(lists)) for (const { mat, geo } of baked(L.kind, L.alt)) { const im = new THREE.InstancedMesh(geo, mat, L.mats.length); L.mats.forEach((m, j) => im.setMatrixAt(j, m)); im.castShadow = im.receiveShadow = true; parent.add(im); }
  // 角科 diagonal members (斜翘, 斜昂 ×(n−1), 斜蚂蚱头) and the 宝瓶
  for (const [sx, sz] of SG) {
    const diag = new THREE.Group(), st = pts => pts.map(([z, y]) => [z > 0 ? z * Math.SQRT2 : z, y]), y = i => 1.2 + 2.6 * i;
    diag.add(DG.zMember(st([[-3, 1.2], [3.6, 1.2], [3.9, 1.8], [3.9, 3.2], [-3, 3.2]]), 1.4, U.COL.qing, d));
    for (let i = 1; i < n; i++) diag.add(DG.zMember(st(DG.angProfile(-3, 3 * (i + 1), y(i))), 1.4, i % 2 ? U.COL.lv : U.COL.qing, d));
    diag.add(DG.zMember(st(DG.mzt(-3, 3 * n + 3.5, y(n))), 1.4, U.COL.lv, d));
    const vase = U.mesh(new THREE.LatheGeometry([[0, 0], [.9, 0], [1.2, .6], [.8, 1.6], [.5, 2.0], [.9, 2.4], [0, 2.4]].map(([a, b]) => new THREE.Vector2(a * d, b * d)), 16), U.gold());
    vase.position.set(0, (y(n) + 2) * d, 3 * n * Math.SQRT2 * d); diag.add(vase);
    diag.rotation.y = Math.atan2(sx, sz); diag.position.set(sx * e.X, e.y0, sz * e.Z); parent.add(diag);
  }
  // continuous members along each face, crossing at the corners
  const L = DG.runList(n), mat = { qing: U.paint(U.COL.qing, .72), lv: U.paint(U.COL.lv, .72) };
  for (const f of HALL.FACES) {
    const half = e.side(f) ? e.Z : e.X, rot = HALL.rotOf(f);
    for (const [w, y0, y1, z, c] of L.boxes) { const len = 2 * (half + (z + w / 2 + .6) * d), b = U.mesh(new THREE.BoxGeometry(len, (y1 - y0) * d, w * d), mat[c]); const [x, zz] = e.plan(f, 0, z * d); b.position.set(x, e.y0 + (y0 + y1) / 2 * d, zz); b.rotation.y = rot; parent.add(b); }
    for (const [r, yy, z, c] of L.logs) { const len = 2 * (half + (z + r + 1) * d), q = new THREE.CylinderGeometry(r * d, r * d, len, 20); q.rotateZ(Math.PI / 2); const cy = U.mesh(q, mat[c]); const [x, zz] = e.plan(f, 0, z * d); cy.position.set(x, e.y0 + yy * d, zz); cy.rotation.y = rot; parent.add(cy); }
    const bt = DG.boardTex(); bt.wrapS = THREE.RepeatWrapping; bt.repeat.set(2 * half / (11 * d), 1);
    const board = U.mesh(new THREE.PlaneGeometry(2 * half, 6.4 * d), new THREE.MeshStandardMaterial({ map: bt, roughness: .8, side: THREE.DoubleSide }));
    const [x, zz] = e.plan(f, 0, -.7 * d); board.position.set(x, e.y0 + 3.2 * d, zz); board.rotation.y = rot; parent.add(board);
  }
  return count + 4;
};

/* ---------------- rafters (instanced), 望板, 连檐, tile bed ---------------- */
HALL.rafters = (parent, e) => {
  const d = e.d, rd = e.rd, pitch = P.v('rafterPitch'), IN = -e.wingStart;
  const rGeo = new THREE.CylinderGeometry(rd / 2, rd / 2, 1, 14), fGeo = new THREE.BoxGeometry(rd, 1, rd);
  const eaveEndM = HALL.texCache.ee || (HALL.texCache.ee = PT.gilded(PT.eaveEnd())), flyEndM = HALL.texCache.fe || (HALL.texCache.fe = PT.gilded(PT.flyEnd()));
  const rM = [U.paint('#234A7A', .7), eaveEndM, eaveEndM], lvM = U.paint(U.COL.lv, .7), fM = [lvM, lvM, flyEndM, flyEndM, lvM, lvM];
  const R = [], Fm = [];
  const tail = (a, oe, th) => { if (th < 1e-4) return [a, -1.0]; const c = Math.cos(th), s2 = Math.sin(th); const sd = (oe - a) / (c - s2); const at = a - sd * s2, ot = oe - sd * c; return ot < IN ? [a - (oe - IN) * Math.tan(th), IN] : [at + .05, ot + .05]; };
  for (const f of HALL.FACES) {
    const half = (e.side(f) ? e.Z : e.X) + e.Ef;
    for (let x = -half + .1; x < half; x += pitch) {
      const sx = x < 0 ? -1 : 1, aL = Math.abs(x) - (e.side(f) ? e.Z : e.X);   // along, from the nearer corner column
      if (aL > e.Ef) continue;
      const th = THREE.MathUtils.degToRad(40) * Math.pow(U.clamp((aL - IN) / (e.Ef - IN)), 1.2);
      const g = (al, v, y) => e.F(f, sx * ((e.side(f) ? e.Z : e.X) + al), y, v);
      const [ta, to] = tail(aL, e.Ee, th); if (to < e.Ee - .1) R.push(HALL.rodMatrix(g(ta, to, e.B(to) + rd / 2), g(aL, e.Ee, e.B(e.Ee) + rd / 2)));
      const [fa, fo] = tail(aL, e.Ef, th), f0 = Math.max(21 * d, fo); if (f0 < e.Ef - .1) Fm.push(HALL.rodMatrix(g(fa + (f0 - fo) * Math.tan(th), f0, e.flyB(f0) + rd / 2), g(aL, e.Ef, e.flyB(e.Ef) + rd / 2)));
    }
  }
  HALL.inst(parent, rGeo, rM, R); HALL.inst(parent, fGeo, fM, Fm);
  const wangM = U.paint(U.COL.wang, .85); wangM.side = THREE.DoubleSide;
  const bedM = U.paint('#5E5246', .95); bedM.side = THREE.DoubleSide;   // 苫背 (lime-mud bed), only seen while the tiles go on
  const em = U.paint(PT.RED, .7); em.side = THREE.DoubleSide;
  for (const f of HALL.FACES) {
    HALL.sheet(parent, e, f, -1.0, e.Ee, v => e.B(v) + rd, wangM, 160, 16);
    HALL.sheet(parent, e, f, e.Ee - .05, e.Ef, v => e.flyB(v) + rd, wangM, 160, 4);
    HALL.sheet(parent, e, f, e.vTopOf(f), e.Ef + .2, (v, s) => e.T(v, s) - .03, bedM, 160, 50);
    // 连檐 / 瓦口 board on the eave edge
    const pos = [], idx = [], nn = 200, h = e.halfAlong(f, e.Ef);
    for (let i = 0; i <= nn; i++) { const a = U.lerp(-h, h, i / nn), lo = e.F(f, a, e.flyB(e.Ef) + rd, e.Ef), hi = e.F(f, a, e.T(e.Ef) - .02, e.Ef); pos.push(lo.x, lo.y, lo.z, hi.x, hi.y, hi.z); }
    for (let i = 0; i < nn; i++) idx.push(2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    parent.add(U.mesh(geo, em));
  }
  return R.length + Fm.length;
};

/* ---------------- tiles (instanced) ---------------- */
HALL.tileGeos = () => HALL._tg || (HALL._tg = (() => {
  const tileLen = .36, R = .13;
  const half = (r0, r1, len) => { const s = new THREE.Shape(); s.absarc(0, 0, r1, 0, Math.PI, false); s.absarc(0, 0, r0, Math.PI, 0, true); return new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 10 }); };
  const tong = THREE.BufferGeometryUtils.mergeBufferGeometries([half(R - .02, R, tileLen - .03), half(R - .01, R + .008, .03).translate(0, 0, tileLen - .03)].map(x => x.toNonIndexed()));
  const bs = new THREE.Shape(); bs.absarc(0, .55, .55, -Math.PI / 2 - .33, -Math.PI / 2 + .33, false); bs.absarc(0, .55, .53, -Math.PI / 2 + .33, -Math.PI / 2 - .33, true);
  const ban = new THREE.ExtrudeGeometry(bs, { depth: .42, bevelEnabled: false, curveSegments: 12 });
  const gt = new THREE.CylinderGeometry(R + .012, R + .012, .03, 28); gt.rotateX(Math.PI / 2);
  const ds = U.extrude([[-.16, 0], [.16, 0], [.15, -.04], [.09, -.09], [0, -.12], [-.09, -.09], [-.15, -.04]], .025, 4);
  return { tong, ban, gt, ds, tileLen, R };
})());
HALL.tiles = (parent, e, cap) => {
  const TG = HALL.tileGeos(), row = P.v('tileRow'), L = { tong: [], ban: [], gt: [], ds: [] };
  const basis = (f, a, v, lift) => {
    const s = e.side(f), p = e.F(f, a, e.T(v, s) + lift, v), pa = e.F(f, a + .05, e.T(v, s) + lift, v), pv = e.F(f, a, e.T(v + .05, s) + lift, v + .05);
    let ex = pa.clone().sub(p).normalize(); const ez = pv.clone().sub(p).normalize(); let ey = new THREE.Vector3().crossVectors(ez, ex).normalize();
    if (ey.y < 0) { ex.negate(); ey.negate(); }
    ex = new THREE.Vector3().crossVectors(ey, ez).normalize();
    return new THREE.Matrix4().makeBasis(ex, ey, ez).setPosition(p);
  };
  for (const f of HALL.FACES) {
    const s = e.side(f), C = s ? e.Z : e.X, vTop = e.vTopOf(f), half = C + e.Ef;
    for (let a = -half + row / 2; a < half; a += row) for (const [kind, aa] of [['tong', a], ['ban', a + row / 2]]) {
      const u = Math.abs(aa) - C;                                     // along, beyond the corner column line
      const start = Math.max(vTop + .15, (s ? e.hipX(u) : e.hipInv(u)) + .2), end = e.Ef + (kind === 'tong' ? .08 : .05);
      if (start >= end - .1) continue;
      const step = kind === 'tong' ? TG.tileLen : .14, lift = kind === 'tong' ? .02 : -.03;
      for (let v = start; v < end - step * .5; v += step) L[kind].push(basis(f, aa, v, lift));
      (kind === 'tong' ? L.gt : L.ds).push(basis(f, aa, end - .02, lift));
    }
  }
  const gtM = new THREE.MeshPhysicalMaterial({ color: P.v('tileColor'), roughness: .35, clearcoat: .6, normalMap: HALL.texCache.gtn || (HALL.texCache.gtn = U.normalFromHeight(PT.goutouHeight(), 3)) });
  HALL.inst(parent, TG.tong, U.glaze(), L.tong, .2); HALL.inst(parent, TG.ban, U.mat('banGlaze', () => new THREE.MeshStandardMaterial({ color: P.v('tileColor'), roughness: .75, envMapIntensity: .15 })), L.ban, .2, .55);   // 板瓦 sit in the channels: matte, no sky glint
  HALL.inst(parent, TG.gt, gtM, L.gt, .12); HALL.inst(parent, TG.ds, U.glaze(), L.ds, .12);
  return { tong: L.tong.length, ban: L.ban.length, goutou: L.gt.length, dishui: L.ds.length };
};

/* ---------------- ridges ---------------- */
HALL.sweep = (parent, path, secFn, mat = U.glaze()) => {   // a section swept along a polyline (section in side/up coords)
  const pos = [], idx = [], n = path.length, m = secFn(0).length;
  for (let i = 0; i < n; i++) {
    const tn = (i < n - 1 ? path[i + 1].clone().sub(path[i]) : path[i].clone().sub(path[i - 1])).normalize();
    const side = new THREE.Vector3().crossVectors(tn, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(side, tn).normalize();
    for (const [sx, sy] of secFn(i / (n - 1))) { const p = path[i].clone().addScaledVector(side, sx).addScaledVector(up, sy); pos.push(p.x, p.y, p.z); }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < m; k++) { const a = i * m + k, b = i * m + (k + 1) % m; idx.push(a, b, a + m, b, b + m, a + m); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  parent.add(U.mesh(geo, mat));
};
HALL.ridgeSec = (H, W = .27) => [[-W, 0], [W, 0], [W, .07], [W * .74, .08], [W * .74, H - .12], [W * .56, H - .06], [W * .3, H - .01], [0, H], [-W * .3, H - .01], [-W * .56, H - .06], [-W * .74, H - .12], [-W * .74, .08], [-W, .07]];
// hip ridge from v0 (top) to the eave in quadrant (sx, sz), with 仙人 + 10 beasts and a 戗兽/垂兽
HALL.hip = (parent, e, sx, sz, v0) => {
  const path = [], qEnd = e.Ef + .12;
  for (let i = 0; i <= 120; i++) { const v = U.lerp(v0, qEnd, i / 120); path.push(e.warp(sx * (e.X + e.hipX(v)), e.T(v) - .02, sz * (e.Z + v))); }
  const cum = [0]; for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + path[i].distanceTo(path[i - 1]));
  const Lt = cum.at(-1), at = s => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1]); return { p: path[i - 1].clone().lerp(path[i], t), t: path[i].clone().sub(path[i - 1]).normalize() }; };
  const sBeast = k => Lt - (.3 + P.v('beastGap') * k), sQ = sBeast(10) - .6;
  const hAt = s => s < sQ ? .58 : .36;
  HALL.sweep(parent, path, t => HALL.mainRidgeSec(hAt(t * Lt) + .1, .27));
  const TG = HALL.tileGeos(), caps = [];
  for (let s = .2; s < Lt - .05; s += TG.tileLen) { const { p, t } = at(s), side = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(side, t).normalize();
    caps.push(new THREE.Matrix4().makeBasis(side.clone().negate(), up, t).setPosition(p.clone().addScaledVector(up, hAt(s) - .1)).multiply(new THREE.Matrix4().makeScale(1.1, 1.1, 1))); }
  HALL.inst(parent, TG.tong, U.glaze(), caps, .15);
  const place = (obj, s, H) => { const { p, t } = at(s), fl = new THREE.Vector3(t.x, 0, t.z).normalize(); obj.position.copy(p).add(new THREE.Vector3(0, hAt(s) - .02, 0)); obj.rotation.y = Math.atan2(fl.x, fl.z); obj.scale.setScalar(H); parent.add(obj); };
  const H = P.v('beastH') / .66;
  place(BS.immortal(), sBeast(0), H);
  P.v('beasts').forEach((nm, i) => place(BS.beast(nm), sBeast(i + 1), H));
  place(BS.dragonHead(true), sQ, 1.0 / .7);
  // 仔角梁 / 老角梁 and the 套兽
  const lo = new THREE.Vector3(sx, 0, sz), jl0 = e.warp(sx * (e.X - .4), e.deck(-.4) - .17, sz * (e.Z - .4)), jl1 = e.warp(sx * (e.X + e.Ef + .06), e.deck(e.Ef) - .14, sz * (e.Z + e.Ef + .06));
  HALL.inst(parent, new THREE.BoxGeometry(.24, 1, .26), U.paint(U.COL.lv, .7), [HALL.rodMatrix(jl0, jl1)]);
  HALL.inst(parent, new THREE.BoxGeometry(.26, 1, .3), U.paint(U.COL.qing, .7), [HALL.rodMatrix(jl0.clone().add(new THREE.Vector3(0, -.3, 0)), e.warp(sx * (e.X + e.Ee + .1), e.B(e.Ee) - .1, sz * (e.Z + e.Ee + .1)))]);
  const th = BS.dragonHead(false), dirJ = jl1.clone().sub(jl0).normalize();
  th.scale.setScalar(.5 / .6); th.position.copy(jl1).addScaledVector(dirJ, -.12).add(new THREE.Vector3(0, -.2, 0)); th.rotation.y = Math.atan2(sx, sz); parent.add(th);
};
// 正吻 as in close_up-2: a thick slab; on the side toward the ridge centre (+z here) the dragon's open jaws bite the ridge
// at the bottom and its tail rolls into a spiral at the top; a 剑把 with a fan-shaped hilt stands in the middle;
// the outer edge is lower and carries a small 背兽; a little dragon climbs the face. Height 1, built facing +z (= inward).
HALL.wen = () => {
  const g = new THREE.Group(), T = .2, m = BS.m();
  // silhouette in (u = inward, v = up); profile drawn counter-clockwise from the outer foot
  const sil = [[-.33, 0], [.36, 0], [.36, .08], [.38, .3], [.36, .62], [.34, .8], [.3, .9], [.2, .95], [.08, .9], [0, .82], [-.1, .74], [-.2, .68], [-.33, .64]];
  const slab = new THREE.ExtrudeGeometry(U.shape(sil), { depth: T, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: 3, curveSegments: 6 });
  slab.translate(0, 0, -T / 2);
  const relief = HALL.texCache.wenN || (HALL.texCache.wenN = (() => { const c = U.canvas(512, 512, (q, w, h) => {   // scales over the body, cloud scrolls near the edges
      q.fillStyle = '#808080'; q.fillRect(0, 0, w, h); q.lineWidth = 5;
      for (let j = 0; j < 22; j++) for (let i = 0; i < 22; i++) { const x = i * 24 + (j % 2) * 12, y = j * 24; const gr = q.createRadialGradient(x, y + 6, 2, x, y + 6, 14); gr.addColorStop(0, '#d0d0d0'); gr.addColorStop(1, '#606060'); q.fillStyle = gr; q.beginPath(); q.arc(x, y + 6, 13, Math.PI, 2 * Math.PI); q.fill(); }
      q.strokeStyle = '#ececec'; for (let k = 0; k < 9; k++) { const x = 40 + (k * 157) % 440, y = 40 + (k * 97) % 440; q.beginPath(); for (let t = 0; t < 30; t++) { const a = t * .45, r = 28 * (1 - t / 32); q.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } q.stroke(); } });
    const t = U.normalFromHeight(c, 4); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); return t; })());
  const sm2 = U.glaze().clone(); sm2.normalMap = relief; sm2.normalScale = new THREE.Vector2(.8, .8);
  const sm = U.mesh(slab, sm2); sm.rotation.y = -Math.PI / 2; g.add(sm);   // u → +z
  const tube = (pts, r0, r1, seg = 40) => { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))); const geo = new THREE.TubeGeometry(c, seg, 1, 10); const pos = geo.attributes.position, nv = geo.parameters.radialSegments + 1;
    for (let i = 0; i <= seg; i++) { const t = i / seg, r = U.lerp(r0, r1, t), cp = c.getPointAt(t); for (let k = 0; k < nv; k++) { const j = i * nv + k, v = new THREE.Vector3().fromBufferAttribute(pos, j).sub(cp).multiplyScalar(r); pos.setXYZ(j, cp.x + v.x, cp.y + v.y, cp.z + v.z); } }
    geo.computeVertexNormals(); const t2 = U.mesh(geo, m); g.add(t2); return t2; };
  // the tail's spiral at the inner top (one and a half turns, on both faces)
  for (const s of [-1, 1]) { const sp = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 3, r = .1 * (1 - i / 48); sp.push([s * (T / 2 + .015), .84 + Math.sin(a) * r, .24 + Math.cos(a) * r]); } tube(sp, .028, .012, 80); }
  // the jaws: upper jaw, open lower jaw biting down over the ridge end, teeth, eye, whiskers
  const head = BS.blob([...[[0, .2, .3, .09], [0, .24, .4, .07], [0, .26, .47, .05], [0, .1, .36, .06], [0, .07, .44, .045], [0, .3, .28, .07]].map(([x, y, z, r]) => [x, y - .05, z - .1, r])], 72);
  head.scale.set(1.4, 1, 1); head.position.set(0, 0, .1); g.add(head);
  for (const s of [-1, 1]) { BS.sph(g, [.03, .035, .03], [s * (T / 2 + .01), .26, .33]); tube([[s * (T / 2 + .01), .2, .46], [s * (T / 2 + .03), .28, .58], [s * (T / 2 + .02), .36, .6]], .012, .005); }
  // a little dragon climbing the face (relief on both sides): body, legs, head
  for (const s of [-1, 1]) {
    const x = s * (T / 2 + .012);
    tube([[x, .18, -.05], [x, .32, .05], [x, .42, -.04], [x, .52, .06], [x, .62, .14], [x, .7, .2]], .028, .016, 50);
    for (const [y, z] of [[.3, .02], [.45, -.02], [.56, .1]]) tube([[x, y, z], [x, y - .05, z - .06], [x, y - .07, z - .04]], .01, .006, 8);
    BS.sph(g, [.02, .035, .045], [x, .72, .24]);
  }
  // 剑把: blade standing in the middle with a fan-shaped hilt (photo: ribbed fan on top)
  const blade = U.mesh(new THREE.BoxGeometry(.045, .26, .09), m); blade.position.set(0, .86, -.02); g.add(blade);
  const fan = new THREE.Shape(); fan.moveTo(-.07, 0); fan.lineTo(.07, 0); fan.absarc(0, .02, .085, 0, Math.PI, false); fan.closePath();
  const fg = new THREE.ExtrudeGeometry(fan, { depth: .05, bevelEnabled: false }); fg.translate(0, 0, -.025); fg.rotateY(Math.PI / 2);
  const fm = U.mesh(fg, m); fm.position.set(0, .99, -.02); g.add(fm);
  for (let k = 0; k < 5; k++) { const r = U.mesh(new THREE.BoxGeometry(.055, .012, .012), m); r.position.set(0, 1.0 + .035 * Math.sin(k / 4 * Math.PI), -.02 - .07 + k * .035); g.add(r); }
  // 背兽 on the outer edge
  const bs = BS.dragonHead(false); bs.scale.setScalar(.16); bs.position.set(0, .34, -.38); bs.rotation.y = Math.PI; g.add(bs);
  // fins along the outer back
  for (let i = 0; i < 4; i++) BS.flame(g, .1, .06, [0, .1 + i * .13, -.34], [-1.6, 0, 0], .03);
  return g;
};
// 正脊 section: 当沟 at the foot, 压当条, 群色条, the 正脊筒子 body, a rounded cap row on top
HALL.mainRidgeSec = (H, W = .34) => [[-W, 0], [W, 0], [W, .12], [W * .86, .14], [W * .86, .2], [W * .92, .22], [W * .92, .3], [W * .8, .32], [W * .8, H - .2], [W * .86, H - .18], [W * .86, H - .14], [W * .5, H - .04], [0, H], [-W * .5, H - .04], [-W * .86, H - .14], [-W * .86, H - .18], [-W * .8, H - .2], [-W * .8, .32], [-W * .92, .3], [-W * .92, .22], [-W * .86, .2], [-W * .86, .14], [-W, .12]];

/* ---------------- walls, doors, windows, 雀替, plaque ---------------- */
PT.lattice = (g, x, y, w, h, s = 22) => {   // 三交六椀 菱花: triangular grid of red bars with gold studs over the dark interior
  g.fillStyle = '#1B1210'; g.fillRect(x, y, w, h);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.strokeStyle = '#7A2A1E'; g.lineWidth = s * .2;
  const r3 = Math.sqrt(3) / 2;
  for (const ang of [0, Math.PI / 3, -Math.PI / 3]) { const ca = Math.cos(ang), sa = Math.sin(ang); for (let k = -60; k <= 60; k++) { const off = k * s * r3; g.beginPath(); g.moveTo(x + w / 2 - sa * off - ca * 2000, y + h / 2 + ca * off - sa * 2000); g.lineTo(x + w / 2 - sa * off + ca * 2000, y + h / 2 + ca * off + sa * 2000); g.stroke(); } }
  g.fillStyle = PT.GOLD; for (let j = -40; j < 40; j++) for (let i = -40; i < 40; i++) { const px = x + w / 2 + (i + (j % 2) * .5) * s, py = y + h / 2 + j * s * r3; if (px > x && px < x + w && py > y && py < y + h) { g.beginPath(); g.arc(px, py, s * .12, 0, Math.PI * 2); g.fill(); } }
  g.restore();
};
PT.leaf = (kind = 'door') => U.tex(256, kind === 'window' ? 640 : 820, (g, w, h) => {   // one 隔扇 / 槛窗 leaf
  g.fillStyle = '#8A2A20'; g.fillRect(0, 0, w, h);
  const gold = (x, y, ww, hh, lw = 4) => { g.strokeStyle = PT.GOLD; g.lineWidth = lw; g.strokeRect(x, y, ww, hh); };
  const fr = 18, band = (y0, hh) => { g.fillStyle = '#7A241B'; g.fillRect(fr, y0, w - 2 * fr, hh); gold(fr + 6, y0 + 6, w - 2 * fr - 12, hh - 12, 3); g.fillStyle = PT.GOLD; g.fillRect(w / 2 - 30, y0 + hh / 2 - 4, 60, 8); };
  if (kind === 'window') { band(fr, 46); PT.lattice(g, fr, fr + 52, w - 2 * fr, h - 2 * fr - 52); }
  else {
    const y1 = fr, hTop = 46, y2 = y1 + hTop + 6, hLat = h * .55, y3 = y2 + hLat + 6, hMid = 46, y4 = y3 + hMid + 6, hSkirt = h - y4 - fr - 52;
    band(y1, hTop); PT.lattice(g, fr, y2, w - 2 * fr, hLat); band(y3, hMid);
    g.fillStyle = '#7A241B'; g.fillRect(fr, y4, w - 2 * fr, hSkirt); gold(fr + 8, y4 + 8, w - 2 * fr - 16, hSkirt - 16, 5);   // 裙板 with a gold 团龙
    PT.dragon(g, w / 2, y4 + hSkirt / 2, w * .9, hSkirt * .55, 1, { waves: .9, amp: .3, flames: 4 });
    band(h - fr - 46, 46);
  }
  g.strokeStyle = PT.GOLD; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);   // 边梃 gilded edge (铜叶 at the joints)
  g.fillStyle = '#D9A93E'; for (const yy of [.25, .5, .75]) { g.fillRect(0, h * yy - 10, 22, 20); g.fillRect(w - 22, h * yy - 10, 22, 20); }
});
PT.sillWall = () => U.tex(256, 128, (g, w, h) => {   // 槛墙 face: yellow-green glazed 圭文 tiles in a hexagon pattern
  g.fillStyle = '#3E7A4E'; g.fillRect(0, 0, w, h);
  const s = 18, r3 = Math.sqrt(3);
  for (let j = -1; j < h / (s * 1.5) + 1; j++) for (let i = -1; i < w / (s * r3) + 1; i++) {
    const cx = i * s * r3 + (j % 2) * s * r3 / 2, cy = j * s * 1.5; g.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * s * .92, cy + Math.sin(a) * s * .92); }
    g.closePath(); g.fillStyle = (i + j) % 3 ? '#D7A93A' : '#C79528'; g.fill(); g.strokeStyle = '#2F5E3B'; g.lineWidth = 2; g.stroke();
  }
}, { repeat: [1, 1] });
PT.queti = () => U.tex(1024, 512, (g, w, h) => {   // 雀替: carved 卷草 scrolls (blue/green) with gilded edges on red; uv v = 1 at the beam, 0 at the tip's level
  g.fillStyle = '#7E241C'; g.fillRect(0, 0, w, h);
  const edge = u => (1 - (1 - Math.pow(1 - u, .55) * (1 - .25 * Math.sin(u * Math.PI * 3) * (1 - u)))) ;   // depth below the beam as a fraction of qh
  for (let k = 0; k < 26; k++) {
    const u = .04 + (k % 13) / 13 * .9, yy = (k < 13 ? .25 : .62) * edge(u), x = u * w, y = yy * h, r = Math.max(10, 56 * edge(u) * (k < 13 ? 1 : .7));
    g.fillStyle = k % 3 === 0 ? '#2E5FA6' : k % 3 === 1 ? '#2E8869' : '#3B78B8'; g.beginPath(); g.ellipse(x, y, r * 1.2, r, .3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = PT.GOLD; g.lineWidth = 6; g.beginPath(); for (let t = 0; t < 26; t++) { const a = t * .5 + k, rr = r * (1.1 - t / 26); g.lineTo(x + Math.cos(a) * rr * 1.2, y + Math.sin(a) * rr); } g.stroke();
    g.strokeStyle = '#5BA0D8'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r * .45, 0, Math.PI * 1.4); g.stroke();
  }
  g.strokeStyle = PT.GOLD; g.lineWidth = 14; g.beginPath(); for (let i = 0; i <= 100; i++) { const u = i / 100; g.lineTo(u * w, (1 - (1 - edge(u))) * h - 6); } g.stroke();
  g.lineWidth = 10; g.beginPath(); g.moveTo(6, 0); g.lineTo(6, h); g.stroke();
});
PT.plaque = () => U.tex(512, 608, (g, w, h) => {   // 匾: 太和殿 on blue, gilded dragon frame
  g.fillStyle = '#B5352A'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 10; k++) { const t = k / 10; PT.dragon(g, w * (.1 + .8 * t), h * .06, w * .2, h * .08, k % 2 ? 1 : -1, { flames: 2, waves: .8 }); PT.dragon(g, w * (.1 + .8 * t), h * .94, w * .2, h * .08, k % 2 ? -1 : 1, { flames: 2, waves: .8 }); }
  for (let k = 0; k < 8; k++) { const t = k / 8 + .06; PT.dragon(g, w * .06, h * t, w * .1, h * .1, 1, { flames: 2 }); PT.dragon(g, w * .94, h * t, w * .1, h * .1, -1, { flames: 2 }); }
  g.fillStyle = '#123E86'; g.fillRect(w * .16, h * .14, w * .68, h * .72); g.strokeStyle = PT.GOLD; g.lineWidth = 10; g.strokeRect(w * .16, h * .14, w * .68, h * .72);
  g.fillStyle = '#E8C15A'; g.font = `900 ${h * .17}px ${F_SER}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  [...'太和殿'].forEach((c, i) => g.fillText(c, w / 2, h * (.28 + i * .22)));
});
HALL.body = (parent, lo, up, xs, zs) => {
  const X1 = lo.X, Z1 = lo.Z, Z2 = up.Z, Yc = lo.colTop, d = lo.d, wallM = U.paint('#8C2B22', .85);
  const box = (w, h, t, x, y, z, rot, mat) => { const m = U.mesh(new THREE.BoxGeometry(w, h, t), mat); m.position.set(x, y, z); m.rotation.y = rot; parent.add(m); return m; };
  const dH = P.v('doorH'), sH = P.v('sillWallH'), door = HALL.texCache.door || (HALL.texCache.door = PT.leaf('door')), win = HALL.texCache.win || (HALL.texCache.win = PT.leaf('window'));
  const leafM = t => { const s = U.paint('#8A2A20', .7), f = PT.gilded(t); return [s, s, s, s, f, f]; };
  const doorM = leafM(door), winM = leafM(win), sillM = [wallM, wallM, wallM, wallM, new THREE.MeshStandardMaterial({ map: PT.sillWall(), roughness: .4 }), wallM];
  // front plane on the front 金柱 line (z = Z2): 11 bays; 槛窗 in the 边间 and 四次间, 隔扇 elsewhere, 帘架 in the 明间
  const nb = xs.length - 1, winBay = b => b === 0 || b === 1 || b === nb - 2 || b === nb - 1;
  for (let b = 0; b < nb; b++) {
    const a0 = xs[b] + .33, a1 = xs[b + 1] - .33, w = a1 - a0, lw = w / 4;
    if (winBay(b)) {
      box(w, sH, .5, (a0 + a1) / 2, sH / 2, Z2, 0, sillM);
      for (let k = 0; k < 4; k++) box(lw - .02, dH - sH, .1, a0 + lw * (k + .5), sH + (dH - sH) / 2, Z2, 0, winM);
    } else for (let k = 0; k < 4; k++) box(lw - .02, dH, .1, a0 + lw * (k + .5), dH / 2, Z2, 0, doorM);
    box(w + .66, Yc - dH, .12, (xs[b] + xs[b + 1]) / 2, dH + (Yc - dH) / 2, Z2 - .05, 0, U.paint('#5C1C16', .8));   // 走马板 above
    box(w, .14, .2, (a0 + a1) / 2, dH + .07, Z2, 0, U.paint('#8A2A20', .7));                                            // 中槛
  }
  // porch ceiling between the 檐柱 and 金柱 lines
  box(2 * X1, .08, Z1 - Z2, 0, Yc + .02, (Z1 + Z2) / 2, 0, U.paint('#173F33', .9));
  // back wall on the 檐柱 line: 8 walls + doors in the 后明间 and the two 后次间 beside it
  const mid = (nb - 1) / 2;
  for (let b = 0; b < nb; b++) {
    const a0 = xs[b] + .3, a1 = xs[b + 1] - .3, w = a1 - a0;
    if (Math.abs(b - mid) <= 1) { for (let k = 0; k < 4; k++) box(w / 4 - .02, dH, .1, a0 + w / 4 * (k + .5), dH / 2, -Z1, Math.PI, doorM); box(w, Yc - dH, .3, (a0 + a1) / 2, dH + (Yc - dH) / 2, -Z1, 0, wallM); }
    else box(w + .6, Yc - 8 * d, .9, (xs[b] + xs[b + 1]) / 2, (Yc - 8 * d) / 2, -Z1, 0, wallM);
  }
  // 山墙 on the side 檐柱 lines, from the back corner to the front 金柱 line (the porch stays open)
  for (const s of [-1, 1]) box(Z1 + Z2, Yc - 8 * d, .9, s * X1, (Yc - 8 * d) / 2, (Z2 - Z1) / 2, Math.PI / 2, wallM);
  // 雀替 under the 小额枋 on both sides of every front 檐柱
  const [qf, qh] = P.v('queti'), qt = PT.queti(), qM = new THREE.MeshStandardMaterial({ map: qt, roughness: .6, side: THREE.DoubleSide });
  for (let i = 0; i < xs.length; i++) for (const s of [-1, 1]) {
    const b = s > 0 ? i : i - 1; if (b < 0 || b >= nb) continue;
    const L = qf * (xs[b + 1] - xs[b]), pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push([t * L, -qh * Math.pow(1 - t, .55) * (1 - .25 * Math.sin(t * Math.PI * 3) * (1 - t))]); }
    pts.push([L, 0], [0, 0]);
    const sh = U.shape(pts.map(([x, y]) => [x, y])), geo = new THREE.ExtrudeGeometry(sh, { depth: .14, bevelEnabled: false }); geo.translate(0, 0, -.07);
    const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, geo.attributes.position.getX(k) / L, 1 + geo.attributes.position.getY(k) / qh);
    const m = U.mesh(geo, qM); m.scale.x = s; m.position.set(xs[i] + s * .32, Yc - 12 * d, Z1); parent.add(m);
  }
  // 台明 (the hall's own platform; the three-tier terrace comes in phase 5)
  const ex = 2.0;
  box(2 * (X1 + ex), .3, 2 * (Z1 + ex), 0, -.15, 0, 0, U.paint(U.COL.marble, .7));
};
HALL.plaque = (parent, up) => {
  const [w, h] = P.v('plaque'), m = U.mesh(new THREE.BoxGeometry(w, h, .12), [U.paint('#B5352A', .6), U.paint('#B5352A', .6), U.paint('#B5352A', .6), U.paint('#B5352A', .6), PT.gilded(PT.plaque()), U.paint('#B5352A', .6)]);
  m.position.set(0, up.colTop - .6, up.Z + 1.0); m.rotation.x = -.18; parent.add(m);
};

/* ---------------- assemble ---------------- */
HALL.build = (root) => {
  const d = P.d(), xL = P.xLines(), zL = P.zLines(), g = new THREE.Group(); root.add(g);
  const X1 = xL.at(-1), Z1 = zL.at(-1), X2 = xL.at(-2), Z2 = zL.at(-2), wall = X1 - X2;
  const lo = HALL.eave({ X: X1, Z: Z1, colTop: P.v('eaveColH'), n: 3, wingStart: wall, vTop: -wall, vTopSide: -wall, rise: v => P.v('lowerInPitch') * v });
  // upper roof: 五步举架 scaled so the 正脊 top lands on the recorded 正中高
  const ju = P.v('upperJu'), run = Z2 / ju.length, R = P.v('ridgeHalf'), k = Z2 / (X2 - R);
  const riseRaw = v => { let y = 0; for (let i = 0; i < ju.length; i++) { const a = i * run, b = (i + 1) * run; if (v <= a) break; y += ju[i] * (Math.min(v, b) - a); } return y; };
  const upBase = HALL.eave({ X: X2, Z: Z2, colTop: P.v('upperColH'), n: 4, wingStart: P.v('wingStartUp'), vTop: -Z2, vTopSide: R - X2, k, rise: riseRaw });
  const want = P.v('ridgeTop') - P.v('ridgeH') - (upBase.T(-Z2) - upBase.B(-Z2)), fScale = (want - upBase.Y0) / riseRaw(Z2);
  const up = HALL.eave({ X: X2, Z: Z2, colTop: P.v('upperColH'), n: 4, wingStart: P.v('wingStartUp'), vTop: -Z2, vTopSide: R - X2, k, rise: v => riseRaw(v) * fScale });
  // columns: 32 檐柱, 40 金柱 (the outer 24 of them carry the upper eave)
  const colM = U.paint(U.COL.zhu, .6), rE = P.v('eaveColD') / 2, rG = P.v('goldColD') / 2;
  const cE = new THREE.CylinderGeometry(rE * .94, rE, lo.colTop, 32); cE.translate(0, lo.colTop / 2, 0);
  // 金柱: full diameter up to the lower roof; above it only the 柱头 inside the upper 额枋 (photo: the painted 枋 run continuously there)
  const hJ = lo.T(-wall) - .1, rTop = 2.2 * d;
  const cG = THREE.BufferGeometryUtils.mergeBufferGeometries([new THREE.CylinderGeometry(rG * .96, rG, hJ, 32).translate(0, hJ / 2, 0), new THREE.CylinderGeometry(rTop, rTop, up.colTop - hJ, 16).translate(0, hJ + (up.colTop - hJ) / 2, 0)].map(x => x.toNonIndexed()));
  const eM = [], gM = [];
  xL.forEach((x, i) => zL.forEach((z, j) => { const edge = i === 0 || j === 0 || i === xL.length - 1 || j === zL.length - 1; (edge ? eM : gM).push(new THREE.Matrix4().setPosition(x, 0, z)); }));
  BUILD.mark(g, 'cols'); HALL.inst(g, cE, colM, eM); HALL.inst(g, cG, colM, gM);
  BUILD.mark(g, 'beams'); HALL.beamRing(g, lo, xL, zL); HALL.beamRing(g, up, xL.slice(1, -1), zL.slice(1, -1));
  BUILD.mark(g, 'bracketsLo'); const nLo = HALL.brackets(g, lo, xL, zL);
  BUILD.mark(g, 'bracketsUp'); const nUp = HALL.brackets(g, up, xL.slice(1, -1), zL.slice(1, -1));
  BUILD.mark(g, 'rafters'); const rafters = HALL.rafters(g, lo) + HALL.rafters(g, up);
  BUILD.mark(g, 'tilesLo'); const tLo = HALL.tiles(g, lo);
  BUILD.mark(g, 'tilesUp'); const tUp = HALL.tiles(g, up);
  // ridges: upper 正脊 + 正吻, 4 垂脊; lower 4 戗脊 and the 围脊 along the upper wall with 合角吻 at its corners
  const yR = up.T(-Z2) - .02, rp = []; for (let i = 0; i <= 40; i++) rp.push(new THREE.Vector3(U.lerp(-R, R, i / 40), yR, 0));
  BUILD.mark(g, 'ridge'); HALL.sweep(g, rp, () => HALL.mainRidgeSec(P.v('ridgeH')));
  { const joints = []; for (let x = -R + .5; x < R - .3; x += .52) joints.push(new THREE.Matrix4().setPosition(x, yR + P.v('ridgeH') / 2 + .05, 0));   // 正脊筒子 joints
    HALL.inst(g, new THREE.BoxGeometry(.03, P.v('ridgeH') - .55, 2 * .34 * .8 + .02), U.glaze('#A8700A'), joints); }
  BUILD.mark(g, 'wen'); for (const s of [-1, 1]) { const w = HALL.wen(); w.scale.setScalar(3.36); w.position.set(s * (R + .25), yR - .02, 0); w.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(w); }   // stands on the roof at the ridge end, jaws over the ridge
  BUILD.mark(g, 'hips'); for (const [sx, sz] of SG) { HALL.hip(g, up, sx, sz, -Z2); HALL.hip(g, lo, sx, sz, -wall); }
  const yW = lo.T(-wall) - .02;
  BUILD.mark(g, 'weiji');
  for (const f of HALL.FACES) { const half = lo.side(f) ? Z2 : X2, p0 = lo.plan(f, -half, -wall), p1 = lo.plan(f, half, -wall); HALL.sweep(g, [new THREE.Vector3(p0[0], yW, p0[1]), new THREE.Vector3(p1[0], yW, p1[1])], () => HALL.ridgeSec(.62, .3)); }
  for (const [sx, sz] of SG) { const w = HALL.wen(); w.scale.setScalar(1.1); w.position.set(sx * X2, yW + .4, sz * Z2); w.rotation.y = Math.atan2(-sx, -sz); g.add(w); }   // 合角吻
  // 围脊板 between the 围脊 and the upper 小额枋
  for (const f of HALL.FACES) { const half = up.side(f) ? Z2 : X2, h = (up.colTop - 12 * d) - (yW + .5); if (h > .02) { const b = U.mesh(new THREE.BoxGeometry(2 * half, h, .3), U.paint('#6E2219', .85)); const [x, z] = up.plan(f, 0, 0); b.position.set(x, yW + .5 + h / 2, z); b.rotation.y = HALL.rotOf(f); g.add(b); } }
  BUILD.mark(g, 'body'); HALL.body(g, lo, up, xL, zL); BUILD.mark(g, 'plaque'); HALL.plaque(g, up);
  HALL.info = { lo, up, fScale, k, brackets: nLo + nUp, bracketsLo: nLo, bracketsUp: nUp, rafters, tiles: { lo: tLo, up: tUp },
    heights: { lowerEave: lo.T(lo.Ef), upperEave: up.T(up.Ef), weiJiTop: yW + .62, upperBeamBottom: up.colTop - 12 * d, ridgeTop: yR + P.v('ridgeH'), wenTop: yR - .02 + 3.36 * 1.03 } };
  return g;
};
window.HALL = HALL;
