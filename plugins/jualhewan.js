// Harga jual hewan per ekor
const HARGA = {
	ayam:      500,
	kambing:   1500,
	babi:      2000,
	kerbau:    2500,
	sapi:      3000,
	babihutan: 2200,
	monyet:    1800,
	buaya:     4000,
	panda:     6000,
	banteng:   3500,
	gajah:     7000,
	harimau:   8000,
};

const NAMA = {
	ayam:      '🐔 Ayam',
	kambing:   '🐐 Kambing',
	babi:      '🐷 Babi',
	kerbau:    '🐃 Kerbau',
	sapi:      '🐄 Sapi',
	babihutan: '🐗 Babi Hutan',
	monyet:    '🐒 Monyet',
	buaya:     '🐊 Buaya',
	panda:     '🐼 Panda',
	banteng:   '🐂 Banteng',
	gajah:     '🐘 Gajah',
	harimau:   '🐯 Harimau',
};

let handler = async (m, { text, usedPrefix, command }) => {
	let user = global.db.data.users[m.sender];

	// ========================
	// LIHAT KANDANG + HARGA
	// ========================
	if (command === 'jualhewan' && !text) {
		let ada = false;
		let txt = `🐾 *KANDANG KAMU*\n`;
		txt += `${'─'.repeat(30)}\n`;
		txt += `${'Hewan'.padEnd(16)}${'Jumlah'.padEnd(10)}Harga/Ekor\n`;
		txt += `${'─'.repeat(30)}\n`;

		for (const [key, namaHewan] of Object.entries(NAMA)) {
			const jumlah = user[key] || 0;
			if (jumlah > 0) {
				ada = true;
				txt += `${namaHewan.padEnd(14)} ${String(jumlah + ' ekor').padEnd(10)} ${HARGA[key].toLocaleString('id-ID')} koin\n`;
			}
		}

		if (!ada) {
			txt += `\n_Kandang kamu kosong! Isi dulu dengan berburu._\n`;
		}

		txt += `${'─'.repeat(30)}\n`;
		txt += `💰 Uang kamu: *${(user.money || 0).toLocaleString('id-ID')} koin*\n\n`;
		txt += `📌 *Cara jual:*\n`;
		txt += `• *.jualhewan ayam 5* - Jual 5 ayam\n`;
		txt += `• *.jualhewan sapi all* - Jual semua sapi\n`;
		txt += `• *.jualhewan all* - Jual semua hewan`;

		return m.reply(txt);
	}

	// ========================
	// JUAL SEMUA HEWAN
	// ========================
	if (command === 'jualhewan' && text.toLowerCase() === 'all') {
		let totalDapat = 0;
		let detail = [];

		for (const [key] of Object.entries(HARGA)) {
			const jumlah = user[key] || 0;
			if (jumlah > 0) {
				const hasil = jumlah * HARGA[key];
				totalDapat += hasil;
				detail.push(`${NAMA[key]}: ${jumlah} ekor × ${HARGA[key].toLocaleString('id-ID')} = *${hasil.toLocaleString('id-ID')} koin*`);
				user[key] = 0;
			}
		}

		if (!totalDapat) throw `❌ Kandang kamu kosong! Tidak ada hewan yang bisa dijual.`;

		user.money = (user.money || 0) + totalDapat;

		let txt = `✅ *SEMUA HEWAN TERJUAL!*\n\n`;
		txt += detail.join('\n');
		txt += `\n\n${'─'.repeat(28)}\n`;
		txt += `💰 Total dapat: *${totalDapat.toLocaleString('id-ID')} koin*\n`;
		txt += `👛 Uang sekarang: *${user.money.toLocaleString('id-ID')} koin*`;

		return m.reply(txt);
	}

	// ========================
	// JUAL SPESIFIK
	// ========================
	if (command === 'jualhewan' && text) {
		const args = text.trim().toLowerCase().split(/\s+/);
		const namaInput = args[0];
		const jumlahInput = args[1];

		// Cari hewan
		const key = Object.keys(HARGA).find(k => k === namaInput || NAMA[k].toLowerCase().includes(namaInput));
		if (!key) throw `❌ Hewan *${namaInput}* tidak dikenal!\nHewan yang bisa dijual: ${Object.keys(HARGA).join(', ')}`;

		const stok = user[key] || 0;
		if (stok === 0) throw `❌ Kamu tidak punya *${NAMA[key]}* di kandang!`;

		let jumlah;
		if (!jumlahInput || jumlahInput === 'all') {
			jumlah = stok;
		} else {
			jumlah = parseInt(jumlahInput);
			if (isNaN(jumlah) || jumlah <= 0) throw `❌ Jumlah tidak valid! Masukkan angka atau *all*.`;
			if (jumlah > stok) throw `❌ Kamu hanya punya *${stok} ekor* ${NAMA[key]}!`;
		}

		const total = jumlah * HARGA[key];
		user[key] -= jumlah;
		user.money = (user.money || 0) + total;

		return m.reply(`✅ *Berhasil menjual!*\n\n${NAMA[key]}: *${jumlah} ekor* × ${HARGA[key].toLocaleString('id-ID')} koin\n💰 Dapat: *${total.toLocaleString('id-ID')} koin*\n\n👛 Uang sekarang: *${user.money.toLocaleString('id-ID')} koin*\n🐾 Sisa ${NAMA[key]}: *${user[key]} ekor*`);
	}
};

handler.help = ['jualhewan', 'jualhewan <hewan> <jumlah/all>', 'jualhewan all'];
handler.tags = ['rpg'];
handler.command = /^(jualhewan|jualternak)$/i;
handler.register = true;

export default handler;