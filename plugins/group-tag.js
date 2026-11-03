const handler = async (m, { conn, command, text, participants }) => {
	const members = participants.map((p) => conn.getJid(p.phoneNumber || p.id));
	const quotedText = m.quoted?.text || '';

	if (command === 'hidetag') {
		const message = text || quotedText;
		if (!message) return m.reply('Isi pesannya dulu, atau balas pesan yang mau disebarkan.');
		return conn.sendMessage(m.chat, { text: message, mentions: members }, { quoted: m });
	}

	const list = members.map((jid, i) => `${String(i + 1).padStart(2, '0')}. @${jid.split('@')[0]}`).join('\n');
	await conn.sendMessage(m.chat, { text: `*Tag semua* (${members.length})\n${text ? `\n${text}\n` : ''}\n${list}`, mentions: members }, { quoted: m });
};

handler.help = ['tagall', 'hidetag'];
handler.tags = ['group'];
handler.command = ['tagall', 'hidetag'];
handler.group = true;
handler.admin = true;

export default handler;
