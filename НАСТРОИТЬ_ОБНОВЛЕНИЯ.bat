@echo off
chcp 65001 >nul
echo ========================================
echo Настройка обновлений для Capacitor
echo ========================================
echo.

echo Проверка запущенного сервера...
curl -s http://localhost:5000/api/server-info >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️  Сервер Flask не запущен!
    echo.
    echo Запустите сервер в другом окне:
    echo   python app.py
    echo.
    echo Затем запустите этот скрипт снова.
    pause
    exit /b 1
)

echo ✅ Сервер запущен
echo.
echo Получение IP адреса...

for /f "tokens=*" %%i in ('curl -s http://localhost:5000/api/server-info') do set SERVER_INFO=%%i

echo %SERVER_INFO% | findstr /C:"url" >nul
if errorlevel 1 (
    echo ❌ Не удалось получить IP адрес
    echo.
    echo Настройте вручную:
    echo   1. Откройте capacitor.config.json
    echo   2. Измените server.url на ваш IP адрес
    echo   3. Выполните: npx cap sync
    pause
    exit /b 1
)

echo.
echo ⚠️  Автоматическая настройка через Node.js скрипт...
echo.
node scripts/setup-capacitor-server.js
if errorlevel 1 (
    echo.
    echo ❌ Ошибка автоматической настройки
    echo.
    echo Настройте вручную:
    echo   1. Откройте capacitor.config.json
    echo   2. Измените server.url на ваш IP адрес
    echo      (узнайте IP: http://localhost:5000/api/server-info)
    echo   3. Выполните: npx cap sync
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ Настройка завершена!
echo ========================================
echo.
echo Теперь выполните:
echo   1. npx cap sync
echo   2. npm run android:build
echo.
echo После пересборки APK обновления будут работать!
echo.
pause

