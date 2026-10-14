/* 下檐东南翼角 — the phase-2 sample. World: x east, z south (front), y up, origin = hall centre at floor (台明) level.
   Local corner coordinates: u = x − Xc (along the south face, + toward the corner), v = z − Zc (outward). The east face
   is the mirror image across the 45° plane u = v. Heights follow the bracket stack (dougong.js) and the rafter rules. */
const CORNER = {};
CORNER.build = (root) => {
  const d = P.d(), Xc = P.xLines().at(-1), Zc = P.zLines().at(-1);
  const Yc = P.v('eaveColH'), y0 = Yc + 2 * d, Y0 = y0 + DG.TOP0 * d;
  const IN = -11.1 * CHI, E23 = 23 * d, E30 = 30 * d, US = -9.6;   // 金柱 line, 檐椽 end, eave, start of the sample
  const B = v => Y0 - P.v('lowerPitch') * v;                         // 檐椽 bottom line
  const flyB = v => B(E23) + 1.5 * d + .03 - P.v('flyPitch') * (v - E23);   // 飞椽 bottom
  const smax = (a, b, k = .08) => { const h = U.clamp(.5 + .5 * (a - b) / k); return U.lerp(b, a, h) + k * h * (1 - h); };
  const deck = v => smax(B(v) + 1.5 * d + .03, flyB(v) + 1.5 * d + .03);
  const T = v => deck(v) + U.lerp(.26, .15, U.smooth((v - IN) / (E30 - IN)));   // 苫背 + 瓦口: tile edge sits ~0.15 m above the 飞椽   // tile bed (苫背) surface
  // ---- 翼角: 冲三翘四 as a displacement field, symmetric about the hip plane ----
  const LIFT = P.v('wingUp') * d, PUSH = P.v('wingOut') * d;
  const warp = (x, y, z) => {
    let u = x - Xc, v = z - Zc; const south = u <= v; if (!south) [u, v] = [v, u];
    const wA = Math.pow(U.clamp((u - IN) / (E30 - IN)), 2.2), gB = U.smooth((v + 1) / (E30 + 1));
    const k = U.clamp(1 - (v - u) / 1.6), p = PUSH * wA * gB;
    const dy = LIFT * wA * gB, dOut = p, dAlong = p * k;
    return south ? new THREE.Vector3(x + dAlong, y + dy, z + dOut) : new THREE.Vector3(x + dOut, y + dy, z + dAlong);
  };
  // a point given in face coordinates: f = 'S' | 'E', a = along (+ toward corner), o = outward
  const F = (f, a, y, o) => f === 'S' ? warp(Xc + a, y, Zc + o) : warp(Xc + o, y, Zc + a);
  const g = new THREE.Group(); root.add(g);
  const add = (m) => { g.add(m); return m; };

  // ---------------- columns, architraves, 平板枋 ----------------
  const colM = U.paint(U.COL.zhu, .6), r = P.v('eaveColD') / 2;
  const colAt = (x, z) => { const c = add(U.mesh(new THREE.CylinderGeometry(r * .94, r, Yc, 32), colM)); c.position.set(x, Yc / 2, z); };
  const xL = P.xLines(), zL = P.zLines();
  [xL.at(-1), xL.at(-2), xL.at(-3)].forEach(x => colAt(x, Zc)); [zL.at(-2), zL.at(-3)].forEach(z => colAt(Xc, z));
  const beam = (f, a0, a1, yTop, h, t, mat) => {   // along a face between along-coords a0..a1, on the axis line
    const len = a1 - a0, m = add(U.mesh(new THREE.BoxGeometry(len, h, t), mat));
    if (f === 'S') { m.position.set(Xc + (a0 + a1) / 2, yTop - h / 2, Zc); } else { m.rotation.y = -Math.PI / 2; m.position.set(Xc, yTop - h / 2, Zc + (a0 + a1) / 2); }
    return m;
  };
  const faceMat = (tex, side) => { const s = U.paint(side, .75), f = PT.gilded(tex); return [s, s, s, s, f, f]; };
  const bays = { S: [[xL.at(-3) - Xc, xL.at(-2) - Xc, 'qing'], [xL.at(-2) - Xc, 0, 'lv']], E: [[zL.at(-3) - Zc, zL.at(-2) - Zc, 'lv'], [zL.at(-2) - Zc, 0, 'qing']] };
  for (const f of ['S', 'E']) {
    for (const [a0, a1, gr] of bays[f]) {
      const w = a1 - a0, other = gr === 'qing' ? 'lv' : 'qing';
      beam(f, a0, a1, Yc, 6 * d, 4.8 * d, faceMat(PT.hexi(w, 6 * d, gr), PT[gr === 'qing' ? 'QING' : 'LV']));        // 大额枋
      beam(f, a0, a1, Yc - 6 * d, 2 * d, 1.2 * d, faceMat(PT.dianban(w, 2 * d), PT.RED));                         // 由额垫板
      beam(f, a0, a1, Yc - 8 * d, 4 * d, 3.2 * d, faceMat(PT.hexi(w, 4 * d, other), PT[other === 'qing' ? 'QING' : 'LV']));   // 小额枋
    }
    beam(f, 0, .42, Yc, 6 * d, 4.8 * d, U.paint(PT.QING, .7));                                                    // 霸王拳 end past the corner column
    const pb = PT.pingban(); pb.repeat.set(9.6 / 2.4, 1);
    beam(f, US - .2, 3.5 * d, Yc + 2 * d, 2 * d, 3.5 * d, faceMat(pb, PT.QING));                                   // 平板枋
  }
  // ---------------- brackets ----------------
  const placeFace = (f, list) => list.forEach(([a, kind], i) => {
    const A = i % 2 ? U.COL.lv : U.COL.qing, Bc = i % 2 ? U.COL.qing : U.COL.lv;
    const s = DG.set(d, A, Bc, kind);
    if (f === 'S') s.position.set(Xc + a, y0, Zc); else { s.rotation.y = Math.PI / 2; s.position.set(Xc, y0, Zc + a); }
    add(s);
  });
  const spread = (a0, a1, n) => Array.from({ length: n - 1 }, (_, k) => [a0 + (a1 - a0) * (k + 1) / n, 'ping']);
  const sx = [xL.at(-3) - Xc, xL.at(-2) - Xc], ez = [zL.at(-3) - Zc, zL.at(-2) - Zc];
  placeFace('S', [[sx[0], 'zhu'], ...spread(sx[0], sx[1], 6), [sx[1], 'zhu'], ...spread(sx[1], 0, 4)]);
  placeFace('E', [[ez[0], 'zhu'], ...spread(ez[0], ez[1], 8), [ez[1], 'zhu'], ...spread(ez[1], 0, 4)]);
  // 角科: both faces' sets meet at the corner (their arms cross as 搭交), plus the diagonal 斜翘 / 斜昂 and a 宝瓶
  placeFace('S', [[0, 'ping']]); placeFace('E', [[0, 'zhu']]);
  const diag = new THREE.Group(), stretch = pts => pts.map(([z, y]) => [z > 0 ? z * Math.SQRT2 : z, y]);
  diag.add(DG.zMember(stretch([[-3, 1.2], [3.6, 1.2], [3.9, 1.8], [3.9, 3.2], [-3, 3.2]]), 1.4, U.COL.qing, d));
  diag.add(DG.zMember(stretch(DG.angProfile(-3, 6, 3.8)), 1.4, U.COL.lv, d));
  diag.add(DG.zMember(stretch(DG.angProfile(-3, 9, 6.4)), 1.4, U.COL.qing, d));
  diag.add(DG.zMember(stretch(DG.mzt(-3, 12.5, 9.0)), 1.4, U.COL.lv, d));
  const vase = U.mesh(new THREE.LatheGeometry([[0, 0], [.9, 0], [1.2, .6], [.8, 1.6], [.5, 2.0], [.9, 2.4], [0, 2.4]].map(([a, b]) => new THREE.Vector2(a * d, b * d)), 16), U.gold());
  vase.position.set(0, 11.0 * d, 9 * Math.SQRT2 * d); diag.add(vase);
  diag.rotation.y = Math.PI / 4; diag.position.set(Xc, y0, Zc); add(diag);
  // continuous members (枋, 桁): each row runs out to the corner and crosses the other face's row
  const qing = U.paint(U.COL.qing, .72), lv = U.paint(U.COL.lv, .72);
  const runs = [[1.24, 6.4, 16, 0, qing], [1, 7.8, 9.8, 3, lv], [1, 9.8, 11.8, 3, qing], [1, 10.4, 12.4, 6, qing], [1, 12.4, 14.4, 6, lv], [1, 11, 13, 9, lv]];
  for (const f of ['S', 'E']) {
    for (const [w, a, b, z, m] of runs) {
      const a0 = US - .2, a1 = (z + w / 2 + .6) * d, box = add(U.mesh(new THREE.BoxGeometry(a1 - a0, (b - a) * d, w * d), m));
      const yc = y0 + (a + b) / 2 * d;
      if (f === 'S') box.position.set(Xc + (a0 + a1) / 2, yc, Zc + z * d); else { box.rotation.y = -Math.PI / 2; box.position.set(Xc + z * d, yc, Zc + (a0 + a1) / 2); }
    }
    for (const [rr, yy, z, m] of [[1.5, 14.5, 9, qing], [2.25, 18.25, 0, lv]]) {
      const a0 = US - .2, a1 = (z + rr + 1) * d, q = new THREE.CylinderGeometry(rr * d, rr * d, a1 - a0, 20); q.rotateZ(Math.PI / 2);
      const c = add(U.mesh(q, m));
      if (f === 'S') c.position.set(Xc + (a0 + a1) / 2, y0 + yy * d, Zc + z * d); else { c.rotation.y = -Math.PI / 2; c.position.set(Xc + z * d, y0 + yy * d, Zc + (a0 + a1) / 2); }
    }
    // 垫栱板 behind the 正心 arms
    const bt = DG.boardTex(); bt.wrapS = THREE.RepeatWrapping; bt.repeat.set((0 - US) / .93, 1);
    const board = add(U.mesh(new THREE.PlaneGeometry(-US, 6.4 * d), new THREE.MeshStandardMaterial({ map: bt, roughness: .8, side: THREE.DoubleSide })));
    if (f === 'S') board.position.set(Xc + US / 2, y0 + 3.2 * d, Zc - .7 * d); else { board.rotation.y = Math.PI / 2; board.position.set(Xc - .7 * d, y0 + 3.2 * d, Zc + US / 2); }
  }
  // ---------------- 望板 undersides, tile bed, eave boards ----------------
  const sheet = (f, a0, a1, o0, o1, yfn, mat, na = 60, no = 24) => {
    const pos = [], idx = [];
    for (let i = 0; i <= na; i++) for (let k = 0; k <= no; k++) {
      let a = U.lerp(a0, a1, i / na); const o = U.lerp(o0, o1, k / no); if (a > o) a = o;   // clip at the hip plane
      const p = F(f, a, yfn(o), o); pos.push(p.x, p.y, p.z);
    }
    for (let i = 0; i < na; i++) for (let k = 0; k < no; k++) { const q = i * (no + 1) + k; idx.push(q, q + 1, q + no + 1, q + 1, q + no + 2, q + no + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return add(U.mesh(geo, mat));
  };
  const wangM = U.paint(U.COL.wang, .85); wangM.side = THREE.DoubleSide;
  const bedM = U.paint('#8A6A2A', .9); bedM.side = THREE.DoubleSide;
  for (const f of ['S', 'E']) {
    sheet(f, US, E30, IN, E23, v => B(v) + 1.5 * d, wangM);
    sheet(f, US, E30, E23 - .05, E30, v => flyB(v) + 1.5 * d, wangM, 60, 6);
    sheet(f, US, E30 + .2, IN, E30, v => T(v) - .03, bedM);
    // 连檐 / 瓦口: red board on the eave edge from the 飞椽 top to the tile bed
    const pos = [], idx = []; const n = 60;
    for (let i = 0; i <= n; i++) { let a = U.lerp(US, E30, i / n); if (a > E30) a = E30; const lo = F(f, Math.min(a, E30), flyB(E30) + 1.5 * d, E30), hi = F(f, Math.min(a, E30), T(E30) - .02, E30); pos.push(lo.x, lo.y, lo.z, hi.x, hi.y, hi.z); }
    for (let i = 0; i < n; i++) idx.push(2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const em = U.paint(PT.RED, .7); em.side = THREE.DoubleSide; add(U.mesh(geo, em));
  }
  // ---------------- rafters ----------------
  const rod = (p0, p1, geo, mats) => {   // a member from p0 to p1 with its sides kept vertical (no roll about its own axis)
    const m = add(U.mesh(geo, mats)), dir = p1.clone().sub(p0), len = dir.length(); dir.normalize();
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(side, dir).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, dir, up));   // right-handed: side × dir = up
    m.position.copy(p0).add(p1).multiplyScalar(.5); m.scale.y = len; return m; };
  const eaveEndM = PT.gilded(PT.eaveEnd()), flyEndM = PT.gilded(PT.flyEnd());
  const rd = P.v('rafterD'), rGeo = new THREE.CylinderGeometry(rd / 2, rd / 2, 1, 16), fGeo = new THREE.BoxGeometry(rd, 1, rd);
  const rM = [U.paint('#234A7A', .7), eaveEndM, eaveEndM], fM = [U.paint(U.COL.lv, .7), U.paint(U.COL.lv, .7), flyEndM, flyEndM, U.paint(U.COL.lv, .7), U.paint(U.COL.lv, .7)];
  const pitch = P.v('rafterPitch');
  // 翼角椽: beyond the 起翘 start (a0) each rafter turns toward the 角梁; its tail stops on the hip plane (a = o)
  const a0 = IN, tail = (a, oe, th) => { const c = Math.cos(th), s2 = Math.sin(th); if (th < 1e-4) return [a, Math.max(IN, a + .05)];
    const sd = (oe - a) / (c - s2); const at = a - sd * s2, ot = oe - sd * c; return ot < IN ? [a - (oe - IN) * Math.tan(th), IN] : [at + .05, ot + .05]; };
  for (const f of ['S', 'E']) for (let a = US + .1; a < E30; a += pitch) {
    const th = THREE.MathUtils.degToRad(40) * Math.pow(U.clamp((a - a0) / (E30 - a0)), 1.2);
    const [ta, to] = tail(a, E23, th); if (to < E23 - .1) rod(F(f, ta, B(to) + .75 * d, to), F(f, a, B(E23) + .75 * d, E23), rGeo, rM);
    const [fa, fo] = tail(a, E30, th), f0 = Math.max(21 * d, fo); if (f0 < E30 - .1) rod(F(f, fa + (f0 - fo) * Math.tan(th), flyB(f0) + .75 * d, f0), F(f, a, flyB(E30) + .75 * d, E30), fGeo, fM);
  }
  // ---------------- tiles (instanced) ----------------
  const tileLen = .36, R = .13, row = P.v('tileRow');
  const half = (r0, r1, len) => { const s = new THREE.Shape(); s.absarc(0, 0, r1, 0, Math.PI, false); s.absarc(0, 0, r0, Math.PI, 0, true); return new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 10 }); };
  const tongGeo = THREE.BufferGeometryUtils.mergeBufferGeometries([half(R - .02, R, tileLen - .03), half(R - .01, R + .008, .03).translate(0, 0, tileLen - .03)].map(x => x.toNonIndexed()));
  const banShape = new THREE.Shape(); banShape.absarc(0, .55, .55, -Math.PI / 2 - .33, -Math.PI / 2 + .33, false); banShape.absarc(0, .55, .53, -Math.PI / 2 + .33, -Math.PI / 2 - .33, true);
  const banGeo = new THREE.ExtrudeGeometry(banShape, { depth: .42, bevelEnabled: false, curveSegments: 12 });
  const gtGeo = new THREE.CylinderGeometry(R + .012, R + .012, .03, 28); gtGeo.rotateX(Math.PI / 2);
  const dsPts = [[-.16, 0], [.16, 0], [.15, -.04], [.09, -.09], [0, -.12], [-.09, -.09], [-.15, -.04]], dsGeo = U.extrude(dsPts, .025, 4);
  const goutouN = U.normalFromHeight(PT.goutouHeight(), 3);
  const gtM = new THREE.MeshPhysicalMaterial({ color: P.v('tileColor'), roughness: .35, clearcoat: .6, normalMap: goutouN });
  const mats = { tong: [], ban: [], gt: [], ds: [] };
  const basis = (f, a, o, lift) => {   // frame on the tile surface: x lateral, y normal, z down-slope
    const p = F(f, a, T(o) + lift, o), pa = F(f, a + .05, T(o) + lift, o), po = F(f, a, T(o + .05) + lift, o + .05);
    const ex = pa.clone().sub(p).normalize(), ez = po.clone().sub(p).normalize(), ey = new THREE.Vector3().crossVectors(ez, ex).normalize();
    ex.crossVectors(ey, ez).normalize();
    if (f === 'E') { ex.negate(); ey.crossVectors(ez, ex).normalize(); }
    return new THREE.Matrix4().makeBasis(ex, ey, ez).setPosition(p);
  };
  for (const f of ['S', 'E']) {
    for (let a = US + .05; a < E30; a += row) {
      for (const [kind, aa] of [['tong', a], ['ban', a + row / 2]]) {
        const top = Math.max(IN + .1, aa + .2), end = E30 + (kind === 'tong' ? .08 : .05);
        if (top >= end - .1) continue;
        const step = kind === 'tong' ? tileLen : .14;
        for (let o = top; o < end - step * .5; o += step) mats[kind].push(basis(f, aa, o, kind === 'tong' ? .02 : -.03));
        const tip = basis(f, aa, end - .02, kind === 'tong' ? .02 : -.03);
        if (kind === 'tong') mats.gt.push(tip); else mats.ds.push(tip);
      }
    }
  }
  const inst = (geo, mat, list) => { const im = new THREE.InstancedMesh(geo, mat, list.length); const col = new THREE.Color();
    list.forEach((m, i) => { im.setMatrixAt(i, m); const v = .86 + .2 * U.hash(i * 7 + list.length), hue = (U.hash(i * 13 + 5) - .5) * .025; im.setColorAt(i, col.setHSL(hue, 0, v).setRGB(v + hue, v, v - hue * 2)); }); im.castShadow = im.receiveShadow = true; add(im); return im; };
  inst(tongGeo, U.glaze(), mats.tong); inst(banGeo, U.glaze(), mats.ban); inst(gtGeo, gtM, mats.gt); inst(dsGeo, U.glaze(), mats.ds);
  // ---------------- hip ridge (戗脊), beasts, 角梁 + 套兽 ----------------
  const qEnd = E30 + .12, path = [];
  for (let i = 0; i <= 80; i++) { const q = U.lerp(IN, qEnd, i / 80); path.push(warp(Xc + q, T(q) - .02, Zc + q)); }
  const cum = [0]; for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + path[i].distanceTo(path[i - 1]));
  const Ltot = cum.at(-1), at = s => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1]); return { p: path[i - 1].clone().lerp(path[i], t), t: path[i].clone().sub(path[i - 1]).normalize() }; };
  const sBeast = k => Ltot - (.3 + P.v('beastGap') * k);   // arc-length position of 仙人 (k = 0) and the beasts, measured from the end
  const sQiang = sBeast(10) - .6;
  const ridgeH = s => s < sQiang ? .58 : .36;
  const sec = H => [[-.27, 0], [.27, 0], [.27, .07], [.2, .08], [.2, H - .12], [.15, H - .06], [.08, H - .01], [0, H], [-.08, H - .01], [-.15, H - .06], [-.2, H - .12], [-.2, .08], [-.27, .07]];
  { const pos = [], idx = [], n = path.length, m = sec(1).length;
    for (let i = 0; i < n; i++) { const tn = (i < n - 1 ? path[i + 1].clone().sub(path[i]) : path[i].clone().sub(path[i - 1])).normalize();
      const side = new THREE.Vector3().crossVectors(tn, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(side, tn).normalize();
      for (const [sx2, sy] of sec(ridgeH(cum[i]))) { const p = path[i].clone().addScaledVector(side, sx2).addScaledVector(up, sy); pos.push(p.x, p.y, p.z); } }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < m; k++) { const a = i * m + k, b = i * m + (k + 1) % m; idx.push(a, b, a + m, b, b + m, a + m); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    add(U.mesh(geo, U.glaze())); }
  const capList = [];
  for (let s = .2; s < Ltot - .05; s += tileLen) { const { p, t } = at(s); const side = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(side, t).normalize();
    capList.push(new THREE.Matrix4().makeBasis(side.clone().negate(), up, t).setPosition(p.clone().addScaledVector(up, ridgeH(s) - .1))); }
  inst(tongGeo, U.glaze(), capList.map(m => m.clone().multiply(new THREE.Matrix4().makeScale(1.1, 1.1, 1))));
  const placeOn = (obj, s, H) => { const { p, t } = at(s); const flat = new THREE.Vector3(t.x, 0, t.z).normalize(); obj.position.copy(p).add(new THREE.Vector3(0, ridgeH(s) - .02, 0)); obj.rotation.y = Math.atan2(flat.x, flat.z); obj.scale.setScalar(H); add(obj); };
  const H = P.v('beastH') / .66;
  placeOn(BS.immortal(), sBeast(0), H);
  P.v('beasts').forEach((name, i) => placeOn(BS.beast(name), sBeast(i + 1), H));
  placeOn(BS.dragonHead(true), sQiang, 1.0 / .7);   // 戗兽 ≈ 2 × a beast's height in roof_art-1
  // 仔角梁 under the hip end, 套兽 on its tip
  // 仔角梁 runs under the hip and stops just past the corner 飞椽 (photo: its head sits right under the corner 滴水);
  // 老角梁 below it ends at the 檐椽 line; the 套兽 is sleeved over the 仔角梁 head
  const jl0 = warp(Xc - .4, deck(-.4) - .17, Zc - .4), jl1 = warp(Xc + E30 + .06, deck(E30) - .14, Zc + E30 + .06);
  rod(jl0, jl1, new THREE.BoxGeometry(.24, 1, .26), U.paint(U.COL.lv, .7));                                         // 仔角梁
  const lj1 = warp(Xc + E23 + .1, B(E23) - .1, Zc + E23 + .1);
  rod(jl0.clone().add(new THREE.Vector3(0, -.3, 0)), lj1, new THREE.BoxGeometry(.26, 1, .3), U.paint(U.COL.qing, .7));   // 老角梁
  const dirJ = jl1.clone().sub(jl0).normalize();
  const th = BS.dragonHead(false); th.scale.setScalar(.5 / .6); th.position.copy(jl1).addScaledVector(dirJ, -.12).add(new THREE.Vector3(0, -.2, 0)); th.rotation.y = Math.PI / 4; add(th);
  // ---------------- the upper body behind (not part of this sample): plain wall + 博脊 ----------------
  const wallM = U.paint(U.COL.zhu, .8);
  for (const f of ['S', 'E']) {
    const len = IN - US, w = add(U.mesh(new THREE.BoxGeometry(len, 4, .3), wallM)), bj = add(U.mesh(new THREE.BoxGeometry(len, .45, .42), U.glaze()));
    if (f === 'S') { w.position.set(Xc + (US + IN) / 2, T(IN) + 1.6, Zc + IN - .2); bj.position.set(Xc + (US + IN) / 2, T(IN) + .1, Zc + IN); }
    else { w.rotation.y = bj.rotation.y = Math.PI / 2; w.position.set(Xc + IN - .2, T(IN) + 1.6, Zc + (US + IN) / 2); bj.position.set(Xc + IN, T(IN) + .1, Zc + (US + IN) / 2); }
  }
  CORNER.info = { Xc, Zc, Y0, eaveY: T(E30), tiles: mats.tong.length + mats.ban.length, rafters: 0 };
  return g;
};
window.CORNER = CORNER;
