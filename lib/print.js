import chalk from 'chalk';

export default function print(m, conn) {
	const time = new Date().toLocaleTimeString('id-ID', { timeZone: global.timezone || 'Asia/Jakarta', hour12: false });
	const where = m.isGroup ? conn.getName(m.chat) : 'private';
	const who = `${m.pushName || conn.getName(m.sender)} ${chalk.gray(m.sender.split('@')[0])}`;
	const type = (m.mtype || '').replace(/message$/i, '') || 'unknown';
	const body = (m.text || '').replace(/\s+/g, ' ').slice(0, 140);

	const line = [chalk.gray(time), chalk.cyan(where), chalk.green(who), chalk.magenta(type), m.error ? chalk.red(body) : m.isCommand ? chalk.yellow(body) : body];
	console.log(line.filter(Boolean).join(' │ '));
}
