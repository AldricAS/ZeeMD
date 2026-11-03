function formatUang(n) {
	return (n || 0).toLocaleString('id-ID');
}

let handler = async (m, { args, usedPrefix, command }) => {
	let user = global.db.data.users[m.sender];

	// ========================
	// LIHAT SALDO BANK
	// ========================
	if (command === 'bank' && !args[0]) {
		let txt = `🏦 *BANK KAMU*\n`;
		txt += `${'─'.repeat(28)}\n\n`;
		txt += `👛 Dompet : *${formatUang(user.money)} koin*\n`;
		txt += `🏦 Bank   : *${formatUang(user.bank)} koin*\n`;
		txt += `${'─'.repeat(28)}\n`;
		txt += `📌 *.nabung <jumlah>* - Simpan uang ke bank\n📌 *.tarik <jumlah>* - Tarik uang dari bank\n\n`;
		txt += `💡 Uang di bank aman dari *.merampok*!`;
		return m.reply(txt);
	}

	// ========================
	// NABUNG (dompet -> bank)
	// ========================
	if (command === 'nabung' || command === 'tabung') {
		const arg = (args[0] || '').toLowerCase();
		let jumlah = arg === 'semua' || arg === 'all' ? user.money || 0 : parseInt(args[0]);

		if (!jumlah || isNaN(jumlah)) throw `❌ Masukkan jumlah yang mau ditabung!\n\nContoh:\n*${usedPrefix}nabung 5000*\n*${usedPrefix}nabung semua*`;
		if (jumlah < 1) throw '❌ Jumlah minimal 1 koin!';
		if ((user.money || 0) < jumlah) throw `❌ Uang di dompet tidak cukup!\n👛 Dompet: *${formatUang(user.money)} koin*`;

		user.money -= jumlah;
		user.bank = (user.bank || 0) + jumlah;

		return m.reply(`✅ *Berhasil menabung!*\n\n💰 Ditabung : *${formatUang(jumlah)} koin*\n👛 Sisa dompet : *${formatUang(user.money)} koin*\n🏦 Saldo bank : *${formatUang(user.bank)} koin*`);
	}

	// ========================
	// TARIK (bank -> dompet)
	// ========================
	if (command === 'tarik') {
		const arg = (args[0] || '').toLowerCase();
		let jumlah = arg === 'semua' || arg === 'all' ? user.bank || 0 : parseInt(args[0]);

		if (!jumlah || isNaN(jumlah)) throw `❌ Masukkan jumlah yang mau ditarik!\n\nContoh:\n*${usedPrefix}tarik 5000*\n*${usedPrefix}tarik semua*`;
		if (jumlah < 1) throw '❌ Jumlah minimal 1 koin!';
		if ((user.bank || 0) < jumlah) throw `❌ Saldo bank tidak cukup!\n🏦 Bank: *${formatUang(user.bank)} koin*`;

		user.bank -= jumlah;
		user.money = (user.money || 0) + jumlah;

		return m.reply(`✅ *Berhasil menarik uang!*\n\n💰 Ditarik : *${formatUang(jumlah)} koin*\n👛 Saldo dompet : *${formatUang(user.money)} koin*\n🏦 Sisa bank : *${formatUang(user.bank)} koin*`);
	}
};

handler.help = ['bank', 'nabung <jumlah>', 'tarik <jumlah>'];
handler.tags = ['rpg'];
handler.command = /^(bank|nabung|tabung|tarik)$/i;
handler.register = true;

export default handler;