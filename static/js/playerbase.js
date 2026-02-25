var userdata = JSON.parse(document.getElementById("userdata").textContent);
var scores = JSON.parse(document.getElementById("scores").textContent);

function searchResources() {
    const filter = document.getElementById('searchBox').value.toLowerCase();
    const items = document.querySelectorAll(".playerCont");

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(filter) ? "" : "none";
    });
}

document.getElementById("filter").addEventListener('click', () => {
    const box = document.getElementById("filterBox");
    const isVisible = box.style.display === "flex";
    box.style.display = isVisible ? "none" : "flex";
});

const list = document.getElementById('flexcont');
const radios = document.querySelectorAll('input[name="filter"]');

radios.forEach(radio => {
    radio.addEventListener('change', () => {
        const sortBy = radio.value;
        const items = Array.from(list.querySelectorAll('.playerCont'));
        items.sort((a, b) => {
            let valA = a.getAttribute(`data-${sortBy}`);
            let valB = b.getAttribute(`data-${sortBy}`);
            if (sortBy !== 'name') {
                return parseFloat(valB) - parseFloat(valA);
            }
            return valA.localeCompare(valB);
        });
        items.forEach(item => list.appendChild(item));
    });
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".ban").forEach(button => {
        button.addEventListener("click", function () {
            const playerCont = this.closest(".playerCont");
            const confirmBox = playerCont.querySelector(".banConf");
            document.querySelectorAll(".banConf").forEach(box => {
                if (box !== confirmBox) {
                    box.style.display = "none";
                }
            });
            if (playerCont.querySelector(".banConf").style.display == "flex") {
                playerCont.querySelector(".banConf").style.display = "none";
            } else {
                playerCont.querySelector(".banConf").style.display = "flex";
            }
        });
    });
});

function hide() {
    const info = document.getElementById("details");
    info.style.display = "none";
}

// number abbreviation function
function abbreviateNumber(value) {
    const formatter = Intl.NumberFormat('en', { notation: 'compact', compactDisplay: 'short' });
    return formatter.format(value);
}

document.querySelectorAll(".infobtn").forEach(button => {
    button.addEventListener('click', () => {
        const player = scores[button.closest(".playerCont").dataset.index];
        const inv = JSON.parse(player.inventory)
        let sortedI = inv.map((item => ` ${item.name}`));
        displayed = sortedI.slice(0, 50);
        let experience = player.xp;
        const info = document.getElementById("details");
        info.style.display = "block";
        info.style.background = player.theme;
        info.innerHTML = ` <h1>Player Details</h1>
                            <img id="pfpimg" src="${player.pfp}" style="width: 100px; height: 100px; border-radius: 50%; margin-top: 20px;"><br>
                            <h2 style="margin-top: 20px;">${player.displayname}</h2>
                            <div class="details-column">
                                <h3>Score</h3> <p>${abbreviateNumber(player.score)}</p>
                                <h3>Level</h3> <p>${player.level}</p>
                                <h3>Current XP</h3> <p style="font-size: ${experience.toString().length > 9 ? "11px" : "13px"}">${abbreviateNumber(player.xp)}</p>
                                <h3>Wishes</h3> <p>${player.wish}</p>
                                <h3>Income</h3> <p>$${abbreviateNumber(player.income)}/s</p>
                                <h3>Total Sold</h3> <p>${abbreviateNumber(player.totalSold)} pogs</p>
                                <h3>Crates Opened</h3> <p>${abbreviateNumber(player.cratesOpened)} crates</p>
                                <h3>Pogs in Inventory</h3> <p>${sortedI.length}</p>
                            </div>
                            <button id="hideBtn" onclick="hide()" style="margin-bottom: 10px;">Hide Details</button>`;
    });
});