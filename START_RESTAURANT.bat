@echo off
chcp 65001 >nul
title RestoCanvas - Запуск сервера

echo ==============================================
echo       RestoCanvas - Запуск ресторана
echo ==============================================
echo.

cd /d "%~dp0"

:: Проверяем наличие node_modules. Если их нет, запускаем установку.
if exist "node_modules" goto :has_deps
echo [!] Папка node_modules не найдена. Устанавливаем зависимости...
call npm install
if errorlevel 1 goto :install_failed

:has_deps
:: Проверяем наличие сборки .next
if exist ".next" goto :has_build
echo [!] Сборка не найдена. Запускаем сборку проекта...
call npm run next:build
if errorlevel 1 goto :build_failed

:has_build
echo [OK] Сборка проверена. Запускаем сервер...
echo.

:: Попытка определить локальный IP для работы с телефонов
set LOCAL_IP=localhost
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
:: Удаляем лишние пробелы из IP-адреса
set LOCAL_IP=%LOCAL_IP: =%

echo ----------------------------------------------
echo   Приложение доступно по адресам:
echo   Локально: http://localhost:3000
echo   В сети:   http://%LOCAL_IP%:3000
echo ----------------------------------------------
echo.

:: Автоматически открываем браузер через 2 секунды после запуска
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Запуск Next.js сервера на сетевом интерфейсе
call npm run start:lan
goto :eof

:install_failed
echo [ОШИБКА] Не удалось установить зависимости (npm install). Убедитесь, что NodeJS установлен.
pause
exit /b 1

:build_failed
echo [ОШИБКА] Сборка проекта (next build) завершилась с ошибкой.
pause
exit /b 1
