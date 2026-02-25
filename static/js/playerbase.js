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

if (userdata.fid === 73 || userdata.fid === 87) {
    document.querySelectorAll(".ban").forEach(button => {
        button.style.display = "flex";
    });
    document.querySelectorAll(".confirm_yes").forEach(button => {
        button.addEventListener("click", function () {
            const playerCont = this.closest(".playerCont");
            const fid = playerCont.getAttribute("data-fid");

        });
    });
}

