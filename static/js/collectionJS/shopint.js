// default transaction
let defprice = 0
// the price for the true transaction
let defrealprice = 0
let defamount = 0
let defreason = ""

document.getElementById("amountSelect").addEventListener("change", () => {
    const price = defprice;
    const amount = parseInt(document.getElementById("amountSelect").value);
    determineCost(price, amount);
    defamount = amount;
});

//price determination
function determineCost(price, amount) {
    const purchaseCost =  (price * amount) / 5; // digipogs
    document.getElementById("crateprice").innerText = `Price: ${abbreviateNumber(purchaseCost)} Digipogs`;
    defrealprice = purchaseCost;
    console.log(defrealprice);
    return purchaseCost;
};

//purchasing functions
function transaction(price, reason) {
    const count = parseInt(document.getElementById("amountSelect").value);
    // determine total price
    determineCost(price, count);
    // open transaction confirmation modal
    document.getElementById("overlay").style.display = "block";
    // variable definitions for later use
    defprice = price;
    defreason = reason;
    defamount = count;
}

document.getElementById("purchaseBtn_C").addEventListener("click", () => {
    const count = parseInt(document.getElementById("amountSelect").value);
    if (!validateCrateOpening(count)) return;
    const pinval = document.getElementById("pinField_crate").value;
    purchase(defrealprice, defreason, pinval, defamount);
    document.getElementById("overlay").style.display = "none";
});

document.getElementById("cancelBtn_C").addEventListener("click", () => {
    document.getElementById("overlay").style.display = "none";
});

// implement purchased item effect
function implement(reason, amount) {
    if (amount === 1) {
        openCrateWithAnimation(reason);
    } else if (amount === 5) {
        openMultipleCratesWithAnimation(reason, 5)
    } else if (amount === 10) {
        openMultipleCratesWithAnimation(reason, 10)
    }
}

//buy buttons
function purchase(price, reason, pin, amount) {
    console.log(price);
    fetch('/api/digipogs/transfer', {
        // post is to use app.post with the route /api/digipogs/transfer
        method: 'POST',
        // credentials include to send cookies
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            price: price,
            reason: `Pogglebar - ${reason}`,
            pin: pin
        })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                // purchase item effect
                implement(reason, amount);
                save();
                
                const crateNames = ['Trash Crate', 'Common Crate', 'Uncommon Crate', 'Mythic Crate'];
                const crateName = crateNames[reason] || 'Crate';
                showPurchaseSuccess(`${crateName} purchased! Good luck! (-${abbreviateNumber(price)} Digipogs) 🎁`);
            } else {
                showPurchaseError(`Purchase failed: ${data.message} 💸`);
            }
        })
        .catch(err => {
            console.error("Error during purchase:", err);
            showPurchaseError("An error occurred during purchase. Please try again later. 🔌");
        })
};
/* !
!
!
!
!
!
!
!
! SLOT TRANSACTIONS BELOW */
document.getElementById("cancelBtn_S").addEventListener("click", () => {
    document.getElementById("slotOver").style.display = "none";
});

document.getElementById("slotAmount").addEventListener("change", () => {
    const amount = parseInt(document.getElementById("slotAmount").value);
    const slotPrice = calcSlot(amount);
    document.getElementById("slotprice").innerText = `Price: $${abbreviateNumber(slotPrice)}`;
});

document.getElementById("purchaseBtn_S").addEventListener("click", () => {
    const amount = parseInt(document.getElementById("slotAmount").value);
    if (amount < 1 || amount > 100 || isNaN(amount)) {
        showPurchaseError("Please select a valid amount of slots (1-100) 📝");
        return;
    }
    if (Isize + amount > 100) {
        showPurchaseError("No more than 100 inventory slots are allowed! 📦");
        return;
    }
    const slotPrice = calcSlot(amount);
    const pinval = document.getElementById("pinField_slot").value;
    purchaseSlots(slotPrice, `Slots x${amount}`, pinval, amount);
    document.getElementById("slotOver").style.display = "none";
});

//buy slots function
function purchaseSlots(price, reason, pin, amount) {
    fetch('/api/digipogs/transfer', {
        // post is to use app.post with the route /api/digipogs/transfer
        method: 'POST',
        // credentials include to send cookies
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            price: price,
            reason: `Pogglebar - ${reason}`,
            pin: pin
        })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                // add purchased item effect here
                Isize += amount;
                refreshInventory();
                save();
                showPurchaseSuccess(`Inventory expanded! +${amount} slots added! (-${abbreviateNumber(price)} Digipogs) 📦`);
            } else {
                showPurchaseError(`Slot purchase failed: ${data.message} 💰`);            }
        })
        .catch(err => {
            console.error("Error during purchase:", err);
            showPurchaseError("An connection error occurred. Please try again later. 🔌");
        })
};

//successful purchase
function showPurchaseSuccess(message) {
    document.getElementById("errorText").innerText = message;
    const errorMessage = document.getElementById("errorMessage");
    
    // Green styling for success
    errorMessage.style.backgroundColor = "#4CAF50";
    errorMessage.style.borderColor = "#45a049";
    errorMessage.style.color = "white";
    
    errorMessage.style.display = "block";
    errorMessage.style.opacity = "0";
    setTimeout(() => {
        errorMessage.style.opacity = "1";
    }, 10);
    setTimeout(() => {
        errorMessage.style.opacity = "0";
        setTimeout(() => {
            errorMessage.style.display = "none";
            errorMessage.style.backgroundColor = ""; 
            errorMessage.style.borderColor = "";
            errorMessage.style.color = "";
        }, 1000);
    }, 5000);
}
// failed purchase
function showPurchaseError(message) {
    document.getElementById("errorText").innerText = message;
    const errorMessage = document.getElementById("errorMessage");
    
    // red styling for errors
    errorMessage.style.backgroundColor = "#f44336";
    errorMessage.style.borderColor = "#d32f2f";
    errorMessage.style.color = "white";
    
    errorMessage.style.display = "block";
    errorMessage.style.opacity = "0";
    setTimeout(() => {
        errorMessage.style.opacity = "1";
    }, 10);
    setTimeout(() => {
        errorMessage.style.opacity = "0";
        setTimeout(() => {
            errorMessage.style.display = "none";
            errorMessage.style.backgroundColor = ""; 
            errorMessage.style.borderColor = "";
            errorMessage.style.color = "";
        }, 1000);
    }, 5000);
}