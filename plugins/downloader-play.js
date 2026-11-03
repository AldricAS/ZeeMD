import axios from 'axios'
import yts from 'yt-search'
import YTMusic from 'ytmusic-api'
import { spawn } from 'child_process'
import { AIRich } from '../lib/message-builder.js'

const THERESAV_BASE = 'https://api.theresav.eu/api/download/ytmp3'
const THERESAV_KEY = () => String(global.apikeyTheresav || '').trim()

const AUDIO_PROFILES = {
	opus: ['-c:a', 'libopus', '-b:a', '16k', '-ar', '24000', '-ac', '1', '-application', 'audio', '-f', 'ogg'],
	mp3: ['-c:a', 'libmp3lame', '-b:a', '48k', '-ar', '22050', '-ac', '1', '-f', 'mp3']
}

const TRIM_SEC = 90
const MAX_AUDIO_SIZE = 25 * 1024 * 1024
const MAX_COMPRESSED_SIZE = 2 * 1024 * 1024
const LRCLIB_API = 'https://lrclib.net/api'

let ytMusicInstance = null
const getYTMusic = async () => {
	if (!ytMusicInstance) {
		ytMusicInstance = new YTMusic()
		await ytMusicInstance.initialize()
	}
	return ytMusicInstance
}

const escapeHtml = (t = '') => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

const fmtDuration = (sec = 0) => {
	const s = Math.max(0, Math.floor(Number(sec) || 0))
	const h = Math.floor(s / 3600)
	const m = Math.floor((s % 3600) / 60)
	const ss = s % 60
	return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`
}

const secondsFromTimestamp = (ts = '') => {
	if (!ts) return 0
	const p = String(ts).split(':').map(Number)
	if (p.some(Number.isNaN)) return 0
	if (p.length === 2) return p[0] * 60 + p[1]
	if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]
	return 0
}

const getYtmp3 = async (youtubeUrl) => {
	if (!THERESAV_KEY()) throw new Error('API key TheresAV belum diisi di config.js')
	const { data, status } = await axios.get(THERESAV_BASE, {
		params: { url: youtubeUrl },
		headers: { 'x-apikey': THERESAV_KEY(), 'User-Agent': 'Mozilla/5.0' },
		timeout: 60000,
		validateStatus: () => true
	})
	if (status !== 200) throw new Error(`TheresAv HTTP ${status}`)
	if (!data?.status || !data?.download_url) throw new Error(data?.message || 'API gak return download_url')
	return {
		title: data.title,
		duration: data.duration_sec || 0,
		thumbnail: data.thumbnail,
		url: data.download_url
	}
}

const getYtmp3Retry = async (url, retry = 3) => {
	let lastErr
	for (let i = 0; i < retry; i++) {
		try { return await getYtmp3(url) }
		catch (e) { lastErr = e; if (i < retry - 1) await new Promise(r => setTimeout(r, 1000)) }
	}
	throw lastErr
}

const downloadAudioBuffer = async (url) => {
	if (!url) throw new Error('URL audio kosong')
	const res = await axios.get(url, {
		responseType: 'arraybuffer',
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
			'Accept': '*/*',
			'Referer': 'https://api.theresav.eu/'
		},
		timeout: 120000,
		maxContentLength: MAX_AUDIO_SIZE
	})
	const buf = Buffer.from(res.data)
	if (!buf.length || buf.length > MAX_AUDIO_SIZE) throw new Error('Buffer audio bermasalah')

	const head = buf.slice(0, 300).toString('utf8').trim().toLowerCase()
	if (head.startsWith('<!doc') || head.startsWith('<html') || head.includes('<head>') || head.includes('<body')) {
		throw new Error('Server balikin HTML, bukan audio')
	}
	return buf
}

const compressAudio = (inputBuffer, profile = 'opus', trimSec = 0) => {
	if (!Buffer.isBuffer(inputBuffer) || !inputBuffer.length) throw new Error('Input buffer kosong')
	const profileArgs = AUDIO_PROFILES[profile]
	if (!profileArgs) throw new Error('Profile audio tidak dikenal: ' + profile)
	return new Promise((resolve, reject) => {
		let ffmpeg
		try {
			ffmpeg = spawn('ffmpeg', [
				'-hide_banner', '-loglevel', 'error',
				'-probesize', '50M', '-analyzeduration', '50M',
				'-i', 'pipe:0',
				'-vn',
				...(trimSec > 0 ? ['-t', String(trimSec)] : []),
				...profileArgs,
				'pipe:1'
			], { stdio: ['pipe', 'pipe', 'pipe'] })
		} catch (e) { return reject(e) }
		const chunks = []
		let outputSize = 0, finished = false, stderr = ''
		const fail = (e) => { if (finished) return; finished = true; try { ffmpeg.kill('SIGKILL') } catch {} reject(e) }
		ffmpeg.stdout.on('data', c => { outputSize += c.length; if (outputSize > MAX_COMPRESSED_SIZE) return fail(new Error('Audio terlalu besar')); chunks.push(c) })
		ffmpeg.stderr.on('data', c => { stderr += c.toString() })
		ffmpeg.on('error', e => fail(e?.code === 'ENOENT' ? new Error('FFmpeg tidak ditemukan.') : e))
		ffmpeg.on('close', code => {
			if (finished) return
			if (code !== 0) return fail(new Error(`FFmpeg ${profile} gagal (${code}): ${stderr.split('\n').filter(Boolean).slice(-3).join(' | ')}`))
			const out = Buffer.concat(chunks)
			if (!out.length) return fail(new Error(`FFmpeg ${profile} hasil kosong`))
			finished = true; resolve(out)
		})
		ffmpeg.stdin.on('error', e => { if (e?.code !== 'EPIPE') fail(e) })
		ffmpeg.stdin.end(inputBuffer)
	})
}

const coverJpeg = (input) => new Promise((resolve, reject) => {
	const ff = spawn('ffmpeg', [
		'-hide_banner', '-loglevel', 'error',
		'-i', 'pipe:0',
		'-vf', 'scale=300:300:force_original_aspect_ratio=increase,crop=300:300',
		'-frames:v', '1', '-q:v', '8',
		'-c:v', 'mjpeg', '-f', 'image2pipe', 'pipe:1'
	], { stdio: ['pipe', 'pipe', 'ignore'] })
	const chunks = []
	ff.stdout.on('data', c => chunks.push(c))
	ff.on('error', reject)
	ff.on('close', code => {
		const out = Buffer.concat(chunks)
		code === 0 && out.length ? resolve(out) : reject(new Error('Thumbnail gagal diproses'))
	})
	ff.stdin.on('error', () => {})
	ff.stdin.end(input)
})

const getThumb = async (url) => {
	try {
		if (!url) return Buffer.alloc(0)
		const res = await fetch(url)
		if (!res.ok) throw new Error('Thumbnail gagal')
		const raw = Buffer.from(await res.arrayBuffer())
		return await coverJpeg(raw)
	} catch { return Buffer.alloc(0) }
}

const getLRCLyrics = async ({ title, artist, duration = 0, album = '' }) => {
	try {
		if (!title || !artist) return null
		const params = new URLSearchParams({ track_name: String(title).trim(), artist_name: String(artist).trim() })
		if (album) params.set('album_name', String(album).trim())
		const d = Number(duration)
		if (Number.isFinite(d) && d >= 1 && d <= 3600) params.set('duration', String(Math.round(d)))
		const res = await fetch(`${LRCLIB_API}/get?${params.toString()}`, { headers: { Accept: 'application/json', 'User-Agent': 'Play2/1.0' } })
		if (res.status === 404 || res.status === 429 || !res.ok) return null
		const data = await res.json()
		if (!data) return null
		return {
			plainLyrics: typeof data.plainLyrics === 'string' ? data.plainLyrics : '',
			syncedLyrics: typeof data.syncedLyrics === 'string' ? data.syncedLyrics : ''
		}
	} catch { return null }
}

const parseLrcTimestamp = (m) => {
	if (!m) return null
	const mm = Number(m[1]), ss = Number(m[2]), frac = m[3] || ''
	if (!Number.isFinite(mm) || !Number.isFinite(ss) || ss < 0 || ss >= 60) return null
	let ms = 0
	if (frac.length === 1) ms = Number(frac) * 100
	else if (frac.length === 2) ms = Number(frac) * 10
	else if (frac.length >= 3) ms = Number(frac.slice(0, 3))
	return mm * 60 + ss + ms / 1000
}

const parseSyncedLyrics = (lrc = '') => {
	if (!lrc || typeof lrc !== 'string') return []
	const result = []
	const re = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g
	for (const raw of lrc.split(/\r?\n/)) {
		if (!raw.trim()) continue
		const matches = [...raw.matchAll(re)]
		if (!matches.length) continue
		const text = raw.replace(re, '').trim()
		if (!text) continue
		for (const m of matches) {
			const t = parseLrcTimestamp(m)
			if (t === null || t < 0) continue
			result.push({ time: t, text })
		}
	}
	result.sort((a, b) => a.time - b.time)
	const cleaned = []
	for (const it of result) {
		const last = cleaned[cleaned.length - 1]
		if (last && Math.abs(last.time - it.time) < 0.001 && last.text === it.text) continue
		cleaned.push(it)
	}
	return cleaned
}

const plainLyricsToSynced = (lyrics = '', duration = 0) => {
	if (!lyrics || typeof lyrics !== 'string') return []
	const lines = lyrics.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
	if (!lines.length) return []
	const d = Number(duration)
	let interval = 5
	if (Number.isFinite(d) && d > 0 && lines.length > 1) interval = Math.max(2, Math.min(8, d / lines.length))
	return lines.map((text, i) => ({ time: i * interval, text }))
}

const normalizeLyrics = (l = []) => Array.isArray(l)
	? l.filter(x => x && Number.isFinite(Number(x.time)) && typeof x.text === 'string')
		.map(x => ({ time: Number(x.time), text: String(x.text).trim() }))
		.filter(x => x.text)
		.sort((a, b) => a.time - b.time)
	: []

const createMusicPlayer = ({ title, artist, duration, audioB64, audioMime, imageSrc, lyrics }) => {
	const safeTitle = escapeHtml(title)
	const safeArtist = escapeHtml(artist)
	const safeDuration = escapeHtml(duration || '0:00')
	const safeImage = imageSrc || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzFhMGQxMiIvPjx0ZXh0IHg9IjIwMCIgeT0iMjEwIiBmb250LXNpemU9IjM0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tk8gQ09WRVI8L3RleHQ+PC9zdmc+'
	const lyricsJson = Buffer.from(JSON.stringify(lyrics || []), 'utf8').toString('base64')

	return `<style>
:root{
	--ink:#ffffff;
	--muted:rgba(255,255,255,.52);
	--dim:rgba(255,255,255,.28);
	--glass:rgba(255,255,255,.12);
	--sys:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
html,body{background:transparent;color:var(--ink);font-family:var(--sys);-webkit-font-smoothing:antialiased;overflow:hidden}
.wrap{display:flex;align-items:center;justify-content:center;padding:8px}

.player{
	position:relative;
	width:100%;
	max-width:375px;
	border-radius:38px;
	overflow:hidden;
	background:#0d0d11;
	border:1.5px solid rgba(255,255,255,.16);
	box-shadow:0 24px 60px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.22);
}

@keyframes ambientDrift1{
	0%,100%{transform:translate3d(-8%,-6%,0) scale(1.35) rotate(0deg)}
	50%{transform:translate3d(8%,7%,0) scale(1.5) rotate(22deg)}
}
@keyframes ambientDrift2{
	0%,100%{transform:translate3d(10%,8%,0) scale(1.4) rotate(0deg)}
	50%{transform:translate3d(-9%,-7%,0) scale(1.28) rotate(-25deg)}
}
@keyframes eqBounce1{0%,100%{height:4px}45%{height:15px}75%{height:8px}}
@keyframes eqBounce2{0%,100%{height:13px}35%{height:4px}70%{height:16px}}
@keyframes eqBounce3{0%,100%{height:6px}50%{height:17px}85%{height:5px}}
@keyframes eqBounce4{0%,100%{height:11px}30%{height:16px}65%{height:4px}}
@keyframes heartPop{
	0%{transform:scale(1)}
	35%{transform:scale(1.35)}
	70%{transform:scale(.9)}
	100%{transform:scale(1)}
}
@keyframes pulseHalo{
	0%,100%{opacity:.32;transform:scale(.96)}
	50%{opacity:.62;transform:scale(1.06)}
}

.bg-mesh{position:absolute;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.bg-blob{
	position:absolute;
	inset:-25%;
	width:150%;
	height:150%;
	object-fit:cover;
	filter:blur(46px) saturate(2.1) brightness(.48);
	opacity:.85;
}
.bg-blob.b1{animation:ambientDrift1 16s ease-in-out infinite}
.bg-blob.b2{animation:ambientDrift2 21s ease-in-out infinite;mix-blend-mode:screen;opacity:.55}
.bg-scrim{
	position:absolute;
	inset:0;
	background:linear-gradient(180deg,rgba(10,10,14,.25) 0%,rgba(10,10,14,.52) 55%,rgba(8,8,12,.82) 100%);
}

.content{
	position:relative;
	z-index:2;
	padding:14px 22px 22px;
	display:flex;
	flex-direction:column;
}

.grab-pill{
	width:38px;
	height:5px;
	background:rgba(255,255,255,.28);
	border-radius:99px;
	margin:0 auto 14px;
}

.mini-header{
	display:flex;
	align-items:center;
	gap:12px;
	margin-bottom:14px;
	opacity:0;
	max-height:0;
	overflow:hidden;
	transform:translateY(-8px);
	transition:all .38s cubic-bezier(.22,1,.36,1);
}
.player.mode-lyrics .mini-header{
	opacity:1;
	max-height:56px;
	transform:translateY(0);
}
.mh-art{
	width:42px;
	height:42px;
	border-radius:9px;
	object-fit:cover;
	box-shadow:0 4px 12px rgba(0,0,0,.45);
	flex-shrink:0;
}
.mh-meta{flex:1;min-width:0}
.mh-title{font-size:14.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.2px}
.mh-artist{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}

.eq-pill{
	display:flex;
	align-items:flex-end;
	gap:2.5px;
	height:18px;
	padding:0 6px;
}
.eq-bar{
	width:3px;
	height:4px;
	border-radius:2px;
	background:#ffffff;
	transition:height .2s ease;
}
.player.is-playing .eq-bar:nth-child(1){animation:eqBounce1 .75s ease-in-out infinite}
.player.is-playing .eq-bar:nth-child(2){animation:eqBounce2 .62s ease-in-out infinite}
.player.is-playing .eq-bar:nth-child(3){animation:eqBounce3 .82s ease-in-out infinite}
.player.is-playing .eq-bar:nth-child(4){animation:eqBounce4 .68s ease-in-out infinite}

.stage-viewport{
	position:relative;
	height:262px;
	margin-bottom:16px;
}

.art-view{
	position:absolute;
	inset:0;
	display:flex;
	align-items:center;
	justify-content:center;
	transition:opacity .38s ease,transform .38s cubic-bezier(.22,1,.36,1);
	cursor:pointer;
}
.player.mode-lyrics .art-view{
	opacity:0;
	pointer-events:none;
	transform:scale(.88);
}

.art-halo{
	position:absolute;
	width:225px;
	height:225px;
	border-radius:26px;
	background:rgba(255,255,255,.15);
	filter:blur(24px);
	opacity:.2;
	transition:all .5s ease;
}
.player.is-playing .art-halo{
	animation:pulseHalo 3.5s ease-in-out infinite;
}

.art-card{
	position:relative;
	width:242px;
	height:242px;
	border-radius:20px;
	overflow:hidden;
	transform:scale(.83);
	box-shadow:0 12px 28px rgba(0,0,0,.45);
	border:1px solid rgba(255,255,255,.15);
	transition:transform .55s cubic-bezier(.34,1.56,.64,1),box-shadow .55s ease;
}
.player.is-playing .art-card{
	transform:scale(1);
	box-shadow:0 24px 48px rgba(0,0,0,.72);
}
.art-card img{
	width:100%;
	height:100%;
	object-fit:cover;
	display:block;
}
.art-tap-badge{
	position:absolute;
	right:10px;
	bottom:10px;
	padding:4px 9px;
	border-radius:99px;
	background:rgba(0,0,0,.58);
	backdrop-filter:blur(8px);
	border:1px solid rgba(255,255,255,.18);
	font-size:10px;
	font-weight:700;
	letter-spacing:.03em;
	color:rgba(255,255,255,.9);
}

.lyrics-view{
	position:absolute;
	inset:0;
	overflow-y:auto;
	scrollbar-width:none;
	mask-image:linear-gradient(180deg,transparent 0%,black 14%,black 84%,transparent 100%);
	-webkit-mask-image:linear-gradient(180deg,transparent 0%,black 14%,black 84%,transparent 100%);
	opacity:0;
	pointer-events:none;
	transform:translateY(12px) scale(.96);
	transition:opacity .38s ease,transform .38s cubic-bezier(.22,1,.36,1);
}
.lyrics-view::-webkit-scrollbar{display:none}
.player.mode-lyrics .lyrics-view{
	opacity:1;
	pointer-events:auto;
	transform:translateY(0) scale(1);
}

.lyrics-content{
	padding:100px 4px;
	display:flex;
	flex-direction:column;
	gap:16px;
}
.lyric-line{
	font-size:18px;
	color:rgba(255,255,255,.38);
	font-weight:700;
	line-height:1.32;
	text-align:left;
	transform-origin:left center;
	transform:scale(.95);
	filter:blur(1px);
	cursor:pointer;
	transition:transform .42s cubic-bezier(.22,1,.36,1),color .35s ease,filter .35s ease,opacity .35s ease;
}
.lyric-line.is-near{
	color:rgba(255,255,255,.55);
	filter:blur(.4px);
}
.lyric-line.is-active{
	font-size:22px;
	color:#ffffff;
	font-weight:800;
	transform:scale(1.02);
	filter:blur(0);
	text-shadow:0 4px 18px rgba(255,255,255,.28);
}
.lyrics-empty{
	font-size:15px;
	font-weight:600;
	color:var(--muted);
	text-align:center;
	padding-top:18px;
}

.track-row{
	display:flex;
	align-items:center;
	justify-content:space-between;
	gap:12px;
	margin-bottom:14px;
}
.track-text{flex:1;min-width:0}
.tr-title{
	font-size:19px;
	font-weight:800;
	letter-spacing:-.35px;
	white-space:nowrap;
	overflow:hidden;
	text-overflow:ellipsis;
}
.tr-artist{
	font-size:14.5px;
	font-weight:500;
	color:var(--muted);
	margin-top:2px;
	white-space:nowrap;
	overflow:hidden;
	text-overflow:ellipsis;
}
.tr-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
.circle-btn{
	width:32px;
	height:32px;
	border-radius:50%;
	background:rgba(255,255,255,.1);
	border:none;
	color:#fff;
	display:flex;
	align-items:center;
	justify-content:center;
	cursor:pointer;
	transition:background .2s,transform .15s;
}
.circle-btn:active{transform:scale(.88);background:rgba(255,255,255,.22)}
.circle-btn.active{color:#ff2d55;background:rgba(255,45,85,.18);animation:heartPop .4s ease}
.circle-btn.active svg{fill:#ff2d55;stroke:#ff2d55}

.progress{margin-bottom:16px}
.bar-wrap{padding:6px 0;cursor:pointer;touch-action:none}
.bar{
	height:5px;
	background:rgba(255,255,255,.2);
	border-radius:99px;
	position:relative;
	transition:height .18s ease;
}
.bar-wrap:active .bar{height:8px}
.fill{
	position:absolute;
	left:0;
	top:0;
	height:100%;
	background:#ffffff;
	border-radius:99px;
	width:0;
	pointer-events:none;
	box-shadow:0 0 10px rgba(255,255,255,.5);
}
.dot{
	position:absolute;
	left:0;
	top:50%;
	transform:translate(-50%,-50%) scale(.75);
	width:12px;
	height:12px;
	background:#fff;
	border-radius:50%;
	pointer-events:none;
	box-shadow:0 2px 6px rgba(0,0,0,.45);
	transition:transform .18s ease;
}
.bar-wrap:active .dot{transform:translate(-50%,-50%) scale(1.15)}

.meta-row{
	display:flex;
	align-items:center;
	justify-content:space-between;
	margin-top:5px;
	font-size:11px;
	color:var(--muted);
	font-variant-numeric:tabular-nums;
	font-weight:600;
}
.lossless-pill{
	display:inline-flex;
	align-items:center;
	gap:4px;
	padding:2px 7px;
	border-radius:4px;
	background:rgba(255,255,255,.11);
	font-size:9.5px;
	font-weight:700;
	letter-spacing:.03em;
	color:rgba(255,255,255,.78);
}
.lossless-pill svg{width:11px;height:11px}

.controls{
	display:flex;
	justify-content:space-between;
	align-items:center;
	padding:0 18px;
	margin-bottom:18px;
}
.c-btn{
	background:none;
	border:none;
	color:#fff;
	cursor:pointer;
	display:flex;
	justify-content:center;
	align-items:center;
	width:48px;
	height:48px;
	border-radius:50%;
	transition:transform .15s cubic-bezier(.34,1.56,.64,1),background .15s;
}
.c-btn:active{transform:scale(.84);background:rgba(255,255,255,.12)}
.c-btn svg{width:30px;height:30px}
.c-btn.play{
	width:62px;
	height:62px;
	background:rgba(255,255,255,.14);
	box-shadow:0 8px 22px rgba(0,0,0,.3);
}
.c-btn.play svg{width:34px;height:34px}

.vol-row{
	display:flex;
	align-items:center;
	gap:10px;
	margin-bottom:16px;
	padding:0 2px;
}
.vol-ico{color:var(--muted);width:15px;height:15px;flex-shrink:0}
.vol-bar{
	flex:1;
	height:4px;
	background:rgba(255,255,255,.18);
	border-radius:99px;
	position:relative;
	cursor:pointer;
	overflow:hidden;
}
.vol-fill{
	position:absolute;
	left:0;
	top:0;
	bottom:0;
	width:85%;
	background:rgba(255,255,255,.78);
	border-radius:99px;
}

.bottom-dock{
	display:flex;
	justify-content:space-around;
	align-items:center;
	padding-top:4px;
}
.dock-btn{
	display:inline-flex;
	align-items:center;
	gap:6px;
	padding:6px 14px;
	border-radius:99px;
	background:transparent;
	border:none;
	color:var(--muted);
	font-size:11.5px;
	font-weight:700;
	cursor:pointer;
	transition:all .2s ease;
}
.dock-btn svg{width:17px;height:17px}
.dock-btn.is-on{
	background:rgba(255,255,255,.18);
	color:#ffffff;
}
</style>

<div class="wrap">
	<div class="player mode-lyrics" id="player">
		<div class="bg-mesh">
			<img class="bg-blob b1" src="${safeImage}" alt="">
			<img class="bg-blob b2" src="${safeImage}" alt="">
			<div class="bg-scrim"></div>
		</div>

		<div class="content">
			<div class="grab-pill"></div>

			<div class="mini-header">
				<img class="mh-art" src="${safeImage}" alt="${safeTitle}">
				<div class="mh-meta">
					<div class="mh-title">${safeTitle}</div>
					<div class="mh-artist">${safeArtist}</div>
				</div>
				<div class="eq-pill" title="Audio Spectrum">
					<span class="eq-bar"></span>
					<span class="eq-bar"></span>
					<span class="eq-bar"></span>
					<span class="eq-bar"></span>
				</div>
			</div>

			<div class="stage-viewport">
				<div class="art-view" id="art-view">
					<div class="art-halo"></div>
					<div class="art-card">
						<img src="${safeImage}" alt="${safeTitle}">
						<span class="art-tap-badge">♪ Ketuk untuk Lirik</span>
					</div>
				</div>

				<div class="lyrics-view" id="lyrics-container">
					<div class="lyrics-content" id="lyrics-content"></div>
				</div>
			</div>

			<div class="track-row">
				<div class="track-text">
					<div class="tr-title">${safeTitle}</div>
					<div class="tr-artist">${safeArtist}</div>
				</div>
				<div class="tr-actions">
					<button class="circle-btn" id="star" title="Favorit">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
							<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
						</svg>
					</button>
				</div>
			</div>

			<div class="progress">
				<div class="bar-wrap" id="bar">
					<div class="bar">
						<div class="fill" id="fill"></div>
						<div class="dot" id="dot"></div>
					</div>
				</div>
				<div class="meta-row">
					<span id="cur">0:00</span>
					<span class="lossless-pill">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/></svg>
						<span>LOSSLESS</span>
					</span>
					<span id="dur">${safeDuration}</span>
				</div>
			</div>

			<div class="controls">
				<button class="c-btn" id="btn-rw" title="Mundur 10d">
					<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
				</button>
				<button class="c-btn play" id="play" title="Putar / Jeda">
					<svg id="icon-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>
					<svg id="icon-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="6.5" y="4.5" width="4" height="15" rx="1.6"/><rect x="13.5" y="4.5" width="4" height="15" rx="1.6"/></svg>
				</button>
				<button class="c-btn" id="btn-fw" title="Maju 10d">
					<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
				</button>
			</div>

			<div class="vol-row">
				<svg class="vol-ico" viewBox="0 0 24 24" fill="currentColor"><path d="M7 9v6h4l5 5V4l-5 5H7z"/></svg>
				<div class="vol-bar" id="vol-bar"><div class="vol-fill" id="vol-fill"></div></div>
				<svg class="vol-ico" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
			</div>

			<div class="bottom-dock">
				<button class="dock-btn" id="btn-mode-art">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4"/></svg>
					<span>Cover</span>
				</button>
				<button class="dock-btn is-on" id="btn-mode-lyrics">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/></svg>
					<span>Lirik Live</span>
				</button>
			</div>
		</div>
	</div>
</div>

<script>
(function(){
	var audio=null;
	var AUDIO_B64='${audioB64}';
	var AUDIO_MIME='${escapeHtml(audioMime)}';
	var playerEl=document.getElementById('player');
	var play=document.getElementById('play');
	var bar=document.getElementById('bar'),fill=document.getElementById('fill'),dot=document.getElementById('dot');
	var cur=document.getElementById('cur'),dur=document.getElementById('dur');
	var star=document.getElementById('star');
	var iconPlay=document.getElementById('icon-play'),iconPause=document.getElementById('icon-pause');
	var lyricsContainer=document.getElementById('lyrics-container'),lyricsText=document.getElementById('lyrics-content');
	var artView=document.getElementById('art-view');
	var btnModeArt=document.getElementById('btn-mode-art'),btnModeLyrics=document.getElementById('btn-mode-lyrics');
	var btnRw=document.getElementById('btn-rw'),btnFw=document.getElementById('btn-fw');
	var volBar=document.getElementById('vol-bar'),volFill=document.getElementById('vol-fill');

	var lyrics=[];
	try{
		var enc='${lyricsJson}';
		var bin=atob(enc);
		var bytesLyrics=new Uint8Array(bin.length);
		for(var i=0;i<bin.length;i++)bytesLyrics[i]=bin.charCodeAt(i);
		var json=new TextDecoder('utf-8').decode(bytesLyrics);
		var parsed=JSON.parse(json);
		if(Array.isArray(parsed))lyrics=parsed.filter(x=>x&&Number.isFinite(Number(x.time))).map(x=>({time:Number(x.time),text:String(x.text||'♪')})).sort((a,b)=>a.time-b.time);
	}catch{lyrics=[]}

	if(!lyrics.length){
		playerEl.classList.remove('mode-lyrics');
		btnModeLyrics.classList.remove('is-on');
		btnModeArt.classList.add('is-on');
	}

	function setViewMode(mode){
		if(mode==='lyrics'){
			playerEl.classList.add('mode-lyrics');
			btnModeLyrics.classList.add('is-on');
			btnModeArt.classList.remove('is-on');
		}else{
			playerEl.classList.remove('mode-lyrics');
			btnModeLyrics.classList.remove('is-on');
			btnModeArt.classList.add('is-on');
		}
	}
	btnModeArt.addEventListener('click',()=>setViewMode('art'));
	btnModeLyrics.addEventListener('click',()=>setViewMode('lyrics'));
	artView.addEventListener('click',()=>setViewMode('lyrics'));

	var lyricElements=[];
	function renderLyrics(){
		lyricsText.innerHTML='';
		lyricElements.length=0;
		if(!lyrics.length){
			lyricsText.innerHTML='<div class="lyrics-empty">♪ Lirik sinkron belum tersedia untuk lagu ini.<br><br>Ketuk tab Cover di bawah untuk melihat sampul album.</div>';
			return;
		}
		var frag=document.createDocumentFragment();
		lyrics.forEach((line,i)=>{
			var el=document.createElement('div');
			el.className='lyric-line';
			el.dataset.time=String(line.time);
			el.dataset.index=String(i);
			el.textContent=line.text||'♪';
			el.addEventListener('click',()=>{
				if(!audio)return;
				var t=Number(line.time)||0;
				audio.currentTime=t;
				updateLyrics(t,{immediate:true});
				updateProgress();
			});
			frag.appendChild(el);
			lyricElements.push(el);
		});
		lyricsText.appendChild(frag);
	}
	renderLyrics();

	var activeLyricIndex=-1;
	function findLyricIndex(time){
		if(!lyrics.length)return -1;
		var lo=0,hi=lyrics.length-1,r=-1;
		while(lo<=hi){
			var mid=Math.floor((lo+hi)/2);
			if(Number(lyrics[mid].time)<=time){r=mid;lo=mid+1}else hi=mid-1;
		}
		return r;
	}

	var tgt=0,curTop=0,anim=null;
	var SM=0.18;
	function calcScroll(el){
		if(!el||!lyricsContainer)return 0;
		var top=el.offsetTop,h=el.offsetHeight,ch=lyricsContainer.clientHeight;
		var t=top-(ch/2)+(h/2);
		var max=Math.max(0,lyricsContainer.scrollHeight-ch);
		return Math.max(0,Math.min(t,max));
	}
	function setTgt(el,imm){
		if(!el||!lyricsContainer)return;
		tgt=calcScroll(el);
		if(imm){curTop=tgt;lyricsContainer.scrollTop=tgt;return}
		startAnim();
	}
	function startAnim(){
		if(anim!==null)return;
		function a(){
			var d=tgt-curTop;
			if(Math.abs(d)<0.5){curTop=tgt;lyricsContainer.scrollTop=curTop;anim=null;return}
			curTop+=d*SM;
			lyricsContainer.scrollTop=curTop;
			anim=requestAnimationFrame(a);
		}
		anim=requestAnimationFrame(a);
	}
	function updateLyrics(t,{immediate=false}={}){
		if(!lyrics.length||!lyricElements.length)return;
		var time=Number(t)||0;
		var idx=findLyricIndex(time);
		if(idx<0){
			if(activeLyricIndex!==-1){
				activeLyricIndex=-1;
				lyricElements.forEach(el=>el.classList.remove('is-active','is-near'));
			}
			return;
		}
		if(idx===activeLyricIndex&&!immediate)return;
		activeLyricIndex=idx;
		lyricElements.forEach((el,i)=>{
			el.classList.toggle('is-active',i===idx);
			el.classList.toggle('is-near',Math.abs(i-idx)===1);
		});
		var act=lyricElements[idx];
		if(act)setTgt(act,immediate);
	}
	function resetLyrics(){
		activeLyricIndex=-1;
		lyricElements.forEach(el=>el.classList.remove('is-active','is-near'));
		tgt=0;curTop=0;
		if(lyricsContainer)lyricsContainer.scrollTop=0;
	}

	function fmtTime(sec){
		sec=Number(sec);
		if(!Number.isFinite(sec)||sec<0)return '0:00';
		var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=Math.floor(sec%60);
		if(h>0)return h+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
		return m+':'+String(s).padStart(2,'0');
	}
	function updateProgress(){
		var d=audio?Number(audio.duration):0;
		if(!Number.isFinite(d)||d<=0)return;
		var c=Math.max(0,Math.min(d,Number(audio.currentTime)||0));
		var p=(c/d)*100;
		fill.style.width=p+'%';
		dot.style.left=p+'%';
		cur.textContent=fmtTime(c);
		updateLyrics(c);
	}
	function setPlaying(){
		iconPlay.style.display='none';
		iconPause.style.display='block';
		playerEl.classList.add('is-playing');
		startAnim();
	}
	function setPaused(){
		iconPlay.style.display='block';
		iconPause.style.display='none';
		playerEl.classList.remove('is-playing');
	}

	play.addEventListener('click',async()=>{
		try{
			if(waPromise)await waPromise;
			if(audio.paused){await audio.play()}else{audio.pause()}
		}catch(e){
			if(audio&&audio.__kind==='element'){
				try{await switchToWebAudio();await audio.play()}catch(e2){showAudioError('Audio gagal')}
			}else{
				showAudioError('Audio gagal');
			}
		}
	});

	star.addEventListener('click',()=>star.classList.toggle('active'));

	btnRw.addEventListener('click',()=>{
		var d=audio?Number(audio.duration):0;
		if(!Number.isFinite(d)||d<=0)return;
		audio.currentTime=Math.max(0,(Number(audio.currentTime)||0)-10);
		updateLyrics(audio.currentTime,{immediate:true});
		updateProgress();
	});
	btnFw.addEventListener('click',()=>{
		var d=audio?Number(audio.duration):0;
		if(!Number.isFinite(d)||d<=0)return;
		audio.currentTime=Math.min(d,(Number(audio.currentTime)||0)+10);
		updateLyrics(audio.currentTime,{immediate:true});
		updateProgress();
	});

	function seekFromPointer(x){
		var d=audio?Number(audio.duration):0;
		if(!Number.isFinite(d)||d<=0)return;
		var r=bar.getBoundingClientRect();
		if(!r.width)return;
		var xx=Math.max(0,Math.min(x-r.left,r.width));
		audio.currentTime=(xx/r.width)*d;
		updateLyrics(audio.currentTime,{immediate:true});
		updateProgress();
	}
	bar.addEventListener('pointerdown',e=>seekFromPointer(e.clientX));

	volBar.addEventListener('pointerdown',e=>{
		var r=volBar.getBoundingClientRect();
		if(!r.width)return;
		var v=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
		volFill.style.width=(v*100)+'%';
		if(audio&&typeof audio.volume==='number')audio.volume=v;
		if(audio&&audio.__setGain)audio.__setGain(v);
	});

	var bytes=null;var waPromise=null;
	function b64ToBytes(b64){var bin=atob(b64);var out=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
	function hasDur(a){return !!a&&Number.isFinite(Number(a.duration))&&Number(a.duration)>0}
	function showAudioError(msg){dur.textContent=msg||'Audio gagal';setPaused()}
	function bindAudio(a){
		a.addEventListener('loadedmetadata',()=>{if(a!==audio)return;if(Number.isFinite(a.duration))dur.textContent=fmtTime(a.duration);updateProgress()});
		a.addEventListener('durationchange',()=>{if(a!==audio)return;if(Number.isFinite(a.duration))dur.textContent=fmtTime(a.duration)});
		a.addEventListener('timeupdate',()=>{if(a===audio)updateProgress()});
		a.addEventListener('play',()=>{if(a===audio)setPlaying()});
		a.addEventListener('pause',()=>{if(a===audio&&!a.ended)setPaused()});
		a.addEventListener('ended',()=>{if(a!==audio)return;setPaused();fill.style.width='0%';dot.style.left='0%';cur.textContent='0:00';resetLyrics()});
	}
	function createElementEngine(data,mime){
		var el=new Audio();
		el.preload='auto';
		el.setAttribute('playsinline','');
		el.__kind='element';
		el.src=URL.createObjectURL(new Blob([data],{type:mime}));
		return el;
	}
	function createWebAudioEngine(data){
		var Ctx=window.AudioContext||window.webkitAudioContext;
		if(!Ctx)throw new Error('AudioContext tidak ada');
		var ctx=new Ctx();
		var gainNode=ctx.createGain();
		gainNode.gain.value=0.85;
		gainNode.connect(ctx.destination);
		var ls={};
		var buffer=null,source=null,offset=0,startedAt=0,ticker=null;
		var api={
			__kind:'webaudio',
			paused:true,
			ended:false,
			duration:NaN,
			__setGain(v){gainNode.gain.value=v},
			addEventListener(t,f){(ls[t]=ls[t]||[]).push(f)}
		};
		function emit(t){(ls[t]||[]).slice().forEach(f=>{try{f()}catch{}})}
		function position(){if(!buffer)return 0;var tt=api.paused?offset:offset+(ctx.currentTime-startedAt);return Math.max(0,Math.min(buffer.duration,tt))}
		function stopSource(){if(!source)return;source.onended=null;try{source.stop()}catch{}try{source.disconnect()}catch{}source=null}
		function startSource(){stopSource();var s=ctx.createBufferSource();s.buffer=buffer;s.connect(gainNode);startedAt=ctx.currentTime;s.start(0,offset);s.onended=()=>{if(source===s)finish()};source=s}
		function stopTicker(){if(ticker){clearInterval(ticker);ticker=null}}
		function finish(){stopSource();stopTicker();offset=0;api.paused=true;api.ended=true;emit('ended')}
		function tick(){if(api.paused)return;if(buffer&&position()>=buffer.duration-0.05){finish();return}emit('timeupdate')}
		api.play=async function(){if(!buffer)throw new Error('audio belum siap');await ctx.resume();if(api.ended){offset=0;api.ended=false}if(!api.paused)return;api.paused=false;startSource();if(!ticker)ticker=setInterval(tick,200);emit('play')};
		api.pause=function(){if(api.paused)return;offset=position();api.paused=true;stopSource();stopTicker();emit('pause')};
		Object.defineProperty(api,'currentTime',{get(){return position()},set(v){if(!buffer)return;offset=Math.max(0,Math.min(buffer.duration,Number(v)||0));api.ended=false;if(!api.paused)startSource();emit('timeupdate')}});
		api.ready=new Promise((res,rej)=>{
			var done=false;
			var ok=d=>{if(done)return;done=true;buffer=d;api.duration=d.duration;emit('loadedmetadata');emit('durationchange');res(api)};
			var bad=e=>{if(done)return;done=true;rej(e||new Error('decode gagal'))};
			try{var cp=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);var p=ctx.decodeAudioData(cp,ok,bad);if(p&&typeof p.then==='function')p.then(ok,bad)}catch(e){bad(e)}
		});
		return api;
	}
	function switchToWebAudio(){
		if(waPromise)return waPromise;
		waPromise=(async()=>{
			var wa=createWebAudioEngine(bytes);
			try{if(audio&&audio.pause)audio.pause()}catch{}
			audio=wa;bindAudio(wa);
			await wa.ready;
			if(audio===wa){dur.textContent=fmtTime(wa.duration);updateProgress()}
			return wa;
		})();
		waPromise.catch(()=>{showAudioError('Audio tidak didukung')});
		return waPromise;
	}
	try{bytes=b64ToBytes(AUDIO_B64)}catch{showAudioError('Audio korup')}
	if(bytes){
		var elementOk=false;
		try{
			var el=createElementEngine(bytes,AUDIO_MIME);
			audio=el;bindAudio(el);
			el.addEventListener('loadedmetadata',()=>{if(hasDur(el))elementOk=true});
			el.addEventListener('error',()=>{if(!elementOk&&audio===el)switchToWebAudio().catch(()=>{})});
			setTimeout(()=>{if(!elementOk&&audio===el)switchToWebAudio().catch(()=>{})},3500);
		}catch{switchToWebAudio().catch(()=>{})}
	}
	setPaused();
})();
</script>`
}

const handler = async (m, { conn: sock, text, usedPrefix, command, reply }) => {
	const send = reply || (t => sock.sendMessage(m.chat, { text: t }, { quoted: m }))
	if (!text) return send(`contoh:\n${usedPrefix}${command} another love tom odell`)
	if (!THERESAV_KEY()) return send('API key TheresAV belum diisi. Isi `global.apikeyTheresav` di config.js lalu restart bot.')

	await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {})

	try {
		let ytUrl = text.trim()
		let title = 'Unknown'
		let artist = 'Unknown Artist'
		let duration = '0:00'
		let durationSec = 0
		let thumbUrl = ''
		let trackIdForLyrics = null
		let album = ''

		if (!/youtube\.com|youtu\.be/i.test(text)) {
			const ytm = await getYTMusic()
			const songs = await ytm.search(text)
			const track = songs.find(s => s.type === 'SONG') || songs[0]
			if (!track || !track.videoId) throw new Error('Lagu tidak ditemukan di YT Music')
			trackIdForLyrics = track.videoId
			ytUrl = `https://www.youtube.com/watch?v=${track.videoId}`
			title = track.name || track.title || 'Unknown'
			artist = track.artists?.length ? track.artists.map(a => a.name).join(', ') : (track.artist?.name || 'Unknown Artist')
			durationSec = Number(track.duration || 0)
			duration = fmtDuration(durationSec)
			if (track.thumbnails?.length) thumbUrl = track.thumbnails[track.thumbnails.length - 1].url
			album = track.album?.name || track.album?.title || ''
		} else {
			const detail = await yts(ytUrl)
			const vid = detail?.videos?.[0]
			if (!vid) throw new Error('Video tidak ditemukan')
			title = vid.title || 'Unknown'
			artist = vid.author?.name || 'YouTube'
			duration = vid.timestamp || '0:00'
			durationSec = secondsFromTimestamp(duration)
			thumbUrl = vid.thumbnail
			const match = ytUrl.match(/(?:v=|shorts\/|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
			if (match) trackIdForLyrics = match[1]
		}

		let syncedLyrics = []
		const lrclib = await getLRCLyrics({ title, artist, duration: durationSec, album })
		if (lrclib?.syncedLyrics) syncedLyrics = parseSyncedLyrics(lrclib.syncedLyrics)
		if (!syncedLyrics.length && lrclib?.plainLyrics) syncedLyrics = plainLyricsToSynced(lrclib.plainLyrics, durationSec)
		if (!syncedLyrics.length && trackIdForLyrics) {
			try {
				const ytm = await getYTMusic()
				const lyricsData = await ytm.getLyrics(trackIdForLyrics)
				let fallback = ''
				if (typeof lyricsData === 'string') fallback = lyricsData
				else if (Array.isArray(lyricsData)) fallback = lyricsData.map(i => typeof i === 'string' ? i : i?.lyrics || i?.text || i?.content || '').filter(Boolean).join('\n')
				else fallback = lyricsData?.lyrics || lyricsData?.text || lyricsData?.content || ''
				if (fallback) {
					syncedLyrics = parseSyncedLyrics(fallback)
					if (!syncedLyrics.length) syncedLyrics = plainLyricsToSynced(fallback, durationSec)
				}
			} catch {}
		}
		syncedLyrics = normalizeLyrics(syncedLyrics)

		const thumb = await getThumb(thumbUrl)
		const imageSrc = thumb?.length ? `data:image/jpeg;base64,${thumb.toString('base64')}` : ''

		const audio = await getYtmp3Retry(ytUrl)
		if (!audio?.url) throw new Error('API gak return download URL')

		const originalBuffer = await downloadAudioBuffer(audio.url)

		let nativeBuffer = null
		let webBuffer = null
		try { nativeBuffer = await compressAudio(originalBuffer, 'opus', TRIM_SEC) }
		catch (e) { console.error('[PLAY2] Opus gagal:', e.message) }
		try { webBuffer = await compressAudio(originalBuffer, 'mp3', TRIM_SEC) }
		catch (e) { console.error('[PLAY2] MP3 gagal:', e.message) }

		if (!webBuffer && !nativeBuffer) {
			throw new Error('Dua-duanya gagal encode audio (FFmpeg error, cek log)')
		}

		const playerBuffer = webBuffer || nativeBuffer
		const audioMime = webBuffer ? 'audio/mpeg' : 'audio/ogg'
		const audioB64 = playerBuffer.toString('base64')

		if (audioB64.length > 1 * 1024 * 1024) {
			throw new Error(`Audio b64 terlalu besar (${(audioB64.length / 1024 / 1024).toFixed(2)} MB) — trim lebih pendek atau turunkan bitrate`)
		}

		const html = createMusicPlayer({ title, artist, duration: `${TRIM_SEC}s`, audioB64, audioMime, imageSrc, lyrics: syncedLyrics })

		const rich = new AIRich(sock)
		if (typeof rich.setTitle === 'function' && typeof rich.addSection === 'function') {
			rich.setTitle('🎵 Apple Music Player')
			rich.addSection({
				view_model: {
					__typename: 'GenAISingleLayoutViewModel',
					primitive: {
						__typename: 'GenAIaeacdsnwHtmlPrimitive',
						trusted_sources: [],
						payload: html
					}
				}
			})
		} else {
			const section = AIRich.newLayout('Single', {
				__typename: 'GenAIaeacdsnwHtmlPrimitive',
				payload: html,
				trusted_sources: ['music']
			})
			rich._addContent(section, [{
				messageType: 2,
				messageText: `🎵 ${title} — ${artist}`
			}])
		}
		await rich.send(m.chat, { quoted: m })

		await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
	} catch (error) {
		await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {})
		await send(`❌ gagal memproses lagu.\n\n> ${error?.message || 'Unknown error'}`)
	}
}

handler.command = ['play', 'playaudio']
handler.tags = ['downloader']
handler.help = ['play <judul lagu>']
handler.limit = true

export default handler