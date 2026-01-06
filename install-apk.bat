@echo off
echo ====================================
echo Установка APK на Android устройство
echo ====================================
echo.

REM Проверка ADB
adb version >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: ADB не найден!
    echo.
    echo Установите Android SDK Platform Tools:
    echo https://developer.android.com/studio/releases/platform-tools
    echo.
    echo Или добавьте ADB в PATH
    echo.
    pause
    exit /b 1
)

REM Проверка подключения устройства
echo Проверка подключения устройства...
adb devices
echo.

REM Поиск APK
set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk

if not exist "%APK_PATH%" (
    echo ОШИБКА: APK не найден!
    echo Путь: %APK_PATH%
    echo.
    echo Сначала соберите APK: build-apk.bat
    echo.
    pause
    exit /b 1
)

echo Установка APK...
adb install -r "%APK_PATH%"

if errorlevel 1 (
    echo.
    echo ОШИБКА: Не удалось установить APK
    echo.
    echo Возможные причины:
    echo 1. Устройство не подключено
    echo 2. Не включена отладка по USB
    echo 3. Не разрешена установка из неизвестных источников
    echo.
    pause
    exit /b 1
)

echo.
echo ====================================
echo APK успешно установлен!
echo ====================================
echo.
pause


