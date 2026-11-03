import axios from 'axios';

// Semua kota dikelompokkan per provinsi (untuk section di single_select)
const WILAYAH = {
	'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Selatan', 'Jakarta Timur', 'Kepulauan Seribu'],
	'Jawa Barat': ['Bandung', 'Bekasi', 'Bogor', 'Cimahi', 'Cirebon', 'Depok', 'Sukabumi', 'Tasikmalaya', 'Garut', 'Karawang', 'Purwakarta', 'Subang', 'Sumedang'],
	'Jawa Tengah': ['Semarang', 'Solo', 'Magelang', 'Salatiga', 'Pekalongan', 'Tegal', 'Purwokerto', 'Kudus', 'Jepara', 'Demak'],
	'DI Yogyakarta': ['Yogyakarta', 'Sleman', 'Bantul', 'Gunung Kidul', 'Kulon Progo'],
	'Jawa Timur': ['Surabaya', 'Malang', 'Sidoarjo', 'Kediri', 'Madiun', 'Mojokerto', 'Pasuruan', 'Probolinggo', 'Blitar', 'Jember', 'Banyuwangi'],
	'Banten': ['Serang', 'Tangerang', 'Tangerang Selatan', 'Cilegon', 'Lebak', 'Pandeglang'],
	'Bali': ['Denpasar', 'Singaraja', 'Gianyar', 'Tabanan', 'Klungkung'],
	'Sumatera Utara': ['Medan', 'Binjai', 'Pematangsiantar', 'Tebing Tinggi', 'Sibolga', 'Tanjungbalai'],
	'Sumatera Barat': ['Padang', 'Bukittinggi', 'Payakumbuh', 'Sawahlunto', 'Solok'],
	'Sumatera Selatan': ['Palembang', 'Lubuklinggau', 'Pagar Alam', 'Prabumulih'],
	'Riau': ['Pekanbaru', 'Dumai'],
	'Kepulauan Riau': ['Tanjungpinang', 'Batam'],
	'Aceh': ['Banda Aceh', 'Langsa', 'Lhokseumawe', 'Sabang'],
	'Lampung': ['Bandar Lampung', 'Metro'],
	'Kalimantan Barat': ['Pontianak', 'Singkawang'],
	'Kalimantan Timur': ['Samarinda', 'Balikpapan', 'Bontang'],
	'Kalimantan Selatan': ['Banjarmasin', 'Banjarbaru'],
	'Kalimantan Tengah': ['Palangkaraya'],
	'Sulawesi Selatan': ['Makassar', 'Parepare', 'Palopo'],
	'Sulawesi Utara': ['Manado', 'Bitung', 'Kotamobagu', 'Tomohon'],
	'Nusa Tenggara Barat': ['Mataram', 'Bima'],
	'Nusa Tenggara Timur': ['Kupang'],
	'Maluku': ['Ambon', 'Tual'],
	'Papua': ['Jayapura'],
};

function cuacaLabel(code) {
	if (code === 0) return '☀️ Cerah';
	if (code <= 2) return '🌤️ Cerah Berawan';
	if (code === 3) return '☁️ Berawan';
	if (code <= 49) return '🌫️ Berkabut';
	if (code <= 59) return '🌦️ Gerimis';
	if (code <= 69) return '🌧️ Hujan';
	if (code <= 79) return '❄️ Salju';
	if (code <= 82) return '🌧️ Hujan Lebat';
	if (code <= 94) return '🌨️ Hujan Es';
	return '⛈️ Hujan Petir';
}

function arahAngin(deg) {
	const arah = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
	return arah[Math.round(deg / 45) % 8];
}

function uvLevel(uv) {
	if (uv <= 2) return '🟢 Rendah';
	if (uv <= 5) return '🟡 Sedang';
	if (uv <= 7) return '🟠 Tinggi';
	if (uv <= 10) return '🔴 Sangat Tinggi';
	return '🟣 Ekstrem';
}

let handler = async (m, { conn, usedPrefix, command, text }) => {

	// Kalau ada nama kota langsung
	if (text) return await kirimCuaca(m, conn, usedPrefix, text.trim());

	// Bangun sections dari WILAYAH — tiap provinsi jadi 1 section
	let sections = Object.entries(WILAYAH).map(([provinsi, kota]) => ({
		title: provinsi,
		rows: kota.map(k => ({
			title: k,
			description: `Cek cuaca ${k}, ${provinsi}`,
			id: `${usedPrefix}cuaca ${k}`,
		})),
	}));

	conn.sendButton(m.chat, {
		caption:
`🌤️ *CUACA INDONESIA*
${'─'.repeat(22)}
Pilih kota/kabupaten kamu dari daftar di bawah.

Atau langsung ketik:
*${usedPrefix + command} [nama kota]*
Contoh: *${usedPrefix + command} Bandung*`,
		footer: '⚡ Powered by Open-Meteo & BMKG',
		buttons: [
			{
				name: 'single_select',
				buttonParamsJson: JSON.stringify({
					title: '🏙️ Pilih Kota / Kabupaten',
					sections,
				}),
			},
		],
	}, { quoted: m });
};

async function kirimCuaca(m, conn, usedPrefix, kota) {
	m.react('⏳');
	try {
		let geoRes = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
			params: { name: kota, count: 1, language: 'id', format: 'json' },
			timeout: 10000,
		});

		if (!geoRes.data?.results?.length) {
			m.react('❌');
			throw `❌ Kota *${kota}* tidak ditemukan!\nCoba nama kota lain.`;
		}

		let geo = geoRes.data.results[0];
		let { latitude, longitude, name, admin1 } = geo;

		let cuacaRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
			params: {
				latitude, longitude,
				current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility',
				daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,uv_index_max,sunrise,sunset',
				timezone: 'Asia/Jakarta',
				forecast_days: 4,
			},
			timeout: 10000,
		});

		let c = cuacaRes.data.current;
		let d = cuacaRes.data.daily;

		let prakiraan = d.time.slice(1, 4).map((tgl, i) => {
			let dt = new Date(tgl);
			let hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dt.getDay()];
			return `│ ${hari} ${dt.getDate()}/${dt.getMonth()+1}  ${cuacaLabel(d.weather_code[i+1]).padEnd(22)} ${d.temperature_2m_min[i+1]}°–${d.temperature_2m_max[i+1]}°C`;
		}).join('\n');

		let sunrise = d.sunrise[0].split('T')[1];
		let sunset  = d.sunset[0].split('T')[1];

		let teks =
`🌤️ *INFO CUACA*
${'─'.repeat(22)}
📍 *${name}${admin1 ? `, ${admin1}` : ''}*

🌡️ *Suhu*         : ${c.temperature_2m}°C (terasa ${c.apparent_temperature}°C)
🌥️ *Kondisi*      : ${cuacaLabel(c.weather_code)}
💧 *Kelembapan*   : ${c.relative_humidity_2m}%
💨 *Angin*        : ${c.wind_speed_10m} km/h arah ${arahAngin(c.wind_direction_10m)}
🔵 *Tekanan*      : ${c.surface_pressure} hPa
👁️ *Visibilitas*  : ${(c.visibility / 1000).toFixed(1)} km
🌅 *Matahari*     : Terbit ${sunrise} | Terbenam ${sunset}
🔆 *Indeks UV*    : ${d.uv_index_max[0]} (${uvLevel(d.uv_index_max[0])})
🌧️ *Curah Hujan*  : ${d.precipitation_sum[0]} mm
${'─'.repeat(22)}
📅 *PRAKIRAAN 3 HARI*
${prakiraan}
${'─'.repeat(22)}
_⚡ Sumber: Open-Meteo & BMKG_`;

		m.react('✅');

		conn.sendButton(m.chat, {
			caption: teks,
			footer: '🌤️ Cuaca Indonesia',
			buttons: [
				{
					name: 'quick_reply',
					buttonParamsJson: JSON.stringify({
						display_text: '🔄 Refresh',
						id: `${usedPrefix}cuaca ${kota}`,
					}),
				},
				{
					name: 'quick_reply',
					buttonParamsJson: JSON.stringify({
						display_text: '🏙️ Kota Lain',
						id: `${usedPrefix}cuaca`,
					}),
				},
			],
		}, { quoted: m });

	} catch (e) {
		m.react('❌');
		throw e.message || `Gagal mengambil data cuaca untuk *${kota}*`;
	}
}

handler.help = ['cuaca [kota]'];
handler.tags = ['tools'];
handler.command = /^cuaca$/i;

export default handler;