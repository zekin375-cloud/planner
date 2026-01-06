// Настройки сервера для мобильного приложения

import { setApiServerUrl, getApiBaseUrl } from './config.js';

// Показать модальное окно настроек сервера
export function showServerSettings() {
    const modal = document.getElementById('serverSettingsModal');
    if (!modal) {
        createServerSettingsModal();
    }
    
    const modalElement = document.getElementById('serverSettingsModal');
    const input = document.getElementById('serverUrlInput');
    
    if (modalElement && input) {
        // Заполняем текущий URL
        input.value = getApiBaseUrl();
        modalElement.classList.add('show');
        input.focus();
    }
}

// Создание модального окна настроек
function createServerSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'serverSettingsModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>⚙️ Настройки сервера</h3>
                <button class="modal-close" id="closeServerSettingsModal">&times;</button>
            </div>
            <div class="modal-body">
                <p class="pincode-description">
                    Введите IP адрес и порт сервера, на котором запущен Flask.
                    <br>Например: http://192.168.1.100:5000
                </p>
                <div class="form-group">
                    <label>URL сервера</label>
                    <input 
                        type="text" 
                        id="serverUrlInput" 
                        class="modal-input" 
                        placeholder="http://192.168.1.100:5000"
                        autocomplete="off"
                    >
                    <div class="pincode-error" id="serverUrlError" style="display: none;"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" id="cancelServerSettingsBtn">Отмена</button>
                <button class="btn-primary" id="saveServerSettingsBtn">Сохранить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики событий
    document.getElementById('closeServerSettingsModal').addEventListener('click', hideServerSettings);
    document.getElementById('cancelServerSettingsBtn').addEventListener('click', hideServerSettings);
    document.getElementById('saveServerSettingsBtn').addEventListener('click', saveServerSettings);
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'serverSettingsModal') {
            hideServerSettings();
        }
    });
    
    // Enter для сохранения
    document.getElementById('serverUrlInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveServerSettings();
        }
    });
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


