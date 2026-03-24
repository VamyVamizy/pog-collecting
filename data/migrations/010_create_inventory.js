module.exports = (db) => {
  return new Promise((resolve, reject) => {
    // If an `inventory` table already exists, rename it to preserve old data
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'", (err, row) => {
      if (err) return reject(err);

      function createTable() {
        db.run(`
          CREATE TABLE IF NOT EXISTS inventory (
            uid INTEGER PRIMARY KEY AUTOINCREMENT,
            user_uid INTEGER NOT NULL,
            pog_uid INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY(user_uid) REFERENCES userSettings(uid),
            FOREIGN KEY(pog_uid) REFERENCES pogs(uid)
          )
        `, (createErr) => {
          if (createErr) return reject(createErr);
          return resolve();
        });
      }

      if (row && row.name === 'inventory') {
        const ts = Date.now();
        const backupName = `inventory_legacy_${ts}`;
        // Rename the existing inventory table so we don't lose its data
        db.run(`ALTER TABLE inventory RENAME TO ${backupName}`, (renameErr) => {
          if (renameErr) return reject(renameErr);
          console.log(`Renamed existing inventory table to ${backupName}`);
          // create the fresh inventory table
          createTable();
        });
      } else {
        // no existing inventory table — just create it
        createTable();
      }
    });
  });
};