# Simulasi Perakitan Komputer 3D – SMKN 1 Sukabumi

Aplikasi web interaktif untuk mata pelajaran **Dasar TJKT**. Siswa merakit komputer
di dalam casing 3D: memasang CPU, thermal paste, heatsink, RAM, storage, VGA, PSU,
menyambung kabel daya & front panel, menutup casing, lalu menyalakan PC untuk uji **POST**.

- Berjalan langsung di browser (HP, tablet, laptop) — tanpa instalasi, tanpa build.
- Dibuat dengan HTML + CSS + JavaScript murni dan [Three.js](https://threejs.org) (dari CDN jsDelivr, versi 0.160.0).
- Semua model 3D dibuat dari bentuk dasar Three.js, tidak perlu file model eksternal.

---

## Untuk Siswa

### Memilih platform (generasi processor & RAM)
Di beranda, pilih platform yang ingin dirakit:

| Platform | Socket | RAM | Contoh CPU |
|---|---|---|---|
| Intel Core Gen 4 (Haswell), 2013–2014 | LGA1150 | DDR3 | Core i5-4590 |
| Intel Core Gen 12–14, 2021–2023 | LGA1700 | DDR4* | Core i5-12400F |
| Intel Core Ultra 200S, 2024– | LGA1851 | DDR5 | Core Ultra 5 245K |
| AMD Ryzen 1000–5000, 2017–2022 | AM4 (PGA) | DDR4 | Ryzen 5 5600 |
| AMD Ryzen 7000–9000, 2022– | AM5 | DDR5 | Ryzen 5 7600 |
| 🎲 Acak | — | — | dipilih acak (cocok untuk ujian) |

\* LGA1700 ada versi DDR4 dan DDR5; di simulasi ini motherboard B760 versi DDR4.

Saat memasang CPU dan RAM, siswa harus **memilih yang cocok** dengan motherboard
(socket CPU dan jenis DDR). Pilihan yang salah mengurangi skor dan muncul penjelasannya.
Bentuk CPU, socket, label chipset, dan tampilan RAM di model 3D ikut menyesuaikan platform.

### Memilih mode
| Mode | Keterangan |
|---|---|
| **Mode Belajar** | Slot tujuan berkedip hijau sebagai petunjuk, ada penjelasan lengkap dan tips K3 tiap komponen, tanpa batas waktu. |
| **Mode Ujian** | Isi nama & kelas dulu. Tanpa petunjuk, waktu 15 menit, skor akhir. |
| **Kenali Komponen** | Galeri 3D: putar & perbesar tiap komponen, baca fungsi, ciri-ciri, dan tips K3. Termasuk perbandingan generasi processor dan DDR3/DDR4/DDR5. |

### Cara memasang komponen
1. **Ketuk/klik** komponen di daftar (panel kanan, atau panel bawah di HP).
2. **Ketuk/klik** lokasi tujuannya pada model 3D.
   Alternatif: **seret** komponen ke model 3D (di HP, seret ke **atas**).
3. Saat memasang CPU, pilih posisi yang tanda **segitiga emasnya** sejajar dengan segitiga pada socket.
4. Langkah terakhir: pasang panel samping, lalu tekan **tombol power** di atas casing.

### Mengatur kamera
| | Laptop (mouse) | HP (sentuh) |
|---|---|---|
| Memutar | klik kiri + geser | geser 1 jari |
| Zoom | scroll | cubit 2 jari |
| Menggeser | klik kanan + geser | geser 2 jari |
| Kembali ke awal | tombol **Reset Kamera** | tombol 🎥 |

### Skor
- Mulai dari **100**. Setiap kesalahan (salah slot, melompati urutan, posisi CPU salah) **−5**.
- Skor akhir = persentase tugas selesai − total pengurangan.
- Predikat: ≥90 Sangat Baik · ≥80 Baik · ≥70 Cukup · <70 Perlu Latihan Lagi.

### Mengirim hasil ke guru (Mode Ujian)
Di layar hasil:
- **🖼️ Simpan Gambar** — mengunduh gambar PNG hasil (berisi nama, kelas, skor, waktu, dan tangkapan layar 3D).
  Di HP, bisa juga tekan lama gambar hasil → *Simpan gambar*.
- **📋 Salin Teks** — menyalin ringkasan hasil, tinggal tempel di WhatsApp / Google Classroom.
- **📤 Bagikan** — muncul di HP yang mendukung, langsung kirim ke aplikasi lain.

---

## Untuk Guru

### Urutan perakitan yang dinilai
1. Pasang processor (CPU) ke socket (perhatikan tanda segitiga)
2. Oleskan thermal paste, lalu pasang heatsink/fan CPU
3. Pasang RAM ke slot DIMM (A2 & B2)
4. Pasang SSD M.2 dan HDD SATA
5. Pasang VGA card ke slot PCIe x16
6. Pasang Power Supply (PSU)
7. Sambungkan kabel daya: 24-pin, 8-pin CPU, PCIe ke VGA, SATA ke HDD
8. Sambungkan kabel front panel
9. Tutup casing, tekan tombol power → uji POST

Dalam satu langkah, tugas boleh dikerjakan dalam urutan bebas (misalnya 4 kabel di langkah 7),
kecuali langkah 2 dan 9 yang urutannya wajib (pasta dulu baru heatsink; tutup casing dulu baru power).

### Tips penggunaan di kelas
- Mulai dengan **Kenali Komponen**, lanjut **Mode Belajar**, lalu **Mode Ujian** sebagai penilaian.
- Minta siswa mengirim **gambar hasil** atau **teks hasil** lewat WhatsApp/Classroom.
- Pesan kesalahan menjelaskan *mengapa* salah — bagus untuk didiskusikan bersama.
- Nama & kelas tersimpan di browser siswa, jadi tidak perlu diketik ulang.

---

## Struktur file

```
index.html          Halaman utama (beranda, simulasi, galeri, modal)
style.css           Tampilan & tata letak responsif
js/main.js          Scene 3D, kamera, interaksi klik/sentuh/seret, animasi, hasil
js/components.js    DATA & MODEL komponen, lokasi slot, URUTAN langkah, jalur kabel
js/simulation.js    Logika langkah, urutan, skor, dan waktu
```

## Menjalankan di komputer sendiri

Karena memakai ES module, buka lewat server lokal (bukan klik dua kali file):

```bash
python -m http.server 8000
# lalu buka http://localhost:8000
# atau: npx serve .
```

## Mengubah urutan langkah / menambah komponen

Semua data ada di **`js/components.js`**.

### Menambah platform / generasi baru
Tambahkan entri di `PLATFORMS` lalu masukkan id-nya ke `PLATFORM_ORDER`:

```js
intel15: {
  id: 'intel15', brand: 'Intel', name: 'Intel Core Ultra 300', short: 'Intel Ultra 300', year: '2026', era: 'Terbaru',
  socket: 'LGA1851', socketType: 'LGA', chipset: 'Z890', ram: 'ddr5', ssd: 'NVMe SSD 1TB',
  cpu: { model: 'Intel Core Ultra 5 ...', label: 'intel CORE ULTRA 5\\n...', spec: '... core / ... thread', size: [0.375, 0.45] },
  note: 'Catatan singkat untuk siswa.',
},
```

`ram` harus berupa salah satu kunci `RAM_TYPES` (`ddr3`, `ddr4`, `ddr5`). Jenis RAM baru
cukup ditambahkan ke `RAM_TYPES` dengan data pin, tegangan, kecepatan, dan warna modul.
Tabel di galeri "Generasi Processor" dan "DDR3 vs DDR4 vs DDR5" dibuat otomatis dari data ini.

### Mengubah urutan langkah
Edit array `STEPS`. Setiap langkah berisi `tasks: [[idKomponen, idSlot], ...]`:

```js
{ no: 5, title: 'Pasang VGA Card', tasks: [['gpu', 'pcie16']], desc: '...' },
```

- Pindahkan objek langkah ke posisi lain lalu sesuaikan nomor `no`.
- Tambahkan `ordered: true` jika tugas dalam satu langkah harus berurutan.
- Ubah juga teks `why` pada komponen terkait (alasan urutan yang tampil saat siswa salah urutan).

### Menambah komponen baru (contoh: WiFi card di slot PCIe x1)
1. **Buat model** — fungsi yang mengembalikan `THREE.Group` dari bentuk dasar:
   ```js
   function buildWifi() {
     const g = new THREE.Group();
     g.add(box(0.6, 0.03, 0.4, mat(0x1e3a8a), 0.2, 0, 0.25));   // PCB
     g.add(box(0.25, 0.03, 0.06, mat(0xd4a017), 0, 0, 0.04));   // kaki PCIe
     return g;
   }
   ```
2. **Daftarkan di `ITEMS`**:
   ```js
   wifi: {
     name: 'WiFi Card', icon: '📶', build: buildWifi, install: 'move',
     place: { pos: [-1.67, 1.95, MB_Z] },            // posisi akhir di casing
     func: '...', detail: '...', features: ['...'], k3: '...',
     where: 'WiFi card dipasang di slot PCIe x1.',   // muncul saat salah slot
     why: 'Kartu ekspansi dipasang setelah VGA.',    // muncul saat salah urutan
   },
   ```
3. **Slot tujuan** — pakai slot yang ada di `SLOTS` (misal `pcie1`) atau buat baru
   (`pos`, `size`, `name`, `desc`). Jika slot itu sebelumnya `distractor: true`, hapus tanda tersebut.
4. **Masukkan ke `STEPS`**, misalnya `tasks: [['gpu', 'pcie16'], ['wifi', 'pcie1']]`.
5. (Opsional) agar muncul di galeri, tambahkan id-nya ke daftar `EXPLORE` di bagian bawah file.

Untuk kabel, gunakan `install: 'cable'` dan tambahkan jalurnya di `CABLES`
(titik-titik koordinat dari PSU ke konektor tujuan).

Koordinat: 1 unit ≈ 10 cm; `x` belakang→depan casing, `y` bawah→atas, `z` dalam→luar.
Permukaan motherboard ada di `z = MB_Z`.

---

Dibuat oleh **Azis – Dasar TJKT**, SMKN 1 Sukabumi.
