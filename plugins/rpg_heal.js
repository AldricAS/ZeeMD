const HEAL_PER_POTION = 30;
const MAX_HEALTH = 100;

let handler = async (m, { args, usedPrefix, command }) => {
	let user = global.db.data.users[m.sender];

	if ((user.potion || 0) < 1) throw `❌ Kamu tidak punya potion!\nBeli dengan *.buy potion (jumlah)*\n💰 Harga: *5.000 koin* per potion`;

	if ((user.health || 0) >= MAX_HEALTH) throw `❤️ HP kamu sudah penuh! *(${user.health}/${MAX_HEALTH})*`;

	// Hitung berapa potion yang dipakai
	const jumlah = parseInt(args[0]) || 1;
	if (jumlah < 1) throw 'Jumlah potion minimal 1!';
	if (jumlah > (user.potion || 0)) throw `❌ Potion kamu cuma *${user.potion}*!`;

	const hpSebelum = user.health || 0;
	const potionDipakai = Math.min(jumlah, user.potion);
	const tambahHp = potionDipakai * HEAL_PER_POTION;
	const hpSesudah = Math.min(MAX_HEALTH, hpSebelum + tambahHp);
	const hpNaik = hpSesudah - hpSebelum;

	// Hitung potion yang benar-benar terpakai
	const potionTerpakai = Math.ceil(hpNaik / HEAL_PER_POTION);

	user.health = hpSesudah;
	user.potion = (user.potion || 0) - potionTerpakai;

	// Bar HP visual
	const filled = Math.round(hpSesudah / 10);
	const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

	m.reply(
`💊 *HEAL BERHASIL!*

❤️ HP: *${hpSebelum}* → *${hpSesudah}/${MAX_HEALTH}*
[${bar}]

🧪 Potion dipakai : *${potionTerpakai}*
❤️ HP dipulihkan  : *+${hpNaik}*
🧪 Sisa potion    : *${user.potion}*

${hpSesudah >= 80 ? '✅ Kamu sudah siap berpetualang!' : `⚠️ HP masih kurang dari 80, butuh *${Math.ceil((80 - hpSesudah) / HEAL_PER_POTION)}* potion lagi untuk petualang!`}`
	);
};

handler.help = ['heal', 'heal <jumlah potion>'];
handler.tags = ['rpg'];
handler.command = /^(heal|sembuh|pulihkan)$/i;
handler.register = true;

export default handler;