# ZeeMD

Base bot WhatsApp Multi-Device berbasis [Baileys](https://github.com/WhiskeySockets/Baileys) dengan sistem plugin. Ringan, mudah ditambah fitur, dan plugin bisa diubah tanpa restart.

## Menjalankan

Butuh Node.js 20+, `ffmpeg`, dan perintah `zip` (untuk fitur backup).

```bash
npm install
npm start
```

Saat pertama kali jalan, bot meminta nomor WhatsApp lalu menampilkan kode pairing. Buka WhatsApp, pilih Perangkat tertaut, lalu Tautkan dengan nomor telepon. Isi `global.pairingNumber` di `config.js` kalau tidak mau mengetik nomor tiap login baru.

## Konfigurasi (`config.js`)

| Pengaturan | Fungsi |
| --- | --- |
| `owner` | Daftar owner: `[nomor, nama, developer]` |
| `namebot`, `author`, `source` | Identitas bot |
| `prefix` | Awalan perintah, default `. ! # /` |
| `apikeyTheresav` | API key TheresAV untuk perintah `play`. Wajib diisi sendiri |
| `dailyLimit` | Limit harian per user |
| `stickpack`, `stickauth` | Nama pack dan author stiker |

## Fitur

161 file plugin, sekitar 214 perintah. Ketik `.menu` untuk daftar kategori, `.menu <kategori>` untuk satu kategori, dan `.menu all` untuk semuanya.

| Kategori | Isi |
| --- | --- |
| Utama | menu, ping, runtime, owner, afk, dan lainnya |
| Downloader | `play`, TikTok, Instagram, MediaFire, SFile, YouTube search, DaFont |
| Tools | sticker, toimg, brat, QR code, HD foto/video, remove bg, ssweb, KTP, dan lainnya |
| Fun | cek khodam, cek sifat, truth/dare, lovemeter, tebak-tebakan, dan lainnya |
| Game | `snake`, `2048`, `memory`, `xo`, catur, dino |
| RPG | mining, berburu, mancing, berkebun, dagang, craft, bank, dan lainnya (wajib `.daftar`) |
| XP & Level | `daftar`, `levelup`, `cek sn`, `unreg` |
| Grup | tagall, hidetag, antilink, antifoto, antiribut, welcome, jadwal buka/tutup, dan lainnya |
| Info | cuaca, gempa, jadwal sholat/adzan, status bot, dan lainnya |
| Owner | public/self, premium, ban, backup, kelola plugin, `> kode`, `=> ekspresi` |

Plugin dari bot lama yang memakai API key tidak dibawa. Satu-satunya yang butuh key adalah `play`, dan key-nya diisi sendiri di `config.js`.

Beberapa plugin memanggil API publik pihak ketiga (misalnya azbry, siputzx, theresav). Kalau layanan itu mati, plugin terkait ikut gagal.

## Membuat plugin

Taruh file `.js` di folder `plugins/`. Bot memuatnya otomatis, dan memuat ulang saat file diubah.

```js
const handler = async (m, { conn, text, args, usedPrefix, command }) => {
	await m.reply(`Halo ${text || 'dunia'}`);
};

handler.help = ['halo <nama>'];
handler.tags = ['main'];
handler.command = ['halo'];

export default handler;
```

Properti plugin yang didukung:

- `command`: string, array, atau RegExp
- `help`, `tags`: dipakai menu. Tag baru otomatis jadi kategori di menu. Jangan pakai tag `admin`
- `rowner`, `owner`, `premium`, `group`, `private`, `admin`, `botAdmin`, `register`, `level`: pembatas akses
- `limit`: jumlah limit yang terpakai, `exp`: XP yang didapat
- `customPrefix`, `before`, `all`, `after`, `fail`: untuk kebutuhan lanjutan

## Struktur

```
index.js      peluncur, restart otomatis
main.js       koneksi, pairing, pemuat plugin
handler.js    pemroses pesan masuk
config.js     pengaturan
lib/          simple.js (helper socket), message-builder.js, database, dll.
plugins/      semua fitur
media/        gambar menu
```

`lib/message-builder.js` berisi `Button` dan `AIRich` untuk pesan interaktif. `plugins/fun-game.js` dan `plugins/downloader-play.js` memakai `AIRich` sebagai contoh.
