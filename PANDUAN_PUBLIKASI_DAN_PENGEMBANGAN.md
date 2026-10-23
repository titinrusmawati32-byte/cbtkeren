# 🚀 PANDUAN PENGEMBANGAN & PUBLIKASI APLIKASI EDUCBT LINGORA

Selamat! Aplikasi **EduCBT Lingora** telah berhasil dikembangkan dengan fitur-fitur baru berstandar ujian sekolah modern, aman dari kecurangan, serta siap dipublikasikan secara online 24/7 secara **100% GRATIS**.

---

## 🌟 1. FITUR-FITUR BARU YANG TELAH DIKEMBANGKAN

Aplikasi telah disempurnakan dengan penambahan modul dan fitur penting:
1. **⚙️ In-App Supabase Wizard (Konfigurasi Tanpa Edit Koding)**
   - Pengguna/Guru tidak perlu mengedit file HTML untuk menghubungkan database.
   - Cukup klik tombol **Database** / ikon gear pada halaman Login atau Pengaturan, masukkan `Project URL` dan `Anon Key`, lalu simpan. Konfigurasi tersimpan rapi di browser.
   - Tersedia saklar instan untuk beralih antara **Mode Supabase (Online)** dan **Mode Demo (Offline)**.
2. **🛡️ Sistem Pengawas Ujian Anti-Kecurangan (Anti-Cheat Proctoring)**
   - **Deteksi Pindah Tab / Layar**: Aplikasi mendeteksi otomatis jika siswa meminimalisir layar, membuka tab baru, atau berpindah aplikasi lain (`blur` & `visibilitychange`).
   - Menghitung pelanggaran secara real-time (default max 3 kali toleransi). Jika melampaui batas, ujian akan **otomatis dikumpulkan**.
   - Mode Layar Penuh (*Fullscreen*) terintegrasi saat memulai ujian.
3. **🔀 Pengacakan Urutan Soal (Shuffle Questions)**
   - Jika opsi acak diaktifkan di menu Pengaturan, urutan butir soal akan otomatis diacak untuk setiap siswa, sehingga siswa yang duduk berdampingan tidak dapat saling menyontek nomor soal.
4. **🖨️ Cetak Kartu Peserta Ujian (Print-Ready)**
   - Di menu **Data Siswa**, guru dapat mengklik tombol **Cetak Kartu Ujian**.
   - Sistem akan otomatis menghasilkan lembar cetak kartu ujian resmi berisi: Kop Sekolah, Nama Siswa, NISN, Password Login, Kelas, serta kolom tanda tangan pengawas.
5. **📑 Cetak Lembar Hasil Nilai / Transkrip Resmi (Official Report)**
   - Di menu **Rekap Nilai**, guru dapat mencetak laporan rekapitulasi ujian lengkap dengan Kop Surat Sekolah, tabel rekapitulasi nilai, status kelulusan KKM, serta kolom tanda tangan Kepala Sekolah dan NIP.
6. **⚡ Optimalisasi Database & Indexing Supabase**
   - Penambahan index performa di tabel Supabase untuk menjamin kestabilan dan kecepatan akses saat ratusan siswa serentak mengerjakan ujian.

---

## 📂 2. STRUKTUR FILE PROYEK

Di folder proyek Anda (`EduCBT-Project`), terdapat file-file berikut:
* 📄 `index.html` : Aplikasi utama CBT lengkap (UI, Engine Ujian, Logika Auth Hybrid, Print Engine, & PWA).
* 📄 `skema_database_supabase_v2.sql` : Skrip SQL lengkap untuk setup database Supabase PostgreSQL.
* 📄 `PANDUAN_PUBLIKASI_DAN_PENGEMBANGAN.md` : Dokumen panduan ini.

---

## 🛠️ 3. LANGKAH 1: SETUP DATABASE SUPABASE (BACKEND ONLINE)

Backend Supabase digunakan untuk menyimpan data Kelas, Siswa, Soal, Nilai, dan Profil Sekolah secara cloud real-time.

1. **Daftar / Masuk ke Supabase**:
   - Buka browser dan kunjungi [https://supabase.com](https://supabase.com).
   - Klik **Start your project** dan masuk menggunakan akun GitHub atau Google.
2. **Buat Proyek Baru**:
   - Klik **New Project**.
   - Isi nama proyek, misalnya: `educbt-sekolah`.
   - Buat kata sandi database yang kuat (simpan di catatan Anda).
   - Pilih region terdekat (misalnya: *Singapore* untuk akses tercepat dari Indonesia).
   - Klik **Create new project** dan tunggu sekitar 1-2 menit hingga status proyek aktif.
3. **Jalankan Skrip Database**:
   - Di bilah menu sebelah kiri, klik menu **SQL Editor** (ikon terminal/lembaran SQL).
   - Klik tombol **New query** (+).
   - Buka file `skema_database_supabase_v2.sql`, salin (**Copy**) seluruh isinya, lalu tempel (**Paste**) ke editor SQL Supabase.
   - Klik tombol **Run** (atau tekan `Ctrl + Enter`).
   - Pastikan muncul notifikasi hijau: `Success. No rows returned`.
4. **Ambil Kredensial API (Project URL & Anon Key)**:
   - Di bilah menu kiri, klik menu **Project Settings** (ikon gerigi di kiri bawah).
   - Pilih submenu **API**.
   - Anda akan melihat:
     * **Project URL**: (Contoh: `https://abcdefghijkl.supabase.co`)
     * **Project API Keys** -> baris `anon` `public`: (Rangkaian token panjang berawalan `eyJ...`)
   - Salin kedua data ini.
5. **Buat Akun Administrator Guru (Supabase Auth)**:
   - Di bilah menu kiri, klik menu **Authentication** -> submenu **Users**.
   - Klik tombol **Add user** -> pilih **Create user**.
   - Masukkan Email dan Password Admin Anda (misal: `admin@sekolah.sch.id` dan password minimal 6 karakter).
   - Klik **Create user**. Akun Admin Guru Anda siap digunakan untuk login!

---

## 🌐 4. LANGKAH 2: CARA PUBLIKASIKAN WEBSITE KE INTERNET (100% GRATIS)

Pilih salah satu metode termudah di bawah ini:

### 🟢 METODE A: NETLIFY DROP (Paling Mudah & Tercepat — Tanpa Koding / Git)
1. Buka situs [https://app.netlify.com/drop](https://app.netlify.com/drop) di browser Anda.
2. Tarik dan lepas (*drag & drop*) folder `EduCBT-Project` (atau folder yang berisi file `index.html`) langsung ke kotak di layar browser.
3. Tunggu beberapa detik, Netlify akan langsung memberikan URL website publik yang aktif (contoh: `https://educbt-lingora-123.netlify.app`).
4. Selesai! Aplikasi Anda sudah online dan dapat diakses dari HP maupun laptop siswa di seluruh dunia.
*(Tips: Buat akun Netlify gratis jika ingin mengubah nama domain URL menjadi lebih rapi, misal `cbt-sekolahku.netlify.app`)*.

---

### 🟢 METODE B: VERCEL (Sangat Populer & Cepat)
1. Kunjungi [https://vercel.com](https://vercel.com) dan buat akun gratis.
2. Anda bisa mengunggah folder ini via GitHub repository, atau menggunakan terminal perintah:
   ```bash
   npx vercel
   ```
3. Ikuti petunjuk singkat di layar, dan dalam 30 detik website Anda akan live di domain `.vercel.app`.

---

### 🟢 METODE C: GITHUB PAGES (Permanen & Terhubung Source Code)
1. Buat repository baru di [GitHub](https://github.com), misalnya bernama `cbt-online`.
2. Unggah file `index.html` ke branch `main`.
3. Masuk ke **Settings** repository -> menu **Pages** di bilah kiri.
4. Di bagian *Branch*, pilih `main` dan folder `/ (root)`, lalu klik **Save**.
5. Tunggu 1 menit, website akan aktif di `https://username.github.io/cbt-online/`.

---

### 🟢 METODE D: EMBED KE BLOGGER / GOOGLE SITES
Aplikasi ini sudah dilengkapi pembungkus `#educbt-root` fullscreen otomatis.
- **Blogger**: Buat Halaman Baru -> Ubah mode editor ke **HTML View** -> Tempel seluruh kode `index.html` -> Publikasikan.
- **Google Sites**: Buka Google Sites -> Tambah Elemen **Sematkan (Embed)** -> Pilih **Sematkan Kode** -> Tempel isi `index.html` -> Atur ukuran layar penuh.

---

## 🔗 5. LANGKAH 3: MENGHUBUNGKAN APLIKASI DENGAN SUPABASE

Setelah aplikasi terbuka di browser (baik saat dibuka secara lokal maupun setelah di-publish ke Netlify/Vercel):

1. Di halaman login, klik tombol **Konfigurasi Supabase** di bagian atas (atau ikon database di samping teks login).
2. Masukkan **Project URL** dan **Anon Key** Supabase yang telah Anda salin pada Langkah 1.
3. Klik **Simpan & Hubungkan**.
4. Halaman akan memuat ulang dan banner akan otomatis berganti dari status *Demo* ke status **Supabase Online**!

---

## 📋 6. ALUR PENGGUNAAN SISTEM OLEH GURU & SISWA

```
[1. Admin Login] ➔ [2. Input Kelas] ➔ [3. Input Siswa (Excel)] ➔ [4. Cetak Kartu Ujian]
                                                                        │
[6. Rekap Nilai & Cetak] 🠔 [5. Siswa Login & Mengerjakan Ujian CBT] 🠔───┘
```

1. **Login Guru / Administrator**:
   - Pilih tab **Admin / Guru**. Masukkan Email dan Password Supabase Auth yang telah dibuat.
2. **Setup Rombongan Belajar (Kelas)**:
   - Masuk ke menu **Data Kelas** -> Tambahkan kelas (misal: XII MIPA 1, XI IPS 2).
3. **Input Data Siswa**:
   - Masuk ke menu **Data Siswa**.
   - Anda dapat menambahkan satu per satu atau klik **Format .XLSX** untuk mengunduh template Excel, isi data siswa (NISN, Nama, Password, Kelas), lalu klik **Import Excel**.
4. **Cetak Kartu Ujian Siswa**:
   - Di menu Data Siswa, klik **Cetak Kartu Ujian**. Cetak atau simpan ke PDF untuk dibagikan kepada peserta sebelum ujian dimulai.
5. **Buat Jadwal & Butir Soal**:
   - Masuk ke **Jadwal & Mapel** -> Tambahkan jadwal ujian (tentukan token, durasi waktu menit).
   - Masuk ke **Bank Soal CBT** -> Pilih mata pelajaran -> Tambahkan soal pilihan ganda, kunci jawaban, dan bobot nilai.
6. **Pelaksanaan Ujian oleh Siswa**:
   - Siswa membuka alamat website CBT dari smartphone atau laptop masing-masing.
   - Siswa memilih tab **Peserta / Siswa**, memasukkan **NISN** dan **Password** yang tertera pada kartu ujian.
   - Siswa memilih mata pelajaran, memasukkan token ujian, dan sistem anti-curang akan otomatis memantau siswa selama pengerjaan.
7. **Rekapitulasi Nilai**:
   - Setelah siswa selesai, nilai otomatis terkalkulasi secara real-time.
   - Guru dapat memfilter berdasarkan mata pelajaran, mengekspor ke file Excel/CSV, atau mengklik **Cetak Laporan Resmi** untuk mencetak berita acara nilai resmi dengan tanda tangan Kepala Sekolah.
