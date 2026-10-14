/* Renderer, sky, sun, camera presets and the render API used by tools/shot.py.
   window.STAGE.init(w, h) → { scene, root }; window.STAGE.view(name) renders a preset and returns a PNG data URL. */
const STAGE = { views: {} };
STAGE.init = (w = 1920, h = 1280) => {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(w, h);
  r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .72;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, w / h, .05, 2000);
  // physically based sky (clear winter morning, as in the reference photos) → environment light
  const sky = new THREE.Sky(); sky.scale.setScalar(4000);
  const u = sky.material.uniforms; u.turbidity.value = 1.2; u.rayleigh.value = 3.2; u.mieCoefficient.value = .002; u.mieDirectionalG.value = .8;
  // sun as in photo gje06 (2012-10-28 14:49, Beijing): azimuth ≈ 220° (south-west), elevation ≈ 28°. World: +z south, +x east.
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 28), THREE.MathUtils.degToRad(-40));
  STAGE.sunDir = sunDir.clone();
  u.sunPosition.value.copy(sunDir);
  const pm = new THREE.PMREMGenerator(r), envScene = new THREE.Scene(); envScene.add(sky.clone());
  scene.environment = pm.fromScene(envScene, 0, .1, 3000).texture;
  // backdrop: the deep winter blue of the reference photos (sampled), the Sky model still lights the scene
  // backdrop: a sky dome graded by elevation (winter blue at the zenith, haze at the horizon = fog colour) so the ground fades into it
  { const dg = new THREE.SphereGeometry(1000, 48, 24), col = [], c0 = new THREE.Color('#2F6FD0'), c1 = new THREE.Color('#6FA2EE'), c2 = new THREE.Color('#AFC4DC'), p = dg.attributes.position, c = new THREE.Color();
    for (let k = 0; k < p.count; k++) { const e = Math.max(0, p.getY(k) / 1000); c.copy(e > .25 ? c1.clone().lerp(c0, Math.min(1, (e - .25) / .6)) : c2.clone().lerp(c1, e / .25)); col.push(c.r, c.g, c.b); }
    dg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const dome = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, toneMapped: true })); scene.add(dome); STAGE.dome = dome; }
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6); sun.position.copy(sunDir).multiplyScalar(80);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -.0002; sun.shadow.normalBias = .02;
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 400 });
  scene.add(sun, sun.target);
  STAGE.hemi = new THREE.HemisphereLight(0x9DB8E8, 0xC9C0AE, .42); scene.add(STAGE.hemi);   // sky above, sunlit marble/paving below
  scene.fog = new THREE.Fog(0xAFC4DC, 220, 1050);   // distance haze toward the horizon
  const root = new THREE.Group(); scene.add(root);
  Object.assign(STAGE, { r, scene, cam, sun, root, w, h });
  return STAGE;
};
// (painted+gilded boards get .3 so their pigment stays as dark as the lacquer)
// sky fill per material family: lacquer and stone take little environment light, glaze reflects the sky
STAGE.tuneEnv = () => STAGE.scene.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) if ('envMapIntensity' in m) m.envMapIntensity = m.metalnessMap ? .3 : m.clearcoat ? .22 : m.metalness > .5 ? .9 : .12; });
STAGE.setSun = (azDeg, elDeg, col, intensity) => {   // azimuth from south, + toward east
  STAGE.sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elDeg), THREE.MathUtils.degToRad(azDeg));
  STAGE.sun.position.copy(STAGE.sun.target.position).addScaledVector(STAGE.sunDir, 120);
  if (col) STAGE.sun.color.copy(col); if (intensity != null) STAGE.sun.intensity = intensity;
};
STAGE.aim = (target) => { const dir = STAGE.sunDir.clone(); STAGE.sun.target.position.copy(target); STAGE.sun.position.copy(target).addScaledVector(dir, 120); };
STAGE.look = (pos, target, fov = 35) => { const c = STAGE.cam; c.fov = fov; c.position.set(...pos); c.lookAt(...target); c.updateProjectionMatrix(); };
STAGE.view = (name) => { const v = STAGE.views[name]; if (v) STAGE.look(v.pos, v.target, v.fov); STAGE.r.render(STAGE.scene, STAGE.cam); return STAGE.r.domElement.toDataURL('image/png'); };
// interactive mode: orbit controls when opened in a normal browser
STAGE.interactive = (target) => {
  const oc = new THREE.OrbitControls(STAGE.cam, STAGE.r.domElement); oc.target.set(...target); oc.update();
  const loop = () => { STAGE.r.render(STAGE.scene, STAGE.cam); requestAnimationFrame(loop); }; loop();
};
window.STAGE = STAGE;
/* ---------------- post: SSAO composited by hand (beauty in a 4× MSAA half-float target, AO multiplied, ACES + sRGB at the end) ---------------- */
STAGE.initPost = (o = {}) => {
  const { r, scene, cam, w, h } = STAGE;
  cam.near = .3; cam.far = 1200; cam.updateProjectionMatrix();
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const ssao = new THREE.SSAOPass(scene, cam, w, h);
  ssao.kernelRadius = o.radius ?? .45; ssao.minDistance = o.minD ?? .3 / 1200 * .02; ssao.maxDistance = o.maxD ?? 2.0 / 1200;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tBeauty: { value: rt.texture }, tAO: { value: ssao.blurRenderTarget.texture }, strength: { value: o.strength ?? .85 }, exposure: { value: r.toneMappingExposure } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tBeauty, tAO; uniform float strength, exposure; varying vec2 vUv;
      vec3 rrtFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 aces(vec3 color){ const mat3 ACESInputMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
        const mat3 ACESOutputMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
        color *= exposure / 0.6; color = ACESInputMat * color; color = rrtFit(color); color = ACESOutputMat * color; return clamp(color, 0.0, 1.0); }
      vec3 toSRGB(vec3 c){ return mix(pow(c, vec3(0.41666)) * 1.055 - vec3(0.055), c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
      void main(){ vec3 c = texture2D(tBeauty, vUv).rgb; float ao = texture2D(tAO, vUv).r; c *= mix(1.0, ao, strength); gl_FragColor = vec4(toSRGB(aces(c)), 1.0); }`,
    depthTest: false, depthWrite: false });
  STAGE.post = { rt, ssao, quad: new THREE.FullScreenQuad(mat), mat };
};
STAGE.renderPost = () => {
  const { r, scene, cam, post } = STAGE, { ssao } = post; STAGE.dome.position.copy(cam.position);   // dome rides with the camera: never clipped
  r.setRenderTarget(post.rt); r.clear(); r.render(scene, cam);
  const u = ssao.ssaoMaterial.uniforms; u.cameraNear.value = cam.near; u.cameraFar.value = cam.far; u.cameraProjectionMatrix.value.copy(cam.projectionMatrix); u.cameraInverseProjectionMatrix.value.copy(cam.projectionMatrixInverse);
  ssao.overrideVisibility(); ssao.renderOverride(r, ssao.normalMaterial, ssao.normalRenderTarget, 0x7777ff, 1.0); ssao.restoreVisibility();
  u.kernelRadius.value = ssao.kernelRadius; u.minDistance.value = ssao.minDistance; u.maxDistance.value = ssao.maxDistance;
  ssao.renderPass(r, ssao.ssaoMaterial, ssao.ssaoRenderTarget);
  ssao.renderPass(r, ssao.blurMaterial, ssao.blurRenderTarget);
  r.setRenderTarget(null); post.mat.uniforms.exposure.value = r.toneMappingExposure; post.quad.render(r);
};
STAGE.view = (name) => { const v = STAGE.views[name]; if (v) STAGE.look(v.pos, v.target, v.fov); if (STAGE.post) STAGE.renderPost(); else STAGE.r.render(STAGE.scene, STAGE.cam); return STAGE.r.domElement.toDataURL('image/png'); };
STAGE.interactive = (target) => {
  const oc = new THREE.OrbitControls(STAGE.cam, STAGE.r.domElement); oc.target.set(...target); oc.update();
  const loop = () => { if (STAGE.post) STAGE.renderPost(); else STAGE.r.render(STAGE.scene, STAGE.cam); requestAnimationFrame(loop); }; loop();
};
