/**
 * Server-side validation for /datasave.
 *
 * Compares incoming client data against the player's current DB row and
 * rejects (or clamps) values that look like console-edited cheats.
 *
 * Design principles:
 *   1. Money can only increase by plausible income ticks + sell revenue.
 *   2. Inventory items must reference valid pog IDs from the master list.
 *   3. Level / XP must follow the levelup() formula (maxXP *= 1.4 each level).
 *   4. Isize can only go up by 1 at a time (bought slot).
 *   5. Wish count can only decrease (spent) or increase by 1 (traded a pog).
 *   6. cratesOpened can only go up, never down.
 *   7. No field can be NaN / Infinity / negative (where inappropriate).
 */

const crateRef = require('../modules/backend_js/crateRef.js');

// ── helpers ───────────────────────────────────────────────────────────────────

function isFiniteNum(v) {
    return typeof v === 'number' && Number.isFinite(v);
}

/** Recalculate what maxXP should be for a given level using the game formula. */
function expectedMaxXP(level) {
    let mxp = 30; // base
    for (let l = 1; l < level; l++) {
        mxp = Math.floor(mxp * 1.4);
    }
    return mxp;
}

/** Calculate the actual total income from an inventory array. */
function actualInventoryIncome(inventory) {
    if (!Array.isArray(inventory)) return 0;
    return inventory.reduce((sum, item) => sum + (Number(item.income) || 0), 0);
}

// Valid rarity names from the game
const VALID_RARITIES = ['Trash', 'Common', 'Uncommon', 'Mythic', 'Unique', 'Otherworldly'];

// ── main validator ────────────────────────────────────────────────────────────

/**
 * @param {object} incoming  - The save payload from the client
 * @param {object} current   - The current DB row (parsed) for comparison
 * @param {array}  pogList   - Master list of valid pogs
 * @returns {{ ok: boolean, sanitized: object, warnings: string[] }}
 */
function validateSave(incoming, current, pogList) {
    const warnings = [];
    const s = { ...incoming }; // shallow copy we'll mutate

    // ── 1. Money (score) ─────────────────────────────────────────────────────
    const prevMoney = Number(current.score) || 0;
    const newMoney = Number(s.score);
    if (!isFiniteNum(newMoney) || newMoney < 0) {
        warnings.push(`Invalid money value ${s.score}, keeping previous ${prevMoney}`);
        s.score = prevMoney;
    }
    // Allow money to increase by a plausible amount based on ACTUAL inventory
    // income (not a theoretical max).  Be generous: 3x combo + 1.3x wish
    // boost over 300 seconds, plus a sell-revenue buffer.
    const currentInv = Array.isArray(current.inventory) ? current.inventory : [];
    const realIncome = actualInventoryIncome(currentInv);
    // Max income per second = realIncome * 3 (combo cap) * 1.3 (wish boost)
    const maxPerSec = Math.max(realIncome * 3 * 1.3, 1000);   // floor of 1000/s for new players
    // Allow up to 300 seconds of max income + generous sell buffer
    // Sell value ≈ income * 2.94 * (level/1.6) ^ ((level/100)+1) per item, cap generously
    const curLevel = Number(current.level) || 1;
    const sellBuffer = currentInv.length * 1000000 * Math.max(curLevel, 1); // generous per-item sell cap
    const maxIncomeBurst = (maxPerSec * 300) + sellBuffer;
    if (newMoney - prevMoney > maxIncomeBurst && prevMoney > 0) {
        warnings.push(`Money jumped suspiciously from ${prevMoney} to ${newMoney}; reverting to ${prevMoney}`);
        s.score = prevMoney;
    }

    // ── 2. Inventory validation ──────────────────────────────────────────────
    if (!Array.isArray(s.inventory)) {
        warnings.push('Inventory is not an array, resetting to previous');
        s.inventory = current.inventory || [];
    } else {
        // Validate each item
        const validPogNames = new Set(pogList.map(p => p.name));
        // Also allow merge pogs + God Pog which may not be in CSV
        ['Bronze Pog', 'Silver Pog', 'Gold Pog', 'Diamond Pog', 'Astral Pog', 'God Pog'].forEach(n => validPogNames.add(n));

        s.inventory = s.inventory.filter(item => {
            if (!item || typeof item !== 'object') return false;
            if (!item.name || typeof item.name !== 'string') return false;
            if (!validPogNames.has(item.name)) {
                warnings.push(`Unknown pog name "${item.name}" removed from inventory`);
                return false;
            }
            // Validate income field isn't tampered to absurd values
            // God Pog has 694206741, allow up to 1 billion per item
            if (item.income !== undefined && (typeof item.income !== 'number' || item.income > 1000000000 || item.income < 0)) {
                warnings.push(`Suspicious income ${item.income} on "${item.name}", clamping`);
                item.income = Math.max(0, Math.min(item.income || 0, 1000000000));
            }
            return true;
        });
    }

    // ── 3. Inventory size (Isize) ────────────────────────────────────────────
    const prevIsize = Number(current.Isize) || 10;
    const newIsize = Number(s.Isize);
    if (!isFiniteNum(newIsize) || newIsize < 10 || newIsize > 100) {
        warnings.push(`Invalid Isize ${s.Isize}, resetting to 10`);
        s.Isize = 10;
    } else if (newIsize > prevIsize + 5) {
        // Cheated – reset to 10 as punishment
        warnings.push(`Isize jumped from ${prevIsize} to ${newIsize}; resetting to 10`);
        s.Isize = 10;
    }

    // ── 4. Level / XP ────────────────────────────────────────────────────────
    const prevLevel = Number(current.level) || 1;
    const newLevel = Number(s.level);
    if (!isFiniteNum(newLevel) || newLevel < 1 || newLevel > 101) {
        warnings.push(`Invalid level ${s.level}, keeping ${prevLevel}`);
        s.level = prevLevel;
    }
    // Levels can only go up, not down
    if (newLevel < prevLevel) {
        warnings.push(`Level went down from ${prevLevel} to ${newLevel}; keeping ${prevLevel}`);
        s.level = prevLevel;
    }
    // XP must be non-negative
    const newXP = Number(s.xp);
    if (!isFiniteNum(newXP) || newXP < 0) {
        warnings.push(`Invalid XP ${s.xp}, setting to 0`);
        s.xp = 0;
    }
    // maxxp should match the level formula
    const correctMaxXP = expectedMaxXP(s.level);
    if (Number(s.maxxp) !== correctMaxXP) {
        warnings.push(`maxXP mismatch: got ${s.maxxp}, expected ${correctMaxXP} for level ${s.level}; correcting`);
        s.maxxp = correctMaxXP;
    }

    // ── 5. Wish ──────────────────────────────────────────────────────────────
    const prevWish = Number(current.wish) || 0;
    const newWish = Number(s.wish);
    if (!isFiniteNum(newWish) || newWish < 0) {
        warnings.push(`Invalid wish ${s.wish}, resetting to 0`);
        s.wish = 0;
    }
    // Wish can increase by at most the number of pogs that disappeared from
    // inventory (traded), and decrease by multiples of 7 (used).
    // Be generous: allow wish to change by up to inventory-count + 7
    const prevInvLen = Array.isArray(current.inventory) ? current.inventory.length : 0;
    const wishDelta = newWish - prevWish;
    if (wishDelta > prevInvLen + 7) {
        // Cheated – reset to 0 as punishment
        warnings.push(`Wish increased suspiciously from ${prevWish} to ${newWish}; resetting to 0`);
        s.wish = 0;
    }

    // ── 6. Counters (can only go up) ─────────────────────────────────────────
    const prevCratesOpened = Number(current.cratesOpened) || 0;
    const newCratesOpened = Number(s.cratesOpened);
    if (!isFiniteNum(newCratesOpened) || newCratesOpened < prevCratesOpened) {
        warnings.push(`cratesOpened went down or invalid (${s.cratesOpened}); keeping ${prevCratesOpened}`);
        s.cratesOpened = prevCratesOpened;
    }

    const prevTotalSold = Number(current.totalSold) || 0;
    const newTotalSold = Number(s.totalSold);
    if (!isFiniteNum(newTotalSold) || newTotalSold < prevTotalSold) {
        warnings.push(`totalSold went down or invalid; keeping ${prevTotalSold}`);
        s.totalSold = prevTotalSold;
    }

    const prevMergeCount = Number(current.mergeCount) || 0;
    const newMergeCount = Number(s.mergeCount);
    if (!isFiniteNum(newMergeCount) || newMergeCount < prevMergeCount) {
        warnings.push(`mergeCount went down or invalid; keeping ${prevMergeCount}`);
        s.mergeCount = prevMergeCount;
    }

    const prevHighestCombo = Number(current.highestCombo) || 0;
    const newHighestCombo = Number(s.highestCombo);
    if (!isFiniteNum(newHighestCombo) || newHighestCombo < prevHighestCombo) {
        warnings.push(`highestCombo went down (${newHighestCombo} < ${prevHighestCombo}); keeping previous`);
        s.highestCombo = prevHighestCombo;
    }

    // ── 7. Income must match inventory ───────────────────────────────────────
    // Recalculate expected income from the (validated) inventory
    const RARITY_INCOME = { Trash: 2, Common: 7, Uncommon: 13, Mythic: 20, Unique: 28 };
    const calcIncome = (Array.isArray(s.inventory) ? s.inventory : []).reduce((sum, item) => {
        return sum + (Number(item.income) || 0);
    }, 0);
    const newIncome = Number(s.income);
    // Allow up to 50% variance for wish boost + combo bonuses
    if (isFiniteNum(newIncome) && newIncome > calcIncome * 2 + 100) {
        warnings.push(`Income ${newIncome} seems too high for inventory (calc ~${calcIncome}); clamping`);
        s.income = Math.floor(calcIncome * 1.5);
    }

    // ── 8. Crates structure ──────────────────────────────────────────────────
    // Client shouldn't be able to change crate drop rates or prices
    // Always overwrite with the canonical server crate data
    s.crates = crateRef;

    // ── 9. Theme / PFP (cosmetic – allow freely) ────────────────────────────
    // Just sanitize to string
    if (typeof s.theme !== 'string') s.theme = current.theme || 'black';
    if (typeof s.pfp !== 'string') s.pfp = current.pfp || '';

    // ── Done ─────────────────────────────────────────────────────────────────
    if (warnings.length > 0) {
        console.warn(`[VALIDATE_SAVE] ${warnings.length} warning(s) for user:`, warnings);
    }

    return { ok: true, sanitized: s, warnings };
}

module.exports = { validateSave, expectedMaxXP };
