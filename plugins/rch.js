let handler = async (m, {
    conn,
    usedPrefix,
    command,
    args,
    text
}) => {
    try {
        // format: .rch <link> <emoji>
        let input = text.trim()
        let parts = input.split(' ')

        if (parts.length < 2) {
            return m.reply(`Contoh:\n${usedPrefix + command} https://whatsapp.com/channel/xxxxxx/123 😭`)
        }

        let link = parts[0]
        let emoji = parts[1]

        // parsing link channel: whatsapp.com/channel/<inviteCode>/<messageId>
        let match = link.match(/channel\/([a-zA-Z0-9]+)\/?(\d+)?/)

        if (!match) {
            return m.reply('_Link channel tidak valid!_')
        }

        let inviteCode = match[1]
        let messageId = match[2]

        if (!messageId) {
            return m.reply('_Link harus menyertakan ID pesan (angka setelah kode invite)_')
        }

        // ambil metadata channel dari invite code -> dapatkan JID newsletter
        let metadata = await conn.newsletterMetadata('invite', inviteCode)

        if (!metadata || !metadata.id) {
            return m.reply('_Gagal mengambil data channel, pastikan link valid_')
        }

        let jid = metadata.id // contoh: xxxxxxxxxx@newsletter

        // react ke pesan channel
        await conn.newsletterReactMessage(jid, messageId, emoji)

        m.reply(`_Berhasil react pesan channel dengan ${emoji}_`)

    } catch (e) {
        console.log('[RCH] ERROR:', e)
        m.reply('_Gagal react, cek apakah link/ID pesan valid atau library belum support fitur ini_')
    }
}

handler.help = ['rch <link> <emoji>']
handler.tags = ['tools']
handler.command = /^rch$/i
handler.register = true

export default handler