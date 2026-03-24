//sell all button
document.getElementById("sellAll").addEventListener("click", () => {
    confirmation = confirm(`Are you sure you want to sell all ${searching ? "searched " : ""}items in your inventory?`);
    if (confirmation == false) {
        return;
    }
    if (!searching) {
        const initialInv = inventory.length
        for (let i = initialInv - 1; i >= 0; i--) {
            if (inventory[i].locked) {
                console.log(`Item sold at index: ${i} (name: ${inventory[i].name}), and lock is: ${inventory[i].locked}`)
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
            save();
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
                save();
            }
        }
    }
    userIncome = getTotalIncome();
    // Single save after all items are sold
    save();
});