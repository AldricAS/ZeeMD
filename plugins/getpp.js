let handler = async (m, { conn, usedPrefix, command }) => {
	// Tentukan target: tag > reply/quote > diri sendiri
	let targetJid = m.sender;
	if (m.mentionedJid && m.mentionedJid[0]) targetJid = conn.getJid(m.mentionedJid[0]);
	else if (m.quoted) targetJid = conn.getJid(m.quoted.sender);

	let picUrl;
	try {
		picUrl = await conn.profilePictureUrl(targetJid, 'image');
	} catch {
		throw `❌ @${targetJid.split('@')[0]} tidak memiliki foto profil, atau foto profilnya di-private.`;
	}

	await conn.sendMessage(
		m.chat,
		{
			image: { url: picUrl },
			caption: `📸 Foto profil @${targetJid.split('@')[0]}`,
			mentions: [targetJid],
		},
		{ quoted: m }
	);
};

handler.help = ['getpp', 'getpp @user'];
handler.tags = ['tools'];
handler.command = /^(getpp|profilepic|ppuser)$/i;

export default handler;