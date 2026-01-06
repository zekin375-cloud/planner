// Защита сайта пинкодом при неактивности пользователя

const PINCODE = '2002';
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 минут в миллисекундах

let idleTimer = null;
let isLocked = false;
let lastActivityTime = Date.now();
let listenersSetup = false; // Флаг, что слушатели уже установлены

// Инициализация защиты
export function initIdleProtection() {
    // Устанавливаем слушатели только один раз
    if (!listenersSetup) {
        setupActivityListeners();
        setupPincodeInputs();
        listenersSetup = true;
    }
    
    // Запускаем таймер неактивности
    resetIdleTimer();
    
    // Проверяем, не заблокирован ли уже сайт при загрузке
    const savedLockState = sessionStorage.getItem('siteLocked');
    if (savedLockState === 'true') {
        showPincodeModal();
    }
}

// Сброс таймера неактивности
function resetIdleTimer() {
    if (idleTimer) {
        clearTimeout(idleTimer);
    }
    
    lastActivityTime = Date.now();
    
    idleTimer = setTimeout(() => {
        if (!isLocked) {
            showPincodeModal();
        }
    }, IDLE_TIMEOUT);
}

// Настройка слушателей активности
function setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
        document.addEventListener(event, () => {
            if (!isLocked) {
                resetIdleTimer();
            }
        }, { passive: true });
    });
    
    // Также отслеживаем фокус окна
    window.addEventListener('focus', () => {
        if (!isLocked) {
            resetIdleTimer();
        }
    });
}

// Показать модальное окно пинкода
function showPincodeModal() {
    isLocked = true;
    sessionStorage.setItem('siteLocked', 'true');
    
    const modal = document.getElementById('pincodeModal');
    if (modal) {
        modal.classList.add('show');
        
        // Очищаем все поля ввода
        for (let i = 1; i <= 4; i++) {
            const input = document.getElementById(`pincodeInput${i}`);
            if (input) {
                input.value = '';
                input.classList.remove('error');
            }
        }
        
        // Фокусируемся на первом поле
        const firstInput = document.getElementById('pincodeInput1');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Блокируем весь интерфейс
        document.body.classList.add('locked');
    }
}

// Скрыть модальное окно пинкода
function hidePincodeModal() {
    isLocked = false;
    sessionStorage.removeItem('siteLocked');
    
    const modal = document.getElementById('pincodeModal');
    if (modal) {
        modal.classList.remove('show');
    }
    
    // Разблокируем интерфейс
    document.body.classList.remove('locked');
    
    // Сбрасываем таймер
    resetIdleTimer();
}

// Получить введенный пинкод из всех полей
function getEnteredPincode() {
    let pincode = '';
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`pincodeInput${i}`);
        if (input) {
            pincode += input.value.trim();
        }
    }
    return pincode;
}

// Проверка пинкода
export function checkPincode() {
    const enteredPincode = getEnteredPincode();
    
    if (enteredPincode.length === 4) {
        if (enteredPincode === PINCODE) {
            hidePincodeModal();
        } else {
            // Показываем ошибку
            const errorMsg = document.getElementById('pincodeError');
            if (errorMsg) {
                errorMsg.textContent = 'Неверный пинкод';
                errorMsg.style.display = 'block';
            }
            
            // Очищаем все поля и добавляем класс ошибки
            for (let i = 1; i <= 4; i++) {
                const input = document.getElementById(`pincodeInput${i}`);
                if (input) {
                    input.value = '';
                    input.classList.add('error');
                }
            }
            
            // Убираем класс ошибки через 1 секунду
            setTimeout(() => {
                for (let i = 1; i <= 4; i++) {
                    const input = document.getElementById(`pincodeInput${i}`);
                    if (input) {
                        input.classList.remove('error');
                    }
                }
                if (errorMsg) {
                    errorMsg.style.display = 'none';
                }
            }, 2000);
            
            // Фокусируемся на первом поле
            const firstInput = document.getElementById('pincodeInput1');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }
}

// Обработка ввода в поля пинкода
function setupPincodeInputs() {
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`pincodeInput${i}`);
        if (input) {
            // Обработка ввода - только цифры
            input.addEventListener('input', (e) => {
                // Убираем все нецифровые символы
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                
                // Если введена цифра и не последнее поле, переключаемся на следующее
                if (e.target.value && i < 4) {
                    const nextInput = document.getElementById(`pincodeInput${i + 1}`);
                    if (nextInput) {
                        nextInput.focus();
                    }
                }
                
                // Если все 4 поля заполнены, проверяем пинкод
                if (getEnteredPincode().length === 4) {
                    setTimeout(() => checkPincode(), 100);
                }
            });
            
            // Обработка Backspace - переключение на предыдущее поле
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && i > 1) {
                    const prevInput = document.getElementById(`pincodeInput${i - 1}`);
                    if (prevInput) {
                        prevInput.focus();
                        prevInput.value = '';
                    }
                }
            });
            
            // Обработка стрелок
            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft' && i > 1) {
                    const prevInput = document.getElementById(`pincodeInput${i - 1}`);
                    if (prevInput) prevInput.focus();
                } else if (e.key === 'ArrowRight' && i < 4) {
                    const nextInput = document.getElementById(`pincodeInput${i + 1}`);
                    if (nextInput) nextInput.focus();
                }
            });
            
            // Обработка вставки (paste)
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = (e.clipboardData || window.clipboardData).getData('text');
                const digits = pastedData.replace(/[^0-9]/g, '').slice(0, 4);
                
                // Заполняем поля начиная с текущего
                for (let j = 0; j < digits.length && (i + j) <= 4; j++) {
                    const targetInput = document.getElementById(`pincodeInput${i + j}`);
                    if (targetInput) {
                        targetInput.value = digits[j];
                    }
                }
                
                // Фокусируемся на последнем заполненном поле или следующем
                const lastFilled = Math.min(i + digits.length, 4);
                const nextInput = document.getElementById(`pincodeInput${lastFilled}`);
                if (nextInput) {
                    nextInput.focus();
                }
                
                // Если все 4 поля заполнены, проверяем пинкод
                if (getEnteredPincode().length === 4) {
                    setTimeout(() => checkPincode(), 100);
                }
            });
        }
    }
}

// Блокировка сайта пинкодом (вызывается при нажатии на кнопку замка)
export function lockSite() {
    // Останавливаем таймер неактивности
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
    // Блокируем сайт
    showPincodeModal();
}

// Экспорт функций для использования в других модулях
export { showPincodeModal, hidePincodeModal };

