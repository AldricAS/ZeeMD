import { JIMAT_LIST } from './rpg-tokojimat.js';

let handler = async (m, { usedPrefix }) => {
	let user = global.db.data.users[m.sender];

	if (!user.jimat || !user.jimat.key || !JIMAT_LIST[user.jimat.key] || user.jimat.sisa <= 0) {
		throw `❌ Kamu Tidak Punya Jimat Aktif Untuk Dibuang!\n\nKetik *${usedPrefix}belijimat* Untuk Beli Jimat Baru.`;
	}

	let jimat = JIMAT_LIST[user.jimat.key];
	let sisaSebelum = user.jimat.sisa;

	user.jimat = null;

	m.reply(
		`🗑️ *Jimat Berhasil Dibuang!*\n\n` +
			`${jimat.nama} (sisa pakai: *${sisaSebelum}x*) sudah kamu lepas dan buang.\n\n` +
			`⚠️ Kamu sekarang tidak punya perlindungan apapun dari *.santet* atau *.merampok*.\n` +
			`Ketik *${usedPrefix}belijimat* Kalau Mau Beli Jimat Baru.`
	);
};

handler.help = ['buangjimat'];
handler.tags = ['rpg'];
handler.command = /^(buangjimat|lepasjimat)$/i;
handler.register = true;

export default handler;