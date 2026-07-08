@echo off
chcp 65001 >nul
title RestoCanvas — Запуск

echo.
echo  ╔══════════════════════════════════════╗
echo  ║     RestoCanvas — Система бронирования    ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Проверяем наличие .next (собранный билд)
if not exist ".next" (
    echo  [!] Сборка не найдена. Запускаем сборку...
    call npm run next:build
    if errorlevel 1 (
        echo  [ОШИБКА] Сборка провалилась. Проверьте Node.js и npm.
        pause
        exit /b 1
    )
)

echo  [OK] Запускаем сервер на порту 3000...
echo.

:: Определяем IP компьютера для отображения сетевого адреса
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

echo  ┌─────────────────────────────────────────┐
echo  │  Локально:  http://localhost:3000/restaurant
echo  │  По сети:   http://%LOCAL_IP%:3000/restaurant
echo  └─────────────────────────────────────────┘
echo.
echo  Нажмите Ctrl+C для остановки сервера.
echo.

:: Открываем браузер через 2 секунды
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000/restaurant"

:: Запускаем сервер (доступен по сети для телефонов)
call npm run start:lan

pause
