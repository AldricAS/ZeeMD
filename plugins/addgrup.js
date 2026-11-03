let handler = async (m, {
    conn,
    usedPrefix,
    command,
    text
}) => {
    try {
        if (!text) {
            return m.reply(`Contoh:\n${usedPrefix + command} https://chat.whatsapp.com/xxxxxxxxxxxxx`)
        }

        let link = text.trim()

        // parsing invite code dari link grup
        let match = link.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/)

        if (!match) {
            return m.reply('_Link grup tidak valid!_')
        }

        let inviteCode = match[1]

        // reaksi proses
        try { if (conn.sendMessage) await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }) } catch {}

        // join grup pakai invite code
        let res = await conn.groupAcceptInvite(inviteCode)

        if (!res) {
            return m.reply('_Gagal join grup, cek apakah link masih valid atau bot sudah di-ban dari grup tersebut_')
        }

        // ambil info grup setelah join
        let groupMetadata = await conn.groupMetadata(res)
        let groupName = groupMetadata?.subject || 'Unknown'
        let memberCount = groupMetadata?.participants?.length || 0

        try { if (conn.sendMessage) await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } }) } catch {}

        m.reply(`_Berhasil join grup!_\n\n*Nama:* ${groupName}\n*Jumlah member:* ${memberCount}\n*JID:* ${res}`)

    } catch (e) {
        console.log('[ADDBOT] ERROR:', e)

        // error umum yang biasa terjadi
        if (e.message?.includes('conflict') || e.message?.includes('already')) {
            return m.reply('_Bot sudah berada di grup tersebut_')
        }
        if (e.message?.includes('gone') || e.message?.includes('not-authorized')) {
            return m.reply('_Link invite sudah tidak berlaku atau bot di-blokir dari grup_')
        }

        m.reply('_Gagal join grup, cek console untuk detail error_')
    }
}

handler.help = ['addbot <link grup>']
handler.tags = ['owner']
handler.command = /^addbot$/i
handler.owner = true  // khusus owner

export default handler