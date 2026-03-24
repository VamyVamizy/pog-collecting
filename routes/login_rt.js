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
        // OAuth callback returned a token. Instead of automatically creating
        // a session (which causes immediate sign-in), show a confirmation
        // page so the user explicitly accepts the login.
        // If the user recently clicked "Cancel" we set a short-lived
        // session flag `login_cancelled` to avoid immediately showing the
        // confirmation again (the OAuth provider may auto-redirect). In that
        // case, clear the flag and render the regular login page instead.
        if (req.session && req.session.login_cancelled) {
            try { req.session.login_cancelled = false; } catch (e) {}
            const oauthLink = AUTH_URL ? `${AUTH_URL}/oauth?redirectURL=${THIS_URL}` : '/login';
            return res.render('login', { authURL: oauthLink });
        }
        let tokenData = null;
        try {
            tokenData = jwt.decode(req.query.token) || null;
        } catch (e) {
            console.error('[LOGIN] Failed to decode token on callback:', e);
            tokenData = null;
        }
        return res.render('login_confirm', { tokenRaw: req.query.token, tokenData });
    } else {
        // Show a local login page with a button that starts the OAuth flow
        // NOTE: THIS_URL must NOT be encoded — Formbar expects the raw URL.
        const oauthLink = AUTH_URL ? `${AUTH_URL}/oauth?redirectURL=${THIS_URL}` : '/login';
        console.log('[LOGIN] Rendering local login page. OAuth link:', oauthLink);
        return res.render('login', { authURL: oauthLink });
    };
});

// Confirmation endpoint: the login confirmation form posts the raw token back
// here. We decode and persist to session only when the user confirms.
router.post('/login/confirm', (req, res) => {
    const tokenRaw = req.body && req.body.token;
    if (!tokenRaw) return res.status(400).send('Missing token');

    let tokenData = null;
    try {
        tokenData = jwt.decode(tokenRaw) || null;
    } catch (e) {
        console.error('[LOGIN CONFIRM] Failed to decode token:', e);
        return res.status(400).send('Invalid token');
    }

    // Persist minimal user state into session
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

    req.session.save(err => {
        if (err) console.error('[LOGIN CONFIRM] Failed to save session:', err);
        return res.redirect('/');
    });
});

// Cancel login: set a short-lived session flag and redirect back to /login
// so that if the provider auto-redirects immediately we can suppress the
// confirmation page once.
router.post('/login/cancel', (req, res) => {
    try {
        if (!req.session) return res.render('login', { authURL: AUTH_URL ? `${AUTH_URL}/oauth?redirectURL=${THIS_URL}` : '/login' });
        // Mark that the user cancelled so we can suppress one immediate
        // reconfirmation if the provider auto-redirects.
        req.session.login_cancelled = true;
        // Save session then render the local login page immediately so the
        // user sees the local login UI rather than being redirected.
        req.session.save(err => {
            if (err) console.error('[LOGIN CANCEL] Failed to save session:', err);
            const oauthLink = AUTH_URL ? `${AUTH_URL}/oauth?redirectURL=${THIS_URL}` : '/login';
            return res.render('login', { authURL: oauthLink });
        });
    } catch (e) {
        console.error('[LOGIN CANCEL] Error:', e);
        const oauthLink = AUTH_URL ? `${AUTH_URL}/oauth?redirectURL=${THIS_URL}` : '/login';
        return res.render('login', { authURL: oauthLink });
    }
});

// Clear the login_cancelled flag so client can re-initiate login immediately
router.post('/login/clear_cancel', (req, res) => {
    try {
        if (!req.session) return res.status(200).json({ ok: false });
        req.session.login_cancelled = false;
        req.session.save(err => {
            if (err) console.error('[LOGIN CLEAR] Failed to save session:', err);
            return res.json({ ok: true });
        });
    } catch (e) {
        console.error('[LOGIN CLEAR] Error:', e);
        return res.status(500).json({ ok: false });
    }
});

module.exports = router;