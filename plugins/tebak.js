// ==============================
// TEBAK GAMBAR - Live Fetch
// Source: cademedia.com
// ==============================

import https from 'https';
import zlib from 'zlib';
import * as cheerio from 'cheerio'; // npm install cheerio (kemungkinan besar sudah ada di project bot ini)

const sesiAktif = {};
const BASE_URL = 'https://www.cademedia.com/kunci-jawaban-tebak-gambar-level-';
const MAX_LEVEL = 208; // cek berkala di cademedia.com/jawaban-tebak-gambar, levelnya terus nambah
const TIMEOUT_MS = 2 * 60 * 1000;

// Dekompres response sesuai header content-encoding asli dari server.
// PENTING: jangan asumsikan server nurut Accept-Encoding: identity.
// Banyak CDN (Cloudflare dkk) tetap balikin gzip/br walau diminta identity,
// dan https native Node ga auto-decompress kayak fetch/browser. Kalau ini
// kelewat, buf.toString('utf8') jadi data biner acak -> parseSoal selalu
// nemu 0 soal -> error generik "Gagal mengambil soal" padahal sebenernya
// fetch-nya sukses, cuma datanya kebaca salah.
function decompress(buf, encoding) {
	return new Promise((resolve, reject) => {
		const cb = (err, result) => (err ? reject(err) : resolve(result));
		switch ((encoding || '').toLowerCase()) {
			case 'br':
				zlib.brotliDecompress(buf, cb);
				break;
			case 'gzip':
			case 'x-gzip':
				zlib.gunzip(buf, cb);
				break;
			case 'deflate':
				zlib.inflate(buf, cb);
				break;
			default:
				resolve(buf); // identity / tidak ada encoding
		}
	});
}

// Halaman challenge/anti-bot (Cloudflare dll) keliatannya "200 OK" tapi
// isinya bukan konten asli, jadi perlu dideteksi terpisah dari "parse kosong".
function isBlockedPage(html) {
	return /just a moment|attention required|cf-browser-verification|access denied|enable javascript and cookies|checking your browser/i.test(
		html.slice(0, 4000)
	);
}

// Fetch pakai native https biar ga keblock
function fetchURL(url, binary = false) {
	return new Promise((resolve, reject) => {
		const options = {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
				'Accept': binary ? 'image/webp,image/apng,image/*,*/*;q=0.8' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
				// Minta encoding standar (browser asli juga begini), lalu
				// didekompres manual sesuai header balasan di decompress().
				'Accept-Encoding': 'gzip, deflate, br',
				'Connection': 'keep-alive',
				'Cache-Control': 'no-cache',
				'Referer': 'https://www.google.com/',
				'Upgrade-Insecure-Requests': '1',
			},
			timeout: 20000
		};

		const req = https.get(url, options, (res) => {
			// Ikuti redirect
			if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
				return fetchURL(res.headers.location, binary).then(resolve).catch(reject);
			}
			if (res.statusCode !== 200) {
				return reject(new Error(`HTTP ${res.statusCode}`));
			}

			const chunks = [];
			res.on('data', chunk => chunks.push(chunk));
			res.on('end', async () => {
				try {
					const raw = Buffer.concat(chunks);
					const buf = await decompress(raw, res.headers['content-encoding']);
					resolve(binary ? buf : buf.toString('utf8'));
				} catch (e) {
					reject(new Error(`Gagal decompress (${res.headers['content-encoding'] || 'unknown'}): ${e.message}`));
				}
			});
			res.on('error', reject);
		});

		req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
		req.on('error', reject);
	});
}

const IMG_NAME_RE = /tebak-gambar-level-\d+-nomor-\d+/i;
const JAWABAN_RE  = /Jawaban\s*:\s*([^\n/\r*]{2,80})/i;

function resolveUrl(u) {
	if (!u) return null;
	try { return new URL(u, 'https://www.cademedia.com').href; } catch { return null; }
}

// Ambil kandidat URL gambar dari elemen <img>, urut prioritas. Situs ini
// (atau plugin lazy-load di WordPress-nya) bisa naro URL asli foto bukan
// cuma di "src" — kadang src cuma placeholder kosong/buram sampai JS jalan
// di browser, dan URL aslinya ada di data-src/data-lazy-src/srcset.
function imgUrlFrom($img) {
	const srcset = $img.attr('srcset') || $img.attr('data-srcset') || '';
	const firstFromSrcset = srcset.split(',')[0]?.trim().split(/\s+/)[0];
	const candidates = [
		$img.attr('src'),
		$img.attr('data-src'),
		$img.attr('data-lazy-src'),
		$img.attr('data-original'),
		firstFromSrcset,
	];
	for (const c of candidates) {
		const resolved = resolveUrl(c);
		if (resolved && IMG_NAME_RE.test(resolved)) return resolved;
	}
	return null;
}

// Metode utama: parse beneran lewat DOM (cheerio), bukan tebak-tebak regex.
// Jauh lebih tahan terhadap variasi markup (whitespace, atribut tambahan,
// urutan tag) dibanding strip-tag manual.
function parseSoalDom(html) {
	const soalList = [];
	const $ = cheerio.load(html);

	$('img').each((_, el) => {
		const $img = $(el);
		const gambarUrl = imgUrlFrom($img);
		if (!gambarUrl) return;

		// Cari "Jawaban: ..." di blok-blok setelah gambar ini (biasanya
		// paragraf berikutnya, kadang butuh 1-2 langkah kalau ada wrapper).
		let jawaban = '';
		let node = $img.closest('p, figure, div, span');
		if (!node.length) node = $img.parent();
		let cursor = node;
		for (let i = 0; i < 5 && cursor && cursor.length; i++) {
			cursor = cursor.next();
			if (!cursor || !cursor.length) break;
			const m = cursor.text().match(JAWABAN_RE);
			if (m) { jawaban = m[1].replace(/\.$/, '').replace(/[*]/g, '').trim().toUpperCase(); break; }
		}
		if (jawaban.length < 2) return;

		// Deskripsi soal: teks "Gambar ..." di blok-blok sebelum gambar ini.
		let deskripsi = '';
		let prev = node;
		for (let i = 0; i < 5 && prev && prev.length; i++) {
			prev = prev.prev();
			if (!prev || !prev.length) break;
			const t = prev.text().trim();
			if (t && /gambar/i.test(t)) { deskripsi = t; break; }
		}
		if (!deskripsi) deskripsi = '—';

		soalList.push({ deskripsi, gambarUrl, jawaban });
	});

	return soalList;
}

// Fallback lama (strip-tag + regex) buat jaga-jaga kalau suatu saat cheerio
// gagal di-load atau markup-nya aneh sampai DOM parser pun bingung.
function parseSoalRegex(html) {
	const soalList = [];
	const IMG_RE = /(https:\/\/www\.cademedia\.com\/wp-content\/uploads\/[^\s"'<>)]+tebak-gambar-level-\d+-nomor-\d+[^\s"'<>)]*)/gi;

	const seen = new Set();
	const marked = html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(IMG_RE, (url) => {
			if (seen.has(url)) return '';
			seen.add(url);
			return `\n§${url}§\n`;
		})
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n').replace(/<p[^>]*>/gi, '\n')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&[a-z#0-9]+;/gi, '')
		.replace(/[ \t]+/g, ' ');

	const parts = marked.split(/\n§(https:\/\/[^§\n]+)§\n/);

	for (let i = 1; i < parts.length; i += 2) {
		const imgUrl = parts[i];
		const before = parts[i - 1] || '';
		const after  = parts[i + 1] || '';

		const jawabanMatch = after.match(JAWABAN_RE);
		if (!jawabanMatch) continue;

		const jawaban = jawabanMatch[1].replace(/\.$/, '').replace(/[*]/g, '').trim().toUpperCase();
		if (jawaban.length < 2) continue;

		const beforeLines = before.split('\n').map(l => l.trim()).filter(l => l.length > 3);
		let deskripsi = '';
		for (let j = beforeLines.length - 1; j >= Math.max(0, beforeLines.length - 6); j--) {
			if (/gambar/i.test(beforeLines[j])) {
				deskripsi = beforeLines.slice(j, j + 3).join(' ');
				break;
			}
		}
		if (!deskripsi) deskripsi = beforeLines.slice(-2).join(' ').trim() || '—';

		soalList.push({ deskripsi, gambarUrl: imgUrl, jawaban });
	}

	return soalList;
}

function parseSoal(html) {
	const viaDom = parseSoalDom(html);
	if (viaDom.length > 0) return viaDom;
	return parseSoalRegex(html);
}

// Dipanggil cuma kalau parseSoal balikin kosong, buat nentuin alasan
// spesifik kenapa gagal — bukan sekadar "struktur berubah" yang generik.
function diagnoseEmptyParse(html) {
	const hasUploads = /wp-content\/uploads/i.test(html);
	const hasPattern = IMG_NAME_RE.test(html);
	if (!hasUploads) {
		return 'tidak ada path "wp-content/uploads" di HTML — kemungkinan gambar disajikan lewat CDN/domain lain (mis. Jetpack Photon/i0.wp.com), bukan domain cademedia.com langsung';
	}
	if (!hasPattern) {
		return 'ada "wp-content/uploads" tapi pola nama file "tebak-gambar-level-X-nomor-Y" tidak ditemukan — kemungkinan penamaan file foto di situs sudah berubah';
	}
	return 'pola nama file gambar ketemu di HTML, tapi gagal dipasangkan dengan teks "Jawaban:" terdekat — kemungkinan struktur paragraf/heading di halaman berubah';
}

let handler = async (m, { usedPrefix, command, conn }) => {
	const chatId = m.chat;

	// ── .nyerah ──────────────────────
	if (command === 'nyerah') {
		const sesi = sesiAktif[chatId];
		if (!sesi) return m.reply('❌ Tidak ada soal yang sedang aktif.');
		clearTimeout(sesi.timeout);
		delete sesiAktif[chatId];
		return m.reply(
			`🏳️ *Nyerah deh...*\n\n` +
			`📝 Jawaban yang benar:\n*${sesi.jawaban}*\n\n` +
			`_Ketik ${usedPrefix}tebakgambar untuk soal baru!_`
		);
	}

	// ── .tebakgambar ─────────────────
	if (sesiAktif[chatId]) {
		return m.reply(
			`⚠️ Masih ada soal yang belum dijawab!\n` +
			`Jawab dulu atau ketik *${usedPrefix}nyerah* buat menyerah.`
		);
	}

	// Retry sampai 5x level random berbeda, sambil nyatet alasan kegagalan
	// terakhir biar pesan error ke user (dan log) informatif, bukan generik.
	let soalList = [], level, lastErrorReason = 'penyebab tidak diketahui';
	for (let attempt = 0; attempt < 5; attempt++) {
		level = Math.floor(Math.random() * MAX_LEVEL) + 1;
		let html;
		try {
			html = await fetchURL(`${BASE_URL}${level}`);
		} catch (e) {
			lastErrorReason = `fetch level ${level} gagal: ${e.message}`;
			console.error(`[tebakgambar] ${lastErrorReason}`);
			continue;
		}

		if (isBlockedPage(html)) {
			lastErrorReason = `level ${level} diblokir halaman verifikasi anti-bot (Cloudflare/captcha)`;
			console.error(`[tebakgambar] ${lastErrorReason}`);
			continue;
		}

		soalList = parseSoal(html);
		if (soalList.length > 0) break;

		lastErrorReason = `parse level ${level} kosong (html ${html.length} karakter): ${diagnoseEmptyParse(html)}`;
		console.error(`[tebakgambar] ${lastErrorReason}`);
	}

	if (!soalList.length) {
		throw `❌ Gagal mengambil soal, coba beberapa saat lagi!\n_Alasan: ${lastErrorReason}_`;
	}

	const idx = Math.floor(Math.random() * soalList.length);
	const soal = soalList[idx];
	const nomor = idx + 1;

	// Unduh gambar
	let imgBuffer;
	try {
		imgBuffer = await fetchURL(soal.gambarUrl, true);
	} catch (e) {
		throw `❌ Gagal mengunduh gambar, coba lagi!\n_Alasan: ${e.message}_`;
	}

	const caption =
		`🖼️ *TEBAK GAMBAR*\n` +
		`━━━━━━━━━━━━━━━━━━━━\n` +
		`🔍 *Petunjuk:*\n${soal.deskripsi}\n\n` +
		`⏰ Waktu: *2 menit*\n` +
		`💬 Reply pesan ini lalu ketik jawaban kamu!\n` +
		`🏳️ Ketik *${usedPrefix}nyerah* kalau menyerah`;

	const sentMsg = await conn.sendMessage(chatId, { image: imgBuffer, caption }, { quoted: m });
	// ID pesan soal ini dipakai nanti buat mastiin jawaban cuma diterima
	// kalau orangnya bener-bener reply ke pesan soal ini (bukan chat bebas).
	const soalMsgId = sentMsg?.key?.id || sentMsg?.id || null;

	const timeoutId = setTimeout(async () => {
		if (!sesiAktif[chatId]) return;
		const jawaban = sesiAktif[chatId].jawaban;
		delete sesiAktif[chatId];
		try {
			await conn.sendMessage(chatId, {
				text:
					`⏰ *Waktu habis!*\n\n` +
					`Jawaban yang benar:\n*${jawaban}*\n\n` +
					`_Ketik ${usedPrefix}tebakgambar untuk soal baru!_`
			});
		} catch {}
	}, TIMEOUT_MS);

	sesiAktif[chatId] = { jawaban: soal.jawaban, level, nomor, timeout: timeoutId, prefix: usedPrefix, soalMsgId };
};

// ── Listener jawaban ─────────────
handler.before = async (m) => {
	const chatId = m.chat;
	if (!sesiAktif[chatId]) return;
	if (!m.text?.trim()) return;
	if (m.isBaileys && m.message?.protocolMessage) return;
	if (/^\.\w+/.test(m.text.trim())) return;

	const sesi = sesiAktif[chatId];

	// Wajib reply langsung ke pesan soalnya, bukan asal chat di grup yang
	// kebetulan match jawabannya.
	const quotedId = m.quoted?.id || m.quoted?.key?.id || null;
	if (!sesi.soalMsgId || quotedId !== sesi.soalMsgId) return;

	const input = m.text.trim().toUpperCase();
	const norm = s => s.replace(/\s+/g, ' ').trim();

	if (norm(input) === norm(sesi.jawaban)) {
		clearTimeout(sesi.timeout);
		delete sesiAktif[chatId];
		await conn.sendMessage(chatId, {
			text:
				`✅ *BENAR!* 🎉\n\n` +
				`👤 @${m.sender.split('@')[0]} berhasil menjawab!\n` +
				`💬 Jawaban: *${sesi.jawaban}*\n\n` +
				`_Ketik ${sesi.prefix}tebakgambar untuk soal berikutnya!_`,
			mentions: [m.sender]
		}, { quoted: m });
	}
};

handler.help = ['tebakgambar', 'nyerah'];
handler.tags = ['fun'];
handler.command = /^(tebakgambar|nyerah)$/i;

export default handler;