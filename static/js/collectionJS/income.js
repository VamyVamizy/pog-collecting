// cost multiplier
function getTotalIncome() {
    computeComboStats();
    const bonusMap = window.perNameBonus || {};

    let baseIncome = inventory.reduce((sum, item) => {
        const mult = bonusMap[item.name] || 1;
        return sum + Math.round(item.income * mult);
    }, 0);

     // Apply wish boost if active
    if (incomeWishActive && Date.now() < incomeWishEndTime) {
        return Math.floor(baseIncome * 1.3); // 30% boost to actual income
    }
    
    return baseIncome;
}

userIncome = getTotalIncome();


//update income display
function updateIncomeDisplay() {
    let currentIncome = getTotalIncome(); // includes boost if active
    document.getElementById("income").textContent = `($${abbreviateNumber(currentIncome)}/s)`;
}

// update income display every second
setInterval(() => {
    money += getTotalIncome(); // This will now include the 30% boost when active
    updateIncomeDisplay(); // Update the display too
}, 1000);

// update display on page load
updateIncomeDisplay();