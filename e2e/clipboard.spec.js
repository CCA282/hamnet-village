/**
 * E2E tests: clipboard copy + guest hint override
 *
 * Tests that:
 * 1. Lobby (waiting_players step): clicking the room code shows "✓ Code copié !" feedback
 * 2. HUD roomcode: clicking sets game.hintOverride = "Code copié !" and shows hint
 * 3. Guest mode: game.hintOverride takes precedence over myPlayer?.hint in .hint element
 */

import { test, expect } from '@playwright/test'

// ── Shared mock WebSocket helpers ─────────────────────────────────────────────

async function setupHostLobby(page) {
  await page.addInitScript(() => {
    window.__mockWs = null
    window.WebSocket = class MockWebSocket {
      constructor() {
        this.readyState = 1
        window.__mockWs = this
        Promise.resolve().then(() => {
          this.onopen?.()
          setTimeout(() => {
            this.onmessage?.({ data: JSON.stringify({ type: 'room_created', code: 'TEST01' }) })
          }, 80)
        })
      }
      send() {}
      close() { this.onclose?.() }
    }
  })
  await page.goto('/')
  await page.getByText('Jouer en ligne').click()
  await page.getByText('Créer une room').click()
  await page.locator('.name-input').fill('Clipboard test world')
  await page.getByText('Créer la room').click()
  // Wait for waiting_players step (room code shown)
  await page.waitForSelector('.room-code', { timeout: 5_000 })
  await page.waitForTimeout(200)
}

async function setupHostGame(page) {
  await setupHostLobby(page)
  // Enter game (spawn player, then close lobby)
  await page.keyboard.down('Space')
  await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 5_000 })
  await page.keyboard.up('Space')
  // Click "Jouer !" to close the lobby overlay
  await page.getByText('Jouer !').click()
  await page.waitForFunction(() => !document.querySelector('.lobby'), { timeout: 3_000 })
  await page.waitForTimeout(100)
}

// ── Lobby clipboard copy ──────────────────────────────────────────────────────

test.describe('Lobby — room code copy', () => {
  test('clicking room code in waiting_players shows copied feedback', async ({ page }) => {
    await setupHostLobby(page)
    // Room code should be displayed
    await expect(page.locator('.room-code')).toBeVisible()
    // Click the room code
    await page.locator('.room-code').click()
    // Feedback text should appear
    await expect(page.locator('.copy-hint')).toContainText('Code copié', { timeout: 2_000 })
  })

  test('feedback resets after 2 seconds', async ({ page }) => {
    await setupHostLobby(page)
    await page.locator('.room-code').click()
    await expect(page.locator('.copy-hint')).toContainText('Code copié')
    // After 2s the feedback clears
    await page.waitForFunction(
      () => !document.querySelector('.copy-hint')?.textContent?.includes('Code copié'),
      { timeout: 4_000 },
    )
    await expect(page.locator('.copy-hint')).not.toContainText('Code copié')
  })
})

// ── HUD roomcode copy ─────────────────────────────────────────────────────────

test.describe('HUD — roomcode copy', () => {
  test('clicking HUD roomcode sets Code copié hint', async ({ page }) => {
    await setupHostGame(page)
    // HUD roomcode should be visible (netState.roomCode is set)
    await expect(page.locator('.roomcode')).toBeVisible()
    await page.locator('.roomcode').click()
    // game.hintOverride should be set
    await page.waitForFunction(
      () => window.__game?.hintOverride === 'Code copié !',
      { timeout: 2_000 },
    )
    // .hint element should show it
    await expect(page.locator('.hint')).toContainText('Code copié !')
  })
})

// ── Guest mode: hintOverride takes priority ───────────────────────────────────

test.describe('Guest — hintOverride shown in .hint', () => {
  const GUEST_SNAP = {
    wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0,
    villageLevel: 1, totalHarvested: 0, timeOfDay: 0.25,
    buildings: {}, upgrades: {}, buildingUpgrades: {},
    players: [{ id: 1, x: 300, y: 300, label: 'G', color: '#4a7', source: 'remote',
      hint: 'Equipe une hache', inventory: {}, frozen: false, water: false,
      isInMenu: false, menuIndex: 0, menuTab: 0, buildingMenuId: null, buildingMenuIndex: 0,
      harvestCd: 0, targetHalo: null }],
    carts: [], autoTransporters: [],
    meteoriteSpots: [], _meteoriteTimer: 0, _nextMeteoriteSpawn: 0,
    _nextId: 2, devMode: false, guestPlayerId: 1,
  }

  async function setupGuestGame(page) {
    const snap = GUEST_SNAP
    await page.addInitScript((snapData) => {
      window.__mockWs = null
      window.WebSocket = class MockWebSocket {
        constructor() {
          this.readyState = 1
          window.__mockWs = this
          Promise.resolve().then(() => {
            this.onopen?.()
            setTimeout(() => {
              this.onmessage?.({ data: JSON.stringify({ type: 'room_joined', code: 'HOST01' }) })
            }, 40)
            setTimeout(() => {
              this.onmessage?.({ data: JSON.stringify({ type: 'state', data: snapData }) })
            }, 80)
          })
        }
        send() {}
        close() { this.onclose?.() }
      }
    }, snap)
    await page.goto('/')
    await page.getByText('Jouer en ligne').click()
    await page.getByText('Rejoindre une room').click()
    await page.locator('.code-input').fill('HOST01')
    await page.getByRole('button', { name: 'Rejoindre' }).click()
    await page.waitForSelector('canvas', { timeout: 8_000 })
    await page.waitForTimeout(300)
  }

  test('guest: game.hintOverride is shown in .hint even when player has a hint', async ({ page }) => {
    await setupGuestGame(page)
    // The guest player has hint 'Equipe une hache' set in the snap
    // Now set hintOverride via page.evaluate
    await page.evaluate(() => {
      window.__game.hintOverride = 'Code copié !'
    })
    await page.waitForTimeout(100)
    // .hint should show the override, not the player hint
    await expect(page.locator('.hint')).toContainText('Code copié !')
    await expect(page.locator('.hint')).not.toContainText('hache')
  })

  test('guest: player hint shows when hintOverride is empty', async ({ page }) => {
    await setupGuestGame(page)
    // hintOverride is empty by default; player hint should show
    const override = await page.evaluate(() => window.__game?.hintOverride ?? '')
    expect(override).toBe('')
    // Player has hint 'Equipe une hache' — but since the snap player is 'remote' source
    // and displayHint reads from myPlayer (guestPlayerId=1), the hint should show
    const myPlayer = await page.evaluate(() => {
      const myId = window.__netState?.myPlayerId
      return window.__game?.players?.find((p) => p.id === myId)?.hint ?? null
    })
    // myPlayer.hint reflects the snap's player hint
    expect(myPlayer).toContain('hache')
  })
})
