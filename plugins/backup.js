import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const BASE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BACKUP_DIR = path.join(BASE_DIR, 'data', 'backups')
const ownerJid = () => `${String(global.owner[0][0]).replace(/\D/g, '')}@s.whatsapp.net`
const SCHEDULE_FILE = path.join(BACKUP_DIR, '.schedule.json')

const BACKUP_TARGETS = [
  'data', 'lib', 'media', 'plugins', 'sessions',
  'config.js', 'handler.js', 'index.js', 'main.js', 'package.json', 'package-lock.json', 'tmp', '.gitignore', '.prettierignore', 'eslint.config.js', 'README.md',
]

// ── State runtime ─────────────────────────────────────────
let scheduleTimer = null

// ── Helpers ───────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

function formatDate(date) {
  return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

function loadSchedule() {
  try {
    if (fs.existsSync(SCHEDULE_FILE)) return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'))
  } catch {}
  return null
}

function saveSchedule(data) {
  ensureBackupDir()
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(data, null, 2))
}

function deleteSchedule() {
  if (fs.existsSync(SCHEDULE_FILE)) fs.unlinkSync(SCHEDULE_FILE)
}

function intervalMs(angka, unit) {
  const map = { hari: 86400000, minggu: 604800000, bulan: 2592000000, tahun: 31536000000 }
  return angka * (map[unit] || 0)
}

function unitLabel(unit, angka) {
  return `${angka} ${unit}`
}

// ── Core: buat backup & kirim ke owner ───────────────────
async function doBackup(conn, label = 'MANUAL') {
  ensureBackupDir()

  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `backup-${timestamp}.zip`
  const outPath = path.join(BACKUP_DIR, filename)

  const targets = BACKUP_TARGETS
    .filter(t => fs.existsSync(path.join(BASE_DIR, t)))
    .join(' ')

  const cmd = `cd ${BASE_DIR} && zip -r ${outPath} ${targets} -x "data/backups/*" -x "*.log"`

  await execAsync(cmd)
  const stat = fs.statSync(outPath)
  const fileData = fs.readFileSync(outPath)

  await conn.sendMessage(ownerJid(), {
    document: fileData,
    mimetype: 'application/zip',
    fileName: filename,
    caption:
      `📦 *BACKUP ${label}*\n\n` +
      `📁 File: \`${filename}\`\n` +
      `💾 Ukuran: ${formatBytes(stat.size)}\n` +
      `📅 Waktu: ${formatDate(now)}\n\n` +
      `Yang di-backup:\n${BACKUP_TARGETS.map(t => `• ${t}`).join('\n')}`,
  })

  return { filename, size: stat.size, now }
}

// ── Schedule runner ───────────────────────────────────────
function startSchedule(conn, schedule) {
  if (scheduleTimer) clearInterval(scheduleTimer)
  if (!schedule || !schedule.enabled) return

  const ms = intervalMs(schedule.angka, schedule.unit)
  if (!ms) return

  scheduleTimer = setInterval(async () => {
    try {
      await doBackup(conn, `TERJADWAL (${unitLabel(schedule.unit, schedule.angka)})`)
      schedule.nextRun = Date.now() + ms
      saveSchedule(schedule)
    } catch (e) {
      console.error('[BackupSchedule] Error:', e.message)
    }
  }, ms)
}

// ── Init saat bot nyala ───────────────────────────────────
export function initBackupSystem(conn) {
  const schedule = loadSchedule()
  if (schedule?.enabled) startSchedule(conn, schedule)
}

// ── Handler utama ─────────────────────────────────────────
let handler = async (m, { conn, args, usedPrefix, command }) => {
  const sub = args[0]?.toLowerCase()

  // ════════════════════════════════════════════════════════
  // .backupschedule
  // ════════════════════════════════════════════════════════
  if (command.match(/^backupschedule$/i)) {

    if (sub === 'hapus') {
      deleteSchedule()
      if (scheduleTimer) { clearInterval(scheduleTimer); scheduleTimer = null }
      return m.reply('🗑️ *Backup schedule dihapus.*')
    }

    if (sub === 'off' || sub === 'on') {
      const schedule = loadSchedule()
      if (!schedule) return m.reply('⚠️ Belum ada schedule. Buat dulu dengan:\n*.backupschedule <angka> <hari/minggu/bulan/tahun>*')
      schedule.enabled = sub === 'on'
      saveSchedule(schedule)
      if (sub === 'on') {
        startSchedule(conn, schedule)
        return m.reply(`✅ Backup schedule *diaktifkan* kembali.\nInterval: *${unitLabel(schedule.unit, schedule.angka)}*`)
      } else {
        if (scheduleTimer) { clearInterval(scheduleTimer); scheduleTimer = null }
        return m.reply('⏸️ Backup schedule *dinonaktifkan*.')
      }
    }

    if (!sub) {
      const schedule = loadSchedule()
      if (!schedule) return m.reply(
        `📅 *BACKUP SCHEDULE*\n\n` +
        `Belum ada schedule aktif.\n\n` +
        `*Cara pakai:*\n` +
        `• \`${usedPrefix}backupschedule 1 hari\`\n` +
        `• \`${usedPrefix}backupschedule 2 minggu\`\n` +
        `• \`${usedPrefix}backupschedule 1 bulan\`\n` +
        `• \`${usedPrefix}backupschedule off\` — matikan\n` +
        `• \`${usedPrefix}backupschedule on\` — aktifkan\n` +
        `• \`${usedPrefix}backupschedule hapus\` — hapus`
      )

      const nextRun = schedule.nextRun ? formatDate(new Date(schedule.nextRun)) : 'Segera'
      return m.reply(
        `📅 *BACKUP SCHEDULE*\n\n` +
        `🔁 Interval: *${unitLabel(schedule.unit, schedule.angka)}*\n` +
        `📶 Status: *${schedule.enabled ? '✅ Aktif' : '⏸️ Nonaktif'}*\n` +
        `⏱️ Backup berikutnya: *${nextRun}*\n\n` +
        `• \`${usedPrefix}backupschedule off\` — matikan\n` +
        `• \`${usedPrefix}backupschedule hapus\` — hapus`
      )
    }

    const angka = parseInt(sub)
    const unit = args[1]?.toLowerCase()

    if (isNaN(angka) || angka < 1) return m.reply('❌ Angka tidak valid. Contoh: *.backupschedule 1 hari*')
    if (!['hari', 'minggu', 'bulan', 'tahun'].includes(unit)) {
      return m.reply('❌ Unit tidak valid.\nGunakan: *hari / minggu / bulan / tahun*')
    }

    const ms = intervalMs(angka, unit)
    const schedule = {
      angka, unit, enabled: true,
      createdAt: Date.now(),
      nextRun: Date.now() + ms,
    }

    saveSchedule(schedule)
    startSchedule(conn, schedule)
    m.react('✅')
    return m.reply(
      `✅ *Backup schedule diset!*\n\n` +
      `🔁 Interval: *${unitLabel(unit, angka)}*\n` +
      `⏱️ Backup pertama: *${formatDate(new Date(schedule.nextRun))}*\n\n` +
      `Bot akan otomatis backup & kirim ke owner setiap *${unitLabel(unit, angka)}*.\n` +
      `Matikan: \`${usedPrefix}backupschedule off\`\n` +
      `Hapus: \`${usedPrefix}backupschedule hapus\``
    )
  }

  // ════════════════════════════════════════════════════════
  // .backup
  // ════════════════════════════════════════════════════════
  if (!sub || sub === 'list') {
    if (!fs.existsSync(BACKUP_DIR)) return m.reply(`📦 Belum ada backup.\nGunakan: *${usedPrefix + command} buat*`)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.zip'))
      .map(f => {
        const fullPath = path.join(BACKUP_DIR, f)
        const stat = fs.statSync(fullPath)
        return { name: f, size: stat.size, mtime: stat.mtime }
      })
      .sort((a, b) => b.mtime - a.mtime)
    if (!files.length) return m.reply(`📦 Belum ada backup.\nGunakan: *${usedPrefix + command} buat*`)
    let teks = `📦 *DAFTAR BACKUP*\n\n`
    files.forEach((f, i) => {
      teks += `${i + 1}. \`${f.name}\`\n   📅 ${formatDate(f.mtime)}\n   💾 ${formatBytes(f.size)}\n\n`
    })
    teks += `Total: *${files.length} backup*\nHapus: *${usedPrefix + command} hapus <nama_file>*`
    return m.reply(teks)
  }

  if (sub === 'buat') {
    m.react('⏳')
    try {
      const { filename, size, now } = await doBackup(conn, 'MANUAL')
      m.react('✅')
      if (m.chat !== ownerJid()) {
        return m.reply(
          `✅ *Backup Berhasil!*\n\n📁 File: \`${filename}\`\n💾 Ukuran: ${formatBytes(size)}\n📅 Waktu: ${formatDate(now)}\n\n📨 File backup dikirim ke owner.`
        )
      }
    } catch (e) {
      m.react('❌')
      return m.reply(`❌ Backup gagal!\n${e.message}`)
    }
  }

  if (sub === 'hapus') {
    const filename = args[1]
    if (!filename) return m.reply(`Masukkan nama file.\nContoh: *${usedPrefix + command} hapus backup-xxx.zip*`)
    if (!filename.endsWith('.zip') || filename.includes('/') || filename.includes('..')) return m.reply('❌ Nama file tidak valid.')
    const filePath = path.join(BACKUP_DIR, filename)
    if (!fs.existsSync(filePath)) return m.reply(`❌ File *${filename}* tidak ditemukan.`)
    fs.unlinkSync(filePath)
    m.react('🗑️')
    return m.reply(`🗑️ Backup *${filename}* berhasil dihapus.`)
  }

  if (sub === 'hapussemua') {
    if (!fs.existsSync(BACKUP_DIR)) return m.reply('Tidak ada backup untuk dihapus.')
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.zip'))
    if (!files.length) return m.reply('Tidak ada backup untuk dihapus.')
    files.forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)))
    m.react('🗑️')
    return m.reply(`🗑️ *${files.length} backup* berhasil dihapus semua.`)
  }

  return m.reply(
    `📦 *BACKUP BOT*\n\n` +
    `• *${usedPrefix}backup buat* — Buat backup manual\n` +
    `• *${usedPrefix}backup list* — Lihat daftar backup\n` +
    `• *${usedPrefix}backup hapus <file>* — Hapus satu backup\n` +
    `• *${usedPrefix}backup hapussemua* — Hapus semua backup\n\n` +
    `• *${usedPrefix}backupschedule <angka> <hari/minggu/bulan/tahun>* — Set jadwal\n` +
    `• *${usedPrefix}backupschedule off/on* — Matikan/aktifkan jadwal\n` +
    `• *${usedPrefix}backupschedule hapus* — Hapus jadwal`
  )
}

handler.help = ['backup', 'backupschedule']
handler.tags = ['owner']
handler.command = /^backup$|^backupschedule$/i
handler.owner = true

export default handler