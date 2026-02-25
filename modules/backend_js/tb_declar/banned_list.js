const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', '..', 'data', 'usersettings.sqlite');
const usdb = new sqlite3.Database(dbPath);

let bannedList = [];

function _saveToDb() {
    const txt = JSON.stringify(bannedList || []);
    usdb.get('SELECT COUNT(*) as c FROM userBan', [], (err, row) => {
        if (err) {
            usdb.run('CREATE TABLE IF NOT EXISTS userBan (bannedList TEXT)', [], (createErr) => {
                if (createErr) return console.error('Failed to create userBan table:', createErr);
                usdb.run('INSERT INTO userBan (bannedList) VALUES (?)', [txt], (insErr) => {
                    if (insErr) console.error('Failed to insert initial bannedList:', insErr);
                });
            });
            return;
        }
        if (row && row.c > 0) {
            usdb.run('UPDATE userBan SET bannedList = ?', [txt], function(runErr) {
                if (runErr) console.error('Failed to update bannedList:', runErr);
            });
        } else {
            usdb.run('INSERT INTO userBan (bannedList) VALUES (?)', [txt], function(insErr) {
                if (insErr) console.error('Failed to insert bannedList:', insErr);
            });
        }
    });
}

function _loadFromDb() {
    usdb.get('SELECT bannedList FROM userBan LIMIT 1', [], (err, row) => {
        if (err) {
            usdb.run('CREATE TABLE IF NOT EXISTS userBan (bannedList TEXT)', [], (createErr) => {
                if (createErr) return console.error('Failed to ensure userBan table:', createErr);
                bannedList = [];
                _saveToDb();
            });
            return;
        }
        if (row && row.bannedList) {
            try {
                bannedList = JSON.parse(row.bannedList);
                if (!Array.isArray(bannedList)) bannedList = [];
            } catch (e) {
                console.error('Failed to parse bannedList JSON from DB, resetting to empty:', e);
                bannedList = [];
            }
        } else {
            bannedList = [];
            _saveToDb();
        }
    });
}

function _findIndex(user) {
    if (user == null) return -1;
    if (typeof user === 'object') {
        if ('fid' in user) return bannedList.findIndex(u => u && u.fid == user.fid);
        if ('name' in user) return bannedList.findIndex(u => u && u.name == user.name);
        // fallback cool
        const js = JSON.stringify(user);
        return bannedList.findIndex(u => JSON.stringify(u) === js);
    }
    return bannedList.indexOf(user);
}

_loadFromDb();

module.exports = {
    getBannedList: () => {
        return Array.isArray(bannedList) ? bannedList.slice() : [];
    },

    addBannedUser: (user) => {
        if (!user) return;
        const idx = _findIndex(user);
        if (idx !== -1) return;
        bannedList.push(user);
        _saveToDb();
    },

    removeBannedUser: (user) => {
        const index = _findIndex(user);
        if (index > -1) {
            bannedList.splice(index, 1);
            _saveToDb();
        }
    },
    _reloadFromDb: () => {
        _loadFromDb();
    }
};