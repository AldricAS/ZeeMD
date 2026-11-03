import axios from 'axios';

let handler = async (m, { text, usedPrefix, command }) => {
	let q = m.quoted ? m.quoted : m;
	let mime = (q.msg || q).mimetype || '';

	if (!/image/.test(mime)) throw `Kirim / reply gambar dengan caption:\n${usedPrefix + command} teks bawah|teks atas`;

	let [teksBawah, teksAtas] = (text || '').split('|');
	teksAtas = teksAtas?.trim() || '_';
	teksBawah = teksBawah?.trim() || '_';

	let media = await q.download();
	if (!media) throw 'Gagal download gambar';

	const { default: FormData } = await import('form-data');
	const form = new FormData();
	// note: field name-nya "files[]" sesuai contoh curl-nya
	form.append('files[]', media, { filename: 'image.jpg', contentType: 'image/jpeg' });

	const upload = await axios.post('https://uguu.se/upload', form, {
		headers: { ...form.getHeaders() },
	});

	const data = upload.data;
	let imgUrl = null;

	if (data?.files?.[0]?.url) {
		imgUrl = data.files[0].url;
	} else if (typeof data === 'string' && data.trim().startsWith('http')) {
		imgUrl = data.trim();
	}

	if (!imgUrl) {
		console.log('Response uguu.se:', data);
		throw 'Gagal upload gambar ke server (format response tidak dikenali, cek console log)';
	}

	const top = encodeURIComponent(teksAtas);
	const bottom = encodeURIComponent(teksBawah);
	const bg = encodeURIComponent(imgUrl);

	const memeUrl = `https://api.memegen.link/images/custom/${top}/${bottom}.png?background=${bg}`;

	const res = await axios.get(memeUrl, { responseType: 'arraybuffer' });
	const buffer = Buffer.from(res.data);

	await conn.sendSticker(m.chat, buffer, m, {
		packName: global.stickpack || 'ZeeMD',
		packPublish: global.stickauth || global.namebot,
	});
};

handler.help = ['stickermeme <teks bawah>|<teks atas>', 'smeme <teks bawah>|<teks atas>'];
handler.tags = ['sticker'];
handler.command = /^(stickermeme|stcmeme|smeme)$/i;
handler.limit = true;

export default handler;