// Страница статистики

import { escapeHtml } from './utils.js';

let statsChart = null;

// Инициализация страницы статистики
export async function initStatsPage() {
    await loadStatsData();
    setupStatsMenu();
}

// Настройка меню статистики
function setupStatsMenu() {
    const statsMenu = document.getElementById('statsMenu');
    if (!statsMenu) return;
    
    // Очищаем меню
    statsMenu.innerHTML = '';
    
    const menuItems = [
        { id: 'dailyStats', label: '📊 Ежедневная статистика', active: true },
        { id: 'weeklyStats', label: '📈 Недельная статистика' },
        { id: 'monthlyStats', label: '📅 Месячная статистика' },
        { id: 'projectStats', label: '🎯 Статистика по проектам' }
    ];
    
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = `stats-menu-item ${item.active ? 'active' : ''}`;
        menuItem.dataset.statsType = item.id;
        menuItem.textContent = item.label;
        menuItem.addEventListener('click', () => {
            document.querySelectorAll('.stats-menu-item').forEach(mi => mi.classList.remove('active'));
            menuItem.classList.add('active');
            loadStatsByType(item.id);
        });
        statsMenu.appendChild(menuItem);
    });
}

// Загрузка данных статистики
async function loadStatsData() {
    try {
        const response = await fetch('/api/statistics/detailed');
        if (!response.ok) {
            console.error('Ошибка загрузки статистики');
            return;
        }
        
        const data = await response.json();
        displayDailyStats(data);
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Загрузка статистики по типу
async function loadStatsByType(type) {
    try {
        const response = await fetch(`/api/statistics/${type}`);
        if (!response.ok) {
            console.error('Ошибка загрузки статистики');
            return;
        }
        
        const data = await response.json();
        
        switch (type) {
            case 'dailyStats':
                displayDailyStats(data);
                break;
            case 'weeklyStats':
                displayWeeklyStats(data);
                break;
            case 'monthlyStats':
                displayMonthlyStats(data);
                break;
            case 'projectStats':
                displayProjectStats(data);
                break;
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Отображение ежедневной статистики
function displayDailyStats(data) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    const completedByDay = data.completed_by_day || [];
    const pomodoroByDay = data.pomodoro_by_day || [];
    
    mainContent.innerHTML = `
        <div class="stats-page">
            <div class="stats-header">
                <h2>📊 Ежедневная статистика</h2>
                <div class="stats-summary">
                    <div class="stats-summary-item">
                        <div class="stats-summary-value">${data.total_completed || 0}</div>
                        <div class="stats-summary-label">Всего выполнено</div>
                    </div>
                    <div class="stats-summary-item">
                        <div class="stats-summary-value">${data.total_pomodoro_hours?.toFixed(1) || 0}</div>
                        <div class="stats-summary-label">Часов (помидоро)</div>
                    </div>
                    <div class="stats-summary-item">
                        <div class="stats-summary-value">${data.avg_per_day?.toFixed(1) || 0}</div>
                        <div class="stats-summary-label">Среднее в день</div>
                    </div>
                </div>
            </div>
            <div class="stats-charts">
                <div class="stats-chart-container">
                    <h3>Выполненные задачи по дням</h3>
                    <canvas id="completedTasksChart"></canvas>
                </div>
                <div class="stats-chart-container">
                    <h3>Время работы по дням (часы)</h3>
                    <canvas id="pomodoroChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    // Создаем графики
    createCompletedTasksChart(completedByDay);
    createPomodoroChart(pomodoroByDay);
}

// Отображение недельной статистики
function displayWeeklyStats(data) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    const completedByWeek = data.completed_by_week || [];
    
    mainContent.innerHTML = `
        <div class="stats-page">
            <div class="stats-header">
                <h2>📈 Недельная статистика</h2>
                <div class="stats-summary">
                    <div class="stats-summary-item">
                        <div class="stats-summary-value">${data.total_completed || 0}</div>
                        <div class="stats-summary-label">Всего выполнено</div>
                    </div>
                    <div class="stats-summary-item">
                        <div class="stats-summary-value">${data.total_pomodoro_hours?.toFixed(1) || 0}</div>
                        <div class="stats-summary-label">Часов (помидоро)</div>
                    </div>
                    <div class="stats-summary-item">
                        <div class="stats-summary-value">${data.avg_per_week?.toFixed(1) || 0}</div>
                        <div class="stats-summary-label">Среднее в неделю</div>
                    </div>
                </div>
            </div>
            <div class="stats-charts">
                <div class="stats-chart-container">
                    <h3>Выполненные задачи по неделям</h3>
                    <canvas id="weeklyChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    // Создаем график для недельной статистики
    createWeeklyChart(completedByWeek);
}

// Создание графика недельной статистики
function createWeeklyChart(data) {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx || typeof Chart === 'undefined') return;
    
    const labels = data.map(item => item.week);
    const values = data.map(item => item.count);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Выполнено задач',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Отображение месячной статистики
function displayMonthlyStats(data) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    const completedByMonth = data.completed_by_month || [];
    
    mainContent.innerHTML = `
        <div class="stats-page">
            <div class="stats-header">
                <h2>📅 Месячная статистика</h2>
                <div class="stats-summary">
                    <div class="stats-summary-item">
                        <div class="stats-summary-value">${data.total_completed || 0}</div>
                        <div class="stats-summary-label">Всего выполнено</div>
                    </div>
                    <div class="stats-summary-item">
                        <div class="stats-summary-value">${data.total_pomodoro_hours?.toFixed(1) || 0}</div>
                        <div class="stats-summary-label">Часов (помидоро)</div>
                    </div>
                    <div class="stats-summary-item">
                        <div class="stats-summary-value">${data.avg_per_month?.toFixed(1) || 0}</div>
                        <div class="stats-summary-label">Среднее в месяц</div>
                    </div>
                </div>
            </div>
            <div class="stats-charts">
                <div class="stats-chart-container">
                    <h3>Выполненные задачи по месяцам</h3>
                    <canvas id="monthlyChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    // Создаем график для месячной статистики
    createMonthlyChart(completedByMonth);
}

// Создание графика месячной статистики
function createMonthlyChart(data) {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx || typeof Chart === 'undefined') return;
    
    const labels = data.map(item => {
        const [year, month] = item.month.split('-');
        const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    });
    const values = data.map(item => item.count);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Выполнено задач',
                data: values,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Отображение статистики по проектам
function displayProjectStats(data) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    const projects = data.projects || [];
    
    mainContent.innerHTML = `
        <div class="stats-page">
            <div class="stats-header">
                <h2>🎯 Статистика по проектам</h2>
            </div>
            <div class="stats-charts">
                <div class="stats-chart-container">
                    <h3>Выполненные задачи по проектам</h3>
                    <canvas id="projectChart"></canvas>
                </div>
            </div>
            <div class="project-stats-list">
                ${projects.map(project => `
                    <div class="project-stats-item">
                        <div class="project-stats-name">${escapeHtml(project.project)}</div>
                        <div class="project-stats-details">
                            <span>Выполнено: ${project.completed}</span>
                            <span>Всего: ${project.total}</span>
                            <span>Часов: ${project.pomodoro_hours}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Создаем график для статистики по проектам
    createProjectChart(projects);
}

// Создание графика статистики по проектам
function createProjectChart(data) {
    const ctx = document.getElementById('projectChart');
    if (!ctx || typeof Chart === 'undefined') return;
    
    const labels = data.map(item => item.project.length > 15 ? item.project.substring(0, 15) + '...' : item.project);
    const values = data.map(item => item.completed);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Выполнено задач',
                data: values,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'right'
                }
            }
        }
    });
}

// Создание графика выполненных задач
function createCompletedTasksChart(data) {
    const ctx = document.getElementById('completedTasksChart');
    if (!ctx || typeof Chart === 'undefined') return;
    
    if (statsChart) {
        statsChart.destroy();
    }
    
    const labels = data.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    });
    const values = data.map(item => item.count);
    
    statsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Выполнено задач',
                data: values,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Создание графика помидоро
function createPomodoroChart(data) {
    const ctx = document.getElementById('pomodoroChart');
    if (!ctx || typeof Chart === 'undefined') return;
    
    const labels = data.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    });
    const values = data.map(item => item.hours);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Часов работы',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

