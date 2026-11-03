import sharp from 'sharp';
import axios from 'axios';

// ==============================
// KTP ZeeMD — tampilan baru
// Terang & kalem (nyaman di mata), teks besar, tanpa emoji di dalam gambar
// (emoji sering rusak di server), dan dirender 1572x1032 biar tajam di WhatsApp.
// ==============================

const FONT = "'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', 'DejaVu Sans', sans-serif";

// Warna: teks tidak pernah hitam pekat, latar tidak pernah putih menyilaukan
const C = {
	ink: '#22344D', // teks utama
	muted: '#5A6E88', // label
	line: '#C4D3E5',
	good: '#3F9060',
	warn: '#C98A1E',
	bad: '#C25555',
	gold: '#9A6A00',
};

// [warna latar pill, warna teks pill]
const ROLE_STYLE = {
	Newbie: ['#DDEFE3', '#2F6B47'],
	Member: ['#DCE8F7', '#2C5A8C'],
	Trusted: ['#D7EEF0', '#1F6B70'],
	VIP: ['#F6E7B4', '#6B4E0E'],
	Premium: ['#E6DDF5', '#5A3E8A'],
	Legend: ['#F6E7B4', '#6B4E0E'],
};

function formatTanggal(ms) {
	if (!ms || ms === -1) return 'Belum diset';
	const d = new Date(ms);
	const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
	return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function formatUang(n) {
	return (n || 0).toLocaleString('id-ID');
}

function escXml(str) {
	return String(str || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// Nama WhatsApp sering berisi emoji / huruf hias yang tidak ada di font server
// (jadi kotak kosong di gambar). Rapikan dulu khusus untuk teks di dalam kartu.
function bersihkanNama(str) {
	const s = String(str || '')
		.normalize('NFKC') // huruf hias 𝓡𝓲𝔃𝓴𝔂 → Rizky
		.replace(/[^\p{L}\p{M}\p{N}\p{P}\p{Zs}]/gu, '') // buang emoji & simbol
		.replace(/\s+/g, ' ')
		.trim();
	return s || 'Unknown';
}

// potong teks kepanjangan supaya tidak keluar dari kartu
function potong(str, max) {
	const s = String(str || '');
	return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

// titik bintang 5 sudut (untuk lambang di header)
function bintang(cx, cy, R, r) {
	return Array.from({ length: 10 }, (_, i) => {
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		const rad = i % 2 ? r : R;
		return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
	}).join(' ');
}

// Ambil foto profil, dipotong pas ke bingkai (2x ukuran tampil biar tajam)
async function getProfilePic(conn, jid) {
	try {
		const url = await conn.profilePictureUrl(jid, 'image');
		const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
		const jpg = await sharp(Buffer.from(res.data)).resize(480, 580, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer();
		return `data:image/jpeg;base64,${jpg.toString('base64')}`;
	} catch {
		return null;
	}
}

let handler = async (m, { conn }) => {
	// Tentukan target
	let targetJid = m.sender;
	if (m.mentionedJid?.length) targetJid = m.mentionedJid[0];
	else if (m.quoted) targetJid = m.quoted.sender;

	const user = global.db.data.users[targetJid];
	if (!user) throw '❌ User tidak ditemukan di database!';

	m.react('⏳');

	const namaRaw = potong(bersihkanNama(user.name), 26);
	const nama = escXml(namaRaw);
	const namaSize = namaRaw.length > 22 ? 28 : namaRaw.length > 17 ? 32 : 36;
	const nik = escXml(targetJid.split('@')[0]);
	const roleRaw = potong(user.role || 'Newbie', 12);
	const role = escXml(roleRaw);
	const [pillBg, pillFg] = ROLE_STYLE[user.role] || ROLE_STYLE.Member;
	const pillW = Math.round(40 + roleRaw.length * 15);
	const level = user.level || 1;
	const levelExp = escXml(`${level} / ${formatUang(user.exp || 0)} XP`);
	const levelExpSize = levelExp.length > 14 ? 19 : 23;
	const regTime = formatTanggal(user.regTime);
	const health = Math.max(0, Math.min(100, user.health ?? 100));
	const healthColor = health >= 60 ? C.good : health >= 30 ? C.warn : C.bad;
	const money = formatUang(user.money);
	const moneySize = money.length > 15 ? 18 : money.length > 11 ? 23 : 28;
	const premium = !!user.premium;
	const warn = user.warn || 0;
	const limit = user.limit || 0;

	// Foto profil (atau siluet kalau tidak ada)
	const fotoBase64 = await getProfilePic(conn, targetJid);
	const fotoTag = fotoBase64
		? `<image href="${fotoBase64}" x="48" y="132" width="240" height="290" preserveAspectRatio="xMidYMid slice" clip-path="url(#fotoClip)"/>`
		: `<g clip-path="url(#fotoClip)">
      <rect x="48" y="132" width="240" height="290" fill="#CBD9E8"/>
      <circle cx="168" cy="252" r="54" fill="#9DB2CB"/>
      <ellipse cx="168" cy="440" rx="112" ry="96" fill="#9DB2CB"/>
    </g>`;

	const svg = `<svg width="1572" height="1032" viewBox="0 0 1048 688" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F3F7FB"/>
      <stop offset="100%" stop-color="#DBE6F2"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3A8F94"/>
      <stop offset="100%" stop-color="#6CB5AE"/>
    </linearGradient>
    <linearGradient id="chip" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#EBD595"/>
      <stop offset="100%" stop-color="#C9A55A"/>
    </linearGradient>
    <clipPath id="cardClip"><rect width="1000" height="640" rx="34"/></clipPath>
    <clipPath id="fotoClip"><rect x="48" y="132" width="240" height="290" rx="18"/></clipPath>
    <filter id="blur" x="-10%" y="-10%" width="120%" height="125%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>

  <!-- Latar luar (bukan transparan, supaya tidak jadi hitam di WhatsApp) -->
  <rect width="1048" height="688" fill="#F4F7FB"/>

  <g transform="translate(24 24)">
    <!-- Bayangan kartu -->
    <rect x="6" y="14" width="988" height="626" rx="34" fill="${C.ink}" opacity="0.16" filter="url(#blur)"/>

    <!-- Kartu -->
    <rect width="1000" height="640" rx="34" fill="url(#bg)"/>

    <!-- Pola halus di latar -->
    <g clip-path="url(#cardClip)">
      <circle cx="60" cy="620" r="250" fill="#FFFFFF" opacity="0.35"/>
      <g fill="none" stroke="#BFD0E4" stroke-width="1.6" opacity="0.6">
        <circle cx="880" cy="130" r="110"/>
        <circle cx="880" cy="130" r="160"/>
        <circle cx="880" cy="130" r="210"/>
        <circle cx="880" cy="130" r="260"/>
      </g>
      <rect y="628" width="1000" height="12" fill="url(#accent)"/>
    </g>

    <!-- Header -->
    <circle cx="92" cy="58" r="32" fill="${C.ink}"/>
    <polygon points="${bintang(92, 58, 17, 7)}" fill="#F3F7FB"/>
    <text x="500" y="56" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="bold" fill="${C.ink}" letter-spacing="7">REPUBLIK ZEEMD</text>
    <text x="500" y="86" text-anchor="middle" font-family="${FONT}" font-size="17" fill="${C.muted}" letter-spacing="5">KARTU TANDA PENDUDUK</text>
    <!-- Chip -->
    <rect x="884" y="34" width="68" height="50" rx="10" fill="url(#chip)"/>
    <g stroke="#A68536" stroke-width="1.6" fill="none" opacity="0.7">
      <rect x="898" y="46" width="40" height="26" rx="5"/>
      <line x1="884" y1="59" x2="898" y2="59"/><line x1="938" y1="59" x2="952" y2="59"/>
      <line x1="918" y1="34" x2="918" y2="46"/><line x1="918" y1="72" x2="918" y2="84"/>
    </g>
    <line x1="48" y1="108" x2="952" y2="108" stroke="${C.line}" stroke-width="2"/>

    <!-- Foto profil -->
    <rect x="52" y="140" width="240" height="290" rx="20" fill="${C.ink}" opacity="0.16"/>
    <rect x="43" y="127" width="250" height="300" rx="22" fill="#FFFFFF"/>
    ${fotoTag}

    <!-- NIK -->
    <text x="324" y="154" font-family="${FONT}" font-size="16" font-weight="bold" fill="${C.muted}" letter-spacing="3">NIK</text>
    <text x="324" y="200" font-family="${FONT}" font-size="40" font-weight="bold" fill="${C.ink}" letter-spacing="3">${nik}</text>

    <!-- Nama -->
    <text x="324" y="254" font-family="${FONT}" font-size="16" font-weight="bold" fill="${C.muted}" letter-spacing="3">NAMA</text>
    <text x="324" y="298" font-family="${FONT}" font-size="${namaSize}" font-weight="bold" fill="${C.ink}">${nama}</text>

    <!-- Role / Level / Terdaftar -->
    <text x="324" y="352" font-family="${FONT}" font-size="16" font-weight="bold" fill="${C.muted}" letter-spacing="3">ROLE</text>
    <rect x="324" y="364" width="${pillW}" height="44" rx="22" fill="${pillBg}"/>
    <text x="${324 + pillW / 2}" y="394" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="bold" fill="${pillFg}">${role}</text>

    <text x="508" y="352" font-family="${FONT}" font-size="16" font-weight="bold" fill="${C.muted}" letter-spacing="3">LEVEL / EXP</text>
    <text x="508" y="394" font-family="${FONT}" font-size="${levelExpSize}" font-weight="bold" fill="${C.ink}">${levelExp}</text>

    <text x="780" y="352" font-family="${FONT}" font-size="16" font-weight="bold" fill="${C.muted}" letter-spacing="3">TERDAFTAR</text>
    <text x="780" y="394" font-family="${FONT}" font-size="23" font-weight="bold" fill="${C.ink}">${regTime}</text>

    <!-- Panel statistik -->
    <rect x="48" y="456" width="904" height="118" rx="24" fill="#FFFFFF" opacity="0.72" stroke="${C.line}" stroke-width="1.5"/>
    <g stroke="#D5E0EC" stroke-width="1.5">
      <line x1="280" y1="480" x2="280" y2="550"/><line x1="520" y1="480" x2="520" y2="550"/><line x1="750" y1="480" x2="750" y2="550"/>
    </g>

    <text x="84" y="494" font-family="${FONT}" font-size="15" font-weight="bold" fill="${C.muted}" letter-spacing="2">KESEHATAN</text>
    <text x="84" y="530" font-family="${FONT}" font-size="28" font-weight="bold" fill="${healthColor}">${health}/100</text>
    <rect x="84" y="544" width="170" height="9" rx="4.5" fill="#DCE6F1"/>
    <rect x="84" y="544" width="${(170 * health) / 100}" height="9" rx="4.5" fill="${healthColor}"/>

    <text x="312" y="494" font-family="${FONT}" font-size="15" font-weight="bold" fill="${C.muted}" letter-spacing="2">SALDO (KOIN)</text>
    <text x="312" y="532" font-family="${FONT}" font-size="${moneySize}" font-weight="bold" fill="${C.ink}">${money}</text>

    <text x="552" y="494" font-family="${FONT}" font-size="15" font-weight="bold" fill="${C.muted}" letter-spacing="2">PREMIUM</text>
    <text x="552" y="532" font-family="${FONT}" font-size="28" font-weight="bold" fill="${premium ? C.gold : C.muted}">${premium ? 'YA' : 'TIDAK'}</text>

    <text x="782" y="494" font-family="${FONT}" font-size="15" font-weight="bold" fill="${C.muted}" letter-spacing="2">LIMIT / WARN</text>
    <text x="782" y="532" font-family="${FONT}" font-size="28" font-weight="bold" fill="${C.ink}">${limit}<tspan dx="9" fill="${C.muted}">/</tspan><tspan dx="9" fill="${warn > 0 ? C.bad : C.ink}">${warn}</tspan></text>

    <!-- Footer -->
    <text x="500" y="607" text-anchor="middle" font-family="${FONT}" font-size="15" fill="${C.muted}">Kartu ini diterbitkan oleh sistem ZeeMD  •  Berlaku Selamanya</text>
  </g>
</svg>`;

	// flatten: pastikan tidak ada area transparan; PNG dipakai supaya teks tetap tajam
	const buffer = await sharp(Buffer.from(svg)).flatten({ background: '#F4F7FB' }).png({ compressionLevel: 9 }).toBuffer();

	m.react('✅');

	await conn.sendMessage(
		m.chat,
		{
			image: buffer,
			caption: `🪪 *KTP ZeeMD*\n👤 ${user.name || 'Unknown'}`,
		},
		{ quoted: m }
	);
};

handler.help = ['ktp', 'ktp @tag'];
handler.tags = ['tools'];
handler.command = /^(ktp)$/i;
handler.register = true;

export default handler;