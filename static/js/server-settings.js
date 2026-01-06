// Настройки сервера для мобильного приложения

import { setApiServerUrl, getApiBaseUrl } from './config.js';

// Показать модальное окно настроек сервера
export function showServerSettings() {
    const modal = document.getElementById('serverSettingsModal');
    const input = document.getElementById('serverUrlInput');
    
    if (modal && input) {
        // Заполняем текущий URL
        input.value = getApiBaseUrl() || '';
        modal.classList.add('show');
        input.focus();
    } else {
        console.error('Модальное окно настроек сервера не найдено');
    }
}

// Скрыть модальное окно настроек
export function hideServerSettings() {
    const modal = document.getElementById('serverSettingsModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Сохранение настроек сервера
function saveServerSettings() {
    const input = document.getElementById('serverUrlInput');
    const errorMsg = document.getElementById('serverUrlError');
    
    if (!input) return;
    
    const url = input.value.trim();
    
    // Валидация URL
    if (!url) {
        if (errorMsg) {
            errorMsg.textContent = 'Введите URL сервера';
            errorMsg.style.display = 'block';
        }
        return;
    }
    
    try {
        new URL(url); // Проверка валидности URL
    } catch (e) {
        if (errorMsg) {
            errorMsg.textContent = 'Неверный формат URL';
            errorMsg.style.display = 'block';
        }
        return;
    }
    
    // Сохраняем URL
    setApiServerUrl(url);
    
    // Скрываем ошибку
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
    
    // Закрываем модальное окно
    hideServerSettings();
    
    // Перезагружаем страницу для применения настроек
    window.location.reload();
}

// Инициализация обработчиков событий
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeServerSettingsModal');
    const cancelBtn = document.getElementById('cancelServerSettingsBtn');
    const saveBtn = document.getElementById('saveServerSettingsBtn');
    const modal = document.getElementById('serverSettingsModal');
    const input = document.getElementById('serverUrlInput');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', hideServerSettings);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideServerSettings);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveServerSettings);
    }
    
    // Закрытие по клику вне модального окна
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'serverSettingsModal') {
                hideServerSettings();
            }
        });
    }
    
    // Enter для сохранения
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveServerSettings();
            }
        });
    }
});
