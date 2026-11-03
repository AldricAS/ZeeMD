import { smsg } from './lib/simple.js';
import initDatabase from './lib/database.js';
import print from './lib/print.js';
import { fileURLToPath } from 'url';
import path from 'path';

const PLUGIN_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'plugins');
const MAX_AGE_SECONDS = 60;
const DEFAULT_EXP = 10;

const escapeRegex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

function toSeconds(timestamp) {
	if (!timestamp) return 0;
	if (typeof timestamp === 'object') return Number(timestamp.low ?? timestamp.toNumber?.() ?? 0);
	return Number(timestamp);
}

function prefixMatcher(prefix) {
	const list = Array.isArray(prefix) ? prefix : [prefix];
	return list
		.map((p) => (p instanceof RegExp ? new RegExp(p.source, p.flags.replace('g', '')) : typeof p === 'string' ? new RegExp(`^${escapeRegex(p)}`) : null))
		.filter(Boolean);
}

function findPrefix(prefix, text) {
	for (const re of prefixMatcher(prefix)) {
		const hit = re.exec(text);
		if (hit) return hit[0];
	}
	return '';
}

function commandMatches(rule, command) {
	if (rule instanceof RegExp) return rule.test(command);
	if (Array.isArray(rule)) return rule.some((r) => commandMatches(r, command));
	return typeof rule === 'string' && rule === command;
}

function sameUser(conn, participant, jid) {
	return [participant.id, participant.phoneNumber, participant.lid, participant.jid].filter(Boolean).some((id) => conn.getJid(id) === jid);
}

/**
 * @param {import('baileys').BaileysEventMap['messages.upsert']} chatUpdate
 */
export async function handler(chatUpdate) {
	if (!chatUpdate?.messages?.length) return;
	this.pushMessage(chatUpdate.messages).catch(console.error);

	let m = chatUpdate.messages.at(-1);
	if (!m || !m.message) return;
	if (Date.now() / 1000 - toSeconds(m.messageTimestamp) > MAX_AGE_SECONDS) return;
	if (global.db.data == null) await global.loadDatabase();

	try {
		m = smsg(this, m) || m;
		m.exp = 0;
		m.limit = 0;
		if (m.sender.endsWith('@broadcast') || m.sender.endsWith('@newsletter')) return;
		if (m.isBaileys) return;
		if (typeof m.text !== 'string') m.text = '';

		initDatabase(m, this);
		const settings = global.db.data.settings[this.user.jid];
		const user = global.db.data.users[m.sender];

		const botNumber = this.decodeJid(this.user.id).replace(/[^0-9]/g, '');
		const ownerJids = [botNumber, ...global.owner.map(([number]) => number)].map((n) => `${String(n).replace(/[^0-9]/g, '')}@s.whatsapp.net`);
		const isROwner = ownerJids.includes(m.sender);
		const isOwner = isROwner || m.fromMe;
		const isPrems = isROwner || user.premiumTime > Date.now();

		if (user.banned && !isOwner) return;
		if (settings.gconly && !m.isGroup && !isOwner && !isPrems) return;
		if (!settings.public && !isOwner) return;

		const groupMetadata = (m.isGroup ? this.chats[m.chat]?.metadata || (await this.groupMetadata(m.chat).catch(() => null)) : null) || {};
		const participants = (m.isGroup ? groupMetadata.participants : null) || [];
		const senderData = participants.find((p) => sameUser(this, p, m.sender)) || {};
		const botData = participants.find((p) => sameUser(this, p, this.user.jid) || (this.user.lid && sameUser(this, p, this.decodeJid(this.user.lid)))) || {};
		const isRAdmin = senderData.admin === 'superadmin';
		const isAdmin = isRAdmin || senderData.admin === 'admin';
		const isBotAdmin = Boolean(botData.admin);

		m.exp += Math.ceil(Math.random() * DEFAULT_EXP);

		for (const [name, plugin] of Object.entries(global.plugins)) {
			if (!plugin || plugin.disabled) continue;

			const base = { conn: this, participants, groupMetadata, user: senderData, bot: botData, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: PLUGIN_DIR, __filename: path.join(PLUGIN_DIR, name) };

			if (typeof plugin.all === 'function') {
				try {
					await plugin.all.call(this, m, base);
				} catch (e) {
					console.error(`[plugin ${name}] all:`, e);
				}
			}

			const usedPrefix = findPrefix(plugin.customPrefix ?? this.prefix ?? global.prefix, m.text);

			if (typeof plugin.before === 'function') {
				try {
					if (await plugin.before.call(this, m, { ...base, usedPrefix })) continue;
				} catch (e) {
					console.error(`[plugin ${name}] before:`, e);
				}
			}

			if (typeof plugin !== 'function' || !usedPrefix) continue;

			const noPrefix = m.text.slice(usedPrefix.length);
			const [rawCommand = '', ...args] = noPrefix.trim().split(/\s+/).filter(Boolean);
			const command = rawCommand.toLowerCase();
			const text = noPrefix.trim().split(/\s+/).slice(1).join(' ');

			if (!commandMatches(plugin.command, command)) continue;

			m.plugin = name;
			const fail = plugin.fail || global.dfail;
			const chat = global.db.data.chats[m.chat];
			if (chat?.isBanned && !isOwner) return;

			const denied =
				(plugin.rowner && !isROwner && 'rowner') ||
				(plugin.owner && !isOwner && 'owner') ||
				(plugin.premium && !isPrems && 'premium') ||
				(plugin.group && !m.isGroup && 'group') ||
				(plugin.private && m.isGroup && 'private') ||
				(plugin.botAdmin && !isBotAdmin && 'botAdmin') ||
				(plugin.admin && !isAdmin && 'admin') ||
				(plugin.register === true && !user.registered && 'unreg');
			if (denied) {
				fail(denied, m, this);
				continue;
			}

			if (plugin.level > user.level) {
				this.reply(m.chat, `Butuh level ${plugin.level} untuk perintah ini. Levelmu ${user.level}.`, m);
				continue;
			}

			const cost = Number(plugin.limit) || 0;
			if (cost && !isPrems && user.limit < cost) {
				this.reply(m.chat, `Limit kamu habis. Limit direset otomatis setiap hari.`, m);
				continue;
			}

			m.isCommand = true;
			m.exp += 'exp' in plugin ? Number(plugin.exp) || 0 : DEFAULT_EXP;

			try {
				await plugin.call(this, m, { ...base, usedPrefix, noPrefix, args, command, text });
				if (!isPrems) m.limit = cost;
			} catch (e) {
				m.error = e;
				console.error(`[plugin ${name}]`, e);
				await m.reply(`Terjadi kesalahan pada perintah *${usedPrefix}${command}*.\n\n\`\`\`${e?.message || e}\`\`\``).catch(() => {});
			} finally {
				if (typeof plugin.after === 'function') {
					await plugin.after.call(this, m, { ...base, usedPrefix, args, command, text }).catch(console.error);
				}
			}
			break;
		}
	} catch (e) {
		console.error(e);
	} finally {
		if (m?.sender) {
			const user = global.db.data.users[m.sender];
			if (user) {
				user.exp += Number(m.exp || 0);
				user.limit -= Number(m.limit || 0);
			}
			if (m.plugin) {
				const stats = (global.db.data.stats[m.plugin] ||= { total: 0, success: 0, last: 0 });
				stats.total++;
				stats.last = Date.now();
				if (!m.error) stats.success++;
			}
			try {
				print(m, this);
			} catch (e) {
				console.error('[print]', e.message);
			}
			if (global.db.data.settings[this.user.jid]?.autoread) await this.readMessages([m.key]).catch(() => {});
		}
	}
}

global.dfail = (type, m, conn) => {
	const message = {
		rowner: 'Perintah ini hanya untuk developer bot.',
		owner: 'Perintah ini hanya untuk owner bot.',
		premium: 'Perintah ini hanya untuk pengguna premium.',
		group: 'Perintah ini hanya bisa dipakai di dalam grup.',
		private: 'Perintah ini hanya bisa dipakai di chat pribadi.',
		admin: 'Perintah ini hanya untuk admin grup.',
		botAdmin: 'Jadikan bot sebagai admin grup dulu untuk memakai perintah ini.',
		unreg: 'Kamu harus mendaftar dulu sebelum memakai fitur ini.\nKetik *.daftar nama.umur*, contoh: *.daftar Budi.17*',
		restrict: 'Fitur restrict belum diaktifkan di chat ini.',
	}[type];
	if (message) return conn.reply(m.chat, message, m);
};

const fillTemplate = (template, { user, subject, desc }) => template.replace(/@user/g, `@${user.split('@')[0]}`).replace(/@subject/g, subject).replace(/@desc/g, desc || '');

/**
 * @param {import('baileys').BaileysEventMap['group-participants.update']} update
 */
export async function participantsUpdate({ id, participants, action }) {
	if (global.db.data == null) await global.loadDatabase();
	const chat = global.db.data.chats[id];
	if (!chat) return;
	const metadata = this.chats[id]?.metadata || (await this.groupMetadata(id).catch(() => null)) || {};
	const subject = metadata.subject || this.getName(id);

	for (const participant of participants) {
		const jid = this.getJid(participant?.phoneNumber || participant?.id || participant);

		if (action === 'add' || action === 'remove') {
			if (!chat.welcome) continue;
			const template = action === 'add' ? chat.sWelcome || 'Selamat datang @user di @subject!' : chat.sBye || 'Sampai jumpa @user.';
			const text = fillTemplate(template, { user: jid, subject, desc: metadata.desc });
			const image = await this.profilePictureUrl(jid, 'image', 'buffer').catch(() => null);
			await this.sendMessage(id, image ? { image, caption: text, mentions: [jid] } : { text, mentions: [jid] }).catch(console.error);
		}

		if ((action === 'promote' || action === 'demote') && chat.detect) {
			const template = action === 'promote' ? chat.sPromote || '@user kini menjadi admin.' : chat.sDemote || '@user tidak lagi menjadi admin.';
			await this.sendMessage(id, { text: fillTemplate(template, { user: jid, subject, desc: metadata.desc }), mentions: [jid] }).catch(console.error);
		}
	}
}

/**
 * @param {import('baileys').BaileysEventMap['groups.update']} updates
 */
export async function groupsUpdate(updates) {
	for (const update of updates) {
		const chat = global.db.data.chats[update.id];
		if (!update.id || !chat?.detect) continue;
		const text = update.desc
			? `Deskripsi grup diubah menjadi:\n${update.desc}`
			: update.subject
				? `Nama grup diubah menjadi:\n${update.subject}`
				: update.icon
					? 'Ikon grup diubah.'
					: update.revoke
						? `Tautan grup diubah:\n${update.revoke}`
						: '';
		if (text) await this.sendMessage(update.id, { text }).catch(console.error);
	}
}

export async function deleteUpdate(message) {
	try {
		const { fromMe, id, participant } = message;
		if (fromMe) return;
		const msg = this.serializeM(this.loadMessage(id));
		if (!msg || !global.db.data.chats[msg.chat]?.delete) return;
		await this.reply(msg.chat, `Terdeteksi @${participant.split('@')[0]} menghapus sebuah pesan.\nMatikan fitur ini dengan *.disable delete*`, msg, { mentions: [participant] });
		await this.copyNForward(msg.chat, msg).catch(console.error);
	} catch (e) {
		console.error(e);
	}
}
