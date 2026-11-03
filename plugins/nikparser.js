// Data wilayah Indonesia (provinsi dari 2 digit pertama NIK)
const PROVINSI = {
	'11': 'Aceh',
	'12': 'Sumatera Utara',
	'13': 'Sumatera Barat',
	'14': 'Riau',
	'15': 'Jambi',
	'16': 'Sumatera Selatan',
	'17': 'Bengkulu',
	'18': 'Lampung',
	'19': 'Kepulauan Bangka Belitung',
	'21': 'Kepulauan Riau',
	'31': 'DKI Jakarta',
	'32': 'Jawa Barat',
	'33': 'Jawa Tengah',
	'34': 'DI Yogyakarta',
	'35': 'Jawa Timur',
	'36': 'Banten',
	'51': 'Bali',
	'52': 'Nusa Tenggara Barat',
	'53': 'Nusa Tenggara Timur',
	'61': 'Kalimantan Barat',
	'62': 'Kalimantan Tengah',
	'63': 'Kalimantan Selatan',
	'64': 'Kalimantan Timur',
	'65': 'Kalimantan Utara',
	'71': 'Sulawesi Utara',
	'72': 'Sulawesi Tengah',
	'73': 'Sulawesi Selatan',
	'74': 'Sulawesi Tenggara',
	'75': 'Gorontalo',
	'76': 'Sulawesi Barat',
	'81': 'Maluku',
	'82': 'Maluku Utara',
	'91': 'Papua Barat',
	'92': 'Papua',
	'93': 'Papua Selatan',
	'94': 'Papua Tengah',
	'95': 'Papua Pegunungan',
	'96': 'Papua Barat Daya',
};

const BULAN = [
	'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
	'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function hitungUmur(tglLahir) {
	const now = new Date();
	let umur = now.getFullYear() - tglLahir.getFullYear();
	const bulanDiff = now.getMonth() - tglLahir.getMonth();
	if (bulanDiff < 0 || (bulanDiff === 0 && now.getDate() < tglLahir.getDate())) {
		umur--;
	}
	return umur;
}

function getZodiak(tgl, bln) {
	const zodiaks = [
		{ name: 'Capricorn', emoji: '♑', end: [1, 19] },
		{ name: 'Aquarius', emoji: '♒', end: [2, 18] },
		{ name: 'Pisces', emoji: '♓', end: [3, 20] },
		{ name: 'Aries', emoji: '♈', end: [4, 19] },
		{ name: 'Taurus', emoji: '♉', end: [5, 20] },
		{ name: 'Gemini', emoji: '♊', end: [6, 20] },
		{ name: 'Cancer', emoji: '♋', end: [7, 22] },
		{ name: 'Leo', emoji: '♌', end: [8, 22] },
		{ name: 'Virgo', emoji: '♍', end: [9, 22] },
		{ name: 'Libra', emoji: '♎', end: [10, 22] },
		{ name: 'Scorpio', emoji: '♏', end: [11, 21] },
		{ name: 'Sagitarius', emoji: '♐', end: [12, 21] },
		{ name: 'Capricorn', emoji: '♑', end: [12, 31] },
	];
	for (const z of zodiaks) {
		if (bln < z.end[0] || (bln === z.end[0] && tgl <= z.end[1])) {
			return `${z.emoji} ${z.name}`;
		}
	}
	return '♑ Capricorn';
}

function getShio(tahun) {
	const shios = ['Tikus 🐀', 'Kerbau 🐃', 'Macan 🐯', 'Kelinci 🐇', 'Naga 🐉', 'Ular 🐍', 'Kuda 🐴', 'Kambing 🐑', 'Monyet 🐒', 'Ayam 🐓', 'Anjing 🐕', 'Babi 🐖'];
	return shios[(tahun - 4) % 12];
}

function parseNIK(nik) {
	if (!/^\d{16}$/.test(nik)) return null;

	const kodeProvinsi  = nik.slice(0, 2);
	const kodeKabKota   = nik.slice(0, 4);
	const kodeKec       = nik.slice(0, 6);
	const tglRaw        = parseInt(nik.slice(6, 8));
	const blnRaw        = parseInt(nik.slice(8, 10));
	const thnRaw        = nik.slice(10, 12);
	const nomorUrut     = nik.slice(12, 16);

	// Perempuan: tanggal ditambah 40
	const isPerempuan = tglRaw > 40;
	const tgl = isPerempuan ? tglRaw - 40 : tglRaw;
	const bln = blnRaw;

	if (tgl < 1 || tgl > 31 || bln < 1 || bln > 12) return null;

	// Tahun: 00-99 → 1900-an atau 2000-an
	const thnNum = parseInt(thnRaw);
	const tahun = thnNum <= new Date().getFullYear() % 100 ? 2000 + thnNum : 1900 + thnNum;

	const tglLahir = new Date(tahun, bln - 1, tgl);
	const umur = hitungUmur(tglLahir);
	const tglStr = `${tgl} ${BULAN[bln - 1]} ${tahun}`;

	return {
		nik,
		provinsi:    PROVINSI[kodeProvinsi] || `Kode ${kodeProvinsi} (tidak dikenal)`,
		kodeWilayah: `${kodeKec} (Kab/Kota: ${kodeKabKota})`,
		jenisKelamin: isPerempuan ? '♀️ Perempuan' : '♂️ Laki-laki',
		tanggalLahir: tglStr,
		umur,
		zodiak:      getZodiak(tgl, bln),
		shio:        getShio(tahun),
		nomorUrut,
		valid:       umur >= 0 && umur <= 120,
	};
}

// ================================
// HANDLER
// ================================
let handler = async (m, { text, usedPrefix, command }) => {
	const nik = (text || '').trim().replace(/\s+/g, '');

	if (!nik) throw `Masukkan NIK kamu!\nContoh: *${usedPrefix + command}* 3271012501000001`;
	if (!/^\d+$/.test(nik)) throw `NIK hanya boleh berisi angka!`;
	if (nik.length !== 16) throw `NIK harus 16 digit! NIK kamu: *${nik.length} digit*`;

	const data = parseNIK(nik);
	if (!data || !data.valid) throw `NIK tidak valid atau format tidak dikenali!`;

	const result =
`╔══════════════════════╗
  🪪 *PARSER NIK INDONESIA*
╚══════════════════════╝

📌 *NIK:* \`${data.nik}\`

👤 *DATA PRIBADI*
• Jenis Kelamin : ${data.jenisKelamin}
• Tanggal Lahir : ${data.tanggalLahir}
• Umur          : ${data.umur} tahun
• Zodiak        : ${data.zodiak}
• Shio          : ${data.shio}

🗺️ *WILAYAH*
• Provinsi      : ${data.provinsi}
• Kode Wilayah  : ${data.kodeWilayah}
• Nomor Urut    : ${data.nomorUrut}

⚠️ _Data bersumber dari format NIK bukan dari database kependudukan. Nama & alamat lengkap tidak tersedia._`;

	await m.reply(result);
};

handler.help = ['nik <nomor nik>'];
handler.tags = ['tools'];
handler.command = /^nik$/i;
handler.register = true;

export default handler;