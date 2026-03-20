module.exports = (db) => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS userBan (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        bannedList TEXT
    )`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};