import axios from 'axios'

let handler = async (m, { text, usedPrefix, command }) => {
  if (!text) {
    throw `Contoh:\n${usedPrefix + command} Aldric`
  }

  m.react('⏳')

  const api = `https://api.azbry.com/api/maker/fakeff?name=${encodeURIComponent(text)}`

  try {
    await conn.sendMessage(
      m.chat,
      {
        image: { url: api },
        caption: `🎮 Fake Free Fire\n👤 Nama: ${text}`
      },
      { quoted: m }
    )

    m.react('✅')
  } catch (e) {
    m.react('❌')
    throw 'Gagal membuat Fake FF'
  }
}

handler.help = ['fakeff <nama>']
handler.tags = ['tools']
handler.command = /^fakeff$/i
handler.limit = true

export default handler