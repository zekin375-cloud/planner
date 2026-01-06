// Работа с заметками ежедневника

import { currentProjectId, selectedTaskId, setSelectedTaskId } from './state.js';
import { escapeHtml } from './utils.js';

let selectedDailyNoteId = null;

// Загрузка заметок ежедневника
export async function loadDailyNotes() {
    if (currentProjectId !== -1) return;
    
    try {
        const response = await fetch('/api/daily-notes');
        const notes = await response.json();
        
        const container = document.getElementById('tasksContainer');
        
        if (notes.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Нет заметок. Создайте новую заметку!</p></div>';
            return;
        }
        
        container.innerHTML = '';
        notes.forEach(note => {
            container.appendChild(createDailyNoteElement(note));
        });
    } catch (error) {
        console.error('Ошибка загрузки заметок ежедневника:', error);
    }
}

// Создание элемента заметки
function createDailyNoteElement(note) {
    const div = document.createElement('div');
    div.className = `task-item ${selectedDailyNoteId === note.id ? 'selected' : ''}`;
    div.dataset.noteId = note.id;
    
    div.innerHTML = `
        <div class="task-content">
            <div class="task-title">${escapeHtml(note.title)}</div>
        </div>
        <div class="task-actions">
            <button class="task-btn btn-edit" onclick="editDailyNote(${note.id}, event)" title="Редактировать">✎</button>
            <button class="task-btn btn-delete" onclick="deleteDailyNote(${note.id}, event)" title="Удалить">×</button>
        </div>
    `;
    
    // Добавляем обработчик клика на весь элемент заметки
    div.addEventListener('click', (e) => {
        // Не обрабатываем клики на кнопки редактирования/удаления
        if (e.target.classList.contains('btn-edit') || 
            e.target.classList.contains('btn-delete') ||
            e.target.closest('.task-actions')) {
            return;
        }
        selectDailyNote(note.id);
    });
    
    // Добавляем поддержку touch событий для тачскринов
    div.addEventListener('touchend', (e) => {
        // Не обрабатываем touch на кнопки редактирования/удаления
        if (e.target.classList.contains('btn-edit') || 
            e.target.classList.contains('btn-delete') ||
            e.target.closest('.task-actions')) {
            return;
        }
        e.preventDefault();
        selectDailyNote(note.id);
    });
    
    return div;
}

// Выбор заметки
export async function selectDailyNote(noteId) {
    selectedDailyNoteId = noteId;
    setSelectedTaskId(null); // Сбрасываем выбранную задачу
    
    // Обновляем маршрут
    const { updateDailyNoteRoute } = await import('./router.js');
    updateDailyNoteRoute(noteId);
    
    // Обновляем выделение
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.noteId == noteId);
    });
    
    // Загружаем данные заметки
    try {
        const response = await fetch(`/api/daily-notes/${noteId}`);
        if (!response.ok) {
            console.error('Ошибка загрузки заметки:', response.status);
            return;
        }
        const note = await response.json();
        
        // Показываем заметку в правой панели
        const notesTextarea = document.getElementById('notesTextarea');
        if (notesTextarea) {
            notesTextarea.innerHTML = note.content || '';
            notesTextarea.style.display = 'block';
            notesTextarea.contentEditable = 'true';
        }
        
        // Обновляем заголовок
        const rightTitle = document.getElementById('rightPanelTitle');
        if (rightTitle) {
            rightTitle.textContent = `Ежедневник: ${escapeHtml(note.title)}`;
        }
        
        // Скрываем секцию таймера
        const timerSection = document.getElementById('taskTimerSection');
        if (timerSection) {
            timerSection.style.display = 'none';
        }
        
        // Скрываем секцию дедлайна
        const deadlineSection = document.getElementById('taskDeadlineSection');
        if (deadlineSection) {
            deadlineSection.style.display = 'none';
        }
        
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
    } catch (error) {
        console.error('Ошибка загрузки заметки:', error);
    }
}

// Добавление заметки
export async function addDailyNote() {
    const title = prompt('Введите название заметки:');
    if (!title || !title.trim()) {
        return;
    }
    
    try {
        const response = await fetch('/api/daily-notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                title: title.trim(),
                content: ''
            })
        });
        
        if (response.ok) {
            const note = await response.json();
            await loadDailyNotes();
            // Выбираем новую заметку
            selectDailyNote(note.id);
        }
    } catch (error) {
        console.error('Ошибка создания заметки:', error);
        alert('Ошибка при создании заметки');
    }
}

// Редактирование заметки
export async function editDailyNote(noteId, event) {
    if (event) event.stopPropagation();
    
    try {
        const response = await fetch(`/api/daily-notes/${noteId}`);
        if (!response.ok) {
            console.error('Ошибка загрузки заметки:', response.status);
            return;
        }
        const note = await response.json();
        
        const newTitle = prompt('Введите новое название заметки:', note.title);
        if (newTitle === null) return; // Пользователь отменил
        
        if (!newTitle.trim()) {
            alert('Название не может быть пустым');
            return;
        }
        
        const updateResponse = await fetch(`/api/daily-notes/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: newTitle.trim() })
        });
        
        if (updateResponse.ok) {
            await loadDailyNotes();
            // Обновляем заголовок, если заметка выбрана
            if (selectedDailyNoteId === noteId) {
                const rightTitle = document.getElementById('rightPanelTitle');
                if (rightTitle) {
                    rightTitle.textContent = `Ежедневник: ${escapeHtml(newTitle.trim())}`;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка редактирования заметки:', error);
        alert('Ошибка при редактировании заметки');
    }
}

// Удаление заметки
export async function deleteDailyNote(noteId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Удалить заметку?')) return;
    
    try {
        const response = await fetch(`/api/daily-notes/${noteId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            if (selectedDailyNoteId === noteId) {
                // Очищаем правую панель
                const notesTextarea = document.getElementById('notesTextarea');
                if (notesTextarea) {
                    notesTextarea.innerHTML = '';
                }
                const rightTitle = document.getElementById('rightPanelTitle');
                if (rightTitle) {
                    rightTitle.textContent = 'Ежедневник';
                }
                selectedDailyNoteId = null;
            }
            await loadDailyNotes();
        }
    } catch (error) {
        console.error('Ошибка удаления заметки:', error);
        alert('Ошибка при удалении заметки');
    }
}

// Сохранение содержимого заметки
export async function saveDailyNoteContent(noteId, content) {
    if (!noteId) return;
    
    try {
        const response = await fetch(`/api/daily-notes/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            const indicator = document.getElementById('saveIndicator');
            if (indicator) {
                indicator.textContent = 'Сохранено';
                indicator.classList.remove('saving');
                
                setTimeout(() => {
                    indicator.classList.remove('show');
                }, 2000);
            }
        }
    } catch (error) {
        console.error('Ошибка сохранения заметки:', error);
        const indicator = document.getElementById('saveIndicator');
        if (indicator) {
            indicator.textContent = 'Ошибка';
            indicator.classList.add('saving');
        }
    }
}

// Экспортируем для использования в других модулях
window.editDailyNote = editDailyNote;
window.deleteDailyNote = deleteDailyNote;

