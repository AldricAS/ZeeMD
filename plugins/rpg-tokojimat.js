// Daftar jimat: makin mahal, makin tinggi persen tangkal serangan & makin awet (durability)
// Nama-nama jimat diambil dari budaya, tradisi, dan cerita rakyat Indonesia
export const JIMAT_LIST = {
	kayu: {
		nama: '🪵 Jimat Kayu Stigi',
		harga: 15000,
		tangkal: 8,
		durability: 3,
		desc: 'Kayu stigi yang dibentuk seadanya, baru direndam air kembang sekali. Jimat termurah buat pemula.',
	},
	susuk: {
		nama: '📌 Susuk Penangkal',
		harga: 30000,
		tangkal: 12,
		durability: 4,
		desc: 'Konon dipasang di bawah kulit oleh dukun kampung untuk menolak ilmu hitam ringan.',
	},
	akik: {
		nama: '💍 Akik Kalimaya',
		harga: 50000,
		tangkal: 18,
		durability: 5,
		desc: 'Batu kalimaya yang sudah diisi dukun. Populer dipakai pejabat & pengusaha kelas menengah.',
	},
	rantai: {
		nama: '⛓️ Rantai Pamungkas',
		harga: 75000,
		tangkal: 24,
		durability: 6,
		desc: 'Rantai kuno warisan keluarga, dipercaya menahan ilmu santet ringan hingga sedang.',
	},
	macan: {
		nama: '🐅 Mata Macan Loreng',
		harga: 110000,
		tangkal: 30,
		durability: 7,
		desc: 'Berisi aura macan loreng dari hutan Jawa, bikin penyerang merasa gentar duluan.',
	},
	semar: {
		nama: '🎭 Jimat Semar Mesem',
		harga: 160000,
		tangkal: 38,
		durability: 9,
		desc: 'Jimat legendaris asal Jawa berbentuk wajah Semar. Awalnya buat pelet, tapi versi ini dimodif khusus menangkal serangan gaib.',
	},
	gandrung: {
		nama: '🌺 Jimat Gandrung Banyuwangi',
		harga: 200000,
		tangkal: 42,
		durability: 9,
		desc: 'Berasal dari tradisi Banyuwangi, dipercaya membuat aura pemakainya sulit ditembus niat jahat.',
	},
	badar: {
		nama: '⚪ Batu Badar Besi',
		harga: 250000,
		tangkal: 48,
		durability: 11,
		desc: 'Batu langka yang dipercaya masyarakat Nusantara bisa menetralisir racun dan ilmu hitam.',
	},
	keris: {
		nama: '🗡️ Pusaka Keris Mini',
		harga: 320000,
		tangkal: 55,
		durability: 12,
		desc: 'Replika kecil pusaka keris leluhur. Dipercaya punya tuah penjaga diri yang kuat.',
	},
	naga: {
		nama: '🐉 Jimat Sisik Naga',
		harga: 400000,
		tangkal: 60,
		durability: 13,
		desc: 'Jimat langka dari legenda naga Nusantara. Separuh lebih serangan yang masuk bisa ditangkal mentah-mentah.',
	},
	kalacakra: {
		nama: '🔱 Rajah Kalacakra',
		harga: 520000,
		tangkal: 66,
		durability: 14,
		desc: 'Rajah sakral yang konon dipakai para pendekar zaman dulu untuk berperang melawan ilmu hitam.',
	},
	kalimasada: {
		nama: '📜 Pusaka Kalimasada',
		harga: 650000,
		tangkal: 75,
		durability: 16,
		desc: 'Pusaka tersohor dalam tradisi pewayangan Jawa, dikenal sebagai lambang ketenangan dan benteng terkuat bagi pemiliknya.',
	},
};

let handler = async (m, { args, usedPrefix }) => {
	let user = global.db.data.users[m.sender];
	const type = (args[0] || '').toLowerCase();
	const jumlah = parseInt(args[1]) || 1;

	// Tampilkan daftar toko kalau tidak ada argumen
	if (!type) {
		let txt = `🧿 *TOKO JIMAT*\n`;
		txt += `${'─'.repeat(28)}\n`;
		txt += `Jimat berguna untuk *menangkal* serangan *.santet* atau *.merampok* dari orang lain. Setiap jimat punya:\n`;
		txt += `• 🛡️ *Tangkal* — persen kemungkinan serangan musuh gagal mengenaimu\n`;
		txt += `• 🔋 *Durability* — berapa kali jimat bisa menangkal sebelum hangus dan harus beli lagi\n\n`;

		for (const [key, j] of Object.entries(JIMAT_LIST)) {
			txt += `${j.nama}\n`;
			txt += `  🆔 Kode      : *${key}*\n`;
			txt += `  💰 Harga     : *Rp${j.harga.toLocaleString('id-ID')}*\n`;
			txt += `  🛡️ Tangkal   : *${j.tangkal}%*\n`;
			txt += `  🔋 Durability: *${j.durability}x* pakai\n`;
			txt += `  📝 ${j.desc}\n\n`;
		}

		txt += `${'─'.repeat(28)}\n`;
		txt += `👛 Uangmu: *Rp${(user.money || 0).toLocaleString('id-ID')}*\n\n`;

		if (user.jimat && user.jimat.key && JIMAT_LIST[user.jimat.key]) {
			let aktif = JIMAT_LIST[user.jimat.key];
			txt += `🧿 Jimat Aktif: *${aktif.nama}* (sisa pakai: *${user.jimat.sisa}x*)\n\n`;
		} else {
			txt += `🧿 Jimat Aktif: *Tidak ada*\n\n`;
		}

		txt += `📌 Cara beli:\n*${usedPrefix}belijimat <kode>*\nContoh: *${usedPrefix}belijimat akik*`;
		return m.reply(txt);
	}

	const jimat = JIMAT_LIST[type];
	if (!jimat) throw `❌ Jimat *${type}* tidak ada di toko!\n\nKode yang tersedia: ${Object.keys(JIMAT_LIST).join(', ')}\nKetik *${usedPrefix}belijimat* untuk lihat daftar lengkap.`;
	if (jumlah < 1) throw '❌ Jumlah harus minimal 1!';

	const totalHarga = jimat.harga * jumlah;
	if ((user.money || 0) < totalHarga) throw `❌ Uang tidak cukup!\n💰 Butuh: *Rp${totalHarga.toLocaleString('id-ID')}*\n👛 Uangmu: *Rp${(user.money || 0).toLocaleString('id-ID')}*`;

	user.money -= totalHarga;

	// Kalau jimat aktif sama jenisnya, durability ditambah (numpuk). Kalau beda, jimat lama ditimpa.
	if (user.jimat && user.jimat.key === type) {
		user.jimat.sisa += jimat.durability * jumlah;
	} else {
		user.jimat = { key: type, sisa: jimat.durability * jumlah };
	}

	m.reply(
		`✅ *Pembelian Jimat Berhasil!*\n\n` +
			`${jimat.nama}\n` +
			`💰 Dibayar    : *Rp${totalHarga.toLocaleString('id-ID')}*\n` +
			`🛡️ Tangkal   : *${jimat.tangkal}%*\n` +
			`🔋 Total Sisa Pakai: *${user.jimat.sisa}x*\n` +
			`👛 Sisa Uang  : *Rp${user.money.toLocaleString('id-ID')}*\n\n` +
			`Jimat akan otomatis aktif melindungimu dari santet/rampok sampai habis pakai.`
	);
};

handler.help = ['belijimat', 'belijimat <kode> <jumlah>'];
handler.tags = ['rpg'];
handler.command = /^(belijimat|tokojimat|jimat)$/i;
handler.register = true;

export default handler;

// Helper yang dipakai plugin lain (santet, merampok, dll) untuk roll penangkalan jimat.
// Mengembalikan true kalau serangan ditangkal, false kalau lolos / tidak ada jimat.
export function rollTangkalJimat(user) {
	if (!user.jimat || !user.jimat.key || user.jimat.sisa <= 0) return false;
	const jimat = JIMAT_LIST[user.jimat.key];
	if (!jimat) return false;

	const tertangkal = Math.random() * 100 < jimat.tangkal;
	if (tertangkal) {
		user.jimat.sisa -= 1;
		if (user.jimat.sisa <= 0) user.jimat = null; // jimat hangus
	}
	return tertangkal;
}