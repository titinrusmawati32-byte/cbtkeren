@echo off
title PEMULIHAN EDU CBT SENAPATI
echo ========================================================
echo   MENGEMBALIKAN APLIKASI EDU CBT SENAPATI KE VERSI NORMAL
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Memulihkan seluruh aplikasi ke versi stabil terakhir...
git checkout 7d0ad2468e8b6be6bfae95738c5379849a14686f -- .

echo.
echo [2/3] Menyimpan status pemulihan...
git add .
git commit -m "Rollback: Mengembalikan aplikasi ke versi stabil yang berfungsi normal dan bisa digunakan"

echo.
echo [3/3] Menyinkronkan ke GitHub...
git push origin main --force

echo.
echo ========================================================
echo   PEMULIHAN BERHASIL! 
echo   Aplikasi telah kembali ke kondisi normal dan bisa digunakan.
echo   Silakan refresh browser Anda (Ctrl + Shift + R atau Ctrl + F5).
echo ========================================================
echo.
pause
