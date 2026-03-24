const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/pog.db');

// Add a pog to inventory
function addToInventory(userUid, pogUid) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO userInventory (user_uid, pog_uid) VALUES (?, ?)`,
      [userUid, pogUid],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Remove a pog from inventory (by inventory UID)
function removeFromInventory(inventoryUid) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM userInventory WHERE uid = ?`,
      [inventoryUid],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

// Get full inventory for a user (join to pogs table for details)
function getUserInventory(userUid) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT i.uid AS inventoryUid, p.*
       FROM userInventory i
       JOIN pogs p ON i.pog_uid = p.uid
       WHERE i.user_uid = ?`,
      [userUid],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

module.exports = {
  addToInventory,
  removeFromInventory,
  getUserInventory
};