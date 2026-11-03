// Semoga mendapatkan pahala jariah 🤲
import axios from 'axios';
import { toPTT } from '../lib/converter.js';

// API: alquran.cloud — open source, ga perlu API key
const BASE = 'https://api.alquran.cloud/v1';
const QARI = 'ar.alafasy'; // Mishary Rashid Alafasy

let handler = async (m, { conn, text, usedPrefix, command }) => {
	// Kalau ga ada nomor surah, kirim list
	if (!text) {
		m.react('⏳');
		try {
			let { data } = await axios.get(`${BASE}/surah`);
			let list = data.data.map(s =>
				`${String(s.number).padStart(3, ' ')}. ${s.englishName} (${s.name}) — ${s.numberOfAyahs} ayat`
			).join('\n');
			m.react('✅');
			return conn.sendMessage(m.chat, {
				text: `📖 *List Surah Al-Qur'an*\n\nCara Pakai: *${usedPrefix + command} [Nomor Surah]*\nContoh: *${usedPrefix + command} 1*\n\n${list}`,
			}, { quoted: m });
		} catch (e) {
			m.react('❌');
			throw 'Gagal mengambil list surah, coba lagi nanti!';
		}
	}

	let nomor = parseInt(text.trim());
	if (isNaN(nomor) || nomor < 1 || nomor > 114)
		throw `Nomor surah tidak valid! Masukkan angka 1–114\nContoh: *${usedPrefix + command} 1*`;

	m.react('⏳');

	try {
		// Ambil info surah
		let { data } = await axios.get(`${BASE}/surah/${nomor}/id.indonesian`);
		let info = data.data;

		let revelasi = info.revelationType === 'Meccan' ? 'Makkiyah (Meccan)' : 'Madaniyah (Medinan)';

		let teks =
`🕌 *MUROTAL AL-QUR'AN*
${'─'.repeat(28)}
📖 *Surah*        : ${info.name} (${info.englishName})
🔢 *Nomor*        : ${info.number}
🌍 *Tempat Turun* : ${revelasi}
📝 *Jumlah Ayat*  : ${info.numberOfAyahs}
💬 *Arti*         : ${info.englishNameTranslation}
🎙️ *Qari*         : Mishary Rashid Alafasy
${'─'.repeat(28)}`;

		await conn.sendMessage(m.chat, { text: teks }, { quoted: m });

		m.react('🎙️');

		// Download audio MP3
		let audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/${QARI}/${nomor}.mp3`;
		let mp3Buf = Buffer.from(
			(await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 60000 })).data
		);

		// Konversi MP3 → OGG/Opus biar bisa jadi PTT di WhatsApp
		let ptt = await toPTT(mp3Buf, 'mp3');

		await conn.sendMessage(m.chat, {
			audio: ptt.data,
			mimetype: 'audio/ogg; codecs=opus',
			ptt: true,
		}, { quoted: m });

		m.react('✅');

	} catch (e) {
		m.react('❌');
		throw e.message || 'Gagal mengambil data surah. Pastikan nomor surah benar (1–114)!';
	}
};

handler.help = ['murotal [nomor surah]'];
handler.tags = ['tools'];
handler.command = /^murotal$/i;

export default handler;