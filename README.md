# 🎓 EduCBT Lingora - Sistem Ujian Berbasis Komputer & Google Apps Script

Aplikasi Computer-Based Test (CBT) modern, responsif, dan ringan dengan tampilan elegan bertema Lingora UI. Menggunakan **Google Apps Script & Google Sheets** sebagai database gratis dan real-time tanpa perlu server berbayar.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/database-Google%20Sheets-green.svg)
![UI](https://img.shields.io/badge/frontend-HTML5%20%7C%20TailwindCSS%20%7C%20FontAwesome-purple.svg)

---

## ✨ Fitur Unggulan

### 👨‍💼 Panel Guru & Administrator
- **Dashboard Statistik**: Pantau jumlah kelas, siswa aktif, jadwal ujian, dan rekap nilai secara visual.
- **Manajemen Kelas & Siswa**: Kelola data rombel dan biodata siswa beserta generator kartu ujian.
- **Jadwal & Token Ujian**: Pengaturan waktu durasi ujian, token akses, serta tema warna kartu soal.
- **Bank Soal Dinamis**: Pembuatan soal pilihan ganda (A-E), upload gambar soal, dan kunci jawaban.
- **Rekap & Analisis Nilai**: Hasil ujian otomatis masuk ke spreadsheet secara *real-time* dengan status kelulusan (KKM).
- **Pengaturan Sekolah & Anti-Curang**: Kustomisasi nama sekolah, logo, KKM default, acak soal, serta batasan maksimal pelanggaran anti-curang.

### 🧑‍🎓 Antarmuka Ujian Siswa (Exam Runner)
- **Anti-Cheat Engine**: Deteksi perpindahan tab, keluar dari layar penuh (*fullscreen*), serta pembatasan *copy-paste*.
- **Timer & Auto-Submit**: Penghitung waktu mundur otomatis dengan penguncian jawaban saat waktu habis.
- **Navigasi Soal Interaktif**: Kisi nomor soal dengan indikator status (Sudah Dijawab / Ragu-ragu / Belum Dijawab).
- **Gamifikasi Siswa**: Penambahan poin XP setelah menyelesaikan ujian untuk meningkatkan motivasi belajar.

---

## 📁 Struktur Direktori

```text
├── index.html                           # Aplikasi frontend utama (UI Lingora & Exam Engine)
├── Code.gs                              # Backend Google Apps Script (API & Spreadsheet Handler)
├── README.md                            # Dokumentasi repositori
└── PANDUAN_SETUP_GOOGLE_APPS_SCRIPT.md  # Panduan setup database & publikasi
```

---

## 🚀 Cara Menjalankan & Setup Database

Panduan lengkap instalasi database Google Sheets dapat dilihat pada dokumen:
👉 **[PANDUAN_SETUP_GOOGLE_APPS_SCRIPT.md](PANDUAN_SETUP_GOOGLE_APPS_SCRIPT.md)**

### Langkah Cepat:
1. Buat Google Sheet baru di [sheets.new](https://sheets.new).
2. Buka menu **Ekstensi** > **Apps Script**, salin seluruh kode dari `Code.gs`.
3. Jalankan fungsi `setupDatabase` untuk membuat tabel database otomatis.
4. Klik **Deploy** > **New Deployment** > pilih **Web App** (*Execute as: Me*, *Who has access: Anyone*).
5. Buka `index.html`, klik tombol **Hubungkan Database** di pojok kanan atas, lalu tempelkan Web App URL Anda.

---

## 🌐 Menjalankan Gratis Lewat GitHub Pages

Aplikasi ini dapat langsung dipublikasikan dan diakses online oleh siswa menggunakan **GitHub Pages**:

1. Buka repositori ini di GitHub.
2. Masuk ke tab **Settings** (Pengaturan).
3. Di bilah sisi kiri, pilih menu **Pages**.
4. Pada bagian **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: Pilih `main` (atau `master`), folder: `/ (root)`
5. Klik **Save**.
6. Dalam 1-2 menit, GitHub akan menampilkan alamat website Anda (misal: `https://username.github.io/educbt-lingora/`).

---

## 🔐 Akun Bawaan (Default Test Account)

| Role | Username / No Peserta | Password / PIN | Keterangan |
| :--- | :--- | :--- | :--- |
| **Admin / Guru** | `admin@educbt.id` *(atau `admin`)* | `admin123` | Akses penuh dashboard guru |
| **Siswa 1** | `1001` | `123456` | Siswa: Alex Pratama |
| **Siswa 2** | `1002` | `123456` | Siswa: Sophie Maharani |

---

## 📄 Lisensi
Proyek ini didistribusikan di bawah lisensi MIT. Bebas dimodifikasi dan dikembangkan untuk keperluan instansi pendidikan / sekolah.
