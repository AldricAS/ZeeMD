// Daftar 114 surat Al-Quran
const surahList = [
  { no: 1, name: "Al-Fatihah", arti: "Pembukaan", ayat: 7 },
  { no: 2, name: "Al-Baqarah", arti: "Sapi Betina", ayat: 286 },
  { no: 3, name: "Ali 'Imran", arti: "Keluarga Imran", ayat: 200 },
  { no: 4, name: "An-Nisa'", arti: "Wanita", ayat: 176 },
  { no: 5, name: "Al-Ma'idah", arti: "Hidangan", ayat: 120 },
  { no: 6, name: "Al-An'am", arti: "Binatang Ternak", ayat: 165 },
  { no: 7, name: "Al-A'raf", arti: "Tempat Tertinggi", ayat: 206 },
  { no: 8, name: "Al-Anfal", arti: "Rampasan Perang", ayat: 75 },
  { no: 9, name: "At-Taubah", arti: "Pengampunan", ayat: 129 },
  { no: 10, name: "Yunus", arti: "Nabi Yunus", ayat: 109 },
  { no: 11, name: "Hud", arti: "Nabi Hud", ayat: 123 },
  { no: 12, name: "Yusuf", arti: "Nabi Yusuf", ayat: 111 },
  { no: 13, name: "Ar-Ra'd", arti: "Guruh", ayat: 43 },
  { no: 14, name: "Ibrahim", arti: "Nabi Ibrahim", ayat: 52 },
  { no: 15, name: "Al-Hijr", arti: "Daerah Al-Hijr", ayat: 99 },
  { no: 16, name: "An-Nahl", arti: "Lebah", ayat: 128 },
  { no: 17, name: "Al-Isra'", arti: "Perjalanan Malam", ayat: 111 },
  { no: 18, name: "Al-Kahfi", arti: "Gua", ayat: 110 },
  { no: 19, name: "Maryam", arti: "Maryam", ayat: 98 },
  { no: 20, name: "Taha", arti: "Taha", ayat: 135 },
  { no: 21, name: "Al-Anbiya'", arti: "Para Nabi", ayat: 112 },
  { no: 22, name: "Al-Hajj", arti: "Haji", ayat: 78 },
  { no: 23, name: "Al-Mu'minun", arti: "Orang-orang Mukmin", ayat: 118 },
  { no: 24, name: "An-Nur", arti: "Cahaya", ayat: 64 },
  { no: 25, name: "Al-Furqan", arti: "Pembeda", ayat: 77 },
  { no: 26, name: "Asy-Syu'ara'", arti: "Para Penyair", ayat: 227 },
  { no: 27, name: "An-Naml", arti: "Semut", ayat: 93 },
  { no: 28, name: "Al-Qasas", arti: "Cerita", ayat: 88 },
  { no: 29, name: "Al-'Ankabut", arti: "Laba-laba", ayat: 69 },
  { no: 30, name: "Ar-Rum", arti: "Bangsa Romawi", ayat: 60 },
  { no: 31, name: "Luqman", arti: "Luqman", ayat: 34 },
  { no: 32, name: "As-Sajdah", arti: "Sujud", ayat: 30 },
  { no: 33, name: "Al-Ahzab", arti: "Golongan-golongan", ayat: 73 },
  { no: 34, name: "Saba'", arti: "Kaum Saba", ayat: 54 },
  { no: 35, name: "Fatir", arti: "Pencipta", ayat: 45 },
  { no: 36, name: "Ya Sin", arti: "Ya Sin", ayat: 83 },
  { no: 37, name: "As-Saffat", arti: "Yang Bershaf-shaf", ayat: 182 },
  { no: 38, name: "Sad", arti: "Sad", ayat: 88 },
  { no: 39, name: "Az-Zumar", arti: "Rombongan", ayat: 75 },
  { no: 40, name: "Gafir", arti: "Yang Maha Pengampun", ayat: 85 },
  { no: 41, name: "Fussilat", arti: "Yang Dijelaskan", ayat: 54 },
  { no: 42, name: "Asy-Syura", arti: "Musyawarah", ayat: 53 },
  { no: 43, name: "Az-Zukhruf", arti: "Perhiasan", ayat: 89 },
  { no: 44, name: "Ad-Dukhan", arti: "Kabut", ayat: 59 },
  { no: 45, name: "Al-Jasiyah", arti: "Yang Berlutut", ayat: 37 },
  { no: 46, name: "Al-Ahqaf", arti: "Bukit-bukit Pasir", ayat: 35 },
  { no: 47, name: "Muhammad", arti: "Nabi Muhammad", ayat: 38 },
  { no: 48, name: "Al-Fath", arti: "Kemenangan", ayat: 29 },
  { no: 49, name: "Al-Hujurat", arti: "Kamar-kamar", ayat: 18 },
  { no: 50, name: "Qaf", arti: "Qaf", ayat: 45 },
  { no: 51, name: "Az-Zariyat", arti: "Angin yang Menerbangkan", ayat: 60 },
  { no: 52, name: "At-Tur", arti: "Bukit", ayat: 49 },
  { no: 53, name: "An-Najm", arti: "Bintang", ayat: 62 },
  { no: 54, name: "Al-Qamar", arti: "Bulan", ayat: 55 },
  { no: 55, name: "Ar-Rahman", arti: "Yang Maha Pengasih", ayat: 78 },
  { no: 56, name: "Al-Waqi'ah", arti: "Hari Kiamat", ayat: 96 },
  { no: 57, name: "Al-Hadid", arti: "Besi", ayat: 29 },
  { no: 58, name: "Al-Mujadilah", arti: "Wanita yang Mengajukan Gugatan", ayat: 22 },
  { no: 59, name: "Al-Hasyr", arti: "Pengusiran", ayat: 24 },
  { no: 60, name: "Al-Mumtahanah", arti: "Perempuan yang Diuji", ayat: 13 },
  { no: 61, name: "As-Saf", arti: "Satu Barisan", ayat: 14 },
  { no: 62, name: "Al-Jumu'ah", arti: "Hari Jumat", ayat: 11 },
  { no: 63, name: "Al-Munafiqun", arti: "Orang-orang Munafik", ayat: 11 },
  { no: 64, name: "At-Tagabun", arti: "Hari Dinampakkan Kesalahan", ayat: 18 },
  { no: 65, name: "At-Talaq", arti: "Talak", ayat: 12 },
  { no: 66, name: "At-Tahrim", arti: "Mengharamkan", ayat: 12 },
  { no: 67, name: "Al-Mulk", arti: "Kerajaan", ayat: 30 },
  { no: 68, name: "Al-Qalam", arti: "Pena", ayat: 52 },
  { no: 69, name: "Al-Haqqah", arti: "Hari Kiamat", ayat: 52 },
  { no: 70, name: "Al-Ma'arij", arti: "Tempat-tempat Naik", ayat: 44 },
  { no: 71, name: "Nuh", arti: "Nabi Nuh", ayat: 28 },
  { no: 72, name: "Al-Jin", arti: "Jin", ayat: 28 },
  { no: 73, name: "Al-Muzzammil", arti: "Orang yang Berselimut", ayat: 20 },
  { no: 74, name: "Al-Muddassir", arti: "Orang yang Berkemul", ayat: 56 },
  { no: 75, name: "Al-Qiyamah", arti: "Hari Kiamat", ayat: 40 },
  { no: 76, name: "Al-Insan", arti: "Manusia", ayat: 31 },
  { no: 77, name: "Al-Mursalat", arti: "Malaikat yang Diutus", ayat: 50 },
  { no: 78, name: "An-Naba'", arti: "Berita Besar", ayat: 40 },
  { no: 79, name: "An-Nazi'at", arti: "Malaikat yang Mencabut", ayat: 46 },
  { no: 80, name: "Abasa", arti: "Ia Bermuka Masam", ayat: 42 },
  { no: 81, name: "At-Takwir", arti: "Menggulung", ayat: 29 },
  { no: 82, name: "Al-Infitar", arti: "Terbelah", ayat: 19 },
  { no: 83, name: "Al-Mutaffifin", arti: "Orang yang Curang", ayat: 36 },
  { no: 84, name: "Al-Insyiqaq", arti: "Terbelah", ayat: 25 },
  { no: 85, name: "Al-Buruj", arti: "Gugusan Bintang", ayat: 22 },
  { no: 86, name: "At-Tariq", arti: "Yang Datang Malam", ayat: 17 },
  { no: 87, name: "Al-A'la", arti: "Yang Paling Tinggi", ayat: 19 },
  { no: 88, name: "Al-Gasyiyah", arti: "Hari Pembalasan", ayat: 26 },
  { no: 89, name: "Al-Fajr", arti: "Fajar", ayat: 30 },
  { no: 90, name: "Al-Balad", arti: "Negeri", ayat: 20 },
  { no: 91, name: "Asy-Syams", arti: "Matahari", ayat: 15 },
  { no: 92, name: "Al-Lail", arti: "Malam", ayat: 21 },
  { no: 93, name: "Ad-Duha", arti: "Waktu Duha", ayat: 11 },
  { no: 94, name: "Al-Insyirah", arti: "Melapangkan", ayat: 8 },
  { no: 95, name: "At-Tin", arti: "Buah Tin", ayat: 8 },
  { no: 96, name: "Al-'Alaq", arti: "Segumpal Darah", ayat: 19 },
  { no: 97, name: "Al-Qadr", arti: "Kemuliaan", ayat: 5 },
  { no: 98, name: "Al-Bayyinah", arti: "Bukti yang Nyata", ayat: 8 },
  { no: 99, name: "Az-Zalzalah", arti: "Kegoncangan", ayat: 8 },
  { no: 100, name: "Al-'Adiyat", arti: "Kuda Perang", ayat: 11 },
  { no: 101, name: "Al-Qari'ah", arti: "Hari Kiamat", ayat: 11 },
  { no: 102, name: "At-Takasur", arti: "Bermegah-megahan", ayat: 8 },
  { no: 103, name: "Al-'Asr", arti: "Masa", ayat: 3 },
  { no: 104, name: "Al-Humazah", arti: "Pengumpat", ayat: 9 },
  { no: 105, name: "Al-Fil", arti: "Gajah", ayat: 5 },
  { no: 106, name: "Quraisy", arti: "Suku Quraisy", ayat: 4 },
  { no: 107, name: "Al-Ma'un", arti: "Barang yang Berguna", ayat: 7 },
  { no: 108, name: "Al-Kausar", arti: "Nikmat yang Banyak", ayat: 3 },
  { no: 109, name: "Al-Kafirun", arti: "Orang-orang Kafir", ayat: 6 },
  { no: 110, name: "An-Nasr", arti: "Pertolongan", ayat: 3 },
  { no: 111, name: "Al-Lahab", arti: "Gejolak Api", ayat: 5 },
  { no: 112, name: "Al-Ikhlas", arti: "Memurnikan Keesaan Allah", ayat: 4 },
  { no: 113, name: "Al-Falaq", arti: "Waktu Subuh", ayat: 5 },
  { no: 114, name: "An-Nas", arti: "Manusia", ayat: 6 },
]

// Bagi surahList jadi beberapa bagian (maks 24 row per section)
function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

let handler = async (m, { conn, args, usedPrefix, command }) => {

  // Jika tidak ada args → tampilkan tombol pilih surat (halaman 1-5)
  if (!args[0] || isNaN(args[0])) {
    const page = args[0] ? parseInt(args[0].replace('hal', '')) : 1
    const chunks = chunkArray(surahList, 24)
    const totalPage = chunks.length
    const currentPage = Math.min(Math.max(page, 1), totalPage)
    const currentChunk = chunks[currentPage - 1]

    let buttons = [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: `Pilih Surat (Hal ${currentPage}/${totalPage})`,
          sections: [
            {
              title: `Surat ${currentChunk[0].no}–${currentChunk[currentChunk.length - 1].no}`,
              rows: currentChunk.map(s => ({
                title: `${s.no}. ${s.name}`,
                description: `${s.arti} • ${s.ayat} ayat`,
                id: `${usedPrefix + command} ${s.no}`
              }))
            }
          ]
        })
      }
    ]

    // Tombol navigasi halaman
    let navButtons = []
    if (currentPage > 1) {
      navButtons.push({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({ display_text: `⬅️ Hal ${currentPage - 1}`, id: `${usedPrefix + command} hal${currentPage - 1}` })
      })
    }
    if (currentPage < totalPage) {
      navButtons.push({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({ display_text: `Hal ${currentPage + 1} ➡️`, id: `${usedPrefix + command} hal${currentPage + 1}` })
      })
    }

    return conn.sendButton(
      m.chat,
      {
        text: `📖 *AL-QUR'AN DIGITAL*\n\nHalaman *${currentPage}* dari *${totalPage}*\nPilih surat yang ingin dibaca.`,
        footer: "Sumber: equran.id",
        buttons: [...buttons, ...navButtons]
      },
      { quoted: m }
    )
  }

  // Jika ada nomor surat → ambil dan kirim isinya
  const noSurat = parseInt(args[0])
  const surah = surahList.find(s => s.no === noSurat)

  if (!noSurat || !surah) {
    return m.reply(`Nomor surat tidak valid. Masukkan angka 1–114.\nContoh: ${usedPrefix + command} 1`)
  }

  m.react('⏳')

  try {
    const res = await fetch(`https://equran.id/api/v2/surat/${noSurat}`)
    const json = await res.json()
    const data = json.data

    let teks = `📖 *${data.nomor}. ${data.namaLatin}* (${data.nama})\n`
    teks += `📝 Arti: _${data.arti}_\n`
    teks += `🕌 Tempat Turun: ${data.tempatTurun === 'mekah' ? 'Makkiyah' : 'Madaniyah'}\n`
    teks += `📜 Jumlah Ayat: ${data.jumlahAyat}\n\n`
    teks += `*Deskripsi:*\n${data.deskripsi.replace(/<[^>]*>/g, '')}\n\n`
    teks += `━━━━━━━━━━━━━━━━━\n\n`

    // Kirim maksimal 10 ayat pertama agar tidak terlalu panjang
    const maxAyat = data.jumlahAyat <= 20 ? data.jumlahAyat : 20
    for (let i = 0; i < maxAyat; i++) {
      const ayat = data.ayat[i]
      teks += `*Ayat ${ayat.nomorAyat}*\n`
      teks += `${ayat.teksArab}\n`
      teks += `_${ayat.teksLatin}_\n`
      teks += `${ayat.teksIndonesia}\n\n`
    }

    if (data.jumlahAyat > 20) {
      teks += `_...dan ${data.jumlahAyat - 20} ayat lainnya._\n`
      teks += `_Baca selengkapnya di: https://equran.id/surah/${noSurat}_`
    }

    m.react('✅')
    conn.sendMessage(m.chat, { text: teks }, { quoted: m })

  } catch (e) {
    m.react('❌')
    m.reply('Gagal mengambil data surat. Coba lagi nanti.')
  }

}

handler.help = ['quran']
handler.tags = ['tools']
handler.command = /^(quran|qur'an|alquran)$/i

export default handler