import axios from 'axios';

let handler = async (m, { text, usedPrefix, command }) => {
	if (!text) throw `Masukkan URL!\nContoh: *${usedPrefix + command}* https://example.com/image.jpg`;

	let url = text.trim();
	if (!/^https?:\/\//i.test(url)) throw `URL tidak valid! Harus diawali dengan https:// atau http://`;

	m.react('⏳');

	let res;
	try {
		res = await axios.get(url, {
			responseType: 'arraybuffer',
			timeout: 30000,
			maxRedirects: 5,
			validateStatus: () => true,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
				'Accept': '*/*',
				'Accept-Encoding': 'gzip, deflate, br',
				'Connection': 'keep-alive',
			},
		});
	} catch (e) {
		m.react('❌');
		throw `Gagal fetch URL: ${e.message}`;
	}

	const contentType = res.headers['content-type'] || '';
	const isImage = /image\/(jpeg|jpg|png|webp|gif|bmp|svg)/.test(contentType);

	// Format headers response
	const headersText = Object.entries(res.headers)
		.map(([k, v]) => `*${k}:* ${v}`)
		.join('\n');

	m.react('✅');

	if (isImage) {
		const buf = Buffer.from(res.data);
		await conn.sendMessage(m.chat, {
			image: buf,
			caption: `${url}\n\n*Headers Respons:*\n${headersText}`,
		}, { quoted: m });
	} else {
		const body = Buffer.from(res.data).toString('utf-8').slice(0, 2000);
		await m.reply(`*URL:* ${url}\n\n*Content-Type:* ${contentType}\n\n*Headers Respons:*\n${headersText}\n\n*Body Preview:*\n\`\`\`${body}\`\`\``);
	}
};

handler.help = ['get <url>'];
handler.tags = ['owner'];
handler.command = /^get$/i;
handler.owner = true;

export default handler;