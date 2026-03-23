const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'usersettings.sqlite');
const BACKUP_PATH = path.join(__dirname, `usersettings.sqlite.migration.bak-${Date.now()}`);

console.log('Backing up DB to:', BACKUP_PATH);
fs.copyFileSync(DB_PATH, BACKUP_PATH);
console.log('Backup complete.');

const db = new sqlite3.Database(DB_PATH);

function dbRun(sql, params=[]) {
  return new Promise((resolve, reject) => db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); }));
}

function dbGet(sql, params=[]) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
}

function dbAll(sql, params=[]) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}

async function ensureLegacyColumn() {
  // check pragma table_info for inventory
  const cols = await dbAll("PRAGMA table_info('inventory')");
  const hasLegacy = cols.some(c => String(c.name).toLowerCase() === 'legacy_id');
  if (!hasLegacy) {
    try {
      await dbRun("ALTER TABLE inventory ADD COLUMN legacy_id INTEGER");
      console.log('Added legacy_id column to inventory table');
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('no such table')) {
        throw new Error('inventory table does not exist; run migrations first');
      }
      throw err;
    }
  }
}

function normalizePogUid(raw) {
  if (raw === null || typeof raw === 'undefined') return null;
  // accept numeric strings, numbers
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  // try to extract digits if string contains numeric id
  const m = String(raw).match(/(\d+)/);
  if (m) return Number(m[1]);
  return null;
}

async function migrate() {
  try {
    await ensureLegacyColumn();

    const users = await dbAll('SELECT uid, fid, displayname, inventory FROM userSettings');
    console.log(`Found ${users.length} users to process`);

    // Start transaction for performance and safety
    await dbRun('BEGIN TRANSACTION');

    let totalInserted = 0;
    for (const u of users) {
      let items = [];
      try { items = JSON.parse(u.inventory || '[]'); } catch (e) { items = []; }
      if (!Array.isArray(items) || items.length === 0) continue;

      for (const it of items) {
        const pogUidRaw = it.pogid || it.pogId || it.pog_id || it.pog || it.pogUid || it.pogUID || null;
        const legacyId = (typeof it.id !== 'undefined' && it.id !== null) ? Number(it.id) : null;
        const quantity = (typeof it.quantity === 'number' && it.quantity > 0) ? Math.floor(it.quantity) : 1;
        const pogUid = normalizePogUid(pogUidRaw);

        if (!pogUid) {
          console.warn(`Skipping legacy inventory item for user ${u.uid} — could not determine pog UID from`, pogUidRaw);
          continue;
        }

        // Try to find an existing row. Prefer matching legacy_id when present, otherwise match by user_uid+pog_uid
        let existing = null;
        if (legacyId) {
          existing = await dbGet('SELECT uid, quantity FROM inventory WHERE user_uid = ? AND legacy_id = ?', [u.uid, legacyId]).catch(() => null);
        }
        if (!existing) {
          existing = await dbGet('SELECT uid, quantity FROM inventory WHERE user_uid = ? AND pog_uid = ?', [u.uid, pogUid]).catch(() => null);
        }

        if (existing) {
          // Idempotent behavior: if an inventory row already exists for this user+pog (or legacy_id),
          // skip inserting/updating to avoid double-counting if migration is re-run.
          console.log(`Skipping existing inventory for user ${u.uid}, pog ${pogUid} (existing uid=${existing.uid})`);
        } else {
          await dbRun('INSERT INTO inventory (user_uid, pog_uid, quantity, legacy_id) VALUES (?, ?, ?, ?)', [u.uid, pogUid, quantity, legacyId]);
          totalInserted += 1;
        }
      }
    }

    await dbRun('COMMIT');
    console.log('Migration complete. Rows inserted/updated (approx):', totalInserted);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    try { await dbRun('ROLLBACK'); } catch (e) { /* ignore */ }
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
