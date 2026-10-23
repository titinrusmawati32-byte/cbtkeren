# 📘 Panduan Lengkap Setup & Publikasi EduCBT (Google Apps Script + Google Sheets)

Aplikasi CBT Lingora UI ini telah berhasil dimigrasi dari Supabase ke **Google Apps Script & Google Sheets** sebagai database 100% gratis, tanpa perlu kartu kredit, tanpa server hosting berbayar, dan seluruh tampilan antarmuka (UI/UX) tetap dipertahankan utuh.

---

## 📂 Struktur File Anda
Di folder proyek Anda (`EduCBT-Project` atau `C:\Users\freza\cbt\`):
1. **`Code.gs`** : Script backend Google Apps Script yang berfungsi sebagai API dan pengelola data di Google Spreadsheet.
2. **`index.html`** : Aplikasi CBT lengkap (UI Lingora, Engine Ujian, Anti-Cheat, Bank Soal, Kartu Ujian, Analisis Nilai, dan Pengaturan).
3. **`PANDUAN_SETUP_GOOGLE_APPS_SCRIPT.md`** : Panduan instalasi dan publikasi ini.

---

## 🚀 Langkah 1: Siapkan Database Google Sheets & Apps Script

1. **Buat Google Spreadsheet Baru**:
   - Buka browser dan kunjungi: **[https://sheets.new](https://sheets.new)**
   - Beri nama spreadsheet Anda, misalnya: `Database EduCBT Lingora`
   *(Anda tidak perlu membuat lembar/sheet secara manual, script akan membuatnya secara otomatis!)*

2. **Buka Script Editor**:
   - Di menu atas Google Sheet, klik **Ekstensi (Extensions)** ➔ **Apps Script**.
   - Hapus semua baris kode default yang ada di jendela editor `Code.gs`.

3. **Salin Kode Backend**:
   - Buka file **`Code.gs`** dari folder Anda.
   - Salin (**Copy**) seluruh isinya dan tempel (**Paste**) ke editor Apps Script.
   - Klik ikon **Simpan (Save / Ctrl+S)**.

4. **Inisialisasi Tabel Pertama Kali**:
   - Di baris atas editor (di sebelah tombol Run / Debug), pilih fungsi: **`setupDatabase`**.
   - Klik **Jalankan (Run)**.
   - Google akan meminta verifikasi izin (*Authorization Required*):
     - Klik **Review Permissions** (Tinjau Izin).
     - Pilih akun Google Anda.
     - Klik **Advanced** (Lanjutan) di kiri bawah, lalu klik **Go to Untitled project (unsafe)**.
     - Klik **Allow** (Izinkan).
   - *Selesai!* Buka kembali tab Google Sheet Anda, sheet `kelas`, `siswa`, `mapel_jadwal`, `soal`, `rekap_nilai`, dan `pengaturan` beserta data awal akan otomatis terbuat.

---

## 🌐 Langkah 2: Deploy Google Apps Script sebagai Web App

Agar `index.html` bisa membaca dan menyimpan data ke Google Sheet, Apps Script harus dipublikasikan sebagai Web App:

1. Di editor Apps Script, klik tombol biru **Deploy** (Terapkan) di pojok kanan atas ➔ pilih **New deployment** (Penerapan baru).
2. Klik ikon gerigi (roda gigi) di sebelah *Select type* ➔ pilih **Web app**.
3. Atur formulirnya sebagai berikut:
   - **Description**: `Versi 1.0 EduCBT`
   - **Execute as** (Jalankan sebagai): **Me (email Anda sendiri)**
   - **Who has access** (Siapa yang memiliki akses): **Anyone (Siapa saja)** *(Wajib dipilih agar siswa/pengguna dapat mengakses tanpa perlu login Google)*
4. Klik **Deploy**.
5. Salin tautan **Web App URL** yang muncul (formatnya: `https://script.google.com/macros/s/AKfycbx.../exec`).

---

## 🔗 Langkah 3: Sambungkan Web App URL ke `index.html`

Ada 2 cara menghubungkan URL tersebut:

### Cara A (Paling Mudah, langsung lewat browser):
1. Buka file **`index.html`** langsung di browser (klik ganda file tersebut).
2. Di pojok kanan atas layar login / navigasi, klik tombol **"Hubungkan Database"** (ikon database oranye).
3. Masukkan URL Web App Google Apps Script yang Anda salin tadi.
4. Klik **"Uji Koneksi"**. Bila status menunjukkan hijau / Berhasil, klik **"Simpan & Terapkan"**.
5. Sistem akan langsung terkoneksi ke Google Sheet Anda!

### Cara B (Permanen di dalam file `index.html`):
1. Buka file `index.html` dengan teks editor (Notepad, VS Code, dll).
2. Cari baris berikut (sekitar baris 819):
   ```javascript
   const GAS_CONFIG = {
       WEB_APP_URL: '', // Tempelkan URL Google Apps Script Web App di sini
   ...
   ```
3. Masukkan URL Anda di antara tanda kutip, contoh:
   ```javascript
   WEB_APP_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
   ```
4. Simpan file.

---

## 🔑 Akun Default untuk Pengujian

Setelah inisialisasi awal, database sudah memiliki akun default:

### 1. Akun Guru / Administrator:
- **Username**: `admin`
- **Password**: `admin123`
- *(Dapat mengakses manajemen kelas, siswa, jadwal ujian, bank soal, cetak kartu, dan rekap nilai)*

### 2. Akun Siswa Pengujian:
- **No Peserta**: `2026001`
- **PIN / Password**: `123456`
- **Siswa**: Ahmad Fauzi (Kelas: 10-IPA-1)

---

## 🌍 Langkah 4: Publikasikan Website ke Internet (Gratis)

Untuk menyebarkan aplikasi ke siswa secara online tanpa perlu komputer Anda menyala:

### Opsi 1: Menggunakan Netlify Drop (Paling Cepat & Populer)
1. Kunjungi **[https://app.netlify.com/drop](https://app.netlify.com/drop)**.
2. Tarik (*drag-and-drop*) folder yang berisi file `index.html` ke area upload Netlify.
3. Dalam 5 detik, Netlify akan memberikan alamat website publik (misalnya: `https://cbt-lingora-sekolah.netlify.app`).

### Opsi 2: Menggunakan GitHub Pages
1. Buat repositori baru di GitHub (misal: `educbt-lingora`).
2. Upload file `index.html`.
3. Buka menu **Settings** ➔ **Pages** ➔ pada Branch pilih `main` / `root` ➔ klik **Save**.
4. Website akan aktif di `https://username.github.io/educbt-lingora`.

### Opsi 3: Menggunakan Vercel
1. Kunjungi **[https://vercel.com](https://vercel.com)**.
2. Impor proyek Anda dan deploy file HTML secara instan.

---

## 💡 Keunggulan Integrasi Ini:
- **Anti-CORS Error**: Request dikirimkan menggunakan protokol teks yang kompatibel penuh dengan Google Apps Script tanpa terhambat CORS browser.
- **Offline/Demo Safe**: Jika koneksi Google Apps Script belum diisi, aplikasi otomatis berjalan dalam mode simulasi (*Demo Preview Mode*) sehingga antarmuka tetap dapat dicoba.
- **Nilai Langsung Tersimpan**: Jawaban dan perolehan nilai siswa langsung tersinkronisasi ke sheet `rekap_nilai` di Google Sheet Anda secara real-time.
