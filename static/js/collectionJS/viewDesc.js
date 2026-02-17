document.getElementById("inventory").addEventListener("click", (e) => {
    /* closest much be used to get newly added items.
    By default, if only using an event listener, the newly added items don't gain event listeners until refreshed.*/
    const itemDiv = e.target.closest(".item");
    if (!itemDiv) return;

    const index = itemDiv.dataset.index;
    const id = itemDiv.dataset.id;
    const item = inventory.find(i => i.id == id);
    if (!item) return; // defensive: item not found
    let sellvalue = Math.round((item.income * 2.94 * (level / 1.6))**((level / 100) + 1));
    selectedID = item.id;
    refreshInventory();
    viewDesc(
        index,
        item.name,
        item.locked,
        item.rarity,
        item.id,
        item.pogid,
        item.pogcol,
        item.creator,
        item.description,
        item.income,
        sellvalue
    )
});

//might use pogid and their color and creator down the line, unsure yet
function viewDesc(index, name, locked, rarity, id, pogid, color, creator, desc, income, value) {
    const panel = document.getElementById("descPanel");
    const ab_value = abbreviateNumber(value);
    panel.innerHTML = `
    <div id="headerName">
        <h3>${parseInt(index) + 1}: ${name}</h3>
        <h5>${color}</h5>
    </div>
    <div id="money-info">
        <div class="moneytxt">
            <img src="../static/icons/buttons_main/income.png" width="20" height="20">
            <strong>$${abbreviateNumber(Math.round(income * ((window.perNameBonus && window.perNameBonus[name])) || 1))}/s</strong>
        </div>
        <div class="moneytxt">
            <img src="../static/icons/buttons_main/sell.png" width="20" height="20">
            <strong>$${ab_value}</strong>
        </div>
    </div><br>
    <button id="sellbtn" style="filter: brightness(${locked ? 0.6 : 1}); pointer-events: ${locked ? "none" : "auto"}"onclick="sellItem(${id}, ${value}, ${locked})">${locked ? "Locked" : "Sell"}</button>
    `;
}