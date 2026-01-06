// Скрипт для автоматической настройки server.url в capacitor.config.json
// Использует IP адрес из /api/server-info

const fs = require('fs');
const path = require('path');
const http = require('http');

const CONFIG_PATH = path.join(__dirname, '..', 'capacitor.config.json');
const SERVER_URL = 'http://localhost:5000';

async function getServerIP() {
    return new Promise((resolve, reject) => {
        http.get(`${SERVER_URL}/api/server-info`, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const info = JSON.parse(data);
                    resolve(info.url);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function setupCapacitorServer() {
    try {
        console.log('Получение IP адреса сервера...');
        const serverUrl = await getServerIP();
        console.log(`Найден сервер: ${serverUrl}`);
        
        // Читаем текущий конфиг
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        
        // Обновляем server.url
        if (!config.server) {
            config.server = {};
        }
        config.server.url = serverUrl;
        config.server.cleartext = true;
        
        // Сохраняем конфиг
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
        
        console.log(`✅ Capacitor настроен для загрузки контента с: ${serverUrl}`);
        console.log('\nТеперь выполните:');
        console.log('  npx cap sync');
        console.log('  npm run android:build');
        
    } catch (error) {
        console.error('❌ Ошибка настройки:', error.message);
        console.log('\nУбедитесь, что:');
        console.log('  1. Сервер Flask запущен (python app.py)');
        console.log('  2. Сервер доступен по адресу http://localhost:5000');
        console.log('\nИли настройте вручную:');
        console.log('  1. Откройте capacitor.config.json');
        console.log('  2. Укажите ваш IP адрес в server.url');
        console.log('     Например: "http://192.168.1.100:5000"');
        process.exit(1);
    }
}

setupCapacitorServer();

