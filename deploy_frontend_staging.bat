@echo off
echo ========================================================
echo FRONTEND DEPLOY: STAGING
echo ========================================================
echo 1. Building shared frontend artifact...
call npm run build
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo.
echo 2. Writing runtime config for staging...
powershell -ExecutionPolicy Bypass -File scripts\write-runtime-config.ps1 -Environment staging -OutputPath dist\runtime-config.js
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo.
echo 3. Deploying to Firebase (Project: staging)...
echo Assicurati di aver aggiunto l'alias: firebase use --add ID_PROGETTO_STAGING --alias staging
echo.
call firebase deploy --only hosting --project staging

pause
