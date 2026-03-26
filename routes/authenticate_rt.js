const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const router = express.Router();
const usdb = new sqlite3.Database('./data/usersettings.sqlite');
const {
    getPogCount,
    getAllPogs,
    initializePogDatabase
} = require('../backend_data/pog_ref.js');

// URL to take user to Formbar for authentication
const AUTH_URL = process.env.AUTH_URL;
const THIS_URL = process.env.THIS_URL;

//user declaration vars
const achievements = require("../modules/backend_js/trophyList.js");
const tiers = require("../modules/backend_js/tierList.js");
const crateRef = require("../modules/backend_js/crateRef.js");

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    console.log("Authenticating...");

    const makeAuthRedirect = (refreshToken) => {
        if (refreshToken && AUTH_URL) {
            return `${AUTH_URL}/oauth?refreshToken=${refreshToken}&redirectURL=${THIS_URL}`;
        }
        return '/login';
    };

    const tokenData = req.session && req.session.token;
    if (!tokenData) {
        const dest = makeAuthRedirect();
        console.log('[AUTH] No token, redirecting to:', dest);
        return res.redirect(dest);
    }

    try {
        const currentTime = Math.floor(Date.now() / 1000);
        if (tokenData.exp && tokenData.exp < currentTime) {
            const dest = makeAuthRedirect(tokenData.refreshToken);
            console.log('[AUTH] Token expired, redirecting to:', dest);
            return res.redirect(dest);
        }
        return next();
    } catch (err) {
        console.error('Error during token validation in isAuthenticated:', err);
        const dest = makeAuthRedirect();
        console.log('[AUTH] Error fallback, redirecting to:', dest);
        return res.redirect(dest);
    }
}
// The following isAuthenticated function checks when the access token expires and promptly retrieves a new one using the user's refresh token.

// login route
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const [pogCount, results] = await Promise.all([
            getPogCount(),
            initializePogDatabase()
        ]);
    try {
        function insertUser() {

            const displayName = req.session.user.displayName;

            const id = req.session.token.id;

            usdb.get(`SELECT uid FROM userSettings WHERE displayname = ?`, [displayName], [id], (err, row) => {
                if (err) {
                    return console.error("Error querying user:", err.message);
                }
                if (row) {
                    console.log(`User '${displayName}' already exists with uid ${row.uid} and fid ${id}`);
                    return;
                } else {
                    usdb.run(`INSERT INTO userSettings (fid, theme, score, inventory, Isize, xp, maxxp, level, income, totalSold, cratesOpened, pogamount, achievements, tiers, mergeCount, highestCombo, wish, crates, pfp, displayname) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id,
                            req.session.user.theme,
                            req.session.user.score,
                            JSON.stringify(req.session.user.inventory),
                            req.session.user.Isize,
                            req.session.user.xp,
                            req.session.user.maxxp,
                            req.session.user.level,
                            req.session.user.income,
                            req.session.user.totalSold,
                            req.session.user.cratesOpened,
                            JSON.stringify(req.session.user.pogamount),
                            JSON.stringify(req.session.user.achievements),
                            JSON.stringify(req.session.user.tiers),
                            req.session.user.mergeCount,
                            req.session.user.highestCombo,
                            req.session.user.wish,
                            JSON.stringify(req.session.user.crates),
                            req.session.user.pfp,
                            displayName
                        ],
                        function (err) {
                            if (err) {
                                return console.error("Error inserting user:", err.message);
                            }
                            console.log(`User '${displayName}' inserted with rowid ${this.lastID} and fid ${id}`);
                        });
                }
            });
        }

        // add variable references here
        req.session.user = {
            fid: req.session.token?.id || 0,
            displayName: req.session.token?.displayName || "guest",
            theme: req.session.user.theme || 'black',
            score: req.session.user.score || 0,
            inventory: req.session.user.inventory || [],
            Isize: req.session.user.Isize || 3,
            xp: req.session.user.xp || 0,
            maxxp: req.session.user.maxxp || 15,
            level: req.session.user.level || 1,
            income: req.session.user.income || 0,
            totalSold: req.session.user.totalSold || 0,
            cratesOpened: req.session.user.cratesOpened || 0,
            pogamount: req.session.user.pogamount || [],
            achievements: req.session.user.achievements || achievements,
            tiers: req.session.user.tiers || tiers,
            mergeCount: req.session.user.mergeCount || 0,
            highestCombo: req.session.user.highestCombo || 0,
            wish: req.session.user.wish || 0,
            crates: req.session.user.crates || crateRef,
            pfp: req.session.user.pfp || "static/icons/pfp/defaultpfp.png"
        };

        // load user data from database
        const displayName = req.session.token?.displayName || "guest";
        const id = req.session.token?.id || 0;
        usdb.get(`SELECT * FROM userSettings WHERE displayname = ?`, [displayName], [id], (err, row) => {
            if (err) {
                return console.error("Error querying user:", err.message);
            }
                if (row) {
                // parse tiers and ensure we have a populated tiers array; fall back to canonical if empty/malformed
                let parsedTiers = [];
                try { parsedTiers = JSON.parse(row.tiers); } catch (e) { parsedTiers = []; }
                if (!Array.isArray(parsedTiers) || parsedTiers.length < (Array.isArray(tiers) ? tiers.length : 22)) parsedTiers = tiers;

                // helper to enrich inventory instances from inventory table using pog list `results`
                const { RARITY_COLORS } = require('../modules/backend_js/userState.js');
                function enrichInvRow(invRow, pogList) {
                    const match = (pogList || []).find(p => Number(p.id) === Number(invRow.pog_uid) || Number(p.number) === Number(invRow.pog_uid) || Number(p.uid) === Number(invRow.pog_uid));
                    if (match) {
                        const meta = RARITY_COLORS.find(r => String(r.name).toLowerCase() === String(match.rarity || '').toLowerCase()) || {};
                        // derive pog color name and a visual color hex from rarity metadata as fallback
                        const pogColorName = match.color || match.pogcol || match.pogCol || match.pog_color || '';
                        const visualColor = meta.color || pogColorName || '';
                        return {
                            id: invRow.uid,
                            pogid: Number(invRow.pog_uid),
                            name: match.name || 'Unknown Pog',
                            rarity: match.rarity || 'Trash',
                            code2: match.code2 || match.code || 'unknown',
                            income: meta.income || Number(match.income) || 0,
                            description: match.description || '',
                            creator: match.creator || '',
                            locked: false,
                            quantity: invRow.quantity || 1,
                            pogcol: pogColorName,
                            color: visualColor
                        };
                    }
                    return {
                        id: invRow.uid,
                        pogid: Number(invRow.pog_uid),
                        name: `Pog #${invRow.pog_uid}`,
                        rarity: 'Trash',
                        code2: 'unknown',
                        income: 0,
                        description: '',
                        creator: '',
                        locked: false,
                        quantity: invRow.quantity || 1,
                        pogcol: '',
                        color: ''
                    };
                }

                // attempt to load per-instance inventory rows for this user and enrich; fallback to legacy JSON
                usdb.all('SELECT uid, pog_uid, quantity, legacy_id FROM inventory WHERE user_uid = ?', [row.uid], (invErr, invRows) => {
                    let finalInventory = [];
                    if (!invErr && Array.isArray(invRows) && invRows.length > 0) {
                        finalInventory = invRows.map(r => enrichInvRow(r, results));
                    } else {
                        try {
                            const legacy = JSON.parse(row.inventory || '[]');
                            finalInventory = (Array.isArray(legacy) ? legacy : []).map(it => ({
                                ...it,
                                pogcol: it.pogcol || it.color || '',
                                color: it.color || it.pogcol || ''
                            }));
                        } catch (e) { finalInventory = []; }
                    }

                    req.session.user = {
                        fid: id,
                        displayName: displayName,
                        theme: row.theme,
                        score: row.score,
                        inventory: finalInventory,
                        Isize: row.Isize,
                        xp: row.xp,
                        maxxp: row.maxxp,
                        level: row.level,
                        income: row.income,
                        totalSold: row.totalSold,
                        cratesOpened: row.cratesOpened,
                        pogamount: (() => { try { return JSON.parse(row.pogamount || '[]'); } catch(e){ return []; } })(),
                        achievements: (() => { try { return JSON.parse(row.achievements || '[]'); } catch(e){ return []; } })(),
                        tiers: parsedTiers,
                        mergeCount: row.mergeCount,
                        highestCombo: row.comboHigh,
                        wish: row.wish,
                        crates: (() => { try { return JSON.parse(row.crates || '[]'); } catch(e){ return []; } })(),
                        pfp: row.pfp
                    };
                    console.log(`User data loaded for '${displayName}'`);

                    // Call insertUser and render collection now that session is populated
                    insertUser();
                    return res.render('collection.ejs', { userdata: req.session.user, token: req.session.token, maxPogs: pogCount, pogList: results });
                });
                return;
            } else {
                // all starting values are HERE
                req.session.user = {
                    fid: id,
                    displayName: displayName,
                    theme: 'black',
                    score: 0,
                    inventory: [],
                    Isize: 10,
                    xp: 0,
                    maxxp: 30,
                    level: 1,
                    income: 0,
                    totalSold: 0,
                    cratesOpened: 0,
                    pogamount: [],
                    achievements: achievements,
                    tiers: tiers,
                    mergeCount: 0,
                    highestCombo: 0,
                    wish: 0,
                    crates: crateRef,
                    pfp: "static/icons/pfp/defaultpfp.png"
                };

                console.log(`No existing user data for '${displayName}', using defaults.`);
            }
            // Call insertUser and handle callback
            insertUser();
            res.render('collection.ejs', { userdata: req.session.user, token: req.session.token, maxPogs: pogCount, pogList: results });
        });
    } catch (error) {
        res.send(error.message)
    }
    } catch (error) {
        console.error("Error in collection route:", error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;