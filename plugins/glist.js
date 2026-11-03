let handler = async (m, { conn, isOwner }) => {
    try {
        if (!isOwner) return m.reply('_Command ini khusus owner!_')

        let groups = await conn.groupFetchAllParticipating()
        let groupList = Object.entries(groups)

        if (!groupList.length) {
            return m.reply('_Bot belum join grup manapun_')
        }

        // urutkan berdasarkan JID biar konsisten urutannya
        groupList.sort((a, b) => a[0].localeCompare(b[0]))

        let teks = `*📋 DAFTAR GRUP BOT*\n\n`

        groupList.forEach(([jid, data], i) => {
            let nama = data.subject || 'Tanpa Nama'
            let jumlahMember = data.participants?.length || 0
            teks += `*${i + 1}.* ${nama} _(${jumlahMember} member)_\n`
        })

        teks += `\n_Total: ${groupList.length} grup_`
        teks += `\n\nGunakan *.removegrup <id>* untuk keluar dari grup`

        m.reply(teks)

    } catch (e) {
        console.log('[LISTGRUP] ERROR:', e)
        m.reply('_Gagal mengambil daftar grup_')
    }
}

handler.help = ['listgrup']
handler.tags = ['owner']
handler.command = /^listgrup$/i
handler.owner = true

export default handler