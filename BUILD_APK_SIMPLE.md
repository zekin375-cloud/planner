# Простая сборка APK без Android Studio

## Вариант 1: Через GitHub Actions (РЕКОМЕНДУЕТСЯ) ⭐

Самый простой способ - использовать GitHub Actions для автоматической сборки.

### Шаги:

1. **Создайте репозиторий на GitHub** (если еще нет)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/ваш-username/planner-app.git
   git push -u origin main
   ```

2. **Файл `.github/workflows/build-apk.yml` уже создан** - он автоматически соберет APK при каждом push

3. **Запустите сборку вручную:**
   - Откройте репозиторий на GitHub
   - Перейдите в "Actions"
   - Выберите "Build Android APK"
   - Нажмите "Run workflow"

4. **Скачайте APK:**
   - После завершения сборки откройте workflow run
   - В разделе "Artifacts" скачайте `app-debug.apk`

5. **Установите на Android:**
   - Перекиньте APK на телефон
   - Включите "Установка из неизвестных источников" в настройках
   - Откройте APK и установите

---

## Вариант 2: Через командную строку (если установлен Android SDK)

### Требования:
- Node.js
- Java JDK 11+
- Android SDK Command Line Tools

### Установка Android SDK:

1. Скачайте Command Line Tools:
   https://developer.android.com/studio#command-tools

2. Распакуйте в папку (например `C:\Android\sdk`)

3. Установите переменные окружения:
   ```cmd
   set ANDROID_HOME=C:\Android\sdk
   set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools\bin
   ```

4. Установите SDK Platform:
   ```cmd
   sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
   ```

5. Запустите сборку:
   ```cmd
   build-apk.bat
   ```

APK будет в: `android\app\build\outputs\apk\debug\app-debug.apk`

---

## Вариант 3: Через PWA Builder (онлайн)

Если приложение работает как PWA, можно использовать PWA Builder:

1. Откройте: https://www.pwabuilder.com/
2. Введите URL вашего приложения (или загрузите файлы)
3. Нажмите "Build My PWA"
4. Выберите "Android"
5. Скачайте APK

**Примечание:** Для этого нужно, чтобы приложение было доступно онлайн или работало локально.

---

## Вариант 4: Использовать готовый APK Builder сервис

### Appetize.io / Capacitor Cloud Build

Можно использовать облачные сервисы для сборки, но они обычно платные.

---

## Установка APK на Android

1. **Перекиньте APK на телефон** (через USB, email, облако)

2. **Включите установку из неизвестных источников:**
   - Настройки → Безопасность → Неизвестные источники
   - Или при установке система предложит разрешить

3. **Откройте APK файл** на телефоне и установите

---

## Быстрая установка через ADB (если подключен телефон)

```cmd
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Рекомендация

**Используйте GitHub Actions** - это самый простой и надежный способ:
- Не нужно устанавливать Android SDK локально
- Автоматическая сборка при изменениях
- Готовый APK для скачивания
- Работает на любом компьютере


