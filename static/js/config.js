// Конфигурация API сервера

// Определяем базовый URL для API запросов
// В браузере используем текущий origin, в приложении - из конфига
let API_BASE_URL = '';

// Проверяем, запущено ли в Capacitor приложении
export function isCapacitor() {
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
        
        // По умолчанию не устанавливаем URL
        // Пользователь должен настроить IP адрес сервера через настройки
        API_BASE_URL = '';
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
    
    // Если URL не настроен, выбрасываем понятную ошибку
    if (!baseUrl) {
        throw new Error('API сервер не настроен. Пожалуйста, укажите IP адрес сервера в настройках приложения.');
    }
    
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
            
            // НЕ пытаемся автоматически подключиться к localhost
            // Пользователь должен настроить URL сервера вручную через настройки
            // Не устанавливаем API_BASE_URL, чтобы приложение показало ошибку
            // и пользователь понял, что нужно настроить сервер
            console.info('URL сервера не настроен. Используйте настройки приложения для указания IP адреса сервера.');
            API_BASE_URL = ''; // Пустой URL - пользователь должен настроить
        } catch (error) {
            console.warn('Ошибка инициализации конфига:', error);
            API_BASE_URL = ''; // Пустой URL
        }
    }
}

// Запускаем инициализацию после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfig);
} else {
    initConfig();
}

