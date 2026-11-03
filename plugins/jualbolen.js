const PEMBELI = [
	'Bu Siti', 'Pak Hendra', 'Mbak Rini', 'Anak Kos Sebelah', 'Pak RT',
	'Bu Lurah', 'Mbak Cantik dari Seberang', 'Pak Satpam', 'Ibu Pengajian',
	'Mas Gojek', 'Nenek Ujung Gang', 'Anak SD', 'Bapak Polisi', 'Tante Arisan',
	'Om Tajir', 'Rombongan Wisata', 'Anak Muda Kekinian', 'Ibu-ibu PKK',
];

const BAHAN = [
	'tepung terigu', 'gula pasir', 'telur ayam', 'mentega', 'susu kental manis',
	'coklat batang', 'keju cheddar', 'pisang ambon', 'vanili', 'baking powder',
];

const NOLAKU = [
	'Orang-orang pada lewat tapi gak ada yang mampir... 😔',
	'Ada yang liat-liat tapi buru-buru pergi... 😅',
	'Sepi banget, angin aja yang mampir... 🌬️',
	'Kucing tetangga malah yang nongkrong di depan warung... 🐱',
	'Ada yang tanya harga tapi langsung pergi... 😭',
];

function clockString(ms) {
	const h = Math.floor((ms / 3600000) % 24);
	const m = Math.floor((ms / 60000) % 60);
	const s = Math.floor((ms / 1000) % 60);
	return [h !== 0 ? `${h}j` : '', m !== 0 ? `${m}m` : '', `${s}d`].filter(Boolean).join(' ');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let handler = async (m) => {
	const user = global.db.data.users[m.sender];
	const now = Date.now();
	const cooldown = 30 * 60 * 1000;
	const diff = now - (user.lastjualbolen || 0);

	if (diff < cooldown) return m.reply(`⏳ Kamu masih kelelahan bikin bolen!\nIstirahat dulu *${clockString(cooldown - diff)}* lagi.`);

	const jumlahBuat = Math.floor(Math.random() * 11) + 5;
	const bahan1 = BAHAN[Math.floor(Math.random() * BAHAN.length)];
	const bahan2 = BAHAN.filter(b => b !== bahan1)[Math.floor(Math.random() * (BAHAN.length - 1))];
	const bahan3 = BAHAN.filter(b => b !== bahan1 && b !== bahan2)[Math.floor(Math.random() * (BAHAN.length - 2))];

	// === ALUR BIKIN BOLEN ===
	await m.reply(
`🧑‍🍳 *JUALAN BOLEN*

Kamu memutuskan untuk bikin bolen hari ini!
Pertama-tama, kamu ke dapur dan mulai menyiapkan bahan-bahan...

🛒 Bahan yang disiapkan:
• ${bahan1}
• ${bahan2}
• ${bahan3}
• dan bahan lainnya...

_Mengaduk adonan..._`
	);
	await sleep(3000);

	await m.reply(
`🥣 *Mengaduk Adonan...*

Kamu mulai mencampur semua bahan dengan telaten.
Adonannya pelan-pelan jadi mulus dan wangi~

🎵 _"Sambil nyanyi-nyanyi kecil biar semangat!"_

Adonan sudah siap, sekarang waktunya dibentuk!
Membentuk *${jumlahBuat} bolen*...`
	);
	await sleep(3000);

	await m.reply(
`🔥 *Memanggang di Oven...*

Satu per satu bolen dimasukkan ke oven.
Suhu oven diatur *180°C* biar matengnya sempurna.

⏱️ _Menunggu 20 menit..._

Wangi bolen mulai menyebar ke seluruh rumah~ 🤤
Tetangga-tetangga pada ngintip dari pagar 😂`
	);
	await sleep(4000);

	await m.reply(
`✨ *Bolen Matang!*

*TING!* — Oven berbunyi tanda bolen sudah matang!

*${jumlahBuat} bolen* keluar dengan sempurna! 🤩
Kulit luar keemasan, dalamnya lembut dan lumer~

Setelah didinginkan, kamu mulai menata bolen di tampah dan bersiap ke warung...

🛵 _Meluncur ke warung..._`
	);
	await sleep(3000);

	await m.reply(
`🏪 *Warung Bolen Kamu Buka!*

Kamu menata *${jumlahBuat} bolen* di etalase warung dengan rapi.
Dipasang juga tulisan: *"BOLEN FRESH FROM OVEN - 2.000/pcs"*

Tidak lama kemudian... kamu mulai nunggu pembeli.
👀 _Rate pelanggan datang: 40%_`
	);
	await sleep(3000);

	// === PROSES JUALAN dengan rate 40% per slot ===
	let sisaBolen = jumlahBuat;
	let totalUang = 0;
	let logPembeli = [];
	const SLOT_JUALAN = 8; // 8 kesempatan datang pembeli

	for (let i = 0; i < SLOT_JUALAN; i++) {
		if (sisaBolen <= 0) break;

		const adaPembeli = Math.random() * 100 <= 40;

		if (!adaPembeli) {
			const pesanSepi = NOLAKU[Math.floor(Math.random() * NOLAKU.length)];
			await m.reply(`😐 *Menunggu pembeli...*\n\n${pesanSepi}`);
			await sleep(2000);
			continue;
		}

		const pembeli = PEMBELI[Math.floor(Math.random() * PEMBELI.length)];
		const maxBeli = Math.min(sisaBolen, Math.floor(Math.random() * 3) + 1);
		const bayar = maxBeli * 2000;

		sisaBolen -= maxBeli;
		totalUang += bayar;
		logPembeli.push(`👤 *${pembeli}* beli *${maxBeli} bolen* → *+${bayar.toLocaleString('id-ID')} koin*`);

		await m.reply(
`🔔 *Ada Pembeli!*

👤 *${pembeli}* datang ke warungmu...
_"Mas/Mba, beli bolen ${maxBeli} ya!"_

💰 Bayar: *${bayar.toLocaleString('id-ID')} koin*
📦 Sisa bolen: *${sisaBolen}*`
		);
		await sleep(2500);
	}

	// === HASIL AKHIR ===
	user.money = (user.money || 0) + totalUang;
	user.lastjualbolen = now;
	user.exp = (user.exp || 0) + Math.floor(totalUang / 200);

	const terjual = jumlahBuat - sisaBolen;
	const sisaGakLaku = sisaBolen;

	await m.reply(
`${sisaGakLaku === 0 ? '🎉 *BOLEN HABIS TERJUAL!*' : sisaGakLaku === jumlahBuat ? '😢 *TIDAK ADA YANG BELI...*' : '🏪 *WARUNG TUTUP!*'}

📋 *Rekap Penjualan:*
${logPembeli.length > 0 ? logPembeli.join('\n') : '_Tidak ada pembeli hari ini..._'}

${'─'.repeat(28)}
🍞 Bolen dibuat     : *${jumlahBuat} pcs*
✅ Bolen terjual    : *${terjual} pcs*
❌ Bolen sisa       : *${sisaGakLaku} pcs* ${sisaGakLaku > 0 ? '_(basi, dibuang)_ 😢' : ''}
💰 Total pendapatan : *+${totalUang.toLocaleString('id-ID')} koin*
⭐ EXP didapat      : *+${Math.floor(totalUang / 200)}*
👛 Uang sekarang    : *${user.money.toLocaleString('id-ID')} koin*

${sisaGakLaku === 0 ? '_Semua laku! Kamu beruntung hari ini~ 🍀_' : sisaGakLaku === jumlahBuat ? '_Apes banget... tidak ada yang beli sama sekali. Coba lagi besok!_ 😔' : '_Lumayan, tapi masih ada yang sisa. Semangat besok!_ 💪'}
⏳ Cooldown: *30 menit*`
	);
};

handler.help = ['jualbolen'];
handler.tags = ['rpg'];
handler.command = /^(jualbolen|bolen)$/i;
handler.register = true;

export default handler;