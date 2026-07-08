@echo off
title RestoCanvas - Server Startup

echo ==============================================
echo       RestoCanvas - Restaurant Server
echo ==============================================
echo.

cd /d "%~dp0"

:: Check for node_modules folder
if exist "node_modules" goto :has_deps
echo [!] node_modules folder not found. Installing dependencies...
call npm install
if errorlevel 1 goto :install_failed

:has_deps
:: Check for production build
if exist ".next" goto :has_build
echo [!] Production build not found. Building project...
call npm run next:build
if errorlevel 1 goto :build_failed

:has_build
echo [OK] Build verified. Starting server...
echo.

:: Detect and list local IP addresses
echo ----------------------------------------------
echo   Application is running:
echo   Local:   http://localhost:3000
echo.
echo   To connect from phones (on the same Wi-Fi),
echo   open one of these links on your phone:
setlocal enabledelayedexpansion
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set IP_TEMP=%%a
    set IP_TEMP=!IP_TEMP: =!
    echo   - http://!IP_TEMP!:3000
)
endlocal
echo ----------------------------------------------
echo.

:: Open browser automatically after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Run production server
call npm run start:lan
if errorlevel 1 goto :server_failed
echo.
echo [INFO] Server stopped.
pause
goto :eof

:server_failed
echo.
echo [ERROR] Server failed to start or crashed.
echo Please check if port 3000 is already occupied by another server.
echo.
pause
exit /b 1

:install_failed
echo [ERROR] npm install failed. Please make sure Node.js is installed.
pause
exit /b 1

:build_failed
echo [ERROR] next build failed.
pause
exit /b 1
