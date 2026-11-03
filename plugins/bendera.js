// ==============================
// TEBAK BENDERA - Tanpa Fetch
// Dataset bendera disimpan langsung di kode (emoji bendera Unicode),
// jadi gak butuh akses internet/scraping sama sekali.
// ==============================

const sesiAktif = {};
const TIMEOUT_MS = 2 * 60 * 1000;

// Ubah kode negara ISO 3166-1 alpha-2 (mis. "ID") jadi emoji bendera.
// Trik: tiap huruf A-Z punya pasangan "Regional Indicator Symbol" di
// Unicode dengan offset konstan (+127397) dari kode ASCII huruf kapitalnya.
// Gabungan 2 huruf itu dirender WhatsApp sebagai emoji benderanya langsung.
function flagEmoji(code) {
	return code
		.toUpperCase()
		.replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

// Dataset negara. "jawaban" isinya semua variasi jawaban yang diterima
// (nama Indonesia, nama Inggris, singkatan umum) biar gak kaku-kaku amat.
// Tambah/kurangin sesuka hati — gak ada ketergantungan ke mana pun.
const NEGARA = [
	{ code: 'ID', jawaban: ['INDONESIA'] },
	{ code: 'MY', jawaban: ['MALAYSIA'] },
	{ code: 'SG', jawaban: ['SINGAPURA', 'SINGAPORE'] },
	{ code: 'TH', jawaban: ['THAILAND'] },
	{ code: 'VN', jawaban: ['VIETNAM'] },
	{ code: 'PH', jawaban: ['FILIPINA', 'PHILIPPINES'] },
	{ code: 'JP', jawaban: ['JEPANG', 'JAPAN'] },
	{ code: 'KR', jawaban: ['KOREA SELATAN', 'KOREA', 'SOUTH KOREA'] },
	{ code: 'KP', jawaban: ['KOREA UTARA', 'NORTH KOREA'] },
	{ code: 'CN', jawaban: ['CHINA', 'TIONGKOK', 'TIONGHOA'] },
	{ code: 'IN', jawaban: ['INDIA'] },
	{ code: 'PK', jawaban: ['PAKISTAN'] },
	{ code: 'BD', jawaban: ['BANGLADESH'] },
	{ code: 'LK', jawaban: ['SRI LANKA'] },
	{ code: 'MM', jawaban: ['MYANMAR', 'BURMA'] },
	{ code: 'KH', jawaban: ['KAMBOJA', 'CAMBODIA'] },
	{ code: 'LA', jawaban: ['LAOS'] },
	{ code: 'BN', jawaban: ['BRUNEI', 'BRUNEI DARUSSALAM'] },
	{ code: 'MN', jawaban: ['MONGOLIA'] },
	{ code: 'NP', jawaban: ['NEPAL'] },
	{ code: 'BT', jawaban: ['BHUTAN'] },
	{ code: 'SA', jawaban: ['ARAB SAUDI', 'SAUDI ARABIA'] },
	{ code: 'AE', jawaban: ['UNI EMIRAT ARAB', 'UEA', 'UAE'] },
	{ code: 'QA', jawaban: ['QATAR'] },
	{ code: 'KW', jawaban: ['KUWAIT'] },
	{ code: 'JO', jawaban: ['YORDANIA', 'JORDAN'] },
	{ code: 'IL', jawaban: ['ISRAEL'] },
	{ code: 'TR', jawaban: ['TURKI', 'TURKEY', 'TURKIYE'] },
	{ code: 'IR', jawaban: ['IRAN'] },
	{ code: 'IQ', jawaban: ['IRAK', 'IRAQ'] },
	{ code: 'AF', jawaban: ['AFGHANISTAN'] },
	{ code: 'YE', jawaban: ['YAMAN', 'YEMEN'] },
	{ code: 'OM', jawaban: ['OMAN'] },
	{ code: 'BH', jawaban: ['BAHRAIN'] },
	{ code: 'LB', jawaban: ['LEBANON'] },
	{ code: 'SY', jawaban: ['SURIAH', 'SYRIA'] },
	{ code: 'GB', jawaban: ['INGGRIS', 'UNITED KINGDOM', 'UK', 'BRITANIA RAYA'] },
	{ code: 'FR', jawaban: ['PRANCIS', 'PERANCIS', 'FRANCE'] },
	{ code: 'DE', jawaban: ['JERMAN', 'GERMANY'] },
	{ code: 'IT', jawaban: ['ITALIA', 'ITALY'] },
	{ code: 'ES', jawaban: ['SPANYOL', 'SPAIN'] },
	{ code: 'PT', jawaban: ['PORTUGAL'] },
	{ code: 'NL', jawaban: ['BELANDA', 'NETHERLANDS', 'HOLLAND'] },
	{ code: 'BE', jawaban: ['BELGIA', 'BELGIUM'] },
	{ code: 'CH', jawaban: ['SWISS', 'SWITZERLAND'] },
	{ code: 'AT', jawaban: ['AUSTRIA'] },
	{ code: 'SE', jawaban: ['SWEDIA', 'SWEDEN'] },
	{ code: 'NO', jawaban: ['NORWEGIA', 'NORWAY'] },
	{ code: 'DK', jawaban: ['DENMARK'] },
	{ code: 'FI', jawaban: ['FINLANDIA', 'FINLAND'] },
	{ code: 'PL', jawaban: ['POLANDIA', 'POLAND'] },
	{ code: 'RU', jawaban: ['RUSIA', 'RUSSIA'] },
	{ code: 'UA', jawaban: ['UKRAINA', 'UKRAINE'] },
	{ code: 'GR', jawaban: ['YUNANI', 'GREECE'] },
	{ code: 'IE', jawaban: ['IRLANDIA', 'IRELAND'] },
	{ code: 'IS', jawaban: ['ISLANDIA', 'ICELAND'] },
	{ code: 'CZ', jawaban: ['CEKO', 'CZECH', 'CZECH REPUBLIC'] },
	{ code: 'HU', jawaban: ['HUNGARIA', 'HUNGARY'] },
	{ code: 'RO', jawaban: ['ROMANIA', 'RUMANIA'] },
	{ code: 'HR', jawaban: ['KROASIA', 'CROATIA'] },
	{ code: 'RS', jawaban: ['SERBIA'] },
	{ code: 'EG', jawaban: ['MESIR', 'EGYPT'] },
	{ code: 'ZA', jawaban: ['AFRIKA SELATAN', 'SOUTH AFRICA'] },
	{ code: 'NG', jawaban: ['NIGERIA'] },
	{ code: 'KE', jawaban: ['KENYA'] },
	{ code: 'MA', jawaban: ['MAROKO', 'MOROCCO'] },
	{ code: 'DZ', jawaban: ['ALJAZAIR', 'ALGERIA'] },
	{ code: 'TN', jawaban: ['TUNISIA'] },
	{ code: 'ET', jawaban: ['ETHIOPIA'] },
	{ code: 'GH', jawaban: ['GHANA'] },
	{ code: 'TZ', jawaban: ['TANZANIA'] },
	{ code: 'ZW', jawaban: ['ZIMBABWE'] },
	{ code: 'LY', jawaban: ['LIBYA'] },
	{ code: 'US', jawaban: ['AMERIKA SERIKAT', 'AMERIKA', 'USA', 'US'] },
	{ code: 'CA', jawaban: ['KANADA', 'CANADA'] },
	{ code: 'MX', jawaban: ['MEKSIKO', 'MEXICO'] },
	{ code: 'BR', jawaban: ['BRASIL', 'BRAZIL'] },
	{ code: 'AR', jawaban: ['ARGENTINA'] },
	{ code: 'CL', jawaban: ['CHILE'] },
	{ code: 'CO', jawaban: ['KOLOMBIA', 'COLOMBIA'] },
	{ code: 'PE', jawaban: ['PERU'] },
	{ code: 'VE', jawaban: ['VENEZUELA'] },
	{ code: 'CU', jawaban: ['KUBA', 'CUBA'] },
	{ code: 'EC', jawaban: ['EKUADOR', 'ECUADOR'] },
	{ code: 'BO', jawaban: ['BOLIVIA'] },
	{ code: 'UY', jawaban: ['URUGUAY'] },
	{ code: 'PY', jawaban: ['PARAGUAY'] },
	{ code: 'AU', jawaban: ['AUSTRALIA'] },
	{ code: 'NZ', jawaban: ['SELANDIA BARU', 'NEW ZEALAND'] },
	{ code: 'FJ', jawaban: ['FIJI'] },
	{ code: 'PG', jawaban: ['PAPUA NUGINI', 'PAPUA NEW GUINEA'] },
];

let handler = async (m, { usedPrefix, command, conn }) => {
	const chatId = m.chat;

	// ── .nyerah / .nyerahbendera ──────
	if (command === 'nyerahbendera') {
		const sesi = sesiAktif[chatId];
		if (!sesi) {
			// "nyerah" itu kata umum yang mungkin juga dipakai plugin game lain
			// (mis. tebak gambar) di chat yang sama — diem aja kalau bukan sesi
			// tebak bendera yang lagi aktif, biar gak nimbrung balesan plugin
			// lain / muncul "tidak ada soal" dobel.
			if (command === 'nyerahbendera') {
				return m.reply('❌ Tidak ada soal tebak bendera yang sedang aktif.');
			}
			return;
		}
		clearTimeout(sesi.timeout);
		delete sesiAktif[chatId];
		return m.reply(
			`🏳️ *Nyerah deh...*\n\n` +
			`📝 Jawaban yang benar:\n*${sesi.jawabanUtama}*\n\n` +
			`_Ketik ${usedPrefix}tebakbendera untuk soal baru!_`
		);
	}

	// ── .tebakbendera ─────────────────
	if (sesiAktif[chatId]) {
		return m.reply(
			`⚠️ Masih ada soal yang belum dijawab!\n` +
			`Jawab dulu atau ketik *${usedPrefix}nyerahbendera* buat menyerah.`
		);
	}

	const soal = NEGARA[Math.floor(Math.random() * NEGARA.length)];
	const flag = flagEmoji(soal.code);

	const teks =
		`🏳️ *TEBAK BENDERA*\n` +
		`━━━━━━━━━━━━━━━━━━━━\n\n` +
		`${flag}\n\n` +
		`Bendera negara apakah ini?\n\n` +
		`⏰ Waktu: *2 menit*\n` +
		`💬 Ketik jawaban kamu (reply pesan ini)!\n` +
		`🏳️ Ketik *${usedPrefix}nyerahbendera* kalau menyerah`;

	const sentMsg = await conn.sendMessage(chatId, { text: teks }, { quoted: m });
	// ID pesan soal ini dipakai buat mastiin jawaban cuma diterima kalau
	// reply ke pesan soal ini, bukan chat bebas yang kebetulan kena nama negara.
	const soalMsgId = sentMsg?.key?.id || sentMsg?.id || null;

	const timeoutId = setTimeout(async () => {
		if (!sesiAktif[chatId]) return;
		const jawabanUtama = sesiAktif[chatId].jawabanUtama;
		delete sesiAktif[chatId];
		try {
			await conn.sendMessage(chatId, {
				text:
					`⏰ *Waktu habis!*\n\n` +
					`Jawaban yang benar:\n*${jawabanUtama}*\n\n` +
					`_Ketik ${usedPrefix}tebakbendera untuk soal baru!_`
			});
		} catch {}
	}, TIMEOUT_MS);

	sesiAktif[chatId] = {
		jawabanList: soal.jawaban,      // semua variasi jawaban yang diterima
		jawabanUtama: soal.jawaban[0],  // versi yang ditampilin ke user
		timeout: timeoutId,
		prefix: usedPrefix,
		soalMsgId,
	};
};

// ── Listener jawaban ─────────────
handler.before = async (m) => {
	const chatId = m.chat;
	if (!sesiAktif[chatId]) return;
	if (!m.text?.trim()) return;
	if (m.isBaileys && m.message?.protocolMessage) return;
	if (/^\.\w+/.test(m.text.trim())) return;

	const sesi = sesiAktif[chatId];

	// Wajib reply langsung ke pesan soalnya, bukan asal chat di grup yang
	// kebetulan nyebut nama negaranya.
	const quotedId = m.quoted?.id || m.quoted?.key?.id || null;
	if (!sesi.soalMsgId || quotedId !== sesi.soalMsgId) return;

	const norm = s => s.replace(/\s+/g, ' ').trim().toUpperCase();
	const input = norm(m.text);

	if (sesi.jawabanList.some(j => norm(j) === input)) {
		clearTimeout(sesi.timeout);
		delete sesiAktif[chatId];
		await conn.sendMessage(chatId, {
			text:
				`✅ *BENAR!* 🎉\n\n` +
				`👤 @${m.sender.split('@')[0]} berhasil menjawab!\n` +
				`💬 Jawaban: *${sesi.jawabanUtama}*\n\n` +
				`_Ketik ${sesi.prefix}tebakbendera untuk soal berikutnya!_`,
			mentions: [m.sender]
		}, { quoted: m });
	}
};

handler.help = ['tebakbendera', 'nyerahbendera'];
handler.tags = ['fun'];
handler.command = /^(tebakbendera|nyerahbendera)$/i;

export default handler;