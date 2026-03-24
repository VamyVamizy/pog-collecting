function save() {
    const payload = {
        lightMode: theme_col,
        money: money,
        inventory: inventory,
        Isize: Isize,
        xp: xp,
        maxXP: maxXP,
        level: level,
        income: userIncome,
        totalSold: totalSold,
        cratesOpened: cratesOpened,
        pogAmount: pogAmount,
        achievements: window.achievements,
        tiers: window.tiers,
        mergeCount: window.mergeCount,
        highestCombo: highestCombo,
        wish: wish,
        crates: crates,
        pfp: pfpimg,

        // wish state fields so players don't lose their buff when they refresh
        incomeWishActive: incomeWishActive,
        incomeWishEndTime: incomeWishEndTime,
        dropRateWishActive: dropRateWishActive,
        dropRateWishEndTime: dropRateWishEndTime,
        clarityWishActive: clarityWishActive,
        clarityWishEndTime: clarityWishEndTime,
        clarityPreviews: clarityPreviews,
        clarityResults: clarityResults,
        clarityUsedCount: clarityUsedCount,

        // client-side save timestamp (ms since epoch) used to detect stale saves
        clientSaveTime: Date.now()
    };

    fetch('/datasave', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(async response => {
        let data = null;
        try { data = await response.json(); } catch (e) { data = null; }
        return { ok: response.ok, status: response.status, data };
    })
    .then(({ ok, status, data }) => {
        if (!ok && data && data.reload) {
            console.warn('[DATASAVE] Server rejected stale save, reloading page');
            window.location.reload();
            return;
        }

        // If server corrected any values (anti-cheat), apply them locally
        if (data && data.corrected) {
            const c = data.corrected;
            if (c.money !== undefined)        money = c.money;
            if (c.Isize !== undefined)        Isize = c.Isize;
            if (c.wish !== undefined)         wish = c.wish;
            if (c.xp !== undefined)           xp = c.xp;
            if (c.maxXP !== undefined)        maxXP = c.maxXP;
            if (c.level !== undefined)        level = c.level;
            if (c.cratesOpened !== undefined)  cratesOpened = c.cratesOpened;
            if (c.totalSold !== undefined)     totalSold = c.totalSold;
            if (c.mergeCount !== undefined)    mergeCount = c.mergeCount;
            if (c.highestCombo !== undefined)  highestCombo = c.highestCombo;
            if (c.inventory !== undefined) {
                // Replace client inventory with server-canonical inventory
                try { inventory = Array.isArray(c.inventory) ? c.inventory : JSON.parse(c.inventory); } catch (e) { inventory = []; }
                console.warn('[ANTI-CHEAT] Server corrected inventory; replaced client inventory');
            }
            if (c.income !== undefined) {
                userIncome = c.income;
            }
            console.warn('[ANTI-CHEAT] Server corrected values:', c);
        }
    })
    .catch(err => {
        console.error("Error saving data:", err);
    });
}

// parse server-rendered userdata safely and expose current user
function safeParseUserdata() {
    const el = document.getElementById('userdata');
    if (!el) return {};
    let txt = el.textContent || el.innerText || '';
    txt = String(txt).trim();
    if (!txt) return {};
    try {
        return JSON.parse(txt);
    } catch (e) {
        console.warn('safeParseUserdata: failed to parse JSON from #userdata', e);
        return {};
    }
}

const __currentUser = safeParseUserdata();

function _applyBannedUi() {
    if (!(__currentUser && __currentUser.isBanned)) return;
    const makeDisabled = (id, msg) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.opacity = '0.45';
        el.style.filter = 'grayscale(100%)';
        el.style.pointerEvents = 'none';
        el.title = msg || 'You are banned';
        // if it's a button, also add aria-disabled
        el.setAttribute('aria-disabled', 'true');
        // add a visual class if CSS wants to target it
        el.classList.add('banned-ui');
    };

    makeDisabled('marketplaceButton', 'You are banned and cannot access the Marketplace.');
    makeDisabled('chatRoomButton', 'You are banned and cannot access the Trade Plaza.');
    makeDisabled('practice', 'You are banned and cannot access Practice mode.');
}

// run asap to grey out banned controls
try { _applyBannedUi(); } catch (e) { console.error('Failed to apply banned UI', e); }

function hidePanelAni(ele) {
    ele.classList.remove("showPanel");
    void ele.offsetHeight; // force reflow
    ele.classList.add("hidePanel");
    ele.style.pointerEvents = "none";
    ele.addEventListener("animationend", (e) => {
        if (e.animationName !== "close_red") return;
        ele.style.display = "none";
        ele.classList.remove("hidePanel");
    }, { once: true });
}

//Show redirect panel
function showPanelAni(ele) {
    ele.style.display = "grid";
    ele.classList.remove("hidePanel");
    ele.style.pointerEvents = "none";
    ele.classList.add("showPanel");
    ele.addEventListener("animationend", () => {
        ele.style.pointerEvents = "all";
    }, { once: true });
}

//Redirect interaction
document.getElementById("burger_btn").addEventListener("click", () => {
    const panel = document.getElementById("redirect_panel")
    const isVisible = panel.style.display === "grid";
    if (isVisible) {
        hidePanelAni(panel);
    } else {
        showPanelAni(panel)
    }
});

// save game
document.getElementById("patchNotesButton").addEventListener("click", () => {
    achievements[4][0].status = true;
    save();
    window.location.href = "/patch";
});

document.getElementById("achievementsButton").addEventListener("click", () => {
    save();
    window.location.href = "/achievements";
});

document.getElementById("leaderboardButton").addEventListener("click", () => {
    save();
    window.location.href = "/leaderboard";
});

document.getElementById("chatRoomButton").addEventListener("click", () => {
    if (__currentUser && __currentUser.isBanned) {
        alert('You are banned and cannot access the Trade Plaza.');
        return;
    }
    save();
    window.location.href = "/chatroom";
});

document.getElementById("marketplaceButton").addEventListener("click", () => {
    if (__currentUser && __currentUser.isBanned) {
        alert('You are banned and cannot access the Marketplace.');
        return;
    }
    save();
    window.location.href = "/marketplace";
});

document.getElementById("practice").addEventListener("click", () => {
    if (__currentUser && __currentUser.isBanned) {
        alert('You are banned and cannot access Practice mode.');
        return;
    }
    save();
    window.location.href = "/battle";
});

document.getElementById("playerBtn").addEventListener("click", () => {
    save();
    window.location.href = "/playerbase";
});

document.getElementById("pediaBtn").addEventListener("click", () => {
    save();
    window.location.href = "/pogipedia";
});

setInterval(save, 1000); 