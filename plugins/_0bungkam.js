// ==============================
// _0bungkam.js  →  .bungkam / .unbungkam
// ==============================
// Cara pakai (khusus grup, harus admin grup atau owner bot):
//   .bungkam @user     → user dibungkam
//   .unbungkam @user   → bungkam dilepas
// (selain tag, bisa juga dengan reply pesan orangnya atau tulis nomornya)
//
// Yang terjadi saat user dibungkam:
//   1. Semua pesan yang dia kirim SETELAH dibungkam otomatis dihapus bot.
//   2. Command apa pun darinya diabaikan bot (tidak dijalankan sama sekali).
//   (Pesan lama sebelum dibungkam tidak disentuh.)
//
// Catatan penting:
//   • Nama file sengaja diawali "_0" supaya dimuat PALING AWAL (main.js mengurutkan
//     plugin pakai localeCompare). Dengan begitu user yang dibungkam sudah diblok
//     sebelum plugin lain sempat memproses pesannya. JANGAN diganti namanya.
//   • Bot harus jadi admin grup, kalau tidak WhatsApp menolak penghapusan pesan
//     orang lain. Command tetap diblok walau bot bukan admin.
//   • Data disimpan di database bot: global.db.data.chats[grup].bungkam

// mtype yang tidak perlu / tidak bisa dihapus
const SKIP_TYPES = ['protocolMessage', 'reactionMessage', 'pollUpdateMessage'];

// Semua bentuk ID milik satu peserta grup (jid biasa, lid, nomor telepon)
const idsOf = (p) => [p?.id, p?.lid, p?.jid, p?.phoneNumber].filter(Boolean);

function findParticipant(conn, participants, target) {
	return (participants || []).find((p) => idsOf(p).includes(target) || conn.getJid(p.id) === target);
}

// Prioritas: tag → reply → nomor yang diketik
function resolveTarget(m, text) {
	if (m.mentionedJid?.length) return m.mentionedJid[0];
	if (m.quoted?.sender) return m.quoted.sender;
	const num = (text || '').replace(/[^0-9]/g, '');
	return num.length >= 8 ? num + '@s.whatsapp.net' : null;
}

let handler = async (m, { conn, text, command, usedPrefix, participants, isAdmin, isOwner }) => {
	if (!isAdmin && !isOwner) return m.reply('⚠️ Hanya *admin grup* atau *owner bot* yang bisa memakai perintah ini.');

	const chat = global.db.data.chats[m.chat];
	chat.bungkam = chat.bungkam || {};
	const list = chat.bungkam;
	const isUnmute = /^unbungkam$/i.test(command);

	const target = resolveTarget(m, text);
	if (!target) {
		return m.reply(`🔇 *B U N G K A M*\n\nTag / reply orangnya ya.\n\n• *${usedPrefix}bungkam @user* → bungkam\n• *${usedPrefix}unbungkam @user* → lepas bungkam`);
	}

	const tag = '@' + target.split('@')[0];
	const person = findParticipant(conn, participants, target);
	if (!person) return conn.reply(m.chat, `${tag} tidak ada di grup ini.`, m, { mentions: [target] });

	// Semua ID yang mungkin dipakai user ini (biar cocok walau WhatsApp kirim versi lid)
	const ids = new Set([target, ...idsOf(person), ...idsOf(person).map((i) => conn.getJid(i))].filter(Boolean));

	// ========== LEPAS BUNGKAM ==========
	if (isUnmute) {
		if (![...ids].some((i) => list[i])) return conn.reply(m.chat, `${tag} tidak sedang dibungkam.`, m, { mentions: [target] });
		for (const i of ids) delete list[i];
		return conn.reply(m.chat, `🔊 *BUNGKAM DILEPAS*\n\n${tag} sudah boleh bicara lagi.`, m, { mentions: [target] });
	}

	// ========== BUNGKAM ==========
	const botJid = conn.user?.jid || conn.decodeJid(conn.user?.id);
	const ownerJids = (global.owner || []).map(([n]) => String(n).replace(/[^0-9]/g, '') + '@s.whatsapp.net');

	if ([...ids].some((i) => i === botJid || i === m.sender)) {
		return m.reply(ids.has(m.sender) ? '😅 Tidak bisa membungkam diri sendiri.' : '🤖 Bot tidak bisa dibungkam.');
	}
	if ([...ids].some((i) => ownerJids.includes(i))) return m.reply('👑 Owner bot tidak bisa dibungkam.');
	if (person.admin && !isOwner) return m.reply('🔒 Tidak bisa membungkam sesama admin. Hanya owner bot yang bisa.');
	if ([...ids].some((i) => list[i])) return conn.reply(m.chat, `${tag} sudah dibungkam. Lepas dengan *${usedPrefix}unbungkam*.`, m, { mentions: [target] });

	const entry = { jid: target, by: m.sender, at: Date.now() };
	for (const i of ids) list[i] = entry;

	await conn.reply(m.chat, `🔇 *DIBUNGKAM*\n\n${tag} sekarang dibungkam:\n• pesan barunya otomatis dihapus\n• command-nya tidak dijalankan bot\n\nLepas dengan *${usedPrefix}unbungkam @user*`, m, { mentions: [target] });
};

// Jalan untuk SETIAP pesan, sebelum plugin lain memproses command
handler.all = async function (m) {
	try {
		if (!m.isGroup || m.key?.fromMe) return;
		const list = global.db?.data?.chats?.[m.chat]?.bungkam;
		if (!list) return;

		const entry = [m.sender, m.key?.participant, m.key?.participantAlt, m.participant].filter(Boolean).map((i) => list[i]).find(Boolean);
		if (!entry) return;

		// 1) Blokir command dulu: teks dikosongkan → semua plugin setelahnya tidak menemukan prefix
		m.text = '';
		m.isBungkam = true;

		// 2) Hapus pesannya (butuh bot admin; kalau gagal, command tetap sudah terblokir)
		if (SKIP_TYPES.includes(m.mtype)) return;
		await this.sendMessage(m.chat, { delete: m.key });
	} catch {}
};

handler.help = ['bungkam @user', 'unbungkam @user'];
handler.tags = ['group']; // JANGAN pakai tag 'admin' — handler.js melewati plugin bertag itu
handler.command = /^(un)?bungkam$/i;
handler.group = true;
handler.botAdmin = true;

export default handler;