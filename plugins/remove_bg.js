import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

let handler = async (m, { usedPrefix, command }) => {
	let q = m.quoted ? m.quoted : m;
	let mime = (q.msg || q).mimetype || '';

	if (!/image\/(jpe?g|png|webp)/i.test(mime)) throw `❌ Reply gambar yang mau dihapus backgroundnya!\n\nContoh: ${usedPrefix + command} (sambil reply foto)`;

	let media = await q.download();
	if (!media) throw 'Gagal download gambar';

	let tmpDir = path.join(process.cwd(), 'tmp');
	if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

	let inputPath = path.join(tmpDir, `pixa_${Date.now()}.jpg`);
	fs.writeFileSync(inputPath, media);

	const form = new FormData();
	form.append('image', fs.createReadStream(inputPath), { filename: path.basename(inputPath) });
	form.append('format', 'png');
	form.append('model', 'v1');

	const res = await axios.post('https://api2.pixelcut.app/image/matte/v1', form, {
		headers: {
			...form.getHeaders(),
			'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
			'Accept': 'application/json, text/plain, */*',
			'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
			'x-locale': 'en',
			'x-client-version': 'web:pixa.com:4a5b0af2',
			'sec-ch-ua-mobile': '?1',
			'sec-ch-ua-platform': '"Android"',
			'origin': 'https://www.pixa.com',
			'referer': 'https://www.pixa.com/',
		},
		responseType: 'arraybuffer',
	});

	let resultBuffer = Buffer.from(res.data);

	await conn.sendFile(m.chat, resultBuffer, 'removebg.png', '✅ *Background berhasil dihapus!*\n✨ Pixa AI', m);

	if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
};

handler.help = ['removebg', 'pixa'];
handler.tags = ['tools'];
handler.command = /^(removebg|pixa)$/i;
handler.limit = true;

export default handler;