const sqlite3 = require('sqlite3').verbose();
const usdb = new sqlite3.Database('./data/usersettings.sqlite');
const express = require('express');
const { initializeUserState, RARITY_COLORS } = require('./modules/backend_js/userState.js');

module.exports = function(app) {
    // API endpoints to persist user team/loadouts server-side
    app.get('/api/user/team', (req, res) => {
        const displayName = req.session.user && (req.session.user.displayName || req.session.user.displayname);
        if (!displayName) return res.status(401).json({ error: 'not_authenticated' });

        usdb.get('SELECT selected_team, loadout_1, loadout_2, loadout_3, loadout_4 FROM team WHERE displayname = ?', [displayName], (err, row) => {
            if (err) return res.status(500).json({ error: 'db_error', detail: err.message });
            if (!row) {
                // return default empty shape
                return res.json({ selected: null, loadouts: [null, null, null, null] });
            }

            const parseOrNull = (txt) => {
                if (!txt) return null;
                try { return JSON.parse(txt); } catch (e) { return null; }
            };

            const loadouts = [parseOrNull(row.loadout_1), parseOrNull(row.loadout_2), parseOrNull(row.loadout_3), parseOrNull(row.loadout_4)];
            const selected = row.selected_team ? parseInt(row.selected_team, 10) : null;
            return res.json({ selected: isNaN(selected) ? null : selected, loadouts });
        });
    });

    // Save entire loadout array (array of 4 entries) and selected index
    app.post('/api/user/team', express.json(), (req, res) => {
        const displayName = req.session.user && (req.session.user.displayName || req.session.user.displayname);
        if (!displayName) return res.status(401).json({ error: 'not_authenticated' });

        const body = req.body || {};
        const loadouts = Array.isArray(body.loadouts) ? body.loadouts : null;
        const selected = typeof body.selected === 'number' ? body.selected : (body.selected == null ? null : Number(body.selected));

        if (!loadouts || loadouts.length !== 4) return res.status(400).json({ error: 'invalid_loadouts' });

        // store each loadout as JSON text (or null)
        const vals = loadouts.map(l => l ? JSON.stringify(l) : null);
        const selectedTxt = (selected == null || isNaN(selected)) ? null : String(selected);

        usdb.run(
            `INSERT OR REPLACE INTO team (displayname, selected_team, loadout_1, loadout_2, loadout_3, loadout_4)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [displayName, selectedTxt, vals[0], vals[1], vals[2], vals[3]],
            function(err) {
                if (err) return res.status(500).json({ error: 'db_error', detail: err.message });
                return res.json({ ok: true });
            }
        );
    });

    app.post('/api/user/sync-inventory', express.json(), (req, res) => {
        const inventory = req.body && req.body.inventory ? req.body.inventory : null;
        const displayName = req.session.user && (req.session.user.displayName || req.session.user.displayname);
        if (!displayName || !Array.isArray(inventory)) {
            return res.status(400).json({ ok: false, message: 'Missing user or inventory' });
        }

        const invJson = JSON.stringify(inventory);
        usdb.run('UPDATE userSettings SET inventory = ? WHERE displayname = ?', [invJson, displayName], function(err) {
            if (err) {
                console.error('Failed to sync inventory to DB for', displayName, err);
                return res.status(500).json({ ok: false, error: err.message });
            }
            // update session object too
            req.session.user = req.session.user || {};
            req.session.user.inventory = inventory;
            // optionally update other derived session fields here
            return res.json({ ok: true, changes: this.changes });
        });
    });

    // API route to get user state
    app.get('/api/user-state', (req, res) => {
    const displayName = req.session.user.displayName;
    usdb.get('SELECT * FROM userSettings WHERE displayname = ?', [displayName], (err, row) => {
        if (err || !row) return res.status(500).json({ error: 'User not found' });
        
        const userState = initializeUserState(row);
        res.json({ userState, rarityColors: RARITY_COLORS });
    });
    });
}