function count(items) {
    return items ? items.length : 0;
}

//sell all button
document.getElementById("sellAll").addEventListener("click", () => {
    confirmation = confirm(`Are you sure you want to sell all ${searching ? "searched " : ""}items in your inventory?`);
    if (confirmation == false) {
        return;
    }
    
    let soldCount = 0;
    let totalValue = 0;
    let rarityBreakdown = {};
    
    save();
    
    if (!searching) {
        const initialInv = inventory.length;
        for (let i = initialInv - 1; i >= 0; i--) {
            if (inventory[i].locked) {
                console.log(`Item sold at index: ${i} (name: ${inventory[i].name}), and lock is: ${inventory[i].locked}`);
                continue;
            }
            if (inventory.length == 0) {
                break;
            }
            
            const item = inventory[i];
            const sellValue = Math.round((item.income * 2.94 * (level / 1.6))**((level / 100) + 1));
            
            soldCount++;
            totalValue += sellValue;
            
            const rarity = item.rarity || 'Unknown';
            rarityBreakdown[rarity] = (rarityBreakdown[rarity] || 0) + 1;
            
            console.log(`Item sold at index: ${i} (name: ${item.name}), and lock is: ${item.locked}`);
            sellItem(item.id, sellValue, item.locked);
        }
    } else {
        const filteredItems = inventory.filter(item => item.name.toLowerCase().includes(itemSearched));
        const initialInv = filteredItems.length;
        for (let i = initialInv - 1; i >= 0; i--) {
            const item = filteredItems[i];
            const indexInInventory = inventory.findIndex(invItem => invItem.id === item.id);
            if (item.locked) {
                continue;
            }
            if (indexInInventory !== -1) {
                const sellValue = Math.round((item.income * 2.94 * (level / 1.6))**((level / 100) + 1));
                
                soldCount++;
                totalValue += sellValue;
                
                // Track rarity breakdown
                const rarity = item.rarity || 'Unknown';
                rarityBreakdown[rarity] = (rarityBreakdown[rarity] || 0) + 1;
                
                sellItem(item.id, sellValue, item.locked);
            }
        }
    }
    
    userIncome = getTotalIncome();
    
    if (soldCount > 0) {
        showSellAllNotification(soldCount, totalValue, rarityBreakdown);
    } else {
        showSuccessMessage("No items to sell (all items are locked)");
    }
});

// enhanced sell all notification system
function showSellAllNotification(soldCount, totalValue, rarityBreakdown) {
    const notification = document.createElement('div');
    notification.className = 'sell-all-notification';

    const rarityHTML = Object.entries(rarityBreakdown)
        .filter(([rarity, count]) => count > 0)
        .map(([rarity, count]) =>
        `<div class="rarity-item">
            <span class="rarity-dot" style="background-color: ${getRarityColor(rarity)}"></span>
            <span class="rarity-text">${rarity}: ${count}</span>
        </div>`
    ).join('');

    notification.innerHTML = `
        <div class="sell-notification-header">
            <h3>🎉 Sold All Pogs!</h3>
            <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="sell-notification-body">
            <div class="sell-summary">
                <div class="stat-item">
                    <span class="big-number">${soldCount}</span>
                    <span class="stat-label">Pogs Sold</span>
                </div>
                <div class="stat-item">
                    <span class="big-number">$${abbreviateNumber(totalValue)}</span>
                    <span class="stat-label">Total Earned</span>
                </div>
            </div>
            ${rarityBreakdown && Object.keys(rarityBreakdown).length > 0 ? `
                <div class="rarity-breakdown">
                    <h4>Rarity Breakdown:</h4>
                    <div class="rarity-list">
                        ${rarityHTML}
                    </div>
                </div>
            ` : ''}
        </div>
        <div class="celebration-sparkle">✨</div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 15px 35px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        min-width: 400px;
        max-width: 500px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .sell-notification-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding-bottom: 15px;
        }
        .sell-notification-header h3 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
        }
        .close-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 5px 8px;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        .sell-summary {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 15px;
        }
        .stat-item {
            text-align: center;
            flex: 1;
        }
        .big-number {
            display: block;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 13px;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .rarity-breakdown h4 {
            margin: 0 0 10px 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .rarity-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .rarity-item {
            display: flex;
            align-items: center;
            padding: 5px 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 6px;
        }
        .rarity-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 10px;
            box-shadow: 0 0 4px rgba(0,0,0,0.3);
        }
        .rarity-text {
            font-size: 13px;
            font-weight: 500;
        }
        .celebration-sparkle {
            position: absolute;
            top: -15px;
            right: -15px;
            font-size: 24px;
            animation: sparkleRotate 2s ease-in-out infinite;
        }
        @keyframes sparkleRotate {
            0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
            50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
        }
    `;
        
    document.head.appendChild(style);
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translate(-50%, -50%) scale(1)';
        notification.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.transform = 'translate(-50%, -50%) scale(0.9)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 400);
        }
    }, 6000);
} 

function getRarityColor(rarity) {
    const rarityColors = {
        'Trash': '#ff4444',
        'Common': '#ffd700',
        'Uncommon': '#00ff00',
        'Mythic': '#ff00ff',
        'Unique': '#ffffff',
    };
    return rarityColors[rarity] || '#cccccc';
}
