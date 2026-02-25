module.exports = function(app) {
	const banned = require('../modules/backend_js/tb_declar/banned_list');

	function isAdminReq(req) {
		const u = req.session && req.session.user;
		if (!u) return false;
		const fid = Number(u.fid || u.userid || 0);
		return fid === 73 || fid === 87;
	}

	// POST /admin/ban
	app.post('/admin/ban', (req, res) => {
		if (!isAdminReq(req)) return res.status(403).json({ ok: false, error: 'forbidden' });

		const { fid, name } = req.body || {};
		if (!fid && !name) return res.status(400).json({ ok: false, error: 'missing fid or name' });

		const userObj = {};
		if (fid) userObj.fid = Number(fid);
		if (name) userObj.name = String(name);

		try {
			banned.addBannedUser(userObj);
			const adminName = req.session.user && (req.session.user.displayName || req.session.user.displayname);
			console.log(`User banned by ${adminName || 'unknown'}:`, userObj);
			return res.json({ ok: true });
		} catch (err) {
			console.error('Failed to ban user:', err);
			return res.status(500).json({ ok: false, error: 'server_error' });
		}
	});
};

