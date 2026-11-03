import axios from 'axios';

const BMKG = {
	terbaru:   'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',
	terkini:   'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json',
	dirasakan: 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json',
	shakemap:  'https://data.bmkg.go.id/DataMKG/TEWS/',
};

function skalaMMI(mag) {
	if (mag < 2.0) return 'I — Tidak Terasa';
	if (mag < 3.0) return 'II — Sedikit Terasa';
	if (mag < 4.0) return 'III — Lemah';
	if (mag < 5.0) return 'IV — Sedang';
	if (mag < 6.0) return 'V — Kuat';
	if (mag < 7.0) return 'VI — Sangat Kuat';
	if (mag < 7.5) return 'VII — Merusak';
	if (mag < 8.0) return 'VIII — Sangat Merusak';
	return 'IX+ — Bencana';
}

function emojiMag(mag) {
	if (mag < 3.0) return '🟢';
	if (mag < 5.0) return '🟡';
	if (mag < 6.0) return '🟠';
	if (mag < 7.0) return '🔴';
	return '🚨';
}

function potensiTsunami(potensi) {
	if (!potensi || /tidak/i.test(potensi)) return '✅ Tidak Berpotensi Tsunami';
	return `⚠️ ${potensi}`;
}

let handler = async (m, { args }) => {
	let sub = (args[0] || '').toLowerCase();

	// ── .gempa dirasakan ──
	if (sub === 'dirasakan') {
		m.react('⏳');
		try {
			let { data } = await axios.get(BMKG.dirasakan, { timeout: 10000 });
			let list = data.Infogempa.gempa.slice(0, 5);

			let teks = `😨 *GEMPA DIRASAKAN — BMKG*\n${'─'.repeat(28)}\n`;
			list.forEach((g, i) => {
				teks +=
`\n*${i + 1}. ${emojiMag(parseFloat(g.Magnitude))} M${g.Magnitude}*
📅 ${g.Tanggal} ${g.Jam}
📍 ${g.Wilayah}
🔽 Kedalaman  : ${g.Kedalaman}
📐 Koordinat  : ${g.Lintang}, ${g.Bujur}
💬 Dirasakan  : ${g.Dirasakan || '-'}
🌊 Tsunami    : ${potensiTsunami(g.Potensi)}
`;
			});
			teks += `${'─'.repeat(28)}\n_⚡ Sumber: BMKG_`;

			m.react('✅');
			return m.reply(teks);
		} catch (e) {
			m.react('❌');
			throw 'Gagal mengambil data gempa dirasakan dari BMKG!';
		}
	}

	// ── .gempa terkini ──
	if (sub === 'terkini') {
		m.react('⏳');
		try {
			let { data } = await axios.get(BMKG.terkini, { timeout: 10000 });
			let list = data.Infogempa.gempa.slice(0, 10);

			let teks = `📋 *10 GEMPA TERKINI — BMKG*\n${'─'.repeat(28)}\n`;
			list.forEach((g, i) => {
				let mag = parseFloat(g.Magnitude);
				teks += `${emojiMag(mag)} *${i + 1}.* M${g.Magnitude} | ${g.Tanggal} ${g.Jam}\n📍 ${g.Wilayah}\n\n`;
			});
			teks += `${'─'.repeat(28)}\n_⚡ Sumber: BMKG_`;

			m.react('✅');
			return m.reply(teks);
		} catch (e) {
			m.react('❌');
			throw 'Gagal mengambil data gempa terkini dari BMKG!';
		}
	}

	// ── .gempa (terbaru) ──
	m.react('⏳');
	try {
		let { data } = await axios.get(BMKG.terbaru, { timeout: 10000 });
		let g = data.Infogempa.gempa;
		let mag = parseFloat(g.Magnitude);

		let teks =
`${emojiMag(mag)} *GEMPA BUMI TERBARU — BMKG*
${'─'.repeat(25)}
📅 *Tanggal*    : ${g.Tanggal}
🕐 *Waktu*      : ${g.Jam} WIB
${'─'.repeat(25)}
💥 *Magnitudo*  : M ${g.Magnitude}
🔽 *Kedalaman*  : ${g.Kedalaman}
📐 *Koordinat*  : ${g.Lintang}, ${g.Bujur}
📍 *Wilayah*    : ${g.Wilayah}
${'─'.repeat(25)}
📊 *Skala MMI*  : ${skalaMMI(mag)}
🌊 *Tsunami*    : ${potensiTsunami(g.Potensi)}
${'─'.repeat(25)}
_⚡ Sumber: BMKG (data.bmkg.go.id)_`;

		m.react('✅');

		// Kirim shakemap kalau ada, kalau tidak plain text
		if (g.Shakemap) {
			await conn.sendMessage(m.chat, {
				image: { url: BMKG.shakemap + g.Shakemap },
				caption: teks,
			}, { quoted: m });
		} else {
			m.reply(teks);
		}

	} catch (e) {
		m.react('❌');
		throw 'Gagal mengambil data gempa dari BMKG! Coba beberapa saat lagi.';
	}
};

handler.help = ['gempa', 'gempa terkini', 'gempa dirasakan'];
handler.tags = ['tools'];
handler.command = /^gempa$/i;

export default handler;