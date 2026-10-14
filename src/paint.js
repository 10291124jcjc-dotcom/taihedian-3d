/* Painted decoration textures: 和玺彩画 for the architraves, rafter-end patterns, 平板枋, glazed-tile relief.
   Layout rules of 和玺彩画: 箍头 at both ends, 找头 with the W-shaped 圭线光 lines, 枋心 in the middle with a dragon;
   blue and green grounds alternate between the upper and lower beam; all lines 沥粉贴金 (raised gold). */
const PT = {};
PT.GOLD = '#D8A640'; PT.QING = '#1F3570'; PT.LV = '#1E5C47'; PT.RED = '#7E241C';

// A gold dragon (沥粉贴金) in a box centred at (cx, cy), w × h, facing +x (flip = -1 faces −x).
// Drawn as in 和玺彩画: a thick tapering body with scales and a dorsal fin, four legs with spread claws,
// a large head with open jaw, swept horns and a flaming mane, long whiskers; flame tufts around it.
PT.dragon = (g, cx, cy, w, h, flip = 1, o = {}) => {
  const amp = o.amp ?? .26, waves = o.waves ?? 1.6, GD = PT.GOLD, DK = '#6E4510', LT = '#F3D27A';
  g.save(); g.translate(cx, cy); g.scale(flip, 1); g.lineJoin = 'round'; g.lineCap = 'round';
  const N = 80, sp = [];
  for (let i = 0; i <= N; i++) { const t = i / N; sp.push([(-.46 + .76 * t) * w, Math.sin(t * Math.PI * waves * 2 + .5) * h * amp * (1 - .35 * t)]); }
  const tan = i => { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(N, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  const rad = t => h * (.02 + .1 * Math.sin(Math.min(1, t * 1.25) * Math.PI * .5) * (t > .82 ? 1 - (t - .82) * 1.4 : 1));
  const side = s => sp.map(([x, y], i) => { const [tx, ty] = tan(i), r = rad(i / N) * s; return [x - ty * r, y + tx * r]; });
  const L = side(1), R = side(-1);
  // flame tufts (火焰) scattered round the body
  g.fillStyle = GD; g.strokeStyle = DK; g.lineWidth = Math.max(1, h * .012);
  for (let k = 0; k < (o.flames ?? 7); k++) {
    const t = .08 + k * .12, [x, y] = sp[Math.min(N, Math.round(t * N))], up = k % 2 ? 1 : -1, fx = x + w * .03, fy = y + up * h * .3;
    g.beginPath(); g.moveTo(fx - h * .06, fy); g.quadraticCurveTo(fx - h * .02, fy - up * h * .1, fx + h * .05, fy - up * h * .16); g.quadraticCurveTo(fx + h * .02, fy - up * h * .06, fx + h * .07, fy); g.closePath(); g.fill(); g.stroke();
  }
  // legs: hip/shoulder → elbow → paw with three claws
  const leg = (t, s, fwd) => {
    const i = Math.round(t * N), [x, y] = sp[i], [tx, ty] = tan(i), r = rad(t);
    const ox = x - ty * r * s * .6, oy = y + tx * r * s * .6, ex = ox + (tx * fwd * .5 - ty * s) * h * .2, ey = oy + (ty * fwd * .5 + tx * s) * h * .2;
    const px = ex + tx * fwd * h * .12, py = ey + ty * fwd * h * .12 + s * h * .03;
    g.strokeStyle = DK; g.lineWidth = h * .075; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.lineTo(px, py); g.stroke();
    g.strokeStyle = GD; g.lineWidth = h * .055; g.stroke();
    g.strokeStyle = DK; g.lineWidth = h * .025;
    for (const a of [-.9, 0, .9]) { const qx = px + (tx * fwd * Math.cos(a) - ty * Math.sin(a) * s) * h * .07, qy = py + (ty * fwd * Math.cos(a) + tx * Math.sin(a) * s) * h * .07; g.beginPath(); g.moveTo(px, py); g.lineTo(qx, qy); g.stroke(); }
    g.fillStyle = GD; g.beginPath(); g.arc(ex, ey, h * .03, 0, Math.PI * 2); g.fill();
  };
  leg(.28, 1, -1); leg(.32, -1, -1); leg(.68, 1, 1); leg(.72, -1, 1);
  // dorsal fin
  g.fillStyle = GD; g.strokeStyle = DK; g.lineWidth = Math.max(1, h * .01);
  for (let i = 4; i < N * .88; i += 3) { const [x, y] = L[i], [tx, ty] = tan(i), r = h * .05 * (1 - i / N * .6); g.beginPath(); g.moveTo(x, y); g.lineTo(x - ty * r + tx * r * .5, y + tx * r + ty * r * .5); g.lineTo(x + tx * r * .9, y + ty * r * .9); g.closePath(); g.fill(); g.stroke(); }
  // body
  g.beginPath(); L.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); R.slice().reverse().forEach(([x, y]) => g.lineTo(x, y)); g.closePath();
  g.fillStyle = GD; g.fill(); g.strokeStyle = DK; g.lineWidth = h * .02; g.stroke();
  // belly band and scales
  g.strokeStyle = LT; g.lineWidth = h * .028; g.beginPath(); R.forEach(([x, y], i) => { const [mx, my] = sp[i]; const px = (x * 2 + mx) / 3, py = (y * 2 + my) / 3; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
  g.strokeStyle = DK; g.lineWidth = Math.max(1, h * .008);
  for (let i = 3; i < N * .86; i += 2) { const [x, y] = sp[i], [tx, ty] = tan(i), r = rad(i / N);
    for (const off of [-.45, .1]) { const qx = x - ty * r * off, qy = y + tx * r * off; g.beginPath(); g.arc(qx, qy, r * .35, Math.atan2(ty, tx) + Math.PI * .5, Math.atan2(ty, tx) + Math.PI * 1.5); g.stroke(); } }
  // head
  const [hx, hy] = sp[N], [tx, ty] = tan(N), ang = Math.atan2(ty, tx);
  g.save(); g.translate(hx, hy); g.rotate(ang * .5 - .25);
  const H = h * .32;
  g.fillStyle = GD; g.strokeStyle = DK; g.lineWidth = h * .015;
  for (let k = 0; k < 6; k++) { const a = Math.PI * (.75 + k * .14); g.beginPath(); g.moveTo(-H * .2, 0); g.quadraticCurveTo(Math.cos(a) * H * .9, Math.sin(a) * H * .9 - H * .3, Math.cos(a + .25) * H * 1.3, Math.sin(a + .25) * H * 1.2); g.quadraticCurveTo(Math.cos(a) * H * .6, Math.sin(a) * H * .6, -H * .1, H * .1); g.fill(); g.stroke(); }
  g.beginPath(); g.moveTo(-H * .3, -H * .35); g.quadraticCurveTo(H * .3, -H * .55, H * .9, -H * .3); g.quadraticCurveTo(H * 1.15, -H * .2, H * 1.05, -H * .02); g.lineTo(H * .35, H * .02);
  g.lineTo(H * .95, H * .3); g.quadraticCurveTo(H * .7, H * .48, H * .2, H * .4); g.quadraticCurveTo(-H * .3, H * .35, -H * .35, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#B23A1E'; g.beginPath(); g.moveTo(H * .35, H * .02); g.lineTo(H * .9, H * .04); g.lineTo(H * .85, H * .25); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(H * .3, -H * .28, H * .1, 0, Math.PI * 2); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(H * .33, -H * .28, H * .05, 0, Math.PI * 2); g.fill();
  for (const [lw, col] of [[h * .05, DK], [h * .032, GD]]) { g.strokeStyle = col; g.lineWidth = lw; for (const s2 of [0, 1]) { g.beginPath(); g.moveTo(-H * .1 + s2 * H * .2, -H * .45); g.quadraticCurveTo(-H * .5, -H * 1.0, -H * 1.0 - s2 * H * .2, -H * .9); g.stroke(); } }
  g.strokeStyle = GD; g.lineWidth = h * .014; g.beginPath(); g.moveTo(H * 1.0, -H * .1); g.bezierCurveTo(H * 1.4, -H * .3, H * 1.5, H * .3, H * 1.9, -H * .1); g.moveTo(H * .9, H * .3); g.bezierCurveTo(H * 1.3, H * .6, H * 1.6, H * .2, H * 1.8, H * .5); g.stroke();
  g.restore();
  g.restore();
};
// flaming pearl (火焰宝珠)
PT.pearl = (g, x, y, r) => {
  g.fillStyle = PT.GOLD; g.strokeStyle = '#6E4510'; g.lineWidth = Math.max(1, r * .08);
  for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * .32; g.beginPath(); g.moveTo(x + Math.cos(a - .2) * r, y + Math.sin(a - .2) * r); g.quadraticCurveTo(x + Math.cos(a) * r * 2.2, y + Math.sin(a) * r * 2.2, x + Math.cos(a + .25) * r * 2.4, y + Math.sin(a + .25) * r * 2.6); g.lineTo(x + Math.cos(a + .2) * r, y + Math.sin(a + .2) * r); g.fill(); g.stroke(); }
  g.fillStyle = '#F6E3A0'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = '#6E4510'; g.beginPath(); g.arc(x, y, r * .6, -.5, 2.5); g.stroke();
};
// metal/roughness for a painted canvas: gold pixels become metallic and glossy, pigment stays matte
PT.gilded = (tex, roughPaint = .78) => {
  const src = tex.image, w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const mr = U.tex(w, h, (g) => { const img = g.createImageData(w, h), o = img.data;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2], gold = r > 120 && gg > 80 && b < gg * .8 && r > b * 1.6 ? 1 : 0;
      o[i] = 0; o[i + 1] = gold ? 85 : roughPaint * 255; o[i + 2] = gold ? 235 : 0; o[i + 3] = 255; }
    g.putImageData(img, 0, 0); }, { linear: true });
  mr.wrapS = tex.wrapS; mr.wrapT = tex.wrapT; mr.repeat.copy(tex.repeat);
  return new THREE.MeshStandardMaterial({ map: tex, metalnessMap: mr, roughnessMap: mr, metalness: 1, roughness: 1, envMapIntensity: .9 });
};
// one architrave face for a bay of width Wm and height Hm (metres); ground = 'qing' | 'lv' (colour of the 枋心)
// 和玺 layout, left to right: 箍头 | 盒子 | 找头 (with a dragon) | 圭线光 band | 枋心 (two dragons and a pearl) | mirror
PT.hexi = (Wm, Hm, ground) => {
  const pxm = 170, W = Math.min(4096, Math.round(Wm * pxm)), Hh = Math.max(40, Math.round(Hm * pxm));
  const A = ground === 'qing' ? PT.QING : PT.LV, B = ground === 'qing' ? PT.LV : PT.QING;
  return U.tex(W, Hh, (g, w, h) => {
    const gold = lw => { g.strokeStyle = PT.GOLD; g.lineWidth = lw; g.lineJoin = 'miter'; };
    g.fillStyle = B; g.fillRect(0, 0, w, h);
    const gt = h * .32, box = w > h * 10 ? h * .95 : 0, k = h * .42;   // 箍头 width, 盒子 width (long beams only), chevron depth
    const fx0 = w * .32, fx1 = w * .68;                                 // 枋心 tips
    for (const s of [1, -1]) {
      const X = x => s > 0 ? x : w - x;
      g.fillStyle = A; g.fillRect(Math.min(X(0), X(gt)), 0, gt, h);                         // 箍头
      gold(4); g.beginPath(); g.moveTo(X(gt * .25), 0); g.lineTo(X(gt * .25), h); g.moveTo(X(gt * .75), 0); g.lineTo(X(gt * .75), h); g.stroke();
      if (box) { g.fillStyle = B; g.fillRect(Math.min(X(gt), X(gt + box)), 0, box, h); gold(3); g.strokeRect(Math.min(X(gt), X(gt + box)) + 6, 6, box - 12, h - 12);
        PT.dragon(g, X(gt + box / 2), h / 2, box * .95, h * .9, s, { waves: .9, amp: .3, flames: 4 }); }
      // 圭线光: a band bounded by two parallel chevrons pointing toward the 枋心, then the 枋心头 chevron
      const c0 = fx0 - k * 1.6, c1 = fx0 - k * .8;
      g.fillStyle = A; g.beginPath(); g.moveTo(X(c0 - k), 0); g.lineTo(X(c0), h / 2); g.lineTo(X(c0 - k), h); g.lineTo(X(c1 - k), h); g.lineTo(X(c1), h / 2); g.lineTo(X(c1 - k), 0); g.closePath(); g.fill();
      gold(Math.max(3, h * .045));
      for (const c of [c0, c1, fx0]) { g.beginPath(); g.moveTo(X(c - k), 0); g.lineTo(X(c), h / 2); g.lineTo(X(c - k), h); g.stroke(); }
      const zl = gt + box + 6, zr = c0 - k - 6;                                             // 找头 dragon
      if (zr - zl > h * 1.4) PT.dragon(g, X((zl + zr) / 2), h / 2, (zr - zl) * .95, h * .88, s, { waves: 1.1 });
    }
    // 枋心
    g.fillStyle = A; g.beginPath(); g.moveTo(fx0, h / 2); g.lineTo(fx0 - k, 0); g.lineTo(fx1 + k, 0); g.lineTo(fx1, h / 2); g.lineTo(fx1 + k, h); g.lineTo(fx0 - k, h); g.closePath(); g.fill();
    gold(Math.max(3, h * .045)); g.beginPath(); g.moveTo(fx0 + h * .1, h / 2); g.lineTo(fx0 - k + h * .14, h * .08); g.lineTo(fx1 + k - h * .14, h * .08); g.lineTo(fx1 - h * .1, h / 2); g.lineTo(fx1 + k - h * .14, h * .92); g.lineTo(fx0 - k + h * .14, h * .92); g.closePath(); g.stroke();
    const fw = fx1 - fx0 + k * .6;   // 二龙戏珠
    PT.dragon(g, fx0 + fw * .24, h * .52, fw * .46, h * .86, 1); PT.dragon(g, fx1 - fw * .24, h * .48, fw * .46, h * .86, -1);
    PT.pearl(g, w / 2, h * .55, h * .1);
    gold(5); g.strokeRect(2, 2, w - 4, h - 4);
  });
};
// 由额垫板: red with small gold running dragons
PT.dianban = (Wm, Hm) => U.tex(Math.min(4096, Math.round(Wm * 120)), Math.max(24, Math.round(Hm * 120)), (g, w, h) => {
  g.fillStyle = PT.RED; g.fillRect(0, 0, w, h);
  for (let x = h; x < w - h; x += h * 3.2) PT.dragon(g, x + h, h / 2, h * 2.4, h * .7, (x / (h * 3.2)) % 2 ? -1 : 1);
});
// 平板枋: blue ground with gold running dragons (行龙), two per repeat facing each other
PT.pingban = () => U.tex(1024, 96, (g, w, h) => {
  g.fillStyle = PT.QING; g.fillRect(0, 0, w, h);
  PT.dragon(g, w * .25, h * .5, w * .4, h * .8, 1, { waves: 1.2, amp: .2, flames: 3 });
  PT.dragon(g, w * .75, h * .5, w * .4, h * .8, -1, { waves: 1.2, amp: .2, flames: 3 });
  g.strokeStyle = PT.GOLD; g.lineWidth = 5; g.strokeRect(0, 4, w, h - 8);
}, { repeat: [1, 1] });
// rafter ends: 飞椽头 green with gold 卍, 檐椽头 blue with a gold 寿 roundel
PT.flyEnd = () => U.tex(128, 128, (g, w, h) => {
  g.fillStyle = PT.LV; g.fillRect(0, 0, w, h); g.strokeStyle = PT.GOLD; g.lineWidth = 12; g.lineCap = 'square';
  const c = w / 2, r = w * .3; g.beginPath();
  g.moveTo(c - r, c - r); g.lineTo(c, c - r); g.lineTo(c, c + r); g.lineTo(c + r, c + r);
  g.moveTo(c + r, c - r); g.lineTo(c + r, c); g.lineTo(c - r, c); g.lineTo(c - r, c + r); g.stroke();
  g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
});
PT.eaveEnd = () => U.tex(128, 128, (g, w, h) => {
  g.fillStyle = '#16244F'; g.fillRect(0, 0, w, h);
  g.strokeStyle = PT.GOLD; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, w * .4, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 7; const c = w / 2;   // stylised round 寿 character: symmetric horizontal strokes + a vertical
  [-.22, 0, .22].forEach(dy => { g.beginPath(); g.moveTo(c - w * .2, c + dy * w); g.lineTo(c + w * .2, c + dy * w); g.stroke(); });
  g.beginPath(); g.moveTo(c, c - w * .3); g.lineTo(c, c + w * .3); g.stroke();
  [-1, 1].forEach(s => { g.beginPath(); g.moveTo(c + s * w * .12, c - w * .11); g.lineTo(c + s * w * .12, c + w * .11); g.stroke(); });
});
// 勾头 face: raised dragon roundel (height map → normal map) on glaze
PT.goutouHeight = () => U.canvas(256, 256, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h / 2, w * .47, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#555'; g.beginPath(); g.arc(w / 2, h / 2, w * .38, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#eee'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath();
  for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * Math.PI * 1.7 + .6, r = w * (.27 - t * .12); const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke(); g.fillStyle = '#eee'; g.beginPath(); g.arc(w * .66, h * .4, 18, 0, Math.PI * 2); g.fill();
});
window.PT = PT;
