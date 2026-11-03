import axios from 'axios';

let handler = async (m) => {
	const res = await axios.get('https://api.azbry.com/api/random/katakata?count=1&lang=id', { timeout: 10000 });
	const quote = res.data?.result?.[0]?.quote;
	if (!quote) throw '❌ Gagal mengambil kata-kata, coba lagi!';

	m.reply(`💬 *Kata-Kata Hari Ini*\n\n_"${quote}"_\n\n— *ZeeMD*`);
};

handler.help = ['katakatahariini'];
handler.tags = ['fun'];
handler.command = /^(katakatahariini)$/i;
handler.register = true;

export default handler;