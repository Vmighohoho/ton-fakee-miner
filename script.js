// --- КОНСТАНТЫ И НАСТРОЙКИ ИГРЫ ---
const BALANCE_KEY = 'fakeTonBalance';
const UPGRADES_KEY = 'upgradeLevels';
const REBIRTH_KEY = 'rebirthLevel'; 
const STARS_KEY = 'starsCount'; 
const LAST_LOGIN_KEY = 'lastLoginTime'; // Добавил константу для удобства

let TAP_AMOUNT = 1.0; 

// Параметры ЭКОНОМИКИ
const STARS_COST = 40000.0;
const NORMAL_REBIRTH_COST = 10000.0;
const STAR_REBIRTH_COST_STARS = 1;
const REBIRTH_COST_MULTIPLIER = 1.5; 

const STAR_REBIRTH_BOOST = 5; // Звездный ребирт дает +5 уровней множителя

let rebirthLevel = loadRebirthLevel(); 
let starsCount = loadStarsCount();

// Определения уровней прокачки
const UPGRADE_DEFINITIONS = {
    // Усиление тапа: Экспоненциальное удорожание
    tap_boost: {
        baseCost: 50.0, 
        costMultiplier: 2.5, 
        baseValue: 1.0, 
        valueIncrement: 2.0, 
        valueKey: 'tapAmount',
    },
    // Пассивный доход: Линейное удорожание
    passive_income: {
        baseCost: 200.0, 
        costMultiplier: 3.0, 
        baseValue: 0.0,
        valueIncrement: 10.0, 
        valueKey: 'incomeRate',
    }
};

// --- DOM ЭЛЕМЕНТЫ ---
const balanceDisplay = document.getElementById('balance-display');
const tapButton = document.getElementById('tap-button');
const tapValueDisplay = document.getElementById('tap-value');
const incomeRateDisplay = document.getElementById('income-rate');

const rebirthLevelDisplay = document.getElementById('rebirth-level');
const rebirthMultiplierDisplay = document.getElementById('rebirth-multiplier');

const normalRebirthButton = document.getElementById('rebirth-option-1');
const starRebirthButton = document.getElementById('rebirth-option-2');

const starCountDisplay = document.getElementById('star-count');
const buyStarButton = document.getElementById('buy-star-btn');
const fullResetButton = document.getElementById('full-reset-btn'); // НОВАЯ КНОПКА

const navItems = document.querySelectorAll('.footer-nav .nav-item');
const sections = {
    'wallet-section': document.getElementById('wallet-section'),
    'passive-section': document.getElementById('passive-section'),
    'exchange-section': document.getElementById('exchange-section'),
    'reset-section': document.getElementById('reset-section') // НОВАЯ СЕКЦИЯ
};

let lastLoginTime = Date.now();
let activeUpgrades = loadUpgrades();


// --- ФУНКЦИИ ХРАНЕНИЯ ДАННЫХ ---

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

function loadStarsCount() {
    const stars = localStorage.getItem(STARS_KEY);
    return parseInt(stars) || 0;
}

function saveStarsCount(stars) {
    localStorage.setItem(STARS_KEY, stars.toString());
}

// --- ФУНКЦИИ МНОЖИТЕЛЯ ---
function getRebirthMultiplier() {
    // Множитель = Уровень + 1 (т.е. Уровень 0 = 1x, Уровень 1 = 2x, Уровень 5 = 6x)
    return rebirthLevel + 1;
}


// --- ФУНКЦИИ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА ---

function updateUpgradeValue(upgradeId) {
    const level = activeUpgrades[upgradeId];
    const def = UPGRADE_DEFINITIONS[upgradeId];

    const nextCost = def.baseCost * (def.costMultiplier ** level);
    let currentValue;

    if (upgradeId === 'tap_boost') {
        currentValue = def.baseValue * Math.pow(def.valueIncrement, level);
    } else {
        currentValue = def.baseValue + (level * def.valueIncrement);
    }
    
    if (upgradeId === 'tap_boost') {
        TAP_AMOUNT = currentValue;
        tapValueDisplay.textContent = currentValue.toFixed(currentValue % 1 === 0 ? 0 : 2); 
    }
    
    const card = document.querySelector(`.upgrade-card[data-upgrade-id="${upgradeId}"]`);
    if (card) {
        card.querySelector('.level').textContent = level;
        
        const displayValue = currentValue.toFixed(def.valueKey === 'incomeRate' ? 2 : (currentValue % 1 === 0 ? 0 : 2));
        card.querySelector('.value').textContent = displayValue;
        
        const buyBtn = card.querySelector('.buy-btn');
        const currentBalance = loadBalance();

        buyBtn.textContent = `Купить (${nextCost.toFixed(2)} TON)`;
        buyBtn.disabled = currentBalance < nextCost;
    }
}

function updateRebirthUI() {
    const currentMultiplier = getRebirthMultiplier();
    // Нормальный Ребирт теперь дорожает по экспоненте, чтобы замедлить прогресс
    const nextNormalRebirthCost = NORMAL_REBIRTH_COST * Math.pow(REBIRTH_COST_MULTIPLIER, rebirthLevel);
    const currentBalance = loadBalance();
    
    rebirthLevelDisplay.textContent = rebirthLevel;
    rebirthMultiplierDisplay.textContent = `${currentMultiplier.toFixed(0)}x`;
    
    normalRebirthButton.textContent = `1x Ребирт (${nextNormalRebirthCost.toFixed(0)} TON)`;
    normalRebirthButton.disabled = currentBalance < nextNormalRebirthCost;
    
    starRebirthButton.innerHTML = `5x Ребирт (${STAR_REBIRTH_COST_STARS} <i class="fas fa-star tg-star"></i>)`; 
    starRebirthButton.disabled = starsCount < STAR_REBIRTH_COST_STARS;
}

function updateExchangeUI() {
    starCountDisplay.textContent = starsCount;
    buyStarButton.textContent = `Купить (${STARS_COST.toFixed(0)} TON)`;
    buyStarButton.disabled = loadBalance() < STARS_COST;
}


function updateAllUpgradesUI() {
    updateUpgradeValue('tap_boost');
    updateUpgradeValue('passive_income');
    
    const passiveLevel = activeUpgrades['passive_income'];
    const def = UPGRADE_DEFINITIONS['passive_income'];
    const totalIncome = def.baseValue + (passiveLevel * def.valueIncrement);
    incomeRateDisplay.textContent = totalIncome.toFixed(2);
    
    updateRebirthUI();
    updateExchangeUI();
}

function updateDisplay() {
    const balance = loadBalance();
    balanceDisplay.textContent = balance.toFixed(2); 
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
        localStorage.setItem(LAST_LOGIN_KEY, currentTime.toString());
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
    localStorage.setItem(LAST_LOGIN_KEY, currentTime.toString());
}


// --- ОБРАБОТЧИК ОБМЕНА ---
function handleBuyStar() {
    let currentBalance = loadBalance();

    if (currentBalance >= STARS_COST) {
        currentBalance -= STARS_COST;
        starsCount++;
        
        saveBalance(currentBalance);
        saveStarsCount(starsCount);
        updateDisplay();
        alert(`Поздравляем! Вы купили 1 Звезду. У вас ${starsCount} Звезд.`);

    } else {
        alert(`Недостаточно TON для покупки Звезды. Требуется: ${STARS_COST.toFixed(0)} TON.`);
    }
}


// --- ОБРАБОТЧИК РЕБИРТА ---
function handleRebirth(event) {
    const type = event.target.getAttribute('data-cost-key');
    let currentBalance = loadBalance();
    let newLevelIncrease = 0;
    let costText = "";
    let canPerform = false;

    if (type === 'normal_rebirth') {
        const cost = NORMAL_REBIRTH_COST * Math.pow(REBIRTH_COST_MULTIPLIER, rebirthLevel);
        costText = `${cost.toFixed(0)} TON`;
        newLevelIncrease = 1;
        
        if (currentBalance >= cost) {
            canPerform = true;
            currentBalance -= cost; 
        }
    } else if (type === 'star_rebirth') {
        const cost = STAR_REBIRTH_COST_STARS;
        costText = `${cost} Звезда`;
        newLevelIncrease = STAR_REBIRTH_BOOST;
        
        if (starsCount >= cost) {
            canPerform = true;
            starsCount -= cost; 
            saveStarsCount(starsCount); 
        }
    }

    if (canPerform) {
        if (!confirm(`Вы уверены, что хотите провести Ребирт на ${newLevelIncrease} уровней? Это сбросит ваш баланс и все прокачки, но увеличит множитель!`)) {
            return;
        }
        
        // 1. Увеличиваем уровень Ребирта
        rebirthLevel += newLevelIncrease;
        saveRebirthLevel(rebirthLevel);
        
        // 2. Сброс прогресса (прокачек)
        saveUpgrades({ tap_boost: 0, passive_income: 0 }); 
        
        // 3. СБРОС БАЛАНСА
        saveBalance(0.00); 

        // 4. СБРОС НАКОПЛЕННОГО ПАССИВНОГО ДОХОДА
        localStorage.setItem(LAST_LOGIN_KEY, Date.now().toString());
        
        const newMultiplier = getRebirthMultiplier();
        console.log(`[РЕБИРТ] Проведен Ребирт. Новый множитель: ${newMultiplier}x`);
        
        alert(`Ребирт успешно проведен! Ваш новый множитель: ${newMultiplier.toFixed(0)}x. Баланс и прокачки сброшены.`);
        window.location.reload(); 

    } else {
        alert(`Недостаточно ресурсов для Ребирта. Требуется: ${costText}.`);
    }
}

// --- НОВАЯ ФУНКЦИЯ: ПОЛНЫЙ СБРОС СТАТИСТИКИ ---
function handleFullReset() {
    if (confirm("ВНИМАНИЕ! Вы уверены, что хотите полностью сбросить весь прогресс (баланс, прокачки, Ребирт, Звезды)? Это действие необратимо.")) {
        
        // Удаляем все ключи из localStorage
        localStorage.removeItem(BALANCE_KEY);
        localStorage.removeItem(UPGRADES_KEY);
        localStorage.removeItem(REBIRTH_KEY);
        localStorage.removeItem(STARS_KEY);
        localStorage.removeItem(LAST_LOGIN_KEY);
        
        alert("Весь прогресс успешно сброшен. Игра начнется заново.");
        window.location.reload(); // Перезагружаем страницу для применения изменений
    }
}


// --- ОБРАБОТЧИКИ СОБЫТИЙ ---

function handleTap() {
    let currentBalance = loadBalance();
    
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

    if (currentBalance >= cost) {
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

// --- ИНИЦИАЛИЗАЦИЯ ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Навигация
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            if (targetId) { 
                 switchSection(targetId);
            }
        });
    });

    // Кнопка ТАПА
    tapButton.addEventListener('click', handleTap);
    
    // Кнопки ПОКУПКИ УЛУЧШЕНИЙ
    document.querySelectorAll('.buy-btn').forEach(btn => {
        if (!btn.classList.contains('rebirth-option') && btn.id !== 'buy-star-btn') {
            btn.addEventListener('click', handleBuyUpgrade);
        }
    });
    
    // Кнопки РЕБИРТА
    document.querySelectorAll('.rebirth-option').forEach(btn => {
        btn.addEventListener('click', handleRebirth);
    });

    // Кнопка ОБМЕНА
    buyStarButton.addEventListener('click', handleBuyStar);
    
    // КНОПКА ПОЛНОГО СБРОСА СТАТИСТИКИ
    fullResetButton.addEventListener('click', handleFullReset);

    // Загрузка данных и расчет
    const savedTime = localStorage.getItem(LAST_LOGIN_KEY);
    if (savedTime) {
        lastLoginTime = parseInt(savedTime);
    }

    calculatePassiveIncome();

    updateDisplay();
});