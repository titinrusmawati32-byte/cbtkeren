@echo off
echo ========================================================
echo   EduCBT Lingora - Setup Git Repository Lokal
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Menginisialisasi Git...
git init

echo [2/3] Menambahkan semua berkas proyek...
git add .

echo [3/3] Melakukan commit perdana...
git commit -m "Initial commit: EduCBT Lingora UI dengan Google Apps Script Backend"

echo.
echo ========================================================
echo   Inisialisasi lokal berhasil!
echo ========================================================
echo.
echo Langkah selanjutnya:
echo 1. Buat repository baru di: https://github.com/new
echo 2. Salin URL repositori Anda (contoh: https://github.com/user/cbt-lingora.git)
echo 3. Jalankan perintah berikut di Command Prompt / PowerShell:
echo.
echo    git branch -M main
echo    git remote add origin URL_GITHUB_ANDA
echo    git push -u origin main
echo.
pause
