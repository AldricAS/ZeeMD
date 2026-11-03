let handler = async (m, { conn, command, isOwner }) => {
	if (!isOwner) return global.dfail('owner', m, conn);

	const settings = global.db.data.settings[conn.user.jid];

	if (command === 'public') {
		// Semua orang bisa pakai, PM & grup
		settings.public = true;
		settings.gconly = false;
		await m.reply(`🌐 Bot sekarang *PUBLIC*\n\n• Semua orang bisa pakai bot\n• PM & grup aktif`);

	} else if (command === 'self') {
		// Hanya owner
		settings.public = false;
		settings.gconly = false;
		await m.reply(`👤 Bot sekarang *SELF*\n\n• Hanya owner yang bisa pakai bot\n• PM & grup aktif untuk owner`);

	} else if (command === 'private') {
		// Semua orang bisa pakai tapi hanya di grup
		settings.public = true;
		settings.gconly = true;
		await m.reply(`🔒 Bot sekarang *PRIVATE*\n\n• Semua orang bisa pakai bot\n• Hanya bisa dipakai di grup\n• PM diblokir untuk user biasa`);
	}
};

handler.help = ['public', 'self', 'private'];
handler.tags = ['owner'];
handler.command = /^(public|self|private)$/i;
handler.owner = true;

export default handler;