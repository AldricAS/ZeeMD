import fs from 'fs';
import path from 'path';
import { xpRange } from '../lib/levelling.js';

const LABELS = {
	main: 'Utama',
	downloader: 'Downloader',
	search: 'Pencarian',
	internet: 'Internet',
	tools: 'Tools',
	sticker: 'Sticker',
	ai: 'AI',
	fun: 'Fun',
	game: 'Game',
	rpg: 'RPG',
	xp: 'XP & Level',
	group: 'Grup',
	info: 'Info',
	database: 'Database',
	owner: 'Owner',
};

const CAPTION_LIMIT = 1000;
const READ_MORE = String.fromCharCode(8206).repeat(4001);

const SMALL_FROM = 'abcdefghijklmnopqrstuvwxyz';
const SMALL_TO = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘqʀꜱᴛᴜᴠᴡxʏᴢ';
const small = (text) => [...String(text).toLowerCase()].map((c) => (SMALL_FROM.includes(c) ? SMALL_TO[SMALL_FROM.indexOf(c)] : c)).join('');

const NAME_MAX = 16;
const shortName = (raw) => {
	const chars = [...String(raw).replace(/\s+/g, ' ').trim()];
	return chars.length > NAME_MAX ? `${chars.slice(0, NAME_MAX - 1).join('')}…` : chars.join('');
};

const labelOf = (tag) => LABELS[tag] || tag.charAt(0).toUpperCase() + tag.slice(1);
const clock = (ms) => [Math.floor(ms / 3600000), Math.floor(ms / 60000) % 60, Math.floor(ms / 1000) % 60].map((v) => String(v).padStart(2, '0')).join(':');

function greeting() {
	const hour = Number(new Date().toLocaleString('en-GB', { timeZone: global.timezone, hour: '2-digit', hour12: false }));
	if (hour >= 18) return 'Selamat malam';
	if (hour >= 15) return 'Selamat sore';
	if (hour >= 11) return 'Selamat siang';
	if (hour >= 4) return 'Selamat pagi';
	return 'Selamat dini hari';
}

function collect(prefix, isOwner) {
	const groups = new Map();
	for (const plugin of Object.values(global.plugins)) {
		if (!plugin || plugin.disabled) continue;
		const help = [].concat(plugin.help).filter(Boolean);
		if (!help.length) continue;
		const marks = [plugin.limit && 'ʟ', plugin.premium && 'ᴘ', plugin.register && 'ʀ'].filter(Boolean).join('');
		for (const tag of [].concat(plugin.tags).filter(Boolean).slice(0, 1)) {
			if (tag === 'owner' && !isOwner) continue;
			if (!groups.has(tag)) groups.set(tag, []);
			for (const h of help) groups.get(tag).push(`${'customPrefix' in plugin ? '' : prefix}${h}${marks ? ` ${marks}` : ''}`);
		}
	}
	const order = Object.keys(LABELS);
	return [...groups.entries()]
		.map(([tag, items]) => ({ tag, items: [...new Set(items)].sort((a, b) => a.localeCompare(b)) }))
		.sort((a, b) => (order.indexOf(a.tag) + 1 || 99) - (order.indexOf(b.tag) + 1 || 99));
}

const section = (group) => [`╭──「 ${small(labelOf(group.tag))} 」`, ...group.items.map((i) => `│ ${i}`), '╰───────────────'].join('\n');

const handler = async (m, { conn, usedPrefix, isOwner, isPrems, args }) => {
	const groups = collect(usedPrefix, isOwner);
	const total = groups.reduce((n, g) => n + g.items.length, 0);
	const query = (args[0] || '').toLowerCase();
	const picked = groups.find((g) => g.tag === query || labelOf(g.tag).toLowerCase() === query);
	const wantsAll = query === 'all' || query === 'semua';

	const user = global.db.data.users[m.sender];
	const settings = global.db.data.settings[conn.user.jid];
	const { min, xp } = xpRange(user.level);
	const name = shortName(m.pushName || conn.getName(m.sender)) || 'Kamu';

	const head = [
		`╭──「 *${small(global.namebot)}* 」`,
		`│ ${greeting()},`,
		`│ *${name}*`,
		'│',
		`│ ${small('mode')}    ${settings.public ? 'Public' : 'Self'}`,
		`│ ${small('limit')}   ${isPrems ? '∞' : user.limit}`,
		`│ ${small('level')}   ${user.level} · ${user.role}`,
		`│ ${small('xp')}      ${Math.max(0, user.exp - min)}/${xp}`,
		`│ ${small('aktif')}   ${clock(process.uptime() * 1000)}`,
		`│ ${small('fitur')}   ${total}`,
		'╰───────────────',
	].join('\n');

	let body;
	let foot;
	if (picked) {
		body = section(picked);
		foot = `Ketik ${usedPrefix}menu untuk daftar kategori.`;
	} else if (wantsAll) {
		body = groups.map(section).join('\n\n');
		foot = 'ʟ butuh limit  ·  ᴘ premium  ·  ʀ wajib daftar';
	} else {
		body = [`╭──「 ${small('kategori')} 」`, ...groups.map((g) => `│ ${usedPrefix}menu ${g.tag}  ·  ${g.items.length}`), '╰───────────────'].join('\n');
		foot = `Semua perintah: ${usedPrefix}menu all\nʟ butuh limit  ·  ᴘ premium  ·  ʀ wajib daftar`;
	}

	const image = fs.readFileSync(path.join(global.__dirname(import.meta.url), '../media/menu.jpg'));
	const full = `${head}\n\n${body}\n\n${foot}`;

	const quickReply = (text, id) => ({ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: text, id }) });
	const rows = groups.map((g) => ({ title: labelOf(g.tag), description: `${g.items.length} perintah`, id: `${usedPrefix}menu ${g.tag}` }));
	const buttons = [
		...(picked || wantsAll ? [quickReply('Menu utama', `${usedPrefix}menu`)] : [{ name: 'single_select', buttonParamsJson: JSON.stringify({ title: 'Pilih kategori', sections: [{ title: 'Kategori', rows }] }) }]),
		quickReply('Owner', `${usedPrefix}owner`),
	];

	const caption = full.length <= CAPTION_LIMIT ? full : `${head}\n${READ_MORE}\n${body}\n\n${foot}`;
	await conn.sendButton(m.chat, { image, caption, footer: global.namebot, buttons }, { quoted: m });
};

handler.help = ['menu', 'menu <kategori>', 'menu all'];
handler.tags = ['main'];
handler.command = /^(menu|help|\?)$/i;
handler.exp = 3;

export default handler;
