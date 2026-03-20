const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'usersettings.sqlite');
const BACKUP_PATH = path.join(__dirname, `usersettings.sqlite.migration.bak-${Date.now()}`);

console.log('Backing up DB to:', BACKUP_PATH);
fs.copyFileSync(DB_PATH, BACKUP_PATH);
console.log('Backup complete.');

const db = new sqlite3.Database(DB_PATH);

function ensureLegacyColumn(callback) {
  db.run("ALTER TABLE inventory ADD COLUMN legacy_id INTEGER", [], (err) => {
    if (err) {
      // ignore "duplicate column" errors
      if (err.message && err.message.toLowerCase().includes('duplicate column')) {
        return callback(null);
      }
      // SQLite reports "duplicate column name" differently; treat as non-fatal
      if (err.code === 'SQLITE_ERROR' && /duplicate/i.test(err.message)) {
        return callback(null);
      }
      // if 'no such table' then fail
      if (err.message && err.message.toLowerCase().includes('no such table')) {
        return callback(new Error('inventory table does not exist; run migrations first'));
      }
      return callback(err);
    }
    return callback(null);
  });
}

function migrate() {
  ensureLegacyColumn((err) => {
    if (err) {
      console.error('Failed to ensure legacy_id column on inventory table:', err.message || err);
      process.exit(1);
    }

    db.all('SELECT uid, fid, displayname, inventory FROM userSettings', [], (err, rows) => {
      if (err) {
        console.error('Failed to read userSettings:', err.message || err);
        process.exit(1);
      }

      let totalInserted = 0;
      let totalUsers = rows.length;
      let processed = 0;

      rows.forEach(u => {
        processed++;
        let items = [];
        try {
          items = JSON.parse(u.inventory || '[]');
        } catch (e) {
          items = [];
        }

        if (!Array.isArray(items) || items.length === 0) {
          if (processed === totalUsers) finish(totalInserted);
          return;
        }

        // For each item in user's inventory, insert into inventory table unless a matching legacy_id exists
        let done = 0;
        items.forEach(it => {
          const pogUid = it.pogid || it.pogId || it.pog_id || it.pog || null;
          const legacyId = it.id || null;

          if (!pogUid) {
            done++;
            if (done === items.length && ++done) {
              if (processed === totalUsers) finish(totalInserted);
            }
            return;
          }

          // check if a row already exists with same user_uid and legacy_id (if present) or same user_uid and pog_uid (to avoid dupes)
          const checkSql = legacyId ? 'SELECT uid, quantity FROM inventory WHERE user_uid = ? AND legacy_id = ?' : 'SELECT uid, quantity FROM inventory WHERE user_uid = ? AND pog_uid = ?';
          const checkParams = legacyId ? [u.uid, legacyId] : [u.uid, pogUid];

          db.get(checkSql, checkParams, (checkErr, existing) => {
            if (checkErr) {
              console.error('DB check error for user', u.uid, checkErr.message || checkErr);
              done++;
              if (done === items.length && processed === totalUsers) finish(totalInserted);
              return;
            }

            if (existing) {
              // increment quantity if duplicate by pog_uid
              db.run('UPDATE inventory SET quantity = quantity + 1 WHERE uid = ?', [existing.uid], (updErr) => {
                if (updErr) console.error('Failed to increment existing inventory row', updErr.message || updErr);
                totalInserted++;
                done++;
                if (done === items.length && processed === totalUsers) finish(totalInserted);
              });
            } else {
              // insert new row
              db.run('INSERT INTO inventory (user_uid, pog_uid, quantity, legacy_id) VALUES (?, ?, ?, ?)', [u.uid, pogUid, 1, legacyId], function(insertErr) {
                if (insertErr) {
                  console.error('Failed to insert inventory row for user', u.uid, insertErr.message || insertErr);
                } else {
                  totalInserted++;
                }
                done++;
                if (done === items.length && processed === totalUsers) finish(totalInserted);
              });
            }
          });
        });
      });

      if (rows.length === 0) finish(totalInserted);
    });
  });
}

function finish(totalInserted) {
  console.log('Migration complete. Rows processed and inserted/updated:', totalInserted);
  db.close();
}

migrate();
