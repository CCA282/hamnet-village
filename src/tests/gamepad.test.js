import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { gamepadMethods } from '../game/input/gamepad.js'

vi.mock('vue', () => ({ reactive: (obj) => obj, watch: () => {} }))
vi.mock('../net/netState.js', () => ({
  netState: { mode: null, playerName: '' },
}))

const { playerMethods } = await import('../game/world/players.js')
const { resetGame } = await import('../game/store.js')

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePad(buttonsPressed = [], axes = [0, 0, 0, 0]) {
  const pressed = Array(17).fill(false)
  for (const i of buttonsPressed) pressed[i] = true
  return { pressed, prev: Array(17).fill(false), axes }
}

function makePadPrev(pad, prevPressed = []) {
  const prev = Array(17).fill(false)
  for (const i of prevPressed) prev[i] = true
  return { ...pad, prev }
}

function makeInputCtx(pads = {}) {
  return {
    _pads: pads,
    ...gamepadMethods,
    // stubs for non-gamepad input paths called by handleJoins
    touchEngaged: () => false,
    keyboardState: () => ({ action: false, actionHeld: false, mx: 0, my: 0, cancel: false }),
    mouseAction: false,
  }
}

function makePlayerCtx(overrides = {}) {
  return {
    ...playerMethods,
    players: [],
    carts: [],
    _nextId: 1,
    _nextPlayerNum: 1,
    spawnPoof: vi.fn(),
    closeMenu: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => resetGame())

// ── gamepadMethods: padList ───────────────────────────────────────────────────

describe('padList', () => {
  it('returns empty array when no pads connected', () => {
    const inp = makeInputCtx({})
    expect(inp.padList()).toEqual([])
  })

  it('returns index of connected pad', () => {
    const inp = makeInputCtx({ 0: makePad() })
    expect(inp.padList()).toEqual([0])
  })

  it('returns all connected pad indices', () => {
    const inp = makeInputCtx({ 0: makePad(), 1: makePad(), 3: makePad() })
    expect(inp.padList()).toEqual(expect.arrayContaining([0, 1, 3]))
    expect(inp.padList()).toHaveLength(3)
  })
})

// ── gamepadMethods: padPressed ────────────────────────────────────────────────

describe('padPressed', () => {
  it('returns true on first press (pressed=true, prev=false)', () => {
    const pad = makePad([0])        // button 0 pressed
    // prev is all false by default
    const inp = makeInputCtx({ 0: pad })
    expect(inp.padPressed(0, 0)).toBe(true)
  })

  it('returns false when button held (pressed=true, prev=true)', () => {
    const pad = makePadPrev(makePad([0]), [0])   // both pressed and prev have button 0
    const inp = makeInputCtx({ 0: pad })
    expect(inp.padPressed(0, 0)).toBe(false)
  })

  it('returns false when button not pressed', () => {
    const inp = makeInputCtx({ 0: makePad() })
    expect(inp.padPressed(0, 0)).toBe(false)
  })

  it('returns false for unknown pad index', () => {
    const inp = makeInputCtx({})
    expect(inp.padPressed(99, 0)).toBe(false)
  })
})

// ── gamepadMethods: padAnyPressed ─────────────────────────────────────────────

describe('padAnyPressed', () => {
  it('returns true when any button newly pressed', () => {
    const inp = makeInputCtx({ 0: makePad([7]) })   // button 7 just pressed
    expect(inp.padAnyPressed(0)).toBe(true)
  })

  it('returns false when all buttons held (in prev too)', () => {
    const pad = makePadPrev(makePad([0, 1]), [0, 1])
    const inp = makeInputCtx({ 0: pad })
    expect(inp.padAnyPressed(0)).toBe(false)
  })

  it('returns false when no buttons pressed', () => {
    const inp = makeInputCtx({ 0: makePad() })
    expect(inp.padAnyPressed(0)).toBe(false)
  })

  it('returns false for unknown pad index', () => {
    const inp = makeInputCtx({})
    expect(inp.padAnyPressed(99)).toBe(false)
  })

  it('detects any button, not just button 0', () => {
    for (const btn of [1, 7, 12, 13, 14, 15]) {
      const inp = makeInputCtx({ 0: makePad([btn]) })
      expect(inp.padAnyPressed(0), `button ${btn}`).toBe(true)
    }
  })
})

// ── gamepadMethods: padState ──────────────────────────────────────────────────

describe('padState', () => {
  it('returns neutral state for unknown pad', () => {
    const inp = makeInputCtx({})
    const s = inp.padState(99)
    expect(s).toEqual({ mx: 0, my: 0, action: false, actionHeld: false, cancel: false, up: false, down: false })
  })

  it('action=true when button 0 just pressed', () => {
    const inp = makeInputCtx({ 0: makePad([0]) })
    expect(inp.padState(0).action).toBe(true)
    expect(inp.padState(0).actionHeld).toBe(true)
  })

  it('actionHeld=true while button 0 held (not new press)', () => {
    const pad = makePadPrev(makePad([0]), [0])
    const inp = makeInputCtx({ 0: pad })
    const s = inp.padState(0)
    expect(s.action).toBe(false)      // not a new press
    expect(s.actionHeld).toBe(true)   // but still held
  })

  it('cancel=true when button 1 just pressed', () => {
    const inp = makeInputCtx({ 0: makePad([1]) })
    expect(inp.padState(0).cancel).toBe(true)
  })

  it('left stick X axis drives mx (dead zone 0.25)', () => {
    const inp = makeInputCtx({ 0: { ...makePad(), axes: [0.8, 0, 0, 0] } })
    expect(inp.padState(0).mx).toBeCloseTo(0.8)
  })

  it('left stick below dead zone gives mx=0', () => {
    const inp = makeInputCtx({ 0: { ...makePad(), axes: [0.1, 0, 0, 0] } })
    expect(inp.padState(0).mx).toBe(0)
  })

  it('d-pad left (button 14) forces mx=-1', () => {
    const inp = makeInputCtx({ 0: makePad([14]) })
    expect(inp.padState(0).mx).toBe(-1)
  })

  it('d-pad right (button 15) forces mx=1', () => {
    const inp = makeInputCtx({ 0: makePad([15]) })
    expect(inp.padState(0).mx).toBe(1)
  })

  it('d-pad up (button 12) forces my=-1 and up=true', () => {
    const inp = makeInputCtx({ 0: makePad([12]) })
    const s = inp.padState(0)
    expect(s.my).toBe(-1)
    expect(s.up).toBe(true)
  })

  it('d-pad down (button 13) forces my=1 and down=true', () => {
    const inp = makeInputCtx({ 0: makePad([13]) })
    const s = inp.padState(0)
    expect(s.my).toBe(1)
    expect(s.down).toBe(true)
  })
})

// ── playerMethods: handleJoins with gamepad ───────────────────────────────────

describe('handleJoins — gamepad', () => {
  it('spawns a pad player when a button is pressed on a connected pad', () => {
    const w = makePlayerCtx()
    const input = makeInputCtx({ 0: makePad([0]) }) // pad 0, button 0 pressed
    w.handleJoins(input)
    expect(w.players).toHaveLength(1)
    expect(w.players[0].source).toBe('pad')
    expect(w.players[0].gamepadIndex).toBe(0)
  })

  it('does not spawn when no button newly pressed (held)', () => {
    const w = makePlayerCtx()
    const held = makePadPrev(makePad([0]), [0])
    const input = makeInputCtx({ 0: held })
    w.handleJoins(input)
    expect(w.players).toHaveLength(0)
  })

  it('does not spawn when no pads connected', () => {
    const w = makePlayerCtx()
    const input = makeInputCtx({})
    w.handleJoins(input)
    expect(w.players).toHaveLength(0)
  })

  it('does not add a second player for the same pad index', () => {
    const w = makePlayerCtx()
    const input = makeInputCtx({ 0: makePad([0]) })
    w.handleJoins(input)
    w.handleJoins(input) // second frame, same pad still "pressed"
    expect(w.players).toHaveLength(1) // no duplicate
  })

  it('two pads add two players on the same frame', () => {
    const w = makePlayerCtx()
    const input = makeInputCtx({
      0: makePad([0]),
      1: makePad([0]),
    })
    w.handleJoins(input)
    expect(w.players).toHaveLength(2)
    expect(w.players[0].gamepadIndex).toBe(0)
    expect(w.players[1].gamepadIndex).toBe(1)
  })

  it('two gamepad players get different colors', () => {
    const w = makePlayerCtx()
    const input = makeInputCtx({ 0: makePad([0]), 1: makePad([0]) })
    w.handleJoins(input)
    expect(w.players[0].color).not.toBe(w.players[1].color)
  })

  it('can mix keyboard and gamepad players', () => {
    const w = makePlayerCtx()
    // Spawn a keyboard player first
    w.addPlayer('kb1')
    // Then gamepad
    const input = makeInputCtx({ 0: makePad([0]) })
    w.handleJoins(input)
    expect(w.players).toHaveLength(2)
    expect(w.players[0].source).toBe('kb1')
    expect(w.players[1].source).toBe('pad')
  })
})

// ── playerMethods: handleDisconnects ─────────────────────────────────────────

describe('handleDisconnects — gamepad', () => {
  it('removes a pad player when its gamepad disconnects', () => {
    const w = makePlayerCtx()
    w.addPlayer('pad', 0)
    // Simulate disconnect: padList returns nothing
    const input = makeInputCtx({})
    w.handleDisconnects(input)
    expect(w.players).toHaveLength(0)
  })

  it('keeps pad player while gamepad stays connected', () => {
    const w = makePlayerCtx()
    w.addPlayer('pad', 0)
    const input = makeInputCtx({ 0: makePad() })
    w.handleDisconnects(input)
    expect(w.players).toHaveLength(1)
  })

  it('only removes the disconnected pad (not other pads or keyboard)', () => {
    const w = makePlayerCtx()
    w.addPlayer('pad', 0)
    w.addPlayer('pad', 1)
    w.addPlayer('kb1')
    // Pad 1 disconnects, pad 0 and kb1 remain
    const input = makeInputCtx({ 0: makePad() })
    w.handleDisconnects(input)
    expect(w.players).toHaveLength(2)
    const sources = w.players.map((p) => p.source)
    expect(sources).toContain('pad')
    expect(sources).toContain('kb1')
    expect(w.players.find((p) => p.source === 'pad').gamepadIndex).toBe(0)
  })

  it('does not touch keyboard players when all pads disconnect', () => {
    const w = makePlayerCtx()
    w.addPlayer('kb1')
    w.addPlayer('kb2')
    // No pads were ever added → nothing to disconnect
    const input = makeInputCtx({})
    w.handleDisconnects(input)
    expect(w.players).toHaveLength(2)
  })

  it('clears cart.following when the pad player carrying it disconnects', () => {
    const w = makePlayerCtx()
    const p = w.addPlayer('pad', 0)
    const cart = { id: 99, x: 0, y: 0, following: p.id, inventory: {} }
    w.carts = [cart]

    const input = makeInputCtx({}) // pad 0 disconnects
    w.handleDisconnects(input)

    expect(w.players).toHaveLength(0)
    expect(cart.following).toBeNull()
  })

  it('does not affect cart.following when unrelated pad disconnects', () => {
    const w = makePlayerCtx()
    const p0 = w.addPlayer('pad', 0) // this one stays connected
    w.addPlayer('pad', 1)            // this one disconnects

    const cart = { id: 99, x: 0, y: 0, following: p0.id, inventory: {} }
    w.carts = [cart]

    const input = makeInputCtx({ 0: makePad() }) // only pad 0 remains
    w.handleDisconnects(input)

    expect(cart.following).toBe(p0.id) // unchanged
    expect(w.players).toHaveLength(1)
  })
})

// ── inputFor: pad source ──────────────────────────────────────────────────────

describe('inputFor — pad source', () => {
  it('returns padState for pad-sourced player', () => {
    const w = makePlayerCtx()
    const p = w.addPlayer('pad', 0)
    const input = {
      ...makeInputCtx({ 0: makePad([0]) }),
      padState() { return { mx: 0.5, my: 0, action: true, actionHeld: true, cancel: false } },
    }
    const s = w.inputFor(input, p)
    expect(s.action).toBe(true)
    expect(s.mx).toBe(0.5)
  })
})
