# 📱 Aplikasi Presensi QR Guru & Siswa (Web App Mobile-First)

Aplikasi presensi modern berbasis web yang dirancang khusus untuk kemudahan absensi Guru dan Siswa menggunakan kamera Handphone (HP) melalui pemindaian QR Code (Scan QR).

---

## ✨ Fitur Utama

1. **Dual-Mode Scan Kamera HP (`html5-qrcode`)**:
   - **Mode 1: Scan Kartu ID Guru & Siswa** (untuk Guru Piket / Petugas di gerbang / Guru di kelas):
     - Kamera langsung mengenali kode QR pada kartu NIS/NIP.
     - Bunyi *Beep* ganda & getar (haptic feedback) saat berhasil.
     - Deteksi otomatis: Status **Hadir** (Tepat Waktu) atau **Terlambat** berdasarkan batas jam masuk sekolah (misal pukul 07:15 WIB).
     - Otomatis mencatat **Absen Masuk** dan **Absen Pulang**.
     - Mode Scan Cepat: siap memindai siswa berikutnya dalam 1.5 detik (cocok untuk ratusan siswa).
   - **Mode 2: Scan QR Sesi Sekolah** (untuk Siswa/Guru mandiri):
     - Layar proyektor/TV sekolah menampilkan QR Sesi dinamis yang otomatis berganti token tiap 60 detik untuk mencegah kecurangan/foto layar.
     - Siswa membuka web di HP lalu mengarahkan kamera ke layar proyektor untuk absen mandiri.

2. **Kartu QR Digital (Digital ID Badges)**:
   - Dilengkapi generator kartu ID Pelajar & Kartu Pendidik dengan QR Code personal.
   - Siap cetak (Print A4) dengan format grid 2x4 atau simpan sebagai gambar/PDF.

3. **Rekapitulasi Kehadiran & Ekspor Excel**:
   - Filter lengkap: Tanggal, Kategori (Guru/Siswa), Kelas (X-A, X-B, XI, XII), dan Status Kehadiran (Hadir, Terlambat, Izin, Sakit, Alpa).
   - **Export ke File Excel (.xlsx)** hanya dengan 1 klik.
   - **Cetak Laporan Format Formal** siap tanda tangan kepala sekolah.
   - Form input manual untuk siswa/guru yang **Izin / Sakit / Alpa**.

4. **Koneksi Mudah dari HP (Wi-Fi Lokal)**:
   - Tombol **"Buka di HP"** di pojok kanan atas menampilkan QR Code alamat IP lokal (contoh: `http://192.168.1.15:3000`).
   - Cukup buka kamera HP dan scan QR tersebut untuk langsung membuka aplikasi di browser HP tanpa perlu instalasi aplikasi dari Play Store / App Store.

5. **Master Data & Pengaturan Jam Sekolah**:
   - Manajemen data Guru & Siswa (Tambah, Edit, Hapus).
   - Atur Jam Masuk, Batas Terlambat, Jam Pulang, dan Nama/Alamat Sekolah.

---

## 🚀 Cara Menjalankan

### Cara 1: Menggunakan File Batch (Paling Praktis)
Cukup klik dua kali file:
```
jalankan-aplikasi.bat
```

### Cara 2: Menggunakan Terminal / Command Prompt
```bash
cd "C:\Users\IMROATUS SHOLIKAH\.gemini\antigravity\scratch\presensi-qr-sekolah"
npm start
```

Buka di browser:
- **Di Laptop/Komputer**: `http://localhost:3000`
- **Di HP (terhubung Wi-Fi yang sama)**: `http://<IP_KOMPUTER>:3000` (atau scan QR di menu "Buka di HP")

---

## 🗂️ Struktur Direktori

```
presensi-qr-sekolah/
├── data/
│   ├── config.json          # Pengaturan jam & nama sekolah
│   ├── teachers.json        # Data Guru & NIP
│   ├── students.json        # Data Siswa, NIS & Kelas
│   └── attendance.json      # Catatan log presensi harian
├── public/
│   ├── index.html           # Tampilan utama web responsif
│   ├── style.css            # Styling & animasi laser scan
│   └── app.js               # Logika pemindai kamera, audio, & API
├── server.js                # Backend Express & deteksi IP lokal
├── package.json             # Dependensi (express, cors, qrcode)
└── jalankan-aplikasi.bat    # Shortcut Windows untuk menjalankan server
```
