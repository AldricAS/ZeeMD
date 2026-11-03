// ==============================
// _tandai.js
// ==============================

// Tracking kapan terakhir kali tiap orang ngirim pesan per grup
// { [groupJid]: { [senderJid]: timestamp } }
if (!global._lastSeen) global._lastSeen = {};

const COOLDOWN = 30 * 60 * 1000; // 30 menit diam = dianggap "balik lagi"

const pesanMuncul = [
	`🚨 *— W A S P A D A —*\n\n_"Kencangkan sabuk pengaman kalian..._\n_orang yang ditandai *{tanda}* baru saja muncul."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n👤 @{sender} *TELAH KEMBALI!*`,

	`⚠️ *— S I A G A  P E N U H —*\n\n_"Hati-hati dengan langkah kalian..._\n_orang yang ditandai *{tanda}* baru saja membuka mata."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n👤 @{sender} *AKTIF SEKARANG!*`,

	`🔔 *— P E R I N G A T A N  D I N I —*\n\n_"Alarm berbunyi keras..._\n_orang yang ditandai *{tanda}* baru saja bergerak."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n👤 @{sender} *SUDAH ONLINE!*`,

	`💀 *— D I A  K E M B A L I —*\n\n_"Angin berhenti berhembus..._\n_orang yang ditandai *{tanda}* akhirnya menampakkan diri."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n👤 @{sender} *MUNCUL DARI KESUNYIAN!*`,

	`🎯 *— T A R G E T  T E R L A C A K —*\n\n_"Jangan lengah kalian..._\n_orang yang ditandai *{tanda}* baru saja meninggalkan jejaknya."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n👤 @{sender} *TERDETEKSI!*`,
];

let handler = async (m, { conn, usedPrefix, isAdmin, isOwner }) => {
	if (!m.isGroup) return m.reply('🌑 Fitur ini hanya untuk grup.');
	if (!isAdmin && !isOwner) return m.reply('🔒 Hanya *admin* yang bisa menggunakan fitur ini.');

	const chat = global.db.data.chats[m.chat];
	if (!chat.tandaList) chat.tandaList = {};

	const args = m.text.trim().split(' ');
	const cmd = args[0].replace(/^[^a-z0-9]/i, '').toLowerCase();

	const target =
		m.mentionedJid?.[0] ||
		(args[1]?.includes('@') ? args[1].replace('@', '') + '@s.whatsapp.net' : null);

	if (cmd === 'tandain') {
		if (!target) return m.reply(`❌ Tag orangnya dulu!\nContoh: *${usedPrefix}tandain (tanda) @orangnya*`);

		const tandaArgs = args.slice(1).filter(a => !a.startsWith('@'));
		const pesanTanda = tandaArgs.join(' ') || '(tidak ada keterangan)';

		chat.tandaList[target] = {
			tanda: pesanTanda,
			oleh: m.sender,
			waktu: Date.now(),
		};

		await conn.sendMessage(m.chat, {
			text:
				`📌 *— T A N D A I —*\n\n` +
				`_"Seseorang sedang dinantikan di sini..._\n` +
				`_dan ketika ia bicara, semua akan tahu."_\n\n` +
				`┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
				`👤 Target: @${target.split('@')[0]}\n` +
				`📝 Tanda: *${pesanTanda}*\n\n` +
				`💡 Notif otomatis saat dia balik ngechat setelah lama diam.`,
			mentions: [target, m.sender],
		});

	} else if (cmd === 'hapustanda') {
		if (!target) return m.reply(`❌ Tag orangnya dulu!\nContoh: *${usedPrefix}hapustanda @orangnya*`);

		if (!chat.tandaList[target]) {
			return await conn.sendMessage(m.chat, {
				text: `❌ @${target.split('@')[0]} tidak sedang ditandai di grup ini.`,
				mentions: [target],
			});
		}

		const dataTanda = chat.tandaList[target];
		delete chat.tandaList[target];

		await conn.sendMessage(m.chat, {
			text:
				`🗑️ *— T A N D A  D I H A P U S —*\n\n` +
				`_"Tanda itu telah pergi,_\n` +
				`_seolah tak pernah ada."_\n\n` +
				`┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
				`👤 @${target.split('@')[0]} tidak lagi ditandai.\n` +
				`📝 Tanda lama: *${dataTanda.tanda}*`,
			mentions: [target],
		});

	} else if (cmd === 'listtanda') {
		const list = chat.tandaList;
		if (!list || Object.keys(list).length === 0) {
			return m.reply(`📋 Tidak ada member yang sedang ditandai di grup ini.`);
		}

		const mentions = Object.keys(list);
		const isi = mentions.map((jid, i) => {
			const d = list[jid];
			return `${i + 1}. @${jid.split('@')[0]}\n   📝 ${d.tanda}`;
		}).join('\n\n');

		await conn.sendMessage(m.chat, {
			text:
				`📌 *— D A F T A R  T A N D A —*\n\n` +
				`${isi}\n\n` +
				`┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
				`Total: *${mentions.length} orang* ditandai`,
			mentions,
		});
	}
};

handler.before = async function (m, { conn }) {
	if (!m.isGroup) return;
	if (m.key?.fromMe) return;

	const chat = global.db.data.chats?.[m.chat];
	if (!chat?.tandaList) return;

	const data = chat.tandaList[m.sender];
	if (!data) return;

	const now = Date.now();

	// Init lastSeen untuk grup ini
	if (!global._lastSeen[m.chat]) global._lastSeen[m.chat] = {};

	const lastMsg = global._lastSeen[m.chat][m.sender] || 0;
	const lamaDiam = now - lastMsg;

	// Update lastSeen dulu
	global._lastSeen[m.chat][m.sender] = now;

	// Kalau belum lewat cooldown, skip (masih aktif ngobrol)
	if (lamaDiam < COOLDOWN) return;

	// Sudah lama diam → trigger notif
	const senderNum = m.sender.split('@')[0];
	const template = pesanMuncul[Math.floor(Math.random() * pesanMuncul.length)];
	const teks = template
		.replace('{sender}', senderNum)
		.replace('{tanda}', data.tanda);

	await conn.sendMessage(
		m.chat,
		{ text: teks, mentions: [m.sender] },
		{ quoted: m }
	);
};

handler.help = ['tandain (tanda) @orang', 'hapustanda @orang', 'listtanda'];
handler.tags = ['group'];
handler.command = /^(tandain|hapustanda|listtanda)$/i;

export default handler;