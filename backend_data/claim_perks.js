const sqlite3 = require('sqlite3').verbose();
const usdb = new sqlite3.Database('./data/usersettings.sqlite');
const express = require('express');

module.exports = function(app) {
    // API to claim or update a single perk tier status
    app.post('/api/perk-tiers/claim', express.json(), (req, res) => {
        console.log('POST /api/perk-tiers/claim called');
        if (!req.session || !req.session.user) {
            console.log('No session or user for claim');
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const { tier: tierNum, status } = req.body || {};
        if (typeof tierNum === 'undefined' || !status) {
            console.log('Missing tier or status in body', req.body);
            return res.status(400).json({ error: 'Missing tier or status' });
        }

        // ensure session tiers exist
        req.session.user.tiers = Array.isArray(req.session.user.tiers) ? req.session.user.tiers : JSON.parse(JSON.stringify(tiers));

        const idx = req.session.user.tiers.findIndex(t => Number(t.tier) === Number(tierNum));
        if (idx === -1) return res.status(404).json({ error: 'Tier not found' });

        req.session.user.tiers[idx].status = status;

        // persist to DB
        const tiersJson = JSON.stringify(req.session.user.tiers);
        const displayName = req.session.user.displayName;
        console.log('Saving tiers for', displayName, req.session.user.tiers);
        usdb.run('UPDATE userSettings SET tiers = ? WHERE displayname = ?', [tiersJson, displayName], function(err) {
            if (err) {
                console.error('Error saving tiers for', displayName, err);
                // try to add the column if it doesn't exist, then retry once
                if (err.message && err.message.toLowerCase().includes('no such column')) {
                    usdb.run("ALTER TABLE userSettings ADD COLUMN tiers TEXT DEFAULT '[]'", [], function(altErr) {
                        if (altErr) {
                            console.error('Failed to add tiers column:', altErr);
                            return res.status(500).json({ error: 'db' });
                        }
                        // retry update
                        usdb.run('UPDATE userSettings SET tiers = ? WHERE displayname = ?', [tiersJson, displayName], function(err2) {
                            if (err2) {
                                console.error('Error saving tiers after adding column for', displayName, err2);
                                return res.status(500).json({ error: 'db' });
                            }
                            // ensure session is saved before responding
                            req.session.save(saveErr => {
                                if (saveErr) console.error('Failed to save session after tiers update:', saveErr);
                                console.log('Tiers saved and session saved (after ALTER) for', displayName);
                                return res.json({ tiers: req.session.user.tiers });
                            });
                        });
                    });
                    return;
                }
                return res.status(500).json({ error: 'db' });
            }
            // ensure session is saved before responding
            req.session.save(saveErr => {
                if (saveErr) console.error('Failed to save session after tiers update:', saveErr);
                console.log('Tiers saved and session saved for', displayName);
                return res.json({ tiers: req.session.user.tiers });
            });
        });
    });

    // GET saved tiers (reads DB to confirm persisted data)
    app.get('/api/perk-tiers', (req, res) => {
        if (!req.session || !req.session.user) return res.status(401).json({ error: 'Not authenticated' });
        const displayName = req.session.user.displayName || req.session.user.displayname;
        const tiers = (req.session.user.tiers);
        if (!displayName) return res.status(400).json({ error: 'Missing displayName in session' });
        usdb.get('SELECT tiers FROM userSettings WHERE displayname = ?', [displayName], (err, row) => {
            if (err) {
                console.error('Error reading tiers from DB for', displayName, err);
                return res.status(500).json({ error: 'db' });
            }
            try {
                return res.json({ tiers });
            } catch (e) {
                console.error('Failed to parse tiers JSON from DB for', displayName, e);
                return res.json({ tiers: req.session.user.tiers || [] });
            }
        });
    });
}