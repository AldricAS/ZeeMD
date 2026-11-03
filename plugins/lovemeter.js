let handler = async (m, { conn }) => {
	if (!m.isGroup) throw 'Command ini hanya bisa digunakan di grup!';

	const groupMetadata = await conn.groupMetadata(m.chat);
	const members = groupMetadata.participants.map(p => p.id);

	// Hapus diri sendiri dari list
	const others = members.filter(id => id !== m.sender && id !== conn.user.id);
	if (!others.length) throw 'Tidak ada member lain di grup ini!';

	// Pilih random
	const target = others[Math.floor(Math.random() * others.length)];
	const persen = Math.floor(Math.random() * 101);

	let label, emoji;
	if (persen >= 90) { label = 'Jodoh Banget!'; emoji = '💘'; }
	else if (persen >= 75) { label = 'Sangat Cocok!'; emoji = '❤️'; }
	else if (persen >= 55) { label = 'Lumayan Cocok'; emoji = '💕'; }
	else if (persen >= 35) { label = 'Biasa Aja'; emoji = '💙'; }
	else if (persen >= 15) { label = 'Kurang Cocok'; emoji = '😐'; }
	else { label = 'Gak Cocok Sama Sekali 💀'; emoji = '💔'; }

	// Bar visual
	const filled = Math.round(persen / 10);
	const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

	let teks = `${emoji} *LOVE METER* ${emoji}\n\n`;
	teks += `👤 @${m.sender.split('@')[0]}\n`;
	teks += `💞 ×\n`;
	teks += `👤 @${target.split('@')[0]}\n\n`;
	teks += `[${bar}] *${persen}%*\n\n`;
	teks += `${emoji} *${label}*\n\n`;
	teks += getKomentar(persen);

	conn.sendMessage(m.chat, {
		text: teks,
		mentions: [m.sender, target],
	}, { quoted: m });
};

function getKomentar(persen) {
	if (persen >= 90) return '_Wah kayaknya kalian emang udah ditakdirkan buat bareng~ 🌹_';
	if (persen >= 75) return '_Peluang jadian gede banget nih, tinggal berani aja! 😍_';
	if (persen >= 55) return '_Lumayan cocok sih, dicoba dulu kali ya~ 💫_';
	if (persen >= 35) return '_Masih ada harapan, tapi perlu usaha lebih keras 💪_';
	if (persen >= 15) return '_Hmm kayaknya kurang nyambung deh... 😅_';
	return '_Kayaknya lebih baik jadi teman aja deh... 😭_';
}

handler.help = ['lovemeter'];
handler.tags = ['fun'];
handler.command = /^(lovemeter|lovetest|jodoh)$/i;
handler.group = true;
handler.register = true;

export default handler;