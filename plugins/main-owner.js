const handler = async (m, { conn }) => {
	const list = global.owner.map(([number, name]) => [number, name || 'Owner']);
	await conn.sendContact(m.chat, list, m);
};

handler.help = ['owner'];
handler.tags = ['main'];
handler.command = ['owner', 'creator'];

export default handler;
