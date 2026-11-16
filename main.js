import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ---------------- page chrome ---------------- */
const nav = document.getElementById('nav');
const menuBtn = document.querySelector('.menu-btn');
const mm = document.getElementById('mobileMenu');
menuBtn.addEventListener('click', () => {
  const open = mm.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});
mm.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { mm.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); }));
document.getElementById('yr').textContent = new Date().getFullYear();

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .08, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 80 + 'ms'; io.observe(el); });

document.getElementById('qform').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, note = f.querySelector('.form-note');
  if (!f.name.value.trim() || !f.email.value.includes('@')) { note.textContent = 'Please add your name and a valid email.'; return; }
  note.textContent = 'Thanks! This is a concept site, so nothing was sent. On the live site this goes straight to the Brookview team.';
  f.reset();
});

/* ---------------- tour state ---------------- */
const tour = document.getElementById('tour');
const steps = [...document.querySelectorAll('.tour .step')];
const railItems = [...document.querySelectorAll('.rail li')];
const cue = document.querySelector('.scroll-cue');
const N = 7;
let progress = 0, activeStep = -1;

function readScroll() {
  const r = tour.getBoundingClientRect();
  const total = r.height - innerHeight;
  progress = Math.min(1, Math.max(0, -r.top / total));
  const idx = Math.round(progress * (N - 1));
  if (idx !== activeStep) {
    activeStep = idx;
    steps.forEach(s => s.classList.toggle('active', +s.dataset.step === idx));
    railItems.forEach((li, i) => li.classList.toggle('active', i === idx));
  }
  cue.classList.toggle('hide', progress > 0.02);
  nav.classList.toggle('scrolled', scrollY > 40);
}
addEventListener('scroll', readScroll, { passive: true });
readScroll();
railItems.forEach(li => li.addEventListener('click', () => {
  const i = +li.dataset.go;
  const total = tour.offsetHeight - innerHeight;
  scrollTo({ top: tour.offsetTop + total * (i / (N - 1)) + 2, behavior: 'smooth' });
}));

const toggles = { lights: true, hazards: false, xray: false };
document.querySelectorAll('.tgl').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.toggle;
  toggles[k] = !toggles[k];
  if (k === 'hazards' && toggles.hazards) toggles.lights = true;
  document.querySelectorAll('.tgl').forEach(x => { x.classList.toggle('on', toggles[x.dataset.toggle]); x.setAttribute('aria-pressed', toggles[x.dataset.toggle]); });
}));

/* ---------------- three.js ---------------- */
const canvas = document.getElementById('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  document.querySelector('.fallback').hidden = false;
  throw err;
}
const isMobile = matchMedia('(max-width:720px)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07090d);
scene.fog = new THREE.Fog(0x07090d, 18, 42);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

/* lighting */
scene.add(new THREE.HemisphereLight(0x8fa6c8, 0x0a0a0a, 0.35));
const moon = new THREE.DirectionalLight(0xbcd0ff, 1.1);
moon.position.set(6, 12, 8);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
moon.shadow.bias = -0.0005;
scene.add(moon);
const rim = new THREE.DirectionalLight(0xff8a3a, 1.4);
rim.position.set(-10, 4, -8);
scene.add(rim);

/* ground */
const groundTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grd.addColorStop(0, '#1a2130'); grd.addColorStop(0.55, '#0c1018'); grd.addColorStop(1, '#07090d');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1;
  for (let i = 0; i <= 512; i += 21.33) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const ground = new THREE.Mesh(new THREE.CircleGeometry(24, 64), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.55, metalness: 0.35 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

/* ---------------- trailer ---------------- */
const trailer = new THREE.Group();
scene.add(trailer);

const steelMat = new THREE.MeshPhysicalMaterial({ color: 0xc3cad4, metalness: 0.92, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, transparent: true, side: THREE.DoubleSide });
const panelMat = new THREE.MeshStandardMaterial({ color: 0xaab2bf, metalness: 0.85, roughness: 0.35, transparent: true });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: 0.4, roughness: 0.6, transparent: true });
const frameMat = new THREE.MeshStandardMaterial({ color: 0x1b1f26, metalness: 0.6, roughness: 0.5 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.9 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xe4e8ee, metalness: 1, roughness: 0.15 });
const fadeMats = [steelMat, panelMat, darkMat];

const lampMat = {
  amber: new THREE.MeshStandardMaterial({ color: 0x3a1f00, emissive: 0xff9a1f, emissiveIntensity: 0, roughness: 0.3 }),
  red: new THREE.MeshStandardMaterial({ color: 0x300404, emissive: 0xff1e1e, emissiveIntensity: 0, roughness: 0.3 }),
  white: new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xfff1dc, emissiveIntensity: 0, roughness: 0.3 }),
  interior: new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xe9f1ff, emissiveIntensity: 0, roughness: 0.3 }),
};

function box(w, h, d, mat, x, y, z, parent = trailer) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function beam(a, b, t, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, t, t), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), B.clone().sub(A).normalize());
  m.castShadow = true; trailer.add(m); return m;
}

// body (V-nose enclosed)
const BASE = 0.9, H = 2.15, L0 = -3, L1 = 3, NOSE = 3.7, W = 1.2;
{
  const s = new THREE.Shape();
  s.moveTo(L0, -W); s.lineTo(L1, -W); s.lineTo(NOSE, 0); s.lineTo(L1, W); s.lineTo(L0, W); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 4 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, BASE, 0);
  const body = new THREE.Mesh(g, steelMat);
  body.castShadow = true; body.receiveShadow = true;
  trailer.add(body);
}
const TOP = BASE + H + 0.05, BOT = BASE - 0.05, ZS = W + 0.05;

// skirt trim
box(6.1, 0.24, 0.02, darkMat, 0, BOT + 0.12, ZS + 0.01);
box(6.1, 0.24, 0.02, darkMat, 0, BOT + 0.12, -ZS - 0.01);
// top trim
box(6.1, 0.06, 0.02, panelMat, 0, TOP - 0.03, ZS + 0.01);
box(6.1, 0.06, 0.02, panelMat, 0, TOP - 0.03, -ZS - 0.01);
// rear ramp door + frame
box(0.03, 2.0, 2.3, panelMat, L0 - 0.065, BASE + 1.03, 0);
box(0.05, 0.05, 2.4, darkMat, L0 - 0.08, BASE + 0.03, 0);
[-1, 1].forEach(sd => box(0.05, 2.1, 0.06, darkMat, L0 - 0.08, BASE + 1.05, sd * 1.18));
box(0.05, 0.12, 2.4, darkMat, L0 - 0.08, TOP - 0.1, 0);
// ramp latches
[-0.7, 0.7].forEach(z => box(0.06, 0.4, 0.05, rimMat, L0 - 0.1, BASE + 1.0, z));
// side door (curb side +z)
box(0.95, 1.85, 0.03, panelMat, 1.9, BASE + 1.0, ZS + 0.02);
box(0.06, 0.18, 0.04, rimMat, 1.5, BASE + 1.05, ZS + 0.05);
// stone guard on nose
{
  const sg = new THREE.Shape();
  sg.moveTo(L1 - 0.02, -W - 0.06); sg.lineTo(NOSE + 0.06, 0); sg.lineTo(L1 - 0.02, W + 0.06); sg.lineTo(L1 - 0.1, W + 0.06); sg.lineTo(NOSE - 0.02, 0); sg.lineTo(L1 - 0.1, -W - 0.06); sg.closePath();
  const g = new THREE.ExtrudeGeometry(sg, { depth: 0.55, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); g.translate(0, BOT, 0);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9aa2ad, metalness: 1, roughness: 0.4, transparent: true }));
  fadeMats.push(m.material);
  trailer.add(m);
}

// decals
function decalTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ff7a1a';
  g.beginPath(); g.moveTo(0, 200); g.lineTo(1024, 150); g.lineTo(1024, 172); g.lineTo(0, 232); g.fill();
  g.fillStyle = '#0b111c';
  g.beginPath(); g.moveTo(0, 236); g.lineTo(1024, 178); g.lineTo(1024, 192); g.lineTo(0, 252); g.fill();
  g.font = '800 118px "Barlow Condensed", Arial Narrow, sans-serif';
  g.fillStyle = '#0b111c'; g.fillText('BROOKVIEW', 24, 118);
  g.font = '600 40px "Barlow Condensed", Arial Narrow, sans-serif';
  g.fillStyle = '#ff7a1a'; g.fillText('INDUSTRIES  ·  PRECISION TRAILER WIRING', 28, 168);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const decalMat = new THREE.MeshStandardMaterial({ map: decalTex(), transparent: true, roughness: 0.4, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2 });
fadeMats.push(decalMat);
document.fonts && document.fonts.ready.then(() => { decalMat.map = decalTex(); decalMat.needsUpdate = true; });
{
  const g = new THREE.PlaneGeometry(3.6, 0.9);
  const a = new THREE.Mesh(g, decalMat); a.position.set(-0.75, BASE + 1.25, ZS + 0.012); trailer.add(a);
  const b = new THREE.Mesh(g, decalMat); b.rotation.y = Math.PI; b.position.set(0.2, BASE + 1.25, -ZS - 0.012); trailer.add(b);
}

// chassis
[-0.9, 0.9].forEach(z => box(6.3, 0.14, 0.08, frameMat, 0, 0.8, z));
for (let x = -2.8; x <= 2.8; x += 0.8) box(0.06, 0.1, 1.8, frameMat, x, 0.8, 0);
beam([3.0, 0.78, -0.9], [4.62, 0.62, -0.05], 0.12, frameMat);
beam([3.0, 0.78, 0.9], [4.62, 0.62, 0.05], 0.12, frameMat);
box(0.4, 0.14, 0.18, frameMat, 4.72, 0.6, 0);
{ const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), frameMat); ball.rotation.x = Math.PI; ball.position.set(4.86, 0.56, 0); trailer.add(ball); }
// jack
{ const j = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 16), rimMat); j.position.set(4.3, 0.55, 0.42); trailer.add(j);
  const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), frameMat); ft.position.set(4.3, 0.08, 0.42); trailer.add(ft);
  box(0.04, 0.04, 0.22, rimMat, 4.3, 1.02, 0.52); }
// axles + wheels + fenders
const wheels = [];
[-0.75, 0.2].forEach(x => {
  box(0.08, 0.08, 2.1, frameMat, x, 0.38, 0);
  [-1, 1].forEach(sd => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 40), tireMat); tire.rotation.x = Math.PI / 2; tire.castShadow = true;
    const rm = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.23, 24), rimMat); rm.rotation.x = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 12), frameMat); hub.rotation.x = Math.PI / 2;
    w.add(tire, rm, hub); w.position.set(x, 0.36, sd * 1.0); trailer.add(w); wheels.push(w);
  });
});
// flat diamond-plate fender bars
[-1, 1].forEach(sd => box(1.9, 0.05, 0.3, rimMat, -0.275, BOT - 0.02, sd * 1.12));

// tongue gear: battery box, breakaway, junction
const batt = box(0.34, 0.28, 0.24, darkMat, 3.95, 0.87, 0.36);
box(0.35, 0.03, 0.25, new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0x401800 }), 3.95, 1.02, 0.36);
const brk = box(0.1, 0.12, 0.08, darkMat, 4.18, 0.78, -0.36);
const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 0.6 })); pin.rotation.z = Math.PI / 2; pin.position.set(4.25, 0.78, -0.36); trailer.add(pin);
box(0.14, 0.1, 0.1, darkMat, 3.82, 0.8, -0.2); // junction box

/* lights */
const lampList = [];
function lamp(kind, geo, x, y, z, rot) {
  const m = new THREE.Mesh(geo, lampMat[kind]);
  m.position.set(x, y, z); if (rot) m.rotation.set(...rot);
  trailer.add(m); lampList.push(m); return m;
}
const markerG = new THREE.BoxGeometry(0.14, 0.07, 0.03);
const discG = new THREE.CylinderGeometry(0.085, 0.085, 0.035, 28);
const smallDiscG = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20);
// upper side clearance markers
[-2.6, -1, 0.8, 2.5].forEach(x => [-1, 1].forEach(sd => lamp(x < -2 ? 'red' : 'amber', markerG, x, TOP - 0.13, sd * (ZS + 0.025))));
// lower side markers
[[-2.75, 'red'], [-0.27, 'amber'], [2.75, 'amber']].forEach(([x, k]) => [-1, 1].forEach(sd => lamp(k, markerG, x, BOT + 0.12, sd * (ZS + 0.03))));
// front clearance on nose
[-1, 1].forEach(sd => lamp('amber', smallDiscG, 3.32, TOP - 0.13, sd * 0.68, [0, sd * 0.6, Math.PI / 2]));
// rear ID bar + corners
[-0.25, 0, 0.25].forEach(z => lamp('red', smallDiscG, L0 - 0.1, TOP - 0.18, z, [0, 0, Math.PI / 2]));
[-1, 1].forEach(sd => lamp('red', smallDiscG, L0 - 0.1, TOP - 0.18, sd * 1.05, [0, 0, Math.PI / 2]));
// tail / stop / turn + reverse
[-1, 1].forEach(sd => {
  lamp('red', discG, L0 - 0.11, BASE + 0.32, sd * 0.98, [0, 0, Math.PI / 2]);
  lamp('red', discG, L0 - 0.11, BASE + 0.32, sd * 0.76, [0, 0, Math.PI / 2]);
  lamp('white', smallDiscG, L0 - 0.11, BASE + 0.32, sd * 0.56, [0, 0, Math.PI / 2]);
});
lamp('white', new THREE.BoxGeometry(0.03, 0.04, 0.22), L0 - 0.11, BASE + 0.55, 0);
// licence plate
box(0.02, 0.17, 0.32, new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.5 }), L0 - 0.1, BASE + 0.42, 0);
// porch light over side door
lamp('white', new THREE.BoxGeometry(0.22, 0.06, 0.05), 1.9, BASE + 2.03, ZS + 0.05);
// interior LED strips + floor
lamp('interior', new THREE.BoxGeometry(5.6, 0.025, 0.05), -0.1, TOP - 0.1, 0.6);
lamp('interior', new THREE.BoxGeometry(5.6, 0.025, 0.05), -0.1, TOP - 0.1, -0.6);
box(6.0, 0.02, 2.35, new THREE.MeshStandardMaterial({ color: 0x3a2f24, roughness: 0.9 }), 0, BASE + 0.01, 0);
box(0.04, 0.14, 0.09, new THREE.MeshStandardMaterial({ color: 0xf0f0f0 }), 1.25, BASE + 1.25, W - 0.04); // switch panel

// point lights for spill
const spill = [];
function spillLight(kind, color, int, dist, x, y, z) { const l = new THREE.PointLight(color, 0, dist, 2); l.position.set(x, y, z); trailer.add(l); spill.push({ l, kind, int }); }
spillLight('red', 0xff2020, 6, 5, L0 - 0.6, BASE + 0.3, 0.8);
spillLight('red', 0xff2020, 6, 5, L0 - 0.6, BASE + 0.3, -0.8);
spillLight('amber', 0xff9a1f, 3, 4, 0.5, TOP - 0.2, ZS + 0.5);
spillLight('amber', 0xff9a1f, 3, 4, 0.5, TOP - 0.2, -ZS - 0.5);
spillLight('interior', 0xdfe9ff, 9, 6, 0, TOP - 0.4, 0);
const porch = new THREE.SpotLight(0xffe6c4, 0, 7, 0.75, 0.6, 1.5);
porch.position.set(1.9, BASE + 2.0, ZS + 0.3); porch.target.position.set(1.9, 0, ZS + 2.2);
trailer.add(porch, porch.target);
spill.push({ l: porch, kind: 'white', int: 18 });

/* harness */
const pulseTex = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 4;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 256, 0);
  grd.addColorStop(0, '#000'); grd.addColorStop(0.7, '#2a1000'); grd.addColorStop(0.92, '#ffb066'); grd.addColorStop(1, '#000');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 4);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
const harnessMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6, emissive: 0xff7a1a, emissiveMap: pulseTex, emissiveIntensity: 0.6 });
const harnessBase = new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.55, emissive: 0xff5a00, emissiveIntensity: 0 });
function wire(pts, r = 0.022, reps = 6) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const len = curve.getLength();
  const g = new THREE.TubeGeometry(curve, Math.max(40, Math.round(len * 40)), r, 8, false);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 1.6);
  const m = new THREE.Mesh(g, harnessMat); m.renderOrder = 2; trailer.add(m);
  return m;
}
const harness = [
  wire([[4.74, 0.48, -0.22], [4.55, 0.6, -0.2], [4.2, 0.66, -0.36], [3.82, 0.74, -0.25], [3.3, 0.74, -0.7], [2.5, 0.73, -0.82], [-2.9, 0.73, -0.82], [-3.0, 1.0, -0.86], [-3.02, 1.22, -0.86]]),
  wire([[3.82, 0.74, -0.2], [3.4, 0.74, 0.3], [2.8, 0.73, 0.82], [-2.9, 0.73, 0.82], [-3.0, 1.0, 0.86], [-3.02, 1.22, 0.86]]),
  wire([[-3.02, 1.22, -1.0], [-3.02, 1.22, 1.0]]),
  wire([[-3.02, 1.22, -1.1], [-3.0, 2.0, -1.12], [-2.98, 2.9, -1.12], [-2.96, 2.9, 0], [-2.98, 2.9, 1.12], [-3.0, 2.0, 1.12], [-3.02, 1.22, 1.1]]),
  wire([[-2.96, 2.9, 1.12], [3.0, 2.9, 1.12], [3.5, 2.9, 0.4]]),
  wire([[-2.96, 2.9, -1.12], [3.0, 2.9, -1.12], [3.5, 2.9, -0.4]]),
  wire([[-2.9, 0.95, 1.14], [2.8, 0.95, 1.14]]),
  wire([[-2.9, 0.95, -1.14], [2.8, 0.95, -1.14]]),
  wire([[3.95, 0.98, 0.36], [3.6, 0.95, 0.3], [3.3, 1.2, 0.3], [3.25, 2.6, 0.4], [2.8, 2.92, 0.6]], 0.026),
  wire([[4.18, 0.76, -0.36], [4.0, 0.74, -0.3], [3.82, 0.78, -0.2]], 0.018),
];
// breakaway lanyard
const lanyard = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[4.25, 0.78, -0.36], [4.5, 0.5, -0.33], [4.72, 0.42, -0.2], [4.86, 0.52, -0.08]].map(p => new THREE.Vector3(...p))), 40, 0.008, 6), new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 0.3 }));
trailer.add(lanyard);
// 7-way plug end
const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.14, 20), darkMat);
plug.rotation.z = Math.PI / 2 - 0.4; plug.position.set(4.8, 0.45, -0.22); trailer.add(plug);
const plugRing = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.01, 8, 28), new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff7a1a, emissiveIntensity: 1 }));
plugRing.rotation.y = Math.PI / 2; plugRing.rotation.x = 0.4; plugRing.position.set(4.86, 0.48, -0.22); trailer.add(plugRing);

// focus halos
function halo(x, y, z, r) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  m.position.set(x, y, z); m.rotation.x = Math.PI / 2; trailer.add(m); return m;
}
const halos = { breakaway: halo(4.2, 0.62, -0.36, 0.22), plug: halo(4.8, 0.3, -0.22, 0.2), power: halo(3.95, 0.68, 0.36, 0.3) };

trailer.position.x = -0.6;

/* ---------------- post ---------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------------- camera keyframes ---------------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KF = [
  { pos: V(10.5, 3.6, 10.5), tgt: V(-1.0, 1.5, 0),  xray: 0,   harness: .35, focus: {} },          // hero
  { pos: V(3.5, 8.2, 8.6),  tgt: V(0.2, 1.3, 0),   xray: 1,   harness: 1,   focus: {} },          // harness
  { pos: V(-10.5, 2.0, 4.6),tgt: V(-3.2, 1.6, 0),  xray: 0,   harness: .3,  focus: {} },          // LED rear
  { pos: V(6.3, 2.0, -3.6), tgt: V(3.6, 0.75, -0.2), xray: 0, harness: .5,  focus: { breakaway: 1 } }, // breakaway
  { pos: V(6.5, 1.2, 2.2),  tgt: V(4.0, 0.55, -0.1), xray: 0, harness: .9,  focus: { plug: 1 } },     // plug & play
  { pos: V(-2.5, 6.6, 7.2), tgt: V(0.6, 1.8, 0),   xray: .85, harness: .7,  focus: { power: 1 } },    // power/interior
  { pos: V(-8.8, 3.2, -9.6),tgt: V(-0.6, 1.5, 0),  xray: 0,   harness: .4,  focus: {} },          // complete
];

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/* drag to orbit */
let yawOff = 0, yawVel = 0, pitchOff = 0, dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.classList.add('dragging'); canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
  if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) return;
  yawVel = -dx * 0.006; yawOff += yawVel;
  if (e.pointerType !== 'touch') pitchOff = Math.max(-0.25, Math.min(0.35, pitchOff + dy * 0.003));
});
const endDrag = () => { dragging = false; canvas.classList.remove('dragging'); };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

/* state smoothing */
const S = { lights: 1, xray: 0, harness: .3, prog: 0, focus: { breakaway: 0, plug: 0, power: 0 } };
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3();
const clock = new THREE.Clock();

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  bloom.resolution.set(w, h);
  camera.aspect = w / h;
  // push the subject away from the copy: right on desktop, up on portrait
  if (w / h < 0.9) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
  else camera.setViewOffset(w, h, -w * 0.14, 0, w, h);
  camera.updateProjectionMatrix();
}
const distScale = () => { const a = camera.aspect; return a < 1 ? Math.min(2.4, 1.05 / a) : a < 1.3 ? 1.2 : 1; };
addEventListener('resize', resize); resize();

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(tour);

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  const k = 1 - Math.exp(-dt * 4);

  S.prog = lerp(S.prog, progress, 1 - Math.exp(-dt * 6));
  const seg = S.prog * (N - 1);
  const i = Math.min(N - 2, Math.floor(seg)), f = seg - i, e = ss(0.18, 0.82, f);
  const A = KF[i], B = KF[i + 1];
  tmpP.lerpVectors(A.pos, B.pos, e); tmpT.lerpVectors(A.tgt, B.tgt, e);

  // auto orbit on intro + finale
  const wIntro = 1 - Math.min(1, seg), wEnd = Math.max(0, seg - (N - 2));
  const auto = Math.sin(t * 0.18) * 0.55 * wIntro + t * 0.12 * wEnd;
  if (!dragging) { yawOff *= Math.pow(0.35, dt); pitchOff *= Math.pow(0.4, dt); }
  const yaw = auto + yawOff;
  const off = tmpP.clone().sub(tmpT).multiplyScalar(distScale());
  off.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  off.y += pitchOff * off.length();
  camPos.copy(tmpT).add(off); camTgt.copy(tmpT);
  camera.position.copy(camPos); camera.lookAt(camTgt);

  // state targets
  const xrayT = toggles.xray ? 1 : lerp(A.xray, B.xray, e);
  S.xray = lerp(S.xray, xrayT, k);
  S.lights = lerp(S.lights, toggles.lights ? 1 : 0, k);
  S.harness = lerp(S.harness, lerp(A.harness, B.harness, e), k);
  for (const key of ['breakaway', 'plug', 'power']) S.focus[key] = lerp(S.focus[key], lerp(A.focus[key] || 0, B.focus[key] || 0, e), k);

  // body fade
  const op = 1 - S.xray * 0.85;
  fadeMats.forEach(m => { m.opacity = op; m.depthWrite = op > 0.95; });

  // lamps
  const L = S.lights;
  const hazard = toggles.hazards ? (Math.sin(t * 9) > 0 ? 1 : 0.06) : 1;
  lampMat.amber.emissiveIntensity = 3.4 * L * hazard;
  lampMat.red.emissiveIntensity = 4.5 * L;
  lampMat.white.emissiveIntensity = 3.2 * L;
  lampMat.interior.emissiveIntensity = (2.2 + 2.5 * S.xray) * L;
  spill.forEach(s => {
    let v = s.int * L;
    if (s.kind === 'amber') v *= hazard;
    if (s.kind === 'interior') v *= S.xray;
    s.l.intensity = v;
  });

  // harness pulse
  pulseTex.offset.x = -t * 0.9;
  harnessMat.emissiveIntensity = 0.25 + S.harness * 3.2;

  // halos
  for (const [key, h] of Object.entries(halos)) {
    const v = S.focus[key];
    h.material.opacity = v * (0.55 + 0.45 * Math.sin(t * 4));
    const sc = 1 + ((t * 0.8) % 1) * 0.6 * v;
    h.scale.setScalar(sc);
  }
  plugRing.material.emissiveIntensity = 1 + S.focus.plug * 4 * (0.6 + 0.4 * Math.sin(t * 5));
  pin.material.emissiveIntensity = 0.6 + S.focus.breakaway * 5 * (0.6 + 0.4 * Math.sin(t * 6));

  bloom.strength = 0.75 + 0.35 * L;
  composer.render();
}
frame();
