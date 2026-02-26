function safeParseElement(id, fallback) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`Element #${id} not found, using fallback`);
        return fallback;
    }
    const txt = (el.textContent || '').trim();
    if (!txt) {
        console.warn(`Element #${id} is empty, using fallback`);
        return fallback;
    }
    try {
        return JSON.parse(txt);
    } catch (e) {
        console.error(`Failed to parse JSON from #${id}:`, e, txt);
        return fallback;
    }
}

var userdata = safeParseElement('userdata', {});
var scores = safeParseElement('scores', {});

function searchResources() {
    const input = document.getElementById('searchBox');
    const filter = input.value.toLowerCase();
    const li = document.querySelectorAll(".playerCont")

    for (let i = 0; i < li.length; i++) {
        const title = li[i].getElementsByTagName('p')[0];
        const titleText = title ? (title.textContent || title.innerText) : '';
        if (titleText.toLowerCase().indexOf(filter) > -1) {
            li[i].style.display = '';
        } else {
            li[i].style.display = 'none';
        }
    }
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
    // confirm ban buttons
    document.querySelectorAll('.confirm_yes').forEach(btn => {
        btn.addEventListener('click', function() {
            const playerCont = this.closest('.playerCont');
            if (!playerCont) return;
            const fid = playerCont.getAttribute('data-fid');
            const name = playerCont.getAttribute('data-name');
            // send ban request to server
            fetch('/api/ban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fid: fid, displayname: name })
            }).then(r => r.json()).then(res => {
                if (res && res.ok) {
                    // hide confirm box and optionally show a notice
                    playerCont.querySelector('.banConf').style.display = 'none';
                    alert(`Banned ${name}`);
                } else {
                    alert('Failed to ban user');
                }
            }).catch(err => {
                console.error('Ban request failed', err);
                alert('Failed to ban user');
            });
        });
    });
});