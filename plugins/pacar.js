// ==============================
// RPG PACAR - ZeeMD
// ==============================

const CINTA_MAX = 100;
const CINTA_MIN = 0;

function getPacar(sender) {
	return global.db.data.users[sender]?.pacar || null;
}

function setPacar(sender, data) {
	if (!global.db.data.users[sender]) return;
	global.db.data.users[sender].pacar = data;
}

function getCintaLabel(cinta) {
	if (cinta >= 90) return '💘 Sangat Cinta Banget!';
	if (cinta >= 75) return '❤️ Sangat Cinta';
	if (cinta >= 55) return '💕 Cinta';
	if (cinta >= 35) return '💙 Suka';
	if (cinta >= 15) return '😐 Biasa Aja';
	return '💔 Hampir Putus...';
}

function getStatusNikah(pacar) {
	return pacar?.nikah ? '💍 Sudah Menikah' : '💑 Pacaran';
}

let handler = async (m, { text, usedPrefix, command }) => {
	const sender = m.sender;
	let user = global.db.data.users[sender];
	if (!user) throw 'Kamu belum terdaftar! Ketik *.daftar* dulu.';

	// Inisialisasi field pacar di database kalau belum ada
	if (!('pacar' in user)) user.pacar = null;

	const pacar = getPacar(sender);

	// ========================
	// CREATE PACAR
	// ========================
	if (command === 'createpacar') {
		if (pacar) throw `Kamu udah punya pacar! Putusin dulu dengan *.putus* kalau mau buat yang baru.`;
		if (!text) throw `Masukkan nama pacarmu!\nContoh: ${usedPrefix}createpacar Sakura\n\nSetelah itu kirim foto untuk dijadikan foto profil pacarmu! 📸`;

		const nama = text.trim().slice(0, 20);

		// Cek apakah ada foto yang di-quote/attach
		let foto = null;
		let q = m.quoted ? m.quoted : m;
		let mime = (q.msg || q).mimetype || '';
		if (/image/.test(mime)) {
			let media = await q.download();
			foto = media.toString('base64');
		}

		if (!foto) {
			// Simpan state nunggu foto
			global.db.data.users[sender].waitingPacarPhoto = nama;
			return m.reply(`✨ Nama pacar: *${nama}*\n\nSekarang kirim foto untuk foto profil pacarmu! 📸\n_(kirim foto dalam 60 detik)_`);
		}

		setPacar(sender, {
			nama,
			foto,
			cinta: 50,
			nikah: false,
			tglPacaran: Date.now(),
			tglNikah: null,
		});

		return conn.sendMessage(m.chat, {
			image: Buffer.from(foto, 'base64'),
			caption: `💝 *Yeay! Kamu sekarang punya pacar!*\n\n👤 Nama: *${nama}*\n❤️ Rasa Cinta: *50/100*\n📅 Mulai pacaran: *${new Date().toLocaleDateString('id-ID')}*\n\nGunakan command romantis untuk meningkatkan rasa cinta!\n• *.cium* - Cium pacar (+5 cinta)\n• *.peluk* - Peluk pacar (+3 cinta)\n• *.kencan* - Ajak kencan (+8 cinta)\n• *.kawin* - Lamar pacar (butuh cinta 80+)\n• *.statuspacar* - Lihat status hubungan`,
		}, { quoted: m });
	}

	// ========================
	// NUNGGU FOTO (handler before)
	// ========================

	// ========================
	// STATUS PACAR
	// ========================
	if (command === 'statuspacar') {
		if (!pacar) throw `Kamu belum punya pacar! Buat dengan *.createpacar (nama)*`;

		const lamanya = Math.floor((Date.now() - pacar.tglPacaran) / (1000 * 60 * 60 * 24));

		let caption = `💑 *STATUS HUBUNGAN*\n\n`;
		caption += `👤 Pacar: *${pacar.nama}*\n`;
		caption += `💞 Status: *${getStatusNikah(pacar)}*\n`;
		caption += `❤️ Rasa Cinta: *${pacar.cinta}/100*\n`;
		caption += `${getCintaLabel(pacar.cinta)}\n`;
		caption += `📅 Sudah bersama: *${lamanya} hari*\n`;
		if (pacar.nikah && pacar.tglNikah) {
			const lamanikah = Math.floor((Date.now() - pacar.tglNikah) / (1000 * 60 * 60 * 24));
			caption += `💍 Sudah menikah: *${lamanikah} hari*`;
		}

		if (pacar.foto) {
			return conn.sendMessage(m.chat, {
				image: Buffer.from(pacar.foto, 'base64'),
				caption,
			}, { quoted: m });
		}
		return m.reply(caption);
	}

	// ========================
	// CIUM
	// ========================
	if (command === 'cium') {
		if (!pacar) throw `Kamu belum punya pacar! Buat dengan *.createpacar (nama)*`;
		const tambah = 5;
		pacar.cinta = Math.min(CINTA_MAX, pacar.cinta + tambah);
		setPacar(sender, pacar);
		const respon = [
			`😊 *${pacar.nama}* merona dan balas ciumanmu~ Cinta +${tambah}! ❤️`,
			`💋 *${pacar.nama}* kaget tapi seneng banget diciup! Cinta +${tambah}!`,
			`🥰 *${pacar.nama}*: "I-ih... tiba-tiba aja sih~" (tapi senyum-senyum) Cinta +${tambah}!`,
		];
		return m.reply(`${respon[Math.floor(Math.random() * respon.length)]}\n\n❤️ Rasa Cinta: *${pacar.cinta}/100*`);
	}

	// ========================
	// PELUK
	// ========================
	if (command === 'peluk') {
		if (!pacar) throw `Kamu belum punya pacar! Buat dengan *.createpacar (nama)*`;
		const tambah = 3;
		pacar.cinta = Math.min(CINTA_MAX, pacar.cinta + tambah);
		setPacar(sender, pacar);
		const respon = [
			`🤗 *${pacar.nama}* balas peluk erat banget~ Cinta +${tambah}! 💕`,
			`😍 *${pacar.nama}* rebah di pelukanmu sambil senyum. Cinta +${tambah}!`,
			`🥺 *${pacar.nama}*: "Jangan lepas ya..." Cinta +${tambah}! 💙`,
		];
		return m.reply(`${respon[Math.floor(Math.random() * respon.length)]}\n\n❤️ Rasa Cinta: *${pacar.cinta}/100*`);
	}

	// ========================
	// KENCAN
	// ========================
	if (command === 'kencan') {
		if (!pacar) throw `Kamu belum punya pacar! Buat dengan *.createpacar (nama)*`;
		// Kencan butuh uang
		const biaya = 500;
		if (user.money < biaya) throw `❌ Uang kamu tidak cukup! Butuh *${biaya} koin* untuk kencan.\nUangmu: *${user.money} koin*`;
		user.money -= biaya;
		const tambah = 8;
		pacar.cinta = Math.min(CINTA_MAX, pacar.cinta + tambah);
		setPacar(sender, pacar);
		const tempat = ['cafe lucu ☕', 'pantai indah 🏖️', 'taman bunga 🌸', 'bioskop 🎬', 'restoran mewah 🍽️'];
		const t = tempat[Math.floor(Math.random() * tempat.length)];
		return m.reply(`🌟 Kamu mengajak *${pacar.nama}* kencan ke ${t}!\n\n*${pacar.nama}* seneng banget dan makin sayang sama kamu~ Cinta +${tambah}!\n💸 Biaya: -${biaya} koin\n\n❤️ Rasa Cinta: *${pacar.cinta}/100*`);
	}

	// ========================
	// HADIAH
	// ========================
	if (command === 'hadiah') {
		if (!pacar) throw `Kamu belum punya pacar! Buat dengan *.createpacar (nama)*`;
		const biaya = 1000;
		if (user.money < biaya) throw `❌ Uang kamu tidak cukup! Butuh *${biaya} koin* untuk beli hadiah.\nUangmu: *${user.money} koin*`;
		user.money -= biaya;
		const tambah = 10;
		pacar.cinta = Math.min(CINTA_MAX, pacar.cinta + tambah);
		setPacar(sender, pacar);
		const hadiah = ['buket bunga 💐', 'coklat 🍫', 'boneka 🧸', 'cincin cantik 💍', 'parfum 🌹'];
		const h = hadiah[Math.floor(Math.random() * hadiah.length)];
		return m.reply(`🎁 Kamu kasih *${pacar.nama}* ${h}!\n\n*${pacar.nama}*: "Makasih yaaa~ kamu manis banget!" 🥰 Cinta +${tambah}!\n💸 Biaya: -${biaya} koin\n\n❤️ Rasa Cinta: *${pacar.cinta}/100*`);
	}

	// ========================
	// KAWIN / LAMAR
	// ========================
	if (command === 'kawin') {
		if (!pacar) throw `Kamu belum punya pacar! Buat dengan *.createpacar (nama)*`;
		if (pacar.nikah) throw `Kamu udah menikah sama *${pacar.nama}*! 💍`;
		if (pacar.cinta < 80) throw `❌ Rasa cinta belum cukup untuk menikah!\nDibutuhkan: *80/100*\nRasa cintamu: *${pacar.cinta}/100*\n\nTerus romantis ya! 💕`;
		const biaya = 5000;
		if (user.money < biaya) throw `❌ Uang tidak cukup untuk biaya pernikahan!\nButuh: *${biaya} koin*\nUangmu: *${user.money} koin*`;
		user.money -= biaya;
		pacar.nikah = true;
		pacar.tglNikah = Date.now();
		pacar.cinta = Math.min(CINTA_MAX, pacar.cinta + 5);
		setPacar(sender, pacar);

		let caption = `💒 *SELAMAT ATAS PERNIKAHAN KALIAN!*\n\n`;
		caption += `👰 ${pacar.nama} × 🤵 ${user.name || 'Kamu'}\n\n`;
		caption += `💍 Resmi menikah pada *${new Date().toLocaleDateString('id-ID')}*\n`;
		caption += `❤️ Rasa Cinta: *${pacar.cinta}/100*\n`;
		caption += `💸 Biaya pernikahan: -${biaya} koin\n\n`;
		caption += `_Semoga langgeng selamanya~ 🥰_`;

		if (pacar.foto) {
			return conn.sendMessage(m.chat, {
				image: Buffer.from(pacar.foto, 'base64'),
				caption,
			}, { quoted: m });
		}
		return m.reply(caption);
	}

	// ========================
	// PUTUS
	// ========================
	if (command === 'putus') {
		if (!pacar) throw `Kamu belum punya pacar!`;
		const namaPacar = pacar.nama;
		const wasNikah = pacar.nikah;

		// Simpan ke daftar mantan global
		if (!global.db.data.mantanList) global.db.data.mantanList = [];
		const sudahAda = global.db.data.mantanList.find(x => x.id === `${sender}_${pacar.nama}`);
		if (!sudahAda) {
			global.db.data.mantanList.push({
				id: `${sender}_${pacar.nama}`,
				nama: pacar.nama,
				foto: pacar.foto || null,
				mantanDari: user.name || sender,
				cintaTerakhir: pacar.cinta,
				tglPutus: Date.now(),
				nikahDulu: wasNikah,
				rate: Math.max(20, Math.min(80, pacar.cinta)),
			});
		}

		setPacar(sender, null);
		if ('waitingPacarPhoto' in user) delete user.waitingPacarPhoto;
		return m.reply(`💔 *${wasNikah ? 'Kamu resmi bercerai dari' : 'Kamu putus dari'} *${namaPacar}*...*\n\n_Semoga kamu baik-baik aja ya. Masih banyak ikan di laut 🌊_\n\n💡 *${namaPacar}* sekarang masuk ke *.listcewe* dan bisa ditembak orang lain!\n\nBuat pacar baru dengan *.createpacar (nama)*`);
	}

	// ========================
	// GANTI FOTO
	// ========================
	if (command === 'fotoprofil') {
		if (!pacar) throw `Kamu belum punya pacar!`;
		let q = m.quoted ? m.quoted : m;
		let mime = (q.msg || q).mimetype || '';
		if (!/image/.test(mime)) throw `Kirim / reply foto yang mau dijadikan foto profil pacarmu!`;
		let media = await q.download();
		pacar.foto = media.toString('base64');
		setPacar(sender, pacar);
		return conn.sendMessage(m.chat, {
			image: media,
			caption: `✅ Foto profil *${pacar.nama}* berhasil diperbarui! 📸`,
		}, { quoted: m });
	}
};

// Handler sebelum command untuk tangkap foto setelah createpacar
handler.before = async function (m) {
	if (!m.message) return;
	const sender = m.sender;
	const user = global.db.data.users?.[sender];
	if (!user?.waitingPacarPhoto) return;

	const q = m.quoted ? m.quoted : m;
	const mime = (q.msg || q).mimetype || '';
	if (!/image/.test(mime)) return;

	const nama = user.waitingPacarPhoto;
	delete user.waitingPacarPhoto;

	let media = await q.download();
	let foto = media.toString('base64');

	user.pacar = {
		nama,
		foto,
		cinta: 50,
		nikah: false,
		tglPacaran: Date.now(),
		tglNikah: null,
	};

	conn.sendMessage(m.chat, {
		image: Buffer.from(foto, 'base64'),
		caption: `💝 *Yeay! Kamu sekarang punya pacar!*\n\n👤 Nama: *${nama}*\n❤️ Rasa Cinta: *50/100*\n📅 Mulai pacaran: *${new Date().toLocaleDateString('id-ID')}*\n\nCommand yang bisa kamu pakai:\n• *.cium* - Cium pacar (+5 cinta)\n• *.peluk* - Peluk pacar (+3 cinta)\n• *.kencan* - Ajak kencan (+8 cinta, -500 koin)\n• *.hadiah* - Kasih hadiah (+10 cinta, -1000 koin)\n• *.kawin* - Lamar pacar (min. cinta 80, -5000 koin)\n• *.putus* - Putus dari pacar\n• *.fotoprofil* - Ganti foto pacar\n• *.statuspacar* - Lihat status hubungan`,
	}, { quoted: m });
};

handler.help = ['createpacar <nama>', 'statuspacar', 'cium', 'peluk', 'kencan', 'hadiah', 'kawin', 'putus', 'fotoprofil'];
handler.tags = ['rpg'];
handler.command = /^(createpacar|statuspacar|cium|peluk|kencan|hadiah|kawin|putus|fotoprofil)$/i;
handler.register = true;

export default handler;