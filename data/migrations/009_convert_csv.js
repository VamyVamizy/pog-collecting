module.exports = (db) => {
    return new Promise((resolve, reject) => {
        const fs = require('fs');
        const csv = require('csv-parser');

        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS pogs (
                    uid INTEGER PRIMARY KEY AUTOINCREMENT,
                    id INTEGER,
                    name TEXT,
                    color TEXT,
                    code TEXT,
                    number INTEGER,
                    code2 TEXT,
                    description TEXT,
                    type TEXT,
                    rarity TEXT,
                    creator TEXT,
                    subclass TEXT
                )
            `);

            const stmt = db.prepare(`
                INSERT INTO pogs (
                    id, name, color, code, number, code2,
                    description, type, rarity, creator, subclass
                ) VALUES (
                    $id, $name, $color, $code, $number, $code2,
                    $description, $type, $rarity, $creator, $subclass
                )
            `);

            const headers = [
                'id', 'name', 'color', 'code', 'number', 'code2',
                'description', 'type', 'rarity', 'creator', 'subclass'
            ];

            db.run("BEGIN TRANSACTION");

            fs.createReadStream('pogipedia/db/pogs.csv')
                .pipe(csv( {headers} ))
                    .on('data', (row) => {
                        const { id, name, color, code, number, code2, description, type, rarity, creator, subclass  } = row;
                        stmt.run({
                            $id: id,
                            $name: name,
                            $color: color,
                            $code: code,
                            $number: number,
                            $code2: code2,
                            $description: description,
                            $type: type,
                            $rarity: rarity,
                            $creator: creator,
                            $subclass: subclass
                        });
                    })
                .on('end', () => {
                    stmt.finalize();
                    db.run("COMMIT");
                    console.log('CSV Successfully converted');
                    resolve();
                })
                .on('error', (err) => {
                    reject(err);
                });
        });
    });
};