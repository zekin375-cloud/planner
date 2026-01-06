// Работа с заметками

import { currentProjectId, selectedTaskId, saveTimeout, setSaveTimeout } from './state.js';

// Загрузка заметок
export async function loadNotes() {
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
    
    // Для "Ежедневник" (id = -1) заметки загружаются при выборе конкретной заметки
    if (currentProjectId === -1) {
        // Очищаем поле заметок, если ничего не выбрано
        notesTextarea.innerHTML = '';
        return;
    }
    
    // Для "Все задачи" (id = 0) не загружаем заметки - там должна быть статистика
    if (currentProjectId === 0) {
        // Не загружаем заметки для "Все задачи" - там отображается статистика
        return;
    }
    
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
export function debounceSaveNotes() {
    const indicator = document.getElementById('saveIndicator');
    indicator.textContent = 'Сохранение...';
    indicator.classList.add('show', 'saving');
    
    clearTimeout(saveTimeout);
    const timeoutId = setTimeout(() => {
        saveNotes();
    }, 1000);
    setSaveTimeout(timeoutId);
}

export async function saveNotes() {
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
    
    // Если выбрана заметка ежедневника, сохраняем её содержимое
    if (currentProjectId === -1) {
        // Получаем выбранную заметку из DOM
        const selectedNote = document.querySelector('.task-item.selected[data-note-id]');
        if (selectedNote) {
            const noteId = parseInt(selectedNote.dataset.noteId);
            if (noteId) {
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
                        indicator.textContent = 'Сохранено';
                        indicator.classList.remove('saving');
                        
                        setTimeout(() => {
                            indicator.classList.remove('show');
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Ошибка сохранения заметки ежедневника:', error);
                    const indicator = document.getElementById('saveIndicator');
                    indicator.textContent = 'Ошибка';
                    indicator.classList.add('saving');
                }
                return;
            }
        }
        return;
    }
    
    // Для "Все задачи" (id = 0) сохраняем общие заметки (старая логика для совместимости)
    if (currentProjectId === 0) {
        // Сохраняем общие заметки (ежедневник)
        try {
            const response = await fetch('/api/daily-notes', {
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
            console.error('Ошибка сохранения общих заметок:', error);
            const indicator = document.getElementById('saveIndicator');
            indicator.textContent = 'Ошибка';
            indicator.classList.add('saving');
        }
        return;
    }
    
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
export function handlePasteImage(e) {
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

// Показать заметки проекта
export function showMainNotes() {
    // Убеждаемся, что заметки видны
    const notesTextarea = document.getElementById('notesTextarea');
    if (notesTextarea) {
        notesTextarea.style.display = 'block';
        // Включаем редактирование, если не отображается статистика
        // (для статистики contentEditable устанавливается в false в statistics.js)
        if (currentProjectId !== 0 || selectedTaskId) {
            notesTextarea.contentEditable = 'true';
        }
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

