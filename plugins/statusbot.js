import os from 'os';

function clockString(ms) {
	const d = Math.floor(ms / 86400000);
	const h = Math.floor((ms / 3600000) % 24);
	const m = Math.floor((ms / 60000) % 60);
	const s = Math.floor((ms / 1000) % 60);
	return [d ? `${d} hari` : '', h ? `${h} jam` : '', m ? `${m} menit` : '', `${s} detik`].filter(Boolean).join(' ');
}

function formatBytes(bytes) {
	if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
	if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
	return (bytes / 1024).toFixed(2) + ' KB';
}

function getBar(percent, length = 10) {
	const filled = Math.round((percent / 100) * length);
	return '█'.repeat(filled) + '░'.repeat(length - filled);
}

function getStatus(percent) {
	if (percent >= 90) return '🔴 KRITIS';
	if (percent >= 70) return '🟡 TINGGI';
	return '🟢 NORMAL';
}

let handler = async (m) => {
	// === SISTEM INFO ===
	const uptime = process.uptime() * 1000;
	const totalMem = os.totalmem();
	const freeMem = os.freemem();
	const usedMem = totalMem - freeMem;
	const memPercent = Math.round((usedMem / totalMem) * 100);

	// CPU load average (1 menit)
	const cpuLoad = os.loadavg()[0];
	const cpuCount = os.cpus().length;
	const cpuPercent = Math.min(100, Math.round((cpuLoad / cpuCount) * 100));

	// Process memory
	const procMem = process.memoryUsage();

	// Platform info
	const platform = os.platform();
	const arch = os.arch();
	const hostname = os.hostname();
	const nodeVer = process.version;

	// User database stats
	const users = Object.keys(global.db.data.users || {}).length;
	const chats = Object.keys(global.db.data.chats || {}).length;
	const plugins = Object.keys(global.plugins || {}).length;

	// === STATUS PANEL ===
	const memBar = getBar(memPercent);
	const cpuBar = getBar(cpuPercent);
	const memStatus = getStatus(memPercent);
	const cpuStatus = getStatus(cpuPercent);

	const txt =
`╔══════════════════════╗
║     🖥️ *STATUS BOT*                           ║
╚══════════════════════╝

⏱️ *RUNTIME*
${'─'.repeat(26)}
🕐 Uptime    : *${clockString(uptime)}*
📅 Platform  : *${platform} ${arch}*
🖥️ Hostname  : *${hostname}*
🟢 Node.js   : *${nodeVer}*

💾 *MEMORY*
${'─'.repeat(26)}
[${memBar}] *${memPercent}%* ${memStatus}
📊 Dipakai   : *${formatBytes(usedMem)}*
📦 Total     : *${formatBytes(totalMem)}*
🤖 Proses    : *${formatBytes(procMem.heapUsed)}*

⚙️ *CPU*
${'─'.repeat(26)}
[${cpuBar}] *${cpuPercent}%* ${cpuStatus}
🔧 Core      : *${cpuCount} core*
📈 Load avg  : *${cpuLoad.toFixed(2)}*

📊 *DATABASE*
${'─'.repeat(26)}
👥 Users     : *${users} user*
💬 Chats     : *${chats} grup/dm*
🔌 Plugins   : *${plugins} plugin*

${'─'.repeat(26)}
_Update: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}_`;

	m.reply(txt);
};

handler.help = ['statusbot'];
handler.tags = ['owner'];
handler.command = /^(statusbot|status bot|botstatus)$/i;
handler.owner = true;

export default handler;