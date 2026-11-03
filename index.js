import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const STOP_CODE = 2;

let child = null;
let stopping = false;

function start() {
	child = fork(path.join(dir, 'main.js'), process.argv.slice(2));

	child.on('message', (msg) => {
		if (msg === 'restart') child.kill();
	});

	child.on('exit', (code) => {
		if (stopping) return;
		if (code === STOP_CODE) process.exit(STOP_CODE);
		console.log(`[zeemd] proses berhenti (kode ${code}), mulai ulang dalam 3 detik`);
		setTimeout(start, 3000);
	});
}

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => {
		stopping = true;
		child?.kill(signal);
		setTimeout(() => process.exit(0), 1500).unref();
	});
}

start();
