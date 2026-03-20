const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csv = require('csv-parser');

const pogs = new sqlite3.Database('./data/usersettings.sqlite', (err) => {
    if (err) {
        console.error("Error connecting to pog database:", err.message);
    } else {
        console.log("Connected to pog database.");
    }
});

const headers = [
    'id', 'name', 'color', 'code', 'number', 'code2',
    'description', 'type', 'rarity', 'creator', 'subclass'
];

function initializePogDatabase() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream('pogipedia/db/pogs.csv')
      .pipe(csv({ headers }))
            .on('data', (row) => {
                const { id, name, color, code, number, code2, description, type, rarity, creator, subclass  } = row;
                results.push({ id, name, color, code, number, code2, description, type, rarity, creator, subclass  });
            })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (err) => {
        console.error("Error reading pogs.csv:", err);
        reject(err);
      });
  });
}

function getPogCount() {
    return new Promise((resolve, reject) => {
        pogs.get(`SELECT COUNT(*) AS count FROM pogs`, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row.count);
            }
        });
    });
}

function getAllPogs() {
    return new Promise((resolve, reject) => {
        pogs.all("SELECT * FROM pogs ORDER BY id", (err, rows) => {
            if (err) return reject(err);
            const formatted = rows.map(({ uid, id, name, color, code, number, code2, description, type, rarity, creator, subclass }) => ({
                id: String(id || ""),
                name: name || "",
                color: color || "",
                code: code || "",
                number: String(number || ""),
                code2: code2 || "",
                description: description || "",
                type: type || "",
                rarity: rarity || "Trash",
                creator: creator || "",
                subclass: subclass || ""
            }));

            resolve(formatted);
        });
    });
}

module.exports = {
    getPogCount,
    getAllPogs,
    initializePogDatabase
};
