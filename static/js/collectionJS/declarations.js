// reference userdata from ejs
// Parse server-injected JSON safely. If parsing fails or content is empty,

// fall back to an empty object so downstream code doesn't blow up.
try {
    const el = document.getElementById("userdata");
    const txt = el ? el.textContent.trim() : '';
    if (txt) userdata = JSON.parse(txt);
} catch (e) {
    console.warn('Failed to parse userdata JSON; using empty object.', e);
    userdata = {};
}
// ensure a global achievements object exists early so other scripts can read it
window.achievements = window.achievements || userdata.achievements || [];
// reference pogs from ejs
let maxPogs = 0;
try {
    const mpe = document.getElementById("maxPogs");
    const mtxt = mpe ? mpe.textContent.trim() : '';
    if (mtxt) maxPogs = JSON.parse(mtxt);
} catch (e) {
    console.warn('Failed to parse maxPogs JSON; using 0.', e);
}
// reference pogs from ejs
let pogList = [];
try {
    const ple = document.getElementById("pogList");
    const ptxt = ple ? ple.textContent.trim() : '';
    if (ptxt) pogList = JSON.parse(ptxt);
    console.log(pogList);
} catch (e) {
    console.warn('Failed to parse pogList JSON; using empty list.', e);
}

// pogiedia rarity defining
rarityColor = [
    { name: "Trash", color: "red", income: 2 }, //trash
    { name: "Common", color: "yellow", income: 7 }, //common
    { name: "Uncommon", color: "lime", income: 13 }, //uncommon
    { name: "Mythic", color: "fuchsia", income: 20 }, //mythic
    { name: "Unique", color: "lightgray", income: 28 }, //unique
]

// used for crate display
let enabledCrate = false;

// pfp 
let pfpimg = userdata.pfp || ""
document.getElementById("userPic").src = pfpimg;
document.getElementById("bigpfp").src = pfpimg;

//selected pog
selectedID = 0;

//profile color
let theme_col = userdata.theme || "black";

// wish
let wish = userdata.wish || 0;

// new timer variables for income wish
let incomeWishActive = false;
let incomeWishEndTime = 0;
let dropRateWishActive = false;
let dropRateWishEndTime = 0;
const WISH_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// checking if wishes have expired 
function checkWishTimers() {
    const now = Date.now();
    
    // check income wish
    if (incomeWishActive && now >= incomeWishEndTime) {
        incomeWishActive = false;
        
        document.getElementById("errorText").innerText = "Income Boost Expired! Your +30% income bonus has ended.";
        const errorMessage = document.getElementById("errorMessage");
        errorMessage.style.display = "block";
        errorMessage.style.opacity = "0";
        setTimeout(() => {
            errorMessage.style.opacity = "1";
        }, 10);
        setTimeout(() => {
            errorMessage.style.opacity = "0";
            setTimeout(() => {
                errorMessage.style.display = "none";
            }, 1000);
        }, 5000);
        
        console.log("Income boost expired!");
    }
    // Check drop rate wish  
    if (dropRateWishActive && now >= dropRateWishEndTime) {
        dropRateWishActive = false;
        console.log("Drop rate boost expired!");
    }
}


//check timers every second
setInterval(checkWishTimers, 1000);

// money upgrade
let moneyTick = 1000;

// items
let inventory = userdata.inventory || [];
window.inventory = inventory;

//crates opened
cratesOpened = userdata.cratesOpened || 0;

// money
let money = userdata.score || 300;
let userIncome = userdata.income || 0;
let totalSold = userdata.totalSold || 0;

// pogAmount
let pogAmount = userdata.pogamount || [];
let maxBinder = 0;

// XP
let xp = userdata.xp || 0;
let maxXP = userdata.maxxp || 30;
let level = userdata.level || 1;

// merge
const mergeAmount = 5;
let mergeCount = userdata.mergeCount || 0;

// global vari
window.mergeCount = mergeCount;
userdata.mergeCount = mergeCount;

// combo tracking
let comboCount = 0;
let highestCombo = userdata.highestCombo || 0;
window.highestCombo = highestCombo;
userdata.highestCombo = highestCombo;

// inventory size
let Isize = userdata.Isize || 45;

// bonus multiplier
let bonusMulti = 1;

// abbreviation num
let abbreviatedMoney = 0;

// button referne
const buttons = document.getElementsByTagName("button");

// first time call
refreshInventory();

// display the highest combo
highestCombo = computeComboStats();

// corrects stats on load
computeComboStats(); 

// lock items
function lock(id) {
    const index = inventory.findIndex(item => item.id === id)
    inventory[index].locked = !inventory[index].locked;
    refreshInventory();
    save();
}

//trade for 1/7 wish
function trade(id, locked) {
    if (!locked) {
        const index = inventory.findIndex(item => item.id === id);
        inventory.splice(index, 1);
        wish++;
        userIncome = getTotalIncome();
        refreshInventory();
        save();
    }
    document.getElementById("descPanel").innerHTML = "";
}

// color key toggle
document.getElementById("colors").addEventListener("click", () => {
    const colorKey = document.getElementById("colorKey")
    const isVisible = colorKey.style.display === "flex";
    colorKey.style.display = isVisible ? "none" : "flex";
})

//report
document.getElementById("helpButton").addEventListener("click", () => {
    window.open("https://github.com/CarterQuickel/Pogglebar/issues", "_blank");
});

// number abbreviation function
function abbreviateNumber(value) {
    const formatter = Intl.NumberFormat('en', { notation: 'compact', compactDisplay: 'short' });
    return formatter.format(value);
}

// alerts for when something good happens to the user
function showSuccessMessage(message) {
    document.getElementById("errorText").innerText = message;
    const errorMessage = document.getElementById("errorMessage");
    
    errorMessage.style.backgroundColor = "#4CAF50";
    errorMessage.style.borderColor = "#45a049";
    
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
        }, 1000);
    }, 5000);
}

// wish carousel data
let currentWishIndex = 0;
const wishTypes = [
    {
        name: "Wish of Wealth",
        description: "+30% income for 5 mins",
        icon: "../static/icons/wishes/incomewish.png",
        type: "income"
    },
    {
        name: "Wish of Fortune", 
        description: "Better drop rates for 5 mins",
        icon: "../static/icons/wishes/dropratewish.png", // Update this path to your clover icon
        type: "droprate"
    }
];