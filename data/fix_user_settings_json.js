const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'usersettings.sqlite');
const BACKUP_PATH = path.join(__dirname, `usersettings.sqlite.bak-${Date.now()}`);

console.log('Backing up DB:', DB_PATH, '->', BACKUP_PATH);
fs.copyFileSync(DB_PATH, BACKUP_PATH);
console.log('Backup written.');

const trophyList = require('../modules/backend_js/trophyList.js');
const tierList = require('../modules/backend_js/tierList.js');

const canonicalAchievements = JSON.stringify(trophyList);
const canonicalTiers = JSON.stringify(tierList);
const canonicalPerks = JSON.stringify([]);

const db = new sqlite3.Database(DB_PATH);

function tryParse(value) {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

db.serialize(() => {
  // use rowid because the userSettings table may not have an 'id' column
  db.all('SELECT rowid as id, fid, displayname, achievements, tiers, perks FROM userSettings', (err, rows) => {
    if (err) {
      console.error('Error querying userSettings:', err);
      process.exit(1);
    }

    let fixes = 0;

  const stmt = db.prepare(`UPDATE userSettings SET achievements = ?, tiers = ?, perks = ? WHERE rowid = ?`);

    rows.forEach(r => {
      let needFix = false;
      let ach = r.achievements;
      let tiers = r.tiers;
      let perks = r.perks;

      const parsedAch = tryParse(ach);
      if (parsedAch === null) {
        ach = canonicalAchievements;
        needFix = true;
      }

      const parsedTiers = tryParse(tiers);
      if (parsedTiers === null) {
        tiers = canonicalTiers;
        needFix = true;
      }

      const parsedPerks = tryParse(perks);
      if (parsedPerks === null) {
        perks = canonicalPerks;
        needFix = true;
      }

      if (needFix) {
        fixes++;
        stmt.run(ach, tiers, perks, r.id, function(err) {
          if (err) console.error('Error updating id', r.id, err);
          else console.log(`Fixed id=${r.id} (${r.displayname || r.fid})`);
        });
      }
    });

    stmt.finalize(() => {
      console.log('Completed scan. Total fixes:', fixes);
      db.close();
    });
  });
});
