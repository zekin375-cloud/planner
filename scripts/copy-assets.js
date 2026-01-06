const fs = require('fs');
const path = require('path');

// Создаем директорию dist если её нет
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Копируем статические файлы
const staticDir = path.join(__dirname, '..', 'static');
const distStaticDir = path.join(distDir, 'static');
if (fs.existsSync(staticDir)) {
    copyRecursiveSync(staticDir, distStaticDir);
}

// Копируем templates
const templatesDir = path.join(__dirname, '..', 'templates');
const distTemplatesDir = path.join(distDir, 'templates');
if (fs.existsSync(templatesDir)) {
    copyRecursiveSync(templatesDir, distTemplatesDir);
}

// Копируем database.py и app.py для локального запуска
const filesToCopy = ['database.py', 'app.py', 'requirements.txt'];
filesToCopy.forEach(file => {
    const src = path.join(__dirname, '..', file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
    }
});

// Копируем базу данных если существует
const dbFile = path.join(__dirname, '..', 'planner.db');
const distDbFile = path.join(distDir, 'planner.db');
if (fs.existsSync(dbFile)) {
    fs.copyFileSync(dbFile, distDbFile);
}

function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyRecursiveSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Assets copied to dist/');


