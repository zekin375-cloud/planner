// Система помидоро для рабочего дня

let pomodoroInterval = null;
let pomodoroTimeLeft = 25 * 60; // 25 минут в секундах
let pomodoroState = 'idle'; // idle, work, break, paused
let pomodoroWorkCount = 0;
let pomodoroBreakTime = 5 * 60; // 5 минут перерыва

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    restorePomodoroState();
    setupPomodoroListeners();
    updatePomodoroUI(); // Обновляем UI при загрузке
});

// Настройка обработчиков событий
function setupPomodoroListeners() {
    const startBtn = document.getElementById('startWorkdayBtn');
    const pauseBtn = document.getElementById('pausePomodoroBtn');
    const stopBtn = document.getElementById('stopPomodoroBtn');
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
    
    if (userMenuBtn && userPopup) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = userPopup.style.display !== 'none';
            userPopup.style.display = isVisible ? 'none' : 'block';
        });
        
        // Закрытие popup при клике вне его
        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userPopup.contains(e.target)) {
                userPopup.style.display = 'none';
            }
        });
    }
}

// Восстановление состояния помидоро из localStorage
function restorePomodoroState() {
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

// Сохранение состояния помидоро
function savePomodoroState() {
    const state = {
        timeLeft: pomodoroTimeLeft,
        state: pomodoroState,
        workCount: pomodoroWorkCount,
        startTime: Date.now()
    };
    localStorage.setItem('pomodoroState', JSON.stringify(state));
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
    if (Notification.permission === 'granted') {
        new Notification('Помидор завершен!', {
            body: 'Время для перерыва (5 минут)',
            icon: '🍅'
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    
    startPomodoroTimer();
    updatePomodoroUI();
    savePomodoroState();
}

// Завершить перерыв
function completeBreakSession() {
    stopPomodoroTimer();
    
    // Уведомление
    if (Notification.permission === 'granted') {
        new Notification('Перерыв завершен!', {
            body: 'Время вернуться к работе',
            icon: '🍅'
        });
    }
    
    // Автоматически начинаем новый рабочий сеанс
    startWorkSession();
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
            savePomodoroState();
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
    if (!timeElement) return;
    
    const minutes = Math.floor(pomodoroTimeLeft / 60);
    const seconds = pomodoroTimeLeft % 60;
    timeElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Обновить UI помидоро
function updatePomodoroUI() {
    const timer = document.getElementById('pomodoroTimer');
    const startBtn = document.getElementById('startWorkdayBtn');
    const status = document.getElementById('pomodoroStatus');
    const pauseBtn = document.getElementById('pausePomodoroBtn');
    
    if (!timer || !startBtn) return;
    
    if (pomodoroState === 'idle') {
        // Скрываем таймер, показываем кнопку
        timer.style.display = 'none';
        startBtn.style.display = 'flex';
        startBtn.classList.remove('active');
        startBtn.querySelector('.btn-text').textContent = 'Начать рабочий день';
    } else {
        // Скрываем кнопку, показываем таймер
        startBtn.style.display = 'none';
        timer.style.display = 'flex';
        
        // Обновляем класс таймера
        timer.classList.remove('work', 'break');
        if (pomodoroState === 'work') {
            timer.classList.add('work');
            if (status) status.textContent = 'Работа';
        } else if (pomodoroState === 'break') {
            timer.classList.add('break');
            if (status) status.textContent = 'Перерыв';
        } else if (pomodoroState === 'paused') {
            if (status) status.textContent = 'Пауза';
        }
        
        // Обновляем кнопку паузы
        if (pauseBtn) {
            pauseBtn.textContent = pomodoroState === 'paused' ? '▶' : '⏸';
        }
    }
    
    updatePomodoroDisplay();
}

// Запрос разрешения на уведомления при первом запуске
if ('Notification' in window && Notification.permission === 'default') {
    // Запрашиваем разрешение при первом клике на кнопку
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

