@echo off
echo ========================================================
echo   EDU CBT SENAPATI - Sinkronisasi Perubahan ke GitHub
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Menambahkan berkas yang diubah...
git add .

echo [2/3] Menyimpan commit...
git commit -m "Fix: Robust auto-loading Firebase SDK and embedded config for cbtkeren-3da33"

echo [3/3] Mengunggah ke GitHub...
git push origin main

echo.
echo ========================================================
echo   Berhasil diperbarui di GitHub!
echo ========================================================
echo.
pause
