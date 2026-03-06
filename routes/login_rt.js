const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();

// URL to take user to Formbar for authentication
const AUTH_URL = process.env.AUTH_URL; // ... or the address to the instance of fbjs you wish to connect to

//URL to take user back to after authentication
const THIS_URL = process.env.THIS_URL; // ... or whatever the address to your application is

//user declaration vars
const achievements = require("../modules/backend_js/trophyList.js");
const tiers = require("../modules/backend_js/tierList.js");
const crateRef = require("../modules/backend_js/crateRef.js");

// login page
router.get('/login', (req, res) => {
    if (req.query.token) {
        let tokenData = jwt.decode(req.query.token);
        // Persist token into session and set a short-lived fallback cookie in
        // case the browser hasn't yet stored/sent the session cookie on the
        // next request (avoids race conditions during redirect).
        req.session.token = tokenData;
        req.session.user = {
            displayName: tokenData.displayName,
            fid: tokenData.fid,
            theme: tokenData.theme || 'black',
            score: tokenData.score || 0,
            inventory: tokenData.inventory || [],
            Isize: tokenData.Isize || 3,
            xp: tokenData.xp || 0,
            maxxp: tokenData.maxxp || 100,
            level: tokenData.level || 1,
            income: tokenData.income || 0,
            totalSold: tokenData.totalSold || 0,
            cratesOpened: tokenData.cratesOpened || 0,
            pogamount: tokenData.pogamount || [],
            achievements: tokenData.achievements || achievements,
            tiers: tokenData.tiers || tiers,
            mergeCount: tokenData.mergeCount || 0,
            highestCombo: tokenData.highestCombo || 0,
            wish: tokenData.wish || 0,
            crates: tokenData.crates || crateRef,
            pfp: tokenData.pfp || "static/icons/pfp/defaultpfp.png"
        };

        // Save the session to ensure the session store has the token before
        // redirecting. Also set a very short-lived httpOnly cookie as a
        // fallback (bootstrapped by middleware) if the session cookie hasn't
        // been set by the browser yet.
        req.session.save(err => {
            if (err) console.error('Failed to save session after login:', err);
            try {
                res.cookie('fb_token', JSON.stringify(tokenData), { httpOnly: true, maxAge: 60 * 1000 });
            } catch (e) {
                console.error('Failed to set fb_token cookie:', e);
            }
            return res.redirect('/');
        });
    } else {
        // If no token in the query, start auth with the external provider if
        // configured, otherwise go to local login fallback
        if (AUTH_URL) return res.redirect(`${AUTH_URL}?redirectURL=${THIS_URL}`);
        return res.redirect('/login');
    };
});

module.exports = router;