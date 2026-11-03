let handler = async (m, { conn, usedPrefix, command }) => {
	// Harus reply foto
	let q = m.quoted ? m.quoted : m;
	let mime = (q.msg || q).mimetype || '';

	if (!/image/.test(mime)) throw `Reply foto dulu baru ketik *${usedPrefix + command}*\n\nContoh:\n> kirim/reply foto ➜ ${usedPrefix + command}`;

	// Download foto
	let media = await q.download();
	if (!media) throw '❌ Gagal download foto, coba lagi';

	// Update foto profil bot
	await conn.updateProfilePicture(conn.user.id, media);

	m.reply('✅ *Foto profil bot berhasil diganti!*');
};

handler.help = ['profilebot'];
handler.tags = ['owner'];
handler.command = /^(profilebot|setpp|setpbot)$/i;
handler.owner = true;

export default handler;