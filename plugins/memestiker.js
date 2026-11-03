let handler = async (m, { conn }) => {
  try {
    const url = `https://api.azbry.com/api/random/meme?t=${Date.now()}`

    await conn.sendSticker(
      m.chat,
      url,
      m
    )
  } catch (e) {
    console.error(e)
    m.reply('Gagal mengambil stiker random')
  }
}

handler.help = ['memestiker']
handler.tags = ['sticker']
handler.command = /^memestiker$/i
handler.register = true

export default handler