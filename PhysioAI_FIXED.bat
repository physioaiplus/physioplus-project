@echo off
title PhysioAI - Setup Completo
color 0A

REM Disabilita la chiusura automatica su errori
set COMSPEC=%COMSPEC%

echo.
echo ===============================================
echo           🚀 PHYSIO AI SETUP 🚀
echo ===============================================
echo.

echo Questo script installerà e avvierà PhysioAI
echo automaticamente su questo computer.
echo.

pause

echo 🔍 CONTROLLI INIZIALI...
echo.

REM Controllo Python - molte opzioni
echo 📋 Controllo Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔄 Provando python3...
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo 🔄 Provando py...
        py --version >nul 2>&1
        if %errorlevel% neq 0 (
            echo ❌ PYTHON NON TROVATO!
            echo.
            echo ╔════════════════════════════════════════════════════════════════╗
            echo ║                   PYTHON NON INSTALLATO!                      ║
            echo ╚════════════════════════════════════════════════════════════════╝
            echo.
            echo 🔧 INSTALLAZIONE AUTOMATICA PYTHON...
            echo.
            echo Opzioni disponibili:
            echo.
            echo [1] Installazione automatica da Microsoft Store (RACCOMANDATO)
            echo [2] Download manuale dal sito ufficiale
            echo [3] Sali e installa tu stesso
            echo.
            set /p choice="Scelta (1/2/3): "
            
            if "%choice%"=="1" (
                echo 🔄 Apertura Microsoft Store per installare Python...
                start ms-windows-store://pdp/?ProductId=9NRWMJP3717K
                echo ⏳ Attendi installazione di Python dalla Store...
                echo ⏳ Poi riavvia questo script facendo doppio click
                pause
                exit /b 1
            )
            
            if "%choice%"=="2" (
                echo 🌐 Apertura sito Python per download...
                echo IMPORTANTE: Spunta "Add Python to PATH" durante installazione!
                start https://python.org/downloads/windows/
                echo ⏳ Scarica e installa Python dal sito
                echo ⏳ IMPORTANTE: Spunta "Add Python to PATH"!
                echo ⏳ Poi riavvia questo script
                pause
                exit /b 1
            )
            
            if "%choice%"=="3" (
                echo 📋 Per installare Python manualmente:
                echo 1. Vai su: https://python.org/downloads
                echo 2. Scarica "Python Installation" (+50 MB)
                echo 3. IMPORTANTISSIMO: Spunta "Add Python to PATH"
                echo 4. Installa e riavvia questo script
                start https://python.org/downloads/
                pause
                exit /b 1
            )
            
            echo ❌ Scelta non valida. Chiusura...
            pause
            exit /b 1
        ) else (
            set PYTHON_CMD=py
            echo ✅ Python trovato (py)!
        )
    ) else (
        set PYTHON_CMD=python3
        echo ✅ Python trovato (python3)!
    )
) else (
    set PYTHON_CMD=python
    echo ✅ Python trovato (python)!
)

REM Controllo Node.js
echo 📋 Controllo Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ NODE.JS NON TROVATO!
    echo.
    echo ╔════════════════════════════════════════════════════════════════╗
    echo ║                   NODE.JS NON INSTALLATO!                    ║
    echo ╚════════════════════════════════════════════════════════════════╝
    echo.
    echo 🔧 INSTALLAZIONE AUTOMATICA NODE.JS...
    echo.
    echo Opzioni disponibili:
    echo.
    echo [1] Download automatico Node.js LTS (RACCOMANDATO)
    echo [2] Apri sito Node.js per installazione manuale
    echo [3] Installazione alternativa con winget (se disponibile)
    echo.
    set /p choice="Scelta (1/2/3): "
    
    if "%choice%"=="1" (
        echo 🌐 Download automatico Node.js LTS...
        echo ⏳ Apertura sito per download diretto...
        start https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
        echo 📥 Scarica la versione x64.msi per Windows
        echo ⏳ Installa Node.js (usa impostazioni predefinite)
        echo ⏳ IMPORTANTE: Spunta "Automatically install npm"
        echo ⏳ Poi riavvia questo script
        pause
        exit /b 1
    )
    
    if "%choice%"=="2" (
        echo 🌐 Apertura sito Node.js...
        echo IMPORTANTE: Scarica versione LTS (Long Term Support)!
        start https://nodejs.org/
        echo ⏳ Scarica Node.js LTS
        echo ⏳ Installa con impostazioni predefinite
        echo ⏳ Poi riavvia questo script
        pause
        exit /b 1
    )
    
    if "%choice%"=="3" (
        echo 🔄 Tentativo installazione con winget...
        winget install OpenJS.NodeJS >nul 2>&1
        if %errorlevel% neq 0 (
            echo ❌ Winget non disponibile o errore installazione
            echo 🌐 Fallback su download manuale...
            start https://nodejs.org/
            pause
            exit /b 1
        ) else (
            echo ✅ Node.js installato con winget!
            echo 🔄 Riavvia questo script ora...
            pause
            exit /b 0
        )
    )
    
    echo ❌ Scelta non valida. Chiusura...
    pause
    exit /b 1
) else (
    echo ✅ Node.js trovato!
)

echo.
echo 🔧 SETUP BACKEND PYTHON...
echo.

REM Crea backend se non esiste
if not exist "backend" (
    echo ❌ Cartella backend non trovata!
    echo Verifica di essere nella cartella giusta
    pause
    exit /b 1
)

cd backend

REM Setup ambiente virtuale
if not exist "venv" (
    echo 📦 Creazione ambiente virtuale...
    %PYTHON_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo ❌ Errore creazione venv!
        pause
        exit /b 1
    )
    echo ✅ Ambiente virtuale creato
) else (
    echo ✅ Ambiente virtuale già presente
)

echo 🔄 Attivazione ambiente...
call venv\Scripts\activate.bat

echo ⬆️ Aggiornamento pip...
python -m pip install --upgrade pip
python -m pip install wheel

echo 📦 Installazione pacchetti Python...
echo    - FastAPI Server...
pip install fastapi==0.104.1
pip install uvicorn[standard]==0.24.0

echo    - Data Validation...
pip install pydantic==2.5.0
pip install pydantic-settings==2.1.0
pip install python-multipart==0.0.6

echo    - Computer Vision...
pip install opencv-python==4.8.1.78
pip install mediapipe==0.10.8

echo    - System Libraries...
pip install numpy==1.24.3
pip install firebase-admin==6.3.0
pip install websockets==12.0

echo    - Security & Utils...
pip install python-jose[cryptography]==3.3.0
pip install python-dotenv==1.0.0
pip install Pillow==10.1.0
pip install aiofiles==23.2.1
pip install email-validator==2.1.0

echo ✅ Backend Python configurato!

echo.
echo ⚛️ SETUP FRONTEND REACT...
echo.

cd ..\frontend

if not exist "frontend" (
    echo ❌ Cartella frontend non trovata!
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo 📦 Installazione React...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Errore npm install!
        echo Prova a cancellare node_modules e riavvia
        pause
        exit /b 1
    )
) else (
    echo ✅ Dipendenze React già installate
)
echo ✅ Frontend configurato!

echo.
echo 🚀 AVVIO SERVER...
echo.

echo 📤 Avvio Backend (porta 8000)...
cd ..\backend
start "PhysioAI Backend Server" cmd /k "title PhysioAI Backend && cd && venv\Scripts\activate && echo 🚀 BACKEND ATTIVO! && echo 🌐 http://localhost:8000 && echo 📖 http://localhost:8000/docs && echo. && echo ⚠️ NON CHIUDERE QUESTA FINESTRA! && echo 🛑 Ctrl+C per fermare && echo. && python -m app.main"

echo ⏳ Attesa avvio backend... (7 secondi)
timeout /t 7 /nobreak

echo 📤 Avvio Frontend (porta 3000)...
cd frontend
start "PhysioAI Frontend Server" cmd /k "title PhysioAI Frontend && echo 🚀 FRONTEND ATTIVO! && echo 🌐 http://localhost:3000 && echo. && echo ⚠️ NON CHIUDERE QUESTA FINESTRA! && echo 🛑 Ctrl+C per fermare && echo. && npm run dev"

echo ⏳ Attesa avvio frontend... (5 secondi)
timeout /t 5 /nobreak

echo 🌐 Apertura browser...
start http://localhost:3000

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                    🎉 PHYSIOAI ONLINE! 🎉                          ║
echo ║                                                                    ║
echo ║  🌐 App: http://localhost:3000                                     ║
echo ║  🔧 API: http://localhost:8000                                     ║
echo ║  📖 Docs: http://localhost:8000/docs                              ║
echo ║                                                                    ║
echo ║  📧 Login: demo@physioai.com                                      ║
echo ║  🔑 Pass: password123                                              ║
echo ║                                                                    ║
echo ║  ⚠️ NON CHIUDERE le finestre server!                               ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.
echo Il browser dovrebbe essersi aperto automaticamente!
echo Se no, vai su: http://localhost:3000
echo.
echo Per fermare tutto: Ctrl+C nelle finestre server
echo Per riavviare: esegui di nuovo questo file
echo.
pause
