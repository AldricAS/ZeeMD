import {
    writeFileSync,
    readFileSync,
    unlinkSync,
    existsSync,
    mkdirSync
} from 'fs'
import {
    join
} from 'path'
import {
    exec
} from 'child_process'

let handler = async (m, {
    conn,
    usedPrefix,
    command
}) => {
    try {
        let q = m.quoted ? m.quoted : m
        let mime = q.msg?.mimetype || m.msg?.mimetype || ''

        if (!/video/.test(mime)) {
            return m.reply(`Reply video yang ingin di HD dengan caption ${usedPrefix + command}`)
        }

        try { if (conn.sendMessage) await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }) } catch {}

        let tmpDir = join(process.cwd(), 'tmp')
        if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

        let inputPath = join(tmpDir, getRandom('.mp4'))
        let outputPath = join(tmpDir, getRandom('.mp4'))

        let media = await (q.download ? q.download() : m.download())
        writeFileSync(inputPath, media)

        // crf dinaikkan ke 20, preset diganti ke medium biar nggak kegedean/lama
        let cmd = `ffmpeg -y -i "${inputPath}" -vf "scale='if(gt(iw,ih),1280,-2)':'if(gt(ih,iw),1280,-2)'" -c:v libx264 -preset medium -crf 20 -c:a copy "${outputPath}"`

        exec(cmd, async (err, stdout, stderr) => {
            try {
                try { unlinkSync(inputPath) } catch {}

                if (err) {
                    console.log('[HDVID] FFMPEG ERROR:', stderr)
                    return m.reply('_Error saat proses HD video!_')
                }

                if (!existsSync(outputPath)) {
                    console.log('[HDVID] Output file tidak terbentuk')
                    return m.reply('_Gagal membuat file output_')
                }

                let buff = readFileSync(outputPath)
                console.log('[HDVID] Ukuran file output:', (buff.length / 1024 / 1024).toFixed(2), 'MB')

                // Batasi ukuran biar nggak gagal kirim (misal max 100MB)
                if (buff.length > 100 * 1024 * 1024) {
                    try { unlinkSync(outputPath) } catch {}
                    return m.reply('_Hasil video terlalu besar untuk dikirim_')
                }

                await conn.sendFile(m.chat, buff, 'hd.mp4', '✨ HD Video Ultra', m)

                try { if (conn.sendMessage) await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } }) } catch {}

                try { unlinkSync(outputPath) } catch {}
            } catch (e) {
                console.log('[HDVID] SEND/READ ERROR:', e)
                m.reply('_Error processing video_')
            }
        })

    } catch (e) {
        console.log('[HDVID] SYSTEM ERROR:', e)
        m.reply('_Terjadi kesalahan pada sistem._')
    }
}

handler.help = ['hdvideo', 'hdvid']
handler.tags = ['tools']
handler.command = /^hdvid$/i
handler.limit = true
handler.register = true

export default handler

const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`