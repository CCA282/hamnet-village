// Shared helpers for E2E tests

export async function startLocalGame(page, worldName = 'Test World') {
  await page.goto('/')
  await page.getByText('Jouer en local').click()
  await page.getByText('Nouvelle partie').click()
  await page.locator('.name-input').fill(worldName)
  await page.getByText('Commencer').click()
  await page.waitForSelector('canvas', { timeout: 10_000 })
}

// Spawn P1 by clicking the canvas (sets mouseAction=true for one RAF frame).
// Requires canvas to be accessible (no overlay blocking pointer events).
export async function spawnP1(page) {
  await page.locator('canvas').click()
  await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 5_000 })
}

// Spawn P1 via keyboard (Space held down). Works even when a UI overlay covers the canvas.
export async function spawnP1Keyboard(page) {
  await page.keyboard.down('Space')
  await page.waitForFunction(() => window.__engine?.world?.players?.length >= 1, { timeout: 5_000 })
  await page.keyboard.up('Space')
}

// Spawn P2 by holding Enter (kb2 action key) across at least one RAF frame.
export async function spawnP2(page) {
  await page.keyboard.down('Enter')
  await page.waitForFunction(() => window.__engine?.world?.players?.length >= 2, { timeout: 5_000 })
  await page.keyboard.up('Enter')
}

export async function getGameState(page) {
  return page.evaluate(() => window.__game)
}

// Returns the world-level players array (includes source, x, y, etc.)
export async function getWorldPlayers(page) {
  return page.evaluate(() => window.__engine.world.players.map((p) => ({
    id: p.id, source: p.source, label: p.label, color: p.color,
    x: p.x, y: p.y,
  })))
}
