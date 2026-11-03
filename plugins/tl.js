import axios from 'axios'

const LANG_LIST = `🌐 *Daftar Kode Bahasa Translate*

🇮🇩 \`id\` - Indonesia
🇺🇸 \`en\` - Inggris
🇸🇦 \`ar\` - Arab
🇳🇱 \`af\` - Afrikaans
🇦🇱 \`sq\` - Albania
🇪🇹 \`am\` - Amharik
🇦🇿 \`az\` - Azerbaijan
🇧🇾 \`be\` - Belarusia
🇧🇩 \`bn\` - Bengali
🇧🇦 \`bs\` - Bosnia
🇧🇬 \`bg\` - Bulgaria
🇨🇳 \`zh\` - China
🇭🇷 \`hr\` - Kroasia
🇨🇿 \`cs\` - Ceko
🇩🇰 \`da\` - Denmark
🇳🇱 \`nl\` - Belanda
🇬🇪 \`et\` - Estonia
🇵🇭 \`tl\` - Filipina
🇫🇮 \`fi\` - Finlandia
🇫🇷 \`fr\` - Prancis
🇩🇪 \`de\` - Jerman
🇬🇷 \`el\` - Yunani
🇮🇱 \`iw\` - Ibrani
🇮🇳 \`hi\` - Hindi
🇭🇺 \`hu\` - Hungaria
🇮🇸 \`is\` - Islandia
🇮🇹 \`it\` - Italia
🇯🇵 \`ja\` - Jepang
🇯🇻 \`jw\` - Jawa
🇰🇿 \`kk\` - Kazakh
🇰🇭 \`km\` - Khmer
🇰🇷 \`ko\` - Korea
🇱🇦 \`lo\` - Laos
🇱🇻 \`lv\` - Latvia
🇱🇹 \`lt\` - Lithuania
🇲🇾 \`ms\` - Melayu
🇲🇲 \`my\` - Myanmar
🇳🇵 \`ne\` - Nepal
🇳🇴 \`no\` - Norwegia
🇮🇷 \`fa\` - Persia
🇵🇱 \`pl\` - Polandia
🇵🇹 \`pt\` - Portugis
🇷🇴 \`ro\` - Rumania
🇷🇺 \`ru\` - Rusia
🇷🇸 \`sr\` - Serbia
🇸🇰 \`sk\` - Slowakia
🇪🇸 \`es\` - Spanyol
🇸🇩 \`su\` - Sunda
🇸🇪 \`sv\` - Swedia
🇹🇭 \`th\` - Thailand
🇹🇷 \`tr\` - Turki
🇺🇦 \`uk\` - Ukraina
🇵🇰 \`ur\` - Urdu
🇻🇳 \`vi\` - Vietnam
🇾🇪 \`yi\` - Yiddish

*Cara pakai:*
*.tl* how are you *id*
*.tl en* _(reply pesan)_`

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
	// Subcommand: daftar kode bahasa (.tl-list / .tllist / .tl list)
	const isListRequest = command === 'tl-list' || command === 'tllist' || (args.length === 1 && args[0].toLowerCase() === 'list')

	if (isListRequest) {
		return conn.sendMessage(m.chat, { text: LANG_LIST }, { quoted: m })
	}

	let targetLang = 'id'
	let query = ''

	if (m.quoted && !text) {
		query = m.quoted.text || m.quoted.caption || ''
		targetLang = 'id'
	} else if (m.quoted && text) {
		query = m.quoted.text || m.quoted.caption || ''
		targetLang = text.trim().split(' ')[0] || 'id'
	} else if (args.length >= 2) {
		targetLang = args[args.length - 1]
		query = args.slice(0, -1).join(' ')
	} else {
		throw `Cara pakai:\n${usedPrefix + command} <teks> <bahasa tujuan>\n${usedPrefix + command} <bahasa tujuan> *(reply pesan)*\n\nContoh:\n${usedPrefix + command} how are you id\n${usedPrefix + command} en *(reply pesan)*\n\nKetik *.tl list* untuk daftar kode bahasa`
	}

	if (!query) throw 'Teks tidak ditemukan'

	const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(query)}`
	const res = await axios.get(url)

	const result = res.data?.[0]?.map((x) => x?.[0]).filter(Boolean).join('')
	const detectedLang = res.data?.[2] || 'auto'

	if (!result) return m.reply('Gagal menerjemahkan teks')

	await conn.sendMessage(
		m.chat,
		{
			text: `🌐 *Translate*\n\n*Dari:* ${detectedLang}\n*Ke:* ${targetLang}\n\n*Hasil:*\n${result}`,
		},
		{ quoted: m }
	)
}

handler.help = ['tl <teks> <lang>', 'tl <lang> (reply)', 'tl list']
handler.tags = ['tools']
handler.command = ['tl', 'tl-list', 'tllist']
handler.limit = true

export default handler