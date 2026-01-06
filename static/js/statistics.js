// Статистика для проекта "Все задачи"

import { currentProjectId } from './state.js';

// Загрузка статистики
export async function loadStatistics() {
    if (currentProjectId !== 0) return;
    
    try {
        const response = await fetch('/api/statistics');
        if (!response.ok) {
            console.error('Ошибка загрузки статистики');
            return;
        }
        
        const stats = await response.json();
        displayStatistics(stats);
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Отображение статистики
function displayStatistics(stats) {
    const notesTextarea = document.getElementById('notesTextarea');
    if (!notesTextarea) return;
    
    const completedToday = stats.completed_today || 0;
    const remainingTasks = stats.remaining_tasks || 0;
    const pomodoroHours = stats.pomodoro_hours || 0;
    
    // Отключаем contenteditable для отображения статистики
    notesTextarea.contentEditable = 'false';
    notesTextarea.innerHTML = `
        <div class="statistics-container">
            <div class="statistics-header">
                <h3>📊 Статистика за сегодня</h3>
            </div>
            <div class="statistics-grid">
                <div class="statistics-card completed">
                    <div class="statistics-icon">✓</div>
                    <div class="statistics-value">${completedToday}</div>
                    <div class="statistics-label">Задач выполнено</div>
                </div>
                <div class="statistics-card remaining">
                    <div class="statistics-icon">📋</div>
                    <div class="statistics-value">${remainingTasks}</div>
                    <div class="statistics-label">Задач осталось</div>
                </div>
                <div class="statistics-card time">
                    <div class="statistics-icon">⏱️</div>
                    <div class="statistics-value">${pomodoroHours.toFixed(1)}</div>
                    <div class="statistics-label">Часов (помидоро)</div>
                </div>
            </div>
        </div>
    `;
}

