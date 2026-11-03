let handler = async (m, { args, usedPrefix, command, conn, participants }) => {
	// ========================
	// MODE: SEMUA (semua member grup)
	// ========================
	if (args[0] && args[0].toLowerCase() === 'semua') {
		if (!m.isGroup) throw '❌ Command *semua* cuma bisa dipakai di dalam grup!';

		const jumlahArg = args[1];
		if (!jumlahArg || !/^\d+$/.test(jumlahArg)) throw `❌ Masukkan jumlah limit yang mau diberikan!\n\nContoh:\n*${usedPrefix + command} semua 50*`;

		const jumlah = parseInt(jumlahArg);
		if (jumlah < 1) throw '❌ Jumlah limit minimal 1!';

		const targets = participants.map((p) => conn.getJid(p.id || p.jid)).filter((jid) => jid && jid in global.db.data.users);
		if (!targets.length) throw '❌ Tidak ada member grup yang terdaftar di database bot.';

		for (const jid of targets) {
			const u = global.db.data.users[jid];
			u.limit = (u.limit || 0) + jumlah;
		}

		return m.reply(`✅ *Berhasil membagikan limit ke seluruh grup!*\n\n👥 Total member : *${targets.length} orang*\n🎫 Masing-masing : *+${jumlah} limit*`, null, { mentions: targets });
	}

	let who;
	if (m.mentionedJid && m.mentionedJid[0]) {
		who = conn.getJid(m.mentionedJid[0]);
	} else if (m.quoted) {
		who = conn.getJid(m.quoted.sender);
	} else if (args[0] && /^\d+$/.test(args[0].replace(/[^0-9]/g, ''))) {
		who = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
	}

	if (!who) throw `❌ Tag orangnya dulu!\n\nContoh:\n*${usedPrefix + command}* @${m.sender.split('@')[0]} 50\n\nAtau berikan ke semua member grup:\n*${usedPrefix + command} semua 50*`;

	// Ambil argumen jumlah (bisa di posisi 0 atau 1 tergantung ada mention/nomor manual atau nggak)
	const jumlahArg = args.find((a) => /^\d+$/.test(a));
	if (!jumlahArg) throw `❌ Masukkan jumlah limit yang mau diberikan!\n\nContoh:\n*${usedPrefix + command}* @${m.sender.split('@')[0]} 50`;

	const jumlah = parseInt(jumlahArg);
	if (jumlah < 1) throw '❌ Jumlah limit minimal 1!';

	if (!(who in global.db.data.users)) throw '❌ User tersebut belum terdaftar di database bot.';

	let user = global.db.data.users[who];
	user.limit = (user.limit || 0) + jumlah;

	await m.reply(`✅ *Berhasil memberi limit!*\n\n👤 Ke     : @${who.split('@')[0]}\n🎫 Jumlah : *+${jumlah} limit*\n🎫 Total  : *${user.limit} limit*`, null, { mentions: [who] });

	if (who !== m.sender) {
		await conn.reply(who, `🎁 *Kamu diberi limit oleh owner!*\n\n🎫 Jumlah : *+${jumlah} limit*\n🎫 Total  : *${user.limit} limit*`, null);
	}
};

handler.help = ['berilimit @user <jumlah>', 'berilimit semua <jumlah>'];
handler.tags = ['owner'];
handler.command = /^(berilimit|addlimit|givelimit)$/i;
handler.group = false;
handler.owner = true;

export default handler;