// Управление таймером работы над задачей

import { selectedTaskId, showCompletedTasks } from './state.js';
import { loadTasks, closeTaskDescription } from './tasks.js';

let timerInterval = null;
export let timerStartTime = null;

// Инициализация таймера при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    restoreTimer();
});

// Восстановление таймера из localStorage
function restoreTimer() {
    const savedTimer = localStorage.getItem('activeTaskTimer');
    if (savedTimer) {
        try {
            const timerData = JSON.parse(savedTimer);
            const taskId = timerData.taskId;
            const startTime = new Date(timerData.startTime);
            
            // Проверяем, что задача все еще существует и не завершена
            if (taskId && startTime) {
                timerStartTime = startTime;
                startTimerDisplay();
                
                // Обновляем UI для этой задачи
                if (selectedTaskId === taskId) {
                    updateTimerUI(true);
                }
            }
        } catch (error) {
            console.error('Ошибка восстановления таймера:', error);
            localStorage.removeItem('activeTaskTimer');
        }
    }
}

// Начать работу над задачей
export async function startTaskTimer(taskId) {
    if (!taskId) return;
    
    // Останавливаем предыдущий таймер, если есть
    if (timerInterval) {
        stopTaskTimer();
    }
    
    const startTime = new Date();
    timerStartTime = startTime;
    
    // Сохраняем в localStorage
    localStorage.setItem('activeTaskTimer', JSON.stringify({
        taskId: taskId,
        startTime: startTime.toISOString()
    }));
    
    // Сохраняем в БД
    try {
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ started_at: startTime.toISOString() })
        });
    } catch (error) {
        console.error('Ошибка сохранения времени начала:', error);
    }
    
    // Запускаем отображение таймера
    startTimerDisplay();
    updateTimerUI(true);
}

// Завершить работу над задачей (остановить таймер)
export async function stopTaskTimer(taskId = null) {
    if (!taskId) {
        // Получаем taskId из localStorage
        const savedTimer = localStorage.getItem('activeTaskTimer');
        if (savedTimer) {
            try {
                const timerData = JSON.parse(savedTimer);
                taskId = timerData.taskId;
            } catch (error) {
                console.error('Ошибка получения taskId:', error);
            }
        }
    }
    
    // Останавливаем таймер
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    timerStartTime = null;
    localStorage.removeItem('activeTaskTimer');
    
    // Обновляем БД - очищаем started_at
    if (taskId) {
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ started_at: '' })
            });
        } catch (error) {
            console.error('Ошибка остановки таймера:', error);
        }
    }
    
    // Обновляем UI
    updateTimerUI(false);
    updateTimerDisplay(0);
}

// Завершить задачу (установить completed = true)
export async function completeTask(taskId) {
    if (!taskId) {
        console.error('Невозможно завершить задачу: taskId не указан.');
        return;
    }
    
    // Останавливаем таймер, если он запущен
    const activeTaskId = getActiveTaskId();
    if (activeTaskId === taskId) {
        await stopTaskTimer(taskId);
    }
    
    // Устанавливаем задачу как завершенную в БД
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                completed: true,
                started_at: '' // Очищаем started_at при завершении
            })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка завершения задачи');
        }
        
        // Получаем элемент задачи для анимации
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('hiding');
            // Удаляем элемент после анимации, если не показываем завершенные
            setTimeout(() => {
                // Проверяем переменную showCompletedTasks
                const showCompleted = showCompletedTasks;
                if (!showCompleted) {
                    taskElement.remove();
                } else {
                    // Если показываем завершенные, просто обновляем класс
                    taskElement.classList.remove('hiding');
                    taskElement.classList.add('completed');
                }
            }, 500);
        }
        
        // Обновляем UI - перезагружаем задачи
        // Небольшая задержка для анимации
        setTimeout(async () => {
            await loadTasks();
            
            // Обновляем статистику, если открыт проект "Все задачи"
            const { currentProjectId } = await import('./state.js');
            if (currentProjectId === 0) {
                const { loadStatistics } = await import('./statistics.js');
                await loadStatistics();
            }
        }, 600);
        
        // Закрываем описание задачи
        if (selectedTaskId === taskId) {
            closeTaskDescription();
        }
    } catch (error) {
        console.error('Ошибка завершения задачи:', error);
        alert('Не удалось завершить задачу. Попробуйте еще раз.');
    }
}

// Запустить отображение таймера
export function startTimerDisplay() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        if (timerStartTime) {
            const elapsed = Date.now() - timerStartTime.getTime();
            updateTimerDisplay(elapsed);
        }
    }, 1000);
    
    // Сразу обновляем отображение
    if (timerStartTime) {
        const elapsed = Date.now() - timerStartTime.getTime();
        updateTimerDisplay(elapsed);
    }
}

// Обновить отображение таймера
export function updateTimerDisplay(elapsedMs) {
    const timerValue = document.getElementById('taskTimerValue');
    if (!timerValue) return;
    
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    timerValue.textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Обновить UI таймера
export function updateTimerUI(isRunning) {
    const timerSection = document.getElementById('taskTimerSection');
    const timerDisplay = document.getElementById('taskTimerDisplay');
    const startBtn = document.getElementById('startTaskBtn');
    const stopBtn = document.getElementById('stopTaskBtn');
    
    if (!timerSection) return;
    
    // Показываем секцию таймера только если выбрана задача
    if (selectedTaskId) {
        timerSection.style.display = 'block';
    }
    
    if (isRunning) {
        // Показываем отображение времени только когда таймер запущен
        if (timerDisplay) timerDisplay.style.display = 'flex';
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'block';
    } else {
        // Скрываем отображение времени когда таймер не запущен
        if (timerDisplay) timerDisplay.style.display = 'none';
        if (startBtn) startBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'block';
    }
}

// Получить активный taskId из таймера
export function getActiveTaskId() {
    const savedTimer = localStorage.getItem('activeTaskTimer');
    if (savedTimer) {
        try {
            const timerData = JSON.parse(savedTimer);
            return timerData.taskId;
        } catch (error) {
            return null;
        }
    }
    return null;
}

