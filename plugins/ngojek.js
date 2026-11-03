// Daftar lokasi untuk orderan
const LOKASI = [
	'Pasar Baru', 'Stasiun Kota', 'Mall Central', 'RS Umum', 'Kampus UI',
	'Bandara Soetta', 'Terminal Blok M', 'SPBU Pertamina', 'Kantor Polisi', 'Taman Kota',
	'Warung Makan Pak Budi', 'Apotek Kimia Farma', 'Sekolah SMA 1', 'Masjid Agung', 'Kos-kosan Bu Sari',
	'Indomaret Depan Gang', 'Alfamart Pojok', 'Bengkel Motor Jaya', 'Puskesmas Kelurahan', 'Lapangan Sepak Bola',
];

const PENUMPANG = [
	'Bu Siti', 'Pak Budi', 'Mbak Rini', 'Mas Doni', 'Ibu Hamid',
	'Bang Joko', 'Teh Neng', 'Om Hendra', 'Uni Fatma', 'Kang Asep',
	'Pak RT', 'Bu Lurah', 'Anak Kos', 'Mahasiswa', 'Ibu Belanja',
];

function clockString(ms) {
	const d = isNaN(ms) ? '--' : Math.floor(ms / 86400000);
	const h = isNaN(ms) ? '--' : Math.floor((ms / 3600000) % 24);
	const m = isNaN(ms) ? '--' : Math.floor((ms / 60000) % 60);
	const s = isNaN(ms) ? '--' : Math.floor((ms / 1000) % 60);
	return [d !== 0 ? `${d}h` : '', h !== 0 ? `${h}j` : '', m !== 0 ? `${m}m` : '', `${s}d`].filter(Boolean).join(' ');
}

function randomLokasi(exclude = '') {
	const filtered = LOKASI.filter(l => l !== exclude);
	return filtered[Math.floor(Math.random() * filtered.length)];
}

function randomPenumpang() {
	return PENUMPANG[Math.floor(Math.random() * PENUMPANG.length)];
}

// Estimasi jarak berdasarkan hash nama lokasi (konsisten)
function estimasiJarak(dari, ke) {
	const val = (dari.length * 3 + ke.length * 7) % 15 + 1;
	return val; // 1-15 km
}

let handler = async (m, { args }) => {
	const user = global.db.data.users[m.sender];
	const now = Date.now();
	const subCommand = (args[0] || '').toLowerCase();

	// ========================
	// TERIMA ORDERAN
	// ========================
	if (subCommand === 'terima') {
		if (!global.ngojekPending?.[m.sender]) throw '❌ Tidak ada orderan yang menunggu!\nKetik *.ngojek* dulu untuk cari orderan.';

		const order = global.ngojekPending[m.sender];
		delete global.ngojekPending[m.sender];

		// Kurangi HP sesuai jarak
		const hpBerkurang = order.jarak * 2;
		user.health = Math.max(0, (user.health || 100) - hpBerkurang);
		user.money = (user.money || 0) + order.bayaran;
		user.lastngojek = now;
		user.exp = (user.exp || 0) + Math.floor(order.bayaran / 100);

		await m.reply(
`🛵 *ORDERAN DITERIMA!*

👤 Penumpang : *${order.penumpang}*
📍 Dari      : *${order.dari}*
🏁 Ke        : *${order.ke}*
📏 Jarak     : *${order.jarak} km*
⏱️ Estimasi  : *${order.estimasi} menit*

🚀 _Meluncur..._`
		);

		await new Promise(r => setTimeout(r, 3000));

		await m.reply(
`✅ *ORDERAN SELESAI!*

💰 Bayaran   : *+${order.bayaran.toLocaleString('id-ID')} koin*
❤️ HP berkurang : *-${hpBerkurang} HP* (jarak ${order.jarak} km)
❤️ HP sekarang  : *${user.health}/100*
⭐ EXP didapat  : *+${Math.floor(order.bayaran / 100)}*

${user.health < 30 ? '⚠️ HP kamu kritis! Segera *.heal*' : user.health < 60 ? '💊 HP mulai berkurang, pertimbangkan untuk *.heal*' : '💪 Kondisi masih oke, lanjut ngojek!'}`
		);
		return;
	}

	// ========================
	// CANCEL ORDERAN
	// ========================
	if (subCommand === 'cancel') {
		if (!global.ngojekPending?.[m.sender]) throw '❌ Tidak ada orderan yang bisa di-cancel!';

		const order = global.ngojekPending[m.sender];
		delete global.ngojekPending[m.sender];

		// Cari orderan baru dengan rate 70%
		const cooldownCancel = 15 * 1000; // 15 detik
		await m.reply(`🔄 Orderan di-cancel, mencari orderan baru...\n\n🎲 Rate keberhasilan: *70%*`);

		await new Promise(r => setTimeout(r, 2000));

		const berhasil = Math.random() * 100 <= 70;

		if (!berhasil) {
			user.lastngojek = now + cooldownCancel - 30000; // cooldown 15 detik
			return m.reply(`😔 *Tidak ada orderan baru...*\n\nTidak ada yang minta ojek saat ini.\nCoba lagi dalam *15 detik*!`);
		}

		// Dapat orderan baru
		const dari = randomLokasi();
		const ke = randomLokasi(dari);
		const jarak = estimasiJarak(dari, ke);
		const estimasi = jarak * 3 + Math.floor(Math.random() * 10);
		const bayaran = jarak * 3000 + Math.floor(Math.random() * 5000);
		const penumpang = randomPenumpang();

		if (!global.ngojekPending) global.ngojekPending = {};
		global.ngojekPending[m.sender] = { dari, ke, jarak, estimasi, bayaran, penumpang };

		return m.reply(
`📲 *ORDERAN BARU MASUK!*

👤 Penumpang : *${penumpang}*
📍 Dari      : *${dari}*
🏁 Ke        : *${ke}*
📏 Jarak     : *${jarak} km*
⏱️ Estimasi  : *${estimasi} menit*
💰 Bayaran   : *${bayaran.toLocaleString('id-ID')} koin*
❤️ HP berkurang : *-${jarak * 2} HP*

Ketik *.ngojek terima* untuk terima orderan\nKetik *.ngojek cancel* untuk cari orderan lain`
		);
	}

	// ========================
	// CARI ORDERAN
	// ========================
	const cooldown = 30 * 1000; // 30 detik
	const diff = now - (user.lastngojek || 0);

	if (diff < cooldown) return m.reply(`⏳ Kamu baru aja ngojek!\nTunggu *${clockString(cooldown - diff)}* lagi ya.`);

	if (user.health < 20) throw `❤️ HP kamu terlalu rendah untuk ngojek! *(${user.health}/100)*\nIstirahat dulu dengan *.heal*`;

	// Hapus orderan pending lama kalau ada
	if (global.ngojekPending?.[m.sender]) delete global.ngojekPending[m.sender];

	await m.reply(`🛵 *Mencari orderan...*\n\n📡 _Nunggu ping dari aplikasi..._\n🎲 Rate keberhasilan: *60%*`);

	await new Promise(r => setTimeout(r, 3000));

	const berhasil = Math.random() * 100 <= 60;

	if (!berhasil) {
		user.lastngojek = now - (cooldown - 30000); // cooldown 30 detik
		return m.reply(`😔 *Tidak ada orderan...*\n\nSepiii banget hari ini, gak ada yang minta ojek.\nCoba lagi dalam *30 detik*!`);
	}

	// Dapat orderan!
	const dari = randomLokasi();
	const ke = randomLokasi(dari);
	const jarak = estimasiJarak(dari, ke);
	const estimasi = jarak * 3 + Math.floor(Math.random() * 10);
	const bayaran = jarak * 3000 + Math.floor(Math.random() * 5000);
	const penumpang = randomPenumpang();

	if (!global.ngojekPending) global.ngojekPending = {};
	global.ngojekPending[m.sender] = { dari, ke, jarak, estimasi, bayaran, penumpang };

	m.reply(
`📲 *ADA ORDERAN MASUK!*

👤 Penumpang : *${penumpang}*
📍 Dari      : *${dari}*
🏁 Ke        : *${ke}*
📏 Jarak     : *${jarak} km*
⏱️ Estimasi  : *${estimasi} menit*
💰 Bayaran   : *${bayaran.toLocaleString('id-ID')} koin*
❤️ HP berkurang : *-${jarak * 2} HP*

Ketik *.ngojek terima* untuk terima orderan\nKetik *.ngojek cancel* untuk cari orderan lain`
	);
};

handler.help = ['ngojek', 'ngojek terima', 'ngojek cancel'];
handler.tags = ['rpg'];
handler.command = /^ngojek$/i;
handler.register = true;

export default handler;