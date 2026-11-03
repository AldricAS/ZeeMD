import axios from 'axios';
import FormData from 'form-data';
import { delay } from 'baileys';

let handler = async (m, { usedPrefix, command }) => {
	let quoted = m.quoted ? m.quoted : m;
	let mime = (quoted.msg || quoted).mimetype;
	if (!/image/.test(mime)) throw `Reply/kirim foto dengan caption *${usedPrefix + command}*`;

	// React jam pasir tanda sedang proses
	m.react('⏳');

	let media = await quoted.download();
	let rasio = /^hdr$/i.test(command) ? 4 : 2;
	let res = await upscale(media, rasio);

	const resultUrl = res?.data?.downloadUrls[0];
	if (!resultUrl) throw 'Gagal mendapatkan hasil upscale!';

	// Download hasil
	const resultBuf = Buffer.from((await axios.get(resultUrl, { responseType: 'arraybuffer' })).data);

	// React centang tanda selesai
	m.react('✅');

	await conn.sendMessage(m.chat, {
		image: resultBuf,
		caption:
`✨ *Hasil HD Upscale*

📐 Skala  : *${rasio}x*
🔧 HD by : ZeeMD

_Foto berhasil di-upscale! Kualitas lebih tajam dari sebelumnya._`,
	}, { quoted: m });
};

handler.help = ['hd', 'hdr'];
handler.tags = ['tools'];
handler.command = /^(upscale|hd|hdr)$/i;
handler.limit = true;

export default handler;

async function upscale(buffer, rasio = 2) {
	const form = new FormData();
	form.append('myfile', buffer, Date.now() + '.jpg');
	form.append('scaleRadio', rasio);

	const upload = await axios.post('https://get1.imglarger.com/api/UpscalerNew/UploadNew', form, {
		headers: {
			...form.getHeaders(),
			Origin: 'https://imgupscaler.com',
		},
	});

	if (upload.status !== 200) throw new Error('Gagal Upload Image');

	for (let i = 0; i < 20; i++) {
		const check = await axios.post(
			'https://get1.imglarger.com/api/UpscalerNew/CheckStatusNew',
			{ code: upload.data?.data?.code, scaleRadio: rasio },
			{ headers: { 'Content-Type': 'application/json' } }
		);

		if (check.data?.data?.status === 'success') return check.data;

		await delay(5000);
	}

	throw new Error('Upscale timeout, coba lagi nanti!');
}