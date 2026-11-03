import { rollTangkalJimat } from './rpg-tokojimat.js';

const COOLDOWN = 2 * 60 * 60 * 1000; // 2 jam
const HADIAH = 20000;
const HP_KURANG_TARGET = 60;
const HP_KURANG_DIRI = 70;
const MIN_HEALTH_SANTET = 70;
const MAX_HEALTH = 100;

const CERITA_AWAL = [
	'🌙 Tengah malam, kamu menyalakan kemenyan dan menyebut nama targetmu pelan-pelan...',
	'🕯️ Kamu menusukkan jarum ke boneka jerami sambil membaca mantra warisan mbah dukun...',
	'🪔 Asap kemenyan mengepul, bayangan di dinding ikut bergerak. Kamu mulai merapal santet...',
];

const CERITA_BERHASIL = [
	'Tiba-tiba angin berhenti bertiup. Boneka jerami terbakar sendiri — tandanya santet berhasil menembus pertahanan target! 🔥',
	'Suara gaib menjawab mantramu. Roh yang kamu kirim berhasil menembus tubuh target tanpa perlawanan! 👻',
	'Jarum di boneka jerami patah dengan sendirinya — pertanda santetmu sukses total! 🪡',
];

const CERITA_GAGAL = [
	'Tiba-tiba petir menyambar di luar. Santetmu ditolak balik oleh penangkal target dan menghantam dirimu sendiri! ⚡',
	'Mantra yang kamu baca salah lafal — rohnya marah dan balik menyerangmu sendiri! 💀',
	'Boneka jerami yang kamu pegang terbakar di tanganmu sendiri. Santet backfire! 🔥',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let handler = async (m, { conn }) => {
	let users = global.db.data.users;
	let sender = users[m.sender];

	let who = m.mentionedJid && m.mentionedJid[0];
	if (!who) throw 'Tag Orang Yang Ingin Kamu Santet!\nContoh: .santet @orang';
	if (who === m.sender) throw 'Tidak Bisa Menyantet Diri Sendiri!';
	if (typeof users[who] == 'undefined') throw 'Orang Yang Kamu Tag Tidak Ada Didalam Database';

	sender.health = sender.health ?? MAX_HEALTH;
	let target = users[who];
	target.health = target.health ?? MAX_HEALTH;

	if (sender.health < MIN_HEALTH_SANTET) {
		throw `🧿 Tubuhmu Terlalu Lemah Untuk Bersantet!\n\nRitual santet butuh stamina minimal *${MIN_HEALTH_SANTET} HP*, kalau dipaksa kamu sendiri yang bisa kena tumbal.\n\n❤️ HP Kamu Sekarang: *${sender.health}/${MAX_HEALTH}*\nGunakan *.heal* dulu untuk memulihkan HP.`;
	}

	let now = Date.now();
	sender.lastsantet = sender.lastsantet || 0;
	let sisa = COOLDOWN - (now - sender.lastsantet);

	if (sisa > 0) {
		conn.reply(m.chat, `🧿 Dukun Sedang Istirahat!\nTunggu *${clockString(sisa)}* Untuk Bersantet Lagi`, m);
		return;
	}

	sender.lastsantet = now;

	let berhasil = Math.random() < 0.5; // 50% chance
	let cerita = pick(CERITA_AWAL);

	if (berhasil) {
		// Cek apakah target punya jimat yang menangkal santet
		if (rollTangkalJimat(target)) {
			conn.reply(
				m.chat,
				`${cerita}\n\nSantetmu sudah mengenai target, tapi tiba-tiba jimat yang dipakai @${who.split('@')[0]} berkilau dan menangkal serangan gaibmu! 🧿✨\n\n` +
					`🛡️ *SANTET DITANGKAL JIMAT!*\n\n` +
					`Tidak ada uang yang didapat, dan target tidak terluka.\n\n` +
					`⏳ Cooldown Santet: 2 Jam`,
				m,
				{ mentions: [who] }
			);
			return;
		}

		sender.money = (sender.money || 0) + HADIAH;
		target.health = Math.max(0, target.health - HP_KURANG_TARGET);

		conn.reply(
			m.chat,
			`${cerita}\n\n${pick(CERITA_BERHASIL)}\n\n` +
				`🧿 *SANTET BERHASIL!*\n\n` +
				`💰 Kamu Mendapatkan: *Rp${HADIAH.toLocaleString('id')}*\n` +
				`❤️ HP @${who.split('@')[0]} Berkurang: *-${HP_KURANG_TARGET}* (Sisa: ${target.health}/${MAX_HEALTH})\n\n` +
				`⏳ Cooldown Santet: 2 Jam`,
			m,
			{ mentions: [who] }
		);
	} else {
		sender.health = Math.max(0, sender.health - HP_KURANG_DIRI);

		conn.reply(
			m.chat,
			`${cerita}\n\n${pick(CERITA_GAGAL)}\n\n` +
				`💥 *SANTET GAGAL!*\n\n` +
				`❤️ HP Kamu Berkurang: *-${HP_KURANG_DIRI}* (Sisa: ${sender.health}/${MAX_HEALTH})\n\n` +
				`⏳ Cooldown Santet: 2 Jam`,
			m
		);
	}
};

handler.help = ['santet @tag'];
handler.tags = ['rpg'];
handler.command = /^santet$/i;
handler.group = true;

export default handler;

function clockString(ms) {
	let h = Math.floor(ms / 3600000);
	let mn = Math.floor(ms / 60000) % 60;
	let s = Math.floor(ms / 1000) % 60;
	return `${h.toString().padStart(2, '0')} Jam ${mn.toString().padStart(2, '0')} Menit ${s.toString().padStart(2, '0')} Detik`;
}