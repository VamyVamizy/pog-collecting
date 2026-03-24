// Safely parse server-rendered JSON placed into #userdata. Some sessions render
// an empty string or undefined which would cause JSON.parse to throw.
function safeParseElement(id, fallback) {
	const el = document.getElementById(id);
	if (!el) return fallback || {};
	let txt = (el.textContent || el.innerText || '').trim();
	if (!txt) return fallback || {};
	try {
		return JSON.parse(txt);
	} catch (e) {
		console.warn('patch.js: failed to parse #'+id, e, txt);
		return fallback || {};
	}
}

var userdata = safeParseElement('userdata', {});