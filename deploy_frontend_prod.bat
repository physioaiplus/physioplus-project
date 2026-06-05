@echo off
echo ========================================================
echo FRONTEND DEPLOY: PRODUCTION
echo ========================================================
echo 1. Building shared frontend artifact...
call npm run build
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo.
echo 2. Writing runtime config for production...
powershell -ExecutionPolicy Bypass -File scripts\write-runtime-config.ps1 -Environment production -OutputPath dist\runtime-config.js
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo.
echo 3. Deploying to Firebase (Project: default/prod)...
call firebase deploy --only hosting --project default

pause
