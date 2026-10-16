// =====================================================================
//  components.js — DATA & MODEL 3D komponen komputer
//  ---------------------------------------------------------------
//  Isi file ini:
//   1. Helper pembuat geometri (box, silinder, label, kipas)
//   2. ITEMS  : daftar komponen yang bisa dipasang (teks + model 3D)
//   3. SLOTS  : lokasi tujuan pemasangan di dalam casing (koordinat 3D)
//   4. STEPS  : URUTAN langkah perakitan (ubah di sini untuk mengganti urutan)
//   5. CABLES : jalur kabel daya / front panel
//   6. Model casing, motherboard, monitor, dan daftar "Kenali Komponen"
//
//  Sistem koordinat (1 unit ≈ 10 cm):
//   x = belakang(-) → depan(+) casing, y = bawah → atas, z = dalam → luar
//   Motherboard menempel di dinding belakang, permukaannya di z = MB_Z.
// =====================================================================
import * as THREE from 'three';

export const MB_Z = -0.825;

// ---------------------------------------------------------------------
// 0. PLATFORM: generasi processor + jenis RAM yang cocok
//    Tambah platform baru cukup dengan menambah entri di sini
//    (dan id-nya di PLATFORM_ORDER).
// ---------------------------------------------------------------------
export const RAM_TYPES = {
  ddr3: { id: 'ddr3', name: 'DDR3', year: '2007', pins: '240 pin', volt: '1,5 V (DDR3L 1,35 V)', speed: '1066–2133 MT/s',
    label: 'DDR3 8GB 1600', kit: '2 × 8 GB DDR3-1600', notch: 0.12, pcb: 0x065f46, hs: null, rgb: null,
    note: 'Generasi lama, masih banyak di PC lab sekolah. Modul tanpa heatsink, chip memori terlihat jelas.' },
  ddr4: { id: 'ddr4', name: 'DDR4', year: '2014', pins: '288 pin', volt: '1,2 V', speed: '2133–3600 MT/s',
    label: 'DDR4 8GB 3200', kit: '2 × 8 GB DDR4-3200', notch: -0.04, pcb: 0x065f46, hs: 0x1e293b, rgb: 0xa855f7,
    note: 'Paling umum pada PC 2015–2022. Tepi bawah modul sedikit melengkung.' },
  ddr5: { id: 'ddr5', name: 'DDR5', year: '2021', pins: '288 pin', volt: '1,1 V', speed: '4800–8000 MT/s',
    label: 'DDR5 16GB 6000', kit: '2 × 16 GB DDR5-6000', notch: 0.03, pcb: 0x0f172a, hs: 0xd1d5db, rgb: 0x22d3ee,
    note: 'Standar PC terbaru. Punya chip PMIC (pengatur daya) di modul dan 2 sub-channel per keping.' },
};

export const PLATFORMS = {
  intel4: {
    id: 'intel4', brand: 'Intel', name: 'Intel Core Gen 4 (Haswell)', short: 'Intel Gen 4', year: '2013–2014', era: 'PC lama',
    socket: 'LGA1150', socketType: 'LGA', chipset: 'Z97', ram: 'ddr3', ssd: 'M.2 SATA SSD 256GB',
    cpu: { model: 'Intel Core i5-4590', label: 'intel CORE i5\n4590', spec: '4 core / 4 thread • 3,3–3,7 GHz', size: [0.375, 0.375] },
    note: 'Generasi lama yang masih sering ditemui di lab sekolah. Hanya mendukung RAM DDR3.',
  },
  intel12: {
    id: 'intel12', brand: 'Intel', name: 'Intel Core Gen 12–14', short: 'Intel Gen 12–14', year: '2021–2023', era: 'Masih umum',
    socket: 'LGA1700', socketType: 'LGA', chipset: 'B760', ram: 'ddr4', ssd: 'NVMe SSD 512GB',
    cpu: { model: 'Intel Core i5-12400F', label: 'intel CORE i5\n12400F', spec: '6 core / 12 thread • 2,5–4,4 GHz', size: [0.375, 0.45] },
    note: 'Motherboard LGA1700 ada versi DDR4 dan versi DDR5. Motherboard B760 di simulasi ini versi DDR4.',
  },
  intelUltra: {
    id: 'intelUltra', brand: 'Intel', name: 'Intel Core Ultra 200S', short: 'Intel Core Ultra', year: '2024–sekarang', era: 'Terbaru',
    socket: 'LGA1851', socketType: 'LGA', chipset: 'B860', ram: 'ddr5', ssd: 'NVMe SSD 1TB',
    cpu: { model: 'Intel Core Ultra 5 245K', label: 'intel CORE ULTRA 5\n245K', spec: '14 core / 14 thread • hingga 5,2 GHz', size: [0.375, 0.45] },
    note: 'Generasi Intel terbaru untuk desktop. Hanya mendukung RAM DDR5.',
  },
  am4: {
    id: 'am4', brand: 'AMD', name: 'AMD Ryzen 1000–5000 (AM4)', short: 'AMD Ryzen AM4', year: '2017–2022', era: 'Masih umum',
    socket: 'AM4', socketType: 'PGA', chipset: 'B550', ram: 'ddr4', ssd: 'NVMe SSD 512GB',
    cpu: { model: 'AMD Ryzen 5 5600', label: 'AMD RYZEN 5\n5600', spec: '6 core / 12 thread • 3,5–4,4 GHz', size: [0.4, 0.4] },
    note: 'Socket AM4 bertipe PGA: pin ada di CPU, bukan di socket. Hanya mendukung RAM DDR4.',
  },
  am5: {
    id: 'am5', brand: 'AMD', name: 'AMD Ryzen 7000–9000 (AM5)', short: 'AMD Ryzen AM5', year: '2022–sekarang', era: 'Terbaru',
    socket: 'AM5', socketType: 'LGA', chipset: 'B650', ram: 'ddr5', ssd: 'NVMe SSD 1TB',
    cpu: { model: 'AMD Ryzen 5 7600', label: 'AMD RYZEN 5\n7600', spec: '6 core / 12 thread • 3,8–5,1 GHz', size: [0.4, 0.4] },
    note: 'AMD pindah ke socket LGA (pin di socket) pada AM5. Hanya mendukung RAM DDR5.',
  },
};
export const PLATFORM_ORDER = ['intel4', 'intel12', 'intelUltra', 'am4', 'am5'];

let CUR = PLATFORMS.intel12;
export function setPlatform(id) { CUR = PLATFORMS[id] ?? PLATFORMS.intel12; return CUR; }
export function getPlatform() { return CUR; }

// ---------------------------------------------------------------------
// 1. Helper
// ---------------------------------------------------------------------
export function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: o.r ?? 0.6,
    metalness: o.m ?? 0.1,
    transparent: o.o !== undefined,
    opacity: o.o ?? 1,
    side: o.side ?? THREE.FrontSide,
  });
}

/** Material LED: mati = abu-abu gelap, menyala saat PC dinyalakan (lihat main.js). */
export function ledMat(color) {
  const m = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.4, emissive: 0x000000 });
  m.userData.ledColor = color;
  return m;
}

function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Silinder dengan sumbu Z (menghadap ke luar layar). */
function cylZ(r, h, m, x = 0, y = 0, z = 0, seg = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

/** Tekstur kanvas berisi teks (mendukung beberapa baris dengan "\n"). */
export function textTexture(text, o = {}) {
  const w = o.w ?? 512, h = o.h ?? 128;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); }
  g.fillStyle = o.fg ?? '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lines = String(text).split('\n');
  const size = o.size ?? Math.floor(h / (lines.length + 0.7));
  g.font = `${o.weight ?? 'bold'} ${size}px "Segoe UI", Roboto, Arial, sans-serif`;
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.12, w - 16));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Bidang datar bertuliskan teks (stiker/label pada komponen). */
function decal(text, w, h, o = {}) {
  const pxW = 512, pxH = Math.min(512, Math.max(64, Math.round(512 * h / w)));
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: textTexture(text, { w: pxW, h: pxH, ...o }), transparent: !o.bg }),
  );
  return m;
}

function triangle(s, color, x, y, z) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.lineTo(s, 0); sh.lineTo(0, s); sh.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  m.position.set(x, y, z);
  return m;
}

/** Label melayang (sprite) yang selalu menghadap kamera. */
export function makeLabel(text, o = {}) {
  const pad = 22, size = 44;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = `bold ${size}px "Segoe UI", Roboto, Arial, sans-serif`;
  const tw = Math.ceil(g.measureText(text).width);
  c.width = tw + pad * 2; c.height = size + pad * 1.4;
  g.font = `bold ${size}px "Segoe UI", Roboto, Arial, sans-serif`;
  const r = 18, W = c.width, H = c.height;
  g.fillStyle = o.bg ?? 'rgba(15,23,42,0.9)';
  g.strokeStyle = o.border ?? '#38bdf8';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(r, 3); g.lineTo(W - r, 3); g.quadraticCurveTo(W - 3, 3, W - 3, r);
  g.lineTo(W - 3, H - r); g.quadraticCurveTo(W - 3, H - 3, W - r, H - 3);
  g.lineTo(r, H - 3); g.quadraticCurveTo(3, H - 3, 3, H - r);
  g.lineTo(3, r); g.quadraticCurveTo(3, 3, r, 3); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = o.fg ?? '#ffffff';
  g.textBaseline = 'middle';
  g.fillText(text, pad, H / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.renderOrder = 999;
  const h = o.h ?? 0.2;
  sp.scale.set(h * W / H, h, 1);
  sp.center.set(0.5, 0);
  return sp;
}

/** Kipas (menghadap +Z). Bagian baling-baling ditandai userData.spin agar bisa berputar. */
export function makeFan(size, o = {}) {
  const g = new THREE.Group();
  const fm = mat(o.frame ?? 0x1f2937, { r: 0.7 });
  const t = size * 0.08, d = size * 0.25;
  g.add(
    box(size, t, d, fm, 0, size / 2 - t / 2, 0), box(size, t, d, fm, 0, -size / 2 + t / 2, 0),
    box(t, size, d, fm, size / 2 - t / 2, 0, 0), box(t, size, d, fm, -size / 2 + t / 2, 0, 0),
  );
  const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 0.44, size * 0.03, 8, 40), o.led ? ledMat(o.led) : fm);
  ring.position.z = d * 0.3;
  g.add(ring);
  const blades = new THREE.Group();
  blades.userData.spin = true;
  blades.add(cylZ(size * 0.14, d * 0.9, mat(o.hub ?? 0x111827)));
  const bm = mat(o.blade ?? 0x475569, { r: 0.5 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const b = box(size * 0.28, size * 0.14, d * 0.12, bm);
    b.position.set(Math.cos(a) * size * 0.27, Math.sin(a) * size * 0.27, 0);
    b.rotation.z = a;
    b.rotateX(0.5);
    blades.add(b);
  }
  g.add(blades);
  return g;
}

// ---------------------------------------------------------------------
// 2. Model komponen (koordinat lokal; titik 0 = titik pemasangan)
// ---------------------------------------------------------------------
const GOLD = 0xd4a017;

export function buildCPUFor(p = CUR) {
  const g = new THREE.Group();
  const [w, h] = p.cpu.size;
  const amd = p.brand === 'AMD';
  g.add(box(w, h, 0.03, mat(amd ? 0x14532d : 0x166534), 0, 0, 0.015));
  const iw = w * (amd ? 0.88 : 0.8), ih = h * (amd ? 0.88 : 0.72);
  g.add(box(iw, ih, 0.035, mat(0xcbd5e1, { m: 0.85, r: 0.3 }), 0, 0, 0.047));
  const d = decal(p.cpu.label, iw * 0.92, ih * 0.5, { fg: '#1e293b' });
  d.position.set(0, 0, 0.0655);
  g.add(d);
  g.add(triangle(0.07, 0xfacc15, -w / 2 + 0.005, -h / 2 + 0.005, 0.031));
  if (p.socketType === 'PGA') {
    // PGA: ratusan pin halus di bawah CPU
    const pins = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.9, 0.02), mat(GOLD, { m: 0.9, r: 0.4 }));
    pins.position.z = -0.01;
    g.add(pins);
  }
  return g;
}
const buildCPU = () => buildCPUFor(CUR);

function buildPaste() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 16), mat(0x94a3b8));
  tip.rotation.x = Math.PI; tip.position.y = 0.06;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 20), mat(0xe2e8f0, { o: 0.85 }));
  barrel.position.y = 0.37;
  const pasteIn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16), mat(0x9ca3af));
  pasteIn.position.y = 0.28;
  const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 12), mat(0x334155));
  plunger.position.y = 0.72;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 20), mat(0x334155));
  cap.position.y = 0.85;
  inner.add(tip, barrel, pasteIn, plunger, cap);
  const lbl = decal('THERMAL\nPASTE', 0.11, 0.3, { bg: '#1d4ed8', size: 70 });
  lbl.rotation.z = Math.PI / 2;
  lbl.position.set(0, 0.4, 0.062);
  lbl.rotation.set(0, 0, Math.PI / 2);
  inner.add(lbl);
  inner.rotation.x = Math.PI / 2; // ujung jarum menghadap -Z (ke motherboard)
  g.add(inner);
  return g;
}

export function buildPasteBlob() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.012, 24), mat(0x9ca3af, { r: 0.3, m: 0.5 }));
  m.rotation.x = Math.PI / 2;
  return m;
}

function buildCooler() {
  const g = new THREE.Group();
  const copper = mat(0xb87333, { m: 0.85, r: 0.3 });
  const alu = mat(0xd1d5db, { m: 0.8, r: 0.35 });
  g.add(box(0.42, 0.42, 0.06, copper, 0, 0, 0.125));
  g.add(box(1.15, 0.08, 0.04, mat(0x374151, { m: 0.6 }), 0, 0, 0.12));
  for (let i = 0; i < 4; i++) g.add(cylZ(0.025, 0.2, copper, -0.15 + i * 0.1, 0, 0.25, 12));
  for (let i = 0; i < 18; i++) g.add(box(0.95, 0.016, 0.48, alu, 0, -0.45 + i * 0.053, 0.5));
  const fan = makeFan(0.92, { led: 0x38bdf8, frame: 0x111827 });
  fan.position.z = 0.86;
  g.add(fan);
  return g;
}

/** Satu keping RAM berdiri (panjang sepanjang Y, tinggi ke arah Z). */
function buildRAMStick(type) {
  const R = RAM_TYPES[type];
  const g = new THREE.Group();
  g.add(box(0.03, 1.33, 0.3, mat(R.pcb), 0, 0, 0.17));
  // Kaki emas dengan takik (notch) — posisinya beda tiap generasi
  const L = 1.25, n = R.notch * L, gap = 0.035;
  const gm = mat(GOLD, { m: 0.9, r: 0.3 });
  const l1 = (n - gap) + L / 2, l2 = L / 2 - (n + gap);
  g.add(box(0.032, l1, 0.03, gm, 0, -L / 2 + l1 / 2, 0.02), box(0.032, l2, 0.03, gm, 0, L / 2 - l2 / 2, 0.02));
  if (R.hs) {
    g.add(box(0.06, 1.3, 0.25, mat(R.hs, { m: 0.6, r: 0.4 }), 0, 0, 0.19));
  } else {
    for (let i = 0; i < 8; i++) g.add(box(0.045, 0.12, 0.1, mat(0x111827), 0, -0.53 + i * 0.152, 0.2));
  }
  if (R.rgb) g.add(box(0.062, 1.28, 0.04, ledMat(R.rgb), 0, 0, 0.33));
  const d = decal(R.label, 1.0, 0.13, { fg: R.hs === 0xd1d5db ? '#0f172a' : '#e2e8f0' });
  d.rotation.y = Math.PI / 2;
  d.position.set(R.hs ? 0.032 : 0.024, 0, R.hs ? 0.19 : 0.29);
  g.add(d);
  return g;
}

export function buildRAMFor(type = CUR.ram) {
  const g = new THREE.Group();
  const a = buildRAMStick(type); a.position.x = -0.12;
  const b = buildRAMStick(type); b.position.x = 0.12;
  g.add(a, b);
  return g;
}
const buildRAM = () => buildRAMFor(CUR.ram);

/** RAM tampak depan (untuk perbandingan DDR3/4/5). */
function buildRAMFlat(type) {
  const R = RAM_TYPES[type];
  const g = new THREE.Group();
  g.add(box(1.33, 0.3, 0.03, mat(R.pcb)));
  const L = 1.25, n = R.notch * L, gap = 0.035;
  const gm = mat(GOLD, { m: 0.9, r: 0.3 });
  const l1 = (n - gap) + L / 2, l2 = L / 2 - (n + gap);
  g.add(box(l1, 0.05, 0.032, gm, -L / 2 + l1 / 2, -0.125, 0), box(l2, 0.05, 0.032, gm, L / 2 - l2 / 2, -0.125, 0));
  if (R.hs) g.add(box(1.3, 0.22, 0.05, mat(R.hs, { m: 0.6, r: 0.4 }), 0, 0.03, 0));
  else for (let i = 0; i < 8; i++) g.add(box(0.12, 0.1, 0.045, mat(0x111827), -0.53 + i * 0.152, 0.04, 0));
  if (R.rgb) g.add(box(1.28, 0.04, 0.06, ledMat(R.rgb), 0, 0.15, 0));
  const d = decal(R.label, 0.9, 0.1, { fg: R.hs === 0xd1d5db ? '#0f172a' : '#e2e8f0' });
  d.position.set(0, 0.04, R.hs ? 0.026 : 0.024);
  g.add(d);
  // penanda posisi takik
  const mark = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 3), mat(0xef4444));
  mark.rotation.z = Math.PI;
  mark.position.set(n, -0.21, 0);
  g.add(mark);
  return g;
}

function buildRAMCompare() {
  const g = new THREE.Group();
  ['ddr3', 'ddr4', 'ddr5'].forEach((t, i) => {
    const s = buildRAMFlat(t);
    s.position.y = 0.55 - i * 0.55;
    g.add(s);
  });
  return g;
}

function buildCPULineup() {
  const g = new THREE.Group();
  PLATFORM_ORDER.forEach((id, i) => {
    const c = buildCPUFor(PLATFORMS[id]);
    const row = i < 3 ? 0 : 1;
    const col = i < 3 ? i - 1 : (i - 3) - 0.5;
    c.position.set(col * 0.62, row ? -0.5 : 0.36, 0);
    g.add(c);
  });
  return g;
}

function buildSSD() {
  const g = new THREE.Group();
  g.add(box(0.8, 0.22, 0.02, mat(0x0f172a)));
  g.add(box(0.05, 0.2, 0.021, mat(GOLD, { m: 0.9 }), -0.39, 0, 0));
  for (let i = 0; i < 3; i++) g.add(box(0.17, 0.15, 0.02, mat(0x1f2937), -0.2 + i * 0.22, 0, 0.02));
  const d = decal(CUR.ssd, 0.6, 0.15, { bg: '#0ea5e9', fg: '#ffffff' });
  d.position.set(0.02, 0, 0.032);
  g.add(d);
  return g;
}

function buildHDD() {
  const g = new THREE.Group();
  g.add(box(1.3, 0.24, 0.92, mat(0x94a3b8, { m: 0.75, r: 0.35 })));
  g.add(box(1.25, 0.02, 0.88, mat(0x15803d), 0, -0.125, 0));
  const top = decal('HDD 1TB\n7200 RPM • SATA', 0.9, 0.55, { bg: '#e2e8f0', fg: '#0f172a', border: '#64748b' });
  top.rotation.x = -Math.PI / 2; top.position.set(0.1, 0.121, 0);
  g.add(top);
  const front = decal('HDD 3,5" SATA', 0.9, 0.16, { fg: '#0f172a' });
  front.position.set(0, 0, 0.461);
  g.add(front);
  g.add(box(0.03, 0.07, 0.24, mat(0x111827), -0.66, 0, -0.15)); // soket daya SATA
  g.add(box(0.03, 0.06, 0.12, mat(0x111827), -0.66, 0, 0.12)); // soket data SATA
  return g;
}

function buildGPU() {
  const g = new THREE.Group();
  g.add(box(2.6, 0.035, 1.1, mat(0x14532d), 0.6, 0, 0.6));                 // PCB
  g.add(box(0.9, 0.03, 0.08, mat(GOLD, { m: 0.9 }), 0, 0, 0.04));         // kaki PCIe
  g.add(box(2.6, 0.03, 1.1, mat(0x0f172a, { m: 0.6 }), 0.6, 0.035, 0.6));  // backplate
  g.add(box(2.6, 0.36, 1.12, mat(0x1f2937, { m: 0.4, r: 0.5 }), 0.6, -0.2, 0.6)); // shroud
  g.add(box(2.4, 0.04, 0.05, ledMat(0x22c55e), 0.6, -0.2, 1.17));          // strip LED
  const fan1 = makeFan(0.95, { frame: 0x111827, blade: 0x64748b });
  const fan2 = makeFan(0.95, { frame: 0x111827, blade: 0x64748b });
  fan1.rotation.x = fan2.rotation.x = Math.PI / 2; // menghadap -Y (bawah)
  fan1.position.set(0.05, -0.41, 0.6);
  fan2.position.set(1.15, -0.41, 0.6);
  g.add(fan1, fan2);
  g.add(box(0.02, 0.5, 1.15, mat(0xcbd5e1, { m: 0.9 }), -0.73, -0.15, 0.6)); // bracket
  const lbl = decal('GRAPHICS CARD  •  8GB', 1.6, 0.2, { fg: '#e2e8f0' });
  lbl.position.set(0.3, -0.2, 1.161);
  g.add(lbl);
  g.add(box(0.22, 0.1, 0.06, mat(0x111827), 1.65, -0.0, 1.17)); // soket daya PCIe 8-pin
  return g;
}

function buildPSU() {
  const g = new THREE.Group();
  g.add(box(1.5, 0.86, 1.4, mat(0x111827, { m: 0.4, r: 0.5 })));
  const fan = makeFan(1.0, { frame: 0x0b0f19, blade: 0x334155 });
  fan.rotation.x = -Math.PI / 2;
  fan.position.y = 0.4;
  g.add(fan);
  const lbl = decal('PSU 650W\n80+ BRONZE', 1.0, 0.45, { fg: '#facc15' });
  lbl.position.set(0, 0, 0.701);
  g.add(lbl);
  g.add(box(0.02, 0.6, 1.1, mat(0x374151), 0.76, 0, 0));
  for (let i = 0; i < 4; i++) g.add(box(0.03, 0.12, 0.2, mat(0x0b0f19), 0.775, 0.15 - (i % 2) * 0.25, -0.35 + Math.floor(i / 2) * 0.5));
  g.add(box(0.02, 0.2, 0.15, mat(0x0b0f19), -0.76, 0.1, 0.3));  // soket AC
  g.add(box(0.03, 0.1, 0.08, mat(0xdc2626), -0.77, 0.1, 0.05)); // saklar
  return g;
}

function buildCableDisplay(color, conn, connColor, text) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.9, -0.4, 0), new THREE.Vector3(-0.4, 0.2, 0.2),
    new THREE.Vector3(0.1, -0.2, -0.1), new THREE.Vector3(0.5, 0.25, 0),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.06, 8), mat(color, { r: 0.8 })));
  const c = box(conn[0], conn[1], conn[2], mat(connColor));
  c.position.set(0.5 + conn[0] / 2, 0.25, 0);
  g.add(c);
  const c2 = c.clone(); c2.position.set(-0.9 - conn[0] / 2, -0.4, 0);
  g.add(c2);
  if (text) {
    const d = decal(text, 0.6, 0.15, { fg: '#ffffff', bg: '#0f172a' });
    d.position.set(0.5 + conn[0] / 2, 0.45, 0.05);
    g.add(d);
  }
  return g;
}

function buildFrontPanelCable() {
  const g = new THREE.Group();
  const colors = [0xef4444, 0x22c55e, 0x3b82f6, 0xf8fafc];
  colors.forEach((col, i) => {
    const off = (i - 1.5) * 0.06;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.9, -0.3 + off, 0), new THREE.Vector3(-0.3, 0.2 + off, 0.1), new THREE.Vector3(0.4, off * 2, 0),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.018, 6), mat(col)));
    g.add(box(0.07, 0.05, 0.08, mat(0x111827), 0.44, off * 2, 0));
  });
  const d = decal('POWER SW • RESET • LED', 1.0, 0.13, { fg: '#ffffff', bg: '#0f172a' });
  d.position.set(0, 0.45, 0.05);
  g.add(d);
  return g;
}

function buildSidePanel() {
  const g = new THREE.Group();
  const frame = mat(0x9ca3af, { m: 0.7, r: 0.35 });
  g.add(box(4.4, 0.08, 0.04, frame, 0, 2.31, 0), box(4.4, 0.08, 0.04, frame, 0, -2.31, 0));
  g.add(box(0.08, 4.7, 0.04, frame, 2.16, 0, 0), box(0.08, 4.7, 0.04, frame, -2.16, 0, 0));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, depthWrite: false });
  g.add(box(4.3, 4.6, 0.02, glass));
  const screw = mat(0x475569, { m: 0.9 });
  [[-2.05, 2.2], [2.05, 2.2], [-2.05, -2.2], [2.05, -2.2]].forEach(([x, y]) => g.add(cylZ(0.06, 0.06, screw, x, y, 0.04, 12)));
  return g;
}

function buildPowerIcon() {
  const g = new THREE.Group();
  g.add(cylZ(0.35, 0.12, mat(0x1f2937, { m: 0.6 })));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 8, 40), ledMat(0x22c55e));
  g.add(ring);
  const d = decal('⏻', 0.45, 0.45, { fg: '#22c55e', size: 300 });
  d.position.z = 0.061;
  g.add(d);
  return g;
}

// ---------------------------------------------------------------------
// 3. ITEMS — daftar komponen. Field penting:
//    name, icon, func (fungsi), detail, features (ciri-ciri), k3 (tips K3),
//    where (letak yang benar → dipakai di pesan kesalahan),
//    why (alasan urutan → dipakai di pesan "urutan salah"),
//    install: 'move' | 'paste' | 'cable' | 'action',
//    place: posisi & rotasi akhir di dalam casing, approach: arah datang animasi
// ---------------------------------------------------------------------
export const ITEMS = {
  cpu: {
    name: 'Processor (CPU)', icon: '🧠', build: buildCPU, install: 'move',
    place: { pos: [-0.95, 3.55, MB_Z + 0.03] },
    func: 'Otak komputer: menjalankan instruksi program dan melakukan semua perhitungan.',
    detail: 'CPU dipasang pada socket di motherboard. Tanda segitiga emas di pojok CPU harus sejajar dengan tanda segitiga pada socket. Letakkan CPU perlahan tanpa ditekan, lalu turunkan tuas pengunci.',
    features: ['Ada tanda segitiga emas sebagai penanda orientasi', 'Socket CPU harus sama dengan socket motherboard (misal LGA1700, AM4, AM5)', 'Merek: Intel (Core i3/i5/i7/i9, Core Ultra) dan AMD (Ryzen 3/5/7/9)', 'Spesifikasi: kecepatan (GHz), jumlah core & thread'],
    k3: 'Pegang CPU di bagian tepinya, jangan sentuh pin/kontak emasnya. Gunakan gelang antistatis.',
    where: 'Processor dipasang di socket CPU — dudukan persegi dengan tuas pengunci di bagian atas motherboard.',
    why: 'CPU dipasang paling awal saat motherboard masih mudah dijangkau.',
  },
  paste: {
    name: 'Thermal Paste', icon: '🧴', build: buildPaste, install: 'paste',
    place: { pos: [-0.95, 3.55, MB_Z + 0.03 + 0.072] },
    func: 'Mengisi celah mikroskopis antara CPU dan heatsink agar panas berpindah dengan baik.',
    detail: 'Oleskan sedikit saja (kira-kira sebesar biji kacang hijau) di tengah permukaan CPU. Tekanan heatsink akan meratakannya.',
    features: ['Berbentuk pasta abu-abu dalam suntikan (syringe)', 'Bersifat menghantarkan panas', 'Diganti berkala (± 1–2 tahun)'],
    k3: 'Jangan terlalu banyak. Hindari kontak dengan mata/kulit dan cuci tangan setelahnya.',
    where: 'Thermal paste dioleskan di tengah permukaan atas CPU yang sudah terpasang.',
    why: 'Thermal paste dioleskan di atas CPU, jadi CPU harus terpasang lebih dulu.',
  },
  cooler: {
    name: 'Heatsink & Fan CPU', icon: '🌀', build: buildCooler, install: 'move',
    place: { pos: [-0.95, 3.55, MB_Z] },
    func: 'Menyerap dan membuang panas dari CPU agar suhu tetap aman.',
    detail: 'Heatsink diletakkan tepat di atas CPU yang sudah diberi thermal paste, lalu dikunci pada dudukannya. Kabel kipas dicolok ke header CPU_FAN.',
    features: ['Sirip aluminium & pipa tembaga (heatpipe)', 'Kipas mendorong udara melewati sirip', 'Kabel kipas ke header CPU_FAN'],
    k3: 'Lepas plastik pelindung di dasar heatsink. Kencangkan sekrup secara menyilang dan bertahap.',
    where: 'Heatsink/fan dipasang tepat di atas CPU, mengunci pada dudukan di sekitar socket.',
    why: 'Heatsink dipasang SETELAH thermal paste dioleskan di atas CPU. Tanpa pasta, panas tidak tersalurkan dan CPU bisa overheat.',
  },
  ram: {
    name: 'RAM (2 keping)', icon: '📏', build: buildRAM, install: 'move',
    place: { pos: [-0.01, 3.4, MB_Z] },
    func: 'Memori utama yang menyimpan data & program yang sedang berjalan sementara (hilang saat listrik mati).',
    detail: 'Buka pengunci di ujung slot DIMM, sejajarkan takik (notch) RAM dengan sekat slot, lalu tekan kedua ujung hingga pengunci berbunyi "klik". Untuk 2 keping, gunakan slot A2 & B2 agar dual-channel.',
    features: ['Bentuk batang panjang dengan pin emas di bawah', 'Jenis DDR3, DDR4, DDR5 tidak bisa saling tukar — posisi takik (notch) berbeda', 'Jenis RAM harus sesuai yang didukung motherboard', 'Kapasitas dalam GB, kecepatan dalam MT/s'],
    k3: 'Jangan menyentuh pin emas. Pastikan notch sejajar — jangan dipaksa.',
    where: 'RAM dipasang di slot DIMM A2 & B2 (slot ke-2 dan ke-4 dari CPU), di sebelah kanan socket.',
    why: 'RAM dipasang setelah CPU dan pendinginnya agar heatsink yang besar tidak terhalang saat dipasang.',
    approach: [0, 0, 1],
  },
  ssd: {
    name: 'SSD M.2 NVMe', icon: '💾', build: buildSSD, install: 'move',
    place: { pos: [-0.75, 2.75, MB_Z + 0.04] },
    func: 'Media penyimpanan permanen berkecepatan sangat tinggi untuk sistem operasi dan aplikasi.',
    detail: 'Masukkan SSD ke slot M.2 dengan sudut ±30°, tekan ke bawah, lalu kunci dengan sekrup kecil di ujungnya.',
    features: ['Bentuk kecil seperti stik permen karet', 'Tanpa kabel — langsung ke motherboard', 'Jauh lebih cepat dari HDD'],
    k3: 'Gunakan obeng ukuran yang pas agar sekrup kecil tidak dol atau jatuh ke motherboard.',
    where: 'SSD M.2 dipasang di slot M.2 — slot kecil mendatar di antara socket dan slot PCIe.',
    why: 'Storage dipasang setelah CPU, heatsink, dan RAM selesai, dan sebelum VGA (karena VGA bisa menutupi slot M.2).',
  },
  hdd: {
    name: 'HDD SATA 3,5"', icon: '🗄️', build: buildHDD, install: 'move',
    place: { pos: [1.5, 0.45, -0.25] },
    func: 'Media penyimpanan permanen berkapasitas besar untuk menyimpan data (dokumen, foto, video).',
    detail: 'HDD dimasukkan ke drive bay di bagian depan bawah casing, lalu dikencangkan dengan sekrup/klip. HDD memakai kabel daya SATA dari PSU dan kabel data SATA ke motherboard.',
    features: ['Berisi piringan berputar (7200 RPM)', 'Konektor SATA daya (lebar) & data (kecil)', 'Kapasitas besar, harga per GB murah'],
    k3: 'HDD peka guncangan — jangan dijatuhkan atau dibenturkan saat dipasang.',
    where: 'HDD 3,5" dipasang di drive bay (rak storage) di bagian depan bawah casing.',
    why: 'Storage dipasang setelah komponen utama di sekitar socket selesai.',
  },
  gpu: {
    name: 'VGA Card (Kartu Grafis)', icon: '🎮', build: buildGPU, install: 'move',
    place: { pos: [-1.35, 2.35, MB_Z] },
    func: 'Mengolah dan menampilkan gambar/video ke monitor, juga mempercepat game dan aplikasi grafis.',
    detail: 'Lepas penutup bracket di casing, buka pengunci slot PCIe x16, masukkan kartu tegak lurus hingga terkunci, lalu kencangkan sekrup bracket.',
    features: ['Slot PCIe x16 (paling panjang)', 'Punya kipas & memori sendiri (VRAM)', 'Butuh daya tambahan dari kabel PCIe 6+2 pin'],
    k3: 'Pegang kartu di tepinya. Tekan rata dan tegak, jangan dimiringkan. Kencangkan sekrup bracket agar tidak melengkung.',
    where: 'VGA card dipasang di slot PCIe x16 paling atas (terdekat dengan CPU).',
    why: 'VGA dipasang setelah storage karena kartu VGA yang panjang bisa menutupi slot M.2 dan menghalangi pemasangan.',
  },
  psu: {
    name: 'Power Supply (PSU)', icon: '🔌', build: buildPSU, install: 'move',
    place: { pos: [-1.38, 0.55, -0.32] },
    func: 'Mengubah listrik AC dari PLN (220V) menjadi listrik DC (12V, 5V, 3,3V) untuk semua komponen.',
    detail: 'Masukkan PSU ke ruang PSU di bawah casing (kipas menghadap ventilasi), lalu kencangkan 4 sekrup di bagian belakang casing.',
    features: ['Daya dalam Watt (misal 650W)', 'Sertifikat efisiensi 80+ (Bronze, Gold, dll.)', 'Ada saklar ON/OFF dan soket kabel AC'],
    k3: 'Pastikan saklar PSU OFF dan kabel listrik BELUM dicolok. Jangan pernah membuka casing PSU — kapasitornya menyimpan tegangan tinggi!',
    where: 'PSU dipasang di ruang PSU di bagian bawah belakang casing.',
    why: 'PSU dipasang setelah komponen pada motherboard terpasang, agar ruang kerja di dalam casing tetap lega.',
    approach: [0, 0, 1],
  },
  c24: {
    name: 'Kabel 24-pin ATX', icon: '➰', install: 'cable',
    build: () => buildCableDisplay(0x111827, [0.15, 0.5, 0.12], 0xf8fafc, '24-PIN ATX'),
    func: 'Menyalurkan daya utama dari PSU ke motherboard.',
    detail: 'Konektor terbesar dari PSU. Colok ke konektor 24-pin di tepi kanan motherboard sampai klipnya berbunyi "klik".',
    features: ['Konektor paling besar (2 baris × 12 pin)', 'Ada klip pengunci', 'Bentuk pin mencegah terbalik'],
    k3: 'Jangan memaksa jika posisi tidak pas. Cabut dengan menekan klipnya, jangan menarik kabelnya.',
    where: 'Kabel 24-pin dicolok ke konektor 24-pin ATX di tepi kanan motherboard.',
    why: 'Kabel daya disambungkan setelah PSU dan semua komponen terpasang.',
  },
  c8: {
    name: 'Kabel 8-pin CPU (EPS)', icon: '➰', install: 'cable',
    build: () => buildCableDisplay(0x1f2937, [0.22, 0.12, 0.12], 0xfacc15, 'CPU 8-PIN'),
    func: 'Menyalurkan daya khusus untuk processor.',
    detail: 'Biasanya berlabel "CPU". Dicolok ke konektor 8-pin di pojok kiri atas motherboard, dekat socket CPU.',
    features: ['Berlabel "CPU" / "EPS"', 'Bisa dipecah 4+4 pin', 'Letaknya di pojok kiri atas motherboard'],
    k3: 'Jangan tertukar dengan kabel PCIe 8-pin walau mirip — perhatikan labelnya.',
    where: 'Kabel 8-pin CPU (EPS) dicolok ke konektor di pojok kiri atas motherboard.',
    why: 'Kabel daya disambungkan setelah PSU dan semua komponen terpasang.',
  },
  cpcie: {
    name: 'Kabel PCIe 6+2 pin', icon: '➰', install: 'cable',
    build: () => buildCableDisplay(0x1e3a8a, [0.22, 0.1, 0.1], 0x111827, 'PCIe 6+2'),
    func: 'Menyalurkan daya tambahan ke kartu grafis (VGA).',
    detail: 'Berlabel "PCIe" atau "VGA". Dicolok ke soket daya di sisi atas kartu VGA.',
    features: ['Berlabel "PCIe"/"VGA"', 'Konektor 6+2 pin (bisa 6 atau 8 pin)', 'Hanya untuk VGA yang membutuhkan daya besar'],
    k3: 'Pastikan tercolok penuh. Konektor yang longgar bisa panas dan meleleh.',
    where: 'Kabel PCIe 6+2 pin dicolok ke soket daya di sisi atas kartu VGA.',
    why: 'Kabel PCIe hanya bisa disambung setelah VGA dan PSU terpasang.',
  },
  csata: {
    name: 'Kabel Daya SATA', icon: '➰', install: 'cable',
    build: () => buildCableDisplay(0x111827, [0.06, 0.08, 0.24], 0x111827, 'SATA POWER'),
    func: 'Menyalurkan daya dari PSU ke perangkat SATA seperti HDD atau SSD 2,5".',
    detail: 'Konektor pipih berbentuk huruf L. Dicolok ke soket daya di bagian belakang HDD.',
    features: ['Konektor pipih berbentuk L (15 pin)', 'Satu kabel bisa punya beberapa konektor', 'Berbeda dengan kabel DATA SATA yang lebih kecil'],
    k3: 'Perhatikan bentuk L agar tidak terbalik; jangan menekuk kabel terlalu tajam.',
    where: 'Kabel daya SATA dicolok ke soket daya di belakang HDD (bagian depan bawah casing).',
    why: 'Kabel SATA disambung setelah HDD dan PSU terpasang.',
  },
  cfp: {
    name: 'Kabel Front Panel', icon: '🧵', install: 'cable',
    build: buildFrontPanelCable,
    func: 'Menghubungkan tombol power, tombol reset, dan lampu LED casing ke motherboard.',
    detail: 'Kabel-kabel kecil dari casing (POWER SW, RESET SW, POWER LED +/−, HDD LED +/−) dicolok ke header F_PANEL sesuai diagram di buku manual motherboard.',
    features: ['Kabel kecil-kecil berlabel', 'LED punya polaritas (+/−)', 'Switch tidak berpolaritas'],
    k3: 'Lihat buku manual motherboard. Perhatikan polaritas LED.',
    where: 'Kabel front panel dicolok ke header F_PANEL di pojok kanan bawah motherboard.',
    why: 'Kabel front panel disambung setelah kabel daya utama, karena header-nya kecil dan mudah tertutup kabel lain.',
  },
  side: {
    name: 'Panel Samping Casing', icon: '🪟', build: buildSidePanel, install: 'move',
    place: { pos: [0, 2.45, 1.13] },
    func: 'Menutup casing agar komponen terlindungi dari debu dan sentuhan, serta menjaga aliran udara.',
    detail: 'Pasang panel samping (kaca tempered) dan kencangkan sekrup jempol (thumbscrew) di keempat sudut.',
    features: ['Panel kaca tempered / logam', 'Dikunci dengan sekrup jempol', 'Membantu aliran udara terarah'],
    k3: 'Pastikan tidak ada kabel terjepit dan tidak ada sekrup yang tertinggal di dalam casing.',
    where: 'Panel samping dipasang menutup sisi casing yang terbuka.',
    why: 'Casing ditutup paling akhir setelah semua komponen dan kabel terpasang dan diperiksa.',
  },
  power: {
    name: 'Tombol Power (Uji POST)', icon: '⏻', build: buildPowerIcon, install: 'action',
    func: 'Menyalakan komputer. BIOS/UEFI lalu menjalankan POST (Power-On Self-Test) untuk memeriksa perangkat keras.',
    detail: 'POST memeriksa CPU, RAM, VGA, dan perangkat lain. Jika berhasil, terdengar 1 bunyi bip pendek dan layar menampilkan informasi BIOS.',
    features: ['Ada di panel depan/atas casing', 'Terhubung lewat kabel front panel', 'Bunyi bip menandakan hasil POST'],
    k3: 'Periksa ulang semua sambungan. Colok kabel listrik ke stop kontak yang aman (ber-grounding), lalu nyalakan saklar PSU.',
    where: 'Tekan tombol power di bagian atas depan casing.',
    why: 'Komputer baru boleh dinyalakan setelah semua komponen terpasang, kabel tersambung, dan casing tertutup.',
  },
};

// ---------------------------------------------------------------------
// 4. SLOTS — lokasi tujuan (area yang bisa diklik di model 3D)
//    pos/boxes: posisi pusat; size: ukuran area klik
//    after: slot baru muncul setelah komponen itu terpasang
//    only : slot hanya muncul saat komponen itu sedang dipilih
//    distractor: slot "jebakan" (selalu aktif, tidak pernah benar)
// ---------------------------------------------------------------------
export const SLOTS = {
  socket:   { name: 'Socket CPU', pos: [-0.95, 3.55, MB_Z + 0.05], size: [0.62, 0.62, 0.14], desc: 'Socket CPU adalah dudukan khusus untuk processor.' },
  cpuTop:   { name: 'Permukaan atas CPU', pos: [-0.95, 3.55, MB_Z + 0.16], size: [0.55, 0.55, 0.2], after: 'cpu', desc: 'Permukaan atas CPU (IHS) adalah tempat thermal paste dan heatsink.' },
  dimm:     { name: 'Slot DIMM A2 & B2', boxes: [[-0.13, 3.4, MB_Z + 0.08], [0.11, 3.4, MB_Z + 0.08]], size: [0.1, 1.42, 0.18], desc: 'Slot DIMM adalah slot panjang untuk memori RAM.' },
  dimmAlt:  { name: 'Slot DIMM A1 & B1', boxes: [[-0.25, 3.4, MB_Z + 0.08], [-0.01, 3.4, MB_Z + 0.08]], size: [0.1, 1.42, 0.18], distractor: true, desc: 'Slot A1/B1 juga slot RAM, tetapi untuk 2 keping RAM buku manual motherboard menganjurkan slot A2 & B2 (slot ke-2 dan ke-4 dari CPU) agar dual-channel optimal.' },
  m2:       { name: 'Slot M.2', pos: [-0.75, 2.75, MB_Z + 0.04], size: [0.95, 0.3, 0.1], desc: 'Slot M.2 adalah slot kecil mendatar untuk SSD NVMe.' },
  pcie16:   { name: 'Slot PCIe x16 utama', pos: [-1.35, 2.35, MB_Z + 0.06], size: [1.0, 0.16, 0.16], desc: 'Slot PCIe x16 utama (paling atas) adalah slot terpanjang untuk kartu grafis.' },
  pcie16b:  { name: 'Slot PCIe x16 kedua', pos: [-1.35, 1.6, MB_Z + 0.06], size: [1.0, 0.16, 0.16], distractor: true, desc: 'Slot PCIe x16 kedua biasanya hanya berjalan di jalur x4, sehingga performa VGA akan turun.' },
  pcie1:    { name: 'Slot PCIe x1', pos: [-1.67, 1.95, MB_Z + 0.06], size: [0.34, 0.16, 0.16], distractor: true, desc: 'Slot PCIe x1 adalah slot pendek untuk kartu ekspansi kecil seperti WiFi atau LAN card.' },
  sataData: { name: 'Port SATA (data) motherboard', pos: [0.38, 2.05, MB_Z + 0.06], size: [0.2, 0.36, 0.16], distractor: true, desc: 'Port SATA di motherboard adalah untuk kabel DATA SATA, bukan untuk komponen atau kabel daya dari PSU.' },
  drivebay: { name: 'Drive bay (rak storage)', pos: [1.5, 0.62, -0.2], size: [1.35, 0.75, 1.5], desc: 'Drive bay adalah rak di depan bawah casing untuk HDD/SSD SATA.' },
  psubay:   { name: 'Ruang PSU', pos: [-1.38, 0.55, -0.32], size: [1.55, 0.9, 1.45], desc: 'Ruang PSU berada di bagian bawah belakang casing.' },
  atx24:    { name: 'Konektor 24-pin ATX', pos: [0.3, 3.15, MB_Z + 0.08], size: [0.22, 0.66, 0.2], desc: 'Konektor 24-pin ATX adalah sumber daya utama motherboard.' },
  eps8:     { name: 'Konektor 8-pin CPU', pos: [-1.5, 4.28, MB_Z + 0.07], size: [0.32, 0.2, 0.18], desc: 'Konektor 8-pin EPS di pojok kiri atas motherboard memberi daya ke processor.' },
  gpuPower: { name: 'Soket daya VGA', pos: [0.3, 2.35, MB_Z + 1.2], size: [0.3, 0.22, 0.2], after: 'gpu', desc: 'Soket daya PCIe 6+2 pin berada di sisi atas kartu VGA.' },
  hddPower: { name: 'Soket daya SATA di HDD', pos: [0.8, 0.45, -0.4], size: [0.16, 0.2, 0.34], after: 'hdd', desc: 'Soket daya SATA (konektor pipih berbentuk L) berada di belakang HDD.' },
  fpHeader: { name: 'Header Front Panel (F_PANEL)', pos: [0.1, 1.45, MB_Z + 0.05], size: [0.4, 0.18, 0.14], desc: 'Header F_PANEL di pojok kanan bawah motherboard menghubungkan tombol power, reset, dan LED casing.' },
  side:     { name: 'Sisi casing yang terbuka', pos: [0, 2.45, 1.13], size: [4.4, 4.7, 0.08], only: 'side', desc: 'Sisi casing yang terbuka ditutup dengan panel samping.' },
  powerBtn: { name: 'Tombol power casing', pos: [1.75, 4.86, 0.25], size: [0.4, 0.14, 0.4], desc: 'Tombol power ada di bagian atas depan casing.' },
};

// ---------------------------------------------------------------------
// 5. STEPS — URUTAN PERAKITAN
//    tasks: [idKomponen, idSlot]. Dalam satu langkah, tugas boleh
//    dikerjakan bebas urutan, kecuali jika ordered: true.
// ---------------------------------------------------------------------
export const STEPS = [
  { no: 1, title: 'Pasang Processor (CPU)', tasks: [['cpu', 'socket']],
    desc: 'Angkat tuas socket, cocokkan tanda segitiga emas pada CPU dengan tanda segitiga pada socket, letakkan CPU perlahan tanpa ditekan, lalu turunkan tuas.' },
  { no: 2, title: 'Thermal Paste & Heatsink/Fan CPU', ordered: true, tasks: [['paste', 'cpuTop'], ['cooler', 'cpuTop']],
    desc: 'Oleskan thermal paste secukupnya di tengah CPU, lalu pasang heatsink/fan di atasnya dan kencangkan secara menyilang.' },
  { no: 3, title: 'Pasang RAM', tasks: [['ram', 'dimm']],
    desc: 'Buka pengunci slot DIMM, sejajarkan takik RAM, lalu tekan hingga terkunci. Untuk 2 keping gunakan slot A2 & B2.' },
  { no: 4, title: 'Pasang Storage (SSD M.2 & HDD SATA)', tasks: [['ssd', 'm2'], ['hdd', 'drivebay']],
    desc: 'Pasang SSD M.2 di slot M.2 pada motherboard dan HDD 3,5" di drive bay casing.' },
  { no: 5, title: 'Pasang VGA Card', tasks: [['gpu', 'pcie16']],
    desc: 'Pasang kartu grafis ke slot PCIe x16 utama, lalu kencangkan bracket ke casing.' },
  { no: 6, title: 'Pasang Power Supply (PSU)', tasks: [['psu', 'psubay']],
    desc: 'Masukkan PSU ke ruang PSU di bagian bawah casing dan kencangkan sekrupnya.' },
  { no: 7, title: 'Sambungkan Kabel Daya', tasks: [['c24', 'atx24'], ['c8', 'eps8'], ['cpcie', 'gpuPower'], ['csata', 'hddPower']],
    desc: '24-pin ke motherboard, 8-pin ke CPU, PCIe ke VGA, dan SATA ke storage.' },
  { no: 8, title: 'Sambungkan Kabel Front Panel', tasks: [['cfp', 'fpHeader']],
    desc: 'Hubungkan kabel power switch, reset switch, dan LED dari casing ke header F_PANEL.' },
  { no: 9, title: 'Tutup Casing & Uji POST', ordered: true, tasks: [['side', 'side'], ['power', 'powerBtn']],
    desc: 'Pasang panel samping, lalu tekan tombol power. Jika berhasil, layar menampilkan "POST OK".' },
];

// ---------------------------------------------------------------------
// 6. CABLES — jalur kabel (titik-titik dari PSU / casing ke tujuan)
// ---------------------------------------------------------------------
const Z = MB_Z;
export const CABLES = {
  c24: { color: 0x111827, radius: 0.07, connColor: 0xf8fafc, conn: { pos: [0.3, 3.15, Z + 0.2], size: [0.15, 0.56, 0.12] },
    points: [[-0.6, 0.75, 0.0], [0.15, 0.95, 0.25], [0.6, 1.7, 0.1], [0.62, 2.6, -0.2], [0.45, 3.1, -0.4], [0.3, 3.15, Z + 0.27]] },
  c8: { color: 0x1f2937, radius: 0.045, connColor: 0xfacc15, conn: { pos: [-1.5, 4.28, Z + 0.17], size: [0.22, 0.12, 0.1] },
    points: [[-0.6, 0.85, -0.6], [-0.45, 1.0, -1.0], [-0.6, 1.2, -1.2], [-2.0, 4.45, -1.2], [-1.9, 4.55, -0.9], [-1.5, 4.32, Z + 0.4], [-1.5, 4.28, Z + 0.22]] },
  cpcie: { color: 0x1e3a8a, radius: 0.045, connColor: 0x111827, conn: { pos: [0.3, 2.35, Z + 1.24], size: [0.22, 0.1, 0.1] },
    points: [[-0.6, 0.9, 0.2], [0.1, 1.2, 0.6], [0.55, 1.9, 0.75], [0.42, 2.35, 0.75], [0.3, 2.35, Z + 1.29]] },
  csata: { color: 0x111827, radius: 0.035, connColor: 0x111827, conn: { pos: [0.74, 0.45, -0.4], size: [0.06, 0.08, 0.24] },
    points: [[-0.6, 0.5, 0.0], [0.0, 0.45, 0.4], [0.5, 0.5, 0.05], [0.7, 0.45, -0.4]] },
  cfp: { color: 0xef4444, radius: 0.015, connColor: 0x111827, conn: { pos: [0.1, 1.45, Z + 0.1], size: [0.3, 0.08, 0.08] }, wires: [0xef4444, 0x22c55e, 0x3b82f6, 0xf8fafc],
    points: [[2.12, 4.4, -0.95], [2.0, 2.2, -0.95], [1.2, 1.5, -0.9], [0.4, 1.45, -0.7], [0.1, 1.45, Z + 0.15]] },
};

/** Membuat kabel terpasang. Dikembalikan: group, daftar tube (untuk animasi tumbuh), konektor. */
export function buildCableRun(id) {
  const c = CABLES[id];
  const group = new THREE.Group();
  const tubes = [];
  const pts = c.points.map(p => new THREE.Vector3(...p));
  const wires = c.wires ?? [c.color];
  wires.forEach((col, i) => {
    const off = (i - (wires.length - 1) / 2) * 0.035;
    const curve = new THREE.CatmullRomCurve3(pts.map(p => p.clone().add(new THREE.Vector3(0, off, 0))));
    const geo = new THREE.TubeGeometry(curve, 90, c.radius, 8, false);
    const mesh = new THREE.Mesh(geo, mat(col, { r: 0.8 }));
    group.add(mesh);
    tubes.push(geo);
  });
  const connector = box(c.conn.size[0], c.conn.size[1], c.conn.size[2], mat(c.connColor, { r: 0.5 }));
  connector.position.set(...c.conn.pos);
  group.add(connector);
  return { group, tubes, connector, segments: 90, radial: 8 };
}

// ---------------------------------------------------------------------
// 7. Casing, motherboard, monitor (koordinat dunia)
// ---------------------------------------------------------------------
export function buildMotherboard(p = CUR) {
  const g = new THREE.Group();
  const z0 = MB_Z;
  g.add(box(2.44, 3.05, 0.05, mat(0x1e293b, { r: 0.7 }), -0.75, 2.85, z0 - 0.025));
  const silk = decal(`TJKT ${p.chipset} • ${p.socket} • ATX`, 1.3, 0.14, { fg: '#94a3b8' });
  silk.position.set(-1.2, 1.5, z0 + 0.002);
  g.add(silk);
  // Socket CPU (bentuk mengikuti platform)
  const [cw, ch] = p.cpu.size;
  const sw = cw + 0.14, sh = ch + 0.14;
  const frameM = mat(0x9ca3af, { m: 0.85, r: 0.3 });
  if (p.socketType === 'PGA') {
    // AM4: socket putih berlubang + braket pendingin hitam
    g.add(box(sw, sh, 0.03, mat(0xf1f5f9), -0.95, 3.55, z0 + 0.015));
    g.add(box(cw * 0.9, ch * 0.9, 0.006, mat(0xcbd5e1), -0.95, 3.55, z0 + 0.031));
    g.add(box(0.03, sh, 0.04, frameM, -0.95 + sw / 2 + 0.03, 3.55, z0 + 0.04)); // tuas
    const br = mat(0x111827);
    g.add(box(0.9, 0.08, 0.06, br, -0.95, 3.55 + sh / 2 + 0.14, z0 + 0.03), box(0.9, 0.08, 0.06, br, -0.95, 3.55 - sh / 2 - 0.14, z0 + 0.03));
  } else {
    g.add(box(sw, sh, 0.03, mat(0x334155), -0.95, 3.55, z0 + 0.015));
    g.add(box(cw, ch, 0.006, mat(0x8a6d1d, { m: 0.8 }), -0.95, 3.55, z0 + 0.031));
    g.add(box(sw, 0.05, 0.04, frameM, -0.95, 3.55 + sh / 2, z0 + 0.035), box(sw, 0.05, 0.04, frameM, -0.95, 3.55 - sh / 2, z0 + 0.035));
    g.add(box(0.03, sh - 0.06, 0.03, frameM, -0.95 + sw / 2 + 0.03, 3.55, z0 + 0.06)); // tuas
  }
  g.add(triangle(0.08, 0xfacc15, -0.95 - sw / 2 + 0.005, 3.55 - sh / 2 + 0.005, z0 + 0.036));
  const sl = decal(p.socket, 0.4, 0.07, { fg: '#e2e8f0' });
  sl.position.set(-0.95, 3.55 - sh / 2 - 0.06, z0 + 0.002);
  g.add(sl);
  const dl = decal(RAM_TYPES[p.ram].name, 0.3, 0.08, { fg: '#e2e8f0' });
  dl.position.set(-0.07, 2.62, z0 + 0.002);
  g.add(dl);
  // VRM heatsink
  const hs = mat(0x475569, { m: 0.75, r: 0.35 });
  g.add(box(0.25, 0.9, 0.22, hs, -1.55, 3.5, z0 + 0.11));
  g.add(box(0.9, 0.2, 0.2, hs, -0.9, 4.1, z0 + 0.1));
  // I/O shroud
  g.add(box(0.35, 0.9, 0.35, mat(0x0f172a, { m: 0.5 }), -1.8, 3.75, z0 + 0.18));
  // 8-pin EPS
  g.add(box(0.22, 0.12, 0.12, mat(0x0b0f19), -1.5, 4.28, z0 + 0.06));
  // DIMM
  [-0.25, -0.13, -0.01, 0.11].forEach((x, i) => {
    g.add(box(0.06, 1.35, 0.08, mat(i % 2 ? 0x0b0f19 : 0x6b7280), x, 3.4, z0 + 0.04));
    g.add(box(0.07, 0.06, 0.12, mat(0xe5e7eb), x, 4.1, z0 + 0.06), box(0.07, 0.06, 0.12, mat(0xe5e7eb), x, 2.7, z0 + 0.06));
  });
  // 24-pin
  g.add(box(0.13, 0.58, 0.14, mat(0xf1f5f9), 0.3, 3.15, z0 + 0.07));
  // M.2
  g.add(box(0.06, 0.24, 0.05, mat(0x0b0f19), -1.15, 2.75, z0 + 0.025));
  g.add(cylZ(0.03, 0.04, mat(GOLD, { m: 0.9 }), -0.35, 2.75, z0 + 0.02, 10));
  const m2l = decal('M.2', 0.2, 0.08, { fg: '#cbd5e1' });
  m2l.position.set(-0.75, 2.92, z0 + 0.002);
  g.add(m2l);
  // PCIe
  g.add(box(0.9, 0.07, 0.1, mat(0x0b0f19), -1.35, 2.35, z0 + 0.05));
  g.add(box(0.92, 0.09, 0.06, mat(0xcbd5e1, { m: 0.9 }), -1.35, 2.35, z0 + 0.03));
  g.add(box(0.25, 0.07, 0.1, mat(0x0b0f19), -1.67, 1.95, z0 + 0.05));
  g.add(box(0.9, 0.07, 0.1, mat(0x4b5563), -1.35, 1.6, z0 + 0.05));
  // Chipset
  g.add(box(0.5, 0.5, 0.1, hs, -0.15, 1.95, z0 + 0.05));
  const chip = decal('CHIPSET', 0.42, 0.12, { fg: '#e2e8f0' });
  chip.position.set(-0.15, 1.95, z0 + 0.101);
  g.add(chip);
  // SATA data
  g.add(box(0.12, 0.1, 0.1, mat(0x0ea5e9), 0.38, 2.15, z0 + 0.05), box(0.12, 0.1, 0.1, mat(0x0ea5e9), 0.38, 1.95, z0 + 0.05));
  // Front panel header
  g.add(box(0.3, 0.1, 0.06, mat(0x0b0f19), 0.1, 1.45, z0 + 0.03));
  [0xef4444, 0x22c55e, 0x3b82f6, 0xf8fafc].forEach((c, i) => g.add(box(0.05, 0.02, 0.07, mat(c), 0.0 + i * 0.07, 1.52, z0 + 0.04)));
  // Baterai CMOS & kapasitor
  g.add(cylZ(0.1, 0.03, mat(0xd1d5db, { m: 0.9 }), -0.65, 1.7, z0 + 0.015));
  for (let i = 0; i < 6; i++) g.add(cylZ(0.03, 0.09, mat(0x334155, { m: 0.6 }), -1.3 + i * 0.07, 3.2, z0 + 0.045, 10));
  // Sekrup dudukan
  [[-1.85, 4.25], [0.35, 4.25], [-1.85, 1.45], [0.35, 1.6], [-0.75, 2.6]].forEach(([x, y]) =>
    g.add(cylZ(0.035, 0.02, mat(GOLD, { m: 0.9 }), x, y, z0 + 0.01, 10)));
  return g;
}

/** Label bagian-bagian motherboard (untuk tombol "Label" dan Kenali Komponen). */
export const MB_LABELS = [
  { text: 'Socket CPU', pos: [-0.95, 3.85, MB_Z + 0.2] },
  { text: 'Slot RAM (DIMM)', pos: [-0.07, 4.15, MB_Z + 0.2] },
  { text: '24-pin ATX', pos: [0.32, 3.47, MB_Z + 0.2] },
  { text: '8-pin CPU', pos: [-1.5, 4.36, MB_Z + 0.2] },
  { text: 'Slot M.2', pos: [-0.75, 2.88, MB_Z + 0.15] },
  { text: 'PCIe x16', pos: [-1.35, 2.42, MB_Z + 0.15] },
  { text: 'PCIe x1', pos: [-1.67, 2.0, MB_Z + 0.15] },
  { text: 'Chipset', pos: [-0.15, 2.22, MB_Z + 0.15] },
  { text: 'SATA', pos: [0.4, 2.22, MB_Z + 0.15] },
  { text: 'Front Panel', pos: [0.1, 1.5, MB_Z + 0.15] },
];

export function buildCase() {
  const g = new THREE.Group();
  const body = mat(0xe5e7eb, { m: 0.3, r: 0.5 });
  const dark = mat(0x111827, { m: 0.3, r: 0.6 });
  g.add(box(4.4, 4.7, 0.04, mat(0xcbd5e1, { m: 0.3 }), 0, 2.45, -1.1));      // tray belakang
  g.add(box(0.05, 4.7, 2.2, body, -2.2, 2.45, 0));                           // dinding belakang
  g.add(box(0.12, 4.7, 2.2, dark, 2.26, 2.45, 0));                           // panel depan
  g.add(box(4.52, 0.05, 2.2, body, 0.06, 4.8, 0));                           // atas
  g.add(box(4.52, 0.05, 2.2, body, 0.06, 0.1, 0));                           // bawah
  [[-2.0, -0.9], [2.1, -0.9], [-2.0, 0.9], [2.1, 0.9]].forEach(([x, z]) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 16), dark);
    f.position.set(x, 0.04, z);
    g.add(f);
  });
  // I/O shield & tutup slot ekspansi di dinding belakang
  g.add(box(0.02, 0.9, 0.36, mat(0x94a3b8, { m: 0.8 }), -2.17, 3.75, -0.65));
  for (let i = 0; i < 6; i++) g.add(box(0.02, 0.07, 1.0, mat(0x9ca3af, { m: 0.8 }), -2.17, 2.25 - i * 0.3, -0.25));
  // Kipas casing
  const rear = makeFan(0.9, { led: 0x38bdf8 });
  rear.rotation.y = Math.PI / 2; rear.position.set(-2.06, 3.9, -0.15);
  const f1 = makeFan(1.0, { led: 0x38bdf8 });
  f1.rotation.y = -Math.PI / 2; f1.position.set(2.08, 3.55, 0);
  const f2 = makeFan(1.0, { led: 0x38bdf8 });
  f2.rotation.y = -Math.PI / 2; f2.position.set(2.08, 2.4, 0);
  g.add(rear, f1, f2);
  // Drive bay
  const cage = mat(0x6b7280, { m: 0.6 });
  g.add(box(1.4, 0.03, 1.6, cage, 1.5, 0.31, -0.2), box(1.4, 0.03, 1.6, cage, 1.5, 0.95, -0.2));
  g.add(box(1.4, 0.65, 0.03, cage, 1.5, 0.63, -1.0));
  const bayLbl = decal('DRIVE BAY', 0.8, 0.14, { fg: '#cbd5e1' });
  bayLbl.position.set(1.5, 1.08, 0.0); bayLbl.rotation.x = -0.3;
  g.add(bayLbl);
  // Panel I/O atas: tombol power, reset, USB
  const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 28), mat(0x1f2937, { m: 0.7, r: 0.3 }));
  pb.position.set(1.75, 4.85, 0.25);
  pb.name = 'powerButton';
  g.add(pb);
  const pled = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 32), ledMat(0x22c55e));
  pled.rotation.x = Math.PI / 2; pled.position.set(1.75, 4.86, 0.25);
  pled.name = 'powerLed';
  g.add(pled);
  const pIcon = decal('⏻', 0.18, 0.18, { fg: '#e2e8f0', size: 300 });
  pIcon.rotation.x = -Math.PI / 2; pIcon.position.set(1.75, 4.882, 0.25);
  g.add(pIcon);
  g.add(cylZ(0.05, 0.04, mat(0x374151), 1.75, 4.84, -0.15));
  g.children[g.children.length - 1].rotation.x = 0;
  g.add(box(0.2, 0.03, 0.08, mat(0x1d4ed8), 1.75, 4.835, -0.4), box(0.2, 0.03, 0.08, mat(0x1d4ed8), 1.75, 4.835, -0.6));
  const logo = decal('TJKT', 1.2, 0.35, { fg: '#38bdf8' });
  logo.rotation.y = Math.PI / 2; logo.position.set(2.33, 4.2, 0);
  g.add(logo);
  return g;
}

export function buildMonitor() {
  const g = new THREE.Group();
  const dark = mat(0x0b0f19, { m: 0.4, r: 0.5 });
  g.add(box(1.3, 0.06, 0.8, dark, 0, 0.03, 0));
  g.add(box(0.2, 1.4, 0.14, dark, 0, 0.75, -0.2));
  g.add(box(3.6, 2.2, 0.14, dark, 0, 2.3, 0));
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 448;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.98), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.set(0, 2.3, 0.071);
  g.add(screen);
  g.add(cylZ(0.03, 0.02, ledMat(0x22c55e), 1.6, 1.26, 0.07, 10));
  return { group: g, canvas, texture: tex };
}

// ---------------------------------------------------------------------
// 8. Halaman "Kenali Komponen"
// ---------------------------------------------------------------------
const EXTRA = {
  motherboard: {
    name: 'Motherboard', icon: '🟩', build: buildMotherboard, labels: MB_LABELS,
    func: 'Papan sirkuit utama tempat semua komponen terhubung dan saling berkomunikasi.',
    detail: 'Motherboard berisi socket CPU, slot RAM, slot PCIe, slot M.2, konektor daya, port SATA, chipset, dan header front panel. Ukuran yang umum: ATX, Micro-ATX, dan Mini-ITX.',
    features: ['Form factor: ATX / Micro-ATX / Mini-ITX', 'Socket menentukan jenis CPU yang cocok', 'Chipset mengatur jalur data antar komponen'],
    k3: 'Pegang di tepi papan. Pasang di atas standoff (dudukan sekrup) agar tidak korsleting dengan casing.',
  },
  case: {
    name: 'Casing Komputer', icon: '🖥️', build: buildCase,
    func: 'Wadah yang melindungi semua komponen dan mengatur aliran udara.',
    detail: 'Casing memiliki dudukan motherboard (tray), ruang PSU, drive bay, kipas, dan panel depan/atas berisi tombol power, reset, serta port USB.',
    features: ['Ukuran: Full Tower, Mid Tower, Mini Tower', 'Kipas depan menyedot udara, kipas belakang membuang', 'Tombol power & port USB di panel depan/atas'],
    k3: 'Hati-hati dengan sisi pelat logam yang tajam. Gunakan sarung tangan bila perlu.',
  },
};

EXTRA.cpuGen = {
  name: 'Generasi Processor', icon: '🧬', build: buildCPULineup,
  labels: PLATFORM_ORDER.map((id, i) => {
    const row = i < 3 ? 0 : 1, col = i < 3 ? i - 1 : (i - 3) - 0.5;
    return { text: PLATFORMS[id].socket, h: 0.09, pos: [col * 0.62, (row ? -0.5 : 0.36) - 0.34, 0.05] };
  }),
  func: 'Setiap generasi processor memakai socket tertentu. CPU hanya bisa dipasang pada motherboard dengan socket yang sama.',
  detail: 'Intel dan AMD terus merilis generasi baru. Saat merakit atau upgrade, cocokkan: socket CPU ↔ socket motherboard, lalu jenis RAM (DDR3/DDR4/DDR5) yang didukung motherboard. Baris atas: Intel, baris bawah: AMD.',
  features: ['LGA (Land Grid Array): pin ada di socket — Intel & AMD AM5', 'PGA (Pin Grid Array): pin ada di CPU — AMD AM4', 'CPU Intel modern berbentuk persegi panjang, AMD persegi', 'Lihat buku manual / situs produsen untuk daftar CPU yang didukung (CPU support list)'],
  k3: 'Pin socket LGA dan pin CPU PGA sangat mudah bengkok. Selalu pasang tutup pelindung socket bila motherboard disimpan tanpa CPU.',
  table: {
    head: ['Platform', 'Tahun', 'Socket', 'RAM', 'Contoh CPU'],
    rows: PLATFORM_ORDER.map(id => { const p = PLATFORMS[id]; return [p.name, p.year, `${p.socket} (${p.socketType})`, RAM_TYPES[p.ram].name + (id === 'intel12' ? ' / DDR5*' : ''), p.cpu.model.replace(/^(Intel|AMD) /, '')]; }),
    foot: '* LGA1700: tergantung motherboard — ada versi DDR4 dan versi DDR5.',
  },
};
EXTRA.ramGen = {
  name: 'DDR3 vs DDR4 vs DDR5', icon: '🧮', build: buildRAMCompare,
  labels: ['ddr3', 'ddr4', 'ddr5'].map((t, i) => ({ text: RAM_TYPES[t].name, h: 0.11, pos: [-0.85, 0.5 - i * 0.55, 0.05] })),
  func: 'Generasi RAM menentukan kecepatan, tegangan, dan kecocokannya dengan motherboard.',
  detail: 'DDR3, DDR4, dan DDR5 memiliki posisi takik (notch, ditandai segitiga merah) yang berbeda, sehingga RAM yang salah jenis tidak akan masuk ke slot. Jangan pernah memaksa!',
  features: ['Semakin baru: semakin cepat dan semakin hemat daya', 'DDR4 & DDR5 sama-sama 288 pin, tapi takiknya berbeda', 'DDR5 punya PMIC (pengatur daya) di modul', 'Gunakan sepasang RAM identik untuk dual-channel'],
  k3: 'Jika RAM tidak masuk, periksa jenis & arah takik — jangan ditekan paksa karena slot bisa patah.',
  table: {
    head: ['Jenis', 'Tahun', 'Pin', 'Tegangan', 'Kecepatan'],
    rows: ['ddr3', 'ddr4', 'ddr5'].map(t => { const r = RAM_TYPES[t]; return [r.name, r.year, r.pins, r.volt, r.speed]; }),
  },
};

export const EXPLORE = [
  { id: 'motherboard', ...EXTRA.motherboard },
  { id: 'cpu', ...ITEMS.cpu },
  { id: 'cpuGen', ...EXTRA.cpuGen },
  ...['paste', 'cooler', 'ram'].map(id => ({ id, ...ITEMS[id] })),
  { id: 'ramGen', ...EXTRA.ramGen },
  ...['ssd', 'hdd', 'gpu', 'psu', 'c24', 'c8', 'cpcie', 'csata', 'cfp', 'side'].map(id => ({ id, ...ITEMS[id] })),
  { id: 'case', ...EXTRA.case },
];
