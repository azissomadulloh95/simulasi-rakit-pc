// =====================================================================
//  main.js — scene 3D, interaksi (klik / sentuh / seret), animasi, UI
// =====================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as C from './components.js';
import { Simulation, formatTime, predicate, PENALTY } from './simulation.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const wait = ms => new Promise(r => setTimeout(r, ms));

const state = {
  view: 'home',
  mode: 'belajar',
  student: { nama: '', kelas: '' },
  sim: null,
  selected: null,
  hints: true,
  labels: false,
  busy: false,
  timerId: null,
  trayOrder: [],
  resultText: '',
  resultBlob: null,
};

// ---------------------------------------------------------------------
// Renderer (satu kanvas dipakai bergantian oleh simulasi & galeri)
// ---------------------------------------------------------------------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
} catch (err) {
  document.body.insertAdjacentHTML('afterbegin', '<p class="fatal">Browser ini tidak mendukung WebGL (grafik 3D). Coba gunakan Google Chrome / Firefox versi terbaru.</p>');
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const canvas = renderer.domElement;
canvas.setAttribute('aria-label', 'Tampilan 3D');

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.6));
  const d1 = new THREE.DirectionalLight(0xffffff, 2.2);
  d1.position.set(4, 8, 7);
  const d2 = new THREE.DirectionalLight(0x93c5fd, 0.9);
  d2.position.set(-6, 4, -3);
  const d3 = new THREE.DirectionalLight(0xffffff, 0.6);
  d3.position.set(0, 2, 10);
  scene.add(d1, d2, d3);
}

// ---------------------------------------------------------------------
// Scene simulasi
// ---------------------------------------------------------------------
const simScene = new THREE.Scene();
simScene.background = new THREE.Color(0x0f172a);
addLights(simScene);
const simCam = new THREE.PerspectiveCamera(42, 1, 0.05, 120);
const simControls = new OrbitControls(simCam, canvas);
simControls.enableDamping = true;
simControls.dampingFactor = 0.1;
simControls.minDistance = 2.5;
simControls.maxDistance = 24;
simControls.maxPolarAngle = Math.PI * 0.62;

{
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  simScene.add(floor);
  const grid = new THREE.GridHelper(28, 28, 0x475569, 0x3b4a5f);
  grid.position.y = 0.005;
  simScene.add(grid);
}
const caseGroup = C.buildCase();
simScene.add(caseGroup);
simScene.add(C.buildMotherboard());
const monitor = C.buildMonitor();
monitor.group.position.set(5.3, 0, 0.2);
simScene.add(monitor.group);
const powerButtonMesh = caseGroup.getObjectByName('powerButton');
const powerLedMesh = caseGroup.getObjectByName('powerLed');

const installed = new THREE.Group();
simScene.add(installed);

const labelGroup = new THREE.Group();
labelGroup.visible = false;
C.MB_LABELS.forEach(l => {
  const s = C.makeLabel(l.text, { h: 0.17 });
  s.position.set(...l.pos);
  labelGroup.add(s);
});
simScene.add(labelGroup);

// Slot (area klik)
const slotGroup = new THREE.Group();
simScene.add(slotGroup);
const slotLabels = {};
for (const [id, s] of Object.entries(C.SLOTS)) {
  const geo = new THREE.BoxGeometry(...s.size);
  const edgesGeo = new THREE.EdgesGeometry(geo);
  (s.boxes ?? [s.pos]).forEach(p => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0, depthWrite: false }));
    m.position.set(...p);
    m.userData.slot = id;
    m.userData.flash = 0;
    const edges = new THREE.LineSegments(edgesGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
    m.add(edges);
    m.userData.edges = edges;
    m.renderOrder = 2;
    slotGroup.add(m);
  });
  const lbl = C.makeLabel(s.name, { h: 0.2, border: '#22c55e' });
  const p = s.boxes ? s.boxes.reduce((a, b) => a.map((v, i) => v + b[i] / s.boxes.length), [0, 0, 0]) : s.pos;
  lbl.position.set(p[0], p[1] + s.size[1] / 2 + 0.06, p[2] + s.size[2] / 2);
  if (id === 'side') lbl.position.set(0, 4.95, 1.2);
  lbl.visible = false;
  slotLabels[id] = lbl;
  simScene.add(lbl);
}
const hintStrong = new Set();
const hintSoft = new Set();

let spinners = [];
let leds = [];
let fanSpeed = 0;
function collectFx(root) {
  root.traverse(o => {
    if (o.userData.spin) spinners.push(o);
    if (o.isMesh && o.material?.userData?.ledColor !== undefined) leds.push(o.material);
  });
}
collectFx(caseGroup);
collectFx(monitor.group);

function setLeds(on) {
  leds.forEach(m => {
    const c = m.userData.ledColor;
    m.color.setHex(on ? c : 0x2a2f3a);
    m.emissive.setHex(on ? c : 0x000000);
    m.emissiveIntensity = on ? 1.6 : 1;
  });
}

// ---------------------------------------------------------------------
// Scene "Kenali Komponen"
// ---------------------------------------------------------------------
const exScene = new THREE.Scene();
exScene.background = new THREE.Color(0x111827);
addLights(exScene);
const exCam = new THREE.PerspectiveCamera(40, 1, 0.05, 100);
const exControls = new OrbitControls(exCam, canvas);
exControls.enableDamping = true;
exControls.autoRotate = true;
exControls.autoRotateSpeed = 1.6;
exControls.minDistance = 1.5;
exControls.maxDistance = 14;
exControls.enabled = false;
const exHolder = new THREE.Group();
exScene.add(exHolder);
{
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
  disc.position.y = -1.75;
  exScene.add(disc);
}
const EX_ROT = { gpu: [-Math.PI / 2, 0, 0], ram: [0, -Math.PI / 2, 0], paste: [-Math.PI / 2, 0, 0] };
let exIndex = 0;

// ---------------------------------------------------------------------
// Ukuran kanvas & kamera
// ---------------------------------------------------------------------
const SIM_TARGET = new THREE.Vector3(0.1, 2.5, 0);
const SIM_DIR = new THREE.Vector3(0.17, 0.34, 0.93).normalize();

function simCamDefault() {
  const tanH = Math.tan(THREE.MathUtils.degToRad(simCam.fov / 2));
  const fitW = 3.0 / (tanH * simCam.aspect);
  const narrow = simCam.aspect < 1.3;
  const fitH = (narrow ? 4.1 : 3.5) / tanH;
  const dist = Math.max(10.5, fitW, fitH);
  const target = SIM_TARGET.clone();
  if (narrow) target.y += 0.45; // beri ruang untuk banner di atas (HP)
  return { pos: target.clone().addScaledVector(SIM_DIR, dist), target };
}

function exCamDefault() {
  const tanH = Math.tan(THREE.MathUtils.degToRad(exCam.fov / 2));
  const dist = Math.max(4.6, 1.9 / (tanH * exCam.aspect));
  return new THREE.Vector3(0, 1.4, 1).normalize().multiplyScalar(dist);
}

function resize() {
  const vp = canvas.parentElement;
  if (!vp) return;
  const w = Math.max(1, vp.clientWidth), h = Math.max(1, vp.clientHeight);
  renderer.setSize(w, h, false);
  simCam.aspect = exCam.aspect = w / h;
  simCam.updateProjectionMatrix();
  exCam.updateProjectionMatrix();
}
const ro = new ResizeObserver(() => resize());
ro.observe($('#simViewport'));
ro.observe($('#exploreViewport'));

function resetSimCamera(animate = true) {
  const d = simCamDefault();
  if (!animate) {
    simCam.position.copy(d.pos);
    simControls.target.copy(d.target);
    simControls.update();
    return Promise.resolve();
  }
  return tweenCamera(d.pos, d.target, 700);
}

function tweenCamera(pos, target, ms) {
  const p0 = simCam.position.clone(), t0 = simControls.target.clone();
  return tween(ms, k => {
    simCam.position.lerpVectors(p0, pos, k);
    simControls.target.lerpVectors(t0, target, k);
  });
}

// ---------------------------------------------------------------------
// Tween sederhana
// ---------------------------------------------------------------------
const tweens = [];
const easeInOut = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
function tween(ms, fn, ease = easeInOut) {
  return new Promise(res => tweens.push({ t: 0, dur: ms / 1000, fn, ease, res }));
}

// ---------------------------------------------------------------------
// Loop animasi
// ---------------------------------------------------------------------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    tw.fn(tw.ease(k));
    if (k >= 1) { tweens.splice(i, 1); tw.res(); }
  }
  if (state.view === 'sim') {
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    for (const m of slotGroup.children) {
      if (!m.visible) continue;
      const id = m.userData.slot, mm = m.material, em = m.userData.edges.material;
      if (m.userData.flash > 0) {
        m.userData.flash -= dt;
        mm.color.setHex(0xef4444); mm.opacity = 0.5;
        em.color.setHex(0xf87171); em.opacity = 1;
      } else if (hintStrong.has(id)) {
        mm.color.setHex(0x22c55e); mm.opacity = 0.15 + 0.35 * pulse;
        em.color.setHex(0x4ade80); em.opacity = 1;
      } else if (hintSoft.has(id)) {
        mm.color.setHex(0xfacc15); mm.opacity = 0.06 + 0.16 * pulse;
        em.color.setHex(0xfde047); em.opacity = 0.85;
      } else {
        mm.opacity = 0;
        em.color.setHex(0xe2e8f0); em.opacity = 0.22;
      }
    }
    if (fanSpeed > 0) spinners.forEach(s => { s.rotation.z += dt * 22 * fanSpeed; });
    simControls.update();
    renderer.render(simScene, simCam);
  } else if (state.view === 'explore') {
    exControls.update();
    renderer.render(exScene, exCam);
  }
});

// ---------------------------------------------------------------------
// Suara (Web Audio) — hanya dibuat setelah interaksi pengguna
// ---------------------------------------------------------------------
let actx = null;
function ensureAudio() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch { actx = null; }
}
function tone(freq, dur, type = 'sine', vol = 0.07, delay = 0) {
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g).connect(actx.destination);
  const t0 = actx.currentTime + delay;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
const sfx = {
  ok: () => { tone(660, 0.12); tone(990, 0.16, 'sine', 0.07, 0.1); },
  err: () => tone(150, 0.3, 'square', 0.05),
  beep: () => tone(1000, 0.25, 'square', 0.06),
};

// ---------------------------------------------------------------------
// Navigasi tampilan
// ---------------------------------------------------------------------
function showView(name) {
  state.view = name;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
  $$('.top-nav button').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  document.body.classList.toggle('in-app', name !== 'home');
  simControls.enabled = name === 'sim';
  exControls.enabled = name === 'explore';
  if (name === 'sim') $('#simViewport').prepend(canvas);
  if (name === 'explore') $('#exploreViewport').prepend(canvas);
  resize();
  if (name === 'explore') resetExCamera();
  window.scrollTo(0, 0);
}

function simInProgress() { return state.sim && !state.sim.finished && state.sim.doneCount > 0; }

$$('[data-nav]').forEach(b => b.addEventListener('click', async () => {
  const target = b.dataset.nav;
  if (target === state.view) return;
  if (state.view === 'sim' && simInProgress()) {
    if (!(await confirmBox('Keluar dari simulasi? Kemajuan perakitan akan hilang.'))) return;
  }
  if (state.view === 'sim') stopTimer();
  if (target === 'explore' && !exHolder.children.length) showExplore(0);
  showView(target);
}));

function confirmBox(text) {
  return new Promise(res => {
    $('#confirmText').textContent = text;
    const m = $('#confirmModal');
    m.classList.remove('hidden');
    const done = v => { m.classList.add('hidden'); res(v); };
    $('#confirmYes').onclick = () => done(true);
    $('#confirmNo').onclick = () => done(false);
    $('#confirmYes').focus();
  });
}

// ---------------------------------------------------------------------
// Mulai simulasi
// ---------------------------------------------------------------------
$('#btnLearn').addEventListener('click', () => { ensureAudio(); startSim('belajar'); });
$('#examForm').addEventListener('submit', e => {
  e.preventDefault();
  const nama = $('#inpNama').value.trim(), kelas = $('#inpKelas').value.trim();
  if (!nama || !kelas) return;
  state.student = { nama, kelas };
  try { localStorage.setItem('rakitpc-siswa', JSON.stringify(state.student)); } catch { /* abaikan */ }
  ensureAudio();
  startSim('ujian');
});
try {
  const saved = JSON.parse(localStorage.getItem('rakitpc-siswa') || 'null');
  if (saved) { $('#inpNama').value = saved.nama || ''; $('#inpKelas').value = saved.kelas || ''; }
} catch { /* abaikan */ }

function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

function disposeTree(o) {
  o.traverse(n => {
    if (n.geometry) n.geometry.dispose();
    if (n.material) [].concat(n.material).forEach(m => { m.map?.dispose(); m.dispose(); });
  });
}

function startSim(mode) {
  state.mode = mode;
  state.sim = new Simulation(C.STEPS, mode);
  state.selected = null;
  state.busy = false;
  state.hints = mode === 'belajar';
  state.labels = false;
  tweens.length = 0;
  installed.children.slice().forEach(o => { installed.remove(o); disposeTree(o); });
  spinners = []; leds = [];
  collectFx(caseGroup); collectFx(monitor.group);
  fanSpeed = 0;
  setLeds(false);
  drawMonitor('off');
  labelGroup.visible = false;
  const order = C.STEPS.flatMap(s => s.tasks.map(t => t[0]));
  state.trayOrder = mode === 'ujian' ? shuffle(order) : order;
  hideInfo();
  $('#toastWrap').innerHTML = '';
  $('#resultModal').classList.add('hidden');
  $('#statMode').textContent = mode === 'ujian' ? 'Ujian' : 'Belajar';
  $('#stepsBox').classList.toggle('hidden', mode === 'ujian');
  $('#stepsBox').open = !isStacked();
  $('#btnHints').disabled = mode === 'ujian';
  $('#btnLabels').disabled = mode === 'ujian';
  $('#timerLabel').textContent = mode === 'ujian' ? 'Sisa' : 'Waktu';
  renderTray();
  renderSteps();
  showView('sim');
  resetSimCamera(false);
  refreshSlots();
  updateHUD();
  startTimer();
  if (mode === 'ujian') {
    toast(`Selamat mengerjakan, <b>${esc(state.student.nama)}</b>! Waktu 15 menit. Tidak ada petunjuk — ingat urutan perakitan yang benar.`, 'info', 'Mode Ujian dimulai', 6000);
  } else {
    toast('Pilih komponen berbingkai hijau di daftar, lalu ketuk area yang berkedip hijau pada model 3D. Jangan lupa K3: gunakan gelang antistatis dan pastikan listrik mati!', 'info', 'Mode Belajar', 7000);
  }
}

function startTimer() {
  stopTimer();
  state.timerId = setInterval(() => {
    const sim = state.sim;
    if (!sim || sim.finished) return;
    updateTime();
    if (sim.timeLimit != null && sim.remaining() <= 0) finishSim('waktu-habis');
  }, 500);
}
function stopTimer() { clearInterval(state.timerId); state.timerId = null; }

// ---------------------------------------------------------------------
// Daftar komponen (tray) + thumbnail 3D
// ---------------------------------------------------------------------
const thumbs = {};
function renderTray() {
  const tray = $('#tray');
  tray.innerHTML = '';
  state.trayOrder.forEach(id => {
    const item = C.ITEMS[id];
    const step = C.STEPS.findIndex(s => s.tasks.some(t => t[0] === id)) + 1;
    const b = document.createElement('button');
    b.className = 'tray-item';
    b.dataset.id = id;
    b.setAttribute('role', 'option');
    b.innerHTML = `${state.mode === 'belajar' ? `<span class="ti-tag">L${step}</span>` : ''}
      ${thumbs[id] ? `<img src="${thumbs[id]}" alt="">` : `<span class="ti-icon">${item.icon}</span>`}
      <span class="ti-name">${esc(item.name)}</span>`;
    tray.appendChild(b);
  });
  updateTray();
}

function updateTray() {
  const sim = state.sim;
  if (!sim) return;
  const showNext = state.mode === 'belajar' && state.hints;
  $$('.tray-item').forEach(b => {
    const id = b.dataset.id, task = sim.taskFor(id);
    b.classList.toggle('done', task.done);
    b.disabled = task.done;
    b.classList.toggle('selected', state.selected === id);
    b.classList.toggle('next', showNext && sim.isAvailable(task));
    b.setAttribute('aria-selected', state.selected === id);
  });
}

async function makeThumbnails() {
  let r;
  try {
    r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch { return; }
  r.setSize(160, 160, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  addLights(scene);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
  for (const id of Object.keys(C.ITEMS)) {
    const obj = C.ITEMS[id].build();
    if (EX_ROT[id]) obj.rotation.set(...EX_ROT[id]);
    const wrap = new THREE.Group();
    wrap.add(obj);
    const box = new THREE.Box3().setFromObject(wrap);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    obj.position.sub(sphere.center);
    scene.add(wrap);
    const dist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(16)) * 1.02;
    cam.position.copy(new THREE.Vector3(0.55, 0.55, 1).normalize().multiplyScalar(dist));
    cam.lookAt(0, 0, 0);
    r.render(scene, cam);
    thumbs[id] = r.domElement.toDataURL('image/png');
    scene.remove(wrap);
    disposeTree(wrap);
    await wait(0);
  }
  r.dispose();
  r.forceContextLoss();
  if (state.sim) renderTray();
}

// Pilih komponen: ketuk/klik
let suppressClick = false;
$('#tray').addEventListener('click', e => {
  const b = e.target.closest('.tray-item');
  if (!b || b.disabled) return;
  if (suppressClick) { suppressClick = false; return; }
  ensureAudio();
  select(state.selected === b.dataset.id ? null : b.dataset.id);
});

function select(id) {
  state.selected = id;
  hideInfo();
  updateTray();
  refreshSlots();
  updateBanner();
}

// Seret (drag) dari daftar ke model 3D — mouse & sentuh
let drag = null;
const ghost = $('#dragGhost');
const isStacked = () => window.matchMedia('(max-width: 1000px)').matches;
$('#tray').addEventListener('pointerdown', e => {
  const b = e.target.closest('.tray-item');
  if (!b || b.disabled || state.busy) return;
  drag = { id: b.dataset.id, x0: e.clientX, y0: e.clientY, active: false, pid: e.pointerId, type: e.pointerType };
});
window.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.active) {
    if (Math.hypot(dx, dy) < 12) return;
    if (drag.type !== 'mouse') {
      // Di HP daftar bergulir ke samping → seret ke atas untuk memindahkan komponen
      const ok = isStacked() ? Math.abs(dy) > Math.abs(dx) : Math.abs(dx) > Math.abs(dy);
      if (!ok) { drag = null; return; }
    }
    drag.active = true;
    ghost.innerHTML = thumbs[drag.id] ? `<img src="${thumbs[drag.id]}" alt="">` : `<span style="font-size:2rem">${C.ITEMS[drag.id].icon}</span>`;
    ghost.classList.remove('hidden');
    select(drag.id);
  }
  ghost.style.left = `${e.clientX}px`;
  ghost.style.top = `${e.clientY}px`;
  e.preventDefault();
}, { passive: false });
window.addEventListener('pointerup', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag;
  drag = null;
  if (!d.active) return;
  ghost.classList.add('hidden');
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 50);
  ensureAudio();
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (el === canvas && state.view === 'sim') {
    const slot = pickSlot(e.clientX, e.clientY);
    if (slot) attempt(d.id, slot);
    else toast('Lepaskan komponen tepat di lokasi pemasangannya pada model 3D.', 'info');
  }
});
window.addEventListener('pointercancel', () => { if (drag) { drag = null; ghost.classList.add('hidden'); } });

// ---------------------------------------------------------------------
// Slot: aktif / petunjuk
// ---------------------------------------------------------------------
function slotActive(id) {
  const s = C.SLOTS[id], sim = state.sim;
  if (!sim || sim.finished) return false;
  if (s.only && state.selected !== s.only) return false;
  if (s.after && !sim.isDone(s.after)) return false;
  if (s.distractor) return true;
  return sim.tasks.some(t => t.slot === id && !t.done);
}

function refreshSlots() {
  const sim = state.sim;
  hintStrong.clear();
  hintSoft.clear();
  slotGroup.children.forEach(m => { m.visible = slotActive(m.userData.slot); });
  const hintsOn = state.mode === 'belajar' && state.hints && sim && !sim.finished;
  if (hintsOn) {
    if (state.selected) {
      const t = sim.taskFor(state.selected);
      if (sim.isAvailable(t)) hintStrong.add(t.slot);
    } else {
      sim.availableTasks().forEach(t => {
        if (t.item === 'power') hintStrong.add(t.slot);
        else if (slotActive(t.slot)) hintSoft.add(t.slot);
      });
    }
  }
  for (const [id, l] of Object.entries(slotLabels)) l.visible = hintStrong.has(id) && slotActive(id);
  labelGroup.visible = state.labels && state.mode === 'belajar';
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pickSlot(x, y) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, simCam);
  const hits = raycaster.intersectObjects(slotGroup.children.filter(m => m.visible), false);
  return hits.length ? hits[0].object.userData.slot : null;
}

// Ketuk pada kanvas (bedakan dengan memutar kamera)
let down = null;
canvas.addEventListener('pointerdown', e => {
  if (state.view !== 'sim' || !e.isPrimary) return;
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
});
canvas.addEventListener('pointerup', e => {
  if (state.view !== 'sim' || !down || !e.isPrimary) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const quick = performance.now() - down.t < 700;
  down = null;
  if (moved < 9 && quick) { ensureAudio(); onSceneTap(e.clientX, e.clientY); }
});
let hoverQueued = false;
canvas.addEventListener('pointermove', e => {
  if (state.view !== 'sim' || e.pointerType !== 'mouse' || hoverQueued) return;
  hoverQueued = true;
  requestAnimationFrame(() => {
    hoverQueued = false;
    canvas.style.cursor = pickSlot(e.clientX, e.clientY) ? 'pointer' : 'grab';
  });
});

function onSceneTap(x, y) {
  const sim = state.sim;
  if (state.busy || !sim || sim.finished) return;
  const slot = pickSlot(x, y);
  if (!slot) {
    if (state.selected) toast('Ketuk tepat pada lokasi pemasangan (area berbingkai) di model 3D.', 'info', null, 3000);
    return;
  }
  if (!state.selected) {
    if (slot === 'powerBtn') {
      if (sim.isAvailable(sim.taskFor('power'))) return attempt('power', slot);
      toast('Tombol power baru boleh ditekan pada langkah terakhir, setelah semua komponen terpasang dan casing ditutup.', 'info', 'Belum waktunya', 4000);
      return;
    }
    if (state.mode === 'belajar') toast(`${esc(C.SLOTS[slot].desc)}`, 'info', `📍 ${esc(C.SLOTS[slot].name)}`, 4000);
    else toast('Pilih komponen dari daftar terlebih dahulu.', 'info', null, 2500);
    return;
  }
  attempt(state.selected, slot);
}

function flashSlot(id) {
  slotGroup.children.forEach(m => { if (m.userData.slot === id) m.userData.flash = 0.9; });
}

function errorFeedback() {
  sfx.err();
  try { navigator.vibrate?.(120); } catch { /* abaikan */ }
  const vp = $('#simViewport');
  vp.classList.remove('shake');
  void vp.offsetWidth;
  vp.classList.add('shake');
}

// ---------------------------------------------------------------------
// Percobaan pemasangan
// ---------------------------------------------------------------------
async function attempt(itemId, slotId) {
  const sim = state.sim;
  if (state.busy || !sim || sim.finished) return;
  const item = C.ITEMS[itemId];
  const r = sim.check(itemId, slotId);
  if (r.type === 'done' || r.type === 'invalid') return;

  if (r.type === 'wrongSlot') {
    const s = C.SLOTS[slotId];
    sim.addMistake('slot', `${item.name} dicoba di ${s.name}`);
    flashSlot(slotId);
    errorFeedback();
    toast(`${esc(s.desc)}<br><b>Yang benar:</b> ${esc(item.where)}`, 'error', `❌ ${esc(item.name)} tidak dipasang di ${esc(s.name)} (−${PENALTY})`, 9000);
    updateHUD();
    return;
  }
  if (r.type === 'order') {
    const cur = C.STEPS[sim.currentStep];
    const b = C.ITEMS[r.blocker.item];
    sim.addMistake('urutan', `${item.name} sebelum ${b.name}`);
    flashSlot(slotId);
    errorFeedback();
    const curTxt = state.mode === 'belajar' ? `Sekarang <b>Langkah ${cur.no}: ${esc(cur.title)}</b> — selesaikan dulu <b>${esc(b.name)}</b>.<br>` : '';
    toast(`${curTxt}${esc(item.why)}`, 'error', `⚠️ Urutan belum tepat (−${PENALTY})`, 9000);
    updateHUD();
    return;
  }

  // Benar!
  if (itemId === 'cpu') {
    const ok = await askCpuOrientation();
    updateHUD();
    if (!ok) return;
  }
  state.busy = true;
  const res = sim.complete(itemId);
  state.selected = null;
  hideInfo();
  updateTray();
  refreshSlots();
  updateHUD();
  sfx.ok();
  await installAnim(itemId);
  state.busy = false;

  if (itemId === 'power') {
    await powerOnSequence();
    finishSim('selesai');
    return;
  }
  refreshSlots();
  updateTray();
  if (state.mode === 'belajar') {
    showInfo(item, res.stepDone ? sim.currentStep : null);
  } else {
    toast(`${esc(item.name)} terpasang.`, 'success', null, 1800);
  }
}

// ---------------------------------------------------------------------
// Animasi pemasangan
// ---------------------------------------------------------------------
async function installAnim(id) {
  const item = C.ITEMS[id];
  if (item.install === 'action') return;
  if (item.install === 'cable') return animCable(id);
  if (item.install === 'paste') return animPaste();
  const obj = item.build();
  collectFx(obj);
  setLeds(false);
  const target = new THREE.Vector3(...item.place.pos);
  const ap = new THREE.Vector3(...(item.approach ?? [0, 0, 1]));
  const p0 = target.clone().addScaledVector(ap, 3).add(new THREE.Vector3(0, 1.4, 0));
  const p1 = target.clone().addScaledVector(ap, 0.45);
  obj.position.copy(p0);
  obj.scale.setScalar(0.6);
  installed.add(obj);
  await tween(650, k => { obj.position.lerpVectors(p0, p1, k); obj.scale.setScalar(0.6 + 0.4 * k); });
  await tween(380, k => obj.position.lerpVectors(p1, target, k), k => 1 - Math.pow(1 - k, 3));
}

async function animPaste() {
  const syr = C.ITEMS.paste.build();
  const target = new THREE.Vector3(...C.ITEMS.paste.place.pos);
  const p0 = target.clone().add(new THREE.Vector3(0.6, 1.2, 2.5));
  const p1 = target.clone().add(new THREE.Vector3(0, 0, 0.03));
  syr.position.copy(p0);
  installed.add(syr);
  await tween(600, k => syr.position.lerpVectors(p0, p1, k));
  const blob = C.buildPasteBlob();
  blob.position.copy(target);
  blob.scale.setScalar(0.01);
  installed.add(blob);
  await tween(450, k => blob.scale.set(k, 1, k));
  const p2 = p1.clone().add(new THREE.Vector3(0, 0.6, 2.2));
  await tween(450, k => syr.position.lerpVectors(p1, p2, k));
  installed.remove(syr);
  disposeTree(syr);
}

async function animCable(id) {
  const run = C.buildCableRun(id);
  const per = run.radial * 6;
  run.tubes.forEach(g => g.setDrawRange(0, 0));
  const cp = run.connector.position.clone();
  const cStart = cp.clone().add(new THREE.Vector3(0, 0, 0.35));
  run.connector.visible = false;
  installed.add(run.group);
  await tween(1000, k => run.tubes.forEach(g => g.setDrawRange(0, Math.ceil(k * run.segments) * per)), k => k);
  run.connector.visible = true;
  await tween(300, k => run.connector.position.lerpVectors(cStart, cp, k));
}

// ---------------------------------------------------------------------
// Orientasi CPU (tanda segitiga)
// ---------------------------------------------------------------------
function askCpuOrientation() {
  return new Promise(resolve => {
    const modal = $('#cpuModal');
    const grid = $('#cpuOptions');
    const msg = $('#cpuMsg');
    msg.textContent = '';
    msg.className = 'modal-msg';
    $('#cpuHint').classList.toggle('hidden', !(state.mode === 'belajar' && state.hints));
    grid.innerHTML = '';
    shuffle(['tl', 'tr', 'br', 'bl']).forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'cpu-opt';
      b.innerHTML = `<span class="cpu-chip c-${c}"><i></i></span><span>Posisi ${'ABCD'[i]}</span>`;
      b.onclick = async () => {
        if (c === 'bl') {
          msg.textContent = '✅ Tepat! Segitiga CPU sejajar dengan segitiga socket.';
          msg.className = 'modal-msg ok';
          $$('.cpu-opt', grid).forEach(x => { x.disabled = true; });
          await wait(700);
          modal.classList.add('hidden');
          resolve(true);
        } else {
          state.sim.addMistake('orientasi', 'Orientasi CPU salah (segitiga tidak sejajar)');
          errorFeedback();
          b.classList.add('wrong');
          b.disabled = true;
          msg.textContent = `❌ Salah posisi (−${PENALTY}). Jika CPU dipaksa masuk dengan posisi salah, pin socket bisa bengkok dan motherboard rusak! Cocokkan segitiganya.`;
          updateHUD();
        }
      };
      grid.appendChild(b);
    });
    $('#cpuCancel').onclick = () => { modal.classList.add('hidden'); resolve(false); };
    modal.classList.remove('hidden');
  });
}

// ---------------------------------------------------------------------
// Uji POST
// ---------------------------------------------------------------------
function drawMonitor(mode, lines = []) {
  const c = monitor.canvas, g = c.getContext('2d');
  g.fillStyle = mode === 'off' ? '#05070c' : '#000';
  g.fillRect(0, 0, c.width, c.height);
  if (mode !== 'off') {
    g.font = 'bold 26px Consolas, "Courier New", monospace';
    g.fillStyle = '#e2e8f0';
    g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, 28, 24 + i * 36));
  }
  if (mode === 'ok') {
    g.fillStyle = '#16a34a';
    g.fillRect(184, 270, 400, 120);
    g.strokeStyle = '#bbf7d0'; g.lineWidth = 6;
    g.strokeRect(184, 270, 400, 120);
    g.fillStyle = '#fff';
    g.font = 'bold 72px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('POST OK', 384, 332);
    g.textAlign = 'left';
  }
  monitor.texture.needsUpdate = true;
}

async function powerOnSequence() {
  state.busy = true;
  hideInfo();
  const pressDown = powerButtonMesh.position.y;
  await tween(150, k => { powerButtonMesh.position.y = pressDown - 0.03 * Math.sin(k * Math.PI); });
  const wide = { pos: new THREE.Vector3(3.2, 5.2, 13.5), target: new THREE.Vector3(2.4, 2.3, 0) };
  const tanH = Math.tan(THREE.MathUtils.degToRad(simCam.fov / 2));
  const needed = 5.2 / (tanH * simCam.aspect);
  if (needed > 13) wide.pos = wide.target.clone().add(new THREE.Vector3(0.1, 0.25, 1).normalize().multiplyScalar(needed));
  tweenCamera(wide.pos, wide.target, 1400);
  powerLedMesh.material.color.setHex(0x22c55e);
  powerLedMesh.material.emissive.setHex(0x22c55e);
  await tween(1400, k => { fanSpeed = k; });
  setLeds(true);
  const lines = ['TJKT BIOS v2.1  (C) SMKN 1 Sukabumi', 'CPU   : 6-Core Processor @ 3.6 GHz ... OK', 'RAM   : 16384 MB DDR4 Dual-Channel ... OK',
    'VGA   : Graphics Card 8GB (PCIe x16) ... OK', 'M.2   : NVMe SSD 512GB ... OK', 'SATA  : HDD 1TB ... OK'];
  for (let i = 1; i <= lines.length; i++) {
    drawMonitor('boot', lines.slice(0, i));
    await wait(320);
  }
  sfx.beep();
  drawMonitor('ok', lines);
  toast('Terdengar 1 bunyi bip pendek: tanda POST berhasil. Komputer siap untuk instalasi sistem operasi.', 'success', '✅ POST OK!', 5000);
  await wait(2600);
  state.busy = false;
}

// ---------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------
function updateTime() {
  const sim = state.sim;
  if (!sim) return;
  const el = $('#statTime');
  if (sim.timeLimit != null) {
    const r = sim.remaining();
    el.textContent = formatTime(r);
    el.classList.toggle('danger', r <= 60);
  } else {
    el.textContent = formatTime(sim.elapsed());
    el.classList.remove('danger');
  }
}

function updateBanner() {
  const sim = state.sim;
  if (!sim) return;
  const cs = Math.min(sim.currentStep, C.STEPS.length - 1);
  const step = C.STEPS[cs];
  let hint = '';
  if (sim.finished) {
    $('#bannerStep').textContent = state.mode === 'belajar' ? `Langkah ${step.no}/${C.STEPS.length}` : `Ujian • ${sim.doneCount}/${sim.total} tugas`;
    $('#bannerTitle').textContent = sim.result === 'selesai' ? 'Selesai – POST OK!' : 'Simulasi berakhir';
  } else if (state.mode === 'belajar') {
    $('#bannerStep').textContent = `Langkah ${step.no}/${C.STEPS.length}`;
    $('#bannerTitle').textContent = step.title;
    if (state.selected) {
      const t = sim.taskFor(state.selected);
      const n = C.ITEMS[state.selected].name;
      if (sim.isAvailable(t)) hint = state.hints ? `Dipilih: ${n} — ketuk area yang berkedip hijau.` : `Dipilih: ${n} — ketuk lokasi pemasangannya.`;
      else hint = state.hints ? `${n} digunakan di Langkah ${t.step + 1}. Selesaikan dulu langkah saat ini.` : `Dipilih: ${n}`;
    } else if (state.hints) {
      hint = sim.isAvailable(sim.taskFor('power')) ? 'Ketuk tombol power (berkedip hijau) di atas casing.' : 'Pilih komponen berbingkai hijau di daftar.';
    }
  } else {
    $('#bannerStep').textContent = `Ujian • ${sim.doneCount}/${sim.total} tugas`;
    $('#bannerTitle').textContent = 'Rakit komputer dengan urutan yang benar';
    hint = state.selected ? `Dipilih: ${C.ITEMS[state.selected].name} — ketuk lokasi pemasangannya.` : 'Pilih komponen dari daftar.';
  }
  $('#bannerHint').textContent = hint;
}

function renderSteps() {
  $('#stepList').innerHTML = C.STEPS.map((s, i) => `<li data-no="${s.no}" data-i="${i}"><span class="step-title">${esc(s.title)}</span><span class="step-desc">${esc(s.desc)}</span></li>`).join('');
}

function updateHUD() {
  const sim = state.sim;
  if (!sim) return;
  $('#statScore').textContent = sim.liveScore();
  $('#statMistakes').textContent = sim.mistakes.length;
  $('#statMistakes').classList.toggle('danger', sim.mistakes.length > 0);
  $('#progressBar').style.width = `${(100 * sim.doneCount) / sim.total}%`;
  $('#progressText').textContent = `${sim.doneCount}/${sim.total} tugas`;
  const cs = sim.currentStep;
  $$('#stepList li').forEach(li => {
    const i = +li.dataset.i;
    li.classList.toggle('done', i < cs);
    li.classList.toggle('current', i === cs);
    li.querySelector('.step-desc').classList.toggle('hidden', i !== cs);
  });
  $('#btnHints').setAttribute('aria-pressed', String(state.mode === 'belajar' && state.hints));
  $('#btnLabels').setAttribute('aria-pressed', String(state.labels && state.mode === 'belajar'));
  $('#trayHint').textContent = isStacked() ? 'ketuk, atau seret ke atas' : 'ketuk atau seret ke model';
  updateTime();
  updateBanner();
}

// ---------------------------------------------------------------------
// Pesan & kartu info
// ---------------------------------------------------------------------
function toast(html, type = 'info', title = null, ms = 5000) {
  const wrap = $('#toastWrap');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${title ? `<span class="toast-title">${title}</span>` : ''}${html}<button class="x" aria-label="Tutup">×</button>`;
  el.querySelector('.x').onclick = () => el.remove();
  if (type === 'error') wrap.querySelectorAll('.toast.error').forEach(x => x.remove());
  wrap.querySelectorAll('.toast.info').forEach(x => x.remove());
  wrap.prepend(el);
  while (wrap.children.length > 2) wrap.lastChild.remove();
  setTimeout(() => el.remove(), ms);
}

function showInfo(item, completedStep) {
  const card = $('#infoCard');
  const next = completedStep != null && completedStep < C.STEPS.length ? C.STEPS[completedStep] : null;
  card.innerHTML = `
    <h3>✅ ${item.icon} ${esc(item.name)} terpasang</h3>
    <p><b>Fungsi:</b> ${esc(item.func)}</p>
    <p>${esc(item.detail)}</p>
    <p class="k3"><b>⚠️ Tips K3:</b> ${esc(item.k3)}</p>
    ${next ? `<p><b>🎉 Langkah selesai!</b> Berikutnya: <b>Langkah ${next.no} – ${esc(next.title)}</b></p>` : ''}
    <button class="btn btn-primary" id="btnInfoOk">Mengerti, lanjut</button>`;
  card.classList.remove('hidden');
  $('#btnInfoOk').onclick = hideInfo;
}
function hideInfo() { $('#infoCard').classList.add('hidden'); }

// ---------------------------------------------------------------------
// Tombol alat
// ---------------------------------------------------------------------
$('#btnResetCam').addEventListener('click', () => resetSimCamera(true));
$('#btnHints').addEventListener('click', () => {
  if (state.mode !== 'belajar') return;
  state.hints = !state.hints;
  updateTray(); refreshSlots(); updateHUD();
});
$('#btnLabels').addEventListener('click', () => {
  if (state.mode !== 'belajar') return;
  state.labels = !state.labels;
  refreshSlots(); updateHUD();
});
$('#btnRestart').addEventListener('click', async () => {
  if (simInProgress() && !(await confirmBox('Ulangi dari awal? Kemajuan sekarang akan hilang.'))) return;
  startSim(state.mode);
});
$('#btnStop').addEventListener('click', async () => {
  if (!state.sim || state.sim.finished || state.busy) return;
  if (!(await confirmBox('Akhiri simulasi sekarang? Skor dihitung dari tugas yang sudah selesai.'))) return;
  finishSim('berhenti');
});
window.addEventListener('resize', () => { if (state.sim) updateHUD(); });

// ---------------------------------------------------------------------
// Hasil akhir
// ---------------------------------------------------------------------
const STATUS = { selesai: 'Selesai – POST OK ✅', 'waktu-habis': 'Waktu habis ⏰', berhenti: 'Dihentikan sebelum selesai' };

function resultData() {
  const sim = state.sim;
  const score = sim.finalScore();
  const d = new Date();
  return {
    score,
    pred: predicate(score),
    nama: state.mode === 'ujian' ? state.student.nama : (state.student.nama || '-'),
    kelas: state.mode === 'ujian' ? state.student.kelas : (state.student.kelas || '-'),
    mode: state.mode === 'ujian' ? 'Ujian' : 'Belajar',
    tanggal: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    status: STATUS[sim.result],
    tugas: `${sim.doneCount}/${sim.total}`,
    salah: sim.mistakes.length,
    waktu: formatTime(sim.elapsed()),
    mistakes: sim.mistakes,
  };
}

function finishSim(result) {
  const sim = state.sim;
  if (!sim || sim.finished) return;
  sim.finish(result);
  stopTimer();
  state.selected = null;
  refreshSlots();
  updateTray();
  updateHUD();
  hideInfo();
  const r = resultData();
  $('#resBody').innerHTML = `
    <div class="res-score">
      <div class="res-circle">${r.score}<small>/100</small></div>
      <div><b style="font-size:1.25rem">${esc(r.pred)}</b><br>${esc(r.status)}</div>
    </div>
    <table class="res-table">
      ${state.mode === 'ujian' ? `<tr><td>Nama</td><td><b>${esc(r.nama)}</b></td></tr><tr><td>Kelas</td><td><b>${esc(r.kelas)}</b></td></tr>` : ''}
      <tr><td>Mode</td><td>${r.mode}</td></tr>
      <tr><td>Tanggal</td><td>${esc(r.tanggal)}</td></tr>
      <tr><td>Tugas selesai</td><td>${r.tugas}</td></tr>
      <tr><td>Jumlah kesalahan</td><td>${r.salah} (−${r.salah * PENALTY} poin)</td></tr>
      <tr><td>Waktu</td><td>${r.waktu}</td></tr>
    </table>
    ${r.mistakes.length ? `<p style="margin:10px 0 0"><b>Rincian kesalahan:</b></p><ol class="res-mistakes">${r.mistakes.slice(0, 12).map(m => `<li>[Langkah ${Math.min(m.step + 1, C.STEPS.length)}] ${esc(m.text)}</li>`).join('')}</ol>` : '<p>🎯 Sempurna, tanpa kesalahan!</p>'}`;
  state.resultText = resultText(r);
  const img = $('#resImage');
  img.classList.add('hidden');
  img.onload = () => img.classList.remove('hidden');
  state.resultBlob = null;
  makeResultImage(r).then(blob => {
    state.resultBlob = blob;
    if (blob) img.src = URL.createObjectURL(blob);
  });
  const canShare = !!(navigator.canShare && navigator.share);
  $('#btnShare').classList.toggle('hidden', !canShare);
  setTimeout(() => $('#resultModal').classList.remove('hidden'), result === 'selesai' ? 200 : 0);
}

function resultText(r) {
  const lines = [
    'HASIL SIMULASI PERAKITAN KOMPUTER',
    'SMKN 1 Sukabumi – Dasar TJKT',
    '----------------------------------',
    `Nama      : ${r.nama}`,
    `Kelas     : ${r.kelas}`,
    `Mode      : ${r.mode}`,
    `Tanggal   : ${r.tanggal}`,
    `Status    : ${r.status}`,
    `Skor      : ${r.score}/100 (${r.pred})`,
    `Tugas     : ${r.tugas}`,
    `Kesalahan : ${r.salah}`,
    `Waktu     : ${r.waktu}`,
  ];
  if (r.mistakes.length) {
    lines.push('Rincian kesalahan:');
    r.mistakes.forEach((m, i) => lines.push(`${i + 1}. [Langkah ${Math.min(m.step + 1, C.STEPS.length)}] ${m.text}`));
  }
  return lines.join('\n');
}

function makeResultImage(r) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#eef2f7'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#0f172a'; g.fillRect(0, 0, W, 170);
  g.fillStyle = '#38bdf8'; g.font = 'bold 30px "Segoe UI", Arial, sans-serif';
  g.fillText('SMKN 1 Sukabumi – Dasar TJKT', 48, 62);
  g.fillStyle = '#fff'; g.font = 'bold 50px "Segoe UI", Arial, sans-serif';
  g.fillText('Hasil Simulasi Perakitan Komputer', 48, 128);
  // Tangkapan layar 3D
  try {
    renderer.render(simScene, simCam);
    const src = canvas, sw = src.width, sh = src.height;
    const dw = W - 96, dh = 520, ar = dw / dh;
    let sx = 0, sy = 0, cw = sw, ch = sh;
    if (sw / sh > ar) { cw = sh * ar; sx = (sw - cw) / 2; } else { ch = sw / ar; sy = (sh - ch) / 2; }
    g.drawImage(src, sx, sy, cw, ch, 48, 200, dw, dh);
    g.strokeStyle = '#cbd5e1'; g.lineWidth = 4; g.strokeRect(48, 200, dw, dh);
  } catch { /* abaikan */ }
  // Skor
  g.fillStyle = '#1d4ed8';
  g.beginPath(); g.arc(170, 880, 110, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center';
  g.font = 'bold 84px "Segoe UI", Arial, sans-serif'; g.fillText(String(r.score), 170, 905);
  g.font = 'bold 26px "Segoe UI", Arial, sans-serif'; g.fillText('/100', 170, 948);
  g.textAlign = 'left';
  g.fillStyle = '#0f172a'; g.font = 'bold 40px "Segoe UI", Arial, sans-serif';
  g.fillText(r.pred, 320, 840);
  g.font = '30px "Segoe UI", Arial, sans-serif'; g.fillStyle = '#334155';
  g.fillText(r.status.replace(/[✅⏰]/gu, '').trim(), 320, 890);
  g.fillText(`Mode ${r.mode}`, 320, 935);
  // Tabel
  const rows = [['Nama', r.nama], ['Kelas', r.kelas], ['Tanggal', r.tanggal], ['Tugas selesai', r.tugas], ['Jumlah kesalahan', String(r.salah)], ['Waktu', r.waktu]];
  let y = 1040;
  rows.forEach(([k, v]) => {
    g.fillStyle = '#475569'; g.font = '30px "Segoe UI", Arial, sans-serif'; g.fillText(k, 60, y);
    g.fillStyle = '#0f172a'; g.font = 'bold 30px "Segoe UI", Arial, sans-serif'; g.fillText(v, 380, y, W - 440);
    g.strokeStyle = '#cbd5e1'; g.lineWidth = 2; g.beginPath(); g.moveTo(60, y + 16); g.lineTo(W - 60, y + 16); g.stroke();
    y += 46;
  });
  g.fillStyle = '#0f172a'; g.fillRect(0, H - 56, W, 56);
  g.fillStyle = '#cbd5e1'; g.font = '24px "Segoe UI", Arial, sans-serif'; g.textAlign = 'center';
  g.fillText('Dibuat oleh Azis – Dasar TJKT', W / 2, H - 20);
  return new Promise(res => c.toBlob(b => res(b), 'image/png'));
}

function fileName() {
  const slug = (state.student.nama || 'siswa').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'siswa';
  return `hasil-rakit-pc-${slug}.png`;
}

$('#btnSaveImg').addEventListener('click', () => {
  if (!state.resultBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(state.resultBlob);
  a.download = fileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  toastGlobal('Gambar disimpan. Jika tidak terunduh, tekan lama gambar lalu pilih "Simpan gambar".');
});
$('#btnCopy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.resultText);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = state.resultText;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* abaikan */ }
    ta.remove();
  }
  toastGlobal('Teks hasil disalin. Tempel (paste) di WhatsApp / Google Classroom untuk dikirim ke guru.');
});
$('#btnShare').addEventListener('click', async () => {
  try {
    const file = state.resultBlob ? new File([state.resultBlob], fileName(), { type: 'image/png' }) : null;
    const data = { title: 'Hasil Simulasi Perakitan Komputer', text: state.resultText };
    if (file && navigator.canShare({ files: [file] })) data.files = [file];
    await navigator.share(data);
  } catch { /* dibatalkan */ }
});
$('#btnAgain').addEventListener('click', () => startSim(state.mode));
$('#btnMenu').addEventListener('click', () => {
  $('#resultModal').classList.add('hidden');
  showView('home');
});

function toastGlobal(text) {
  const p = document.createElement('p');
  p.className = 'modal-msg ok';
  p.textContent = text;
  const box = $('.result-box');
  box.querySelectorAll('.modal-msg').forEach(x => x.remove());
  box.appendChild(p);
}

// ---------------------------------------------------------------------
// Kenali Komponen
// ---------------------------------------------------------------------
function renderChips() {
  $('#exChips').innerHTML = C.EXPLORE.map((e, i) => `<button class="chip" data-i="${i}">${e.icon} ${esc(e.name)}</button>`).join('');
  $$('#exChips .chip').forEach(b => b.addEventListener('click', () => showExplore(+b.dataset.i)));
}

function resetExCamera() {
  exCam.position.copy(exCamDefault());
  exControls.target.set(0, 0, 0);
  exControls.update();
}

function showExplore(i) {
  const n = C.EXPLORE.length;
  exIndex = (i + n) % n;
  const e = C.EXPLORE[exIndex];
  exHolder.children.slice().forEach(o => { exHolder.remove(o); disposeTree(o); });
  const obj = e.build();
  if (EX_ROT[e.id]) obj.rotation.set(...EX_ROT[e.id]);
  (e.labels || []).forEach(l => {
    const s = C.makeLabel(l.text, { h: 0.16 });
    s.position.set(...l.pos);
    obj.add(s);
  });
  const wrap = new THREE.Group();
  wrap.add(obj);
  const box = new THREE.Box3().setFromObject(obj);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  obj.position.sub(sphere.center);
  wrap.scale.setScalar(1.35 / sphere.radius);
  exHolder.add(wrap);
  $$('#exChips .chip').forEach(b => b.classList.toggle('active', +b.dataset.i === exIndex));
  $('#exChips .chip.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  $('#exCounter').textContent = `${exIndex + 1}/${n}`;
  $('#exInfo').innerHTML = `
    <h2>${e.icon} ${esc(e.name)}</h2>
    <p class="func"><b>Fungsi:</b> ${esc(e.func)}</p>
    <p>${esc(e.detail)}</p>
    <h4>Ciri-ciri</h4>
    <ul>${e.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
    <p class="k3"><b>⚠️ Tips K3:</b> ${esc(e.k3)}</p>`;
  resetExCamera();
}

$('#btnExPrev').addEventListener('click', () => showExplore(exIndex - 1));
$('#btnExNext').addEventListener('click', () => showExplore(exIndex + 1));
$('#btnExReset').addEventListener('click', resetExCamera);
$('#btnExRotate').addEventListener('click', e => {
  exControls.autoRotate = !exControls.autoRotate;
  e.currentTarget.setAttribute('aria-pressed', String(exControls.autoRotate));
});
window.addEventListener('keydown', e => {
  if (state.view === 'explore' && e.key === 'ArrowRight') showExplore(exIndex + 1);
  if (state.view === 'explore' && e.key === 'ArrowLeft') showExplore(exIndex - 1);
  if (e.key === 'Escape' && state.view === 'sim' && state.selected) select(null);
});

// ---------------------------------------------------------------------
// Inisialisasi
// ---------------------------------------------------------------------
renderChips();
drawMonitor('off');
$('#simViewport').prepend(canvas);
resize();
resetSimCamera(false);
$$('.loading').forEach(l => l.remove());
makeThumbnails();

// Hook pengujian otomatis (hanya aktif jika URL berisi ?test)
if (new URLSearchParams(location.search).has('test')) {
  window.__rakit = {
    state,
    slotScreen(id) {
      const m = slotGroup.children.find(s => s.userData.slot === id && s.visible);
      if (!m) return null;
      const v = m.getWorldPosition(new THREE.Vector3()).project(simCam);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
    },
  };
}
