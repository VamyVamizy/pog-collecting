module.exports = (db) => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS userBan (
        banned TEXT,
        uid TEXT PRIMARY KEY
    )`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};