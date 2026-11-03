import axios from 'axios';

const BASE = 'https://api.theresav.biz.id/game';

if (!global.gameSession) global.gameSession = {};

function buatSesiKey(chat, game) { return `${chat}:${game}`; }

// Normalisasi: lowercase, hapus spasi berlebih, hapus tanda baca
function normalize(str) {
	return str.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Cek apakah jawaban user cocok — support partial match
function cekJawaban(input, jawaban) {
	let i = normalize(input);
	let j = normalize(jawaban);
	// Exact match atau input ada di dalam jawaban atau jawaban ada di dalam input
	return i === j || j.includes(i) || i.includes(j);
}

let handler = async (m, { conn, usedPrefix, command, text }) => {
	const chat = m.chat;

	// ─────────────────────────────────────────
	// JAWAB
	// ─────────────────────────────────────────
	if (command === 'jawab') {
		if (!text) throw `Ketik jawaban kamu!\nContoh: *${usedPrefix}jawab* jawabanmu`;

		let aktivKey = Object.keys(global.gameSession).find(k => k.startsWith(chat + ':'));
		if (!aktivKey) throw `❌ Tidak ada permainan yang sedang berlangsung di chat ini!\nMulai dulu dengan salah satu game.`;

		let sesi = global.gameSession[aktivKey];
		let game = aktivKey.split(':')[1];
		let input = text.trim();

		// Family100: cek per kata
		if (game === 'family100') {
			let jawabanArr = sesi.jawaban;
			sesi.terjawab = sesi.terjawab || [];

			let cocok = jawabanArr.find(j => cekJawaban(input, j));
			if (cocok) {
				if (sesi.terjawab.map(normalize).includes(normalize(cocok))) {
					return m.reply(`⚠️ *"${cocok}"* sudah pernah dijawab!\nMasih ada *${jawabanArr.length - sesi.terjawab.length}* jawaban lagi.`);
				}
				sesi.terjawab.push(cocok);
				let sisa = jawabanArr.length - sesi.terjawab.length;
				if (sisa === 0) {
					delete global.gameSession[aktivKey];
					return m.reply(`✅ *Betul! "${cocok}"*\n\n🎉 Semua jawaban sudah terjawab!\nJawaban lengkap: ${jawabanArr.join(', ')}`);
				}
				return m.reply(`✅ *Betul! "${cocok}"*\n\nMasih ada *${sisa}* jawaban lagi. Sebutkan yang lain!`);
			}
			return m.reply(`❌ *"${input}"* bukan salah satu jawabannya.\nCoba lagi!`);
		}

		// Game lain: cek jawaban tunggal
		let jawaban = sesi.jawaban;
		if (cekJawaban(input, jawaban)) {
			delete global.gameSession[aktivKey];
			return m.reply(`✅ *BENAR!*\n\nJawaban: *${jawaban}*${sesi.deskripsi ? `\n\n💡 ${sesi.deskripsi}` : ''}`);
		}
		return m.reply(`❌ *Salah!* Coba lagi atau ketik *${usedPrefix}skip* untuk lewati.`);
	}

	// ─────────────────────────────────────────
	// SKIP
	// ─────────────────────────────────────────
	if (command === 'skip') {
		let aktivKey = Object.keys(global.gameSession).find(k => k.startsWith(chat + ':'));
		if (!aktivKey) throw '❌ Tidak ada permainan yang sedang berlangsung di chat ini!';
		let sesi = global.gameSession[aktivKey];
		let jawaban = Array.isArray(sesi.jawaban) ? sesi.jawaban.join(', ') : sesi.jawaban;
		delete global.gameSession[aktivKey];
		return m.reply(`⏭️ *Soal dilewati!*\n\nJawaban: ${jawaban}`);
	}

	// ─────────────────────────────────────────
	// CEK sesi aktif sebelum mulai game baru
	// ─────────────────────────────────────────
	let aktivKey = Object.keys(global.gameSession).find(k => k.startsWith(chat + ':'));
	if (aktivKey) {
		let namaGame = aktivKey.split(':')[1];
		return m.reply(`⚠️ Masih ada permainan *${namaGame}* yang belum selesai di chat ini!\nJawab dulu atau ketik *${usedPrefix}skip* untuk lewati.`);
	}

	m.react('⏳');

	try {
		// ── ASAH OTAK ──
		if (command === 'asahotak') {
			let { data } = await axios.get(`${BASE}/asahotak`, { timeout: 10000 });
			if (!data.status) throw 'Gagal ambil soal!';
			let r = data.result;
			global.gameSession[buatSesiKey(chat, 'asahotak')] = { jawaban: r.jawaban };
			m.react('✅');
			return m.reply(
`🧠 *ASAH OTAK*
${'─'.repeat(28)}
❓ ${r.soal}
${'─'.repeat(28)}
Ketik *${usedPrefix}jawab* [jawabanmu]
Ketik *${usedPrefix}skip* untuk lewati`);
		}

		// ── CAK LONTONG ──
		if (command === 'caklontong') {
			let { data } = await axios.get(`${BASE}/caklontong`, { timeout: 10000 });
			if (!data.status) throw 'Gagal ambil soal!';
			let r = data.result;
			global.gameSession[buatSesiKey(chat, 'caklontong')] = { jawaban: r.jawaban, deskripsi: r.deskripsi };
			m.react('✅');
			return m.reply(
`🎭 *CAK LONTONG*
${'─'.repeat(28)}
❓ ${r.soal}
${'─'.repeat(28)}
Ketik *${usedPrefix}jawab* [jawabanmu]
Ketik *${usedPrefix}skip* untuk lewati`);
		}

		// ── FAMILY 100 ──
		if (command === 'family100') {
			let { data } = await axios.get(`${BASE}/family100`, { timeout: 10000 });
			if (!data.status) throw 'Gagal ambil soal!';
			let r = data.result;
			global.gameSession[buatSesiKey(chat, 'family100')] = { jawaban: r.jawaban, terjawab: [] };
			m.react('✅');
			return m.reply(
`👨‍👩‍👧‍👦 *FAMILY 100*
${'─'.repeat(28)}
❓ Sebutkan hal yang berkaitan dengan:
"${r.soal}"

Ada *${r.jawaban.length}* jawaban yang harus disebutkan!
${'─'.repeat(28)}
Ketik *${usedPrefix}jawab* [jawabanmu] satu per satu
Ketik *${usedPrefix}skip* untuk lewati`);
		}

		// ── LENGKAPI KALIMAT ──
		if (command === 'lengkapikalimat') {
			let { data } = await axios.get(`${BASE}/lengkapikalimat`, { timeout: 10000 });
			if (!data.status) throw 'Gagal ambil soal!';
			let r = data.result;
			global.gameSession[buatSesiKey(chat, 'lengkapikalimat')] = { jawaban: r.jawaban };
			m.react('✅');
			return m.reply(
`✏️ *LENGKAPI KALIMAT*
${'─'.repeat(28)}
❓ ${r.soal}
${'─'.repeat(28)}
Ketik *${usedPrefix}jawab* [jawabanmu]
Ketik *${usedPrefix}skip* untuk lewati`);
		}

		// ── SIAPAKAH AKU ──
		if (command === 'siapakahaku') {
			let { data } = await axios.get(`${BASE}/siapakahaku`, { timeout: 10000 });
			if (!data.status) throw 'Gagal ambil soal!';
			let r = data.result;
			global.gameSession[buatSesiKey(chat, 'siapakahaku')] = { jawaban: r.jawaban };
			m.react('✅');
			return m.reply(
`🕵️ *SIAPAKAH AKU?*
${'─'.repeat(28)}
🗣️ ${r.soal}
${'─'.repeat(28)}
Ketik *${usedPrefix}jawab* [jawabanmu]
Ketik *${usedPrefix}skip* untuk lewati`);
		}

		// ── SUSUN KATA ──
		if (command === 'susunkata') {
			let { data } = await axios.get(`${BASE}/susunkata`, { timeout: 10000 });
			if (!data.status) throw 'Gagal ambil soal!';
			let r = data.result;
			global.gameSession[buatSesiKey(chat, 'susunkata')] = { jawaban: r.jawaban };
			m.react('✅');
			return m.reply(
`🔤 *SUSUN KATA*
${'─'.repeat(28)}
🏷️ Tipe : *${r.tipe}*
❓ Susun huruf berikut:
*${r.soal}*
${'─'.repeat(28)}
Ketik *${usedPrefix}jawab* [jawabanmu]
Ketik *${usedPrefix}skip* untuk lewati`);
		}

		// ── TEBAK GAME ──
		if (command === 'tebakgame') {
			let { data } = await axios.get(`${BASE}/tebakgame`, { timeout: 10000 });
			if (!data.status) throw 'Gagal ambil soal!';
			let r = data.result;
			global.gameSession[buatSesiKey(chat, 'tebakgame')] = { jawaban: r.jawaban };
			m.react('✅');
			return conn.sendMessage(m.chat, {
				image: { url: r.img },
				caption:
`🎮 *TEBAK GAME*
${'─'.repeat(28)}
❓ Game apakah ini?
${'─'.repeat(28)}
Ketik *${usedPrefix}jawab* [jawabanmu]
Ketik *${usedPrefix}skip* untuk lewati`,
			}, { quoted: m });
		}

		// ── TEBAK KATA ──
		if (command === 'tebakkata') {
			let { data } = await axios.get(`${BASE}/tebakkata`, { timeout: 10000 });
			if (!data.status) throw 'Gagal ambil soal!';
			let r = data.result;
			global.gameSession[buatSesiKey(chat, 'tebakkata')] = { jawaban: r.jawaban };
			m.react('✅');
			return m.reply(
`💬 *TEBAK KATA*
${'─'.repeat(28)}
🔑 Kata kunci:
*${r.soal}*
${'─'.repeat(28)}
Ketik *${usedPrefix}jawab* [jawabanmu]
Ketik *${usedPrefix}skip* untuk lewati`);
		}

		// ── TEBAK MAKANAN ──
		if (command === 'tebakmakanan') {
			let { data } = await axios.get(`${BASE}/tebakmakanan`, { timeout: 10000 });
			if (!data.status) throw 'Gagal ambil soal!';
			let r = data.result;
			global.gameSession[buatSesiKey(chat, 'tebakmakanan')] = { jawaban: r.jawaban, deskripsi: r.deskripsi };
			m.react('✅');
			return conn.sendMessage(m.chat, {
				image: { url: r.img },
				caption:
`🍜 *TEBAK MAKANAN*
${'─'.repeat(28)}
${r.deskripsi}
${'─'.repeat(28)}
Ketik *${usedPrefix}jawab* [jawabanmu]
Ketik *${usedPrefix}skip* untuk lewati`,
			}, { quoted: m });
		}

	} catch (e) {
		m.react('❌');
		throw e.message || 'Gagal mengambil soal, coba lagi nanti!';
	}
};

handler.help = ['asahotak', 'caklontong', 'family100', 'lengkapikalimat', 'siapakahaku', 'susunkata', 'tebakgame', 'tebakkata', 'tebakmakanan', 'jawab <jawaban>', 'skip'];
handler.tags = ['fun'];
handler.command = /^(asahotak|caklontong|family100|lengkapikalimat|siapakahaku|susunkata|tebakgame|tebakkata|tebakmakanan|jawab|skip)$/i;

export default handler;