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
const { perks } = require('./modules/backend_js/tb_declar/perk_card.js');
require('./backend_data/marketplace/trading_socket')(io);
app.get('/api/perks', (req, res) => {
    res.json({ perks });
    console.log("Perks API accessed");
});
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
        console.error('Connection error:', err);
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

// user settings database (use repo-root `data` folder)
const { runMigrations } = require('./data/migrations.js');

const usdb = new sqlite3.Database('./data/usersettings.sqlite');

//data saving must come after the express.urlencoded
const datasave = require('./backend_data/datasave.js');
datasave(app);

// Run migrations on startup
runMigrations(usdb).catch(err => {
    console.error('Failed to run migrations:', err);
    process.exit(1);
});


//logout
app.post("/logout", (req, res) => {
    const redirectAfter = encodeURIComponent(THIS_URL);

    req.session.destroy(err => {
        if (err) return res.status(500).send("Logout failed");
        res.clearCookie("connect.sid");

        // Force auth provider logout
        res.redirect(`${AUTH_URL}/logout?redirectURL=${redirectAfter}`);
    });
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

//digipog transfer
const transfer = require('./backend_data/digipog_transfer.js');
transfer(app);

//team build
const teamBuild = require('./backend_data/claim_perks.js');
teamBuild(app);

//perk tiers claim
const claim = require('./backend_data/claim_perks.js');
claim(app);

//listens
http.listen(process.env.PORT || 3000, () => {
    console.log(`Server started on port ${process.env.PORT || 3000}`);
});