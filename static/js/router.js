// Роутер для управления состоянием приложения через URL

import { 
    currentProjectId, 
    setCurrentProjectId,
    selectedTaskId,
    setSelectedTaskId,
    isPasswordMode,
    setIsPasswordMode
} from './state.js';

// Инициализация роутера
export function initRouter() {
    // Обработка изменения URL (back/forward)
    window.addEventListener('popstate', handleRouteChange);
    
    // Обработка начальной загрузки
    handleRouteChange();
}

// Обработка изменения маршрута
function handleRouteChange() {
    const params = getRouteParams();
    restoreStateFromParams(params);
}

// Получение параметров из URL
function getRouteParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        project: params.get('project') ? parseInt(params.get('project')) : null,
        task: params.get('task') ? parseInt(params.get('task')) : null,
        calendar: params.get('calendar') === 'true',
        date: params.get('date') || null,
        password: params.get('password') === 'true',
        passwordId: params.get('passwordId') ? parseInt(params.get('passwordId')) : null,
        dailyNote: params.get('dailyNote') ? parseInt(params.get('dailyNote')) : null
    };
}

// Восстановление состояния из параметров URL
async function restoreStateFromParams(params) {
    // Устанавливаем флаг восстановления, чтобы избежать обновления маршрута
    window.__restoringRoute = true;
    
    try {
        // Восстанавливаем выбранный проект (если не null)
        if (params.project !== null) {
            const { selectProject } = await import('./projects.js');
            await selectProject(params.project);
        } else {
            // По умолчанию открываем "Все задачи" (project_id = 0)
            const { selectProject } = await import('./projects.js');
            await selectProject(0);
        }
        
        // Восстанавливаем календарь
        if (params.calendar) {
            const calendarView = document.getElementById('calendarView');
            const notesTextarea = document.getElementById('notesTextarea');
            const calendarBtn = document.getElementById('calendarBtn');
            const backToDailyBtn = document.getElementById('backToDailyBtn');
            const taskInputContainer = document.getElementById('taskInputContainer');
            
            if (calendarView && calendarView.style.display === 'none') {
                calendarView.style.display = 'block';
                if (notesTextarea) notesTextarea.style.display = 'none';
                
                // Показываем кнопку возврата, скрываем кнопку календаря
                if (calendarBtn) calendarBtn.style.display = 'none';
                if (backToDailyBtn) backToDailyBtn.style.display = 'block';
                
                // Меняем кнопку на "Добавить событие"
                if (taskInputContainer) {
                    taskInputContainer.innerHTML = `
                        <button class="btn-add-task" id="addEventBtnFromContainer" style="width: 100%;">
                            <span class="icon">+</span> Добавить событие
                        </button>
                    `;
                    const addBtn = document.getElementById('addEventBtnFromContainer');
                    if (addBtn) {
                        const { showAddEventModal } = await import('./calendar.js');
                        addBtn.addEventListener('click', showAddEventModal);
                    }
                }
                
                // Загружаем календарь
                const calendarModule = await import('./calendar.js');
                await calendarModule.renderCalendar();
                
                // Если указана дата, выбираем её
                if (params.date) {
                    await calendarModule.selectDate(params.date);
                } else {
                    await calendarModule.loadAllEvents();
                }
            }
        }
        
        // Восстанавливаем выбранную задачу
        if (params.task && params.task !== selectedTaskId) {
            const { selectTaskForDescription } = await import('./tasks.js');
            await selectTaskForDescription(params.task);
        }
        
        // Восстанавливаем режим паролей
        if (params.password) {
            setIsPasswordMode(true);
            const { togglePasswordMode, loadPasswords } = await import('./passwords.js');
            await loadPasswords();
            
            if (params.passwordId) {
                const { showPasswordModal } = await import('./passwords.js');
                // Нужно загрузить пароль и показать модальное окно
                // Это можно сделать через loadPasswords, который уже вызывается
            }
        }
        
        // Восстанавливаем выбранную заметку ежедневника
        if (params.dailyNote && currentProjectId === -1) {
            const { selectDailyNote } = await import('./daily-notes.js');
            await selectDailyNote(params.dailyNote);
        }
    } finally {
        // Снимаем флаг восстановления
        window.__restoringRoute = false;
    }
}

// Обновление URL с параметрами
export function updateRoute(params = {}) {
    const currentParams = getRouteParams();
    const newParams = { ...currentParams, ...params };
    
    // Удаляем параметры со значением null
    Object.keys(newParams).forEach(key => {
        if (newParams[key] === null || newParams[key] === false) {
            delete newParams[key];
        }
    });
    
    // Формируем query string
    const queryString = new URLSearchParams();
    Object.keys(newParams).forEach(key => {
        if (newParams[key] !== null && newParams[key] !== false) {
            queryString.append(key, newParams[key]);
        }
    });
    
    const newUrl = queryString.toString() 
        ? `${window.location.pathname}?${queryString.toString()}`
        : window.location.pathname;
    
    // Обновляем URL без перезагрузки страницы
    window.history.pushState({}, '', newUrl);
}

// Обновление маршрута при изменении проекта
export function updateProjectRoute(projectId) {
    updateRoute({ project: projectId });
}

// Обновление маршрута при открытии/закрытии календаря
export function updateCalendarRoute(isOpen, date = null) {
    if (isOpen) {
        updateRoute({ calendar: true, date: date });
    } else {
        updateRoute({ calendar: false, date: null });
    }
}

// Обновление маршрута при выборе задачи
export function updateTaskRoute(taskId) {
    if (taskId) {
        updateRoute({ task: taskId });
    } else {
        updateRoute({ task: null });
    }
}

// Обновление маршрута при выборе заметки ежедневника
export function updateDailyNoteRoute(noteId) {
    if (noteId) {
        updateRoute({ dailyNote: noteId });
    } else {
        updateRoute({ dailyNote: null });
    }
}

// Обновление маршрута при режиме паролей
export function updatePasswordRoute(isPasswordMode, passwordId = null) {
    if (isPasswordMode) {
        updateRoute({ password: true, passwordId: passwordId });
    } else {
        updateRoute({ password: false, passwordId: null });
    }
}

