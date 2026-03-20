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
        try {
            if (req.cookies && req.cookies.fb_token) {
                const cookieVal = req.cookies.fb_token;
                let parsed = null;
                try { parsed = JSON.parse(cookieVal); } catch (e) { parsed = null; }
                if (parsed) {
                    req.session.token = parsed;
                    res.clearCookie('fb_token');
                    console.log('Bootstrapped session.token from fb_token cookie');
                    return next();
                }
            }
        } catch (err) {
            console.error('Error while bootstrapping fb_token cookie:', err);
        }

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

                req.session.user = {
                    fid: id,
                    displayName: displayName,
                    theme: row.theme,
                    score: row.score,
                    inventory: JSON.parse(row.inventory),
                    Isize: row.Isize,
                    xp: row.xp,
                    maxxp: row.maxxp,
                    level: row.level,
                    income: row.income,
                    totalSold: row.totalSold,
                    cratesOpened: row.cratesOpened,
                    pogamount: JSON.parse(row.pogamount),
                    achievements: JSON.parse(row.achievements),
                    tiers: parsedTiers,
                    mergeCount: row.mergeCount,
                    highestCombo: row.comboHigh,
                    wish: row.wish,
                    crates: JSON.parse(row.crates),
                    pfp: row.pfp
                };
                console.log(`User data loaded for '${displayName}'`);
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