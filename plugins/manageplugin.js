import fs from 'fs';
import path from 'path';

const PLUGINS_DIR = path.join(process.cwd(), 'plugins');

let handler = async (m, { text, command, usedPrefix }) => {

	// ========================
	// ADD PLUGIN
	// ========================
	if (command === 'addplugin') {
		if (!text) throw `Format salah!\n\n*.addplugin nama: namafile.js kode: (isi kode)*\n\nContoh:\n*.addplugin nama: test.js kode: let handler = async (m) => { m.reply("halo") }; handler.command = /^test$/i; export default handler;*`;

		const namaMatch = text.match(/nama\s*:\s*([^\s]+\.js)/i);
		const kodeMatch = text.match(/kode\s*:\s*([\s\S]+)/i);

		if (!namaMatch) throw '❌ Nama file tidak ditemukan!\nFormat: *nama: namafile.js*';
		if (!kodeMatch) throw '❌ Kode plugin tidak ditemukan!\nFormat: *kode: (isi kode)*';

		const namaFile = namaMatch[1].replace(/[^a-zA-Z0-9\-_.]/g, '');
		if (!namaFile.endsWith('.js')) throw '❌ Nama file harus berekstensi *.js*!';

		const kode = kodeMatch[1].trim();
		const filePath = path.join(PLUGINS_DIR, namaFile);

		if (fs.existsSync(filePath)) throw `❌ Plugin *${namaFile}* sudah ada!\nGunakan nama lain atau hapus dulu dengan *.delplugin ${namaFile}*`;

		fs.writeFileSync(filePath, kode, 'utf8');

		// Reload plugin
		try {
			const plugin = await import(`${filePath}?v=${Date.now()}`);
			global.plugins[namaFile] = plugin.default || plugin;
			m.reply(`✅ *Plugin berhasil ditambahkan!*\n\n📄 File : *${namaFile}*\n📦 Ukuran : *${Buffer.byteLength(kode)} bytes*\n\n_Plugin aktif tanpa perlu restart bot!_`);
		} catch (e) {
			// File sudah tersimpan tapi gagal load, tetap kasih tau
			m.reply(`✅ *Plugin tersimpan!*\n📄 File : *${namaFile}*\n\n⚠️ Plugin gagal dimuat otomatis: ${e.message}\n_Akan aktif setelah bot restart._`);
		}
	}

	// ========================
	// DEL PLUGIN
	// ========================
	else if (command === 'delplugin') {
		if (!text) throw `Format: *.delplugin namafile.js*\nContoh: *.delplugin test.js*`;

		const namaFile = text.trim().replace(/[^a-zA-Z0-9\-_.]/g, '');
		if (!namaFile.endsWith('.js')) throw '❌ Nama file harus berekstensi *.js*!';

		const filePath = path.join(PLUGINS_DIR, namaFile);
		if (!fs.existsSync(filePath)) throw `❌ Plugin *${namaFile}* tidak ditemukan!`;

		fs.unlinkSync(filePath);

		// Hapus dari global plugins
		if (global.plugins?.[namaFile]) delete global.plugins[namaFile];

		m.reply(`🗑️ *Plugin berhasil dihapus!*\n\n📄 File : *${namaFile}*\n\n_Plugin dinonaktifkan tanpa perlu restart bot!_`);
	}

	// ========================
	// LIST PLUGIN
	// ========================
	else if (command === 'listplugin') {
		const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js')).sort();
		m.reply(`📦 *DAFTAR PLUGIN* (${files.length})\n\n${files.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
	}
};

handler.help = ['addplugin nama: <file.js> kode: <kode>', 'delplugin <file.js>', 'listplugin'];
handler.tags = ['owner'];
handler.command = /^(addplugin|delplugin|listplugin)$/i;
handler.owner = true;

export default handler;