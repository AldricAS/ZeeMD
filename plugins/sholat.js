import axios from 'axios';

let handler = async (m, { text, usedPrefix, command }) => {
	if (!text) throw `Masukkan nama kota/kabupaten!\nContoh: ${usedPrefix + command} Jakarta`;

	// Cari ID kota dari MyQuran API
	const cariKota = await axios.get(`https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(text.trim())}`);

	if (!cariKota.data?.data?.length) throw `❌ Kota *${text}* tidak ditemukan!\nCoba nama lain, contoh: Jakarta, Bandung, Surabaya, Medan`;

	const kota = cariKota.data.data[0];
	const kotaId = kota.id;
	const kotaNama = kota.lokasi;

	// Ambil jadwal hari ini
	const now = new Date();
	const tahun = now.getFullYear();
	const bulan = String(now.getMonth() + 1).padStart(2, '0');
	const hari = String(now.getDate()).padStart(2, '0');

	const jadwalRes = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/${kotaId}/${tahun}/${bulan}/${hari}`);
	const jadwal = jadwalRes.data?.data?.jadwal;

	if (!jadwal) throw '❌ Gagal mengambil jadwal sholat, coba lagi nanti.';

	const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
	const hariIni = hariList[now.getDay()];
	const tanggal = `${hariIni}, ${hari}/${bulan}/${tahun}`;

	let teks = `🕌 *JADWAL SHOLAT*\n`;
	teks += `📍 ${kotaNama}\n`;
	teks += `📅 ${tanggal}\n`;
	teks += `${'─'.repeat(28)}\n`;
	teks += `🌅 Subuh    : *${jadwal.subuh}*\n`;
	teks += `☀️ Terbit   : *${jadwal.terbit}*\n`;
	teks += `🌤️ Dhuha    : *${jadwal.dhuha}*\n`;
	teks += `🌞 Dzuhur   : *${jadwal.dzuhur}*\n`;
	teks += `🌇 Ashar    : *${jadwal.ashar}*\n`;
	teks += `🌆 Maghrib  : *${jadwal.maghrib}*\n`;
	teks += `🌙 Isya     : *${jadwal.isya}*\n`;
	teks += `${'─'.repeat(28)}\n`;
	teks += `_Sumber: MyQuran API_`;

	conn.sendMessage(m.chat, { text: teks }, { quoted: m });
};

handler.help = ['sholat <kota>'];
handler.tags = ['tools'];
handler.command = /^(sholat|jadwalsholat|sholatku)$/i;
handler.register = true;

export default handler;