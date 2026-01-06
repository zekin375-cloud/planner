# Инструкция по сборке APK для Android

## Предварительные требования

1. **Node.js** (версия 16 или выше)
   - Скачать: https://nodejs.org/

2. **Android Studio**
   - Скачать: https://developer.android.com/studio
   - Установить Android SDK (API Level 33 или выше)

3. **Java JDK** (версия 11 или выше)
   - Обычно устанавливается вместе с Android Studio

4. **Python** (версия 3.8 или выше)
   - Уже должен быть установлен для Flask

## Шаги по сборке

### 1. Установка зависимостей Node.js

```bash
npm install
```

### 2. Копирование файлов в dist

```bash
npm run build
```

### 3. Инициализация Capacitor (если еще не сделано)

```bash
npm run cap:add:android
```

### 4. Синхронизация с Android проектом

```bash
npm run cap:sync
```

### 5. Открытие проекта в Android Studio

```bash
npm run cap:open:android
```

### 6. Настройка в Android Studio

1. В Android Studio откройте проект из папки `android/`
2. Дождитесь синхронизации Gradle
3. Убедитесь, что установлен Android SDK Platform 33 или выше

### 7. Настройка Python для Android

Для запуска Flask на Android нужно использовать Chaquopy или BeeWare. 

**Вариант 1: Использовать Chaquopy (рекомендуется)**

1. Добавьте в `android/app/build.gradle`:

```gradle
plugins {
    id 'com.chaquo.python' version '15.0.1'
}

android {
    ...
    defaultConfig {
        ...
        python {
            pip {
                install "flask==3.0.0"
            }
        }
    }
}
```

2. Создайте Java класс для запуска Flask сервера

**Вариант 2: Упрощенный подход - использовать WebView с локальными файлами**

Измените `MainActivity.java` чтобы загружать локальные HTML файлы вместо Flask сервера.

### 8. Сборка APK

1. В Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Или через командную строку:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
3. APK будет в `android/app/build/outputs/apk/debug/app-debug.apk`

### 9. Установка на устройство

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Альтернативный подход: PWA в TWA

Если Flask сервер сложно запустить на Android, можно:

1. Создать PWA версию приложения
2. Использовать TWA (Trusted Web Activity) для упаковки в APK
3. Запускать Flask на сервере и подключаться к нему

## Примечания

- Flask приложение должно работать локально на устройстве
- База данных SQLite будет храниться в папке приложения
- Для продакшн сборки используйте `assembleRelease` вместо `assembleDebug`


