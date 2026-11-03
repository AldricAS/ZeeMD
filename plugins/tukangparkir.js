const TEMPAT = [
	'Indomaret Jalan Raya', 'Alfamart Depan Gang', 'Minimarket Pojok',
	'Mall Central Park', 'Plaza Semanggi', 'Superindo Kelurahan',
	'RS Umum Daerah', 'Puskesmas Kecamatan', 'Klinik 24 Jam',
	'Pasar Tradisional', 'Pasar Modern BSD', 'Pasar Minggu',
	'Stasiun Kereta', 'Terminal Bus Kota', 'Halte TransJakarta',
	'Masjid Agung', 'Gereja Katedral', 'Pura Daerah',
	'Bank BRI', 'Bank Mandiri', 'ATM Center',
	'Kantor Kelurahan', 'Kantor Kecamatan', 'Kantor Polisi',
	'SMA Negeri 1', 'SMK Teknik', 'Kampus Swasta',
	'Warung Makan Pak Kumis', 'Rumah Makan Padang', 'Restoran Cepat Saji',
	'Bengkel Motor Jaya', 'Tambal Ban Bu Yati', 'Cuci Motor Kilat',
];

const NAMA_PARKIR = [
	'Pak Jarwo', 'Pak Slamet', 'Pak Dulah', 'Pak Karyo', 'Pak Minto',
	'Pak Sugeng', 'Pak Bambang', 'Pak Rebo', 'Pak Kliwon', 'Pak Wage',
	'Pak Pon', 'Pak Pahing', 'Pak Umar', 'Pak Salim', 'Pak Rohim',
	'Pak Gimin', 'Pak Tono', 'Pak Darto', 'Pak Naryo', 'Pak Suwito',
	'Pak Gatot', 'Pak Wardoyo', 'Pak Sumadi', 'Pak Parno', 'Pak Jumadi',
	'Pak Suharto', 'Pak Marno', 'Pak Warsito', 'Pak Haryono', 'Pak Suparno',
];

const KENDARAAN = [
	'motor Honda Beat', 'motor Yamaha Mio', 'motor Suzuki Satria',
	'motor Vario 125', 'motor NMAX', 'motor PCX', 'motor Scoopy',
	'mobil Avanza', 'mobil Xenia', 'mobil Rush', 'mobil Calya',
	'mobil Sigra', 'mobil Agya', 'mobil Ayla', 'mobil Brio',
	'pickup Carry', 'motor trail', 'motor bebek tua',
];

const CERITA_CAPE = [
	'Punggung mulai pegal-pegal, kayaknya cukup deh hari ini...',
	'Matahari makin terik, badan udah gak kuat nih...',
	'Kaki udah pegel banget, istirahat dulu ah...',
	'Perut lapar, kayaknya udah waktunya pulang...',
	'Hujan mau turun, mending berhenti dulu...',
	'Sudah seharian, tenaga sudah habis...',
];

const CERITA_SEPI = [
	'Sepi banget, gak ada yang parkir...',
	'Parkiran kosong melompong...',
	'Orang-orang pada lewat tapi gak ada yang parkir...',
	'Angin doang yang lewat... 🌬️',
	'Ada yang mau parkir tapi malah putar balik...',
	'Nongkrong doang belum ada yang masuk...',
];

function clockString(ms) {
	const h = Math.floor((ms / 3600000) % 24);
	const m = Math.floor((ms / 60000) % 60);
	const s = Math.floor((ms / 1000) % 60);
	return [h !== 0 ? `${h}j` : '', m !== 0 ? `${m}m` : '', `${s}d`].filter(Boolean).join(' ');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

let handler = async (m) => {
	const user = global.db.data.users[m.sender];
	const now = Date.now();
	const cooldown = 45 * 60 * 1000; // 45 menit
	const diff = now - (user.lasttukangparkir || 0);

	if (diff < cooldown) return m.reply(`⏳ Badan masih pegel!\nIstirahat dulu *${clockString(cooldown - diff)}* lagi ya *${user.name || 'Bos'}*.`);

	if ((user.health || 100) < 20) throw `❤️ HP kamu terlalu rendah! *(${user.health}/100)*\nIstirahat dulu, jangan maksa kerja! Gunakan *.heal*`;

	const tempat = rand(TEMPAT);
	const namaParkir = rand(NAMA_PARKIR);
	const SLOT = 10; // 10 kesempatan kendaraan masuk

	// === ALUR CERITA AWAL ===
	await m.reply(
`🅿️ *TUKANG PARKIR*

Hari ini kamu memutuskan jadi tukang parkir!
Kamu ambil rompi oranye lusuh dan peluit dari laci...

👷 *${namaParkir}* (kamu) siap bertugas!
📍 Lokasi: *${tempat}*

_Berangkat ke lokasi..._`
	);
	await sleep(3000);

	await m.reply(
`🌅 *Sampai di Lokasi!*

Kamu tiba di *${tempat}* pas jam buka.
Area parkir masih sepi, kamu mulai bersiap...

🦺 Rompi dipakai ✅
📣 Peluit disiapkan ✅  
🚧 Cone parkir dipasang ✅

_Siap nunggu kendaraan masuk!_
🎲 Rate kendaraan masuk: *30%*`
	);
	await sleep(3000);

	// === PROSES PARKIR ===
	let totalUang = 0;
	let totalKendaraan = 0;
	let logParkir = [];
	let cape = false;

	for (let i = 0; i < SLOT; i++) {
		// Cek cape random setelah slot ke-4
		if (i >= 4 && Math.random() * 100 <= 25) {
			cape = true;
			await m.reply(`😮‍💨 *${namaParkir} Mulai Kelelahan...*\n\n${rand(CERITA_CAPE)}`);
			await sleep(2000);
			break;
		}

		const adaKendaraan = Math.random() * 100 <= 30;

		if (!adaKendaraan) {
			await m.reply(`⏳ *Menunggu...*\n\n${rand(CERITA_SEPI)}`);
			await sleep(2000);
			continue;
		}

		// Ada kendaraan masuk!
		const kendaraan = rand(KENDARAAN);
		const bayaran = Math.floor(Math.random() * 4001) + 1000; // 1.000 - 5.000
		totalUang += bayaran;
		totalKendaraan++;
		logParkir.push(`🚗 *${kendaraan}* → *+${bayaran.toLocaleString('id-ID')} koin*`);

		await m.reply(
`🚨 *Kendaraan Masuk!*

🚗 *${kendaraan}* mau parkir!
_"Sinih-sinih, ayo masuk!"_ 🗣️

*PRIIT PRIIT!* 📣

💰 Tarif parkir: *${bayaran.toLocaleString('id-ID')} koin*
🚗 Total kendaraan: *${totalKendaraan}*`
		);
		await sleep(2500);
	}

	// Kurangi HP
	const hpBerkurang = 19;
	user.health = Math.max(0, (user.health || 100) - hpBerkurang);
	user.money = (user.money || 0) + totalUang;
	user.lasttukangparkir = now;
	user.exp = (user.exp || 0) + Math.floor(totalUang / 150);

	// === HASIL AKHIR ===
	await m.reply(
`${cape ? '😴 *PULANG LEBIH AWAL...*' : totalKendaraan === 0 ? '😢 *APES! TIDAK ADA YANG PARKIR...*' : '🏁 *SELESAI BERTUGAS!*'}

📋 *Rekap Parkir:*
${logParkir.length > 0 ? logParkir.join('\n') : '_Tidak ada kendaraan yang parkir..._'}

${'─'.repeat(28)}
🚗 Total kendaraan    : *${totalKendaraan} kendaraan*
💰 Total pendapatan   : *+${totalUang.toLocaleString('id-ID')} koin*
❤️ HP berkurang       : *-${hpBerkurang} HP*
❤️ HP sekarang        : *${user.health}/100*
⭐ EXP didapat        : *+${Math.floor(totalUang / 150)}*
👛 Uang sekarang      : *${user.money.toLocaleString('id-ID')} koin*

${user.health < 30 ? '⚠️ HP kritis! Segera *.heal* sebelum kerja lagi!' : ''}
${totalKendaraan === 0 ? '_Nasib... hari ini zonk. Coba lagi besok!_ 😔' : cape ? '_Capek sih, tapi lumayan ada penghasilan!_ 💪' : '_Kerja keras terbayar! Istirahat yang cukup ya~_ 😊'}
⏳ Cooldown: *45 menit*`
	);
};

handler.help = ['tukangparkir', 'parkir'];
handler.tags = ['rpg'];
handler.command = /^(tukangparkir|parkir)$/i;
handler.register = true;

export default handler;