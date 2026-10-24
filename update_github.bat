@echo off
echo ========================================================
echo   EduCBT Lingora - Sinkronisasi Perubahan ke GitHub
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Menambahkan berkas yang diubah...
git add .

echo [2/3] Menyimpan commit...
git commit -m "Pengembangan Menu Bank Soal CBT: Template Excel 2 Sheet, Import Validasi Baris, Preview Draft, Upload Foto Perangkat & Ujian Esai-PG"

echo [3/3] Mengunggah ke GitHub...
git push origin main

echo.
echo ========================================================
echo   Berhasil diperbarui di GitHub!
echo ========================================================
echo.
pause
