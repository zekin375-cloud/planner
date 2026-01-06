// Работа с задачами

import { escapeHtml } from './utils.js';
import { currentProjectId, selectedTaskId, setSelectedTaskId, showCompletedTasks, setShowCompletedTasks, isSearchMode, setIsSearchMode, currentTaskId, setCurrentTaskId } from './state.js';
import { getActiveTaskId, timerStartTime, startTimerDisplay, updateTimerUI, updateTimerDisplay, stopTaskTimer } from './timer.js';
import { showMainNotes } from './notes.js';

// Загрузка задач
export async function loadTasks() {
    // Разрешаем загрузку если currentProjectId === 0 (Все задачи) или есть режим поиска
    if (currentProjectId === null && !isSearchMode) return;
    
    try {
        let tasks = [];
        if (isSearchMode) {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) {
                setIsSearchMode(false);
                if (currentProjectId) {
                    await loadTasks();
                }
                return;
            }
            const response = await fetch(`/api/search/tasks?q=${encodeURIComponent(query)}`);
            tasks = await response.json();
        } else {
            const response = await fetch(`/api/projects/${currentProjectId}/tasks?include_completed=${showCompletedTasks}`);
            tasks = await response.json();
        }
        
        const container = document.getElementById('tasksContainer');
        
        if (tasks.length === 0) {
            if (currentProjectId === 0) {
                container.innerHTML = '<div class="empty-state"><p>Нет задач во всех проектах</p></div>';
            } else {
                container.innerHTML = '<div class="empty-state"><p>Нет задач. Создайте новую задачу!</p></div>';
            }
            return;
        }
        
        container.innerHTML = '';
        tasks.forEach(task => {
            // Для режима "Все задачи" всегда показываем название проекта
            const projectName = (currentProjectId === 0 && task.project_name) ? task.project_name : null;
            container.appendChild(createTaskElement(task, projectName));
        });
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
    }
}

// Создание элемента задачи
function createTaskElement(task, projectName = null) {
    const div = document.createElement('div');
    div.className = `task-item ${task.completed ? 'completed' : ''} ${selectedTaskId === task.id ? 'selected' : ''}`;
    div.dataset.taskId = task.id;
    
    const projectLabel = projectName ? `<div class="task-project-label">${escapeHtml(projectName)}</div>` : '';
    
    // Форматируем стоимость задачи
    let priceBadge = '';
    if (task.price && parseFloat(task.price) > 0) {
        priceBadge = `<span class="task-price-badge">💰 ${parseFloat(task.price).toFixed(2)} ₽</span>`;
    }
    
    // Форматируем дату срока выполнения
    let deadlineBadge = '';
    if (task.deadline) {
        const deadline = new Date(task.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((deadlineDate - today) / (1000 * 60 * 60 * 24));
        let badgeClass = '';
        if (daysDiff < 0) {
            badgeClass = 'overdue';
        } else if (daysDiff === 0) {
            badgeClass = 'today';
        }
        
        const formattedDate = deadline.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        deadlineBadge = `<span class="task-deadline-badge ${badgeClass}">📅 ${formattedDate}</span>`;
    }
    
    div.innerHTML = `
        <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.completed ? 'checked' : ''}
            onchange="toggleTask(${task.id}, this.checked, event)"
        >
        <div class="task-content">
            <div class="task-title">${escapeHtml(task.title)}${deadlineBadge}${priceBadge}</div>
            ${projectLabel}
        </div>
        <div class="task-actions">
            <button class="task-btn btn-edit" onclick="editTask(${task.id}, event)" title="Редактировать">✎</button>
            <button class="task-btn btn-delete" onclick="deleteTask(${task.id}, event)" title="Удалить">×</button>
        </div>
    `;
    
    // Добавляем обработчик клика на весь элемент задачи
    div.addEventListener('click', (e) => {
        // Не обрабатываем клики на чекбокс, кнопки редактирования/удаления
        if (e.target.classList.contains('task-checkbox') || 
            e.target.classList.contains('btn-edit') || 
            e.target.classList.contains('btn-delete') ||
            e.target.closest('.task-actions')) {
            return;
        }
        selectTaskForDescription(task.id);
    });
    
    // Добавляем поддержку touch событий для тачскринов
    div.addEventListener('touchend', (e) => {
        // Не обрабатываем touch на чекбокс, кнопки редактирования/удаления
        if (e.target.classList.contains('task-checkbox') || 
            e.target.classList.contains('btn-edit') || 
            e.target.classList.contains('btn-delete') ||
            e.target.closest('.task-actions')) {
            return;
        }
        e.preventDefault();
        selectTaskForDescription(task.id);
    });
    
    return div;
}

// Добавление задачи
export async function addTask() {
    // Нельзя добавлять задачи в "Ежедневник" (project_id = -1)
    if (currentProjectId === -1) {
        alert('Выберите проект для добавления задачи');
        return;
    }
    
    // Проверяем, что проект выбран (но учитываем, что 0 - это валидное значение для "Все задачи")
    if (currentProjectId === null && !isSearchMode) {
        alert('Выберите проект');
        return;
    }
    
    if (isSearchMode) {
        alert('Выйдите из режима поиска для добавления задачи');
        return;
    }
    
    const input = document.getElementById('taskInput');
    const title = input.value.trim();
    
    if (!title) return;
    
    // Если выбрано "Все задачи" (id = 0), нужно выбрать конкретный проект
    if (currentProjectId === 0) {
        // Сохраняем название задачи для последующего использования
        window.pendingTaskTitle = title;
        // Показываем модальное окно выбора проекта
        await showSelectProjectModal();
        return;
    }
    
    // Создаем задачу в выбранном проекте
    await createTaskInProject(currentProjectId, title);
}

// Показать модальное окно выбора проекта
async function showSelectProjectModal() {
    try {
        const projectsResponse = await fetch('/api/projects');
        const projects = await projectsResponse.json();
        
        if (projects.length === 0) {
            alert('Нет доступных проектов. Создайте проект сначала.');
            return;
        }
        
        const projectsList = document.getElementById('projectsSelectList');
        projectsList.innerHTML = '';
        
        projects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = 'project-select-item';
            projectItem.innerHTML = `
                <div class="project-select-name">${escapeHtml(project.name)}</div>
            `;
            projectItem.addEventListener('click', async () => {
                const title = window.pendingTaskTitle;
                delete window.pendingTaskTitle;
                hideSelectProjectModal();
                await createTaskInProject(project.id, title);
            });
            projectsList.appendChild(projectItem);
        });
        
        const modal = document.getElementById('selectProjectModal');
        modal.classList.add('show');
    } catch (error) {
        console.error('Ошибка загрузки проектов:', error);
        alert('Ошибка при загрузке проектов');
    }
}

// Скрыть модальное окно выбора проекта
export function hideSelectProjectModal() {
    const modal = document.getElementById('selectProjectModal');
    modal.classList.remove('show');
    if (window.pendingTaskTitle) {
        delete window.pendingTaskTitle;
    }
}

// Создать задачу в проекте
async function createTaskInProject(projectId, title) {
    const input = document.getElementById('taskInput');
    
    try {
        const response = await fetch(`/api/projects/${projectId}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        });
        
        if (response.ok) {
            if (input) {
                input.value = '';
            }
            loadTasks();
        }
    } catch (error) {
        console.error('Ошибка создания задачи:', error);
        alert('Ошибка при создании задачи');
    }
}

// Переключение статуса задачи
export async function toggleTask(taskId, completed, event) {
    if (event) event.stopPropagation();
    
    // Если задача завершается, останавливаем таймер
    if (completed) {
        const activeTaskId = getActiveTaskId();
        if (activeTaskId === taskId) {
            stopTaskTimer(taskId);
        }
        
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('hiding');
            // Удаляем элемент после анимации
            setTimeout(() => {
                if (!showCompletedTasks) {
                    taskElement.remove();
                }
            }, 500);
        }
    }
    
    try {
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completed })
        });
        
        // Если показываем завершенные, перезагружаем список
        if (showCompletedTasks) {
            setTimeout(async () => {
                await loadTasks();
                // Обновляем статистику, если открыт проект "Все задачи"
                if (currentProjectId === 0) {
                    const { loadStatistics } = await import('./statistics.js');
                    await loadStatistics();
                }
            }, 600);
        } else if (!completed) {
            // Если задача открывается обратно, перезагружаем
            await loadTasks();
            // Обновляем статистику, если открыт проект "Все задачи"
            if (currentProjectId === 0) {
                const { loadStatistics } = await import('./statistics.js');
                await loadStatistics();
            }
        } else {
            // Если задача завершена, обновляем статистику
            if (currentProjectId === 0) {
                const { loadStatistics } = await import('./statistics.js');
                await loadStatistics();
            }
        }
    } catch (error) {
        console.error('Ошибка обновления задачи:', error);
    }
}

// Редактирование задачи
export async function editTask(taskId, event) {
    if (event) event.stopPropagation();
    setCurrentTaskId(taskId);
    
    // Получаем данные задачи
    try {
        let tasks = [];
        let task = null;
        if (isSearchMode) {
            const query = document.getElementById('searchInput').value.trim();
            const response = await fetch(`/api/search/tasks?q=${encodeURIComponent(query)}`);
            tasks = await response.json();
            task = tasks.find(t => t.id === taskId);
            // Если редактируем из поиска, переключаемся на проект задачи
            if (task && task.project_id && task.project_id !== currentProjectId) {
                await selectProject(task.project_id);
                // Перезагружаем задачи проекта
                const projectTasks = await fetch(`/api/projects/${task.project_id}/tasks`).then(r => r.json());
                task = projectTasks.find(t => t.id === taskId) || task;
            }
        } else {
            const response = await fetch(`/api/projects/${currentProjectId}/tasks?include_completed=${showCompletedTasks}`);
            tasks = await response.json();
            task = tasks.find(t => t.id === taskId);
        }
        
        if (task) {
            document.getElementById('taskTitleInput').value = task.title;
            document.getElementById('taskPriceInput').value = task.price || 0;
            document.getElementById('taskModal').classList.add('show');
            document.getElementById('taskTitleInput').focus();
        }
    } catch (error) {
        console.error('Ошибка загрузки задачи:', error);
    }
}

export function hideTaskModal() {
    document.getElementById('taskModal').classList.remove('show');
    setCurrentTaskId(null);
}

export async function saveTask() {
    if (!currentTaskId) return;
    
    const title = document.getElementById('taskTitleInput').value.trim();
    const price = parseFloat(document.getElementById('taskPriceInput').value) || 0;
    
    if (!title) {
        alert('Введите название задачи');
        return;
    }
    
    try {
        const response = await fetch(`/api/tasks/${currentTaskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, price })
        });
        
        if (response.ok) {
            hideTaskModal();
            await loadTasks();
            
            // Обновляем статистику, если открыт проект "Все задачи"
            if (currentProjectId === 0) {
                const { loadStatistics } = await import('./statistics.js');
                await loadStatistics();
            }
            
            // Обновляем счетчики задач в проектах
            const { updateProjectTaskCounts } = await import('./projects.js');
            await updateProjectTaskCounts();
        }
    } catch (error) {
        console.error('Ошибка сохранения задачи:', error);
        alert('Ошибка при сохранении задачи');
    }
}

// Удаление задачи
export async function deleteTask(taskId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Удалить задачу?')) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            if (selectedTaskId === taskId) {
                closeTaskDescription();
            }
            loadTasks();
        }
    } catch (error) {
        console.error('Ошибка удаления задачи:', error);
        alert('Ошибка при удалении задачи');
    }
}

// Показать заметки при клике на задачу
export async function selectTaskForDescription(taskId) {
    // Получаем задачу из текущего списка
    let taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    
    // Если элемент не найден, пытаемся загрузить задачи
    if (!taskElement) {
        console.info('Элемент задачи не найден, загружаем задачи...', taskId);
        await loadTasks();
        // Ждем немного для рендеринга
        await new Promise(resolve => setTimeout(resolve, 100));
        taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    }
    
    if (!taskElement) {
        console.warn('Элемент задачи не найден после загрузки:', taskId);
        return;
    }
    
    // Если проект не выбран (null), не можем показать заметки
    // Но currentProjectId === 0 (Все задачи) - это валидное значение
    if (currentProjectId === null) {
        alert('Выберите проект для просмотра заметок');
        return;
    }
    
    // Обновляем выделение задачи
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.taskId == taskId);
    });
    
    // Сохраняем выбранную задачу и показываем заметки проекта
    setSelectedTaskId(taskId);
    
    // Обновляем маршрут
    const { updateTaskRoute } = await import('./router.js');
    updateTaskRoute(taskId);
    
    // Загружаем данные задачи для отображения срока
    try {
        const response = await fetch(`/api/projects/${currentProjectId}/tasks?include_completed=true`);
        const tasks = await response.json();
        const task = tasks.find(t => t.id === taskId);
        
        if (task) {
            // Обновляем заголовок с названием задачи
            const rightPanelTitle = document.getElementById('rightPanelTitle');
            if (rightPanelTitle) {
                rightPanelTitle.innerHTML = `Заметки: ${escapeHtml(task.title)}`;
            }
            
            // Показываем секцию срока выполнения
            const deadlineSection = document.getElementById('taskDeadlineSection');
            if (deadlineSection) {
                deadlineSection.style.display = 'block';
            }
            
            // Устанавливаем дату срока если есть
            const deadlineInput = document.getElementById('taskDeadlineInput');
            if (deadlineInput) {
                if (task.deadline) {
                    const deadlineDate = new Date(task.deadline);
                    deadlineInput.value = deadlineDate.toISOString().split('T')[0];
                } else {
                    deadlineInput.value = '';
                }
            }
            
            // Показываем секцию таймера
            const timerSection = document.getElementById('taskTimerSection');
            if (timerSection) {
                timerSection.style.display = 'block';
                
                // Проверяем, запущен ли таймер для этой задачи
                const activeTaskId = getActiveTaskId();
                if (activeTaskId === taskId && task.started_at) {
                    // Восстанавливаем таймер
                    const startTime = new Date(task.started_at);
                    timerStartTime = startTime;
                    startTimerDisplay();
                    updateTimerUI(true);
                } else {
                    // Таймер не запущен - показываем только кнопки
                    updateTimerUI(false);
                    updateTimerDisplay(0);
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки задачи:', error);
    }
    
    // Убеждаемся, что заметки видны
    const notesTextarea = document.getElementById('notesTextarea');
    if (notesTextarea) {
        notesTextarea.style.display = 'block';
        // Включаем редактирование для заметок задачи
        notesTextarea.contentEditable = 'true';
    }
    
    // Показываем и загружаем заметки
    showMainNotes();
    
    // На мобильных показываем секцию заметок как overlay
    if (window.innerWidth <= 768) {
        const notesSection = document.querySelector('.notes-section');
        const closeNotesBtn = document.getElementById('closeNotesBtn');
        if (notesSection) {
            notesSection.classList.add('task-selected');
            document.body.style.overflow = 'hidden';
        }
        if (closeNotesBtn) {
            closeNotesBtn.style.display = 'flex';
        }
    }
    
    // Фокусируемся на поле заметок для удобства
    setTimeout(() => {
        if (notesTextarea) {
            notesTextarea.focus();
            // Перемещаем курсор в конец текста
            try {
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(notesTextarea);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } catch (e) {
                // Если не удалось установить курсор, просто фокусируемся
                notesTextarea.focus();
            }
        }
    }, 200);
}

export async function closeTaskDescription() {
    setSelectedTaskId(null);
    
    // Обновляем маршрут
    const { updateTaskRoute } = await import('./router.js');
    updateTaskRoute(null);
    
    // На мобильных скрываем секцию заметок
    if (window.innerWidth <= 768) {
        const notesSection = document.querySelector('.notes-section');
        const closeNotesBtn = document.getElementById('closeNotesBtn');
        if (notesSection) {
            notesSection.classList.remove('task-selected');
            document.body.style.overflow = '';
        }
        if (closeNotesBtn) {
            closeNotesBtn.style.display = 'none';
        }
    }
    
    const notesTextarea = document.getElementById('notesTextarea');
    if (notesTextarea) notesTextarea.style.display = 'block';
    
    const rightPanelTitle = document.getElementById('rightPanelTitle');
    if (rightPanelTitle) rightPanelTitle.textContent = 'Заметки';
    
    const deadlineSection = document.getElementById('taskDeadlineSection');
    if (deadlineSection) deadlineSection.style.display = 'none';
    
    const timerSection = document.getElementById('taskTimerSection');
    if (timerSection) {
        timerSection.style.display = 'none';
        // Останавливаем таймер если он был запущен
        stopTaskTimer();
    }
    
    // Убираем выделение задачи
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// Переключение показа завершенных задач
export function toggleCompletedTasks() {
    setShowCompletedTasks(!showCompletedTasks);
    const btn = document.getElementById('showCompletedBtn');
    if (btn) {
        btn.classList.toggle('active', showCompletedTasks);
        btn.textContent = showCompletedTasks ? '✓ Завершенные' : 'Скрыть завершенные';
    }
    loadTasks();
}

// Сохранение срока выполнения задачи
export async function saveTaskDeadline() {
    if (!selectedTaskId) return;
    
    const deadlineInput = document.getElementById('taskDeadlineInput');
    const deadline = deadlineInput.value || null;
    
    try {
        await fetch(`/api/tasks/${selectedTaskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deadline })
        });
        
        // Обновляем список задач для отображения бейджа
        loadTasks();
        
        // Обновляем отображение пинкода в заголовке и секции дедлайна
        const response = await fetch(`/api/projects/${currentProjectId}/tasks?include_completed=true`);
        const tasks = await response.json();
        const task = tasks.find(t => t.id === selectedTaskId);
        
        if (task) {
            // Обновляем заголовок
            const rightPanelTitle = document.getElementById('rightPanelTitle');
            if (rightPanelTitle) {
                rightPanelTitle.innerHTML = `Заметки: ${escapeHtml(task.title)}`;
            }
        }
    } catch (error) {
        console.error('Ошибка сохранения срока:', error);
    }
}

// Очистка срока выполнения задачи
export async function clearTaskDeadline() {
    if (!selectedTaskId) return;
    
    document.getElementById('taskDeadlineInput').value = '';
    
    try {
        await fetch(`/api/tasks/${selectedTaskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deadline: null })
        });
        
        // Обновляем список задач
        loadTasks();
        
        // Обновляем отображение пинкода в заголовке и секции дедлайна
        const response = await fetch(`/api/projects/${currentProjectId}/tasks?include_completed=true`);
        const tasks = await response.json();
        const task = tasks.find(t => t.id === selectedTaskId);
        
        if (task) {
            // Обновляем заголовок
            const rightPanelTitle = document.getElementById('rightPanelTitle');
            if (rightPanelTitle) {
                rightPanelTitle.innerHTML = `Заметки: ${escapeHtml(task.title)}`;
            }
        }
    } catch (error) {
        console.error('Ошибка удаления срока:', error);
    }
}

