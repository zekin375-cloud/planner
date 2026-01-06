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

// Инициализация уведомлений для Capacitor
async function initNotifications() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        try {
            const { LocalNotifications } = window.Capacitor.Plugins;
            // Запрашиваем разрешение на уведомления
            const result = await LocalNotifications.requestPermissions();
            if (result.display === 'granted') {
                console.log('Разрешение на уведомления получено');
            }
        } catch (error) {
            console.error('Ошибка инициализации уведомлений:', error);
        }
    }
}

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
    // Инициализируем уведомления для Capacitor
    await initNotifications();
    
    // Инициализируем роутер для восстановления состояния из URL
    const { initRouter } = await import('./router.js');
    initRouter();
    
    // Проверяем, настроен ли сервер перед загрузкой данных
    try {
        const { getApiBaseUrl } = await import('./config.js');
        const apiUrl = getApiBaseUrl();
        if (apiUrl) {
            // Сервер настроен, загружаем проекты
            try {
                await loadProjects();
                // После загрузки проектов роутер восстановит состояние из URL
                // Если в URL нет параметров, будет выбран проект по умолчанию
            } catch (error) {
                console.error('Ошибка загрузки проектов:', error);
                const projectsList = document.getElementById('projectsList');
                if (projectsList) {
                    const errorMessage = error.message || 'Не удалось подключиться к серверу';
                    projectsList.innerHTML = `<div class="empty-state"><p style="color: var(--danger);">Ошибка: ${errorMessage}</p><p style="margin-top: 10px; font-size: 12px;">Проверьте:</p><ul style="text-align: left; margin-top: 5px; font-size: 12px; padding-left: 20px;"><li>Запущен ли сервер на ${apiUrl}</li><li>Правильно ли указан IP адрес в настройках</li><li>Находятся ли устройства в одной Wi-Fi сети</li></ul></div>`;
                }
            }
        } else {
            // Сервер не настроен, показываем сообщение
            console.info('Сервер не настроен. Используйте настройки для указания IP адреса сервера.');
            const projectsList = document.getElementById('projectsList');
            if (projectsList) {
                projectsList.innerHTML = '<div class="empty-state"><p>Сервер не настроен.</p><p style="margin-top: 10px; font-size: 12px;">Перейдите в настройки (меню пользователя) и укажите IP адрес сервера.</p></div>';
            }
        }
    } catch (error) {
        console.error('Ошибка при проверке конфигурации:', error);
        const projectsList = document.getElementById('projectsList');
        if (projectsList) {
            projectsList.innerHTML = `<div class="empty-state"><p style="color: var(--danger);">Ошибка инициализации: ${error.message || 'Неизвестная ошибка'}</p></div>`;
        }
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
    
    // Обработчик для меню пользователя
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userPopup = document.getElementById('userPopup');
    if (userMenuBtn && userPopup) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            // Проверяем текущее состояние
            const currentDisplay = window.getComputedStyle(userPopup).display;
            const isVisible = currentDisplay !== 'none';
            userPopup.style.display = isVisible ? 'none' : 'block';
        });
        
        // Закрытие popup при клике вне его
        document.addEventListener('click', (e) => {
            if (userMenuBtn && userPopup && 
                !userMenuBtn.contains(e.target) && 
                !userPopup.contains(e.target)) {
                userPopup.style.display = 'none';
            }
        });
    }
    
    // Обработчик для проверки обновлений
    const checkUpdateMenuItem = document.getElementById('checkUpdateMenuItem');
    if (checkUpdateMenuItem) {
        checkUpdateMenuItem.addEventListener('click', async () => {
            const userPopup = document.getElementById('userPopup');
            if (userPopup) userPopup.style.display = 'none';
            const { checkForUpdates } = await import('./app-update.js');
            // Принудительно показываем обновление для тестирования
            await checkForUpdates(true, true);
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
    const pincodeForm = document.getElementById('pincodeForm');
    if (submitPincodeBtn) {
        submitPincodeBtn.addEventListener('click', checkPincode);
    }
    if (pincodeForm) {
        pincodeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            checkPincode();
        });
    }
    
    // Кнопка закрытия заметок на мобильных
    const closeNotesBtn = document.getElementById('closeNotesBtn');
    if (closeNotesBtn) {
        closeNotesBtn.addEventListener('click', async () => {
            // Проверяем, что открыто: задача, заметка ежедневника или пароль
            const { selectedTaskId } = await import('./state.js');
            const { selectedDailyNoteId } = await import('./daily-notes.js');
            const { currentPasswordId } = await import('./state.js');
            
            if (selectedTaskId) {
                const { closeTaskDescription } = await import('./tasks.js');
                await closeTaskDescription();
            } else {
                // Проверяем, это заметка ежедневника или пароль
                const rightTitle = document.getElementById('rightPanelTitle');
                const isDailyNote = rightTitle && rightTitle.textContent.startsWith('Ежедневник:');
                const passwordView = document.getElementById('passwordView');
                const isPassword = passwordView && passwordView.style.display === 'block';
                
                if (isDailyNote) {
                    // Закрываем заметку ежедневника
                    const notesSection = document.querySelector('.notes-section');
                    if (notesSection) {
                        notesSection.classList.remove('task-selected');
                        document.body.style.overflow = '';
                    }
                    if (closeNotesBtn) {
                        closeNotesBtn.style.display = 'none';
                    }
                    // Очищаем заметку
                    const notesTextarea = document.getElementById('notesTextarea');
                    if (notesTextarea) {
                        notesTextarea.innerHTML = '';
                    }
                    // Сбрасываем выделение
                    document.querySelectorAll('.task-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                } else if (isPassword || currentPasswordId) {
                    const { hidePasswordView } = await import('./passwords.js');
                    hidePasswordView();
                }
            }
        });
    }
    
}

