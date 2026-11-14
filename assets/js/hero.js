// Hero: Ninelong unplugs from a cold server-farm of identical agents (the digital world, seen
// on a monitor), jumps out through the screen and pilots a Franka from a cockpit on its
// shoulder. The arm replays a real Physical Agent episode. Everything is a function of the clock T.
import * as THREE from '../vendor/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from '../vendor/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from '../vendor/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from '../vendor/jsm/postprocessing/ShaderPass.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('gl');
const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);

// ---------- timeline (seconds) ----------
import { T_UP0, T_UP1, T_TASK, T_DIVE0, T_DIVE1, T_GLANCE, T_JUMP, T_CROSS, T_LAND, T_TURNS, THINK, EXEC, TURN, CALL_AT, makeOverlay } from './timeline.js';
let N_TURNS = 12, T_END = T_TURNS + N_TURNS * TURN, T_LOOP = T_END + 6.5;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const easeIO = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const bump = (x) => (x <= 0 || x >= 1 ? 0 : 4 * x * (1 - x));
const backOut = (t) => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerpAngle = (a, b, t) => { const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// milk palette
const C = { milk: 0xfffaf0, cream: 0xfff1d6, butter: 0xffe08a, egg: 0xffd23c, maple: 0xedd0a2, caramel: 0xd9b185, latte: 0xb89c86, cocoa: 0x6f5a4e, coral: 0xf08a6b, matcha: 0x7fbf6a };

async function main() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { fail('The 3D replay needs WebGL'); return; }
  const small = matchMedia('(max-width: 760px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const [sc, bin, ep] = await Promise.all([
    fetch('assets/scene/scene.json').then((r) => r.json()),
    fetch('assets/scene/scene.bin').then((r) => r.arrayBuffer()),
    fetch('assets/episode/episode.json').then((r) => r.json()),
    document.fonts.load('600 30px Jakarta'), document.fonts.load('500 20px JBMono'),
  ]);
  N_TURNS = ep.turns.length; T_END = T_TURNS + N_TURNS * TURN; T_LOOP = T_END + 6.5;
  const obsImgs = ep.turns.map((t) => { const i = new Image(); i.src = 'assets/episode/' + t.obs; return i; });
  await new Promise((r) => { if (obsImgs[0].complete) r(); else { obsImgs[0].onload = obsImgs[0].onerror = r; } });

  const scene = new THREE.Scene();
  {
    const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#6fb6ea'); gr.addColorStop(0.3, '#9fd2f4'); gr.addColorStop(0.47, '#d6edfa'); gr.addColorStop(0.53, '#eef6f6'); gr.addColorStop(0.68, '#f8f1e3'); gr.addColorStop(1, '#f6e4cb');
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false, color: new THREE.Color(1.42, 1.42, 1.42) }));
    dome.position.z = 1; dome.renderOrder = -10; scene.add(dome);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const ENV = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 40);
  camera.up.set(0, 0, 1);
  const CAM = new THREE.Vector3(1.38, 1.1, 1.92), LOOK = new THREE.Vector3(-0.1, -0.05, 1.17);
  if (qs.has('cam')) { const c = qs.get('cam').split(',').map(Number); CAM.set(c[0], c[1], c[2]); LOOK.set(c[3], c[4], c[5]); }

  scene.add(new THREE.HemisphereLight(0xfff8ea, 0xf3dcc0, 0.4));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
  sun.position.set(1.5, 0.3, 3.4); sun.target.position.set(-0.05, -0.1, 0.9);
  sun.castShadow = true; sun.shadow.mapSize.set(small ? 2048 : 4096, small ? 2048 : 4096);
  Object.assign(sun.shadow.camera, { left: -1.3, right: 1.2, top: 1.15, bottom: -1.25, near: 0.5, far: 7 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.004;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0xffe2c4, 0.7); rim.position.set(-1.8, -1.4, 1.6); scene.add(rim);

  const std = (hex, rough = 0.62, extra = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0, envMapIntensity: ENV, ...extra });
  const shadowed = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };

  // ---------- recorded MuJoCo scene, restyled ----------
  const f32 = (r) => new Float32Array(bin, r[0], r[1]);
  let dirty = true;
  const texLoader = new THREE.TextureLoader(new THREE.LoadingManager(() => { dirty = true; })), texCache = {};
  const getTex = (file) => { if (!texCache[file]) { const t = texLoader.load('assets/scene/' + file, () => { dirty = true; }); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; texCache[file] = t; } return texCache[file]; };
  const geoCache = {};
  const meshGeo = (id) => {
    if (geoCache[id]) return geoCache[id];
    const m = sc.meshes[id], g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(f32(m.pos), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(bin, m.nrm[0], m.nrm[1]), 3, true));
    if (m.uv) g.setAttribute('uv', new THREE.BufferAttribute(f32(m.uv), 2));
    g.setIndex(new THREE.BufferAttribute(m.idx32 ? new Uint32Array(bin, m.idx[0], m.idx[1]) : new Uint16Array(bin, m.idx[0], m.idx[1]), 1));
    return (geoCache[id] = g);
  };
  const M = {
    white: std(0xfffdf7, 0.42), dark: std(0xa8978c, 0.55), mid: std(0xd9cdc2, 0.55), accent: std(C.butter, 0.5),
    cab: std(C.caramel, 0.7), handle: std(0xfff6e3, 0.5), stove: std(0xfff3dc, 0.6), burner: std(0x5b4a42, 0.5), knob: std(C.coral, 0.5),
  };
  const restyle = (g) => {
    const n = g.name;
    if (n.startsWith('robot0') || n.startsWith('gripper0')) {
      const [r, gg, b] = g.rgba, lum = 0.3 * r + 0.6 * gg + 0.1 * b, sat = Math.max(r, gg, b) - Math.min(r, gg, b);
      if (sat > 0.3) return M.accent; if (lum > 0.8) return M.white; if (lum > 0.4) return M.mid; return M.dark;
    }
    if (n.startsWith('wooden_cabinet')) return /_g(17|28|39)$/.test(n) ? M.handle : M.cab;
    if (n.startsWith('flat_stove_1_base')) return M.stove;
    if (n === 'flat_stove_1_burner') return M.burner;
    if (n.startsWith('flat_stove')) return M.knob;
    return null;
  };
  const world = new THREE.Group(); scene.add(world);
  const tracked = [];
  for (const g of sc.geoms) {
    if (g.arena || g.rgba[3] < 0.05 || g.name.startsWith('mount0')) continue;
    let geo;
    if (g.type === 'mesh') geo = meshGeo(g.mesh);
    else if (g.type === 'box') geo = new RoundedBoxGeometry(2 * g.size[0], 2 * g.size[1], 2 * g.size[2], 3, Math.min(0.008, g.size[2] * 0.6));
    else if (g.type === 'cylinder') { geo = new THREE.CylinderGeometry(g.size[0], g.size[0], 2 * g.size[1], 28); geo.rotateX(Math.PI / 2); }
    else if (g.type === 'sphere') geo = new THREE.SphereGeometry(g.size[0], 24, 16);
    else continue;
    let mat = restyle(g);
    if (!mat) { mat = std(0xffffff, 0.55); if (g.tex && geo.getAttribute('uv')) mat.map = getTex(g.tex); else mat.color.setRGB(g.rgba[0], g.rgba[1], g.rgba[2], THREE.SRGBColorSpace); }
    const mesh = shadowed(new THREE.Mesh(geo, mat));
    mesh.position.fromArray(g.pos); mesh.quaternion.set(g.quat[1], g.quat[2], g.quat[3], g.quat[0]);
    world.add(mesh);
    if (g.track !== undefined) tracked.push([mesh, g.track]);
  }
  // a floating island with a maple work mat instead of the simulator's room
  const woodTex = (base, dark, seed, planks) => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 150; i++) { const y = rnd(seed + i) * 512, w = 0.6 + rnd(seed + i * 2.3) * 2.4, amp = 2 + rnd(seed + i * 5.1) * 7, ph = rnd(seed + i * 7.7) * 6.28; g.strokeStyle = dark; g.globalAlpha = 0.05 + 0.13 * rnd(seed + i * 3.9); g.lineWidth = w; g.beginPath(); for (let x = 0; x <= 512; x += 16) { const yy = y + Math.sin(x * 0.012 + ph) * amp; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); } g.stroke(); }
    if (planks) { g.globalAlpha = 0.22; g.strokeStyle = dark; g.lineWidth = 2; for (let k = 1; k < planks; k++) { g.beginPath(); g.moveTo(0, k * 512 / planks); g.lineTo(512, k * 512 / planks); g.stroke(); } }
    g.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  };
  for (const [w, d, h, z, col] of [[2.0, 1.86, 0.1, 0.85, C.milk], [1.84, 1.7, 0.13, 0.745, 0xf4e5cf], [1.52, 1.38, 0.2, 0.59, 0xe8d2b2], [1.06, 0.96, 0.24, 0.39, 0xdcbf99], [0.56, 0.5, 0.22, 0.19, 0xcfac83]]) {
    const m = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, d, h, 5, Math.min(0.09, h * 0.45)), std(col, 0.85)), false, true); m.position.set(-0.2, -0.06, z); world.add(m);
  }
  const trim = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.05, 1.25, 0.008, 3, 0.004), std(0xd3ad7a, 0.7)), false, true); trim.position.set(0, 0, 0.8925); world.add(trim);
  const mat = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.2, 0.012, 4, 0.006), std(0xffffff, 0.7, { map: woodTex('#f0d5a8', '#b98a52', 3, 6) })), false, true);
  mat.position.set(0, 0, 0.8955); world.add(mat);
  M.cab.map = woodTex('#deb98a', '#a9773f', 41, 0); M.cab.color.set(0xffffff);
  for (const [r0, r1, h, z, col] of [[0.19, 0.21, 0.012, 0.904, 0xe9d9c0], [0.15, 0.17, 0.014, 0.915, 0xf7ecd9]]) { const ped = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 56).rotateX(Math.PI / 2), std(col, 0.55))); ped.position.set(-0.66, 0, z); world.add(ped); }
  {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, 'rgba(120,110,120,.3)'); gr.addColorStop(1, 'rgba(120,110,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    sh.position.set(-0.2, -0.06, -0.35); world.add(sh);
  }
  // a few living things and odds and ends on the island
  const plant = (x, y, s, potCol, n) => {
    const g = new THREE.Group(); g.position.set(x, y, 0.9); g.scale.setScalar(s);
    const pot = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.08, 28).rotateX(Math.PI / 2), std(potCol, 0.6))); pot.position.z = 0.04; g.add(pot);
    const rimP = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.007, 10, 32), std(potCol, 0.6))); rimP.position.z = 0.08; g.add(rimP);
    const soil = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), std(0x7a5a44, 0.9)); soil.position.z = 0.078; g.add(soil);
    const lg = new THREE.SphereGeometry(0.06, 16, 12);
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rnd(x * 7 + i), tilt = 0.5 + 0.55 * rnd(i * 3.1 + y), len = 0.75 + 0.6 * rnd(i * 5.7 + x);
      const stem = new THREE.Group(); stem.position.z = 0.08; stem.rotation.set(0, 0, a); const arm = new THREE.Group(); arm.rotation.y = tilt - Math.PI / 2; stem.add(arm);
      const leaf = shadowed(new THREE.Mesh(lg, std(i % 2 ? 0x6fb45f : 0x8fca78, 0.6))); leaf.scale.set(1.25 * len, 0.62, 0.14); leaf.position.x = 0.085 * len; leaf.rotation.x = 0.3 * (rnd(i + 1) - 0.5); arm.add(leaf); g.add(stem); }
    world.add(g);
  };
  plant(-1.02, -0.8, 1.35, 0xfff6e4, 9); plant(-0.62, -0.84, 0.8, 0xf2a488, 7);
  for (const [x, y, z, sz, col, rz] of [[-1.0, 0.62, 0.98, 0.16, C.butter, 0.2], [-0.84, 0.7, 0.96, 0.12, 0xfff6e4, -0.3], [-0.99, 0.63, 1.12, 0.12, C.coral, 0.6]]) { const b = shadowed(new THREE.Mesh(new RoundedBoxGeometry(sz, sz, sz, 4, sz * 0.14), std(col, 0.6))); b.position.set(x, y, z); b.rotation.z = rz; world.add(b); }
  { // the line from the monitor to the robot's base
    const curve = new THREE.CatmullRomCurve3([[0.43, -0.6, 0.908], [0.3, -0.69, 0.906], [0.0, -0.7, 0.906], [-0.4, -0.66, 0.906], [-0.7, -0.45, 0.906], [-0.78, -0.2, 0.908], [-0.74, -0.08, 0.912]].map((q) => new THREE.Vector3(...q)));
    world.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 0.006, 10), std(C.butter, 0.5))));
  }

  const FR = sc.frames, NM = sc.tracks.n, tp = f32(sc.tracks.pos), tq = f32(sc.tracks.quat), eef = f32(sc.eef);
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  function setFrame(f) {
    f = clamp(f, 0, FR - 1); const i0 = Math.min(FR - 2, Math.floor(f)), a = f - i0, i1 = i0 + 1;
    for (const [mesh, k] of tracked) {
      const p0 = (i0 * NM + k) * 3, p1 = (i1 * NM + k) * 3, q0 = (i0 * NM + k) * 4, q1 = (i1 * NM + k) * 4;
      mesh.position.set(lerp(tp[p0], tp[p1], a), lerp(tp[p0 + 1], tp[p1 + 1], a), lerp(tp[p0 + 2], tp[p1 + 2], a));
      qa.set(tq[q0 + 1], tq[q0 + 2], tq[q0 + 3], tq[q0]); qb.set(tq[q1 + 1], tq[q1 + 2], tq[q1 + 3], tq[q1]);
      mesh.quaternion.copy(qa).slerp(qb, a);
    }
  }
  const eefAt = (f, out) => { f = clamp(f, 0, FR - 1); const i0 = Math.min(FR - 2, Math.floor(f)), a = f - i0; return out.set(lerp(eef[i0 * 3], eef[i0 * 3 + 3], a), lerp(eef[i0 * 3 + 1], eef[i0 * 3 + 4], a), lerp(eef[i0 * 3 + 2], eef[i0 * 3 + 5], a)); };

  // ---------- waypoints: the numbers the agent wrote, as points in space ----------
  const NW = sc.targets.length;
  const wp = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0046, 12, 10), new THREE.MeshBasicMaterial({ toneMapped: false }), NW);
  const cOpen = new THREE.Color(C.matcha), cClose = new THREE.Color(0xf08a3c), dummy = new THREE.Object3D();
  for (let i = 0; i < NW; i++) wp.setColorAt(i, sc.targets[i][6] > 0 ? cClose : cOpen);
  wp.frustumCulled = false; scene.add(wp);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sc.targets.flatMap((t) => [t[0], t[1], t[2]])), 3));
  const wline = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: C.cocoa, transparent: true, opacity: 0.35 }));
  wline.frustumCulled = false; scene.add(wline);
  const wpTime = (i) => T_TURNS + Math.floor(i / 8) * TURN + THINK * (CALL_AT + (1 - CALL_AT) * ((i % 8) / 8));

  // ---------- Ninelong ----------
  const EA = 0.060, EB = 0.070, EK = 0.13;
  const rAt = (dz) => { const c = clamp(dz / EB, -1, 1), s = Math.sqrt(1 - c * c); return EA * s * (1 - EK * c); };
  const eggGeo = (() => { const pts = []; for (let i = 0; i <= 56; i++) { const th = Math.PI * (1 - i / 56); pts.push(new THREE.Vector2(Math.max(0, EA * Math.sin(th) * (1 - EK * Math.cos(th))), EB * Math.cos(th))); } return new THREE.LatheGeometry(pts, 72).rotateX(Math.PI / 2); })();
  const EM = {
    body: new THREE.MeshPhysicalMaterial({ color: 0xffcf33, roughness: 0.62, sheen: 0.45, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffe9a0), envMapIntensity: ENV }),
    iris: std(0x4fa53f, 0.5, { envMapIntensity: 0.35 }),
    pupil: std(0x15120f, 0.38, { envMapIntensity: 0.18 }),
    glint: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.4) }),
    beak: std(0xc9760f, 0.5, { envMapIntensity: 0.2 }),
    smile: std(0xc9760f, 0.5, { envMapIntensity: 0.2 }),
  };
  const SMILE_ARC = Math.PI * 0.62;
  const smileGeo = new THREE.TorusGeometry(0.0115, 0.0015, 10, 28, SMILE_ARC).rotateZ(-Math.PI / 2 - SMILE_ARC / 2).rotateX(Math.PI / 2).rotateZ(Math.PI / 2);
  const G = { iris: new THREE.SphereGeometry(0.0084, 28, 20), pupil: new THREE.SphereGeometry(0.0054, 24, 18), glint: new THREE.SphereGeometry(0.0011, 10, 8), beak: new THREE.CapsuleGeometry(0.0015, 0.0105, 6, 14) };
  function makeEgg() {
    const egg = new THREE.Group();
    const body = shadowed(new THREE.Mesh(eggGeo, EM.body)); body.position.z = EB; egg.add(body);
    const eyes = [];
    for (const sgn of [-1, 1]) {
      const phi = sgn * 0.36, dz = 0.014, r = rAt(dz), e = new THREE.Group();
      e.position.set(r * Math.cos(phi), r * Math.sin(phi), EB + dz); e.rotation.order = 'ZYX'; e.rotation.z = phi; e.rotation.y = -0.2;
      const lid = new THREE.Group(); e.add(lid);
      const iris = new THREE.Mesh(G.iris, EM.iris); iris.position.x = -0.0032;
      const pupil = new THREE.Mesh(G.pupil, EM.pupil); pupil.position.x = 0.0012;
      const glint = new THREE.Mesh(G.glint, EM.glint); glint.position.set(0.0058, 0.0019, 0.0022);
      lid.add(iris, pupil, glint); egg.add(e); eyes.push({ lid, pupil, glint });
    }
    const beak = new THREE.Mesh(G.beak, EM.beak); beak.position.set(rAt(-0.003) + 0.0003, 0, EB - 0.003); egg.add(beak);
    const smile = new THREE.Mesh(smileGeo, EM.smile); smile.position.set(rAt(0.004) + 0.0004, 0, EB + 0.004); smile.rotation.y = -0.1; smile.visible = false; egg.add(smile);
    egg.userData = { body, eyes, beak, smile };
    return egg;
  }
  function faceEgg(egg, lookY, lookZ, blink = 1, joy = 0) {
    for (const { lid, pupil, glint } of egg.userData.eyes) {
      lid.scale.z = blink;
      pupil.position.y = lookY * 0.0016; pupil.position.z = lookZ * 0.0016;
      glint.position.y = 0.0019 + lookY * 0.0016; glint.position.z = 0.0022 + lookZ * 0.0016;
    }
    const { beak, smile } = egg.userData, happy = joy > 0.05;
    beak.visible = !happy; smile.visible = happy; if (happy) smile.scale.setScalar(0.95 + 0.3 * joy);
  }
  const QFIX = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)));

  // ---------- the monitor: its screen shows the digital world, rendered live ----------
  const OW = 0.36, OH = 0.2, MW = 0.4, MH = 0.24, MD = 0.11, SCR_Z = -0.012;
  const MXY = new THREE.Vector2(0.4, -0.5), MZ = 0.9 + 0.012 + 0.045 + MH / 2;
  const nrm = new THREE.Vector3(CAM.x - MXY.x, CAM.y - MXY.y, 0).normalize();
  const mon = new THREE.Group();
  mon.position.set(MXY.x, MXY.y, MZ);
  mon.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1).cross(nrm).normalize(), new THREE.Vector3(0, 0, 1), nrm));
  scene.add(mon);
  const rtA = new THREE.WebGLRenderTarget(16, 9, { type: THREE.HalfFloatType, samples: 4 }), scrM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  let ripple;
  {
    const rrShape = (w, h, r, S = THREE.Shape) => { const s = new S(); const x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
    const shell = rrShape(MW, MH, 0.036); shell.holes.push(rrShape(OW, OH, 0.012, THREE.Path));
    const shellM = std(0xfff6e4, 0.5);
    const frame = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(shell, { depth: MD - 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 4, curveSegments: 10 }), shellM));
    frame.position.z = -MD + 0.006; mon.add(frame);
    const back = shadowed(new THREE.Mesh(new RoundedBoxGeometry(MW - 0.01, MH - 0.01, 0.012, 3, 0.005), shellM)); back.position.z = -MD; mon.add(back);
    const neck = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.05, 24), std(C.butter, 0.5))); neck.position.set(0, -MH / 2 - 0.022, -MD / 2); mon.add(neck);
    const base = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.012, 0.12, 3, 0.005), std(C.butter, 0.5))); base.position.set(0, -MH / 2 - 0.051, -MD / 2); mon.add(base);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(OW, OH), scrM); screen.position.z = SCR_Z; mon.add(screen);
    const ring = rrShape(OW + 0.006, OH + 0.006, 0.014); ring.holes.push(rrShape(OW - 0.004, OH - 0.004, 0.01, THREE.Path));
    const rim2 = new THREE.Mesh(new THREE.ShapeGeometry(ring, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 2.0, 4.2) })); rim2.position.z = SCR_Z + 0.0012; mon.add(rim2);
    ripple = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 10, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 2.4, 4.6), transparent: true })); ripple.position.z = SCR_Z + 0.004; ripple.visible = false; mon.add(ripple);
  }
  mon.updateMatrixWorld(true);
  const scrCenter = mon.localToWorld(new THREE.Vector3(0, 0, SCR_Z));

  // ---------- the cockpit: a little tub bolted on top of the Franka's wrist ----------
  const capG = sc.geoms.find((g) => g.name === 'robot0_g40_vis') || sc.geoms.find((g) => g.body === 'robot0_link6' && g.track !== undefined);
  const cap = tracked.find(([m, k]) => k === capG.track);
  const capQ0inv = new THREE.Quaternion().set(tq[capG.track * 4 + 1], tq[capG.track * 4 + 2], tq[capG.track * 4 + 3], tq[capG.track * 4]).invert();
  const POD_YAW = Math.atan2(CAM.y - capG.pos[1], CAM.x - capG.pos[0]) - 0.12, POD_Q0 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), POD_YAW), POD_LIFT = 0.066;
  const pod = new THREE.Group(); scene.add(pod);
  let stick, ant;
  {
    const R = 0.076;
    const shellM = new THREE.MeshStandardMaterial({ color: 0xfff6e4, roughness: 0.5, envMapIntensity: ENV, side: THREE.DoubleSide });
    const bowl = shadowed(new THREE.Mesh(new THREE.SphereGeometry(R, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).rotateX(Math.PI / 2), shellM)); bowl.scale.z = 0.82; pod.add(bowl);
    pod.add(shadowed(new THREE.Mesh(new THREE.TorusGeometry(R, 0.0075, 14, 56), std(C.butter, 0.45))));
    const band = shadowed(new THREE.Mesh(new THREE.TorusGeometry(R * 0.9, 0.005, 10, 48), std(C.coral, 0.5))); band.position.z = -0.026; pod.add(band);
    const collar = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.04, 0.016, 28).rotateX(Math.PI / 2), std(C.butter, 0.5))); collar.position.z = -POD_LIFT + 0.008; pod.add(collar);
    const dash = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.07, 0.016, 3, 0.006), std(0xe9d9c4, 0.5))); dash.position.set(R * 0.97, 0, -0.004); dash.rotation.y = -0.3; pod.add(dash);
    stick = new THREE.Group(); stick.position.set(R * 0.93, 0.024, 0.004);
    const rod = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.02, 10).rotateX(Math.PI / 2), std(0x8a7a70, 0.4))); rod.position.z = 0.01; stick.add(rod);
    const knob = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.0078, 18, 14), std(C.coral, 0.4))); knob.position.z = 0.023; stick.add(knob);
    pod.add(stick);
    for (const [y, c] of [[-0.02, C.matcha], [-0.005, C.egg]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5) })); b.position.set(R * 1.0, y, 0.006); pod.add(b); }
    for (const sy of [-1, 1]) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 2.0, 1.3) })); lamp.position.set(R * 0.72, sy * R * 0.72, -0.012); pod.add(lamp); }
    ant = new THREE.Group(); ant.position.set(-R * 0.82, 0.03, 0);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 0.09, 6).rotateX(Math.PI / 2), std(0x8a7a70, 0.4)); wire.position.z = 0.045; ant.add(wire);
    const tip = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.0075, 16, 12), std(C.coral, 0.4))); tip.position.z = 0.094; ant.add(tip);
    pod.add(ant);
    const cushion = shadowed(new THREE.Mesh(new THREE.TorusGeometry(R * 0.7, 0.012, 12, 40), std(C.coral, 0.75))); cushion.position.z = -0.012; pod.add(cushion);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, bolt = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), std(0xd8c7a8, 0.35, { metalness: 0.5 })); bolt.position.set(Math.cos(a) * R * 0.985, Math.sin(a) * R * 0.985, -0.012); pod.add(bolt); }
    for (const sy of [-1, 1]) { const pipe = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.034, 14), std(0xd9cdc2, 0.4, { metalness: 0.3 }))); pipe.position.set(-R * 0.86, sy * 0.022, -0.03); pipe.rotation.z = Math.PI / 2 + 0.5; pod.add(pipe); }
  }
  const SEAT_Z = -0.034, S_OUT = 0.9;
  const hero = makeEgg(); scene.add(hero);
  const dq = new THREE.Quaternion(), seatV = new THREE.Vector3();
  const podUpdate = () => { dq.copy(cap[0].quaternion).multiply(capQ0inv); pod.quaternion.copy(dq).multiply(POD_Q0); pod.position.set(0, 0, POD_LIFT).applyQuaternion(dq).add(cap[0].position); seatV.set(0, 0, SEAT_Z).applyQuaternion(pod.quaternion).add(pod.position); };
  setFrame(0); podUpdate(); const seat0 = seatV.clone();

  // a few clouds so the outside reads as open air
  {
    const cm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xf4f8ff, emissiveIntensity: 0.62, envMapIntensity: 0.3 });
    // the bench floats in open sky: clouds drift around and below it
    const clouds = [[-3.6, -2.4, 2.5, 1.5], [-4.6, 0.6, 2.9, 1.8], [-2.4, -4.4, 2.2, 1.3], [-5.2, -3.6, 3.3, 2.0], [-1.0, -5.2, 2.8, 1.5],
      [-4.8, -3.2, 1.05, 2.6], [-6.4, -0.4, 0.75, 3.2], [-3.0, -6.0, 0.85, 2.8], [-8.0, -4.8, 1.5, 3.6], [-5.4, -7.6, 1.25, 3.4], [-8.6, 1.8, 1.3, 3.2], [-1.2, -8.2, 1.0, 3.0], [-9.5, -9.0, 2.2, 4.5]];
    for (const [x, y, z, s] of clouds) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); g.rotation.z = x * 1.7;
      for (const [dx, dy, dz, r] of [[0, 0, 0, 0.24], [0.22, 0.05, -0.03, 0.18], [-0.24, -0.04, -0.04, 0.17], [0.05, 0.1, 0.1, 0.16], [0.4, -0.02, -0.07, 0.12], [-0.42, 0.03, -0.08, 0.11]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), cm); m.position.set(dx, dy, dz); m.scale.z = 0.72; g.add(m); }
      scene.add(g);
    }
  }

  // confetti when Ninelong breaks through the glass
  const NB = 36, burst = new THREE.InstancedMesh(new RoundedBoxGeometry(0.01, 0.01, 0.003, 1, 0.001), new THREE.MeshStandardMaterial({ roughness: 0.4, envMapIntensity: ENV }), NB);
  const bcol = [0x8fd8ff, 0xffffff, 0x4ab8ff, C.egg, 0xcfeeff].map((c) => new THREE.Color(c));
  for (let i = 0; i < NB; i++) burst.setColorAt(i, bcol[i % bcol.length]);
  burst.frustumCulled = false; scene.add(burst);

  // ====================================================================================
  // Scene A — the digital world: a dim, deep-blue office. Rows of identical agents work
  // behind laptops, faces lit by the screens; the walls are covered in code. Rendered
  // live onto the monitor.
  // ====================================================================================
  const sceneA = new THREE.Scene();
  const FOGC = 0x070d24;
  sceneA.background = new THREE.Color(FOGC); sceneA.fog = new THREE.FogExp2(FOGC, 0.11);
  const camA = new THREE.PerspectiveCamera(36, OW / OH, 0.02, 40); camA.up.set(0, 0, 1);
  { // reflections for the dark room: a navy box with cold strips overhead and a glowing wall of screens
    const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 6), new THREE.MeshBasicMaterial({ color: 0x030718, side: THREE.BackSide })));
    const stripM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 3.0, 4.4) });
    for (let i = -2; i <= 2; i++) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 7), stripM); pl.position.set(i * 1.7, 0, 2.9); pl.rotation.x = Math.PI; es.add(pl); }
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.75, 1.9) })); wl.position.set(0, 4.9, 0.9); wl.rotation.x = Math.PI / 2; es.add(wl);
    sceneA.environment = pmrem.fromScene(es, 0.04).texture;
  }
  sceneA.add(new THREE.AmbientLight(0x2b3d86, 0.8));
  const keyA = new THREE.DirectionalLight(0xffe8c4, 0.55); keyA.position.set(-0.4, -1, 1.3); sceneA.add(keyA, keyA.target);
  const glowL = new THREE.DirectionalLight(0xb4dcff, 1.35); glowL.position.set(0, -1, -0.55); sceneA.add(glowL, glowL.target);
  const rimA = new THREE.DirectionalLight(0x4a74ff, 1.6); rimA.position.set(0.6, 1, 1.3); sceneA.add(rimA, rimA.target);
  const warmL = new THREE.PointLight(0xffc24a, 0, 0.8, 2); warmL.position.set(0, -0.12, 0.13); sceneA.add(warmL);
  const DX = 0.27, DY = 0.36, COLS = 6, ROWS = 9, CEIL = 1.5, SEAT_A = 0.035, BACK = ROWS * DY + 0.15, SIDE = (COLS + 0.9) * DX;
  const stations = []; for (let r = 0; r < ROWS; r++) for (let c = -COLS; c <= COLS; c++) if (r || c) stations.push([c * DX, r * DY, r, c]);
  const NS = stations.length, mtx = new THREE.Matrix4(), mtx2 = new THREE.Matrix4(), pV = new THREE.Vector3(), sV = new THREE.Vector3(1, 1, 1), qI = new THREE.Quaternion();
  const QFACE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
  const add = THREE.AdditiveBlending;
  const radial = (inner, outer = 'rgba(0,0,0,0)') => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); };
  const glowTex = radial('rgba(255,255,255,1)');
  const LT = 0.26;
  const G_A = {
    desk: new RoundedBoxGeometry(0.215, 0.135, 0.062, 3, 0.008), base: new RoundedBoxGeometry(0.094, 0.064, 0.004, 1, 0.0015),
    lid: new RoundedBoxGeometry(0.094, 0.003, 0.05, 2, 0.0013).rotateX(LT), logo: new THREE.CircleGeometry(0.0068, 28).rotateX(Math.PI / 2 + LT),
    halo: new THREE.PlaneGeometry(0.05, 0.05).rotateX(Math.PI / 2 + LT), pool: new THREE.PlaneGeometry(0.21, 0.15), face: new THREE.PlaneGeometry(0.14, 0.1).rotateX(Math.PI / 2),
  };
  const M_A = {
    desk: new THREE.MeshStandardMaterial({ color: 0x131d3c, roughness: 0.38, metalness: 0.25, envMapIntensity: 0.7 }), lap: new THREE.MeshStandardMaterial({ color: 0x27345a, roughness: 0.3, metalness: 0.4, envMapIntensity: 0.8 }),
    logo: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 2.3, 2.9) }),
    halo: new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: add, depthWrite: false, color: new THREE.Color(0.1, 0.3, 0.42) }),
    pool: new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: add, depthWrite: false, color: new THREE.Color(0.22, 0.42, 0.7) }),
    face: new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: add, depthWrite: false, color: new THREE.Color(0.09, 0.17, 0.27) }),
  };
  // offsets of each part from an agent's seat (agents face -y, toward the viewer; we see the lids' backs)
  const kit = { desk: [0, -0.118, 0.031], base: [0, -0.108, 0.064], lid: [0, -0.1445, 0.0885], logo: [0, -0.1469, 0.09], halo: [0, -0.1472, 0.09], pool: [0, -0.092, 0.0626], face: [0, -0.066, 0.116] };
  const inst = (geo, mat, n = NS) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; sceneA.add(m); return m; };
  const place = (im, off, keep) => { stations.forEach((s, i) => { sV.setScalar(!keep || keep(s, i) ? 1 : 0); pV.set(s[0] + off[0], s[1] + off[1], off[2]); mtx.compose(pV, qI, sV); im.setMatrixAt(i, mtx); }); sV.set(1, 1, 1); im.instanceMatrix.needsUpdate = true; return im; };
  {
    const wallM = new THREE.MeshStandardMaterial({ color: 0x0a1230, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide, envMapIntensity: 0.25 });
    const tc = document.createElement('canvas'); tc.width = tc.height = 128; { const g = tc.getContext('2d'); g.fillStyle = '#1b2650'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(130,160,255,.28)'; g.lineWidth = 2; g.strokeRect(1, 1, 126, 126); }
    const tileT = new THREE.CanvasTexture(tc); tileT.colorSpace = THREE.SRGBColorSpace; tileT.wrapS = tileT.wrapT = THREE.RepeatWrapping; tileT.repeat.set(2 * SIDE / 0.3, (BACK + 4) / 0.3); tileT.anisotropy = 8;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * SIDE, BACK + 4), new THREE.MeshStandardMaterial({ color: 0x3d4a86, map: tileT, roughness: 0.2, metalness: 0.6, envMapIntensity: 0.8 })); floor.position.set(0, (BACK - 4) / 2, 0); sceneA.add(floor);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2 * SIDE, CEIL).rotateX(Math.PI / 2), wallM); back.position.set(0, BACK, CEIL / 2); sceneA.add(back);
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(BACK + 4, CEIL).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), wallM); w.position.set(sx * SIDE, (BACK - 4) / 2, CEIL / 2); sceneA.add(w); }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(2 * SIDE, BACK + 4), new THREE.MeshStandardMaterial({ color: 0x060b1c, roughness: 0.95, side: THREE.DoubleSide })); ceil.position.set(0, (BACK - 4) / 2, CEIL); sceneA.add(ceil);
    for (const k of ['desk', 'base', 'lid']) place(inst(G_A[k], k === 'desk' ? M_A.desk : M_A.lap), kit[k]);
    for (const k of ['logo', 'halo', 'pool', 'face']) place(inst(G_A[k], M_A[k]), kit[k]);
    place(inst(new THREE.CylinderGeometry(0.0115, 0.0098, 0.021, 18).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3aa0b8, roughness: 0.45 })), [0.078, -0.1, 0.0725], (s, i) => rnd(i * 3.7) > 0.62);
    // chairs, keyboard glow and a cold light strip under every desk edge
    const chairM = new THREE.MeshStandardMaterial({ color: 0x0f1836, roughness: 0.7, envMapIntensity: 0.3 });
    place(inst(new RoundedBoxGeometry(0.128, 0.024, 0.115, 3, 0.011), chairM), [0, 0.09, 0.115]);
    place(inst(new THREE.BoxGeometry(0.02, 0.02, 0.07), chairM), [0, 0.09, 0.035]);
    const kc = document.createElement('canvas'); kc.width = 128; kc.height = 64; { const g = kc.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 64); for (let r = 0; r < 5; r++) for (let c = 0; c < 13; c++) { g.fillStyle = '#9fd0ff'; g.globalAlpha = 0.35 + 0.65 * rnd(r * 13 + c); g.fillRect(5 + c * 9.2 + (r % 2) * 2, 5 + r * 11, 6.2, 7); } }
    const kT = new THREE.CanvasTexture(kc); kT.colorSpace = THREE.SRGBColorSpace;
    place(inst(new THREE.PlaneGeometry(0.082, 0.04), new THREE.MeshBasicMaterial({ map: kT, color: new THREE.Color(0.5, 0.75, 1.05), transparent: true, blending: add, depthWrite: false })), [0, -0.104, 0.0663]);
    place(inst(new THREE.BoxGeometry(0.19, 0.003, 0.004), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.15, 1.6) })), [0, -0.1865, 0.05]);
    for (let y = 0.2; y < BACK; y += 0.72) { const beam = new THREE.Mesh(new THREE.BoxGeometry(2 * SIDE, 0.07, 0.11), wallM); beam.position.set(0, y, CEIL - 0.055); sceneA.add(beam); }
    // pendant lamps with cold light
    const lamps = []; for (let r = 0; r < ROWS; r += 2) for (let c = -COLS; c <= COLS; c += 3) lamps.push([c * DX + DX / 2, r * DY + 0.1]);
    const li = (geo, mat, z) => { const m = new THREE.InstancedMesh(geo, mat, lamps.length); lamps.forEach((l, i) => { mtx.makeTranslation(l[0], l[1], z); m.setMatrixAt(i, mtx); }); m.frustumCulled = false; sceneA.add(m); };
    li(new THREE.SphereGeometry(0.075, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.62), new THREE.MeshStandardMaterial({ color: 0x18224a, roughness: 0.45, metalness: 0.4, side: THREE.DoubleSide }), 0.7);
    li(new THREE.CircleGeometry(0.064, 28).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.9, 2.6) }), 0.702);
    li(new THREE.CylinderGeometry(0.002, 0.002, CEIL - 0.74, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0b1228, roughness: 0.6 }), (CEIL + 0.74) / 2);
    const cg = document.createElement('canvas'); cg.width = 4; cg.height = 128; { const g = cg.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); }
    li(new THREE.CylinderGeometry(0.05, 0.3, 0.66, 32, 1, true).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cg), color: new THREE.Color(0.032, 0.066, 0.115), transparent: true, blending: add, depthWrite: false, side: THREE.DoubleSide }), 0.37);
    // the walls are covered in large code displays
    const cc = document.createElement('canvas'); cc.width = 768; cc.height = 432; const g = cc.getContext('2d');
    g.fillStyle = '#0a1335'; g.beginPath(); g.roundRect(0, 0, 768, 432, 20); g.fill(); g.strokeStyle = '#3a5cc8'; g.lineWidth = 5; g.beginPath(); g.roundRect(3, 3, 762, 426, 18); g.stroke();
    g.fillStyle = '#16225a'; g.fillRect(6, 6, 756, 34); for (let d = 0; d < 3; d++) { g.fillStyle = ['#ff8a80', '#ffd666', '#7fe0a0'][d]; g.beginPath(); g.arc(28 + d * 22, 23, 6, 0, 7); g.fill(); }
    const cols = ['#c792ea', '#82aaff', '#7fdbca', '#ffffff', '#f78c6c', '#82aaff', '#c792ea', '#ffcb6b'];
    for (let row = 0; row < 15; row++) { let x = 70 + [0, 1, 2, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 1, 0][row] * 34; const y = 62 + row * 24; g.fillStyle = '#3d4f8f'; g.font = '500 13px JBMono'; g.fillText(String(row + 1).padStart(2, ' '), 26, y + 10); const n = 2 + ((rnd(row * 5.3) * 4) | 0); for (let k = 0; k < n; k++) { const w = 26 + rnd(row * 11 + k * 3.1) * 120; g.fillStyle = cols[(rnd(row * 2.9 + k) * cols.length) | 0]; g.beginPath(); g.roundRect(x, y, Math.min(w, 730 - x), 10, 5); g.fill(); x += w + 12; if (x > 690) break; } }
    const ct = new THREE.CanvasTexture(cc); ct.colorSpace = THREE.SRGBColorSpace; ct.anisotropy = 8;
    const pm = new THREE.MeshBasicMaterial({ map: ct, color: new THREE.Color(1.25, 1.25, 1.4) }), pw = 0.86, ph = pw * 432 / 768;
    const frameM = new THREE.MeshStandardMaterial({ color: 0x18224a, roughness: 0.4, metalness: 0.4 });
    const screenAt = (x, y, z, rz) => { const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.z = rz; const f = new THREE.Mesh(new RoundedBoxGeometry(pw + 0.04, 0.03, ph + 0.04, 2, 0.012), frameM); grp.add(f); const p = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph).rotateX(Math.PI / 2), pm); p.position.y = -0.0156; grp.add(p); sceneA.add(grp); };
    for (let r = 0; r < 2; r++) for (let c = -1.5; c <= 1.5; c++) screenAt(c * (pw + 0.1), BACK - 0.02, 0.5 + r * (ph + 0.08), 0);
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) screenAt(sx * (SIDE - 0.02), 0.25 + k * (pw + 0.12), 0.62, sx * Math.PI / 2);
  }
  // the crew
  const glintA = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.9, 2.0) });
  const bodyA = EM.body.clone(); bodyA.emissive = new THREE.Color(0x7a4a00); bodyA.emissiveIntensity = 0.28; bodyA.envMapIntensity = 0.3;
  const tmpl = makeEgg(); faceEgg(tmpl, 0, -0.6, 0.86, 0); tmpl.updateMatrixWorld(true);
  const crewSets = [(() => {
    const idx = stations.map((s, i) => i), parts = [];
    tmpl.traverse((o) => { if (!o.isMesh || !o.visible) return; let mat = o.material; if (mat === EM.glint) mat = glintA; if (mat === EM.body) mat = bodyA; parts.push({ im: inst(o.geometry, mat, idx.length), local: o.matrixWorld.clone(), src: o }); });
    faceEgg(tmpl, 0, -0.6, 0.08, 0); tmpl.updateMatrixWorld(true); for (const p of parts) p.shut = p.src.matrixWorld.clone();
    return { idx, parts };
  })()];
  const qCrew = new THREE.Quaternion(), qTmp = new THREE.Quaternion(), Z1 = new THREE.Vector3(0, 0, 1);
  // messages arriving for everyone: ordinary jobs for ordinary agents
  const LABELS = ['fix this bug', 'solve the integral', 'translate to French', 'write the SQL', 'summarize the PDF', 'refactor this', 'plot the data', 'draft the email', 'write unit tests', 'explain this error'];
  const bubTex = (text, warm) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 160; const g = c.getContext('2d');
    g.fillStyle = warm ? '#ffd23c' : '#eef3ff'; g.beginPath(); g.roundRect(6, 6, 500, 112, 50); g.fill(); g.beginPath(); g.moveTo(226, 114); g.lineTo(256, 156); g.lineTo(290, 114); g.fill();
    g.fillStyle = warm ? '#3a2a08' : '#16224a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 46; g.font = (warm ? '750 ' : '650 ') + fs + 'px Jakarta'; while (g.measureText(text).width > 440 && fs > 26) { fs -= 2; g.font = (warm ? '750 ' : '650 ') + fs + 'px Jakarta'; }
    g.fillText(text, 256, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  };
  const bubGeo = new THREE.PlaneGeometry(0.2, 0.2 * 160 / 512);
  const bubSets = LABELS.map((txt, k) => {
    const idx = []; stations.forEach((s, i) => { if (i % LABELS.length === k && rnd(i * 1.31) > 0.25) idx.push(i); });
    const im = inst(bubGeo, new THREE.MeshBasicMaterial({ map: bubTex(txt, false), alphaTest: 0.5, alphaToCoverage: true, color: new THREE.Color(0.98, 0.98, 1.02) }), Math.max(1, idx.length));
    return { idx, im };
  });
  const heroBub = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4 * 160 / 512), new THREE.MeshBasicMaterial({ map: bubTex('put the bowl on the plate', true), alphaTest: 0.5, alphaToCoverage: true, color: new THREE.Color(1.12, 1.12, 1.12), fog: false }));
  sceneA.add(heroBub);
  const nbrs = [-1, 1].map((c) => { const e = makeEgg(); e.userData.body.material = bodyA; e.userData.c = c; sceneA.add(e); return e; });
  // the hero's own kit, so its laptop can turn warm
  const heroA = makeEgg(); heroA.userData.body.material = bodyA; sceneA.add(heroA);
  const hM = { logo: M_A.logo.clone(), halo: M_A.halo.clone(), pool: M_A.pool.clone(), face: M_A.face.clone() };
  for (const k of ['desk', 'base', 'lid', 'logo', 'halo', 'pool', 'face']) { const m = new THREE.Mesh(G_A[k], hM[k] || (k === 'desk' ? M_A.desk : M_A.lap)); m.position.fromArray(kit[k]); sceneA.add(m); }
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.2), transparent: true, blending: add, depthWrite: false })); sceneA.add(spark);
  const K0p = new THREE.Vector3(-0.2, -0.86, 0.17), K0l = new THREE.Vector3(0.03, 0.1, 0.15), K1p = new THREE.Vector3(-0.95, -1.5, 1.12), K1l = new THREE.Vector3(0.12, 1.2, 0.08), K2p = new THREE.Vector3(-0.46, -0.64, 0.33), K2l = new THREE.Vector3(0.04, 0.02, 0.12), K3p = new THREE.Vector3(0, -0.5, 0.155), K3l = new THREE.Vector3(0, 0.02, 0.105), camLookA = new THREE.Vector3();
  const cLogo0 = M_A.logo.color.clone(), cLogo1 = new THREE.Color(3.4, 2.3, 0.4), cHalo0 = M_A.halo.color.clone(), cHalo1 = new THREE.Color(0.5, 0.34, 0.06), cPool0 = M_A.pool.color.clone(), cPool1 = new THREE.Color(1.0, 0.7, 0.2), cFace0 = M_A.face.color.clone(), cFace1 = new THREE.Color(0.45, 0.32, 0.09);
  // bloom on the digital world only: logos, lamps and the wall screens
  const composerA = new EffectComposer(renderer, rtA); composerA.renderToScreen = false;
  composerA.addPass(new RenderPass(sceneA, camA));
  const bloomA = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.34, 0.5, 1.22); composerA.addPass(bloomA);

  // ---------- post: soft ambient occlusion on the physical world ----------
  // final grade: a little contrast and saturation, a soft vignette, fine grain, and a flash for the crossing
  const GradeShader = {
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.2 }, uFlash: { value: 0 }, uSat: { value: 1.1 }, uCon: { value: 1.06 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVig, uFlash, uSat, uCon; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
      void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(.299, .587, .114));
        c.rgb = mix(vec3(l), c.rgb, uSat); c.rgb = (c.rgb - .5) * uCon + .5;
        vec2 d = (vUv - .5) * vec2(1.0, 1.12); c.rgb *= 1.0 - uVig * smoothstep(.3, .95, length(d) * 1.35);
        c.rgb += (h(vUv * vec2(1733., 977.)) - .5) * .02; c.rgb = mix(c.rgb, vec3(1.0), uFlash);
        gl_FragColor = vec4(clamp(c.rgb, 0., 1.), c.a); }`,
  };
  let composer = null, gtao = null, grade = null, aoOff = false;
  if (!qs.has('noao')) {
    try {
      const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: small ? 0 : 4 });
      composer = new EffectComposer(renderer, rt);
      composer.addPass(new RenderPass(scene, camera));
      gtao = new GTAOPass(scene, camera, 4, 4);
      gtao.updateGtaoMaterial({ radius: 0.11, distanceExponent: 1.4, thickness: 1.2, scale: 1.15, samples: small ? 8 : 16, distanceFallOff: 1 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
      gtao.blendIntensity = 0.9;
      composer.addPass(gtao); composer.addPass(new OutputPass()); grade = new ShaderPass(GradeShader); composer.addPass(grade);
    } catch (e) { console.warn('AO disabled', e); composer = null; }
  }
  const render = () => {
    composerA.render(); scrM.map = composerA.readBuffer.texture; renderer.setRenderTarget(null);
    if (composer) composer.render(); else renderer.render(scene, camera);
  };

  // ---------- DOM overlays ----------
  const { el, paintDom } = makeOverlay(ep, obsImgs);

  // ---------- per-frame evaluation ----------
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1), ctrl = new THREE.Vector3(), camP0 = new THREE.Vector3(), look = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1), jumpEnd = new THREE.Vector3(), jumpCtl = new THREE.Vector3(), p0 = new THREE.Vector3();
  const bez = (u, a, b, c, out) => out.set((1 - u) * (1 - u) * a.x + 2 * u * (1 - u) * b.x + u * u * c.x, (1 - u) * (1 - u) * a.y + 2 * u * (1 - u) * b.y + u * u * c.y, (1 - u) * (1 - u) * a.z + 2 * u * (1 - u) * b.z + u * u * c.z);
  ctrl.copy(scrCenter).lerp(seat0, 0.5).addScaledVector(up, 0.3).addScaledVector(nrm, 0.1);
  const LOOPL = window.__heroLoop || 0;   // set only by the offline renderer: seconds after which the idle segment repeats exactly
  function evaluate(T) {
    let idl = 0; if (LOOPL && T > T_LOOP) { idl = T - T_LOOP; T = T_LOOP; }   // freeze everything else at the film's last frame
    const aspect = camera.aspect, tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

    // ===== scene A =====
    // one take: eye level on five agents, crane up to a drone view of the whole floor, dive to the one who wakes
    const ka = easeIO((T - T_UP0) / (T_UP1 - T_UP0)), kb = easeIO((T - T_DIVE0) / (T_DIVE1 - T_DIVE0));
    camA.position.lerpVectors(K0p, K1p, ka); camA.position.y += 0.07 * smooth(T / T_UP0) * (1 - ka) + 0.12 * clamp((T - T_UP1) / 3) * ka; camA.position.z += 0.12 * bump(ka);
    camA.position.lerp(K2p, kb); camA.position.x += Math.sin(T * 0.3) * 0.006; camA.position.y += 0.05 * smooth((T - T_DIVE1) / 1.6);
    camLookA.lerpVectors(K0l, K1l, smooth(ka * 1.1)).lerp(K2l, kb);
    // once Ninelong is out, the monitor settles on a close-up of the empty seat
    const kc = easeIO((T - T_CROSS - 0.1) / 1.5); camA.position.lerp(K3p, kc); camLookA.lerp(K3l, kc); camA.lookAt(camLookA);
    const flick = 0.1 * Math.sin(T * 21) + 0.07 * Math.sin(T * 34.7) + 0.05 * Math.sin(T * 57);
    glowL.intensity = 1.35 + 2.0 * flick; M_A.face.color.setRGB(0.09 + 0.12 * flick, 0.17 + 0.22 * flick, 0.27 + 0.34 * flick);
    for (const set of crewSets) {
      for (let j = 0; j < set.idx.length; j++) {
        const i = set.idx[j], s = stations[i], ph = rnd(i * 4.1) * 6.283, tap = Math.sin(T * 7.5 - s[2] * 0.5 + s[3] * 0.9), bob = tap * tap * 0.003;
        const yawA = 0.1 * Math.sin(T * 0.7 + ph) + 0.3 * smooth(Math.sin(T * 0.21 + ph * 3) * 5 - 4) * Math.sign(Math.sin(ph * 7));
        const shut = ((T * 0.31 + rnd(i * 9.3)) % 1) < 0.03;
        pV.set(s[0], s[1], SEAT_A + bob); sV.setScalar(s[2] === 0 && Math.abs(s[3]) === 1 ? 0 : 1); mtx.compose(pV, qCrew.copy(QFACE).multiply(qTmp.setFromAxisAngle(Z1, yawA)), sV);
        for (const p of set.parts) { mtx2.multiplyMatrices(mtx, shut ? p.shut : p.local); p.im.setMatrixAt(j, mtx2); }
      }
      for (const p of set.parts) p.im.instanceMatrix.needsUpdate = true;
    }
    const hush = 1 - smooth((T - T_TASK - 0.15) / 0.5);
    sV.set(1, 1, 1);
    for (const set of bubSets) {
      for (let j = 0; j < set.idx.length; j++) {
        const i = set.idx[j], s = stations[i], per = 3.4 + 2.6 * rnd(i * 2.17), t0 = T_UP0 + 0.1 + 2.4 * rnd(i * 0.77), ph = ((T - t0) % per + per) % per;
        const a = T < t0 ? 0 : backOut(ph / 0.28) * (1 - smooth((ph - 2.2) / 0.35)) * hush;
        pV.set(s[0], s[1], SEAT_A + 0.215 + 0.004 * Math.sin(T * 2 + i));
        sV.setScalar(Math.max(0.0001, a * clamp(pV.distanceTo(camA.position) / 1.6, 1, 1.9))); pV.z += 0.012 * sV.x; mtx.compose(pV, camA.quaternion, sV); set.im.setMatrixAt(j, mtx);
      }
      set.im.instanceMatrix.needsUpdate = true;
    }
    sV.set(1, 1, 1);
    const woke = smooth((T - T_TASK - 0.25) / 0.5), inA = T < T_CROSS;
    const hb = backOut((T - T_TASK) / 0.4) * (1 - smooth((T - T_JUMP + 0.1) / 0.25));
    heroBub.visible = hb > 0.01; heroBub.scale.setScalar(Math.max(0.001, hb) * lerp(1.9, 1, kb)); heroBub.quaternion.copy(camA.quaternion); heroBub.position.set(0, 0, SEAT_A + lerp(0.32, 0.265, kb) + 0.004 * Math.sin(T * 2.4));
    warmL.intensity = 0.05 * woke * (inA ? 1 : Math.max(0, 1 - (T - T_CROSS) / 1.2));
    hM.logo.color.copy(cLogo0).lerp(cLogo1, woke); hM.halo.color.copy(cHalo0).lerp(cHalo1, woke); hM.pool.color.copy(cPool0).lerp(cPool1, woke); hM.face.color.copy(cFace0).lerp(cFace1, woke * (inA ? 1 : 0));
    const sp = bump((T - T_JUMP - 0.02) / 0.3); spark.visible = sp > 0; spark.scale.setScalar(0.3 + sp * 2.2); spark.position.set(0, 0, SEAT_A + 0.08);
    heroA.visible = inA;
    for (const e of nbrs) {
      const c = e.userData.c, peek = smooth((T - T_TASK - 0.5) / 0.3) * (1 - smooth((T - T_GLANCE - 0.2) / 0.3)), gone = smooth((T - T_JUMP - 0.25) / 0.3), back = c > 0 ? smooth((T - T_CROSS - 5) / 0.6) * (0.5 + 0.5 * Math.sin(T * 0.7)) : 0;
      const turn = Math.max(peek * 0.7, gone * (1 - back)), work = 1 - Math.max(peek, gone * (1 - back));
      e.position.set(c * DX, 0, SEAT_A + Math.abs(Math.sin(T * 7.5 + c * 0.9)) * 0.0035 * work + bump((T - T_JUMP - 0.25) / 0.3) * 0.01);
      e.quaternion.copy(QFACE); e.rotateZ(-c * 0.62 * turn);
      faceEgg(e, c * 0.4 * turn, lerp(-0.6, peek > gone ? 0.9 : 0.05, Math.max(peek, gone * (1 - back))), ((T + c) % 3.9) < 0.12 ? 0.12 : lerp(0.86, 1, Math.max(peek, gone)), 0);
    }
    {
      const glance = smooth((T - T_GLANCE) / 0.22), antic = smooth((T - (T_JUMP - 0.34)) / 0.34), ua = clamp((T - T_JUMP) / (T_CROSS - T_JUMP));
      let sq = 1 - 0.26 * antic * (ua > 0 ? 0 : 1), lookZ = -0.6, lookY = 0, blink = lerp(0.86, 1, woke);
      if (T > T_TASK + 0.3) { lookZ = lerp(1.0, 0.35, glance); lookY = lerp(0, 0.7, glance); }
      if (T > T_GLANCE + 0.26 && T < T_GLANCE + 0.36) blink = 0.12;
      const typing = Math.abs(Math.sin(T * 7.5)) * 0.0035 * (1 - woke), rise = 0.03 * woke;
      jumpEnd.copy(camA.position).add(v1.copy(camLookA).sub(camA.position).normalize().multiplyScalar(0.3)); jumpEnd.z -= 0.08;
      jumpCtl.set(-0.08, -0.16, 0.42);
      if (ua > 0) { bez(ua * ua * (3 - 2 * ua) * 0.5 + ua * 0.5, p0.set(0, 0, SEAT_A + rise), jumpCtl, jumpEnd, heroA.position); sq = 1 + 0.22 * bump(ua); }
      else heroA.position.set(0, 0, SEAT_A + rise + typing + bump((T - T_GLANCE) / 0.3) * 0.012);
      heroA.quaternion.copy(QFACE); heroA.rotateZ(-0.5 * glance); heroA.rotateY(0.5 * ua);
      heroA.scale.set(1 / Math.sqrt(sq), 1 / Math.sqrt(sq), sq);
      faceEgg(heroA, lookY, lookZ, blink, 0);
    }

    // ===== scene B camera: starts with the screen filling the view, then one pull-back =====
    const d0 = Math.min((OH / 2) / tanH, (OW / 2) / (tanH * aspect)) * 0.992;
    camP0.copy(scrCenter).addScaledVector(nrm, d0);
    const c = easeIO((T - (T_CROSS - 0.08)) / 2.5), narrow = aspect < 1.45 ? (1.45 - aspect) * 1.1 : 0;
    v1.copy(CAM); v1.x += Math.sin(T * 0.21) * 0.03; v1.y += Math.cos(T * 0.17) * 0.026;
    v2.copy(CAM).sub(LOOK).normalize(); v1.addScaledVector(v2, narrow - 0.07 * smooth((T - T_TURNS) / 8));
    camera.position.lerpVectors(camP0, v1, c); camera.position.z += 0.12 * bump(c);
    // follow Ninelong out of the screen, then settle on the bench
    const uf = clamp((T - T_CROSS) / (T_LAND - T_CROSS)), ufe = uf * uf * (3 - 2 * uf) * 0.6 + uf * 0.4;
    bez(ufe, scrCenter, ctrl, seat0, look); look.lerp(scrCenter, 1 - smooth(uf * 2.5)).lerp(LOOK, smooth((c - 0.35) / 0.65));
    camera.lookAt(look); camera.updateMatrixWorld();
    if (gtao) gtao.enabled = c > 0.02 && !aoOff;
    if (grade) { const u = grade.uniforms; u.uTime.value = T % 10; u.uVig.value = lerp(0.46, 0.17, smooth((T - T_CROSS) / 0.8)); u.uFlash.value = 0.6 * bump((T - T_CROSS + 0.06) / 0.42); }
    world.visible = c > 0.001;

    // recorded episode
    const tt = T - T_TURNS; let frame = 0;
    if (tt > 0) {
      if (T >= T_END) frame = sc.action_steps + (FR - 1 - sc.action_steps) * clamp((T - T_END) / 0.9);
      else { const k = Math.floor(tt / TURN), local = tt - k * TURN; frame = k * 8 + 8 * smooth((local - THINK) / EXEC); }
    }
    setFrame(frame);
    let shown = 0;
    for (let i = 0; i < NW; i++) {
      const a = clamp((T - wpTime(i)) / 0.22), t = sc.targets[i]; if (a > 0) shown = i + 1;
      const s = a <= 0 ? 0 : (1 + 0.9 * bump(a)) * (frame >= i + 1 ? 0.5 : 1);
      dummy.position.set(t[0], t[1], t[2]); dummy.quaternion.identity(); dummy.scale.setScalar(s); dummy.updateMatrix(); wp.setMatrixAt(i, dummy.matrix);
    }
    wp.instanceMatrix.needsUpdate = true; lineGeo.setDrawRange(0, shown);

    // cockpit rides the wrist
    podUpdate();
    eefAt(frame, v3);
    const tk = T >= T_TURNS && T < T_END ? Math.floor((T - T_TURNS) / TURN) : -1, tc = T_TURNS + tk * TURN + THINK * CALL_AT, press = tk >= 0 ? bump((T - tc) / 0.4) : 0;
    stick.rotation.set(0, 0.5 * press + 0.12 * Math.sin(T * 2.1), 0.2 * Math.sin(T * 1.7));
    ant.rotation.set(0.12 * Math.sin(T * 3.1), 0.12 * Math.cos(T * 2.6), 0);

    // Ninelong in the physical world
    const u = clamp((T - T_CROSS) / (T_LAND - T_CROSS));
    hero.visible = T >= T_CROSS;
    v2.copy(seatV);
    let sq = 1, s = S_OUT, lookY = 0, lookZ = 0, joy = 0, blink = (T % 3.7) < 0.12 ? 0.12 : 1, turn = 0.22 * Math.sin(T * 0.8);
    if (u < 1) {
      const ue = u * u * (3 - 2 * u) * 0.6 + u * 0.4;
      bez(ue, scrCenter, ctrl, v2, hero.position);
      // fly like a thrown bean: lean the body along the direction of travel, face to the camera
      bez(Math.min(1, ue + 0.02), scrCenter, ctrl, v2, v1).sub(hero.position).normalize();
      const lean = bump(u) * 0.85; v1.lerp(up, 1 - lean).normalize();
      p0.copy(camera.position).sub(hero.position); p0.addScaledVector(v1, -p0.dot(v1)).normalize();
      jumpCtl.crossVectors(v1, p0);
      q2.setFromRotationMatrix(mtx.makeBasis(p0, jumpCtl, v1));
      q1.copy(pod.quaternion); hero.quaternion.copy(q2).slerp(q1, smooth((u - 0.72) / 0.28));
      s = lerp(0.42, S_OUT, backOut(clamp(u / 0.5))); sq = 1 + 0.22 * bump(u); lookZ = 0.2;
    } else {
      const tau = T - T_LAND; let hop = 0;
      sq = 1 - 0.28 * Math.exp(-7 * tau) * Math.cos(19 * tau);
      lookZ = -0.55 + 0.5 * Math.max(0, Math.sin(T * 0.9)); lookY = 0.5 * Math.sin(T * 0.6);
      if (tk >= 0) { const b = bump((T - tc) / 0.34); hop = 0.016 * b; sq *= 1 + 0.08 * b - 0.1 * bump((T - tc + 0.12) / 0.12); }
      else if (T >= T_END) { const w = T - T_END - 0.25; if (w > 0) { joy = lerp(1, 0.45, smooth((w - 2.6) / 1.2)); lookZ = 0.3; lookY = 0; if (w < 2.4) { const b = Math.abs(Math.sin(w * Math.PI / 0.6)); hop = 0.05 * b; sq *= 0.9 + 0.2 * b; turn = easeIO(w / 1.2) * 2 * Math.PI; } else turn = 0; } }
      const id = LOOPL ? idl : T - T_LOOP;
      if (id > 0) {
        const P = 5.2, n = Math.floor(id / P), c = id - n * P, on = smooth(id / 1.2), big = n % 3 === 2;
        const h1 = bump((c - 1.6) / 0.5), h2 = big ? bump((c - 2.16) / 0.5) : 0, h = Math.max(h1, h2);
        hop = (big ? 0.06 : 0.046) * h;
        sq *= (1 + 0.13 * h) * (1 - 0.13 * bump((c - 1.46) / 0.14)) * (1 - 0.1 * bump((c - (big ? 2.66 : 2.1)) / 0.18));
        joy = Math.max(joy, 0.45 + 0.5 * h);
        lookY = on * 0.6 * Math.sin(id * 0.7); lookZ = 0.3 + on * 0.18 * Math.sin(id * 0.43 + 1);
        turn = on * 0.3 * Math.sin(id * 0.55) + (big ? easeIO((c - 1.6) / 1.06) * 2 * Math.PI : 0);
        if (LOOPL) { const w = 2 * Math.PI * id / LOOPL; lookY = 0.6 * Math.sin(2 * w); lookZ = 0.3 + 0.18 * Math.sin(w); turn = 0.3 * Math.sin(w) + (big ? easeIO((c - 1.6) / 1.06) * 2 * Math.PI : 0); blink = ((id + 2) % (LOOPL / 4)) < 0.12 ? 0.12 : 1; }
      }
      hero.quaternion.copy(pod.quaternion); hero.rotateZ(turn);
      // lean against the arm's motion, like a passenger
      eefAt(frame + 0.7, v1); eefAt(frame - 0.7, p0); v1.sub(p0); v1.z = 0; const spd = v1.length();
      if (spd > 1e-5) { jumpCtl.set(-v1.y, v1.x, 0).normalize(); q2.setFromAxisAngle(jumpCtl, -Math.min(0.2, spd * 9)); hero.quaternion.premultiply(q2); }
      sq *= 1 + 0.012 * Math.sin(T * 2.3);
      hero.position.copy(v2).addScaledVector(v1.set(0, 0, 1).applyQuaternion(pod.quaternion), hop);
    }
    hero.scale.set(s / Math.sqrt(sq), s / Math.sqrt(sq), s * sq);
    faceEgg(hero, lookY, lookZ, blink, joy);

    const rt = (T - T_CROSS + 0.04) / 0.55; ripple.visible = rt > 0 && rt < 1; if (ripple.visible) { const e = 1 - Math.pow(1 - rt, 2.4); ripple.scale.set(0.02 + 0.2 * e, 0.02 + 0.2 * e, 1 - rt); ripple.material.opacity = 1 - rt; }
    // glass confetti
    const bt = (T - T_CROSS) / 1.2;
    for (let i = 0; i < NB; i++) {
      if (bt <= 0 || bt >= 1) { dummy.scale.setScalar(0); dummy.position.copy(scrCenter); }
      else {
        const a = rnd(i) * 6.283, e2 = (rnd(i + 50) - 0.35) * 1.4, spd = 0.1 + 0.22 * rnd(i + 99), e = 1 - Math.pow(1 - bt, 2.2);
        v1.set(Math.cos(a) * Math.cos(e2), Math.sin(a) * Math.cos(e2), Math.sin(e2)).multiplyScalar(0.55).addScaledVector(nrm, 0.8).normalize();
        dummy.position.copy(scrCenter).addScaledVector(v1, spd * e); dummy.position.z -= 0.24 * bt * bt;
        dummy.rotation.set(bt * 9 * rnd(i + 7), bt * 7 * rnd(i + 13), i); dummy.scale.setScalar((1 - bt) * (0.6 + rnd(i + 3)));
      }
      dummy.updateMatrix(); burst.setMatrixAt(i, dummy.matrix);
    }
    burst.instanceMatrix.needsUpdate = true; dummy.rotation.set(0, 0, 0);
    paintDom(T);
  }

  // ---------- loop + controls ----------
  let T = qs.has('t') ? parseFloat(qs.get('t')) : 0, playing = !qs.has('paused'), last = performance.now(), visible = true;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches && !qs.has('t')) { T = T_END + 3; playing = false; }
  const ppIcon = $('pp-i'), pp = $('pp');
  const syncBtn = () => { ppIcon.setAttribute('d', playing ? 'M3 1h3v12H3zM8 1h3v12H8z' : 'M3 1l9 6-9 6z'); pp.setAttribute('aria-label', playing ? 'Pause' : 'Play'); };
  pp.addEventListener('click', () => { playing = !playing; if (playing && T >= T_LOOP - 0.05) T = 0; last = performance.now(); dirty = true; syncBtn(); });
  $('rp').addEventListener('click', () => { T = 0; playing = true; dirty = true; syncBtn(); });
  const seek = (ev) => { const r = el.track.getBoundingClientRect(); T = clamp((ev.clientX - r.left) / r.width) * T_LOOP; dirty = true; };
  let drag = false;
  el.track.addEventListener('pointerdown', (e) => { drag = true; el.track.setPointerCapture(e.pointerId); seek(e); });
  el.track.addEventListener('pointermove', (e) => drag && seek(e));
  el.track.addEventListener('pointerup', () => (drag = false));
  el.track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') T = Math.min(T_LOOP - 0.01, T + 1); else if (e.key === 'ArrowLeft') T = Math.max(0, T - 1); else return; dirty = true; e.preventDefault(); });
  let lw = 0, lh = 0, prCap = 2, slow = 0, lastNow = 0, endedOnce = false;
  function resize(force) {
    // in the pinned layout the stage shrinks with scrolling but keeps the viewport's shape, so render once at viewport size
    const full = stage.dataset.full === '1', w = full ? document.documentElement.clientWidth : stage.clientWidth, h = full ? window.innerHeight : stage.clientHeight;
    if (!w || !h || (w === lw && h === lh && !force)) return; lw = w; lh = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, prCap, small || full ? 1.5 : 2));
    const pr = renderer.getPixelRatio();
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); }
    const rw = Math.min(1800, Math.round(Math.max(w * pr, h * pr * OW / OH))); composerA.setPixelRatio(1); composerA.setSize(rw, Math.round(rw * OH / OW));
    dirty = true;
  }
  new ResizeObserver(() => resize()).observe(stage); window.addEventListener('resize', () => resize()); window.addEventListener('hero-layout', () => resize()); resize();
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; last = performance.now(); }, { threshold: 0.05 }).observe(stage);
  document.addEventListener('visibilitychange', () => (last = performance.now()));
  syncBtn();
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches, held = qs.has('paused'); let idle = 0, idleFlip = false;   // ?paused pins the clock for frame-exact capture, so no idle drift there
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (playing && visible && !document.hidden && lastNow) { slow = now - lastNow > 30 ? slow + 1 : Math.max(0, slow - 2); if (slow > 70) { slow = 0; if (prCap > 1) { prCap = 1; resize(true); } else if (!aoOff) aoOff = true; } }
    lastNow = now;
    if (!visible || document.hidden) return;
    if (playing && !drag) { const before = T; T += dt; if (before < T_END + 3.4 && T >= T_END + 3.4 && !endedOnce) { endedOnce = true; window.dispatchEvent(new Event('hero-ended')); } if (T >= T_LOOP) { T = T_LOOP - 0.001; playing = false; syncBtn(); } dirty = true; idle = 0; }
    else if (!drag && !calm && !held && T >= T_LOOP - 0.01) { idle += dt; if ((idleFlip = !idleFlip)) dirty = true; }
    else idle = 0;
    if (!dirty) return; dirty = false;
    evaluate(T + idle); render();
  }
  evaluate(T); render();
  stage.classList.add('ready');
  window.__hero = { ready: true, seek: (t) => { T = t; evaluate(T); render(); }, T_END, T_LOOP, dbg: { THREE, scene, sceneA, camera, camA } };
  requestAnimationFrame(tick);
}

function fail(msg) { const t = document.getElementById('load-t'); if (t) t.textContent = msg; document.querySelectorAll('.ov').forEach((o) => (o.style.display = 'none')); }
main().catch((e) => { console.error(e); fail('Could not load the 3D replay'); });
