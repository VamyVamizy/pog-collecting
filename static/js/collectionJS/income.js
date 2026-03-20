// cost multiplier
function getTotalIncome() {
    computeComboStats();
    const bonusMap = window.perNameBonus || {};

    let baseIncome = inventory.reduce((sum, item) => {
        const mult = bonusMap[item.name] || 1;
        return sum + Math.round(item.income * mult);
    }, 0);

    // Level-based multiplier
    let multiplier = 1 + (level / 16) ** (level / 100);

    let totalIncome = Math.floor(baseIncome * multiplier);

    // Apply wish boost if active (on top of multiplier)
    if (incomeWishActive && Date.now() < incomeWishEndTime) {
        totalIncome = Math.floor(totalIncome * 1.3); // 30% boost
    }

    currentIncome = totalIncome;
    return totalIncome;
}

userIncome = getTotalIncome();

// Toggle state: false = show final income, true = show base + multiplier
let showBaseIncome = false;
let _lastFinalText = '';

//update income display
function updateIncomeDisplay() {
    currentIncome = getTotalIncome();

    const bonusMap = window.perNameBonus || {};
    const baseIncome = inventory.reduce((sum, item) => {
        const mult = bonusMap[item.name] || 1;
        return sum + Math.round(item.income * mult);
    }, 0);

    const multiplier = 1 + (level / 16) ** (level / 100);
    const multDisplay = multiplier.toFixed(2);

    const widget = document.getElementById("income");
    const finalEl = widget.querySelector('.iw-final');
    const detailEl = widget.querySelector('.iw-detail');

    // Build text
    const finalText = `$${abbreviateNumber(currentIncome)}/s`;
    const wishActive = incomeWishActive && Date.now() < incomeWishEndTime;
    const multStr = wishActive ? `×${multDisplay} ×1.3🌟` : `×${multDisplay}`;
    const detailHTML = `$${abbreviateNumber(baseIncome)}/s <span class="iw-mult">${multStr}</span>`;

    // Only update DOM when changed
    if (finalEl.textContent !== finalText) {
        finalEl.textContent = finalText;
        // Pulse the icon glow
        if (_lastFinalText !== '') {
            widget.classList.remove('income-pulse');
            void widget.offsetWidth;
            widget.classList.add('income-pulse');
        }
        _lastFinalText = finalText;
    }
    if (detailEl.innerHTML !== detailHTML) {
        detailEl.innerHTML = detailHTML;
    }
}

// Click toggles between final and detail via CSS class
const incomeWidget = document.getElementById("income");
const incomeIcon = document.getElementById("incomeIcon");
incomeIcon.addEventListener('click', () => {
    showBaseIncome = !showBaseIncome;
    incomeWidget.classList.toggle('show-detail', showBaseIncome);
});

// update income display every second
setInterval(() => {
    money += getTotalIncome();
    updateIncomeDisplay();
}, 1000);

// update display on page load
updateIncomeDisplay();