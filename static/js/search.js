// Поиск задач

import { isSearchMode, setIsSearchMode, selectedTaskId, setSelectedTaskId, currentProjectId } from './state.js';
import { loadTasks } from './tasks.js';
import { closeTaskDescription } from './tasks.js';

let searchTimeout = null;

export function debounceSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const clearBtn = document.getElementById('clearSearchBtn');
    
    clearBtn.style.display = query ? 'flex' : 'none';
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (query) {
            setIsSearchMode(true);
            setSelectedTaskId(null);
            closeTaskDescription();
            loadTasks();
        } else {
            setIsSearchMode(false);
            if (currentProjectId) {
                loadTasks();
            }
        }
    }, 300);
}

export function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    setIsSearchMode(false);
    if (currentProjectId) {
        loadTasks();
    }
}

