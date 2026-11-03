// Nomor yang dipakai untuk kode pairing, format internasional tanpa +. Kosongkan untuk diminta lewat terminal.
global.pairingNumber = '';

// [nomor, nama, developer]. Developer menerima laporan error plugin.
global.owner = [['6280000000000', 'Owner', true]];

global.namebot = 'ZeeMD';
global.author = 'Zee';
global.source = 'https://github.com/AldricAS/ZeeMD';

global.prefix = /^[./!#]/;

global.stickpack = 'ZeeMD';
global.stickauth = 'Zee';

// API key TheresAV untuk fitur play (daftar di https://api.theresav.eu). Wajib diisi sendiri.
global.apikeyTheresav = '';

global.dailyLimit = 20; // limit harian per user, direset otomatis
global.multiplier = 38; // makin besar, makin susah naik level
global.timezone = 'Asia/Jakarta';

global.wait = 'Tunggu sebentar...';
global.eror = 'Terjadi kesalahan.';

global.rpg = {
	emoticon(string) {
		string = string.toLowerCase();
		let emot = {
			level: '📊',
			limit: '🎫',
			health: '❤️',
			stamina: '🔋',
			exp: '✨',
			money: '💹',
			bank: '🏦',
			potion: '🥤',
			diamond: '💎',
			common: '📦',
			uncommon: '🛍️',
			mythic: '🎁',
			legendary: '🗃️',
			superior: '💼',
			pet: '🔖',
			trash: '🗑',
			armor: '🥼',
			sword: '⚔️',
			pickaxe: '⛏️',
			fishingrod: '🎣',
			wood: '🪵',
			rock: '🪨',
			string: '🕸️',
			horse: '🐴',
			cat: '🐱',
			dog: '🐶',
			fox: '🦊',
			petFood: '🍖',
			iron: '⛓️',
			gold: '🪙',
			emerald: '❇️',
			upgrader: '🧰',
		};
		let results = Object.keys(emot)
			.map((v) => [v, new RegExp(v, 'gi')])
			.filter((v) => v[1].test(string));
		if (!results.length) return '';
		else return emot[results[0][0]];
	},
};
