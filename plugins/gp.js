import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getHighlightType(token) {
	if (/^\s+$/.test(token)) return 0;
	if (/^(import|export|default|const|let|var|function|async|await|return|if|else|for|while|try|catch|throw|new|typeof|instanceof|of|in|from)$/.test(token)) return 1;
	if (/^['"`].*['"`]$/.test(token) || /^['"`]/.test(token)) return 2;
	if (/^\d+$/.test(token)) return 3;
	if (/^\/\//.test(token)) return 4;
	return 0;
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
	if (!text) throw `Masukkan nama file plugin!\n\nContoh: *${usedPrefix + command}* namafile.js`;

	let namaFile = text.trim();
	if (!namaFile.endsWith('.js')) namaFile += '.js';

	const pluginsDir = path.join(path.dirname(__dirname), 'plugins');
	const filePath = path.join(pluginsDir, namaFile);

	if (!fs.existsSync(filePath)) {
		const semuaPlugin = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js')).sort();
		throw `*🗃️ Plugin tidak ditemukan!*\n\n*File:* ${namaFile}\n\n*Plugin tersedia:*\n${semuaPlugin.map((v, i) => `${i + 1}. ${v}`).join('\n')}`;
	}

	const code = fs.readFileSync(filePath, 'utf8');
	const pluginName = namaFile;

	const submessages = [
		{
			messageType: 2,
			messageText: `📁${pluginName}`
		},
		{
			messageType: 5,
			codeMetadata: {
				codeLanguage: 'javascript',
				codeBlocks: code.split(/(\s+)/).map(v => ({
					highlightType: getHighlightType(v),
					codeContent: v
				}))
			}
		}
	];

	const content = {
		messageContextInfo: {
			deviceListMetadata: {},
			deviceListMetadataVersion: 2,
			botMetadata: {
				pluginMetadata: {},
				richResponseSourcesMetadata: {
					sources: []
				}
			}
		},
		botForwardedMessage: {
			message: {
				richResponseMessage: {
					messageType: 1,
					submessages,
					contextInfo: {
						forwardingScore: 1,
						isForwarded: true,
						forwardedAiBotMessageInfo: {
							botJid: '0@bot'
						},
						forwardOrigin: 4
					}
				}
			}
		}
	};

	await conn.relayMessage(m.chat, content, {});
};

handler.help = ['gp <namafile.js>'];
handler.tags = ['owner'];
handler.command = /^(getplugin|gp)$/i;
handler.owner = true;

export default handler;