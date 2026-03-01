const rarityColor = [
    { name: "Trash", color: "red", income: 2 }, //trash
    { name: "Common", color: "yellow", income: 7 }, //common
    { name: "Uncommon", color: "lime", income: 13 }, //uncommon
    { name: "Mythic", color: "fuchsia", income: 20 }, //mythic
    { name: "Unique", color: "lightgray", income: 28 }, //unique
]

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
});