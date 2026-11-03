import axios from 'axios';

function formatNumber(n) { return (n || 0).toLocaleString(); }
function formatDuration(s) {
	if (!s) return '00:00';
	return `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
}

let handler = async (m, { text, usedPrefix, command }) => {
	if (!text) throw `Masukkan kata kunci pencarian!\nContoh: *${usedPrefix + command} kucing lucu*`;

	m.react('🔍');

	// Step 1: Search video
	const search = await axios.get('https://www.tikwm.com/api/feed/search', {
		params: { keywords: text, count: 10, cursor: 0, web: 1, hd: 1, region: 'ID' },
		headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
		timeout: 15000,
	});

	const videos = search.data?.data?.videos?.filter(v => v?.id);
	if (!videos?.length) throw `❌ Tidak ada video ditemukan untuk "*${text}*"`;

	const v = videos[Math.floor(Math.random() * videos.length)];

	m.react('⏳');

	// Step 2: Ambil detail video + download URL via API tikwm
	const detail = await axios.post('https://www.tikwm.com/api/', 
		new URLSearchParams({
			url: `https://www.tiktok.com/@a/video/${v.id}`,
			hd: '1',
		}),
		{
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'Mozilla/5.0',
			},
			timeout: 15000,
		}
	);

	const data = detail.data?.data;
	if (!data) throw '❌ Gagal ambil detail video!';

	// Step 3: Download video dari URL yang dikembalikan
	const videoUrl = data.hdplay || data.wmplay || data.play;
	if (!videoUrl) throw '❌ URL video tidak tersedia!';

	const videoRes = await axios.get(videoUrl, {
		responseType: 'arraybuffer',
		timeout: 60000,
		headers: {
			'User-Agent': 'Mozilla/5.0',
			'Referer': 'https://www.tiktok.com/',
		},
		maxRedirects: 10,
	});

	const buffer = Buffer.from(videoRes.data);
	if (buffer.length < 10000) throw '❌ Video terlalu kecil / gagal didownload!';

	const caption = `🎵 *${data.title || v.title || 'Tanpa Judul'}*\n\n👤 *${data.author?.nickname || v.author?.nickname || 'Unknown'}*\n▶️ Views   : *${formatNumber(data.play_count || v.play_count)}*\n💬 Komen   : *${formatNumber(data.comment_count || v.comment_count)}*\n⏱️ Durasi  : *${formatDuration(data.duration || v.duration)}*\n🌍 Region  : *${data.region || v.region || '-'}*`;

	await conn.sendMessage(m.chat, {
		video: buffer,
		caption,
		mimetype: 'video/mp4',
	}, { quoted: m });

	m.react('✅');
};

handler.help = ['ttsearch <kata kunci>'];
handler.tags = ['tools'];
handler.command = /^(ttsearch)$/i;
handler.limit = true;

export default handler;