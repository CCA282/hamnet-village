import { DEFS } from './defs/index.js'

// Build an offscreen canvas from a pixel-art grid + palette
function build(rows, palette) {
  const h = rows.length
  let w = 0
  for (const r of rows) w = Math.max(w, r.length)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')
  for (let y = 0; y < h; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      const c = palette[row[x]]
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(x, y, 1, 1)
    }
  }
  return cv
}

const cache = new Map()

export function sprite(name) {
  if (cache.has(name)) return cache.get(name)
  const def = DEFS[name]
  if (!def) throw new Error('Sprite inconnu: ' + name)
  const cv = build(def.rows, def.pal)
  cache.set(name, cv)
  return cv
}

export function spriteUrl(name) {
  return sprite(name).toDataURL('image/png')
}

// Player sprite: shared silhouette, per-player colour
const CHAR_ROWS = [
  '.HHHHHH.',
  'HHHHHHHH',
  'HSSSSSSH',
  '.SSSSSS.',
  '.SoSSoS.',
  '.SSSSSS.',
  '.mBBBBm.',
  'sBBBBBBs',
  '.BBBBBB.',
  '.BBBBBB.',
  '.PP..PP.',
  '.f....f.',
]

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255
  let g = (n >> 8) & 255
  let b = n & 255
  r = Math.max(0, Math.min(255, r + amt))
  g = Math.max(0, Math.min(255, g + amt))
  b = Math.max(0, Math.min(255, b + amt))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

export function characterSprite(color) {
  const key = 'char:' + color
  if (cache.has(key)) return cache.get(key)
  const pal = {
    H: shade(color, -35),
    B: color,
    m: shade(color, -30),
    S: '#f1c9a5',
    s: '#f1c9a5',
    o: '#3a2e28',
    P: '#41506b',
    f: '#4a3a2a',
  }
  const cv = build(CHAR_ROWS, pal)
  cache.set(key, cv)
  return cv
}

export function shadowSprite(w) {
  const key = 'shadow:' + w
  if (cache.has(key)) return cache.get(key)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = Math.max(2, Math.round(w * 0.4))
  const ctx = cv.getContext('2d')
  ctx.fillStyle = 'rgba(30,40,25,0.22)'
  ctx.beginPath()
  ctx.ellipse(cv.width / 2, cv.height / 2, cv.width / 2, cv.height / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  cache.set(key, cv)
  return cv
}
