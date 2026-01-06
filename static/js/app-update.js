// Механизм обновления приложения без пересборки APK
//
// ВАЖНО: Обновление работает по-разному в зависимости от конфигурации:
//
// 1. В БРАУЗЕРЕ:
//    - Обновление работает через очистку кэша и перезагрузку страницы
//    - Новый контент загружается с сервера автоматически
//
// 2. В CAPACITOR ПРИЛОЖЕНИИ:
//    - Если контент встроен в APK (assets) - обновление НЕВОЗМОЖНО без пересборки APK
//      Простая перезагрузка не поможет, так как WebView загружает из встроенных файлов
//    
//    - Если настроен server.url в capacitor.config.json - контент загружается с сервера
//      и обновление работает через перезагрузку WebView
//
//    РЕШЕНИЕ: Для обновления без пересборки APK нужно:
//    а) Настроить server.url в capacitor.config.json на адрес вашего сервера
//    б) Убедиться, что сервер доступен с устройства
//    в) Использовать эту функцию для перезагрузки WebView
//
//    Пример конфигурации capacitor.config.json:
//    {
//      "server": {
//        "url": "http://192.168.1.100:5000",
//        "androidScheme": "https"
//      }
//    }

import { apiGet } from './api.js';
import { isCapacitor } from './config.js';

// Импортируем Capacitor App если доступен
let CapacitorApp = null;
if (isCapacitor() && window.Capacitor && window.Capacitor.Plugins) {
    CapacitorApp = window.Capacitor.Plugins.App;
}

let currentVersion = '1.0.0';
let updateCheckInterval = null;

// Получить версию приложения с сервера
async function getServerVersion() {
    try {
        const versionInfo = await apiGet('api/app-version');
        return versionInfo;
    } catch (error) {
        console.error('Ошибка получения версии с сервера:', error);
        return null;
    }
}

// Сохранить версию в localStorage
function saveLocalVersion(version) {
    localStorage.setItem('app_version', version);
    localStorage.setItem('app_version_check_time', Date.now().toString());
}

// Получить сохраненную версию
function getLocalVersion() {
    return localStorage.getItem('app_version') || '1.0.0';
}

// Показать сообщение пользователю
function showMessage(message, type = 'info') {
    // Удаляем предыдущее сообщение если есть
    const existingMsg = document.getElementById('updateCheckMessage');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.id = 'updateCheckMessage';
    messageDiv.className = 'update-check-message';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : 'var(--bg-secondary)'};
        color: ${type === 'error' || type === 'success' ? 'white' : 'var(--text-primary)'};
        border: 2px solid ${type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : 'var(--accent)'};
        border-radius: 12px;
        padding: 16px 24px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        max-width: 90%;
        text-align: center;
        font-size: 14px;
        animation: slideDown 0.3s ease-out;
    `;
    messageDiv.textContent = message;
    
    // Добавляем стили для анимации если их нет
    if (!document.getElementById('updateCheckMessageStyles')) {
        const style = document.createElement('style');
        style.id = 'updateCheckMessageStyles';
        style.textContent = `
            @keyframes slideDown {
                from {
                    transform: translateX(-50%) translateY(-100px);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(messageDiv);
    
    // Автоматически скрываем через 3 секунды
    setTimeout(() => {
        if (messageDiv) {
            messageDiv.style.animation = 'slideDown 0.3s ease-out reverse';
            setTimeout(() => messageDiv.remove(), 300);
        }
    }, 3000);
}

// Проверка обновлений
export async function checkForUpdates(showNotification = true, forceUpdate = false) {
    // Показываем индикатор загрузки
    showMessage('Проверка обновлений...', 'info');
    
    try {
        const serverVersion = await getServerVersion();
        if (!serverVersion) {
            showMessage('Не удалось получить информацию о версии с сервера. Проверьте подключение к серверу.', 'error');
            return false;
        }
        
        const localVersion = getLocalVersion();
        const serverVersionStr = serverVersion.version || '1.0.0';
        
        // Сравниваем версии или принудительно показываем обновление
        if (serverVersionStr !== localVersion || forceUpdate) {
            // Обновляем время последней проверки
            saveLocalVersion(serverVersionStr);
            if (showNotification) {
                // Скрываем сообщение о проверке
                const checkMsg = document.getElementById('updateCheckMessage');
                if (checkMsg) checkMsg.remove();
                showUpdateAvailableNotification(serverVersionStr);
            } else {
                showMessage(`Доступна новая версия: ${serverVersionStr} (текущая: ${localVersion})`, 'info');
            }
            return true;
        }
        
        // Обновляем время последней проверки
        saveLocalVersion(serverVersionStr);
        showMessage(`✓ У вас установлена последняя версия (${serverVersionStr})`, 'success');
        return false;
    } catch (error) {
        console.error('Ошибка проверки обновлений:', error);
        const errorMsg = error.message || 'Неизвестная ошибка';
        showMessage(`Ошибка проверки обновлений: ${errorMsg}`, 'error');
        return false;
    }
}

// Показать уведомление о доступном обновлении
function showUpdateAvailableNotification(version) {
    // Проверяем, встроен ли контент в APK
    const isContentEmbedded = isCapacitor() && 
        (!window.Capacitor?.Plugins?.App?.getState || 
         window.location.protocol === 'file:' ||
         window.location.href.includes('capacitor://'));
    
    // Создаем уведомление в UI
    const notification = document.createElement('div');
    notification.id = 'updateNotification';
    notification.className = 'update-notification';
    
    let warningText = '';
    if (isContentEmbedded) {
        warningText = '<p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">⚠️ Внимание: Контент встроен в APK. Для обновления может потребоваться пересборка приложения.</p>';
    }
    
    notification.innerHTML = `
        <div class="update-notification-content">
            <div class="update-notification-text">
                <strong>🔄 Доступно обновление</strong>
                <p>Версия ${version} доступна для загрузки</p>
                ${warningText}
            </div>
            <div class="update-notification-actions">
                <button class="btn-update-now" id="updateNowBtn">Обновить сейчас</button>
                <button class="btn-update-later" id="updateLaterBtn">Позже</button>
            </div>
        </div>
    `;
    
    // Добавляем стили если их нет
    if (!document.getElementById('updateNotificationStyles')) {
        const style = document.createElement('style');
        style.id = 'updateNotificationStyles';
        style.textContent = `
            .update-notification {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--bg-secondary);
                border: 2px solid var(--accent);
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                max-width: 90%;
                animation: slideUp 0.3s ease-out;
            }
            
            @keyframes slideUp {
                from {
                    transform: translateX(-50%) translateY(100px);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            
            .update-notification-content {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .update-notification-text {
                color: var(--text-primary);
            }
            
            .update-notification-text strong {
                color: var(--accent);
                font-size: 16px;
            }
            
            .update-notification-text p {
                margin: 4px 0 0 0;
                font-size: 14px;
                color: var(--text-secondary);
            }
            
            .update-notification-actions {
                display: flex;
                gap: 8px;
            }
            
            .btn-update-now,
            .btn-update-later {
                flex: 1;
                padding: 10px 16px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-update-now {
                background: var(--accent);
                color: white;
            }
            
            .btn-update-now:hover {
                background: var(--accent-hover);
            }
            
            .btn-update-later {
                background: var(--bg-tertiary);
                color: var(--text-primary);
                border: 1px solid var(--border);
            }
            
            .btn-update-later:hover {
                background: var(--bg-hover);
            }
            
            @media (max-width: 768px) {
                .update-notification {
                    bottom: 10px;
                    left: 10px;
                    right: 10px;
                    max-width: none;
                    transform: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Обработчики кнопок
    document.getElementById('updateNowBtn').addEventListener('click', () => {
        updateApp();
    });
    
    document.getElementById('updateLaterBtn').addEventListener('click', () => {
        hideUpdateNotification();
    });
}

// Скрыть уведомление об обновлении
function hideUpdateNotification() {
    const notification = document.getElementById('updateNotification');
    if (notification) {
        notification.style.animation = 'slideUp 0.3s ease-out reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}

// Обновить приложение
export async function updateApp() {
    hideUpdateNotification();
    
    // Показываем индикатор загрузки
    showUpdateProgress();
    
    try {
        // Получаем версию с сервера
        const serverVersion = await getServerVersion();
        if (serverVersion) {
            saveLocalVersion(serverVersion.version);
        }
        
        // Очищаем кэш Service Worker если есть
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            } catch (e) {
                console.warn('Ошибка при отключении Service Worker:', e);
            }
        }
        
        // Очищаем все кэши
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }
        
        // Небольшая задержка для завершения очистки кэша
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ВАЖНО: В Capacitor приложениях обновление работает по-разному:
        // 1. Если контент встроен в APK (assets) - обновление невозможно без пересборки APK
        // 2. Если настроен server.url в capacitor.config.json - контент загружается с сервера
        //    и обновление работает через перезагрузку
        
        // Пытаемся использовать Capacitor App API для перезагрузки
        if (isCapacitor() && CapacitorApp) {
            try {
                // Capacitor App.reload() перезагружает WebView
                // Если контент загружается с сервера, это загрузит новую версию
                if (CapacitorApp.reload) {
                    await CapacitorApp.reload();
                    return;
                }
            } catch (error) {
                console.warn('Ошибка при использовании Capacitor App.reload():', error);
            }
        }
        
        // Альтернативный способ для Capacitor - принудительная перезагрузка WebView
        if (isCapacitor()) {
            // В Capacitor приложениях:
            // - Если контент встроен в APK: перезагрузка не поможет, нужна пересборка
            // - Если настроен server.url: перезагрузка загрузит новую версию с сервера
            // Пытаемся принудительно перезагрузить с очисткой кэша
            try {
                // Очищаем кэш WebView через Capacitor API если доступен
                if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                    // Принудительная перезагрузка с timestamp для обхода кэша
                    const timestamp = Date.now();
                    const currentUrl = window.location.href.split('?')[0];
                    const url = new URL(currentUrl, window.location.origin);
                    url.searchParams.set('_update', timestamp.toString());
                    url.searchParams.set('_nocache', timestamp.toString());
                    
                    // Используем replace для избежания истории
                    window.location.replace(url.toString());
                } else {
                    // Простая перезагрузка
                    window.location.reload();
                }
            } catch (error) {
                console.warn('Ошибка перезагрузки в Capacitor:', error);
                window.location.reload();
            }
        } else {
            // В браузере используем URL с параметрами для обхода кэша
            const timestamp = Date.now();
            const currentUrl = window.location.href.split('?')[0];
            const url = new URL(currentUrl, window.location.origin);
            url.searchParams.set('_update', timestamp.toString());
            url.searchParams.set('_nocache', timestamp.toString());
            
            if (window.location.replace) {
                window.location.replace(url.toString());
            } else {
                window.location.href = url.toString();
            }
        }
    } catch (error) {
        console.error('Ошибка обновления приложения:', error);
        hideUpdateProgress();
        alert('Ошибка обновления приложения. Попробуйте перезагрузить вручную.');
    }
}

// Показать прогресс обновления
function showUpdateProgress() {
    const progress = document.createElement('div');
    progress.id = 'updateProgress';
    progress.className = 'update-progress';
    progress.innerHTML = `
        <div class="update-progress-content">
            <div class="update-progress-spinner"></div>
            <p>Обновление приложения...</p>
        </div>
    `;
    
    if (!document.getElementById('updateProgressStyles')) {
        const style = document.createElement('style');
        style.id = 'updateProgressStyles';
        style.textContent = `
            .update-progress {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            }
            
            .update-progress-content {
                text-align: center;
                color: var(--text-primary);
            }
            
            .update-progress-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid var(--bg-tertiary);
                border-top-color: var(--accent);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 16px;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(progress);
}

// Скрыть прогресс обновления
function hideUpdateProgress() {
    const progress = document.getElementById('updateProgress');
    if (progress) {
        progress.remove();
    }
}

// Автоматическая проверка обновлений
export function startAutoUpdateCheck(intervalMinutes = 30) {
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
    }
    
    // Проверяем сразу при запуске
    checkForUpdates(true);
    
    // Затем проверяем каждые N минут
    updateCheckInterval = setInterval(() => {
        checkForUpdates(true);
    }, intervalMinutes * 60 * 1000);
}

// Остановить автоматическую проверку
export function stopAutoUpdateCheck() {
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = null;
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // В Capacitor приложении запускаем автоматическую проверку
    if (isCapacitor()) {
        startAutoUpdateCheck(30); // Проверяем каждые 30 минут
    }
});

