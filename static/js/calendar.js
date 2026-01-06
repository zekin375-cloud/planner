// Работа с календарем

import { escapeHtml } from './utils.js';

let currentCalendarDate = new Date();
let selectedCalendarDate = null;
let currentEventId = null;

// Инициализация календаря
export function initCalendar() {
    const calendarBtn = document.getElementById('calendarBtn');
    if (calendarBtn) {
        calendarBtn.addEventListener('click', toggleCalendar);
    }
    
    const prevBtn = document.getElementById('calendarPrevMonth');
    const nextBtn = document.getElementById('calendarNextMonth');
    
    if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));
    
    // Модальное окно события
    const closeEventModal = document.getElementById('closeEventModal');
    const cancelEventBtn = document.getElementById('cancelEventBtn');
    const saveEventBtn = document.getElementById('saveEventBtn');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    const eventModal = document.getElementById('eventModal');
    
    if (closeEventModal) closeEventModal.addEventListener('click', hideEventModal);
    if (cancelEventBtn) cancelEventBtn.addEventListener('click', hideEventModal);
    if (saveEventBtn) saveEventBtn.addEventListener('click', saveEvent);
    if (deleteEventBtn) deleteEventBtn.addEventListener('click', deleteEvent);
    if (eventModal) {
        eventModal.addEventListener('click', (e) => {
            if (e.target.id === 'eventModal') hideEventModal();
        });
    }
    
    // Кнопка возврата к ежедневнику
    const backToDailyBtn = document.getElementById('backToDailyBtn');
    if (backToDailyBtn) {
        backToDailyBtn.addEventListener('click', backToDaily);
    }
}

// Переключение календаря
export async function toggleCalendar() {
    const { updateCalendarRoute } = await import('./router.js');
    const calendarView = document.getElementById('calendarView');
    const notesTextarea = document.getElementById('notesTextarea');
    const calendarBtn = document.getElementById('calendarBtn');
    const backToDailyBtn = document.getElementById('backToDailyBtn');
    const taskInputContainer = document.getElementById('taskInputContainer');
    
    if (calendarView.style.display === 'none') {
        calendarView.style.display = 'block';
        if (notesTextarea) notesTextarea.style.display = 'none';
        renderCalendar();
        // Загружаем все события при открытии календаря
        loadAllEvents();
        
        // Показываем кнопку возврата, скрываем кнопку календаря
        if (calendarBtn) calendarBtn.style.display = 'none';
        if (backToDailyBtn) backToDailyBtn.style.display = 'block';
        
        // Обновляем маршрут
        updateCalendarRoute(true, selectedCalendarDate);
        
        // Меняем кнопку на "Добавить событие"
        if (taskInputContainer) {
            taskInputContainer.innerHTML = `
                <button class="btn-add-task" id="addEventBtnFromContainer" style="width: 100%;">
                    <span class="icon">+</span> Добавить событие
                </button>
            `;
            const addBtn = document.getElementById('addEventBtnFromContainer');
            if (addBtn) {
                addBtn.addEventListener('click', showAddEventModal);
            }
        }
    } else {
        calendarView.style.display = 'none';
        if (notesTextarea) notesTextarea.style.display = 'block';
        // Загружаем записи ежедневника при закрытии календаря
        const { loadDailyNotes } = await import('./daily-notes.js');
        await loadDailyNotes();
        
        // Скрываем кнопку возврата, показываем кнопку календаря
        if (calendarBtn) calendarBtn.style.display = 'block';
        if (backToDailyBtn) backToDailyBtn.style.display = 'none';
        
        // Обновляем маршрут
        updateCalendarRoute(false);
        
        // Меняем кнопку на "Добавить заметку"
        if (taskInputContainer) {
            taskInputContainer.innerHTML = `
                <button class="btn-add-task" id="addDailyNoteBtn" style="width: 100%;">
                    <span class="icon">+</span> Добавить заметку
                </button>
            `;
            const addBtn = document.getElementById('addDailyNoteBtn');
            if (addBtn) {
                addBtn.addEventListener('click', async () => {
                    const { addDailyNote } = await import('./daily-notes.js');
                    await addDailyNote();
                });
            }
        }
    }
}

// Возврат к ежедневнику
export async function backToDaily() {
    const { updateCalendarRoute } = await import('./router.js');
    const calendarView = document.getElementById('calendarView');
    const notesTextarea = document.getElementById('notesTextarea');
    const calendarBtn = document.getElementById('calendarBtn');
    const backToDailyBtn = document.getElementById('backToDailyBtn');
    const taskInputContainer = document.getElementById('taskInputContainer');
    
    calendarView.style.display = 'none';
    if (notesTextarea) {
        notesTextarea.style.display = 'block';
        notesTextarea.contentEditable = 'true';
    }
    
    // Загружаем записи ежедневника
    const { loadDailyNotes } = await import('./daily-notes.js');
    await loadDailyNotes();
    
    // Скрываем кнопку возврата, показываем кнопку календаря
    if (calendarBtn) calendarBtn.style.display = 'block';
    if (backToDailyBtn) backToDailyBtn.style.display = 'none';
    
    // Обновляем маршрут
    updateCalendarRoute(false);
    
    // Меняем кнопку на "Добавить заметку"
    if (taskInputContainer) {
        taskInputContainer.innerHTML = `
            <button class="btn-add-task" id="addDailyNoteBtn" style="width: 100%;">
                <span class="icon">+</span> Добавить заметку
            </button>
        `;
        const addBtn = document.getElementById('addDailyNoteBtn');
        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                const { addDailyNote } = await import('./daily-notes.js');
                await addDailyNote();
            });
        }
    }
    
    // Сбрасываем выбранную дату
    selectedCalendarDate = null;
    renderCalendar();
}

// Изменение месяца
function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

// Отрисовка календаря
export async function renderCalendar() {
    const monthYear = document.getElementById('calendarMonthYear');
    const grid = document.getElementById('calendarGrid');
    
    if (!monthYear || !grid) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    monthYear.textContent = new Date(year, month).toLocaleDateString('ru-RU', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    // Получаем первый день месяца и количество дней
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Понедельник = 0
    
    grid.innerHTML = '';
    
    // Заголовки дней недели
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    weekDays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        grid.appendChild(dayHeader);
    });
    
    // Пустые ячейки до первого дня месяца
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        grid.appendChild(emptyCell);
    }
    
    // Загружаем события для месяца
    const events = await loadMonthEvents(year, month + 1);
    
    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = day;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayCell.dataset.date = dateStr;
        
        // Проверяем, есть ли события на этот день
        const dayEvents = events.filter(e => e.event_date === dateStr);
        if (dayEvents.length > 0) {
            dayCell.classList.add('has-events');
            const eventCount = document.createElement('span');
            eventCount.className = 'event-count';
            eventCount.textContent = dayEvents.length;
            dayCell.appendChild(eventCount);
        }
        
        // Выделяем сегодняшний день
        const today = new Date();
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayCell.classList.add('today');
        }
        
        // Выделяем выбранный день
        if (selectedCalendarDate === dateStr) {
            dayCell.classList.add('selected');
        }
        
        dayCell.addEventListener('click', () => selectDate(dateStr));
        grid.appendChild(dayCell);
    }
}

// Загрузка событий за месяц
async function loadMonthEvents(year, month) {
    try {
        const response = await fetch(`/api/calendar/events`);
        if (!response.ok) return [];
        
        const allEvents = await response.json();
        // Фильтруем события по месяцу
        return allEvents.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate.getFullYear() === year && eventDate.getMonth() + 1 === month;
        });
    } catch (error) {
        console.error('Ошибка загрузки событий:', error);
        return [];
    }
}

// Выбор даты
export async function selectDate(dateStr) {
    const { updateCalendarRoute } = await import('./router.js');
    
    if (selectedCalendarDate === dateStr) {
        // Если кликнули на уже выбранную дату, снимаем выбор
        selectedCalendarDate = null;
        renderCalendar();
        await loadAllEvents();
        updateCalendarRoute(true, null);
    } else {
        selectedCalendarDate = dateStr;
        renderCalendar();
        await loadEventsForDate(dateStr);
        updateCalendarRoute(true, dateStr);
    }
}

// Загрузка всех событий
export async function loadAllEvents() {
    const tasksContainer = document.getElementById('tasksContainer');
    if (!tasksContainer) return;
    
    try {
        const response = await fetch('/api/calendar/events');
        if (!response.ok) {
            tasksContainer.innerHTML = '<div class="empty-state"><p>Ошибка загрузки событий</p></div>';
            return;
        }
        
        const events = await response.json();
        
        if (events.length === 0) {
            tasksContainer.innerHTML = '<div class="empty-state"><p>Нет событий</p></div>';
            return;
        }
        
        tasksContainer.innerHTML = '';
        events.forEach(event => {
            const eventItem = createEventElement(event);
            tasksContainer.appendChild(eventItem);
        });
    } catch (error) {
        console.error('Ошибка загрузки событий:', error);
        tasksContainer.innerHTML = '<div class="empty-state"><p>Ошибка загрузки событий</p></div>';
    }
}

// Загрузка событий на дату
async function loadEventsForDate(dateStr) {
    const tasksContainer = document.getElementById('tasksContainer');
    if (!tasksContainer) return;
    
    try {
        const response = await fetch(`/api/calendar/events?date=${dateStr}`);
        if (!response.ok) {
            tasksContainer.innerHTML = '<div class="empty-state"><p>Ошибка загрузки событий</p></div>';
            return;
        }
        
        const events = await response.json();
        
        if (events.length === 0) {
            tasksContainer.innerHTML = '<div class="empty-state"><p>Нет событий на эту дату</p></div>';
            return;
        }
        
        tasksContainer.innerHTML = '';
        events.forEach(event => {
            const eventItem = createEventElement(event);
            tasksContainer.appendChild(eventItem);
        });
    } catch (error) {
        console.error('Ошибка загрузки событий:', error);
        tasksContainer.innerHTML = '<div class="empty-state"><p>Ошибка загрузки событий</p></div>';
    }
}

// Создание элемента события для отображения в списке
function createEventElement(event) {
    const eventItem = document.createElement('div');
    eventItem.className = 'task-item calendar-event-item';
    eventItem.dataset.eventId = event.id;
    
    const date = new Date(event.event_date);
    const dateStr = date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
    });
    
    eventItem.innerHTML = `
        <div class="task-content">
            <div class="task-title">${escapeHtml(event.title)}</div>
            <div class="task-project-label">${dateStr} ${event.event_time ? `в ${event.event_time}` : ''}</div>
            ${event.description ? `<div class="task-description">${escapeHtml(event.description)}</div>` : ''}
        </div>
        <div class="task-actions">
            <button class="task-btn btn-edit" onclick="editCalendarEvent(${event.id}, event)" title="Редактировать">✎</button>
            <button class="task-btn btn-delete" onclick="deleteCalendarEvent(${event.id}, event)" title="Удалить">×</button>
        </div>
    `;
    
    eventItem.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-edit') && 
            !e.target.classList.contains('btn-delete') &&
            !e.target.closest('.task-actions')) {
            // При клике на событие выбираем его дату в календаре
            selectDate(event.event_date);
        }
    });
    
    return eventItem;
}

// Показать модальное окно добавления события
function showAddEventModal() {
    currentEventId = null;
    document.getElementById('eventModalTitle').textContent = 'Новое событие';
    document.getElementById('eventTitleInput').value = '';
    // Если дата выбрана, используем её, иначе - сегодняшнюю дату
    const defaultDate = selectedCalendarDate || new Date().toISOString().split('T')[0];
    document.getElementById('eventDateInput').value = defaultDate;
    document.getElementById('eventTimeInput').value = '';
    document.getElementById('eventDescriptionInput').value = '';
    document.getElementById('deleteEventBtn').style.display = 'none';
    
    const modal = document.getElementById('eventModal');
    modal.classList.add('show');
    document.getElementById('eventTitleInput').focus();
}

// Показать модальное окно редактирования события
export function showEditEventModal(eventId) {
    currentEventId = eventId;
    loadEventToForm(eventId);
}

// Загрузить событие в форму
async function loadEventToForm(eventId) {
    try {
        const response = await fetch(`/api/calendar/events`);
        if (!response.ok) return;
        
        const allEvents = await response.json();
        const event = allEvents.find(e => e.id === eventId);
        
        if (event) {
            document.getElementById('eventModalTitle').textContent = 'Редактировать событие';
            document.getElementById('eventTitleInput').value = event.title || '';
            document.getElementById('eventDateInput').value = event.event_date || '';
            document.getElementById('eventTimeInput').value = event.event_time || '';
            document.getElementById('eventDescriptionInput').value = event.description || '';
            document.getElementById('deleteEventBtn').style.display = 'block';
            
            const modal = document.getElementById('eventModal');
            modal.classList.add('show');
            document.getElementById('eventTitleInput').focus();
        }
    } catch (error) {
        console.error('Ошибка загрузки события:', error);
    }
}

// Скрыть модальное окно события
export function hideEventModal() {
    const modal = document.getElementById('eventModal');
    modal.classList.remove('show');
    currentEventId = null;
}

// Сохранение события
async function saveEvent() {
    const title = document.getElementById('eventTitleInput').value.trim();
    const date = document.getElementById('eventDateInput').value;
    const time = document.getElementById('eventTimeInput').value.trim() || null;
    const description = document.getElementById('eventDescriptionInput').value.trim();
    
    if (!title) {
        alert('Введите название события');
        return;
    }
    
    if (!date) {
        alert('Выберите дату');
        return;
    }
    
    try {
        if (currentEventId) {
            // Обновление
            const response = await fetch(`/api/calendar/events/${currentEventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    event_date: date,
                    event_time: time,
                    description
                })
            });
            
            if (response.ok) {
                hideEventModal();
                renderCalendar();
                if (selectedCalendarDate === date) {
                    await loadEventsForDate(date);
                } else {
                    await loadAllEvents();
                }
            }
        } else {
            // Создание
            await createEvent(title, date, description, time);
            hideEventModal();
        }
    } catch (error) {
        console.error('Ошибка сохранения события:', error);
        alert('Ошибка при сохранении события');
    }
}

// Удаление события
async function deleteEvent() {
    if (!currentEventId) return;
    
    if (!confirm('Удалить событие?')) return;
    
    try {
        const response = await fetch(`/api/calendar/events/${currentEventId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const date = document.getElementById('eventDateInput').value;
            hideEventModal();
            renderCalendar();
            if (selectedCalendarDate) {
                await loadEventsForDate(selectedCalendarDate);
            } else {
                await loadAllEvents();
            }
        }
    } catch (error) {
        console.error('Ошибка удаления события:', error);
        alert('Ошибка при удалении события');
    }
}

// Создание события
async function createEvent(title, date, description = '', time = null) {
    try {
        const response = await fetch('/api/calendar/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                event_date: date,
                description,
                event_time: time
            })
        });
        
        if (response.ok) {
            renderCalendar();
            // Если выбранная дата совпадает с датой события, показываем события на эту дату
            if (selectedCalendarDate === date) {
                await loadEventsForDate(date);
            } else if (!selectedCalendarDate) {
                // Если дата не выбрана, показываем все события
                await loadAllEvents();
            } else {
                // Если выбрана другая дата, показываем события на выбранную дату
                await loadEventsForDate(selectedCalendarDate);
            }
        }
    } catch (error) {
        console.error('Ошибка создания события:', error);
        alert('Ошибка при создании события');
    }
}

// Редактирование события
export async function editCalendarEvent(eventId, event) {
    if (event) event.stopPropagation();
    showEditEventModal(eventId);
}

// Удаление события
export async function deleteCalendarEvent(eventId, event) {
    if (event) event.stopPropagation();
    
    if (!confirm('Удалить событие?')) return;
    
    try {
        const response = await fetch(`/api/calendar/events/${eventId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            renderCalendar();
            if (selectedCalendarDate) {
                await loadEventsForDate(selectedCalendarDate);
            } else {
                await loadAllEvents();
            }
        }
    } catch (error) {
        console.error('Ошибка удаления события:', error);
        alert('Ошибка при удалении события');
    }
}


