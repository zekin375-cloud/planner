// Работа с проектами

import { escapeHtml } from './utils.js';
import { currentProjectId, setCurrentProjectId, isSearchMode, setIsSearchMode, selectedTaskId, setSelectedTaskId, currentPasswordId, setCurrentPasswordId, isPasswordMode, setIsPasswordMode } from './state.js';
import { loadTasks, addTask } from './tasks.js';
import { loadNotes } from './notes.js';
import { loadPasswords, clearPasswordForm, togglePasswordMode } from './passwords.js';
import { apiGet, apiPost, apiPut, apiDelete } from './api.js';
import { hideProjectsPanel } from './ui.js';

// Загрузка проектов
export async function loadProjects() {
    try {
        // Всегда используем apiGet для единообразия
        let projects;
        try {
            projects = await apiGet('api/projects');
        } catch (error) {
            console.error('Ошибка загрузки проектов:', error);
            // Показываем понятное сообщение об ошибке
            const projectsList = document.getElementById('projectsList');
            if (projectsList) {
                const errorMessage = error.message || 'Не удалось загрузить проекты';
                projectsList.innerHTML = `<div class="empty-state"><p style="color: var(--danger);">Ошибка: ${escapeHtml(errorMessage)}</p><p style="margin-top: 10px; font-size: 12px;">Проверьте настройки сервера в меню пользователя.</p></div>`;
            }
            throw error; // Пробрасываем ошибку дальше
        }
        
        const projectsList = document.getElementById('projectsList');
        if (!projectsList) {
            console.error('Элемент projectsList не найден');
            return;
        }
        projectsList.innerHTML = '';
        
        // Добавляем обычные проекты в список
        if (projects.length === 0) {
            // Если нет других проектов, выбираем "Ежедневник"
            if (!currentProjectId) {
                selectProject(-1);
            }
        } else {
            projects.forEach(project => {
                const projectItem = createProjectElement(project);
                projectsList.appendChild(projectItem);
            });
        }
        
        // Добавляем "Ежедневник" и "Все задачи" в footer
        const projectsFooterList = document.getElementById('projectsFooterList');
        projectsFooterList.innerHTML = '';
        
        // Добавляем "Ежедневник"
        const dailyNotesProject = {
            id: -1,
            name: '📔 Ежедневник',
            monthly_price: 0,
            is_subscription: false,
            payment_date: null
        };
        const dailyNotesItem = createProjectElement(dailyNotesProject);
        projectsFooterList.appendChild(dailyNotesItem);
        
        // Добавляем общий проект "Все задачи"
        const allTasksProject = {
            id: 0,
            name: '📋 Все задачи',
            monthly_price: 0,
            is_subscription: false,
            payment_date: null
        };
        const allTasksItem = createProjectElement(allTasksProject);
        projectsFooterList.appendChild(allTasksItem);
        
        // Выбираем "Все задачи" по умолчанию только если нет параметров в URL
        // Роутер сам восстановит состояние из URL если есть параметры
        const urlParams = new URLSearchParams(window.location.search);
        const projectParam = urlParams.get('project');
        
        if (!currentProjectId && projectParam === null) {
            // Нет проекта в состоянии и нет в URL - выбираем по умолчанию
            selectProject(0); // Выбираем "Все задачи" по умолчанию
        }
        
        // Обновляем счетчики задач (уже включены в данные проектов)
    } catch (error) {
        console.error('Ошибка загрузки проектов (внешний catch):', error);
        // Если ошибка не была обработана во внутреннем try-catch, показываем сообщение
        const projectsList = document.getElementById('projectsList');
        if (projectsList) {
            const errorMessage = error.message || 'Не удалось загрузить проекты';
            projectsList.innerHTML = `<div class="empty-state"><p style="color: var(--danger);">Ошибка: ${escapeHtml(errorMessage)}</p><p style="margin-top: 10px; font-size: 12px;">Проверьте настройки сервера в меню пользователя.</p></div>`;
        }
        throw error; // Пробрасываем ошибку дальше
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
    
    // Для проектов "Ежедневник" (id = -1) и "Все задачи" (id = 0) не показываем кнопку удаления и не делаем перетаскиваемыми
    const deleteButton = (project.id === -1 || project.id === 0) ? '' : `<button class="project-delete" onclick="deleteProject(${project.id}, event)">×</button>`;
    
    // Получаем количество задач (для виртуальных проектов не показываем)
    const taskCount = (project.id !== -1 && project.id !== 0 && project.task_count !== undefined) ? project.task_count : null;
    const taskCountBadge = taskCount !== null && taskCount > 0 ? `<span class="project-task-count">${taskCount}</span>` : '';
    
    div.innerHTML = `
        <span class="project-name">${escapeHtml(project.name)}</span>
        ${taskCountBadge}
        ${deleteButton}
    `;
    
    // Делаем перетаскиваемым только обычные проекты (не -1 и не 0)
    if (project.id !== -1 && project.id !== 0) {
        div.draggable = true;
        div.classList.add('draggable');
        
        // Обработчики drag and drop
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragend', handleDragEnd);
        div.addEventListener('dragenter', handleDragEnter);
        div.addEventListener('dragleave', handleDragLeave);
    }
    
    div.addEventListener('click', (e) => {
        if (!e.target.classList.contains('project-delete')) {
            selectProject(project.id);
        }
    });
    
    return div;
}

// Переменные для drag and drop
let draggedElement = null;
let draggedOverElement = null;

// Обработчики drag and drop
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    // Не разрешаем перетаскивание на "Ежедневник" и "Все задачи"
    if (this.dataset.projectId === '-1' || this.dataset.projectId === '0') {
        return false;
    }
    
    if (draggedElement !== this && this.classList.contains('draggable')) {
        const rect = this.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        
        if (e.clientY < midpoint) {
            this.classList.add('drag-over-top');
            this.classList.remove('drag-over-bottom');
        } else {
            this.classList.add('drag-over-bottom');
            this.classList.remove('drag-over-top');
        }
    }
    
    return false;
}

function handleDragEnter(e) {
    if (this.dataset.projectId === '-1' || this.dataset.projectId === '0') {
        return;
    }
    if (this !== draggedElement && this.classList.contains('draggable')) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    // Не разрешаем перетаскивание на "Ежедневник" и "Все задачи"
    if (this.dataset.projectId === '-1' || this.dataset.projectId === '0') {
        return false;
    }
    
    if (draggedElement !== this && this.classList.contains('draggable')) {
        const rect = this.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midpoint;
        
        if (insertBefore) {
            this.parentNode.insertBefore(draggedElement, this);
        } else {
            this.parentNode.insertBefore(draggedElement, this.nextSibling);
        }
        
        // Сохраняем новый порядок
        saveProjectsOrder();
    }
    
    this.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Убираем все классы drag-over
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
    });
}

// Сохранение порядка проектов
async function saveProjectsOrder() {
    const projectsList = document.getElementById('projectsList');
    const projectItems = projectsList.querySelectorAll('.project-item.draggable');
    
    const orders = Array.from(projectItems).map((item, index) => ({
        id: parseInt(item.dataset.projectId),
        order: index
    }));
    
    try {
        const response = await fetch('/api/projects/order', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orders })
        });
        
        if (!response.ok) {
            console.error('Ошибка сохранения порядка проектов');
        }
    } catch (error) {
        console.error('Ошибка сохранения порядка проектов:', error);
    }
}

// Выбор проекта
export async function selectProject(projectId) {
    setCurrentProjectId(projectId);
    setIsSearchMode(false);
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    setSelectedTaskId(null);
    setCurrentPasswordId(null);
    
    // Закрываем панель проектов на мобильных устройствах
    if (window.innerWidth <= 768) {
        hideProjectsPanel();
    }
    
    // Если открыта статистика, скрываем её
    const statsMenu = document.getElementById('statsMenu');
    const projectsList = document.getElementById('projectsList');
    const mainContent = document.getElementById('mainContent');
    const tasksSection = document.querySelector('.tasks-section');
    const notesSection = document.querySelector('.notes-section');
    
    if (statsMenu && statsMenu.style.display === 'block') {
        // Скрываем меню статистики
        statsMenu.style.display = 'none';
        // Показываем список проектов
        if (projectsList) projectsList.style.display = 'block';
        // Скрываем статистику
        if (mainContent) mainContent.style.display = 'none';
        // Показываем обычный контент
        if (tasksSection) tasksSection.style.display = 'block';
        if (notesSection) notesSection.style.display = 'block';
    }
    
    // Обновляем маршрут
    const { updateProjectRoute } = await import('./router.js');
    updateProjectRoute(projectId);
    
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
        const notesTextarea = document.getElementById('notesTextarea');
        if (notesTextarea) notesTextarea.style.display = 'none';
        const passwordView = document.getElementById('passwordView');
        if (passwordView) passwordView.style.display = 'none';
        const rightTitle = document.getElementById('rightPanelTitle');
        if (rightTitle) rightTitle.textContent = 'Пароль';
        clearPasswordForm();
        await loadPasswords();
    } else {
        const notesTextarea = document.getElementById('notesTextarea');
        if (notesTextarea) {
            notesTextarea.style.display = 'block';
            // Включаем редактирование для заметок проектов (кроме статистики)
            if (projectId !== 0) {
                notesTextarea.contentEditable = 'true';
            }
        }
        const passwordView = document.getElementById('passwordView');
        if (passwordView) passwordView.style.display = 'none';
        const rightTitle = document.getElementById('rightPanelTitle');
        if (rightTitle) {
            if (projectId === -1) {
                rightTitle.textContent = 'Ежедневник';
            } else if (projectId === 0) {
                rightTitle.textContent = 'Все задачи';
            } else {
                rightTitle.textContent = 'Заметки';
            }
        }
        
        // Для "Ежедневник" загружаем список заметок
        if (projectId === -1) {
            // Обновляем заголовок левой секции
            const leftTitle = document.getElementById('leftSectionTitle');
            if (leftTitle) {
                leftTitle.textContent = 'Ежедневник';
            }
            
            // Скрываем поиск для ежедневника
            const searchContainer = document.getElementById('searchContainer');
            if (searchContainer) {
                searchContainer.style.display = 'none';
            }
            
            // Показываем кнопку календаря, скрываем кнопку завершенных
            const calendarBtn = document.getElementById('calendarBtn');
            const showCompletedBtn = document.getElementById('showCompletedBtn');
            if (calendarBtn) calendarBtn.style.display = 'block';
            if (showCompletedBtn) showCompletedBtn.style.display = 'none';
            
            // Показываем кнопку добавления заметки вместо поля ввода задач
            const taskInputContainer = document.getElementById('taskInputContainer');
            if (taskInputContainer) {
                taskInputContainer.innerHTML = `
                    <button class="btn-add-task" id="addDailyNoteBtn" style="width: 100%;">
                        <span class="icon">+</span> Добавить заметку
                    </button>
                `;
                taskInputContainer.style.display = 'flex';
                
                // Добавляем обработчик для кнопки добавления заметки
                const addBtn = document.getElementById('addDailyNoteBtn');
                if (addBtn) {
                    addBtn.addEventListener('click', async () => {
                        const { addDailyNote } = await import('./daily-notes.js');
                        await addDailyNote();
                    });
                }
            }
            
            // Загружаем список заметок ежедневника
            const { loadDailyNotes } = await import('./daily-notes.js');
            await loadDailyNotes();
            
            // Очищаем правую панель
            const notesTextarea = document.getElementById('notesTextarea');
            const calendarView = document.getElementById('calendarView');
            if (notesTextarea) {
                notesTextarea.innerHTML = '';
                notesTextarea.style.display = 'block';
                notesTextarea.contentEditable = 'true';
            }
            if (calendarView) {
                calendarView.style.display = 'none';
            }
            const rightTitle = document.getElementById('rightPanelTitle');
            if (rightTitle) {
                rightTitle.textContent = 'Ежедневник';
            }
            
            // На мобильных скрываем секцию заметок при загрузке списка (без выбора конкретной заметки)
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
        } else if (projectId === 0) {
            // Для "Все задачи" загружаем все задачи из всех проектов
            const leftTitle = document.getElementById('leftSectionTitle');
            if (leftTitle) {
                leftTitle.textContent = 'Все задачи';
            }
            
            // Показываем поиск для "Все задачи"
            const searchContainer = document.getElementById('searchContainer');
            if (searchContainer) {
                searchContainer.style.display = 'flex';
            }
            
            // Показываем кнопку завершенных
            const showCompletedBtn = document.getElementById('showCompletedBtn');
            if (showCompletedBtn) {
                showCompletedBtn.style.display = 'block';
            }
            
            // Восстанавливаем поле ввода задач
            const taskInputContainer = document.getElementById('taskInputContainer');
            if (taskInputContainer) {
                taskInputContainer.innerHTML = `
                    <input type="text" id="taskInput" class="task-input" placeholder="Добавить новую задачу..." autocomplete="off">
                    <button class="btn-add-task" id="addTaskBtn">
                        <span class="icon">+</span>
                    </button>
                `;
                taskInputContainer.style.display = 'flex';
                
                // Добавляем обработчики для поля ввода задач
                const taskInput = document.getElementById('taskInput');
                const addTaskBtn = document.getElementById('addTaskBtn');
                if (taskInput) {
                    taskInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                            addTask();
                        } else if (e.key === 'Enter' && !e.ctrlKey) {
                            e.preventDefault();
                            addTask();
                        }
                    });
                }
                if (addTaskBtn) {
                    addTaskBtn.addEventListener('click', addTask);
                }
            }
            
            // Загружаем все задачи
            await loadTasks();
            
            // Загружаем статистику вместо заметок
            const notesTextarea = document.getElementById('notesTextarea');
            const rightTitle = document.getElementById('rightPanelTitle');
            if (notesTextarea) {
                notesTextarea.style.display = 'block';
            }
            if (rightTitle) {
                rightTitle.textContent = 'Статистика';
            }
            
            // Загружаем статистику
            const { loadStatistics } = await import('./statistics.js');
            await loadStatistics();
        } else {
            // Обновляем заголовок левой секции для обычных проектов
            const leftTitle = document.getElementById('leftSectionTitle');
            if (leftTitle) {
                leftTitle.textContent = 'Задачи';
            }
            
            // Показываем поиск для обычных проектов
            const searchContainer = document.getElementById('searchContainer');
            if (searchContainer) {
                searchContainer.style.display = 'flex';
            }
            
            // Скрываем кнопку календаря, показываем кнопку завершенных
            const calendarBtn = document.getElementById('calendarBtn');
            const showCompletedBtn = document.getElementById('showCompletedBtn');
            if (calendarBtn) calendarBtn.style.display = 'none';
            if (showCompletedBtn) showCompletedBtn.style.display = 'block';
            
            // Показываем секцию задач
            const taskInputContainer = document.getElementById('taskInputContainer');
            if (taskInputContainer) {
                taskInputContainer.innerHTML = `
                    <input type="text" id="taskInput" class="task-input" placeholder="Добавить новую задачу..." autocomplete="off">
                    <button class="btn-add-task" id="addTaskBtn">
                        <span class="icon">+</span>
                    </button>
                `;
                taskInputContainer.style.display = 'flex';
                
                // Переустанавливаем обработчики для кнопки добавления задачи
                const addTaskBtn = document.getElementById('addTaskBtn');
                const taskInput = document.getElementById('taskInput');
                if (addTaskBtn) {
                    addTaskBtn.addEventListener('click', addTask);
                }
                if (taskInput) {
                    taskInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                            addTask();
                        } else if (e.key === 'Enter' && !e.ctrlKey) {
                            e.preventDefault();
                            addTask();
                        }
                    });
                }
            }
            await loadTasks();
            
        // Загружаем заметки (для конкретного проекта)
        await loadNotes();
        
        // На мобильных скрываем секцию заметок при выборе проекта без задачи
        if (window.innerWidth <= 768) {
            const notesSection = document.querySelector('.notes-section');
            const closeNotesBtn = document.getElementById('closeNotesBtn');
            if (notesSection && !selectedTaskId) {
                notesSection.classList.remove('task-selected');
                document.body.style.overflow = '';
            }
            if (closeNotesBtn) {
                closeNotesBtn.style.display = 'none';
            }
        }
        }
    }
}

// Создание проекта
export function showProjectModal() {
    document.getElementById('projectModal').classList.add('show');
    document.getElementById('projectNameInput').value = '';
    document.getElementById('projectIsSubscription').checked = false;
    document.getElementById('projectMonthlyPriceInput').value = '';
    document.getElementById('projectPaymentDateInput').value = '';
    document.getElementById('projectSubscriptionFields').style.display = 'none';
    document.getElementById('projectPaymentDateFields').style.display = 'none';
    document.getElementById('projectNameInput').focus();
    
    // Обработчик для чекбокса абонентского проекта
    const subscriptionCheckbox = document.getElementById('projectIsSubscription');
    subscriptionCheckbox.onchange = function() {
        const isChecked = this.checked;
        document.getElementById('projectSubscriptionFields').style.display = isChecked ? 'block' : 'none';
        document.getElementById('projectPaymentDateFields').style.display = isChecked ? 'block' : 'none';
    };
}

export function hideProjectModal() {
    document.getElementById('projectModal').classList.remove('show');
}

export async function createProject() {
    const name = document.getElementById('projectNameInput').value.trim();
    
    if (!name) {
        alert('Введите название проекта');
        return;
    }
    
    const isSubscription = document.getElementById('projectIsSubscription').checked;
    let monthlyPrice = 0;
    let paymentDate = null;
    
    if (isSubscription) {
        monthlyPrice = parseFloat(document.getElementById('projectMonthlyPriceInput').value) || 0;
        paymentDate = document.getElementById('projectPaymentDateInput').value || null;
    }
    
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                name,
                monthly_price: monthlyPrice,
                is_subscription: isSubscription,
                payment_date: paymentDate
            })
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
export async function deleteProject(projectId, event) {
    event.stopPropagation();
    
    // Нельзя удалить "Ежедневник" (id = -1) или "Все задачи" (id = 0)
    if (projectId === -1 || projectId === 0) {
        return;
    }
    
    if (!confirm('Удалить проект? Все задачи и заметки будут удалены.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            if (currentProjectId === projectId) {
                // Переключаемся на "Ежедневник" после удаления
                setCurrentProjectId(-1);
                await selectProject(-1);
            }
            loadProjects();
        }
    } catch (error) {
        console.error('Ошибка удаления проекта:', error);
        alert('Ошибка при удалении проекта');
    }
}

// Обновление счетчиков задач в проектах
export async function updateProjectTaskCounts() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        
        // Обновляем счетчики для каждого проекта
        projects.forEach(project => {
            const projectElement = document.querySelector(`[data-project-id="${project.id}"]`);
            if (projectElement && project.id !== -1 && project.id !== 0) {
                const taskCount = project.task_count || 0;
                let taskCountBadge = projectElement.querySelector('.project-task-count');
                
                if (taskCount > 0) {
                    if (!taskCountBadge) {
                        taskCountBadge = document.createElement('span');
                        taskCountBadge.className = 'project-task-count';
                        const projectName = projectElement.querySelector('.project-name');
                        if (projectName) {
                            projectName.insertAdjacentElement('afterend', taskCountBadge);
                        }
                    }
                    taskCountBadge.textContent = taskCount;
                } else {
                    if (taskCountBadge) {
                        taskCountBadge.remove();
                    }
                }
            }
        });
    } catch (error) {
        console.error('Ошибка обновления счетчиков задач:', error);
    }
}

