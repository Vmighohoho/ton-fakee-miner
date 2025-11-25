// --- КОНСТАНТЫ И НАСТРОЙКИ ИГРЫ ---
const BALANCE_KEY = 'fakeTonBalance';
const UPGRADES_KEY = 'upgradeLevels';
let TAP_AMOUNT = 0.00005;

// Определения уровней прокачки
const UPGRADE_DEFINITIONS = {
    tap_boost: {
        baseCost: 1.0,
        costMultiplier: 2.0, 
        baseValue: 0.00005,
        valueIncrement: 0.00010,
        valueKey: 'tapAmount',
    },
    passive_income: {
        baseCost: 5.0,
        costMultiplier: 3.0,
        baseValue: 0.0,
        valueIncrement: 0.05,
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
    'exchange-section': document.getElementById('exchange-section') // Добавлена новая секция
};

let lastLoginTime = Date.now();
let activeUpgrades = loadUpgrades();


// --- ФУНКЦИИ ХРАНЕНИЯ ДАННЫХ ---

function loadBalance() {
    const balance = localStorage.getItem(BALANCE_KEY);
    return parseFloat(balance) || 0.00000;
}

function saveBalance(balance) {
    localStorage.setItem(BALANCE_KEY, balance.toFixed(5));
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
    const nextValue = def.baseValue + ((level + 1) * def.valueIncrement);

    // Обновление TAP_AMOUNT, если это усиление тапа
    if (upgradeId === 'tap_boost') {
        TAP_AMOUNT = currentValue;
        tapValueDisplay.textContent = currentValue.toFixed(5);
    }
    
    // Обновление интерфейса карточки
    const card = document.querySelector(`.upgrade-card[data-upgrade-id="${upgradeId}"]`);
    if (card) {
        card.querySelector('.level').textContent = level;
        card.querySelector('.value').textContent = currentValue.toFixed(def.valueKey === 'incomeRate' ? 2 : 5);
        
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
    balanceDisplay.textContent = balance.toFixed(5);
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

    if (earnedIncome > 0.00001) {
        let currentBalance = loadBalance();
        currentBalance += earnedIncome;
        saveBalance(currentBalance);
        console.log(`[Пассив] Заработано: ${earnedIncome.toFixed(5)} TON за ${timeElapsedHours.toFixed(2)} часов.`);
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
    tapButton.textContent = `+${TAP_AMOUNT.toFixed(5)}`;
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
        
        // Важно: пересчитываем пассивный доход, чтобы применить новый уровень немедленно
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
            if (targetId) { // Проверяем, что data-target существует
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