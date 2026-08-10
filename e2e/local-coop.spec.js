import { test, expect } from '@playwright/test'
import { startLocalGame, spawnP1, spawnP2, getGameState, getWorldPlayers } from './helpers.js'

test.describe('Local co-op — two keyboard players', () => {
  test('P1 (canvas click) and P2 (Enter) both join', async ({ page }) => {
    await startLocalGame(page, 'Test coop')
    await page.waitForTimeout(150)

    await spawnP1(page)
    await spawnP2(page)

    const players = await getWorldPlayers(page)
    expect(players).toHaveLength(2)
    expect(players[0].source).toBe('kb1')
    expect(players[1].source).toBe('kb2')
  })

  test('two players get different colors', async ({ page }) => {
    await startLocalGame(page, 'Test coop colors')
    await page.waitForTimeout(150)
    await spawnP1(page)
    await spawnP2(page)
    const players = await getWorldPlayers(page)
    expect(players[0].color).not.toBe(players[1].color)
  })

  test('two players get different labels', async ({ page }) => {
    await startLocalGame(page, 'Test coop labels')
    await page.waitForTimeout(150)
    await spawnP1(page)
    await spawnP2(page)
    const players = await getWorldPlayers(page)
    expect(players[0].label).not.toBe(players[1].label)
  })

  test('P1 moves right with KeyD', async ({ page }) => {
    await startLocalGame(page, 'Test coop move')
    await page.waitForTimeout(150)
    await spawnP1(page)

    const beforeX = await page.evaluate(() => window.__engine.world.players[0]?.x)

    await page.keyboard.down('KeyD')
    await page.waitForTimeout(400)
    await page.keyboard.up('KeyD')

    const afterX = await page.evaluate(() => window.__engine.world.players[0]?.x)
    expect(afterX).toBeGreaterThan(beforeX)
  })

  test('P2 moves right with ArrowRight', async ({ page }) => {
    await startLocalGame(page, 'Test coop move2')
    await page.waitForTimeout(150)
    await spawnP1(page)
    await spawnP2(page)

    const beforeX = await page.evaluate(() => window.__engine.world.players[1]?.x)

    await page.keyboard.down('ArrowRight')
    await page.waitForTimeout(400)
    await page.keyboard.up('ArrowRight')

    const afterX = await page.evaluate(() => window.__engine.world.players[1]?.x)
    expect(afterX).toBeGreaterThan(beforeX)
  })

  test('game.players length syncs with world on add/remove', async ({ page }) => {
    await startLocalGame(page, 'Test sync')
    await page.waitForTimeout(150)
    await spawnP1(page)

    expect(await page.evaluate(() => window.__game.players.length)).toBe(1)

    await spawnP2(page)
    expect(await page.evaluate(() => window.__game.players.length)).toBe(2)
  })
})
