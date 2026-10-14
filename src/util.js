/* Shared helpers: deterministic noise, canvas textures, height→normal maps, materials, geometry utilities. */
THREE.ColorManagement.legacyMode = false;   // hex colours are sRGB, lighting in linear space
const U = {};
U.hash = i => { let x = Math.imul((i | 0) ^ 0x9E3779B9, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
U.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
U.lerp = (a, b, t) => a + (b - a) * t;
U.smooth = t => { t = U.clamp(t); return t * t * (3 - 2 * t); };

U.canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
U.tex = (w, h, draw, o = {}) => {
  const t = new THREE.CanvasTexture(U.canvas(w, h, draw));
  t.encoding = o.linear ? THREE.LinearEncoding : THREE.sRGBEncoding;
  t.anisotropy = 8; if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.repeat); }
  return t;
};
// Height canvas (white = high) → tangent-space normal map
U.normalFromHeight = (hc, strength = 2) => {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  return U.tex(w, h, (g) => {
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x - 1, y) - H(x + 1, y)) * strength, dy = (H(x, y - 1) - H(x, y + 1)) * strength;
      const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (-dy / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { linear: true });
};
// soft value noise canvas for subtle variation
U.noiseCanvas = (w, h, scale, seed, amp = 1) => U.canvas(w, h, (g) => {
  const img = g.createImageData(w, h), d = img.data;
  const v = (x, y) => U.hash(x * 7919 + y * 104729 + seed * 13);
  const s = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), e = v(xi + 1, yi + 1), ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy); return U.lerp(U.lerp(a, b, ux), U.lerp(c, e, ux), uy); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = (s(x / scale, y / scale) * .6 + s(x / scale * 3, y / scale * 3) * .4 - .5) * amp + .5, i = (y * w + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = U.clamp(n) * 255; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});

// ---------------- materials (colours sampled from the reference photos) ----------------
U.M = {};
U.mat = (key, make) => U.M[key] || (U.M[key] = make());
U.glaze = (col = P.v('tileColor')) => U.mat('glaze' + col, () => new THREE.MeshPhysicalMaterial({ color: col, roughness: .42, metalness: 0, clearcoat: .25, clearcoatRoughness: .3, envMapIntensity: 1.0 }));
U.paint = (col, rough = .78) => U.mat('paint' + col + rough, () => new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: 0 }));
U.gold = () => U.mat('gold', () => new THREE.MeshStandardMaterial({ color: '#D9A93E', roughness: .35, metalness: .85, envMapIntensity: 1.2 }));
U.goldLine = () => U.mat('goldLine', () => new THREE.MeshStandardMaterial({ color: '#E0B04A', roughness: .3, metalness: .8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
U.COL = {
  qing: '#172A60',   // 青 (blue) on brackets and beams
  lv: '#174B3A',     // 绿 (green)
  zhu: '#8E2A22',    // 朱红 columns / boards (in shade it reads darker)
  wang: '#5E1C17',   // 望板 underside red
  marble: '#E7E2D6',
};

// ---------------- geometry helpers ----------------
U.shape = pts => { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); return s; };
// extrude a profile drawn in its (u, v) plane, thickness along w, centred
U.extrude = (pts, depth, curve = 4) => { const g = new THREE.ExtrudeGeometry(U.shape(pts), { depth, bevelEnabled: false, curveSegments: curve }); g.translate(0, 0, -depth / 2); return g; };
U.mesh = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = shadow; return m; };
// scale a polygon about its centroid (for gold edge rims)
U.grow = (pts, e) => { const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return pts.map(([x, y]) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + dx / l * e, y + dy / l * e]; }); };
// merge a group's meshes into one geometry per material (for instancing hundreds of bracket sets)
U.bake = (group) => {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  group.traverse(o => { if (!o.isMesh) return; const g = o.geometry.clone().applyMatrix4(o.matrixWorld); const k = o.material; if (!byMat.has(k)) byMat.set(k, []); byMat.get(k).push(g.index ? g.toNonIndexed() : g); });
  return [...byMat].map(([mat, gs]) => ({ mat, geo: THREE.BufferGeometryUtils.mergeBufferGeometries(gs.map(g => { const n = new THREE.BufferGeometry(); for (const a of ['position', 'normal', 'uv']) if (g.attributes[a]) n.setAttribute(a, g.attributes[a]); return n; })) }));
};
U.instance = (baked, matrices, parent) => {
  for (const { mat, geo } of baked) {
    const im = new THREE.InstancedMesh(geo, mat, matrices.length);
    matrices.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = im.receiveShadow = true; parent.add(im);
  }
};
window.U = U;
