"""
Утилита для получения локального IP адреса компьютера
"""
import socket

def get_local_ip():
    """Получить локальный IP адрес"""
    try:
        # Подключаемся к внешнему адресу (не отправляем данные)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        # Если не получилось, пробуем через hostname
        try:
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            return ip
        except Exception:
            return "127.0.0.1"

if __name__ == '__main__':
    ip = get_local_ip()
    print(f"Локальный IP адрес: {ip}")
    print(f"URL сервера: http://{ip}:5000")
    print(f"\nИспользуйте этот адрес для подключения с телефона")
    print(f"\nДля проверки подключения откройте на телефоне:")
    print(f"http://{ip}:5000/check")

