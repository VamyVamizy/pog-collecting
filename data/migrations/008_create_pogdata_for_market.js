// Migration: add pog_data column to market table if missing
module.exports = (db) => {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info('market')", (err, rows) => {
      if (err) return reject(err);
      const has = Array.isArray(rows) && rows.some(r => r && r.name === 'pog_data');
      if (has) return resolve();
      db.run("ALTER TABLE market ADD COLUMN pog_data TEXT", (e) => {
        if (e) return reject(e);
        resolve();
      });
    });
  });
};
