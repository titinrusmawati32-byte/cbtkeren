@echo off
echo ========================================================
echo   EduCBT Lingora - Sinkronisasi Perubahan ke GitHub
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Menambahkan berkas yang diubah...
git add .

echo [2/3] Menyimpan commit...
git commit -m "Perbaikan Sistem Login & Persistensi Sesi: Token HMAC SHA256, localStorage educbt_auth_token, restoreSession tanpa flicker login, dan pemulihan menu aktif saat refresh F5"

echo [3/3] Mengunggah ke GitHub...
git push origin main

echo.
echo ========================================================
echo   Berhasil diperbarui di GitHub!
echo ========================================================
echo.
pause
