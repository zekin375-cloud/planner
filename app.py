from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from database import Database
import socket

app = Flask(__name__)
# Включаем CORS для доступа с мобильного приложения
CORS(app, resources={r"/api/*": {"origins": "*"}})
db = Database()

# Создаем дефолтный проект при первом запуске
if not db.get_all_projects():
    db.create_project("Мой проект")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/check')
def check_connection():
    """Страница для проверки подключения с телефона"""
    return render_template('check-connection.html')

@app.route('/api/server-info')
def server_info():
    """Информация о сервере для клиента"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except:
        local_ip = "127.0.0.1"
    
    return jsonify({
        'ip': local_ip,
        'port': 5000,
        'url': f'http://{local_ip}:5000'
    })

# API для проектов
@app.route('/api/projects', methods=['GET'])
def get_projects():
    projects = db.get_all_projects()
    result = []
    for p in projects:
        project_id = p[0]
        # Получаем количество незавершенных задач для проекта
        tasks = db.get_tasks(project_id, include_completed=False)
        task_count = len(tasks) if tasks else 0
        
        result.append({
            'id': project_id, 
            'name': p[1],
            'monthly_price': float(p[2]) if len(p) > 2 else 0,
            'is_subscription': bool(p[3]) if len(p) > 3 else False,
            'payment_date': p[4] if len(p) > 4 and p[4] else None,
            'sort_order': int(p[5]) if len(p) > 5 else 0,
            'task_count': task_count
        })
    return jsonify(result)

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.json
    project_id = db.create_project(
        data['name'],
        monthly_price=data.get('monthly_price', 0),
        is_subscription=data.get('is_subscription', False),
        payment_date=data.get('payment_date')
    )
    return jsonify({
        'id': project_id, 
        'name': data['name'],
        'monthly_price': data.get('monthly_price', 0),
        'is_subscription': data.get('is_subscription', False),
        'payment_date': data.get('payment_date')
    }), 201

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    data = request.json
    db.update_project(
        project_id,
        name=data.get('name'),
        monthly_price=data.get('monthly_price'),
        is_subscription=data.get('is_subscription'),
        payment_date=data.get('payment_date'),
        sort_order=data.get('sort_order')
    )
    return jsonify({'success': True}), 200

@app.route('/api/projects/order', methods=['PUT'])
def update_projects_order():
    """Обновить порядок проектов"""
    data = request.json
    project_orders = data.get('orders', [])  # Список [{'id': 1, 'order': 0}, ...]
    if not project_orders:
        return jsonify({'error': 'Orders required'}), 400
    
    # Преобразуем в список кортежей
    orders = [(item['id'], item['order']) for item in project_orders]
    db.update_projects_order(orders)
    return jsonify({'success': True}), 200

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    db.delete_project(project_id)
    return jsonify({'success': True}), 200

# API для задач
@app.route('/api/projects/<int:project_id>/tasks', methods=['GET'])
def get_tasks(project_id):
    include_completed = request.args.get('include_completed', 'true').lower() == 'true'
    
    # Если project_id = 0, возвращаем все задачи из всех проектов
    if project_id == 0:
        try:
            tasks = db.get_all_tasks(include_completed=include_completed)
            return jsonify([{
                'id': t[0],
                'title': t[1],
                'description': t[2] or '',
                'completed': bool(t[3]),
                'created_at': t[4] or '',
                'completed_at': t[5] or '',
                'deadline': t[6] or '',
                'started_at': t[7] or '' if len(t) > 7 else '',
                'price': float(t[8]) if len(t) > 8 else 0,
                'project_id': t[9] if len(t) > 9 else None,
                'project_name': t[10] if len(t) > 10 else None
            } for t in tasks])
        except Exception as e:
            print(f"Ошибка получения всех задач: {e}")
            return jsonify({'error': str(e)}), 500
    
    try:
        tasks = db.get_tasks(project_id, include_completed=include_completed)
        return jsonify([{
            'id': t[0],
            'title': t[1],
            'description': t[2] or '',
            'completed': bool(t[3]),
            'created_at': t[4] or '',
            'completed_at': t[5] or '',
            'deadline': t[6] or '',
            'started_at': t[7] or '' if len(t) > 7 else '',
            'price': float(t[8]) if len(t) > 8 else 0
        } for t in tasks])
    except Exception as e:
        print(f"Ошибка получения задач проекта {project_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>/tasks', methods=['POST'])
def create_task(project_id):
    data = request.json
    price = data.get('price', 0)
    try:
        price = float(price) if price else 0
    except (ValueError, TypeError):
        price = 0
    task_id = db.create_task(project_id, data['title'], data.get('description', ''), data.get('deadline'), price)
    return jsonify({'id': task_id, 'title': data['title']}), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    db.update_task(
        task_id,
        title=data.get('title'),
        description=data.get('description'),
        completed=data.get('completed'),
        deadline=data.get('deadline'),
        started_at=data.get('started_at'),
        price=data.get('price')
    )
    return jsonify({'success': True}), 200

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    db.delete_task(task_id)
    return jsonify({'success': True}), 200

# API для заметок
@app.route('/api/projects/<int:project_id>/notes', methods=['GET'])
def get_notes(project_id):
    note = db.get_note(project_id)
    if note:
        return jsonify({'content': note[1] or ''})
    return jsonify({'content': ''})

@app.route('/api/projects/<int:project_id>/notes', methods=['POST'])
def save_notes(project_id):
    data = request.json
    db.save_note(project_id, data.get('content', ''))
    return jsonify({'success': True}), 200

# API для заметок задач
@app.route('/api/tasks/<int:task_id>/notes', methods=['GET'])
def get_task_notes(task_id):
    note = db.get_task_note(task_id)
    if note:
        return jsonify({'content': note[1] or ''})
    return jsonify({'content': ''})

@app.route('/api/tasks/<int:task_id>/notes', methods=['POST'])
def save_task_notes(task_id):
    data = request.json
    db.save_task_note(task_id, data.get('content', ''))
    return jsonify({'success': True}), 200

# API для общих заметок (ежедневник)
@app.route('/api/daily-notes', methods=['GET'])
def get_all_daily_notes():
    try:
        notes = db.get_all_daily_notes()
        return jsonify([{
            'id': n[0],
            'title': n[1],
            'content': n[2] or '',
            'created_at': n[3],
            'updated_at': n[4]
        } for n in notes])
    except Exception as e:
        print(f"Ошибка получения всех заметок ежедневника: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/daily-notes/<int:note_id>', methods=['GET'])
def get_daily_note(note_id):
    try:
        note = db.get_daily_note(note_id)
        if note:
            return jsonify({
                'id': note[0],
                'title': note[1],
                'content': note[2] or '',
                'created_at': note[3],
                'updated_at': note[4]
            })
        return jsonify({'error': 'Заметка не найдена'}), 404
    except Exception as e:
        print(f"Ошибка получения заметки ежедневника: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/daily-notes', methods=['POST'])
def create_daily_note():
    try:
        data = request.json
        title = data.get('title', 'Новая заметка')
        content = data.get('content', '')
        note_id = db.create_daily_note(title, content)
        return jsonify({
            'id': note_id,
            'title': title,
            'content': content
        }), 201
    except Exception as e:
        print(f"Ошибка создания заметки ежедневника: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/daily-notes/<int:note_id>', methods=['PUT'])
def update_daily_note(note_id):
    try:
        data = request.json
        db.update_daily_note(note_id, title=data.get('title'), content=data.get('content'))
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f"Ошибка обновления заметки ежедневника: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/daily-notes/<int:note_id>', methods=['DELETE'])
def delete_daily_note(note_id):
    try:
        db.delete_daily_note(note_id)
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f"Ошибка удаления заметки ежедневника: {e}")
        return jsonify({'error': str(e)}), 500

# API для состояния UI
@app.route('/api/ui-state', methods=['GET'])
def get_ui_state():
    try:
        key = request.args.get('key')
        if not key:
            return jsonify({'error': 'Key required'}), 400
        value = db.get_ui_state(key, '0')
        return jsonify({'value': str(value)}), 200
    except Exception as e:
        import traceback
        print(f"Error in get_ui_state: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'value': '0'}), 200  # Возвращаем дефолтное значение вместо ошибки

@app.route('/api/ui-state', methods=['POST'])
def set_ui_state():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        key = data.get('key')
        value = data.get('value')
        if not key:
            return jsonify({'error': 'Key required'}), 400
        db.set_ui_state(key, value)
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API для глобального поиска
@app.route('/api/search/tasks', methods=['GET'])
def search_tasks():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    tasks = db.search_tasks(query)
    return jsonify([{
        'id': t[0],
        'project_id': t[1],
        'title': t[2],
        'description': t[3] or '',
        'completed': bool(t[4]),
        'project_name': t[5]
    } for t in tasks])

# API для паролей
@app.route('/api/projects/<project_id>/passwords', methods=['GET'])
def get_passwords(project_id):
    try:
        # Парсим project_id (может быть отрицательным)
        try:
            project_id_int = int(project_id)
        except ValueError:
            return jsonify({'error': 'Invalid project_id'}), 400
        
        # Если project_id = 0 или -1, возвращаем все пароли из всех проектов
        if project_id_int == 0 or project_id_int == -1:
            passwords = db.get_all_passwords()
            return jsonify([{
                'id': p[0],
                'name': p[1],
                'type': p[2] or 'website',
                'username': p[3] or '',
                'password': p[4],
                'url': p[5] or '',
                'notes': p[6] or '',
                'project_id': p[7] if len(p) > 7 else None,
                'project_name': p[8] if len(p) > 8 else None
            } for p in passwords])
        elif project_id_int < 1:
            # Для других отрицательных ID возвращаем пустой список
            return jsonify([])
        else:
            passwords = db.get_passwords(project_id_int)
            return jsonify([{
                'id': p[0],
                'name': p[1],
                'type': p[2] or 'website',
                'username': p[3] or '',
                'password': p[4],
                'url': p[5] or '',
                'notes': p[6] or ''
            } for p in passwords])
    except Exception as e:
        import traceback
        print(f"Error in get_passwords: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'passwords': []}), 200

@app.route('/api/projects/<project_id>/passwords', methods=['POST'])
def create_password(project_id):
    try:
        project_id_int = int(project_id)
    except ValueError:
        return jsonify({'error': 'Invalid project_id'}), 400
    
    data = request.json
    password_id = db.create_password(
        project_id_int,
        data.get('name', ''),
        data.get('username', ''),
        data.get('password', ''),
        data.get('url', ''),
        data.get('notes', '')
    )
    return jsonify({'id': password_id}), 201

@app.route('/api/passwords/<int:password_id>', methods=['GET'])
def get_password(password_id):
    try:
        password = db.get_password(password_id)
        if not password:
            return jsonify({'error': 'Password not found'}), 404
        return jsonify({
            'id': password[0],
            'project_id': password[1],
            'name': password[2],
            'type': password[3] or 'website',
            'username': password[4] or '',
            'password': password[5],
            'url': password[6] or '',
            'notes': password[7] or ''
        }), 200
    except Exception as e:
        import traceback
        print(f"Error in get_password: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/passwords/<int:password_id>', methods=['PUT'])
def update_password(password_id):
    data = request.json
    db.update_password(
        password_id,
        name=data.get('name'),
        type=data.get('type'),
        username=data.get('username'),
        password=data.get('password'),
        url=data.get('url'),
        notes=data.get('notes')
    )
    return jsonify({'success': True}), 200

@app.route('/api/passwords/<int:password_id>', methods=['DELETE'])
def delete_password(password_id):
    db.delete_password(password_id)
    return jsonify({'success': True}), 200

# API для статистики
@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    try:
        from datetime import datetime, date
        
        today = date.today().isoformat()
        
        # Получаем все задачи
        all_tasks = db.get_all_tasks(include_completed=True)
        
        # Подсчитываем выполненные задачи за сегодня
        completed_today = 0
        remaining_tasks = 0
        total_pomodoro_minutes = 0
        
        for task in all_tasks:
            task_id = task[0]
            completed = bool(task[3])
            completed_at = task[5] if len(task) > 5 else None
            started_at = task[7] if len(task) > 7 else None
            
            # Проверяем, выполнена ли задача сегодня
            if completed and completed_at:
                completed_date = completed_at.split('T')[0] if 'T' in completed_at else completed_at.split(' ')[0]
                if completed_date == today:
                    completed_today += 1
                    
                    # Подсчитываем время работы (помидоро)
                    if started_at:
                        try:
                            start_time = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                            end_time = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                            # Проверяем, что задача была начата сегодня
                            if start_time.date().isoformat() == today:
                                duration = (end_time - start_time).total_seconds() / 60  # в минутах
                                total_pomodoro_minutes += duration
                        except:
                            pass
            
            # Подсчитываем оставшиеся задачи
            if not completed:
                remaining_tasks += 1
        
        # Конвертируем минуты в часы (помидоро = 25 минут)
        pomodoro_hours = total_pomodoro_minutes / 60
        
        return jsonify({
            'completed_today': completed_today,
            'remaining_tasks': remaining_tasks,
            'pomodoro_hours': round(pomodoro_hours, 1)
        })
    except Exception as e:
        print(f"Ошибка получения статистики: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'completed_today': 0,
            'remaining_tasks': 0,
            'pomodoro_hours': 0
        }), 200

# API для детальной статистики
@app.route('/api/statistics/detailed', methods=['GET'])
def get_detailed_statistics():
    try:
        from datetime import datetime, date, timedelta
        
        # Получаем все задачи
        all_tasks = db.get_all_tasks(include_completed=True)
        
        # Подсчитываем статистику за последние 30 дней
        today = date.today()
        completed_by_day = {}
        pomodoro_by_day = {}
        
        for task in all_tasks:
            completed = bool(task[3])
            completed_at = task[5] if len(task) > 5 else None
            started_at = task[7] if len(task) > 7 else None
            
            if completed and completed_at:
                try:
                    completed_date = completed_at.split('T')[0] if 'T' in completed_at else completed_at.split(' ')[0]
                    task_date = datetime.strptime(completed_date, '%Y-%m-%d').date()
                    
                    # Только за последние 30 дней
                    if (today - task_date).days <= 30:
                        if task_date not in completed_by_day:
                            completed_by_day[task_date] = 0
                        completed_by_day[task_date] += 1
                        
                        # Подсчитываем время работы
                        if started_at:
                            try:
                                start_time = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                                end_time = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                                if start_time.date() == task_date:
                                    duration = (end_time - start_time).total_seconds() / 3600  # в часах
                                    if task_date not in pomodoro_by_day:
                                        pomodoro_by_day[task_date] = 0
                                    pomodoro_by_day[task_date] += duration
                            except:
                                pass
                except:
                    pass
        
        # Формируем данные за последние 30 дней
        completed_list = []
        pomodoro_list = []
        total_completed = 0
        total_pomodoro = 0
        
        for i in range(30):
            day = today - timedelta(days=i)
            day_str = day.isoformat()
            count = completed_by_day.get(day, 0)
            hours = pomodoro_by_day.get(day, 0)
            
            completed_list.append({'date': day_str, 'count': count})
            pomodoro_list.append({'date': day_str, 'hours': round(hours, 1)})
            total_completed += count
            total_pomodoro += hours
        
        completed_list.reverse()
        pomodoro_list.reverse()
        
        return jsonify({
            'completed_by_day': completed_list,
            'pomodoro_by_day': pomodoro_list,
            'total_completed': total_completed,
            'total_pomodoro_hours': round(total_pomodoro, 1),
            'avg_per_day': round(total_completed / 30, 1) if total_completed > 0 else 0
        })
    except Exception as e:
        print(f"Ошибка получения детальной статистики: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'completed_by_day': [],
            'pomodoro_by_day': [],
            'total_completed': 0,
            'total_pomodoro_hours': 0,
            'avg_per_day': 0
        }), 200

# API для статистики по типам
@app.route('/api/statistics/<stats_type>', methods=['GET'])
def get_statistics_by_type(stats_type):
    try:
        from datetime import datetime, date, timedelta
        
        # Получаем все задачи
        all_tasks = db.get_all_tasks(include_completed=True)
        
        if stats_type == 'dailyStats':
            # Ежедневная статистика (последние 30 дней)
            return get_detailed_statistics()
        
        elif stats_type == 'weeklyStats':
            # Недельная статистика (последние 12 недель)
            today = date.today()
            completed_by_week = {}
            pomodoro_by_week = {}
            
            for task in all_tasks:
                completed = bool(task[3])
                completed_at = task[5] if len(task) > 5 else None
                started_at = task[7] if len(task) > 7 else None
                
                if completed and completed_at:
                    try:
                        completed_date = completed_at.split('T')[0] if 'T' in completed_at else completed_at.split(' ')[0]
                        task_date = datetime.strptime(completed_date, '%Y-%m-%d').date()
                        
                        # Определяем неделю (год, номер недели)
                        week_key = f"{task_date.year}-W{task_date.isocalendar()[1]}"
                        
                        if week_key not in completed_by_week:
                            completed_by_week[week_key] = 0
                        completed_by_week[week_key] += 1
                        
                        # Подсчитываем время работы
                        if started_at:
                            try:
                                start_time = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                                end_time = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                                duration = (end_time - start_time).total_seconds() / 3600  # в часах
                                if week_key not in pomodoro_by_week:
                                    pomodoro_by_week[week_key] = 0
                                pomodoro_by_week[week_key] += duration
                            except:
                                pass
                    except:
                        pass
            
            # Формируем данные за последние 12 недель
            weekly_list = []
            total_completed = 0
            total_pomodoro = 0
            
            for i in range(12):
                week_date = today - timedelta(weeks=i)
                week_key = f"{week_date.year}-W{week_date.isocalendar()[1]}"
                count = completed_by_week.get(week_key, 0)
                hours = pomodoro_by_week.get(week_key, 0)
                
                weekly_list.append({'week': week_key, 'count': count, 'hours': round(hours, 1)})
                total_completed += count
                total_pomodoro += hours
            
            weekly_list.reverse()
            
            return jsonify({
                'completed_by_week': weekly_list,
                'pomodoro_by_week': weekly_list,
                'total_completed': total_completed,
                'total_pomodoro_hours': round(total_pomodoro, 1),
                'avg_per_week': round(total_completed / 12, 1) if total_completed > 0 else 0
            })
        
        elif stats_type == 'monthlyStats':
            # Месячная статистика (последние 12 месяцев)
            today = date.today()
            completed_by_month = {}
            pomodoro_by_month = {}
            
            for task in all_tasks:
                completed = bool(task[3])
                completed_at = task[5] if len(task) > 5 else None
                started_at = task[7] if len(task) > 7 else None
                
                if completed and completed_at:
                    try:
                        completed_date = completed_at.split('T')[0] if 'T' in completed_at else completed_at.split(' ')[0]
                        task_date = datetime.strptime(completed_date, '%Y-%m-%d').date()
                        
                        # Определяем месяц (год-месяц)
                        month_key = f"{task_date.year}-{task_date.month:02d}"
                        
                        if month_key not in completed_by_month:
                            completed_by_month[month_key] = 0
                        completed_by_month[month_key] += 1
                        
                        # Подсчитываем время работы
                        if started_at:
                            try:
                                start_time = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                                end_time = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                                duration = (end_time - start_time).total_seconds() / 3600  # в часах
                                if month_key not in pomodoro_by_month:
                                    pomodoro_by_month[month_key] = 0
                                pomodoro_by_month[month_key] += duration
                            except:
                                pass
                    except:
                        pass
            
            # Формируем данные за последние 12 месяцев
            monthly_list = []
            total_completed = 0
            total_pomodoro = 0
            
            for i in range(12):
                month_date = today - timedelta(days=30*i)
                month_key = f"{month_date.year}-{month_date.month:02d}"
                count = completed_by_month.get(month_key, 0)
                hours = pomodoro_by_month.get(month_key, 0)
                
                monthly_list.append({'month': month_key, 'count': count, 'hours': round(hours, 1)})
                total_completed += count
                total_pomodoro += hours
            
            monthly_list.reverse()
            
            return jsonify({
                'completed_by_month': monthly_list,
                'pomodoro_by_month': monthly_list,
                'total_completed': total_completed,
                'total_pomodoro_hours': round(total_pomodoro, 1),
                'avg_per_month': round(total_completed / 12, 1) if total_completed > 0 else 0
            })
        
        elif stats_type == 'projectStats':
            # Статистика по проектам
            from collections import defaultdict
            
            project_stats = defaultdict(lambda: {'completed': 0, 'total': 0, 'pomodoro_hours': 0})
            
            for task in all_tasks:
                project_id = task[9] if len(task) > 9 else None
                project_name = task[10] if len(task) > 10 else 'Без проекта'
                completed = bool(task[3])
                completed_at = task[5] if len(task) > 5 else None
                started_at = task[7] if len(task) > 7 else None
                
                if project_id:
                    project_stats[project_name]['total'] += 1
                    if completed:
                        project_stats[project_name]['completed'] += 1
                        
                        # Подсчитываем время работы
                        if started_at and completed_at:
                            try:
                                start_time = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                                end_time = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                                duration = (end_time - start_time).total_seconds() / 3600  # в часах
                                project_stats[project_name]['pomodoro_hours'] += duration
                            except:
                                pass
            
            project_list = []
            for project_name, stats in project_stats.items():
                project_list.append({
                    'project': project_name,
                    'completed': stats['completed'],
                    'total': stats['total'],
                    'pomodoro_hours': round(stats['pomodoro_hours'], 1)
                })
            
            # Сортируем по количеству выполненных задач
            project_list.sort(key=lambda x: x['completed'], reverse=True)
            
            return jsonify({
                'projects': project_list
            })
        
        else:
            return jsonify({'error': 'Unknown stats type'}), 400
            
    except Exception as e:
        print(f"Ошибка получения статистики по типу: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# API для календаря
@app.route('/api/calendar/events', methods=['GET'])
def get_calendar_events():
    date = request.args.get('date')
    try:
        events = db.get_calendar_events(date=date)
        return jsonify([{
            'id': e[0],
            'title': e[1],
            'description': e[2] or '',
            'event_date': e[3],
            'event_time': e[4] or '',
            'created_at': e[5],
            'updated_at': e[6]
        } for e in events])
    except Exception as e:
        print(f"Ошибка получения событий календаря: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/calendar/events', methods=['POST'])
def create_calendar_event():
    try:
        data = request.json
        event_id = db.create_calendar_event(
            data.get('title', ''),
            data.get('event_date', ''),
            data.get('description', ''),
            data.get('event_time')
        )
        return jsonify({'id': event_id}), 201
    except Exception as e:
        print(f"Ошибка создания события календаря: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/calendar/events/<int:event_id>', methods=['PUT'])
def update_calendar_event(event_id):
    try:
        data = request.json
        db.update_calendar_event(
            event_id,
            title=data.get('title'),
            description=data.get('description'),
            event_date=data.get('event_date'),
            event_time=data.get('event_time')
        )
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f"Ошибка обновления события календаря: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/calendar/events/<int:event_id>', methods=['DELETE'])
def delete_calendar_event(event_id):
    try:
        db.delete_calendar_event(event_id)
        return jsonify({'success': True}), 200
    except Exception as e:
        print(f"Ошибка удаления события календаря: {e}")
        return jsonify({'error': str(e)}), 500

# API для синхронизации помидорного таймера
@app.route('/api/pomodoro/state', methods=['GET'])
def get_pomodoro_state():
    """Получить текущее состояние помидорного таймера"""
    try:
        import time
        state = getattr(app, 'pomodoro_state', None)
        if state:
            # Проверяем, не истекло ли время
            if 'startTime' in state:
                current_time = int(time.time() * 1000)
                elapsed = (current_time - state['startTime']) / 1000
                state['timeLeft'] = max(0, state.get('timeLeft', 0) - int(elapsed))
        return jsonify(state or {
            'timeLeft': 25 * 60,
            'state': 'idle',
            'workCount': 0
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pomodoro/state', methods=['POST'])
def save_pomodoro_state():
    """Сохранить состояние помидорного таймера"""
    try:
        import time
        data = request.json
        # Сохраняем состояние в памяти приложения (можно добавить в БД)
        app.pomodoro_state = {
            'timeLeft': data.get('timeLeft', 25 * 60),
            'state': data.get('state', 'idle'),
            'workCount': data.get('workCount', 0),
            'startTime': data.get('startTime', int(time.time() * 1000))
        }
        return jsonify({'success': True, 'state': app.pomodoro_state})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

