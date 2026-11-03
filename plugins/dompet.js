let handler = async (m, { usedPrefix }) => {
	let user = global.db.data.users[m.sender];

	let txt = `💰 *DOMPET KAMU*\n`;
	txt += `${'─'.repeat(28)}\n\n`;
	txt += `👛 Uang : *${(user.money || 0).toLocaleString('id-ID')} koin*\n`;
	txt += `🏦 Bank : *${(user.bank || 0).toLocaleString('id-ID')} koin*\n`;
	txt += `${'─'.repeat(28)}\n`;

	m.reply(txt);
};

handler.help = ['dompet', 'saldo'];
handler.tags = ['rpg'];
handler.command = /^(dompet|saldo|wallet|money)$/i;
handler.register = true;

export default handler;