const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']; // index = JS getUTCDay() (0=Minggu)

// Urutan Senin-first buat parsing range hari (Senin=0 ... Minggu=6)
const HARI_MAP = { senin: 0, selasa: 1, rabu: 2, kamis: 3, jumat: 4, "jum'at": 4, sabtu: 5, minggu: 6 };
const HARI_MAP_REV = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];

function seninIndexToJsDay(idx) {
	// Senin(0) -> JS Monday(1), ... Minggu(6) -> JS Sunday(0)
	return (idx + 1) % 7;
}

// Parse "Senin" atau "Senin-Jumat" -> { days: [array JS getUTCDay()], label: "Senin-Jumat" }
function parseHariRange(str) {
	const parts = str
		.toLowerCase()
		.split('-')
		.map((s) => s.trim());
	if (parts.length === 1) {
		const idx = HARI_MAP[parts[0]];
		if (idx === undefined) return null;
		return { days: [seninIndexToJsDay(idx)], label: capitalize(parts[0]) };
	}
	if (parts.length === 2) {
		const startIdx = HARI_MAP[parts[0]];
		const endIdx = HARI_MAP[parts[1]];
		if (startIdx === undefined || endIdx === undefined) return null;
		const days = [];
		let i = startIdx;
		while (true) {
			days.push(seninIndexToJsDay(i));
			if (i === endIdx) break;
			i = (i + 1) % 7;
			if (days.length > 7) break; // safety
		}
		return { days, label: `${capitalize(parts[0])}-${capitalize(parts[1])}` };
	}
	return null;
}

function capitalize(s) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function sameDaySet(a, b) {
	if (a.length !== b.length) return false;
	const sa = [...a].sort().join(',');
	const sb = [...b].sort().join(',');
	return sa === sb;
}

// Cari rule custom yang cocok buat hari ini (JS getUTCDay() dari waktu lokal grup)
function findActiveCustomRule(chat, localDate) {
	const sc = chat?.scheduleCustom;
	if (!sc?.enabled || !sc?.rules?.length) return null;
	const todayJs = localDate.getUTCDay();
	return sc.rules.find((r) => r.days.includes(todayJs)) || null;
}

if (!global.scheduleCronRunning) {
	global.scheduleCronRunning = true;
	setInterval(async () => {
		const now = new Date();
		const chats = global.db.data.chats || {};

		for (const [groupId, chat] of Object.entries(chats)) {
			try {
				const customEnabled = chat?.scheduleCustom?.enabled && chat?.scheduleCustom?.rules?.length;
				const tz = customEnabled ? chat.scheduleCustom.tz ?? 7 : chat?.schedule?.tz ?? 7;

				const offset = tz * 60;
				const localDate = new Date(now.getTime() + offset * 60000);
				const hh = String(localDate.getUTCHours()).padStart(2, '0');
				const mm = String(localDate.getUTCMinutes()).padStart(2, '0');
				const currentTime = `${hh}:${mm}`;
				const tzName = tz === 7 ? 'WIB' : tz === 8 ? 'WITA' : tz === 9 ? 'WIT' : `UTC+${tz}`;
				const namaHari = HARI_ID[localDate.getUTCDay()];

				if (customEnabled) {
					const rule = findActiveCustomRule(chat, localDate);
					if (!rule) continue;

					if (rule.open && currentTime === rule.open) {
						await conn.groupSettingUpdate(groupId, 'not_announcement');
						await conn.sendMessage(groupId, {
							text:
								`╔══════════════════╗\n║   🌅 *SELAMAT PAGI!*            ║\n╚══════════════════╝\n\n` +
								`✅ *Grup sekarang DIBUKA*\n\n` +
								`📅 Jadwal  : *${rule.label}*\n` +
								`🕐 Jam buka   : *${rule.open} ${tzName}*\n` +
								`🕐 Jam tutup  : *${rule.close || '-'} ${tzName}*\n\n` +
								`📢 Silakan mulai berdiskusi!\nJaga sopan santun ya~ 😊\n\n✨ _Selamat beraktivitas semua!_ ✨`,
						});
					}

					if (rule.close && currentTime === rule.close) {
						await conn.groupSettingUpdate(groupId, 'announcement');
						await conn.sendMessage(groupId, {
							text:
								`╔══════════════════╗\n║   🌙 *SELAMAT MALAM!*      ║\n╚══════════════════╝\n\n` +
								`🔒 *Grup sekarang DITUTUP*\n\n` +
								`📅 Jadwal  : *${rule.label}*\n` +
								`🕐 Jam buka   : *${rule.open || '-'} ${tzName}*\n` +
								`🕐 Jam tutup  : *${rule.close} ${tzName}*\n\n` +
								`😴 Waktunya istirahat~\nGrup akan dibuka kembali sesuai jadwal!\n\n🌟 _Sampai jumpa lagi!_ 🌟`,
						});
					}
					continue;
				}

				// fallback ke jadwal lama (.setschedule) kalau custom gak dipakai
				const sched = chat?.schedule;
				if (!sched?.open && !sched?.close) continue;

				if (sched.open && currentTime === sched.open) {
					await conn.groupSettingUpdate(groupId, 'not_announcement');
					await conn.sendMessage(groupId, {
						text:
							`╔══════════════════╗\n║   🌅 *SELAMAT PAGI!*            ║\n╚══════════════════╝\n\n` +
							`✅ *Grup sekarang DIBUKA*\n\n🕐 Jam buka   : *${sched.open} ${tzName}*\n🕐 Jam tutup  : *${sched.close || '-'} ${tzName}*\n\n📢 Silakan mulai berdiskusi!\nJaga sopan santun ya~ 😊\n\n✨ _Selamat beraktivitas semua!_ ✨`,
					});
				}

				if (sched.close && currentTime === sched.close) {
					await conn.groupSettingUpdate(groupId, 'announcement');
					await conn.sendMessage(groupId, {
						text:
							`╔══════════════════╗\n║   🌙 *SELAMAT MALAM!*      ║\n╚══════════════════╝\n\n` +
							`🔒 *Grup sekarang DITUTUP*\n\n🕐 Jam buka   : *${sched.open || '-'} ${tzName}*\n🕐 Jam tutup  : *${sched.close} ${tzName}*\n\n😴 Waktunya istirahat~\nGrup akan dibuka kembali besok!\n\n🌟 _Sampai jumpa besok!_ 🌟`,
					});
				}
			} catch (e) {
				console.error('[Schedule Error]', groupId, e);
			}
		}
	}, 60000);
}

const handler = async (m, { text, command }) => {
	const groupId = m.chat;
	const chat = global.db.data.chats[groupId];
	if (!chat.schedule) chat.schedule = { open: null, close: null, tz: 7 };

	if (command === 'setschedule') {
		if (!text) throw `Format: *.setschedule 08:00 22:00*`;
		const args = text.trim().split(/\s+/);
		if (args.length < 2 || !/^\d{2}:\d{2}$/.test(args[0]) || !/^\d{2}:\d{2}$/.test(args[1])) throw `Format salah!\nContoh: *.setschedule 08:00 22:00*`;
		chat.schedule.open = args[0];
		chat.schedule.close = args[1];
		const tzName = (chat.schedule.tz ?? 7) === 7 ? 'WIB' : (chat.schedule.tz ?? 7) === 8 ? 'WITA' : 'WIT';
		m.reply(`✅ *Jadwal grup berhasil diset!*\n\n🟢 Buka  : *${args[0]} ${tzName}*\n🔴 Tutup : *${args[1]} ${tzName}*\n\n_Jadwal tersimpan permanen, tidak hilang walau bot restart!_ ✨`);

	} else if (command === 'settimezone') {
		const tz = parseInt(text);
		if (isNaN(tz) || tz < -12 || tz > 14) throw `Timezone tidak valid!\nContoh: *.settimezone 7*\n\n• WIB  = 7\n• WITA = 8\n• WIT  = 9`;
		chat.schedule.tz = tz;
		const tzName = tz === 7 ? 'WIB' : tz === 8 ? 'WITA' : tz === 9 ? 'WIT' : `UTC+${tz}`;
		m.reply(`✅ *Timezone diset ke ${tzName} (UTC+${tz})*`);

	} else if (command === 'deleteschedule') {
		if (!chat.schedule?.open && !chat.schedule?.close) throw 'Grup ini belum punya jadwal!';
		chat.schedule = { open: null, close: null, tz: 7 };
		m.reply(`🗑️ *Jadwal grup berhasil dihapus!*\nGrup tidak akan dibuka/ditutup otomatis lagi.`);

	} else if (command === 'cekschedule') {
		const sched = chat.schedule;
		if (!sched?.open && !sched?.close) return m.reply(`❌ Grup ini belum punya jadwal.\n\nGunakan: *.setschedule 08:00 22:00*`);
		const tzName = (sched.tz ?? 7) === 7 ? 'WIB' : (sched.tz ?? 7) === 8 ? 'WITA' : (sched.tz ?? 7) === 9 ? 'WIT' : `UTC+${sched.tz ?? 7}`;
		m.reply(`📅 *JADWAL GRUP*\n${'─'.repeat(24)}\n🟢 Buka  : *${sched.open || 'Belum diset'} ${sched.open ? tzName : ''}*\n🔴 Tutup : *${sched.close || 'Belum diset'} ${sched.close ? tzName : ''}*\n🌏 Zona  : *${tzName}*\n${'─'.repeat(24)}\n_Jadwal aktif setiap hari otomatis_`);
	} else if (command === 'setschedulecustom') {
		if (!chat.scheduleCustom) chat.scheduleCustom = { enabled: true, tz: 7, rules: [] };

		if (!text) throw `Format: *.setschedulecustom <hari/range> <jam_buka> <jam_tutup>*\n\nContoh:\n• *.setschedulecustom Senin-Jumat 08:00 22:00*\n• *.setschedulecustom Sabtu-Minggu 10:00 23:00*\n• *.setschedulecustom Jumat 06:00 20:00*\n\nHari: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu`;

		const args = text.trim().split(/\s+/);
		if (args.length < 3) throw `Format salah!\nContoh: *.setschedulecustom Senin-Jumat 08:00 22:00*`;

		const [hariStr, jamBuka, jamTutup] = args;
		if (!/^\d{2}:\d{2}$/.test(jamBuka) || !/^\d{2}:\d{2}$/.test(jamTutup)) throw `Format jam salah! Contoh: *08:00*`;

		const parsed = parseHariRange(hariStr);
		if (!parsed) throw `❌ Hari *${hariStr}* gak dikenali!\nPakai: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu (atau range: Senin-Jumat)`;

		chat.scheduleCustom.enabled = true;
		if (!chat.scheduleCustom.tz) chat.scheduleCustom.tz = 7;
		if (!chat.scheduleCustom.rules) chat.scheduleCustom.rules = [];

		// kalau ada rule dengan hari yang PERSIS sama, timpa; kalau beda, tambah baru
		const idx = chat.scheduleCustom.rules.findIndex((r) => sameDaySet(r.days, parsed.days));
		const newRule = { days: parsed.days, label: parsed.label, open: jamBuka, close: jamTutup };
		if (idx >= 0) chat.scheduleCustom.rules[idx] = newRule;
		else chat.scheduleCustom.rules.push(newRule);

		const tzName = (chat.scheduleCustom.tz ?? 7) === 7 ? 'WIB' : (chat.scheduleCustom.tz ?? 7) === 8 ? 'WITA' : 'WIT';
		const daftarRule = chat.scheduleCustom.rules.map((r) => `• *${r.label}*: ${r.open} - ${r.close} ${tzName}`).join('\n');
		m.reply(
			`✅ *Jadwal custom untuk "${parsed.label}" tersimpan!*\n\n🟢 Buka  : *${jamBuka} ${tzName}*\n🔴 Tutup : *${jamTutup} ${tzName}*\n\n📋 *Semua jadwal custom grup ini:*\n${daftarRule}\n\n_Mode jadwal custom otomatis AKTIF, mengganti jadwal .setschedule biasa._`
		);
	} else if (command === 'delschedulecustom') {
		if (!chat.scheduleCustom?.rules?.length) throw 'Grup ini belum punya jadwal custom!';
		if (!text) throw `Format: *.delschedulecustom <hari/range>*\nContoh: *.delschedulecustom Senin-Jumat*`;

		const parsed = parseHariRange(text.trim());
		if (!parsed) throw `❌ Hari *${text}* gak dikenali!`;

		const before = chat.scheduleCustom.rules.length;
		chat.scheduleCustom.rules = chat.scheduleCustom.rules.filter((r) => !sameDaySet(r.days, parsed.days));

		if (chat.scheduleCustom.rules.length === before) throw `❌ Gak ada jadwal custom untuk *${parsed.label}*.`;
		m.reply(`🗑️ *Jadwal custom "${parsed.label}" dihapus!*`);
	} else if (command === 'schedulecustom') {
		const status = text?.trim().toLowerCase();
		if (status === 'on') {
			if (!chat.scheduleCustom?.rules?.length) throw `Belum ada jadwal custom!\nGunakan: *.setschedulecustom <hari> <buka> <tutup>*`;
			chat.scheduleCustom.enabled = true;
			m.reply('✅ *Mode jadwal custom AKTIF.*');
		} else if (status === 'off') {
			if (chat.scheduleCustom) chat.scheduleCustom.enabled = false;
			m.reply('❌ *Mode jadwal custom dinonaktifkan.*\nKalau ada jadwal *.setschedule* biasa, itu yang akan dipakai lagi.');
		} else {
			throw `Format: *.schedulecustom on/off*`;
		}
	} else if (command === 'cekschedulecustom') {
		const sc = chat.scheduleCustom;
		if (!sc?.rules?.length) return m.reply(`❌ Grup ini belum punya jadwal custom.\n\nGunakan: *.setschedulecustom Senin-Jumat 08:00 22:00*`);
		const tzName = (sc.tz ?? 7) === 7 ? 'WIB' : (sc.tz ?? 7) === 8 ? 'WITA' : 'WIT';
		const daftarRule = sc.rules.map((r) => `• *${r.label}*: 🟢 ${r.open} - 🔴 ${r.close} ${tzName}`).join('\n');
		m.reply(
			`📅 *JADWAL CUSTOM GRUP*\n${'─'.repeat(24)}\n📢 Status : *${sc.enabled ? 'Aktif' : 'Nonaktif'}*\n🌏 Zona   : *${tzName}*\n\n${daftarRule}\n${'─'.repeat(24)}\n_Pakai .delschedulecustom <hari> buat hapus salah satu jadwal_`
		);
	}
};

handler.help = [
	'setschedule <HH:MM> <HH:MM>',
	'settimezone <angka>',
	'cekschedule',
	'deleteschedule',
	'setschedulecustom <hari/range> <HH:MM> <HH:MM>',
	'delschedulecustom <hari/range>',
	'schedulecustom on/off',
	'cekschedulecustom',
];
handler.tags = ['group'];
handler.command = /^(setschedule|settimezone|cekschedule|deleteschedule|setschedulecustom|delschedulecustom|schedulecustom|cekschedulecustom)$/i;
handler.admin = true;
handler.group = true;
handler.botAdmin = true;

export default handler;