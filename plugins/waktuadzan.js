// ==============================
// adzan.js
// Notifikasi adzan otomatis per kota grup + mode "jangan chat dulu, sholat!"
// ==============================

import axios from 'axios';

const WAKTU_LIST = [
	{ key: 'subuh', label: 'Subuh' },
	{ key: 'dzuhur', label: 'Dzuhur' },
	{ key: 'ashar', label: 'Ashar' },
	{ key: 'maghrib', label: 'Maghrib' },
	{ key: 'isya', label: 'Isya' },
];

const pesanIngat = [
	`🕌 *— WAKTUNYA SHOLAT —*\n\nEh, @{sender} sabar dulu ya~ Sekarang baru masuk waktu *{waktu}*.\nAllah berfirman dalam QS. Al-Ankabut ayat 45, bahwa sholat itu mencegah dari perbuatan keji dan mungkar, dan mengingat Allah adalah yang paling utama.\n\n🙏 Yuk tunaikan sholat *{waktu}* dulu, nanti lanjut chat lagi~`,

	`🕋 *— TUNDA CHAT, TUNAIKAN SHOLAT —*\n\n@{sender}, waktu *{waktu}* sudah tiba. Dalam QS. An-Nisa ayat 103 dijelaskan bahwa sholat itu kewajiban yang sudah ditentukan waktunya bagi orang beriman.\n\n✨ Grup ini bisa nunggu, tapi waktu sholat nggak nunggu kita. Sholat dulu yuk!`,

	`🌙 *— PENGINGAT SHOLAT —*\n\n@{sender}, boleh chat lagi nanti ya setelah sholat *{waktu}*. QS. Al-Baqarah ayat 45 mengajarkan untuk minta tolong lewat sabar dan sholat.\n\n🕌 Yuk sisihkan waktu sebentar buat menghadap Allah dulu~`,

	`📿 *— JANGAN LUPA SHOLAT —*\n\n@{sender}, kita semua di grup ini lagi diingatkan buat sholat *{waktu}*. Rasulullah ﷺ menyebut sholat sebagai tiang agama.\n\n💬 Chat-nya bisa nanti, sholatnya jangan sampai kelewat ya!`,
];

function pad(n) {
	return String(n).padStart(2, '0');
}

function getLocalParts(date, tzOffsetHour) {
	const local = new Date(date.getTime() + (tzOffsetHour ?? 7) * 60 * 60000);
	return {
		date: local,
		tanggal: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
		tahun: local.getUTCFullYear(),
		bulan: pad(local.getUTCMonth() + 1),
		hari: pad(local.getUTCDate()),
		jam: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
	};
}

// Konversi Masehi -> Hijriyah pakai algoritma tabular (Kuwaiti algorithm).
// Ini estimasi matematis, bisa selisih ±1 hari dari penetapan resmi Kemenag/rukyat.
// Kalau grup mau lebih presisi, admin bisa override manual pakai .setramadan on/off.
function gregorianToHijri(local) {
	const day = local.getUTCDate();
	const month = local.getUTCMonth() + 1;
	const year = local.getUTCFullYear();

	const jd =
		Math.floor((1461 * (year + 4800 + Math.floor((month - 14) / 12))) / 4) +
		Math.floor((367 * (month - 2 - 12 * Math.floor((month - 14) / 12))) / 12) -
		Math.floor((3 * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100)) / 4) +
		day -
		32075;

	let l = jd - 1948440 + 10632;
	const n = Math.floor((l - 1) / 10631);
	l = l - 10631 * n + 354;
	const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
	l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
	const hMonth = Math.floor((24 * l) / 709);
	const hYear = 30 * n + j - 30;

	return { month: hMonth, year: hYear };
}

async function getJadwal(kotaId, tahun, bulan, hari) {
	global.adzanJadwalCache = global.adzanJadwalCache || {};
	const tanggal = `${tahun}-${bulan}-${hari}`;
	const cache = global.adzanJadwalCache[kotaId];
	if (cache && cache.tanggal === tanggal) return cache.jadwal;

	const res = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/${kotaId}/${tahun}/${bulan}/${hari}`);
	const jadwal = res.data?.data?.jadwal;
	if (!jadwal) return null;

	global.adzanJadwalCache[kotaId] = { tanggal, jadwal };
	return jadwal;
}

function buildAdzanText(label, kotaNama, jam) {
	if (label === 'Imsak') {
		return (
			`⏰ *— WAKTU IMSAK —*\n\n📍 ${kotaNama}\n🕐 ${jam}\n\n` +
			`_Ramadan mubarak! Sudah masuk waktu imsak, saatnya menahan diri dari makan & minum._\n` +
			`_Semoga puasa hari ini lancar sampai maghrib~_ 🌙`
		);
	}
	return (
		`🕌 *— WAKTU ADZAN —*\n\n📍 ${kotaNama}\n🕐 *${label}* — ${jam}\n\n` +
		`_Yuk bersiap menunaikan sholat ${label}. Sisihkan waktu sebentar dari aktivitas ya~_ 🙏`
	);
}

if (!global.adzanCronRunning) {
	global.adzanCronRunning = true;
	setInterval(async () => {
		if (!global.db?.data?.chats) return;
		const chats = global.db.data.chats;

		for (const [groupId, chat] of Object.entries(chats)) {
			const adzan = chat?.adzan;
			if (!adzan) continue;

			const now = new Date();

			// Buka lagi grup, TAPI CUMA kalau yang ngunci itu plugin adzan sendiri
			// (ditandain dari adzan.lockActive — field ini cuma keisi kalau adzan yang berhasil ngunci di atas).
			// Kalau grup ditutup manual atau sama .setschedule, adzan.lockActive gak pernah keisi, jadi otomatis di-skip.
			if (adzan.lockActive && Date.now() >= adzan.lockActive.until) {
				try {
					const metadata = await global.conn.groupMetadata(groupId);
					if (metadata?.announce) {
						await global.conn.groupSettingUpdate(groupId, 'not_announcement');
						await global.conn.sendMessage(groupId, {
							text: `🔓 *Grup dibuka kembali*\n\nWaktu sholat ${adzan.lockActive.waktu} sudah lewat ${adzan.lockGroup?.duration ?? 15} menit. Silakan lanjut ngobrol lagi~ 😊`,
						});
					}
					// kalau udah kebuka duluan (misal admin buka manual sebelum waktunya), gak usah diapa-apain lagi
				} catch (e) {
					console.error('[Adzan Unlock Error]', groupId, e?.message || e);
				}
				adzan.lockActive = null;
			}

			if (!adzan.enabled || !adzan.kotaId) continue;

			try {
				const lp = getLocalParts(now, adzan.tz ?? 7);

				const jadwal = await getJadwal(adzan.kotaId, lp.tahun, lp.bulan, lp.hari);
				if (!jadwal) continue;

				const hijri = gregorianToHijri(lp.date);
				const isRamadan = adzan.forceRamadan != null ? adzan.forceRamadan : hijri.month === 9;

				const waktuHariIni = [...WAKTU_LIST];
				if (isRamadan && jadwal.imsak) waktuHariIni.unshift({ key: 'imsak', label: 'Imsak' });

				for (const w of waktuHariIni) {
					const jam = jadwal[w.key];
					if (!jam || jam !== lp.jam) continue;
					if (adzan.lastTrigger?.tanggal === lp.tanggal && adzan.lastTrigger?.waktu === w.label) continue;

					let bolehLock = w.label !== 'Imsak' && adzan.lockGroup?.enabled;

					if (bolehLock) {
						try {
							const metadata = await global.conn.groupMetadata(groupId);
							if (metadata?.announce) {
								// udah kekunci duluan (manual/fitur lain) -> gak usah dikunci ulang,
								// dan gak usah dijadwalin auto-buka juga karena bukan bot yang nutup
								bolehLock = false;
							} else {
								await global.conn.groupSettingUpdate(groupId, 'announcement');
								adzan.lockActive = {
									waktu: w.label,
									until: Date.now() + (adzan.lockGroup?.duration ?? 15) * 60000,
								};
							}
						} catch (e) {
							bolehLock = false;
							console.error('[Adzan Lock Error]', groupId, e?.message || e);
						}
					}

					const teksAdzan =
						buildAdzanText(w.label, adzan.kotaNama, jam) +
						(bolehLock ? `\n\n🔒 _Grup ditutup sementara selama ${adzan.lockGroup?.duration ?? 15} menit, khusus admin yang bisa chat._` : '');

					await global.conn.sendMessage(groupId, { text: teksAdzan });
					adzan.lastTrigger = { tanggal: lp.tanggal, waktu: w.label };

					// Imsak bukan waktu sholat, jadi gak masuk mode "jangan chat dulu"
					if (w.label !== 'Imsak' && adzan.reminder?.enabled !== false) {
						adzan.active = {
							waktu: w.label,
							until: Date.now() + (adzan.reminder?.duration ?? 10) * 60000,
							reminded: {},
						};
					}
				}
			} catch (e) {
				console.error('[Adzan Cron Error]', groupId, e?.message || e);
			}
		}
	}, 60000);
}

let handler = async (m, { conn, text, command, usedPrefix }) => {
	const chat = global.db.data.chats[m.chat];
	if (!chat.adzan)
		chat.adzan = {
			enabled: false,
			kotaId: null,
			kotaNama: null,
			tz: 7,
			reminder: { enabled: true, duration: 10 },
			lockGroup: { enabled: false, duration: 15 },
		};

	if (command === 'setadzan') {
		if (!text) throw `Masukkan nama kota/kabupaten!\nContoh: *${usedPrefix + command} Jakarta*`;

		const cariKota = await axios.get(`https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(text.trim())}`);
		if (!cariKota.data?.data?.length) throw `❌ Kota *${text}* tidak ditemukan!\nCoba nama lain, contoh: Jakarta, Bandung, Surabaya, Medan`;

		const kota = cariKota.data.data[0];
		chat.adzan.kotaId = kota.id;
		chat.adzan.kotaNama = kota.lokasi;
		chat.adzan.enabled = true;
		chat.adzan.lastTrigger = null;
		chat.adzan.active = null;
		delete global.adzanJadwalCache?.[kota.id];

		m.reply(
			`✅ *Kota adzan grup ini diset ke ${kota.lokasi}*\n\n` +
				`🕌 Notifikasi adzan: *AKTIF*\n` +
				`⏱️ Mode "jangan chat dulu": *${chat.adzan.reminder?.enabled === false ? 'NONAKTIF' : 'AKTIF'}* (${chat.adzan.reminder?.duration ?? 10} menit)\n` +
				`🌙 Imsak Ramadan: otomatis terdeteksi\n\n` +
				`_Gunakan *${usedPrefix}adzan off* untuk mematikan notifikasi._`
		);
	} else if (command === 'adzan') {
		const status = text?.trim().toLowerCase();
		if (status === 'on') {
			if (!chat.adzan.kotaId) throw `Set kota dulu ya!\nContoh: *${usedPrefix}setadzan Jakarta*`;
			chat.adzan.enabled = true;
			m.reply(`🕌 *Notifikasi adzan AKTIF* untuk kota *${chat.adzan.kotaNama}*.`);
		} else if (status === 'off') {
			chat.adzan.enabled = false;
			chat.adzan.active = null;
			m.reply('🔕 *Notifikasi adzan dinonaktifkan* untuk grup ini.');
		} else {
			const s = chat.adzan;
			m.reply(
				`🕌 *STATUS ADZAN GRUP*\n${'─'.repeat(24)}\n` +
					`📍 Kota   : *${s.kotaNama || 'Belum diset'}*\n` +
					`📢 Status : *${s.enabled ? 'Aktif' : 'Nonaktif'}*\n` +
					`⏱️ Reminder: *${s.reminder?.enabled === false ? 'Nonaktif' : `Aktif (${s.reminder?.duration ?? 10} menit)`}*\n` +
					`🔒 Auto-tutup: *${s.lockGroup?.enabled ? `Aktif (${s.lockGroup?.duration ?? 15} menit)` : 'Nonaktif'}*\n` +
					`🌙 Ramadan: *${s.forceRamadan == null ? 'Otomatis' : s.forceRamadan ? 'Dipaksa ON' : 'Dipaksa OFF'}*\n${'─'.repeat(24)}\n` +
					`Penggunaan:\n• *${usedPrefix}setadzan <kota>*\n• *${usedPrefix}adzan on/off*\n• *${usedPrefix}remindsholat on/off [menit]*\n• *${usedPrefix}lockadzan on/off [menit]*\n• *${usedPrefix}setramadan on/off/auto*`
			);
		}
	} else if (command === 'remindsholat') {
		const args = text?.trim().split(/\s+/) || [];
		const status = args[0]?.toLowerCase();
		if (status === 'on') {
			const menit = parseInt(args[1]);
			chat.adzan.reminder = { enabled: true, duration: !isNaN(menit) && menit > 0 ? menit : chat.adzan.reminder?.duration ?? 10 };
			m.reply(`✅ *Mode "jangan chat dulu, sholat!" AKTIF* — berlaku selama *${chat.adzan.reminder.duration} menit* setelah adzan.`);
		} else if (status === 'off') {
			chat.adzan.reminder = { ...(chat.adzan.reminder || {}), enabled: false };
			chat.adzan.active = null;
			m.reply('❌ *Mode "jangan chat dulu, sholat!" dinonaktifkan.*\nNotifikasi adzan tetap jalan seperti biasa.');
		} else {
			throw `Format: *${usedPrefix}remindsholat on [menit]* atau *${usedPrefix}remindsholat off*\nContoh: *${usedPrefix}remindsholat on 10*`;
		}
	} else if (command === 'lockadzan') {
		const args = text?.trim().split(/\s+/) || [];
		const status = args[0]?.toLowerCase();
		if (status === 'on') {
			const menit = parseInt(args[1]);
			chat.adzan.lockGroup = { enabled: true, duration: !isNaN(menit) && menit > 0 ? menit : chat.adzan.lockGroup?.duration ?? 15 };

			m.reply(
				`🔒 *Auto-tutup grup saat adzan AKTIF!*\n\n` +
					`Pas masuk waktu sholat (Subuh/Dzuhur/Ashar/Maghrib/Isya), grup otomatis dikunci (cuma admin yang bisa chat) selama *${chat.adzan.lockGroup.duration} menit*, lalu dibuka otomatis lagi.\n\n` +
					`_Imsak gak ikut ngunci grup ya, cuma pengingat puasa aja._\n` +
					`_Kalau pas waktu adzan grupnya masih dalam kondisi tertutup (misal belum dibuka admin), fitur ini gak dijalanin dulu — nunggu grup dibuka baru aktif lagi di waktu sholat berikutnya._`
			);
		} else if (status === 'off') {
			chat.adzan.lockGroup = { ...(chat.adzan.lockGroup || {}), enabled: false };
			m.reply('🔓 *Auto-tutup grup saat adzan dinonaktifkan.*\nGrup gak akan dikunci otomatis lagi pas adzan.');
		} else {
			throw `Format: *${usedPrefix}lockadzan on [menit]* atau *${usedPrefix}lockadzan off*\nContoh: *${usedPrefix}lockadzan on 15*`;
		}
	} else if (command === 'setramadan') {
		const status = text?.trim().toLowerCase();
		if (status === 'on') {
			chat.adzan.forceRamadan = true;
			m.reply('🌙 *Mode Ramadan dipaksa AKTIF.* Notifikasi Imsak akan dikirim tiap hari.');
		} else if (status === 'off') {
			chat.adzan.forceRamadan = false;
			m.reply('☀️ *Mode Ramadan dipaksa NONAKTIF.* Notifikasi Imsak tidak akan dikirim.');
		} else if (status === 'auto') {
			chat.adzan.forceRamadan = null;
			m.reply('🔄 *Deteksi Ramadan dikembalikan ke otomatis* (dihitung dari kalender Hijriyah).');
		} else {
			throw `Format: *${usedPrefix}setramadan on/off/auto*`;
		}
	} else if (command === 'cekadzan') {
		const s = chat.adzan;
		if (!s.kotaId) return m.reply(`❌ Grup ini belum set kota.\nGunakan: *${usedPrefix}setadzan <kota>*`);

		let statusGrup = '_(gak dicek, fitur lock nonaktif)_';
		if (s.lockGroup?.enabled) {
			try {
				const metadata = await conn.groupMetadata(m.chat);
				statusGrup = metadata?.announce ? '🔒 Tertutup' : '🔓 Terbuka';
			} catch (e) {
				statusGrup = '_(gagal dicek)_';
			}
		}

		m.reply(
			`🕌 *STATUS ADZAN GRUP*\n${'─'.repeat(24)}\n` +
				`📍 Kota   : *${s.kotaNama}*\n` +
				`📢 Status : *${s.enabled ? 'Aktif' : 'Nonaktif'}*\n` +
				`⏱️ Reminder: *${s.reminder?.enabled === false ? 'Nonaktif' : `Aktif (${s.reminder?.duration ?? 10} menit)`}*\n` +
				`🔒 Auto-tutup: *${s.lockGroup?.enabled ? `Aktif (${s.lockGroup?.duration ?? 15} menit)` : 'Nonaktif'}*\n` +
				`📊 Grup sekarang: ${statusGrup}`
		);
	}
};

handler.before = async function (m, { conn }) {
	if (!m.isGroup) return;
	if (m.key?.fromMe) return;

	const chat = global.db.data.chats[m.chat];
	const active = chat?.adzan?.active;
	if (!active) return;

	if (Date.now() > active.until) {
		chat.adzan.active = null;
		return;
	}

	active.reminded = active.reminded || {};
	if (active.reminded[m.sender]) return;
	active.reminded[m.sender] = true;

	const senderNum = m.sender.split('@')[0];
	const pesan = pesanIngat[Math.floor(Math.random() * pesanIngat.length)];

	try {
		await conn.sendMessage(
			m.chat,
			{
				text: pesan.replace('{sender}', senderNum).replace(/\{waktu\}/g, active.waktu),
				mentions: [m.sender],
			},
			{ quoted: m }
		);
	} catch (e) {}
};

handler.help = ['setadzan <kota>', 'adzan on/off', 'remindsholat on/off [menit]', 'lockadzan on/off [menit]', 'setramadan on/off/auto', 'cekadzan'];
handler.tags = ['group'];
handler.command = /^(setadzan|adzan|remindsholat|lockadzan|setramadan|cekadzan)$/i;
handler.admin = true;
handler.group = true;
handler.botAdmin = true;

export default handler;