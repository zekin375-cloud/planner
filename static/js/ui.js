// Управление UI состоянием

// Проверка мобильного устройства
function isMobile() {
    return window.innerWidth <= 768;
}

// Инициализация мобильного интерфейса
export function initMobileUI() {
    const openProjectsBtn = document.getElementById('openProjectsBtn');
    
    if (isMobile()) {
        // Показываем кнопку открытия панели
        if (openProjectsBtn) {
            openProjectsBtn.style.display = 'flex';
            openProjectsBtn.addEventListener('click', showProjectsPanel);
        }
    } else {
        // Скрываем кнопку на десктопе
        if (openProjectsBtn) {
            openProjectsBtn.style.display = 'none';
        }
    }
    
    // Обработка изменения размера окна
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            initMobileUI();
            if (!isMobile()) {
                hideProjectsPanel();
            }
        }, 250);
    });
}

// Создание overlay для мобильной панели
function createMobileOverlay() {
    if (document.getElementById('projectsPanelOverlay')) {
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'projectsPanelOverlay';
    overlay.className = 'projects-panel-overlay';
    overlay.addEventListener('click', () => {
        hideProjectsPanel();
    });
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(overlay, container.firstChild);
    }
}

// Сворачивание/разворачивание панели проектов
export async function toggleProjectsPanel() {
    const panel = document.getElementById('projectsPanel');
    
    if (isMobile()) {
        // На мобильных - показываем/скрываем панель как overlay
        const isVisible = panel.classList.contains('show');
        if (isVisible) {
            hideProjectsPanel();
        } else {
            showProjectsPanel();
        }
    } else {
        // На десктопе - сворачиваем/разворачиваем
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
        }
    }
}

// Показать панель проектов (мобильные)
export function showProjectsPanel() {
    const panel = document.getElementById('projectsPanel');
    if (panel) {
        createMobileOverlay();
        panel.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// Скрыть панель проектов (мобильные)
export function hideProjectsPanel() {
    const panel = document.getElementById('projectsPanel');
    const overlay = document.getElementById('projectsPanelOverlay');
    
    if (panel) {
        panel.classList.remove('show');
    }
    
    if (overlay) {
        overlay.remove();
    }
    
    document.body.style.overflow = '';
}

// Обработка изменения размера окна
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (!isMobile()) {
            // На десктопе скрываем мобильную панель
            hideProjectsPanel();
        }
    }, 250);
});

// Загрузка состояния панели
export async function loadPanelState() {
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

