// Algoritma Levenshtein Distance - hitung kemiripan dua string
function levenshtein(a, b) {
	const m = a.length, n = b.length;
	const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			dp[i][j] = a[i - 1] === b[j - 1]
				? dp[i - 1][j - 1]
				: 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
		}
	}
	return dp[m][n];
}

function similarity(a, b) {
	const maxLen = Math.max(a.length, b.length);
	if (maxLen === 0) return 100;
	return Math.round((1 - levenshtein(a, b) / maxLen) * 100);
}

let handler = (m) => m;

handler.before = async function (m) {
	if (!m.text) return;

	const prefix = /^[°•π÷×¶∆£¢€¥®™✓_=|~!?@#$%^&.+-/\\©^]/i;
	if (!prefix.test(m.text)) return;

	const usedPrefix = m.text[0];
	const command = m.text.slice(1).trim().split(' ')[0].toLowerCase();
	if (!command) return;

	// Kumpulkan semua command yang terdaftar dari semua plugin
	const allCommands = [];
	for (const plugin of Object.values(global.plugins || {})) {
		if (!plugin?.command) continue;
		if (plugin.command instanceof RegExp) {
			// Ambil semua alternatif dari regex seperti /^(sholat|jadwalsholat)$/i
			const src = plugin.command.source.replace(/^\^?\(?|\)?\$?$/g, '');
			const cmds = src.split('|').map(c => c.replace(/[^a-z0-9]/gi, '').toLowerCase()).filter(Boolean);
			allCommands.push(...cmds);
		} else if (Array.isArray(plugin.command)) {
			for (const c of plugin.command) {
				if (typeof c === 'string') allCommands.push(c.toLowerCase());
			}
		} else if (typeof plugin.command === 'string') {
			allCommands.push(plugin.command.toLowerCase());
		}
	}

	// Cek apakah command sudah valid (ketemu di plugin manapun)
	const isValid = allCommands.some(c => c === command);
	if (isValid) return;

	// Cari command yang paling mirip
	const MIN_SIMILARITY = 60; // minimal 60% mirip baru disarankan
	let bestMatch = null;
	let bestScore = 0;

	for (const cmd of [...new Set(allCommands)]) {
		const score = similarity(command, cmd);
		if (score > bestScore) {
			bestScore = score;
			bestMatch = cmd;
		}
	}

	if (bestMatch && bestScore >= MIN_SIMILARITY) {
		m.reply(`❓ Command *${usedPrefix}${command}* tidak ditemukan.\n\n💡 Maksud kamu *${usedPrefix}${bestMatch}*? _(kemiripan: ${bestScore}%)_`);
	}
};

export default handler;