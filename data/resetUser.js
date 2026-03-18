const sqlite3 = require('sqlite3').verbose();
const argv = require('minimist')(process.argv.slice(2));

if (!argv.fid && !argv.displayname) {
  console.error('Provide --fid or --displayname');
  process.exit(2);
}

const db = new sqlite3.Database('./data/usersettings.sqlite');

const defaults = {
  theme: 'black',
  score: 0,
  inventory: '[]',
  Isize: 10,
  xp: 0,
  maxxp: 30,
  level: 1,
  income: 0,
  totalSold: 0,
  cratesOpened: 0,
  pogamount: '[]',
  // Use the canonical achievements data and stringify it so the DB contains valid JSON
  achievements: JSON.stringify(require('../modules/backend_js/trophyList.js')),
  tiers: '[]',
  mergeCount: 0,
  highestCombo: 0,
  wish: 0,
  crates: '[]',
  pfp: 'static/icons/pfp/defaultpfp.png'
};

const params = [
  defaults.theme,
  defaults.score,
  defaults.inventory,
  defaults.Isize,
  defaults.xp,
  defaults.maxxp,
  defaults.level,
  defaults.income,
  defaults.totalSold,
  defaults.cratesOpened,
  defaults.pogamount,
  defaults.achievements,
  defaults.tiers,
  defaults.mergeCount,
  defaults.highestCombo,
  defaults.wish,
  defaults.crates,
  defaults.pfp
];

let sql = `UPDATE userSettings SET
  theme = ?, score = ?, inventory = ?, Isize = ?, xp = ?, maxxp = ?, level = ?,
  income = ?, totalSold = ?, cratesOpened = ?, pogamount = ?, achievements = ?, tiers = ?,
  mergeCount = ?, highestCombo = ?, wish = ?, crates = ?, pfp = ?`;

if (argv.fid) {
  sql += ' WHERE fid = ?';
  params.push(Number(argv.fid));
} else {
  sql += ' WHERE displayname = ?';
  params.push(String(argv.displayname));
}

console.log('Running:', sql, params);

db.run(sql, params, function(err) {
  if (err) {
    console.error('DB error', err);
    process.exit(1);
  }
  console.log('Rows updated:', this.changes);
  db.close();
});