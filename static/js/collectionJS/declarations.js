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
// variables for drop rate wish
let dropRateWishActive = false;
let dropRateWishEndTime = 0;
// clarity wish variables 
let clarityWishActive = false;
let clarityWishEndTime = 0;
let clarityPreviews = [];
let clarityResults = [];
let clarityUsedCount = 0;

const WISH_DURATION = 5 * 60 * 1000; 

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

        // show expiration message
        document.getElementById("errorText").innerText = "Drop Rate Boost Expired! Your better drop rates bonus has ended.";
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

        console.log("Drop rate boost expired!");
    }
    // check clarity wish
    if (clarityWishActive && now >= clarityWishEndTime) {
        clarityWishActive = false;
        clarityPreviews = [];
        clarityUsedCount = 0;
        updateClarityDisplay(); // removal of any previews

        document.getElementById("errorText").innerText = "Clarity Wish Expired! The exact rarity display for the next 5 crates has ended.";
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
        console.log("Clarity wish expired!");
    }
    // update drop rate display
    updateDropRateDisplay();
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
        icon: "../static/icons/wishes/dropratewish.png", 
        type: "droprate"
    },
    {
        name: "Wish of Clarity",
        description: "Shows the exact rarity of the next 5 crates",
        icon: "../static/icons/wishes/claritywish.png", 
        type: "clarity"
    }
];

// Original drop rates for each crate
const originalDropRates = {
    crate1: { trash: 59, common: 20, uncommon: 15, mythic: 5.5, unique: 0.5 },
    crate2: { trash: 13, common: 60, uncommon: 16, mythic: 10, unique: 1 },
    crate3: { trash: 11, common: 40, uncommon: 27, mythic: 20, unique: 2 },
    crate4: { trash: 10, common: 18, uncommon: 17, mythic: 50, unique: 5 }
};

// Update tooltip display based on wish of fortune status
function updateDropRateDisplay() {
    const isBoostActive = dropRateWishActive && Date.now() < dropRateWishEndTime;
    const multiplier = isBoostActive ? 1.5 : 1.0;
    
    // Update each crate's tooltip
    Object.keys(originalDropRates).forEach((crateKey, index) => {
        const rates = originalDropRates[crateKey];
        const spanId = `spani${index + 1}`;
        const span = document.getElementById(spanId);
        
        if (span) {
            const boostedRates = {
                trash: (rates.trash * multiplier).toFixed(1),
                common: (rates.common * multiplier).toFixed(1),
                uncommon: (rates.uncommon * multiplier).toFixed(1),
                mythic: (rates.mythic * multiplier).toFixed(1),
                unique: (rates.unique * multiplier).toFixed(1)
            };
            
            // Creating the tooltip text with color coding if boosted
            const colorClass = isBoostActive ? 'style="color: #4CAF50; font-weight: bold;"' : '';
            span.innerHTML = `
                <span ${colorClass}>Trash: ${boostedRates.trash}%</span><br>
                <span ${colorClass}>Common: ${boostedRates.common}%</span><br>
                <span ${colorClass}>Uncommon: ${boostedRates.uncommon}%</span><br>
                <span ${colorClass}>Mythic: ${boostedRates.mythic}%</span><br>
                <span ${colorClass}>Unique: ${boostedRates.unique}%</span>
            `;
        }
    });
};

// generate clarity previews based on current drop rates (with boost if active)
function generateClarityPreviews() {
    clarityPreviews = [];
    clarityResults = [];
    clarityUsedCount = 0;
    
    // Generate 5 predetermined results
    for (let i = 0; i < 5; i++) {
        // Use the same logic as calculatePogResult but store the result
        const result = generatePredeterminedResult(0); // Using trash crate (index 0) as default
        if (result) {
            clarityPreviews.push(result.rarity);
            clarityResults.push(result);
        }
    }
    
    updateClarityDisplay();
}

// update clarity preview display
function updateClarityDisplay() {
    const crateButtons = ['crate1', 'crate2', 'crate3', 'crate4'];
    
    crateButtons.forEach((crateId, index) => {
        const crateButton = document.getElementById(crateId);
        if (!crateButton) return;
        
        const existingPreview = crateButton.parentNode.querySelector('.clarity-preview');
        if (existingPreview) {
            existingPreview.remove();
        }

        const existingParticles = crateButton.parentNode.querySelector('.clarity-particles');
        if (existingParticles) {
            existingParticles.remove();
        }

        crateButton.style.boxShadow = '';
        
        if (clarityWishActive && Date.now() < clarityWishEndTime && clarityUsedCount < clarityPreviews.length) {
            const rarity = clarityPreviews[clarityUsedCount];
            createRarityParticles(crateButton, rarity);
        }
    });
}

// generating a predetermined pog result
function generatePredeterminedResult(crateIndex) {
    // Ensure we have access to crates and pogList
    const cratesArr = Array.isArray(window.userCrates) ? window.userCrates : 
                    (Array.isArray(window.crates) ? window.crates : crates);
    const localPogList = Array.isArray(window.pogList) ? window.pogList : 
                        (typeof pogList !== 'undefined' ? pogList : []);
    
    if (!cratesArr || !localPogList.length) return null;
    
    const crate = cratesArr[crateIndex];
    if (!crate || !Array.isArray(crate.rarities)) return null;
    
    const norm = s => String(s || "").trim().toLowerCase();
    
    const multiplier = (dropRateWishActive && Date.now() < dropRateWishEndTime) ? 1.5 : 1.0;
    
    let rand = Math.random();
    let cumulativeChance = 0;
    
    for (const item of crate.rarities) {
        const boostedChance = (Number(item.chance) || 0) * multiplier;
        cumulativeChance += boostedChance;
        if (rand < cumulativeChance) {
            const candidates = localPogList.filter(p => norm(p.rarity) === norm(item.name));
            
            if (candidates.length === 0) continue;
            
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];
            const meta = (typeof rarityColor !== 'undefined' ? rarityColor : [])
                        .find(r => norm(r.name) === norm(chosen.rarity)) || {};
            
            return {
                locked: false,
                pogid: chosen.id || null,
                name: chosen.name,
                id: Date.now() + Math.floor(Math.random() * 10000) + i, // Unique ID
                rarity: chosen.rarity,
                pogcol: chosen.color || 'white',
                color: meta.color || 'white',
                income: meta.income || 5,
                description: chosen.description || '',
                creator: chosen.creator || ''
            };
        }
    }
    
    return null;
}

// create particle effects based on rarity
function createRarityParticles(crateButton, rarity) {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'clarity-particles';
    particleContainer.style.cssText = `
        position: absolute;
        top: -20px;
        left: -20px;
        width: calc(100% + 40px);
        height: calc(100% + 40px);
        pointer-events: none;
        z-index: 999;
        overflow: visible;
    `;
    
    // make button container relative for positioning
    crateButton.parentNode.style.position = 'relative';
    crateButton.parentNode.appendChild(particleContainer);
    
    // define particle properties based on rarity
    const rarityEffects = {
        'Unique': {
            colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#ff00ff'],
            count: 12,
            size: 8,
            speed: 1.5
        },
        'Mythic': {
            colors: ['#ff00ff', '#9400d3', '#ff69b4'],
            count: 10,
            size: 6,
            speed: 1.8
        },
        'Uncommon': {
            colors: ['#00ff00', '#32cd32', '#90ee90'],
            count: 8,
            size: 5,
            speed: 2.0
        },
        'Common': {
            colors: ['#ffff00', '#ffd700', '#fff8dc'],
            count: 6,
            size: 4,
            speed: 2.2
        },
        'Trash': {
            colors: ['#ff4444', '#cc0000', '#990000'],
            count: 4,
            size: 3,
            speed: 2.5
        }
    };
    
    const effect = rarityEffects[rarity] || rarityEffects['Trash'];
    
    // create floating particles around the button
    for (let i = 0; i < effect.count; i++) {
        const particle = document.createElement('div');
        const color = effect.colors[Math.floor(Math.random() * effect.colors.length)];
        
        // random position around the button perimeter
        const angle = (i / effect.count) * 2 * Math.PI;
        const radius = 80 + Math.random() * 20;
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * radius;
        
        particle.style.cssText = `
            position: absolute;
            width: ${effect.size}px;
            height: ${effect.size}px;
            background: ${color};
            border-radius: 50%;
            left: ${x}%;
            top: ${y}%;
            transform: translate(-50%, -50%);
            animation: floatSparkle ${effect.speed}s ease-in-out infinite;
            animation-delay: ${i * 0.2}s;
            box-shadow: 0 0 ${effect.size * 2}px ${color};
            z-index: 1000;
        `;
        
        particleContainer.appendChild(particle);
    }
    
    // subtle glow to the button itself
    crateButton.style.boxShadow = `0 0 20px ${rarityEffects[rarity].colors[0]}40`;
}
// Use up one clarity preview when a crate is opened
function useClarityPreview() {
    if (clarityWishActive && clarityUsedCount < clarityResults.length) {
        const predeterminedResult = clarityResults[clarityUsedCount];
        clarityUsedCount++;
        updateClarityDisplay();
        
        if (clarityUsedCount >= clarityResults.length) {
            clarityWishActive = false;
            showSuccessMessage("Clarity Previews Used Up! All 5 previews consumed.");
        }
        
        return predeterminedResult;
    }
    return null;
}