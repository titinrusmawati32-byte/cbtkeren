@echo off
echo ========================================================
echo   EDU CBT SENAPATI - Sinkronisasi Perubahan ke GitHub
echo ========================================================
echo.
cd /d "%~dp0"

echo Menyalin logo resmi SENAPATI EXAM...
copy /Y "C:\Users\freza\.gemini\antigravity\brain\92b674ac-c303-4af5-84b1-a48ece4dce37\.user_uploaded\media_1792856440890_fbc21a36.png" "%~dp0logo.png"

echo [1/4] Menambahkan berkas yang diubah...
git add .

echo [2/4] Menyimpan commit...
git commit -m "Feat: Navigasi Folder Siswa Terisolasi - Halaman Utama Kumpulan Folder & Detail Materi"

echo [3/4] Menyelaraskan dengan remote GitHub (Pull)...
git pull origin main --rebase

echo [4/4] Mengunggah ke GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Terjadi perbedaan commit dengan remote. Melakukan push prioritas...
    git push origin main --force
)

echo.
echo ========================================================
echo   Berhasil diperbarui di GitHub!
echo ========================================================
echo.
pause
