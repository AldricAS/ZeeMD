const MOTOR = [
	'Yamaha R1', 'Honda CBR1000RR', 'Kawasaki Ninja ZX-10R',
	'Suzuki GSX-R1000', 'Ducati Panigale V4', 'BMW S1000RR',
];

const LAWAN = [
	'Bro Ucup si Raja Jalanan', 'Bang Jago dari Bekasi', 'Mas Ngebut dari Bandung',
	'Si Kilat dari Surabaya', 'Bro Drift dari Medan', 'Bang Speed dari Makassar',
	'Mas Turbo dari Semarang', 'Si Gas Pol dari Jogja', 'Bang Wheelie dari Depok',
];

const LOKASI = [
	'Jalan Tol Cipularang', 'Jalan Layang Antasari', 'Kawasan Industri Cilincing',
	'Jalan Bypass Ngurah Rai', 'Jalan Tol Jagorawi', 'Jalan Raya Puncak',
];

function clockString(ms) {
	const h = Math.floor((ms / 3600000) % 24);
	const m = Math.floor((ms / 60000) % 60);
	const s = Math.floor((ms / 1000) % 60);
	return [h !== 0 ? `${h}j` : '', m !== 0 ? `${m}m` : '', `${s}d`].filter(Boolean).join(' ');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

let handler = async (m) => {
	const user = global.db.data.users[m.sender];
	const now = Date.now();
	const cooldown = 60 * 60 * 1000;

	const diff = now - (user.lastbalapan || 0);
	if (diff < cooldown) return m.reply(`⏳ Motor masih panas!\nTunggu *${clockString(cooldown - diff)}* lagi.`);
	if ((user.health || 100) < 60) throw `❤️ HP kamu *${user.health}/100*, minimal 60 untuk balapan!\nGunakan *.heal* dulu.`;

	const motor = rand(MOTOR);
	const lawan = rand(LAWAN);
	const lokasi = rand(LOKASI);

	await m.reply(
`🏍️ *BALAPAN LIAR!*

🏍️ Motor  : *${motor}*
👊 Lawan  : *${lawan}*
📍 Lokasi : *${lokasi}*

🚦 *3... 2... 1... GOOOO!!!*
*VROOOOMMMM!!!* 💨`
	);
	await sleep(3000);

	// === CEK JATUH (40%) ===
	if (Math.random() * 100 <= 40) {
		const hpBerkurang = 60;
		user.health = Math.max(0, (user.health || 100) - hpBerkurang);
		user.lastbalapan = now;
		return m.reply(
`💥 *KECELAKAAN!*

Motor oleng di tikungan... *BRAAAKKK!!!*
Kamu terjatuh dan luka-luka parah!

❤️ HP : *${user.health + hpBerkurang}* → *${user.health}/100* (-${hpBerkurang})
${user.health < 20 ? '⚠️ HP KRITIS! Segera *.heal*!' : '💊 Istirahat dan *.heal* ya...'}
⏳ Cooldown: *1 jam*`
		);
	}

	// === CEK POLISI (50%) ===
	if (Math.random() * 100 <= 50) {
		const denda = 100000;
		if ((user.money || 0) < denda) {
			user.lastbalapan = now;
			return m.reply(
`🚨 *KETANGKEP POLISI!*

*"BERHENTI! POLISI!"* 🚔

Kamu ditilang dan harus bayar denda *100.000 koin*...
Tapi uangmu tidak cukup! Motor ditahan polisi 😭

💸 Uangmu : *${(user.money || 0).toLocaleString('id-ID')} koin* (kurang!)
⏳ Cooldown: *1 jam*`
			);
		}

		user.money = (user.money || 0) - denda;
		user.lastbalapan = now;
		return m.reply(
`🚨 *KETANGKEP POLISI!*

*"BERHENTI! POLISI!"* 🚔

Kamu kepepet dan akhirnya berhenti...
Kena tilang dan bayar denda di tempat!

💸 Denda       : *-${denda.toLocaleString('id-ID')} koin*
👛 Sisa uang   : *${user.money.toLocaleString('id-ID')} koin*
⏳ Cooldown: *1 jam*`
		);
	}

	// === CEK MENANG (30%) ===
	user.lastbalapan = now;

	if (Math.random() * 100 <= 30) {
		const hadiah = 500000;
		user.money = (user.money || 0) + hadiah;
		user.exp = (user.exp || 0) + 100;
		return m.reply(
`🏆 *MENANG!!!*

Kamu salip *${lawan}* di detik terakhir! 🏁

💰 Hadiah : *+${hadiah.toLocaleString('id-ID')} koin*
⭐ EXP    : *+100*
👛 Uang   : *${user.money.toLocaleString('id-ID')} koin*
⏳ Cooldown: *1 jam*`
		);
	}

	return m.reply(
`😞 *KALAH...*

*${lawan}* berhasil menyalip di tikungan terakhir!
Tidak ada hadiah untuk yang kalah... 💔

❤️ HP sekarang : *${user.health}/100*
⏳ Cooldown: *1 jam*`
	);
};

handler.help = ['balapan'];
handler.tags = ['rpg'];
handler.command = /^(balapan|race|balap)$/i;
handler.register = true;

export default handler;