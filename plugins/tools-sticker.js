const MAX_VIDEO_SECONDS = 10;

const handler = async (m, { conn, usedPrefix, command }) => {
	const q = m.quoted || m;
	const mime = (q.msg || q).mimetype || '';
	if (!/image|video|webp/.test(mime)) return m.reply(`Kirim atau balas gambar/video dengan *${usedPrefix}${command}*`);
	if (/video/.test(mime) && (q.msg || q).seconds > MAX_VIDEO_SECONDS) return m.reply(`Durasi video maksimal ${MAX_VIDEO_SECONDS} detik.`);

	const media = await q.download();
	if (!media?.length) return m.reply('Gagal mengunduh media.');
	await conn.sendSticker(m.chat, media, m, { packname: global.stickpack, packpublish: global.stickauth });
};

handler.help = ['sticker', 's'];
handler.tags = ['tools'];
handler.command = ['sticker', 'stiker', 's'];
handler.limit = 1;

export default handler;
