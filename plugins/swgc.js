import { PassThrough } from 'stream';
import ffmpeg from 'fluent-ffmpeg';

let handler = async (m, { conn, text, usedPrefix }) => {

	let args = (text || '')
		.split('|')
		.map(v => v.trim())
		.filter(v => v);

	let teks = '';
	let warna = '';
	let target = '';

	for (let v of args) {
		if (/chat\.whatsapp\.com\//i.test(v)) {
			target = v;
		} else if (/@g\.us$/.test(v) || /^\d+$/.test(v)) {
			target = v;
		} else if (!teks) {
			teks = v;
		} else if (!warna) {
			warna = v;
		}
	}

	let jid = m.chat;

	if (target) {
		if (/chat\.whatsapp\.com\//i.test(target)) {
			const code = target.split('chat.whatsapp.com/')[1];
			try {
				const info = await conn.groupGetInviteInfo(code);
				jid = info.id;
			} catch {
				return m.reply('Link grup tidak valid / bot belum join');
			}
		} else {
			jid = /^\d+$/.test(target) ? target + '@g.us' : target;
		}
	}

	const quoted = m.quoted || m;
	const mime = quoted.mimetype || (quoted.msg || quoted).mimetype || '';
	const caption = quoted.caption || teks || '';

	const warnaMap = {
		biru: '#34B7F1',
		hijau: '#25D366',
		kuning: '#FFD700',
		jingga: '#FF8C00',
		merah: '#FF3B30',
		ungu: '#9C27B0',
		abu: '#9E9E9E',
		hitam: '#000000',
		putih: '#FFFFFF',
		cyan: '#00BCD4',
	};

	const colors = Object.values(warnaMap);
	const bgColor = warna
		? warnaMap[warna.toLowerCase()]
		: colors[Math.floor(Math.random() * colors.length)];

	if (!caption && !m.quoted) {
		return m.reply(`*Example:*\n\n${usedPrefix}swgc halo\n${usedPrefix}swgc halo|merah\n${usedPrefix}swgc halo|linkgrup atau groupid\n\nReply foto/video/audio/sticker:\n${usedPrefix}swgc\n${usedPrefix}swgc linkgrup atau groupid`);
	}

	if (/image/i.test(mime)) {
		const buffer = await quoted.download();
		await conn.sendMessage(jid, { image: buffer, caption, contextInfo: { isGroupStatus: true } });
		return m.reply(`Succes upload status!\n*GroupID:* ${jid}`);
	}

	if (/video/i.test(mime)) {
		const buffer = await quoted.download();
		await conn.sendMessage(jid, { video: buffer, caption, contextInfo: { isGroupStatus: true } });
		return m.reply(`Succes upload status!\n*GroupID:* ${jid}`);
	}

	if (/audio/i.test(mime)) {
		const buffer = await quoted.download();
		const vn = await toVN(buffer);
		await conn.sendMessage(jid, { audio: vn, ptt: true, mimetype: 'audio/ogg; codecs=opus', contextInfo: { isGroupStatus: true } });
		return m.reply(`Succes upload status!\n*GroupID:* ${jid}`);
	}

	if (/sticker/i.test(mime)) {
		const buffer = await quoted.download();
		await conn.sendMessage(jid, { sticker: buffer, contextInfo: { isGroupStatus: true } });
		return m.reply(`Succes upload status!\n*GroupID:* ${jid}`);
	}

	await conn.sendMessage(jid, { text: caption, backgroundColor: bgColor, contextInfo: { isGroupStatus: true } });
	return m.reply(`Succes upload status!\n*GroupID:* ${jid}`);
};

async function toVN(buffer) {
	return new Promise((resolve, reject) => {
		const input = new PassThrough();
		const output = new PassThrough();
		const chunks = [];
		input.end(buffer);
		ffmpeg(input)
			.noVideo()
			.audioCodec('libopus')
			.format('ogg')
			.on('error', reject)
			.on('end', () => resolve(Buffer.concat(chunks)))
			.pipe(output);
		output.on('data', c => chunks.push(c));
	});
}

handler.help = ['swgc <teks>', 'swgc <teks>|<warna>|<linkgrup>'];
handler.tags = ['group'];
handler.command = /^swgc$/i;
handler.admin = true;

export default handler;