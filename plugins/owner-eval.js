import { format } from 'util';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const handler = async (m, { conn, usedPrefix, noPrefix }) => {
	const code = noPrefix.trim();
	if (!code) return;
	const body = /^=>/.test(usedPrefix) ? `return (${code})` : code;
	try {
		const result = await new AsyncFunction('m', 'conn', 'db', body).call(conn, m, conn, global.db);
		await m.reply(format(result));
	} catch (e) {
		await m.reply(format(e));
	}
};

handler.customPrefix = /^=?> /;
handler.command = /(?:)/i;
handler.help = [];
handler.tags = ['owner'];
handler.rowner = true;
handler.fail = () => {};
handler.exp = 0;

export default handler;
