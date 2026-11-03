let handler = async (m, { conn, text, usedPrefix, command }) => {
	// Harus reply ke stiker
	let q = m.quoted ? m.quoted : m;
	let mime = (q.msg || q).mimetype || '';

	if (!/webp/.test(mime)) throw `Reply stiker dulu baru ketik ${usedPrefix + command}`;

	// Download stiker yang di-reply
	let media = await q.download();
	if (!media) throw 'Gagal download stiker';

	// Ambil nama pengirim sebagai packName
	// Prioritas: nama dari kontak, fallback ke nomor
	let senderName = text?.trim() || m.name || m.pushName || m.sender?.split('@')[0] || 'No Name';

	// Kirim ulang stiker dengan packName = nama pengirim
	await conn.sendSticker(m.chat, media, m, {
		packname: senderName,
		packpublish: global.namebot || 'Bot',
	});
};

handler.help = ['wm [nama]'];
handler.tags = ['sticker'];
handler.command = /^wm$/i;
handler.register = true;

export default handler;