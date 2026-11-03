function formatUang(n) {
	return (n || 0).toLocaleString('id-ID');
}

function formatTanggal(ms) {
	if (!ms || ms === -1) return 'Belum diset';
	const d = new Date(ms);
	const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
	return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

async function getProfilePicUrl(conn, jid) {
	try {
		return await conn.profilePictureUrl(jid, 'image');
	} catch {
		return null;
	}
}

let handler = async (m, { conn }) => {
	// Tentukan target: tag > reply/quote > diri sendiri
	let targetJid = m.sender;
	if (m.mentionedJid && m.mentionedJid[0]) targetJid = conn.getJid(m.mentionedJid[0]);
	else if (m.quoted) targetJid = conn.getJid(m.quoted.sender);

	const user = global.db.data.users[targetJid];
	if (!user) throw '❌ User tersebut belum terdaftar di database bot.';

	const nomor = targetJid.split('@')[0];
	const nama = user.name || 'Tanpa Nama';
	const umur = user.age && user.age !== -1 ? `${user.age} tahun` : 'Belum diset';
	const level = user.level || 1;
	const exp = user.exp || 0;
	const saldo = formatUang(user.money);
	const limit = user.limit || 0;
	const health = user.health ?? 100;
	const role = user.role || 'Newbie';
	const premium = user.premium ? '⭐ Ya' : 'Tidak';
	const terdaftar = user.registered ? '✅ Sudah' : '❌ Belum';
	const warn = user.warn || 0;

	let caption = `👤 *INFO USER*\n`;
	caption += `${'─'.repeat(28)}\n\n`;
	caption += `📛 Nama       : *${nama}*\n`;
	caption += `📱 Nomor      : *${nomor}*\n`;
	caption += `🎂 Umur       : *${umur}*\n`;
	caption += `🏷️ Role       : *${role}*\n`;
	caption += `📊 Level      : *${level}* (${exp} XP)\n`;
	caption += `💰 Saldo      : *${saldo} koin*\n`;
	caption += `🏦 Bank       : *${formatUang(user.bank)} koin*\n`;
	caption += `🎫 Limit      : *${limit}*\n`;
	caption += `❤️ Kesehatan  : *${health}/100*\n`;
	caption += `⭐ Premium    : *${premium}*\n`;
	caption += `📝 Terdaftar  : *${terdaftar}*\n`;
	if (user.registered) caption += `📅 Sejak      : *${formatTanggal(user.regTime)}*\n`;
	caption += `⚠️ Warn       : *${warn}*\n`;
	caption += `${'─'.repeat(28)}`;

	const picUrl = await getProfilePicUrl(conn, targetJid);

	if (picUrl) {
		await conn.sendMessage(m.chat, { image: { url: picUrl }, caption, mentions: [targetJid] }, { quoted: m });
	} else {
		await m.reply(`${caption}\n\n_📷 Tidak ada foto profil_`, null, { mentions: [targetJid] });
	}
};

handler.help = ['info', 'info @user'];
handler.tags = ['info'];
handler.command = /^(info|profile|profil)$/i;
handler.register = true;

export default handler;