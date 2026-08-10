import { test, expect } from '@playwright/test'
import { startLocalGame, spawnP1, getGameState, getWorldPlayers } from './helpers.js'

test.describe('Solo — game loads and player spawns', () => {
  test('lobby is shown on first load', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Petit Hameau')).toBeVisible()
    await expect(page.getByText('Jouer en local')).toBeVisible()
  })

  test('starts a local game and shows canvas', async ({ page }) => {
    await startLocalGame(page, 'Test solo')
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('no JS errors on load', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await startLocalGame(page, 'Test solo')
    await page.waitForTimeout(500)
    expect(errors).toHaveLength(0)
  })

  test('clicking canvas spawns first player (kb1)', async ({ page }) => {
    await startLocalGame(page, 'Test solo spawn')
    await page.waitForTimeout(150)
    await spawnP1(page)
    const players = await getWorldPlayers(page)
    expect(players).toHaveLength(1)
    expect(players[0].source).toBe('kb1')
  })

  test('player gets label P1 and a valid color', async ({ page }) => {
    await startLocalGame(page, 'Test solo meta')
    await page.waitForTimeout(150)
    await spawnP1(page)
    const players = await getWorldPlayers(page)
    expect(players[0].label).toBe('P1')
    expect(players[0].color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  test('HUD is visible after player spawns', async ({ page }) => {
    await startLocalGame(page, 'Test solo hud')
    await page.waitForTimeout(150)
    await spawnP1(page)
    await expect(page.locator('.hud')).toBeVisible({ timeout: 3_000 })
  })

  test('game starts with zero resources', async ({ page }) => {
    await startLocalGame(page, 'Test solo resources')
    await page.waitForTimeout(200)
    const game = await getGameState(page)
    expect(game.wood).toBe(0)
    expect(game.fish).toBe(0)
    expect(game.stone).toBe(0)
    expect(game.berries).toBe(0)
  })
})
