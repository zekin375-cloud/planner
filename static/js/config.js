// Конфигурация API сервера

// Определяем базовый URL для API запросов
// В браузере используем текущий origin, в приложении - из конфига
let API_BASE_URL = '';

// Проверяем, запущено ли в Capacitor приложении
function isCapacitor() {
    return window.Capacitor !== undefined;
}

// Получаем базовый URL для API
export function getApiBaseUrl() {
    if (API_BASE_URL) {
        return API_BASE_URL;
    }
    
    if (isCapacitor()) {
        // В Capacitor приложении используем конфиг или localStorage
        const savedUrl = localStorage.getItem('api_server_url');
        if (savedUrl) {
            API_BASE_URL = savedUrl;
            return API_BASE_URL;
        }
        
        // По умолчанию используем localhost (для разработки)
        // В продакшене нужно будет указать IP сервера
        API_BASE_URL = 'http://localhost:5000';
    } else {
        // В браузере используем текущий origin
        API_BASE_URL = window.location.origin;
    }
    
    return API_BASE_URL;
}

// Установка URL сервера (для настройки в приложении)
export function setApiServerUrl(url) {
    // Убираем слэш в конце если есть
    url = url.replace(/\/$/, '');
    API_BASE_URL = url;
    localStorage.setItem('api_server_url', url);
}

// Получение полного URL для API запроса
export function getApiUrl(path) {
    const baseUrl = getApiBaseUrl();
    // Убираем начальный слэш из path если есть
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/${cleanPath}`;
}

// Инициализация при загрузке
async function initConfig() {
    if (isCapacitor()) {
        // В Capacitor приложении пытаемся получить URL из конфига
        try {
            // Проверяем localStorage сначала
            const savedUrl = localStorage.getItem('api_server_url');
            if (savedUrl) {
                setApiServerUrl(savedUrl);
                return;
            }
            
            // Пытаемся получить информацию о сервере автоматически
            // (работает только если сервер доступен на localhost)
            try {
                const response = await fetch('http://localhost:5000/api/server-info');
                if (response.ok) {
                    const info = await response.json();
                    setApiServerUrl(info.url);
                    console.log('Автоматически определен URL сервера:', info.url);
                }
            } catch (e) {
                // Сервер недоступен, используем localhost по умолчанию
                // Пользователь должен будет настроить URL вручную
                console.warn('Сервер недоступен. Используйте настройки для указания IP адреса сервера.');
                API_BASE_URL = 'http://localhost:5000';
            }
        } catch (error) {
            console.warn('Ошибка инициализации конфига:', error);
            API_BASE_URL = 'http://localhost:5000';
        }
    }
}

// Запускаем инициализацию после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfig);
} else {
    initConfig();
}

