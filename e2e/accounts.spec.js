import { test, expect } from '@playwright/test'
import { startLocalGame } from './helpers.js'

// accounts-service (http://localhost:4000) is never actually running in this suite —
// every call is intercepted so these tests have zero dependency on that project.

async function mockAuthRoute(page, path, { status = 200, body } = {}) {
  await page.route(`http://localhost:4000${path}`, (route) => {
    const isText = typeof body === 'string'
    route.fulfill({
      status,
      contentType: isText ? 'text/plain' : 'application/json',
      body: isText ? body : JSON.stringify(body),
    })
  })
}

async function signupAs(page, username, { status = 200, token = 'tok-' + username } = {}) {
  await mockAuthRoute(page, '/signup', { status, body: status === 200 ? { token, user: { id: 'u-' + username, username } } : 'Erreur' })
  await page.goto('/')
  await page.getByText('créer un compte').click()
  await page.locator('.name-input').first().fill(username)
  await page.locator('input[type="password"]').fill('password123')
  await page.getByText('Créer le compte').click()
}

test.describe('Comptes — connexion / inscription', () => {
  test('home screen prompts to log in when signed out', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Se connecter')).toBeVisible()
  })

  test('signup creates an account and shows the connected state', async ({ page }) => {
    await signupAs(page, 'alice')
    await expect(page.getByText('Connecté')).toBeVisible()
    await expect(page.getByText('alice')).toBeVisible()
  })

  test('signup shows the server error and stays signed out on failure', async ({ page }) => {
    await mockAuthRoute(page, '/signup', { status: 409, body: 'Ce pseudo est déjà pris' })
    await page.goto('/')
    await page.getByText('créer un compte').click()
    await page.locator('.name-input').first().fill('alice')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByText('Créer le compte').click()
    await expect(page.getByText('Ce pseudo est déjà pris')).toBeVisible()
    await page.getByText('← Retour').click()
    await expect(page.getByText('Se connecter')).toBeVisible()
  })

  test('login then logout', async ({ page }) => {
    await mockAuthRoute(page, '/login', { body: { token: 'tok-bob', user: { id: 'u-bob', username: 'bob' } } })
    await page.goto('/')
    await page.getByText('Se connecter').click()
    await page.locator('.name-input').first().fill('bob')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByText('Connexion').click()
    await expect(page.getByText('bob')).toBeVisible()

    await page.getByText('se déconnecter').click()
    await expect(page.getByText('Se connecter')).toBeVisible()
  })
})

test.describe('Comptes — sauvegarde liée au compte', () => {
  test('saving while logged in sends the account token to the backend', async ({ page }) => {
    let capturedAuth = null
    await page.route('**/api/worlds', (route) => {
      capturedAuth = route.request().headers()['authorization']
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'w1' }) })
    })

    await signupAs(page, 'carole')
    await page.getByText('🌿 Jouer en local').click()
    await page.getByText('✨ Nouvelle partie').click()
    await page.locator('.name-input').fill('Ma partie compte')
    await page.getByText('✨ Commencer').click()
    await page.waitForSelector('canvas')
    await page.waitForTimeout(150)

    await page.locator('.save-btn').click()
    await page.waitForTimeout(200)

    expect(capturedAuth).toBe('Bearer tok-carole')
  })

  test('saving while signed out never calls the backend and stays resumable locally', async ({ page }) => {
    let apiCalled = false
    await page.route('**/api/worlds', (route) => {
      apiCalled = true
      route.fulfill({ status: 401, body: 'Connecte-toi' })
    })

    await startLocalGame(page, 'Partie sans compte')
    await page.waitForTimeout(150)
    await page.locator('.save-btn').click()
    await page.waitForTimeout(200)
    expect(apiCalled).toBe(false)

    await page.locator('.quit-btn').click()
    await page.getByText('Quitter').click()
    await page.getByText('🌿 Jouer en local').click()
    await page.getByText('📂 Charger une partie').click()
    await expect(page.getByText('Partie sans compte')).toBeVisible()
    expect(apiCalled).toBe(false)
  })
})
