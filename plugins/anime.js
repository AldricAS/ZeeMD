import axios from 'axios';

const BASE_URL = 'https://www.sankavollerei.web.id/anime';

if (!global.animeSession) {
    global.animeSession = {};
}
const animeSession = global.animeSession;

async function apiGet(path) {
    const { data } = await axios.get(`${BASE_URL}${path}`);
    return data.data;
}

let handler = async (m, { text, usedPrefix, command }) => {
    if (/^(searchanime|carianime|animesearch|nonton)$/i.test(command)) {
        // ========== SEARCH ==========
        if (!text) throw `*Cara pakai:* ${usedPrefix}${command} <judul anime>\n\nContoh: ${usedPrefix}${command} naruto`;

        m.react('🔍');

        const data = await apiGet(`/search/${encodeURIComponent(text)}`);
        const results = data?.animeList || [];

        if (!results.length) return m.reply(`❌ Anime *"${text}"* tidak ditemukan.`);

        animeSession[m.sender] = {
            step: 'pilih_anime',
            animeList: results,
        };

        const list = results.map((a, i) => `*${i + 1}.* ${a.title}`).join('\n');

        await conn.sendMessage(m.chat, {
            text:
                `🎌 *Hasil Pencarian: "${text}"*\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `${list}\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `💡 Ketik *.pilih <nomor>* untuk memilih.\n` +
                `Contoh: *.pilih 1*`,
        });
    } 
    else if (command === 'pilih') {
        // ========== PILIH NOMOR ==========
        const session = animeSession[m.sender];

        if (!session) {
            return m.reply('❌ Kamu belum search anime. Ketik *.searchanime <judul>* dulu.');
        }

        if (!text || !/^\d+$/.test(text.trim())) {
            return m.reply('❌ Masukkan nomor yang valid. Contoh: *.pilih 1*');
        }

        const num = parseInt(text.trim());

        // PILIH ANIME
        if (session.step === 'pilih_anime') {
            const idx = num - 1;
            if (idx < 0 || idx >= session.animeList.length) {
                return m.reply(`❌ Nomor tidak valid. Pilih 1-${session.animeList.length}`);
            }

            const anime = session.animeList[idx];
            m.react('⏳');

            try {
                const detail = await apiGet(`/anime/${anime.animeId}`);
                const episodes = [...(detail.episodeList || [])].reverse();

                if (!episodes.length) {
                    m.reply(`⚠️ Tidak ada episode untuk *${detail.title}*.`);
                    delete animeSession[m.sender];
                    return;
                }

                animeSession[m.sender] = {
                    step: 'pilih_episode',
                    animeTitle: detail.title,
                    episodes,
                };

                const epLines = episodes.map((ep, i) => `*${i + 1}.* ${ep.title} (${ep.date || '-'})`);
                const header = `📺 *${detail.title}*\n━━━━━━━━━━━━━━━━━━\n`;
                const footer = `\n━━━━━━━━━━━━━━━━━━\n💡 Ketik *.pilih <nomor>* untuk pilih episode.`;

                const chunkSize = 50;
                for (let i = 0; i < epLines.length; i += chunkSize) {
                    const chunk = epLines.slice(i, i + chunkSize).join('\n');
                    const isFirst = i === 0;
                    const isLast = i + chunkSize >= epLines.length;
                    await conn.sendMessage(m.chat, {
                        text: (isFirst ? header : '') + chunk + (isLast ? footer : ''),
                    });
                }
            } catch (e) {
                m.reply(`❌ Gagal ambil detail anime.\n${e.message}`);
                delete animeSession[m.sender];
            }
            return;
        }

        // PILIH EPISODE
        if (session.step === 'pilih_episode') {
            const idx = num - 1;
            if (idx < 0 || idx >= session.episodes.length) {
                return m.reply(`❌ Nomor tidak valid. Pilih 1-${session.episodes.length}`);
            }

            const ep = session.episodes[idx];
            m.react('⏳');

            try {
                const epData = await apiGet(`/episode/${ep.episodeId}`);
                const qualities = epData?.server?.qualities || [];

                const priority = ['moedesuhd', 'ondesuhd', 'odstreamhd'];
                const megaPriority = ['mega'];

                const allServers = [];
                for (const q of qualities) {
                    for (const s of q.serverList || []) {
                        allServers.push({ ...s, quality: q.title });
                    }
                }

                if (!allServers.length) {
                    m.reply(`⚠️ Tidak ada server streaming untuk episode ini.`);
                    delete animeSession[m.sender];
                    return;
                }

                const sorted = [...allServers].sort((a, b) => {
                    const aName = a.title.trim().toLowerCase();
                    const bName = b.title.trim().toLowerCase();
                    const aHD = a.quality === '720p';
                    const bHD = b.quality === '720p';
                    const aPri = priority.some(p => aName.includes(p)) && aHD;
                    const bPri = priority.some(p => bName.includes(p)) && bHD;
                    const aMega = megaPriority.some(p => aName.includes(p)) && aHD;
                    const bMega = megaPriority.some(p => bName.includes(p)) && bHD;
                    if (aPri && !bPri) return -1;
                    if (!aPri && bPri) return 1;
                    if (aMega && !bMega) return -1;
                    if (!aMega && bMega) return 1;
                    return 0;
                });

                animeSession[m.sender] = {
                    step: 'pilih_server',
                    epTitle: epData.title,
                    servers: sorted,
                };

                const srvList = sorted
                    .map((s, i) => {
                        const name = s.title.trim();
                        const q = s.quality;
                        const isRec = priority.some(p => name.toLowerCase().includes(p)) && q === '720p';
                        const isMega = megaPriority.some(p => name.toLowerCase().includes(p)) && q === '720p';
                        const tag = isRec ? ' ⭐' : isMega ? ' 💜' : '';
                        return `*${i + 1}.* ${name} [${q}]${tag}`;
                    })
                    .join('\n');

                await conn.sendMessage(m.chat, {
                    text:
                        `🖥️ *Pilih Server — ${epData.title}*\n` +
                        `━━━━━━━━━━━━━━━━━━\n` +
                        `${srvList}\n\n` +
                        `━━━━━━━━━━━━━━━━━━\n` +
                        `⭐ Rekomendasi HD  |  💜 Mega HD\n` +
                        `💡 Ketik *.pilih <nomor>* untuk pilih server.`,
                });
            } catch (e) {
                m.reply(`❌ Gagal ambil data episode.\n${e.message}`);
                delete animeSession[m.sender];
            }
            return;
        }

        // PILIH SERVER → LANGSUNG KIRIM LINK
        if (session.step === 'pilih_server') {
            const idx = num - 1;
            if (idx < 0 || idx >= session.servers.length) {
                return m.reply(`❌ Nomor tidak valid. Pilih 1-${session.servers.length}`);
            }

            const server = session.servers[idx];
            m.react('⏳');

            try {
                const srvData = await apiGet(`/server/${server.serverId}`);
                const streamUrl = srvData?.url || srvData?.embedUrl || srvData?.streamUrl || srvData;

                if (!streamUrl || typeof streamUrl !== 'string') {
                    m.reply(`⚠️ URL tidak ditemukan untuk server *${server.title.trim()}*.`);
                    delete animeSession[m.sender];
                    return;
                }

                // Langsung kirim link, hapus session
                await conn.sendMessage(m.chat, {
                    text:
                        `✅ *Link Streaming*\n\n` +
                        `🖥️ Server: *${server.title.trim()}* [${server.quality}]\n` +
                        `🔗 URL:\n${streamUrl}\n\n` +
                        `> Salin & buka di browser atau VLC.`,
                });

                delete animeSession[m.sender];
            } catch (e) {
                m.reply(`❌ Gagal ambil URL server.\n${e.message}`);
                delete animeSession[m.sender];
            }
            return;
        }
    }
};

handler.help = ['searchanime', 'pilih'];
handler.tags = ['tools'];
handler.command = /^(searchanime|pilih)$/i;
handler.limit = false;

export default handler;