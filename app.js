//const
const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http);
const digio = require('socket.io-client');
require('dotenv').config();
const cookieParser = require('cookie-parser');

//debug
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

process.on('exit', (code) => {
    console.error('PROCESS EXITED WITH CODE:', code);
});

//modules
const achievements = require("./modules/backend_js/trophyList.js");
const crateRef = require("./modules/backend_js/crateRef.js");
const { initializeUserState, RARITY_COLORS } = require('./modules/backend_js/userState.js');
const { perks } = require('./modules/backend_js/tb_declar/perk_card.js');
require('./backend_data/marketplace/trading_socket')(io);
// banned list helper (used to print/inspect banned users)
const bannedListModule = require('./modules/backend_js/tb_declar/banned_list.js');
app.get('/api/perks', (req, res) => {
    res.json({ perks });
    console.log("Perks API accessed");
});
const tiers = require("./modules/backend_js/tierList.js");
const { getPogCount, getAllPogs, initializePogDatabase } = require('./backend_data/pog_ref.js');
let pogCount = 0;
let results = [];

async function initApp() {
  try {
    results = await initializePogDatabase();
    pogCount = await getPogCount();
    console.log('Pog CSV count:', results.length);
    console.log('DB pog count:', pogCount);
  } catch (err) {
    console.error("Error initializing app:", err);
    process.exit(1);
  }
}

initApp();
/* This creates session middleware with given options;
The 'secret' option is used to sign the session ID cookie.
The 'resave' option is used to force the session to be saved back to the session store, even if the session was never modified during the request.
The 'saveUninitialized' option is used to force a session that is not initialized to be saved to the store.*/
app.use(session({
    secret: 'youweremybrotheranakin',
    resave: false,
    saveUninitialized: false
}));
app.use((req, res, next) => {
    next();
});

//routes
const marketplaceRouter = require('./routes/marketplace_rt.js');
app.use('/', marketplaceRouter);
const collectionRouter = require('./routes/collection_rt.js');
app.use('/', collectionRouter);
const authRouter = require('./routes/authenticate_rt.js');
app.use('/', authRouter);
const loginRouter = require('./routes/login_rt.js');
app.use('/', loginRouter);

// API key for Formbar API access
const API_KEY = process.env.API_KEY;

// URL to take user to Formbar for authentication
const AUTH_URL = process.env.AUTH_URL; // ... or the address to the instance of fbjs you wish to connect to

//URL to take user back to after authentication
const THIS_URL = process.env.THIS_URL; // ... or whatever the address to your application is

const socket = digio(AUTH_URL, {
    extraHeaders: {
        api: API_KEY
    }
});

// socket events for digipog transfers
socket.on('connect', () => {
    console.log('Connected to Formbar socket server');
    // Send the transfer 
    socket.emit('transfer digipogs');
});

socket.on('connect_error',
    (err) => {
        //console.error('Connection error:', err);
    }
);

socket.on('transferResponse', (response) => {
    console.log('Transfer response:', response);
});

/* It is a good idea to use a Environment Variable or a .env file that is in the .gitignore file for your SECRET.
This will prevent it from getting out and allowing people to hack your cookies.*/

//set
app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.use('/static', express.static('static'));
app.use(express.urlencoded({limit: '50mb', extended: true }));
app.use(express.json({limit: '50mb'}));
app.use(cookieParser());

app.use((req, res, next) => {
    try {
        const banned = bannedListModule && typeof bannedListModule.getBannedList === 'function'
            ? bannedListModule.getBannedList()
            : [];
        const fid = req.session && req.session.user && (req.session.user.fid || req.session.user.FID) ? Number(req.session.user.fid || req.session.user.FID) : null;
        const isBanned = fid != null && banned.some(b => (b && b.fid && Number(b.fid) === fid) || (typeof b === 'number' && b === fid));
        // attach to session and locals for templates and client scripts
        if (!req.session.user) req.session.user = req.session.user || {};
        req.session.user.isBanned = !!isBanned;
        res.locals.userBanned = !!isBanned;
    } catch (e) {
        console.error('Failed to evaluate banned status for session user:', e);
    }
    next();
});

// user settings database (use repo-root `data` folder)
const { runMigrations } = require('./data/migrations.js');

const usdb = new sqlite3.Database('./data/usersettings.sqlite');

// Run migrations on startup
runMigrations(usdb).catch(err => {
    console.error('Failed to run migrations:', err);
    process.exit(1);
});


//logout
app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send("Logout failed");
        res.clearCookie("connect.sid");

        const wantsJson = req.headers['accept'] && req.headers['accept'].includes('application/json');
        if (wantsJson) {
            return res.json({ redirect: '/logged-out' });
        }
        return res.redirect('/logged-out');
    });
});

// logged-out landing page
app.get('/logged-out', (req, res) => {
    res.render('loggedout');
});

// patch notes page
app.get('/patch', (req, res) => {
    res.render('patch', { userdata: req.session.user, maxPogs: pogCount, pogList: results });
});

// trade room page
app.get('/chatroom', (req, res) => {
    res.render('chatroom', { userdata: req.session.user, maxPogs: pogCount, pogList: results });
});

app.get('/achievements', (req, res) => {
    res.render('achievements', { userdata: req.session.user, maxPogs: pogCount, pogList: results });
});

app.get('/battle', (req, res) => {
    res.render('battle', { userdata: req.session.user, maxPogs: pogCount, pogList: results });
});

app.get('/pogipedia', (req, res) => {
    res.render('pogipedia', { userdata: req.session.user, maxPogs: pogCount, pogList: results });
});

app.get('/leaderboard', (req, res) => {
    usdb.all(
        'SELECT * FROM userSettings ORDER BY score DESC LIMIT 50', [],
        (err, rows) => {
            if (err) {
                console.error('DB select error:', err);
            }
            res.render('leaderboard', { userdata: req.session.user, maxPogs: pogCount, pogList: results, scores: rows });
        }
    );
});

app.get('/playerbase', (req, res) => {
    usdb.all(
        'SELECT * FROM userSettings ORDER BY score DESC', [],
        (err, rows) => {
            if (err) {
                console.error('DB select error:', err);
            }
            // If current user is an admin, print the banned list to server console for debugging
            try {
                const currentId = req.session && req.session.user && req.session.user.fid ? Number(req.session.user.fid) : null;
                const adminIds = [73,84,44,87,43];
                if (currentId && adminIds.includes(currentId)) {
                    console.log('Admin entered playerbase; banned list:', bannedListModule.getBannedList());
                }
            } catch (e) {
                console.error('Error while printing banned list for admin:', e);
            }

            res.render('playerbase', { userdata: req.session.user, maxPogs: pogCount, pogList: results, scores: rows });
        }
    );
});

app.get('/api/leaderboard', (req, res) => {
    usdb.all('SELECT displayname, score FROM userSettings ORDER BY score DESC LIMIT 50', [], (err, rows) => {
        if (err) {
            console.error('API leaderboard error', err);
            return res.status(500).json({ error: 'db' });
        }
        res.json(rows || []);
    });
});

app.get('/api/playerbase', (req, res) => {
    usdb.all('SELECT displayname, score FROM userSettings ORDER BY score DESC', [], (err, rows) => {
        if (err) {
            console.error('API playerbase error', err);
            return res.status(500).json({ error: 'db' });
        }
        res.json(rows || []);
    });
});

// API endpoint to get recent trades
app.get('/api/trades/recent', (req, res) => {
    // Return only pending trade offers so completed/accepted ones don't reappear
    usdb.all('SELECT * FROM chat WHERE trade_type = ? AND trade_status = ? ORDER BY id DESC LIMIT 50', ['trade', 'pending'], (err, rows) => {
        if (err) {
            console.error('API trades error', err);
            return res.status(500).json({ error: 'db' });
        }
        res.json(rows || []);
    });
});

// Add this with your other API endpoints
app.get('/api/auctions/active', (req, res) => {
    usdb.all('SELECT * FROM market WHERE AuctionStatus = ? ORDER BY createdAt DESC LIMIT 50', ['active'], (err, rows) => {
        if (err) {
            console.error('API auctions error', err);
            return res.status(500).json({ error: 'db' });
        }
        res.json(rows || []);
    });
});


// save data route
app.post('/datasave', (req, res) => {
    const userSave = {
        theme: req.body.lightMode,
        score: req.body.money,
        inventory: req.body.inventory,
        Isize: req.body.Isize,
        xp: req.body.xp,
        maxxp: req.body.maxXP,
        level: req.body.level,
        income: req.body.income,
        totalSold: req.body.totalSold,
        cratesOpened: req.body.cratesOpened,
        pogamount: req.body.pogAmount,
        tiers: req.body.tiers,
        achievements: req.body.achievements,
        mergeCount: req.body.mergeCount,
        highestCombo: req.body.highestCombo,
        wish: req.body.wish,
        crates: req.body.crates,
        pfp: req.body.pfp
    }

    // save to session
    req.session.save(err => {
        if (err) {
            console.error('Error saving session:', err);
            return res.status(500).json({ message: 'Error saving session' });
        } else {
                const params = [
                req.session.user.fid,
                userSave.theme,
                userSave.score,
                JSON.stringify(userSave.inventory),
                userSave.Isize,
                userSave.xp,
                userSave.maxxp,
                userSave.level,
                userSave.income,
                userSave.totalSold,
                userSave.cratesOpened,
                JSON.stringify(userSave.pogamount),
                JSON.stringify(userSave.achievements),
                JSON.stringify(userSave.tiers),
                userSave.mergeCount,
                req.session.user.highestCombo,
                userSave.wish,
                JSON.stringify(userSave.crates),
                userSave.pfp,
                req.session.user.displayName
            ]
            usdb.run(`UPDATE userSettings SET fid = ?, theme = ?, score = ?, inventory = ?, Isize = ?, xp = ?, maxxp = ?, level = ?, income = ?, totalSold = ?, cratesOpened = ?, pogamount = ?, achievements = ?, tiers = ?, mergeCount = ?, highestCombo = ?, wish = ?, crates = ?, pfp = ? WHERE displayname = ?`, params, function (err) {
                if (err) {
                    console.error('Error updating user settings:', err);
                    return res.status(500).json({ message: 'Error updating user settings' });
                }
                req.session.user = { ...req.session.user, ...userSave };
                return res.json({ message: 'Data saved successfully' });
            });
        }
    });
});

// Express route to handle digipog transfer requests
// the URL for the post must be the same as the one in the fetch request
app.post('/api/digipogs/transfer', (req, res) => {
    // req.body gets the information sent from the client
    const cost = req.body.price;
    const payload = req.body;
    const reason = payload.reason;
    const pin = payload.pin;
    const id = req.session.user.fid; // Formbar user ID of payer from session
    
    // carter and vincent ids for testing respectively
    const isAdmin = id === 73 || id === 84 || id === 44 || id === 87 || id === 43;
    
    if (isAdmin) {
        // For admins, return success without processing actual transaction
        console.log('Admin transaction bypassed cost deduction.');
        return res.json({ success: true, message: 'Admin transaction (no cost)', amount: 0 });
    }
    
    console.log(cost, reason, pin, id);
    const paydesc = {
        from: id, // Formbar user ID of payer
        to: 30,    // Formbar user ID of payee (e.g., pog collecting's account)
        amount: cost,
        reason: reason,
        // security pin for the payer's account
        pin: pin,
        pool: true
    };
    // make a direct transfer request using fetch
    fetch(`${AUTH_URL}/api/digipogs/transfer`, {
        method: 'POST',
        // headers to specify json content
        headers: { 'Content-Type': 'application/json' },
        // stringify the paydesc object to send as JSON
        body: JSON.stringify(paydesc),
    }).then((transferResult) => {
        return transferResult.json();
    }).then((responseData) => {
        console.log("Transfer Response:", responseData);
        //res.JSON must be here to send the response back to the client
        res.json(responseData);
    }).catch(err => {
        console.error("Error during digipog transfer:", err);
        res.status(500).json({ message: 'Error during digipog transfer' });
    });
});

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
// ban hammer (from Phighting!)
app.post('/api/ban', express.json(), (req, res) => {
    // Simple admin check (same test used elsewhere)
    const adminIds = [73,44,87,43];
    const currentId = req.session.user && req.session.user.fid ? Number(req.session.user.fid) : null;
    if (!currentId || !adminIds.includes(currentId)) {
        return res.status(403).json({ ok: false, message: 'forbidden' });
    }

    const body = req.body || {};
    const fid = body.fid ? (isNaN(Number(body.fid)) ? null : Number(body.fid)) : null;
    const displayname = body.displayname ? String(body.displayname) : null;
    if (!fid && !displayname) return res.status(400).json({ ok: false, message: 'missing identifier' });

    // Protect certain internal/admin FIDs from being banned.
    const PROTECTED_FIDS = [73, 44, 87, 43];
    if (fid && PROTECTED_FIDS.includes(fid)) {
        return res.status(400).json({ ok: false, message: 'cannot ban this user' });
    }

    const userObj = fid ? { fid } : { name: displayname };
    try {
        bannedListModule.addBannedUser(userObj);
        return res.json({ ok: true });
    } catch (e) {
        console.error('Failed to add banned user', e);
        return res.status(500).json({ ok: false });
    }
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

//listens
http.listen(process.env.PORT || 3000, () => {
    console.log(`Server started on port ${process.env.PORT || 3000}`);
});
