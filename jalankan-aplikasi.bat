@echo off
title Aplikasi Presensi QR Guru & Siswa
cd /d "%~dp0"
echo ============================================================
echo   Menjalankan Aplikasi Presensi QR Guru & Siswa
echo ============================================================
echo Membuka server...
start http://localhost:3000
node server.js
pause
