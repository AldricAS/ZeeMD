// ==============================
// antiribut.js
// Deteksi indikasi pertengkaran/adu mulut di grup pakai AI (baca konteks),
// difilter dulu pakai heuristik biar gak boros manggil API tiap pesan.
// Kalau kedeteksi -> kirim pesan nenangin + tag admin grup.
// ==============================

import { deepinfra } from './ai-deepseek.js';

const WINDOW_MS = 3 * 60 * 1000; // 3 menit -> jendela waktu buat ngumpulin pesan
const MIN_PESAN = 4; // minimal pesan dalam jendela waktu
const MIN_PENGIRIM = 2; // minimal orang berbeda yang harus terlibat
const AI_COOLDOWN_MS = 60 * 1000; // jarak minimal antar panggilan AI per grup (hemat kuota)
const ALERT_COOLDOWN_MS = 10 * 60 * 1000; // jarak minimal antar alert ke admin per grup (biar gak spam)

// Kata kasar umum buat filter cepat sebelum manggil AI (heuristik, bukan final keputusan)
const KATA_KASAR = [
	'anjing',
	'anjir',
	'bangsat',
	'bangsad',
	'goblok',
	'gblk',
	'tolol',
	'tolo',
	'bego',
	'bgo',
	'kontol',
	'kntl',
	'memek',
	'jancok',
	'jancuk',
	'asu',
	'babi',
	'sialan',
	'brengsek',
	'tai',
	'taik',
	'bacot',
	'kampret',
	'idiot',
	'sampah',
	'najis',
	'setan',
];

function adaKataKasar(text) {
	const lower = text.toLowerCase();
	return KATA_KASAR.some((k) => lower.includes(k));
}

function pesanTerlihatPanas(text) {
	if (!text) return false;
	if (adaKataKasar(text)) return true;
	// caps lock berlebihan (indikasi teriak/emosi)
	const huruf = text.replace(/[^a-zA-Z]/g, '');
	if (huruf.length >= 6) {
		const capsRatio = (huruf.match(/[A-Z]/g) || []).length / huruf.length;
		if (capsRatio > 0.7) return true;
	}
	// tanda seru/tanya beruntun (!!!  ???  ?!?!)
	if (/[!?]{3,}/.test(text)) return true;
	return false;
}

// Cek heuristik cepat dulu: minimal N pesan "panas" dalam jendela waktu, dari minimal M orang berbeda
function cekHeuristik(buffer) {
	const now = Date.now();
	const recent = buffer.filter((p) => now - p.time <= WINDOW_MS);
	const pesanPanas = recent.filter((p) => pesanTerlihatPanas(p.text));
	const pengirimUnik = new Set(pesanPanas.map((p) => p.sender));

	return {
		lolos: recent.length >= MIN_PESAN && pesanPanas.length >= 2 && pengirimUnik.size >= MIN_PENGIRIM,
		recent,
	};
}

async function cekPakaiAI(recent) {
	const daftarPesan = recent.map((p) => `${p.sender.split('@')[0]}: ${p.text}`).join('\n');

	const prompt = `Berikut beberapa pesan terakhir di sebuah grup WhatsApp (urut dari paling lama ke paling baru):\n\n${daftarPesan}\n\nTolong analisis: apakah percakapan ini menunjukkan PERTENGKARAN/KONFLIK/ADU MULUT serius antar orang (BUKAN cuma bercanda kasar, ngegas becanda antar teman akrab, atau diskusi biasa yang rame)? Jawab HANYA dengan JSON murni tanpa markdown/code block, format persis seperti ini:\n{"isFight": true atau false, "severity": "rendah" atau "sedang" atau "tinggi", "reason": "penjelasan singkat 1 kalimat dalam Bahasa Indonesia"}`;

	const res = await deepinfra('deepseek-ai/DeepSeek-V3.2', [{ role: 'user', content: prompt }]);
	const clean = res
		.replace(/```json|```/g, '')
		.trim();
	return JSON.parse(clean);
}

if (!global.ributBuffer) global.ributBuffer = {};

const handler = async (m, { conn, text, command }) => {
	const chat = global.db.data.chats[m.chat];
	if (!chat.antiRibut) chat.antiRibut = { enabled: false };

	if (command === 'antiribut') {
		const status = text?.trim().toLowerCase();
		if (status === 'on') {
			chat.antiRibut.enabled = true;
			m.reply(
				`✅ *Deteksi pertengkaran AKTIF!*\n\nBot bakal mantau obrolan, dan kalau kedeteksi ada indikasi adu mulut/berantem serius (dianalisis pakai AI, bukan cuma dari kata kasar doang), bot bakal kirim pesan nenangin + tag admin grup biar bisa dicek.\n\n_Fitur ini gak nge-flag becanda kasar antar temen ya, cuma yang beneran keliatan konflik._`
			);
		} else if (status === 'off') {
			chat.antiRibut.enabled = false;
			delete global.ributBuffer[m.chat];
			m.reply('❌ *Deteksi pertengkaran dinonaktifkan.*');
		} else {
			throw `Format: *.antiribut on/off*`;
		}
	} else if (command === 'cekantiribut') {
		const s = chat.antiRibut;
		m.reply(
			`🕊️ *STATUS ANTI-RIBUT*\n${'─'.repeat(24)}\n` +
				`📢 Status : *${s.enabled ? 'Aktif' : 'Nonaktif'}*\n` +
				`🕐 Alert terakhir : *${s.lastAlert ? new Date(s.lastAlert).toLocaleString('id-ID') : 'Belum pernah'}*`
		);
	}
};

handler.before = async function (m, { conn }) {
	if (!m.isGroup) return;
	if (!m.text) return;

	const chat = global.db.data.chats[m.chat];
	if (!chat?.antiRibut?.enabled) return;

	// Skip pesan command (misal ".antiribut on") biar gak dianggap pesan "panas"
	const _prefix = conn.prefix ? conn.prefix : global.prefix;
	const prefixStr = _prefix instanceof RegExp ? null : _prefix;
	if (typeof prefixStr === 'string' && m.text.startsWith(prefixStr)) return;

	// Skip alert otomatis dari bot ini sendiri biar gak nge-trigger diri sendiri
	if (m.key?.fromMe && m.text.includes('Kayaknya lagi ada yang panas nih di grup')) return;

	if (!global.ributBuffer[m.chat]) global.ributBuffer[m.chat] = [];
	const buffer = global.ributBuffer[m.chat];

	buffer.push({ sender: m.sender, text: m.text, time: Date.now() });
	// buang yang udah kelewat lama biar buffer gak numpuk
	const now = Date.now();
	while (buffer.length && now - buffer[0].time > WINDOW_MS) buffer.shift();
	if (buffer.length > 30) buffer.splice(0, buffer.length - 30);

	// jangan spam manggil AI, kasih jeda
	if (chat.antiRibut.lastCheck && now - chat.antiRibut.lastCheck < AI_COOLDOWN_MS) return;

	const { lolos, recent } = cekHeuristik(buffer);
	if (!lolos) return;

	chat.antiRibut.lastCheck = now;

	try {
		const hasil = await cekPakaiAI(recent);
		if (!hasil?.isFight || hasil.severity === 'rendah') return;

		// jangan spam tag admin kalau baru aja alert buat fight yang sama
		if (chat.antiRibut.lastAlert && now - chat.antiRibut.lastAlert < ALERT_COOLDOWN_MS) return;
		chat.antiRibut.lastAlert = now;

		const metadata = await conn.groupMetadata(m.chat).catch(() => null);
		const adminJids = (metadata?.participants || []).filter((p) => p.admin).map((p) => conn.getJid(p.id));

		const tagAdmin = adminJids.length ? adminJids.map((j) => `@${j.split('@')[0]}`).join(' ') : '_(gak ada admin terdeteksi)_';

		await conn.sendMessage(
			m.chat,
			{
				text:
					`🚨 *Kayaknya lagi ada yang panas nih di grup...*\n\n` +
					`${hasil.reason || 'Terdeteksi ada perdebatan yang mulai memanas.'}\n\n` +
					`${tagAdmin} mohon dicek & dibantu redain ya 🙏\n\n` +
					`_Yuk sama-sama jaga suasana grup tetap nyaman~_ 🕊️`,
				mentions: adminJids,
			},
			{ quoted: m }
		);
	} catch (e) {
		console.error('[AntiRibut Error]', m.chat, e?.message || e);
	}
};

handler.help = ['antiribut on/off', 'cekantiribut'];
handler.tags = ['group'];
handler.command = /^(antiribut|cekantiribut)$/i;
handler.admin = true;
handler.group = true;

export default handler;