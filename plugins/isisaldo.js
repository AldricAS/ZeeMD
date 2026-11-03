// ==============================
// owner-isisaldo.js  →  .isisaldo (khusus owner)
// ==============================
// Cara pakai:
//   .isisaldo uang 50000     → tambah 50.000 ke dompet (user.money) milik sendiri
//   .isisaldo bank 1.000.000 → tambah 1.000.000 ke bank (user.bank) milik sendiri
//
// Opsional — isi saldo orang lain (tag atau reply pesannya):
//   .isisaldo uang 5000 @user
//
// Format nominal yang didukung:
//   5000 · 5.000 · 5,000 · 5k · 5rb · 2jt · 1,5jt · 1.5jt

function formatUang(n) {
	return (n || 0).toLocaleString('id-ID');
}

// tipe → field di database, plus label untuk balasan
const TIPE = {
	uang: { field: 'money', label: '👛 Dompet' },
	money: { field: 'money', label: '👛 Dompet' },
	dompet: { field: 'money', label: '👛 Dompet' },
	bank: { field: 'bank', label: '🏦 Bank' },
};

const SATUAN = { k: 1e3, rb: 1e3, ribu: 1e3, jt: 1e6, juta: 1e6 };

// Kembalikan angka bulat, atau NaN kalau formatnya tidak valid / ambigu
function parseNominal(raw) {
	const s = String(raw || '').toLowerCase().trim();
	// dengan satuan: "5k", "2jt", "1,5jt" → titik/koma dianggap desimal
	let mm = s.match(/^(\d+(?:[.,]\d+)?)(k|rb|ribu|jt|juta)$/);
	if (mm) return Math.round(parseFloat(mm[1].replace(',', '.')) * SATUAN[mm[2]]);
	// tanpa satuan: "5000", "5.000", "1,000,000" → titik/koma hanya pemisah ribuan
	if (/^\d+$/.test(s) || /^\d{1,3}(?:[.,]\d{3})+$/.test(s)) return parseInt(s.replace(/[.,]/g, ''), 10);
	return NaN;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
	// buang tag (@628xxx) dari argumen supaya boleh ditaruh di mana saja
	const tokens = args.filter((a) => !a.startsWith('@'));
	const tipe = TIPE[(tokens[0] || '').toLowerCase()];
	const usage = `💰 *ISI SALDO*\n\nContoh:\n• *${usedPrefix + command} uang 50000*\n• *${usedPrefix + command} bank 1.000.000*\n• *${usedPrefix + command} uang 2jt @user* (isi saldo orang lain)\n\nTipe: *uang* (dompet) atau *bank*`;

	if (!tipe) throw usage;
	if (!tokens[1]) throw `❌ Nominalnya belum diisi!\n\n${usage}`;
	// "5 000" akan terbaca 5 kalau dibiarkan → tolak daripada salah isi diam-diam
	if (tokens.length > 2) throw `❌ Nominal harus satu kata tanpa spasi (contoh: *50000* atau *50.000*), bukan *${tokens.slice(1).join(' ')}*.`;

	const nominal = parseNominal(tokens[1]);
	if (!Number.isSafeInteger(nominal)) throw `❌ Nominal *${tokens[1]}* tidak valid!\n\nPakai angka saja, misal *50000*, *50.000*, *5k*, atau *2jt*.`;
	if (nominal < 1) throw '❌ Nominal minimal 1 koin!';

	// penerima: tag → reply → diri sendiri
	const who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
	const user = global.db.data.users[who];
	if (!user) throw '❌ User itu belum ada di database bot (belum pernah chat dengan bot).';

	const sebelum = Number.isFinite(user[tipe.field]) ? user[tipe.field] : 0;
	if (!Number.isSafeInteger(sebelum + nominal)) throw '❌ Saldo terlalu besar, melebihi batas angka yang aman disimpan bot!';

	user[tipe.field] = sebelum + nominal;

	const self = who === m.sender;
	const teks =
		`✅ *SALDO BERHASIL DIISI*\n\n` +
		`👤 Penerima : ${self ? '*kamu*' : '@' + who.split('@')[0]}\n` +
		`➕ Ditambah : *${formatUang(nominal)} koin* (${tipe.label.slice(3)})\n` +
		`${'─'.repeat(28)}\n` +
		`👛 Dompet : *${formatUang(user.money)} koin*\n` +
		`🏦 Bank   : *${formatUang(user.bank)} koin*`;

	await conn.reply(m.chat, teks, m, { mentions: [who] });
};

handler.help = ['isisaldo <uang/bank> <nominal>'];
handler.tags = ['owner'];
handler.command = /^isisaldo$/i;
handler.owner = true;

export default handler;