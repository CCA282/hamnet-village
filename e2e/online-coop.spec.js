import { test, expect } from '@playwright/test'
import { spawnP1Keyboard, getWorldPlayers } from './helpers.js'

async function mockWebSocket(page, { serverCode = 'ABC123' } = {}) {
  await page.addInitScript(({ serverCode }) => {
    window.__ws = null
    window.WebSocket = class MockWebSocket {
      constructor(url) {
        this.url = url
        this.readyState = 1 // OPEN
        window.__ws = this
        Promise.resolve().then(() => {
          this.onopen?.()
          setTimeout(() => {
            this.onmessage?.({ data: JSON.stringify({ type: 'room_created', code: serverCode }) })
          }, 80)
        })
      }
      send(data) {}
      close() { this.onclose?.() }
    }
  }, { serverCode })
}

async function navigateToOnlineRoom(page) {
  await page.goto('/')
  await page.getByText('Jouer en ligne').click()
  // In 'online' step, button is "Créer une room" (not "Nouveau monde")
  await page.getByText('Créer une room').click()
  await page.locator('.name-input').fill('Online world')
  await page.getByText('Créer la room').click()
}

function mockPlayerSnapshot() {
  return {
    players: [{
      id: 1, label: 'P1', color: '#e08a3c',
      x: 480, y: 320, facing: 'down',
      walkPhase: 0, moving: false, spawn: 0, harvestCd: 0,
      inventory: { wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0 },
      hint: '', source: 'remote', remoteGuestId: null, targetHalo: null,
    }],
  }
}

// Guest-side mock: connects, then sends room_joined + an initial state snapshot.
async function mockWebSocketGuest(page, { code = 'ABC123', snapshot = mockPlayerSnapshot() } = {}) {
  await page.addInitScript(({ code, snapshot }) => {
    window.__ws = null
    window.WebSocket = class MockWebSocket {
      constructor(url) {
        this.url = url
        this.readyState = 1 // OPEN
        window.__ws = this
        Promise.resolve().then(() => {
          this.onopen?.()
          setTimeout(() => {
            this.onmessage?.({ data: JSON.stringify({ type: 'room_joined', code }) })
            this.onmessage?.({ data: JSON.stringify({ type: 'state', data: snapshot }) })
          }, 80)
        })
      }
      send(data) {}
      close() { this.onclose?.() }
    }
  }, { code, snapshot })
}

async function navigateAndJoinRoom(page, code = 'ABC123') {
  await page.goto('/')
  await page.getByText('Jouer en ligne').click()
  await page.getByText('Rejoindre une room').click()
  await page.locator('.code-input').fill(code)
  await page.getByRole('button', { name: 'Rejoindre' }).click()
}

test.describe('Online multiplayer — host side', () => {
  test('lobby shows online option', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Jouer en ligne')).toBeVisible()
  })

  test('host: creates room and receives code from server', async ({ page }) => {
    await mockWebSocket(page, { serverCode: 'ROOM42' })
    await navigateToOnlineRoom(page)
    // Room code appears in .room-code after room_created message
    await expect(page.locator('.room-code').first()).toContainText('ROOM42', { timeout: 5_000 })
  })

  test('host: canvas is rendered after room creation', async ({ page }) => {
    await mockWebSocket(page, { serverCode: 'ROOM43' })
    await navigateToOnlineRoom(page)
    await page.waitForSelector('canvas', { timeout: 8_000 })
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('host: can spawn a local player (keyboard, lobby may be overlaid)', async ({ page }) => {
    await mockWebSocket(page, { serverCode: 'ROOM44' })
    await navigateToOnlineRoom(page)
    await page.waitForSelector('canvas', { timeout: 8_000 })
    await page.waitForTimeout(200)
    // Use keyboard (not canvas click) since lobby overlay may intercept pointer events
    await spawnP1Keyboard(page)
    const players = await getWorldPlayers(page)
    expect(players).toHaveLength(1)
    expect(players[0].source).toBe('kb1')
  })

  test('host: guest join adds remote player to world', async ({ page }) => {
    await mockWebSocket(page, { serverCode: 'ROOM45' })
    await navigateToOnlineRoom(page)
    await page.waitForSelector('canvas', { timeout: 8_000 })
    await page.waitForTimeout(200)

    await spawnP1Keyboard(page)

    // Simulate guest_joined from mock server
    await page.evaluate(() => {
      window.__ws?.onmessage?.({
        data: JSON.stringify({ type: 'guest_joined', guestId: 'g-001', name: 'Bob' }),
      })
    })

    await page.waitForFunction(
      () => window.__engine?.world?.players?.length >= 2,
      { timeout: 3_000 },
    )

    const players = await getWorldPlayers(page)
    expect(players).toHaveLength(2)
    const remote = players.find((p) => p.source === 'remote')
    expect(remote).toBeDefined()
    expect(remote.label).toBe('Bob')
  })
})

test.describe('Online multiplayer — guest side (UI)', () => {
  test('join room input is accessible from online menu', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Jouer en ligne').click()
    await page.getByText('Rejoindre une room').click()
    await expect(page.locator('.code-input')).toBeVisible({ timeout: 3_000 })
    await expect(page.getByRole('button', { name: 'Rejoindre' })).toBeVisible()
  })

  test('join room validates code length', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Jouer en ligne').click()
    await page.getByText('Rejoindre une room').click()
    await page.locator('.code-input').fill('AB')
    await page.getByRole('button', { name: 'Rejoindre' }).click()
    await expect(page.locator('.err')).toBeVisible({ timeout: 2_000 })
  })
})

test.describe('Online multiplayer — guest side (connection loss)', () => {
  test('guest: joining applies host state and marks connected', async ({ page }) => {
    await mockWebSocketGuest(page, { code: 'GST001' })
    await navigateAndJoinRoom(page, 'GST001')

    await page.waitForFunction(() => window.__netState?.mode === 'guest', { timeout: 5_000 })
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 5_000 })

    expect(await page.evaluate(() => window.__netState.connected)).toBe(true)
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('guest: losing the connection flips netState.connected without crashing', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))

    await mockWebSocketGuest(page, { code: 'GST002' })
    await navigateAndJoinRoom(page, 'GST002')
    await page.waitForFunction(() => window.__netState?.mode === 'guest', { timeout: 5_000 })
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 5_000 })

    // Simulate the server dropping the connection (network loss, host closed, etc.)
    await page.evaluate(() => window.__ws.close())

    await page.waitForFunction(() => window.__netState?.connected === false, { timeout: 3_000 })

    // The last known world state stays put — no crash, canvas keeps rendering.
    await expect(page.locator('canvas')).toBeVisible()
    const players = await getWorldPlayers(page)
    expect(players).toHaveLength(1)
    expect(errors).toHaveLength(0)
  })
})
