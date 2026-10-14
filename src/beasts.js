/* 脊饰 sculptures built from primitives: 仙人骑凤, the ten 走兽, 戗兽, 套兽.
   Local frame: the figure faces +z (out along the ridge toward the corner), y up, base at y = 0, height normalised to 1. */
const BS = {};
BS.m = () => U.glaze();
BS.sph = (g, r, p, rot = [0, 0, 0]) => { const m = U.mesh(new THREE.SphereGeometry(1, 16, 12), BS.m()); m.scale.set(...r); m.position.set(...p); m.rotation.set(...rot); g.add(m); return m; };
BS.cyl = (g, r0, r1, h, p, rot = [0, 0, 0]) => { const m = U.mesh(new THREE.CylinderGeometry(r1, r0, h, 12), BS.m()); m.position.set(...p); m.rotation.set(...rot); g.add(m); return m; };
BS.cone = (g, r, h, p, rot) => BS.cyl(g, r, 0.002, h, p, rot);
// a flame / plume blade: S-shaped outline extruded thin, standing in the yz plane
BS.flame = (g, len, wid, p, rot = [0, 0, 0], t = .025) => {
  const pts = []; for (let i = 0; i <= 10; i++) { const s = i / 10; pts.push([Math.sin(s * 3) * wid * .3 + wid * (1 - s) * .5, s * len]); }
  for (let i = 10; i >= 0; i--) { const s = i / 10; pts.push([Math.sin(s * 3) * wid * .3 - wid * (1 - s) * .5, s * len]); }
  const geo = U.extrude(pts, t, 2); geo.rotateY(Math.PI / 2);
  const m = U.mesh(geo, BS.m()); m.position.set(...p); m.rotation.set(...rot); g.add(m); return m;
};
BS.wing = (g, s, p) => {   // a swept wing on the side x = s
  const pts = [[0, 0], [-.05, .12], [-.2, .2], [-.3, .16], [-.22, .1], [-.28, .06], [-.15, .02]];
  const geo = U.extrude(pts, .02, 2); geo.rotateY(Math.PI / 2);
  const m = U.mesh(geo, BS.m()); m.position.set(...p); m.rotation.set(-.3, 0, s * .35); g.add(m);
};
// ---- sculpted bodies: metaballs fused into one smooth glazed form (MarchingCubes), balls given as [x, y, z, r] ----
// steep falloff (sub 110): neighbouring balls fuse only where they nearly touch
BS.blob = (balls, res = 88) => {
  const box = 1.2, off = [.6, .05, .6];   // model space x∈[-.6,.6], y∈[-.05,1.15], z∈[-.6,.6] → field [0,1]
  const mc = new THREE.MarchingCubes(res, BS.m(), false, false, 120000); mc.isolation = 80;
  mc.reset();
  for (const [x, y, z, r] of balls) { const sub = 110, rn = r / box; mc.addBall((x + off[0]) / box, (y + off[1]) / box, (z + off[2]) / box, rn * rn * (80 + sub), sub); }
  mc.update();
  const n = mc.count, pos = mc.positionArray.slice(0, n * 3), nor = mc.normalArray.slice(0, n * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  // MarchingCubes emits local coords in [-1, 1]; map back to model space
  geo.scale(box / 2, box / 2, box / 2); geo.translate(box / 2 - off[0], box / 2 - off[1], box / 2 - off[2]);
  return U.mesh(geo, BS.m());
};
// balls spaced at most 0.45 r apart so a limb reads as one smooth form, not beads
const chain = (a, b, n0, r0, r1) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(n0, Math.ceil(L / (.45 * Math.min(r0, r1))) + 1); return Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, r0 + (r1 - r0) * t]; }); };
// seated beast as in roof_art-1: upright chest, straight forelegs, head raised. o.head picks the head type:
// 'dragon' (long snout, antlers) · 'lion' (round head buried in curls) · 'horse' (long narrow face, crest mane) · 'beast'
BS.seated = (o = {}) => {
  const g = new THREE.Group(), mane = o.mane ?? .6, head = o.head || 'beast';
  const balls = [
    [.07, .11, -.1, .095], [-.07, .11, -.1, .095], [0, .14, -.1, .09],                        // haunches
    ...chain([0, .2, -.07, .085], [0, .48, .05, .075], 6, .085, .075), [0, .44, .1, .07],     // body rising steeply, chest
    ...[-1, 1].flatMap(s => [...chain([s * .045, .44, .1, .036], [s * .045, .06, .13, .03], 8, .036, .03), [s * .045, .03, .16, .035], [s * .085, .035, .0, .04]]),
    ...chain([0, .5, .07, .062], [0, .68, .12, .064], 5, .062, .064),                          // neck
    ...chain([0, .16, -.17, .04], [0, .42, -.2, .028], 6, .04, .028),                         // tail up the back
  ];
  if (head === 'horse') balls.push(...chain([0, .74, .1, .06], [0, .66, .26, .042], 6, .06, .042), [.03, .82, .07, .02], [-.03, .82, .07, .02]);
  else if (head === 'lion') { balls.push([0, .76, .12, .075], [0, .73, .2, .045]);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = .085; balls.push([Math.cos(a) * r, .76 + Math.sin(a) * r * .9, .09 - Math.abs(Math.sin(a)) * .02, .03]); }   // curls round the face
    for (let i = 0; i < 6; i++) balls.push([(i % 2 ? .03 : -.03), .66 - i * .03, .05 - i * .012, .032]); }   // curls down the neck
  else if (head === 'dragon') balls.push([0, .78, .12, .066], ...chain([0, .77, .16, .05], [0, .74, .27, .034], 5, .05, .034), [0, .7, .2, .034], [.045, .82, .1, .02], [-.045, .82, .1, .02]);
  else balls.push([0, .78, .12, .068], [0, .74, .19, .045], [0, .72, .23, .036], [0, .69, .18, .034], [.045, .85, .08, .022], [-.045, .85, .08, .022]);
  if (mane && head !== 'lion') for (let i = 0; i < 7; i++) { const a = -Math.PI * .8 + i * Math.PI * .27; balls.push([Math.sin(a) * .07, .64 + Math.cos(a) * .03, .07 - Math.cos(a) * .05, .03 + mane * .014]); }
  if (o.fishTail) balls.push(...chain([0, .2, -.2, .06], [0, .55, -.3, .03], 5, .06, .03));
  g.add(BS.blob(balls));
  if (head === 'dragon') for (const s of [-1, 1]) { const h1 = BS.cyl(g, .012, .006, .15, [s * .03, .88, .05], [-1.1, 0, s * .25]); BS.cyl(g, .008, .004, .06, [s * .045, .9, .0], [-.2, 0, s * .6]); }   // antlers
  if (head === 'horse') for (let i = 0; i < 5; i++) BS.flame(g, .1, .05, [0, .78 - i * .055, .04 - i * .025], [-1.2 + i * .1, 0, 0], .02);   // crest mane along the neck
  if (o.horn) BS.cone(g, .016, .12, [0, .88, .15], [-.35, 0, 0]);
  if (o.beard) BS.flame(g, .08, .04, [0, .66, .2], [2.6, 0, 0], .02);
  if (o.bullHorns) for (const s of [-1, 1]) { BS.cyl(g, .016, .01, .09, [s * .065, .84, .1], [0, 0, s * -1.2]); BS.cyl(g, .01, .004, .07, [s * .11, .9, .1], [0, 0, s * -.2]); }
  if (o.wings) for (const s of [-1, 1]) BS.wing(g, s, [s * .07, .42, -.02]);
  if (o.fishTail) { BS.flame(g, .16, .14, [0, .5, -.3], [.4, 0, 0], .03); for (let i = 0; i < 4; i++) BS.flame(g, .06, .04, [0, .5 - i * .08, -.1 - i * .02], [-1.4, 0, 0], .015); }   // tail fin + dorsal fins
  else BS.flame(g, .18, .07, [0, .4, -.2], [-.5, 0, 0], .025);
  if (o.flamesLegs) for (const s of [-1, 1]) for (const z of [.1, -.05]) BS.flame(g, .09, .045, [s * .08, .16, z], [.5, 0, 0], .02);
  if (head !== 'lion' && head !== 'horse') for (let i = 0; i < 3; i++) BS.flame(g, .08 + mane * .04, .05, [(i - 1) * .04, .7, .02], [-1.0, 0, (i - 1) * .35]);
  return g;
};
// 凤: standing bird, wings half raised behind, crest, long tail plumes sweeping up
BS.phoenix = () => {
  const g = new THREE.Group();
  g.add(BS.blob([...[-1, 1].flatMap(s => chain([s * .04, .03, .04, .025], [s * .04, .2, .0, .03], 5, .025, .03)), ...chain([0, .26, -.06, .09], [0, .4, .06, .075], 5, .09, .075),
    ...chain([0, .46, .08, .05], [0, .64, .1, .04], 5, .05, .04), [0, .68, .13, .045], [0, .66, .19, .022], [0, .64, .21, .015]]));
  BS.flame(g, .1, .06, [0, .7, .1], [-.5, 0, 0], .02);
  for (const s of [-1, 1]) BS.wing(g, s, [s * .07, .44, -.02]);
  for (let i = 0; i < 3; i++) BS.flame(g, .34, .08, [(i - 1) * .035, .26, -.14], [-1.15 + i * .15, 0, (i - 1) * .25], .025);
  return g;
};
BS.bird = () => {   // the hen under the immortal (仙人骑凤): crouching, big plumed tail
  const g = new THREE.Group();
  g.add(BS.blob([...chain([0, .16, -.12, .1], [0, .22, .08, .11], 4, .1, .11), ...chain([0, .3, .1, .06], [0, .46, .15, .05], 4, .06, .045), [0, .44, .21, .03], [0, .42, .24, .02]]));
  BS.flame(g, .08, .05, [0, .5, .14], [-.4, 0, 0]);
  for (const s of [-1, 1]) BS.wing(g, s, [s * .1, .22, .02]);
  for (let i = 0; i < 4; i++) BS.flame(g, .42, .09, [(i - 1.5) * .04, .2, -.16], [-1.05 + i * .15, 0, (i - 1.5) * .2], .03);
  return g;
};
BS.immortal = () => {   // 仙人骑凤: the robed immortal sits on the hen; the whole piece is larger than the beasts
  const g = BS.bird();
  g.add(BS.blob([...chain([0, .28, -.02, .085], [0, .5, 0, .06], 5, .085, .06), [0, .6, .01, .052], [0, .57, .06, .025], ...[-1, 1].flatMap(s => chain([s * .07, .48, .02, .028], [s * .06, .38, .1, .025], 4, .028, .025))]));
  BS.cyl(g, .06, .05, .03, [0, .66, .01]); BS.cyl(g, .028, .022, .06, [0, .7, .01]);   // hat
  g.scale.setScalar(1.3);
  return g;
};
BS.xingshi = () => {   // 行什: standing winged figure with a 雷公嘴, holding a 金刚杵 (photo: leftmost, nearest the 戗兽)
  const g = new THREE.Group();
  g.add(BS.blob([...[-1, 1].flatMap(s => chain([s * .05, .03, 0, .04], [s * .05, .26, 0, .045], 5, .04, .045)), ...chain([0, .3, 0, .08], [0, .48, .01, .075], 4, .085, .07), [0, .6, .02, .065], [0, .58, .09, .035], [0, .56, .12, .025], ...[-1, 1].map(s => [s * .08, .44, .07, .03])]));
  for (const s of [-1, 1]) BS.wing(g, s, [s * .06, .45, -.06]);
  BS.cyl(g, .015, .015, .34, [.06, .3, .1], [0, 0, .12]); BS.sph(g, [.03, .03, .03], [.08, .47, .1]); BS.sph(g, [.03, .03, .03], [.04, .14, .1]);
  return g;
};
BS.beast = (name) => ({
  '龙': () => BS.seated({ head: 'dragon', mane: .8 }),
  '凤': () => BS.phoenix(),
  '狮子': () => BS.seated({ head: 'lion' }),
  '天马': () => BS.seated({ head: 'horse', wings: 1 }),
  '海马': () => BS.seated({ head: 'horse', flamesLegs: 1 }),
  '狻猊': () => BS.seated({ head: 'beast', mane: 1.2, flamesLegs: 1 }),
  '押鱼': () => BS.seated({ head: 'dragon', fishTail: 1, mane: .3 }),
  '獬豸': () => BS.seated({ head: 'beast', horn: 1, beard: 1, mane: .6 }),
  '斗牛': () => BS.seated({ head: 'beast', bullHorns: 1, mane: .3 }),
  '行什': () => BS.xingshi(),
}[name])();
// a large sweeping flame blade (the 戗兽's mane in the photo: one big tongue curling up and back)
BS.bigFlame = (g, len, wid, p, rot, t = .05) => {
  const pts = [];
  for (let i = 0; i <= 16; i++) { const s = i / 16; pts.push([-wid * .5 * (1 - s) + Math.sin(s * 2.6) * wid * .45, s * len]); }
  for (let i = 16; i >= 0; i--) { const s = i / 16; pts.push([wid * .5 * (1 - s * .9) + Math.sin(s * 2.6) * wid * .45 + Math.sin(s * 18) * wid * .05 * (1 - s), s * len]); }
  const geo = U.extrude(pts, t, 2); geo.rotateY(Math.PI / 2);
  const m = U.mesh(geo, BS.m()); m.position.set(...p); m.rotation.set(...rot); g.add(m); return m;
};
// dragon head (戗兽 on the ridge, 套兽 on the corner beam): heavy skull, long upper jaw, open lower jaw,
// bulging eyes, an S-curled horn on top and (戗兽 only) a big flame mane sweeping up behind
BS.dragonHead = (big = true) => {
  const g = new THREE.Group();
  g.add(BS.blob([...chain([0, .3, -.12, .19], [0, .36, .08, .16], 4, .19, .16), ...chain([0, .42, .12, .12], [0, .4, .34, .08], 4, .12, .075), [0, .45, .38, .055], [0, .44, .4, .045],
    ...chain([0, .24, .1, .09], [0, .19, .3, .05], 4, .09, .05), ...[-1, 1].flatMap(s => [[s * .1, .5, .14, .055], [s * .14, .3, .0, .08], [s * .08, .3, .3, .03]])]));
  for (const s of [-1, 1]) BS.flame(g, .18, .1, [s * .17, .32, -.05], [-.6, 0, s * .9]);
  if (big) {
    const hc = new THREE.CatmullRomCurve3([[0, .55, .05], [0, .7, .0], [0, .82, .08], [0, .9, .02], [0, .92, -.08]].map(p => new THREE.Vector3(...p)));   // S-curled horn
    const hg = new THREE.TubeGeometry(hc, 24, .028, 10); g.add(U.mesh(hg, BS.m()));
    BS.bigFlame(g, .75, .32, [0, .3, -.18], [-.55, 0, 0], .07);                                  // flame mane fanning up and back
    for (const s of [-1, 1]) { BS.bigFlame(g, .6, .26, [s * .07, .3, -.15], [-.7, 0, s * .28], .055); BS.bigFlame(g, .45, .2, [s * .12, .28, -.1], [-.95, 0, s * .55], .045); }
    for (const s of [-1, 1]) { BS.sph(g, [.045, .03, .04], [s * .1, .56, .17]); BS.flame(g, .14, .08, [s * .12, .2, .14], [2.4, 0, s * .4], .025); }   // brows, beard tufts
  } else for (const s of [-1, 1]) BS.cyl(g, .03, .01, .3, [s * .08, .6, -.06], [-1.15, 0, s * .3]);
  return g;
};
window.BS = BS;
