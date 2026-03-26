// update loop
setInterval(update, 100);
function update() {
    // update inventory size text
    document.getElementById("space").innerHTML = `${inventory.length}/${Isize}`;
    // update XP Txt
    document.getElementById("XPTxt").innerText = level;
    document.getElementById("mxtxt").innerText = `${xp} / ${maxXP} XP`
    declareStars();
    //update pog / pog
    document.getElementById("pogCount").innerText = `${Math.round((pogAmount.length / maxBinder) * 100)}%`;
    //update pogs color
    document.getElementById("pogCount").style.color = pogAmount.length >= maxBinder ? "gold" : "white";
    //sell all button
    document.getElementById("sellAll").innerText = `Sell All ${searching ? "(Searched)" : ""}`;
    //sell all width
    document.getElementById("sellAll").style.width = searching ? "150px" : "100px";
    if (inventory.length >= 100) {
        while (inventory.length > 100) {
            const item = inventory[0];
            sellItem(item.id, Math.round(item.income * 1.05), false);
        }
    }
    // change inventory text color if full
    if (inventory.length >= Isize) {
        document.getElementById("space").style.color = "red";
    } else {
        document.getElementById("space").style.color = "#ecdcdc";
    }
}

// initial money display
setInterval(updateMoney, 100);
function updateMoney() {
    const abbreviatedMoney = abbreviateNumber(money);
    document.getElementById("money").innerText = `$${abbreviatedMoney}`
    if (isNaN(money)) {
        money = 300;
    }
}

//update progress bar
setInterval(updatePB, 100)
function updatePB() {
    const XPPB = document.getElementById("XPPB");
    XPPB.value = xp;
    XPPB.max = maxXP;
}

//update binder bar
setInterval(() => {
    const bindb = document.getElementById("binderBar");
    bindb.value = pogAmount.length;
    bindb.max = maxBinder;
}, 100);

function declareStars() {
    //update wish text
    const wishCont = document.getElementById("useWish");
    wishCont.innerHTML = "";
    let dpogs = Math.floor(wish/7);
    dpogs += wish % 7 !== 0 ? + 1 : + 0;
    for (let i = 0; i < dpogs; i++) {
        const pg = document.createElement('div');
        pg.classList.add('wish');
        wishCont.appendChild(pg);
        if (i == pg - 1) {
            let star = ''
            for (let s = 0; s < wish % 7; s++) {
                star = '★';
                pg.innerText = star;
            }
        } else {
            let star = ''
            for (let s = 0; s < wish; s++) {
                star = '★';
                pg.innerText = star;
            }
        }
    }
}