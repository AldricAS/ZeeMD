import fs from 'fs';
import path from 'path';

const emptyData = () => ({ users: {}, chats: {}, settings: {}, stats: {} });

export function createDatabase(file) {
	const db = {
		data: null,
		file,

		async read() {
			try {
				const raw = await fs.promises.readFile(file, 'utf8');
				db.data = { ...emptyData(), ...JSON.parse(raw) };
			} catch (e) {
				if (e.code === 'ENOENT') {
					db.data = emptyData();
				} else {
					const backup = `${file}.rusak-${Date.now()}`;
					await fs.promises.rename(file, backup).catch(() => {});
					console.error(`[db] file database rusak, disimpan ke ${path.basename(backup)} dan dimulai dari kosong`);
					db.data = emptyData();
				}
			}
			return db.data;
		},

		async write() {
			if (!db.data) return;
			await fs.promises.mkdir(path.dirname(file), { recursive: true });
			const tmp = `${file}.tmp`;
			await fs.promises.writeFile(tmp, JSON.stringify(db.data));
			await fs.promises.rename(tmp, file);
		},

		autosave(ms = 30000) {
			const timer = setInterval(() => db.write().catch(console.error), ms);
			timer.unref();
		},
	};
	return db;
}
