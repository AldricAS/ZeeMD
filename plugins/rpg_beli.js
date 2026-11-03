// Daftar item yang bisa dibeli beserta harganya
const SHOP = {
	potion: {
		nama: '🧪 Potion',
		harga: 5000,
		field: 'potion',
		desc: 'Memulihkan 30 HP',
	},
	diamond: {
		nama: '💎 Diamond',
		harga: 50000,
		field: 'diamond',
		desc: 'Material craft langka',
	},
	emerald: {
		nama: '💚 Emerald',
		harga: 30000,
		field: 'emerald',
		desc: 'Material craft berharga',
	},
	limit: {
		nama: '🎫 Limit',
		harga: 100,
		field: 'limit',
		desc: 'Buat pakai command yang butuh limit',
	},
};

let handler = async (m, { args, usedPrefix, command }) => {
	let user = global.db.data.users[m.sender];
	const type = (args[0] || '').toLowerCase();
	const jumlah = parseInt(args[1]) || 1;

	// Tampilkan daftar shop kalau tidak ada argumen
	if (!type) {
		let txt = `🛒 *TOKO ITEM*\n`;
		txt += `${'─'.repeat(28)}\n\n`;
		for (const [key, item] of Object.entries(SHOP)) {
			txt += `${item.nama}\n`;
			txt += `  💰 Harga : *${item.harga.toLocaleString('id-ID')} koin*\n`;
			txt += `  📝 Info  : ${item.desc}\n\n`;
		}
		txt += `${'─'.repeat(28)}\n`;
		txt += `👛 Uangmu: *${(user.money || 0).toLocaleString('id-ID')} koin*\n\n`;
		txt += `📌 Cara beli:\n*.buy potion 5* - Beli 5 potion\n*.buy diamond 1* - Beli 1 diamond\n*.buy limit 10* - Beli 10 limit`;
		return m.reply(txt);
	}

	const item = SHOP[type];
	if (!item) throw `❌ Item *${type}* tidak ada di toko!\n\nItem yang tersedia: ${Object.keys(SHOP).join(', ')}`;
	if (jumlah < 1) throw '❌ Jumlah harus minimal 1!';
	if (type === 'limit' && jumlah > 1000) throw '❌ Maksimal beli *1000 limit* sekali transaksi!';

	const totalHarga = item.harga * jumlah;
	if ((user.money || 0) < totalHarga) throw `❌ Uang tidak cukup!\n💰 Butuh: *${totalHarga.toLocaleString('id-ID')} koin*\n👛 Uangmu: *${(user.money || 0).toLocaleString('id-ID')} koin*`;

	user.money -= totalHarga;
	user[item.field] = (user[item.field] || 0) + jumlah;

	const labelStok = type === 'limit' ? '🎫 Total limit sekarang' : `📦 Stok ${item.nama}`;
	m.reply(`✅ *Pembelian Berhasil!*\n\n${item.nama} × *${jumlah}*\n💰 Dibayar: *${totalHarga.toLocaleString('id-ID')} koin*\n👛 Sisa uang: *${user.money.toLocaleString('id-ID')} koin*\n${labelStok}: *${user[item.field]}*`);
};

handler.help = ['buy', 'buy <item> <jumlah>'];
handler.tags = ['rpg'];
handler.command = /^(buy|beli|shop|toko)$/i;
handler.register = true;

export default handler;