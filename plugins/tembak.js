// ==============================
// RPG NEMBAK & LIST CEWE
// ==============================

let handler = async (m, { text, usedPrefix, command }) => {
	const sender = m.sender;
	const user = global.db.data.users[sender];
	if (!user) throw 'Kamu belum terdaftar! Ketik *.daftar* dulu.';

	// Inisialisasi daftar mantan global
	if (!global.db.data.mantanList) global.db.data.mantanList = [];

	// ========================
	// LIST CEWE
	// ========================
	if (command === 'listcewe') {
		const list = global.db.data.mantanList;
		if (!list.length) return m.reply(`💔 Belum ada cewe yang bisa ditembak saat ini.\n\nCewe muncul di sini setelah ada user yang putus dari pacarnya!`);

		let teks = `👩 *DAFTAR CEWE AVAILABLE*\n`;
		teks += `_Cewe yang bisa kamu tembak!_\n`;
		teks += `${'─'.repeat(28)}\n\n`;

		list.forEach((c, i) => {
			const hari = Math.floor((Date.now() - c.tglPutus) / (1000 * 60 * 60 * 24));
			teks += `*${i + 1}. ${c.nama}*\n`;
			teks += `   👤 Mantan dari: ${c.mantanDari}\n`;
			teks += `   💘 Rate keberhasilan: *${c.rate}%*\n`;
			teks += `   📅 Jomblo sejak: *${hari} hari lalu*\n`;
			if (c.nikahDulu) teks += `   💍 _Pernah menikah_\n`;
			teks += `\n`;
		});

		teks += `${'─'.repeat(28)}\n`;
		teks += `💡 Gunakan *.nembak (nama)* untuk nembak!\nContoh: *.nembak ${list[0]?.nama || 'Sakura'}*`;

		return m.reply(teks);
	}

	// ========================
	// NEMBAK
	// ========================
	if (command === 'nembak') {
		if (!text) throw `Masukkan nama cewe yang mau ditembak!\nContoh: ${usedPrefix}nembak Sakura\n\nLihat daftar cewe dengan *.listcewe*`;

		// Cek udah punya pacar
		if (user.pacar) throw `❌ Kamu udah punya pacar! Putusin dulu kalau mau nembak orang lain.`;

		const nama = text.trim();
		const list = global.db.data.mantanList;
		const idx = list.findIndex(x => x.nama.toLowerCase() === nama.toLowerCase());

		if (idx === -1) throw `❌ Cewe bernama *${nama}* tidak ada di daftar!\nCek *.listcewe* untuk melihat daftar yang tersedia.`;

		const target = list[idx];

		// Cooldown nembak (1x per 30 menit)
		const cooldownKey = `nembak_${sender}_${target.id}`;
		if (!global.nembakCooldown) global.nembakCooldown = {};
		const lastNembak = global.nembakCooldown[cooldownKey] || 0;
		const sisaCooldown = 30 * 60 * 1000 - (Date.now() - lastNembak);
		if (sisaCooldown > 0) {
			const menit = Math.ceil(sisaCooldown / 60000);
			throw `⏳ Kamu baru aja nembak *${target.nama}*! Tunggu *${menit} menit* lagi ya.`;
		}

		// Roll berhasil/gagal berdasarkan rate
		const roll = Math.random() * 100;
		const berhasil = roll <= target.rate;

		global.nembakCooldown[cooldownKey] = Date.now();

		if (berhasil) {
			// Berhasil! Jadiin pacar, hapus dari list
			global.db.data.users[sender].pacar = {
				nama: target.nama,
				foto: target.foto || null,
				cinta: 40, // mulai lebih rendah dari createpacar
				nikah: false,
				tglPacaran: Date.now(),
				tglNikah: null,
			};

			// Hapus dari daftar mantan
			global.db.data.mantanList.splice(idx, 1);

			const pesanBerhasil = [
				`💘 *${target.nama}* tersipu malu dan bilang "I-iya... aku mau jadi pacarmu..." 🥺`,
				`💝 *${target.nama}* kaget tapi senyum-senyum dan bilang "Oke, aku mau~"`,
				`🥰 *${target.nama}* angguk-angguk sambil tutup muka, pertanda setuju!`,
			];
			const pesan = pesanBerhasil[Math.floor(Math.random() * pesanBerhasil.length)];

			let caption = `✅ *TEMBAKAN KENA!*\n\n${pesan}\n\n`;
			caption += `👤 Pacar baru: *${target.nama}*\n`;
			caption += `❤️ Rasa Cinta awal: *40/100*\n`;
			caption += `🎯 Rate keberhasilan tadi: *${target.rate}%*\n\n`;
			caption += `_Selamat! Jaga baik-baik ya pacarmu~ 🌹_`;

			if (target.foto) {
				return conn.sendMessage(m.chat, {
					image: Buffer.from(target.foto, 'base64'),
					caption,
				}, { quoted: m });
			}
			return m.reply(caption);

		} else {
			// Gagal
			const sisaRate = Math.max(5, target.rate - 5);
			// Rate sedikit turun kalau udah pernah ditembak dan gagal
			global.db.data.mantanList[idx].rate = Math.max(15, target.rate - 2);

			const pesanGagal = [
				`😢 *${target.nama}* geleng-geleng kepala dan bilang "Maaf, aku belum siap..."`,
				`😶 *${target.nama}* diam sesaat lalu pergi tanpa jawaban...`,
				`😬 *${target.nama}*: "Hmm... aku pikir-pikir dulu ya..." _(kayaknya nggak)_`,
				`🙁 *${target.nama}* tertawa canggung dan menghindar... gagal deh.`,
			];
			const pesan = pesanGagal[Math.floor(Math.random() * pesanGagal.length)];

			return m.reply(`❌ *TEMBAKAN MELESET!*\n\n${pesan}\n\n🎯 Rate keberhasilan: *${target.rate}%*\n⏳ Coba lagi 30 menit kemudian!\n\n💡 _Tip: Makin tinggi rate-nya, makin gede peluang berhasil!_`);
		}
	}
};

handler.help = ['listcewe', 'nembak <nama>'];
handler.tags = ['rpg'];
handler.command = /^(listcewe|nembak)$/i;
handler.register = true;

export default handler;