// --- КОНСТАНТЫ И НАСТРОЙКИ ИГРЫ ---
const BALANCE_KEY = 'fakeTonBalance';
const UPGRADES_KEY = 'upgradeLevels';
const REBIRTH_KEY = 'rebirthLevel'; 

let TAP_AMOUNT = 1.0; 

// Параметры Ребирта
const REBIRTH_BASE_COST = 20000.0;
const REBIRTH_COST_MULTIPLIER = 2.0; 
const REBIRTH_EARNINGS_MULTIPLIER = 2.0; 

let rebirthLevel = loadRebirthLevel(); 
// ...

// Определения уровней прокачки
const UPGRADE_DEFINITIONS = {
    // Усиление тапа: Теперь доход рассчитывается по формуле: 1.0 * (2^level)
    tap_boost: {
        baseCost: 10.0, 
        costMultiplier: 2.0, 
        baseValue: 1.0, // Начальный доход (при 0 уровне)
        valueIncrement: 2.0, // Это теперь базовый множитель (2x)
        valueKey: 'tapAmount',
    },
    // Пассивный доход (остается линейным)
    passive_income: {
        baseCost: 50.0, 
        costMultiplier: 2.5,
        baseValue: 0.0,
        valueIncrement: 5.0, 
        valueKey: 'incomeRate',
    }
};

// --- DOM ЭЛЕМЕНТЫ (остались прежними) ---
const balanceDisplay = document.getElementById('balance-display');
const tapButton = document.getElementById('tap-button');
const tapValueDisplay = document.getElementById('tap-value');
const incomeRateDisplay = document.getElementById('income-rate');

const rebirthLevelDisplay = document.getElementById('rebirth-level');
const rebirthMultiplierDisplay = document.getElementById('rebirth-multiplier');
const rebirthButton = document.getElementById('rebirth-btn');


// Элементы для переключения вкладок
const navItems = document.querySelectorAll('.footer-nav .nav-item');
const sections = {
    'wallet-section': document.getElementById('wallet-section'),
    'passive-section': document.getElementById('passive-section'),
    'exchange-section': document.getElementById('exchange-section')
};

let lastLoginTime = Date.now();
let activeUpgrades = loadUpgrades();


// --- ФУНКЦИИ ХРАНЕНИЯ ДАННЫХ (остались прежними) ---

function loadBalance() {
    const balance = localStorage.getItem(BALANCE_KEY);
    return parseFloat(balance) || 0.00;
}

function saveBalance(balance) {
    localStorage.setItem(BALANCE_KEY, balance.toFixed(2));
}

function loadUpgrades() {
    const upgrades = localStorage.getItem(UPGRADES_KEY);
    return JSON.parse(upgrades) || { tap_boost: 0, passive_income: 0 };
}

function saveUpgrades(upgrades) {
    localStorage.setItem(UPGRADES_KEY, JSON.stringify(upgrades));
}

function loadRebirthLevel() {
    const level = localStorage.getItem(REBIRTH_KEY);
    return parseInt(level) || 0;
}

function saveRebirthLevel(level) {
    localStorage.setItem(REBIRTH_KEY, level.toString());
}

// --- ФУНКЦИИ МНОЖИТЕЛЯ (остались прежними) ---
function getRebirthMultiplier() {
    return Math.pow(REBIRTH_EARNINGS_MULTIPLIER, rebirthLevel);
}


// --- ФУНКЦИИ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА ---

function updateUpgradeValue(upgradeId) {
    const level = activeUpgrades[upgradeId];
    const def = UPGRADE_DEFINITIONS[upgradeId];

    const nextCost = def.baseCost * (def.costMultiplier ** level);
    let currentValue;

    // НОВАЯ ЛОГИКА: Экспоненциальное усиление тапа (2^level)
    if (upgradeId === 'tap_boost') {
        // Уровень 0: 1.0 TON
        // Уровень 1: 1.0 * 2^1 = 2.0 TON
        // Уровень 2: 1.0 * 2^2 = 4.0 TON
        // Уровень 3: 1.0 * 2^3 = 8.0 TON
        // ...
        currentValue = def.baseValue * Math.pow(def.valueIncrement, level);
    } else {
        // Пассивный доход: Остается линейным
        currentValue = def.baseValue + (level * def.valueIncrement);
    }
    
    // Обновление TAP_AMOUNT, если это усиление тапа
    if (upgradeId === 'tap_boost') {
        TAP_AMOUNT = currentValue;
        tapValueDisplay.textContent = currentValue.toFixed(currentValue % 1 === 0 ? 0 : 2); 
    }
    
    // Обновление интерфейса карточки
    const card = document.querySelector(`.upgrade-card[data-upgrade-id="${upgradeId}"]`);
    if (card) {
        card.querySelector('.level').textContent = level;
        
        const displayValue = currentValue.toFixed(def.valueKey === 'incomeRate' ? 2 : (currentValue % 1 === 0 ? 0 : 2));
        card.querySelector('.value').textContent = displayValue;
        
        const buyBtn = card.querySelector('.buy-btn');
        const currentBalance = loadBalance();

        if (level < 10) { 
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
    
    const passiveLevel = activeUpgrades['passive_income'];
    const def = UPGRADE_DEFINITIONS['passive_income'];
    const totalIncome = def.baseValue + (passiveLevel * def.valueIncrement);
    incomeRateDisplay.textContent = totalIncome.toFixed(2);
    
    const currentMultiplier = getRebirthMultiplier();
    const nextRebirthCost = REBIRTH_BASE_COST * Math.pow(REBIRTH_COST_MULTIPLIER, rebirthLevel);
    const currentBalance = loadBalance();
    
    rebirthLevelDisplay.textContent = rebirthLevel;
    rebirthMultiplierDisplay.textContent = `${currentMultiplier.toFixed(0)}x`;
    
    rebirthButton.textContent = `Провести Ребирт (${nextRebirthCost.toFixed(0)} TON)`;
    rebirthButton.disabled = currentBalance < nextRebirthCost;
}

function updateDisplay() {
    const balance = loadBalance();
    balanceDisplay.textContent = balance.toFixed(2); 
    updateAllUpgradesUI();
}

// --- ЛОГИКА ПАССИВНОГО ДОХОДА (осталась прежней) ---

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

    const earnedIncome = (incomePerHour * timeElapsedHours) * getRebirthMultiplier();

    if (earnedIncome > 0.01) { 
        let currentBalance = loadBalance();
        currentBalance += earnedIncome;
        saveBalance(currentBalance);
        console.log(`[Пассив] Заработано: ${earnedIncome.toFixed(2)} TON за ${timeElapsedHours.toFixed(2)} часов.`);
    }

    lastLoginTime = currentTime;
    localStorage.setItem('lastLoginTime', currentTime.toString());
}


// --- ОБРАБОТЧИК РЕБИРТА (остался прежним) ---
function handleRebirth() {
    const nextRebirthCost = REBIRTH_BASE_COST * Math.pow(REBIRTH_COST_MULTIPLIER, rebirthLevel);
    let currentBalance = loadBalance();

    if (currentBalance >= nextRebirthCost) {
        if (!confirm(`Вы уверены, что хотите провести Ребирт? Это сбросит ваш баланс и все прокачки, но даст ${getRebirthMultiplier() * 2}x множитель!`)) {
            return;
        }
        
        currentBalance -= nextRebirthCost; 
        
        rebirthLevel++;
        saveRebirthLevel(rebirthLevel);
        
        saveBalance(0.00); 
        saveUpgrades({ tap_boost: 0, passive_income: 0 }); 
        
        saveBalance(currentBalance);
        
        console.log(`[РЕБИРТ] Проведен Ребирт #${rebirthLevel}. Новый множитель: ${getRebirthMultiplier()}x`);
        
        alert(`Ребирт #${rebirthLevel} успешно проведен! Ваш новый множитель: ${getRebirthMultiplier().toFixed(0)}x. Баланс и прокачки сброшены.`);
        window.location.reload(); 

    } else {
        alert(`Недостаточно TON для Ребирта. Требуется: ${nextRebirthCost.toFixed(0)} TON.`);
    }
}


// --- ОБРАБОТЧИКИ СОБЫТИЙ (Tap и Buy Upgrade) ---

function handleTap() {
    let currentBalance = loadBalance();
    
    // УЧЕТ МНОЖИТЕЛЯ РЕБИРТА
    const earnedAmount = TAP_AMOUNT * getRebirthMultiplier(); 
    currentBalance += earnedAmount;
    
    saveBalance(currentBalance);
    updateDisplay();

    // Визуальный отклик
    tapButton.textContent = `+${earnedAmount.toFixed(earnedAmount % 1 === 0 ? 0 : 2)}`;
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
    Object.values(sections).forEach(section => {
        if (section) section.classList.add('hidden');
    });
    
    const targetSection = sections[targetId];
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-target') === targetId) {
            item.classList.add('active');
        }
    });
}

// --- ИНИЦИАЛИЗАЦИЯ (осталась прежней) ---
document.addEventListener('DOMContentLoaded', () => {
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            if (targetId) { 
                 switchSection(targetId);
            }
        });
    });

    tapButton.addEventListener('click', handleTap);
    
    document.querySelectorAll('.buy-btn').forEach(btn => {
        if (btn.id !== 'rebirth-btn') {
            btn.addEventListener('click', handleBuyUpgrade);
        }
    });
    
    rebirthButton.addEventListener('click', handleRebirth);

    const savedTime = localStorage.getItem('lastLoginTime');
    if (savedTime) {
        lastLoginTime = parseInt(savedTime);
    }

    calculatePassiveIncome();

    updateDisplay();
});