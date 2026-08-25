import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs'
import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const PORT = parseInt(process.env.PORT || '3001')
const DATA_DIR = process.env.DATA_DIR || './data/worlds'
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) console.warn('SUPABASE_URL / SUPABASE_ANON_KEY non défini : les sauvegardes serveur (comptes) sont désactivées')

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

// Vérifie le token émis par Supabase Auth (même projet que le frontend) — retourne { id, email } ou null.
async function getUser(req) {
  if (!supabase) return null
  const auth = req.headers['authorization'] || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email }
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function genId() { return randomBytes(8).toString('hex') }

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg))
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
// room = { code, host: ws, guests: Map<guestId, ws>, hostId }

const rooms = new Map()

function createRoom(hostWs, worldData) {
  let code
  do { code = genCode() } while (rooms.has(code))
  const hostId = genId()
  const room = { code, host: hostWs, guests: new Map(), hostId }
  hostWs._room = code
  hostWs._role = 'host'
  hostWs._id   = hostId
  rooms.set(code, room)
  send(hostWs, { type: 'room_created', code, hostId })
  if (worldData) send(hostWs, { type: 'world_load', data: worldData })
  console.log(`Room created: ${code}`)
  return room
}

function joinRoom(guestWs, code, name) {
  const room = rooms.get(code)
  if (!room) { send(guestWs, { type: 'error', message: 'Room introuvable' }); return }
  const guestId = genId()
  room.guests.set(guestId, guestWs)
  guestWs._room  = code
  guestWs._role  = 'guest'
  guestWs._id    = guestId
  guestWs._name  = name || null
  // Tell guest their ID and ask host for current state
  send(guestWs, { type: 'room_joined', code, guestId })
  // Tell host a guest joined (with their chosen name)
  send(room.host, { type: 'guest_joined', guestId, name: guestWs._name })
  console.log(`Guest ${guestId} joined room ${code}`)
}

function leaveRoom(ws) {
  const code = ws._room
  if (!code) return
  const room = rooms.get(code)
  if (!room) return

  if (ws._role === 'host') {
    // Notify all guests
    for (const guestWs of room.guests.values()) {
      send(guestWs, { type: 'error', message: 'L\'hôte a quitté la partie' })
    }
    rooms.delete(code)
    console.log(`Room ${code} closed (host left)`)
  } else {
    room.guests.delete(ws._id)
    send(room.host, { type: 'guest_left', guestId: ws._id })
    console.log(`Guest ${ws._id} left room ${code}`)
  }
}

// ── Worlds ────────────────────────────────────────────────────────────────────

function listWorlds(ownerId) {
  try {
    return readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const d = JSON.parse(readFileSync(`${DATA_DIR}/${f}`, 'utf8'))
          if (d.ownerId !== ownerId) return null
          return { id: f.replace('.json', ''), name: d.name || 'Sans nom', savedAt: d.savedAt }
        } catch { return null }
      })
      .filter(Boolean)
      .sort((a, b) => (b.savedAt || '') > (a.savedAt || '') ? 1 : -1)
  } catch { return [] }
}

function saveWorld(id, data) {
  const path = `${DATA_DIR}/${id}.json`
  writeFileSync(path, JSON.stringify(data), 'utf8')
  return id
}

function loadWorld(id) {
  try {
    return JSON.parse(readFileSync(`${DATA_DIR}/${id}.json`, 'utf8'))
  } catch { return null }
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

const httpServer = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (req.method === 'GET' && url.pathname === '/api/worlds') {
    const user = await getUser(req)
    if (!user) { res.writeHead(401); res.end('Connecte-toi pour voir tes parties sauvegardées'); return }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(listWorlds(user.id)))
    return
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/worlds/')) {
    const user = await getUser(req)
    if (!user) { res.writeHead(401); res.end('Connecte-toi pour charger cette partie'); return }
    const id = url.pathname.split('/').pop()
    const data = loadWorld(id)
    if (!data || data.ownerId !== user.id) { res.writeHead(404); res.end('Not found'); return }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/worlds') {
    const user = await getUser(req)
    if (!user) { res.writeHead(401); res.end('Connecte-toi pour sauvegarder en ligne'); return }
    let body = ''
    req.on('data', c => body += c)
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const id = data.id || genId()
        data.savedAt = new Date().toISOString()
        data.ownerId = user.id
        saveWorld(id, data)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ id }))
      } catch { res.writeHead(400); res.end('Bad request') }
    })
    return
  }

  res.writeHead(404); res.end('Not found')
})

// ── WebSocket ─────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    if (msg.type === 'create_room') {
      createRoom(ws, msg.worldData || null)
      return
    }

    if (msg.type === 'join_room') {
      joinRoom(ws, msg.code, msg.name || null)
      return
    }

    if (msg.type === 'ping') {
      send(ws, { type: 'pong' })
      return
    }

    const room = ws._room ? rooms.get(ws._room) : null
    if (!room) return

    // Host broadcasts game state to all guests
    if (msg.type === 'state' && ws._role === 'host') {
      for (const guestWs of room.guests.values()) {
        send(guestWs, { type: 'state', data: msg.data })
      }
      return
    }

    // Host sends state snapshot to a specific guest (in response to guest_joined)
    if (msg.type === 'state_for_guest' && ws._role === 'host') {
      const guestWs = room.guests.get(msg.guestId)
      if (guestWs) send(guestWs, { type: 'state', data: msg.data })
      return
    }

    // Guest sends input to host
    if (msg.type === 'input' && ws._role === 'guest') {
      send(room.host, { type: 'input', guestId: ws._id, input: msg.input })
      return
    }

    // Host sends open_menu to a specific guest
    if (msg.type === 'open_menu_for_guest' && ws._role === 'host') {
      const guestWs = room.guests.get(msg.guestId)
      if (guestWs) send(guestWs, { type: 'open_menu', buildingId: msg.buildingId ?? null })
      return
    }

    // Host closes a guest's menu (e.g. cancel key processed on host side)
    if (msg.type === 'close_menu_for_guest' && ws._role === 'host') {
      const guestWs = room.guests.get(msg.guestId)
      if (guestWs) send(guestWs, { type: 'close_menu' })
      return
    }

    // Guest sends a menu action to host
    if (msg.type === 'guest_menu_action' && ws._role === 'guest') {
      send(room.host, { type: 'guest_menu_action', guestId: ws._id, action: msg.action })
      return
    }

    // Save world (host only)
    if (msg.type === 'save_world' && ws._role === 'host') {
      const id = msg.id || genId()
      saveWorld(id, { ...msg.data, id })
      send(ws, { type: 'world_saved', id })
      return
    }
  })

  ws.on('close', () => leaveRoom(ws))
  ws.on('error', () => leaveRoom(ws))
})

httpServer.listen(PORT, () => console.log(`Hamnet server listening on :${PORT}`))
