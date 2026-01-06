@echo off
echo ====================================
echo Запуск сервера для мобильного приложения
echo ====================================
echo.

REM Получаем локальный IP
echo Получение IP адреса...
for /f "tokens=2 delims=:" %%i in ('python get-local-ip.py ^| findstr "URL сервера"') do set SERVER_URL=%%i
python get-local-ip.py
echo.

REM Запускаем Flask сервер
echo ====================================
echo Запуск Flask сервера...
echo ====================================
echo.
echo Сервер будет доступен по адресу:
for /f "tokens=2 delims=:" %%i in ('python get-local-ip.py ^| findstr "URL сервера"') do echo %%i
echo.
echo Для проверки подключения с телефона откройте:
for /f "tokens=2 delims=:" %%i in ('python get-local-ip.py ^| findstr "URL сервера"') do echo %%i/check
echo.
echo Для остановки нажмите Ctrl+C
echo.

python app.py

