@echo off
echo ====================================
echo Сборка Android APK
echo ====================================
echo.

echo [1/5] Проверка Node.js...
node --version
if errorlevel 1 (
    echo ОШИБКА: Node.js не установлен!
    echo Установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

echo [2/5] Установка зависимостей...
call npm install
if errorlevel 1 (
    echo ОШИБКА: Не удалось установить зависимости
    pause
    exit /b 1
)

echo [3/5] Копирование файлов...
call npm run build
if errorlevel 1 (
    echo ОШИБКА: Не удалось скопировать файлы
    pause
    exit /b 1
)

echo [4/5] Добавление Android платформы (если нужно)...
if not exist "android" (
    call npx cap add android
)

echo [5/5] Синхронизация с Android...
call npx cap sync

echo.
echo ====================================
echo Готово!
echo ====================================
echo.
echo Следующие шаги:
echo 1. Откройте Android Studio
echo 2. File -^> Open -^> выберите папку android
echo 3. Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
echo.
echo Или выполните: npm run cap:open:android
echo.
pause


