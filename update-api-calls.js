/**
 * Скрипт для автоматической замены fetch('/api/...') на apiGet/apiPost/etc
 * Запустите: node update-api-calls.js
 */

const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, 'static', 'js');

// Файлы для обновления
const filesToUpdate = [
    'projects.js',
    'tasks.js',
    'notes.js',
    'passwords.js',
    'ui.js',
    'statistics.js',
    'calendar.js',
    'daily-notes.js'
];

function updateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Проверяем, есть ли уже импорт api
    if (!content.includes("from './api.js'") && !content.includes('from "./api.js"')) {
        // Добавляем импорт в начало (после других импортов)
        const importMatch = content.match(/(import .+ from .+;\n)+/);
        if (importMatch) {
            const lastImport = importMatch[0].trim().split('\n').pop();
            content = content.replace(
                lastImport,
                lastImport + "\nimport { apiGet, apiPost, apiPut, apiDelete } from './api.js';"
            );
            changed = true;
        }
    }
    
    // Заменяем fetch('/api/...') на apiGet/apiPost/etc
    // GET запросы
    content = content.replace(
        /const response = await fetch\(['"]\/api\/([^'"]+)['"]\);\s*const (.+) = await response\.json\(\);/g,
        'const $2 = await apiGet(\'api/$1\');'
    );
    
    // POST запросы
    content = content.replace(
        /const response = await fetch\(['"]\/api\/([^'"]+)['"],\s*{\s*method: ['"]POST['"],[^}]*body: JSON\.stringify\(([^)]+)\)[^}]*\}\);\s*const (.+) = await response\.json\(\);/g,
        'const $3 = await apiPost(\'api/$1\', $2);'
    );
    
    // PUT запросы
    content = content.replace(
        /const response = await fetch\(['"]\/api\/([^'"]+)['"],\s*{\s*method: ['"]PUT['"],[^}]*body: JSON\.stringify\(([^)]+)\)[^}]*\}\);\s*(const .+ = await response\.json\(\);)?/g,
        (match, path, data, jsonLine) => {
            if (jsonLine) {
                return `await apiPut('api/${path}', ${data});\n        ${jsonLine.replace('const ', 'const result = ').replace('response.json()', 'result')}`;
            }
            return `await apiPut('api/${path}', ${data});`;
        }
    );
    
    // DELETE запросы
    content = content.replace(
        /const response = await fetch\(['"]\/api\/([^'"]+)['"],\s*{\s*method: ['"]DELETE['"][^}]*\}\);/g,
        'await apiDelete(\'api/$1\');'
    );
    
    if (changed || content !== fs.readFileSync(filePath, 'utf8')) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Обновлен: ${path.basename(filePath)}`);
        return true;
    }
    
    return false;
}

console.log('Обновление API вызовов...\n');

let updated = 0;
filesToUpdate.forEach(file => {
    const filePath = path.join(jsDir, file);
    if (fs.existsSync(filePath)) {
        if (updateFile(filePath)) {
            updated++;
        }
    } else {
        console.log(`⚠ Файл не найден: ${file}`);
    }
});

console.log(`\nГотово! Обновлено файлов: ${updated}`);


