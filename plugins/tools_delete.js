let handler = async (m, { conn, isBotAdmin, usedPrefix, command }) => {
	if (!m.quoted) return m.reply(`Reply pesan yang ingin dihapus dengan caption ${usedPrefix + command}`);
	if (!isBotAdmin) return global.dfail('botAdmin', m, conn);

	// Hapus pesan yang di-reply
	const bilek = m.message?.extendedTextMessage?.contextInfo?.participant || m.quoted.sender;
	const banh = m.message?.extendedTextMessage?.contextInfo?.stanzaId || m.quoted.id;
	await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: banh, participant: bilek } });

	// Hapus pesan .del milik pengirim
	await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.id, participant: m.sender } });
};

handler.help = ['del'];
handler.tags = ['tools'];
handler.command = /^(del|delete|hapus?)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;
handler.limit = false;

export default handler;