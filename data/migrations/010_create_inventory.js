module.exports = (db) => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        uid INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uid INTEGER NOT NULL,
        pog_uid INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        FOREIGN KEY(user_uid) REFERENCES userSettings(uid),
        FOREIGN KEY(pog_uid) REFERENCES pogs(uid)
)`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};