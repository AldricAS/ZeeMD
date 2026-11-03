let handler = async (m, { conn, usedPrefix, command, text, isOwner }) => {
    try {
        if (!isOwner) return m.reply('_Command ini khusus owner!_')

        if (!text || isNaN(text.trim())) {
            return m.reply(`Contoh:\n${usedPrefix + command} 11\n\nLihat nomor id grup lewat *.listgrup*`)
        }

        let id = parseInt(text.trim())

        let groups = await conn.groupFetchAllParticipating()
        let groupList = Object.entries(groups)
        groupList.sort((a, b) => a[0].localeCompare(b[0]))

        if (id < 1 || id > groupList.length) {
            return m.reply(`_ID tidak valid! Gunakan angka 1-${groupList.length}_`)
        }

        let [jid, data] = groupList[id - 1]
        let namaGrup = data.subject || 'Tanpa Nama'

        await conn.groupLeave(jid)

        m.reply(`_Berhasil keluar dari grup:_ *${namaGrup}*`)

    } catch (e) {
        console.log('[REMOVEGRUP] ERROR:', e)
        m.reply('_Gagal keluar dari grup, cek console untuk detail_')
    }
}

handler.help = ['removegrup <id>']
handler.tags = ['owner']
handler.command = /^removegrup$/i
handler.owner = true

export default handler