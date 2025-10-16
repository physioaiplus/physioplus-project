@echo off
title PhysioAI - Stop Server
color 0C

echo.
echo ╔════════════════════════════════════════╗
echo ║     🛑 STOP PHYSIOAI SERVERS           ║
echo ╚════════════════════════════════════════╝
echo.

echo 🔍 Ricerca processi attivi...
echo.

REM Ferma Uvicorn (Backend Python)
echo 🐍 Terminazione Backend Python...
tasklist /FI "WINDOWTITLE eq PhysioAI Backend" >nul 2>&1
if %errorlevel% equ 0 (
    taskkill /FI "WINDOWTITLE eq PhysioAI Backend" /F >nul 2>&1
    echo    ✅ Backend fermato
) else (
    echo    ℹ️  Backend non in esecuzione
)

REM Ferma processi uvicorn
taskkill /IM uvicorn.exe /F >nul 2>&1
taskkill /IM python.exe /FI "WINDOWTITLE eq *uvicorn*" /F >nul 2>&1

REM Ferma Node.js (Frontend)
echo ⚛️  Terminazione Frontend React...
tasklist /FI "WINDOWTITLE eq PhysioAI Frontend" >nul 2>&1
if %errorlevel% equ 0 (
    taskkill /FI "WINDOWTITLE eq PhysioAI Frontend" /F >nul 2>&1
    echo    ✅ Frontend fermato
) else (
    echo    ℹ️  Frontend non in esecuzione
)

REM Ferma processi node correlati a Vite
taskkill /IM node.exe /FI "WINDOWTITLE eq *vite*" /F >nul 2>&1

REM Libera porte (opzionale)
echo.
echo 🔓 Liberazione porte...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do taskkill /PID %%a /F >nul 2>&1
echo    ✅ Porte liberate

echo.
echo ╔════════════════════════════════════════╗
echo ║     ✅ TUTTI I SERVER SONO FERMATI     ║
echo ╚════════════════════════════════════════╝
echo.
echo Per riavviare: esegui setup.bat
echo.
timeout /t 3
