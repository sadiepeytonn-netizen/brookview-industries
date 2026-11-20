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


/* ---------------- hero state ---------------- */
const tour = document.getElementById('tour');
const cue = document.querySelector('.scroll-cue');
const tabs = [...document.querySelectorAll('.kind-tabs button')];
const kindTexts = [...document.querySelectorAll('.kind-text')];
const kindWords = document.querySelector('.kind-words');
let progress = 0, kind = 0;
function setKind(k) {
  if (k === kind) return;
  kind = k;
  tabs.forEach((b, i) => { b.classList.toggle('on', i === k); b.setAttribute('aria-selected', i === k); });
  kindTexts.forEach((p, i) => p.classList.toggle('on', i === k));
  kindWords.dataset.kind = k;
}
let lastY = scrollY, dirn = 1, settleT;
function readScroll() {
  const r = tour.getBoundingClientRect();
  const total = Math.max(1, r.height - innerHeight);
  progress = Math.min(1, Math.max(0, -r.top / total));
  const y = scrollY; if (y !== lastY) dirn = Math.sign(y - lastY); lastY = y;
  if (dirn > 0 && progress > 0.04) setKind(1);
  if (dirn < 0 && progress < 0.96) setKind(0);
  cue.querySelector('span').textContent = kind ? 'Scroll to explore' : 'Scroll for open trailers';
  cue.classList.toggle('hide', progress > 0.98);
  nav.classList.toggle('scrolled', scrollY > 40);
  // settle: never rest between the two trailer views
  clearTimeout(settleT);
  if (progress > 0.001 && progress < 0.999) settleT = setTimeout(() => {
    const top = tour.offsetTop, tot = tour.offsetHeight - innerHeight;
    const p = (scrollY - top) / tot;
    if (p > 0.001 && p < 0.999) scrollTo({ top: top + (dirn > 0 ? tot : 0), behavior: 'smooth' });
  }, 140);
}
addEventListener('scroll', readScroll, { passive: true });
readScroll();
tabs.forEach((b, i) => b.addEventListener('click', () => {
  const total = tour.offsetHeight - innerHeight;
  scrollTo({ top: tour.offsetTop + total * i, behavior: 'smooth' });
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
scene.fog = new THREE.Fog(0x07090d, 26, 60);
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


/* ---------------- enclosed trailer ---------------- */
const trailer = new THREE.Group();
const encPivot = new THREE.Group();
encPivot.add(trailer); scene.add(encPivot);
trailer.position.x = -0.9;
let G = trailer;


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

function box(w, h, d, mat, x, y, z, parent = G) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function beam(a, b, t, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, t, t), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), B.clone().sub(A).normalize());
  m.castShadow = true; G.add(m); return m;
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
  G.add(body);
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
  G.add(m);
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
  const a = new THREE.Mesh(g, decalMat); a.position.set(-0.75, BASE + 1.25, ZS + 0.012); G.add(a);
  const b = new THREE.Mesh(g, decalMat); b.rotation.y = Math.PI; b.position.set(0.2, BASE + 1.25, -ZS - 0.012); G.add(b);
}

// chassis
[-0.9, 0.9].forEach(z => box(6.3, 0.14, 0.08, frameMat, 0, 0.8, z));
for (let x = -2.8; x <= 2.8; x += 0.8) box(0.06, 0.1, 1.8, frameMat, x, 0.8, 0);
beam([3.0, 0.78, -0.9], [4.62, 0.62, -0.05], 0.12, frameMat);
beam([3.0, 0.78, 0.9], [4.62, 0.62, 0.05], 0.12, frameMat);
box(0.4, 0.14, 0.18, frameMat, 4.72, 0.6, 0);
{ const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), frameMat); ball.rotation.x = Math.PI; ball.position.set(4.86, 0.56, 0); G.add(ball); }
// jack
{ const j = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 16), rimMat); j.position.set(4.3, 0.55, 0.42); G.add(j);
  const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), frameMat); ft.position.set(4.3, 0.08, 0.42); G.add(ft);
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
    w.add(tire, rm, hub); w.position.set(x, 0.36, sd * 1.0); G.add(w); wheels.push(w);
  });
});
// flat diamond-plate fender bars
[-1, 1].forEach(sd => box(1.9, 0.05, 0.3, rimMat, -0.275, BOT - 0.02, sd * 1.12));

// tongue gear: battery box, breakaway, junction
const batt = box(0.34, 0.28, 0.24, darkMat, 3.95, 0.87, 0.36);
box(0.35, 0.03, 0.25, new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0x401800 }), 3.95, 1.02, 0.36);
const brk = box(0.1, 0.12, 0.08, darkMat, 4.18, 0.78, -0.36);
const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 0.6 })); pin.rotation.z = Math.PI / 2; pin.position.set(4.25, 0.78, -0.36); G.add(pin);
box(0.14, 0.1, 0.1, darkMat, 3.82, 0.8, -0.2); // junction box

/* lights */
const lampList = [];
function lamp(kind, geo, x, y, z, rot) {
  const m = new THREE.Mesh(geo, lampMat[kind]);
  m.position.set(x, y, z); if (rot) m.rotation.set(...rot);
  G.add(m); lampList.push(m); return m;
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
function spillLight(kind, color, int, dist, x, y, z) { const l = new THREE.PointLight(color, 0, dist, 2); l.position.set(x, y, z); G.add(l); spill.push({ l, kind, int }); }
spillLight('red', 0xff2020, 6, 5, L0 - 0.6, BASE + 0.3, 0.8);
spillLight('red', 0xff2020, 6, 5, L0 - 0.6, BASE + 0.3, -0.8);
spillLight('amber', 0xff9a1f, 3, 4, 0.5, TOP - 0.2, ZS + 0.5);
spillLight('amber', 0xff9a1f, 3, 4, 0.5, TOP - 0.2, -ZS - 0.5);
spillLight('interior', 0xdfe9ff, 9, 6, 0, TOP - 0.4, 0);
const porch = new THREE.SpotLight(0xffe6c4, 0, 7, 0.75, 0.6, 1.5);
porch.position.set(1.9, BASE + 2.0, ZS + 0.3); porch.target.position.set(1.9, 0, ZS + 2.2);
G.add(porch, porch.target);
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
  const m = new THREE.Mesh(g, harnessMat); m.renderOrder = 2; G.add(m);
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
G.add(lanyard);
// 7-way plug end
const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.14, 20), darkMat);
plug.rotation.z = Math.PI / 2 - 0.4; plug.position.set(4.8, 0.45, -0.22); G.add(plug);
const plugRing = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.01, 8, 28), new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff7a1a, emissiveIntensity: 1 }));
plugRing.rotation.y = Math.PI / 2; plugRing.rotation.x = 0.4; plugRing.position.set(4.86, 0.48, -0.22); G.add(plugRing);

/* ---------------- open utility trailer ---------------- */
const openT = new THREE.Group();
const openPivot = new THREE.Group();
openPivot.add(openT); scene.add(openPivot);
openT.position.x = -0.7;
G = openT;

const blackMat = new THREE.MeshStandardMaterial({ color: 0x1c2027, metalness: 0.55, roughness: 0.42 });
const deckTex = (() => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  const planks = 8, ph = 256 / planks;
  for (let i = 0; i < planks; i++) {
    const tone = 70 + Math.random() * 25;
    g.fillStyle = `rgb(${tone + 40},${tone + 18},${tone - 10})`;
    g.fillRect(0, i * ph, 1024, ph);
    g.strokeStyle = 'rgba(0,0,0,.18)';
    for (let k = 0; k < 14; k++) { g.beginPath(); const y = i * ph + Math.random() * ph; g.moveTo(0, y); g.bezierCurveTo(300, y + 3, 700, y - 3, 1024, y + 1); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, i * ph, 1024, 2);
    const seam = 200 + Math.random() * 600; g.fillRect(seam, i * ph, 2, ph);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
})();
const deckMat = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.85, metalness: 0 });

const OL0 = -3, OL1 = 2.6, OW = 1.0, DECK = 0.78, RAIL = 1.3;
// frame + deck
[-1, 1].forEach(sd => box(OL1 - OL0, 0.16, 0.08, blackMat, (OL0 + OL1) / 2, DECK - 0.11, sd * (OW - 0.02)));
for (let x = OL0 + 0.1; x <= OL1; x += 0.7) box(0.06, 0.1, 2 * OW, blackMat, x, DECK - 0.1, 0);
box(0.1, 0.16, 2 * OW + 0.04, blackMat, OL0 - 0.02, DECK - 0.11, 0); // rear crossmember
box(OL1 - OL0, 0.05, 2 * OW - 0.04, deckMat, (OL0 + OL1) / 2, DECK, 0);
// side rails + stakes
[-1, 1].forEach(sd => {
  box(OL1 - OL0, 0.06, 0.06, blackMat, (OL0 + OL1) / 2, RAIL, sd * OW);
  box(OL1 - OL0, 0.04, 0.04, blackMat, (OL0 + OL1) / 2, (RAIL + DECK) / 2 + 0.05, sd * OW);
  for (let x = OL0; x <= OL1 + 0.01; x += (OL1 - OL0) / 7) box(0.06, RAIL - DECK, 0.06, blackMat, x, (RAIL + DECK) / 2, sd * OW);
});
// front rail with mesh
box(0.06, 0.06, 2 * OW, blackMat, OL1, RAIL + 0.25, 0);
[-1, 1].forEach(sd => box(0.06, 0.32, 0.06, blackMat, OL1, RAIL + 0.1, sd * OW));
for (let z = -OW + 0.12; z < OW; z += 0.12) box(0.015, 0.5, 0.015, blackMat, OL1, RAIL - 0.02, z);
// rear ramp gate (folded up)
const gate = new THREE.Group(); openT.add(gate);
gate.position.set(OL0 - 0.06, DECK + 0.02, 0); gate.rotation.z = 0.12;
box(0.06, 0.06, 2 * OW - 0.06, blackMat, 0, 0, 0, gate);
box(0.06, 0.06, 2 * OW - 0.06, blackMat, 0, 1.25, 0, gate);
[-1, 1].forEach(sd => box(0.06, 1.25, 0.06, blackMat, 0, 0.62, sd * (OW - 0.06), gate));
for (let z = -OW + 0.14; z < OW - 0.08; z += 0.11) box(0.018, 1.22, 0.018, blackMat, 0, 0.62, z, gate);
for (let y = 0.2; y < 1.2; y += 0.2) box(0.018, 0.018, 2 * OW - 0.1, blackMat, 0, y, 0, gate);
// tie-down rings
[-1, 1].forEach(sd => [-2.4, -0.5, 1.6].forEach(x => {
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), rimMat);
  r.position.set(x, DECK + 0.04, sd * (OW - 0.1)); r.rotation.x = Math.PI / 2; openT.add(r);
}));
// tongue
beam([OL1, DECK - 0.12, -0.92], [4.15, 0.52, -0.05], 0.12, blackMat);
beam([OL1, DECK - 0.12, 0.92], [4.15, 0.52, 0.05], 0.12, blackMat);
box(0.38, 0.13, 0.17, blackMat, 4.25, 0.5, 0);
{ const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), blackMat); ball.rotation.x = Math.PI; ball.position.set(4.4, 0.46, 0); openT.add(ball); }
{ const j = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 16), rimMat); j.position.set(3.55, 0.5, 0.42); openT.add(j);
  const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), blackMat); ft.position.set(3.55, 0.06, 0.42); openT.add(ft); }
// tandem axles, wheels, fenders
[-0.7, 0.25].forEach(x => {
  box(0.08, 0.08, 2.35, blackMat, x, 0.36, 0);
  [-1, 1].forEach(sd => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 40), tireMat); tire.rotation.x = Math.PI / 2; tire.castShadow = true;
    const rm = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.23, 24), rimMat); rm.rotation.x = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 12), blackMat); hub.rotation.x = Math.PI / 2;
    w.add(tire, rm, hub); w.position.set(x, 0.36, sd * 1.16); openT.add(w);
  });
});
const fenderMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, metalness: 0.8, roughness: 0.55, side: THREE.DoubleSide });
[-1, 1].forEach(sd => {
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 40, 1, true, -Math.PI / 2, Math.PI), fenderMat);
  f.rotation.x = -Math.PI / 2; f.scale.set(1.75, 1, 0.82); f.position.set(-0.225, 0.4, sd * 1.16); f.castShadow = true; openT.add(f);
  box(1.75, 0.03, 0.3, fenderMat, -0.225, 0.4, sd * 1.16); // fender lip
});
// tongue gear
box(0.32, 0.26, 0.22, darkMat, 3.25, DECK - 0.02, 0.4);
box(0.33, 0.03, 0.23, new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0x401800 }), 3.25, DECK + 0.12, 0.4);
box(0.1, 0.12, 0.08, darkMat, 3.75, 0.66, -0.4);
const oPin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8), pin.material); oPin.rotation.z = Math.PI / 2; oPin.position.set(3.82, 0.66, -0.4); openT.add(oPin);
openT.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[3.82, 0.66, -0.4], [4.05, 0.42, -0.3], [4.3, 0.36, -0.12], [4.42, 0.44, -0.05]].map(p => new THREE.Vector3(...p))), 40, 0.008, 6), lanyard.material));
// lights
const oY = DECK - 0.12;
[-1, 1].forEach(sd => {
  box(0.08, 0.05, 0.3, blackMat, OL0 - 0.06, oY, sd * 0.84);
  lamp('red', discG, OL0 - 0.12, oY + 0.02, sd * 0.88, [0, 0, Math.PI / 2]);
  lamp('red', smallDiscG, OL0 - 0.12, oY + 0.02, sd * 0.68, [0, 0, Math.PI / 2]);
  lamp('red', markerG, OL0 + 0.08, oY, sd * (OW + 0.05));
  lamp('amber', markerG, 0.66, 0.62, sd * 1.33, [0, 0, 0]);
  lamp('red', markerG, -1.12, 0.62, sd * 1.33, [0, 0, 0]);
  lamp('amber', markerG, OL1 - 0.08, oY, sd * (OW + 0.05));
  lamp('amber', smallDiscG, OL1 + 0.04, RAIL + 0.25, sd * (OW - 0.06), [0, 0, Math.PI / 2]);
});
box(0.02, 0.16, 0.3, new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.5 }), OL0 - 0.08, oY - 0.14, 0.32);
lamp('white', new THREE.BoxGeometry(0.04, 0.03, 0.12), OL0 - 0.1, oY - 0.04, 0.32);
// under-rail LED strips (accent)
[-1, 1].forEach(sd => lamp('amber', new THREE.BoxGeometry(OL1 - OL0 - 0.3, 0.015, 0.02), (OL0 + OL1) / 2, DECK - 0.2, sd * (OW + 0.045)));
spillLight('red', 0xff2020, 6, 5, OL0 - 0.7, oY, 0.8);
spillLight('red', 0xff2020, 6, 5, OL0 - 0.7, oY, -0.8);
// harness along the frame
[-1, 1].forEach(sd => wire([[3.75, 0.62, -0.3], [3.3, 0.62, sd * 0.45], [2.8, 0.64, sd * 0.85], [OL1 - 0.1, 0.64, sd * (OW + 0.05)], [OL0 + 0.15, 0.64, sd * (OW + 0.05)], [OL0 - 0.05, oY - 0.02, sd * 0.88]]));
wire([[OL0 - 0.04, oY - 0.05, -0.88], [OL0 - 0.04, oY - 0.06, 0.88]]);
[-1, 1].forEach(sd => wire([[0.66, 0.64, sd * (OW + 0.05)], [0.66, 0.62, sd * 1.3]], 0.014));
wire([[4.42, 0.4, -0.15], [4.2, 0.5, -0.22], [3.95, 0.6, -0.32], [3.75, 0.62, -0.3]]);
wire([[3.25, DECK + 0.1, 0.4], [3.05, 0.66, 0.3], [3.3, 0.62, 0.0], [3.75, 0.62, -0.3]], 0.02);
const oPlug = plug.clone(); oPlug.position.set(4.45, 0.38, -0.15); openT.add(oPlug);

/* ---------------- callout tags ---------------- */
const tagsEl = document.getElementById('tags');
const svg = document.getElementById('tagLines');
const SVGNS = 'http://www.w3.org/2000/svg';
const v3 = (a) => new THREE.Vector3(...a);
const TAGS = [
  // enclosed
  { t: 0, label: 'Wiring harness', sub: 'Sealed · loomed · tested', pts: [[-1.2, 0.73, 0.84, 0, 0, 1], [-1.2, 0.73, -0.84, 0, 0, -1]], key: 1 },
  { t: 0, label: 'Stop / turn / tail', sub: 'LED', pts: [[L0 - 0.11, BASE + 0.32, 0.87, -1, 0, 0]], key: 1 },
  { t: 0, label: 'Clearance & ID lights', sub: 'Exterior LED', pts: [[0.8, TOP - 0.13, ZS + 0.03, 0, 0, 1], [0.8, TOP - 0.13, -ZS - 0.03, 0, 0, -1]], key: 1 },
  { t: 0, label: 'Interior LED lighting', sub: 'Strips · switch panel', pts: [[-1.6, TOP + 0.03, 0, 0, 1, 0]], key: 1 },
  { t: 0, label: 'Porch light', pts: [[1.9, BASE + 2.03, ZS + 0.06, 0, 0, 1]] },
  { t: 0, label: 'Side markers', pts: [[2.75, BOT + 0.12, ZS + 0.04, 0, 0, 1], [2.75, BOT + 0.12, -ZS - 0.04, 0, 0, -1]] },
  { t: 0, label: 'Breakaway kit', pts: [[4.18, 0.78, -0.36, 1, 0.2, -0.4]] },
  { t: 0, label: '7-way plug', sub: 'Plug & play', pts: [[4.8, 0.45, -0.22, 1, 0, 0]], key: 1 },
  { t: 0, label: '12V battery & power', pts: [[3.95, 1.02, 0.36, 1, 0.3, 0.4]] },
  // open
  { t: 1, label: 'Wiring harness', sub: 'Frame-routed · sealed', pts: [[-1.0, 0.64, OW + 0.06, 0, 0, 1], [-1.0, 0.64, -OW - 0.06, 0, 0, -1]], key: 1 },
  { t: 1, label: 'Stop / turn / tail', sub: 'LED', pts: [[OL0 - 0.12, oY + 0.02, 0.88, -1, 0, 0], [OL0 - 0.12, oY + 0.02, -0.88, -1, 0, 0]], key: 1 },
  { t: 1, label: 'Fender side markers', pts: [[0.66, 0.62, 1.34, 0, 0, 1], [0.66, 0.62, -1.34, 0, 0, -1]], key: 1 },
  { t: 1, label: 'Clearance lights', sub: 'Exterior LED', pts: [[OL1 + 0.04, RAIL + 0.25, OW - 0.06, 1, 0.3, 0.3]] },
  { t: 1, label: 'Licence plate light', pts: [[OL0 - 0.1, oY - 0.1, 0.32, -1, 0, 0]] },
  { t: 1, label: 'Breakaway kit', pts: [[3.75, 0.66, -0.4, 1, 0.2, -0.5]] },
  { t: 1, label: '7-way plug', sub: 'Plug & play', pts: [[4.45, 0.38, -0.15, 1, 0, 0]], key: 1 },
  { t: 1, label: '12V battery & power', pts: [[3.25, DECK + 0.12, 0.4, 0.6, 1, 0.3]] },
];
TAGS.forEach(tg => {
  tg.pts = tg.pts.map(p => ({ p: v3(p.slice(0, 3)), n: v3(p.slice(3)).normalize() }));
  tg.el = document.createElement('div'); tg.el.className = 'tag';
  tg.el.innerHTML = `<b>${tg.label}</b>${tg.sub ? `<small>${tg.sub}</small>` : ''}`;
  tagsEl.appendChild(tg.el);
  tg.line = document.createElementNS(SVGNS, 'polyline'); svg.appendChild(tg.line);
  tg.dot = document.createElementNS(SVGNS, 'circle'); tg.dot.setAttribute('r', 3.5); svg.appendChild(tg.dot);
  tg.ring = document.createElementNS(SVGNS, 'circle'); tg.ring.setAttribute('class', 'ring'); svg.appendChild(tg.ring);
  tg.op = 0; tg.w = 0;
});
const owners = [trailer, openT];

/* ---------------- post ---------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------------- camera + layout ---------------- */
const CAM = new THREE.Vector3(12.6, 5.0, 13.2), TGT = new THREE.Vector3(0, 1.05, 0);
let VW = 1, VH = 1, portrait = false;
function resize() {
  VW = canvas.clientWidth; VH = canvas.clientHeight; portrait = VW / VH < 0.9;
  renderer.setSize(VW, VH, false); composer.setSize(VW, VH);
  bloom.resolution.set(VW, VH);
  svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
  camera.aspect = VW / VH;
  camera.fov = portrait ? 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(16)) * 1.25 / camera.aspect * 0.62) * 180 / Math.PI : 32;
  if (portrait) camera.setViewOffset(VW, VH, 0, VH * 0.17, VW, VH);
  else camera.setViewOffset(VW, VH, -VW * 0.16, 0, VW, VH);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
const distScale = () => { const a = camera.aspect; return a < 1 ? 1.15 : a < 1.3 ? 1.2 : 1; };

/* drag to spin */
let yawOff = 0, dragging = false, lastX = 0;
canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; canvas.classList.add('dragging'); canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!dragging) return; yawOff += (e.clientX - lastX) * 0.008; lastX = e.clientX; });
const endDrag = () => { dragging = false; canvas.classList.remove('dragging'); };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

const S = { lights: 1, xray: 0 };
let slide = 0, spin = 0.6;
const clock = new THREE.Clock();
const easeIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const right = new THREE.Vector3(), tmp = new THREE.Vector3(), nW = new THREE.Vector3(), toCam = new THREE.Vector3(), ctr = new THREE.Vector3();
let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(tour);

function project(v) { tmp.copy(v).project(camera); return [(tmp.x + 1) / 2 * VW, (1 - tmp.y) / 2 * VH, tmp.z]; }

function layoutTags(t) {
  const R = portrait ? 34 : 64;
  const copyRight = portrait ? 0 : Math.min(VW * 0.42, 620);
  const placed = [];
  for (const tg of TAGS) {
    const owner = owners[tg.t];
    const active = 1 - Math.min(1, Math.abs(slide - tg.t) * 2.2);
    let best = null, bestF = -2;
    for (const c of tg.pts) {
      const wp = c.p.clone().applyMatrix4(owner.matrixWorld);
      nW.copy(c.n).transformDirection(owner.matrixWorld);
      toCam.copy(camera.position).sub(wp).normalize();
      const f = nW.dot(toCam);
      if (f > bestF) { bestF = f; best = wp; }
    }
    let target = active * Math.min(1, Math.max(0, (bestF + 0.02) / 0.25));
    if (portrait && !tg.key) target = 0;
    if (best) { const [ax] = project(best); if (!portrait && ax < copyRight + 10) target = 0; }
    tg.op += (target - tg.op) * 0.18;
    if (tg.op < 0.02) { tg.el.style.opacity = 0; tg.line.style.opacity = tg.dot.style.opacity = tg.ring.style.opacity = 0; continue; }
    const [x, y] = project(best);
    ctr.set(0, 1.2, 0).applyMatrix4(owner.parent.matrixWorld);
    const [cx, cy] = project(ctr);
    let dx = x - cx, dy = (y - cy) * 1.6; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    let ex = x + dx * R, ey = y + dy * R * 0.75 - (portrait ? 10 : 0);
    let side = dx >= 0 ? 1 : -1;
    const lw = tg.w || 150;
    if (side < 0 && ex - 26 - lw < copyRight) side = 1;
    if (side > 0 && ex + 26 + lw > VW - 12) side = -1;
    ey = Math.min(VH - 120, Math.max(90, ey));
    placed.push({ tg, x, y, ex, ey, side, lw });
  }
  // de-overlap: push labels apart as rectangles
  placed.sort((a, b) => a.ey - b.ey);
  const boxOf = p => { const lx = p.ex + p.side * 26; const x0 = p.side > 0 ? lx : lx - p.lw - 16; return [x0 - 4, p.ey - 23, x0 + p.lw + 20, p.ey + 23]; };
  for (let i = 0; i < placed.length; i++) for (let j = 0; j < i; j++) {
    const a = boxOf(placed[j]), b = boxOf(placed[i]);
    if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) placed[i].ey = a[3] + 24;
  }
  for (const p of placed) {
    const { tg, x, y, side } = p;
    const ey = p.ey;
    const lx = p.ex + side * 26;
    tg.line.setAttribute('points', `${x},${y} ${p.ex},${ey} ${lx},${ey}`);
    tg.dot.setAttribute('cx', x); tg.dot.setAttribute('cy', y);
    tg.ring.setAttribute('cx', x); tg.ring.setAttribute('cy', y);
    tg.ring.setAttribute('r', 4 + ((t * 0.9 + x * 0.01) % 1) * 10);
    tg.ring.style.opacity = tg.op * (1 - ((t * 0.9 + x * 0.01) % 1));
    tg.line.style.opacity = tg.dot.style.opacity = tg.op;
    tg.el.style.opacity = tg.op;
    tg.el.classList.toggle('left', side < 0);
    const tx = Math.max(6, Math.min(VW - p.lw - 22, side > 0 ? lx + 8 : lx - 8 - p.lw));
    tg.el.style.transform = `translate(${tx}px, ${ey}px) translateY(-50%)`;
    if (!tg.w) tg.w = tg.el.offsetWidth;
  }
}

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const rdt = clock.getDelta(), dt = Math.min(rdt, 0.05), t = clock.elapsedTime;
  const k = 1 - Math.exp(-dt * 4);

  // camera (fixed, scaled for viewport)
  camera.position.copy(TGT).add(tmp.copy(CAM).sub(TGT).multiplyScalar(distScale()));
  camera.lookAt(TGT);
  camera.updateMatrixWorld();
  right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();

  // slide between trailers (time-based, eased)
  const dir = Math.sign(kind - slide);
  slide = dir > 0 ? Math.min(kind, slide + Math.min(rdt, 0.12) / 1.15) : Math.max(kind, slide - Math.min(rdt, 0.12) / 1.15);
  const e = easeIO(slide);
  const D = 15 * distScale();
  encPivot.position.copy(right).multiplyScalar(-D * e);
  openPivot.position.copy(right).multiplyScalar(D * (1 - e));
  encPivot.visible = e < 0.999; openPivot.visible = e > 0.001;

  // turntable spin + drag
  spin += dt * 0.22;
  if (!dragging) yawOff *= Math.pow(0.6, dt);
  const yaw = spin + yawOff;
  encPivot.rotation.y = yaw - e * 0.9;
  openPivot.rotation.y = yaw + (1 - e) * 0.9;

  // lighting state
  S.xray = lerp(S.xray, toggles.xray ? 1 : 0, k);
  S.lights = lerp(S.lights, toggles.lights ? 1 : 0, k);
  const op = 1 - S.xray * 0.85;
  fadeMats.forEach(m => { m.opacity = op; m.depthWrite = op > 0.95; });
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
  pulseTex.offset.x = -t * 0.9;
  harnessMat.emissiveIntensity = 1.1 + S.xray * 2;
  plugRing.material.emissiveIntensity = 1.5 + 1.5 * Math.sin(t * 4);

  bloom.strength = 0.6 + 0.25 * L;
  scene.updateMatrixWorld();
  composer.render();
  layoutTags(t);
}
const lerp = (a, b, x) => a + (b - a) * x;
frame();
