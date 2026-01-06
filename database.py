import sqlite3
import os
from datetime import datetime

class Database:
    def __init__(self, db_name='planner.db'):
        self.db_name = db_name
        self.init_database()
    
    def get_connection(self):
        return sqlite3.connect(self.db_name)
    
    def init_database(self):
        """Инициализация базы данных и создание таблиц"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Таблица проектов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                monthly_price REAL DEFAULT 0,
                is_subscription INTEGER DEFAULT 0,
                payment_date TEXT,
                sort_order INTEGER DEFAULT 0
            )
        ''')
        
        # Таблица задач
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                completed INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                deadline TEXT,
                price REAL DEFAULT 0,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            )
        ''')
        
        # Добавляем новые колонки если их нет (для существующих БД)
        try:
            cursor.execute('ALTER TABLE tasks ADD COLUMN completed_at TEXT')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует
        
        try:
            cursor.execute('ALTER TABLE tasks ADD COLUMN deadline TEXT')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует
        
        try:
            cursor.execute('ALTER TABLE tasks ADD COLUMN started_at TEXT')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует
        
        try:
            cursor.execute('ALTER TABLE tasks ADD COLUMN price REAL DEFAULT 0')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует
        
        try:
            cursor.execute('ALTER TABLE projects ADD COLUMN monthly_price REAL DEFAULT 0')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует
        
        try:
            cursor.execute('ALTER TABLE projects ADD COLUMN is_subscription INTEGER DEFAULT 0')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует
        
        try:
            cursor.execute('ALTER TABLE projects ADD COLUMN payment_date TEXT')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует
        
        try:
            cursor.execute('ALTER TABLE projects ADD COLUMN sort_order INTEGER DEFAULT 0')
            # Устанавливаем порядок для существующих проектов
            cursor.execute('UPDATE projects SET sort_order = id WHERE sort_order = 0 OR sort_order IS NULL')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует
        
        try:
            cursor.execute('ALTER TABLE tasks ADD COLUMN started_at TEXT')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует
        
        # Таблица для отслеживания времени работы с абонентскими клиентами за день
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_subscription_time (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                work_date TEXT NOT NULL,
                hours_worked REAL DEFAULT 0,
                FOREIGN KEY (project_id) REFERENCES projects (id),
                UNIQUE(project_id, work_date)
            )
        ''')
        
        # Таблица заметок проектов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                content TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            )
        ''')
        
        # Таблица заметок задач
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS task_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                content TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks (id)
            )
        ''')
        
        # Таблица для сохранения состояния UI (свернутость панели проектов)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ui_state (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL
            )
        ''')
        
        # Таблица паролей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS passwords (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'website',
                username TEXT,
                password TEXT NOT NULL,
                url TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            )
        ''')
        
        # Добавляем колонку type если её нет (для существующих БД)
        try:
            cursor.execute('ALTER TABLE passwords ADD COLUMN type TEXT DEFAULT "website"')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует
        
        # Таблица общих заметок (ежедневник) - теперь несколько заметок
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        
        # Добавляем колонку title если её нет (для существующих БД)
        try:
            cursor.execute('ALTER TABLE daily_notes ADD COLUMN title TEXT')
            # Если колонка была добавлена, обновляем существующие записи
            cursor.execute('UPDATE daily_notes SET title = "Заметка" WHERE title IS NULL')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует
        
        # Таблица событий календаря
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS calendar_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                event_date TEXT NOT NULL,
                event_time TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
    
    # Методы для работы с проектами
    def create_project(self, name, monthly_price=0, is_subscription=False, payment_date=None):
        conn = self.get_connection()
        cursor = conn.cursor()
        # Получаем максимальный порядок и добавляем 1
        cursor.execute('SELECT COALESCE(MAX(sort_order), 0) FROM projects')
        max_order = cursor.fetchone()[0]
        new_order = max_order + 1
        
        cursor.execute('''
            INSERT INTO projects (name, created_at, monthly_price, is_subscription, payment_date, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (name, datetime.now().isoformat(), monthly_price, 1 if is_subscription else 0, payment_date, new_order))
        conn.commit()
        project_id = cursor.lastrowid
        conn.close()
        return project_id
    
    def get_all_projects(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, COALESCE(monthly_price, 0) as monthly_price, 
                   COALESCE(is_subscription, 0) as is_subscription, payment_date,
                   COALESCE(sort_order, 0) as sort_order
            FROM projects 
            ORDER BY COALESCE(sort_order, 0) ASC, created_at DESC
        ''')
        projects = cursor.fetchall()
        conn.close()
        return projects
    
    def update_project(self, project_id, name=None, monthly_price=None, is_subscription=None, payment_date=None, sort_order=None):
        conn = self.get_connection()
        cursor = conn.cursor()
        updates = []
        params = []
        
        if name is not None:
            updates.append('name = ?')
            params.append(name)
        if monthly_price is not None:
            updates.append('monthly_price = ?')
            params.append(monthly_price)
        if is_subscription is not None:
            updates.append('is_subscription = ?')
            params.append(1 if is_subscription else 0)
        if payment_date is not None:
            updates.append('payment_date = ?')
            params.append(payment_date)
        if sort_order is not None:
            updates.append('sort_order = ?')
            params.append(sort_order)
        
        if updates:
            params.append(project_id)
            cursor.execute(f'UPDATE projects SET {", ".join(updates)} WHERE id = ?', params)
            conn.commit()
        conn.close()
    
    def update_projects_order(self, project_orders):
        """Обновить порядок нескольких проектов одновременно
        project_orders: список кортежей (project_id, sort_order)
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        for project_id, sort_order in project_orders:
            cursor.execute('UPDATE projects SET sort_order = ? WHERE id = ?', (sort_order, project_id))
        conn.commit()
        conn.close()
    
    def delete_project(self, project_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM projects WHERE id = ?', (project_id,))
        cursor.execute('DELETE FROM tasks WHERE project_id = ?', (project_id,))
        cursor.execute('DELETE FROM notes WHERE project_id = ?', (project_id,))
        conn.commit()
        conn.close()
    
    # Методы для работы с задачами
    def create_task(self, project_id, title, description='', deadline=None, price=0):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO tasks (project_id, title, description, created_at, deadline, price)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (project_id, title, description, datetime.now().isoformat(), deadline, price))
        conn.commit()
        task_id = cursor.lastrowid
        conn.close()
        return task_id
    
    def get_tasks(self, project_id, include_completed=True):
        """Получить задачи проекта с правильной сортировкой"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if include_completed:
            cursor.execute('''
                SELECT t.id, t.title, t.description, t.completed, t.created_at, t.completed_at, t.deadline, 
                       COALESCE(t.started_at, '') as started_at, COALESCE(t.price, 0) as price,
                       p.is_subscription
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
                WHERE t.project_id = ?
            ''', (project_id,))
        else:
            cursor.execute('''
                SELECT t.id, t.title, t.description, t.completed, t.created_at, t.completed_at, t.deadline, 
                       COALESCE(t.started_at, '') as started_at, COALESCE(t.price, 0) as price,
                       p.is_subscription
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
                WHERE t.project_id = ? AND t.completed = 0
            ''', (project_id,))
        
        tasks = cursor.fetchall()
        conn.close()
        
        # Добавляем project_id к каждой задаче для сортировки
        tasks_with_project = []
        for task in tasks:
            # Добавляем project_id в конец кортежа для удобства сортировки
            task_list = list(task)
            task_list.append(project_id)  # Добавляем project_id на позицию 9 (или последнюю)
            tasks_with_project.append(tuple(task_list))
        
        # Применяем сортировку
        sorted_tasks = self._sort_tasks(tasks_with_project, project_id)
        return sorted_tasks
    
    def get_all_tasks(self, include_completed=True):
        """Получить все задачи из всех проектов с правильной сортировкой"""
        conn = self.get_connection()
        cursor = conn.cursor()
        if include_completed:
            cursor.execute('''
                SELECT t.id, t.title, t.description, t.completed, t.created_at, t.completed_at, t.deadline, 
                       COALESCE(t.started_at, '') as started_at, COALESCE(t.price, 0) as price,
                       t.project_id, p.name as project_name, p.is_subscription
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
            ''')
        else:
            cursor.execute('''
                SELECT t.id, t.title, t.description, t.completed, t.created_at, t.completed_at, t.deadline, 
                       COALESCE(t.started_at, '') as started_at, COALESCE(t.price, 0) as price,
                       t.project_id, p.name as project_name, p.is_subscription
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
                WHERE t.completed = 0
            ''')
        tasks = cursor.fetchall()
        conn.close()
        
        # Применяем сортировку
        sorted_tasks = self._sort_tasks(tasks)
        return sorted_tasks
    
    def _update_subscription_time_on_completion(self, task_id, completed_at):
        """Обновить время работы с абонентским клиентом при завершении задачи"""
        from datetime import datetime, date
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Получаем информацию о задаче
        cursor.execute('''
            SELECT t.project_id, t.started_at, p.is_subscription
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.id = ?
        ''', (task_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return
        
        project_id, started_at, is_subscription = result
        
        # Если проект не абонентский, не обновляем
        if not is_subscription:
            conn.close()
            return
        
        # Вычисляем время работы
        if started_at and completed_at:
            try:
                start_time = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                duration_hours = (end_time - start_time).total_seconds() / 3600
                
                # Получаем дату работы
                work_date = end_time.date().isoformat()
                
                # Обновляем время за день
                current_hours = self.get_daily_subscription_time(project_id, work_date)
                new_hours = current_hours + duration_hours
                self.update_daily_subscription_time(project_id, work_date, new_hours)
            except Exception as e:
                print(f"Ошибка обновления времени абонентского клиента: {e}")
        
        conn.close()
    
    def get_daily_subscription_time(self, project_id, work_date):
        """Получить время работы с абонентским клиентом за день"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT hours_worked FROM daily_subscription_time
            WHERE project_id = ? AND work_date = ?
        ''', (project_id, work_date))
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else 0.0
    
    def update_daily_subscription_time(self, project_id, work_date, hours):
        """Обновить время работы с абонентским клиентом за день"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO daily_subscription_time (project_id, work_date, hours_worked)
            VALUES (?, ?, ?)
        ''', (project_id, work_date, hours))
        conn.commit()
        conn.close()
    
    def _sort_tasks(self, tasks, project_id=None):
        """
        Сортировка задач по правилам:
        1. Сначала задачи абонентских клиентов (не более 3 часов в день на одного)
        2. Потом задачи от старых к новым
        3. Если крайние сроки позволяют, сортировать по цене
        4. Все задачи от старых к новым
        """
        from datetime import datetime, date
        
        today = date.today().isoformat()
        
        # Разделяем задачи на завершенные и незавершенные
        completed_tasks = []
        uncompleted_tasks = []
        
        for task in tasks:
            # Определяем структуру task в зависимости от количества полей
            if len(task) >= 9:
                is_completed = bool(task[3])
                if is_completed:
                    completed_tasks.append(task)
                else:
                    uncompleted_tasks.append(task)
            else:
                # Старая структура
                is_completed = bool(task[3])
                if is_completed:
                    completed_tasks.append(task)
                else:
                    uncompleted_tasks.append(task)
        
        # Сортируем незавершенные задачи
        sorted_uncompleted = self._sort_uncompleted_tasks(uncompleted_tasks, today)
        
        # Сортируем завершенные задачи от старых к новым
        sorted_completed = sorted(completed_tasks, key=lambda t: t[4] if t[4] else '')  # created_at
        
        # Возвращаем сначала незавершенные, потом завершенные
        return sorted_uncompleted + sorted_completed
    
    def _sort_uncompleted_tasks(self, tasks, today):
        """Сортировка незавершенных задач"""
        from datetime import datetime, date
        
        # Группируем задачи по проектам
        subscription_tasks = []  # Задачи абонентских клиентов
        regular_tasks = []  # Обычные задачи
        
        for task in tasks:
            # Определяем is_subscription
            is_subscription = False
            if len(task) >= 10:
                # Новая структура с is_subscription (позиция 9)
                is_subscription = bool(task[9] if len(task) > 9 else 0)
            elif len(task) >= 12:
                # Структура из get_all_tasks (позиция 11)
                is_subscription = bool(task[11] if len(task) > 11 else 0)
            
            if is_subscription:
                subscription_tasks.append(task)
            else:
                regular_tasks.append(task)
        
        # Сортируем задачи абонентских клиентов
        sorted_subscription = self._sort_subscription_tasks(subscription_tasks, today)
        
        # Сортируем обычные задачи
        sorted_regular = self._sort_regular_tasks(regular_tasks)
        
        # Возвращаем сначала абонентские (до 3 часов), потом обычные
        return sorted_subscription + sorted_regular
    
    def _sort_subscription_tasks(self, tasks, today):
        """Сортировка задач абонентских клиентов (не более 3 часов в день на одного)"""
        from datetime import datetime, date
        
        # Группируем по проектам
        tasks_by_project = {}
        for task in tasks:
            # Получаем project_id в зависимости от структуры
            project_id = None
            if len(task) >= 12:
                # Структура из get_all_tasks: project_id на позиции 9
                project_id = task[9] if len(task) > 9 else None
            elif len(task) >= 10:
                # Структура из get_tasks: project_id добавлен в конец кортежа (позиция 9)
                project_id = task[9] if len(task) > 9 else None
            
            if project_id is None:
                continue
            
            if project_id not in tasks_by_project:
                tasks_by_project[project_id] = []
            tasks_by_project[project_id].append(task)
        
        # Сортируем проекты по времени работы за сегодня (меньше времени = выше приоритет)
        project_priorities = []
        for project_id, project_tasks in tasks_by_project.items():
            hours_worked = self.get_daily_subscription_time(project_id, today)
            # Если уже отработано 3+ часов, пропускаем этот проект
            if hours_worked >= 3.0:
                continue
            project_priorities.append((project_id, hours_worked, project_tasks))
        
        # Сортируем проекты по времени работы (меньше = выше приоритет)
        project_priorities.sort(key=lambda x: x[1])
        
        # Собираем задачи в правильном порядке
        sorted_tasks = []
        for project_id, hours_worked, project_tasks in project_priorities:
            # Сортируем задачи проекта от старых к новым, затем по цене если deadline позволяет
            sorted_project_tasks = self._sort_tasks_by_priority(project_tasks)
            sorted_tasks.extend(sorted_project_tasks)
        
        return sorted_tasks
    
    def _sort_regular_tasks(self, tasks):
        """Сортировка обычных задач"""
        return self._sort_tasks_by_priority(tasks)
    
    def _sort_tasks_by_priority(self, tasks):
        """
        Сортировка задач по приоритету:
        1. От старых к новым (created_at ASC)
        2. Если deadline позволяет, сортировать по цене (price DESC)
        """
        from datetime import datetime, date, timedelta
        
        today = date.today()
        
        def get_sort_key(task):
            # Получаем поля задачи
            created_at_str = task[4] if len(task) > 4 else ''  # created_at
            deadline_str = task[6] if len(task) > 6 else ''  # deadline
            price = float(task[8]) if len(task) > 8 else 0.0  # price
            
            # Парсим даты
            try:
                created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00')).date() if created_at_str else today
            except:
                created_at = today
            
            deadline = None
            if deadline_str:
                try:
                    deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00')).date()
                except:
                    try:
                        deadline = datetime.strptime(deadline_str, '%Y-%m-%d').date()
                    except:
                        deadline = None
            
            # Определяем, позволяет ли deadline сортировать по цене
            # Если deadline есть и до него больше 2 дней, можно сортировать по цене
            can_sort_by_price = False
            if deadline:
                days_until_deadline = (deadline - today).days
                if days_until_deadline > 2:
                    can_sort_by_price = True
            
            # Возвращаем ключ сортировки
            # Первый приоритет: created_at (старые первыми)
            # Второй приоритет: если можно по цене, то -price (больше цена = выше), иначе 0
            return (created_at, -price if can_sort_by_price else 0)
        
        return sorted(tasks, key=get_sort_key)
    
    def update_task(self, task_id, title=None, description=None, completed=None, deadline=None, started_at=None, price=None):
        conn = self.get_connection()
        cursor = conn.cursor()
        updates = []
        params = []
        
        if title is not None:
            updates.append('title = ?')
            params.append(title)
        if description is not None:
            updates.append('description = ?')
            params.append(description)
        if completed is not None:
            updates.append('completed = ?')
            params.append(completed)
            # Если задача завершается, записываем дату завершения
            if completed == 1:
                completed_at = datetime.now().isoformat()
                updates.append('completed_at = ?')
                params.append(completed_at)
                # Останавливаем таймер при завершении
                updates.append('started_at = NULL')
                # Обновляем время работы с абонентским клиентом
                self._update_subscription_time_on_completion(task_id, completed_at)
            # Если задача открывается обратно, очищаем дату завершения
            elif completed == 0:
                updates.append('completed_at = NULL')
        if deadline is not None:
            updates.append('deadline = ?')
            params.append(deadline)
        if started_at is not None:
            if started_at == '':
                updates.append('started_at = NULL')
            else:
                updates.append('started_at = ?')
                params.append(started_at)
        if price is not None:
            updates.append('price = ?')
            params.append(price)
        
        if updates:
            params.append(task_id)
            # Заменяем NULL на None для SQL
            query = 'UPDATE tasks SET ' + ', '.join(updates) + ' WHERE id = ?'
            cursor.execute(query, params)
            conn.commit()
        
        # Если задача завершена, обновляем время абонентского клиента (если еще не обновлено выше)
        if completed == 1:
            # Получаем completed_at из обновленной задачи
            cursor.execute('SELECT completed_at, started_at, project_id FROM tasks WHERE id = ?', (task_id,))
            result = cursor.fetchone()
            if result:
                completed_at, started_at, project_id = result
                if completed_at and started_at:
                    self._update_subscription_time_on_completion(task_id, completed_at)
        
        conn.close()
    
    def delete_task(self, task_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        # Удаляем заметки задачи
        cursor.execute('DELETE FROM task_notes WHERE task_id = ?', (task_id,))
        # Удаляем задачу
        cursor.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
        conn.commit()
        conn.close()
    
    # Методы для работы с заметками
    def get_note(self, project_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, content FROM notes
            WHERE project_id = ?
            LIMIT 1
        ''', (project_id,))
        note = cursor.fetchone()
        conn.close()
        return note
    
    def save_note(self, project_id, content):
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        # Проверяем, существует ли уже заметка для этого проекта
        existing = self.get_note(project_id)
        
        if existing:
            cursor.execute('''
                UPDATE notes
                SET content = ?, updated_at = ?
                WHERE project_id = ?
            ''', (content, now, project_id))
        else:
            cursor.execute('''
                INSERT INTO notes (project_id, content, created_at, updated_at)
                VALUES (?, ?, ?, ?)
            ''', (project_id, content, now, now))
        
        conn.commit()
        conn.close()
    
    # Методы для работы с заметками задач
    def get_task_note(self, task_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, content FROM task_notes
            WHERE task_id = ?
            LIMIT 1
        ''', (task_id,))
        note = cursor.fetchone()
        conn.close()
        return note
    
    def save_task_note(self, task_id, content):
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        # Проверяем, существует ли уже заметка для этой задачи
        existing = self.get_task_note(task_id)
        
        if existing:
            cursor.execute('''
                UPDATE task_notes
                SET content = ?, updated_at = ?
                WHERE task_id = ?
            ''', (content, now, task_id))
        else:
            cursor.execute('''
                INSERT INTO task_notes (task_id, content, created_at, updated_at)
                VALUES (?, ?, ?, ?)
            ''', (task_id, content, now, now))
        
        conn.commit()
        conn.close()
    
    # Методы для работы с состоянием UI
    def get_ui_state(self, key, default_value='0'):
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute('SELECT value FROM ui_state WHERE key = ?', (key,))
            result = cursor.fetchone()
            return result[0] if result else default_value
        except sqlite3.OperationalError as e:
            # Если таблица не существует, создаем её
            if 'no such table' in str(e).lower():
                self.init_database()
                return default_value
            raise
        finally:
            conn.close()
    
    def set_ui_state(self, key, value):
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO ui_state (key, value)
                VALUES (?, ?)
            ''', (key, str(value)))
            conn.commit()
        except sqlite3.OperationalError as e:
            # Если таблица не существует, создаем её и повторяем попытку
            if 'no such table' in str(e).lower():
                conn.rollback()
                self.init_database()
                cursor.execute('''
                    INSERT OR REPLACE INTO ui_state (key, value)
                    VALUES (?, ?)
                ''', (key, str(value)))
                conn.commit()
            else:
                raise
        finally:
            conn.close()
    
    # Глобальный поиск по задачам
    def search_tasks(self, query):
        conn = self.get_connection()
        cursor = conn.cursor()
        search_term = f'%{query}%'
        cursor.execute('''
            SELECT t.id, t.project_id, t.title, t.description, t.completed, p.name as project_name
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.title LIKE ? OR t.description LIKE ?
            ORDER BY t.created_at DESC
        ''', (search_term, search_term))
        tasks = cursor.fetchall()
        conn.close()
        return tasks
    
    # Методы для работы с паролями
    def create_password(self, project_id, name, type='website', username='', password='', url='', notes=''):
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO passwords (project_id, name, type, username, password, url, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (project_id, name, type, username, password, url, notes, now, now))
        conn.commit()
        password_id = cursor.lastrowid
        conn.close()
        return password_id
    
    def get_passwords(self, project_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, type, username, password, url, notes
            FROM passwords
            WHERE project_id = ?
            ORDER BY created_at DESC
        ''', (project_id,))
        passwords = cursor.fetchall()
        conn.close()
        return passwords
    
    def get_all_passwords(self):
        """Получить все пароли из всех проектов"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT p.id, p.name, p.type, p.username, p.password, p.url, p.notes, 
                   p.project_id, pr.name as project_name
            FROM passwords p
            LEFT JOIN projects pr ON p.project_id = pr.id
            ORDER BY p.created_at DESC
        ''')
        passwords = cursor.fetchall()
        conn.close()
        return passwords
    
    def get_password(self, password_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, project_id, name, type, username, password, url, notes
            FROM passwords
            WHERE id = ?
        ''', (password_id,))
        password = cursor.fetchone()
        conn.close()
        return password
    
    def update_password(self, password_id, name=None, type=None, username=None, password=None, url=None, notes=None):
        conn = self.get_connection()
        cursor = conn.cursor()
        updates = []
        params = []
        now = datetime.now().isoformat()
        
        if name is not None:
            updates.append('name = ?')
            params.append(name)
        if type is not None:
            updates.append('type = ?')
            params.append(type)
        if username is not None:
            updates.append('username = ?')
            params.append(username)
        if password is not None:
            updates.append('password = ?')
            params.append(password)
        if url is not None:
            updates.append('url = ?')
            params.append(url)
        if notes is not None:
            updates.append('notes = ?')
            params.append(notes)
        
        if updates:
            updates.append('updated_at = ?')
            params.append(now)
            params.append(password_id)
            cursor.execute(f'''
                UPDATE passwords
                SET {', '.join(updates)}
                WHERE id = ?
            ''', params)
            conn.commit()
        conn.close()
    
    def delete_password(self, password_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM passwords WHERE id = ?', (password_id,))
        conn.commit()
        conn.close()
    
    # Методы для работы с общими заметками (ежедневник)
    def get_all_daily_notes(self):
        """Получить все заметки ежедневника"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, title, content, created_at, updated_at FROM daily_notes ORDER BY updated_at DESC')
        notes = cursor.fetchall()
        conn.close()
        return notes
    
    def get_daily_note(self, note_id):
        """Получить конкретную заметку ежедневника"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, title, content, created_at, updated_at FROM daily_notes WHERE id = ?', (note_id,))
        note = cursor.fetchone()
        conn.close()
        return note
    
    def create_daily_note(self, title, content=''):
        """Создать новую заметку ежедневника"""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO daily_notes (title, content, created_at, updated_at)
            VALUES (?, ?, ?, ?)
        ''', (title, content, now, now))
        conn.commit()
        note_id = cursor.lastrowid
        conn.close()
        return note_id
    
    def update_daily_note(self, note_id, title=None, content=None):
        """Обновить заметку ежедневника"""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        updates = []
        params = []
        
        if title is not None:
            updates.append('title = ?')
            params.append(title)
        if content is not None:
            updates.append('content = ?')
            params.append(content)
        
        if updates:
            updates.append('updated_at = ?')
            params.append(now)
            params.append(note_id)
            cursor.execute(f'''
                UPDATE daily_notes
                SET {', '.join(updates)}
                WHERE id = ?
            ''', params)
            conn.commit()
        conn.close()
    
    def delete_daily_note(self, note_id):
        """Удалить заметку ежедневника"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM daily_notes WHERE id = ?', (note_id,))
        conn.commit()
        conn.close()
    
    # Методы для работы с событиями календаря
    def get_calendar_events(self, date=None):
        """Получить события календаря. Если date указан, возвращает события на эту дату"""
        conn = self.get_connection()
        cursor = conn.cursor()
        if date:
            cursor.execute('''
                SELECT id, title, description, event_date, event_time, created_at, updated_at
                FROM calendar_events
                WHERE event_date = ?
                ORDER BY COALESCE(event_time, '00:00') ASC
            ''', (date,))
        else:
            cursor.execute('''
                SELECT id, title, description, event_date, event_time, created_at, updated_at
                FROM calendar_events
                ORDER BY event_date ASC, COALESCE(event_time, '00:00') ASC
            ''')
        events = cursor.fetchall()
        conn.close()
        return events
    
    def create_calendar_event(self, title, event_date, description='', event_time=None):
        """Создать новое событие календаря"""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO calendar_events (title, description, event_date, event_time, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (title, description, event_date, event_time, now, now))
        conn.commit()
        event_id = cursor.lastrowid
        conn.close()
        return event_id
    
    def update_calendar_event(self, event_id, title=None, description=None, event_date=None, event_time=None):
        """Обновить событие календаря"""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        updates = []
        params = []
        
        if title is not None:
            updates.append('title = ?')
            params.append(title)
        if description is not None:
            updates.append('description = ?')
            params.append(description)
        if event_date is not None:
            updates.append('event_date = ?')
            params.append(event_date)
        if event_time is not None:
            updates.append('event_time = ?')
            params.append(event_time)
        
        if updates:
            updates.append('updated_at = ?')
            params.append(now)
            params.append(event_id)
            cursor.execute(f'''
                UPDATE calendar_events
                SET {', '.join(updates)}
                WHERE id = ?
            ''', params)
            conn.commit()
        conn.close()
    
    def delete_calendar_event(self, event_id):
        """Удалить событие календаря"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM calendar_events WHERE id = ?', (event_id,))
        conn.commit()
        conn.close()

