const format = (ms) => {
	const s = Math.floor(ms / 1000);
	const parts = [[Math.floor(s / 86400), 'h'], [Math.floor(s / 3600) % 24, 'j'], [Math.floor(s / 60) % 60, 'm'], [s % 60, 'd']];
	return parts.filter(([v]) => v).map(([v, u]) => v + u).join(' ') || '0d';
};

const handler = async (m, { conn, command }) => {
	if (command === 'runtime') return m.reply(`Bot aktif selama ${format(process.uptime() * 1000)}`);

	const sent = Number(m.messageTimestamp?.low ?? m.messageTimestamp) * 1000;
	const latency = Math.max(0, Date.now() - sent);
	const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
	await conn.reply(m.chat, `*Pong*\nRespon   ${latency} ms\nAktif    ${format(process.uptime() * 1000)}\nRAM      ${ram} MB`, m);
};

handler.help = ['ping', 'runtime'];
handler.tags = ['main'];
handler.command = ['ping', 'runtime'];

export default handler;
