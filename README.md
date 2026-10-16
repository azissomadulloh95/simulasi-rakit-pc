# Simulasi Perakitan Komputer 3D – SMKN 1 Sukabumi

Aplikasi web interaktif untuk mata pelajaran **Dasar TJKT**. Siswa merakit komputer
di dalam casing 3D: memasang CPU, thermal paste, heatsink, RAM, storage, VGA, PSU,
menyambung kabel daya & front panel, menutup casing, lalu menyalakan PC untuk uji **POST**.

- Berjalan langsung di browser (HP, tablet, laptop) — tanpa instalasi, tanpa build.
- Dibuat dengan HTML + CSS + JavaScript murni dan [Three.js](https://threejs.org) (dari CDN jsDelivr, versi 0.160.0).
- Semua model 3D dibuat dari bentuk dasar Three.js, tidak perlu file model eksternal.

---

## Untuk Siswa

### Memilih mode
| Mode | Keterangan |
|---|---|
| **Mode Belajar** | Slot tujuan berkedip hijau sebagai petunjuk, ada penjelasan lengkap dan tips K3 tiap komponen, tanpa batas waktu. |
| **Mode Ujian** | Isi nama & kelas dulu. Tanpa petunjuk, waktu 15 menit, skor akhir. |
| **Kenali Komponen** | Galeri 3D: putar & perbesar tiap komponen, baca fungsi, ciri-ciri, dan tips K3. |

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
