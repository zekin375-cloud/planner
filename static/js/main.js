// Главный файл - инициализация и настройка обработчиков событий

import { loadProjects, showProjectModal, hideProjectModal, createProject, selectProject, deleteProject } from './projects.js';
import { addTask, hideTaskModal, saveTask, clearTaskDeadline, loadTasks, closeTaskDescription, editTask, deleteTask, toggleTask, saveTaskDeadline, toggleCompletedTasks, hideSelectProjectModal } from './tasks.js';
import { debounceSearch, clearSearch } from './search.js';
import { toggleProjectsPanel, loadPanelState, initMobileUI } from './ui.js';
import { togglePasswordMode, showPasswordModal, savePassword, cancelPassword, deletePassword, togglePasswordVisibility, copyPassword, togglePasswordViewVisibility, hidePasswordModal } from './passwords.js';
import { debounceSaveNotes, handlePasteImage } from './notes.js';
import { selectedTaskId, currentProjectId, currentPasswordId } from './state.js';
import { startTaskTimer, completeTask } from './timer.js';
import { initCalendar, deleteCalendarEvent, editCalendarEvent } from './calendar.js';
import { initIdleProtection, checkPincode, lockSite } from './idle-timeout.js';
import { showServerSettings } from './server-settings.js';

// Make functions available globally for inline event handlers
window.deleteProject = deleteProject;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.toggleTask = toggleTask;
window.savePassword = savePassword;
window.deleteCalendarEvent = deleteCalendarEvent;
window.editCalendarEvent = editCalendarEvent;

// Import and expose daily-notes functions when needed
import('./daily-notes.js').then(module => {
    window.editDailyNote = module.editDailyNote;
    window.deleteDailyNote = module.deleteDailyNote;
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    // Инициализируем защиту пинкодом при неактивности
    initIdleProtection();
    // Инициализируем мобильный интерфейс
    initMobileUI();
    
    // Проверяем, настроен ли сервер перед загрузкой данных
    try {
        const { getApiBaseUrl } = await import('./config.js');
        const apiUrl = getApiBaseUrl();
        if (apiUrl) {
            // Сервер настроен, загружаем проекты
            loadProjects();
        } else {
            // Сервер не настроен, показываем сообщение
            console.info('Сервер не настроен. Используйте настройки для указания IP адреса сервера.');
            const projectsList = document.getElementById('projectsList');
            if (projectsList) {
                projectsList.innerHTML = '<div class="empty-state"><p>Сервер не настроен. Перейдите в настройки и укажите IP адрес сервера.</p></div>';
            }
        }
    } catch (error) {
        console.error('Ошибка проверки конфигурации:', error);
        // Пытаемся загрузить проекты в любом случае (для браузера)
        loadProjects();
    }
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка добавления проекта
    document.getElementById('addProjectBtn').addEventListener('click', showProjectModal);
    document.getElementById('closeProjectModal').addEventListener('click', hideProjectModal);
    document.getElementById('cancelProjectBtn').addEventListener('click', hideProjectModal);
    document.getElementById('saveProjectBtn').addEventListener('click', createProject);
    
    // Кнопка добавления задачи (если существует)
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
    
    // Поиск
    document.getElementById('searchInput').addEventListener('input', debounceSearch);
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    
    // Обработчик для настроек сервера
    const serverSettingsMenuItem = document.getElementById('serverSettingsMenuItem');
    if (serverSettingsMenuItem) {
        serverSettingsMenuItem.addEventListener('click', async () => {
            const userPopup = document.getElementById('userPopup');
            if (userPopup) userPopup.style.display = 'none';
            const { showServerSettings } = await import('./server-settings.js');
            showServerSettings();
        });
    }
    
    // Обработчик для вкладки статистики
    const statsMenuItem = document.getElementById('statsMenuItem');
    if (statsMenuItem) {
        statsMenuItem.addEventListener('click', async () => {
            const userPopup = document.getElementById('userPopup');
            if (userPopup) userPopup.style.display = 'none';
            
            // Показываем меню статистики в projects-panel
            const statsMenu = document.getElementById('statsMenu');
            const projectsList = document.getElementById('projectsList');
            if (statsMenu && projectsList) {
                statsMenu.style.display = 'block';
                projectsList.style.display = 'none';
            }
            
            // Инициализируем страницу статистики
            const { initStatsPage } = await import('./stats-page.js');
            await initStatsPage();
            
            // Скрываем обычный контент и показываем статистику
            const tasksSection = document.querySelector('.tasks-section');
            const notesSection = document.querySelector('.notes-section');
            let mainContent = document.getElementById('mainContent');
            
            if (tasksSection) tasksSection.style.display = 'none';
            if (notesSection) notesSection.style.display = 'none';
            
            if (!mainContent) {
                // Создаем mainContent если его нет
                const main = document.querySelector('.main-content');
                if (main) {
                    mainContent = document.createElement('div');
                    mainContent.id = 'mainContent';
                    mainContent.className = 'stats-main-content';
                    main.appendChild(mainContent);
                }
            } else {
                mainContent.style.display = 'block';
            }
        });
    }
    
    // Сворачивание/разворачивание панели проектов
    document.getElementById('togglePanelBtn').addEventListener('click', toggleProjectsPanel);
    
    // Кнопка блокировки сайта пинкодом
    const togglePincodeBtn = document.getElementById('togglePincodeBtn');
    if (togglePincodeBtn) {
        togglePincodeBtn.addEventListener('click', lockSite);
        togglePincodeBtn.title = 'Заблокировать сайт пинкодом';
    }
    
    // Кнопка паролей
    document.getElementById('passwordsBtn').addEventListener('click', togglePasswordMode);
    const addPasswordBtn = document.getElementById('addPasswordBtn');
    if (addPasswordBtn) {
        addPasswordBtn.addEventListener('click', () => {
            if (!currentProjectId) {
                alert('Выберите проект для создания пароля');
                return;
            }
            showPasswordModal();
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
    document.getElementById('editPasswordBtn').addEventListener('click', () => {
        if (currentPasswordId) {
            showPasswordModal();
        }
    });
    document.getElementById('deletePasswordViewBtn').addEventListener('click', deletePassword);
    
    // Загружаем состояние панели при загрузке
    loadPanelState();
    
    // Инициализируем календарь
    initCalendar();
    
    // Инициализируем роутер (должен быть последним, чтобы восстановить состояние)
    import('./router.js').then(module => {
        module.initRouter();
    });
    
    // Модальное окно задачи
    document.getElementById('closeTaskModal').addEventListener('click', hideTaskModal);
    document.getElementById('cancelTaskBtn').addEventListener('click', hideTaskModal);
    document.getElementById('saveTaskBtn').addEventListener('click', saveTask);
    
    // Модальное окно выбора проекта
    document.getElementById('closeSelectProjectModal').addEventListener('click', hideSelectProjectModal);
    document.getElementById('cancelSelectProjectBtn').addEventListener('click', hideSelectProjectModal);
    document.getElementById('selectProjectModal').addEventListener('click', (e) => {
        if (e.target.id === 'selectProjectModal') hideSelectProjectModal();
    });
    
    // Заметки - автосохранение и вставка изображений
    const notesTextarea = document.getElementById('notesTextarea');
    notesTextarea.addEventListener('input', debounceSaveNotes);
    notesTextarea.addEventListener('paste', handlePasteImage);
    
    // Срок выполнения задачи
    document.getElementById('taskDeadlineInput').addEventListener('change', saveTaskDeadline);
    document.getElementById('clearDeadlineBtn').addEventListener('click', clearTaskDeadline);
    
    // Таймер задачи
    document.getElementById('startTaskBtn').addEventListener('click', () => {
        if (selectedTaskId) {
            startTaskTimer(selectedTaskId);
        }
    });
    document.getElementById('stopTaskBtn').addEventListener('click', async () => {
        if (selectedTaskId) {
            // Завершаем задачу (устанавливаем completed = true)
            await completeTask(selectedTaskId);
        }
    });
    
    // Кнопка показа завершенных задач
    document.getElementById('showCompletedBtn').addEventListener('click', toggleCompletedTasks);
    
    // Закрытие модальных окон по клику вне их
    document.getElementById('projectModal').addEventListener('click', (e) => {
        if (e.target.id === 'projectModal') hideProjectModal();
    });
    document.getElementById('taskModal').addEventListener('click', (e) => {
        if (e.target.id === 'taskModal') hideTaskModal();
    });
    document.getElementById('passwordModal').addEventListener('click', (e) => {
        if (e.target.id === 'passwordModal') hidePasswordModal();
    });
    
    // Модальное окно пинкода - проверка происходит автоматически при заполнении всех 4 полей
    const submitPincodeBtn = document.getElementById('submitPincodeBtn');
    if (submitPincodeBtn) {
        submitPincodeBtn.addEventListener('click', checkPincode);
    }
    
}

