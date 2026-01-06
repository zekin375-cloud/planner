// Механизм обновления приложения без пересборки APK

import { apiGet } from './api.js';
import { isCapacitor } from './config.js';

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

// Проверка обновлений
export async function checkForUpdates(showNotification = true) {
    if (!isCapacitor()) {
        // В браузере просто перезагружаем страницу
        return false;
    }
    
    try {
        const serverVersion = await getServerVersion();
        if (!serverVersion) {
            return false;
        }
        
        const localVersion = getLocalVersion();
        const serverVersionStr = serverVersion.version || '1.0.0';
        
        // Сравниваем версии
        if (serverVersionStr !== localVersion) {
            if (showNotification) {
                showUpdateAvailableNotification(serverVersionStr);
            }
            return true;
        }
        
        // Обновляем время последней проверки
        saveLocalVersion(serverVersionStr);
        return false;
    } catch (error) {
        console.error('Ошибка проверки обновлений:', error);
        return false;
    }
}

// Показать уведомление о доступном обновлении
function showUpdateAvailableNotification(version) {
    // Создаем уведомление в UI
    const notification = document.createElement('div');
    notification.id = 'updateNotification';
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-notification-content">
            <div class="update-notification-text">
                <strong>🔄 Доступно обновление</strong>
                <p>Версия ${version} доступна для загрузки</p>
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
        // Очищаем кэш
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }
        
        // Обновляем версию
        const serverVersion = await getServerVersion();
        if (serverVersion) {
            saveLocalVersion(serverVersion.version);
        }
        
        // Перезагружаем страницу с очисткой кэша
        window.location.reload(true);
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

