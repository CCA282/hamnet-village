/**
 * E2E tests: menus, hints, buildings, carts — solo, co-op, host, guest
 *
 * Key coordinates:
 *   Village: { x: 480, y: 320, r: 44 }
 *   First tree: [70, 110]
 *   First stone: [530, 118]
 *   First berry bush: [206, 478]
 *   Lumberjack build spot: { x: 332, y: 388 }
 */

import { test, expect } from '@playwright/test'
import { startLocalGame, spawnP1, spawnP2, getWorldPlayers } from './helpers.js'

// ── Shared helpers ────────────────────────────────────────────────────────────

async function teleport(page, playerIndex, x, y) {
  await page.evaluate(([i, x, y]) => {
    const p = window.__engine.world.players[i]
    if (!p) return
    p.x = x; p.y = y
    p.targetX = x; p.targetY = y
  }, [playerIndex, x, y])
}

async function waitForHint(page, text, timeout = 3_000) {
  await page.waitForFunction(
    (t) => (window.__game?.hint ?? '').includes(t),
    text, { timeout },
  )
  await expect(page.locator('.hint')).toContainText(text)
}

async function openVillageMenu(page) {
  // Player must be near village (x:480, y:320). Hold Space to trigger doAction.
  await page.keyboard.down('Space')
  await page.waitForFunction(() => window.__game?.menuOpen === true, { timeout: 3_000 })
  await page.keyboard.up('Space')
}

async function closeVillageMenu(page) {
  await page.keyboard.down('Escape')
  await page.waitForFunction(() => window.__game?.menuOpen === false, { timeout: 2_000 })
  await page.keyboard.up('Escape')
}

// ── HUD: basic display ────────────────────────────────────────────────────────

test.describe('HUD — display', () => {
  test('HUD is visible and shows zero resources after game start', async ({ page }) => {
    await startLocalGame(page, 'Test HUD')
    await spawnP1(page)
    await expect(page.locator('.hud')).toBeVisible()
    await expect(page.locator('.hud .resources')).toBeVisible()
    const game = await page.evaluate(() => window.__game)
    expect(game.wood).toBe(0)
    expect(game.fish).toBe(0)
    expect(game.stone).toBe(0)
    expect(game.berries).toBe(0)
  })

  test('player chip appears in HUD players panel', async ({ page }) => {
    await startLocalGame(page, 'Test HUD players')
    await spawnP1(page)
    await expect(page.locator('.hud .players .chip')).toBeVisible({ timeout: 2_000 })
  })

  test('no hint shown when player is away from all objects', async ({ page }) => {
    await startLocalGame(page, 'Test HUD no hint')
    await spawnP1(page)
    // Teleport to an empty area
    await teleport(page, 0, 480, 480) // center-ish, no objects
    await page.waitForTimeout(200)
    // hint element should not be visible (empty string hides it via v-if)
    const hint = await page.evaluate(() => window.__game?.hint ?? '')
    expect(hint).toBe('')
  })
})

// ── Hints — resource interactions ─────────────────────────────────────────────

test.describe('Hints — resource interactions (solo)', () => {
  test('no-tool hint when near tree without hache upgrade', async ({ page }) => {
    await startLocalGame(page, 'Test hint tree')
    await spawnP1(page)
    await teleport(page, 0, 70, 110) // first tree position
    await waitForHint(page, 'hache')
    await expect(page.locator('.hint')).toBeVisible()
  })

  test('no-tool hint when near stone without pioche upgrade', async ({ page }) => {
    await startLocalGame(page, 'Test hint stone')
    await spawnP1(page)
    await teleport(page, 0, 530, 118) // first stone spot
    await waitForHint(page, 'pioche')
    await expect(page.locator('.hint')).toBeVisible()
  })

  test('no-tool hint when near berry bush without faucille upgrade', async ({ page }) => {
    await startLocalGame(page, 'Test hint berry')
    await spawnP1(page)
    await teleport(page, 0, 206, 478) // first berry spot
    await waitForHint(page, 'faucille')
    await expect(page.locator('.hint')).toBeVisible()
  })

  test('hint disappears when player moves away from resource', async ({ page }) => {
    await startLocalGame(page, 'Test hint disappear')
    await spawnP1(page)
    await teleport(page, 0, 70, 110)
    await waitForHint(page, 'hache')

    // Move far away
    await teleport(page, 0, 480, 480)
    await page.waitForFunction(() => !(window.__game?.hint ?? '').includes('hache'), { timeout: 2_000 })
  })

  test('inventory-full hint when sac is full near a tree', async ({ page }) => {
    await startLocalGame(page, 'Test hint full')
    await spawnP1(page)
    // Fill inventory
    await page.evaluate(() => {
      const p = window.__engine.world.players[0]
      if (p) p.inventory = { wood: 9 }  // PLAYER_INVENTORY_MAX = 9
    })
    await teleport(page, 0, 70, 110)
    await page.waitForFunction(
      () => (window.__game?.hint ?? '').includes('Sac plein'),
      { timeout: 3_000 },
    )
    await expect(page.locator('.hint')).toContainText('Sac plein')
  })
})

// ── Village menu ──────────────────────────────────────────────────────────────

test.describe('Village menu (solo)', () => {
  test('approaching the village and pressing action opens the menu', async ({ page }) => {
    await startLocalGame(page, 'Test village menu')
    await spawnP1(page)
    await teleport(page, 0, 480, 320)
    await page.waitForTimeout(100)
    await openVillageMenu(page)
    await expect(page.locator('.scrim')).toBeVisible()
    await expect(page.locator('.menu')).toBeVisible()
  })

  test('village menu shows 4 tabs (village, outils, stockage, bonus)', async ({ page }) => {
    await startLocalGame(page, 'Test menu tabs')
    await spawnP1(page)
    await teleport(page, 0, 480, 320)
    await page.waitForTimeout(100)
    await openVillageMenu(page)
    // 4 tab buttons exist in the menu
    const tabs = page.locator('.menu .tab-btn')
    await expect(tabs).toHaveCount(4)
  })

  test('village menu shows upgrade entries', async ({ page }) => {
    await startLocalGame(page, 'Test menu entries')
    await spawnP1(page)
    await teleport(page, 0, 480, 320)
    await page.waitForTimeout(100)
    await openVillageMenu(page)
    // At least one upgrade entry is rendered
    await expect(page.locator('.menu .list li')).toHaveCount(1)
  })

  test('pressing Escape closes the village menu', async ({ page }) => {
    await startLocalGame(page, 'Test menu close')
    await spawnP1(page)
    await teleport(page, 0, 480, 320)
    await page.waitForTimeout(100)
    await openVillageMenu(page)
    await closeVillageMenu(page)
    await expect(page.locator('.scrim')).not.toBeVisible()
  })

  test('player is frozen while menu is open', async ({ page }) => {
    await startLocalGame(page, 'Test menu frozen')
    await spawnP1(page)
    await teleport(page, 0, 480, 320)
    await page.waitForTimeout(100)
    await openVillageMenu(page)
    const frozen = await page.evaluate(() => window.__engine.world.players[0]?.frozen)
    expect(frozen).toBe(true)
  })

  test('player is unfrozen after closing the menu', async ({ page }) => {
    await startLocalGame(page, 'Test menu unfreeze')
    await spawnP1(page)
    await teleport(page, 0, 480, 320)
    await page.waitForTimeout(100)
    await openVillageMenu(page)
    await closeVillageMenu(page)
    const frozen = await page.evaluate(() => window.__engine.world.players[0]?.frozen)
    expect(frozen).toBe(false)
  })

  test('buying an upgrade in the menu updates game.upgrades', async ({ page }) => {
    await startLocalGame(page, 'Test menu buy')
    await spawnP1(page)
    // Enable dev mode so we can always afford
    await page.evaluate(() => { window.__game.devMode = true })
    await teleport(page, 0, 480, 320)
    await page.waitForTimeout(100)
    await openVillageMenu(page)
    const before = await page.evaluate(() => window.__game.upgrades.village_lvl ?? 0)
    // Click the first entry
    await page.locator('.menu .list li').first().click()
    const after = await page.evaluate(() => window.__game.upgrades.village_lvl ?? 0)
    expect(after).toBeGreaterThan(before)
  })
})

// ── Building menu ─────────────────────────────────────────────────────────────

test.describe('Building menu (solo)', () => {
  async function buildLumberjack(page) {
    await page.evaluate(() => {
      window.__game.devMode = true
      window.__game.buildings.lumberjack = 1
      // Also ensure villageLevel is high enough
      window.__game.upgrades.village_lvl = 3
    })
  }

  test('approaching a built building shows no empty hint', async ({ page }) => {
    await startLocalGame(page, 'Test building approach')
    await spawnP1(page)
    await buildLumberjack(page)
    await teleport(page, 0, 332, 388) // lumberjack spot
    await page.waitForTimeout(200)
    // No missing-tool hint (building target doesn't produce a hint)
    const hint = await page.evaluate(() => window.__game?.hint ?? '')
    expect(hint).not.toContain('hache')
    expect(hint).not.toContain('Besoin')
  })

  test('pressing action near a built building opens the building menu', async ({ page }) => {
    await startLocalGame(page, 'Test building menu open')
    await spawnP1(page)
    await buildLumberjack(page)
    await teleport(page, 0, 332, 388)
    await page.waitForTimeout(100)
    // Press action (Space) to open building menu
    await page.keyboard.down('Space')
    await page.waitForFunction(() => window.__game?.buildingMenuOpen === true, { timeout: 3_000 })
    await page.keyboard.up('Space')
    await expect(page.locator('.scrim')).toBeVisible()
  })

  test('building menu shows upgrade options', async ({ page }) => {
    await startLocalGame(page, 'Test building menu entries')
    await spawnP1(page)
    await buildLumberjack(page)
    await teleport(page, 0, 332, 388)
    await page.waitForTimeout(100)
    await page.keyboard.down('Space')
    await page.waitForFunction(() => window.__game?.buildingMenuOpen === true, { timeout: 3_000 })
    await page.keyboard.up('Space')
    await expect(page.locator('.menu .list li').first()).toBeVisible()
  })

  test('pressing Escape closes the building menu', async ({ page }) => {
    await startLocalGame(page, 'Test building menu close')
    await spawnP1(page)
    await buildLumberjack(page)
    await teleport(page, 0, 332, 388)
    await page.waitForTimeout(100)
    await page.keyboard.down('Space')
    await page.waitForFunction(() => window.__game?.buildingMenuOpen === true, { timeout: 3_000 })
    await page.keyboard.up('Space')
    await page.keyboard.down('Escape')
    await page.waitForFunction(() => window.__game?.buildingMenuOpen === false, { timeout: 2_000 })
    await page.keyboard.up('Escape')
    await expect(page.locator('.scrim')).not.toBeVisible()
  })
})

// ── Cart visualization ─────────────────────────────────────────────────────────

test.describe('Cart visualization (solo)', () => {
  async function unlockCart(page) {
    await page.evaluate(() => {
      window.__game.devMode = true
      window.__game.upgrades.charrette = 1
    })
    // Wait for World.update to create the cart
    await page.waitForFunction(
      () => window.__engine?.world?.carts?.length >= 1,
      { timeout: 3_000 },
    )
  }

  test('unlocking charrette upgrade adds a cart to the world', async ({ page }) => {
    await startLocalGame(page, 'Test cart unlock')
    await spawnP1(page)
    await unlockCart(page)
    const carts = await page.evaluate(() => window.__engine.world.carts.length)
    expect(carts).toBeGreaterThanOrEqual(1)
  })

  test('approaching a cart shows a cart target for the player', async ({ page }) => {
    await startLocalGame(page, 'Test cart approach')
    await spawnP1(page)
    await unlockCart(page)
    // Teleport player to the cart position
    await page.evaluate(() => {
      const cart = window.__engine.world.carts[0]
      const p = window.__engine.world.players[0]
      if (cart && p) { p.x = cart.x; p.y = cart.y; p.targetX = cart.x; p.targetY = cart.y }
    })
    await page.waitForFunction(
      () => window.__engine?.world?.players?.[0]?.target?.kind === 'cart',
      { timeout: 2_000 },
    )
    const targetKind = await page.evaluate(() => window.__engine.world.players[0]?.target?.kind)
    expect(targetKind).toBe('cart')
  })

  test('picking up a cart sets cart.following to player id', async ({ page }) => {
    await startLocalGame(page, 'Test cart pickup')
    await spawnP1(page)
    await unlockCart(page)
    await page.evaluate(() => {
      const cart = window.__engine.world.carts[0]
      const p = window.__engine.world.players[0]
      if (cart && p) { p.x = cart.x; p.y = cart.y; p.targetX = cart.x; p.targetY = cart.y }
    })
    await page.waitForFunction(
      () => window.__engine?.world?.players?.[0]?.target?.kind === 'cart',
      { timeout: 2_000 },
    )
    const playerId = await page.evaluate(() => window.__engine.world.players[0]?.id)
    await page.keyboard.down('Space')
    await page.waitForFunction(
      (id) => window.__engine?.world?.carts?.[0]?.following === id,
      playerId, { timeout: 2_000 },
    )
    await page.keyboard.up('Space')
    const following = await page.evaluate(() => window.__engine.world.carts[0]?.following)
    expect(following).toBe(playerId)
  })
})

// ── Local co-op: menu occupied hints ─────────────────────────────────────────

test.describe('Local co-op — occupied hints', () => {
  test('P2 gets "Village occupé" hint when P1 is in the village menu', async ({ page }) => {
    await startLocalGame(page, 'Test coop menu occupied')
    await spawnP1(page)
    await spawnP2(page)

    // P1 opens the village menu
    await teleport(page, 0, 480, 320)
    await page.waitForTimeout(100)
    await openVillageMenu(page)

    // Teleport P2 to the village
    await teleport(page, 1, 480, 320)
    await page.waitForFunction(
      () => (window.__engine?.world?.players?.[1]?.hint ?? '').includes('occupé'),
      { timeout: 3_000 },
    )
    const hint = await page.evaluate(() => window.__engine.world.players[1]?.hint)
    expect(hint).toContain('occupé')
  })

  test('P2 gets "Bâtiment occupé" hint when P1 has a building menu open', async ({ page }) => {
    await startLocalGame(page, 'Test coop building occupied')
    await spawnP1(page)
    await spawnP2(page)

    // Build lumberjack
    await page.evaluate(() => {
      window.__game.devMode = true
      window.__game.buildings.lumberjack = 1
      window.__game.upgrades.village_lvl = 3
    })

    // P1 opens building menu
    await teleport(page, 0, 332, 388)
    await page.waitForTimeout(100)
    await page.keyboard.down('Space')
    await page.waitForFunction(() => window.__game?.buildingMenuOpen === true, { timeout: 3_000 })
    await page.keyboard.up('Space')

    // Teleport P2 near same building
    await teleport(page, 1, 332, 388)
    await page.waitForFunction(
      () => (window.__engine?.world?.players?.[1]?.hint ?? '').includes('occupé'),
      { timeout: 3_000 },
    )
    const hint = await page.evaluate(() => window.__engine.world.players[1]?.hint)
    expect(hint).toContain('Bâtiment occupé')
  })

  test('both players can be shown their individual hint simultaneously', async ({ page }) => {
    await startLocalGame(page, 'Test coop dual hints')
    await spawnP1(page)
    await spawnP2(page)

    // P1 near tree (no hache) → "hache" hint
    await teleport(page, 0, 70, 110)
    // P2 near stone (no pioche) → "pioche" hint
    await teleport(page, 1, 530, 118)
    await page.waitForTimeout(300)

    const [h1, h2] = await page.evaluate(() => [
      window.__engine.world.players[0]?.hint,
      window.__engine.world.players[1]?.hint,
    ])
    expect(h1).toContain('hache')
    expect(h2).toContain('pioche')
  })
})

// ── Online host ───────────────────────────────────────────────────────────────

test.describe('Online host — menus', () => {
  // Supabase Realtime is never reached here — src/net/realtime.js checks
  // window.__HAMNET_REALTIME_TEST_HOOK__ before touching supabase.channel(...), and this
  // installs a fake hook instead. It stashes the module's internal `dispatch` on
  // window.__dispatch so tests can simulate further events (a guest joining, etc).
  async function setupHostGame(page) {
    await page.addInitScript(() => {
      window.__dispatch = null
      window.__HAMNET_REALTIME_TEST_HOOK__ = {
        createRoomAsHost(dispatch) {
          window.__dispatch = dispatch
          return new Promise((resolve) => {
            setTimeout(() => resolve({ code: 'HOST01', hostId: 'test-host' }), 80)
          })
        },
        leaveRoom() {},
      }
    })
    await page.goto('/')
    await page.getByText('Jouer en ligne').click()
    await page.getByText('Créer une room').click()
    await page.locator('.name-input').fill('Online host game')
    await page.getByText('Créer la room').click()
    await page.waitForSelector('canvas', { timeout: 8_000 })
    await page.waitForTimeout(200)
    // Spawn via keyboard (lobby may overlay canvas)
    await page.keyboard.down('Space')
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 5_000 })
    await page.keyboard.up('Space')
  }

  test('host can open the village menu', async ({ page }) => {
    await setupHostGame(page)
    await teleport(page, 0, 480, 320)
    await page.waitForTimeout(100)
    await page.keyboard.down('Space')
    await page.waitForFunction(() => window.__game?.menuOpen === true, { timeout: 3_000 })
    await page.keyboard.up('Space')
    await expect(page.locator('.scrim')).toBeVisible()
  })

  test('host: guest player joining adds a remote player to world', async ({ page }) => {
    await setupHostGame(page)
    await page.evaluate(() => {
      window.__dispatch?.('guest_joined', { guestId: 'g-001', name: 'Alice' })
    })
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 2, { timeout: 3_000 })
    const players = await getWorldPlayers(page)
    expect(players.some((p) => p.source === 'remote')).toBe(true)
    expect(players.find((p) => p.source === 'remote').label).toBe('Alice')
  })

  test('host: when remote guest opens village menu, host menu is not shown', async ({ page }) => {
    await setupHostGame(page)
    // Simulate guest_joined
    await page.evaluate(() => {
      window.__dispatch?.('guest_joined', { guestId: 'g-001', name: 'Bob' })
    })
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 2, { timeout: 3_000 })

    // Simulate the remote player opening the menu via world state
    await page.evaluate(() => {
      const remote = window.__engine.world.players.find((p) => p.source === 'remote')
      if (remote) { remote.isInMenu = true; remote.frozen = true }
    })
    await page.waitForTimeout(100)

    // The VillageMenu should NOT be visible for host (remote player opened it, not local)
    const menuVisible = await page.locator('.scrim').isVisible()
    expect(menuVisible).toBe(false)
  })

  test('host: hint for remote player is tracked separately from local hint', async ({ page }) => {
    await setupHostGame(page)
    // Add a remote player
    await page.evaluate(() => {
      window.__dispatch?.('guest_joined', { guestId: 'g-001', name: 'Bob' })
    })
    await page.waitForFunction(() => window.__engine?.world?.players?.length >= 2, { timeout: 3_000 })

    // Teleport local player near tree (no hache) → local hint = 'hache'
    await teleport(page, 0, 70, 110)
    // Teleport remote player near stone (no pioche) → remote hint = 'pioche'
    await page.evaluate(() => {
      const r = window.__engine.world.players.find((p) => p.source === 'remote')
      if (r) { r.x = 530; r.y = 118; r.targetX = 530; r.targetY = 118 }
    })
    await page.waitForFunction(
      () => (window.__game?.hint ?? '').includes('hache'),
      { timeout: 3_000 },
    )
    const [localHint, remoteHint] = await page.evaluate(() => {
      const local  = window.__engine.world.players.find((p) => p.source !== 'remote')
      const remote = window.__engine.world.players.find((p) => p.source === 'remote')
      return [local?.hint, remote?.hint]
    })
    expect(localHint).toContain('hache')
    expect(remoteHint).toContain('pioche')
  })
})

// ── Online guest ──────────────────────────────────────────────────────────────

test.describe('Online guest — menus', () => {
  // Minimal world snapshot that applyWorldState understands
  const GUEST_SNAP = {
    wood: 5, fish: 0, stone: 0, berries: 0, meteorite: 0,
    villageLevel: 1, totalHarvested: 0, timeOfDay: 0.25,
    buildings: {}, upgrades: {}, buildingUpgrades: {},
    players: [], carts: [], autoTransporters: [],
    meteoriteSpots: [], _meteoriteTimer: 0, _nextMeteoriteSpawn: 0,
    _nextId: 1, devMode: false,
    guestPlayerId: 'g-me',
  }

  async function setupGuestGame(page) {
    const snap = GUEST_SNAP
    await page.addInitScript((snapData) => {
      window.__dispatch = null
      window.__HAMNET_REALTIME_TEST_HOOK__ = {
        joinRoomAsGuest(code, name, dispatch) {
          window.__dispatch = dispatch
          return new Promise((resolve) => {
            // state: host sends world snapshot with guestPlayerId
            setTimeout(() => {
              dispatch('state', snapData)
              resolve({ guestId: 'g-me' })
            }, 80)
          })
        },
        leaveRoom() {},
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

  test('guest: world resources are synced from host state message', async ({ page }) => {
    await setupGuestGame(page)
    const wood = await page.evaluate(() => window.__game?.wood)
    expect(wood).toBe(5)
  })

  test('guest: village menu opens when host sends open_menu', async ({ page }) => {
    await setupGuestGame(page)
    // Simulate host sending open_menu
    await page.evaluate(() => {
      window.__dispatch?.('open_menu', { buildingId: null })
    })
    await page.waitForFunction(() => window.__game?.menuOpen === true, { timeout: 2_000 })
    await expect(page.locator('.scrim')).toBeVisible()
  })

  test('guest: village menu closes when host sends close_menu', async ({ page }) => {
    await setupGuestGame(page)
    // Open then close
    await page.evaluate(() => {
      window.__dispatch?.('open_menu', { buildingId: null })
    })
    await page.waitForFunction(() => window.__game?.menuOpen === true, { timeout: 2_000 })
    await page.evaluate(() => {
      window.__dispatch?.('close_menu', {})
    })
    await page.waitForFunction(() => window.__game?.menuOpen === false, { timeout: 2_000 })
    await expect(page.locator('.scrim')).not.toBeVisible()
  })
})
