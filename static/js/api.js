// Обертка для API запросов с автоматическим добавлением базового URL

import { getApiUrl } from './config.js';

// Обертка для fetch с автоматическим добавлением базового URL
export async function apiFetch(path, options = {}) {
    const url = getApiUrl(path);
    
    // Добавляем заголовки по умолчанию
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const config = {
        ...options,
        headers: defaultHeaders
    };
    
    try {
        const response = await fetch(url, config);
        
        // Логируем ошибки для отладки
        if (!response.ok) {
            console.error(`API Error (${path}):`, {
                status: response.status,
                statusText: response.statusText,
                url: url
            });
        }
        
        return response;
    } catch (error) {
        console.error(`API Error (${path}):`, {
            error: error,
            message: error.message,
            url: url
        });
        // Улучшаем сообщение об ошибке
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error(`Не удалось подключиться к серверу. Проверьте, что сервер запущен и IP адрес указан правильно.`);
        }
        throw error;
    }
}

// Удобные методы для разных типов запросов
export async function apiGet(path) {
    const response = await apiFetch(path, { method: 'GET' });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function apiPost(path, data) {
    const response = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function apiPut(path, data) {
    const response = await apiFetch(path, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function apiDelete(path) {
    const response = await apiFetch(path, { method: 'DELETE' });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}


