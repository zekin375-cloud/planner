// Глобальные переменные состояния
export let currentProjectId = null;
export let currentTaskId = null;
export let saveTimeout = null;
export let selectedTaskId = null;
export let isSearchMode = false;
export let isPasswordMode = false;
export let currentPasswordId = null;
export let showCompletedTasks = false;

export function setCurrentProjectId(id) { currentProjectId = id; }
export function setCurrentTaskId(id) { currentTaskId = id; }
export function setSaveTimeout(timeout) { saveTimeout = timeout; }
export function setSelectedTaskId(id) { selectedTaskId = id; }
export function setIsSearchMode(mode) { isSearchMode = mode; }
export function setIsPasswordMode(mode) { isPasswordMode = mode; }
export function setCurrentPasswordId(id) { currentPasswordId = id; }
export function setShowCompletedTasks(show) { showCompletedTasks = show; }

