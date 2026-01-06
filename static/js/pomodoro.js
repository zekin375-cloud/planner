// Система помидоро для рабочего дня с синхронизацией между устройствами

import { apiGet, apiPost } from './api.js';
import { isCapacitor } from './config.js';

let pomodoroInterval = null;
let pomodoroTimeLeft = 25 * 60; // 25 минут в секундах
let pomodoroState = 'idle'; // idle, work, break, paused
let pomodoroWorkCount = 0;
let pomodoroBreakTime = 5 * 60; // 5 минут перерыва
let syncInterval = null; // Интервал синхронизации
let lastSyncTime = 0;

// Проверка, мобильное ли устройство
function isMobile() {
    return window.innerWidth <= 768;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    await restorePomodoroState();
    setupPomodoroListeners();
    updatePomodoroUI(); // Обновляем UI при загрузке
    startSync(); // Начинаем синхронизацию
});

// Синхронизация с сервером
async function syncPomodoroState() {
    try {
        // Получаем состояние с сервера
        const serverState = await apiGet('api/pomodoro/state');
        
        if (serverState && serverState.state !== 'idle') {
            // Если на сервере есть активный таймер, синхронизируемся с ним
            const serverTimeLeft = serverState.timeLeft || 0;
            const serverStateType = serverState.state;
            
            // Если состояние отличается или время сильно отличается, синхронизируемся
            if (serverStateType !== pomodoroState || Math.abs(serverTimeLeft - pomodoroTimeLeft) > 5) {
                pomodoroTimeLeft = serverTimeLeft;
                pomodoroState = serverStateType;
                pomodoroWorkCount = serverState.workCount || 0;
                
                // Если таймер должен работать, но не работает - запускаем
                if ((pomodoroState === 'work' || pomodoroState === 'break') && !pomodoroInterval) {
                    startPomodoroTimer();
                }
                
                updatePomodoroUI();
            }
        }
        
        lastSyncTime = Date.now();
    } catch (error) {
        console.error('Ошибка синхронизации помидоро:', error);
    }
}

// Сохранение состояния на сервер
async function savePomodoroStateToServer() {
    try {
        await apiPost('api/pomodoro/state', {
            timeLeft: pomodoroTimeLeft,
            state: pomodoroState,
            workCount: pomodoroWorkCount,
            startTime: Date.now()
        });
    } catch (error) {
        console.error('Ошибка сохранения состояния помидоро на сервер:', error);
    }
}

// Запуск синхронизации
function startSync() {
    // Синхронизируемся каждые 5 секунд
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    syncInterval = setInterval(() => {
        syncPomodoroState();
    }, 5000);
    
    // Первая синхронизация сразу
    syncPomodoroState();
}

// Остановка синхронизации
function stopSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// Настройка обработчиков событий
function setupPomodoroListeners() {
    const startBtn = document.getElementById('startWorkdayBtn');
    const pauseBtn = document.getElementById('pausePomodoroBtn');
    const stopBtn = document.getElementById('stopPomodoroBtn');
    const pauseBtnMobile = document.getElementById('pausePomodoroBtnMobile');
    const stopBtnMobile = document.getElementById('stopPomodoroBtnMobile');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userPopup = document.getElementById('userPopup');
    
    if (startBtn) {
        startBtn.addEventListener('click', toggleWorkday);
    }
    
    if (pauseBtn) {
        pauseBtn.addEventListener('click', pausePomodoro);
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopPomodoro);
    }
    
    // Мобильные кнопки
    if (pauseBtnMobile) {
        pauseBtnMobile.addEventListener('click', pausePomodoro);
    }
    
    if (stopBtnMobile) {
        stopBtnMobile.addEventListener('click', stopPomodoro);
    }
    
    // Обработчик меню пользователя перенесен в main.js для избежания конфликтов
}

// Восстановление состояния помидоро
async function restorePomodoroState() {
    // Сначала пытаемся загрузить с сервера
    try {
        await syncPomodoroState();
    } catch (error) {
        console.warn('Не удалось загрузить состояние с сервера, используем localStorage:', error);
        // Если не удалось загрузить с сервера, используем localStorage
        const saved = localStorage.getItem('pomodoroState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                pomodoroTimeLeft = state.timeLeft || 25 * 60;
                pomodoroState = state.state || 'idle';
                pomodoroWorkCount = state.workCount || 0;
                
                if (pomodoroState === 'work' || pomodoroState === 'break') {
                    // Проверяем, не истекло ли время
                    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
                    pomodoroTimeLeft = Math.max(0, pomodoroTimeLeft - elapsed);
                    
                    if (pomodoroTimeLeft <= 0) {
                        // Время истекло
                        if (pomodoroState === 'work') {
                            completeWorkSession();
                        } else {
                            completeBreakSession();
                        }
                    } else {
                        // Продолжаем таймер
                        startPomodoroTimer();
                        updatePomodoroUI();
                    }
                }
            } catch (error) {
                console.error('Ошибка восстановления состояния помидоро:', error);
            }
        }
    }
}

// Сохранение состояния помидоро
function savePomodoroState() {
    const state = {
        timeLeft: pomodoroTimeLeft,
        state: pomodoroState,
        workCount: pomodoroWorkCount,
        startTime: Date.now()
    };
    localStorage.setItem('pomodoroState', JSON.stringify(state));
    // Также сохраняем на сервер
    savePomodoroStateToServer();
}

// Начать/остановить рабочий день
function toggleWorkday() {
    if (pomodoroState === 'idle') {
        startWorkSession();
    } else {
        stopPomodoro();
    }
}

// Начать рабочий сеанс (25 минут)
function startWorkSession() {
    pomodoroState = 'work';
    pomodoroTimeLeft = 25 * 60;
    pomodoroWorkCount++;
    
    startPomodoroTimer();
    updatePomodoroUI();
    savePomodoroState();
}

// Завершить рабочий сеанс
function completeWorkSession() {
    stopPomodoroTimer();
    pomodoroState = 'break';
    pomodoroTimeLeft = pomodoroBreakTime;
    
    // Уведомление
    showNotification('Помидор завершен!', 'Время для перерыва (5 минут)');
    
    startPomodoroTimer();
    updatePomodoroUI();
    savePomodoroState();
}

// Завершить перерыв
function completeBreakSession() {
    stopPomodoroTimer();
    
    // Уведомление
    showNotification('Перерыв завершен!', 'Время вернуться к работе');
    
    // Автоматически начинаем новый рабочий сеанс
    startWorkSession();
}

// Показать уведомление
async function showNotification(title, body) {
    // Проверяем, есть ли Capacitor для мобильных уведомлений
    if (isCapacitor() && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        try {
            const { LocalNotifications } = window.Capacitor.Plugins;
            await LocalNotifications.schedule({
                notifications: [{
                    title: title,
                    body: body,
                    id: Date.now(),
                    sound: 'default',
                    attachments: undefined,
                    actionTypeId: '',
                    extra: null
                }]
            });
        } catch (error) {
            console.error('Ошибка показа уведомления через Capacitor:', error);
            // Fallback на браузерные уведомления
            showBrowserNotification(title, body);
        }
    } else {
        // Используем браузерные уведомления
        showBrowserNotification(title, body);
    }
}

// Браузерные уведомления
function showBrowserNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '🍅'
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, {
                    body: body,
                    icon: '🍅'
                });
            }
        });
    }
}

// Пауза помидоро
function pausePomodoro() {
    if (pomodoroState === 'work' || pomodoroState === 'break') {
        stopPomodoroTimer();
        pomodoroState = 'paused';
        updatePomodoroUI();
        savePomodoroState();
    } else if (pomodoroState === 'paused') {
        pomodoroState = pomodoroWorkCount > 0 && pomodoroTimeLeft === pomodoroBreakTime ? 'break' : 'work';
        startPomodoroTimer();
        updatePomodoroUI();
        savePomodoroState();
    }
}

// Остановить помидоро
function stopPomodoro() {
    stopPomodoroTimer();
    pomodoroState = 'idle';
    pomodoroTimeLeft = 25 * 60;
    pomodoroWorkCount = 0;
    updatePomodoroUI();
    localStorage.removeItem('pomodoroState');
    // Очищаем состояние на сервере
    savePomodoroStateToServer();
}

// Запустить таймер помидоро
function startPomodoroTimer() {
    if (pomodoroInterval) {
        clearInterval(pomodoroInterval);
    }
    
    pomodoroInterval = setInterval(() => {
        pomodoroTimeLeft--;
        
        if (pomodoroTimeLeft <= 0) {
            if (pomodoroState === 'work') {
                completeWorkSession();
            } else if (pomodoroState === 'break') {
                completeBreakSession();
            }
        } else {
            updatePomodoroDisplay();
            // Сохраняем каждые 10 секунд
            if (pomodoroTimeLeft % 10 === 0) {
                savePomodoroState();
            }
        }
    }, 1000);
    
    updatePomodoroDisplay();
}

// Остановить таймер помидоро
function stopPomodoroTimer() {
    if (pomodoroInterval) {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
    }
}

// Обновить отображение времени
function updatePomodoroDisplay() {
    const timeElement = document.getElementById('pomodoroTime');
    const timeElementMobile = document.getElementById('pomodoroTimeMobile');
    
    const minutes = Math.floor(pomodoroTimeLeft / 60);
    const seconds = pomodoroTimeLeft % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    if (timeElement) {
        timeElement.textContent = timeString;
    }
    if (timeElementMobile) {
        timeElementMobile.textContent = timeString;
    }
}

// Обновить UI помидоро
function updatePomodoroUI() {
    const timer = document.getElementById('pomodoroTimer');
    const timerMobile = document.getElementById('pomodoroTimerMobile');
    const startBtn = document.getElementById('startWorkdayBtn');
    const status = document.getElementById('pomodoroStatus');
    const statusMobile = document.getElementById('pomodoroStatusMobile');
    const pauseBtn = document.getElementById('pausePomodoroBtn');
    const pauseBtnMobile = document.getElementById('pausePomodoroBtnMobile');
    
    if (!timer || !startBtn) return;
    
    if (pomodoroState === 'idle') {
        // Скрываем таймер, показываем кнопку
        timer.style.display = 'none';
        if (timerMobile) timerMobile.style.display = 'none';
        startBtn.style.display = 'flex';
        startBtn.classList.remove('active');
        const btnText = startBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Начать рабочий день';
    } else {
        // Скрываем кнопку, показываем таймер
        startBtn.style.display = 'none';
        
        // На мобильных показываем в меню, на десктопе в хедере
        if (isMobile()) {
            timer.style.display = 'none';
            if (timerMobile) timerMobile.style.display = 'flex';
        } else {
            timer.style.display = 'flex';
            if (timerMobile) timerMobile.style.display = 'none';
        }
        
        // Обновляем класс таймера
        timer.classList.remove('work', 'break');
        if (timerMobile) timerMobile.classList.remove('work', 'break');
        
        if (pomodoroState === 'work') {
            timer.classList.add('work');
            if (timerMobile) timerMobile.classList.add('work');
            if (status) status.textContent = 'Работа';
            if (statusMobile) statusMobile.textContent = 'Работа';
        } else if (pomodoroState === 'break') {
            timer.classList.add('break');
            if (timerMobile) timerMobile.classList.add('break');
            if (status) status.textContent = 'Перерыв';
            if (statusMobile) statusMobile.textContent = 'Перерыв';
        } else if (pomodoroState === 'paused') {
            if (status) status.textContent = 'Пауза';
            if (statusMobile) statusMobile.textContent = 'Пауза';
        }
        
        // Обновляем кнопку паузы
        const pauseIcon = pomodoroState === 'paused' ? '▶' : '⏸';
        if (pauseBtn) pauseBtn.textContent = pauseIcon;
        if (pauseBtnMobile) pauseBtnMobile.textContent = pauseIcon;
    }
    
    updatePomodoroDisplay();
}

// Запрос разрешения на уведомления при первом запуске
if ('Notification' in window && Notification.permission === 'default') {
    document.addEventListener('DOMContentLoaded', () => {
        const startBtn = document.getElementById('startWorkdayBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            }, { once: true });
        }
    });
}

// Экспорт функций для использования в других модулях
export { 
    startWorkSession, 
    stopPomodoro, 
    pausePomodoro, 
    syncPomodoroState 
};
