import axios from 'axios';

let handler = async (m, { text, usedPrefix, command }) => {
	if (!text) throw `Masukkan teks yang mau dijadiin iPhone quote!\nContoh: *${usedPrefix + command} halo guys selamat pagi*`;

	m.react('⏳');

	// Ambil waktu sekarang WIB
	const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
	const jam = String(now.getUTCHours()).padStart(2, '0');
	const menit = String(now.getUTCMinutes()).padStart(2, '0');
	const time = `${jam}:${menit}`;

	const url = `https://brat.siputzx.my.id/iphone-quoted?time=${time}&messageText=${encodeURIComponent(text)}`;

	const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
	const buffer = Buffer.from(res.data);

	m.react('✅');

	await conn.sendMessage(m.chat, {
		image: buffer,
		caption: `📱 *iPhone Quoted*\n🕐 ${time} WIB`,
	}, { quoted: m });
};

handler.help = ['iqc <teks>'];
handler.tags = ['tools'];
handler.command = /^(iqc|iphonequote|iquote)$/i;
handler.limit = true;

export default handler;