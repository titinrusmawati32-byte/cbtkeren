-- ============================================================================
-- SQL SETUP TERBARU & OPTIMAL UNTUK APLIKASI CBT PEMBELAJARAN (EDUCBT LINGORA)
-- Versi 2.0 (Dilengkapi Anti-Curang, Acak Soal, Index Performa, & Hybrid RLS)
-- ============================================================================
-- Petunjuk:
-- 1. Buka dashboard proyek Supabase Anda (https://supabase.com/dashboard)
-- 2. Masuk ke menu "SQL Editor" di bilah kiri
-- 3. Tempelkan seluruh isi file ini, lalu klik tombol "RUN" (Jalankan)
-- ============================================================================

-- Aktifkan ekstensi UUID / Kriptografi
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABEL KELAS
CREATE TABLE IF NOT EXISTS public.kelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_kelas TEXT NOT NULL,
  wali_kelas TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL SISWA (Untuk Hybrid Login Peserta CBT & Leaderboard)
CREATE TABLE IF NOT EXISTS public.siswa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nisn TEXT UNIQUE NOT NULL,
  nama_lengkap TEXT NOT NULL,
  password TEXT NOT NULL DEFAULT '123456',
  kelas_id UUID REFERENCES public.kelas(id) ON DELETE SET NULL,
  poin INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL MAPEL & JADWAL UJIAN
CREATE TABLE IF NOT EXISTS public.mapel_jadwal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_mapel TEXT NOT NULL,
  nama_mapel TEXT NOT NULL,
  judul_ujian TEXT NOT NULL,
  kelas_id UUID REFERENCES public.kelas(id) ON DELETE SET NULL,
  durasi_menit INT NOT NULL DEFAULT 45,
  token TEXT NOT NULL DEFAULT 'CBT26',
  warna_tema TEXT DEFAULT 'blue',
  status_aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL BANK SOAL PILIHAN GANDA (Mendukung 3 s/d 5 Opsi Jawaban)
CREATE TABLE IF NOT EXISTS public.soal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jadwal_id UUID REFERENCES public.mapel_jadwal(id) ON DELETE CASCADE,
  pertanyaan TEXT NOT NULL,
  gambar_url TEXT DEFAULT '',
  opsi_a TEXT NOT NULL,
  opsi_b TEXT NOT NULL,
  opsi_c TEXT NOT NULL,
  opsi_d TEXT DEFAULT '-',
  opsi_e TEXT DEFAULT '-',
  kunci_jawaban TEXT NOT NULL DEFAULT 'A',
  bobot INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL REKAP NILAI CBT
CREATE TABLE IF NOT EXISTS public.rekap_nilai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id UUID REFERENCES public.siswa(id) ON DELETE CASCADE,
  jadwal_id UUID REFERENCES public.mapel_jadwal(id) ON DELETE CASCADE,
  benar INT NOT NULL DEFAULT 0,
  salah INT NOT NULL DEFAULT 0,
  nilai_akhir NUMERIC NOT NULL DEFAULT 0,
  jawaban_json JSONB DEFAULT '{}'::jsonb,
  waktu_selesai TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL PENGATURAN GLOBAL APLIKASI
CREATE TABLE IF NOT EXISTS public.pengaturan (
  id INT PRIMARY KEY DEFAULT 1,
  nama_aplikasi TEXT NOT NULL DEFAULT 'EduCBT Lingora',
  nama_sekolah TEXT NOT NULL DEFAULT 'SMA Negeri Harapan Bangsa',
  logo_url TEXT DEFAULT '',
  alamat_sekolah TEXT DEFAULT 'Jl. Pendidikan No. 45, Kota Cerdas',
  nama_kepsek TEXT DEFAULT 'Dr. H. Ahmad Sulaiman, M.Pd',
  nip_kepsek TEXT DEFAULT '19750412 200003 1 004',
  jumlah_opsi INT NOT NULL DEFAULT 4,
  tahun_ajaran TEXT NOT NULL DEFAULT '2026/2027',
  kkm_default INT NOT NULL DEFAULT 75,
  wajib_token BOOLEAN NOT NULL DEFAULT TRUE,
  acak_soal BOOLEAN NOT NULL DEFAULT TRUE,
  anti_curang BOOLEAN NOT NULL DEFAULT TRUE,
  max_pelanggaran INT NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah kolom baru jika tabel pengaturan sudah ada sebelumnya (Migrasi aman)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pengaturan' AND column_name='acak_soal') THEN
    ALTER TABLE public.pengaturan ADD COLUMN acak_soal BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pengaturan' AND column_name='anti_curang') THEN
    ALTER TABLE public.pengaturan ADD COLUMN anti_curang BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pengaturan' AND column_name='max_pelanggaran') THEN
    ALTER TABLE public.pengaturan ADD COLUMN max_pelanggaran INT NOT NULL DEFAULT 3;
  END IF;
END $$;

-- Baris pengaturan default
INSERT INTO public.pengaturan (
  id, nama_aplikasi, nama_sekolah, logo_url, alamat_sekolah,
  nama_kepsek, nip_kepsek, jumlah_opsi, tahun_ajaran, kkm_default, wajib_token, acak_soal, anti_curang, max_pelanggaran
)
VALUES (
  1, 'EduCBT Lingora', 'SMA Negeri Harapan Bangsa', '', 'Jl. Pendidikan No. 45, Kota Cerdas',
  'Dr. H. Ahmad Sulaiman, M.Pd', '19750412 200003 1 004', 4, '2026/2027', 75, TRUE, TRUE, TRUE, 3
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INDEX UNTUK PERFORMA TINGGI (CEPAT SAAT UJIAN SERENTAK DISELENGGARAKAN)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_siswa_nisn ON public.siswa (nisn);
CREATE INDEX IF NOT EXISTS idx_soal_jadwal_id ON public.soal (jadwal_id);
CREATE INDEX IF NOT EXISTS idx_rekap_siswa_jadwal ON public.rekap_nilai (siswa_id, jadwal_id);

-- ============================================================================
-- KONFIGURASI ROW LEVEL SECURITY (RLS) MENDUKUNG HYBRID LOGIN (ADMIN + SISWA)
-- ============================================================================
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapel_jadwal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rekap_nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengaturan ENABLE ROW LEVEL SECURITY;

-- Policies untuk tabel KELAS
DROP POLICY IF EXISTS "Akses Penuh Kelas Hybrid" ON public.kelas;
CREATE POLICY "Akses Penuh Kelas Hybrid" ON public.kelas
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policies untuk tabel SISWA
DROP POLICY IF EXISTS "Akses Penuh Siswa Hybrid" ON public.siswa;
CREATE POLICY "Akses Penuh Siswa Hybrid" ON public.siswa
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policies untuk tabel MAPEL_JADWAL
DROP POLICY IF EXISTS "Akses Penuh Mapel Jadwal Hybrid" ON public.mapel_jadwal;
CREATE POLICY "Akses Penuh Mapel Jadwal Hybrid" ON public.mapel_jadwal
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policies untuk tabel SOAL
DROP POLICY IF EXISTS "Akses Penuh Soal Hybrid" ON public.soal;
CREATE POLICY "Akses Penuh Soal Hybrid" ON public.soal
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policies untuk tabel REKAP_NILAI
DROP POLICY IF EXISTS "Akses Penuh Rekap Nilai Hybrid" ON public.rekap_nilai;
CREATE POLICY "Akses Penuh Rekap Nilai Hybrid" ON public.rekap_nilai
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policies untuk tabel PENGATURAN
DROP POLICY IF EXISTS "Akses Penuh Pengaturan Hybrid" ON public.pengaturan;
CREATE POLICY "Akses Penuh Pengaturan Hybrid" ON public.pengaturan
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
