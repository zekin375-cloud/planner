@echo off
chcp 65001 >nul
echo ====================================
echo Загрузка проекта на GitHub
echo ====================================
echo.

REM Проверка Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo ОШИБКА: Git не установлен!
    echo Установите Git с https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [1/4] Инициализация Git...
if not exist ".git" (
    git init
    echo ✓ Git инициализирован
) else (
    echo ✓ Git уже инициализирован
)

echo.
echo [2/4] Добавление файлов...
git add .
echo ✓ Файлы добавлены

echo.
echo [3/4] Создание коммита...
git commit -m "Initial commit: Planner app with Android build"
if %errorlevel% neq 0 (
    echo.
    echo ВНИМАНИЕ: Возможно, нет изменений для коммита
    echo Или Git не настроен (имя/email)
    echo.
    echo Настройте Git:
    git config --global user.name "Ваше Имя"
    git config --global user.email "ваш@email.com"
    echo.
    echo Затем запустите этот скрипт снова
    pause
    exit /b 1
)
echo ✓ Коммит создан

echo.
echo ====================================
echo [4/4] Добавление удаленного репозитория
echo ====================================
echo.
echo ВАЖНО: Сначала создайте репозиторий на GitHub!
echo.
echo 1. Откройте https://github.com
echo 2. Нажмите "+" → "New repository"
echo 3. Название: planner-app (или любое другое)
echo 4. НЕ добавляйте README, .gitignore, лицензию
echo 5. Нажмите "Create repository"
echo.
echo После создания репозитория введите URL:
echo Пример: https://github.com/ваш-username/planner-app.git
echo.
set /p REPO_URL="Введите URL репозитория: "

if "%REPO_URL%"=="" (
    echo ОШИБКА: URL не введен!
    pause
    exit /b 1
)

echo.
echo Добавление удаленного репозитория...
git remote add origin %REPO_URL% 2>nul
if %errorlevel% neq 0 (
    echo Попытка обновить существующий remote...
    git remote set-url origin %REPO_URL%
)

echo.
echo Создание ветки main...
git branch -M main

echo.
echo ====================================
echo Загрузка на GitHub...
echo ====================================
echo.
echo Если GitHub попросит авторизацию:
echo - Используйте Personal Access Token вместо пароля
echo - Создайте токен: GitHub → Settings → Developer settings → Personal access tokens
echo.
pause

git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo ✓ ГОТОВО! Код загружен на GitHub
    echo ====================================
    echo.
    echo Теперь:
    echo 1. Откройте репозиторий на GitHub
    echo 2. Перейдите в "Actions"
    echo 3. Выберите "Build Android APK"
    echo 4. Нажмите "Run workflow"
    echo.
) else (
    echo.
    echo ====================================
    echo ОШИБКА при загрузке
    echo ====================================
    echo.
    echo Возможные причины:
    echo - Неправильный URL репозитория
    echo - Проблемы с авторизацией (нужен Personal Access Token)
    echo - Репозиторий не создан на GitHub
    echo.
    echo Попробуйте выполнить вручную:
    echo git push -u origin main
    echo.
)

pause

