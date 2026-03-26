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
    // Toggle confirm box for ban/unban buttons
    document.querySelectorAll('.ban, .unban').forEach(button => {
        button.addEventListener('click', function () {
            const playerCont = this.closest('.playerCont');
            if (!playerCont) return;
            const confirmBox = playerCont.querySelector('.banConf');
            const confirmBtn = confirmBox.querySelector('.confirm_yes');
            const isUnban = this.classList.contains('unban');
            const action = isUnban ? 'unban' : 'ban';
            const heading = confirmBox.querySelector('h3');
            if (heading) heading.textContent = isUnban ? 'Unban user?' : 'Ban user?';
            if (confirmBtn) confirmBtn.setAttribute('data-action', action);

            // hide other confirm boxes
            document.querySelectorAll('.banConf').forEach(box => { if (box !== confirmBox) box.style.display = 'none'; });

            // toggle this box
            confirmBox.style.display = (confirmBox.style.display === 'flex') ? 'none' : 'flex';
        });
    });

    // confirm ban/unban buttons
    document.querySelectorAll('.confirm_yes').forEach(btn => {
        btn.addEventListener('click', function () {
            const playerCont = this.closest('.playerCont');
            if (!playerCont) return;
            const fid = playerCont.getAttribute('data-fid');
            const name = playerCont.getAttribute('data-name');
            const action = this.getAttribute('data-action') || 'ban';
            const url = action === 'unban' ? '/api/unban' : '/api/ban';

            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fid: fid, displayname: name })
            }).then(r => r.json()).then(res => {
                if (res && res.ok) {
                    // hide confirm box
                    playerCont.querySelector('.banConf').style.display = 'none';

                    // update the button in the options area
                    const optBtn = playerCont.querySelector('.ban, .unban');
                    if (optBtn) {
                        const img = optBtn.querySelector('img');
                        if (action === 'ban') {
                            optBtn.classList.remove('ban');
                            optBtn.classList.add('unban');
                            if (img) { img.style.filter = 'grayscale(100%)'; img.style.opacity = '0.6'; }
                            // update confirm action
                            const confirmBtn = playerCont.querySelector('.confirm_yes');
                            if (confirmBtn) confirmBtn.setAttribute('data-action', 'unban');
                        } else {
                            optBtn.classList.remove('unban');
                            optBtn.classList.add('ban');
                            if (img) { img.style.filter = ''; img.style.opacity = ''; }
                            const confirmBtn = playerCont.querySelector('.confirm_yes');
                            if (confirmBtn) confirmBtn.setAttribute('data-action', 'ban');
                        }
                    }

                    alert(action === 'ban' ? `Banned ${name}` : `Unbanned ${name}`);
                } else {
                    alert(action === 'ban' ? 'Failed to ban user' : 'Failed to unban user');
                }
            }).catch(err => {
                console.error('Ban/unban request failed', err);
                alert(action === 'ban' ? 'Failed to ban user' : 'Failed to unban user');
            });
        });
    });

    // reset user button (admins only as rendered by server)
    document.querySelectorAll('.resetbtn').forEach(button => {
        button.addEventListener('click', function () {
            const playerCont = this.closest('.playerCont');
            if (!playerCont) return;
            const fid = playerCont.getAttribute('data-fid');
            const name = playerCont.getAttribute('data-name');

            // require typing the FID to confirm
            const typed = window.prompt(`Type the numeric FID of ${name} to confirm reset (FID: ${fid}):`);
            if (typed == null) return; // cancelled
            if (String(typed).trim() !== String(fid).trim()) {
                alert('Confirmation FID did not match. Reset cancelled.');
                return;
            }

            fetch('/api/reset-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fid: fid, displayname: name, confirmFid: typed })
            }).then(async r => {
                // try to parse JSON body but fall back to text
                let body;
                const ct = r.headers.get('content-type') || '';
                try {
                    body = ct.includes('application/json') ? await r.json() : await r.text();
                } catch (e) {
                    body = await r.text().catch(() => null);
                }
                if (!r.ok) {
                    console.error('Reset failed', r.status, body);
                    const msg = body && (body.error || body.message) ? (body.error || body.message) : (typeof body === 'string' ? body : JSON.stringify(body));
                    alert(`Failed to reset user: ${msg}`);
                    return;
                }
                // success
                alert(`Reset user ${name}`);
                window.location.reload();
            }).catch(err => {
                console.error('Reset request failed', err);
                alert('Failed to reset user: network error');
            });
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
        const isAdmin = player.fid === 73 || player.fid === 44 || player.fid === 87 || player.fid === 26 || player.fid === 1;
        const OGcheater = player.displayname === "CarlosOrtPatrick";
        const rageBaiter = player.displayname === "GabbyS" || player.displayname === "CarlosOrtPatrick";
        const teacher = player.displayname === "MrSmith";
        const vincentL = player.displayname === "VincentL";
        const angryLego = player.displayname === "DylanM";
        const screamingTink = player.displayname === "Stephen Resch";
        const diddyblud = player.displayname === "Truit Elwell";
        const unemployed = player.displayname === "Kayden";
        const clop = player.displayname === "CarlosOrtPatrick";
        const gamergirl = player.displayname === "GabbyS";
        const spaghetti = player.displayname === "Donald";
        const wlw = player.displayname === "Passionate Yuri";
        const carterQ = player.displayname === "CarterQ";
        const betaTester = angryLego || screamingTink || diddyblud || unemployed || clop || gamergirl || spaghetti
        const tooltip = "Beta Testers are given custom tags";
        const info = document.getElementById("details");
        info.style.display = "block";
        info.innerHTML = ` 
        <div id="topWrap"><h1>Player Details</h1><button id="hideBtn" onclick="hide()" style="margin-bottom: 10px;">X</button></div>
        <img id="pfpimg" src="${player.pfp}" style="width: 100px; height: 100px; border-radius: 50%; margin-top: 20px; border: 4px solid ${player.theme}"><br>
    <h2 style="margin-top: 20px;">${player.displayname} <span style="font-size:0.8rem;color:rgba(175, 175, 175, 0.75);margin-left:8px;">FID: ${player.fid}</span></h2>
        <div class="tagCont">
            <div class="tag" style="display: ${carterQ ? 'flex' : 'none'}; background-color: #4d7c4bff;"><img src="../static/icons/playerbase/hacker.png" width="10" height="10"><div id="admin-text">Owner</div></div>
            <div class="tag" style="display: ${vincentL ? 'flex' : 'none'}; background-color: #4d7c4bff;"><img src="../static/icons/playerbase/hacker.png" width="10" height="10"><div id="admin-text">Co-Owner</div></div>
            <div class="tag" style="display: ${isAdmin ? 'flex' : 'none'};"><img src="../static/icons/playerbase/wrench.png" width="10" height="10"><div id="admin-text">Admin</div></div>
            <div class="tag" style="display: ${teacher ? 'flex' : 'none'}; background-color: green;"><img src="../static/icons/playerbase/teacher.png" width="10" height="10"><div id="admin-text">Teacher</div></div>
            <div class="tag" style="display: ${!teacher ? 'flex' : 'none'}; background-color: darkblue;"><img src="../static/icons/playerbase/student.png" width="10" height="10"><div id="admin-text">Student</div></div>
            <div class="tag" style="display: ${betaTester ? 'flex' : 'none'}; background-color: #8d1b4aff;"><img src="../static/icons/playerbase/tester.png" width="10" height="10"><div id="admin-text">Beta Tester</div></div>
            <div title="Original cheater on the site" class="tag" style="display: ${OGcheater ? 'flex' : 'none'}; background-color: purple;"><div id="admin-text">OG Cheater</div></div>
            <div title="D1 Student to pmo" class="tag" style="display: ${rageBaiter ? 'flex' : 'none'}; background-color: orange;"><div id="admin-text">Rage Baiter</div></div>
            <div class="tag" style="display: ${vincentL ? 'flex' : 'none'}; background-color: #676767;"><div id="admin-text">Gooner</div></div>
            <div title="${tooltip}" class="tag" style="display: ${angryLego ? 'flex' : 'none'}; background-color: brown;"><div id="admin-text">Angry Lego</div></div>
            <div title="${tooltip}" class="tag" style="display: ${screamingTink ? 'flex' : 'none'}; background-color: olive;"><div id="admin-text">Screaming Tink</div></div>
            <div title="${tooltip}" class="tag" style="display: ${diddyblud ? 'flex' : 'none'}; background-color: magenta;"><div id="admin-text">Diddyblud</div></div>
            <div title="${tooltip}" class="tag" style="display: ${unemployed ? 'flex' : 'none'}; background-color: orangered;"><div id="admin-text">Unemployed Man</div></div>
            <div title="${tooltip}" class="tag" style="display: ${clop ? 'flex' : 'none'}; background-color: #ffe555ff;"><div id="admin-text">Embodiment of Perfection</div></div>
            <div class="tag" style="display: ${clop ? 'flex' : 'none'}; background-color: #4e2c0cff;"><div id="admin-text">Venture Lover ♡</div></div>
            <div title="${tooltip}" class="tag" style="display: ${gamergirl ? 'flex' : 'none'}; background-color: #007BA7;"><div id="admin-text">GameGirl26</div></div>
            <div title="${tooltip}" class="tag" style="display: ${spaghetti ? 'flex' : 'none'}; background-color: #ff6347;"><div id="admin-text">Spaghetti</div></div>
            <div class="tag" style="display: ${carterQ ? 'flex' : 'none'}; background-color: #970000ff;"><div id="admin-text">RoyalCookiez</div></div>
            <div class="tag" style="display: ${carterQ ? 'flex' : 'none'}; background-color: #e6a1daff;"><div id="admin-text">Wife Leaver</div></div>
            <div class="tag" style="display: ${wlw ? 'flex' : 'none'}; background-color: #0e2e4c;"><div id="admin-text">wlw</div></div>
        </div>
        <br>
        <div class="details-column">
            <div><h3>Score</h3> <p>$${abbreviateNumber(player.score)}</p></div>
            <div><h3>Level</h3> <p>Lv. ${player.level}</p></div>
            <div><h3>Current XP</h3> <p>${abbreviateNumber(player.xp)} XP</p></div>
            <div><h3>Wishes</h3> <p>${player.wish} wish${player.wish !== 1 ? 'es' : ''}</p></div>
            <div><h3>Income</h3> <p>$${abbreviateNumber(player.income)}/s</p></div>
            <div><h3>Total Sold</h3> <p>${abbreviateNumber(player.totalSold)} pog${player.totalSold !== 1 ? 's' : ''}</p></div>
            <div><h3>Crates Opened</h3> <p>${abbreviateNumber(player.cratesOpened)} crat${player.cratesOpened !== 1 ? 'es' : ''}</p></div>
            <div><h3>Pogs in Inventory</h3> <p>${sortedI.length} pog${sortedI.length !== 1 ? 's' : ''}</p></div>
        </div>`;
    });
});