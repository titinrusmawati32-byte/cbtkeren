@echo off
echo ========================================================
echo   EDU CBT SENAPATI - Sinkronisasi Perubahan ke GitHub
echo ========================================================
echo.
cd /d "%~dp0"

echo Menyalin logo resmi SENAPATI EXAM...
copy /Y "C:\Users\freza\.gemini\antigravity\brain\92b674ac-c303-4af5-84b1-a48ece4dce37\.user_uploaded\media_1792856440890_fbc21a36.png" "%~dp0logo.png"

echo [1/3] Menambahkan berkas yang diubah...
git add .

echo [2/3] Menyimpan commit...
git commit -m "UI: Ganti logo halaman login dengan logo resmi emas Senapati Exam (Globe & Book)"

echo [3/3] Mengunggah ke GitHub...
git push origin main

echo.
echo ========================================================
echo   Berhasil diperbarui di GitHub!
echo ========================================================
echo.
pause
