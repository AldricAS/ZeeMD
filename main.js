import './config.js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { format } from 'util';
import { fileURLToPath, pathToFileURL } from 'url';
import pino from 'pino';
import chalk from 'chalk';
import syntaxError from 'syntax-error';
import { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason, Browsers } from 'baileys';
import { makeWASocket, protoType, serialize } from './lib/simple.js';
import { createDatabase } from './lib/db.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = path.join(ROOT, 'plugins');
const SESSION_DIR = path.join(ROOT, 'sessions');
const TMP_DIR = path.join(ROOT, 'tmp');
const STOP_CODE = 2;

global.__filename = (url = import.meta.url, rmPrefix = process.platform !== 'win32') => (rmPrefix ? (/file:\/\/\//.test(url) ? fileURLToPath(url) : url) : pathToFileURL(url).toString());
global.__dirname = (url) => path.dirname(global.__filename(url, true));

const log = (tag, text) => console.log(`${chalk.gray(new Date().toLocaleTimeString('id-ID', { timeZone: global.timezone, hour12: false }))} ${chalk.bold(tag)} ${text}`);

protoType();
serialize();

global.db = createDatabase(path.join(ROOT, 'data', 'database.json'));
global.loadDatabase = async () => global.db.read();
await global.loadDatabase();
global.db.autosave();

/* ---------------------------------- plugin --------------------------------- */

global.plugins = {};

async function loadPlugin(name) {
	const file = path.join(PLUGIN_DIR, name);
	const problem = syntaxError(fs.readFileSync(file), name, { sourceType: 'module', allowAwaitOutsideFunction: true });
	if (problem) {
		log(chalk.red('PLUGIN'), `kesalahan sintaks di ${name}\n${format(problem)}`);
		return false;
	}
	try {
		const mod = await import(`${pathToFileURL(file).href}?update=${Date.now()}`);
		global.plugins[name] = mod.default || mod;
		return true;
	} catch (e) {
		delete global.plugins[name];
		log(chalk.red('PLUGIN'), `gagal memuat ${name}: ${e.message}`);
		return false;
	}
}

const pluginFiles = () => fs.readdirSync(PLUGIN_DIR).filter((f) => f.endsWith('.js')).sort();
for (const name of pluginFiles()) await loadPlugin(name);
log(chalk.green('PLUGIN'), `${Object.keys(global.plugins).length} plugin dimuat`);

const timers = new Map();
function debounced(key, fn) {
	clearTimeout(timers.get(key));
	timers.set(key, setTimeout(fn, 250));
}

fs.watch(PLUGIN_DIR, (_event, name) => {
	if (!name?.endsWith('.js')) return;
	debounced(name, async () => {
		if (!fs.existsSync(path.join(PLUGIN_DIR, name))) {
			delete global.plugins[name];
			return log(chalk.yellow('PLUGIN'), `${name} dihapus`);
		}
		const existed = name in global.plugins;
		if (await loadPlugin(name)) log(chalk.green('PLUGIN'), `${name} ${existed ? 'diperbarui' : 'ditambahkan'}`);
	});
});

/* --------------------------------- handler --------------------------------- */

let handlerModule = await import('./handler.js');

fs.watch(path.join(ROOT, 'handler.js'), () => {
	debounced('handler', async () => {
		const problem = syntaxError(fs.readFileSync(path.join(ROOT, 'handler.js')), 'handler.js', { sourceType: 'module' });
		if (problem) return log(chalk.red('HANDLER'), `kesalahan sintaks\n${format(problem)}`);
		try {
			handlerModule = await import(`./handler.js?update=${Date.now()}`);
			log(chalk.green('HANDLER'), 'diperbarui');
		} catch (e) {
			log(chalk.red('HANDLER'), e.message);
		}
	});
});

/* -------------------------------- koneksi ---------------------------------- */

function askNumber() {
	const preset = String(global.pairingNumber || '').replace(/\D/g, '');
	if (preset) return Promise.resolve(preset);
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) =>
		rl.question(chalk.cyan('Masukkan nomor WhatsApp bot (contoh 628123456789): '), (answer) => {
			rl.close();
			resolve(answer.replace(/\D/g, ''));
		})
	);
}

let reconnectDelay = 3000;
let onlineTimer = null;

function stopOnlineLoop() {
	clearInterval(onlineTimer);
	onlineTimer = null;
}

function startOnlineLoop(conn) {
	stopOnlineLoop();
	const ping = () => conn.sendPresenceUpdate('available').catch(() => {});
	ping();
	onlineTimer = setInterval(ping, 60 * 1000);
}

async function connect() {
	const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
	const { version } = await fetchLatestBaileysVersion().catch(() => ({}));
	const logger = pino({ level: 'silent' });

	let conn;
	conn = makeWASocket({
		version,
		logger,
		browser: Browsers.ubuntu('Chrome'),
		auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
		printQRInTerminal: false,
		markOnlineOnConnect: true,
		keepAliveIntervalMs: 25000,
		syncFullHistory: false,
		generateHighQualityLinkPreview: true,
		cachedGroupMetadata: async (jid) => conn.chats[jid]?.metadata,
		getMessage: async (key) => conn.loadMessage(key.id)?.message || undefined,
	});
	global.conn = conn;

	if (!conn.authState.creds.registered) {
		const number = await askNumber();
		setTimeout(async () => {
			try {
				const code = await conn.requestPairingCode(number);
				console.log(`\n${chalk.bgGreen.black(' KODE PAIRING ')} ${chalk.bold(code?.match(/.{1,4}/g)?.join('-') || code)}\nBuka WhatsApp > Perangkat tertaut > Tautkan dengan nomor telepon.\n`);
			} catch (e) {
				log(chalk.red('PAIRING'), `gagal meminta kode: ${e.message}`);
			}
		}, 3000);
	}

	conn.ev.on('creds.update', saveCreds);

	// Tolak otomatis setiap panggilan suara/video yang masuk.
	conn.ev.on('call', async (calls) => {
		for (const call of calls) {
			if (call.status !== 'offer') continue;
			await conn.rejectCall(call.id, call.from).catch((e) => log(chalk.red('CALL'), `gagal menolak panggilan: ${e.message}`));
			log(chalk.yellow('CALL'), `panggilan ${call.isVideo ? 'video' : 'suara'} dari ${String(call.from).split('@')[0]} ditolak`);
		}
	});

	conn.ev.on('connection.update', ({ connection, lastDisconnect }) => {
		if (connection === 'open') {
			reconnectDelay = 3000;
			conn.user.jid = conn.decodeJid(conn.user.id);
			global.db.data.settings[conn.user.jid] ||= { public: true, gconly: false, autoread: false };
			log(chalk.green('KONEK'), `${conn.user.name || global.namebot} (${conn.user.jid.split('@')[0]})`);
			startOnlineLoop(conn);
		}
		if (connection !== 'close') return;

		stopOnlineLoop();
		conn.ev.removeAllListeners();
		const code = lastDisconnect?.error?.output?.statusCode;
		if (code === DisconnectReason.loggedOut) {
			log(chalk.red('KELUAR'), 'sesi dikeluarkan dari WhatsApp. Hapus folder sessions lalu jalankan ulang untuk login baru.');
			global.db.write().finally(() => process.exit(STOP_CODE));
			return;
		}
		log(chalk.yellow('PUTUS'), `kode ${code ?? '?'}, mencoba lagi dalam ${reconnectDelay / 1000} detik`);
		setTimeout(() => connect().catch(console.error), reconnectDelay);
		reconnectDelay = Math.min(reconnectDelay * 2, 60000);
	});

	const dispatch = (name) => (payload) => handlerModule[name]?.call(conn, payload)?.catch?.(console.error);
	conn.participantsUpdate = (payload) => handlerModule.participantsUpdate.call(conn, payload);
	conn.ev.on('messages.upsert', dispatch('handler'));
	conn.ev.on('group-participants.update', dispatch('participantsUpdate'));
	conn.ev.on('groups.update', dispatch('groupsUpdate'));
	conn.ev.on('message.delete', dispatch('deleteUpdate'));
}

/* ---------------------------------- rawat ---------------------------------- */

fs.mkdirSync(TMP_DIR, { recursive: true });
setInterval(
	() => {
		const limit = Date.now() - 15 * 60 * 1000;
		for (const file of fs.readdirSync(TMP_DIR)) {
			const full = path.join(TMP_DIR, file);
			try {
				if (fs.statSync(full).mtimeMs < limit) fs.unlinkSync(full);
			} catch {}
		}
	},
	30 * 60 * 1000
).unref();

async function shutdown() {
	await global.db.write().catch(() => {});
	process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));

await connect();
