// ==============================
// _antifoto.js
// Larang kirim foto kecuali view once
// ==============================

let handler = async (m, { conn, usedPrefix, isAdmin, isBotAdmin }) => {
	if (!m.isGroup) return m.reply('🌑 Fitur ini hanya tersedia di grup.');
	if (!isBotAdmin) return m.reply('🤖 Bot harus menjadi *admin* terlebih dahulu!');
	if (!isAdmin) return m.reply('🔒 Hanya *admin grup* yang bisa mengubah pengaturan ini.');

	const chat = global.db.data.chats[m.chat];
	const args = m.text.trim().split(' ');
	const status = args[1]?.toLowerCase();

	if (status === 'on') {
		chat.antifoto = true;
		m.reply(
			`🖼️ *Anti Foto — AKTIF*\n\n` +
			`_"Foto biasa tidak diizinkan di sini._\n` +
			`_Hanya foto 1x lihat yang boleh melintas."_\n\n` +
			`┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
			`✦ Foto biasa dari *member* → dihapus otomatis\n` +
			`✦ Foto *view once* → diizinkan\n` +
			`✦ Foto dari *admin* → diizinkan`
		);
	} else if (status === 'off') {
		chat.antifoto = false;
		m.reply(
			`🖼️ *Anti Foto — NONAKTIF*\n\n` +
			`✦ Foto kini bebas dikirim di grup ini.`
		);
	} else {
		const aktif = chat?.antifoto;
		m.reply(
			`🖼️ *A N T I  F O T O*\n\n` +
			`Status: ${aktif ? '✅ *Aktif*' : '❌ *Nonaktif*'}\n\n` +
			`┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
			`• *${usedPrefix}antifoto on* — aktifkan\n` +
			`• *${usedPrefix}antifoto off* — nonaktifkan\n\n` +
			`📌 Foto *view once* tetap diizinkan`
		);
	}
};

handler.before = async function (m, { conn, isAdmin, isOwner }) {
	if (!m.isGroup) return;

	const chat = global.db.data.chats?.[m.chat];
	if (!chat?.antifoto) return;

	if (m.key?.fromMe) return;
	if (isAdmin || isOwner) return;

	// Cek apakah pesan adalah foto
	const isImage =
		m.mtype === 'imageMessage' ||
		m.mtype === 'Image' ||
		!!m.message?.imageMessage;

	if (!isImage) return;

	// Cek apakah foto view once — kalau iya, biarkan
	const isViewOnce =
		!!m.message?.viewOnceMessage ||
		!!m.message?.viewOnceMessageV2 ||
		!!m.message?.viewOnceMessageV2Extension ||
		m.message?.imageMessage?.viewOnce === true;

	if (isViewOnce) return;

	// Bukan view once → hapus
	try {
		await conn.sendMessage(m.chat, { delete: m.key });
	} catch (e) {}

	await conn.sendMessage(m.chat, {
		text:
			`🖼️ *— A N T I  F O T O —*\n\n` +
			`_"Foto ini tidak diizinkan melintas..._\n` +
			`_hanya foto 1x lihat yang boleh ada di sini."_\n\n` +
			`┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
			`🚫 Foto dihapus, @${m.sender.split('@')[0]}\n` +
			`💡 Gunakan fitur *View Once* jika ingin berbagi foto`,
		mentions: [m.sender],
	});
};

handler.help = ['antifoto on/off'];
handler.tags = ['group'];
handler.command = /^antifoto$/i;

export default handler;