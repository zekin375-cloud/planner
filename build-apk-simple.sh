#!/bin/bash

echo "===================================="
echo "Сборка APK без Android Studio"
echo "===================================="
echo ""

# Проверка Node.js
echo "[1/6] Проверка Node.js..."
if ! command -v node &> /dev/null; then
    echo "ОШИБКА: Node.js не установлен!"
    echo "Установите Node.js с https://nodejs.org/"
    exit 1
fi

# Проверка Java
echo "[2/6] Проверка Java..."
if ! command -v java &> /dev/null; then
    echo "ОШИБКА: Java не установлен!"
    echo "Установите Java JDK 11 или выше"
    exit 1
fi

# Установка зависимостей
echo "[3/6] Установка зависимостей Node.js..."
npm install
if [ $? -ne 0 ]; then
    echo "ОШИБКА: Не удалось установить зависимости"
    exit 1
fi

# Сборка проекта
echo "[4/6] Сборка проекта..."
npm run build
if [ $? -ne 0 ]; then
    echo "ОШИБКА: Не удалось собрать проект"
    exit 1
fi

# Добавление Android платформы
echo "[5/6] Настройка Android платформы..."
if [ ! -d "android" ]; then
    npx cap add android
fi

# Синхронизация
npx cap sync

# Проверка Android SDK
echo "[6/6] Проверка Android SDK..."
if [ -z "$ANDROID_HOME" ]; then
    echo ""
    echo "===================================="
    echo "ВНИМАНИЕ: ANDROID_HOME не установлен!"
    echo "===================================="
    echo ""
    echo "Для сборки APK нужен Android SDK."
    echo ""
    echo "Варианты:"
    echo "1. Использовать GitHub Actions (см. .github/workflows/build-apk.yml)"
    echo "2. Установить Android SDK Command Line Tools"
    echo ""
    echo "Установка Android SDK:"
    echo "1. Скачайте: https://developer.android.com/studio#command-tools"
    echo "2. Распакуйте в папку (например ~/Android/sdk)"
    echo "3. export ANDROID_HOME=~/Android/sdk"
    echo "4. export PATH=\$PATH:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/tools/bin"
    echo ""
    exit 1
fi

# Сборка APK
echo ""
echo "===================================="
echo "Сборка APK..."
echo "===================================="
echo ""

cd android
./gradlew assembleDebug
if [ $? -ne 0 ]; then
    echo ""
    echo "ОШИБКА: Не удалось собрать APK"
    echo "Проверьте, что Android SDK установлен правильно"
    cd ..
    exit 1
fi

cd ..

echo ""
echo "===================================="
echo "Готово! APK собран!"
echo "===================================="
echo ""
echo "APK находится в:"
echo "android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "Для установки на устройство:"
echo "adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo ""


