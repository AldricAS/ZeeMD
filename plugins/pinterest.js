import { gotScraping } from 'got-scraping';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

async function scrapePinterest(keyword, jumlah = 1) {
	const targetUrl = new URL('https://id.pinterest.com/resource/BaseSearchResource/get/');
	const dataPayload = {
		options: {
			query: keyword,
			scope: 'pins',
			rs: 'typed',
			redux_normalize_feed: true,
		},
		context: {},
	};
	targetUrl.searchParams.append('source_url', `/search/pins/?q=${encodeURIComponent(keyword)}&rs=typed`);
	targetUrl.searchParams.append('data', JSON.stringify(dataPayload));
	targetUrl.searchParams.append('_', Date.now());

	const response = await gotScraping({
		url: targetUrl.toString(),
		method: 'GET',
		headers: {
			Accept: 'application/json, text/javascript, */*; q=0.01',
			'X-Requested-With': 'XMLHttpRequest',
			'X-Pinterest-AppState': 'active',
			'X-Pinterest-PWS-Handler': 'www/search/[scope].js',
			Referer: `https://id.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`,
			'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
			Cookie: '_pinterest_sess=AZQKkHbaguRDa42w/JB5/zFCnhq+kyi/MkegqhkFLhLxp9wkTYK9DJXDe41BWhWv2tI=;',
		},
		responseType: 'text',
	});

	const body = JSON.parse(response.body);
	const results = body?.resource_response?.data?.results;
	if (!results || !Array.isArray(results)) return [];

	return results.slice(0, jumlah).map(pin => ({
		title: pin.title || pin.grid_title || 'Tanpa Judul',
		is_video: !!pin.is_video,
		images: {
			low: pin.images?.['236x']?.url || null,
			medium: pin.images?.['474x']?.url || null,
			high: pin.images?.['736x']?.url || null,
			original: pin.images?.orig?.url || null,
		},
	}));
}

async function downloadImage(url, dest) {
	const res = await axios.get(url, {
		responseType: 'arraybuffer',
		timeout: 15000,
		headers: { 'User-Agent': 'Mozilla/5.0' },
	});
	fs.writeFileSync(dest, Buffer.from(res.data));
}

let handler = async (m, { text, usedPrefix, command }) => {
	if (!text) throw `Format salah!\n\nContoh:\n• *${usedPrefix + command} ayam* - Kirim 1 foto\n• *${usedPrefix + command} ayam #5* - Kirim 5 foto\n• *${usedPrefix + command} ayam #12* - Kirim 12 foto dalam ZIP`;

	const match = text.match(/^(.+?)(?:\s*#(\d+))?$/);
	const query = match?.[1]?.trim();
	const jumlah = Math.min(parseInt(match?.[2]) || 1, 20);
	if (!query) throw 'Masukkan kata kunci pencarian!';

	await m.reply(`🔍 Mencari *${jumlah}* foto "${query}" dari Pinterest...`);

	const pins = await scrapePinterest(query, jumlah);
	if (!pins.length) throw `❌ Tidak ada foto ditemukan untuk "${query}"!`;

	// Ambil URL terbaik (original > high > medium > low), skip video
	const imageUrls = pins
		.filter(p => !p.is_video)
		.map(p => p.images.original || p.images.high || p.images.medium || p.images.low)
		.filter(Boolean);

	if (!imageUrls.length) throw `❌ Tidak ada foto (bukan video) ditemukan untuk "${query}"!`;

	const tmpDir = path.join(process.cwd(), 'tmp', `pin_${Date.now()}`);
	fs.mkdirSync(tmpDir, { recursive: true });

	try {
		if (jumlah === 1) {
			const buf = Buffer.from((await axios.get(imageUrls[0], { responseType: 'arraybuffer', timeout: 15000 })).data);
			await conn.sendMessage(m.chat, {
				image: buf,
				caption: `🖼️ *Pinterest* - "${query}"\n✨ ZeeMD`,
			}, { quoted: m });

		} else if (jumlah <= 5) {
			await m.reply(`📸 Mengirim *${imageUrls.length}* foto...`);
			for (let i = 0; i < imageUrls.length; i++) {
				try {
					const buf = Buffer.from((await axios.get(imageUrls[i], { responseType: 'arraybuffer', timeout: 15000 })).data);
					await conn.sendMessage(m.chat, {
						image: buf,
						caption: `📌 ${i + 1}/${imageUrls.length} | "${query}"`,
					}, { quoted: m });
				} catch { /* skip foto gagal */ }
			}

		} else {
			await m.reply(`📦 Mengemas *${imageUrls.length}* foto ke ZIP...`);

			const downloaded = [];
			for (let i = 0; i < imageUrls.length; i++) {
				try {
					const ext = imageUrls[i].split('?')[0].split('.').pop()?.replace(/[^a-z]/gi, '') || 'jpg';
					const filePath = path.join(tmpDir, `pinterest_${i + 1}.${ext}`);
					await downloadImage(imageUrls[i], filePath);
					downloaded.push(filePath);
				} catch { /* skip */ }
			}

			if (!downloaded.length) throw '❌ Gagal download foto!';

			const zipPath = path.join(process.cwd(), 'tmp', `pin_${Date.now()}.zip`);
			await new Promise((resolve, reject) => {
				const output = createWriteStream(zipPath);
				const archive = archiver('zip', { zlib: { level: 6 } });
				output.on('close', resolve);
				archive.on('error', reject);
				archive.pipe(output);
				downloaded.forEach(f => archive.file(f, { name: path.basename(f) }));
				archive.finalize();
			});

			const zipBuffer = fs.readFileSync(zipPath);
			await conn.sendMessage(m.chat, {
				document: zipBuffer,
				mimetype: 'application/zip',
				fileName: `Pinterest_${query.replace(/\s+/g, '_')}_${downloaded.length}foto.zip`,
				caption: `📦 *Pinterest* - "${query}"\n🖼️ ${downloaded.length} foto\n✨ ZeeMD`,
			}, { quoted: m });

			fs.rmSync(zipPath, { force: true });
		}
	} finally {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
};

handler.help = ['pin <query>', 'pin <query> #<jumlah>'];
handler.tags = ['tools'];
handler.command = /^(pin|pinterest)$/i;
handler.limit = true;

export default handler;