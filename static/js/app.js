// Глобальные переменные
let currentProjectId = null;
let currentTaskId = null;
let saveTimeout = null;
let selectedTaskId = null;
let isSearchMode = false;
let isPasswordMode = false;
let currentPasswordId = null;
let showCompletedTasks = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка добавления проекта
    document.getElementById('addProjectBtn').addEventListener('click', showProjectModal);
    document.getElementById('closeProjectModal').addEventListener('click', hideProjectModal);
    document.getElementById('cancelProjectBtn').addEventListener('click', hideProjectModal);
    document.getElementById('saveProjectBtn').addEventListener('click', createProject);
    
    // Кнопка добавления задачи
    document.getElementById('addTaskBtn').addEventListener('click', addTask);
    document.getElementById('taskInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            addTask();
        } else if (e.key === 'Enter' && !e.ctrlKey) {
            e.preventDefault();
            addTask();
        }
    });
    
    // Поиск
    document.getElementById('searchInput').addEventListener('input', debounceSearch);
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    
    
    // Сворачивание/разворачивание панели проектов
    document.getElementById('togglePanelBtn').addEventListener('click', toggleProjectsPanel);
    
    // Кнопка паролей
    document.getElementById('passwordsBtn').addEventListener('click', togglePasswordMode);
    const addPasswordBtn = document.getElementById('addPasswordBtn');
    if (addPasswordBtn) {
        addPasswordBtn.addEventListener('click', () => {
            if (!currentProjectId) {
                alert('Выберите проект для создания пароля');
                return;
            }
            clearPasswordForm();
            document.getElementById('passwordForm').style.display = 'block';
        });
    }
    
    // Форма пароля
    document.getElementById('savePasswordBtn').addEventListener('click', savePassword);
    document.getElementById('cancelPasswordBtn').addEventListener('click', cancelPassword);
    document.getElementById('deletePasswordBtn').addEventListener('click', deletePassword);
    document.getElementById('showPasswordBtn').addEventListener('click', togglePasswordVisibility);
    document.getElementById('copyPasswordBtn').addEventListener('click', copyPassword);
    
    // Просмотр пароля
    document.getElementById('showPasswordViewBtn').addEventListener('click', togglePasswordViewVisibility);
    document.getElementById('copyPasswordViewBtn').addEventListener('click', copyPassword);
    
    // Загружаем состояние панели при загрузке
    loadPanelState();
    
    // Модальное окно задачи
    document.getElementById('closeTaskModal').addEventListener('click', hideTaskModal);
    document.getElementById('cancelTaskBtn').addEventListener('click', hideTaskModal);
    document.getElementById('saveTaskBtn').addEventListener('click', saveTask);
    
    // Заметки - автосохранение и вставка изображений
    const notesTextarea = document.getElementById('notesTextarea');
    notesTextarea.addEventListener('input', debounceSaveNotes);
    notesTextarea.addEventListener('paste', handlePasteImage);
    
    // Закрытие модальных окон по клику вне их
    document.getElementById('projectModal').addEventListener('click', (e) => {
        if (e.target.id === 'projectModal') hideProjectModal();
    });
    document.getElementById('taskModal').addEventListener('click', (e) => {
        if (e.target.id === 'taskModal') hideTaskModal();
    });
}

// Загрузка проектов
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = '';
        
        if (projects.length === 0) {
            projectsList.innerHTML = '<div class="empty-state"><p>Нет проектов</p></div>';
            return;
        }
        
        projects.forEach(project => {
            const projectItem = createProjectElement(project);
            projectsList.appendChild(projectItem);
        });
        
        // Выбираем первый проект по умолчанию
        if (projects.length > 0 && !currentProjectId) {
            selectProject(projects[0].id);
        }
    } catch (error) {
        console.error('Ошибка загрузки проектов:', error);
    }
}

// Создание элемента проекта
function createProjectElement(project) {
    const div = document.createElement('div');
    div.className = 'project-item';
    div.dataset.projectId = project.id;
    div.title = project.name; // Подсказка при наведении
    
    // Получаем первую букву названия для иконки
    const initial = project.name.charAt(0).toUpperCase();
    div.dataset.initial = initial;
    
    if (currentProjectId === project.id) {
        div.classList.add('active');
    }
    
    div.innerHTML = `
        <span class="project-name">${escapeHtml(project.name)}</span>
        <button class="project-delete" onclick="deleteProject(${project.id}, event)">×</button>
    `;
    
    div.addEventListener('click', (e) => {
        if (!e.target.classList.contains('project-delete')) {
            selectProject(project.id);
        }
    });
    
    return div;
}

// Выбор проекта
async function selectProject(projectId) {
    currentProjectId = projectId;
    isSearchMode = false;
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    selectedTaskId = null;
    currentPasswordId = null;
    
    // Убираем выделение задач и паролей
    document.querySelectorAll('.task-item, .password-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Обновляем визуальное выделение
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.toggle('active', item.dataset.projectId == projectId);
    });
    
    // Загружаем данные в зависимости от режима
    if (isPasswordMode) {
        document.getElementById('notesTextarea').style.display = 'none';
        document.getElementById('passwordForm').style.display = 'block';
        document.getElementById('rightPanelTitle').textContent = 'Пароль';
        clearPasswordForm();
        await loadPasswords();
    } else {
        const notesTextarea = document.getElementById('notesTextarea');
        notesTextarea.style.display = 'block';
        document.getElementById('passwordForm').style.display = 'none';
        document.getElementById('rightPanelTitle').textContent = 'Заметки';
        await loadTasks();
        await loadNotes();
    }
}

// Создание проекта
function showProjectModal() {
    document.getElementById('projectModal').classList.add('show');
    document.getElementById('projectNameInput').value = '';
    document.getElementById('projectNameInput').focus();
}

function hideProjectModal() {
    document.getElementById('projectModal').classList.remove('show');
}

async function createProject() {
    const name = document.getElementById('projectNameInput').value.trim();
    
    if (!name) {
        alert('Введите название проекта');
        return;
    }
    
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            hideProjectModal();
            loadProjects();
        }
    } catch (error) {
        console.error('Ошибка создания проекта:', error);
        alert('Ошибка при создании проекта');
    }
}

// Удаление проекта
async function deleteProject(projectId, event) {
    event.stopPropagation();
    
    if (!confirm('Удалить проект? Все задачи и заметки будут удалены.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            if (currentProjectId === projectId) {
                currentProjectId = null;
                document.getElementById('tasksContainer').innerHTML = 
                    '<div class="empty-state"><p>Выберите проект или создайте новую задачу</p></div>';
                document.getElementById('notesTextarea').innerHTML = '';
            }
            loadProjects();
        }
    } catch (error) {
        console.error('Ошибка удаления проекта:', error);
        alert('Ошибка при удалении проекта');
    }
}

// Загрузка задач
async function loadTasks() {
    if (!currentProjectId && !isSearchMode) return;
    
    try {
        let tasks = [];
        if (isSearchMode) {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) {
                isSearchMode = false;
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
            container.innerHTML = '<div class="empty-state"><p>Нет задач. Создайте новую задачу!</p></div>';
            return;
        }
        
        container.innerHTML = '';
        tasks.forEach(task => {
            container.appendChild(createTaskElement(task, task.project_name || null));
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
            <div class="task-title">${escapeHtml(task.title)}${deadlineBadge}</div>
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
async function addTask() {
    if (!currentProjectId && !isSearchMode) {
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
    
    try {
        const response = await fetch(`/api/projects/${currentProjectId}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        });
        
        if (response.ok) {
            input.value = '';
            loadTasks();
        }
    } catch (error) {
        console.error('Ошибка создания задачи:', error);
        alert('Ошибка при создании задачи');
    }
}

// Переключение статуса задачи
async function toggleTask(taskId, completed, event) {
    if (event) event.stopPropagation();
    
    // Если задача закрывается, добавляем анимацию скрытия
    if (completed) {
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
            setTimeout(() => loadTasks(), 600);
        } else if (!completed) {
            // Если задача открывается обратно, перезагружаем
            loadTasks();
        }
    } catch (error) {
        console.error('Ошибка обновления задачи:', error);
    }
}

// Редактирование задачи
async function editTask(taskId, event) {
    if (event) event.stopPropagation();
    currentTaskId = taskId;
    
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
            document.getElementById('taskModal').classList.add('show');
            document.getElementById('taskTitleInput').focus();
        }
    } catch (error) {
        console.error('Ошибка загрузки задачи:', error);
    }
}

function hideTaskModal() {
    document.getElementById('taskModal').classList.remove('show');
    currentTaskId = null;
}

async function saveTask() {
    if (!currentTaskId) return;
    
    const title = document.getElementById('taskTitleInput').value.trim();
    
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
            body: JSON.stringify({ title })
        });
        
        if (response.ok) {
            hideTaskModal();
            loadTasks();
        }
    } catch (error) {
        console.error('Ошибка сохранения задачи:', error);
        alert('Ошибка при сохранении задачи');
    }
}

// Удаление задачи
async function deleteTask(taskId, event) {
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

// Загрузка заметок
async function loadNotes() {
    const notesTextarea = document.getElementById('notesTextarea');
    if (!notesTextarea) return;
    
    // Если выбрана задача, загружаем заметки задачи
    if (selectedTaskId) {
        try {
            const response = await fetch(`/api/tasks/${selectedTaskId}/notes`);
            if (!response.ok) {
                console.error('Ошибка загрузки заметок задачи:', response.status);
                notesTextarea.innerHTML = '';
                return;
            }
            const data = await response.json();
            notesTextarea.innerHTML = data.content || '';
            return;
        } catch (error) {
            console.error('Ошибка загрузки заметок задачи:', error);
            notesTextarea.innerHTML = '';
            return;
        }
    }
    
    // Иначе загружаем заметки проекта
    if (!currentProjectId) {
        notesTextarea.innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${currentProjectId}/notes`);
        if (!response.ok) {
            console.error('Ошибка загрузки заметок проекта:', response.status);
            notesTextarea.innerHTML = '';
            return;
        }
        const data = await response.json();
        notesTextarea.innerHTML = data.content || '';
    } catch (error) {
        console.error('Ошибка загрузки заметок проекта:', error);
        notesTextarea.innerHTML = '';
    }
}

// Сохранение заметок с задержкой
function debounceSaveNotes() {
    const indicator = document.getElementById('saveIndicator');
    indicator.textContent = 'Сохранение...';
    indicator.classList.add('show', 'saving');
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveNotes();
    }, 1000);
}

async function saveNotes() {
    const notesTextarea = document.getElementById('notesTextarea');
    if (!notesTextarea) return;
    
    const content = notesTextarea.innerHTML;
    
    // Если выбрана задача, сохраняем заметки задачи
    if (selectedTaskId) {
        try {
            const response = await fetch(`/api/tasks/${selectedTaskId}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });
            
            if (response.ok) {
                const indicator = document.getElementById('saveIndicator');
                indicator.textContent = 'Сохранено';
                indicator.classList.remove('saving');
                
                setTimeout(() => {
                    indicator.classList.remove('show');
                }, 2000);
            }
            return;
        } catch (error) {
            console.error('Ошибка сохранения заметок задачи:', error);
            const indicator = document.getElementById('saveIndicator');
            indicator.textContent = 'Ошибка';
            indicator.classList.add('saving');
            return;
        }
    }
    
    // Иначе сохраняем заметки проекта
    if (!currentProjectId) return;
    
    try {
        const response = await fetch(`/api/projects/${currentProjectId}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            const indicator = document.getElementById('saveIndicator');
            indicator.textContent = 'Сохранено';
            indicator.classList.remove('saving');
            
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 2000);
        }
    } catch (error) {
        console.error('Ошибка сохранения заметок проекта:', error);
        const indicator = document.getElementById('saveIndicator');
        indicator.textContent = 'Ошибка';
        indicator.classList.add('saving');
    }
}

// Обработка вставки изображений из буфера обмена
function handlePasteImage(e) {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Проверяем, является ли элемент изображением
        if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            
            const file = item.getAsFile();
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const img = document.createElement('img');
                img.src = event.target.result;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.borderRadius = '8px';
                img.style.margin = '10px 0';
                img.style.display = 'block';
                
                // Вставляем изображение в текущую позицию курсора
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(img);
                    
                    // Перемещаем курсор после изображения
                    range.setStartAfter(img);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    // Если нет выделения, просто добавляем в конец
                    const notesTextarea = document.getElementById('notesTextarea');
                    notesTextarea.appendChild(img);
                }
                
                // Сохраняем заметки после вставки изображения
                debounceSaveNotes();
            };
            
            reader.readAsDataURL(file);
            break;
        }
    }
}

// Сворачивание/разворачивание панели проектов
async function toggleProjectsPanel() {
    const panel = document.getElementById('projectsPanel');
    const isCollapsed = panel.classList.contains('collapsed');
    const newState = !isCollapsed;
    
    panel.classList.toggle('collapsed', newState);
    
    // Сохраняем состояние
    try {
        const response = await fetch('/api/ui-state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key: 'projects_panel_collapsed', value: newState ? '1' : '0' })
        });
        if (!response.ok) {
            console.warn('Не удалось сохранить состояние панели:', response.status);
        }
    } catch (error) {
        console.warn('Ошибка сохранения состояния панели:', error);
        // Игнорируем ошибку, состояние все равно изменено визуально
    }
}

// Загрузка состояния панели
async function loadPanelState() {
    try {
        const response = await fetch('/api/ui-state?key=projects_panel_collapsed');
        if (!response.ok) {
            console.warn('Не удалось загрузить состояние панели:', response.status);
            return;
        }
        const data = await response.json();
        const isCollapsed = data.value === '1';
        
        if (isCollapsed) {
            document.getElementById('projectsPanel').classList.add('collapsed');
        }
    } catch (error) {
        console.warn('Ошибка загрузки состояния панели:', error);
        // Игнорируем ошибку, продолжаем работу
    }
}

// Поиск задач
let searchTimeout = null;
function debounceSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const clearBtn = document.getElementById('clearSearchBtn');
    
    clearBtn.style.display = query ? 'flex' : 'none';
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (query) {
            isSearchMode = true;
            selectedTaskId = null;
            closeTaskDescription();
            loadTasks();
        } else {
            isSearchMode = false;
            if (currentProjectId) {
                loadTasks();
            }
        }
    }, 300);
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    isSearchMode = false;
    if (currentProjectId) {
        loadTasks();
    }
}

// Показать заметки при клике на задачу
async function selectTaskForDescription(taskId) {
    // Получаем задачу из текущего списка
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskElement) {
        console.warn('Элемент задачи не найден:', taskId);
        return;
    }
    
    // Если проект не выбран, не можем показать заметки
    if (!currentProjectId) {
        alert('Выберите проект для просмотра заметок');
        return;
    }
    
    // Обновляем выделение задачи
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.taskId == taskId);
    });
    
    // Сохраняем выбранную задачу и показываем заметки проекта
    selectedTaskId = taskId;
    
    // Загружаем данные задачи для отображения срока
    try {
        const response = await fetch(`/api/projects/${currentProjectId}/tasks?include_completed=true`);
        const tasks = await response.json();
        const task = tasks.find(t => t.id === taskId);
        
        if (task) {
            // Обновляем заголовок с названием задачи
            const rightPanelTitle = document.getElementById('rightPanelTitle');
            if (rightPanelTitle) {
                rightPanelTitle.textContent = `Заметки: ${escapeHtml(task.title)}`;
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
        }
    } catch (error) {
        console.error('Ошибка загрузки задачи:', error);
    }
    
    // Убеждаемся, что заметки видны
    const notesTextarea = document.getElementById('notesTextarea');
    if (notesTextarea) {
        notesTextarea.style.display = 'block';
    }
    
    // Показываем и загружаем заметки
    showMainNotes();
    
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

function closeTaskDescription() {
    selectedTaskId = null;
    const notesTextarea = document.getElementById('notesTextarea');
    if (notesTextarea) notesTextarea.style.display = 'block';
    
    const rightPanelTitle = document.getElementById('rightPanelTitle');
    if (rightPanelTitle) rightPanelTitle.textContent = 'Заметки';
    
    const deadlineSection = document.getElementById('taskDeadlineSection');
    if (deadlineSection) deadlineSection.style.display = 'none';
    
    // Убираем выделение задачи
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// Показать заметки проекта
function showMainNotes() {
    // Убеждаемся, что заметки видны
    const notesTextarea = document.getElementById('notesTextarea');
    if (notesTextarea) {
        notesTextarea.style.display = 'block';
    }
    const rightPanelTitle = document.getElementById('rightPanelTitle');
    if (rightPanelTitle) {
        // Если выбрана задача, название уже установлено в selectTaskForDescription
        if (!selectedTaskId) {
            rightPanelTitle.textContent = 'Заметки';
        }
    }
    
    // Загружаем заметки
    loadNotes();
}

// Переключение показа завершенных задач
function toggleCompletedTasks() {
    showCompletedTasks = !showCompletedTasks;
    const btn = document.getElementById('showCompletedBtn');
    btn.classList.toggle('active', showCompletedTasks);
    btn.textContent = showCompletedTasks ? '✓ Завершенные' : 'Скрыть завершенные';
    loadTasks();
}

// Сохранение срока выполнения задачи
async function saveTaskDeadline() {
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
    } catch (error) {
        console.error('Ошибка сохранения срока:', error);
    }
}

// Очистка срока выполнения задачи
async function clearTaskDeadline() {
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
    } catch (error) {
        console.error('Ошибка удаления срока:', error);
    }
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Переключение режима паролей
function togglePasswordMode() {
    isPasswordMode = !isPasswordMode;
    const btn = document.getElementById('passwordsBtn');
    if (btn) {
        btn.classList.toggle('active', isPasswordMode);
        // Меняем текст кнопки
        if (isPasswordMode) {
            btn.textContent = '📋 Задачи';
            btn.title = 'Вернуться к задачам';
        } else {
            btn.textContent = '🔐 Пароли';
            btn.title = 'Менеджер паролей';
        }
    }
    
    // Очищаем выбранную задачу и пароль
    selectedTaskId = null;
    currentPasswordId = null;
    const deadlineSection = document.getElementById('taskDeadlineSection');
    if (deadlineSection) {
        deadlineSection.style.display = 'none';
    }
    
    // Скрываем модальное окно пароля
    hidePasswordModal();
    hidePasswordView();
    
    if (isPasswordMode) {
        const leftTitle = document.getElementById('leftSectionTitle');
        if (leftTitle) leftTitle.textContent = 'Пароли';
        
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) searchContainer.style.display = 'none';
        
        const taskInputContainer = document.getElementById('taskInputContainer');
        if (taskInputContainer) {
            taskInputContainer.style.display = 'none';
            // Очищаем поле ввода задач
            const taskInput = document.getElementById('taskInput');
            if (taskInput) taskInput.value = '';
        }
        
        const showCompletedBtn = document.getElementById('showCompletedBtn');
        if (showCompletedBtn) showCompletedBtn.style.display = 'none';
        
        const addPasswordBtn = document.getElementById('addPasswordBtn');
        if (addPasswordBtn) addPasswordBtn.style.display = 'block';
        
        const rightTitle = document.getElementById('rightPanelTitle');
        if (rightTitle) rightTitle.textContent = 'Пароль';
        
        const notesTextarea = document.getElementById('notesTextarea');
        if (notesTextarea) notesTextarea.style.display = 'none';
        
        const passwordView = document.getElementById('passwordView');
        if (passwordView) passwordView.style.display = 'none';
        
        clearPasswordForm();
        
        // Очищаем контейнер задач и убираем выделение
        const tasksContainer = document.getElementById('tasksContainer');
        if (tasksContainer) {
            // Удаляем все дочерние элементы
            while (tasksContainer.firstChild) {
                tasksContainer.removeChild(tasksContainer.firstChild);
            }
        }
        document.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Загружаем пароли
        if (currentProjectId) {
            setTimeout(() => loadPasswords(), 100);
        } else {
            if (tasksContainer) {
                tasksContainer.innerHTML = '<div class="empty-state"><p>Выберите проект</p></div>';
            }
        }
    } else {
        const leftTitle = document.getElementById('leftSectionTitle');
        if (leftTitle) leftTitle.textContent = 'Задачи';
        
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) searchContainer.style.display = 'flex';
        
        const taskInputContainer = document.getElementById('taskInputContainer');
        if (taskInputContainer) taskInputContainer.style.display = 'flex';
        
        const showCompletedBtn = document.getElementById('showCompletedBtn');
        if (showCompletedBtn) showCompletedBtn.style.display = 'block';
        
        const addPasswordBtn = document.getElementById('addPasswordBtn');
        if (addPasswordBtn) addPasswordBtn.style.display = 'none';
        
        const rightTitle = document.getElementById('rightPanelTitle');
        if (rightTitle) rightTitle.textContent = 'Заметки';
        
        const notesTextarea = document.getElementById('notesTextarea');
        if (notesTextarea) notesTextarea.style.display = 'block';
        
        const passwordView = document.getElementById('passwordView');
        if (passwordView) passwordView.style.display = 'none';
        
        hidePasswordModal();
        clearPasswordForm();
        
        // Убираем выделение паролей
        document.querySelectorAll('.password-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        if (currentProjectId) {
            loadTasks();
            loadNotes();
        }
    }
}

// Загрузка паролей
async function loadPasswords() {
    if (!currentProjectId) return;
    
    try {
        const response = await fetch(`/api/projects/${currentProjectId}/passwords`);
        const passwords = await response.json();
        
        const container = document.getElementById('tasksContainer');
        
        if (passwords.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Нет паролей. Создайте новый пароль!</p></div>';
            return;
        }
        
        container.innerHTML = '';
        passwords.forEach(password => {
            container.appendChild(createPasswordElement(password));
        });
    } catch (error) {
        console.error('Ошибка загрузки паролей:', error);
    }
}

// Создание элемента пароля
function createPasswordElement(password) {
    const div = document.createElement('div');
    div.className = `password-item ${currentPasswordId === password.id ? 'selected' : ''}`;
    div.dataset.passwordId = password.id;
    
    div.innerHTML = `
        <div class="password-item-name">${escapeHtml(password.name)}</div>
        ${password.username ? `<div class="password-item-username">${escapeHtml(password.username)}</div>` : ''}
        ${password.url ? `<a href="${escapeHtml(password.url)}" target="_blank" class="password-item-url" onclick="event.stopPropagation()">${escapeHtml(password.url)}</a>` : ''}
    `;
    
    div.addEventListener('click', () => {
        selectPassword(password.id);
    });
    
    return div;
}

// Выбор пароля
async function selectPassword(passwordId) {
    currentPasswordId = passwordId;
    
    // Обновляем выделение
    document.querySelectorAll('.password-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.passwordId == passwordId);
    });
    
    // Загружаем данные пароля
    try {
        const response = await fetch(`/api/passwords/${passwordId}`);
        const password = await response.json();
        
        // Показываем просмотр пароля
        document.getElementById('passwordViewTitle').textContent = password.name || 'Пароль';
        document.getElementById('passwordViewName').textContent = password.name || '-';
        document.getElementById('passwordViewUsername').textContent = password.username || '-';
        document.getElementById('passwordViewUrl').innerHTML = password.url ? 
            `<a href="${escapeHtml(password.url)}" target="_blank" class="password-view-link">${escapeHtml(password.url)}</a>` : '-';
        document.getElementById('passwordViewNotes').textContent = password.notes || '-';
        
        // Сохраняем пароль для показа/копирования
        const passwordView = document.getElementById('passwordView');
        passwordView.dataset.password = password.password || '';
        
        // Сбрасываем состояние показа пароля
        const passwordDiv = document.getElementById('passwordViewPassword');
        passwordDiv.textContent = '••••••••';
        passwordDiv.classList.add('password-hidden');
        document.getElementById('showPasswordViewBtn').textContent = '👁';
        
        showPasswordView();
    } catch (error) {
        console.error('Ошибка загрузки пароля:', error);
    }
}

// Сохранение пароля
async function savePassword() {
    if (!currentProjectId) {
        alert('Выберите проект');
        return;
    }
    
    const name = document.getElementById('passwordName').value.trim();
    const password = document.getElementById('passwordValue').value.trim();
    
    if (!name || !password) {
        alert('Заполните название и пароль');
        return;
    }
    
    const data = {
        name: name,
        username: document.getElementById('passwordUsername').value.trim(),
        password: password,
        url: document.getElementById('passwordUrl').value.trim(),
        notes: document.getElementById('passwordNotes').value.trim()
    };
    
    try {
        let response;
        if (currentPasswordId) {
            // Обновление
            response = await fetch(`/api/passwords/${currentPasswordId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Создание
            response = await fetch(`/api/projects/${currentProjectId}/passwords`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        
        if (response.ok) {
            clearPasswordForm();
            hidePasswordModal();
            loadPasswords();
            hidePasswordView();
        }
    } catch (error) {
        console.error('Ошибка сохранения пароля:', error);
        alert('Ошибка при сохранении пароля');
    }
}

// Отмена редактирования пароля
function cancelPassword() {
    clearPasswordForm();
    hidePasswordModal();
}

// Показать модальное окно пароля
function showPasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
        const title = document.getElementById('passwordModalTitle');
        if (currentPasswordId) {
            if (title) title.textContent = 'Редактировать пароль';
            document.getElementById('deletePasswordBtn').style.display = 'block';
        } else {
            if (title) title.textContent = 'Новый пароль';
            document.getElementById('deletePasswordBtn').style.display = 'none';
        }
        modal.classList.add('show');
    }
}

// Скрыть модальное окно пароля
function hidePasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Показать просмотр пароля
function showPasswordView() {
    const view = document.getElementById('passwordView');
    if (view) {
        view.style.display = 'block';
    }
}

// Скрыть просмотр пароля
function hidePasswordView() {
    const view = document.getElementById('passwordView');
    if (view) {
        view.style.display = 'none';
    }
}

// Очистка формы пароля
function clearPasswordForm() {
    document.getElementById('passwordName').value = '';
    document.getElementById('passwordUsername').value = '';
    document.getElementById('passwordValue').value = '';
    document.getElementById('passwordUrl').value = '';
    document.getElementById('passwordNotes').value = '';
    document.getElementById('deletePasswordBtn').style.display = 'none';
    currentPasswordId = null;
    document.getElementById('passwordValue').type = 'password';
    document.getElementById('showPasswordBtn').textContent = '👁';
    
    // Убираем выделение
    document.querySelectorAll('.password-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// Удаление пароля
async function deletePassword() {
    if (!currentPasswordId) return;
    
    if (!confirm('Удалить пароль?')) return;
    
    try {
        const response = await fetch(`/api/passwords/${currentPasswordId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            clearPasswordForm();
            hidePasswordModal();
            loadPasswords();
            hidePasswordView();
        }
    } catch (error) {
        console.error('Ошибка удаления пароля:', error);
        alert('Ошибка при удалении пароля');
    }
}

// Показать/скрыть пароль
function togglePasswordVisibility() {
    const input = document.getElementById('passwordValue');
    const btn = document.getElementById('showPasswordBtn');
    
    if (!input || !btn) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁';
    }
}

// Показать/скрыть пароль в просмотре
function togglePasswordViewVisibility() {
    const passwordView = document.getElementById('passwordView');
    if (!passwordView || !passwordView.dataset.password) return;
    
    const passwordDiv = document.getElementById('passwordViewPassword');
    const btn = document.getElementById('showPasswordViewBtn');
    
    if (!passwordDiv || !btn) return;
    
    if (passwordDiv.classList.contains('password-hidden')) {
        passwordDiv.textContent = passwordView.dataset.password;
        passwordDiv.classList.remove('password-hidden');
        btn.textContent = '🙈';
    } else {
        passwordDiv.textContent = '••••••••';
        passwordDiv.classList.add('password-hidden');
        btn.textContent = '👁';
    }
}

// Копировать пароль
async function copyPassword() {
    const passwordInput = document.getElementById('passwordValue');
    const passwordView = document.getElementById('passwordView');
    let password = '';
    
    if (passwordInput) {
        password = passwordInput.value;
    } else if (passwordView && passwordView.dataset.password) {
        password = passwordView.dataset.password;
    }
    
    if (!password) {
        alert('Пароль пуст');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(password);
        const btn = document.getElementById('copyPasswordBtn');
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.style.background = 'var(--success)';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    } catch (error) {
        // Fallback для старых браузеров
        const input = document.createElement('input');
        input.value = password;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('Пароль скопирован');
    }
}

