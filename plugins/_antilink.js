// ==============================
// _antilink.js
// ==============================

const linkRegex =
	/(?:https?:\/\/|www\.|bit\.ly|t\.ly|tinyurl\.com|s\.id|wa\.me|chat\.whatsapp\.com|discord\.gg|t\.me|youtu\.be|bit\.do)[^\s]*/gi;

const pesanEstetik = [
	`🌑 *— L I N K  T E R G E L A P —*\n\n_"Dilarang mengirim link di sini..._\n_saat ini akan ku tenggelamkan link ini_\n_ke dalam kesunyian malam."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n🕯️ Pesanmu telah dihapus, @{sender}`,

	`🌊 *— A N T I  L I N K —*\n\n_"Link itu telah pergi,_\n_hanyut bersama arus gelap_\n_yang tak pernah kembali..."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n🌙 Hapus demi ketenangan, @{sender}`,

	`🖤 *— F O R B I D D E N —*\n\n_"Tak ada link yang boleh hidup_\n_di bawah langit grup ini._\n_Aku yang menjaga malamnya."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n🌒 Pesanmu telah dilenyapkan, @{sender}`,

	`🕸️ *— K E S U N Y I A N  M A L A M —*\n\n_"Link ini mungkin indah,_\n_tapi grup ini bukan tempatnya._\n_Biarkan ia tenggelam dalam sunyi."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n🌑 Terdeteksi & dihapus, @{sender}`,

	`✦ *— A N T I - L I N K  A K T I F —*\n\n_"Ada yang mencoba memasukkan_\n_cahaya asing ke dalam kegelapan ini..._\n_Tidak kuizinkan."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n🌚 Terhapus sudah, @{sender}`,
];

const pesanAdmin = [
	`👑 *— P R I V I L E G E  A D M I N —*\n\n_"Bahkan malam tahu,_\n_ada yang berkuasa di sini._\n_Admin boleh berlalu."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n🌙 @{sender} adalah admin, link dibiarkan~`,

	`🔑 *— A K S E S  T E R I Z I N K A N —*\n\n_"Link ini tidak tenggelam..._\n_karena yang mengirimnya_\n_adalah penjaga malam itu sendiri."_\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n✨ @{sender} (Admin) — link aman~`,
];

let handler = async (m, { conn, usedPrefix, isAdmin, isOwner, isBotAdmin }) => {
	if (!m.isGroup) return m.reply('🌑 Fitur ini hanya tersedia di grup.');
	if (!isBotAdmin) return m.reply('🤖 Bot harus menjadi *admin* terlebih dahulu!');
	if (!isAdmin) return m.reply('🔒 Hanya *admin grup* yang bisa mengubah pengaturan ini.');

	const chat = global.db.data.chats[m.chat];
	const args = m.text.trim().split(' ');
	const status = args[1]?.toLowerCase();

	if (status === 'on') {
		chat.antilink = true;
		await m.reply(
			`🌑 *Anti Link — AKTIF*\n\n` +
			`_"Malam ini, tak ada link yang boleh hidup_\n` +
			`_di dalam grup ini tanpa izin."_\n\n` +
			`┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
			`✦ Link dari *member biasa* → dihapus otomatis\n` +
			`✦ Link dari *admin* → dibiarkan + notifikasi`
		);
	} else if (status === 'off') {
		chat.antilink = false;
		await m.reply(
			`🌕 *Anti Link — NONAKTIF*\n\n` +
			`_"Malam telah berlalu,_\n` +
			`_dan pintu kembali terbuka."_\n\n` +
			`┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
			`✦ Link kini bebas dikirim di grup ini.`
		);
	} else {
		const aktif = chat?.antilink;
		const state = aktif ? '✅ *Aktif*' : '❌ *Nonaktif*';
		await m.reply(
			`🌑 *A N T I  L I N K*\n\n` +
			`Status: ${state}\n\n` +
			`┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
			`Penggunaan:\n` +
			`• *${usedPrefix}antilink on* — aktifkan\n` +
			`• *${usedPrefix}antilink off* — nonaktifkan\n\n` +
			`📌 *Catatan:*\n` +
			`• Link dari member biasa → dihapus otomatis\n` +
			`• Link dari admin → dibiarkan + notifikasi`
		);
	}
};

handler.before = async function (m, { conn, isAdmin, isOwner }) {
	if (!m.isGroup) return;

	const chat = global.db.data.chats[m.chat];
	if (!chat?.antilink) return;

	if (m.key?.fromMe) return;

	const teks = m.text || '';
	const adaLink = linkRegex.test(teks);
	linkRegex.lastIndex = 0;

	if (!adaLink) return;

	const senderNum = m.sender.split('@')[0];

	if (isAdmin || isOwner) {
		const pesan = pesanAdmin[Math.floor(Math.random() * pesanAdmin.length)];
		await conn.sendMessage(
			m.chat,
			{ text: pesan.replace('{sender}', senderNum), mentions: [m.sender] },
			{ quoted: m }
		);
		return;
	}

	try {
		await conn.sendMessage(m.chat, {
			delete: {
				remoteJid: m.chat,
				fromMe: false,
				id: m.id,
				participant: m.sender,
			},
		});
	} catch (e) {}

	const pesan = pesanEstetik[Math.floor(Math.random() * pesanEstetik.length)];
	await conn.sendMessage(m.chat, {
		text: pesan.replace('{sender}', senderNum),
		mentions: [m.sender],
	});
};

handler.help = ['antilink on/off'];
handler.tags = ['group'];
handler.command = /^antilink$/i;
handler.group = true;

export default handler;