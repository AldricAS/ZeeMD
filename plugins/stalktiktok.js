import axios from 'axios'

let handler = async (m, { conn, text, args }) => {
  if (!args[0]) return m.reply('📌 Usage: .stalktiktok <username>\n\nContoh: .stalktiktok charlidamelio')

  m.react('⏳')

  const username = args[0].replace('@', '').trim()

  try {
    // Scrape via TikTok web API
    const { data } = await axios.get(`https://www.tiktok.com/@${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.tiktok.com/',
      }
    })

    // Extract JSON data dari __UNIVERSAL_DATA_FOR_REHYDRATION__
    const match = data.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)
    if (!match) return m.reply('❌ Gagal mengambil data. Username mungkin tidak ditemukan atau private.')

    const json = JSON.parse(match[1])

    // Navigate ke user info
    const userInfo = json?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo
    if (!userInfo) return m.reply('❌ User tidak ditemukan atau akun tidak tersedia.')

    const user = userInfo.user
    const stats = userInfo.stats

    const nickname   = user.nickname || '-'
    const uniqueId   = user.uniqueId || username
    const bio        = user.signature || 'Tidak ada bio'
    const avatar     = user.avatarLarger || user.avatarMedium || ''
    const verified   = user.verified ? '✅' : '❌'
    const privateAcc = user.privateAccount ? '🔒 Private' : '🌐 Public'
    const region     = user.region || '-'
    const language   = user.language || '-'
    const bioLink    = user.bioLink?.link || 'Tidak ada'

    const followers  = formatNum(stats.followerCount)
    const following  = formatNum(stats.followingCount)
    const likes      = formatNum(stats.heartCount)
    const videos     = formatNum(stats.videoCount)
    const friends    = formatNum(stats.friendCount)

    const teks =
      `🎵 *TIKTOK STALKER*\n` +
      `${'─'.repeat(28)}\n\n` +
      `👤 *Nama:* ${nickname}\n` +
      `🔖 *Username:* @${uniqueId}\n` +
      `✔️ *Verified:* ${verified}\n` +
      `🔐 *Status:* ${privateAcc}\n` +
      `🌍 *Region:* ${region}\n` +
      `🗣️ *Language:* ${language}\n` +
      `🔗 *Bio Link:* ${bioLink}\n\n` +
      `📝 *Bio:*\n${bio}\n\n` +
      `${'─'.repeat(28)}\n` +
      `📊 *STATISTIK*\n\n` +
      `👥 *Followers:* ${followers}\n` +
      `➡️ *Following:* ${following}\n` +
      `❤️ *Total Likes:* ${likes}\n` +
      `🎬 *Total Video:* ${videos}\n` +
      `👫 *Friends:* ${friends}\n` +
      `${'─'.repeat(28)}\n` +
      `🔗 https://www.tiktok.com/@${uniqueId}`

    if (avatar) {
      await conn.sendMessage(m.chat, {
        image: { url: avatar },
        caption: teks
      }, { quoted: m })
    } else {
      await m.reply(teks)
    }

    m.react('✅')

  } catch (e) {
    m.react('❌')
    console.error(e)
    return m.reply(`❌ Error: ${e.message}`)
  }
}

// Format angka: 1000000 → 1M, 1000 → 1K
function formatNum(num) {
  if (!num && num !== 0) return '-'
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B'
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000)         return (num / 1_000).toFixed(1) + 'K'
  return num.toString()
}

handler.help = ['stalktiktok']
handler.tags = ['tools']
handler.command = /^stalktiktok$/i

export default handler