import { test, expect } from '@playwright/test'
import { startLocalGame, getWorldPlayers } from './helpers.js'

// Injects a navigator.getGamepads mock. Tests control the fake gamepads via
// window.__mockGamepads (array of fake Gamepad objects).
async function injectGamepadMock(page) {
  await page.addInitScript(() => {
    window.__mockGamepads = []
    navigator.getGamepads = () => window.__mockGamepads
  })
}

// Returns a fake Gamepad object compatible with beginFrame()'s expectations:
//   { index, buttons: [{pressed,value}…], axes }
function fakePad(index, buttonsPressed = [], axes = [0, 0, 0, 0]) {
  const makeBtn = (p) => ({ pressed: p, value: p ? 1 : 0 })
  return {
    index,
    buttons: Array(17).fill(null).map((_, i) => makeBtn(buttonsPressed.includes(i))),
    axes,
  }
}

// ── Spawning ───────────────────────────────────────────────────────────────────

test.describe('Gamepad — spawning', () => {
  test('pressing any button on a connected gamepad spawns a pad player', async ({ page }) => {
    await injectGamepadMock(page)
    await startLocalGame(page, 'Test pad spawn')
    await page.waitForTimeout(150)

    // First appearance with button 0 pressed → prev=all false → padAnyPressed=true
    await page.evaluate(([pad]) => { window.__mockGamepads = [pad] }, [fakePad(0, [0])])

    await page.waitForFunction(
      () => window.__engine?.world?.players?.length >= 1,
      { timeout: 3_000 },
    )

    const players = await getWorldPlayers(page)
    expect(players).toHaveLength(1)
    expect(players[0].source).toBe('pad')
  })

  test('pad player receives a label and a valid hex color', async ({ page }) => {
    await injectGamepadMock(page)
    await startLocalGame(page, 'Test pad meta')
    await page.waitForTimeout(150)

    await page.evaluate(([pad]) => { window.__mockGamepads = [pad] }, [fakePad(0, [0])])
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 3_000 })

    const players = await getWorldPlayers(page)
    expect(players[0].label).toBeTruthy()
    expect(players[0].color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  test('pad player is not duplicated when button stays held after spawn', async ({ page }) => {
    await injectGamepadMock(page)
    await startLocalGame(page, 'Test pad held no dup')
    await page.waitForTimeout(150)

    // First appearance with button 0 pressed → player spawns (prev=all false)
    await page.evaluate(([pad]) => { window.__mockGamepads = [pad] }, [fakePad(0, [0])])
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 3_000 })

    // Hold button for more frames — handleJoins guards against duplicate via findPlayer
    await page.waitForTimeout(200)

    const players = await getWorldPlayers(page)
    expect(players).toHaveLength(1)
    expect(players[0].source).toBe('pad')
  })

  test('two gamepads spawn two pad players with different colors', async ({ page }) => {
    await injectGamepadMock(page)
    await startLocalGame(page, 'Test pad two pads')
    await page.waitForTimeout(150)

    await page.evaluate(
      ([p0, p1]) => { window.__mockGamepads = [p0, p1] },
      [fakePad(0, [0]), fakePad(1, [0])],
    )

    await page.waitForFunction(
      () => window.__engine?.world?.players?.length >= 2,
      { timeout: 3_000 },
    )

    const players = await getWorldPlayers(page)
    expect(players).toHaveLength(2)
    expect(players[0].source).toBe('pad')
    expect(players[1].source).toBe('pad')
    expect(players[0].color).not.toBe(players[1].color)
  })

  test('can mix a keyboard player and a gamepad player', async ({ page }) => {
    await injectGamepadMock(page)
    await startLocalGame(page, 'Test pad mix')
    await page.waitForTimeout(150)

    // Keyboard P1 first (canvas click)
    await page.locator('canvas').click()
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 5_000 })

    // Then pad
    await page.evaluate(([pad]) => { window.__mockGamepads = [pad] }, [fakePad(0, [0])])
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 2, { timeout: 3_000 })

    const players = await getWorldPlayers(page)
    expect(players.some((p) => p.source === 'kb1')).toBe(true)
    expect(players.some((p) => p.source === 'pad')).toBe(true)
  })
})

// ── Movement ──────────────────────────────────────────────────────────────────

test.describe('Gamepad — movement', () => {
  async function spawnPadPlayer(page) {
    await page.evaluate(([pad]) => { window.__mockGamepads = [pad] }, [fakePad(0, [0])])
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 3_000 })
  }

  test('left stick axis X > 0.25 moves pad player rightward', async ({ page }) => {
    await injectGamepadMock(page)
    await startLocalGame(page, 'Test pad axis move')
    await page.waitForTimeout(150)
    await spawnPadPlayer(page)

    const beforeX = await page.evaluate(() => window.__engine.world.players[0]?.x)

    // Release button, apply rightward axis
    await page.evaluate(([pad]) => { window.__mockGamepads = [pad] }, [fakePad(0, [], [0.8, 0, 0, 0])])
    await page.waitForTimeout(400)

    const afterX = await page.evaluate(() => window.__engine.world.players[0]?.x)
    expect(afterX).toBeGreaterThan(beforeX)
  })

  test('d-pad right (button 15) moves pad player rightward', async ({ page }) => {
    await injectGamepadMock(page)
    await startLocalGame(page, 'Test pad dpad right')
    await page.waitForTimeout(150)
    await spawnPadPlayer(page)

    const beforeX = await page.evaluate(() => window.__engine.world.players[0]?.x)

    // Hold d-pad right (button 15), release spawn button
    await page.evaluate(([pad]) => { window.__mockGamepads = [pad] }, [fakePad(0, [15])])
    await page.waitForTimeout(400)

    const afterX = await page.evaluate(() => window.__engine.world.players[0]?.x)
    expect(afterX).toBeGreaterThan(beforeX)
  })
})

// ── Disconnect ────────────────────────────────────────────────────────────────

test.describe('Gamepad — disconnect', () => {
  test('removing gamepad from navigator removes the pad player from world', async ({ page }) => {
    await injectGamepadMock(page)
    await startLocalGame(page, 'Test pad disconnect')
    await page.waitForTimeout(150)

    await page.evaluate(([pad]) => { window.__mockGamepads = [pad] }, [fakePad(0, [0])])
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 3_000 })

    // Disconnect
    await page.evaluate(() => { window.__mockGamepads = [] })

    await page.waitForFunction(
      () => window.__engine?.world?.players?.length === 0,
      { timeout: 3_000 },
    )

    const players = await getWorldPlayers(page)
    expect(players).toHaveLength(0)
  })

  test('disconnecting a gamepad does not remove a keyboard player', async ({ page }) => {
    await injectGamepadMock(page)
    await startLocalGame(page, 'Test pad disconnect kb')
    await page.waitForTimeout(150)

    // Keyboard player first
    await page.locator('canvas').click()
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 5_000 })

    // Add pad player
    await page.evaluate(([pad]) => { window.__mockGamepads = [pad] }, [fakePad(0, [0])])
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 2, { timeout: 3_000 })

    // Disconnect pad
    await page.evaluate(() => { window.__mockGamepads = [] })

    await page.waitForFunction(
      () => window.__engine?.world?.players?.length === 1,
      { timeout: 3_000 },
    )

    const players = await getWorldPlayers(page)
    expect(players).toHaveLength(1)
    expect(players[0].source).toBe('kb1')
  })
})
