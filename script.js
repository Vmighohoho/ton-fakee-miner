// --- КОНСТАНТЫ И НАСТРОЙКИ ИГРЫ ---
const BALANCE_KEY = 'fakeTonBalance';
const UPGRADES_KEY = 'upgradeLevels';

// ИЗМЕНЕНО: Начальный доход за тап 1.0 TON
let TAP_AMOUNT = 1.0; 

// Определения уровней прокачки
const UPGRADE_DEFINITIONS = {
    // Усиление тапа:
    tap_boost: {
        baseCost: 10.0, // ИЗМЕНЕНО: Первая покупка стоит 10 TON
        costMultiplier: 2.0, // Каждое следующее улучшение в 2 раза дороже
        baseValue: 1.0, // Начальный доход за тап
        valueIncrement: 1.0, // ИЗМЕНЕНО: Увеличение дохода за тап на 1.0 TON
        valueKey: 'tapAmount',
    },
    // Пассивный доход:
    passive_income: {
        baseCost: 50.0, // ИЗМЕНЕНО: Первая покупка стоит 50 TON
        costMultiplier: 2.5, // Удорожание в 2.5 раза
        baseValue: 0.0,
        valueIncrement: 5.0, // ИЗМЕНЕНО: Увеличение дохода в час на 5.0 TON
        valueKey: 'incomeRate',
    }
};

// --- DOM ЭЛЕМЕНТЫ ---
const balanceDisplay = document.getElementById('balance-display');
const tapButton = document.getElementById('tap-button');
const tapValueDisplay = document.getElementById('tap-value');
const incomeRateDisplay = document.getElementById('income-rate');

// Элементы для переключения вкладок
const navItems = document.querySelectorAll('.footer-nav .nav-item');
const sections = {
    'wallet-section': document.getElementById('wallet-section'),
    'passive-section': document.getElementById('passive-section'),
    'exchange-section': document.getElementById('exchange-section')
};

let lastLoginTime = Date.now();
let activeUpgrades = loadUpgrades();


// --- ФУНКЦИИ ХРАНЕНИЯ ДАННЫХ ---

function loadBalance() {
    // Теперь баланс отображается с 2 знаками после запятой для удобства (TON)
    const balance = localStorage.getItem(BALANCE_KEY);
    return parseFloat(balance) || 0.00;
}

function saveBalance(balance) {
    // Сохраняем с 2 знаками
    localStorage.setItem(BALANCE_KEY, balance.toFixed(2));
}

function loadUpgrades() {
    const upgrades = localStorage.getItem(UPGRADES_KEY);
    return JSON.parse(upgrades) || { tap_boost: 0, passive_income: 0 };
}

function saveUpgrades(upgrades) {
    localStorage.setItem(UPGRADES_KEY, JSON.stringify(upgrades));
}

// --- ФУНКЦИИ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА ---

function updateUpgradeValue(upgradeId) {
    const level = activeUpgrades[upgradeId];
    const def = UPGRADE_DEFINITIONS[upgradeId];

    const nextCost = def.baseCost * (def.costMultiplier ** level);
    const currentValue = def.baseValue + (level * def.valueIncrement);
    
    // Обновление TAP_AMOUNT, если это усиление тапа
    if (upgradeId === 'tap_boost') {
        TAP_AMOUNT = currentValue;
        // Отображаем с 1 знаком, если целое, или с 2
        tapValueDisplay.textContent = currentValue.toFixed(currentValue % 1 === 0 ? 0 : 2); 
    }
    
    // Обновление интерфейса карточки
    const card = document.querySelector(`.upgrade-card[data-upgrade-id="${upgradeId}"]`);
    if (card) {
        card.querySelector('.level').textContent = level;
        
        // Форматирование для отображения
        const displayValue = currentValue.toFixed(def.valueKey === 'incomeRate' ? 2 : (currentValue % 1 === 0 ? 0 : 2));
        card.querySelector('.value').textContent = displayValue;
        
        const buyBtn = card.querySelector('.buy-btn');
        const currentBalance = loadBalance();

        if (level < 10) { // Лимит на 10 уровней
            buyBtn.textContent = `Купить (${nextCost.toFixed(2)} TON)`;
            buyBtn.disabled = currentBalance < nextCost;
        } else {
             buyBtn.textContent = 'МАКС. УРОВЕНЬ';
             buyBtn.disabled = true;
        }
    }
}

function updateAllUpgradesUI() {
    updateUpgradeValue('tap_boost');
    updateUpgradeValue('passive_income');
    
    // Обновляем общий пассивный доход
    const passiveLevel = activeUpgrades['passive_income'];
    const def = UPGRADE_DEFINITIONS['passive_income'];
    const totalIncome = def.baseValue + (passiveLevel * def.valueIncrement);
    incomeRateDisplay.textContent = totalIncome.toFixed(2);
}

function updateDisplay() {
    const balance = loadBalance();
    balanceDisplay.textContent = balance.toFixed(2); // Баланс отображается с 2 знаками
    updateAllUpgradesUI();
}

// --- ЛОГИКА ПАССИВНОГО ДОХОДА ---

function calculatePassiveIncome() {
    const currentTime = Date.now();
    
    const passiveLevel = activeUpgrades['passive_income'];
    const def = UPGRADE_DEFINITIONS['passive_income'];
    const incomePerHour = def.baseValue + (passiveLevel * def.valueIncrement);
    
    if (incomePerHour === 0) {
        lastLoginTime = currentTime;
        localStorage.setItem('lastLoginTime', currentTime.toString());
        return;
    }

    const timeElapsedMs = currentTime - lastLoginTime;
    const timeElapsedHours = timeElapsedMs / (1000 * 60 * 60);

    const earnedIncome = incomePerHour * timeElapsedHours;

    if (earnedIncome > 0.01) { // Начисляем, только если набралось больше 0.01 TON
        let currentBalance = loadBalance();
        currentBalance += earnedIncome;
        saveBalance(currentBalance);
        console.log(`[Пассив] Заработано: ${earnedIncome.toFixed(2)} TON за ${timeElapsedHours.toFixed(2)} часов.`);
    }

    lastLoginTime = currentTime;
    localStorage.setItem('lastLoginTime', currentTime.toString());
}


// --- ОБРАБОТЧИКИ СОБЫТИЙ ---

function handleTap() {
    let currentBalance = loadBalance();
    currentBalance += TAP_AMOUNT;
    saveBalance(currentBalance);
    updateDisplay();

    // Визуальный отклик
    tapButton.textContent = `+${TAP_AMOUNT.toFixed(TAP_AMOUNT % 1 === 0 ? 0 : 2)}`;
    setTimeout(() => {
        tapButton.textContent = 'ТАПАТЬ';
    }, 200);
}

function handleBuyUpgrade(event) {
    const btn = event.target;
    const upgradeId = btn.getAttribute('data-cost-key');
    
    if (!upgradeId) return;

    const level = activeUpgrades[upgradeId];
    const def = UPGRADE_DEFINITIONS[upgradeId];
    const cost = def.baseCost * (def.costMultiplier ** level);
    
    let currentBalance = loadBalance();

    if (currentBalance >= cost && level < 10) {
        currentBalance -= cost;
        activeUpgrades[upgradeId]++;
        
        calculatePassiveIncome(); 

        saveBalance(currentBalance);
        saveUpgrades(activeUpgrades);
        updateDisplay();
        
        console.log(`[Покупка] Улучшен ${upgradeId} до уровня ${activeUpgrades[upgradeId]}. Потрачено: ${cost.toFixed(2)} TON.`);
    }
}

function switchSection(targetId) {
    // Скрываем все секции
    Object.values(sections).forEach(section => {
        if (section) section.classList.add('hidden');
    });
    
    // Показываем целевую секцию
    const targetSection = sections[targetId];
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Обновляем активный статус в навигации
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-target') === targetId) {
            item.classList.add('active');
        }
    });
}

// --- ИНИЦИАЛИЗАЦИЯ ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Устанавливаем слушатели навигации
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            if (targetId) { 
                 switchSection(targetId);
            }
        });
    });

    // 2. Устанавливаем слушатель на кнопку "ТАПАТЬ"
    tapButton.addEventListener('click', handleTap);
    
    // 3. Устанавливаем слушатели на кнопки покупки
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', handleBuyUpgrade);
    });

    // 4. Загружаем время последнего входа
    const savedTime = localStorage.getItem('lastLoginTime');
    if (savedTime) {
        lastLoginTime = parseInt(savedTime);
    }

    // 5. Расчет пассивного дохода, накопленного в оффлайне
    calculatePassiveIncome();

    // 6. Обновление интерфейса
    updateDisplay();
});