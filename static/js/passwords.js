// Работа с паролями

import { escapeHtml } from './utils.js';
import { currentProjectId, isPasswordMode, setIsPasswordMode, selectedTaskId, setSelectedTaskId, currentPasswordId, setCurrentPasswordId } from './state.js';

// Генерация случайного пароля
function generatePassword(length = 16, includeUppercase = true, includeLowercase = true, includeNumbers = true, includeSymbols = true) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let charset = '';
    if (includeLowercase) charset += lowercase;
    if (includeUppercase) charset += uppercase;
    if (includeNumbers) charset += numbers;
    if (includeSymbols) charset += symbols;
    
    if (!charset) charset = lowercase + uppercase + numbers; // Fallback
    
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
}

// Проверка сложности пароля
function checkPasswordStrength(password) {
    if (!password) {
        return { strength: 0, text: '', level: '', percentage: 0 };
    }
    
    let strength = 0;
    let feedback = [];
    
    // Длина
    if (password.length >= 8) strength += 1;
    else feedback.push('Минимум 8 символов');
    if (password.length >= 12) strength += 1;
    if (password.length >= 16) strength += 1;
    
    // Строчные буквы
    if (/[a-z]/.test(password)) strength += 1;
    else feedback.push('Добавьте строчные буквы');
    
    // Заглавные буквы
    if (/[A-Z]/.test(password)) strength += 1;
    else feedback.push('Добавьте заглавные буквы');
    
    // Цифры
    if (/[0-9]/.test(password)) strength += 1;
    else feedback.push('Добавьте цифры');
    
    // Символы
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
    else feedback.push('Добавьте спец. символы');
    
    // Разнообразие символов
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.5) strength += 1;
    
    let level = '';
    let text = '';
    let percentage = 0;
    
    if (strength <= 2) {
        level = 'weak';
        text = 'Слабый пароль';
        percentage = 33;
    } else if (strength <= 4) {
        level = 'medium';
        text = 'Средний пароль';
        percentage = 66;
    } else {
        level = 'strong';
        text = 'Сильный пароль';
        percentage = 100;
    }
    
    if (feedback.length > 0 && strength < 5) {
        text += ': ' + feedback.slice(0, 2).join(', ');
    }
    
    return { strength, text, level, percentage };
}

// Обновление индикатора сложности пароля
function updatePasswordStrength() {
    const passwordInput = document.getElementById('passwordValue');
    const strengthFill = document.getElementById('passwordStrengthFill');
    const strengthText = document.getElementById('passwordStrengthText');
    
    if (!passwordInput || !strengthFill || !strengthText) return;
    
    const password = passwordInput.value;
    const result = checkPasswordStrength(password);
    
    strengthFill.style.width = result.percentage + '%';
    strengthFill.className = 'password-strength-fill ' + result.level;
    strengthText.textContent = result.text;
    strengthText.className = 'password-strength-text ' + result.level;
}

// Переключение режима паролей
export async function togglePasswordMode() {
    setIsPasswordMode(!isPasswordMode);
    
    // Обновляем маршрут
    const { updatePasswordRoute } = await import('./router.js');
    updatePasswordRoute(!isPasswordMode);
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
    setSelectedTaskId(null);
    setCurrentPasswordId(null);
    const deadlineSection = document.getElementById('taskDeadlineSection');
    if (deadlineSection) {
        deadlineSection.style.display = 'none';
    }
    
    // Скрываем модальное окно пароля
    hidePasswordModal();
    hidePasswordView();
    
    if (isPasswordMode) {
        // Для проекта "Все задачи" (id = 0) показываем все пароли
        
        const leftTitle = document.getElementById('leftSectionTitle');
        if (leftTitle) leftTitle.textContent = 'Пароли';
        
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) searchContainer.style.display = 'none';
        
        // Скрываем кнопки "Ежедневник" и "Все задачи"
        const projectsFooterList = document.getElementById('projectsFooterList');
        if (projectsFooterList) {
            projectsFooterList.style.display = 'none';
        }
        
        // Добавляем класс для скрытия через CSS
        const tasksSection = document.querySelector('.tasks-section');
        if (tasksSection) {
            tasksSection.classList.add('is-password-mode');
        }
        
        const taskInputContainer = document.getElementById('taskInputContainer');
        if (taskInputContainer) {
            taskInputContainer.style.display = 'none';
            // Очищаем поле ввода задач
            const taskInput = document.getElementById('taskInput');
            if (taskInput) taskInput.value = '';
        }
        
        const showCompletedBtn = document.getElementById('showCompletedBtn');
        if (showCompletedBtn) showCompletedBtn.style.display = 'none';
        
        // Скрываем весь блок tasks-footer в режиме паролей
        const tasksFooter = document.querySelector('.tasks-footer');
        if (tasksFooter) {
            tasksFooter.style.display = 'none';
        }
        
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
        
        // Загружаем пароли (для project_id = 0 и -1 загружаем все пароли)
        if (currentProjectId !== null) {
            setTimeout(() => loadPasswords(), 100);
        } else {
            if (tasksContainer) {
                tasksContainer.innerHTML = '<div class="empty-state"><p>Выберите проект</p></div>';
            }
        }
    } else {
        // Убираем класс для скрытия
        const tasksSection = document.querySelector('.tasks-section');
        if (tasksSection) {
            tasksSection.classList.remove('is-password-mode');
        }
        
        // Показываем кнопки "Ежедневник" и "Все задачи"
        const projectsFooterList = document.getElementById('projectsFooterList');
        if (projectsFooterList) {
            projectsFooterList.style.display = '';
        }
        
        const leftTitle = document.getElementById('leftSectionTitle');
        if (leftTitle) leftTitle.textContent = 'Задачи';
        
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) searchContainer.style.display = 'flex';
        
        const taskInputContainer = document.getElementById('taskInputContainer');
        if (taskInputContainer) taskInputContainer.style.display = 'flex';
        
        const showCompletedBtn = document.getElementById('showCompletedBtn');
        if (showCompletedBtn) showCompletedBtn.style.display = 'block';
        
        // Показываем блок tasks-footer обратно при выходе из режима паролей
        const tasksFooter = document.querySelector('.tasks-footer');
        if (tasksFooter) {
            tasksFooter.style.display = '';
        }
        
        const addPasswordBtn = document.getElementById('addPasswordBtn');
        if (addPasswordBtn) addPasswordBtn.style.display = 'none';
        
        const rightTitle = document.getElementById('rightPanelTitle');
        if (rightTitle) rightTitle.textContent = 'Заметки';
        
        const notesTextarea = document.getElementById('notesTextarea');
        if (notesTextarea) {
            notesTextarea.style.display = 'block';
            notesTextarea.contentEditable = 'true';
        }
        
        const passwordView = document.getElementById('passwordView');
        if (passwordView) passwordView.style.display = 'none';
        
        hidePasswordModal();
        clearPasswordForm();
        
        // Очищаем контейнер задач от элементов паролей
        const tasksContainer = document.getElementById('tasksContainer');
        if (tasksContainer) {
            // Удаляем все дочерние элементы (пароли)
            while (tasksContainer.firstChild) {
                tasksContainer.removeChild(tasksContainer.firstChild);
            }
        }
        
        // Убираем выделение паролей
        document.querySelectorAll('.password-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Загружаем задачи заново
        if (currentProjectId !== null) {
            const { loadTasks } = await import('./tasks.js');
            await loadTasks();
            
            const { showMainNotes } = await import('./notes.js');
            showMainNotes();
        }
    }
}

// Загрузка паролей
export async function loadPasswords() {
    // Разрешаем загрузку для project_id = 0 (Все задачи), project_id = -1 (Ежедневник) и обычных проектов (>= 1)
    if (currentProjectId === null) return;
    
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
    
    // Иконки для типов паролей
    const typeIcons = {
        'website': '🌐',
        'ssh': '🔐',
        'database': '🗄️',
        'email': '📧',
        'ftp': '📁',
        'vpn': '🔒',
        'other': '📝'
    };
    
    const typeLabels = {
        'website': 'Сайт',
        'ssh': 'SSH',
        'database': 'БД',
        'email': 'Email',
        'ftp': 'FTP',
        'vpn': 'VPN',
        'other': 'Другое'
    };
    
    const typeIcon = typeIcons[password.type] || '📝';
    const typeLabel = typeLabels[password.type] || 'Другое';
    
    // Показываем название проекта, если это все пароли (project_id = 0 или -1)
    const projectNameHtml = ((currentProjectId === 0 || currentProjectId === -1) && password.project_name) 
        ? `<div class="password-item-project">${escapeHtml(password.project_name)}</div>` 
        : '';
    
    div.innerHTML = `
        <div class="password-item-header">
            <span class="password-item-type">${typeIcon} ${typeLabel}</span>
        </div>
        <div class="password-item-name">${escapeHtml(password.name)}</div>
        ${projectNameHtml}
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
    setCurrentPasswordId(passwordId);
    
    // Обновляем выделение
    document.querySelectorAll('.password-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.passwordId == passwordId);
    });
    
    // Загружаем данные пароля
    try {
        const response = await fetch(`/api/passwords/${passwordId}`);
        const password = await response.json();
        
        // Иконки и названия типов
        const typeIcons = {
            'website': '🌐',
            'ssh': '🔐',
            'database': '🗄️',
            'email': '📧',
            'ftp': '📁',
            'vpn': '🔒',
            'other': '📝'
        };
        
        const typeLabels = {
            'website': 'Сайт',
            'ssh': 'SSH',
            'database': 'База данных',
            'email': 'Email',
            'ftp': 'FTP',
            'vpn': 'VPN',
            'other': 'Другое'
        };
        
        const typeIcon = typeIcons[password.type] || '📝';
        const typeLabel = typeLabels[password.type] || 'Другое';
        
        // Проверяем существование элементов перед установкой значений
        const passwordViewTitle = document.getElementById('passwordViewTitle');
        const passwordViewType = document.getElementById('passwordViewType');
        const passwordViewName = document.getElementById('passwordViewName');
        const passwordViewUsername = document.getElementById('passwordViewUsername');
        const passwordViewUrl = document.getElementById('passwordViewUrl');
        const passwordViewNotes = document.getElementById('passwordViewNotes');
        const passwordView = document.getElementById('passwordView');
        const passwordDiv = document.getElementById('passwordViewPassword');
        const showPasswordViewBtn = document.getElementById('showPasswordViewBtn');
        
        if (!passwordView) {
            console.error('Элемент passwordView не найден');
            return;
        }
        
        // Показываем просмотр пароля
        if (passwordViewTitle) passwordViewTitle.textContent = password.name || 'Пароль';
        if (passwordViewType) passwordViewType.textContent = `${typeIcon} ${typeLabel}`;
        if (passwordViewName) passwordViewName.textContent = password.name || '-';
        if (passwordViewUsername) passwordViewUsername.textContent = password.username || '-';
        if (passwordViewUrl) {
            passwordViewUrl.innerHTML = password.url ? 
                `<a href="${escapeHtml(password.url)}" target="_blank" class="password-view-link">${escapeHtml(password.url)}</a>` : '-';
        }
        if (passwordViewNotes) passwordViewNotes.textContent = password.notes || '-';
        
        // Сохраняем пароль для показа/копирования
        passwordView.dataset.password = password.password || '';
        
        // Сбрасываем состояние показа пароля
        if (passwordDiv) {
            passwordDiv.textContent = '••••••••';
            passwordDiv.classList.add('password-hidden');
        }
        if (showPasswordViewBtn) {
            showPasswordViewBtn.textContent = '👁';
        }
        
        showPasswordView();
    } catch (error) {
        console.error('Ошибка загрузки пароля:', error);
    }
}

// Сохранение пароля
export async function savePassword() {
    // Нельзя создавать пароли для project_id = 0 или -1 (это виртуальные проекты)
    if (currentProjectId === null || currentProjectId === 0 || currentProjectId === -1) {
        alert('Выберите конкретный проект для создания пароля');
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
        type: document.getElementById('passwordType').value,
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
export function cancelPassword() {
    clearPasswordForm();
    hidePasswordModal();
}

// Показать модальное окно пароля
export function showPasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
        const title = document.getElementById('passwordModalTitle');
        const deleteBtn = document.getElementById('deletePasswordBtn');
        
        if (currentPasswordId) {
            if (title) title.textContent = 'Редактировать пароль';
            if (deleteBtn) deleteBtn.style.display = 'block';
            // Загружаем данные пароля в форму
            loadPasswordToForm();
        } else {
            if (title) title.textContent = 'Новый пароль';
            if (deleteBtn) deleteBtn.style.display = 'none';
            clearPasswordForm();
        }
        modal.classList.add('show');
        
        // Добавляем обработчики для проверки сложности и генерации пароля
        const passwordInput = document.getElementById('passwordValue');
        const generateBtn = document.getElementById('generatePasswordBtn');
        
        if (passwordInput) {
            // Удаляем старые обработчики, если есть
            const newPasswordInput = passwordInput.cloneNode(true);
            passwordInput.parentNode.replaceChild(newPasswordInput, passwordInput);
            
            // Добавляем обработчик для проверки сложности
            newPasswordInput.addEventListener('input', updatePasswordStrength);
        }
        
        if (generateBtn) {
            // Удаляем старые обработчики
            const newGenerateBtn = generateBtn.cloneNode(true);
            generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
            
            newGenerateBtn.addEventListener('click', () => {
                const generatedPassword = generatePassword(16, true, true, true, true);
                const passwordInput = document.getElementById('passwordValue');
                if (passwordInput) {
                    passwordInput.value = generatedPassword;
                    passwordInput.type = 'text'; // Показываем сгенерированный пароль
                    updatePasswordStrength();
                    
                    // Обновляем кнопку показа пароля
                    const showBtn = document.getElementById('showPasswordBtn');
                    if (showBtn) {
                        showBtn.textContent = '🙈';
                        showBtn.dataset.visible = 'true';
                    }
                }
            });
        }
        
        // Обновляем индикатор сложности при открытии
        updatePasswordStrength();
    }
}

// Загрузить пароль в форму для редактирования
async function loadPasswordToForm() {
    if (!currentPasswordId) return;
    try {
        const response = await fetch(`/api/passwords/${currentPasswordId}`);
        const password = await response.json();
        
        document.getElementById('passwordType').value = password.type || 'website';
        document.getElementById('passwordName').value = password.name || '';
        document.getElementById('passwordUsername').value = password.username || '';
        document.getElementById('passwordValue').value = password.password || '';
        document.getElementById('passwordUrl').value = password.url || '';
        document.getElementById('passwordNotes').value = password.notes || '';
        document.getElementById('passwordValue').type = 'password';
        document.getElementById('showPasswordBtn').textContent = '👁';
        
        // Обновляем индикатор сложности
        updatePasswordStrength();
    } catch (error) {
        console.error('Ошибка загрузки пароля:', error);
    }
}

// Скрыть модальное окно пароля
export function hidePasswordModal() {
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
export function clearPasswordForm() {
    document.getElementById('passwordType').value = 'website';
    document.getElementById('passwordName').value = '';
    document.getElementById('passwordUsername').value = '';
    document.getElementById('passwordValue').value = '';
    document.getElementById('passwordUrl').value = '';
    document.getElementById('passwordNotes').value = '';
    document.getElementById('deletePasswordBtn').style.display = 'none';
    setCurrentPasswordId(null);
    document.getElementById('passwordValue').type = 'password';
    document.getElementById('showPasswordBtn').textContent = '👁';
    
    // Сбрасываем индикатор сложности
    updatePasswordStrength();
    
    // Убираем выделение
    document.querySelectorAll('.password-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// Удаление пароля
export async function deletePassword() {
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
export function togglePasswordVisibility() {
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
export function togglePasswordViewVisibility() {
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
export async function copyPassword() {
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
        const viewBtn = document.getElementById('copyPasswordViewBtn');
        const activeBtn = btn || viewBtn;
        if (activeBtn) {
            const originalText = activeBtn.textContent;
            activeBtn.textContent = '✓';
            activeBtn.style.background = 'var(--success)';
            
            setTimeout(() => {
                activeBtn.textContent = originalText;
                activeBtn.style.background = '';
            }, 2000);
        }
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

