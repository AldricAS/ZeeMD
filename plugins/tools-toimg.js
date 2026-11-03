import { spawn } from 'child_process';

const toPng = (input) =>
	new Promise((resolve, reject) => {
		const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', 'pipe:1'], { stdio: ['pipe', 'pipe', 'ignore'] });
		const chunks = [];
		ff.stdout.on('data', (c) => chunks.push(c));
		ff.on('error', reject);
		ff.on('close', (code) => {
			const out = Buffer.concat(chunks);
			code === 0 && out.length ? resolve(out) : reject(new Error('Gagal mengubah stiker menjadi gambar'));
		});
		ff.stdin.on('error', () => {});
		ff.stdin.end(input);
	});

const handler = async (m, { conn, usedPrefix, command }) => {
	const q = m.quoted;
	if (!q || !/webp/.test((q.msg || q).mimetype || '')) return m.reply(`Balas stiker dengan *${usedPrefix}${command}*`);
	const media = await q.download();
	await conn.sendMessage(m.chat, { image: await toPng(media) }, { quoted: m });
};

handler.help = ['toimg'];
handler.tags = ['tools'];
handler.command = ['toimg', 'toimage'];

export default handler;
