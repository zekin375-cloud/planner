@echo off
echo ====================================
echo Сборка APK без Android Studio
echo ====================================
echo.

REM Проверка Node.js
echo [1/6] Проверка Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Node.js не установлен!
    echo Установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

REM Проверка Java
echo [2/6] Проверка Java...
java -version >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Java не установлен!
    echo Установите Java JDK 11 или выше
    pause
    exit /b 1
)

REM Установка зависимостей
echo [3/6] Установка зависимостей Node.js...
call npm install
if errorlevel 1 (
    echo ОШИБКА: Не удалось установить зависимости
    pause
    exit /b 1
)

REM Сборка проекта
echo [4/6] Сборка проекта...
call npm run build
if errorlevel 1 (
    echo ОШИБКА: Не удалось собрать проект
    pause
    exit /b 1
)

REM Добавление Android платформы
echo [5/6] Настройка Android платформы...
if not exist "android" (
    call npx cap add android
)

REM Синхронизация
call npx cap sync

REM Проверка Android SDK
echo [6/6] Проверка Android SDK...
if not defined ANDROID_HOME (
    echo.
    echo ====================================
    echo ВНИМАНИЕ: ANDROID_HOME не установлен!
    echo ====================================
    echo.
    echo Для сборки APK нужен Android SDK.
    echo.
    echo Варианты:
    echo 1. Установить Android SDK Command Line Tools
    echo 2. Использовать GitHub Actions (см. .github/workflows/build-apk.yml)
    echo 3. Использовать онлайн сервис PWA Builder
    echo.
    echo Установка Android SDK:
    echo 1. Скачайте: https://developer.android.com/studio#command-tools
    echo 2. Распакуйте в папку (например C:\Android\sdk)
    echo 3. Установите переменную ANDROID_HOME=C:\Android\sdk
    echo 4. Добавьте в PATH: %ANDROID_HOME%\platform-tools и %ANDROID_HOME%\tools\bin
    echo.
    pause
    exit /b 1
)

REM Сборка APK
echo.
echo ====================================
echo Сборка APK...
echo ====================================
echo.

cd android
if exist "gradlew.bat" (
    call gradlew.bat assembleDebug
) else if exist "gradlew" (
    call .\gradlew assembleDebug
) else (
    echo ОШИБКА: gradlew не найден!
    echo Убедитесь, что Android платформа добавлена: npm run cap:add:android
    cd ..
    pause
    exit /b 1
)
if errorlevel 1 (
    echo.
    echo ОШИБКА: Не удалось собрать APK
    echo Проверьте, что Android SDK установлен правильно
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo ====================================
echo Готово! APK собран!
echo ====================================
echo.
echo APK находится в:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Для установки на устройство:
echo adb install android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause

