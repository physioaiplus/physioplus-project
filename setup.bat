@echo off
title PhysioAI - Setup Completo
color 0A

echo.
echo ===============================================
echo           🚀 PHYSIO AI SETUP 🚀
echo ===============================================
echo.
echo Questo script installerà e avvierà PhysioAI
echo automaticamente su questo computer.
echo.
pause

REM Salva directory corrente
set "ROOT_DIR=%CD%"
echo 📂 Directory root: %ROOT_DIR%
echo.

echo 🔍 CONTROLLI INIZIALI...
echo.

REM ==================== CONTROLLO PYTHON ====================
echo 📋 Controllo Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        python3 --version >nul 2>&1
        if %errorlevel% neq 0 (
            echo ❌ PYTHON NON TROVATO!
            echo.
            echo Per installare Python:
            echo 1. Vai su: https://python.org/downloads
            echo 2. Scarica Python 3.11 (NON 3.12+)
            echo 3. IMPORTANTE: Spunta "Add Python to PATH"
            echo 4. Installa e riavvia questo script
            echo.
            start https://www.python.org/downloads/release/python-3119/
            pause
            exit /b 1
        ) else (
            set PYTHON_CMD=python3
        )
    ) else (
        set PYTHON_CMD=py
    )
) else (
    set PYTHON_CMD=python
)

echo ✅ Python trovato: %PYTHON_CMD%
%PYTHON_CMD% --version
echo.

REM ==================== CONTROLLO NODE.JS ====================
echo 📋 Controllo Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ NODE.JS NON TROVATO!
    echo.
    echo Per installare Node.js:
    echo 1. Vai su: https://nodejs.org
    echo 2. Scarica versione LTS (20.x)
    echo 3. Installa con impostazioni predefinite
    echo 4. Riavvia questo script
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js trovato!
node --version
npm --version
echo.

REM ==================== VERIFICA STRUTTURA ====================
echo 📋 Verifica struttura progetto...

if not exist "backend" (
    echo ❌ Cartella 'backend' non trovata!
    echo Assicurati di essere nella directory root del progetto
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ Cartella 'frontend' non trovata!
    echo Assicurati di essere nella directory root del progetto
    pause
    exit /b 1
)

echo ✅ Struttura progetto corretta
echo.

REM ==================== SETUP BACKEND ====================
echo.
echo ╔════════════════════════════════════════╗
echo ║     🐍 SETUP BACKEND PYTHON            ║
echo ╚════════════════════════════════════════╝
echo.

cd "%ROOT_DIR%\backend"

REM Verifica file main.py
if not exist "main.py" (
    echo ⚠️  File main.py non trovato!
    echo Creazione file main.py in corso...
    echo # Placeholder > main.py
    echo ❌ ERRORE: Devi creare il file main.py manualmente
    echo Copia il codice del backend nell'artifact backend_main
    pause
    exit /b 1
)

REM Setup ambiente virtuale
if not exist "venv" (
    echo 📦 Creazione ambiente virtuale Python...
    %PYTHON_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo ❌ Errore creazione ambiente virtuale!
        echo Verifica che Python sia installato correttamente
        pause
        exit /b 1
    )
    echo ✅ Ambiente virtuale creato
) else (
    echo ✅ Ambiente virtuale già presente
)

echo.
echo 🔄 Attivazione ambiente virtuale...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo ❌ Errore attivazione venv!
    pause
    exit /b 1
)

echo ✅ Ambiente attivato
echo.

echo ⬆️  Aggiornamento pip...
python -m pip install --upgrade pip --quiet
python -m pip install wheel --quiet

echo.
echo 📦 Installazione pacchetti Python...
echo    Questo può richiedere alcuni minuti...
echo.

REM Installa requirements
if exist "requirements.txt" (
    echo 📄 Installazione da requirements.txt...
    pip install -r requirements.txt
) else (
    echo 📋 Installazione pacchetti individuali...
    
    echo    [1/15] FastAPI...
    pip install fastapi==0.104.1 --quiet
    
    echo    [2/15] Uvicorn...
    pip install uvicorn[standard]==0.24.0 --quiet
    
    echo    [3/15] Pydantic...
    pip install pydantic==2.5.0 --quiet
    
    echo    [4/15] Python Multipart...
    pip install python-multipart==0.0.6 --quiet
    
    echo    [5/15] OpenCV...
    pip install opencv-python==4.8.1.78 --quiet
    
    echo    [6/15] MediaPipe...
    pip install mediapipe==0.10.8 --quiet
    
    echo    [7/15] NumPy...
    pip install numpy==1.24.3 --quiet
    
    echo    [8/15] Firebase Admin...
    pip install firebase-admin==6.3.0 --quiet
    
    echo    [9/15] WebSockets...
    pip install websockets==12.0 --quiet
    
    echo    [10/15] Python Jose...
    pip install python-jose[cryptography]==3.3.0 --quiet
    
    echo    [11/15] Python Dotenv...
    pip install python-dotenv==1.0.0 --quiet
    
    echo    [12/15] Pillow...
    pip install Pillow==10.1.0 --quiet
    
    echo    [13/15] Aiofiles...
    pip install aiofiles==23.2.1 --quiet
    
    echo    [14/15] PyRealSense2 (opzionale - può fallire se no SDK)...
    pip install pyrealsense2==2.54.2.5684 --quiet
    if %errorlevel% neq 0 (
        echo       ⚠️  PyRealSense2 non installato - verrà usata modalità MOCK
    )
    
    echo    [15/15] Email Validator...
    pip install email-validator==2.1.0 --quiet
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ Errore durante installazione pacchetti!
    echo Controlla i messaggi di errore sopra
    pause
    exit /b 1
)

echo.
echo ✅ Backend Python configurato correttamente!
echo.

REM Torna alla root
cd "%ROOT_DIR%"

REM ==================== SETUP FRONTEND ====================
echo.
echo ╔════════════════════════════════════════╗
echo ║     ⚛️  SETUP FRONTEND REACT           ║
echo ╚════════════════════════════════════════╝
echo.

cd "%ROOT_DIR%\frontend"

REM Verifica package.json
if not exist "package.json" (
    echo ❌ File package.json non trovato!
    echo Crea prima il progetto React con: npm create vite@latest
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo 📦 Installazione dipendenze React...
    echo    Questo può richiedere alcuni minuti...
    npm install
    if %errorlevel% neq 0 (
        echo.
        echo ❌ Errore npm install!
        echo Prova:
        echo 1. Cancella cartella node_modules se esiste
        echo 2. Cancella file package-lock.json se esiste
        echo 3. Riavvia questo script
        pause
        exit /b 1
    )
) else (
    echo ✅ Dipendenze React già installate
    echo    Verifico aggiornamenti...
    npm update --quiet
)

echo.
echo ✅ Frontend React configurato correttamente!
echo.

REM Torna alla root
cd "%ROOT_DIR%"

REM ==================== VERIFICA FIREBASE ====================
echo.
echo 🔥 Controllo configurazione Firebase...

if not exist "backend\firebase-credentials.json" (
    echo.
    echo ⚠️  FILE FIREBASE CREDENTIALS MANCANTE!
    echo.
    echo IMPORTANTE: Per usare Firebase devi:
    echo 1. Andare su https://console.firebase.google.com
    echo 2. Creare un progetto
    echo 3. Andare in Project Settings ^> Service Accounts
    echo 4. Cliccare "Generate New Private Key"
    echo 5. Salvare il file come: backend\firebase-credentials.json
    echo.
    echo 📝 Il sistema funzionerà comunque in modalità DEMO
    echo    ma non salverà dati su Firebase
    echo.
    pause
) else (
    echo ✅ Firebase credentials trovate!
)

echo.

REM ==================== AVVIO SISTEMA ====================
echo.
echo ╔════════════════════════════════════════╗
echo ║     🚀 AVVIO SISTEMA PHYSIOAI          ║
echo ╚════════════════════════════════════════╝
echo.

echo 📤 Avvio Backend (porta 8000)...
cd "%ROOT_DIR%\backend"

REM Avvia backend in nuova finestra
start "PhysioAI Backend" cmd /k "title PhysioAI Backend && color 0A && echo. && echo ╔════════════════════════════════════════╗ && echo ║   🐍 BACKEND SERVER PHYSIOAI           ║ && echo ╚════════════════════════════════════════╝ && echo. && echo 🌐 API: http://localhost:8000 && echo 📖 Docs: http://localhost:8000/docs && echo. && echo ⚠️  NON CHIUDERE QUESTA FINESTRA! && echo 🛑 Premi Ctrl+C per fermare && echo. && call venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo ⏳ Attesa avvio backend (8 secondi)...
timeout /t 8 /nobreak >nul

echo.
echo 📤 Avvio Frontend (porta 5173)...
cd "%ROOT_DIR%\frontend"

REM Avvia frontend in nuova finestra
start "PhysioAI Frontend" cmd /k "title PhysioAI Frontend && color 0B && echo. && echo ╔════════════════════════════════════════╗ && echo ║   ⚛️  FRONTEND SERVER PHYSIOAI         ║ && echo ╚════════════════════════════════════════╝ && echo. && echo 🌐 App: http://localhost:5173 && echo. && echo ⚠️  NON CHIUDERE QUESTA FINESTRA! && echo 🛑 Premi Ctrl+C per fermare && echo. && npm run dev"

echo ⏳ Attesa avvio frontend (6 secondi)...
timeout /t 6 /nobreak >nul

echo.
echo 🌐 Apertura browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

REM Torna alla root
cd "%ROOT_DIR%"

echo.
echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                    🎉 PHYSIOAI ONLINE! 🎉                          ║
echo ║                                                                    ║
echo ║  🌐 App:  http://localhost:5173                                    ║
echo ║  🔧 API:  http://localhost:8000                                    ║
echo ║  📖 Docs: http://localhost:8000/docs                              ║
echo ║                                                                    ║
echo ║  📧 Login: fisioterapista@test.com                                ║
echo ║  🔑 Pass:  Test123!                                                ║
echo ║                                                                    ║
echo ║  ⚠️  Camera RealSense non rilevata? Nessun problema!               ║
echo ║     Il sistema funziona in modalità MOCK con dati simulati        ║
echo ║                                                                    ║
echo ║  ⚠️  NON CHIUDERE le finestre server!                               ║
echo ║     Per fermare: Ctrl+C nelle finestre server                     ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.
echo ✅ Setup completato con successo!
echo.
echo 📋 Note:
echo    - Backend gira su porta 8000
echo    - Frontend gira su porta 5173 (Vite default)
echo    - Camera mock attiva se RealSense non disponibile
echo.
echo 🔄 Per riavviare: esegui di nuovo questo file BAT
echo 🛑 Per fermare: Ctrl+C nelle finestre server
echo.
echo Il browser dovrebbe aprirsi automaticamente!
echo Se non si apre, vai su: http://localhost:5173
echo.
pause