import { test, expect } from '@playwright/test'
import { startLocalGame, spawnP1 } from './helpers.js'

test.describe('Cart deposit — full global capacity', () => {
  test('cart keeps resources it cannot deposit once the global cap is reached', async ({ page }) => {
    await startLocalGame(page, 'Cart cap full')
    await page.waitForTimeout(150)

    const before = await page.evaluate(() => {
      const w = window.__engine.world
      w.createCart()
      const cart = w.carts[0]
      cart.inventory.wood = 5
      window.__game.wood = 25 // base global cap for wood (cap_wood level 0)
      return { cartWood: cart.inventory.wood, gameWood: window.__game.wood }
    })
    expect(before).toEqual({ cartWood: 5, gameWood: 25 })

    // Let the real engine loop tick updateCarts() a few times.
    await page.waitForTimeout(300)

    const after = await page.evaluate(() => ({
      cartWood: window.__engine.world.carts[0].inventory.wood,
      gameWood: window.__game.wood,
    }))
    // Cap is already full: nothing transfers, nothing overflows.
    expect(after.cartWood).toBe(5)
    expect(after.gameWood).toBe(25)
  })

  test('cart deposits only up to the remaining room under the global cap', async ({ page }) => {
    await startLocalGame(page, 'Cart cap partial')
    await page.waitForTimeout(150)

    await page.evaluate(() => {
      const w = window.__engine.world
      w.createCart()
      const cart = w.carts[0]
      cart.inventory.wood = 5
      window.__game.wood = 23 // 2 slots of room left under the cap of 25
    })

    await page.waitForTimeout(300)

    const after = await page.evaluate(() => ({
      cartWood: window.__engine.world.carts[0].inventory.wood,
      gameWood: window.__game.wood,
    }))
    expect(after.gameWood).toBe(25)
    expect(after.cartWood).toBe(3) // 5 - 2 deposited
  })
})

test.describe('Resource regeneration — edge cases', () => {
  test('a depleted tree cannot be harvested again until it regrows', async ({ page }) => {
    await startLocalGame(page, 'Regen guard')
    await page.waitForTimeout(150)
    await spawnP1(page)

    const chops = await page.evaluate(() => {
      const w = window.__engine.world
      const p = w.players[0]
      window.__game.upgrades.hache = 1 // required tool, granted directly for the test
      const tree = w.trees[0]
      p.target = { kind: 'chop', tree, ok: true }

      const log = []
      for (let i = 0; i < 5; i++) {
        p.harvestCd = 0
        w.doAction(p, true)
        log.push({ hp: tree.hp, wood: p.inventory.wood })
      }
      return log
    })

    // First 3 hits deplete the tree (TREE_HP = 3); further hits are no-ops.
    expect(chops[0]).toEqual({ hp: 2, wood: 1 })
    expect(chops[1]).toEqual({ hp: 1, wood: 2 })
    expect(chops[2]).toEqual({ hp: 0, wood: 3 })
    expect(chops[3]).toEqual({ hp: 0, wood: 3 })
    expect(chops[4]).toEqual({ hp: 0, wood: 3 })
  })

  test('a depleted tree regrows on its own and becomes harvestable again', async ({ page }) => {
    await startLocalGame(page, 'Regen recovery')
    await page.waitForTimeout(150)
    await spawnP1(page)

    await page.evaluate(() => {
      const w = window.__engine.world
      const tree = w.trees[0]
      tree.hp = 0
      tree.regrow = 0.1 // shrink the real 14s timer for the test
    })

    // Regrow timer still running: tree stays depleted.
    await page.waitForTimeout(30)
    expect(await page.evaluate(() => window.__engine.world.trees[0].hp)).toBe(0)

    // Let the real engine loop tick the regrow timer down to zero.
    await page.waitForFunction(() => window.__engine.world.trees[0].hp > 0, { timeout: 2_000 })

    const tree = await page.evaluate(() => window.__engine.world.trees[0])
    expect(tree.hp).toBe(tree.maxHp)

    // Harvestable again: the guard no longer blocks doAction.
    const result = await page.evaluate(() => {
      const w = window.__engine.world
      const p = w.players[0]
      const tree = w.trees[0]
      p.harvestCd = 0
      p.target = { kind: 'chop', tree, ok: true }
      w.doAction(p, true)
      return { hp: tree.hp, wood: p.inventory.wood }
    })
    expect(result.hp).toBe(tree.maxHp - 1)
    expect(result.wood).toBe(1)
  })
})
