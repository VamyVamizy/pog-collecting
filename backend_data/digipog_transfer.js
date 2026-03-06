module.exports = function(app) {
    // Express route to handle digipog transfer requests
    // the URL for the post must be the same as the one in the fetch request
    app.post('/api/digipogs/transfer', (req, res) => {
        // req.body gets the information sent from the client
        const cost = req.body.price;
        const payload = req.body;
        const reason = payload.reason;
        const pin = payload.pin;
        const id = req.session.user.fid; // Formbar user ID of payer from session
        
        // carter and vincent ids for testing respectively
        const isAdmin = id === 73 || id === 44 || id === 87 || id === 26 || id === 43 || id === 1 || id === 127; // Add any other admin IDs as needed
        
        if (isAdmin) {
            // For admins, return success without processing actual transaction
            console.log('Admin transaction bypassed cost deduction.');
            return res.json({ success: true, message: 'Admin transaction (no cost)', amount: 0 });
        }
        
        console.log(cost, reason, pin, id);
        const paydesc = {
            from: id, // Formbar user ID of payer
            to: 30,    // Formbar user ID of payee (e.g., pog collecting's account)
            amount: cost,
            reason: reason,
            // security pin for the payer's account
            pin: pin,
            pool: true
        };
        // make a direct transfer request using fetch
        fetch(`${AUTH_URL}/api/digipogs/transfer`, {
            method: 'POST',
            // headers to specify json content
            headers: { 'Content-Type': 'application/json' },
            // stringify the paydesc object to send as JSON
            body: JSON.stringify(paydesc),
        }).then((transferResult) => {
            return transferResult.json();
        }).then((responseData) => {
            console.log("Transfer Response:", responseData);
            //res.JSON must be here to send the response back to the client
            res.json(responseData);
        }).catch(err => {
            console.error("Error during digipog transfer:", err);
            res.status(500).json({ message: 'Error during digipog transfer' });
        });
    });
}