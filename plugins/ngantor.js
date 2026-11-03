const TUGAS = [
	{ nama: 'Bikin laporan bulanan', hp: 8, lama: 'seharian' },
	{ nama: 'Meeting sama klien', hp: 6, lama: '2 jam' },
	{ nama: 'Presentasi ke bos', hp: 10, lama: '1 jam' },
	{ nama: 'Ngerjain spreadsheet', hp: 5, lama: '3 jam' },
	{ nama: 'Balas email masuk', hp: 3, lama: '30 menit' },
	{ nama: 'Debug sistem yang error', hp: 12, lama: 'setengah hari' },
	{ nama: 'Revisi dokumen proposal', hp: 7, lama: '2 jam' },
	{ nama: 'Rapat internal divisi', hp: 5, lama: '1.5 jam' },
	{ nama: 'Ngurus administrasi', hp: 4, lama: '1 jam' },
	{ nama: 'Training karyawan baru', hp: 9, lama: '3 jam' },
	{ nama: 'Review kerjaan tim', hp: 6, lama: '2 jam' },
	{ nama: 'Bikin PPT deadline mepet', hp: 15, lama: 'seharian' },
	{ nama: 'Rekap data penjualan', hp: 5, lama: '1 jam' },
	{ nama: 'Koordinasi sama departemen lain', hp: 4, lama: '30 menit' },
	{ nama: 'Ngerjain tugas dadakan dari atasan', hp: 11, lama: 'tiba-tiba' },
	{ nama: 'Ngurus komplain pelanggan', hp: 8, lama: '2 jam' },
	{ nama: 'Lembur karena deadline', hp: 18, lama: 'sampai malem' },
	{ nama: 'Zoom call sama tim luar kota', hp: 6, lama: '1 jam' },
	{ nama: 'Input data manual', hp: 7, lama: '3 jam' },
	{ nama: 'Sidang anggaran tahunan', hp: 13, lama: 'seharian' },
];

const KANTOR = [
	'PT Maju Bersama Tbk', 'CV Karya Mandiri', 'PT Sejahtera Abadi',
	'PT Digital Nusantara', 'CV Berkah Jaya', 'PT Sumber Makmur',
	'PT Teknologi Andalan', 'CV Usaha Prima', 'PT Global Sentosa',
	'PT Cahaya Timur', 'CV Mitra Utama', 'PT Bangun Persada',
];

const BAWAAN_KANTOR = [
	'Kamu sarapan dulu biar kuat kerja',
	'Kopi pagi dari pantry kantor bikin semangat',
	'Absen dulu di mesin fingerprint',
	'Laptop dinyalakan, siap tempur!',
	'Cek kalender, hari ini padat banget',
];

const TEMAN_KANTOR = [
	'Pak Budi dari akunting', 'Bu Sari dari HRD', 'Mas Doni dari IT',
	'Mbak Rina dari marketing', 'Pak Hendra si manajer', 'Bu Dewi dari legal',
	'Mas Rizky dari ops', 'Mbak Fitri dari finance',
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
	const cooldown = 24 * 60 * 60 * 1000; // 24 jam
	const diff = now - (user.lastngantor || 0);

	if (diff < cooldown) return m.reply(`⏳ Kamu sudah ngantor hari ini!\nBisa ngantor lagi dalam *${clockString(cooldown - diff)}*\n\n_Istirahat dulu di rumah ya~_`);

	if ((user.health || 100) < 20) throw `❤️ HP kamu terlalu rendah! *(${user.health}/100)*\nJangan maksa ngantor, *.heal* dulu!`;

	const kantor = rand(KANTOR);
	const teman = rand(TEMAN_KANTOR);
	const sarapan = rand(BAWAAN_KANTOR);

	// === ALUR BERANGKAT ===
	await m.reply(
`🏢 *NGANTOR*

Alarm bunyi jam 6 pagi... 
*BRRRRT BRRRRT!* ⏰

Kamu bangun, mandi, dan bersiap berangkat ke kantor.
${sarapan}~

🚇 _Berangkat ke ${kantor}..._`
	);
	await sleep(3000);

	await m.reply(
`🏢 *Sampai di Kantor!*

Kamu tiba di *${kantor}* tepat waktu.
Di lift ketemu *${teman}*...

_"Selamat pagi! Hari ini banyak yang harus dikerjain tuh..."_ 😅

Kamu duduk di meja, buka laptop, dan mulai kerja.
📋 _Ngecek tugas hari ini..._`
	);
	await sleep(3000);

	// === PROSES TUGAS dengan rate 60% ===
	const SLOT = 8;
	let tugasSelesai = [];
	let totalHpBerkurang = 0;

	for (let i = 0; i < SLOT; i++) {
		const adaTugas = Math.random() * 100 <= 60;

		if (!adaTugas) {
			const pesanSantai = [
				'Sebentar nganggur, scrolling sosmed dulu... 📱',
				'Ngobrol bentar sama teman kantor ☕',
				'Ke pantry, ambil cemilan 🍪',
				'Istirahat sebentar, stretching di kursi 🧘',
				'Nunggu email balasan dari klien... 📧',
			];
			await m.reply(`😌 *Sebentar Santai...*\n\n${rand(pesanSantai)}`);
			await sleep(2000);
			continue;
		}

		const tugas = rand(TUGAS);
		tugasSelesai.push(tugas);
		totalHpBerkurang += tugas.hp;

		await m.reply(
`📋 *Tugas Baru Masuk!*

📌 *${tugas.nama}*
⏱️ Estimasi: *${tugas.lama}*
❤️ Menguras tenaga: *-${tugas.hp} HP*

_Mengerjakan tugas..._`
		);
		await sleep(2500);

		await m.reply(`✅ *Tugas selesai!*\n_"${tugas.nama}"_ berhasil dikerjakan!\n\n💪 Lanjut ke tugas berikutnya...`);
		await sleep(2000);
	}

	// === PULANG KANTOR ===
	await m.reply(
`🌆 *Jam Pulang Tiba!*

Akhirnya jam 5 sore, waktunya pulang!
Kamu matiin laptop, beresin meja, dan pamit ke rekan kerja.

_"Sampai besok semua!"_ 👋

🚇 _Perjalanan pulang..._`
	);
	await sleep(3000);

	// Hitung hasil
	const gaji = 230384;
	const bonusTugas = tugasSelesai.length * 5000;
	const totalDapat = gaji + bonusTugas;
	const hpAkhir = Math.max(0, (user.health || 100) - totalHpBerkurang);

	user.health = hpAkhir;
	user.money = (user.money || 0) + totalDapat;
	user.lastngantor = now;
	user.exp = (user.exp || 0) + (tugasSelesai.length * 10) + 50;

	await m.reply(
`🏠 *Sampai Rumah!*

Akhirnya sampe rumah juga, capek banget hari ini...
${tugasSelesai.length === 0 ? 'Tapi hari ini santai, gak banyak tugas 😴' : `Berhasil ngerjain *${tugasSelesai.length} tugas* hari ini 💪`}

📋 *Rekap Tugas:*
${tugasSelesai.length > 0 ? tugasSelesai.map((t, i) => `${i + 1}. ${t.nama}`).join('\n') : '_Tidak ada tugas hari ini, hari santai!_'}

${'─'.repeat(28)}
💼 Gaji harian       : *+${gaji.toLocaleString('id-ID')} koin*
🎯 Bonus tugas       : *+${bonusTugas.toLocaleString('id-ID')} koin* (${tugasSelesai.length} tugas × 5.000)
💰 Total didapat     : *+${totalDapat.toLocaleString('id-ID')} koin*
❤️ HP berkurang      : *-${totalHpBerkurang} HP*
❤️ HP sekarang       : *${hpAkhir}/100*
⭐ EXP didapat       : *+${(tugasSelesai.length * 10) + 50}*
👛 Uang sekarang     : *${user.money.toLocaleString('id-ID')} koin*

${hpAkhir < 30 ? '⚠️ HP kritis! Segera *.heal* sebelum aktivitas lain!' : hpAkhir < 60 ? '💊 HP mulai berkurang, pertimbangkan *.heal*' : '😊 Kondisi masih oke!'}
⏳ Bisa ngantor lagi besok *(cooldown 24 jam)*`
	);
};

handler.help = ['ngantor'];
handler.tags = ['rpg'];
handler.command = /^(ngantor|kerja|kantor)$/i;
handler.register = true;

export default handler;