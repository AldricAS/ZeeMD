// ==============================
// PAPAYANG - ZeeMD
// Kirim foto anime pacar/istri dari Pinterest (acak)
// ==============================

import { gotScraping } from 'got-scraping';
import axios from 'axios';

// ── Shuffle array (Fisher-Yates) ──────────────────────────────────────────────
function shuffleArray(arr) {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// ── Scrape Pinterest dengan hasil DIACAK ─────────────────────────────────────
async function scrapePinterestRandom(keyword, jumlah = 1) {
	// Minta lebih banyak dari yang dibutuhkan supaya bisa diacak
	const ambilLebih = Math.min(jumlah * 5, 50);

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

	// Ambil lebih banyak dulu → filter bukan video → ACAK → potong sesuai jumlah
	const pool = results
		.slice(0, ambilLebih)
		.filter(pin => !pin.is_video)
		.map(pin => ({
			title: pin.title || pin.grid_title || 'Tanpa Judul',
			url:
				pin.images?.orig?.url ||
				pin.images?.['736x']?.url ||
				pin.images?.['474x']?.url ||
				pin.images?.['236x']?.url ||
				null,
		}))
		.filter(p => p.url);

	// Fisher-Yates shuffle → ambil sejumlah yang diminta
	return shuffleArray(pool).slice(0, jumlah);
}

// ── Handler Utama ─────────────────────────────────────────────────────────────
let handler = async (m, { text, usedPrefix, command }) => {
	const sender = m.sender;
	const user = global.db.data.users?.[sender];
	if (!user) throw 'Kamu belum terdaftar! Ketik *.daftar* dulu.';

	// ── Wajib punya pacar / istri ──
	const pacar = user?.pacar;
	if (!pacar) {
		throw `❌ Kamu belum punya pacar/istri!\n\nBuat dulu dengan *.createpacar <nama>* ya~ 💝`;
	}

	// ── Parse jumlah foto (opsional, misal: .papayang #3) ──
	let jumlah = 1;
	if (text) {
		const matchJumlah = text.match(/#(\d+)/);
		if (matchJumlah) jumlah = Math.min(parseInt(matchJumlah[1]) || 1, 10);
	}

	// ── Keyword: "pap anime <nama pacar>" ──
	const namaPacar = pacar.nama;
	const keyword = `pap anime ${namaPacar}`;

	// ── React emoji 📸 ke pesan user ──
	await m.react('📸');

	// ── Scrape Pinterest (acak) ──
	let pins;
	try {
		pins = await scrapePinterestRandom(keyword, jumlah);
	} catch (e) {
		await m.react('❌');
		throw `❌ Gagal nyambung ke Pinterest. Coba lagi ya!\n_Error: ${e.message}_`;
	}

	if (!pins.length) {
		await m.react('❌');
		throw `❌ Tidak ada foto ditemukan untuk *${namaPacar}* nih...`;
	}

	// ── Kirim foto tanpa caption ──
	if (jumlah === 1) {
		try {
			const buf = Buffer.from(
				(await axios.get(pins[0].url, { responseType: 'arraybuffer', timeout: 15000 })).data
			);
			await conn.sendMessage(m.chat, { image: buf }, { quoted: m });
		} catch {
			await m.react('❌');
			throw '❌ Gagal download fotonya. Coba lagi!';
		}
	} else {
		let berhasil = 0;
		for (let i = 0; i < pins.length; i++) {
			try {
				const buf = Buffer.from(
					(await axios.get(pins[i].url, { responseType: 'arraybuffer', timeout: 15000 })).data
				);
				await conn.sendMessage(m.chat, { image: buf }, { quoted: m });
				berhasil++;
			} catch {
				// skip foto gagal
			}
		}
		if (!berhasil) {
			await m.react('❌');
			throw '❌ Semua foto gagal diunduh. Coba lagi!';
		}
	}
};

// ── Metadata ──────────────────────────────────────────────────────────────────
handler.help = ['papayang', 'papayang #<jumlah>'];
handler.tags = ['rpg'];
handler.command = /^(papayang)$/i;
handler.limit = true;
handler.register = true;

export default handler;
