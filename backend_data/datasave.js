const sqlite3 = require('sqlite3').verbose();
const usdb = new sqlite3.Database('./data/usersettings.sqlite');

module.exports = function(app) {
    // save data route
    app.post('/datasave', (req, res) => {
        const userSave = {
            theme: req.body.lightMode,
            score: req.body.money,
            inventory: req.body.inventory,
            Isize: req.body.Isize,
            xp: req.body.xp,
            maxxp: req.body.maxXP,
            level: req.body.level,
            income: req.body.income,
            totalSold: req.body.totalSold,
            cratesOpened: req.body.cratesOpened,
            pogamount: req.body.pogAmount,
            tiers: req.body.tiers,
            achievements: req.body.achievements,
            mergeCount: req.body.mergeCount,
            highestCombo: req.body.highestCombo,
            wish: req.body.wish,
            crates: req.body.crates,
            pfp: req.body.pfp
        }

        // save to session
        req.session.save(err => {
            if (err) {
                console.error('Error saving session:', err);
                return res.status(500).json({ message: 'Error saving session' });
            } else {
                    const params = [
                    req.session.user.fid,
                    userSave.theme,
                    userSave.score,
                    JSON.stringify(userSave.inventory),
                    userSave.Isize,
                    userSave.xp,
                    userSave.maxxp,
                    userSave.level,
                    userSave.income,
                    userSave.totalSold,
                    userSave.cratesOpened,
                    JSON.stringify(userSave.pogamount),
                    JSON.stringify(userSave.achievements),
                    JSON.stringify(userSave.tiers),
                    userSave.mergeCount,
                    req.session.user.highestCombo,
                    userSave.wish,
                    JSON.stringify(userSave.crates),
                    userSave.pfp,
                    req.session.user.displayName
                ]
                usdb.run(`UPDATE userSettings SET fid = ?, theme = ?, score = ?, inventory = ?, Isize = ?, xp = ?, maxxp = ?, level = ?, income = ?, totalSold = ?, cratesOpened = ?, pogamount = ?, achievements = ?, tiers = ?, mergeCount = ?, highestCombo = ?, wish = ?, crates = ?, pfp = ? WHERE displayname = ?`, params, function (err) {
                    if (err) {
                        console.error('Error updating user settings:', err);
                        return res.status(500).json({ message: 'Error updating user settings' });
                    }
                    req.session.user = { ...req.session.user, ...userSave };
                    return res.json({ message: 'Data saved successfully' });
                });
            }
        });
    });
}