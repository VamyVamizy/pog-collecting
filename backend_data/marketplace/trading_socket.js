const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const usdb = new sqlite3.Database('./data/usersettings.sqlite');
const { Server } = require('socket.io');
const app = express();
const http = require('http').createServer(app);
const io = new Server(http);

module.exports = function(io) {

    // Auction limits (server-side authoritative)
    const AUCTION_LIMITS = {
        MIN_START_PRICE: 100,
        MIN_INCREMENT: 10,
        MIN_DURATION_MINUTES: 1,
        MAX_DURATION_MINUTES: 1440, // 1 day max
        MAX_BUY_NOW_PRICE: 10000000
    };

    // Helper functions
    function ensurePogMetadata(item) {
        if (!item) return item;
        try {
            // If item is a JSON string, try to parse it
            if (typeof item === 'string') {
                try { item = JSON.parse(item); } catch (e) { item = { name: String(item) }; }
            }
        } catch (e) {
            item = { name: String(item) };
        }

        const rarityMap = {
            Trash: { income: 2, color: 'red' },
            Common: { income: 7, color: 'yellow' },
            Uncommon: { income: 13, color: 'lime' },
            Mythic: { income: 20, color: 'fuchsia' },
            Unique: { income: 28, color: 'lightgray' }
        };

        try {
            if (!('income' in item) || typeof item.income !== 'number') {
                if (item && item.rarity && rarityMap[item.rarity]) {
                    item.income = rarityMap[item.rarity].income;
                } else {
                    item.income = 5;
                }
            }
            if (!('color' in item) || !item.color) {
                if (item && item.rarity && rarityMap[item.rarity]) {
                    item.color = rarityMap[item.rarity].color;
                }
            }
        } catch (e) {
            item.income = item.income || 5;
        }

        return item;
    }
    function completeAuction(auction, winnerId, winnerName, winnerPfp, finalBid) {
        usdb.run(`UPDATE market SET AuctionStatus = ?, winner_id = ?, winner_name = ?, winner_pfp = ?, winner_bid = ? 
                  WHERE user_id = ? AND pog = ?`,
            ['completed', winnerId, winnerName, winnerPfp, finalBid, auction.user_id, auction.pog],
            function(err) {
                if (err) {
                    console.error('Error completing auction:', err);
                    return;
                }

                // Defensive: do not allow seller to be set as winner (should be prevented earlier)
                if (String(winnerId) === String(auction.user_id)) {
                    console.warn('Attempted to complete auction where winner is the seller; aborting transfer');
                    // Still mark auction completed but do not transfer
                    const completedAuction = {
                        ...auction,
                        AuctionStatus: 'completed',
                        winner_id: winnerId,
                        winner_name: winnerName,
                        winner_pfp: winnerPfp,
                        winner_bid: finalBid,
                        pogData: auction.pogData || auction.pog_data || null
                    };
                    io.emit('auction completed', completedAuction);
                    return;
                }

                // Build completed auction payload; parse stored pog_data JSON into an object when present
                let parsedPogData = null;
                try {
                    if (auction && auction.pogData) parsedPogData = auction.pogData;
                    else if (auction && typeof auction.pog_data === 'string' && auction.pog_data.trim() !== '') {
                        parsedPogData = JSON.parse(auction.pog_data);
                    }
                } catch (e) {
                    parsedPogData = null;
                }

                // completedAuction holds a canonical payload we'll emit after doing DB updates
                const completedAuction = Object.assign({}, auction, {
                    AuctionStatus: 'completed',
                    winner_id: winnerId,
                    winner_name: winnerName,
                    winner_pfp: winnerPfp,
                    winner_bid: finalBid,
                    pogData: parsedPogData
                });

                function findPogIndex(inv, pog) {
                    if (!Array.isArray(inv) || !pog) return -1;
                    const keys = ['id', 'uid', 'instanceId', 'uniqueId', 'serial'];
                    for (const k of keys) {
                        if (pog[k]) {
                            const idx = inv.findIndex(i => i && i[k] && String(i[k]) === String(pog[k]));
                            if (idx !== -1) return idx;
                        }
                    }
                    return inv.findIndex(i => i && i.name === pog.name);
                }

                // Build a safe descriptor for the pog to transfer based on the canonical auction.pog
                let pogToTransfer = { name: completedAuction.pog };

                if (completedAuction.pogData && typeof completedAuction.pogData === 'object') {
                    const clientPogName = completedAuction.pogData.name;
                    if (clientPogName && String(clientPogName) === String(completedAuction.pog)) {
                        // Only trust full pogData when its name matches the auction listing
                        pogToTransfer = Object.assign({}, completedAuction.pogData);
                    } else {
                        console.warn(
                            'Untrusted pogData detected: name does not match auction.pog; ignoring client-provided identifiers for transfer',
                            { auctionPog: completedAuction.pog, pogDataName: clientPogName }
                        );
                    }
                } else if (typeof completedAuction.pogData === 'string' && completedAuction.pogData.trim() !== '') {
                    // If pogData is a simple string, ensure it matches the canonical pog name
                    if (String(completedAuction.pogData) !== String(completedAuction.pog)) {
                        console.warn(
                            'Untrusted string pogData detected: value does not match auction.pog; ignoring for transfer',
                            { auctionPog: completedAuction.pog, pogData: completedAuction.pogData }
                        );
                    }
                    // When it matches, the default { name: completedAuction.pog } is already correct
                }
                function updateUserScore(userIdentifier, delta, cb) {
                    const isNumeric = (typeof userIdentifier === 'number') || (/^\d+$/.test(String(userIdentifier)));
                    if (isNumeric) {
                        usdb.run(`UPDATE userSettings SET score = COALESCE(score,0) + ? WHERE fid = ?`, [delta, Number(userIdentifier)], function(err) {
                            if (cb) cb(err, this.changes);
                        });
                    } else {
                        usdb.run(`UPDATE userSettings SET score = COALESCE(score,0) + ? WHERE displayname = ?`, [delta, String(userIdentifier)], function(err) {
                            if (cb) cb(err, this.changes);
                        });
                    }
                }

                getUserInventory(auction.user_id, (sErr, sellerInv) => {
                    if (sErr) {
                        console.error('Failed to load seller inventory for auction completion:', auction.user_id, sErr);
                        // Abort transfer for this auction completion to avoid overwriting inventory with an empty array
                        return;
                    }
                    sellerInv = Array.isArray(sellerInv) ? sellerInv : [];
                    let removedPog = null;
                    const idx = findPogIndex(sellerInv, pogToTransfer);
                    if (idx !== -1) {
                        removedPog = sellerInv.splice(idx, 1)[0];
                    } else {
                        // fallback remove first matching name
                        const byName = sellerInv.findIndex(i => i && i.name === completedAuction.pog);
                        if (byName !== -1) removedPog = sellerInv.splice(byName, 1)[0];
                    }

                    updateUserInventory(auction.user_id, sellerInv, (uErr) => {
                        if (uErr) console.error('Failed to update seller inventory after auction:', auction.user_id, uErr);

                        // credit seller with finalBid
                        updateUserScore(auction.user_id, Number(finalBid) || 0, (scoreErr) => {
                            if (scoreErr) console.error('Failed to credit seller score:', auction.user_id, scoreErr);

                            // 2) Add pog to winner inventory and debit winner score
                            getUserInventory(winnerId, (wErr, winnerInv) => {
                                winnerInv = Array.isArray(winnerInv) ? winnerInv : [];
                                let itemToAdd = removedPog || pogToTransfer || { name: completedAuction.pog };
                                // If itemToAdd is a JSON string (older rows), try to parse it into an object
                                if (typeof itemToAdd === 'string') {
                                    try {
                                        itemToAdd = JSON.parse(itemToAdd);
                                    } catch (e) {
                                        itemToAdd = { name: String(itemToAdd) };
                                    }
                                }

                                // Ensure minimal metadata so client-side income calculations don't produce NaN
                                const rarityMap = {
                                    Trash: { income: 2, color: 'red' },
                                    Common: { income: 7, color: 'yellow' },
                                    Uncommon: { income: 13, color: 'lime' },
                                    Mythic: { income: 20, color: 'fuchsia' },
                                    Unique: { income: 28, color: 'lightgray' }
                                };

                                try {
                                    if (!('income' in itemToAdd) || typeof itemToAdd.income !== 'number') {
                                        if (itemToAdd && itemToAdd.rarity && rarityMap[itemToAdd.rarity]) {
                                            itemToAdd.income = rarityMap[itemToAdd.rarity].income;
                                        } else {
                                            itemToAdd.income = 5; // safe default
                                        }
                                    }
                                    if (!('color' in itemToAdd) || !itemToAdd.color) {
                                        if (itemToAdd && itemToAdd.rarity && rarityMap[itemToAdd.rarity]) {
                                            itemToAdd.color = rarityMap[itemToAdd.rarity].color;
                                        }
                                    }
                                } catch (e) {
                                    // swallow and continue with defaults
                                    itemToAdd.income = itemToAdd.income || 5;
                                }

                                winnerInv.push(itemToAdd);
                                updateUserInventory(winnerId, winnerInv, (wUpErr) => {
                                    if (wUpErr) console.error('Failed to update winner inventory after auction:', winnerId, wUpErr);

                                    // debit winner
                                    updateUserScore(winnerId, -(Number(finalBid) || 0), (debitErr) => {
                                        if (debitErr) console.error('Failed to debit winner score:', winnerId, debitErr);

                                        // Attach snapshots for client reconciliation
                                        completedAuction.updatedSellerInventory = sellerInv;
                                        completedAuction.updatedWinnerInventory = winnerInv;

                                        // Fetch updated scores for both users (best-effort) and emit
                                        function getScore(identifier, cb) {
                                            const isNum = (typeof identifier === 'number') || (/^\d+$/.test(String(identifier)));
                                            if (isNum) {
                                                usdb.get(`SELECT score FROM userSettings WHERE fid = ?`, [Number(identifier)], (e, r) => {
                                                    if (e || !r) return cb(e || new Error('not found'));
                                                    return cb(null, r.score);
                                                });
                                            } else {
                                                usdb.get(`SELECT score FROM userSettings WHERE displayname = ?`, [String(identifier)], (e, r) => {
                                                    if (e || !r) return cb(e || new Error('not found'));
                                                    return cb(null, r.score);
                                                });
                                            }
                                        }

                                        getScore(auction.user_id, (gsErr, sellerScore) => {
                                            if (!gsErr) completedAuction.updatedSellerScore = sellerScore;
                                            getScore(winnerId, (gwErr, winnerScore) => {
                                                if (!gwErr) completedAuction.updatedWinnerScore = winnerScore;
                                                try {
                                                    console.log('Emitting auction completed payload for', winnerName, completedAuction.winner_bid);
                                                    // shallow log to avoid huge output
                                                    console.log('payload keys:', Object.keys(completedAuction));
                                                } catch (e) {}
                                                io.emit('auction completed', completedAuction);
                                                console.log(`Auction completed: ${winnerName} won ${auction.pog} for $${finalBid}`);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            }
        );
    }

    function updateUserInventory(userId, newInventory, callback) {
        const inventoryJson = JSON.stringify(newInventory);
        const isNumericId = (typeof userId === 'number') || (/^\d+$/.test(String(userId)));
        if (isNumericId) {
            usdb.run(`UPDATE userSettings SET inventory = ? WHERE fid = ?`, [inventoryJson, Number(userId)], function(err) {
                if (callback) callback(err, this.changes);
            });
        } else {
            usdb.run(`UPDATE userSettings SET inventory = ? WHERE displayname = ?`, [inventoryJson, String(userId)], function(err) {
                if (callback) callback(err, this.changes);
            });
        }
    }
    
    function getUserInventory(userId, callback) {
        const tryParseInventory = (row) => {
            if (!row) return null;
            try {
                return JSON.parse(row.inventory || '[]');
            } catch (e) {
                return null;
            }
        };

        usdb.get(`SELECT inventory FROM userSettings WHERE displayname = ?`, [userId], (err, row) => {
            if (err) return callback(err, null);
            const inv = tryParseInventory(row);
            if (inv !== null) return callback(null, inv);

            // If displayname lookup failed, and userId looks numeric, try fid column
            const isNumericId = (typeof userId === 'number') || (/^\d+$/.test(String(userId)));
            if (!isNumericId) {
                return callback(new Error('User not found'), null);
            }

            usdb.get(`SELECT inventory FROM userSettings WHERE fid = ?`, [Number(userId)], (err2, row2) => {
                if (err2) return callback(err2, null);
                const inv2 = tryParseInventory(row2);
                if (inv2 === null) return callback(new Error('User not found'), null);
                return callback(null, inv2);
            });
        });
    }

    io.on('connection', (socket) => {

    usdb.all('SELECT * FROM chat WHERE trade_type = ? AND trade_status = ? ORDER BY id DESC LIMIT 50', ['trade', 'pending'], (err, rows) => {
        if (!err && Array.isArray(rows)) {
            socket.emit('trade history', rows.reverse());
        }
    });

    //marketplace stuff

// Handle auction errors
socket.on('auction error', (error) => {
    console.error('Auction error:', error);
});

// Send existing auctions to connecting client
usdb.all('SELECT * FROM market WHERE AuctionStatus = ? ORDER BY createdAt DESC LIMIT 50', ['active'], (err, rows) => {
    if (!err && Array.isArray(rows)) {
        socket.emit('auction history', rows);
    }
});

// Handle auction creation
socket.on('create auction', (data) => {
    const sellerId = data.sellerId;
    const sellerName = data.sellerName;
    const sellerPfp = data.sellerPfp;
    const pogName = data.pogName;
    const startPrice = data.startPrice;
    const maxAcceptedBid = data.maxAcceptedBid;
    const minBidIncrement = data.minBidIncrement;
    const auctionTime = data.auctionTime;
    const createdAt = Date.now();

    // Validate that user owns the pog
    getUserInventory(sellerId, (err, inventory) => {
        if (err) {
            socket.emit('auction error', { message: 'Could not verify inventory' });
            return;
        }

        const hasPog = inventory.some(item => item.name === pogName && item.rarity !== "Unique");
        if (!hasPog) {
            socket.emit('auction error', { message: 'You do not own this pog or it cannot be auctioned' });
            return;
        }

        // Server-side validation of auction limits
        if (typeof startPrice !== 'number' || startPrice < AUCTION_LIMITS.MIN_START_PRICE) {
            socket.emit('auction error', { message: `Starting price must be at least $${AUCTION_LIMITS.MIN_START_PRICE}` });
            return;
        }
        if (typeof minBidIncrement !== 'number' || minBidIncrement < AUCTION_LIMITS.MIN_INCREMENT) {
            socket.emit('auction error', { message: `Minimum increment must be at least $${AUCTION_LIMITS.MIN_INCREMENT}` });
            return;
        }
        if (typeof auctionTime !== 'number' || auctionTime < AUCTION_LIMITS.MIN_DURATION_MINUTES || auctionTime > AUCTION_LIMITS.MAX_DURATION_MINUTES) {
            socket.emit('auction error', { message: `Auction duration must be between ${AUCTION_LIMITS.MIN_DURATION_MINUTES} and ${AUCTION_LIMITS.MAX_DURATION_MINUTES} minutes` });
            return;
        }
        if (typeof maxAcceptedBid !== 'number' || maxAcceptedBid <= startPrice) {
            socket.emit('auction error', { message: 'Buy It Now price must be greater than starting price' });
            return;
        }
        if (maxAcceptedBid > AUCTION_LIMITS.MAX_BUY_NOW_PRICE) {
            socket.emit('auction error', { message: `Buy It Now price cannot exceed $${AUCTION_LIMITS.MAX_BUY_NOW_PRICE}` });
            return;
        }

        // Create auction in database (store pog_data JSON when provided)
        const pogJson = data && data.pogData ? JSON.stringify(data.pogData) : null;
        usdb.run(`INSERT INTO market (user_id, name, pfp, pog, startPrice, maxAcceptedBid, minBidIncrement, createdAt, AuctionTime, AuctionStatus, pog_data) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sellerId, sellerName, sellerPfp, pogName, startPrice, maxAcceptedBid, minBidIncrement, createdAt, auctionTime, 'active', pogJson],
            function(err) {
                if (err) {
                    console.error('Error creating auction:', err);
                    socket.emit('auction error', { message: 'Failed to create auction' });
                    return;
                }

                const newAuction = {
                    user_id: sellerId,
                    name: sellerName,
                    pfp: sellerPfp,
                    pog: pogName,
                    pogData: data && data.pogData ? data.pogData : null,
                    startPrice: startPrice,
                    maxAcceptedBid: maxAcceptedBid,
                    minBidIncrement: minBidIncrement,
                    createdAt: createdAt,
                    AuctionTime: auctionTime,
                    AuctionStatus: 'active',
                    winner_id: null,
                    winner_name: null,
                    winner_pfp: null,
                    winner_bid: null,
                    bid_history: '[]'
                };

                // Broadcast new auction to all clients
                io.emit('auction created', newAuction);
                console.log(`Auction created: ${sellerName} auctioning ${pogName}`);
            }
        );
    });
});

// Handle bid placement
socket.on('place bid', (data) => {
    const sellerId = data.sellerId;
    const pogName = data.pogName;
    const bidAmount = data.bidAmount;
    const bidderName = data.bidderName;
    const bidderPfp = data.bidderPfp;
    const bidderId = data.bidderId;

    // Get current auction
    usdb.get('SELECT * FROM market WHERE user_id = ? AND pog = ? AND AuctionStatus = ?', 
        [sellerId, pogName, 'active'], (err, auction) => {
            if (err || !auction) {
                socket.emit('bid error', { message: 'Auction not found or no longer active' });
                return;
            }

            // Check if auction has expired
            const endTime = auction.createdAt + (auction.AuctionTime * 60 * 1000);
            if (Date.now() > endTime) {
                socket.emit('bid error', { message: 'This auction has expired' });
                return;
            }

            // Validate bid amount
            const currentBid = auction.winner_bid || auction.startPrice;
            const minimumBid = currentBid + auction.minBidIncrement;
            
            if (bidAmount < minimumBid) {
                socket.emit('bid error', { message: `Bid must be at least $${minimumBid}` });
                return;
            }

            // Check if this is a "Buy It Now" bid
            if (bidAmount >= auction.maxAcceptedBid) {
                // Prevent seller from buying their own auction via bid
                if (String(bidderId) === String(auction.user_id)) {
                    socket.emit('bid error', { message: 'You cannot buy your own auction' });
                    return;
                }

                // Complete auction immediately
                completeAuction(auction, bidderId, bidderName, bidderPfp, auction.maxAcceptedBid);
                return;
            }

            // Prevent seller from bidding on their own auction
            if (String(bidderId) === String(auction.user_id)) {
                socket.emit('bid error', { message: 'You cannot bid on your own auction' });
                return;
            }

            // Update auction with new bid
            const bidHistory = JSON.parse(auction.bid_history || '[]');
            bidHistory.push({
                bidder: bidderName,
                amount: bidAmount,
                time: Date.now()
            });

            usdb.run(`UPDATE market SET winner_id = ?, winner_name = ?, winner_pfp = ?, winner_bid = ?, bid_history = ? 
                      WHERE user_id = ? AND pog = ?`,
                [bidderId, bidderName, bidderPfp, bidAmount, JSON.stringify(bidHistory), sellerId, pogName],
                function(err) {
                    if (err) {
                        console.error('Error updating bid:', err);
                        socket.emit('bid error', { message: 'Failed to place bid' });
                        return;
                    }

                    // Get updated auction and broadcast
                    usdb.get('SELECT * FROM market WHERE user_id = ? AND pog = ?', [sellerId, pogName], (err, updatedAuction) => {
                        if (!err && updatedAuction) {
                            io.emit('bid placed', updatedAuction);
                            console.log(`Bid placed: ${bidderName} bid $${bidAmount} on ${pogName}`);
                        }
                    });
                }
            );
        }
    );
});

// Handle "Buy It Now"
socket.on('buy it now', (data) => {
    const sellerId = data.sellerId;
    const pogName = data.pogName;
    const price = data.price;
    const buyerName = data.buyerName;
    const buyerPfp = data.buyerPfp;
    const buyerId = data.buyerId;

    // Get current auction
    usdb.get('SELECT * FROM market WHERE user_id = ? AND pog = ? AND AuctionStatus = ?', 
        [sellerId, pogName, 'active'], (err, auction) => {
            if (err || !auction) {
                socket.emit('buy error', { message: 'Auction not found or no longer active' });
                return;
            }

            // Check if auction has expired
            const endTime = auction.createdAt + (auction.AuctionTime * 60 * 1000);
            if (Date.now() > endTime) {
                socket.emit('buy error', { message: 'This auction has expired' });
                return;
            }

            // Verify price matches maxAcceptedBid
            if (price !== auction.maxAcceptedBid) {
                socket.emit('buy error', { message: 'Invalid buy it now price' });
                return;
            }

            // Complete auction
            // Prevent seller from buying their own auction
            if (String(buyerId) === String(auction.user_id)) {
                socket.emit('buy error', { message: 'You cannot buy your own auction' });
                return;
            }

            completeAuction(auction, buyerId, buyerName, buyerPfp, price);
        }
    );
});


    // Handle new trade offers
    socket.on('trade offer', (data) => {
        const name = data && data.name ? String(data.name).slice(0, 100) : 'Anonymous';
        const pfp = data && data.pfp ? String(data.pfp) : null;
        const userId = data && data.userId ? String(data.userId).slice(0, 100) : null;
        const givingItem = data && data.giving_item_name ? String(data.giving_item_name).slice(0, 200) : '';
        const receivingItem = data && data.receiving_item_name ? String(data.receiving_item_name).slice(0, 200) : '';
        const message = data && data.message ? String(data.message).slice(0, 2000) : '';
        const time = Date.now();

        // Validate trade offer
        if (!givingItem || !receivingItem) {
            socket.emit('trade error', { message: 'Invalid trade offer' });
            return;
        }

        // Validate that user owns the item they're offering
        getUserInventory(userId, (err, inventory) => {
            if (err) {
                socket.emit('trade error', { message: 'Could not verify inventory' });
                return;
            }

            const hasItem = inventory.some(item => item.name === givingItem && item.rarity !== "Unique");
            if (!hasItem) {
                socket.emit('trade error', { message: 'You do not own this item or it cannot be traded' });
                return;
            }

            // Save trade to database
            usdb.run(`INSERT INTO chat (trade_type, name, msg, time, pfp, userId, giving_item_name, receiving_item_name, trade_status) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['trade', name, message, time, pfp, userId, givingItem, receivingItem, 'pending'], 
                function (err) {
                    if (err) {
                        console.error('Error saving trade offer:', err);
                        socket.emit('trade error', { message: 'Failed to save trade' });
                        return;
                    }
                    
                    const savedTrade = { 
                        id: this.lastID, 
                        trade_type: 'trade',
                        name, 
                        msg: message, 
                        time, 
                        pfp, 
                        userId,
                        giving_item_name: givingItem,
                        receiving_item_name: receivingItem,
                        trade_status: 'pending'
                    };
                    
                    // Broadcast trade to all clients
                    io.emit('trade offer', savedTrade);
                    console.log(`Trade posted: ${name} offering ${givingItem} for ${receivingItem}`);
                }
            );
        });
    });

    // Handle trade acceptance
    socket.on('accept trade', (data) => {
        const tradeId = data.tradeId;
        const accepterName = data.accepter_name;
        const accepterUserId = data.accepter_userId;
        
        // First, get the trade details
        usdb.get('SELECT * FROM chat WHERE id = ? AND trade_status = ?', [tradeId, 'pending'], (err, trade) => {
            if (err || !trade) {
                socket.emit('trade error', { message: 'Trade not found or already completed' });
                return;
            }

            // Validate that accepter has the requested item
            getUserInventory(accepterUserId, (err, accepterInventory) => {
                if (err) {
                    socket.emit('trade error', { message: 'Could not verify your inventory' });
                    return;
                }

                const hasRequestedItem = accepterInventory.some(item => 
                    item.name === trade.receiving_item_name && item.rarity !== "Unique"
                );

                if (!hasRequestedItem) {
                    socket.emit('trade error', { message: 'You do not own the requested item' });
                    return;
                }

                // Get trader's inventory
                getUserInventory(trade.userId, (err, traderInventory) => {
                    if (err) {
                        socket.emit('trade error', { message: 'Could not verify trader inventory' });
                        return;
                    }

                    // Validate trader still has the offered item
                    const traderHasItem = traderInventory.some(item => 
                        item.name === trade.giving_item_name && item.rarity !== "Unique"
                    );

                    if (!traderHasItem) {
                        socket.emit('trade error', { message: 'Trader no longer has the offered item' });
                        return;
                    }

                    // Perform the trade - update inventories
                    // Remove offered item from trader, add requested item to trader
                    const traderItemIndex = traderInventory.findIndex(item => item.name === trade.giving_item_name);
                    const offeredItem = traderInventory[traderItemIndex];
                    traderInventory.splice(traderItemIndex, 1);

                    const accepterItemIndex = accepterInventory.findIndex(item => item.name === trade.receiving_item_name);
                    let requestedItem = accepterInventory[accepterItemIndex];
                    // Ensure transferred items carry pog metadata to avoid NaN income
                    requestedItem = ensurePogMetadata(requestedItem);
                    traderInventory.push(requestedItem);

                    // Remove requested item from accepter, add offered item to accepter
                    accepterInventory.splice(accepterItemIndex, 1);
                    let offeredToAdd = ensurePogMetadata(offeredItem);
                    accepterInventory.push(offeredToAdd);

                    // Update both inventories in database
                    updateUserInventory(trade.userId, traderInventory, (err) => {
                        if (err) {
                            socket.emit('trade error', { message: 'Failed to update trader inventory' });
                            return;
                        }

                        updateUserInventory(accepterUserId, accepterInventory, (err) => {
                            if (err) {
                                socket.emit('trade error', { message: 'Failed to update accepter inventory' });
                                return;
                            }

                            // Update trade status to completed
                            usdb.run(`UPDATE chat SET trade_status = ?, accepter_name = ?, accepter_userId = ? WHERE id = ?`,
                                ['completed', accepterName, accepterUserId, tradeId], (err) => {
                                    if (err) {
                                        console.error('Error updating trade status:', err);
                                        socket.emit('trade error', { message: 'Failed to complete trade' });
                                        return;
                                    }

                                    // build payload with updated inventories so clients can update without refetch
                                    const payload = {
                                        tradeId,
                                        traderUserId: trade.userId,
                                        accepterUserId,
                                        giving_item_name: trade.giving_item_name,
                                        receiving_item_name: trade.receiving_item_name,
                                        updatedTraderInventory: traderInventory,
                                        updatedAccepterInventory: accepterInventory
                                    };

                                    // Notify all clients (clients will apply update only if it matches their user)
                                    io.emit('trade completed', payload);
                                    
                                    // Notify the accepter socket with their updated inventory (ack)
                                    socket.emit('trade accepted', { 
                                        success: true, 
                                        message: 'Trade completed successfully!',
                                        received_item: trade.giving_item_name,
                                        updatedInventory: accepterInventory
                                    });

                                    console.log(`Trade ${tradeId} completed: ${accepterName} accepted ${trade.name}'s trade`);
                                    console.log(`${trade.name} gave ${trade.giving_item_name}, received ${trade.receiving_item_name}`);
                                    console.log(`${accepterName} gave ${trade.receiving_item_name}, received ${trade.giving_item_name}`);
                                });
                        });
                    });
                });
            });
        });
    });
});
};