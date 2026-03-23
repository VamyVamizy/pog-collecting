const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/pog.db'); // your database file

function addToInventory(userUid, pogUid) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO userInventory (user_uid, pog_uid) VALUES (?, ?)`,
      [userUid, pogUid],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function migrate() {
  db.all(`SELECT uid, inventory FROM userSettings`, async (err, rows) => {
    if (err) {
      console.error("Error reading users:", err);
      db.close();
      return;
    }

    for (const user of rows) {
      if (!user.inventory) continue; // skip empty inventories
      let oldInventory;
      try {
        oldInventory = JSON.parse(user.inventory);
      } catch (e) {
        console.warn(`Skipping invalid inventory for user ${user.uid}`);
        continue;
      }

      for (const pog of oldInventory) {
        if (!pog.uid) continue; // skip invalid pog entries
        try {
          await addToInventory(user.uid, pog.uid);
        } catch (err) {
          console.error(`Failed to add pog ${pog.uid} for user ${user.uid}:`, err);
        }
      }
    }

    console.log("Migration complete.");
    db.close();
  });
}

migrate();
//node migrate_inventory.js