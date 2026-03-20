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

let pogListCache = null;

function initializePogDatabase() {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream('pogipedia/db/pogs.csv')
            .pipe(csv({ headers }))
            .on('data', (row) => {
                const { id, name, color, code, number, code2, description, type, rarity, creator, subclass } = row;
                results.push({ id, name, color, code, number, code2, description, type, rarity, creator, subclass });
            })
            .on('end', () => {
                pogListCache = results.map(r => ({
                    id: String(r.id || ''),
                    name: r.name || '',
                    color: r.color || '',
                    code: r.code || '',
                    number: String(r.number || ''),
                    code2: r.code2 || '',
                    description: r.description || '',
                    type: r.type || '',
                    rarity: r.rarity || 'Trash',
                    creator: r.creator || '',
                    subclass: r.subclass || ''
                }));
                resolve(pogListCache);
            })
            .on('error', (err) => {
                console.error('Error reading pogs.csv:', err);
                reject(err);
            });
    });
}

function getPogCount() {
    return new Promise((resolve, reject) => {
        if (Array.isArray(pogListCache)) return resolve(pogListCache.length);
        initializePogDatabase().then(list => resolve(list.length)).catch(reject);
    });
}

function getAllPogs() {
    return new Promise((resolve, reject) => {
        if (Array.isArray(pogListCache)) return resolve(pogListCache);
        initializePogDatabase().then(resolve).catch(reject);
    });
}

module.exports = {
    getPogCount,
    getAllPogs,
    initializePogDatabase
};
