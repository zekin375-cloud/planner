"""
Локальный сервер для запуска Flask приложения на Android
Используется в Capacitor приложении
"""
import os
import sys
from flask import Flask
from app import app as flask_app

if __name__ == '__main__':
    # Определяем путь к базе данных
    db_path = os.path.join(os.path.dirname(__file__), 'planner.db')
    
    # Запускаем сервер на localhost
    # На Android это будет доступно через Capacitor
    flask_app.run(
        host='127.0.0.1',
        port=5000,
        debug=False,
        threaded=True
    )


