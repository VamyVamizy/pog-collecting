const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const router = express.Router();
const usdb = new sqlite3.Database('./data/usersettings.sqlite');
const {
    getPogCount,
    getAllPogs,
    initializePogDatabase
} = require('../backend_data/pog_ref.js');

// home page
router.get('/collection', async (req, res) => {
    try {
        const [pogCount, results] = await Promise.all([
            getPogCount(),
            initializePogDatabase()
        ]);
    if (!req.session.user) {
        return res.redirect('/');
    }

    const displayName = req.session.user.displayName || req.session.user.displayname || null;
    if (!displayName) {
        // fall back to session user if displayName missing
        return res.render('collection', { userdata: req.session.user, maxPogs: pogCount, pogList: results });
    }

    // load latest user data from DB, parse JSON fields, and render
    usdb.get('SELECT * FROM userSettings WHERE displayname = ?', [displayName], (err, row) => {
        if (err) {
            console.error('Error loading user for collection:', err);
            return res.render('collection', { userdata: req.session.user, maxPogs: pogCount, pogList: results });
        }
        if (!row) {
            // no saved DB row — use session
            return res.render('collection', { userdata: req.session.user, maxPogs: pogCount, pogList: results });
        }

        // function to enrich a single inventory instance row into client-facing item
        const { RARITY_COLORS } = require('../modules/backend_js/userState.js');

        function enrichInvRow(invRow, pogList) {
            // try to find matching pog metadata by several candidate fields
            const match = (pogList || []).find(p => {
                return Number(p.id) === Number(invRow.pog_uid) || Number(p.number) === Number(invRow.pog_uid) || Number(p.uid) === Number(invRow.pog_uid);
            });

            if (match) {
                const meta = RARITY_COLORS.find(r => String(r.name).toLowerCase() === String(match.rarity || '').toLowerCase()) || {};
                // derive color name and visual color (hex) to be compatible with various client code
                const pogColorName = match.color || match.pogcol || match.pogCol || match.pog_color || '';
                const visualColor = meta.color || pogColorName || '';
                return {
                    // use inventory uid as instance id (client expects item.id as unique per-instance identifier)
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

            // fallback minimal shape if metadata missing
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

        // Attempt to load per-instance inventory from `inventory` table and enrich using pogList `results`.
        usdb.all('SELECT uid, pog_uid, quantity, legacy_id FROM inventory WHERE user_uid = ?', [row.uid], (invErr, invRows) => {
            let finalInventory = [];
            if (!invErr && Array.isArray(invRows) && invRows.length > 0) {
                finalInventory = invRows.map(r => enrichInvRow(r, results));
            } else {
                // fallback: use legacy JSON inventory column and normalize color props
                try {
                    const legacy = JSON.parse(row.inventory || '[]');
                    finalInventory = (Array.isArray(legacy) ? legacy : []).map(it => ({
                        ...it,
                        pogcol: it.pogcol || it.color || '',
                        color: it.color || it.pogcol || ''
                    }));
                } catch (e) {
                    finalInventory = [];
                }
            }

            // build userdata object from DB row safely
            const userdataFromDb = {
                fid: row.fid,
                displayName: row.displayname,
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
                tiers: (() => { try { return JSON.parse(row.tiers || '[]'); } catch(e){ return []; } })(),
                mergeCount: row.mergeCount,
                highestCombo: row.highestCombo || row.comboHigh || 0,
                wish: row.wish,
                crates: (() => { try { return JSON.parse(row.crates || '[]'); } catch(e){ return []; } })(),
                pfp: row.pfp || "static/icons/pfp/defaultpfp.png"
            };

            // update session to match DB (so other routes match too)
            req.session.user = Object.assign(req.session.user || {}, userdataFromDb);

            return res.render('collection', { userdata: req.session.user, maxPogs: pogCount, pogList: results });
        });
    });
    } catch (error) {
        console.error("Error in collection route:", error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;