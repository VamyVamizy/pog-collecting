module.exports = (db) => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS userBan (
        bannedList TEXT
    )`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};