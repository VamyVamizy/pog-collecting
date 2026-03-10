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

    const incomeEl = document.getElementById("income");

    let text;
    if (showBaseIncome) {
        // Detailed view: base × multiplier
        text = `$${abbreviateNumber(baseIncome)}/s × ${multDisplay}`;
        if (incomeWishActive && Date.now() < incomeWishEndTime) {
            text += ` × 1.3🌟`;
        }
    } else {
        // Default view: final income
        text = `$${abbreviateNumber(currentIncome)}/s`;
    }
    // Only update DOM if text actually changed to avoid flashing
    if (incomeEl.textContent !== text) {
        incomeEl.textContent = text;
    }
}

// Click to toggle between final income and base + multiplier
document.getElementById("income").style.cursor = "pointer";
document.getElementById("income").addEventListener("click", () => {
    showBaseIncome = !showBaseIncome;
    updateIncomeDisplay();
});

// update income display every second
setInterval(() => {
    money += getTotalIncome(); // This will now include the multiplier + wish boost
    updateIncomeDisplay(); // Update the display too
}, 1000);

// update display on page load
updateIncomeDisplay();