document.getElementById("searchbtn").addEventListener("click", () => {
    box = document.getElementById("searchbox")
    inv = document.getElementById("inventory")
    searching = true;
    document.getElementById("descPanel").innerHTML = "";
    if (searching) {
        itemSearched = box.value.toLowerCase();
        refreshInventory();
    }
});

const selectSortEl = document.getElementById("selectSort");
if (selectSortEl) {
    selectSortEl.addEventListener("change", () => {
        sorting();
        refreshInventory();
        if (typeof save === 'function') save();
    });
}

function getSortBy() {
    if (selectSortEl) return selectSortEl.value;
    const r = document.querySelector('input[name="filterSort"]:checked');
    return r ? r.value : 'nameAZ';
}

function sorting() {
    const sortBy = getSortBy();
    inventory = Object.values(inventory);
    const rarityOrder = { 'Otherworldly': 7, 'Unique': 6, 'Mythic': 5, 'Rare': 4, 'Uncommon': 3, 'Common': 2, 'Trash': 1 };
    if (sortBy === "rarityHf") {
        inventory.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
    } else if (sortBy === "rarityLf") {
        inventory.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
    } else if (sortBy === "nameAZ") {
        inventory.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "nameZA") {
        inventory.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "svHf") {
        inventory.sort((a, b) => (Math.round(b.income * 1.05)) - (Math.round(a.income * 1.05)));
    } else if (sortBy === "svLf") {
        inventory.sort((a, b) => (Math.round(a.income * 1.05)) - (Math.round(b.income * 1.05)));
    }
}

let searching = false;
let itemSearched = "";

setInterval(() => {
    if (itemSearched === "") {
        searching = false;
    }
}, 100);

document.addEventListener('DOMContentLoaded', () => {
    const radios = document.querySelectorAll('input[name="filterSort"]');
    if (radios && radios.length) {
        radios.forEach(r => r.addEventListener('change', () => {
            sorting();
            refreshInventory();
            if (typeof save === 'function') save();
            try { localStorage.setItem('defaultValue', getSortBy()); } catch (e) {}
        }));

        const saved = localStorage.getItem('defaultValue');
        if (saved) {
            const sel = document.querySelector(`input[name="filterSort"][value="${saved}"]`);
            if (sel) sel.checked = true;
        } else {
            const defaultEl = document.querySelector('input[name="filterSort"][value="nameAZ"]');
            if (defaultEl) defaultEl.checked = true;
        }
    }

    if (selectSortEl) {
        const saved = localStorage.getItem('defaultValue');
        if (saved) selectSortEl.value = saved;
    }

    sorting();
});