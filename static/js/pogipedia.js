const rarityColor = [
    { name: "Trash", color: "red", income: 2 }, //trash
    { name: "Common", color: "yellow", income: 7 }, //common
    { name: "Uncommon", color: "lime", income: 13 }, //uncommon
    { name: "Mythic", color: "fuchsia", income: 20 }, //mythic
    { name: "Unique", color: "lightgray", income: 28 }, //unique
]

function searchResources() {
    const filter = document.getElementById('searchBox').value.toLowerCase();
    const items = document.querySelectorAll(".pogCont");

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(filter) ? "" : "none";
    });
}

setInterval(function() {
    const search = document.getElementById('searchBox').value.toLowerCase();
    const filter = document.getElementById('filterBox');
    const noneOption = document.querySelector('input[name="filter"][value="none"]');
    if (search !== "") {
        filter.style.pointerEvents = "none";
        filter.style.filter = "grayscale(100%)";
        noneOption.checked = true;
    } else {
        filter.style.pointerEvents = "auto";
        filter.style.filter = "none";
    }
}, 100);

document.getElementById("filter").addEventListener('click', () => {
    const box = document.getElementById("filterBox");
    const isVisible = box.style.display === "flex";
    box.style.display = isVisible ? "none" : "flex";
});

const radios = document.querySelectorAll('input[name="filter"]');
radios.forEach(radio => {
    radio.addEventListener('change', () => {
        const selectedRarity = radio.value;
        const items = document.querySelectorAll('.pogCont');
        
        if (selectedRarity === "none") {
            items.forEach(item => item.style.display = "");
            return;
        }
        items.forEach(item => {
            const itemRarity = (item.getAttribute('data-rarity')).toLowerCase();
            item.style.display = itemRarity === selectedRarity ? "" : "none";
        });
    });
});

function getRarityColor(rarity) {
    const rarityInfo = rarityColor.find(r => r.name === rarity);
    return rarityInfo ? rarityInfo.color : "white";
}

document.addEventListener("DOMContentLoaded", function() {
    var userdata = JSON.parse(document.getElementById("userdata").textContent);
    var pogList = JSON.parse(document.getElementById("pogList").textContent);

    document.querySelectorAll(".pogCont").forEach(pog => {
        const rarity = pog.dataset.rarity;
        pog.querySelector("#rarityBanner").style.backgroundColor = getRarityColor(rarity);
    });

    //sort by rarity
    const rarityOrder = { "Trash": 0, "Common": 1, "Uncommon": 2, "Mythic": 3, "Unique": 4 };
    const pogContainers = Array.from(document.querySelectorAll(".pogCont"));
    pogContainers.sort((a, b) => rarityOrder[a.dataset.rarity] - rarityOrder[b.dataset.rarity]);
    pogContainers.forEach(pog => pog.parentNode.appendChild(pog));
});

document.querySelectorAll(".pogCont").forEach(pog => {
    pog.addEventListener("click", function() {
        const det = document.getElementById("pogInfo");
        const name = this.dataset.name;
        const description = this.dataset.description;
        const creator = this.dataset.creator;
        const id = this.dataset.id;
        const code = this.dataset.code;
        const color = this.dataset.color;
        const code2 = this.dataset.code2;
        const type = this.dataset.type;
        const number = this.dataset.number;

        det.innerHTML = `
            <h2>${name}</h2>
            <p id="desc">${description}</p>
            <p>Creator: ${creator}</p>
            <p>ID: ${id}</p>
            <p>Code: ${code}</p>
            <p>Color: ${color}</p>
            <p>Code 2: ${code2}</p>
            <p>Type: ${type}</p>
            <p>Number: ${number}</p>
            <img src="../static/icons/images/pogs/${code2}.webp" width="200" height="200" alt="image doesn't exist" style="margin-top: 20px;">
        `;

        det.style.display = 'flex';
    });
});
