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
 *   4. Isize can only increase via /api/buy-slots; save can never raise it.
 *   5. Wish count can only decrease (spent) via save; increases only via /api/trade-wish.
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

    // ── Admin bypass: skip anti-cheat for fid 44 (VincentL) ──────────────────
    if (Number(current.fid) === 44) {
        return { ok: true, sanitized: s, warnings };
    }

    // ── 1. Money (score) ─────────────────────────────────────────────────────
    const prevMoney = Number(current.score) || 0;
    const newMoney = Number(s.score);
    if (!isFiniteNum(newMoney) || newMoney < 0) {
        warnings.push(`Invalid money value ${s.score}, keeping previous ${prevMoney}`);
        s.score = prevMoney;
    }
    // Anti-cheat: trigger if money gained exceeds 7× the player's actual income.
    // Also allow money from items that were sold (items in previous inventory
    // but missing from the new inventory — calculate their actual sell value).
    const currentInv = Array.isArray(current.inventory) ? current.inventory : [];
    const newInv = Array.isArray(s.inventory) ? s.inventory : [];
    const rawIncome = actualInventoryIncome(currentInv);
    // Account for level multiplier: 1 + (level/16)^(level/100)
    const prevLvl = Number(current.level) || 1;
    const incomeMult = 1 + Math.pow(prevLvl / 16, prevLvl / 100);
    const realIncome = Math.floor(rawIncome * incomeMult);
    const maxIncomeGain = Math.max(realIncome * 7, 500);

    // Build a set of item IDs in the new inventory
    const newInvIds = new Set(newInv.map(item => item.id));
    // Items that were in previous inventory but are now gone = sold items
    const sellLevel = Number(current.level) || 1;
    const soldItemsValue = currentInv.reduce((sum, item) => {
        if (!newInvIds.has(item.id)) {
            const inc = Number(item.income) || 0;
            const sellVal = Math.round((inc * 5.921));
            return sum + sellVal;
        }
        return sum;
    }, 0);

    const maxAllowed = maxIncomeGain + soldItemsValue;
    if (newMoney - prevMoney > maxAllowed && prevMoney > 0) {
        warnings.push(`Money jumped suspiciously from ${prevMoney} to ${newMoney} (allowed: ${maxAllowed}); reverting to ${prevMoney}`);
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
    // Isize can ONLY increase via the server-side /api/buy-slots endpoint.
    // The client save should never send a higher Isize than the DB has.
    // Isize can stay the same or (shouldn't) go down.
    const prevIsize = Number(current.Isize) || 10;
    const newIsize = Number(s.Isize);
    if (!isFiniteNum(newIsize) || newIsize < 10 || newIsize > 100) {
        warnings.push(`Invalid Isize ${s.Isize}, keeping previous ${prevIsize}`);
        s.Isize = prevIsize;
    } else if (newIsize > prevIsize) {
        // Client tried to increase Isize outside the API — revert
        warnings.push(`Isize increased via save (${prevIsize} → ${newIsize}); reverting to ${prevIsize}`);
        s.Isize = prevIsize;
    }

    // ── 4. Level / XP ────────────────────────────────────────────────────────
    // Level is server-authoritative. The client sends XP; the server computes
    // any level-ups using the same formula as the client's levelup().
    const prevLevel = Number(current.level) || 1;
    const prevMaxXP = expectedMaxXP(prevLevel);
    const prevXP = Number(current.xp) || 0;

    // XP is only earned from opening crates.
    // Client formula: xp += Math.floor(pogResult.income * (15 * level / 15))
    //               = Math.floor(pogResult.income * level)
    // Calculate max XP by looking at new items added to inventory (from crates)
    // and using their actual income values with the exact client formula.
    const currentInvIds = new Set(currentInv.map(item => item.id));
    const newItems = newInv.filter(item => !currentInvIds.has(item.id));
    // Each new item could have been opened at any level between prevLevel and
    // the client's claimed level. Use the client's claimed level as the upper
    // bound (generous) since level increases as crates are opened.
    const claimedLevel = Math.min(Number(s.level) || prevLevel, 101);
    const maxXPGain = newItems.reduce((sum, item) => {
        const inc = Number(item.income) || 0;
        return sum + Math.floor(inc * (15 * claimedLevel / 15));
    }, 0);

    let curXP = Number(s.xp);
    if (!isFiniteNum(curXP) || curXP < 0) {
        warnings.push(`Invalid XP ${s.xp}, setting to 0`);
        curXP = 0;
    }

    // Calculate how much raw XP was gained (accounting for level-ups the client did)
    // Client's raw XP gain = (clientLevel - prevLevel) worth of maxXP thresholds + (curXP - prevXP)
    let clientRawXPGain = curXP - prevXP;
    const clientLevel = Number(s.level) || prevLevel;
    // Add back XP spent on level-ups between prevLevel and clientLevel
    let tempMaxXP = prevMaxXP;
    for (let l = prevLevel; l < Math.min(clientLevel, 101); l++) {
        clientRawXPGain += tempMaxXP;
        tempMaxXP = Math.floor(tempMaxXP * 1.4);
    }

    if (clientRawXPGain > maxXPGain + 1) {
        // XP was cheated — revert to previous XP and level
        warnings.push(`XP gain too high (${clientRawXPGain} vs max ${maxXPGain} from ${newItems.length} new items); reverting to previous`);
        curXP = prevXP;
        s.level = prevLevel;
        s.xp = prevXP;
        s.maxxp = prevMaxXP;
    } else {
        // XP is legitimate — simulate level-ups server-side
        // Start from prevLevel/prevXP and add the raw XP gain, then simulate
        let totalXP = prevXP + clientRawXPGain;
        let curLevel = prevLevel;
        let curMaxXP = prevMaxXP;

        while (totalXP >= curMaxXP && curLevel < 101) {
            totalXP -= curMaxXP;
            curLevel++;
            curMaxXP = Math.floor(curMaxXP * 1.4);
        }
        if (curLevel >= 101) {
            curLevel = 101;
            totalXP = Math.min(totalXP, curMaxXP);
        }
        curXP = totalXP;

        if (clientLevel !== curLevel) {
            warnings.push(`Level mismatch: client sent ${clientLevel}, server computed ${curLevel}; using server value`);
        }
        s.level = curLevel;
        s.xp = curXP;
        s.maxxp = curMaxXP;
    }

    // ── 5. Wish ──────────────────────────────────────────────────────────────
    // Wishes can ONLY increase via the server-side /api/trade-wish endpoint.
    // The client save should never send a higher wish value than the DB has.
    // Wish can stay the same or go down (spent wishes).
    const prevWish = Number(current.wish) || 0;
    const newWish = Number(s.wish);
    if (!isFiniteNum(newWish) || newWish < 0) {
        warnings.push(`Invalid wish ${s.wish}, keeping previous ${prevWish}`);
        s.wish = prevWish;
    } else if (newWish > prevWish) {
        // Client tried to increase wish outside the API — cheat
        warnings.push(`Wish increased via save (${prevWish} → ${newWish}); reverting to ${prevWish}`);
        s.wish = prevWish;
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
    const calcIncome = (Array.isArray(s.inventory) ? s.inventory : []).reduce((sum, item) => {
        return sum + (Number(item.income) || 0);
    }, 0);
    // Account for level multiplier: 1 + (level/16)^(level/100)
    const serverLevel = Number(s.level) || 1;
    const levelMult = 1 + Math.pow(serverLevel / 16, serverLevel / 100);
    const expectedIncome = Math.floor(calcIncome * levelMult);
    const newIncome = Number(s.income);
    // Allow up to 50% variance for wish boost + combo bonuses
    if (isFiniteNum(newIncome) && newIncome > expectedIncome * 1.5 + 100) {
        s.income = Math.floor(expectedIncome * 1.5);
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
