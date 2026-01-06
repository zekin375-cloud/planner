# Скрипт сборки APK для PowerShell

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Сборка APK без Android Studio" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Проверка Node.js
Write-Host "[1/6] Проверка Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js установлен: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ОШИБКА: Node.js не установлен!" -ForegroundColor Red
    Write-Host "Установите Node.js с https://nodejs.org/" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Проверка Java
Write-Host "[2/6] Проверка Java..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "Java установлен" -ForegroundColor Green
} catch {
    Write-Host "ОШИБКА: Java не установлен!" -ForegroundColor Red
    Write-Host "Установите Java JDK 11 или выше" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Установка зависимостей
Write-Host "[3/6] Установка зависимостей Node.js..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА: Не удалось установить зависимости" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Сборка проекта
Write-Host "[4/6] Сборка проекта..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА: Не удалось собрать проект" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Добавление Android платформы
Write-Host "[5/6] Настройка Android платформы..." -ForegroundColor Yellow
if (-not (Test-Path "android")) {
    npx cap add android
}

# Синхронизация
npx cap sync

# Проверка Android SDK
Write-Host "[6/6] Проверка Android SDK..." -ForegroundColor Yellow
if (-not $env:ANDROID_HOME) {
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Yellow
    Write-Host "ВНИМАНИЕ: ANDROID_HOME не установлен!" -ForegroundColor Yellow
    Write-Host "====================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Для сборки APK нужен Android SDK." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Варианты:" -ForegroundColor Cyan
    Write-Host "1. Использовать GitHub Actions (см. .github/workflows/build-apk.yml)" -ForegroundColor White
    Write-Host "2. Установить Android SDK Command Line Tools" -ForegroundColor White
    Write-Host ""
    Write-Host "Установка Android SDK:" -ForegroundColor Cyan
    Write-Host "1. Скачайте: https://developer.android.com/studio#command-tools" -ForegroundColor White
    Write-Host "2. Распакуйте в папку (например C:\Android\sdk)" -ForegroundColor White
    Write-Host "3. Установите переменную: `$env:ANDROID_HOME='C:\Android\sdk'" -ForegroundColor White
    Write-Host "4. Добавьте в PATH: `$env:ANDROID_HOME\platform-tools" -ForegroundColor White
    Write-Host ""
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Сборка APK
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Сборка APK..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

Set-Location android

if (Test-Path "gradlew.bat") {
    .\gradlew.bat assembleDebug
} elseif (Test-Path "gradlew") {
    .\gradlew assembleDebug
} else {
    Write-Host "ОШИБКА: gradlew не найден!" -ForegroundColor Red
    Write-Host "Убедитесь, что Android платформа добавлена: npm run cap:add:android" -ForegroundColor Red
    Set-Location ..
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ОШИБКА: Не удалось собрать APK" -ForegroundColor Red
    Write-Host "Проверьте, что Android SDK установлен правильно" -ForegroundColor Red
    Set-Location ..
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Готово! APK собран!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "APK находится в:" -ForegroundColor Cyan
Write-Host "android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
Write-Host ""
Write-Host "Для установки на устройство:" -ForegroundColor Cyan
Write-Host "adb install android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
Write-Host ""
Read-Host "Нажмите Enter для выхода"


