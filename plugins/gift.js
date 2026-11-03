import { randomUUID } from 'crypto'

// gift.js
// Kirim hadiah (money, heal, dll) ke user lain.
// - TIDAK dikirim ke grup (cuma react + 1 baris ack singkat)
// - Detail + kartu HADIAH dikirim PRIBADI (DM) ke nomor yang ditag
// - Kartunya berupa kotak hadiah interaktif: tap -> meledak -> muncul detail
// - Bisa nambahin pesan opsional
//
// Format:
//   .gift @tag/nomor jumlah type:jenis nama:sembunyikan/munculkan pesan:teks bebas...
//
// PENTING: taruh "pesan:" PALING AKHIR karena isinya boleh mengandung spasi.
//
// Contoh:
//   .gift @user 50000 type:money
//   .gift 628123456789 100000 type:money nama:sembunyikan
//   .gift @user 2 type:heal
//   .gift @user 50000 type:money pesan:Semoga harimu menyenangkan ya!

const GIFT_TYPES = {
	money: { field: 'money', label: 'Uang', emoji: '💵' },
	bank: { field: 'bank', label: 'Saldo Bank', emoji: '🏦' },
	atm: { field: 'atm', label: 'Tabungan (ATM)', emoji: '💳' },
	health: { field: 'health', label: 'Health / Nyawa', emoji: '❤️' },
	potion: { field: 'potion', label: 'Potion', emoji: '🧪' },
	diamond: { field: 'diamond', label: 'Diamond', emoji: '💎' },
	emerald: { field: 'emerald', label: 'Emerald', emoji: '💚' },
	exp: { field: 'exp', label: 'EXP', emoji: '✨' },
	limit: { field: 'limit', label: 'Limit', emoji: '🔋' },
	iron: { field: 'iron', label: 'Iron', emoji: '🔩' },
	wood: { field: 'wood', label: 'Kayu', emoji: '🪵' },
	rock: { field: 'rock', label: 'Batu', emoji: '🪨' },
	string: { field: 'string', label: 'String', emoji: '🧵' },
	common: { field: 'common', label: 'Common Crate', emoji: '📦' },
	uncommon: { field: 'uncommon', label: 'Uncommon Crate', emoji: '🎁' },
	mythic: { field: 'mythic', label: 'Mythic Crate', emoji: '🌟' },
	legendary: { field: 'legendary', label: 'Legendary Crate', emoji: '👑' },
};

const TYPE_ALIASES = {
	uang: 'money',
	duit: 'money',
	saldo: 'bank',
	tabungan: 'atm',
	heal: 'health',
	nyawa: 'health',
	hp: 'health',
	dm: 'diamond',
	xp: 'exp',
};

const HEAL_PER_POTION = 50;

function escapeHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function buildHelp(usedPrefix, command) {
	const list = Object.entries(GIFT_TYPES)
		.map(([key, v]) => `• ${v.emoji} *${key}* - ${v.label}`)
		.join('\n');
	return `
🎁 *GIFT SYSTEM*

Kirim hadiah ke pengguna lain secara PRIBADI (DM). Penerima dapat kotak hadiah interaktif yang bisa mereka tap untuk buka.

*Format:*
${usedPrefix + command} @tag/nomor jumlah type:jenis nama:sembunyikan/munculkan pesan:teks bebas

⚠️ *pesan:* harus diletakkan PALING AKHIR, karena isinya boleh mengandung spasi.

*Contoh:*
${usedPrefix + command} @user 50000 type:money
${usedPrefix + command} 628123456789 2 type:heal nama:sembunyikan
${usedPrefix + command} @user 50000 type:money pesan:Semoga harimu menyenangkan ya!

*Jenis (type) tersedia:*
${list}

*nama:* (opsional)
• munculkan → nama kamu terlihat oleh penerima (default)
• sembunyikan → dikirim sebagai "Seseorang" (anonim)
`.trim();
}

// ---------- Kotak hadiah interaktif ----------

function createGiftBoxHtml({ emoji, label, jumlah, senderName, targetName, extraNote, pesan }) {
	const safeSender = escapeHtml(senderName);
	const safeTarget = escapeHtml(targetName);
	const safeLabel = escapeHtml(label);
	const safeJumlah = escapeHtml(String(jumlah));
	const safeNote = extraNote ? escapeHtml(extraNote) : '';
	const safePesan = pesan ? escapeHtml(pesan) : '';

	return `
<style>
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
body {
  margin: 0;
  background: transparent;
  font-family: Arial, sans-serif;
  color: #eee;
}
.wrap {
  width: 100%;
  max-width: 480px;
  margin: auto;
  padding: 16px;
  box-sizing: border-box;
}
#stage {
  position: relative;
  width: 100%;
  overflow: visible;
}
#box-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  box-sizing: border-box;
  transition: opacity .3s ease, transform .3s cubic-bezier(.34,1.56,.64,1);
}
#box-layer.hide {
  opacity: 0;
  transform: scale(0) rotate(18deg);
  pointer-events: none;
}
#box {
  font-size: 84px;
  cursor: pointer;
  filter: drop-shadow(0 0 22px rgba(255,200,80,.55));
  transition: transform .12s;
}
#box:active { transform: scale(.92); }
#hint {
  margin-top: 12px;
  font-size: 12px;
  color: rgba(255,255,255,.5);
}
.particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  left: 50%;
  top: 42%;
}
#card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(160deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,.4);
  text-align: center;
  padding: 26px 20px;
  box-sizing: border-box;
  opacity: 0;
  transform: translateY(26px) scale(.82);
  pointer-events: none;
  transition: opacity .4s ease, transform .4s cubic-bezier(.34,1.56,.64,1);
}
#card.show {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
.card-emoji {
  font-size: 50px;
  filter: drop-shadow(0 0 14px rgba(255,215,120,.6));
  margin-bottom: 4px;
}
.card-title {
  font-size: 12px;
  letter-spacing: 2px;
  color: rgba(255,255,255,.5);
  text-transform: uppercase;
}
.card-amount {
  font-size: 26px;
  font-weight: bold;
  color: #fff;
  margin: 8px 0 2px;
  text-shadow: 0 0 12px rgba(255,193,90,.6);
}
.card-label {
  font-size: 13px;
  color: rgba(255,255,255,.6);
  margin-bottom: 16px;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(255,255,255,.05);
  border-radius: 12px;
  margin-top: 8px;
  font-size: 13px;
  text-align: left;
}
.row span:first-child { color: rgba(255,255,255,.5); white-space: nowrap; margin-right: 10px; }
.row span:last-child { color: #fff; font-weight: bold; }
.msg-row {
  flex-direction: column;
  align-items: flex-start;
}
.msg-row span:first-child { margin-bottom: 6px; }
.msg-row span:last-child {
  font-weight: normal;
  color: #eee;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
.note {
  margin-top: 14px;
  font-size: 11px;
  color: rgba(255,255,255,.4);
}
</style>
<div class="wrap">
  <div id="stage">
    <div id="box-layer">
      <div id="box">🎁</div>
      <div id="hint">Ketuk kotaknya untuk membuka hadiah</div>
    </div>
    <div id="card">
      <div class="card-emoji">${emoji}</div>
      <div class="card-title">Hadiah Diterima</div>
      <div class="card-amount">${safeJumlah}</div>
      <div class="card-label">${safeLabel}</div>
      <div class="row"><span>Dari</span><span>${safeSender}</span></div>
      <div class="row"><span>Untuk</span><span>${safeTarget}</span></div>
      ${safePesan ? `<div class="row msg-row"><span>Pesan</span><span>${safePesan}</span></div>` : ''}
      ${safeNote ? `<div class="note">${safeNote}</div>` : ''}
    </div>
  </div>
</div>
<script>
(function(){
  var box = document.getElementById('box');
  var stage = document.getElementById('stage');
  var boxLayer = document.getElementById('box-layer');
  var card = document.getElementById('card');
  var opened = false;

  // Reservasi tinggi stage dari awal (sesuai konten terbesar antara kotak & kartu)
  // supaya saat kartu dimunculkan, tinggi bubble pesan TIDAK berubah / tidak dorong konten ke bawah.
  function syncStageHeight(){
    var h = Math.max(boxLayer.offsetHeight, card.offsetHeight, 220);
    stage.style.height = h + 'px';
  }
  syncStageHeight();
  window.addEventListener('load', syncStageHeight);
  setTimeout(syncStageHeight, 60);

  function burst(){
    var colors = ['#ffd76a','#6c5ce7','#ff6b81','#55efc4','#74b9ff','#ffffff'];
    for (var i = 0; i < 30; i++) {
      (function(){
        var p = document.createElement('div');
        p.className = 'particle';
        var size = 4 + Math.random() * 7;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        stage.appendChild(p);
        var angle = Math.random() * Math.PI * 2;
        var dist = 60 + Math.random() * 100;
        var dx = Math.cos(angle) * dist;
        var dy = Math.sin(angle) * dist;
        var dur = 600 + Math.random() * 400;
        try {
          p.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(0)', opacity: 0 }
          ], { duration: dur, easing: 'cubic-bezier(.2,.8,.2,1)' });
        } catch (e) {}
        setTimeout(function(){ p.remove(); }, dur + 100);
      })();
    }
  }

  function openBox(){
    if (opened) return;
    opened = true;
    burst();
    boxLayer.classList.add('hide');
    // kartu "menyembul" tepat di posisi kotak setelah kotaknya mulai mengecil
    setTimeout(function(){
      card.classList.add('show');
    }, 220);
  }

  box.addEventListener('click', openBox);
  box.addEventListener('touchstart', function(e){ e.preventDefault(); openBox(); }, { passive: false });
})();
</script>
`
}

// ---------- Pengirim kartu HTML (rich message) ----------

async function sendRichHtml(conn, jid, html, headerText) {
	const responseId = randomUUID()
	await conn.relayMessage(
		jid,
		{
			messageContextInfo: {
				deviceListMetadata: {},
				deviceListMetadataVersion: 2,
				botMetadata: {
					messageDisclaimerText: '',
					botResponseId: responseId,
					verificationMetadata: {
						proofs: [
							{
								version: 1,
								useCase: 1,
								signature: 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==',
								certificateChain: [
									'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'
								]
							}
						]
					}
				}
			},
			botForwardedMessage: {
				message: {
					richResponseMessage: {
						messageType: 1,
						submessages: [
							{
								messageType: 2,
								messageText: headerText || 'Gift'
							}
						],
						unifiedResponse: {
							data: Buffer.from(
								JSON.stringify({
									response_id: responseId,
									sections: [
										{
											view_model: {
												primitive: {
													__typename: 'GenAIaeacdsnwHtmlPrimitive',
													payload: html,
													trusted_sources: ['nox.dev']
												},
												__typename: 'GenAISingleLayoutViewModel'
											}
										}
									]
								})
							).toString('base64')
						},
						contextInfo: {
							forwardingScore: 1,
							isForwarded: true,
							forwardedAiBotMessageInfo: {
								botJid: '867051314767696@bot'
							},
							forwardOrigin: 4
						}
					}
				}
			}
		},
		{ messageId: responseId }
	)
}

// ---------- Handler ----------

let handler = async (m, { conn, text, usedPrefix, command }) => {
	const helpText = buildHelp(usedPrefix, command);

	try {
		// 1. Ambil "pesan:" duluan (harus di akhir, boleh mengandung spasi)
		const pesanMatch = text.match(/pesan:\s*([\s\S]+)$/i);
		const pesan = pesanMatch ? pesanMatch[1].trim() : null;
		const textWithoutPesan = pesanMatch ? text.slice(0, pesanMatch.index).trim() : text.trim();

		// 2. Sisanya diparse seperti biasa (token per spasi)
		const tokens = textWithoutPesan.split(/\s+/).filter(Boolean);

		let typeFlag = null;
		let namaFlag = 'munculkan';
		const rest = [];

		for (const raw of tokens) {
			const low = raw.toLowerCase();
			if (low.startsWith('type:')) {
				typeFlag = low.slice(5);
			} else if (low.startsWith('nama:')) {
				namaFlag = low.slice(5);
			} else {
				rest.push(raw);
			}
		}

		if (!typeFlag) return m.reply(helpText);

		typeFlag = TYPE_ALIASES[typeFlag] || typeFlag;
		const typeData = GIFT_TYPES[typeFlag];
		if (!typeData) {
			return m.reply(`❌ Type *${typeFlag}* tidak dikenali.\n\n${helpText}`);
		}

		namaFlag = ['sembunyikan', 'munculkan'].includes(namaFlag) ? namaFlag : 'munculkan';

		// 3. Tentukan target (tag atau nomor manual)
		let who = null;
		if (m.mentionedJid && m.mentionedJid[0]) {
			who = m.mentionedJid[0];
		} else if (rest[0]) {
			who = rest[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
		}

		if (!who) return m.reply(`❌ Tag orangnya atau tulis nomornya dulu ya.\n\n${helpText}`);
		if (who === m.sender) return m.reply('❌ Tidak bisa mengirim gift ke diri sendiri!');
		if (!global.db.data.users[who]) return m.reply('❌ Nomor/pengguna tersebut belum terdaftar di bot.');

		// 4. Tentukan jumlah
		const amountArg = rest.find((a, i) => {
			if (m.mentionedJid && m.mentionedJid[0]) return /^\d+$/.test(a);
			return i > 0 && /^\d+$/.test(a);
		});
		const jumlah = amountArg ? Math.min(999999999, Math.max(parseInt(amountArg, 10), 1)) : 1;

		const sender = global.db.data.users[m.sender];
		const target = global.db.data.users[who];
		const senderName = namaFlag === 'sembunyikan' ? 'Seseorang' : m.name || 'Seseorang';
		const targetName = conn.getName(who);

		let cardData;
		let groupAckLabel;
		let groupAckAmount;

		// 5. Case khusus: heal
		if (typeFlag === 'health') {
			if ((sender.potion || 0) < jumlah) {
				return m.reply(`❌ Potion kamu tidak cukup.\nPunya: ${sender.potion || 0} | Butuh: ${jumlah}`);
			}
			const missing = 100 - (target.health || 0);
			const healAmount = Math.min(missing, jumlah * HEAL_PER_POTION);
			if (healAmount <= 0) {
				return m.reply(`❌ Health *${targetName}* sudah penuh (100/100).`);
			}
			sender.potion -= jumlah;
			target.health = Math.min(100, (target.health || 0) + healAmount);

			cardData = {
				emoji: '❤️',
				label: 'Health / Nyawa',
				jumlah: `+${healAmount}`,
				senderName,
				targetName,
				extraNote: `${jumlah} potion terpakai • health sekarang ${target.health}/100`,
				pesan
			};
			groupAckLabel = 'Health';
			groupAckAmount = `+${healAmount}`;
		} else {
			// 6. Transfer biasa
			const field = typeData.field;
			const senderHas = sender[field] || 0;
			if (senderHas < jumlah) {
				return m.reply(`❌ ${typeData.label} kamu tidak cukup.\nPunya: ${senderHas} | Butuh: ${jumlah}`);
			}
			sender[field] = senderHas - jumlah;
			target[field] = (target[field] || 0) + jumlah;

			cardData = {
				emoji: typeData.emoji,
				label: typeData.label,
				jumlah,
				senderName,
				targetName,
				pesan
			};
			groupAckLabel = typeData.label;
			groupAckAmount = jumlah;
		}

		await m.react(cardData.emoji);

		// 7. Ack singkat di chat asal (TIDAK ada detail/kartu di sini)
		await conn.reply(
			m.chat,
			`${cardData.emoji} Gift *${groupAckLabel}* (${groupAckAmount}) berhasil dikirim secara pribadi ke @${who.split('@')[0]}.`,
			m,
			{ mentions: [who] }
		);

		// 8. Kirim kotak hadiah interaktif via DM ke target
		try {
			const dmIntro = `${cardData.emoji} *Kamu Dapat Gift!*\nBuka kotaknya untuk lihat detailnya 🎁`.trim();
			await conn.sendMessage(who, { text: dmIntro });
			const html = createGiftBoxHtml(cardData);
			await sendRichHtml(conn, who, html, 'Kamu Dapat Gift!');
		} catch (e) {
			console.error('[GIFT DM ERROR]', e);
			await conn.reply(
				m.chat,
				'⚠️ Gift berhasil, tapi bot gagal mengirim kotak hadiah secara pribadi ke penerima (mungkin nomornya tidak valid/tidak terdaftar di WhatsApp).',
				m
			);
		}
	} catch (e) {
		console.error('[GIFT ERROR]', e);
		await m.react('❌');
		m.reply('❌ Gagal mengirim gift.\n\n> ' + (e?.message || String(e)) + '\n\n' + helpText);
	}
};

handler.help = ['gift'];
handler.tags = ['rpg'];
handler.command = /^(gift|hadiah)$/i;
handler.group = true;
handler.register = true;

export default handler;