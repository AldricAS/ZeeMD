const handler = async (m) => {
	await m.reply('Memulai ulang bot...');
	await global.db.write().catch(() => {});
	if (process.send) process.send('restart');
	else process.exit(0);
};

handler.help = ['restart'];
handler.tags = ['owner'];
handler.command = ['restart'];
handler.rowner = true;

export default handler;
